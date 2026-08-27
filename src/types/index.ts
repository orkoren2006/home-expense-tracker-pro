export type Frequency = 'one_time' | 'monthly' | 'yearly' | 'weekly';
export type AmountType = 'fixed' | 'variable';
export type ExpenseType = 'mandatory' | 'optional' | 'luxury';
export type PaymentMethod = 'credit' | 'cash' | 'transfer' | 'check';
export type CategoryType = 'expense' | 'income';

export interface Category {
  id: string;
  household_id: string;
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
}

export interface CreditCard {
  id: string;
  household_id: string;
  name: string;
  last_four_digits?: string;
  provider?: string;
}

export interface ExpenseRule {
  id: string;
  household_id: string;
  expense_name: string;
  category_id?: string;
  frequency: Frequency;
  amount_type: AmountType;
  expense_type: ExpenseType;
  payment_method: PaymentMethod;
  notes?: string;
}

export interface Expense {
  id: string;
  household_id: string;
  name: string;
  amount: number;
  date: string;
  billing_month?: string; // YYYY-MM format
  category_id?: string;
  frequency: Frequency;
  amount_type: AmountType;
  expense_type: ExpenseType;
  payment_method: PaymentMethod;
  credit_card_id?: string;
  notes?: string;
  import_batch_id?: string;
  created_by?: string;
}

export interface DefaultExpenseSettings {
  id: string;
  household_id: string;
  category_id?: string;
  frequency: Frequency;
  amount_type: AmountType;
  expense_type: ExpenseType;
  payment_method: PaymentMethod;
}

export interface Household {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
}

export interface ParsedExpense {
  name: string;
  amount: number;
  date: string;
  credit_card_last_four?: string;
  originalRow: Record<string, unknown>;
}

export interface ColumnMapping {
  name: string;
  amount: string;
  date: string;
  credit_card?: string;
}

export interface ClassificationOption {
  id: string;
  household_id: string;
  option_type: string;
  value: string;
  label: string;
}

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  one_time: 'חד פעמי',
  monthly: 'חודשי',
  yearly: 'שנתי',
  weekly: 'שבועי',
};

export const AMOUNT_TYPE_LABELS: Record<AmountType, string> = {
  fixed: 'קבוע',
  variable: 'משתנה',
};

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  mandatory: 'הוצאת חובה',
  optional: 'אפשר לקצץ',
  luxury: 'מותרות',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  credit: 'אשראי',
  cash: 'מזומן',
  transfer: 'העברה בנקאית',
  check: 'צ\'ק',
};

// Income types
export type IncomePaymentMethod = 'salary' | 'transfer' | 'bit' | 'paybox' | 'check' | 'cash';
export type IncomeSource = 'work' | 'family_help' | 'loan' | 'savings' | 'rental' | 'investment' | 'other';

export interface Income {
  id: string;
  household_id: string;
  name: string;
  amount: number;
  date: string;
  billing_month?: string;
  frequency: Frequency;
  amount_type: AmountType;
  payment_method: IncomePaymentMethod;
  source: IncomeSource;
  notes?: string;
  import_batch_id?: string;
}

export interface IncomeRule {
  id: string;
  household_id: string;
  income_name: string;
  frequency: Frequency;
  amount_type: AmountType;
  payment_method: IncomePaymentMethod;
  source: IncomeSource;
  notes?: string;
}

export const INCOME_PAYMENT_METHOD_LABELS: Record<IncomePaymentMethod, string> = {
  salary: 'משכורת',
  transfer: 'העברה בנקאית',
  bit: 'ביט',
  paybox: 'פייבוקס',
  check: 'צ\'ק',
  cash: 'מזומן',
};

export const INCOME_SOURCE_LABELS: Record<IncomeSource, string> = {
  work: 'עבודה',
  family_help: 'עזרה מבן משפחה',
  loan: 'הלוואה',
  savings: 'משיכה מחסכון',
  rental: 'שכירות',
  investment: 'השקעות',
  other: 'אחר',
};
