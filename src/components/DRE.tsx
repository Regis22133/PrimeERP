import React, { useState, useMemo } from 'react';
import { Download, ChevronRight } from 'lucide-react';
import { useFinancialStore } from '../lib/store';
import { Decimal } from 'decimal.js';
import { utils, write } from 'xlsx';

const DRE: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const { transactions, categoryTypes } = useFinancialStore();

  const months = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];

  const dreGroups = [
    { id: 'receita_bruta', name: 'Receita Bruta', type: 'income', order: 1 },
    { id: 'impostos', name: 'Impostos', type: 'expense', order: 2 },
    { id: 'deducao_receita', name: 'Deduções de Receitas', type: 'expense', order: 3 },
    { id: 'custos_cmv', name: 'Custos das Mercadorias Vendidas (CMV)', type: 'expense', order: 4 },
    { id: 'custos_cpv', name: 'Custos dos Produtos Vendidos (CPV)', type: 'expense', order: 5 },
    { id: 'custos_servicos', name: 'Custos dos Serviços', type: 'expense', order: 6 },
    { id: 'despesas_administrativas', name: 'Despesas Administrativas', type: 'expense', order: 7 },
    { id: 'despesas_pessoal', name: 'Despesas com Pessoal', type: 'expense', order: 8 },
    { id: 'despesas_variaveis', name: 'Despesas Variáveis', type: 'expense', order: 9 },
    { id: 'outras_receitas', name: 'Outras Receitas', type: 'income', order: 10 },
    { id: 'receitas_financeiras', name: 'Receitas Financeiras', type: 'income', order: 11 },
    { id: 'despesas_financeiras', name: 'Despesas Financeiras', type: 'expense', order: 12 },
    { id: 'investimentos', name: 'Investimentos', type: 'expense', order: 13 }
  ];

  const dateRange = useMemo(() => {
    const start = new Date(selectedYear, 0, 1);
    const end = new Date(selectedYear, 11, 31);
    return { start, end };
  }, [selectedYear]);

  // Calculate data for each DRE group and its categories
  const dreData = useMemo(() => {
    const data = new Map();

    // Initialize data structure for each DRE group
    dreGroups.forEach(group => {
      data.set(group.id, {
        ...group,
        categories: new Map(),
        totals: months.reduce((acc, month) => {
          acc[month] = new Decimal(0);
          return acc;
        }, {} as Record<string, Decimal>)
      });
    });

    // Get transactions for the selected year
    const yearTransactions = transactions.filter(t => 
      t.reconciled && 
      t.competenceDate.getFullYear() === selectedYear
    );

    // Group transactions by category and month
    yearTransactions.forEach(transaction => {
      const category = categoryTypes.find(c => c.name === transaction.category);
      if (!category) return;

      const dreGroup = data.get(category.dreGroup);
      if (!dreGroup) return;

      const month = months[transaction.competenceDate.getMonth()];
      const amount = transaction.amount;

      // Add to category totals
      if (!dreGroup.categories.has(category.name)) {
        dreGroup.categories.set(category.name, {
          name: category.name,
          totals: months.reduce((acc, m) => {
            acc[m] = new Decimal(0);
            return acc;
          }, {} as Record<string, Decimal>)
        });
      }

      const categoryData = dreGroup.categories.get(category.name);
      categoryData.totals[month] = categoryData.totals[month].plus(amount);

      // Add to group totals (always positive for proper calculations)
      dreGroup.totals[month] = dreGroup.totals[month].plus(amount);
    });

    return data;
  }, [transactions, categoryTypes, selectedYear]);

  // Calculate derived values
  const calculatedValues = useMemo(() => {
    const values: Record<string, Record<string, Decimal>> = {};

    const initializeMonths = () => 
      months.reduce((acc, month) => {
        acc[month] = new Decimal(0);
        return acc;
      }, {} as Record<string, Decimal>);

    // 1. Receita Bruta
    const receitaBruta = dreData.get('receita_bruta')?.totals || initializeMonths();

    // 2. Deduções da Receita Bruta
    const impostos = dreData.get('impostos')?.totals || initializeMonths();
    const deducoes = dreData.get('deducao_receita')?.totals || initializeMonths();

    // 3. Receita Líquida = Receita Bruta - (Impostos + Deduções)
    values.receitaLiquida = initializeMonths();
    months.forEach(month => {
      values.receitaLiquida[month] = receitaBruta[month]
        .minus(impostos[month])
        .minus(deducoes[month]);
    });

    // 4. Custos = CMV + CPV + Custos dos Serviços
    const custosCMV = dreData.get('custos_cmv')?.totals || initializeMonths();
    const custosCPV = dreData.get('custos_cpv')?.totals || initializeMonths();
    const custosServicos = dreData.get('custos_servicos')?.totals || initializeMonths();

    // 5. Lucro Bruto = Receita Líquida - (CMV + CPV + Custos dos Serviços)
    values.lucroBruto = initializeMonths();
    months.forEach(month => {
      values.lucroBruto[month] = values.receitaLiquida[month]
        .minus(custosCMV[month])
        .minus(custosCPV[month])
        .minus(custosServicos[month]);
    });

    // 6. Despesas Operacionais
    const despesasAdmin = dreData.get('despesas_administrativas')?.totals || initializeMonths();
    const despesasPessoal = dreData.get('despesas_pessoal')?.totals || initializeMonths();
    const despesasVariaveis = dreData.get('despesas_variaveis')?.totals || initializeMonths();

    // 7. Resultado Operacional = Lucro Bruto - Despesas Operacionais
    values.resultadoOperacional = initializeMonths();
    months.forEach(month => {
      values.resultadoOperacional[month] = values.lucroBruto[month]
        .minus(despesasAdmin[month])
        .minus(despesasPessoal[month])
        .minus(despesasVariaveis[month]);
    });

    // 8. EBITDA = Resultado Operacional (sem depreciação/amortização neste caso)
    values.ebitda = values.resultadoOperacional;

    // 9. Resultado Financeiro = Receitas Financeiras - Despesas Financeiras
    const receitasFinanceiras = dreData.get('receitas_financeiras')?.totals || initializeMonths();
    const despesasFinanceiras = dreData.get('despesas_financeiras')?.totals || initializeMonths();
    values.resultadoFinanceiro = initializeMonths();
    months.forEach(month => {
      values.resultadoFinanceiro[month] = receitasFinanceiras[month]
        .minus(despesasFinanceiras[month]);
    });

    // 10. Outras Receitas
    const outrasReceitas = dreData.get('outras_receitas')?.totals || initializeMonths();

    // 11. Lucro Antes dos Impostos = Resultado Operacional + Resultado Financeiro + Outras Receitas
    values.lucroAntesImpostos = initializeMonths();
    months.forEach(month => {
      values.lucroAntesImpostos[month] = values.resultadoOperacional[month]
        .plus(values.resultadoFinanceiro[month])
        .plus(outrasReceitas[month]);
    });

    // 12. Lucro Líquido = Lucro Antes dos Impostos (sem IR/CSLL neste caso)
    values.lucroLiquido = values.lucroAntesImpostos;

    // 13. Investimentos
    const investimentos = dreData.get('investimentos')?.totals || initializeMonths();

    // 14. Resultado Final = Lucro Líquido - Investimentos
    values.resultadoFinal = initializeMonths();
    months.forEach(month => {
      values.resultadoFinal[month] = values.lucroLiquido[month]
        .minus(investimentos[month]);
    });

    return values;
  }, [dreData]);

  const formatCurrency = (value: Decimal | number | null) => {
    if (value === null) return 'R$ 0,00';
    const numValue = value instanceof Decimal ? value.toNumber() : value;
    const absValue = Math.abs(numValue);
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(absValue);
    return numValue < 0 ? `-${formatted}` : formatted;
  };

  const getValueColor = (value: Decimal, isExpense: boolean = false) => {
    if (value.isZero()) return 'text-gray-600';
    if (value.isNegative() || isExpense) return 'text-red-600';
    return 'text-green-600';
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const renderRow = (
    id: string,
    label: string,
    values: Record<string, Decimal>,
    isTotal: boolean = false,
    isExpense: boolean = false,
    prefix: string = '',
    hasChildren: boolean = false,
    indent: number = 0
  ) => {
    const total = Object.values(values).reduce((sum, val) => sum.plus(val), new Decimal(0));
    const rowPrefix = prefix || (isTotal ? '= ' : isExpense ? '(-) ' : '');
    const isExpanded = expandedGroups.includes(id);

    return (
      <tr className={`
        ${isTotal ? 'bg-gray-50 font-bold' : 'hover:bg-gray-50'}
        transition-colors
        ${hasChildren ? 'cursor-pointer' : ''}
      `}>
        <td 
          className={`px-4 py-2 ${isTotal ? 'font-semibold' : ''}`}
          onClick={() => hasChildren && toggleGroup(id)}
        >
          <div className="flex items-center" style={{ paddingLeft: `${indent * 16}px` }}>
            {hasChildren && (
              <ChevronRight className={`w-4 h-4 mr-2 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            )}
            {rowPrefix}{label}
          </div>
        </td>
        {months.map(month => (
          <td key={month} className="px-4 py-2 text-right">
            <span className={`${getValueColor(values[month], isExpense)} ${isTotal ? 'font-semibold' : ''}`}>
              {formatCurrency(values[month])}
            </span>
          </td>
        ))}
        <td className={`px-4 py-2 text-right ${isTotal ? 'font-semibold' : ''}`}>
          <span className={getValueColor(total, isExpense)}>
            {formatCurrency(total)}
          </span>
        </td>
      </tr>
    );
  };

  const handleExport = () => {
    // Create workbook
    const wb = utils.book_new();
    
    // Prepare data for export
    const data: any[][] = [];

    // Add header with year
    data.push([`DRE ${selectedYear}`, '', '', '', '', '', '', '', '', '', '', '', '']);
    data.push(['']); // Empty row for spacing

    // Add column headers
    data.push(['Descrição', ...months.map(m => `${m}/${selectedYear}`), 'Total']);

    // Function to add a data row with proper formatting
    const addRow = (description: string, values: Decimal[], isTotal = false, indent = 0) => {
      const total = values.reduce((sum, val) => sum.plus(val), new Decimal(0));
      data.push([
        '  '.repeat(indent) + description,
        ...values.map(v => v.toNumber()),
        total.toNumber()
      ]);
    };

    // Add DRE groups and their values
    dreGroups.forEach(group => {
      const groupData = dreData.get(group.id);
      if (!groupData) return;

      // Add group header
      data.push(['']); // Empty row before group
      const monthlyValues = months.map(month => groupData.totals[month] || new Decimal(0));
      addRow(group.name, monthlyValues, true);

      // Add all categories for this group (not just expanded ones for Excel export)
      Array.from(groupData.categories.values()).forEach(category => {
        const categoryValues = months.map(month => category.totals[month] || new Decimal(0));
        addRow(category.name, categoryValues, false, 1);
      });
    });

    // Add calculated values with headers
    data.push(['']); // Empty row for spacing
    data.push(['RESULTADOS CALCULADOS']); // Section header

    // Receita Líquida
    const receitaLiquidaValues = months.map(month => calculatedValues.receitaLiquida[month]);
    addRow('Receita Líquida', receitaLiquidaValues, true);

    // Lucro Bruto
    const lucroBrutoValues = months.map(month => calculatedValues.lucroBruto[month]);
    addRow('Lucro Bruto', lucroBrutoValues, true);

    // Resultado Operacional
    const resultadoOperacionalValues = months.map(month => calculatedValues.resultadoOperacional[month]);
    addRow('Resultado Operacional', resultadoOperacionalValues, true);

    // EBITDA
    const ebitdaValues = months.map(month => calculatedValues.ebitda[month]);
    addRow('EBITDA', ebitdaValues, true);

    // Lucro Líquido
    const lucroLiquidoValues = months.map(month => calculatedValues.lucroLiquido[month]);
    addRow('Lucro Líquido', lucroLiquidoValues, true);

    // Resultado Final
    data.push(['']); // Empty row for spacing
    const resultadoFinalValues = months.map(month => calculatedValues.resultadoFinal[month]);
    addRow('RESULTADO FINAL', resultadoFinalValues, true);

    // Create worksheet with custom column widths
    const ws = utils.aoa_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
      { wch: 40 }, // Description column
      ...Array(months.length).fill({ wch: 15 }), // Month columns
      { wch: 15 }, // Total column
    ];

    // Add worksheet to workbook
    utils.book_append_sheet(wb, ws, 'DRE');
    
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
    a.download = `DRE_${selectedYear}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">DRE - Demonstração do Resultado do Exercício</h1>
        <div className="flex gap-4">
          <select
            className="px-4 py-2 border rounded-lg bg-white"
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

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 bg-white rounded-lg shadow overflow-hidden flex flex-col">
          <div className="overflow-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-medium text-gray-700 bg-gray-50">
                    Descrição
                  </th>
                  {months.map(month => (
                    <th key={month} className="px-4 py-3 text-right font-medium text-gray-700 bg-gray-50">
                      {month}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-medium text-gray-700 bg-gray-50">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* Receita Bruta */}
                {renderRow('receita_bruta', 'Receita Bruta de Vendas', dreData.get('receita_bruta')?.totals || {}, false, false, '', true)}
                {expandedGroups.includes('receita_bruta') && Array.from(dreData.get('receita_bruta')?.categories.values() || []).map(category => (
                  renderRow(category.name, category.name, category.totals, false, false, '', false, 1)
                ))}

                {/* Impostos e Deduções */}
                {renderRow('impostos', 'Impostos sobre Vendas', dreData.get('impostos')?.totals || {}, false, true, '(-) ', true)}
                {expandedGroups.includes('impostos') && Array.from(dreData.get('impostos')?.categories.values() || []).map(category => (
                  renderRow(category.name, category.name, category.totals, false, true, '', false, 1)
                ))}

                {renderRow('deducoes', 'Deduções de Receitas', dreData.get('deducao_receita')?.totals || {}, false, true, '(-) ', true)}
                {expandedGroups.includes('deducoes') && Array.from(dreData.get('deducao_receita')?.categories.values() || []).map(category => (
                  renderRow(category.name, category.name, category.totals, false, true, '', false, 1)
                ))}

                {/* Receita Líquida */}
                {renderRow('receita_liquida', 'Receita Líquida', calculatedValues.receitaLiquida, true)}

                {/* Custos */}
                {renderRow('custos_cmv', 'Custos das Mercadorias Vendidas (CMV)', dreData.get('custos_cmv')?.totals || {}, false, true, '(-) ', true)}
                {expandedGroups.includes('custos_cmv') && Array.from(dreData.get('custos_cmv')?.categories.values() || []).map(category => (
                  renderRow(category.name, category.name, category.totals, false, true, '', false, 1)
                ))}

                {renderRow('custos_cpv', 'Custos dos Produtos Vendidos (CPV)', dreData.get('custos_cpv')?.totals || {}, false, true, '(-) ', true)}
                {expandedGroups.includes('custos_cpv') && Array.from(dreData.get('custos_cpv')?.categories.values() || []).map(category => (
                  renderRow(category.name, category.name, category.totals, false, true, '', false, 1)
                ))}

                {renderRow('custos_servicos', 'Custos dos Serviços', dreData.get('custos_servicos')?.totals || {}, false, true, '(-) ', true)}
                {expandedGroups.includes('custos_servicos') && Array.from(dreData.get('custos_servicos')?.categories.values() || []).map(category => (
                  renderRow(category.name, category.name, category.totals, false, true, '', false, 1)
                ))}

                {/* Lucro Bruto */}
                {renderRow('lucro_bruto', 'Lucro Bruto', calculatedValues.lucroBruto, true)}

                {/* Despesas Operacionais */}
                {renderRow('despesas_variaveis', 'Despesas Variáveis', dreData.get('despesas_variaveis')?.totals || {}, false, true, '(-) ', true)}
                {expandedGroups.includes('despesas_variaveis') && Array.from(dreData.get('despesas_variaveis')?.categories.values() || []).map(category => (
                  renderRow(category.name, category.name, category.totals, false, true, '', false, 1)
                ))}

                {renderRow('despesas_pessoal', 'Despesas com Pessoal', dreData.get('despesas_pessoal')?.totals || {}, false, true, '(-) ', true)}
                {expandedGroups.includes('despesas_pessoal') && Array.from(dreData.get('despesas_pessoal')?.categories.values() || []).map(category => (
                  renderRow(category.name, category.name, category.totals, false, true, '', false, 1)
                ))}

                {renderRow('despesas_admin', 'Despesas Administrativas', dreData.get('despesas_administrativas')?.totals || {}, false, true, '(-) ', true)}
                {expandedGroups.includes('despesas_admin') && Array.from(dreData.get('despesas_administrativas')?.categories.values() || []).map(category => (
                  renderRow(category.name, category.name, category.totals, false, true, '', false, 1)
                ))}

                {/* Resultado Operacional */}
                {renderRow('resultado_operacional', 'Resultado Operacional', calculatedValues.resultadoOperacional, true)}

                {/* EBITDA */}
                {renderRow('ebitda', 'EBITDA', calculatedValues.ebitda, true)}

                {/* Resultado Financeiro */}
                {renderRow('receitas_financeiras', 'Receitas Financeiras', dreData.get('receitas_financeiras')?.totals || {}, false, false, '', true)}
                {expandedGroups.includes('receitas_financeiras') && Array.from(dreData.get('receitas_financeiras')?.categories.values() || []).map(category => (
                  renderRow(category.name, category.name, category.totals, false, false, '', false, 1)
                ))}

                {renderRow('despesas_financeiras', 'Despesas Financeiras', dreData.get('despesas_financeiras')?.totals || {}, false, true, '(-) ', true)}
                {expandedGroups.includes('despesas_financeiras') && Array.from(dreData.get('despesas_financeiras')?.categories.values() || []).map(category => (
                  renderRow(category.name, category.name, category.totals, false, true, '', false, 1)
                ))}

                {renderRow('resultado_financeiro', 'Resultado Financeiro', calculatedValues.resultadoFinanceiro, true)}

                {/* Outras Receitas */}
                {renderRow('outras_receitas', 'Outras Receitas', dreData.get('outras_receitas')?.totals || {}, false, false, '', true)}
                {expandedGroups.includes('outras_receitas') && Array.from(dreData.get('outras_receitas')?.categories.values() || []).map(category => (
                  renderRow(category.name, category.name, category.totals, false, false, '', false, 1)
                ))}

                {/* Lucro Antes dos Impostos */}
                {renderRow('lucro_antes_impostos', 'Lucro Antes dos Impostos', calculatedValues.lucroAntesImpostos, true)}

                {/* Lucro Líquido */}
                {renderRow('lucro_liquido', 'Lucro Líquido', calculatedValues.lucroLiquido, true)}

                {/* Investimentos */}
                {renderRow('investimentos', 'Investimentos', dreData.get('investimentos')?.totals || {}, false, true, '(-) ', true)}
                {expandedGroups.includes('investimentos') && Array.from(dreData.get('investimentos')?.categories.values() || []).map(category => (
                  renderRow(category.name, category.name, category.totals, false, true, '', false, 1)
                ))}

                {/* Resultado Final */}
                {renderRow('resultado_final', 'Resultado Final', calculatedValues.resultadoFinal, true)}
              </tbody>
            </table>
          </div>
        </div>

        <div className={`mt-4 p-4 rounded-lg flex justify-between items-center ${
          calculatedValues.resultadoFinal[months[months.length - 1]].isNegative() ? 'bg-red-600' : 'bg-green-600'
        } text-white`}>
          <span className="font-bold text-lg">Resultado Final do Período</span>
          <span className="font-bold text-lg">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
              .format(calculatedValues.resultadoFinal[months[months.length - 1]].toNumber())}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DRE;