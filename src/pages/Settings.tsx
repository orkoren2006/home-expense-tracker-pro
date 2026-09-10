import { useState, useEffect } from 'react';
import { Plus, Trash2, Copy, Users, CreditCard, Tag, Sliders, Upload, Check, List } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useHousehold } from '@/hooks/useHousehold';
import { supabase } from '@/integrations/supabase/client';
import { parseRulesExcel, parseIncomeRulesExcel, autoDetectRuleMapping, autoDetectIncomeRuleMapping } from '@/utils/excelParsers';
import * as XLSX from 'xlsx';
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
  const [defaultCreditCardId, setDefaultCreditCardId] = useState(
    defaultSettings?.credit_card_id || ''
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

  // Import rules preview state
  type ImportRulesType = 'expense' | 'income';
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [importRulesType, setImportRulesType] = useState<ImportRulesType>('expense');
  const [importColumns, setImportColumns] = useState<string[]>([]);
  const [importMapping, setImportMapping] = useState<Record<string, string>>({});
  const [importExpenseRules, setImportExpenseRules] = useState<Array<{
    expense_name: string;
    category_name?: string;
    frequency?: string;
    amount_type?: string;
    expense_type?: string;
    payment_method?: string;
    credit_card?: string;
    notes?: string;
  }>>([]);
  const [importIncomeRules, setImportIncomeRules] = useState<Array<{
    income_name: string;
    frequency?: string;
    amount_type?: string;
    payment_method?: string;
    source?: string;
    notes?: string;
  }>>([]);
  const [importRawData, setImportRawData] = useState<Record<string, unknown>[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);

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
      setDefaultCreditCardId(defaultSettings.credit_card_id || '');
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
        payment_method: defaultPaymentMethod,
        credit_card_id: defaultCreditCardId || null
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

  // Step 1: Load file and show preview
  const handleImportRulesFile = async (e: React.ChangeEvent<HTMLInputElement>, type: ImportRulesType) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset file input
    e.target.value = '';

    setLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);

      if (rawData.length === 0) {
        alert('הקובץ ריק');
        setLoading(false);
        return;
      }

      const columns = Object.keys(rawData[0] || {});
      setImportColumns(columns);
      setImportRawData(rawData);
      setImportFile(file);
      setImportRulesType(type);

      if (type === 'expense') {
        const mapping = autoDetectRuleMapping(columns);
        setImportMapping(mapping);
        // Parse rules with current mapping
        const rules = rawData.map((row) => {
          const name = mapping.expense_name ? row[mapping.expense_name] : null;
          if (!name) return null;
          return {
            expense_name: String(name).trim(),
            category_name: mapping.category_name && row[mapping.category_name] ? String(row[mapping.category_name]).trim() : undefined,
            frequency: mapping.frequency && row[mapping.frequency] ? String(row[mapping.frequency]).trim() : undefined,
            amount_type: mapping.amount_type && row[mapping.amount_type] ? String(row[mapping.amount_type]).trim() : undefined,
            expense_type: mapping.expense_type && row[mapping.expense_type] ? String(row[mapping.expense_type]).trim() : undefined,
            payment_method: mapping.payment_method && row[mapping.payment_method] ? String(row[mapping.payment_method]).trim() : undefined,
            credit_card: mapping.credit_card && row[mapping.credit_card] ? String(row[mapping.credit_card]).trim() : undefined,
            notes: mapping.notes && row[mapping.notes] ? String(row[mapping.notes]).trim() : undefined
          };
        }).filter(Boolean) as typeof importExpenseRules;
        setImportExpenseRules(rules);
      } else {
        const mapping = autoDetectIncomeRuleMapping(columns);
        setImportMapping(mapping);
        // Parse rules with current mapping
        const rules = rawData.map((row) => {
          const name = mapping.income_name ? row[mapping.income_name] : null;
          if (!name) return null;
          return {
            income_name: String(name).trim(),
            frequency: mapping.frequency && row[mapping.frequency] ? String(row[mapping.frequency]).trim() : undefined,
            amount_type: mapping.amount_type && row[mapping.amount_type] ? String(row[mapping.amount_type]).trim() : undefined,
            payment_method: mapping.payment_method && row[mapping.payment_method] ? String(row[mapping.payment_method]).trim() : undefined,
            source: mapping.source && row[mapping.source] ? String(row[mapping.source]).trim() : undefined,
            notes: mapping.notes && row[mapping.notes] ? String(row[mapping.notes]).trim() : undefined
          };
        }).filter(Boolean) as typeof importIncomeRules;
        setImportIncomeRules(rules);
      }

      setImportPreviewOpen(true);
    } catch (err) {
      console.error('Import error:', err);
      alert('שגיאה בקריאת הקובץ');
    }
    setLoading(false);
  };

  // Re-parse when mapping changes
  const handleMappingChange = (field: string, value: string) => {
    const newMapping = { ...importMapping, [field]: value };
    setImportMapping(newMapping);

    if (importRulesType === 'expense') {
      const rules = importRawData.map((row) => {
        const name = newMapping.expense_name ? row[newMapping.expense_name] : null;
        if (!name) return null;
        return {
          expense_name: String(name).trim(),
          category_name: newMapping.category_name && row[newMapping.category_name] ? String(row[newMapping.category_name]).trim() : undefined,
          frequency: newMapping.frequency && row[newMapping.frequency] ? String(row[newMapping.frequency]).trim() : undefined,
          amount_type: newMapping.amount_type && row[newMapping.amount_type] ? String(row[newMapping.amount_type]).trim() : undefined,
          expense_type: newMapping.expense_type && row[newMapping.expense_type] ? String(row[newMapping.expense_type]).trim() : undefined,
          payment_method: newMapping.payment_method && row[newMapping.payment_method] ? String(row[newMapping.payment_method]).trim() : undefined,
          credit_card: newMapping.credit_card && row[newMapping.credit_card] ? String(row[newMapping.credit_card]).trim() : undefined,
          notes: newMapping.notes && row[newMapping.notes] ? String(row[newMapping.notes]).trim() : undefined
        };
      }).filter(Boolean) as typeof importExpenseRules;
      setImportExpenseRules(rules);
    } else {
      const rules = importRawData.map((row) => {
        const name = newMapping.income_name ? row[newMapping.income_name] : null;
        if (!name) return null;
        return {
          income_name: String(name).trim(),
          frequency: newMapping.frequency && row[newMapping.frequency] ? String(row[newMapping.frequency]).trim() : undefined,
          amount_type: newMapping.amount_type && row[newMapping.amount_type] ? String(row[newMapping.amount_type]).trim() : undefined,
          payment_method: newMapping.payment_method && row[newMapping.payment_method] ? String(row[newMapping.payment_method]).trim() : undefined,
          source: newMapping.source && row[newMapping.source] ? String(row[newMapping.source]).trim() : undefined,
          notes: newMapping.notes && row[newMapping.notes] ? String(row[newMapping.notes]).trim() : undefined
        };
      }).filter(Boolean) as typeof importIncomeRules;
      setImportIncomeRules(rules);
    }
  };

  // Step 2: Confirm and execute import
  const handleConfirmImport = async () => {
    if (!supabase || !household) return;

    setLoading(true);
    try {
      if (importRulesType === 'expense') {
        await executeExpenseRulesImport();
      } else {
        await executeIncomeRulesImport();
      }
    } catch (err) {
      console.error('Import error:', err);
      alert('שגיאה בייבוא הכללים');
    }
    setLoading(false);
    setImportPreviewOpen(false);
  };

  const executeExpenseRulesImport = async () => {
    if (!supabase || !household) return;
    const rules = importExpenseRules;

    // Check which rules already exist
    const { data: existingRules } = await supabase.
    from('expense_rules').
    select('expense_name').
    eq('household_id', household.id);
    const existingNames = new Set((existingRules || []).map((r) => r.expense_name.toLowerCase()));

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
      if (rule.category_name && !categoryMap.has(rule.category_name.toLowerCase())) {
        newCategories.add(rule.category_name);
      }
      if (rule.frequency && !frequencyReverseMap.has(rule.frequency.toLowerCase())) {
        newClassifications.push({ type: 'frequency', label: rule.frequency });
        frequencyReverseMap.set(rule.frequency.toLowerCase(), rule.frequency.toLowerCase().replace(/\s+/g, '_'));
      }
      if (rule.amount_type && !amountTypeReverseMap.has(rule.amount_type.toLowerCase())) {
        newClassifications.push({ type: 'amount_type', label: rule.amount_type });
        amountTypeReverseMap.set(rule.amount_type.toLowerCase(), rule.amount_type.toLowerCase().replace(/\s+/g, '_'));
      }
      if (rule.expense_type && !expenseTypeReverseMap.has(rule.expense_type.toLowerCase())) {
        newClassifications.push({ type: 'expense_type', label: rule.expense_type });
        expenseTypeReverseMap.set(rule.expense_type.toLowerCase(), rule.expense_type.toLowerCase().replace(/\s+/g, '_'));
      }
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

      if (!catError && createdCats) {
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

      await supabase.from('classification_options').insert(classToInsert);
    }

    // Helper to resolve value from Hebrew label or English value
    const resolveValue = (input: string | undefined, reverseMap: Map<string, string>, defaultVal: string): string => {
      if (!input) return defaultVal;
      const lower = input.toLowerCase();
      if (reverseMap.has(lower)) return reverseMap.get(lower)!;
      const allValues = new Set(reverseMap.values());
      if (allValues.has(lower)) return lower;
      if (allValues.has(input)) return input;
      return defaultVal;
    };

    const toInsert = rules.map((rule) => ({
      household_id: household.id,
      expense_name: rule.expense_name,
      category_id: rule.category_name ? categoryMap.get(rule.category_name.toLowerCase()) || null : null,
      frequency: resolveValue(rule.frequency, frequencyReverseMap, 'one_time'),
      amount_type: resolveValue(rule.amount_type, amountTypeReverseMap, 'variable'),
      expense_type: resolveValue(rule.expense_type, expenseTypeReverseMap, 'optional'),
      payment_method: resolveValue(rule.payment_method, paymentMethodReverseMap, 'credit')
    }));

    const { error: upsertError } = await supabase.from('expense_rules').upsert(toInsert, {
      onConflict: 'household_id,expense_name'
    });

    if (upsertError) {
      alert(`שגיאה בהכנסת הכללים: ${upsertError.message}`);
      return;
    }

    await refreshData();

    // Count created vs updated
    const newCount = rules.filter((r) => !existingNames.has(r.expense_name.toLowerCase())).length;
    const updatedCount = rules.length - newCount;

    const msgs: string[] = [];
    if (newCount > 0) msgs.push(`${newCount} נוצרו`);
    if (updatedCount > 0) msgs.push(`${updatedCount} עודכנו`);
    if (newCategories.size > 0) msgs.push(`${newCategories.size} קטגוריות חדשות`);
    if (newClassifications.length > 0) msgs.push(`${newClassifications.length} סיווגים חדשים`);

    alert(`יובאו ${rules.length} כללי הוצאות (${msgs.join(', ')})`);
  };

  const executeIncomeRulesImport = async () => {
    if (!supabase || !household) return;
    const rules = importIncomeRules;

    // Check which rules already exist
    const { data: existingRules } = await supabase.
    from('income_rules').
    select('income_name').
    eq('household_id', household.id);
    const existingNames = new Set((existingRules || []).map((r) => r.income_name.toLowerCase()));

    // Build reverse label maps (Hebrew -> English value)
    const frequencyReverseMap = new Map(
      Object.entries(FREQUENCY_LABELS).map(([k, v]) => [v.toLowerCase(), k])
    );
    const amountTypeReverseMap = new Map(
      Object.entries(AMOUNT_TYPE_LABELS).map(([k, v]) => [v.toLowerCase(), k])
    );
    const paymentMethodReverseMap = new Map(
      Object.entries(INCOME_PAYMENT_METHOD_LABELS).map(([k, v]) => [v.toLowerCase(), k])
    );
    const sourceReverseMap = new Map(
      Object.entries(INCOME_SOURCE_LABELS).map(([k, v]) => [v.toLowerCase(), k])
    );

    // Add custom classification options to reverse maps
    for (const opt of classificationOptions) {
      if (opt.option_type === 'frequency') frequencyReverseMap.set(opt.label.toLowerCase(), opt.value);else
      if (opt.option_type === 'amount_type') amountTypeReverseMap.set(opt.label.toLowerCase(), opt.value);else
      if (opt.option_type === 'income_payment_method') paymentMethodReverseMap.set(opt.label.toLowerCase(), opt.value);else
      if (opt.option_type === 'income_source') sourceReverseMap.set(opt.label.toLowerCase(), opt.value);
    }

    // Collect new classifications that need to be created
    const newClassifications: Array<{type: string;label: string;}> = [];

    for (const rule of rules) {
      if (rule.frequency && !frequencyReverseMap.has(rule.frequency.toLowerCase())) {
        newClassifications.push({ type: 'frequency', label: rule.frequency });
        frequencyReverseMap.set(rule.frequency.toLowerCase(), rule.frequency.toLowerCase().replace(/\s+/g, '_'));
      }
      if (rule.amount_type && !amountTypeReverseMap.has(rule.amount_type.toLowerCase())) {
        newClassifications.push({ type: 'amount_type', label: rule.amount_type });
        amountTypeReverseMap.set(rule.amount_type.toLowerCase(), rule.amount_type.toLowerCase().replace(/\s+/g, '_'));
      }
      if (rule.payment_method && !paymentMethodReverseMap.has(rule.payment_method.toLowerCase())) {
        newClassifications.push({ type: 'income_payment_method', label: rule.payment_method });
        paymentMethodReverseMap.set(rule.payment_method.toLowerCase(), rule.payment_method.toLowerCase().replace(/\s+/g, '_'));
      }
      if (rule.source && !sourceReverseMap.has(rule.source.toLowerCase())) {
        newClassifications.push({ type: 'income_source', label: rule.source });
        sourceReverseMap.set(rule.source.toLowerCase(), rule.source.toLowerCase().replace(/\s+/g, '_'));
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

      await supabase.from('classification_options').insert(classToInsert);
    }

    // Helper to resolve value from Hebrew label or English value
    const resolveValue = (input: string | undefined, reverseMap: Map<string, string>, defaultVal: string): string => {
      if (!input) return defaultVal;
      const lower = input.toLowerCase();
      if (reverseMap.has(lower)) return reverseMap.get(lower)!;
      const allValues = new Set(reverseMap.values());
      if (allValues.has(lower)) return lower;
      if (allValues.has(input)) return input;
      return defaultVal;
    };

    const toInsert = rules.map((rule) => ({
      household_id: household.id,
      income_name: rule.income_name,
      frequency: resolveValue(rule.frequency, frequencyReverseMap, 'monthly'),
      amount_type: resolveValue(rule.amount_type, amountTypeReverseMap, 'fixed'),
      payment_method: resolveValue(rule.payment_method, paymentMethodReverseMap, 'salary'),
      source: resolveValue(rule.source, sourceReverseMap, 'work')
    }));

    const { error: upsertError } = await supabase.from('income_rules').upsert(toInsert, {
      onConflict: 'household_id,income_name'
    });

    if (upsertError) {
      alert(`שגיאה בהכנסת הכללים: ${upsertError.message}`);
      return;
    }

    await refreshData();

    // Count created vs updated
    const newCount = rules.filter((r) => !existingNames.has(r.income_name.toLowerCase())).length;
    const updatedCount = rules.length - newCount;

    const msgs: string[] = [];
    if (newCount > 0) msgs.push(`${newCount} נוצרו`);
    if (updatedCount > 0) msgs.push(`${updatedCount} עודכנו`);
    if (newClassifications.length > 0) msgs.push(`${newClassifications.length} סיווגים חדשים`);

    alert(`יובאו ${rules.length} כללי הכנסות (${msgs.join(', ')})`);
  };

  const cancelImportPreview = () => {
    setImportPreviewOpen(false);
    setImportExpenseRules([]);
    setImportIncomeRules([]);
    setImportColumns([]);
    setImportMapping({});
    setImportRawData([]);
    setImportFile(null);
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

              <Select
                label="כרטיס אשראי"
                value={defaultCreditCardId}
                onChange={(e) => setDefaultCreditCardId(e.target.value)}
                options={[
                { value: '', label: 'לא נבחר' },
                ...creditCards.map((c) => ({ value: c.id, label: `${c.name}${c.last_four_digits ? ` (${c.last_four_digits})` : ''}` }))]
                } />

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
                    const isRequired = 'required' in option ? (option as {required?: boolean;}).required : false;
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
                    const isRequired = 'required' in option ? (option as {required?: boolean;}).required : false;
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
        <div data-ev-id="ev_dadaef6db2" className="flex flex-col gap-6">
          {/* Expense rules import */}
          <Card>
            <h3 data-ev-id="ev_707ba210af" className="font-semibold text-foreground mb-4">ייבוא כללי הוצאות</h3>
            <p data-ev-id="ev_c425ae97cd" className="text-muted-foreground mb-4">
              טען קובץ אקסל עם שמות של הוצאות והסיווג שלהם. שדות אפשריים:
            </p>
            <ul data-ev-id="ev_e1882ac654" className="list-disc list-inside text-muted-foreground mb-4 mr-4 text-sm">
              <li data-ev-id="ev_d3b579d644">שם הוצאה (חובה), קטגוריה, תדירות, סוג סכום, סוג הוצאה, אמצעי תשלום, כרטיס, הערות</li>
            </ul>

            <input data-ev-id="ev_ccc5b88e23"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => handleImportRulesFile(e, 'expense')}
            className="hidden"
            id="expense-rules-file" />

            <label data-ev-id="ev_a3fc729277" htmlFor="expense-rules-file" className={`inline-flex items-center justify-center font-medium rounded-lg transition-colors px-4 py-2 text-base gap-2 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <Upload className="w-4 h-4" />
              ייבא כללי הוצאות
            </label>
          </Card>

          {/* Income rules import */}
          <Card>
            <h3 data-ev-id="ev_bd86077adb" className="font-semibold text-foreground mb-4">ייבוא כללי הכנסות</h3>
            <p data-ev-id="ev_dae7534b8a" className="text-muted-foreground mb-4">
              טען קובץ אקסל עם שמות של הכנסות והסיווג שלהם. שדות אפשריים:
            </p>
            <ul data-ev-id="ev_e04478766d" className="list-disc list-inside text-muted-foreground mb-4 mr-4 text-sm">
              <li data-ev-id="ev_6a99c47776">שם הכנסה (חובה), תדירות, סוג סכום, אמצעי תשלום, מקור, הערות</li>
            </ul>

            <input data-ev-id="ev_08af8435b6"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => handleImportRulesFile(e, 'income')}
            className="hidden"
            id="income-rules-file" />

            <label data-ev-id="ev_99f88ce73b" htmlFor="income-rules-file" className={`inline-flex items-center justify-center font-medium rounded-lg transition-colors px-4 py-2 text-base gap-2 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <Upload className="w-4 h-4" />
              ייבא כללי הכנסות
            </label>
          </Card>
        </div>
        }

        {/* Import Preview Modal */}
        {importPreviewOpen &&
        <div data-ev-id="ev_172d6c96ab" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={cancelImportPreview}>
          <div data-ev-id="ev_c597cdb88f" className="bg-background rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div data-ev-id="ev_7b97835e53" className="p-6">
              <h3 data-ev-id="ev_2a69b07685" className="text-lg font-semibold text-foreground mb-4">
                תצוגה מקדימה - כללי {importRulesType === 'expense' ? 'הוצאות' : 'הכנסות'}
              </h3>
              
              {/* Column mapping */}
              <div data-ev-id="ev_3914615dd4" className="mb-6">
                <h4 data-ev-id="ev_a2a494ca3e" className="font-medium text-foreground mb-3">מיפוי עמודות</h4>
                <div data-ev-id="ev_ed53c0826b" className="grid grid-cols-2 gap-3">
                  {importRulesType === 'expense' ?
                  <>
                      <Select
                      label="שם הוצאה (חובה)"
                      value={importMapping.expense_name || ''}
                      onChange={(e) => handleMappingChange('expense_name', e.target.value)}
                      options={[{ value: '', label: 'בחר עמודה...' }, ...importColumns.map((c) => ({ value: c, label: c }))]} />

                      <Select
                      label="קטגוריה"
                      value={importMapping.category_name || ''}
                      onChange={(e) => handleMappingChange('category_name', e.target.value)}
                      options={[{ value: '', label: 'ללא מיפוי' }, ...importColumns.map((c) => ({ value: c, label: c }))]} />

                      <Select
                      label="תדירות"
                      value={importMapping.frequency || ''}
                      onChange={(e) => handleMappingChange('frequency', e.target.value)}
                      options={[{ value: '', label: 'ללא מיפוי' }, ...importColumns.map((c) => ({ value: c, label: c }))]} />

                      <Select
                      label="סוג סכום"
                      value={importMapping.amount_type || ''}
                      onChange={(e) => handleMappingChange('amount_type', e.target.value)}
                      options={[{ value: '', label: 'ללא מיפוי' }, ...importColumns.map((c) => ({ value: c, label: c }))]} />

                      <Select
                      label="סוג הוצאה"
                      value={importMapping.expense_type || ''}
                      onChange={(e) => handleMappingChange('expense_type', e.target.value)}
                      options={[{ value: '', label: 'ללא מיפוי' }, ...importColumns.map((c) => ({ value: c, label: c }))]} />

                      <Select
                      label="אמצעי תשלום"
                      value={importMapping.payment_method || ''}
                      onChange={(e) => handleMappingChange('payment_method', e.target.value)}
                      options={[{ value: '', label: 'ללא מיפוי' }, ...importColumns.map((c) => ({ value: c, label: c }))]} />

                      <Select
                      label="כרטיס אשראי"
                      value={importMapping.credit_card || ''}
                      onChange={(e) => handleMappingChange('credit_card', e.target.value)}
                      options={[{ value: '', label: 'ללא מיפוי' }, ...importColumns.map((c) => ({ value: c, label: c }))]} />

                      <Select
                      label="הערות"
                      value={importMapping.notes || ''}
                      onChange={(e) => handleMappingChange('notes', e.target.value)}
                      options={[{ value: '', label: 'ללא מיפוי' }, ...importColumns.map((c) => ({ value: c, label: c }))]} />

                    </> :

                  <>
                      <Select
                      label="שם הכנסה (חובה)"
                      value={importMapping.income_name || ''}
                      onChange={(e) => handleMappingChange('income_name', e.target.value)}
                      options={[{ value: '', label: 'בחר עמודה...' }, ...importColumns.map((c) => ({ value: c, label: c }))]} />

                      <Select
                      label="תדירות"
                      value={importMapping.frequency || ''}
                      onChange={(e) => handleMappingChange('frequency', e.target.value)}
                      options={[{ value: '', label: 'ללא מיפוי' }, ...importColumns.map((c) => ({ value: c, label: c }))]} />

                      <Select
                      label="סוג סכום"
                      value={importMapping.amount_type || ''}
                      onChange={(e) => handleMappingChange('amount_type', e.target.value)}
                      options={[{ value: '', label: 'ללא מיפוי' }, ...importColumns.map((c) => ({ value: c, label: c }))]} />

                      <Select
                      label="אמצעי תשלום"
                      value={importMapping.payment_method || ''}
                      onChange={(e) => handleMappingChange('payment_method', e.target.value)}
                      options={[{ value: '', label: 'ללא מיפוי' }, ...importColumns.map((c) => ({ value: c, label: c }))]} />

                      <Select
                      label="מקור"
                      value={importMapping.source || ''}
                      onChange={(e) => handleMappingChange('source', e.target.value)}
                      options={[{ value: '', label: 'ללא מיפוי' }, ...importColumns.map((c) => ({ value: c, label: c }))]} />

                      <Select
                      label="הערות"
                      value={importMapping.notes || ''}
                      onChange={(e) => handleMappingChange('notes', e.target.value)}
                      options={[{ value: '', label: 'ללא מיפוי' }, ...importColumns.map((c) => ({ value: c, label: c }))]} />

                    </>
                  }
                </div>
              </div>

              {/* Preview count */}
              <div data-ev-id="ev_b2d9d59c45" className="mb-4 p-3 bg-muted rounded-lg">
                <p data-ev-id="ev_c421bea8d6" className="text-foreground font-medium">
                  נמצאו {importRulesType === 'expense' ? importExpenseRules.length : importIncomeRules.length} כללים לייבוא
                </p>
                <p data-ev-id="ev_c27f92f82f" className="text-sm text-muted-foreground">
                  כללים קיימים עם אותו שם יעודכנו, כללים חדשים ייווספו
                </p>
              </div>

              {/* Preview table */}
              <div data-ev-id="ev_5da7181d1d" className="mb-6 overflow-x-auto">
                <h4 data-ev-id="ev_8dadd4f950" className="font-medium text-foreground mb-2">תצוגה מקדימה (5 ראשונים)</h4>
                <table data-ev-id="ev_58037f898b" className="w-full text-sm border border-border rounded-lg">
                  <thead data-ev-id="ev_0e0f71801e" className="bg-muted">
                    <tr data-ev-id="ev_cb264e0185">
                      <th data-ev-id="ev_b8f548e869" className="px-3 py-2 text-right border-b border-border">שם</th>
                      {importRulesType === 'expense' && <th data-ev-id="ev_2d1db3db2e" className="px-3 py-2 text-right border-b border-border">קטגוריה</th>}
                      <th data-ev-id="ev_b16eaae68e" className="px-3 py-2 text-right border-b border-border">תדירות</th>
                      {importRulesType === 'income' && <th data-ev-id="ev_c8e864b425" className="px-3 py-2 text-right border-b border-border">מקור</th>}
                    </tr>
                  </thead>
                  <tbody data-ev-id="ev_29315309a3">
                    {importRulesType === 'expense' ?
                    importExpenseRules.slice(0, 5).map((rule, i) =>
                    <tr data-ev-id="ev_7cfe6d8baf" key={i} className="border-b border-border last:border-b-0">
                          <td data-ev-id="ev_4c8fb329fb" className="px-3 py-2">{rule.expense_name}</td>
                          <td data-ev-id="ev_96fefc751c" className="px-3 py-2">{rule.category_name || '-'}</td>
                          <td data-ev-id="ev_7886c013d5" className="px-3 py-2">{rule.frequency || '-'}</td>
                        </tr>
                    ) :

                    importIncomeRules.slice(0, 5).map((rule, i) =>
                    <tr data-ev-id="ev_96f18db121" key={i} className="border-b border-border last:border-b-0">
                          <td data-ev-id="ev_478bc9c867" className="px-3 py-2">{rule.income_name}</td>
                          <td data-ev-id="ev_717e75eaa6" className="px-3 py-2">{rule.frequency || '-'}</td>
                          <td data-ev-id="ev_fa210be461" className="px-3 py-2">{rule.source || '-'}</td>
                        </tr>
                    )
                    }
                  </tbody>
                </table>
              </div>

              {/* Action buttons */}
              <div data-ev-id="ev_b969041326" className="flex gap-3 justify-end">
                <Button variant="outline" onClick={cancelImportPreview}>
                  ביטול
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  disabled={loading || (importRulesType === 'expense' ? importExpenseRules.length === 0 : importIncomeRules.length === 0)}>

                  {loading ? 'מייבא...' : `ייבא ${importRulesType === 'expense' ? importExpenseRules.length : importIncomeRules.length} כללים`}
                </Button>
              </div>
            </div>
          </div>
        </div>
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