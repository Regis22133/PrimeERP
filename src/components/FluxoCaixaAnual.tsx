import React, { useState, useMemo } from 'react';
import { Download, ChevronRight } from 'lucide-react';
import { useFinancialStore } from '../lib/store';
import { Decimal } from 'decimal.js';
import { utils, write } from 'xlsx';

const FluxoCaixaAnual: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>('all');
  const [expandedGroups, setExpandedGroups] = useState<string[]>([
    'receita_bruta',
    'impostos',
    'deducao_receita',
    'custos_cmv',
    'custos_cpv',
    'custos_servicos',
    'despesas_administrativas',
    'despesas_pessoal',
    'despesas_variaveis',
    'outras_receitas',
    'receitas_financeiras',
    'despesas_financeiras',
    'investimentos'
  ]);

  const { transactions, bankAccounts, categoryTypes } = useFinancialStore();

  const months = [
    'JANEIRO',
    'FEVEREIRO',
    'MARÇO',
    'ABRIL',
    'MAIO',
    'JUNHO',
    'JULHO',
    'AGOSTO',
    'SETEMBRO',
    'OUTUBRO',
    'NOVEMBRO',
    'DEZEMBRO'
  ];

  const monthlyData = useMemo(() => {
    // Get initial balance
    const initialBalance = selectedBankAccount === 'all'
      ? bankAccounts.reduce((sum, account) => sum + account.initialBalance, 0)
      : bankAccounts.find(a => a.id === selectedBankAccount)?.initialBalance || 0;

    // Calculate running balances for each month
    const runningBalances = months.reduce((acc, _, index) => {
      const previousBalance = index > 0 ? acc[months[index - 1]] : initialBalance;
      
      // Get all non-reconciled transactions for this month
      const monthTransactions = transactions.filter(t => 
        t.dueDate.getFullYear() === selectedYear &&
        t.dueDate.getMonth() === index &&
        !t.reconciled && // Only non-reconciled transactions
        (selectedBankAccount === 'all' || t.bankAccount === selectedBankAccount)
      );

      // Calculate month's balance
      const monthBalance = monthTransactions.reduce((sum, t) => {
        return t.type === 'income' ? sum.plus(t.amount) : sum.minus(t.amount);
      }, new Decimal(0));

      // Add to running balance
      acc[months[index]] = previousBalance + monthBalance.toNumber();
      return acc;
    }, {} as Record<string, number>);

    // Group transactions by category and month
    const categoryGroups = new Map<string, {
      name: string;
      type: 'income' | 'expense';
      dreGroup: string;
      transactions: Map<string, Decimal>;
      accumulated: Map<string, Decimal>;
    }>();

    transactions
      .filter(t => 
        t.dueDate.getFullYear() === selectedYear &&
        !t.reconciled && // Only non-reconciled transactions
        (selectedBankAccount === 'all' || t.bankAccount === selectedBankAccount)
      )
      .forEach(transaction => {
        const category = categoryTypes.find(c => c.name === transaction.category);
        if (!category) return;

        if (!categoryGroups.has(transaction.category)) {
          categoryGroups.set(transaction.category, {
            name: transaction.category,
            type: category.type,
            dreGroup: category.dreGroup,
            transactions: new Map(months.map(m => [m, new Decimal(0)])),
            accumulated: new Map(months.map(m => [m, new Decimal(0)]))
          });
        }

        const group = categoryGroups.get(transaction.category)!;
        const month = months[transaction.dueDate.getMonth()];
        const currentAmount = group.transactions.get(month) || new Decimal(0);
        group.transactions.set(month, currentAmount.plus(transaction.amount));

        // Calculate accumulated values
        let accumulatedValue = new Decimal(0);
        months.forEach((m, index) => {
          if (index <= transaction.dueDate.getMonth()) {
            const monthValue = group.transactions.get(m) || new Decimal(0);
            accumulatedValue = accumulatedValue.plus(
              category.type === 'expense' ? monthValue.negated() : monthValue
            );
            group.accumulated.set(m, accumulatedValue);
          }
        });
      });

    // Group by DRE group
    const dreGroups = new Map<string, {
      name: string;
      categories: {
        name: string;
        type: 'income' | 'expense';
        transactions: Map<string, Decimal>;
        accumulated: Map<string, Decimal>;
      }[];
    }>();

    // First add income categories
    Array.from(categoryGroups.values())
      .filter(category => category.type === 'income')
      .forEach(category => {
        if (!dreGroups.has(category.dreGroup)) {
          dreGroups.set(category.dreGroup, {
            name: category.dreGroup,
            categories: []
          });
        }
        dreGroups.get(category.dreGroup)!.categories.push({
          name: category.name,
          type: category.type,
          transactions: category.transactions,
          accumulated: category.accumulated
        });
      });

    // Then add expense categories
    Array.from(categoryGroups.values())
      .filter(category => category.type === 'expense')
      .forEach(category => {
        if (!dreGroups.has(category.dreGroup)) {
          dreGroups.set(category.dreGroup, {
            name: category.dreGroup,
            categories: []
          });
        }
        dreGroups.get(category.dreGroup)!.categories.push({
          name: category.name,
          type: category.type,
          transactions: category.transactions,
          accumulated: category.accumulated
        });
      });

    return {
      initialBalance,
      runningBalances,
      dreGroups
    };
  }, [transactions, bankAccounts, categoryTypes, selectedYear, selectedBankAccount]);

  const formatCurrency = (value: Decimal | number): string => {
    const numValue = value instanceof Decimal ? value.toNumber() : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(numValue);
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleExport = () => {
    // Create workbook
    const wb = utils.book_new();
    
    // Prepare data for export
    const data = [
      ['CATEGORIA', ...months.map(m => `${m}/${selectedYear} ACUMULADO`)],
      ['SALDO INICIAL', ...months.map(m => monthlyData.runningBalances[m])]
    ];

    // Add DRE groups and categories
    monthlyData.dreGroups.forEach((group, dreGroup) => {
      data.push([
        dreGroup,
        ...months.map(month => 
          group.categories.reduce(
            (sum, cat) => sum.plus(cat.accumulated.get(month) || new Decimal(0)),
            new Decimal(0)
          ).toNumber()
        )
      ]);

      if (expandedGroups.includes(dreGroup)) {
        group.categories.forEach(category => {
          data.push([
            `  ${category.name}`,
            ...Array.from(category.accumulated.values()).map(val => val.toNumber())
          ]);
        });
      }
    });

    // Create worksheet
    const ws = utils.aoa_to_sheet(data);
    
    // Add worksheet to workbook
    utils.book_append_sheet(wb, ws, 'Fluxo de Caixa');
    
    // Generate Excel file
    const wbout = write(wb, { 
      bookType: 'xlsx', 
      type: 'array'
    });

    // Trigger download
    const blob = new Blob([wbout], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fluxo_de_caixa_${selectedYear}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Fluxo de Caixa - {selectedYear}
        </h1>
        <div className="flex gap-4">
          <select
            className="px-4 py-2 border rounded-lg"
            value={selectedBankAccount}
            onChange={(e) => setSelectedBankAccount(e.target.value)}
          >
            <option value="all">Todas as Contas</option>
            {bankAccounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          <select
            className="px-4 py-2 border rounded-lg"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {[...Array(5)].map((_, i) => {
              const year = new Date().getFullYear() - i;
              return (
                <option key={year} value={year}>{year}</option>
              );
            })}
          </select>
          <button 
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-green-700 transition-colors"
            onClick={handleExport}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CATEGORIA
                </th>
                {months.map(month => (
                  <th key={month} className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {month}/{selectedYear}<br/>ACUMULADO
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Initial Balance Row */}
              <tr className="bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                  SALDO INICIAL
                </td>
                {months.map(month => (
                  <td key={month} className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold">
                    {formatCurrency(monthlyData.runningBalances[month])}
                  </td>
                ))}
              </tr>

              {/* DRE Groups and Categories */}
              {Array.from(monthlyData.dreGroups.entries()).map(([dreGroup, group]) => (
                <React.Fragment key={dreGroup}>
                  {/* DRE Group Header */}
                  <tr 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleGroup(dreGroup)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                      <div className="flex items-center">
                        <ChevronRight 
                          className={`w-4 h-4 mr-2 transition-transform ${
                            expandedGroups.includes(dreGroup) ? 'rotate-90' : ''
                          }`}
                        />
                        {dreGroup}
                      </div>
                    </td>
                    {months.map(month => {
                      const total = group.categories.reduce(
                        (sum, cat) => sum.plus(cat.accumulated.get(month) || new Decimal(0)),
                        new Decimal(0)
                      );
                      const isExpense = group.categories[0]?.type === 'expense';
                      return (
                        <td 
                          key={month} 
                          className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${
                            isExpense ? 'text-red-600' : 'text-green-600'
                          }`}
                        >
                          {formatCurrency(total)}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Category Rows */}
                  {expandedGroups.includes(dreGroup) && group.categories.map(category => (
                    <tr key={category.name} className="bg-gray-50/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm pl-12">
                        {category.name}
                      </td>
                      {months.map(month => {
                        const amount = category.accumulated.get(month) || new Decimal(0);
                        const isExpense = category.type === 'expense';
                        return (
                          <td 
                            key={month} 
                            className={`px-6 py-4 whitespace-nowrap text-sm text-right ${
                              isExpense ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {formatCurrency(amount)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}

              {/* Total Row */}
              <tr className="bg-gray-100 font-bold">
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  TOTAL
                </td>
                {months.map(month => (
                  <td key={month} className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    {formatCurrency(monthlyData.runningBalances[month])}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FluxoCaixaAnual;