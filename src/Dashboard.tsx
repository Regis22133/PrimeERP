import React, { useState, useMemo } from 'react';
import { TrendingUp, Calculator, ChevronRight, AlertCircle } from 'lucide-react';
import { useFinancialStore } from '../lib/store';
import { Decimal } from 'decimal.js';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Dashboard: React.FC = () => {
  // ... existing code ...

  // Calculate delinquency rate by category
  const delinquencyAnalysis = useMemo(() => {
    const now = new Date();
    const categories = new Map<string, {
      name: string;
      totalAmount: Decimal;
      overdueAmount: Decimal;
      delinquencyRate: number;
      transactions: number;
      overdueTransactions: number;
    }>();

    // Get all income transactions
    const incomeTransactions = transactions.filter(t => 
      t.type === 'income' && !t.reconciled
    );

    // Group by category
    incomeTransactions.forEach(transaction => {
      if (!transaction.category) return;

      if (!categories.has(transaction.category)) {
        categories.set(transaction.category, {
          name: transaction.category,
          totalAmount: new Decimal(0),
          overdueAmount: new Decimal(0),
          delinquencyRate: 0,
          transactions: 0,
          overdueTransactions: 0
        });
      }

      const category = categories.get(transaction.category)!;
      category.totalAmount = category.totalAmount.plus(transaction.amount);
      category.transactions++;

      // Check if overdue
      if (transaction.dueDate < now) {
        category.overdueAmount = category.overdueAmount.plus(transaction.amount);
        category.overdueTransactions++;
      }
    });

    // Calculate delinquency rates
    categories.forEach(category => {
      category.delinquencyRate = category.totalAmount.isZero() 
        ? 0 
        : category.overdueAmount.dividedBy(category.totalAmount).times(100).toNumber();
    });

    // Sort by delinquency rate descending
    return Array.from(categories.values())
      .sort((a, b) => b.delinquencyRate - a.delinquencyRate);
  }, [transactions]);

  // Calculate total delinquency rate
  const totalDelinquency = useMemo(() => {
    const totalAmount = delinquencyAnalysis.reduce(
      (sum, cat) => sum.plus(cat.totalAmount), 
      new Decimal(0)
    );
    
    const totalOverdue = delinquencyAnalysis.reduce(
      (sum, cat) => sum.plus(cat.overdueAmount), 
      new Decimal(0)
    );

    return {
      rate: totalAmount.isZero() 
        ? 0 
        : totalOverdue.dividedBy(totalAmount).times(100).toNumber(),
      amount: totalOverdue.toNumber(),
      transactions: delinquencyAnalysis.reduce((sum, cat) => sum + cat.overdueTransactions, 0)
    };
  }, [delinquencyAnalysis]);

  // Colors for the pie chart
  const COLORS = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
    '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9'
  ];

  // ... existing code ...

  return (
    <div className="h-full">
      {/* ... existing code ... */}

      {/* Add Delinquency Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Delinquency Overview Card */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                Índice de Inadimplência
              </h3>
              <p className="text-gray-500 text-sm">
                Análise de recebimentos vencidos por categoria
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-red-600">
                {totalDelinquency.rate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">
                {totalDelinquency.transactions} títulos vencidos
              </div>
              <div className="text-sm font-medium text-red-600">
                {new Intl.NumberFormat('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL' 
                }).format(totalDelinquency.amount)}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500">
                  <th className="pb-2">Categoria</th>
                  <th className="pb-2 text-right">Vencido</th>
                  <th className="pb-2 text-right">Total</th>
                  <th className="pb-2 text-right">% Inadimplência</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {delinquencyAnalysis.map((category, index) => (
                  <tr key={category.name} className="border-t">
                    <td className="py-2">
                      <div className="flex items-center">
                        <div 
                          className="w-2 h-2 rounded-full mr-2"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        {category.name}
                      </div>
                    </td>
                    <td className="py-2 text-right text-red-600">
                      {new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      }).format(category.overdueAmount.toNumber())}
                    </td>
                    <td className="py-2 text-right">
                      {new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      }).format(category.totalAmount.toNumber())}
                    </td>
                    <td className="py-2 text-right font-medium">
                      {category.delinquencyRate.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delinquency Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Distribuição da Inadimplência
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={delinquencyAnalysis}
                  dataKey="overdueAmount"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  label={({
                    cx,
                    cy,
                    midAngle,
                    innerRadius,
                    outerRadius,
                    value,
                    index
                  }) => {
                    const RADIAN = Math.PI / 180;
                    const radius = 25 + innerRadius + (outerRadius - innerRadius);
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);

                    return (
                      <text
                        x={x}
                        y={y}
                        fill="#374151"
                        textAnchor={x > cx ? 'start' : 'end'}
                        dominantBaseline="central"
                        className="text-xs"
                      >
                        {delinquencyAnalysis[index].name} ({delinquencyAnalysis[index].delinquencyRate.toFixed(1)}%)
                      </text>
                    );
                  }}
                >
                  {delinquencyAnalysis.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ... rest of existing code ... */}
    </div>
  );
};

export default Dashboard;