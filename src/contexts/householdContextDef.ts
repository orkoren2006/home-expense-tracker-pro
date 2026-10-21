import { createContext } from 'react';
import type { Household, HouseholdMember, Category, CreditCard, ExpenseRule, IncomeRule, DefaultExpenseSettings, DefaultIncomeSettings, ClassificationOption, DisplaySettings } from '@/types';

export interface HouseholdContextType {
  household: Household | null;
  members: HouseholdMember[];
  categories: Category[];
  creditCards: CreditCard[];
  expenseRules: ExpenseRule[];
  incomeRules: IncomeRule[];
  defaultSettings: DefaultExpenseSettings | null;
  defaultIncomeSettings: DefaultIncomeSettings | null;
  classificationOptions: ClassificationOption[];
  displaySettings: DisplaySettings | null;
  loading: boolean;
  createHousehold: (name: string) => Promise<{ error: Error | null }>;
  joinHousehold: (inviteCode: string) => Promise<{ error: Error | null }>;
  leaveHousehold: () => Promise<void>;
  refreshData: () => Promise<void>;
}

export const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);
