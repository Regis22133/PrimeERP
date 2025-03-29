import { create } from 'zustand';
import { produce } from 'immer';
import { Transaction, BankAccount, TransferData, CategoryType, DREData, DREGroup, CostCenter, Contact, BankStatement, TransactionAttachment } from '../types';
import { Decimal } from 'decimal.js';
import { api } from './api';
import { useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './auth';
import { supabase } from './supabase';

interface FinancialState {
  transactions: Transaction[];
  bankAccounts: BankAccount[];
  categoryTypes: CategoryType[];
  dreGroups: DREGroup[];
  costCenters: CostCenter[];
  contacts: Contact[];
  bankStatements: BankStatement[];
  dreData: DREData;
  selectedPeriod: {
    start: Date;
    end: Date;
  };
  initialized: boolean;
  loading: boolean;
  error: string | null;
}

interface FinancialStore extends FinancialState {
  initializeStore: () => Promise<void>;
  resetStore: () => void;
  addTransaction: (transaction: Transaction) => Promise<void>;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addBankAccount: (account: BankAccount) => Promise<void>;
  updateBankAccount: (id: string, account: Partial<BankAccount>) => Promise<void>;
  deleteBankAccount: (id: string) => Promise<void>;
  transferBetweenAccounts: (transfer: TransferData) => Promise<void>;
  addBankStatement: (statement: BankStatement) => Promise<void>;
  reconcileTransaction: (statementId: string, transactionId: string) => Promise<void>;
  unreconcileTransaction: (statementId: string) => Promise<void>;
  addCategoryType: (categoryType: CategoryType) => Promise<void>;
  updateCategoryType: (oldName: string, newName: string) => Promise<void>;
  deleteCategoryType: (name: string) => Promise<void>;
  addCostCenter: (costCenter: CostCenter) => Promise<void>;
  updateCostCenter: (id: string, costCenter: Partial<CostCenter>) => Promise<void>;
  deleteCostCenter: (id: string) => Promise<void>;
  addContact: (contact: Contact) => Promise<void>;
  updateContact: (id: string, contact: Partial<Contact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  updateDREData: (data: Partial<DREData>) => void;
  setPeriod: (period: { start: Date; end: Date }) => void;
  addAttachment: (transactionId: string, file: File) => Promise<void>;
  deleteAttachment: (attachmentId: string) => Promise<void>;
}

export const useFinancialStore = create<FinancialStore>((set, get) => ({
  transactions: [],
  bankAccounts: [],
  categoryTypes: [],
  dreGroups: [],
  costCenters: [],
  contacts: [],
  bankStatements: [],
  dreData: {
    receitaBruta: 0,
    impostos: 0,
    deducaoReceita: 0,
    receitaLiquida: 0,
    custosCMV: 0,
    custosCPV: 0,
    custosServicos: 0,
    lucroBruto: 0,
    despesasAdministrativas: 0,
    despesasPessoal: 0,
    despesasVariaveis: 0,
    resultadoOperacional: 0,
    outrasReceitas: 0,
    receitasFinanceiras: 0,
    despesasFinanceiras: 0,
    lucroLiquido: 0,
    investimentos: 0,
    resultadoExercicio: 0,
    depreciacaoAmortizacao: 0,
    ebitda: 0
  },
  selectedPeriod: {
    start: new Date(new Date().getFullYear(), 0, 1),
    end: new Date(new Date().getFullYear(), 11, 31)
  },
  initialized: false,
  loading: false,
  error: null,

  resetStore: () => {
    set({
      transactions: [],
      bankAccounts: [],
      categoryTypes: [],
      dreGroups: [],
      costCenters: [],
      contacts: [],
      bankStatements: [],
      initialized: false,
      loading: false,
      error: null
    });
  },

  initializeStore: async () => {
    try {
      set({ loading: true, error: null });

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('User not authenticated');

      const promises = [
        api.transactions.list().catch(error => {
          console.error('Error fetching transactions:', error);
          return [];
        }),
        api.bankAccounts.list().catch(error => {
          console.error('Error fetching bank accounts:', error);
          return [];
        }),
        api.categoryTypes.list().catch(error => {
          console.error('Error fetching category types:', error);
          return [];
        }),
        api.dreGroups.list().catch(error => {
          console.error('Error fetching DRE groups:', error);
          return [];
        }),
        api.costCenters.list().catch(error => {
          console.error('Error fetching cost centers:', error);
          return [];
        }),
        api.contacts.list().catch(error => {
          console.error('Error fetching contacts:', error);
          return [];
        }),
        api.bankStatements.list().catch(error => {
          console.error('Error fetching bank statements:', error);
          return [];
        })
      ];

      const [
        transactions,
        bankAccounts,
        categoryTypes,
        dreGroups,
        costCenters,
        contacts,
        bankStatements
      ] = await Promise.all(promises);

      set(produce((state: FinancialState) => {
        state.transactions = transactions.map(t => ({
          ...t,
          amount: new Decimal(t.amount),
          competenceDate: new Date(t.competenceDate),
          dueDate: new Date(t.dueDate)
        }));
        state.bankAccounts = bankAccounts;
        state.categoryTypes = categoryTypes;
        state.dreGroups = dreGroups;
        state.costCenters = costCenters;
        state.contacts = contacts;
        state.bankStatements = bankStatements.map(s => ({
          ...s,
          amount: new Decimal(s.amount),
          balance: new Decimal(s.balance),
          transactionDate: new Date(s.transactionDate)
        }));
        state.initialized = true;
        state.loading = false;
        state.error = null;
      }));
    } catch (error) {
      console.error('Error initializing store:', error);
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Error loading data',
        initialized: false
      });
    }
  },

  addTransaction: async (transaction) => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('User not authenticated');

      // Add user_id to transaction
      const transactionWithUser = {
        ...transaction,
        user_id: user.id
      };

      const savedTransaction = await api.transactions.create(transactionWithUser);
      set(produce((state: FinancialState) => {
        state.transactions.push({
          ...savedTransaction,
          amount: new Decimal(savedTransaction.amount),
          competenceDate: new Date(savedTransaction.competenceDate),
          dueDate: new Date(savedTransaction.dueDate)
        });
      }));
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  },

  updateTransaction: async (id, transaction) => {
    try {
      const updatedTransaction = await api.transactions.update(id, transaction);
      set(produce((state: FinancialState) => {
        const index = state.transactions.findIndex(t => t.id === id);
        if (index !== -1) {
          state.transactions[index] = {
            ...state.transactions[index],
            ...updatedTransaction,
            amount: new Decimal(updatedTransaction.amount),
            competenceDate: new Date(updatedTransaction.competenceDate),
            dueDate: new Date(updatedTransaction.dueDate)
          };
        }
      }));
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  },

  deleteTransaction: async (id) => {
    try {
      await api.transactions.delete(id);
      set(produce((state: FinancialState) => {
        state.transactions = state.transactions.filter(t => t.id !== id);
      }));
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  },

  addBankAccount: async (account) => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('User not authenticated');

      // Add user_id to account
      const accountWithUser = {
        ...account,
        user_id: user.id
      };

      const savedAccount = await api.bankAccounts.create(accountWithUser);
      set(produce((state: FinancialState) => {
        state.bankAccounts.push(savedAccount);
      }));
    } catch (error) {
      console.error('Error adding bank account:', error);
      throw error;
    }
  },

  updateBankAccount: async (id, account) => {
    try {
      const updatedAccount = await api.bankAccounts.update(id, account);
      set(produce((state: FinancialState) => {
        const index = state.bankAccounts.findIndex(a => a.id === id);
        if (index !== -1) {
          state.bankAccounts[index] = updatedAccount;
        }
      }));
    } catch (error) {
      console.error('Error updating bank account:', error);
      throw error;
    }
  },

  deleteBankAccount: async (id) => {
    try {
      await api.bankAccounts.delete(id);
      set(produce((state: FinancialState) => {
        state.bankAccounts = state.bankAccounts.filter(a => a.id !== id);
      }));
    } catch (error) {
      console.error('Error deleting bank account:', error);
      throw error;
    }
  },

  transferBetweenAccounts: async (transfer) => {
    try {
      const { fromAccountId, toAccountId, amount, date, description } = transfer;

      const fromAccount = get().bankAccounts.find(a => a.id === fromAccountId);
      if (!fromAccount) throw new Error('Conta de origem não encontrada');

      const currentBalance = new Decimal(fromAccount.currentBalance);
      if (currentBalance.lessThan(amount)) {
        throw new Error('Saldo insuficiente na conta de origem');
      }

      let transferCategory = get().categoryTypes.find(c => c.name === 'Transferência entre Contas');
      if (!transferCategory) {
        transferCategory = {
          name: 'Transferência entre Contas',
          type: 'expense',
          dreGroup: 'despesas_financeiras',
          userId: fromAccount.userId
        };
        await get().addCategoryType(transferCategory);
      }

      const withdrawalId = uuidv4();
      const depositId = uuidv4();

      const withdrawal: Transaction = {
        id: withdrawalId,
        type: 'expense',
        description: `Transferência: ${description}`,
        amount: new Decimal(amount),
        category: transferCategory.name,
        competenceDate: date,
        dueDate: date,
        status: 'completed',
        bankAccount: fromAccountId,
        reconciled: true
      };

      const deposit: Transaction = {
        id: depositId,
        type: 'income',
        description: `Transferência: ${description}`,
        amount: new Decimal(amount),
        category: transferCategory.name,
        competenceDate: date,
        dueDate: date,
        status: 'completed',
        bankAccount: toAccountId,
        reconciled: true
      };

      await Promise.all([
        api.transactions.create(withdrawal),
        api.transactions.create(deposit)
      ]);

      set(produce((state: FinancialState) => {
        state.transactions.push({
          ...withdrawal,
          amount: new Decimal(withdrawal.amount)
        });
        state.transactions.push({
          ...deposit,
          amount: new Decimal(deposit.amount)
        });

        const fromAccountIndex = state.bankAccounts.findIndex(a => a.id === fromAccountId);
        const toAccountIndex = state.bankAccounts.findIndex(a => a.id === toAccountId);

        if (fromAccountIndex !== -1) {
          state.bankAccounts[fromAccountIndex].currentBalance = 
            new Decimal(state.bankAccounts[fromAccountIndex].currentBalance)
              .minus(amount)
              .toNumber();
        }

        if (toAccountIndex !== -1) {
          state.bankAccounts[toAccountIndex].currentBalance = 
            new Decimal(state.bankAccounts[toAccountIndex].currentBalance)
              .plus(amount)
              .toNumber();
        }
      }));
    } catch (error) {
      console.error('Error performing transfer:', error);
      throw error;
    }
  },

  addBankStatement: async (statement) => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('User not authenticated');

      // Add user_id to statement
      const statementWithUser = {
        ...statement,
        user_id: user.id
      };

      const savedStatement = await api.bankStatements.create(statementWithUser);
      set(produce((state: FinancialState) => {
        state.bankStatements.push({
          ...savedStatement,
          amount: new Decimal(savedStatement.amount),
          balance: new Decimal(savedStatement.balance),
          transactionDate: new Date(savedStatement.transactionDate)
        });
      }));
    } catch (error) {
      console.error('Error adding bank statement:', error);
      throw error;
    }
  },

  reconcileTransaction: async (statementId, transactionId) => {
    try {
      await api.bankStatements.reconcile(statementId, transactionId);
      
      set(produce((state: FinancialState) => {
        const transaction = state.transactions.find(t => t.id === transactionId);
        if (transaction) {
          transaction.status = 'completed';
          transaction.reconciled = true;
        }

        const statement = state.bankStatements.find(s => s.id === statementId);
        if (statement) {
          statement.reconciled = true;
          statement.transactionId = transactionId;
        }
      }));
    } catch (error) {
      console.error('Error reconciling transaction:', error);
      throw error;
    }
  },

  unreconcileTransaction: async (statementId) => {
    try {
      await api.bankStatements.unreconcile(statementId);
      
      set(produce((state: FinancialState) => {
        const statement = state.bankStatements.find(s => s.id === statementId);
        if (statement && statement.transactionId) {
          const transaction = state.transactions.find(t => t.id === statement.transactionId);
          if (transaction) {
            transaction.status = 'pending';
            transaction.reconciled = false;
          }

          statement.reconciled = false;
          statement.transactionId = undefined;
        }
      }));
    } catch (error) {
      console.error('Error unreconciling transaction:', error);
      throw error;
    }
  },

  addCategoryType: async (categoryType) => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('User not authenticated');

      // Add user_id to category type
      const categoryTypeWithUser = {
        ...categoryType,
        user_id: user.id
      };

      const savedCategoryType = await api.categoryTypes.create(categoryTypeWithUser);
      set(produce((state: FinancialState) => {
        state.categoryTypes.push(savedCategoryType);
      }));
    } catch (error) {
      console.error('Error adding category type:', error);
      throw error;
    }
  },

  updateCategoryType: async (oldName, newName) => {
    try {
      const updatedCategoryType = await api.categoryTypes.update(oldName, newName);
      set(produce((state: FinancialState) => {
        const index = state.categoryTypes.findIndex(ct => ct.name === oldName);
        if (index !== -1) {
          state.categoryTypes[index] = updatedCategoryType;
        }
      }));
    } catch (error) {
      console.error('Error updating category type:', error);
      throw error;
    }
  },

  deleteCategoryType: async (name) => {
    try {
      await api.categoryTypes.delete(name);
      set(produce((state: FinancialState) => {
        state.categoryTypes = state.categoryTypes.filter(ct => ct.name !== name);
      }));
    } catch (error) {
      console.error('Error deleting category type:', error);
      throw error;
    }
  },

  addCostCenter: async (costCenter) => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('User not authenticated');

      // Add user_id to cost center
      const costCenterWithUser = {
        ...costCenter,
        user_id: user.id
      };

      const savedCostCenter = await api.costCenters.create(costCenterWithUser);
      set(produce((state: FinancialState) => {
        state.costCenters.push(savedCostCenter);
      }));
    } catch (error) {
      console.error('Error adding cost center:', error);
      throw error;
    }
  },

  updateCostCenter: async (id, costCenter) => {
    try {
      const updatedCostCenter = await api.costCenters.update(id, costCenter);
      set(produce((state: FinancialState) => {
        const index = state.costCenters.findIndex(cc => cc.id === id);
        if (index !== -1) {
          state.costCenters[index] = updatedCostCenter;
        }
      }));
    } catch (error) {
      console.error('Error updating cost center:', error);
      throw error;
    }
  },

  deleteCostCenter: async (id) => {
    try {
      await api.costCenters.delete(id);
      set(produce((state: FinancialState) => {
        state.costCenters = state.costCenters.filter(cc => cc.id !== id);
      }));
    } catch (error) {
      console.error('Error deleting cost center:', error);
      throw error;
    }
  },

  addContact: async (contact) => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('User not authenticated');

      // Add user_id to contact
      const contactWithUser = {
        ...contact,
        user_id: user.id
      };

      const savedContact = await api.contacts.create(contactWithUser);
      set(produce((state: FinancialState) => {
        state.contacts.push(savedContact);
      }));
    } catch (error) {
      console.error('Error adding contact:', error);
      throw error;
    }
  },

  updateContact: async (id, contact) => {
    try {
      const updatedContact = await api.contacts.update(id, contact);
      set(produce((state: FinancialState) => {
        const index = state.contacts.findIndex(c => c.id === id);
        if (index !== -1) {
          state.contacts[index] = updatedContact;
        }
      }));
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  },

  deleteContact: async (id) => {
    try {
      await api.contacts.delete(id);
      set(produce((state: FinancialState) => {
        state.contacts = state.contacts.filter(c => c.id !== id);
      }));
    } catch (error) {
      console.error('Error deleting contact:', error);
      throw error;
    }
  },

  updateDREData: (data) => {
    set(produce((state: FinancialState) => {
      state.dreData = {
        ...state.dreData,
        ...data
      };
    }));
  },

  setPeriod: (period) => set(
    produce((state: FinancialState) => {
      state.selectedPeriod = period;
    })
  ),

  addAttachment: async (transactionId: string, file: File) => {
    try {
      const attachment = await api.attachments.create(transactionId, file);
      set(produce((state: FinancialState) => {
        const transaction = state.transactions.find(t => t.id === transactionId);
        if (transaction) {
          if (!transaction.attachments) {
            transaction.attachments = [];
          }
          transaction.attachments.push(attachment);
        }
      }));
    } catch (error) {
      console.error('Error adding attachment:', error);
      throw error;
    }
  },

  deleteAttachment: async (attachmentId: string) => {
    try {
      await api.attachments.delete(attachmentId);
      set(produce((state: FinancialState) => {
        state.transactions = state.transactions.map(transaction => {
          if (transaction.attachments) {
            transaction.attachments = transaction.attachments.filter(
              attachment => attachment.id !== attachmentId
            );
          }
          return transaction;
        });
      }));
    } catch (error) {
      console.error('Error deleting attachment:', error);
      throw error;
    }
  }
}));

export function useInitializeStore() {
  const { user } = useAuth();
  const { initializeStore, initialized, loading, error, resetStore } = useFinancialStore();

  useEffect(() => {
    if (!user) {
      resetStore();
      return;
    }

    if (user && !initialized && !loading) {
      initializeStore().catch(error => {
        console.error('Failed to initialize store:', error);
      });
    }
  }, [user, initialized, loading, initializeStore, resetStore]);

  return { initialized, loading, error };
}