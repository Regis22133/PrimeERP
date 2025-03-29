import { supabase } from './supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

export const useRealtimeSubscription = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Previous subscriptions remain unchanged
    const transactionsSubscription = supabase
      .channel('transactions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
        }
      )
      .subscribe();

    const categoriesSubscription = supabase
      .channel('categories_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['categories'] });
        }
      )
      .subscribe();

    // Add new subscriptions for bank accounts and statements
    const bankAccountsSubscription = supabase
      .channel('bank_accounts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bank_accounts'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
        }
      )
      .subscribe();

    const bankStatementsSubscription = supabase
      .channel('bank_statements_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bank_statements'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['bankStatements'] });
        }
      )
      .subscribe();

    return () => {
      transactionsSubscription.unsubscribe();
      categoriesSubscription.unsubscribe();
      bankAccountsSubscription.unsubscribe();
      bankStatementsSubscription.unsubscribe();
    };
  }, [queryClient]);
};