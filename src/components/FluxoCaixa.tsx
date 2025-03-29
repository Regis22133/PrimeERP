import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useFinancialStore } from '../lib/store';
import { Decimal } from 'decimal.js';
import DateFilter from './DateFilter';

const FluxoCaixa: React.FC = () => {
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);
  const [expandedDays, setExpandedDays] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState({
    type: 'year',
    startDate: new Date(new Date().getFullYear(), 0, 1), // Start of year
    endDate: new Date(new Date().getFullYear(), 11, 31) // End of year
  });

  const { transactions } = useFinancialStore();

  const groupedTransactions = useMemo(() => {
    // Filter non-reconciled transactions within the selected date range
    const filtered = transactions.filter(transaction => {
      const matchesDate = transaction.dueDate >= dateFilter.startDate && 
                       transaction.dueDate <= dateFilter.endDate;
      const isNotReconciled = !transaction.reconciled;
      return matchesDate && isNotReconciled;
    });

    filtered.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    // Group by month first, then by day
    const monthGroups = new Map<string, {
      days: Map<string, {
        transactions: typeof filtered;
        income: Decimal;
        expense: Decimal;
        balance: Decimal;
        runningBalance: Decimal;
      }>;
      income: Decimal;
      expense: Decimal;
      balance: Decimal;
      runningBalance: Decimal;
    }>();

    let runningBalance = new Decimal(0);

    // Initialize all months of the year
    for (let month = 0; month < 12; month++) {
      const monthKey = new Date(dateFilter.startDate.getFullYear(), month).toISOString().slice(0, 7);
      monthGroups.set(monthKey, {
        days: new Map(),
        income: new Decimal(0),
        expense: new Decimal(0),
        balance: new Decimal(0),
        runningBalance: runningBalance
      });
    }

    filtered.forEach(transaction => {
      const monthKey = transaction.dueDate.toISOString().slice(0, 7); // YYYY-MM
      const dayKey = transaction.dueDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      const monthGroup = monthGroups.get(monthKey)!;

      // Initialize day group if it doesn't exist
      if (!monthGroup.days.has(dayKey)) {
        monthGroup.days.set(dayKey, {
          transactions: [],
          income: new Decimal(0),
          expense: new Decimal(0),
          balance: new Decimal(0),
          runningBalance: runningBalance
        });
      }

      const dayGroup = monthGroup.days.get(dayKey)!;
      dayGroup.transactions.push(transaction);

      if (transaction.type === 'income') {
        dayGroup.income = dayGroup.income.plus(transaction.amount);
        monthGroup.income = monthGroup.income.plus(transaction.amount);
        runningBalance = runningBalance.plus(transaction.amount);
      } else {
        dayGroup.expense = dayGroup.expense.plus(transaction.amount);
        monthGroup.expense = monthGroup.expense.plus(transaction.amount);
        runningBalance = runningBalance.minus(transaction.amount);
      }

      dayGroup.balance = dayGroup.income.minus(dayGroup.expense);
      dayGroup.runningBalance = runningBalance;

      monthGroup.balance = monthGroup.income.minus(monthGroup.expense);
      monthGroup.runningBalance = runningBalance;

      // Update running balance for all subsequent months
      let updatingBalance = false;
      Array.from(monthGroups.entries()).forEach(([key, group]) => {
        if (key === monthKey) {
          updatingBalance = true;
        } else if (updatingBalance) {
          group.runningBalance = runningBalance;
        }
      });
    });

    return monthGroups;
  }, [transactions, dateFilter]);

  const totals = useMemo(() => {
    let income = new Decimal(0);
    let expense = new Decimal(0);

    groupedTransactions.forEach(month => {
      income = income.plus(month.income);
      expense = expense.plus(month.expense);
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

  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => 
      prev.includes(month)
        ? prev.filter(m => m !== month)
        : [...prev, month]
    );
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

  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('pt-BR', { 
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Fluxo de Caixa</h1>
          <p className="text-gray-500 mt-1">
            Movimentações não conciliadas por data de vencimento
          </p>
        </div>
        <DateFilter onChange={handleDateFilterChange} />
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-green-600 mb-1">Total a Receber</h3>
          <p className="text-2xl font-bold text-green-700">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
              .format(totals.income)}
          </p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-red-600 mb-1">Total a Pagar</h3>
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
                  Data de Vencimento
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recebimentos
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pagamentos
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
              {Array.from(groupedTransactions.entries()).map(([monthKey, monthData]) => (
                <React.Fragment key={monthKey}>
                  {/* Month Row */}
                  <tr 
                    className="bg-gray-100 cursor-pointer hover:bg-gray-200"
                    onClick={() => toggleMonth(monthKey)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap" colSpan={5}>
                      <div className="flex items-center font-medium">
                        <ChevronDown 
                          className={`w-5 h-5 mr-2 transition-transform ${
                            expandedMonths.includes(monthKey) ? 'rotate-180' : ''
                          }`}
                        />
                        {formatMonth(monthKey)}
                      </div>
                    </td>
                  </tr>

                  {/* Day Rows */}
                  {expandedMonths.includes(monthKey) && Array.from(monthData.days.entries()).map(([dayKey, dayData]) => (
                    <React.Fragment key={dayKey}>
                      <tr 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleDay(dayKey)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center ml-6">
                            <ChevronRight 
                              className={`w-4 h-4 mr-2 transition-transform ${
                                expandedDays.includes(dayKey) ? 'rotate-90' : ''
                              }`}
                            />
                            {formatDate(new Date(dayKey))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-green-600">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                            .format(dayData.income.toNumber())}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-red-600">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                            .format(dayData.expense.toNumber())}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                            .format(dayData.balance.toNumber())}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                            .format(dayData.runningBalance.toNumber())}
                        </td>
                      </tr>

                      {/* Transaction Rows */}
                      {expandedDays.includes(dayKey) && dayData.transactions.map(transaction => (
                        <tr key={transaction.id} className="bg-gray-50/50">
                          <td className="px-6 py-3 whitespace-nowrap">
                            <div className="flex items-center ml-12">
                              <div>
                                <div className="text-sm text-gray-900">{transaction.description}</div>
                                <div className="text-xs text-gray-500">
                                  {transaction.category}
                                </div>
                              </div>
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

                  {/* Month Total Row */}
                  {expandedMonths.includes(monthKey) && (monthData.income.gt(0) || monthData.expense.gt(0)) && (
                    <tr className="bg-gray-50 font-medium">
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="ml-6">Total do Mês</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right text-green-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                          .format(monthData.income.toNumber())}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right text-red-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                          .format(monthData.expense.toNumber())}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                          .format(monthData.balance.toNumber())}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                          .format(monthData.runningBalance.toNumber())}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FluxoCaixa;