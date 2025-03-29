import React, { useState } from 'react';
import { Plus, Search, Filter, Download, Upload } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Transaction } from '../types';
import SmartInput from './SmartInput';
import { useTransactionSuggestions } from '../hooks/useSuggestions';
import { useFinancialStore } from '../lib/store';
import { Decimal } from 'decimal.js';

const BaseContas: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [newTransaction, setNewTransaction] = useState<Partial<Transaction>>({
    type: 'income',
    competenceDate: new Date(),
    dueDate: new Date(),
    status: 'pending'
  });
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Get transactions from global store
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useFinancialStore();

  // Get suggestions based on current transaction data
  const suggestions = useTransactionSuggestions(newTransaction);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTransaction.description && newTransaction.amount) {
      const transaction: Transaction = {
        ...newTransaction as Transaction,
        id: Date.now().toString(),
        amount: new Decimal(newTransaction.amount),
      };
      
      addTransaction(transaction);
      setShowForm(false);
      setNewTransaction({
        type: 'income',
        competenceDate: new Date(),
        dueDate: new Date(),
        status: 'pending'
      });
    }
  };

  const handleSuggestionApply = (field: string, value: any) => {
    setNewTransaction(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesType = filterType === 'all' || transaction.type === filterType;
    const matchesSearch = searchTerm === '' || 
      transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.supplier?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleStatusChange = (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (transaction) {
      updateTransaction(transactionId, {
        status: transaction.status === 'pending' ? 'completed' : 'pending'
      });
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Base de Contas</h1>
        <div className="flex gap-2">
          <button
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center"
            onClick={() => {/* Implementar exportação */}}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
            onClick={() => {/* Implementar importação */}}
          >
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Lançamento
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
        <select
          className="px-4 py-2 border rounded-lg"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as 'all' | 'income' | 'expense')}
        >
          <option value="all">Todos</option>
          <option value="income">Entradas</option>
          <option value="expense">Saídas</option>
        </select>
        <button className="px-4 py-2 border rounded-lg flex items-center text-gray-600">
          <Filter className="w-4 h-4 mr-2" />
          Filtros Avançados
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4">Novo Lançamento</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo</label>
                  <select
                    className="w-full border rounded-lg p-2"
                    value={newTransaction.type}
                    onChange={(e) => setNewTransaction({
                      ...newTransaction,
                      type: e.target.value as 'income' | 'expense'
                    })}
                  >
                    <option value="income">Entrada</option>
                    <option value="expense">Saída</option>
                  </select>
                </div>
                <SmartInput
                  type="text"
                  label="Descrição"
                  value={newTransaction.description || ''}
                  onChange={(value) => setNewTransaction({
                    ...newTransaction,
                    description: value
                  })}
                  suggestions={suggestions}
                  onApplySuggestion={handleSuggestionApply}
                />
                <SmartInput
                  type="text"
                  label="Fornecedor/Cliente"
                  value={newTransaction.supplier || ''}
                  onChange={(value) => setNewTransaction({
                    ...newTransaction,
                    supplier: value
                  })}
                  suggestions={suggestions}
                  onApplySuggestion={handleSuggestionApply}
                />
                <SmartInput
                  type="number"
                  label="Valor"
                  value={newTransaction.amount?.toString() || ''}
                  onChange={(value) => setNewTransaction({
                    ...newTransaction,
                    amount: new Decimal(value || 0)
                  })}
                  suggestions={suggestions}
                  onApplySuggestion={handleSuggestionApply}
                />
                <SmartInput
                  type="text"
                  label="Categoria"
                  value={newTransaction.category || ''}
                  onChange={(value) => setNewTransaction({
                    ...newTransaction,
                    category: value
                  })}
                  suggestions={suggestions}
                  onApplySuggestion={handleSuggestionApply}
                />
                <div>
                  <label className="block text-sm font-medium mb-1">Data de Competência</label>
                  <DatePicker
                    selected={newTransaction.competenceDate}
                    onChange={(date) => setNewTransaction({
                      ...newTransaction,
                      competenceDate: date || new Date()
                    })}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Data de Vencimento</label>
                  <DatePicker
                    selected={newTransaction.dueDate}
                    onChange={(date) => setNewTransaction({
                      ...newTransaction,
                      dueDate: date || new Date()
                    })}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
                <SmartInput
                  type="text"
                  label="Número da Nota"
                  value={newTransaction.invoiceNumber || ''}
                  onChange={(value) => setNewTransaction({
                    ...newTransaction,
                    invoiceNumber: value
                  })}
                  suggestions={suggestions}
                  onApplySuggestion={handleSuggestionApply}
                />
                <SmartInput
                  type="text"
                  label="Conta Bancária"
                  value={newTransaction.bankAccount || ''}
                  onChange={(value) => setNewTransaction({
                    ...newTransaction,
                    bankAccount: value
                  })}
                  suggestions={suggestions}
                  onApplySuggestion={handleSuggestionApply}
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-600 border rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex-1 bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Descrição
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fornecedor/Cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Categoria
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Competência
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vencimento
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTransactions.map((transaction) => (
              <tr key={transaction.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {transaction.type === 'income' ? 'Entrada' : 'Saída'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{transaction.description}</td>
                <td className="px-6 py-4 whitespace-nowrap">{transaction.supplier}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transaction.amount.toNumber())}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{transaction.category}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {transaction.competenceDate.toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {transaction.dueDate.toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleStatusChange(transaction.id)}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                      transaction.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {transaction.status === 'completed' ? 'Realizado' : 'Pendente'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button className="text-indigo-600 hover:text-indigo-900">Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BaseContas;