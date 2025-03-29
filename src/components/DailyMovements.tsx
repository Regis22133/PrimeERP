import React, { useState, useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { useFinancialStore } from '../lib/store';
import { Decimal } from 'decimal.js';
import DateFilter from './DateFilter';

const DailyMovements: React.FC = () => {
  const [expandedDays, setExpandedDays] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState({
    type: 'month',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
  });

  const { transactions } = useFinancialStore();

  const groupedTransactions = useMemo(() => {
    const filtered = transactions.filter(transaction => {
      const matchesDate = transaction.dueDate >= dateFilter.startDate && 
                       transaction.dueDate <= dateFilter.endDate;
      return matchesDate;
    });

    filtered.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    const groups = new Map<string, {
      transactions: typeof filtered;
      income: Decimal;
      expense: Decimal;
      balance: Decimal;
      runningBalance: Decimal;
    }>();

    let runningBalance = new Decimal(0);

    filtered.forEach(transaction => {
      const dateKey = transaction.dueDate.toISOString().split('T')[0];
      
      if (!groups.has(dateKey)) {
        groups.set(dateKey, {
          transactions: [],
          income: new Decimal(0),
          expense: new Decimal(0),
          balance: new Decimal(0),
          runningBalance: new Decimal(0)
        });
      }

      const group = groups.get(dateKey)!;
      group.transactions.push(transaction);

      if (transaction.type === 'income') {
        group.income = group.income.plus(transaction.amount);
        runningBalance = runningBalance.plus(transaction.amount);
      } else {
        group.expense = group.expense.plus(transaction.amount);
        runningBalance = runningBalance.minus(transaction.amount);
      }

      group.balance = group.income.minus(group.expense);
      group.runningBalance = runningBalance;
    });

    return groups;
  }, [transactions, dateFilter]);

  const totals = useMemo(() => {
    let income = new Decimal(0);
    let expense = new Decimal(0);

    groupedTransactions.forEach(group => {
      income = income.plus(group.income);
      expense = expense.plus(group.expense);
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

  const toggleDay = (day: string) => {
    setExpandedDays(prev => 
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Movimentações Diárias</h1>
        <DateFilter onChange={handleDateFilterChange} />
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
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

      <div className="flex-1 bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entradas
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Saídas
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
              {Array.from(groupedTransactions.entries()).map(([date, group]) => (
                <React.Fragment key={date}>
                  <tr 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleDay(date)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <ChevronRight 
                          className={`w-4 h-4 mr-2 transition-transform ${
                            expandedDays.includes(date) ? 'rotate-90' : ''
                          }`}
                        />
                        {formatDate(new Date(date))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-green-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                        .format(group.income.toNumber())}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-red-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                        .format(group.expense.toNumber())}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                        .format(group.balance.toNumber())}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                        .format(group.runningBalance.toNumber())}
                    </td>
                  </tr>
                  {expandedDays.includes(date) && group.transactions.map(transaction => (
                    <tr key={transaction.id} className="bg-gray-50/50">
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="flex items-center ml-6">
                          <span className="text-sm text-gray-600">
                            {transaction.description}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right">
                        {transaction.type === 'income' && (
                          <span className="text-green-600">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                              .format(transaction.amount.toNumber())}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right">
                        {transaction.type === 'expense' && (
                          <span className="text-red-600">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                              .format(transaction.amount.toNumber())}
                          </span>
                        )}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
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

export default DailyMovements;