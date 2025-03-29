import { useState, useEffect } from 'react';
import { suggestionEngine } from '../lib/suggestions';
import { Transaction, Category, BankAccount, DREData } from '../types';

export const useTransactionSuggestions = (partialData: Partial<Transaction>) => {
  const [suggestions, setSuggestions] = useState<Partial<Transaction>>({});

  useEffect(() => {
    const newSuggestions = suggestionEngine.getTransactionSuggestions(partialData);
    setSuggestions(newSuggestions);
  }, [partialData]);

  return suggestions;
};

export const useCategorySuggestions = (type: 'income' | 'expense', description?: string) => {
  const [suggestions, setSuggestions] = useState<Partial<Category>>({});

  useEffect(() => {
    const newSuggestions = suggestionEngine.getCategorySuggestions(type, description);
    setSuggestions(newSuggestions);
  }, [type, description]);

  return suggestions;
};

export const useBankAccountSuggestions = (bankCode: string) => {
  const [suggestions, setSuggestions] = useState<Partial<BankAccount>>({});

  useEffect(() => {
    const newSuggestions = suggestionEngine.getBankAccountSuggestions(bankCode);
    setSuggestions(newSuggestions);
  }, [bankCode]);

  return suggestions;
};

export const useDRESuggestions = (dreData: DREData) => {
  const [suggestions, setSuggestions] = useState<Partial<DREData>>({});

  useEffect(() => {
    const newSuggestions = suggestionEngine.getDRESuggestions(dreData);
    setSuggestions(newSuggestions);
  }, [dreData]);

  return suggestions;
};