import { useState, useEffect } from 'react';
import { Plus, Trash2, Copy, Users, CreditCard, Tag, Sliders, Upload, Check, List } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useHousehold } from '@/hooks/useHousehold';
import { supabase } from '@/integrations/supabase/client';
import { parseRulesExcel } from '@/utils/excelParsers';
import type { Frequency, AmountType, ExpenseType, PaymentMethod, ClassificationOption, IncomePaymentMethod, IncomeSource } from '@/types';
import {
  FREQUENCY_LABELS,
  AMOUNT_TYPE_LABELS,
  EXPENSE_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  INCOME_SOURCE_LABELS,
  INCOME_PAYMENT_METHOD_LABELS,
  EXPENSE_COLUMN_OPTIONS,
  INCOME_COLUMN_OPTIONS } from
'@/types';

type SettingsTab = 'categories' | 'cards' | 'defaults' | 'classifications' | 'household' | 'import';

const TAB_STORAGE_KEY = 'settings_active_tab';

export default function Settings() {
  const { household, categories, creditCards, defaultSettings, defaultIncomeSettings, displaySettings, refreshData } = useHousehold();

  // Persist tab in localStorage
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    const saved = localStorage.getItem(TAB_STORAGE_KEY);
    return saved as SettingsTab || 'categories';
  });

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    localStorage.setItem(TAB_STORAGE_KEY, tab);
  };

  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Classification options
  const [classificationOptions, setClassificationOptions] = useState<ClassificationOption[]>([]);
  const [newOptionType, setNewOptionType] = useState<string>('frequency');
  const [newOptionValue, setNewOptionValue] = useState('');
  const [newOptionLabel, setNewOptionLabel] = useState('');

  // Category form
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'expense' | 'income'>('expense');

  // Credit card form
  const [newCardName, setNewCardName] = useState('');
  const [newCardDigits, setNewCardDigits] = useState('');
  const [newCardProvider, setNewCardProvider] = useState('');

  // Default settings form
  const [defaultCategoryId, setDefaultCategoryId] = useState(defaultSettings?.category_id || '');
  const [defaultFrequency, setDefaultFrequency] = useState<Frequency>(
    defaultSettings?.frequency || 'one_time'
  );
  const [defaultAmountType, setDefaultAmountType] = useState<AmountType>(
    defaultSettings?.amount_type || 'variable'
  );
  const [defaultExpenseType, setDefaultExpenseType] = useState<ExpenseType>(
    defaultSettings?.expense_type || 'optional'
  );
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<PaymentMethod>(
    defaultSettings?.payment_method || 'credit'
  );

  // Default income settings form
  const [defaultIncomeFrequency, setDefaultIncomeFrequency] = useState<Frequency>(
    defaultIncomeSettings?.frequency || 'monthly'
  );
  const [defaultIncomeAmountType, setDefaultIncomeAmountType] = useState<AmountType>(
    defaultIncomeSettings?.amount_type || 'fixed'
  );
  const [defaultIncomePaymentMethod, setDefaultIncomePaymentMethod] = useState<IncomePaymentMethod>(
    defaultIncomeSettings?.payment_method || 'salary'
  );
  const [defaultIncomeSource, setDefaultIncomeSource] = useState<IncomeSource>(
    defaultIncomeSettings?.source || 'work'
  );

  // Display settings
  const [expenseColumns, setExpenseColumns] = useState<string[]>(
    displaySettings?.expense_columns || ['name', 'amount', 'date', 'category', 'credit_card']
  );
  const [incomeColumns, setIncomeColumns] = useState<string[]>(
    displaySettings?.income_columns || ['name', 'amount', 'date', 'source']
  );

  const tabs: Array<{id: SettingsTab;label: string;icon: typeof Tag;}> = [
  { id: 'categories', label: 'קטגוריות', icon: Tag },
  { id: 'classifications', label: 'סיווגים', icon: List },
  { id: 'cards', label: 'כרטיסי אשראי', icon: CreditCard },
  { id: 'defaults', label: 'ברירות מחדל', icon: Sliders },
  { id: 'import', label: 'ייבוא כללים', icon: Upload },
  { id: 'household', label: 'בית', icon: Users }];

  // Sync expense defaults when they load from context
  useEffect(() => {
    if (defaultSettings) {
      setDefaultCategoryId(defaultSettings.category_id || '');
      setDefaultFrequency(defaultSettings.frequency);
      setDefaultAmountType(defaultSettings.amount_type);
      setDefaultExpenseType(defaultSettings.expense_type);
      setDefaultPaymentMethod(defaultSettings.payment_method);
    }
  }, [defaultSettings]);

  // Sync income defaults when they load from context
  useEffect(() => {
    if (defaultIncomeSettings) {
      setDefaultIncomeFrequency(defaultIncomeSettings.frequency);
      setDefaultIncomeAmountType(defaultIncomeSettings.amount_type);
      setDefaultIncomePaymentMethod(defaultIncomeSettings.payment_method);
      setDefaultIncomeSource(defaultIncomeSettings.source);
    }
  }, [defaultIncomeSettings]);

  // Sync display settings when they load from context
  useEffect(() => {
    if (displaySettings) {
      setExpenseColumns(displaySettings.expense_columns);
      setIncomeColumns(displaySettings.income_columns);
    }
  }, [displaySettings]);

  // Load classification options
  useEffect(() => {
    const loadOptions = async () => {
      if (!supabase || !household) return;
      const { data } = await supabase.
      from('classification_options').
      select('*').
      eq('household_id', household.id);
      setClassificationOptions((data ?? []) as ClassificationOption[]);
    };
    loadOptions();
  }, [household]);

  const handleAddOption = async () => {
    if (!supabase || !household || !newOptionValue.trim() || !newOptionLabel.trim()) return;

    setLoading(true);
    await supabase.from('classification_options').insert({
      household_id: household.id,
      option_type: newOptionType,
      value: newOptionValue.trim().toLowerCase().replace(/\s+/g, '_'),
      label: newOptionLabel.trim(),
      is_default: false
    });

    // Reload options
    const { data } = await supabase.
    from('classification_options').
    select('*').
    eq('household_id', household.id);
    setClassificationOptions((data ?? []) as ClassificationOption[]);

    setNewOptionValue('');
    setNewOptionLabel('');
    setLoading(false);
  };

  const handleDeleteOption = async (id: string) => {
    if (!supabase || !confirm('בטוח שברצונך למחוק אפשרות זו?')) return;

    await supabase.from('classification_options').delete().eq('id', id);
    setClassificationOptions((prev) => prev.filter((o) => o.id !== id));
  };


  const handleAddCategory = async () => {
    if (!supabase || !household || !newCategoryName.trim()) return;

    setLoading(true);
    await supabase.from('categories').insert({
      household_id: household.id,
      name: newCategoryName.trim(),
      type: newCategoryType
    });

    setNewCategoryName('');
    await refreshData();
    setLoading(false);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!supabase || !confirm('בטוח שברצונך למחוק קטגוריה זו?')) return;

    await supabase.from('categories').delete().eq('id', id);
    await refreshData();
  };

  const handleAddCard = async () => {
    if (!supabase || !household || !newCardName.trim()) return;

    setLoading(true);
    await supabase.from('credit_cards').insert({
      household_id: household.id,
      name: newCardName.trim(),
      last_four_digits: newCardDigits || null,
      provider: newCardProvider || null
    });

    setNewCardName('');
    setNewCardDigits('');
    setNewCardProvider('');
    await refreshData();
    setLoading(false);
  };

  const handleDeleteCard = async (id: string) => {
    if (!supabase || !confirm('בטוח שברצונך למחוק כרטיס זה?')) return;

    await supabase.from('credit_cards').delete().eq('id', id);
    await refreshData();
  };

  const handleSaveDefaults = async () => {
    if (!supabase || !household) return;

    setLoading(true);
    await supabase.from('default_expense_settings').upsert(
      {
        household_id: household.id,
        category_id: defaultCategoryId || null,
        frequency: defaultFrequency,
        amount_type: defaultAmountType,
        expense_type: defaultExpenseType,
        payment_method: defaultPaymentMethod
      },
      { onConflict: 'household_id' }
    );

    await refreshData();
    setLoading(false);
  };

  const handleSaveIncomeDefaults = async () => {
    if (!supabase || !household) return;

    setLoading(true);
    await supabase.from('default_income_settings').upsert(
      {
        household_id: household.id,
        frequency: defaultIncomeFrequency,
        amount_type: defaultIncomeAmountType,
        payment_method: defaultIncomePaymentMethod,
        source: defaultIncomeSource
      },
      { onConflict: 'household_id' }
    );

    await refreshData();
    setLoading(false);
  };

  const handleSaveDisplaySettings = async () => {
    if (!supabase || !household) return;

    setLoading(true);
    await supabase.from('display_settings').upsert(
      {
        household_id: household.id,
        expense_columns: expenseColumns,
        income_columns: incomeColumns
      },
      { onConflict: 'household_id' }
    );

    await refreshData();
    setLoading(false);
  };

  const toggleExpenseColumn = (key: string) => {
    const option = EXPENSE_COLUMN_OPTIONS.find((o) => o.key === key);
    if (option && 'required' in option && option.required) return; // Can't toggle required columns

    setExpenseColumns((prev) =>
    prev.includes(key) ?
    prev.filter((k) => k !== key) :
    [...prev, key]
    );
  };

  const toggleIncomeColumn = (key: string) => {
    const option = INCOME_COLUMN_OPTIONS.find((o) => o.key === key);
    if (option && 'required' in option && option.required) return; // Can't toggle required columns

    setIncomeColumns((prev) =>
    prev.includes(key) ?
    prev.filter((k) => k !== key) :
    [...prev, key]
    );
  };

  const handleCopyInviteCode = () => {
    if (!household) return;

    const textarea = document.createElement('textarea');
    textarea.value = household.invite_code;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImportRules = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !supabase || !household) return;

    setLoading(true);
    try {
      const { rules } = await parseRulesExcel(file);

      if (rules.length === 0) {
        alert('לא נמצאו כללים בקובץ');
        setLoading(false);
        return;
      }

      // Build reverse label maps (Hebrew -> English value)
      const frequencyReverseMap = new Map(
        Object.entries(FREQUENCY_LABELS).map(([k, v]) => [v.toLowerCase(), k])
      );
      const amountTypeReverseMap = new Map(
        Object.entries(AMOUNT_TYPE_LABELS).map(([k, v]) => [v.toLowerCase(), k])
      );
      const expenseTypeReverseMap = new Map(
        Object.entries(EXPENSE_TYPE_LABELS).map(([k, v]) => [v.toLowerCase(), k])
      );
      const paymentMethodReverseMap = new Map(
        Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => [v.toLowerCase(), k])
      );

      // Add custom classification options to reverse maps
      for (const opt of classificationOptions) {
        const map =
        opt.option_type === 'frequency' ? frequencyReverseMap :
        opt.option_type === 'amount_type' ? amountTypeReverseMap :
        opt.option_type === 'expense_type' ? expenseTypeReverseMap :
        paymentMethodReverseMap;
        map.set(opt.label.toLowerCase(), opt.value);
      }

      // Build existing category map
      const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));

      // Collect items that need to be created
      const newCategories = new Set<string>();
      const newClassifications: Array<{type: string;label: string;}> = [];

      for (const rule of rules) {
        // Check categories
        if (rule.category_name && !categoryMap.has(rule.category_name.toLowerCase())) {
          newCategories.add(rule.category_name);
        }
        // Check frequency
        if (rule.frequency && !frequencyReverseMap.has(rule.frequency.toLowerCase())) {
          newClassifications.push({ type: 'frequency', label: rule.frequency });
          frequencyReverseMap.set(rule.frequency.toLowerCase(), rule.frequency.toLowerCase().replace(/\s+/g, '_'));
        }
        // Check amount_type
        if (rule.amount_type && !amountTypeReverseMap.has(rule.amount_type.toLowerCase())) {
          newClassifications.push({ type: 'amount_type', label: rule.amount_type });
          amountTypeReverseMap.set(rule.amount_type.toLowerCase(), rule.amount_type.toLowerCase().replace(/\s+/g, '_'));
        }
        // Check expense_type
        if (rule.expense_type && !expenseTypeReverseMap.has(rule.expense_type.toLowerCase())) {
          newClassifications.push({ type: 'expense_type', label: rule.expense_type });
          expenseTypeReverseMap.set(rule.expense_type.toLowerCase(), rule.expense_type.toLowerCase().replace(/\s+/g, '_'));
        }
        // Check payment_method
        if (rule.payment_method && !paymentMethodReverseMap.has(rule.payment_method.toLowerCase())) {
          newClassifications.push({ type: 'payment_method', label: rule.payment_method });
          paymentMethodReverseMap.set(rule.payment_method.toLowerCase(), rule.payment_method.toLowerCase().replace(/\s+/g, '_'));
        }
      }

      // Auto-create missing categories
      if (newCategories.size > 0) {
        const categoriesToInsert = Array.from(newCategories).map((name) => ({
          household_id: household.id,
          name,
          type: 'expense' as const
        }));

        const { data: createdCats, error: catError } = await supabase.
        from('categories').
        insert(categoriesToInsert).
        select();

        if (catError) {
          console.error('Error creating categories:', catError);
        } else if (createdCats) {
          for (const cat of createdCats) {
            categoryMap.set(cat.name.toLowerCase(), cat.id);
          }
        }
      }

      // Auto-create missing classification options
      if (newClassifications.length > 0) {
        const uniqueClassifications = newClassifications.filter(
          (c, i, arr) => arr.findIndex((x) => x.type === c.type && x.label.toLowerCase() === c.label.toLowerCase()) === i
        );
        const classToInsert = uniqueClassifications.map((c) => ({
          household_id: household.id,
          option_type: c.type,
          value: c.label.toLowerCase().replace(/\s+/g, '_'),
          label: c.label
        }));

        const { error: classError } = await supabase.
        from('classification_options').
        insert(classToInsert);

        if (classError) {
          console.error('Error creating classification options:', classError);
        }
      }

      // Helper to resolve value from Hebrew label or English value
      const resolveValue = (input: string | undefined, reverseMap: Map<string, string>, defaultVal: string): string => {
        if (!input) return defaultVal;
        const lower = input.toLowerCase();
        // Check if it's a Hebrew label
        if (reverseMap.has(lower)) return reverseMap.get(lower)!;
        // Check if it's already an English value
        const allValues = new Set(reverseMap.values());
        if (allValues.has(lower)) return lower;
        if (allValues.has(input)) return input;
        return defaultVal;
      };

      const toInsert = rules.map((rule) => ({
        household_id: household.id,
        expense_name: rule.expense_name,
        category_id: rule.category_name ?
        categoryMap.get(rule.category_name.toLowerCase()) || null :
        null,
        frequency: resolveValue(rule.frequency, frequencyReverseMap, 'one_time'),
        amount_type: resolveValue(rule.amount_type, amountTypeReverseMap, 'variable'),
        expense_type: resolveValue(rule.expense_type, expenseTypeReverseMap, 'optional'),
        payment_method: resolveValue(rule.payment_method, paymentMethodReverseMap, 'credit')
      }));

      const { error: upsertError } = await supabase.from('expense_rules').upsert(toInsert, {
        onConflict: 'household_id,expense_name'
      });

      if (upsertError) {
        console.error('Upsert error:', upsertError);
        alert(`שגיאה בהכנסת הכללים: ${upsertError.message}`);
        setLoading(false);
        return;
      }

      await refreshData();
      const msgs: string[] = [];
      if (newCategories.size > 0) msgs.push(`${newCategories.size} קטגוריות`);
      if (newClassifications.length > 0) msgs.push(`${newClassifications.length} סיווגים`);
      const createdMsg = msgs.length > 0 ? ` (נוצרו: ${msgs.join(', ')})` : '';
      alert(`יובאו ${rules.length} כללי סיווג בהצלחה${createdMsg}`);
    } catch (err) {
      console.error('Import error:', err);
      alert('שגיאה בייבוא הקובץ');
    }
    setLoading(false);
  };

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  return (
    <Layout>
      <div data-ev-id="ev_af44a941ec" className="md:mr-52 flex flex-col gap-6 pb-24 md:pb-6">
        <div data-ev-id="ev_5c4011a449">
          <h2 data-ev-id="ev_143866a000" className="text-2xl font-bold text-foreground">הגדרות</h2>
          <p data-ev-id="ev_f40669638a" className="text-muted-foreground">נהל את הקטגוריות, כרטיסים והבית</p>
        </div>

        {/* Tabs */}
        <div data-ev-id="ev_ae8bf9c710" className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map(({ id, label, icon: Icon }) =>
          <button data-ev-id="ev_51a34b6179"
          key={id}
          onClick={() => handleTabChange(id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
          activeTab === id ?
          'bg-primary text-primary-foreground' :
          'bg-card text-muted-foreground hover:text-foreground'}`
          }>

              <Icon className="w-4 h-4" />
              {label}
            </button>
          )}
        </div>

        {/* Categories tab */}
        {activeTab === 'categories' &&
        <div data-ev-id="ev_5610680fcf" className="flex flex-col gap-6">
            {/* Add category */}
            <Card>
              <h3 data-ev-id="ev_850b3a871a" className="font-semibold text-foreground mb-4">הוספת קטגוריה</h3>
              <div data-ev-id="ev_1333f3bea4" className="flex gap-3">
                <Input
                placeholder="שם הקטגוריה"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1" />

                <Select
                value={newCategoryType}
                onChange={(e) => setNewCategoryType(e.target.value as 'expense' | 'income')}
                options={[
                { value: 'expense', label: 'הוצאה' },
                { value: 'income', label: 'הכנסה' }]
                }
                className="w-32" />

                <Button onClick={handleAddCategory} disabled={loading}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            {/* Expense categories */}
            <Card>
              <h3 data-ev-id="ev_ccf3ffd139" className="font-semibold text-foreground mb-4">קטגוריות הוצאות</h3>
              <div data-ev-id="ev_50a547894c" className="flex flex-wrap gap-2">
                {expenseCategories.map((cat) =>
              <div data-ev-id="ev_dbd1c746c6"
              key={cat.id}
              className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg">

                    <span data-ev-id="ev_bb4b35dab6" className="text-foreground">{cat.name}</span>
                    <button data-ev-id="ev_62ae62d0a3"
                onClick={() => handleDeleteCategory(cat.id)}
                className="text-muted-foreground hover:text-red-600">

                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
              )}
              </div>
            </Card>

            {/* Income categories */}
            <Card>
              <h3 data-ev-id="ev_7e07f21fb0" className="font-semibold text-foreground mb-4">קטגוריות הכנסות</h3>
              <div data-ev-id="ev_d439a2a487" className="flex flex-wrap gap-2">
                {incomeCategories.map((cat) =>
              <div data-ev-id="ev_9e7ec35a49"
              key={cat.id}
              className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg">

                    <span data-ev-id="ev_79e65e7af1" className="text-foreground">{cat.name}</span>
                    <button data-ev-id="ev_604d85735d"
                onClick={() => handleDeleteCategory(cat.id)}
                className="text-muted-foreground hover:text-red-600">

                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
              )}
              </div>
            </Card>
          </div>
        }

        {/* Classifications tab */}
        {activeTab === 'classifications' &&
        <div data-ev-id="ev_825e779f6e" className="flex flex-col gap-6">
            <Card>
              <h3 data-ev-id="ev_c1e65a4f95" className="font-semibold text-foreground mb-4">הוספת אפשרות סיווג</h3>
              <p data-ev-id="ev_4d35a45623" className="text-muted-foreground mb-4 text-sm">
                הוסף אפשרויות מותאמות אישית לתדירות, סוג סכום, סוג הוצאה ואמצעי תשלום
              </p>
              <div data-ev-id="ev_3d154ac963" className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                <Select
                label="סוג"
                value={newOptionType}
                onChange={(e) => setNewOptionType(e.target.value)}
                options={[
                { value: 'frequency', label: 'תדירות' },
                { value: 'amount_type', label: 'סוג סכום' },
                { value: 'expense_type', label: 'סוג הוצאה' },
                { value: 'payment_method', label: 'אמצעי תשלום (הוצאות)' },
                { value: 'income_source', label: 'מקור הכנסה' },
                { value: 'income_payment_method', label: 'אמצעי תשלום (הכנסות)' }]
                } />

                <Input
                label="מזהה (אנגלית)"
                placeholder="למשל: quarterly"
                value={newOptionValue}
                onChange={(e) => setNewOptionValue(e.target.value)} />

                <Input
                label="תווית (עברית)"
                placeholder="למשל: רבעוני"
                value={newOptionLabel}
                onChange={(e) => setNewOptionLabel(e.target.value)} />

                <div data-ev-id="ev_f059b4c552" className="flex items-end">
                  <Button onClick={handleAddOption} disabled={loading}>
                    <Plus className="w-4 h-4" />
                    הוסף
                  </Button>
                </div>
              </div>
            </Card>

            {/* Frequency options */}
            <Card>
              <h3 data-ev-id="ev_767d688dc3" className="font-semibold text-foreground mb-4">תדירות תשלום</h3>
              <div data-ev-id="ev_d54253127f" className="flex flex-wrap gap-2">
                {Object.entries(FREQUENCY_LABELS).map(([value, label]) =>
              <div data-ev-id="ev_cc18a650f4" key={value} className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg">
                    <span data-ev-id="ev_8ea6b7cf18" className="text-foreground">{label}</span>
                    <span data-ev-id="ev_72b68a7c1b" className="text-xs text-muted-foreground">(ברירת מחדל)</span>
                  </div>
              )}
                {classificationOptions.filter((o) => o.option_type === 'frequency').map((opt) =>
              <div data-ev-id="ev_83e46a1c5b" key={opt.id} className="flex items-center gap-2 bg-primary/10 px-3 py-2 rounded-lg">
                    <span data-ev-id="ev_b5ad63cf07" className="text-foreground">{opt.label}</span>
                    <button data-ev-id="ev_70ab6c4e8c" onClick={() => handleDeleteOption(opt.id)} className="text-muted-foreground hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
              )}
              </div>
            </Card>

            {/* Amount type options */}
            <Card>
              <h3 data-ev-id="ev_4f2bcf81c5" className="font-semibold text-foreground mb-4">סוג סכום</h3>
              <div data-ev-id="ev_856833b727" className="flex flex-wrap gap-2">
                {Object.entries(AMOUNT_TYPE_LABELS).map(([value, label]) =>
              <div data-ev-id="ev_459c638c68" key={value} className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg">
                    <span data-ev-id="ev_6a9ec3c0c7" className="text-foreground">{label}</span>
                    <span data-ev-id="ev_6b8566ca18" className="text-xs text-muted-foreground">(ברירת מחדל)</span>
                  </div>
              )}
                {classificationOptions.filter((o) => o.option_type === 'amount_type').map((opt) =>
              <div data-ev-id="ev_d403a92ee0" key={opt.id} className="flex items-center gap-2 bg-primary/10 px-3 py-2 rounded-lg">
                    <span data-ev-id="ev_4f69bea837" className="text-foreground">{opt.label}</span>
                    <button data-ev-id="ev_75c9a16b49" onClick={() => handleDeleteOption(opt.id)} className="text-muted-foreground hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
              )}
              </div>
            </Card>

            {/* Expense type options */}
            <Card>
              <h3 data-ev-id="ev_3e1565a10e" className="font-semibold text-foreground mb-4">סוג הוצאה</h3>
              <div data-ev-id="ev_1834b59aae" className="flex flex-wrap gap-2">
                {Object.entries(EXPENSE_TYPE_LABELS).map(([value, label]) =>
              <div data-ev-id="ev_b0906ebb61" key={value} className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg">
                    <span data-ev-id="ev_6c6bdd30cf" className="text-foreground">{label}</span>
                    <span data-ev-id="ev_abcfbecf0d" className="text-xs text-muted-foreground">(ברירת מחדל)</span>
                  </div>
              )}
                {classificationOptions.filter((o) => o.option_type === 'expense_type').map((opt) =>
              <div data-ev-id="ev_e4084e6cdd" key={opt.id} className="flex items-center gap-2 bg-primary/10 px-3 py-2 rounded-lg">
                    <span data-ev-id="ev_4aa22e5d18" className="text-foreground">{opt.label}</span>
                    <button data-ev-id="ev_f2b8c6d5e7" onClick={() => handleDeleteOption(opt.id)} className="text-muted-foreground hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
              )}
              </div>
            </Card>

            {/* Payment method options */}
            <Card>
              <h3 data-ev-id="ev_fbd1055074" className="font-semibold text-foreground mb-4">אמצעי תשלום</h3>
              <div data-ev-id="ev_beca713ca1" className="flex flex-wrap gap-2">
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) =>
              <div data-ev-id="ev_78f703f5cd" key={value} className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg">
                    <span data-ev-id="ev_71849521f1" className="text-foreground">{label}</span>
                    <span data-ev-id="ev_02e07b5d24" className="text-xs text-muted-foreground">(ברירת מחדל)</span>
                  </div>
              )}
                {classificationOptions.filter((o) => o.option_type === 'payment_method').map((opt) =>
              <div data-ev-id="ev_706cc8ed94" key={opt.id} className="flex items-center gap-2 bg-primary/10 px-3 py-2 rounded-lg">
                    <span data-ev-id="ev_a586914028" className="text-foreground">{opt.label}</span>
                    <button data-ev-id="ev_3ae538b939" onClick={() => handleDeleteOption(opt.id)} className="text-muted-foreground hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
              )}
              </div>
            </Card>

            {/* Divider for income classifications */}
            <div data-ev-id="ev_787a0df9de" className="border-t border-border pt-4">
              <h3 data-ev-id="ev_8388d6f493" className="text-lg font-semibold text-foreground mb-4">סיווגים להכנסות</h3>
            </div>

            {/* Income source options */}
            <Card>
              <h3 data-ev-id="ev_79e018247f" className="font-semibold text-foreground mb-4">מקור הכנסה</h3>
              <div data-ev-id="ev_037d5f4fdc" className="flex flex-wrap gap-2">
                {Object.entries(INCOME_SOURCE_LABELS).map(([value, label]) =>
              <div data-ev-id="ev_1cb24aa9c7" key={value} className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg">
                    <span data-ev-id="ev_01f96b7588" className="text-foreground">{label}</span>
                    <span data-ev-id="ev_344fcf0c38" className="text-xs text-muted-foreground">(ברירת מחדל)</span>
                  </div>
              )}
                {classificationOptions.filter((o) => o.option_type === 'income_source').map((opt) =>
              <div data-ev-id="ev_8838ae06fe" key={opt.id} className="flex items-center gap-2 bg-primary/10 px-3 py-2 rounded-lg">
                    <span data-ev-id="ev_4da39637d9" className="text-foreground">{opt.label}</span>
                    <button data-ev-id="ev_f71bcf3ab2" onClick={() => handleDeleteOption(opt.id)} className="text-muted-foreground hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
              )}
              </div>
            </Card>

            {/* Income payment method options */}
            <Card>
              <h3 data-ev-id="ev_0aef15f0b3" className="font-semibold text-foreground mb-4">אמצעי תשלום (הכנסות)</h3>
              <div data-ev-id="ev_c42d6a596c" className="flex flex-wrap gap-2">
                {Object.entries(INCOME_PAYMENT_METHOD_LABELS).map(([value, label]) =>
              <div data-ev-id="ev_d0692700b6" key={value} className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg">
                    <span data-ev-id="ev_e0b41207a3" className="text-foreground">{label}</span>
                    <span data-ev-id="ev_004484393d" className="text-xs text-muted-foreground">(ברירת מחדל)</span>
                  </div>
              )}
                {classificationOptions.filter((o) => o.option_type === 'income_payment_method').map((opt) =>
              <div data-ev-id="ev_8a0404b07d" key={opt.id} className="flex items-center gap-2 bg-primary/10 px-3 py-2 rounded-lg">
                    <span data-ev-id="ev_55d825db4a" className="text-foreground">{opt.label}</span>
                    <button data-ev-id="ev_3aa9915914" onClick={() => handleDeleteOption(opt.id)} className="text-muted-foreground hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
              )}
              </div>
            </Card>
          </div>
        }

        {/* Credit cards tab */}
        {activeTab === 'cards' &&
        <div data-ev-id="ev_68cc8b75ea" className="flex flex-col gap-6">
            <Card>
              <h3 data-ev-id="ev_c2d3669966" className="font-semibold text-foreground mb-4">הוספת כרטיס</h3>
              <div data-ev-id="ev_cc48e59415" className="flex flex-col gap-3">
                <div data-ev-id="ev_1d63391ea1" className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                  placeholder="שם הכרטיס"
                  value={newCardName}
                  onChange={(e) => setNewCardName(e.target.value)} />

                  <Input
                  placeholder="4 ספרות אחרונות"
                  value={newCardDigits}
                  onChange={(e) => setNewCardDigits(e.target.value)}
                  maxLength={4} />

                  <Input
                  placeholder="חברה (ישראכרט, כאל...)"
                  value={newCardProvider}
                  onChange={(e) => setNewCardProvider(e.target.value)} />

                </div>
                <Button onClick={handleAddCard} disabled={loading} className="self-start">
                  <Plus className="w-4 h-4" />
                  הוסף כרטיס
                </Button>
              </div>
            </Card>

            <Card>
              <h3 data-ev-id="ev_29df6588aa" className="font-semibold text-foreground mb-4">כרטיסים</h3>
              {creditCards.length === 0 ?
            <p data-ev-id="ev_f41a6eacfb" className="text-muted-foreground">אין כרטיסים</p> :

            <div data-ev-id="ev_8bd4e56461" className="flex flex-col gap-2">
                  {creditCards.map((card) =>
              <div data-ev-id="ev_d74d1a036a"
              key={card.id}
              className="flex items-center justify-between bg-muted px-4 py-3 rounded-lg">

                      <div data-ev-id="ev_f6fecff566">
                        <p data-ev-id="ev_c651f08fcb" className="font-medium text-foreground">{card.name}</p>
                        <p data-ev-id="ev_b434f874de" className="text-sm text-muted-foreground">
                          {card.provider} {card.last_four_digits && `•••• ${card.last_four_digits}`}
                        </p>
                      </div>
                      <button data-ev-id="ev_56372994b3"
                onClick={() => handleDeleteCard(card.id)}
                className="text-muted-foreground hover:text-red-600">

                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
              )}
                </div>
            }
            </Card>
          </div>
        }

        {/* Defaults tab */}
        {activeTab === 'defaults' &&
        <div data-ev-id="ev_ba2f70df64" className="flex flex-col gap-6">
        <Card>
            <h3 data-ev-id="ev_8b947cf9d8" className="font-semibold text-foreground mb-4">
              ברירות מחדל להוצאות חדשות
            </h3>
            <p data-ev-id="ev_3fa13c7ed4" className="text-muted-foreground mb-6">
              כשמופיעה הוצאה לא מוכרת, הגדרות אלו יופיעו אוטומטית
            </p>

            <div data-ev-id="ev_1415b99817" className="flex flex-col gap-4">
              <Select
                label="קטגוריה"
                value={defaultCategoryId}
                onChange={(e) => setDefaultCategoryId(e.target.value)}
                options={[
                { value: '', label: 'ללא קטגוריה' },
                ...expenseCategories.map((c) => ({ value: c.id, label: c.name }))]
                } />


              <Select
                label="תדירות"
                value={defaultFrequency}
                onChange={(e) => setDefaultFrequency(e.target.value as Frequency)}
                options={Object.entries(FREQUENCY_LABELS).map(([value, label]) => ({
                  value,
                  label
                }))} />


              <Select
                label="סוג סכום"
                value={defaultAmountType}
                onChange={(e) => setDefaultAmountType(e.target.value as AmountType)}
                options={Object.entries(AMOUNT_TYPE_LABELS).map(([value, label]) => ({
                  value,
                  label
                }))} />


              <Select
                label="סוג הוצאה"
                value={defaultExpenseType}
                onChange={(e) => setDefaultExpenseType(e.target.value as ExpenseType)}
                options={Object.entries(EXPENSE_TYPE_LABELS).map(([value, label]) => ({
                  value,
                  label
                }))} />


              <Select
                label="אמצעי תשלום"
                value={defaultPaymentMethod}
                onChange={(e) => setDefaultPaymentMethod(e.target.value as PaymentMethod)}
                options={Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({
                  value,
                  label
                }))} />


              <Button onClick={handleSaveDefaults} disabled={loading} className="self-start mt-2">
                שמור ברירות מחדל
              </Button>
            </div>
          </Card>

          {/* Income defaults */}
          <Card>
            <h3 data-ev-id="ev_ccc0662d8d" className="font-semibold text-foreground mb-4">
              ברירות מחדל להכנסות חדשות
            </h3>
            <p data-ev-id="ev_59542e4b03" className="text-muted-foreground mb-6">
              כשמופיעה הכנסה לא מוכרת, הגדרות אלו יופיעו אוטומטית
            </p>

            <div data-ev-id="ev_ef9c0d20e6" className="flex flex-col gap-4">
              <Select
                label="מקור"
                value={defaultIncomeSource}
                onChange={(e) => setDefaultIncomeSource(e.target.value as IncomeSource)}
                options={Object.entries(INCOME_SOURCE_LABELS).map(([value, label]) => ({
                  value,
                  label
                }))} />


              <Select
                label="תדירות"
                value={defaultIncomeFrequency}
                onChange={(e) => setDefaultIncomeFrequency(e.target.value as Frequency)}
                options={Object.entries(FREQUENCY_LABELS).map(([value, label]) => ({
                  value,
                  label
                }))} />


              <Select
                label="סוג סכום"
                value={defaultIncomeAmountType}
                onChange={(e) => setDefaultIncomeAmountType(e.target.value as AmountType)}
                options={Object.entries(AMOUNT_TYPE_LABELS).map(([value, label]) => ({
                  value,
                  label
                }))} />


              <Select
                label="אמצעי תשלום"
                value={defaultIncomePaymentMethod}
                onChange={(e) => setDefaultIncomePaymentMethod(e.target.value as IncomePaymentMethod)}
                options={Object.entries(INCOME_PAYMENT_METHOD_LABELS).map(([value, label]) => ({
                  value,
                  label
                }))} />


              <Button onClick={handleSaveIncomeDefaults} disabled={loading} className="self-start mt-2">
                שמור ברירות מחדל להכנסות
              </Button>
            </div>
          </Card>

          {/* Display settings */}
          <Card>
            <h3 data-ev-id="ev_62b3887880" className="font-semibold text-foreground mb-4">
              הגדרות תצוגה
            </h3>
            <p data-ev-id="ev_900442a79d" className="text-muted-foreground mb-6">
              בחר אילו שדות יוצגו בטבלאות ההוצאות וההכנסות. כל שדה ניתן למיון בלחיצה על הכותרת.
            </p>

            <div data-ev-id="ev_e568ffa696" className="flex flex-col gap-6">
              {/* Expense columns */}
              <div data-ev-id="ev_f21662b384">
                <h4 data-ev-id="ev_4c608eef96" className="font-medium text-foreground mb-3">שדות הוצאות</h4>
                <div data-ev-id="ev_8c44bcd238" className="flex flex-wrap gap-2">
                  {EXPENSE_COLUMN_OPTIONS.map((option) => {
                    const isSelected = expenseColumns.includes(option.key);
                    const isRequired = 'required' in option ? (option as { required?: boolean }).required : false;
                    return (
                      <button data-ev-id="ev_874fbec044"
                      key={option.key}
                      onClick={() => toggleExpenseColumn(option.key)}
                      disabled={isRequired}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      isSelected ?
                      'bg-primary text-primary-foreground border-primary' :
                      'bg-background text-muted-foreground border-border hover:border-primary'} ${
                      isRequired ? 'opacity-75 cursor-not-allowed' : ''}`}>

                        {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                        {option.label}
                        {isRequired && ' (חובה)'}
                      </button>);

                  })}
                </div>
              </div>

              {/* Income columns */}
              <div data-ev-id="ev_b9b08f0f7e">
                <h4 data-ev-id="ev_1ab439936b" className="font-medium text-foreground mb-3">שדות הכנסות</h4>
                <div data-ev-id="ev_5a75868e2b" className="flex flex-wrap gap-2">
                  {INCOME_COLUMN_OPTIONS.map((option) => {
                    const isSelected = incomeColumns.includes(option.key);
                    const isRequired = 'required' in option ? (option as { required?: boolean }).required : false;
                    return (
                      <button data-ev-id="ev_035ecd9e86"
                      key={option.key}
                      onClick={() => toggleIncomeColumn(option.key)}
                      disabled={isRequired}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      isSelected ?
                      'bg-primary text-primary-foreground border-primary' :
                      'bg-background text-muted-foreground border-border hover:border-primary'} ${
                      isRequired ? 'opacity-75 cursor-not-allowed' : ''}`}>

                        {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                        {option.label}
                        {isRequired && ' (חובה)'}
                      </button>);

                  })}
                </div>
              </div>

              <Button onClick={handleSaveDisplaySettings} disabled={loading} className="self-start mt-2">
                שמור הגדרות תצוגה
              </Button>
            </div>
          </Card>
        </div>
        }

        {/* Import rules tab */}
        {activeTab === 'import' &&
        <Card>
            <h3 data-ev-id="ev_dc883df7f7" className="font-semibold text-foreground mb-4">ייבוא כללי סיווג</h3>
            <p data-ev-id="ev_2ef10de82b" className="text-muted-foreground mb-6">
              טען קובץ אקסל עם שמות של הוצאות והסיווג שלהם. הקובץ צריך לכלול לפחות:
            </p>
            <ul data-ev-id="ev_f912dd835f" className="list-disc list-inside text-muted-foreground mb-6 mr-4">
              <li data-ev-id="ev_9d886ce142">שם הוצאה (חובה)</li>
              <li data-ev-id="ev_3df1500350">קטגוריה (אופציונלי)</li>
              <li data-ev-id="ev_62ffdcadad">תדירות (אופציונלי)</li>
              <li data-ev-id="ev_95f8bd88dc">סוג סכום (אופציונלי)</li>
              <li data-ev-id="ev_91f0671060">סוג הוצאה (אופציונלי)</li>
              <li data-ev-id="ev_d27643a282">אמצעי תשלום (אופציונלי)</li>
            </ul>

            <input data-ev-id="ev_b2c58fe52d"
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleImportRules}
          className="hidden"
          id="rules-file" />

            <label data-ev-id="ev_af963c9868" htmlFor="rules-file" className={`inline-flex items-center justify-center font-medium rounded-lg transition-colors px-4 py-2 text-base gap-2 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <Upload className="w-4 h-4" />
                בחר קובץ
            </label>
          </Card>
        }

        {/* Household tab */}
        {activeTab === 'household' && household &&
        <div data-ev-id="ev_d38d48ccf8" className="flex flex-col gap-6">
            <Card>
              <h3 data-ev-id="ev_00bb6b49cb" className="font-semibold text-foreground mb-4">פרטי הבית</h3>
              <div data-ev-id="ev_7f9336a409" className="flex flex-col gap-4">
                <div data-ev-id="ev_c1cec4eaab">
                  <p data-ev-id="ev_b83c26dcb4" className="text-sm text-muted-foreground">שם הבית</p>
                  <p data-ev-id="ev_840c978b9d" className="font-medium text-foreground">{household.name}</p>
                </div>
                <div data-ev-id="ev_ed7d6abcc5">
                  <p data-ev-id="ev_22718a44b0" className="text-sm text-muted-foreground mb-2">קוד הזמנה</p>
                  <div data-ev-id="ev_4b0282e65e" className="flex items-center gap-2">
                    <code data-ev-id="ev_2f3cb8889c" className="bg-muted px-3 py-2 rounded-lg font-mono text-lg">
                      {household.invite_code}
                    </code>
                    <Button variant="outline" size="sm" onClick={handleCopyInviteCode}>
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p data-ev-id="ev_8d7b8ea74d" className="text-sm text-muted-foreground mt-2">
                    שתף את הקוד עם בני משפחה כדי שיוכלו להצטרף
                  </p>
                </div>
              </div>
            </Card>
          </div>
        }
      </div>
    </Layout>);

}