import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Search, Filter, Download, Upload, Check, X, ArrowUpRight, ArrowDownLeft, RefreshCw, ArrowLeftRight, AlertCircle, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Transaction, TransferData, BankStatement } from '../types';
import SmartInput from './SmartInput';
import { useTransactionSuggestions } from '../hooks/useSuggestions';
import { useFinancialStore } from '../lib/store';
import { Decimal } from 'decimal.js';
import DateFilter from './DateFilter';
import { v4 as uuidv4 } from 'uuid';

const ConciliacaoBancaria: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [newTransaction, setNewTransaction] = useState<Partial<Transaction>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({
    type: 'month',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
  });
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [newTransfer, setNewTransfer] = useState<Partial<TransferData>>({
    date: new Date()
  });
  const [transferError, setTransferError] = useState<string | null>(null);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState<BankStatement | null>(null);
  const [matchingTransactions, setMatchingTransactions] = useState<Transaction[]>([]);
  const [autoReconcileMatches, setAutoReconcileMatches] = useState<Array<{
    statement: BankStatement;
    transaction: Transaction;
  }>>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);

  const { 
    transactions, 
    bankAccounts, 
    updateTransaction,
    transferBetweenAccounts,
    addBankStatement,
    reconcileTransaction
  } = useFinancialStore();

  useEffect(() => {
    const primaryAccount = bankAccounts.find(account => account.isPrimary);
    if (primaryAccount && !selectedAccount) {
      setSelectedAccount(primaryAccount.id);
    }
  }, [bankAccounts]);

  const groupedTransactions = useMemo(() => {
    const filtered = transactions.filter(transaction => {
      const matchesSearch = searchTerm === '' || 
        transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.supplier?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAccount = !selectedAccount || transaction.bankAccount === selectedAccount;
      
      const matchesDate = transaction.dueDate >= dateFilter.startDate && 
                       transaction.dueDate <= dateFilter.endDate;

      return matchesSearch && matchesAccount && matchesDate && transaction.reconciled;
    });

    filtered.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    const groups = new Map<string, {
      transactions: Transaction[];
      balance: Decimal;
    }>();

    let runningBalance = new Decimal(0);
    if (selectedAccount) {
      const account = bankAccounts.find(a => a.id === selectedAccount);
      if (account) {
        runningBalance = new Decimal(account.initialBalance);
      }
    }

    filtered.forEach(transaction => {
      const dateKey = transaction.dueDate.toISOString().split('T')[0];
      
      if (!groups.has(dateKey)) {
        groups.set(dateKey, {
          transactions: [],
          balance: new Decimal(runningBalance)
        });
      }

      const group = groups.get(dateKey)!;
      group.transactions.push(transaction);

      if (transaction.type === 'income') {
        runningBalance = runningBalance.plus(transaction.amount);
      } else {
        runningBalance = runningBalance.minus(transaction.amount);
      }

      if (!group.transactions.some(t => t.dueDate.getTime() > transaction.dueDate.getTime())) {
        group.balance = new Decimal(runningBalance);
      }
    });

    return groups;
  }, [transactions, searchTerm, selectedAccount, dateFilter, bankAccounts]);

  const totals = useMemo(() => {
    let income = new Decimal(0);
    let expense = new Decimal(0);

    groupedTransactions.forEach(group => {
      group.transactions.forEach(transaction => {
        if (transaction.type === 'income') {
          income = income.plus(transaction.amount);
        } else {
          expense = expense.plus(transaction.amount);
        }
      });
    });

    return {
      income: income.toNumber(),
      expense: expense.toNumber(),
      balance: income.minus(expense).toNumber()
    };
  }, [groupedTransactions]);

  const handleDateFilterChange = (filterType: string, startDate?: Date, endDate?: Date) => {
    if (startDate && endDate) {
      setDateFilter({ type: filterType, startDate, endDate });
    }
  };

  const handleUnconciliate = async (transaction: Transaction) => {
    if (window.confirm('Deseja realmente desconciliar esta transação? O saldo bancário será atualizado automaticamente.')) {
      try {
        await updateTransaction(transaction.id, {
          status: 'pending',
          reconciled: false
        });
      } catch (error) {
        console.error('Error unconciliating transaction:', error);
        alert('Erro ao desconciliar transação. Por favor, tente novamente.');
      }
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError(null);

    try {
      if (!newTransfer.fromAccountId || !newTransfer.toAccountId || !newTransfer.amount || !newTransfer.description) {
        throw new Error('Por favor, preencha todos os campos');
      }

      if (newTransfer.fromAccountId === newTransfer.toAccountId) {
        throw new Error('As contas de origem e destino devem ser diferentes');
      }

      const fromAccount = bankAccounts.find(a => a.id === newTransfer.fromAccountId);
      if (!fromAccount) throw new Error('Conta de origem não encontrada');

      if (fromAccount.currentBalance < (newTransfer.amount || 0)) {
        throw new Error('Saldo insuficiente na conta de origem');
      }

      await transferBetweenAccounts({
        ...newTransfer as TransferData,
        date: newTransfer.date || new Date()
      });

      setShowTransferForm(false);
      setNewTransfer({ date: new Date() });
    } catch (error) {
      console.error('Error performing transfer:', error);
      setTransferError(error instanceof Error ? error.message : 'Erro ao realizar transferência');
    }
  };

  const handleAutoReconcile = async () => {
    try {
      await Promise.all(
        autoReconcileMatches.map(({ statement, transaction }) =>
          reconcileTransaction(statement.id, transaction.id)
        )
      );

      setShowReconcileModal(false);
      setAutoReconcileMatches([]);
    } catch (error) {
      console.error('Error auto-reconciling transactions:', error);
      alert('Erro ao conciliar transações automaticamente. Por favor, tente novamente.');
    }
  };

  const handleAccountSwitch = (direction: 'prev' | 'next') => {
    const currentIndex = bankAccounts.findIndex(a => a.id === selectedAccount);
    let newIndex;
    
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : bankAccounts.length - 1;
    } else {
      newIndex = currentIndex < bankAccounts.length - 1 ? currentIndex + 1 : 0;
    }
    
    setSelectedAccount(bankAccounts[newIndex].id);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR');
  };

  const selectedAccountData = selectedAccount ? bankAccounts.find(a => a.id === selectedAccount) : null;

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Conciliação Bancária</h1>
        <div className="flex gap-4">
          <div className="relative">
            <div 
              className="flex items-center gap-2 px-4 py-2 border rounded-lg bg-white cursor-pointer hover:bg-gray-50"
              onClick={() => setShowAccountSwitcher(!showAccountSwitcher)}
            >
              <span className="font-medium">
                {selectedAccount 
                  ? selectedAccountData?.name
                  : 'Selecione uma Conta'
                }
              </span>
            </div>

            {showAccountSwitcher && (
              <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-lg shadow-lg border z-50">
                <div className="p-2">
                  {bankAccounts.map(account => (
                    <button
                      key={account.id}
                      onClick={() => {
                        setSelectedAccount(account.id);
                        setShowAccountSwitcher(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${
                        account.id === selectedAccount ? 'bg-blue-50 text-blue-600' : ''
                      }`}
                    >
                      <span>{account.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {selectedAccount && (
            <div className="flex gap-2">
              <button
                onClick={() => handleAccountSwitch('prev')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Conta Anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleAccountSwitch('next')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Próxima Conta"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          <button
            onClick={() => setShowTransferForm(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-indigo-700 transition-colors"
          >
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            Transferência
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Pesquisar lançamentos..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <DateFilter onChange={handleDateFilterChange} />
      </div>

      {!selectedAccount ? (
        <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">Selecione uma conta bancária</h3>
            <p className="mt-1 text-sm text-gray-500">
              Escolha uma conta bancária para visualizar as conciliações
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-white rounded-lg shadow overflow-hidden flex flex-col">
          <div className="p-6 border-b">
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-green-600 mb-1">Total de Entradas</h3>
                <p className="text-2xl font-bold text-green-700">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                    .format(totals.income)}
                </p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-red-600 mb-1">Total de Saídas</h3>
                <p className="text-2xl font-bold text-red-700">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                    .format(totals.expense)}
                </p>
              </div>
              <div className={`${totals.balance < 0 ? 'bg-red-50' : 'bg-green-50'} p-4 rounded-lg`}>
                <h3 className={`text-sm font-medium ${totals.balance < 0 ? 'text-red-600' : 'text-green-600'} mb-1`}>
                  Saldo do Período
                </h3>
                <p className={`text-2xl font-bold ${totals.balance < 0 ? 'text-red-700' : 'text-green-700'}`}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                    .format(totals.balance)}
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fornecedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Centro de Custo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Conta
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saldo
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Anexos
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.from(groupedTransactions.entries()).map(([date, group]) => (
                  <React.Fragment key={date}>
                    {group.transactions.map(transaction => {
                      const account = bankAccounts.find(a => a.id === transaction.bankAccount);
                      return (
                        <tr key={transaction.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {formatDate(transaction.dueDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {transaction.supplier || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {transaction.category || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {transaction.costCenter || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {account?.name}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-right ${
                            transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                              .format(transaction.amount.toNumber())}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {/* Leave balance cell empty for individual transactions */}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Conciliado
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => handleUnconciliate(transaction)}
                              className="text-gray-600 hover:text-gray-900 transition-colors"
                              title="Desconciliar"
                            >
                              <RefreshCw className="w-5 h-5" />
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {transaction.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {transaction.attachments && transaction.attachments.length > 0 && (
                              <div className="flex gap-2">
                                {transaction.attachments.map(attachment => (
                                  <a
                                    key={attachment.id}
                                    href={attachment.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 transition-colors"
                                    title={attachment.name}
                                  >
                                    <FileText className="w-5 h-5" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-gray-50">
                      <td colSpan={6} className="px-6 py-3 font-medium text-lg">
                        {formatDate(new Date(date))}
                      </td>
                      <td className={`px-6 py-3 text-right font-medium text-lg ${
                        group.balance.isNegative() ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                          .format(group.balance.toNumber())}
                      </td>
                      <td colSpan={4}></td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showTransferForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Transferência entre Contas</h2>
              <button
                onClick={() => {
                  setShowTransferForm(false);
                  setNewTransfer({ date: new Date() });
                  setTransferError(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {transferError && (
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
                {transferError}
              </div>
            )}

            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Conta de Origem</label>
                <select
                  value={newTransfer.fromAccountId || ''}
                  onChange={(e) => setNewTransfer({
                    ...newTransfer,
                    fromAccountId: e.target.value
                  })}
                  className="w-full border rounded-lg p-2"
                  required
                >
                  <option value="">Selecione uma conta</option>
                  {bankAccounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(account.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Conta de Destino</label>
                <select
                  value={newTransfer.toAccountId || ''}
                  onChange={(e) => setNewTransfer({
                    ...newTransfer,
                    toAccountId: e.target.value
                  })}
                  className="w-full border rounded-lg p-2"
                  required
                >
                  <option value="">Selecione uma conta</option>
                  {bankAccounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>

              <SmartInput
                type="currency"
                label="Valor"
                value={newTransfer.amount || ''}
                onChange={(value) => setNewTransfer({
                  ...newTransfer,
                  amount: value
                })}
                required
                placeholder="R$ 0,00"
              />

              <div>
                <label className="block text-sm font-medium mb-1">Data</label>
                <input
                  type="date"
                  value={newTransfer.date?.toISOString().split('T')[0] || ''}
                  onChange={(e) => setNewTransfer({
                    ...newTransfer,
                    date: new Date(e.target.value)
                  })}
                  className="w-full border rounded-lg p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Descrição</label>
                <input
                  type="text"
                  value={newTransfer.description || ''}
                  onChange={(e) => setNewTransfer({
                    ...newTransfer,
                    description: e.target.value
                  })}
                  className="w-full border rounded-lg p-2"
                  required
                  placeholder="Ex: Transferência entre contas"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowTransferForm(false);
                    setNewTransfer({ date: new Date() });
                    setTransferError(null);
                  }}
                  className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Transferir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReconcileModal && autoReconcileMatches.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Conciliação Automática</h2>
              <button
                onClick={() => {
                  setShowReconcileModal(false);
                  setAutoReconcileMatches([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-gray-600">
                Encontramos {autoReconcileMatches.length} lançamentos correspondentes. 
                Deseja conciliar automaticamente?
              </p>
            </div>

            <div className="max-h-96 overflow-auto mb-4">
              {autoReconcileMatches.map(({ statement, transaction }) => (
                <div key={statement.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-2">
                  <div>
                    <div className="font-medium">{transaction.description}</div>
                    <div className="text-sm text-gray-500">
                      {transaction.dueDate.toLocaleDateString()} • 
                      {transaction.type === 'income' ? ' Receita' : ' Despesa'}
                    </div>
                    {transaction.attachments && transaction.attachments.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {transaction.attachments.map(attachment => (
                          <a
                            key={attachment.id}
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                            title={attachment.name}
                          >
                            <FileText className="w-4 h-4" />
                            <span className="text-sm">Ver anexo</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                        .format(transaction.amount.toNumber())}
                    </div>
                    <div className="text-sm text-gray-500">
                      {statement.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowReconcileModal(false);
                  setAutoReconcileMatches([]);
                }}
                className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAutoReconcile}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Conciliar Automaticamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConciliacaoBancaria;