import React, { useState } from 'react';
import { Download, Filter, Search, ChevronRight } from 'lucide-react';
import { Transaction } from '../types';

const FluxoCaixaSegundoSemestre: React.FC = () => {
  const [selectedAccount, setSelectedAccount] = useState('');
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const accounts = [
    { id: '1', name: 'Conta Principal' },
    { id: '2', name: 'Conta Secundária' }
  ];

  const months = ['Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  // Sample data for demonstration
  const flowData = {
    receitas: {
      Julho: 60000,
      Agosto: 62000,
      Setembro: 58000,
      Outubro: 65000,
      Novembro: 63000,
      Dezembro: 70000
    },
    despesas: {
      Julho: 45000,
      Agosto: 47000,
      Setembro: 44000,
      Outubro: 48000,
      Novembro: 46000,
      Dezembro: 50000
    },
    // Sample daily data
    daily: {
      Julho: [
        { date: '2024-07-01', receitas: 2000, despesas: 1500 },
        { date: '2024-07-02', receitas: 1900, despesas: 1400 },
        { date: '2024-07-03', receitas: 2100, despesas: 1600 }
      ],
      Agosto: [
        { date: '2024-08-01', receitas: 2200, despesas: 1700 },
        { date: '2024-08-02', receitas: 1800, despesas: 1300 },
        { date: '2024-08-03', receitas: 2300, despesas: 1800 }
      ]
      // Add similar data for other months
    }
  };

  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => 
      prev.includes(month)
        ? prev.filter(m => m !== month)
        : [...prev, month]
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Fluxo de Caixa - 2º Semestre</h1>
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
                .format(Object.values(flowData.receitas).reduce((a, b) => a + b, 0))}
            </p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-red-600 mb-1">Total de Despesas</h3>
            <p className="text-2xl font-bold text-red-700">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                .format(Object.values(flowData.despesas).reduce((a, b) => a + b, 0))}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-green-600 mb-1">Saldo do Período</h3>
            <p className="text-2xl font-bold text-green-700">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                .format(
                  Object.values(flowData.receitas).reduce((a, b) => a + b, 0) -
                  Object.values(flowData.despesas).reduce((a, b) => a + b, 0)
                )}
            </p>
          </div>
        </div>

        {/* Monthly Flow Table with Daily Details */}
        <div className="p-6">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Período
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Receitas
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Despesas
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Saldo
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {months.map(month => (
                <React.Fragment key={month}>
                  <tr className="bg-gray-50 cursor-pointer hover:bg-gray-100" onClick={() => toggleMonth(month)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <ChevronRight className={`w-4 h-4 mr-2 transform transition-transform ${
                          expandedMonths.includes(month) ? 'rotate-90' : ''
                        }`} />
                        <span className="font-medium text-gray-900">{month}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-600 font-medium">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                        .format(flowData.receitas[month as keyof typeof flowData.receitas])}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600 font-medium">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                        .format(flowData.despesas[month as keyof typeof flowData.despesas])}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                        .format(
                          flowData.receitas[month as keyof typeof flowData.receitas] -
                          flowData.despesas[month as keyof typeof flowData.despesas]
                        )}
                    </td>
                  </tr>
                  {expandedMonths.includes(month) && flowData.daily[month as keyof typeof flowData.daily]?.map((day, index) => (
                    <tr key={day.date} className="bg-gray-50/50">
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="flex items-center ml-6">
                          <span className="text-sm text-gray-600">
                            {new Date(day.date).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right text-sm text-green-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                          .format(day.receitas)}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right text-sm text-red-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                          .format(day.despesas)}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right text-sm">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                          .format(day.receitas - day.despesas)}
                      </td>
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

export default FluxoCaixaSegundoSemestre;