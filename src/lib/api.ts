import { supabase, INVOICE_BUCKET } from './supabase';
import { Transaction, CategoryType, BankAccount, BankStatement, DREGroup, CostCenter, Contact, TransactionAttachment } from '../types';
import { Decimal } from 'decimal.js';

// Helper to convert snake_case to camelCase
const toCamelCase = (str: string) => 
  str.replace(/([-_][a-z])/g, group => 
    group.toUpperCase()
      .replace('-', '')
      .replace('_', '')
  );

// Helper to convert camelCase to snake_case
const toSnakeCase = (str: string) => 
  str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

// Convert object keys from snake_case to camelCase
const keysToCamel = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => keysToCamel(v));
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => ({
      ...result,
      [toCamelCase(key)]: keysToCamel(obj[key])
    }), {});
  }
  return obj;
};

// Convert object keys from camelCase to snake_case
const keysToSnake = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => keysToSnake(v));
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => ({
      ...result,
      [toSnakeCase(key)]: keysToSnake(obj[key])
    }), {});
  }
  return obj;
};

export const api = {
  // Transaction Attachments
  attachments: {
    list: async (transactionId: string): Promise<TransactionAttachment[]> => {
      const { data, error } = await supabase
        .from('transaction_attachments')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return keysToCamel(data);
    },

    create: async (transactionId: string, file: File): Promise<TransactionAttachment> => {
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error('No active session');

      // Upload file
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}/${transactionId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(INVOICE_BUCKET)
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl }, error: urlError } = await supabase.storage
        .from(INVOICE_BUCKET)
        .getPublicUrl(fileName);

      if (urlError) throw urlError;

      // Create attachment record
      const { data, error } = await supabase
        .from('transaction_attachments')
        .insert([{
          transaction_id: transactionId,
          url: publicUrl,
          name: file.name,
          user_id: session.user.id
        }])
        .select()
        .single();

      if (error) throw error;
      return keysToCamel(data);
    },

    delete: async (attachmentId: string): Promise<void> => {
      // Get attachment info
      const { data: attachment, error: fetchError } = await supabase
        .from('transaction_attachments')
        .select('url')
        .eq('id', attachmentId)
        .single();

      if (fetchError) throw fetchError;

      // Extract file path from URL
      const url = new URL(attachment.url);
      const filePath = url.pathname.split('/').slice(-3).join('/');

      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from(INVOICE_BUCKET)
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete attachment record
      const { error } = await supabase
        .from('transaction_attachments')
        .delete()
        .eq('id', attachmentId);

      if (error) throw error;
    }
  },

  // Bank Statements
  bankStatements: {
    list: async () => {
      const { data, error } = await supabase
        .from('bank_statements')
        .select('*')
        .order('transaction_date', { ascending: false });
      
      if (error) throw error;
      return keysToCamel(data).map((statement: any) => ({
        ...statement,
        amount: new Decimal(statement.amount),
        balance: new Decimal(statement.balance),
        transactionDate: new Date(statement.transactionDate),
        createdAt: new Date(statement.createdAt)
      }));
    },
    create: async (statement: BankStatement) => {
      const { data, error } = await supabase
        .from('bank_statements')
        .insert([{
          ...keysToSnake(statement),
          amount: statement.amount.toString(),
          balance: statement.balance.toString()
        }])
        .select()
        .single();
      
      if (error) throw error;
      return {
        ...keysToCamel(data),
        amount: new Decimal(data.amount),
        balance: new Decimal(data.balance),
        transactionDate: new Date(data.transaction_date),
        createdAt: new Date(data.created_at)
      };
    },
    reconcile: async (statementId: string, transactionId: string) => {
      const { error } = await supabase
        .from('bank_statements')
        .update({
          reconciled: true,
          transaction_id: transactionId
        })
        .eq('id', statementId);
      
      if (error) throw error;
    },
    unreconcile: async (statementId: string) => {
      const { error } = await supabase
        .from('bank_statements')
        .update({
          reconciled: false,
          transaction_id: null
        })
        .eq('id', statementId);
      
      if (error) throw error;
    }
  },

  // Contacts
  contacts: {
    list: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return keysToCamel(data);
    },
    create: async (contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { data, error } = await supabase
        .from('contacts')
        .insert([keysToSnake(contact)])
        .select()
        .single();
      
      if (error) throw error;
      return keysToCamel(data);
    },
    update: async (id: string, contact: Partial<Contact>) => {
      const { data, error } = await supabase
        .from('contacts')
        .update(keysToSnake(contact))
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return keysToCamel(data);
    },
    delete: async (id: string) => {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    }
  },

  // Cost Centers
  costCenters: {
    list: async () => {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return keysToCamel(data);
    },
    create: async (costCenter: Omit<CostCenter, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { data, error } = await supabase
        .from('cost_centers')
        .insert([keysToSnake(costCenter)])
        .select()
        .single();
      
      if (error) throw error;
      return keysToCamel(data);
    },
    update: async (id: string, costCenter: Partial<CostCenter>) => {
      const { data, error } = await supabase
        .from('cost_centers')
        .update(keysToSnake(costCenter))
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return keysToCamel(data);
    },
    delete: async (id: string) => {
      const { error } = await supabase
        .from('cost_centers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    }
  },

  // DRE Groups
  dreGroups: {
    list: async () => {
      const { data, error } = await supabase
        .from('dre_groups')
        .select('*')
        .order('order');
      
      if (error) throw error;
      return keysToCamel(data);
    }
  },

  // Category Types
  categoryTypes: {
    list: async () => {
      const { data, error } = await supabase
        .from('category_types')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return keysToCamel(data);
    },
    create: async (categoryType: Omit<CategoryType, 'id' | 'createdAt'>) => {
      const { data, error } = await supabase
        .from('category_types')
        .insert([keysToSnake(categoryType)])
        .select()
        .single();
      
      if (error) throw error;
      return keysToCamel(data);
    },
    update: async (oldName: string, newName: string) => {
      const { data, error } = await supabase
        .from('category_types')
        .update({ name: newName })
        .eq('name', oldName)
        .select()
        .single();
      
      if (error) throw error;
      return keysToCamel(data);
    },
    delete: async (name: string) => {
      const { error } = await supabase
        .from('category_types')
        .delete()
        .eq('name', name);
      
      if (error) throw error;
    }
  },

  // Transactions
  transactions: {
    list: async () => {
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .order('competence_date', { ascending: false });
      
      if (transactionsError) throw transactionsError;

      // Get attachments for all transactions
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('transaction_attachments')
        .select('*');

      if (attachmentsError) throw attachmentsError;

      // Group attachments by transaction ID
      const attachmentsByTransaction = attachmentsData.reduce((acc: any, attachment: any) => {
        if (!acc[attachment.transaction_id]) {
          acc[attachment.transaction_id] = [];
        }
        acc[attachment.transaction_id].push(keysToCamel(attachment));
        return acc;
      }, {});

      // Merge transactions with their attachments
      return keysToCamel(transactionsData).map((transaction: any) => ({
        ...transaction,
        amount: new Decimal(transaction.amount),
        competenceDate: new Date(transaction.competenceDate),
        dueDate: new Date(transaction.dueDate),
        attachments: attachmentsByTransaction[transaction.id] || []
      }));
    },
    create: async (transaction: Omit<Transaction, 'id'>) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          ...keysToSnake(transaction),
          amount: transaction.amount.toString()
        }])
        .select()
        .single();
      
      if (error) throw error;
      return {
        ...keysToCamel(data),
        amount: new Decimal(data.amount),
        competenceDate: new Date(data.competence_date),
        dueDate: new Date(data.due_date)
      };
    },
    update: async (id: string, transaction: Partial<Transaction>) => {
      const updateData = { ...keysToSnake(transaction) };
      if (transaction.amount) {
        updateData.amount = transaction.amount.toString();
      }

      const { data, error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return {
        ...keysToCamel(data),
        amount: new Decimal(data.amount),
        competenceDate: new Date(data.competence_date),
        dueDate: new Date(data.due_date)
      };
    },
    delete: async (id: string) => {
      // First delete all attachments
      const { data: attachments } = await supabase
        .from('transaction_attachments')
        .select('url')
        .eq('transaction_id', id);

      if (attachments) {
        // Delete files from storage
        for (const attachment of attachments) {
          const url = new URL(attachment.url);
          const filePath = url.pathname.split('/').slice(-3).join('/');
          await supabase.storage
            .from(INVOICE_BUCKET)
            .remove([filePath]);
        }
      }

      // Then delete the transaction (this will cascade delete the attachment records)
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    }
  },

  // Bank Accounts
  bankAccounts: {
    list: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return keysToCamel(data);
    },
    create: async (account: Omit<BankAccount, 'id' | 'currentBalance' | 'createdAt' | 'updatedAt'>) => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .insert([{
          ...keysToSnake(account),
          current_balance: account.initialBalance
        }])
        .select()
        .single();
      
      if (error) throw error;
      return keysToCamel(data);
    },
    update: async (id: string, account: Partial<BankAccount>) => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .update(keysToSnake(account))
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return keysToCamel(data);
    },
    delete: async (id: string) => {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    }
  }
};