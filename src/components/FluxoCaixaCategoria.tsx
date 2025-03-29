import React, { useState, useMemo, useRef } from 'react';
import { Download, Filter, Search, ChevronRight, Upload, AlertCircle } from 'lucide-react';
import { useFinancialStore } from '../lib/store';
import { Decimal } from 'decimal.js';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { utils, write } from 'xlsx';

const FluxoCaixaCategoria: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDREGroup, setSelectedDREGroup] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense'>('all');
  const { transactions, categoryTypes } = useFinancialStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const COLORS = ['#3B82F6', '#60A5FA', '#93C5FD'];

  const dreGroups = [
    { id: 'receita_bruta', name: 'Receita Bruta', type: 'income', order: 1 },
    { id: 'impostos', name: 'Impostos', type: 'expense', order: 2 },
    { id: 'deducao_receita', name: 'Deduções de Receitas', type: 'expense', order: 3 },
    { id: 'custos_cmv', name: 'Custos das Mercadorias Vendidas (CMV)', type: 'expense', order: 4 },
    { id: 'custos_cpv', name: 'Custos dos Produtos Vendidos (CPV)', type: 'expense', order: 5 },
    { id: 'custos_servicos', name: 'Custos dos Serviços Prestados', type: 'expense', order: 6 },
    { id: 'despesas_administrativas', name: 'Despesas Administrativas', type: 'expense', order: 7 },
    { id: 'despesas_pessoal', name: 'Despesas com Pessoal', type: 'expense', order: 8 },
    { id: 'despesas_variaveis', name: 'Despesas Variáveis', type: 'expense', order: 9 },
    { id: 'outras_receitas', name: 'Outras Receitas', type: 'income', order: 10 },
    { id: 'receitas_financeiras', name: 'Receitas Financeiras', type: 'income', order: 11 },
    { id: 'despesas_financeiras', name: 'Despesas Financeiras', type: 'expense', order: 12 },
    { id: 'investimentos', name: 'Investimentos', type: 'expense', order: 13 }
  ];

  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, []);

  const categoryData = useMemo(() => {
    const data = new Map<string, {
      name: string;
      dreGroup: string;
      type: 'income' | 'expense';
      value: number;
    }>();

    transactions.forEach(transaction => {
      const category = categoryTypes.find(c => c.name === transaction.category);
      if (!category) return;

      // Apply date filter
      const transactionDate = new Date(transaction.competenceDate);
      if (
        transactionDate.getFullYear() !== selectedYear ||
        transactionDate.getMonth() + 1 !== selectedMonth
      ) {
        return;
      }

      // Apply filters
      if (selectedDREGroup && category.dreGroup !== selectedDREGroup) return;
      if (selectedType !== 'all' && category.type !== selectedType) return;
      if (searchTerm && !category.name.toLowerCase().includes(searchTerm.toLowerCase())) return;

      if (!data.has(transaction.category)) {
        data.set(transaction.category, {
          name: transaction.category,
          dreGroup: category.dreGroup,
          type: category.type,
          value: 0
        });
      }

      const categoryInfo = data.get(transaction.category)!;
      categoryInfo.value += transaction.amount.toNumber();
    });

    return Array.from(data.values())
      .sort((a, b) => b.value - a.value);
  }, [transactions, categoryTypes, selectedDREGroup, selectedType, searchTerm, selectedYear, selectedMonth]);

  const pieChartData = useMemo(() => {
    return categoryData
      .map(category => ({
        name: category.name,
        value: category.value,
        dreGroup: category.dreGroup,
        type: category.type
      }))
      .filter(item => item.value !== 0)
      .sort((a, b) => b.value - a.value);
  }, [categoryData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);
  };

  const handleExport = () => {
    // Create workbook
    const wb = utils.book_new();
    
    // Create header with period information
    const selectedMonthName = months.find(m => m.value === selectedMonth)?.label;
    const header = [`Fluxo por Categoria - ${selectedMonthName} ${selectedYear}`];
    
    // Prepare data for export
    const data = [
      header,
      [''], // Empty row for spacing
      ['Categoria', 'Grupo DRE', 'Tipo', 'Valor', 'Percentual do Total']
    ];

    // Calculate total for percentages
    const total = pieChartData.reduce((sum, item) => sum + item.value, 0);

    // Add category data
    pieChartData.forEach(category => {
      const dreGroup = dreGroups.find(g => g.id === category.dreGroup)?.name || category.dreGroup;
      const percentage = ((category.value / total) * 100).toFixed(2) + '%';
      
      data.push([
        category.name,
        dreGroup,
        category.type === 'income' ? 'Receita' : 'Despesa',
        category.value,
        percentage
      ]);
    });

    // Add total row
    data.push(
      [''], // Empty row
      ['Total', '', '', total, '100%']
    );

    // Create worksheet
    const ws = utils.aoa_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
      { wch: 40 }, // Category name
      { wch: 40 }, // DRE group
      { wch: 15 }, // Type
      { wch: 20 }, // Value
      { wch: 15 }  // Percentage
    ];

    // Style header
    ws['!mergeCell'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];

    // Add worksheet to workbook
    utils.book_append_sheet(wb, ws, 'Categorias');

    // Generate Excel file
    const wbout = write(wb, { 
      bookType: 'xlsx', 
      type: 'array'
    });

    // Create blob and trigger download
    const blob = new Blob([wbout], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fluxo_por_categoria_${selectedYear}_${selectedMonth.toString().padStart(2, '0')}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const total = pieChartData.reduce((sum, item) => sum + item.value, 0);
      const percentage = ((data.value / total) * 100).toFixed(1);
      
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border">
          <p className="font-medium text-gray-900 mb-1">{data.name}</p>
          <p className="text-lg font-bold text-blue-600">{percentage}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Fluxo por Categoria</h1>
        <div className="flex gap-4">
          <button
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-green-700 transition-colors"
            onClick={handleExport}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Pesquisar categorias..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2 border rounded-lg min-w-[200px]"
          value={selectedDREGroup}
          onChange={(e) => setSelectedDREGroup(e.target.value)}
        >
          <option value="">Todos os Grupos DRE</option>
          {dreGroups.map(group => (
            <option key={group.id} value={group.id}>{group.name}</option>
          ))}
        </select>
        <select
          className="px-4 py-2 border rounded-lg min-w-[150px]"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as 'all' | 'income' | 'expense')}
        >
          <option value="all">Todos os Tipos</option>
          <option value="income">Receitas</option>
          <option value="expense">Despesas</option>
        </select>
        <select
          className="px-4 py-2 border rounded-lg min-w-[150px]"
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
        >
          {years.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
        <select
          className="px-4 py-2 border rounded-lg min-w-[150px]"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
        >
          {months.map(month => (
            <option key={month.value} value={month.value}>{month.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            Distribuição por Categoria
          </h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={150}
                  fill="#8884d8"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom"
                  align="center"
                  layout="horizontal"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            Detalhamento por Categoria
          </h3>
          <div className="max-h-[400px] overflow-y-auto pr-2">
            <table className="w-full">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="text-left text-sm font-medium text-gray-500">
                  <th className="pb-3">Categoria</th>
                  <th className="pb-3 text-right">Valor</th>
                  <th className="pb-3 text-right">%</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {pieChartData.map((category, index) => (
                  <tr key={category.name} className="border-t">
                    <td className="py-3">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <div>
                          <div className="font-medium">{category.name}</div>
                          <div className="text-xs text-gray-500">{category.dreGroup}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-right font-medium">
                      {formatCurrency(category.value)}
                    </td>
                    <td className="py-3 text-right text-gray-500">
                      {((category.value / pieChartData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FluxoCaixaCategoria;