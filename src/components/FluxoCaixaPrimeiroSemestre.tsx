import React, { useState, useEffect } from 'react';
import { Download, Filter, Search, ChevronRight } from 'lucide-react';
import { Transaction, DailyFlow } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const FluxoCaixaPrimeiroSemestre: React.FC = () => {
  const [selectedAccount, setSelectedAccount] = useState('');
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);
  const [monthlyData, setMonthlyData] = useState<Record<string, DailyFlow[]>>({});
  const [runningBalance, setRunningBalance] = useState(0);

  const accounts = [
    { id: '1', name: 'Conta Principal' },
    { id: '2', name: 'Conta Secundária' }
  ];

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho'];

  // Sample transactions for demonstration
  const sampleTransactions: Transaction[] = [
    {
      id: '1',
      type: 'income',
      description: 'Venda de Produtos',
      amount: 5000,
      category: 'Vendas',
      competenceDate: new Date('2024-01-05'),
      dueDate: new Date('2024-01-05'),
      status: 'completed',
      invoiceNumber: 'NF-001',
      bankAccount: '1',
      supplier: 'Cliente A'
    },
    {
      id: '2',
      type: 'expense',
      description: 'Pagamento Fornecedor',
      amount: 2000,
      category: 'Fornecedores',
      competenceDate: new Date('2024-01-05'),
      dueDate: new Date('2024-01-05'),
      status: 'completed',
      invoiceNumber: 'NF-002',
      bankAccount: '1',
      supplier: 'Fornecedor X'
    },
    // Add more sample transactions as needed
  ];

  useEffect(() => {
    // Group transactions by month and day
    const groupedData: Record<string, DailyFlow[]> = {};
    let currentBalance = 0;

    months.forEach(month => {
      groupedData[month] = [];
      
      // Filter transactions for this month and sort by date
      const monthTransactions = sampleTransactions
        .filter(t => {
          const transactionMonth = format(t.competenceDate, 'MMMM', { locale: ptBR });
          return transactionMonth === month;
        })
        .sort((a, b) => a.competenceDate.getTime() - b.competenceDate.getTime());

      // Group by day
      const dailyGroups = monthTransactions.reduce((groups: Record<string, Transaction[]>, transaction) => {
        const date = format(transaction.competenceDate, 'yyyy-MM-dd');
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(transaction);
        return groups;
      }, {});

      // Create daily flows with running balances
      Object.entries(dailyGroups).forEach(([date, transactions]) => {
        const totalReceitas = transactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);
        
        const totalDespesas = transactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);

        const dailyBalance = totalReceitas - totalDespesas;
        currentBalance += dailyBalance;

        groupedData[month].push({
          date,
          transactions,
          totalReceitas,
          totalDespesas,
          balance: dailyBalance,
          runningBalance: currentBalance
        });
      });
    });

    setMonthlyData(groupedData);
    setRunningBalance(currentBalance);
  }, []);

  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => 
      prev.includes(month)
        ? prev.filter(m => m !== month)
        : [...prev, month]
    );
  };

  const getMonthlyTotals = (month: string) => {
    const monthData = monthlyData[month] || [];
    return {
      receitas: monthData.reduce((sum, day) => sum + day.totalReceitas, 0),
      despesas: monthData.reduce((sum, day) => sum + day.totalDespesas, 0),
      balance: monthData.reduce((sum, day) => sum + day.balance, 0)
    };
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Fluxo de Caixa - 1º Semestre</h1>
        <div className="flex gap-4">
          <select
            className="px-4 py-2 border rounded-lg"
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
          >
            <option value="">Todas as Contas</option>
            {accounts.map(account => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-6 p-6 border-b">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-600 mb-1">Total de Receitas</h3>
            <p className="text-2xl font-bold text-blue-700">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                .format(months.reduce((sum, month) => sum + getMonthlyTotals(month).receitas, 0))}
            </p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-red-600 mb-1">Total de Despesas</h3>
            <p className="text-2xl font-bold text-red-700">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                .format(months.reduce((sum, month) => sum + getMonthlyTotals(month).despesas, 0))}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-green-600 mb-1">Saldo Acumulado</h3>
            <p className="text-2xl font-bold text-green-700">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                .format(runningBalance)}
            </p>
          </div>
        </div>

        {/* Monthly Flow Table with Daily Details */}
        <div className="p-6">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descrição
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Receitas
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Despesas
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Saldo do Dia
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Saldo Acumulado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {months.map(month => (
                <React.Fragment key={month}>
                  <tr className="bg-gray-50 cursor-pointer hover:bg-gray-100" onClick={() => toggleMonth(month)}>
                    <td className="px-6 py-4 whitespace-nowrap" colSpan={2}>
                      <div className="flex items-center">
                        <ChevronRight className={`w-4 h-4 mr-2 transform transition-transform ${
                          expandedMonths.includes(month) ? 'rotate-90' : ''
                        }`} />
                        <span className="font-medium text-gray-900">{month}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-600 font-medium">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                        .format(getMonthlyTotals(month).receitas)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600 font-medium">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                        .format(getMonthlyTotals(month).despesas)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                        .format(getMonthlyTotals(month).balance)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                        .format(monthlyData[month]?.[monthlyData[month]?.length - 1]?.runningBalance || 0)}
                    </td>
                  </tr>
                  {expandedMonths.includes(month) && monthlyData[month]?.map((day) => (
                    <React.Fragment key={day.date}>
                      <tr className="bg-gray-50/50">
                        <td className="px-6 py-3 whitespace-nowrap" colSpan={2}>
                          <div className="flex items-center ml-6">
                            <span className="text-sm text-gray-600">
                              {format(new Date(day.date), 'dd/MM/yyyy')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-right text-sm text-green-600">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                            .format(day.totalReceitas)}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-right text-sm text-red-600">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                            .format(day.totalDespesas)}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-right text-sm">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                            .format(day.balance)}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-right text-sm">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                            .format(day.runningBalance)}
                        </td>
                      </tr>
                      {day.transactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-6 py-2 whitespace-nowrap">
                            <div className="flex items-center ml-12">
                              <span className="text-sm text-gray-500">
                                {format(transaction.competenceDate, 'HH:mm')}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap">
                            <span className="text-sm text-gray-900">{transaction.description}</span>
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap text-right text-sm">
                            {transaction.type === 'income' && (
                              <span className="text-green-600">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                                  .format(transaction.amount)}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap text-right text-sm">
                            {transaction.type === 'expense' && (
                              <span className="text-red-600">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                                  .format(transaction.amount)}
                              </span>
                            )}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FluxoCaixaPrimeiroSemestre;