import * as XLSX from 'xlsx';
import type { ParsedExpense, ColumnMapping } from '@/types';

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

// Parse amount from various formats
function parseAmount(value: unknown): number {
  if (typeof value === 'number') return Math.abs(value);
  
  const str = String(value ?? '0')
    .replace(/[₪$€,]/g, '')
    .replace(/\s/g, '')
    .trim();
  
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.abs(num);
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
        
        // Map common column names
        const rules = rawData.map((row) => {
          const name = row['שם הוצאה'] || row['שם'] || row['name'] || row['expense_name'];
          if (!name) return null;
          
          return {
            expense_name: String(name).trim(),
            category_name: String(row['קטגוריה'] || row['category'] || '').trim() || undefined,
            frequency: String(row['תדירות'] || row['frequency'] || '').trim() || undefined,
            amount_type: String(row['סוג סכום'] || row['amount_type'] || '').trim() || undefined,
            expense_type: String(row['סוג הוצאה'] || row['expense_type'] || '').trim() || undefined,
            payment_method: String(row['אמצעי תשלום'] || row['payment_method'] || '').trim() || undefined,
          };
        }).filter(Boolean) as Array<{
          expense_name: string;
          category_name?: string;
          frequency?: string;
          amount_type?: string;
          expense_type?: string;
          payment_method?: string;
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
