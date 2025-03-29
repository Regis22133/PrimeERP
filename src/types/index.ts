import { Decimal } from 'decimal.js';

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  description: string;
  amount: Decimal;
  category: string;
  competenceDate: Date;
  dueDate: Date;
  invoiceNumber?: string;
  status: 'pending' | 'completed';
  bankAccount: string;
  supplier?: string;
  balance?: Decimal;
  reconciled?: boolean;
  transferId?: string;
  costCenter?: string;
  attachments?: TransactionAttachment[];
}

export interface TransactionAttachment {
  id: string;
  transactionId: string;
  url: string;
  name: string;
  userId: string;
  createdAt: Date;
}

export interface TransferData {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: Date;
  description: string;
}

export interface Contact {
  id: string;
  name: string;
  type: 'client' | 'supplier';
  document?: string;
  email?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CostCenter {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type DREGroup = 
  | 'receita_bruta'
  | 'impostos'
  | 'deducao_receita'
  | 'custos_cmv'
  | 'custos_cpv'
  | 'custos_servicos'
  | 'despesas_administrativas'
  | 'despesas_pessoal'
  | 'despesas_variaveis'
  | 'outras_receitas'
  | 'receitas_financeiras'
  | 'despesas_financeiras'
  | 'investimentos';

export interface DREGroupInfo {
  id: DREGroup;
  name: string;
  type: 'income' | 'expense';
  order: number;
}

export interface CategoryType {
  id: string;
  name: string;
  type: 'income' | 'expense';
  dreGroup: DREGroup;
  userId: string;
  createdAt?: Date;
}

export interface BankAccount {
  id: string;
  name: string;
  bankCode: string;
  agency: string;
  accountNumber: string;
  initialBalance: number;
  currentBalance: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  isPrimary?: boolean;
}

export interface BankStatement {
  id: string;
  bankAccountId: string;
  transactionDate: Date;
  description: string;
  amount: Decimal;
  type: 'credit' | 'debit';
  balance: Decimal;
  reconciled: boolean;
  transactionId?: string;
  userId: string;
  createdAt: Date;
}

export interface DREData {
  receitaBruta: number;
  impostos: number;
  deducaoReceita: number;
  receitaLiquida: number;
  custosCMV: number;
  custosCPV: number;
  custosServicos: number;
  lucroBruto: number;
  despesasAdministrativas: number;
  despesasPessoal: number;
  despesasVariaveis: number;
  resultadoOperacional: number;
  outrasReceitas: number;
  receitasFinanceiras: number;
  despesasFinanceiras: number;
  lucroLiquido: number;
  investimentos: number;
  resultadoExercicio: number;
  depreciacaoAmortizacao: number;
  ebitda: number;
}

export interface CategorySummary {
  id: string;
  name: string;
  total: number;
  count: number;
  transactions: Transaction[];
}

export interface DREGroupSummary {
  id: DREGroup;
  name: string;
  total: number;
  categories: CategorySummary[];
}

export interface FinancialIndicators {
  prazoMedioRecebimento: number;
  prazoMedioPagamento: number;
  cicloFinanceiro: number;
  inadimplencia: number;
  inadimplenciaPercentual: number;
}

export interface SearchColumn {
  id: string;
  label: string;
  field: keyof Transaction;
}