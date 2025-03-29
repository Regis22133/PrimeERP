import { BankStatement, Transaction } from '../types';
import { Decimal } from 'decimal.js';
import { v4 as uuidv4 } from 'uuid';

// Parse OFX file content
function parseOFXContent(content: string) {
  // Remove empty lines and SGML header
  const lines = content
    .split('\n')
    .filter(line => line.trim())
    .filter(line => !line.startsWith('<?xml'))
    .filter(line => !line.startsWith('<?OFX'))
    .filter(line => !line.startsWith('OFXHEADER'))
    .filter(line => !line.startsWith('VERSION'))
    .filter(line => !line.startsWith('SECURITY'))
    .filter(line => !line.startsWith('ENCODING'))
    .filter(line => !line.startsWith('CHARSET'))
    .filter(line => !line.startsWith('COMPRESSION'))
    .filter(line => !line.startsWith('OLDFILEUID'))
    .filter(line => !line.startsWith('NEWFILEUID'));

  // Parse transactions
  const transactions: any[] = [];
  let currentTransaction: any = {};
  let inTransaction = false;
  let bankInfo = {
    bankId: '',
    accountId: '',
    accountType: '',
    balance: 0,
    balanceDate: ''
  };

  lines.forEach(line => {
    line = line.trim();
    
    // Bank info
    if (line.includes('<BANKID>')) {
      bankInfo.bankId = line.replace(/<\/?BANKID>/g, '');
    }
    if (line.includes('<ACCTID>')) {
      bankInfo.accountId = line.replace(/<\/?ACCTID>/g, '');
    }
    if (line.includes('<ACCTTYPE>')) {
      bankInfo.accountType = line.replace(/<\/?ACCTTYPE>/g, '');
    }
    if (line.includes('<BALAMT>')) {
      bankInfo.balance = parseFloat(line.replace(/<\/?BALAMT>/g, ''));
    }
    if (line.includes('<DTASOF>')) {
      bankInfo.balanceDate = line.replace(/<\/?DTASOF>/g, '');
    }
    
    // Transaction handling
    if (line.includes('<STMTTRN>')) {
      inTransaction = true;
      currentTransaction = {};
      return;
    }

    if (line.includes('</STMTTRN>')) {
      inTransaction = false;
      if (Object.keys(currentTransaction).length > 0) {
        transactions.push(currentTransaction);
      }
      return;
    }

    if (inTransaction) {
      // Transaction data fields
      if (line.includes('<TRNTYPE>')) {
        currentTransaction.TRNTYPE = line.replace(/<\/?TRNTYPE>/g, '');
      }
      if (line.includes('<DTPOSTED>')) {
        currentTransaction.DTPOSTED = line.replace(/<\/?DTPOSTED>/g, '');
      }
      if (line.includes('<TRNAMT>')) {
        currentTransaction.TRNAMT = line.replace(/<\/?TRNAMT>/g, '');
      }
      if (line.includes('<FITID>')) {
        currentTransaction.FITID = line.replace(/<\/?FITID>/g, '');
      }
      if (line.includes('<CHECKNUM>')) {
        currentTransaction.CHECKNUM = line.replace(/<\/?CHECKNUM>/g, '');
      }
      if (line.includes('<MEMO>')) {
        currentTransaction.MEMO = line.replace(/<\/?MEMO>/g, '');
      }
      if (line.includes('<NAME>')) {
        currentTransaction.NAME = line.replace(/<\/?NAME>/g, '');
      }
    }
  });

  return { transactions, bankInfo };
}

// Parse OFX date format (YYYYMMDD[HHMMSS])
function parseOFXDate(dateStr: string): Date {
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1;
  const day = parseInt(dateStr.substring(6, 8));
  
  if (dateStr.length > 8) {
    const hour = parseInt(dateStr.substring(8, 10));
    const minute = parseInt(dateStr.substring(10, 12));
    const second = parseInt(dateStr.substring(12, 14));
    return new Date(year, month, day, hour, minute, second);
  }
  
  return new Date(year, month, day);
}

