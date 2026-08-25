import { useEffect, useState, useMemo } from 'react';
import { Search, Filter, Edit2, Trash2, Download, CheckSquare, Square, X, ArrowUpDown, ArrowUp, ArrowDown, Plus } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useHousehold } from '@/hooks/useHousehold';
import { supabase } from '@/integrations/supabase/client';
import type { Expense, Frequency, AmountType, ExpenseType, PaymentMethod } from '@/types';
import {
  FREQUENCY_LABELS,
  AMOUNT_TYPE_LABELS,
  EXPENSE_TYPE_LABELS,
  PAYMENT_METHOD_LABELS } from
'@/types';

export default function Expenses() {
  const { household, categories, creditCards, classificationOptions, expenseRules, refreshData } = useHousehold();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Filters
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterFrequency, setFilterFrequency] = useState('');
  const [filterAmountType, setFilterAmountType] = useState('');
  const [filterExpenseType, setFilterExpenseType] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterCreditCard, setFilterCreditCard] = useState('');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [bulkFrequency, setBulkFrequency] = useState('');
  const [bulkAmountType, setBulkAmountType] = useState('');
  const [bulkExpenseType, setBulkExpenseType] = useState('');
  const [bulkPaymentMethod, setBulkPaymentMethod] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<'name' | 'amount' | 'date' | 'category'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Add expense form - two step flow
  const [addStep, setAddStep] = useState<'name' | 'details'>('name');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseDate, setNewExpenseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newExpenseBillingMonth, setNewExpenseBillingMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [newExpenseCategoryId, setNewExpenseCategoryId] = useState('');
  const [newExpenseFrequency, setNewExpenseFrequency] = useState<Frequency>('one_time');
  const [newExpenseAmountType, setNewExpenseAmountType] = useState<AmountType>('variable');
  const [newExpenseExpenseType, setNewExpenseExpenseType] = useState<ExpenseType>('optional');
  const [newExpensePaymentMethod, setNewExpensePaymentMethod] = useState<PaymentMethod>('credit');
  const [newExpenseCreditCardId, setNewExpenseCreditCardId] = useState('');
  const [newExpenseNotes, setNewExpenseNotes] = useState('');

  // Build label maps including custom options
  const frequencyLabels = useMemo(() => {
    const map: Record<string, string> = { ...FREQUENCY_LABELS };
    classificationOptions.
    filter((o) => o.option_type === 'frequency').
    forEach((o) => {map[o.value] = o.label;});
    return map;
  }, [classificationOptions]);

  const amountTypeLabels = useMemo(() => {
    const map: Record<string, string> = { ...AMOUNT_TYPE_LABELS };
    classificationOptions.
    filter((o) => o.option_type === 'amount_type').
    forEach((o) => {map[o.value] = o.label;});
    return map;
  }, [classificationOptions]);

  const expenseTypeLabels = useMemo(() => {
    const map: Record<string, string> = { ...EXPENSE_TYPE_LABELS };
    classificationOptions.
    filter((o) => o.option_type === 'expense_type').
    forEach((o) => {map[o.value] = o.label;});
    return map;
  }, [classificationOptions]);

  const paymentMethodLabels = useMemo(() => {
    const map: Record<string, string> = { ...PAYMENT_METHOD_LABELS };
    classificationOptions.
    filter((o) => o.option_type === 'payment_method').
    forEach((o) => {map[o.value] = o.label;});
    return map;
  }, [classificationOptions]);

  const loadExpenses = async () => {
    if (!supabase || !household) return;

    setLoading(true);
    let query = supabase.
    from('expenses').
    select('*').
    eq('household_id', household.id).
    order('date', { ascending: false });

    if (filterMonth) {
      // filterMonth is already in YYYY-MM format, use billing_month
      console.log('Expenses filter by billing_month:', filterMonth);
      query = query.eq('billing_month', filterMonth);
    }

    const { data } = await query;
    setExpenses((data ?? []) as Expense[]);
    setLoading(false);
  };

  useEffect(() => {
    loadExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household, filterMonth]);

  const filteredExpenses = useMemo(() => {
    const filtered = expenses.filter((expense) => {
      if (searchTerm && !expense.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (filterCategory) {
        if (filterCategory === '__none__' && expense.category_id) return false;
        if (filterCategory !== '__none__' && expense.category_id !== filterCategory) return false;
      }
      if (filterFrequency && expense.frequency !== filterFrequency) return false;
      if (filterAmountType && expense.amount_type !== filterAmountType) return false;
      if (filterExpenseType && expense.expense_type !== filterExpenseType) return false;
      if (filterPaymentMethod && expense.payment_method !== filterPaymentMethod) return false;
      if (filterCreditCard) {
        if (filterCreditCard === '__none__' && expense.credit_card_id) return false;
        if (filterCreditCard !== '__none__' && expense.credit_card_id !== filterCreditCard) return false;
      }
      return true;
    });

    // Sort
    const result = [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name, 'he');
          break;
        case 'amount':
          cmp = Number(a.amount) - Number(b.amount);
          break;
        case 'date':
          cmp = a.date.localeCompare(b.date);
          break;
        case 'category':{
            const aCat = categories.find((c) => c.id === a.category_id)?.name || '';
            const bCat = categories.find((c) => c.id === b.category_id)?.name || '';
            cmp = aCat.localeCompare(bCat, 'he');
            break;
          }
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [expenses, searchTerm, filterCategory, filterFrequency, filterAmountType, filterExpenseType, filterPaymentMethod, filterCreditCard, sortField, sortDirection, categories]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: {field: typeof sortField;}) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-50" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const hasActiveFilters = filterCategory || filterFrequency || filterAmountType || filterExpenseType || filterPaymentMethod || filterCreditCard || searchTerm;

  const clearFilters = () => {
    setFilterCategory('');
    setFilterFrequency('');
    setFilterAmountType('');
    setFilterExpenseType('');
    setFilterPaymentMethod('');
    setFilterCreditCard('');
    setSearchTerm('');
  };

  const resetAddForm = () => {
    setAddStep('name');
    setNewExpenseName('');
    setNewExpenseAmount('');
    setNewExpenseDate(new Date().toISOString().split('T')[0]);
    const now = new Date();
    setNewExpenseBillingMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    setNewExpenseCategoryId('');
    setNewExpenseFrequency('one_time');
    setNewExpenseAmountType('variable');
    setNewExpenseExpenseType('optional');
    setNewExpensePaymentMethod('credit');
    setNewExpenseCreditCardId('');
    setNewExpenseNotes('');
  };

  const proceedToDetails = () => {
    if (!newExpenseName.trim()) return;

    // Check if there's a matching rule
    const matchingRule = expenseRules.find(
      (rule) => rule.expense_name.toLowerCase() === newExpenseName.trim().toLowerCase()
    );

    if (matchingRule) {
      // Pre-fill from rule
      setNewExpenseCategoryId(matchingRule.category_id || '');
      setNewExpenseFrequency(matchingRule.frequency);
      setNewExpenseAmountType(matchingRule.amount_type);
      setNewExpenseExpenseType(matchingRule.expense_type);
      setNewExpensePaymentMethod(matchingRule.payment_method);
      setNewExpenseNotes(matchingRule.notes || '');
    }

    setAddStep('details');
  };

  const handleAddExpense = async () => {
    if (!supabase || !household || !newExpenseName.trim() || !newExpenseAmount) return;

    const amount = parseFloat(newExpenseAmount);
    if (isNaN(amount)) return;

    const { error } = await supabase.from('expenses').insert({
      household_id: household.id,
      name: newExpenseName.trim(),
      amount: amount,
      date: newExpenseDate,
      billing_month: newExpenseBillingMonth,
      category_id: newExpenseCategoryId || null,
      frequency: newExpenseFrequency,
      amount_type: newExpenseAmountType,
      expense_type: newExpenseExpenseType,
      payment_method: newExpensePaymentMethod,
      credit_card_id: newExpenseCreditCardId || null,
      notes: newExpenseNotes.trim() || null
    });

    if (!error) {
      resetAddForm();
      setShowAddForm(false);
      await loadExpenses();
    }
  };

  const handleDelete = async (id: string) => {
    if (!supabase || !confirm('בטוח שברצונך למחוק הוצאה זו?')) return;

    await supabase.from('expenses').delete().eq('id', id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleUpdateExpense = async (updatedExpense: Expense) => {
    if (!supabase) return;

    const { error } = await supabase.
    from('expenses').
    update({
      name: updatedExpense.name,
      amount: updatedExpense.amount,
      date: updatedExpense.date,
      billing_month: updatedExpense.billing_month,
      category_id: updatedExpense.category_id || null,
      frequency: updatedExpense.frequency,
      amount_type: updatedExpense.amount_type,
      expense_type: updatedExpense.expense_type,
      payment_method: updatedExpense.payment_method,
      credit_card_id: updatedExpense.credit_card_id || null,
      notes: updatedExpense.notes
    }).
    eq('id', updatedExpense.id);

    if (!error) {
      setExpenses((prev) =>
      prev.map((e) => e.id === updatedExpense.id ? updatedExpense : e)
      );
      setEditingExpense(null);
    }
  };

  // Bulk operations
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredExpenses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredExpenses.map((e) => e.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkUpdate = async () => {
    if (!supabase || selectedIds.size === 0) return;

    setLoading(true);
    const updates: Partial<Expense> = {};
    if (bulkCategoryId) updates.category_id = bulkCategoryId === '__none__' ? null : bulkCategoryId;
    if (bulkFrequency) updates.frequency = bulkFrequency as Frequency;
    if (bulkAmountType) updates.amount_type = bulkAmountType as AmountType;
    if (bulkExpenseType) updates.expense_type = bulkExpenseType as ExpenseType;
    if (bulkPaymentMethod) updates.payment_method = bulkPaymentMethod as PaymentMethod;

    if (Object.keys(updates).length === 0) {
      alert('בחר לפחות שדה אחד לעדכון');
      setLoading(false);
      return;
    }

    const { error } = await supabase.
    from('expenses').
    update(updates).
    in('id', Array.from(selectedIds));

    if (!error) {
      await loadExpenses();
      setSelectedIds(new Set());
      setShowBulkEdit(false);
      setBulkCategoryId('');
      setBulkFrequency('');
      setBulkAmountType('');
      setBulkExpenseType('');
      setBulkPaymentMethod('');
    }
    setLoading(false);
  };

  const handleBulkDelete = async () => {
    if (!supabase || selectedIds.size === 0) return;
    if (!confirm(`בטוח שברצונך למחוק ${selectedIds.size} הוצאות?`)) return;

    setLoading(true);
    await supabase.from('expenses').delete().in('id', Array.from(selectedIds));
    await loadExpenses();
    setSelectedIds(new Set());
    setLoading(false);
  };

  // Export to Excel
  const handleExport = () => {
    try {
      const dataToExport = filteredExpenses.length > 0 ? filteredExpenses : expenses;
      console.log('Exporting expenses:', dataToExport.length);

      if (dataToExport.length === 0) {
        alert('אין נתונים לייצוא');
        return;
      }

      const exportData = dataToExport.map((expense) => {
        const category = categories.find((c) => c.id === expense.category_id);
        return {
          'שם': expense.name,
          'סכום': expense.amount,
          'תאריך': expense.date,
          'קטגוריה': category?.name || '',
          'תדירות': frequencyLabels[expense.frequency] || expense.frequency,
          'סוג סכום': amountTypeLabels[expense.amount_type] || expense.amount_type,
          'סוג הוצאה': expenseTypeLabels[expense.expense_type] || expense.expense_type,
          'אמצעי תשלום': paymentMethodLabels[expense.payment_method] || expense.payment_method,
          'הערות': expense.notes || ''
        };
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'הוצאות');

      // Use Blob for sandbox compatibility
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'expenses_export.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log('Export completed');
    } catch (err) {
      console.error('Export error:', err);
      alert('שגיאה בייצוא');
    }
  };

  // Generate month options for filter
  const monthOptions = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
    monthOptions.push({ value, label });
  }

  const expenseCategories = categories.filter((c) => c.type === 'expense');

  return (
    <Layout>
      <div data-ev-id="ev_0dd377ee79" className="md:mr-52 flex flex-col gap-6 pb-24 md:pb-6">
        {/* Header */}
        <div data-ev-id="ev_bfd95ab61e" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div data-ev-id="ev_f1749d2325">
            <h2 data-ev-id="ev_311855b28c" className="text-2xl font-bold text-foreground">רשימת הוצאות</h2>
            <p data-ev-id="ev_5458157634" className="text-muted-foreground">
              סה"כ: ₪{totalAmount.toLocaleString()} ({filteredExpenses.length} הוצאות)
            </p>
          </div>
          <div data-ev-id="ev_b448e6fe22" className="flex gap-2">
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4" />
              הוצאה חדשה
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4" />
              ייצוא
            </Button>
          </div>
        </div>

        {/* Add expense form - Step 1: Name */}
        {showAddForm && addStep === 'name' &&
        <Card>
            <div data-ev-id="ev_0cdc3dfb17" className="flex items-center justify-between mb-4">
              <h3 data-ev-id="ev_1eeaa76034" className="text-lg font-semibold text-foreground">הוספת הוצאה חדשה</h3>
              <button data-ev-id="ev_b2f245145b" onClick={() => {resetAddForm();setShowAddForm(false);}} className="p-1 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p data-ev-id="ev_d608798735" className="text-muted-foreground mb-4">
              הזן את שם ההוצאה. אם קיים כלל מתאים, הסיווגים יוזנו אוטומטית.
            </p>
            <div data-ev-id="ev_f7cd864579" className="max-w-md">
              <Input
              label="שם ההוצאה *"
              placeholder="לדוגמה: סופר, חשמל, ביטוח..."
              value={newExpenseName}
              onChange={(e) => setNewExpenseName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && proceedToDetails()} />
            </div>
            <div data-ev-id="ev_4b98fe4085" className="flex gap-3 mt-4">
              <Button onClick={proceedToDetails} disabled={!newExpenseName.trim()}>
                המשך
              </Button>
              <Button variant="outline" onClick={() => {resetAddForm();setShowAddForm(false);}}>
                ביטול
              </Button>
            </div>
          </Card>
        }

        {/* Add expense form - Step 2: Details */}
        {showAddForm && addStep === 'details' &&
        <Card>
            <div data-ev-id="ev_fe0ab94ba5" className="flex items-center justify-between mb-4">
              <div data-ev-id="ev_4889dd11c8">
                <h3 data-ev-id="ev_6195c3c0f1" className="text-lg font-semibold text-foreground">פרטי ההוצאה</h3>
                <p data-ev-id="ev_cf2ac777b6" className="text-muted-foreground text-sm">{newExpenseName}</p>
              </div>
              <button data-ev-id="ev_47716927d0" onClick={() => {resetAddForm();setShowAddForm(false);}} className="p-1 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            {expenseRules.find((r) => r.expense_name.toLowerCase() === newExpenseName.trim().toLowerCase()) &&
          <div data-ev-id="ev_1d636e51a1" className="bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg p-3 mb-4 text-sm">
                ✓ נמצא כלל מתאים - הסיווגים הוזנו אוטומטית
              </div>
          }
            <div data-ev-id="ev_f9121ab88b" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input
              label="סכום * (מינוס = זיכוי)"
              type="number"
              step="0.01"
              placeholder="100.00"
              value={newExpenseAmount}
              onChange={(e) => setNewExpenseAmount(e.target.value)} />
              <Input
              label="תאריך"
              type="date"
              value={newExpenseDate}
              onChange={(e) => setNewExpenseDate(e.target.value)} />
              <Select
              label="חודש חיוב *"
              value={newExpenseBillingMonth}
              onChange={(e) => setNewExpenseBillingMonth(e.target.value)}
              options={monthOptions} />
              <Select
              label="קטגוריה"
              value={newExpenseCategoryId}
              onChange={(e) => setNewExpenseCategoryId(e.target.value)}
              options={[
              { value: '', label: 'בחר קטגוריה...' },
              ...expenseCategories.map((c) => ({ value: c.id, label: c.name }))]
              } />
              <Select
              label="תדירות"
              value={newExpenseFrequency}
              onChange={(e) => setNewExpenseFrequency(e.target.value as Frequency)}
              options={Object.entries(frequencyLabels).map(([value, label]) => ({ value, label }))} />
              <Select
              label="סוג סכום"
              value={newExpenseAmountType}
              onChange={(e) => setNewExpenseAmountType(e.target.value as AmountType)}
              options={Object.entries(amountTypeLabels).map(([value, label]) => ({ value, label }))} />
              <Select
              label="סוג הוצאה"
              value={newExpenseExpenseType}
              onChange={(e) => setNewExpenseExpenseType(e.target.value as ExpenseType)}
              options={Object.entries(expenseTypeLabels).map(([value, label]) => ({ value, label }))} />
              <Select
              label="אמצעי תשלום"
              value={newExpensePaymentMethod}
              onChange={(e) => setNewExpensePaymentMethod(e.target.value as PaymentMethod)}
              options={Object.entries(paymentMethodLabels).map(([value, label]) => ({ value, label }))} />
              {newExpensePaymentMethod === 'credit' && creditCards.length > 0 &&
            <Select
              label="כרטיס אשראי"
              value={newExpenseCreditCardId}
              onChange={(e) => setNewExpenseCreditCardId(e.target.value)}
              options={[
              { value: '', label: 'בחר כרטיס...' },
              ...creditCards.map((c) => ({
                value: c.id,
                label: c.name + (c.last_four_digits ? ` (${c.last_four_digits})` : '')
              }))]
              } />
            }
              <Input
              label="הערות"
              placeholder="הערה או תיאור קצר"
              value={newExpenseNotes}
              onChange={(e) => setNewExpenseNotes(e.target.value)} />
            </div>
            <div data-ev-id="ev_b867237c23" className="flex gap-3 mt-4">
              <Button onClick={handleAddExpense} disabled={!newExpenseAmount}>
                שמור הוצאה
              </Button>
              <Button variant="outline" onClick={() => setAddStep('name')}>
                חזור
              </Button>
              <Button variant="outline" onClick={() => {resetAddForm();setShowAddForm(false);}}>
                ביטול
              </Button>
            </div>
          </Card>
        }

        {/* Search and filters */}
        <Card className="p-4">
          <div data-ev-id="ev_6519fc6f36" className="flex flex-col gap-4">
            <div data-ev-id="ev_39ace76a69" className="flex gap-3">
              <div data-ev-id="ev_17efd7bde0" className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input data-ev-id="ev_84bd37f2f5"
                type="text"
                placeholder="חיפוש הוצאה..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />

              </div>
              <Button
                variant={showFilters ? 'primary' : 'outline'}
                onClick={() => setShowFilters(!showFilters)}>

                <Filter className="w-4 h-4" />
                סינון
              </Button>
              {hasActiveFilters &&
              <Button variant="outline" onClick={clearFilters}>
                  <X className="w-4 h-4" />
                  נקה
                </Button>
              }
            </div>

            {showFilters &&
            <div data-ev-id="ev_94c457395b" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                <Select
                label="חודש"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                options={[{ value: '', label: 'כל הזמנים' }, ...monthOptions]} />

                <Select
                label="קטגוריה"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                options={[
                { value: '', label: 'הכל' },
                { value: '__none__', label: 'ללא קטגוריה' },
                ...expenseCategories.map((c) => ({ value: c.id, label: c.name }))]
                } />

                <Select
                label="תדירות"
                value={filterFrequency}
                onChange={(e) => setFilterFrequency(e.target.value)}
                options={[
                { value: '', label: 'הכל' },
                ...Object.entries(frequencyLabels).map(([value, label]) => ({ value, label }))]
                } />

                <Select
                label="סוג סכום"
                value={filterAmountType}
                onChange={(e) => setFilterAmountType(e.target.value)}
                options={[
                { value: '', label: 'הכל' },
                ...Object.entries(amountTypeLabels).map(([value, label]) => ({ value, label }))]
                } />

                <Select
                label="סוג הוצאה"
                value={filterExpenseType}
                onChange={(e) => setFilterExpenseType(e.target.value)}
                options={[
                { value: '', label: 'הכל' },
                ...Object.entries(expenseTypeLabels).map(([value, label]) => ({ value, label }))]
                } />

                <Select
                label="אמצעי תשלום"
                value={filterPaymentMethod}
                onChange={(e) => setFilterPaymentMethod(e.target.value)}
                options={[
                { value: '', label: 'הכל' },
                ...Object.entries(paymentMethodLabels).map(([value, label]) => ({ value, label }))]
                } />

                <Select
                label="כרטיס אשראי"
                value={filterCreditCard}
                onChange={(e) => setFilterCreditCard(e.target.value)}
                options={[
                { value: '', label: 'הכל' },
                { value: '__none__', label: 'ללא כרטיס' },
                ...creditCards.map((c) => ({ value: c.id, label: c.name + (c.last_four_digits ? ` (${c.last_four_digits})` : '') }))]
                } />

              </div>
            }
          </div>
        </Card>

        {/* Bulk actions */}
        {selectedIds.size > 0 &&
        <Card className="bg-primary/5 border-primary">
            <div data-ev-id="ev_c4f4af5d81" className="flex flex-col gap-4">
              <div data-ev-id="ev_54917c7038" className="flex items-center justify-between">
                <span data-ev-id="ev_0e73be6585" className="font-medium text-foreground">
                  נבחרו {selectedIds.size} הוצאות
                </span>
                <div data-ev-id="ev_280f91a1e1" className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowBulkEdit(!showBulkEdit)}>
                    <Edit2 className="w-4 h-4" />
                    עריכה מרובה
                  </Button>
                  <Button variant="outline" onClick={handleBulkDelete} className="text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                    מחיקה
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedIds(new Set())}>
                    ביטול
                  </Button>
                </div>
              </div>

              {showBulkEdit &&
            <div data-ev-id="ev_0430860d0f" className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-4 border-t border-border">
                  <Select
                label="קטגוריה"
                value={bulkCategoryId}
                onChange={(e) => setBulkCategoryId(e.target.value)}
                options={[
                { value: '', label: 'ללא שינוי' },
                { value: '__none__', label: 'הסר קטגוריה' },
                ...expenseCategories.map((c) => ({ value: c.id, label: c.name }))]
                } />

                  <Select
                label="תדירות"
                value={bulkFrequency}
                onChange={(e) => setBulkFrequency(e.target.value)}
                options={[
                { value: '', label: 'ללא שינוי' },
                ...Object.entries(frequencyLabels).map(([value, label]) => ({ value, label }))]
                } />

                  <Select
                label="סוג סכום"
                value={bulkAmountType}
                onChange={(e) => setBulkAmountType(e.target.value)}
                options={[
                { value: '', label: 'ללא שינוי' },
                ...Object.entries(amountTypeLabels).map(([value, label]) => ({ value, label }))]
                } />

                  <Select
                label="סוג הוצאה"
                value={bulkExpenseType}
                onChange={(e) => setBulkExpenseType(e.target.value)}
                options={[
                { value: '', label: 'ללא שינוי' },
                ...Object.entries(expenseTypeLabels).map(([value, label]) => ({ value, label }))]
                } />

                  <Select
                label="אמצעי תשלום"
                value={bulkPaymentMethod}
                onChange={(e) => setBulkPaymentMethod(e.target.value)}
                options={[
                { value: '', label: 'ללא שינוי' },
                ...Object.entries(paymentMethodLabels).map(([value, label]) => ({ value, label }))]
                } />

                  <div data-ev-id="ev_202a54d725" className="md:col-span-5 flex justify-end">
                    <Button onClick={handleBulkUpdate} disabled={loading}>
                      עדכן {selectedIds.size} הוצאות
                    </Button>
                  </div>
                </div>
            }
            </div>
          </Card>
        }

        {/* Expenses list */}
        {loading ?
        <Card className="text-center py-8">
            <div data-ev-id="ev_9563f7e1b5" className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          </Card> :
        filteredExpenses.length === 0 ?
        <Card className="text-center py-8">
            <p data-ev-id="ev_7a0db9f06a" className="text-muted-foreground">אין הוצאות להצגה</p>
          </Card> :

        <Card variant="outlined" className="p-0 overflow-hidden">
            <div data-ev-id="ev_65b8747e1f" className="overflow-x-auto">
              <table data-ev-id="ev_81bf14beef" className="w-full">
                <thead data-ev-id="ev_5ca81d3492" className="bg-muted">
                  <tr data-ev-id="ev_17a7afa8ec">
                    <th data-ev-id="ev_6794df7b21" className="p-3 w-10">
                      <button data-ev-id="ev_45a8eddcb7" onClick={toggleSelectAll} className="p-1">
                        {selectedIds.size === filteredExpenses.length && filteredExpenses.length > 0 ?
                      <CheckSquare className="w-5 h-5 text-primary" /> :

                      <Square className="w-5 h-5 text-muted-foreground" />
                      }
                      </button>
                    </th>
                    <th data-ev-id="ev_a964efcd79" className="text-right p-3 text-sm font-medium text-muted-foreground">
                        <button data-ev-id="ev_fc4e083df8" onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-foreground">
                          שם <SortIcon field="name" />
                        </button>
                      </th>
                    <th data-ev-id="ev_02ddcff849" className="text-right p-3 text-sm font-medium text-muted-foreground">
                        <button data-ev-id="ev_0c5f94b71c" onClick={() => handleSort('amount')} className="flex items-center gap-1 hover:text-foreground">
                          סכום <SortIcon field="amount" />
                        </button>
                      </th>
                    <th data-ev-id="ev_61c0ba63c8" className="text-right p-3 text-sm font-medium text-muted-foreground hidden md:table-cell">
                        <button data-ev-id="ev_417ac0c1d4" onClick={() => handleSort('date')} className="flex items-center gap-1 hover:text-foreground">
                          תאריך <SortIcon field="date" />
                        </button>
                      </th>
                    <th data-ev-id="ev_bf7ea1c473" className="text-right p-3 text-sm font-medium text-muted-foreground hidden md:table-cell">
                        <button data-ev-id="ev_2542b6b0bf" onClick={() => handleSort('category')} className="flex items-center gap-1 hover:text-foreground">
                          קטגוריה <SortIcon field="category" />
                        </button>
                      </th>
                    <th data-ev-id="ev_65447dea33" className="text-right p-3 text-sm font-medium text-muted-foreground hidden lg:table-cell">
                        כרטיס אשראי
                      </th>
                    <th data-ev-id="ev_9360806441" className="p-3"></th>
                  </tr>
                </thead>
                <tbody data-ev-id="ev_e8e04f9b3c" className="divide-y divide-border">
                  {filteredExpenses.map((expense) => {
                  const category = categories.find((c) => c.id === expense.category_id);
                  const isSelected = selectedIds.has(expense.id);
                  return (
                    <tr data-ev-id="ev_1c13a5b817" key={expense.id} className={`hover:bg-muted/50 ${isSelected ? 'bg-primary/5' : ''}`}>
                        <td data-ev-id="ev_940848b7b2" className="p-3">
                          <button data-ev-id="ev_cad2fb3d69" onClick={() => toggleSelect(expense.id)} className="p-1">
                            {isSelected ?
                          <CheckSquare className="w-5 h-5 text-primary" /> :

                          <Square className="w-5 h-5 text-muted-foreground" />
                          }
                          </button>
                        </td>
                        <td data-ev-id="ev_73d73c49d0" className="p-3">
                          <p data-ev-id="ev_33b877ba92" className="font-medium text-foreground">{expense.name}</p>
                          {expense.notes && <p data-ev-id="ev_bec6ce989b" className="text-xs text-muted-foreground">{expense.notes}</p>}
                          <p data-ev-id="ev_5de2dfe561" className="text-sm text-muted-foreground md:hidden">
                            {new Date(expense.date).toLocaleDateString('he-IL')}
                          </p>
                        </td>
                        <td data-ev-id="ev_c6da8ba04b" className={`p-3 font-semibold ${Number(expense.amount) < 0 ? 'text-green-600' : 'text-foreground'}`}>
                          {Number(expense.amount) < 0 ? 'זיכוי ' : ''}₪{Math.abs(Number(expense.amount)).toLocaleString()}
                        </td>
                        <td data-ev-id="ev_14fd00d11f" className="p-3 text-muted-foreground hidden md:table-cell">
                          {new Date(expense.date).toLocaleDateString('he-IL')}
                        </td>
                        <td data-ev-id="ev_829a1cc4b1" className="p-3 hidden md:table-cell">
                          {category ?
                        <span data-ev-id="ev_c4dd470629" className="text-foreground bg-red-600/10 text-sm px-2 py-1">
                              {category.name}
                            </span> :

                        <span data-ev-id="ev_f51540d7df" className="text-muted-foreground text-sm">ללא</span>
                        }
                        </td>
                        <td data-ev-id="ev_aa51529cd6" className="p-3 hidden lg:table-cell">
                          {(() => {
                          const card = creditCards.find((c) => c.id === expense.credit_card_id);
                          return card ?
                          <span data-ev-id="ev_ae543c577f" className="text-foreground text-sm">
                                {card.name}{card.last_four_digits && ` (${card.last_four_digits})`}
                              </span> :
                          <span data-ev-id="ev_a84e6cb217" className="text-muted-foreground text-sm">-</span>;
                        })()}
                        </td>
                        <td data-ev-id="ev_0fe5aed46d" className="p-3">
                          <div data-ev-id="ev_81863bd38b" className="flex gap-2 justify-end">
                            <button data-ev-id="ev_a9b1b733b7"
                          onClick={() => setEditingExpense(expense)}
                          className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground">

                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button data-ev-id="ev_757ec6d3d7"
                          onClick={() => handleDelete(expense.id)}
                          className="p-2 hover:bg-red-50 rounded-lg text-muted-foreground hover:text-red-600">

                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>);

                })}
                </tbody>
              </table>
            </div>
          </Card>
        }

        {/* Edit modal */}
        {editingExpense &&
        <div data-ev-id="ev_1543ea6a6a" className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h3 data-ev-id="ev_9a2ab19cca" className="text-lg font-bold text-foreground mb-4">עריכת הוצאה</h3>
              <div data-ev-id="ev_cb89f81d80" className="flex flex-col gap-4">
                <Input
                label="שם הוצאה"
                value={editingExpense.name}
                onChange={(e) => setEditingExpense({ ...editingExpense, name: e.target.value })} />

                <Input
                label="סכום"
                type="number"
                value={editingExpense.amount}
                onChange={(e) => setEditingExpense({ ...editingExpense, amount: parseFloat(e.target.value) })} />

                <Input
                label="תאריך"
                type="date"
                value={editingExpense.date}
                onChange={(e) => setEditingExpense({ ...editingExpense, date: e.target.value })} />

                <Input
                label="חודש חיוב (YYYY-MM)"
                placeholder="לדוגמא: 2025-07"
                value={editingExpense.billing_month || ''}
                onChange={(e) => setEditingExpense({ ...editingExpense, billing_month: e.target.value })} />

                <Select
                label="קטגוריה"
                value={editingExpense.category_id || ''}
                onChange={(e) => setEditingExpense({ ...editingExpense, category_id: e.target.value })}
                options={[
                { value: '', label: 'ללא קטגוריה' },
                ...expenseCategories.map((c) => ({ value: c.id, label: c.name }))]
                } />

                <Select
                label="תדירות"
                value={editingExpense.frequency}
                onChange={(e) => setEditingExpense({ ...editingExpense, frequency: e.target.value as Frequency })}
                options={Object.entries(frequencyLabels).map(([value, label]) => ({ value, label }))} />

                <Select
                label="סוג סכום"
                value={editingExpense.amount_type}
                onChange={(e) => setEditingExpense({ ...editingExpense, amount_type: e.target.value as AmountType })}
                options={Object.entries(amountTypeLabels).map(([value, label]) => ({ value, label }))} />

                <Select
                label="סוג הוצאה"
                value={editingExpense.expense_type}
                onChange={(e) => setEditingExpense({ ...editingExpense, expense_type: e.target.value as ExpenseType })}
                options={Object.entries(expenseTypeLabels).map(([value, label]) => ({ value, label }))} />

                <Select
                label="אמצעי תשלום"
                value={editingExpense.payment_method}
                onChange={(e) => setEditingExpense({ ...editingExpense, payment_method: e.target.value as PaymentMethod })}
                options={Object.entries(paymentMethodLabels).map(([value, label]) => ({ value, label }))} />

                {editingExpense.payment_method === 'credit' && creditCards.length > 0 &&
              <Select
                label="כרטיס אשראי"
                value={editingExpense.credit_card_id || ''}
                onChange={(e) => setEditingExpense({ ...editingExpense, credit_card_id: e.target.value })}
                options={[
                { value: '', label: 'לא נבחר' },
                ...creditCards.map((c) => ({
                  value: c.id,
                  label: c.name + (c.last_four_digits ? ` (${c.last_four_digits})` : '')
                }))]
                } />

              }
                <Input
                label="הערות"
                placeholder="הערה או תיאור קצר"
                value={editingExpense.notes || ''}
                onChange={(e) => setEditingExpense({ ...editingExpense, notes: e.target.value })} />

                <div data-ev-id="ev_7c50b53728" className="flex gap-3 mt-4">
                  <Button onClick={() => handleUpdateExpense(editingExpense)}>שמור</Button>
                  <Button variant="outline" onClick={() => setEditingExpense(null)}>ביטול</Button>
                </div>
              </div>
            </Card>
          </div>
        }
      </div>
    </Layout>);

}