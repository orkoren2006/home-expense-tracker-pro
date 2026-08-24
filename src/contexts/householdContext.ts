import { createContext } from 'react';
import type { Household, HouseholdMember, Category, CreditCard, ExpenseRule, DefaultExpenseSettings, ClassificationOption } from '@/types';

export interface HouseholdContextType {
  household: Household | null;
  members: HouseholdMember[];
  categories: Category[];
  creditCards: CreditCard[];
  expenseRules: ExpenseRule[];
  defaultSettings: DefaultExpenseSettings | null;
  classificationOptions: ClassificationOption[];
  loading: boolean;
  createHousehold: (name: string) => Promise<{ error: Error | null }>;
  joinHousehold: (inviteCode: string) => Promise<{ error: Error | null }>;
  leaveHousehold: () => Promise<void>;
  refreshData: () => Promise<void>;
}

export const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);