// Find matching transaction for auto-reconciliation
function findMatchingTransaction(statement: BankStatement, transactions: Transaction[]): Transaction | null {
  const dateRange = 5 * 24 * 60 * 60 * 1000; // 5 days in milliseconds

  // First try exact match
  const exactMatch = transactions.find(transaction => {
    const amountMatches = transaction.amount.equals(statement.amount);
    const dateMatches = Math.abs(transaction.dueDate.getTime() - statement.transactionDate.getTime()) <= dateRange;
    const statusMatches = transaction.status === 'pending';
    const typeMatches = (statement.type === 'credit' && transaction.type === 'income') ||
                       (statement.type === 'debit' && transaction.type === 'expense');
    const bankAccountMatches = transaction.bankAccount === statement.bankAccountId;

    return amountMatches && dateMatches && statusMatches && typeMatches && bankAccountMatches;
  });

  if (exactMatch) return exactMatch;

  // If no exact match, try fuzzy match with description similarity
  return transactions.find(transaction => {
    const amountMatches = transaction.amount.equals(statement.amount);
    const dateMatches = Math.abs(transaction.dueDate.getTime() - statement.transactionDate.getTime()) <= dateRange;
    const statusMatches = transaction.status === 'pending';
    const typeMatches = (statement.type === 'credit' && transaction.type === 'income') ||
                       (statement.type === 'debit' && transaction.type === 'expense');
    const bankAccountMatches = transaction.bankAccount === statement.bankAccountId;
    
    // Check for description similarity
    const normalizedStatementDesc = statement.description.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedTransactionDesc = transaction.description.toLowerCase().replace(/[^a-z0-9]/g, '');
    const descriptionMatches = 
      normalizedStatementDesc.includes(normalizedTransactionDesc) ||
      normalizedTransactionDesc.includes(normalizedStatementDesc);

    return amountMatches && dateMatches && statusMatches && typeMatches && bankAccountMatches && descriptionMatches;
  }) || null;
}

export async function parseOFXFile(file: File, transactions: Transaction[] = []): Promise<{
  statements: BankStatement[];
  matches: Array<{ statement: BankStatement; transaction: Transaction; }>;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const { transactions: ofxTransactions, bankInfo } = parseOFXContent(content);
        
        if (!ofxTransactions.length) {
          throw new Error('Nenhuma transação encontrada no arquivo OFX');
        }

        // Convert OFX transactions to BankStatement format
        const statements: BankStatement[] = ofxTransactions.map(transaction => ({
          id: uuidv4(),
          bankAccountId: '', // Will be set by the component
          transactionDate: parseOFXDate(transaction.DTPOSTED),
          description: transaction.MEMO || transaction.NAME || transaction.CHECKNUM || '',
          amount: new Decimal(Math.abs(parseFloat(transaction.TRNAMT))),
          type: parseFloat(transaction.TRNAMT) < 0 ? 'debit' : 'credit',
          balance: new Decimal(0), // Will be calculated later
          reconciled: false,
          userId: '', // Will be set by the component
          createdAt: new Date()
        }));

        // Sort by date
        statements.sort((a, b) => a.transactionDate.getTime() - b.transactionDate.getTime());

        // Calculate running balance
        let balance = new Decimal(bankInfo.balance || 0);
        statements.forEach(statement => {
          if (statement.type === 'credit') {
            balance = balance.plus(statement.amount);
          } else {
            balance = balance.minus(statement.amount);
          }
          statement.balance = balance;
        });

        // Find matching transactions for auto-reconciliation
        const matches = statements
          .map(statement => ({
            statement,
            transaction: findMatchingTransaction(statement, transactions)
          }))
          .filter((match): match is { statement: BankStatement; transaction: Transaction } => 
            match.transaction !== null
          );

        resolve({ statements, matches });
      } catch (error) {
        console.error('Error parsing OFX file:', error);
        reject(new Error('Erro ao processar arquivo OFX. Verifique se o formato está correto.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo'));
    };

    reader.readAsText(file);
  });
}

export function validateOFXFile(file: File): boolean {
  // Check file extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension !== 'ofx') {
    throw new Error('Tipo de arquivo inválido. Por favor, selecione um arquivo OFX.');
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB in bytes
  if (file.size > maxSize) {
    throw new Error('Arquivo muito grande. O tamanho máximo é 10MB.');
  }

  return true;
}