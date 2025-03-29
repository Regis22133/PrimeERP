import { Transaction, Category, BankAccount, DREData } from '../types';

export interface SuggestionEngine {
  getTransactionSuggestions: (partialData: Partial<Transaction>) => Partial<Transaction>;
  getCategorySuggestions: (type: 'income' | 'expense', description?: string) => Partial<Category>;
  getBankAccountSuggestions: (bankCode: string) => Partial<BankAccount>;
  getDRESuggestions: (dreData: DREData) => Partial<DREData>;
}

export const createSuggestionEngine = (): SuggestionEngine => {
  const commonSuppliers = {
    expense: [
      'Aluguel Comercial',
      'Energia Elétrica',
      'Água e Esgoto',
      'Internet Empresarial',
      'Material de Escritório',
      'Serviços de Limpeza',
      'Manutenção Predial',
      'Plano de Saúde',
      'Vale Transporte',
      'Vale Refeição'
    ],
    income: [
      'Cliente Regular',
      'Serviços de Consultoria',
      'Vendas Online',
      'Projetos Especiais',
      'Assinaturas Mensais',
      'Serviços Recorrentes'
    ]
  };

  const commonCategories = {
    expense: {
      operational: [
        'Aluguel',
        'Utilities',
        'Material de Escritório',
        'Manutenção',
        'Seguros'
      ],
      financial: [
        'Taxas Bancárias',
        'Juros',
        'IOF',
        'Tarifas'
      ],
      personnel: [
        'Salários',
        'Benefícios',
        'FGTS',
        'INSS',
        'Vale Transporte'
      ]
    },
    income: {
      services: [
        'Consultoria',
        'Projetos',
        'Mensalidades',
        'Treinamentos'
      ],
      financial: [
        'Rendimentos',
        'Juros Recebidos',
        'Descontos Obtidos'
      ]
    }
  };

  const bankCodes = {
    '001': {
      name: 'Banco do Brasil',
      suggestedName: 'Conta BB Principal'
    },
    '341': {
      name: 'Itaú',
      suggestedName: 'Conta Itaú Empresarial'
    },
    '033': {
      name: 'Santander',
      suggestedName: 'Conta Santander Business'
    },
    '237': {
      name: 'Bradesco',
      suggestedName: 'Conta Bradesco Company'
    }
  };

  const dreRatios = {
    receitaBruta: 1,
    impostos: 0.15,
    deducaoReceita: 0.05,
    custosServicos: 0.4,
    despesasAdministrativas: 0.1,
    despesasPessoal: 0.2,
    despesasVariaveis: 0.05,
    outrasReceitas: 0.02,
    receitasFinanceiras: 0.01,
    despesasFinanceiras: 0.03,
    investimentos: 0.05
  };

  const getTransactionSuggestions = (partialData: Partial<Transaction>): Partial<Transaction> => {
    const suggestions: Partial<Transaction> = {};

    if (partialData.type && partialData.description) {
      const description = partialData.description.toLowerCase();

      // Sugerir fornecedor/cliente baseado na descrição
      if (description.includes('aluguel')) {
        suggestions.supplier = 'Imobiliária Principal';
        suggestions.category = 'Aluguel';
        suggestions.bankAccount = 'Conta Principal';
      } else if (description.includes('energia') || description.includes('luz')) {
        suggestions.supplier = 'Companhia de Energia';
        suggestions.category = 'Utilities';
      } else if (description.includes('internet') || description.includes('telecom')) {
        suggestions.supplier = 'Provedor de Internet';
        suggestions.category = 'Utilities';
      }

      // Sugerir data de competência e vencimento
      if (!partialData.competenceDate) {
        suggestions.competenceDate = new Date();
      }
      if (!partialData.dueDate) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30); // Padrão: 30 dias
        suggestions.dueDate = dueDate;
      }
    }

    return suggestions;
  };

  const getCategorySuggestions = (type: 'income' | 'expense', description?: string): Partial<Category> => {
    const suggestions: Partial<Category> = {
      type
    };

    if (description) {
      const desc = description.toLowerCase();
      
      // Sugerir grupo DRE e tipo de categoria
      if (type === 'expense') {
        if (desc.includes('salário') || desc.includes('benefício')) {
          suggestions.dreGroup = 'despesas_pessoal';
          suggestions.categoryType = 'Folha de Pagamento';
        } else if (desc.includes('aluguel') || desc.includes('conta')) {
          suggestions.dreGroup = 'despesas_administrativas';
          suggestions.categoryType = 'Despesas Fixas';
        }
      } else {
        if (desc.includes('consultoria') || desc.includes('serviço')) {
          suggestions.dreGroup = 'receita_bruta';
          suggestions.categoryType = 'Serviços';
        } else if (desc.includes('juros') || desc.includes('rendimento')) {
          suggestions.dreGroup = 'receitas_financeiras';
          suggestions.categoryType = 'Receitas Financeiras';
        }
      }
    }

    return suggestions;
  };

  const getBankAccountSuggestions = (bankCode: string): Partial<BankAccount> => {
    const bank = bankCodes[bankCode as keyof typeof bankCodes];
    if (bank) {
      return {
        name: bank.suggestedName,
        bankCode,
        initialBalance: 0
      };
    }
    return {};
  };

  const getDRESuggestions = (dreData: DREData): Partial<DREData> => {
    const suggestions: Partial<DREData> = {};

    // Se a receita bruta foi informada, sugerir outros valores baseados em proporções típicas
    if (dreData.receitaBruta > 0) {
      Object.entries(dreRatios).forEach(([key, ratio]) => {
        if (key !== 'receitaBruta') {
          suggestions[key as keyof DREData] = dreData.receitaBruta * ratio;
        }
      });

      // Calcular valores derivados
      suggestions.receitaLiquida = dreData.receitaBruta - 
        (suggestions.impostos || 0) - 
        (suggestions.deducaoReceita || 0);

      suggestions.lucroBruto = (suggestions.receitaLiquida || 0) - 
        (suggestions.custosServicos || 0);

      suggestions.resultadoOperacional = (suggestions.lucroBruto || 0) -
        (suggestions.despesasAdministrativas || 0) -
        (suggestions.despesasPessoal || 0) -
        (suggestions.despesasVariaveis || 0);

      suggestions.lucroLiquido = (suggestions.resultadoOperacional || 0) +
        (suggestions.outrasReceitas || 0) +
        (suggestions.receitasFinanceiras || 0) -
        (suggestions.despesasFinanceiras || 0);

      suggestions.resultadoExercicio = (suggestions.lucroLiquido || 0) -
        (suggestions.investimentos || 0);

      // EBITDA
      suggestions.depreciacaoAmortizacao = dreData.receitaBruta * 0.03;
      suggestions.ebitda = (suggestions.resultadoOperacional || 0) +
        (suggestions.depreciacaoAmortizacao || 0);
    }

    return suggestions;
  };

  return {
    getTransactionSuggestions,
    getCategorySuggestions,
    getBankAccountSuggestions,
    getDRESuggestions
  };
};

export const suggestionEngine = createSuggestionEngine();