import { read, utils, write } from 'xlsx';
import { Transaction } from '../types';
import { Decimal } from 'decimal.js';

// Template structure for transactions
export const transactionTemplate = {
  headers: [
    'Tipo',
    'Descrição',
    'Valor',
    'Categoria',
    'Centro de Custo',
    'Data de Competência',
    'Data de Vencimento',
    'Fornecedor/Cliente',
    'Número da Nota',
    'Conta Bancária'
  ],
  sampleData: [
    [
      'despesa',
      'Aluguel Comercial',
      '1500.00',
      'Aluguel',
      'Administrativo',
      '01/03/2024',
      '05/03/2024',
      'Imobiliária XYZ',
      'NF-001',
      'Conta Principal'
    ],
    [
      'despesa',
      'Material de Escritório',
      '250.00',
      'Material de Escritório',
      'Administrativo',
      '01/03/2024',
      '10/03/2024',
      'Papelaria ABC',
      'NF-002',
      'Conta Principal'
    ]
  ]
};

// Function to generate template file
export function generateTemplate(): Blob {
  const wb = utils.book_new();
  const ws = utils.aoa_to_sheet([
    transactionTemplate.headers,
    ...transactionTemplate.sampleData
  ]);

  // Add validation rules
  ws['!dataValidation'] = {
    B2: { type: 'list', values: ['despesa', 'receita'] }
  };

  utils.book_append_sheet(wb, ws, 'Lançamentos');
  
  // Generate file
  const wbout = write(wb, { 
    bookType: 'xlsx', 
    type: 'array'
  });

  return new Blob([wbout], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
}

// Function to parse date from Excel format
function parseExcelDate(value: string): Date {
  const parts = value.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  return new Date(value);
}

// Function to parse transactions from Excel file
export async function parseTransactions(file: File): Promise<Partial<Transaction>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = utils.sheet_to_json(worksheet, { header: 1 });

        // Skip header row
        const transactions = rows.slice(1).map((row: any) => {
          if (!row[0]) return null; // Skip empty rows

          return {
            type: row[0] === 'despesa' ? 'expense' : 'income',
            description: row[1],
            amount: new Decimal(row[2]),
            category: row[3],
            costCenter: row[4] || undefined,
            competenceDate: parseExcelDate(row[5]),
            dueDate: parseExcelDate(row[6]),
            supplier: row[7],
            invoiceNumber: row[8] || undefined,
            bankAccount: row[9],
            status: 'pending',
            reconciled: false
          };
        }).filter(Boolean);

        resolve(transactions);
      } catch (error) {
        reject(new Error('Erro ao processar arquivo. Verifique se está usando o modelo correto.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo.'));
    };

    reader.readAsArrayBuffer(file);
  });
}

// Function to export transactions to Excel
export function exportTransactions(transactions: Transaction[]): Blob {
  const wb = utils.book_new();
  
  // Convert transactions to rows
  const rows = transactions.map(t => [
    t.type === 'expense' ? 'despesa' : 'receita',
    t.description,
    t.amount.toString(),
    t.category,
    t.costCenter || '',
    t.competenceDate.toLocaleDateString('pt-BR'),
    t.dueDate.toLocaleDateString('pt-BR'),
    t.supplier || '',
    t.invoiceNumber || '',
    t.bankAccount || ''
  ]);

  // Create worksheet
  const ws = utils.aoa_to_sheet([
    transactionTemplate.headers,
    ...rows
  ]);

  utils.book_append_sheet(wb, ws, 'Lançamentos');

  // Generate file
  const wbout = write(wb, { 
    bookType: 'xlsx', 
    type: 'array'
  });

  return new Blob([wbout], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
}