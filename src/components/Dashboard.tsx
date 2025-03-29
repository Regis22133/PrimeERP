import React, { useState, useMemo } from 'react';
import { TrendingUp, Calculator, ChevronRight, AlertCircle } from 'lucide-react';
import { useFinancialStore } from '../lib/store';
import { Decimal } from 'decimal.js';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Dashboard: React.FC = () => {
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const { transactions, bankAccounts, categoryTypes } = useFinancialStore();

  // Calculate delinquency rate
  const delinquencyData = useMemo(() => {
    const now = new Date();
    
    // Get all income transactions
    const incomeTransactions = transactions.filter(t => t.type === 'income');
    
    // Calculate total receivables
    const totalReceivables = incomeTransactions.reduce((sum, t) => 
      sum.plus(t.amount), new Decimal(0));
    
    // Calculate overdue amount
    const overdueAmount = incomeTransactions
      .filter(t => t.status === 'pending' && t.dueDate < now)
      .reduce((sum, t) => sum.plus(t.amount), new Decimal(0));
    
    // Calculate delinquency rate
    const rate = totalReceivables.isZero() 
      ? 0 
      : overdueAmount.dividedBy(totalReceivables).times(100).toNumber();

    return {
      rate,
      amount: overdueAmount.toNumber(),
      total: totalReceivables.toNumber()
    };
  }, [transactions]);

  // DRE Groups configuration
  const dreGroups = [
    { id: 'custos_servicos', name: 'Custos dos Serviços', type: 'expense', order: 1 },
    { id: 'despesas_administrativas', name: 'Despesas Administrativas', type: 'expense', order: 2 },
    { id: 'despesas_pessoal', name: 'Despesas com Pessoal', type: 'expense', order: 3 },
    { id: 'despesas_variaveis', name: 'Despesas Variáveis', type: 'expense', order: 4 },
    { id: 'despesas_financeiras', name: 'Despesas Financeiras', type: 'expense', order: 5 },
    { id: 'impostos', name: 'Impostos', type: 'expense', order: 6 },
    { id: 'investimentos', name: 'Investimentos', type: 'expense', order: 7 }
  ];

  // Income Groups configuration
  const incomeGroups = [
    { id: 'receita_bruta', name: 'Receita Bruta', type: 'income', order: 1 },
    { id: 'outras_receitas', name: 'Outras Receitas', type: 'income', order: 2 },
    { id: 'receitas_financeiras', name: 'Receitas Financeiras', type: 'income', order: 3 }
  ];

  // Calculate date range for current month
  const dateRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start, end };
  }, []);

  // Filter transactions by date range
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const date = t.competenceDate;
      return date >= dateRange.start && date <= dateRange.end;
    });
  }, [transactions, dateRange]);

  // Calculate financial indicators
  const indicators = useMemo(() => {
    const reconciledTransactions = transactions.filter(t => t.reconciled);
    const pendingTransactions = transactions.filter(t => !t.reconciled);

    const totalReceivables = pendingTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum.plus(t.amount), new Decimal(0));

    const totalPayables = pendingTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum.plus(t.amount), new Decimal(0));

    const totalIncome = reconciledTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum.plus(t.amount), new Decimal(0));

    const totalExpense = reconciledTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum.plus(t.amount), new Decimal(0));

    return {
      totalReceivables: totalReceivables.toNumber(),
      totalPayables: totalPayables.toNumber(),
      totalIncome: totalIncome.toNumber(),
      totalExpense: totalExpense.toNumber()
    };
  }, [transactions]);

  // Calculate EBITDA and revenue for percentage
  const ebitdaData = useMemo(() => {
    const reconciledTransactions = filteredTransactions.filter(t => t.reconciled);

    // Calculate total revenue
    const totalRevenue = reconciledTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum.plus(t.amount), new Decimal(0));

    // Calculate operational costs and expenses
    const operationalCosts = reconciledTransactions
      .filter(t => {
        const category = categoryTypes.find(c => c.name === t.category);
        return category?.dreGroup === 'custos_servicos';
      })
      .reduce((sum, t) => sum.plus(t.amount), new Decimal(0));

    const operationalExpenses = reconciledTransactions
      .filter(t => {
        const category = categoryTypes.find(c => c.name === t.category);
        return category?.dreGroup === 'despesas_administrativas' ||
               category?.dreGroup === 'despesas_pessoal' ||
               category?.dreGroup === 'despesas_variaveis';
      })
      .reduce((sum, t) => sum.plus(t.amount), new Decimal(0));

    // Calculate EBITDA
    const ebitda = totalRevenue
      .minus(operationalCosts)
      .minus(operationalExpenses);

    // Calculate EBITDA margin
    const ebitdaMargin = totalRevenue.isZero() 
      ? new Decimal(0)
      : ebitda.dividedBy(totalRevenue).times(100);

    return {
      value: ebitda,
      margin: ebitdaMargin
    };
  }, [filteredTransactions, categoryTypes]);

  // Calculate contribution margin
  const contributionMargin = useMemo(() => {
    const reconciledTransactions = filteredTransactions.filter(t => t.reconciled);

    // Calculate total revenue
    const totalRevenue = reconciledTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum.plus(t.amount), new Decimal(0));

    // Calculate variable costs
    const variableCosts = reconciledTransactions
      .filter(t => {
        const category = categoryTypes.find(c => c.name === t.category);
        return t.type === 'expense' && (
          category?.dreGroup === 'custos_servicos' ||
          category?.dreGroup === 'despesas_variaveis' ||
          category?.dreGroup === 'impostos'
        );
      })
      .reduce((sum, t) => sum.plus(t.amount), new Decimal(0));

    // Calculate contribution margin
    const margin = totalRevenue.minus(variableCosts);

    // Calculate contribution margin ratio
    const ratio = totalRevenue.isZero()
      ? new Decimal(0)
      : margin.dividedBy(totalRevenue).times(100);

    return {
      value: margin,
      ratio
    };
  }, [filteredTransactions, categoryTypes]);

  // Calculate net profit from transactions
  const netProfitData = useMemo(() => {
    const reconciledTransactions = filteredTransactions.filter(t => t.reconciled);

    // Calculate total revenue
    const totalRevenue = reconciledTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum.plus(t.amount), new Decimal(0));

    // Calculate total expenses
    const totalExpenses = reconciledTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum.plus(t.amount), new Decimal(0));

    // Calculate net profit
    const netProfit = totalRevenue.minus(totalExpenses);

    // Calculate net profit margin
    const margin = totalRevenue.isZero() 
      ? new Decimal(0)
      : netProfit.dividedBy(totalRevenue).times(100);

    return {
      value: netProfit,
      margin
    };
  }, [filteredTransactions]);

  // Calculate monthly data for the chart
  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const data = months.map(month => ({
      name: month,
      income: 0,
      expense: 0,
      balance: 0
    }));

    transactions.forEach(transaction => {
      const monthIndex = transaction.competenceDate.getMonth();
      const amount = transaction.amount.toNumber();

      if (transaction.type === 'income') {
        data[monthIndex].income += amount;
      } else {
        data[monthIndex].expense += amount;
      }

      data[monthIndex].balance = data[monthIndex].income - data[monthIndex].expense;
    });

    return data;
  }, [transactions]);

  // Calculate monthly expense analysis by DRE group
  const monthlyExpenseAnalysis = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const analysis = new Map();

    // Initialize DRE groups with monthly data
    dreGroups.forEach(group => {
      analysis.set(group.id, {
        ...group,
        months: months.reduce((acc, month) => {
          acc[month] = {
            total: new Decimal(0),
            categories: new Map(),
            percentage: 0
          };
          return acc;
        }, {})
      });
    });

    // Filter expense transactions for the period
    const expenseTransactions = filteredTransactions.filter(t => 
      t.type === 'expense' && t.reconciled
    );

    // Calculate monthly totals
    const monthlyTotals = months.reduce((acc, month) => {
      acc[month] = new Decimal(0);
      return acc;
    }, {} as Record<string, Decimal>);

    // Group transactions by DRE group, category, and month
    expenseTransactions.forEach(transaction => {
      const category = categoryTypes.find(c => c.name === transaction.category);
      if (!category || !category.dreGroup) return;

      const group = analysis.get(category.dreGroup);
      if (!group) return;

      const month = months[transaction.competenceDate.getMonth()];
      const amount = transaction.amount;

      // Add to monthly total
      monthlyTotals[month] = monthlyTotals[month].plus(amount);

      // Add to group monthly total
      group.months[month].total = group.months[month].total.plus(amount);

      // Add to category
      if (!group.months[month].categories.has(category.name)) {
        group.months[month].categories.set(category.name, {
          name: category.name,
          total: new Decimal(0),
          percentage: 0
        });
      }
      const categoryData = group.months[month].categories.get(category.name);
      categoryData.total = categoryData.total.plus(amount);
    });

    // Calculate percentages for each month
    months.forEach(month => {
      const monthTotal = monthlyTotals[month];
      
      analysis.forEach(group => {
        group.months[month].percentage = monthTotal.isZero() ? 
          0 : 
          group.months[month].total.dividedBy(monthTotal).times(100).toNumber();

        group.months[month].categories.forEach(category => {
          category.percentage = monthTotal.isZero() ? 
            0 : 
            category.total.dividedBy(monthTotal).times(100).toNumber();
        });
      });
    });

    return {
      groups: analysis,
      monthlyTotals
    };
  }, [filteredTransactions, categoryTypes, dreGroups]);

  // Helper function to get categories for a group
  const getGroupCategories = (group: any) => {
    const categories = new Set<string>();
    Object.values(group.months).forEach((monthData: any) => {
      monthData.categories.forEach((_: any, categoryName: string) => {
        categories.add(categoryName);
      });
    });
    return Array.from(categories);
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  return (
    <div className="h-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard Financeiro</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-6">
        {/* Card - Receitas */}
        <div className="bg-indigo-600 text-white p-6 rounded-lg shadow cursor-pointer hover:bg-indigo-700 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-indigo-500 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-sm">Total Recebido</span>
          </div>
          <h3 className="text-indigo-100 text-sm mb-1">Receitas</h3>
          <p className="text-2xl font-bold">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
              .format(indicators.totalIncome)}
          </p>
          <p className="text-sm text-indigo-100 mt-1">
            A receber: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
              .format(indicators.totalReceivables)}
          </p>
        </div>

        {/* Card - Despesas */}
        <div className="bg-indigo-500 text-white p-6 rounded-lg shadow cursor-pointer hover:bg-indigo-600 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-indigo-400 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-sm">Total Pago</span>
          </div>
          <h3 className="text-indigo-100 text-sm mb-1">Despesas</h3>
          <p className="text-2xl font-bold">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
              .format(indicators.totalExpense)}
          </p>
          <p className="text-sm text-indigo-100 mt-1">
            A pagar: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
              .format(indicators.totalPayables)}
          </p>
        </div>

        {/* Card - EBITDA */}
        <div className="bg-indigo-400 text-white p-6 rounded-lg shadow cursor-pointer hover:bg-indigo-500 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-indigo-300 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-sm">Margem EBITDA</span>
          </div>
          <h3 className="text-indigo-100 text-sm mb-1">EBITDA</h3>
          <p className="text-2xl font-bold">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
              .format(ebitdaData.value.toNumber())}
          </p>
          <p className="text-sm text-indigo-100 mt-1">
            Margem: {ebitdaData.margin.toFixed(2)}%
          </p>
        </div>

        {/* Card - Margem de Contribuição */}
        <div className="bg-indigo-300 text-indigo-900 p-6 rounded-lg shadow cursor-pointer hover:bg-indigo-400 hover:text-white transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-indigo-200 rounded-lg">
              <Calculator className="w-6 h-6" />
            </div>
            <span className="text-sm">Rentabilidade</span>
          </div>
          <h3 className="text-indigo-700 text-sm mb-1">Margem de Contribuição</h3>
          <p className="text-2xl font-bold">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
              .format(contributionMargin.value.toNumber())}
          </p>
          <p className="text-sm text-indigo-700 mt-1">
            Margem: {contributionMargin.ratio.toFixed(2)}%
          </p>
        </div>

        {/* Card - Lucro Líquido */}
        <div className="bg-indigo-200 text-indigo-900 p-6 rounded-lg shadow cursor-pointer hover:bg-indigo-300 hover:text-white transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-sm">Rentabilidade</span>
          </div>
          <h3 className="text-indigo-700 text-sm mb-1">Lucro Líquido</h3>
          <p className="text-2xl font-bold">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
              .format(netProfitData.value.toNumber())}
          </p>
          <p className="text-sm text-indigo-700 mt-1">
            Margem: {netProfitData.margin.toFixed(2)}%
          </p>
        </div>

        {/* Card - Taxa de Inadimplência */}
        <div className="bg-red-50 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <span className="text-sm text-red-600">Inadimplência</span>
          </div>
          <h3 className="text-red-800 text-sm mb-1">Taxa de Inadimplência</h3>
          <p className="text-2xl font-bold text-red-700">
            {delinquencyData.rate.toFixed(1)}%
          </p>
          <p className="text-sm text-red-600 mt-1">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
              .format(delinquencyData.amount)}
          </p>
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          Receitas vs Despesas
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => new Intl.NumberFormat('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL' 
                }).format(value)}
              />
              <Legend />
              <Line 
                name="Receitas" 
                type="monotone" 
                dataKey="income" 
                stroke="#22C55E" 
                activeDot={{ r: 8 }}
              />
              <Line 
                name="Despesas" 
                type="monotone" 
                dataKey="expense" 
                stroke="#EF4444" 
                activeDot={{ r: 8 }}
              />
              <Line 
                name="Saldo" 
                type="monotone" 
                dataKey="balance" 
                stroke="#3B82F6" 
                activeDot={{ r: 8 }}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* DRE Expense Analysis */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          Análise de Despesas por Grupo DRE
        </h3>
        <div className="overflow-x-auto">
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b">
                  <th className="px-4 py-2 text-left">Grupo</th>
                  {months.map(month => (
                    <th key={month} className="px-4 py-2 text-right">{month}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from(monthlyExpenseAnalysis.groups.values())
                  .filter(group => {
                    // Check if the group has any transactions in any month
                    return Object.values(group.months).some(monthData => 
                      !monthData.total.isZero()
                    );
                  })
                  .sort((a, b) => a.order - b.order)
                  .map(group => (
                    <React.Fragment key={group.id}>
                      <tr 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleGroup(group.id)}
                      >
                        <td className="px-4 py-2">
                          <div className="flex items-center">
                            <ChevronRight 
                              className={`w-4 h-4 mr-2 transition-transform ${
                                expandedGroups.includes(group.id) ? 'rotate-90' : ''
                              }`}
                            />
                            {group.name}
                          </div>
                        </td>
                        {Object.entries(group.months).map(([month, data]) => (
                          <td key={month} className="px-4 py-2 text-right">
                            <div>
                              {new Intl.NumberFormat('pt-BR', { 
                                style: 'currency', 
                                currency: 'BRL' 
                              }).format(data.total.toNumber())}
                            </div>
                            <div className="text-xs text-gray-500">
                              ({data.percentage.toFixed(1)}%)
                            </div>
                          </td>
                        ))}
                      </tr>
                      {expandedGroups.includes(group.id) && getGroupCategories(group)
                        .filter(categoryName => {
                          // Check if the category has any transactions in any month
                          return Object.values(group.months).some(monthData => {
                            const categoryData = monthData.categories.get(categoryName);
                            return categoryData && !categoryData.total.isZero();
                          });
                        })
                        .map(categoryName => (
                          <tr key={categoryName} className="bg-gray-50/50">
                            <td className="px-4 py-2 pl-10">{categoryName}</td>
                            {Object.entries(group.months).map(([month, data]) => {
                              const categoryData = data.categories.get(categoryName);
                              return (
                                <td key={month} className="px-4 py-2 text-right">
                                  <div>
                                    {new Intl.NumberFormat('pt-BR', { 
                                      style: 'currency', 
                                      currency: 'BRL' 
                                    }).format(categoryData?.total.toNumber() || 0)}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    ({categoryData?.percentage.toFixed(1) || 0}%)
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                    </React.Fragment>
                  ))}
                <tr className="font-bold bg-gray-50 sticky bottom-0">
                  <td className="px-4 py-2">Total</td>
                  {Object.entries(monthlyExpenseAnalysis.monthlyTotals).map(([month, total]) => (
                    <td key={month} className="px-4 py-2 text-right">
                      {new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      }).format(total.toNumber())}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;