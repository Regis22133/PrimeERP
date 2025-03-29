import React, { useState, useRef, useMemo } from 'react';
import { Plus, Search, Filter, Download, Upload, Edit2, Trash2, X, AlertCircle, FileText, Paperclip, AlertTriangle } from 'lucide-react';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { ptBR } from 'date-fns/locale';
import { Transaction, SearchColumn } from '../types';
import SmartInput from './SmartInput';
import { useTransactionSuggestions } from '../hooks/useSuggestions';
import { useFinancialStore } from '../lib/store';
import { Decimal } from 'decimal.js';
import DateFilter from './DateFilter';
import SearchColumnSelect from './SearchColumnSelect';
import { v4 as uuidv4 } from 'uuid';
import { generateTemplate, parseTransactions, exportTransactions } from '../lib/excel';

// Register Brazilian locale
registerLocale('pt-BR', ptBR);

interface FileUploadState {
  file: File | null;
  uploading: boolean;
  error: string | null;
}

const ContasReceber: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [newTransaction, setNewTransaction] = useState<Partial<Transaction>>({
    type: 'income',
    competenceDate: new Date(),
    dueDate: new Date(),
    status: 'pending'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSearchColumn, setSelectedSearchColumn] = useState('all');
  const [dateFilter, setDateFilter] = useState({
    type: 'month',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
  });
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileUpload, setFileUpload] = useState<FileUploadState>({
    file: null,
    uploading: false,
    error: null
  });

  const { 
    transactions, 
    bankAccounts, 
    categoryTypes,
    costCenters,
    contacts,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addAttachment,
    deleteAttachment
  } = useFinancialStore();

  // Calculate overdue metrics
  const overdueMetrics = useMemo(() => {
    const now = new Date();
    const incomeTransactions = transactions.filter(t => 
      t.type === 'income' && 
      t.status === 'pending'
    );
    
    const overdueTransactions = incomeTransactions.filter(t => t.dueDate < now);
    
    const totalReceivables = incomeTransactions.reduce(
      (sum, t) => sum.plus(t.amount), 
      new Decimal(0)
    );
    
    const overdueAmount = overdueTransactions.reduce(
      (sum, t) => sum.plus(t.amount), 
      new Decimal(0)
    );

    // Group overdue transactions by days overdue
    const byDaysOverdue = overdueTransactions.reduce((acc, t) => {
      const daysOverdue = Math.floor((now.getTime() - t.dueDate.getTime()) / (1000 * 60 * 60 * 24));
      if (!acc[daysOverdue]) {
        acc[daysOverdue] = {
          count: 0,
          amount: new Decimal(0)
        };
      }
      acc[daysOverdue].count++;
      acc[daysOverdue].amount = acc[daysOverdue].amount.plus(t.amount);
      return acc;
    }, {} as Record<number, { count: number; amount: Decimal }>);

    // Calculate aging buckets (1-30, 31-60, 61-90, >90 days)
    const aging = {
      '1-30': { count: 0, amount: new Decimal(0) },
      '31-60': { count: 0, amount: new Decimal(0) },
      '61-90': { count: 0, amount: new Decimal(0) },
      '>90': { count: 0, amount: new Decimal(0) }
    };

    Object.entries(byDaysOverdue).forEach(([days, data]) => {
      const daysNum = parseInt(days);
      if (daysNum <= 30) {
        aging['1-30'].count += data.count;
        aging['1-30'].amount = aging['1-30'].amount.plus(data.amount);
      } else if (daysNum <= 60) {
        aging['31-60'].count += data.count;
        aging['31-60'].amount = aging['31-60'].amount.plus(data.amount);
      } else if (daysNum <= 90) {
        aging['61-90'].count += data.count;
        aging['61-90'].amount = aging['61-90'].amount.plus(data.amount);
      } else {
        aging['>90'].count += data.count;
        aging['>90'].amount = aging['>90'].amount.plus(data.amount);
      }
    });

    return {
      count: overdueTransactions.length,
      amount: overdueAmount.toNumber(),
      rate: totalReceivables.isZero() ? 0 : overdueAmount.dividedBy(totalReceivables).times(100).toNumber(),
      aging,
      transactions: overdueTransactions
    };
  }, [transactions]);

  const suggestions = useTransactionSuggestions(newTransaction);
  const incomeCategories = categoryTypes.filter(cat => cat.type === 'income');
  const activeCostCenters = costCenters.filter(cc => cc.active);
  const clients = contacts.filter(c => c.type === 'client');

  const searchColumns: SearchColumn[] = [
    { id: 'all', label: 'Todas as Colunas', field: 'description' },
    { id: 'supplier', label: 'Cliente', field: 'supplier' },
    { id: 'bankAccount', label: 'Banco', field: 'bankAccount' },
    { id: 'amount', label: 'Valor', field: 'amount' },
    { id: 'category', label: 'Categoria', field: 'category' },
    { id: 'costCenter', label: 'Centro de Custo', field: 'costCenter' },
    { id: 'invoiceNumber', label: 'NF', field: 'invoiceNumber' },
    { id: 'dueDate', label: 'Vencimento', field: 'dueDate' }
  ];

  // Filter transactions based on search and type
  const filteredTransactions = transactions.filter(transaction => {
    // First check type and status
    if (transaction.type !== 'income') return false;
    if (transaction.status !== 'pending') return false;

    // Check date range
    if (transaction.dueDate < dateFilter.startDate || transaction.dueDate > dateFilter.endDate) {
      return false;
    }

    // Check search term
    if (searchTerm) {
      if (selectedSearchColumn === 'all') {
        return (
          transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.costCenter?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bankAccounts.find(a => a.id === transaction.bankAccount)?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.amount.toString().includes(searchTerm) ||
          transaction.dueDate.toLocaleDateString('pt-BR').includes(searchTerm)
        );
      }

      const column = searchColumns.find(col => col.id === selectedSearchColumn);
      if (!column) return false;

      if (column.field === 'bankAccount') {
        const bankAccount = bankAccounts.find(a => a.id === transaction.bankAccount);
        return bankAccount?.name.toLowerCase().includes(searchTerm.toLowerCase());
      }

      if (column.field === 'amount') {
        return transaction.amount.toString().includes(searchTerm);
      }

      if (column.field === 'dueDate') {
        return transaction.dueDate.toLocaleDateString('pt-BR').includes(searchTerm);
      }

      if (column.field === 'costCenter' && transaction.costCenter) {
        return transaction.costCenter.toLowerCase().includes(searchTerm.toLowerCase());
      }

      if (column.field === 'invoiceNumber' && transaction.invoiceNumber) {
        return transaction.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
      }

      const value = transaction[column.field];
      return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
    }

    return true;
  });

  // Sort transactions by due date and overdue status
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      const aIsOverdue = a.dueDate < new Date();
      const bIsOverdue = b.dueDate < new Date();

      if (aIsOverdue && !bIsOverdue) return -1;
      if (!aIsOverdue && bIsOverdue) return 1;
      return a.dueDate.getTime() - b.dueDate.getTime();
    });
  }, [filteredTransactions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTransaction.description && newTransaction.amount && newTransaction.category) {
      try {
        if (editingTransaction) {
          await updateTransaction(editingTransaction.id, newTransaction);
        } else {
          const transaction: Transaction = {
            ...newTransaction as Transaction,
            id: uuidv4(),
            type: 'income',
            amount: new Decimal(newTransaction.amount),
          };
          await addTransaction(transaction);
        }
        setShowForm(false);
        setEditingTransaction(null);
        setNewTransaction({
          type: 'income',
          competenceDate: new Date(),
          dueDate: new Date(),
          status: 'pending'
        });
      } catch (error) {
        console.error('Error saving transaction:', error);
        alert('Erro ao salvar transação. Por favor, tente novamente.');
      }
    }
  };

  const handleSuggestionApply = (field: string, value: any) => {
    setNewTransaction(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDateFilterChange = (filterType: string, startDate?: Date, endDate?: Date) => {
    if (startDate && endDate) {
      setDateFilter({ type: filterType, startDate, endDate });
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setNewTransaction({
      ...transaction,
      amount: transaction.amount.toNumber()
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta transação?')) {
      try {
        await deleteTransaction(id);
      } catch (error) {
        console.error('Error deleting transaction:', error);
        alert('Erro ao excluir transação. Por favor, tente novamente.');
      }
    }
  };

  const handleStatusChange = async (transactionId: string) => {
    try {
      const transaction = transactions.find(t => t.id === transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      const newStatus = transaction.status === 'pending' ? 'completed' : 'pending';
      await updateTransaction(transactionId, {
        status: newStatus,
        reconciled: newStatus === 'completed'
      });
    } catch (error) {
      console.error('Error updating transaction status:', error);
      alert('Erro ao atualizar status. Por favor, tente novamente.');
    }
  };

  const handleDownloadTemplate = () => {
    const blob = generateTemplate();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_lancamentos.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    const blob = exportTransactions(filteredTransactions);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contas_a_receber_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportError(null);
      const transactions = await parseTransactions(file);
      
      const validBankAccounts = new Set(bankAccounts.map(a => a.name));
      const validCategories = new Set(incomeCategories.map(c => c.name));
      const validCostCenters = new Set(activeCostCenters.map(c => c.name));
      const validClients = new Set(clients.map(c => c.name));

      const errors: string[] = [];
      transactions.forEach((t, index) => {
        const row = index + 2;
        if (t.bankAccount && !validBankAccounts.has(t.bankAccount)) {
          errors.push(`Linha ${row}: Conta bancária "${t.bankAccount}" não encontrada`);
        }
        if (t.category && !validCategories.has(t.category)) {
          errors.push(`Linha ${row}: Categoria "${t.category}" não encontrada`);
        }
        if (t.costCenter && !validCostCenters.has(t.costCenter)) {
          errors.push(`Linha ${row}: Centro de custo "${t.costCenter}" não encontrado`);
        }
        if (t.supplier && !validClients.has(t.supplier)) {
          errors.push(`Linha ${row}: Cliente "${t.supplier}" não encontrado`);
        }
      });

      if (errors.length > 0) {
        setImportError(`Erros encontrados:\n${errors.join('\n')}`);
        return;
      }

      await Promise.all(
        transactions.map(t => addTransaction({
          ...t,
          id: uuidv4(),
          type: 'income',
          bankAccount: bankAccounts.find(a => a.name === t.bankAccount)?.id || '',
        } as Transaction))
      );

      alert('Importação concluída com sucesso!');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error importing transactions:', error);
      setImportError(error instanceof Error ? error.message : 'Erro ao importar transações');
    }
  };

  const handleFileUpload = async (transaction: Transaction) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.multiple = true; // Allow multiple file selection
    
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files?.length) return;

      setFileUpload({ file: files[0], uploading: true, error: null });

      try {
        // Upload each file
        for (let i = 0; i < files.length; i++) {
          await addAttachment(transaction.id, files[i]);
        }
        
        setFileUpload({ file: null, uploading: false, error: null });
      } catch (error) {
        console.error('Error uploading file:', error);
        setFileUpload({
          file: null,
          uploading: false,
          error: 'Erro ao fazer upload do arquivo'
        });
      }
    };
    input.click();
  };

  const handleFileDelete = async (attachmentId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este anexo?')) {
      try {
        await deleteAttachment(attachmentId);
      } catch (error) {
        console.error('Error deleting file:', error);
        alert('Erro ao excluir arquivo. Por favor, tente novamente.');
      }
    }
  };

  const renderActions = (transaction: Transaction) => (
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="flex gap-2">
        <button
          onClick={() => handleEdit(transaction)}
          className="text-blue-600 hover:text-blue-800"
          title="Editar"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleDelete(transaction.id)}
          className="text-red-600 hover:text-red-800"
          title="Excluir"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <div className="flex gap-1">
          <button
            onClick={() => handleFileUpload(transaction)}
            className="text-gray-600 hover:text-gray-800"
            title="Anexar arquivo"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          {transaction.attachments?.map((attachment) => (
            <div key={attachment.id} className="flex gap-1">
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:text-green-800"
                title={attachment.name}
              >
                <FileText className="w-4 h-4" />
              </a>
              <button
                onClick={() => handleFileDelete(attachment.id)}
                className="text-red-600 hover:text-red-800"
                title="Excluir anexo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </td>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Contas a Receber</h1>
          <p className="text-gray-500 mt-1">
            {overdueMetrics.count > 0 ? (
              <span className="text-red-600">
                {overdueMetrics.count} recebimentos em atraso, totalizando{' '}
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                  .format(overdueMetrics.amount)}
                {' '}({overdueMetrics.rate.toFixed(1)}% do total a receber)
              </span>
            ) : (
              <span className="text-green-600">
                Nenhum recebimento em atraso
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-green-700 transition-colors"
            onClick={handleExport}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>
          <div className="flex flex-col gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImport}
              accept=".xlsx,.xls"
              className="hidden"
            />
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </button>
            <button
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 text-sm bg-white border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 shadow-sm flex items-center gap-2 group"
            >
              <Download className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
              <span>Baixar Modelo</span>
            </button>
          </div>
          <button
            onClick={() => {
              setEditingTransaction(null);
              setNewTransaction({
                type: 'income',
                competenceDate: new Date(),
                dueDate: new Date(),
                status: 'pending'
              });
              setShowForm(true);
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Recebimento
          </button>
        </div>
      </div>

      {overdueMetrics.count > 0 && (
        <div className="mb-6 grid grid-cols-4 gap-4">
          <div className="bg-red-50 p-4 rounded-lg border border-red-100">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="font-medium text-red-900">1-30 dias em atraso</h3>
            </div>
            <p className="text-2xl font-bold text-red-700">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                .format(overdueMetrics.aging['1-30'].amount.toNumber())}
            </p>
            <p className="text-sm text-red-600 mt-1">
              {overdueMetrics.aging['1-30'].count} recebimentos
            </p>
          </div>

          <div className="bg-red-50 p-4 rounded-lg border border-red-100">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-700" />
              <h3 className="font-medium text-red-900">31-60 dias em atraso</h3>
            </div>
            <p className="text-2xl font-bold text-red-700">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                .format(overdueMetrics.aging['31-60'].amount.toNumber())}
            </p>
            <p className="text-sm text-red-600 mt-1">
              {overdueMetrics.aging['31-60'].count} recebimentos
            </p>
          </div>

          <div className="bg-red-50 p-4 rounded-lg border border-red-100">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-800" />
              <h3 className="font-medium text-red-900">61-90 dias em atraso</h3>
            </div>
            <p className="text-2xl font-bold text-red-700">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                .format(overdueMetrics.aging['61-90'].amount.toNumber())}
            </p>
            <p className="text-sm text-red-600 mt-1">
              {overdueMetrics.aging['61-90'].count} recebimentos
            </p>
          </div>

          <div className="bg-red-50 p-4 rounded-lg border border-red-100">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-900" />
              <h3 className="font-medium text-red-900">Mais de 90 dias em atraso</h3>
            </div>
            <p className="text-2xl font-bold text-red-700">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                .format(overdueMetrics.aging['>90'].amount.toNumber())}
            </p>
            <p className="text-sm text-red-600 mt-1">
              {overdueMetrics.aging['>90'].count} recebimentos
            </p>
          </div>
        </div>
      )}

      {importError && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5" />
            <div>
              <h3 className="text-red-800 font-medium">Erro na importação</h3>
              <pre className="text-red-600 mt-1 text-sm whitespace-pre-wrap">
                {importError}
              </pre>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 mb-6">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Pesquisar recebimentos..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <SearchColumnSelect
            columns={searchColumns}
            selectedColumn={selectedSearchColumn}
            onColumnChange={setSelectedSearchColumn}
          />
        </div>
        <DateFilter onChange={handleDateFilterChange} />
      </div>

      <div className="flex-1 bg-white rounded-lg shadow overflow-hidden flex flex-col">
        <div className="overflow-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  NF
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Banco
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoria
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Centro de Custo
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descrição
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedTransactions.map((transaction) => {
                const bankAccount = bankAccounts.find(a => a.id === transaction.bankAccount);
                const isOverdue = transaction.dueDate < new Date();
                const daysOverdue = isOverdue ? 
                  Math.floor((new Date().getTime() - transaction.dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                
                let overdueClass = '';
                if (isOverdue) {
                  if (daysOverdue > 90) overdueClass = 'bg-red-100';
                  else if (daysOverdue > 60) overdueClass = 'bg-red-50';
                  else if (daysOverdue > 30) overdueClass = 'bg-orange-50';
                  else overdueClass = 'bg-yellow-50';
                }
                
                return (
                  <tr key={transaction.id} className={overdueClass}>
                    <td className="px-6 py-4 whitespace-nowrap">{transaction.supplier}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{transaction.invoiceNumber || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{bankAccount?.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-green-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                        .format(transaction.amount.toNumber())}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{transaction.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{transaction.costCenter || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      
                      {transaction.competenceDate.toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                          {transaction.dueDate.toLocaleDateString('pt-BR')}
                        </span>
                        {isOverdue && (
                          <span className="ml-2 text-xs text-red-600 font-medium">
                            ({daysOverdue} dias)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleStatusChange(transaction.id)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isOverdue 
                            ? daysOverdue > 90
                              ? 'bg-red-100 text-red-800'
                              : daysOverdue > 60
                                ? 'bg-red-50 text-red-800'
                                : daysOverdue > 30
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {isOverdue ? `${daysOverdue} dias em atraso` : 'Pendente'}
                      </button>
                    </td>
                    {renderActions(transaction)}
                    <td className="px-6 py-4 whitespace-nowrap">{transaction.description}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4">
              {editingTransaction ? 'Editar Recebimento' : 'Novo Recebimento'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-sm font-medium mb-1">Cliente</label>
                  <select
                    value={newTransaction.supplier || ''}
                    onChange={(e) => setNewTransaction({
                      ...newTransaction,
                      supplier: e.target.value
                    })}
                    className="w-full border rounded-lg p-2"
                    required
                  >
                    <option value="">Selecione um cliente</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.name}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
                <SmartInput
                  type="currency"
                  label="Valor"
                  value={newTransaction.amount || ''}
                  onChange={(value) => setNewTransaction({
                    ...newTransaction,
                    amount: value
                  })}
                  suggestions={suggestions}
                  onApplySuggestion={handleSuggestionApply}
                />
                <div>
                  <label className="block text-sm font-medium mb-1">Categoria</label>
                  <select
                    value={newTransaction.category || ''}
                    onChange={(e) => setNewTransaction({
                      ...newTransaction,
                      category: e.target.value
                    })}
                    className="w-full border rounded-lg p-2"
                    required
                  >
                    <option value="">Selecione uma categoria</option>
                    {incomeCategories.map(category => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Centro de Custo</label>
                  <select
                    value={newTransaction.costCenter || ''}
                    onChange={(e) => setNewTransaction({
                      ...newTransaction,
                      costCenter: e.target.value
                    })}
                    className="w-full border rounded-lg p-2"
                  >
                    <option value="">Selecione um centro de custo</option>
                    {activeCostCenters.map(costCenter => (
                      <option key={costCenter.id} value={costCenter.name}>
                        {costCenter.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Data de Competência</label>
                  <DatePicker
                    selected={newTransaction.competenceDate}
                    onChange={(date) => setNewTransaction({
                      ...newTransaction,
                      competenceDate: date || new Date()
                    })}
                    className="w-full border rounded-lg p-2"
                    locale="pt-BR"
                    dateFormat="dd/MM/yyyy"
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
                    locale="pt-BR"
                    dateFormat="dd/MM/yyyy"
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
                <div>
                  <label className="block text-sm font-medium mb-1">Conta Bancária</label>
                  <select
                    value={newTransaction.bankAccount || ''}
                    onChange={(e) => setNewTransaction({
                      ...newTransaction,
                      bankAccount: e.target.value
                    })}
                    className="w-full border rounded-lg p-2"
                    required
                  >
                    <option value="">Selecione uma conta</option>
                    {bankAccounts.map(account => (
                      <option key={account.id} value={account.id}>{account.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingTransaction(null);
                    setNewTransaction({
                      type: 'income',
                      competenceDate: new Date(),
                      dueDate: new Date(),
                      status: 'pending'
                    });
                  }}
                  className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingTransaction ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContasReceber;