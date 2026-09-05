import * as XLSX from 'xlsx';
import type { ParsedExpense, ColumnMapping, IncomeColumnMapping } from '@/types';

// Column name aliases for auto-detection (Hebrew and English)
const EXPENSE_COLUMN_ALIASES: Record<keyof ColumnMapping, string[]> = {
  name: ['שם', 'שם הוצאה', 'תיאור', 'פירוט', 'name', 'description', 'שם בית העסק', 'שם בית עסק'],
  amount: ['סכום', 'סכום החיוב', 'סכום חיוב', 'amount', 'sum', 'total'],
  date: ['תאריך', 'תאריך עסקה', 'תאריך חיוב', 'date', 'transaction_date'],
  credit_card: ['כרטיס', 'כרטיס אשראי', 'מספר כרטיס', '4 ספרות', 'credit_card', 'card'],
  notes: ['הערות', 'הערה', 'notes', 'note', 'comment', 'comments']
};

const INCOME_COLUMN_ALIASES: Record<keyof IncomeColumnMapping, string[]> = {
  name: ['שם', 'שם הכנסה', 'תיאור', 'פירוט', 'name', 'description', 'מקור'],
  amount: ['סכום', 'סכום הכנסה', 'amount', 'sum', 'total'],
  date: ['תאריך', 'date', 'transaction_date'],
  notes: ['הערות', 'הערה', 'notes', 'note', 'comment', 'comments']
};

const EXPENSE_RULE_COLUMN_ALIASES: Record<string, string[]> = {
  expense_name: ['שם הוצאה', 'שם', 'name', 'expense_name', 'תיאור'],
  category_name: ['קטגוריה', 'category', 'category_name'],
  frequency: ['תדירות', 'frequency'],
  amount_type: ['סוג סכום', 'amount_type'],
  expense_type: ['סוג הוצאה', 'expense_type'],
  payment_method: ['אמצעי תשלום', 'payment_method'],
  credit_card: ['כרטיס', 'כרטיס אשראי', 'מספר כרטיס', 'credit_card', 'card'],
  notes: ['הערות', 'הערה', 'notes', 'note']
};

// Helper function to auto-detect column mapping based on column names
export function autoDetectExpenseMapping(columns: string[]): ColumnMapping {
  const mapping: ColumnMapping = { name: '', amount: '', date: '', credit_card: '', notes: '' };
  
  for (const col of columns) {
    const colLower = col.toLowerCase().trim();
    
    for (const [field, aliases] of Object.entries(EXPENSE_COLUMN_ALIASES)) {
      if (aliases.some(alias => colLower === alias.toLowerCase() || colLower.includes(alias.toLowerCase()))) {
        // Only set if not already set (first match wins)
        if (!mapping[field as keyof ColumnMapping]) {
          mapping[field as keyof ColumnMapping] = col;
        }
        break;
      }
    }
  }
  
  return mapping;
}

export function autoDetectIncomeMapping(columns: string[]): IncomeColumnMapping {
  const mapping: IncomeColumnMapping = { name: '', amount: '', date: '', notes: '' };
  
  for (const col of columns) {
    const colLower = col.toLowerCase().trim();
    
    for (const [field, aliases] of Object.entries(INCOME_COLUMN_ALIASES)) {
      if (aliases.some(alias => colLower === alias.toLowerCase() || colLower.includes(alias.toLowerCase()))) {
        if (!mapping[field as keyof IncomeColumnMapping]) {
          mapping[field as keyof IncomeColumnMapping] = col;
        }
        break;
      }
    }
  }
  
  return mapping;
}

export function autoDetectRuleMapping(columns: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  
  for (const col of columns) {
    const colLower = col.toLowerCase().trim();
    
    for (const [field, aliases] of Object.entries(EXPENSE_RULE_COLUMN_ALIASES)) {
      if (aliases.some(alias => colLower === alias.toLowerCase() || colLower.includes(alias.toLowerCase()))) {
        if (!mapping[field]) {
          mapping[field] = col;
        }
        break;
      }
    }
  }
  
  return mapping;
}

export type CreditCardProvider = 'isracard' | 'cal' | 'generic';

interface ParserResult {
  provider: CreditCardProvider;
  expenses: ParsedExpense[];
  columns: string[];
  rawData: Record<string, unknown>[];
}

// Parse date from various formats
function parseDate(value: unknown): string {
  if (!value) return new Date().toISOString().split('T')[0];
  
  if (typeof value === 'number') {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(value);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }
  
  const str = String(value).trim();
  
  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY or DD.MM.YY
  const dmyMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    let year = dmyMatch[3];
    if (year.length === 2) {
      year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
    }
    return `${year}-${month}-${day}`;
  }
  
  // Try native parsing
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  
  return new Date().toISOString().split('T')[0];
}

// Parse amount from various formats - preserves negative for credits
function parseAmount(value: unknown): number {
  if (typeof value === 'number') return value;
  
  const str = String(value ?? '0')
    .replace(/[₪$€,]/g, '')
    .replace(/\s/g, '')
    .trim();
  
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// Detect Isracard format
function isIsracardFormat(columns: string[]): boolean {
  const isracardColumns = ['שם בית העסק', 'סכום החיוב', 'תאריך עסקה', 'תאריך חיוב'];
  return isracardColumns.some((col) => columns.some((c) => c.includes(col)));
}

// Detect Cal format
function isCalFormat(columns: string[]): boolean {
  const calColumns = ['שם בית עסק', 'סכום חיוב', 'תאריך'];
  return calColumns.some((col) => columns.some((c) => c.includes(col)));
}

// Parse Isracard Excel
function parseIsracard(data: Record<string, unknown>[]): ParsedExpense[] {
  return data
    .filter((row) => {
      const name = row['שם בית העסק'] || row['שם בית עסק'];
      const amount = row['סכום החיוב'] || row['סכום חיוב'] || row['סכום'];
      return name && amount;
    })
    .map((row) => ({
      name: String(row['שם בית העסק'] || row['שם בית עסק'] || '').trim(),
      amount: parseAmount(row['סכום החיוב'] || row['סכום חיוב'] || row['סכום']),
      date: parseDate(row['תאריך עסקה'] || row['תאריך חיוב'] || row['תאריך']),
      originalRow: row,
    }));
}

// Parse Cal Excel
function parseCal(data: Record<string, unknown>[]): ParsedExpense[] {
  return data
    .filter((row) => {
      const name = row['שם בית עסק'] || row['שם העסק'];
      const amount = row['סכום חיוב'] || row['סכום'];
      return name && amount;
    })
    .map((row) => ({
      name: String(row['שם בית עסק'] || row['שם העסק'] || '').trim(),
      amount: parseAmount(row['סכום חיוב'] || row['סכום']),
      date: parseDate(row['תאריך'] || row['תאריך עסקה']),
      originalRow: row,
    }));
}

// Extract last 4 digits from credit card field
function parseCreditCardLastFour(value: unknown): string | undefined {
  if (!value) return undefined;
  const str = String(value).replace(/\D/g, ''); // Keep only digits
  if (str.length >= 4) {
    return str.slice(-4); // Return last 4 digits
  }
  return str.length > 0 ? str : undefined;
}

// Parse with manual column mapping
export function parseWithMapping(
  data: Record<string, unknown>[],
  mapping: ColumnMapping
): ParsedExpense[] {
  return data
    .filter((row) => row[mapping.name] && row[mapping.amount])
    .map((row) => ({
      name: String(row[mapping.name] ?? '').trim(),
      amount: parseAmount(row[mapping.amount]),
      date: parseDate(row[mapping.date]),
      credit_card_last_four: mapping.credit_card ? parseCreditCardLastFour(row[mapping.credit_card]) : undefined,
      notes: mapping.notes && row[mapping.notes] ? String(row[mapping.notes]).trim() : undefined,
      originalRow: row,
    }));
}

// Main parser function
export async function parseExcelFile(file: File): Promise<ParserResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
        
        if (rawData.length === 0) {
          reject(new Error('הקובץ ריק או לא תקין'));
          return;
        }
        
        // Get columns
        const columns = Object.keys(rawData[0] || {});
        
        // Detect provider and parse
        let provider: CreditCardProvider = 'generic';
        let expenses: ParsedExpense[] = [];
        
        if (isIsracardFormat(columns)) {
          provider = 'isracard';
          expenses = parseIsracard(rawData);
        } else if (isCalFormat(columns)) {
          provider = 'cal';
          expenses = parseCal(rawData);
        }
        
        resolve({
          provider,
          expenses,
          columns,
          rawData,
        });
      } catch (error) {
        reject(new Error('שגיאה בקריאת הקובץ'));
      }
    };
    
    reader.onerror = () => reject(new Error('שגיאה בקריאת הקובץ'));
    reader.readAsArrayBuffer(file);
  });
}

// Parse expense rules from Excel
export async function parseRulesExcel(file: File): Promise<{
  rules: Array<{
    expense_name: string;
    category_name?: string;
    frequency?: string;
    amount_type?: string;
    expense_type?: string;
    payment_method?: string;
    credit_card?: string;
    notes?: string;
  }>;
  columns: string[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
        
        if (rawData.length === 0) {
          reject(new Error('הקובץ ריק'));
          return;
        }
        
        const columns = Object.keys(rawData[0] || {});
        
        // Auto-detect column mapping
        const colMapping = autoDetectRuleMapping(columns);
        
        // Map common column names using detected mapping
        const rules = rawData.map((row) => {
          const name = colMapping.expense_name ? row[colMapping.expense_name] : (row['שם הוצאה'] || row['שם'] || row['name'] || row['expense_name']);
          if (!name) return null;
          
          return {
            expense_name: String(name).trim(),
            category_name: String(colMapping.category_name ? row[colMapping.category_name] : (row['קטגוריה'] || row['category'] || '')).trim() || undefined,
            frequency: String(colMapping.frequency ? row[colMapping.frequency] : (row['תדירות'] || row['frequency'] || '')).trim() || undefined,
            amount_type: String(colMapping.amount_type ? row[colMapping.amount_type] : (row['סוג סכום'] || row['amount_type'] || '')).trim() || undefined,
            expense_type: String(colMapping.expense_type ? row[colMapping.expense_type] : (row['סוג הוצאה'] || row['expense_type'] || '')).trim() || undefined,
            payment_method: String(colMapping.payment_method ? row[colMapping.payment_method] : (row['אמצעי תשלום'] || row['payment_method'] || '')).trim() || undefined,
            credit_card: String(colMapping.credit_card ? row[colMapping.credit_card] : (row['כרטיס'] || row['כרטיס אשראי'] || row['credit_card'] || '')).trim() || undefined,
            notes: String(colMapping.notes ? row[colMapping.notes] : (row['הערות'] || row['notes'] || '')).trim() || undefined,
          };
        }).filter(Boolean) as Array<{
          expense_name: string;
          category_name?: string;
          frequency?: string;
          amount_type?: string;
          expense_type?: string;
          payment_method?: string;
          credit_card?: string;
          notes?: string;
        }>;
        
        resolve({ rules, columns });
      } catch {
        reject(new Error('שגיאה בקריאת הקובץ'));
      }
    };
    
    reader.onerror = () => reject(new Error('שגיאה בקריאת הקובץ'));
    reader.readAsArrayBuffer(file);
  });
}
