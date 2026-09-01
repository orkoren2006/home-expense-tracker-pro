import { useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Household, HouseholdMember, Category, CreditCard, ExpenseRule, IncomeRule, DefaultExpenseSettings, DefaultIncomeSettings, ClassificationOption, DisplaySettings } from '@/types';
import { HouseholdContext } from '@/contexts/householdContext';

export { HouseholdContext } from '@/contexts/householdContext';
export type { HouseholdContextType } from '@/contexts/householdContext';

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [expenseRules, setExpenseRules] = useState<ExpenseRule[]>([]);
  const [incomeRules, setIncomeRules] = useState<IncomeRule[]>([]);
  const [defaultSettings, setDefaultSettings] = useState<DefaultExpenseSettings | null>(null);
  const [defaultIncomeSettings, setDefaultIncomeSettings] = useState<DefaultIncomeSettings | null>(null);
  const [classificationOptions, setClassificationOptions] = useState<ClassificationOption[]>([]);
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadHouseholdData = async () => {
    if (!supabase || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Get user's household membership
    const { data: membershipArr } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .limit(1);

    const membershipData = membershipArr?.[0];
    if (!membershipData) {
      setHousehold(null);
      setLoading(false);
      return;
    }

    // Load household
    const { data: householdData } = await supabase
      .from('households')
      .select('*')
      .eq('id', membershipData.household_id)
      .single();

    if (householdData) {
      setHousehold(householdData as Household);

      // Load all related data in parallel
      const [membersRes, categoriesRes, cardsRes, rulesRes, incomeRulesRes, settingsRes, incomeSettingsRes, classOptionsRes, displaySettingsRes] = await Promise.all([
        supabase.from('household_members').select('*').eq('household_id', householdData.id),
        supabase.from('categories').select('*').eq('household_id', householdData.id),
        supabase.from('credit_cards').select('*').eq('household_id', householdData.id),
        supabase.from('expense_rules').select('*').eq('household_id', householdData.id),
        supabase.from('income_rules').select('*').eq('household_id', householdData.id),
        supabase.from('default_expense_settings').select('*').eq('household_id', householdData.id).limit(1),
        supabase.from('default_income_settings').select('*').eq('household_id', householdData.id).limit(1),
        supabase.from('classification_options').select('*').eq('household_id', householdData.id),
        supabase.from('display_settings').select('*').eq('household_id', householdData.id).limit(1),
      ]);

      setMembers((membersRes.data ?? []) as HouseholdMember[]);
      setCategories((categoriesRes.data ?? []) as Category[]);
      setCreditCards((cardsRes.data ?? []) as CreditCard[]);
      setExpenseRules((rulesRes.data ?? []) as ExpenseRule[]);
      setIncomeRules((incomeRulesRes.data ?? []) as IncomeRule[]);
      setDefaultSettings((settingsRes.data?.[0] as DefaultExpenseSettings) ?? null);
      setDefaultIncomeSettings((incomeSettingsRes.data?.[0] as DefaultIncomeSettings) ?? null);
      setClassificationOptions((classOptionsRes.data ?? []) as ClassificationOption[]);
      // Parse display settings - the columns come as JSONB from DB
      const rawDisplaySettings = displaySettingsRes.data?.[0];
      if (rawDisplaySettings) {
        setDisplaySettings({
          id: rawDisplaySettings.id,
          household_id: rawDisplaySettings.household_id,
          expense_columns: Array.isArray(rawDisplaySettings.expense_columns) ? rawDisplaySettings.expense_columns : JSON.parse(rawDisplaySettings.expense_columns as string),
          income_columns: Array.isArray(rawDisplaySettings.income_columns) ? rawDisplaySettings.income_columns : JSON.parse(rawDisplaySettings.income_columns as string),
        } as DisplaySettings);
      } else {
        setDisplaySettings(null);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    loadHouseholdData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const createHousehold = async (name: string) => {
    if (!supabase || !user) return { error: new Error('Not authenticated') };

    const { data: newHousehold, error: householdError } = await supabase
      .from('households')
      .insert({ name, created_by: user.id })
      .select()
      .single();

    if (householdError) return { error: new Error(householdError.message) };

    // Add creator as owner
    const { error: memberError } = await supabase
      .from('household_members')
      .insert({
        household_id: newHousehold.id,
        user_id: user.id,
        role: 'owner',
      });

    if (memberError) return { error: new Error(memberError.message) };

    // Create default categories
    const defaultCategories = [
      { name: 'מזון וסופר', type: 'expense' },
      { name: 'תחבורה', type: 'expense' },
      { name: 'חשבונות', type: 'expense' },
      { name: 'בילויים', type: 'expense' },
      { name: 'קניות', type: 'expense' },
      { name: 'בריאות', type: 'expense' },
      { name: 'חינוך', type: 'expense' },
      { name: 'דיור', type: 'expense' },
      { name: 'אחר', type: 'expense' },
      { name: 'משכורת', type: 'income' },
      { name: 'בונוס', type: 'income' },
      { name: 'מתנות', type: 'income' },
      { name: 'אחר', type: 'income' },
    ];

    await supabase.from('categories').insert(
      defaultCategories.map((cat) => ({
        ...cat,
        household_id: newHousehold.id,
      }))
    );

    await loadHouseholdData();
    return { error: null };
  };

  const joinHousehold = async (inviteCode: string) => {
    if (!supabase || !user) return { error: new Error('Not authenticated') };

    // Find household by invite code
    const { data: foundHousehold, error: findError } = await supabase
      .from('households')
      .select('id')
      .eq('invite_code', inviteCode.toLowerCase())
      .single();

    if (findError || !foundHousehold) {
      return { error: new Error('קוד הזמנה לא נמצא') };
    }

    // Join as member
    const { error: joinError } = await supabase
      .from('household_members')
      .insert({
        household_id: foundHousehold.id,
        user_id: user.id,
        role: 'member',
      });

    if (joinError) {
      if (joinError.code === '23505') {
        return { error: new Error('אתה כבר חבר בבית זה') };
      }
      return { error: new Error(joinError.message) };
    }

    await loadHouseholdData();
    return { error: null };
  };

  const leaveHousehold = async () => {
    if (!supabase || !user || !household) return;

    await supabase
      .from('household_members')
      .delete()
      .eq('household_id', household.id)
      .eq('user_id', user.id);

    setHousehold(null);
    setMembers([]);
    setCategories([]);
    setCreditCards([]);
    setExpenseRules([]);
    setIncomeRules([]);
    setDefaultSettings(null);
    setDefaultIncomeSettings(null);
    setDisplaySettings(null);
  };

  const refreshData = async () => {
    await loadHouseholdData();
  };

  return (
    <HouseholdContext.Provider
      value={{
        household,
        members,
        categories,
        creditCards,
        expenseRules,
        incomeRules,
        defaultSettings,
        defaultIncomeSettings,
        classificationOptions,
        displaySettings,
        loading,
        createHousehold,
        joinHousehold,
        leaveHousehold,
        refreshData,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  );
}


