import React, { useState, useMemo } from 'react';
import { Plus, RefreshCw, Wallet, Edit2, X, Trash2, AlertCircle, Star } from 'lucide-react';
import { BankAccount } from '../types';
import SmartInput from './SmartInput';
import { useBankAccountSuggestions } from '../hooks/useSuggestions';
import { useFinancialStore } from '../lib/store';
import { Decimal } from 'decimal.js';

const SaldosBancarios: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [newAccount, setNewAccount] = useState<Partial<BankAccount>>({});
  const [bankCode, setBankCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { 
    bankAccounts, 
    transactions,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount
  } = useFinancialStore();

  const accountBalances = useMemo(() => {
    const balances = new Map<string, Decimal>();

    bankAccounts.forEach(account => {
      balances.set(account.id, new Decimal(account.initialBalance));
    });

    transactions
      .filter(t => t.reconciled)
      .sort((a, b) => a.competenceDate.getTime() - b.competenceDate.getTime())
      .forEach(transaction => {
        const accountId = transaction.bankAccount;
        if (!balances.has(accountId)) return;

        const currentBalance = balances.get(accountId)!;
        const amount = transaction.amount;

        if (transaction.type === 'income') {
          balances.set(accountId, currentBalance.plus(amount));
        } else {
          balances.set(accountId, currentBalance.minus(amount));
        }
      });

    return balances;
  }, [bankAccounts, transactions]);

  const totalBalance = useMemo(() => {
    return Array.from(accountBalances.values()).reduce((sum, balance) => {
      return sum.plus(balance);
    }, new Decimal(0));
  }, [accountBalances]);

  const suggestions = useBankAccountSuggestions(bankCode);

  const handleSuggestionApply = (field: string, value: any) => {
    setNewAccount(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEdit = (account: BankAccount) => {
    setEditingAccount(account);
    setNewAccount(account);
    setBankCode(account.bankCode);
    setShowForm(true);
  };

  const handleDelete = async (account: BankAccount) => {
    if (window.confirm(`Tem certeza que deseja excluir a conta "${account.name}"? Esta ação não pode ser desfeita.`)) {
      try {
        await deleteBankAccount(account.id);
        setDeleteError(null);
      } catch (error) {
        console.error('Error deleting bank account:', error);
        setDeleteError('Não é possível excluir esta conta pois existem transações vinculadas a ela.');
      }
    }
  };

  const handleSetPrimary = async (account: BankAccount) => {
    try {
      await updateBankAccount(account.id, {
        ...account,
        isPrimary: true
      });
      alert('Conta principal atualizada com sucesso!');
    } catch (error) {
      console.error('Error setting primary account:', error);
      alert('Erro ao definir conta principal');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (!newAccount.name?.trim()) {
        throw new Error('Nome da conta é obrigatório');
      }
      if (!newAccount.bankCode?.trim()) {
        throw new Error('Código do banco é obrigatório');
      }
      if (!newAccount.agency?.trim()) {
        throw new Error('Agência é obrigatória');
      }
      if (!newAccount.accountNumber?.trim()) {
        throw new Error('Número da conta é obrigatório');
      }

      if (editingAccount) {
        await updateBankAccount(editingAccount.id, newAccount);
      } else {
        await addBankAccount(newAccount as BankAccount);
      }

      setShowForm(false);
      setEditingAccount(null);
      setNewAccount({});
      setBankCode('');
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Erro ao salvar conta bancária');
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Saldos Bancários</h1>
          <p className="text-gray-500 mt-1">Gerencie suas contas bancárias</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingAccount(null);
            setNewAccount({});
            setBankCode('');
            setError(null);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Conta
        </button>
      </div>

      {deleteError && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <p className="text-red-700">{deleteError}</p>
        </div>
      )}

      <div className="mb-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-2xl text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
              <Wallet className="w-8 h-8" />
            </div>
          </div>
          <div>
            <h3 className="text-blue-100 mb-2">Saldo Total</h3>
            <p className="text-4xl font-bold mb-2">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                .format(totalBalance.toNumber())}
            </p>
            <p className="text-sm text-blue-200">
              {bankAccounts.length} {bankAccounts.length === 1 ? 'conta cadastrada' : 'contas cadastradas'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bankAccounts.map(account => {
          const currentBalance = accountBalances.get(account.id) || new Decimal(0);
          const reconciledTransactions = transactions.filter(t => 
            t.bankAccount === account.id && t.reconciled
          );
          
          const totalIncome = reconciledTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum.plus(t.amount), new Decimal(0));
          
          const totalExpense = reconciledTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum.plus(t.amount), new Decimal(0));

          return (
            <div key={account.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <Wallet className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{account.name}</h3>
                      {account.isPrimary && (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          Principal
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      Banco {account.bankCode} • Ag. {account.agency}
                    </p>
                    <p className="text-sm text-gray-500">
                      Conta {account.accountNumber}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!account.isPrimary && (
                    <button
                      onClick={() => handleSetPrimary(account)}
                      className="text-blue-600 hover:text-blue-800 transition-colors p-2 hover:bg-blue-50 rounded-lg"
                      title="Definir como conta principal"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(account)}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-50 rounded-lg"
                    title="Editar conta"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(account)}
                    className="text-red-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-lg"
                    title="Excluir conta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">Saldo Atual</span>
                    <span className={`text-lg font-semibold ${currentBalance.isNegative() ? 'text-red-600' : 'text-green-600'}`}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                        .format(currentBalance.toNumber())}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Saldo Inicial</span>
                    <span className="text-sm text-gray-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                        .format(account.initialBalance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingAccount ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <SmartInput
                type="text"
                label="Código do Banco"
                value={bankCode}
                onChange={setBankCode}
                suggestions={suggestions}
                onApplySuggestion={handleSuggestionApply}
                required
                pattern="[0-9]{3}"
                maxLength={3}
                placeholder="Ex: 341"
              />
              <SmartInput
                type="text"
                label="Nome da Conta"
                value={newAccount.name || ''}
                onChange={(value) => setNewAccount({ ...newAccount, name: value })}
                required
                placeholder="Ex: Conta Principal"
              />
              <div>
                <label className="block text-sm font-medium mb-1">Agência</label>
                <input
                  type="text"
                  value={newAccount.agency || ''}
                  onChange={(e) => setNewAccount({ ...newAccount, agency: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  required
                  pattern="[0-9]{4}"
                  maxLength={4}
                  placeholder="Apenas números"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Número da Conta</label>
                <input
                  type="text"
                  value={newAccount.accountNumber || ''}
                  onChange={(e) => setNewAccount({ ...newAccount, accountNumber: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  required
                  pattern="[0-9-]*"
                  maxLength={10}
                  placeholder="Apenas números e hífen"
                />
              </div>
              <SmartInput
                type="currency"
                label="Saldo Inicial"
                value={newAccount.initialBalance || 0}
                onChange={(value) => setNewAccount({ ...newAccount, initialBalance: value })}
                placeholder="R$ 0,00"
                allowNegative={true}
              />
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingAccount(null);
                    setNewAccount({});
                    setBankCode('');
                    setError(null);
                  }}
                  className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingAccount ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaldosBancarios;