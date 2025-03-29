import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { Transaction, Category, BankAccount, BankStatement, BankStatementImport } from '../types';

// Transactions
export const useTransactions = () => {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: api.transactions.list
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.transactions.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Transaction> }) => 
      api.transactions.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.transactions.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });
};

// Categories
export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: api.categories.list
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.categories.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) => 
      api.categories.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.categories.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  });
};

// Bank Accounts
export const useBankAccounts = () => {
  return useQuery({
    queryKey: ['bankAccounts'],
    queryFn: api.bankAccounts.list
  });
};

export const useCreateBankAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.bankAccounts.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
    }
  });
};

export const useUpdateBankAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BankAccount> }) => 
      api.bankAccounts.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
    }
  });
};

export const useDeleteBankAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.bankAccounts.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
    }
  });
};

// Bank Statements
export const useBankStatements = (accountId: string, startDate?: Date, endDate?: Date) => {
  return useQuery({
    queryKey: ['bankStatements', accountId, startDate, endDate],
    queryFn: () => api.bankStatements.list(accountId, startDate, endDate)
  });
};

export const useImportBankStatements = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.bankStatements.import,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankStatements'] });
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
    }
  });
};

export const useReconcileStatement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ statementId, transactionId }: { statementId: string; transactionId: string }) =>
      api.bankStatements.reconcile(statementId, transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankStatements'] });
    }
  });
};

export const useUnreconcileStatement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.bankStatements.unreconcile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankStatements'] });
    }
  });
};