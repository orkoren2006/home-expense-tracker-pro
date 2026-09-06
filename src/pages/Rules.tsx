import { useEffect, useState, useMemo } from 'react';
import { Search, Edit2, Trash2, Plus, FileText, Download, CheckSquare, Square, Filter, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useHousehold } from '@/hooks/useHousehold';
import { supabase } from '@/integrations/supabase/client';
import type { ExpenseRule, Frequency, AmountType, ExpenseType, PaymentMethod } from '@/types';
import {
  FREQUENCY_LABELS,
  AMOUNT_TYPE_LABELS,
  EXPENSE_TYPE_LABELS,
  PAYMENT_METHOD_LABELS } from
'@/types';

export default function Rules() {
  const { household, categories, creditCards, classificationOptions, refreshData } = useHousehold();
  const [rules, setRules] = useState<ExpenseRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRule, setEditingRule] = useState<ExpenseRule | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [filterCategory, setFilterCategory] = useState('');
  const [filterFrequency, setFilterFrequency] = useState('');
  const [filterAmountType, setFilterAmountType] = useState('');
  const [filterExpenseType, setFilterExpenseType] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<'expense_name' | 'category' | 'frequency' | 'expense_type'>('expense_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [bulkFrequency, setBulkFrequency] = useState('');
  const [bulkAmountType, setBulkAmountType] = useState('');
  const [bulkExpenseType, setBulkExpenseType] = useState('');
  const [bulkPaymentMethod, setBulkPaymentMethod] = useState('');

  // New rule form
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleCategoryId, setNewRuleCategoryId] = useState('');
  const [newRuleFrequency, setNewRuleFrequency] = useState<Frequency>('one_time');
  const [newRuleAmountType, setNewRuleAmountType] = useState<AmountType>('variable');
  const [newRuleExpenseType, setNewRuleExpenseType] = useState<ExpenseType>('optional');
  const [newRulePaymentMethod, setNewRulePaymentMethod] = useState<PaymentMethod>('credit');
  const [newRuleCreditCardId, setNewRuleCreditCardId] = useState('');
  const [newRuleNotes, setNewRuleNotes] = useState('');

  // Build label maps including custom options
  const frequencyLabels = useMemo(() => {
    const map = { ...FREQUENCY_LABELS };
    classificationOptions.
    filter((o) => o.option_type === 'frequency').
    forEach((o) => {map[o.value as Frequency] = o.label;});
    return map;
  }, [classificationOptions]);

  const amountTypeLabels = useMemo(() => {
    const map = { ...AMOUNT_TYPE_LABELS };
    classificationOptions.
    filter((o) => o.option_type === 'amount_type').
    forEach((o) => {map[o.value as AmountType] = o.label;});
    return map;
  }, [classificationOptions]);

  const expenseTypeLabels = useMemo(() => {
    const map = { ...EXPENSE_TYPE_LABELS };
    classificationOptions.
    filter((o) => o.option_type === 'expense_type').
    forEach((o) => {map[o.value as ExpenseType] = o.label;});
    return map;
  }, [classificationOptions]);

  const paymentMethodLabels = useMemo(() => {
    const map = { ...PAYMENT_METHOD_LABELS };
    classificationOptions.
    filter((o) => o.option_type === 'payment_method').
    forEach((o) => {map[o.value as PaymentMethod] = o.label;});
    return map;
  }, [classificationOptions]);

  const loadRules = async () => {
    if (!supabase || !household) return;

    setLoading(true);
    const { data } = await supabase.
    from('expense_rules').
    select('*').
    eq('household_id', household.id).
    order('expense_name');

    setRules((data ?? []) as ExpenseRule[]);
    setLoading(false);
  };

  useEffect(() => {
    loadRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household]);

  // Filter and sort rules
  const filteredRules = useMemo(() => {
    const filtered = rules.filter((rule) => {
      if (searchTerm && !rule.expense_name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (filterCategory) {
        if (filterCategory === '__none__' && rule.category_id) return false;
        if (filterCategory !== '__none__' && rule.category_id !== filterCategory) return false;
      }
      if (filterFrequency && rule.frequency !== filterFrequency) return false;
      if (filterAmountType && rule.amount_type !== filterAmountType) return false;
      if (filterExpenseType && rule.expense_type !== filterExpenseType) return false;
      if (filterPaymentMethod && rule.payment_method !== filterPaymentMethod) return false;
      return true;
    });

    // Sort
    const result = [...filtered].sort((a, b) => {
      let aVal: string, bVal: string;
      switch (sortField) {
        case 'expense_name':
          aVal = a.expense_name.toLowerCase();
          bVal = b.expense_name.toLowerCase();
          break;
        case 'category':
          aVal = categories.find((c) => c.id === a.category_id)?.name || '';
          bVal = categories.find((c) => c.id === b.category_id)?.name || '';
          break;
        case 'frequency':
          aVal = frequencyLabels[a.frequency] || a.frequency;
          bVal = frequencyLabels[b.frequency] || b.frequency;
          break;
        case 'expense_type':
          aVal = expenseTypeLabels[a.expense_type] || a.expense_type;
          bVal = expenseTypeLabels[b.expense_type] || b.expense_type;
          break;
        default:
          return 0;
      }
      const cmp = aVal.localeCompare(bVal, 'he');
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [rules, searchTerm, filterCategory, filterFrequency, filterAmountType, filterExpenseType, filterPaymentMethod, sortField, sortDirection, categories, frequencyLabels, expenseTypeLabels]);

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

  const clearFilters = () => {
    setFilterCategory('');
    setFilterFrequency('');
    setFilterAmountType('');
    setFilterExpenseType('');
    setFilterPaymentMethod('');
    setSearchTerm('');
  };

  const hasActiveFilters = filterCategory || filterFrequency || filterAmountType || filterExpenseType || filterPaymentMethod || searchTerm;

  const handleAddRule = async () => {
    if (!supabase || !household || !newRuleName.trim()) return;

    setLoading(true);
    const { error } = await supabase.from('expense_rules').insert({
      household_id: household.id,
      expense_name: newRuleName.trim(),
      category_id: newRuleCategoryId || null,
      frequency: newRuleFrequency,
      amount_type: newRuleAmountType,
      expense_type: newRuleExpenseType,
      payment_method: newRulePaymentMethod,
      credit_card_id: newRuleCreditCardId || null,
      notes: newRuleNotes.trim() || null
    });

    if (!error) {
      setNewRuleName('');
      setNewRuleCategoryId('');
      setNewRuleFrequency('one_time');
      setNewRuleAmountType('variable');
      setNewRuleExpenseType('optional');
      setNewRulePaymentMethod('credit');
      setNewRuleCreditCardId('');
      setNewRuleNotes('');
      setShowAddForm(false);
      await loadRules();
    }
    setLoading(false);
  };

  const handleUpdateRule = async (rule: ExpenseRule) => {
    if (!supabase) return;

    const { error } = await supabase.
    from('expense_rules').
    update({
      expense_name: rule.expense_name,
      category_id: rule.category_id || null,
      frequency: rule.frequency,
      amount_type: rule.amount_type,
      expense_type: rule.expense_type,
      payment_method: rule.payment_method,
      credit_card_id: rule.credit_card_id || null,
      notes: rule.notes || null
    }).
    eq('id', rule.id);

    if (!error) {
      setRules((prev) => prev.map((r) => r.id === rule.id ? rule : r));
      setEditingRule(null);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!supabase || !confirm('בטוח שברצונך למחוק כלל זה?')) return;

    await supabase.from('expense_rules').delete().eq('id', id);
    setRules((prev) => prev.filter((r) => r.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Bulk operations
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRules.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRules.map((r) => r.id)));
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
    const updates: Partial<ExpenseRule> = {};
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
    from('expense_rules').
    update(updates).
    in('id', Array.from(selectedIds));

    if (!error) {
      await loadRules();
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
    if (!confirm(`בטוח שברצונך למחוק ${selectedIds.size} כללים?`)) return;

    setLoading(true);
    await supabase.from('expense_rules').delete().in('id', Array.from(selectedIds));
    await loadRules();
    setSelectedIds(new Set());
    setLoading(false);
  };

  // Export to Excel
  const handleExport = () => {
    try {
      const dataToExport = filteredRules.length > 0 ? filteredRules : rules;
      console.log('Exporting rules:', dataToExport.length);

      if (dataToExport.length === 0) {
        alert('אין נתונים לייצוא');
        return;
      }

      const exportData = dataToExport.map((rule) => {
        const category = categories.find((c) => c.id === rule.category_id);
        return {
          'שם הוצאה': rule.expense_name,
          'קטגוריה': category?.name || '',
          'תדירות': frequencyLabels[rule.frequency] || rule.frequency,
          'סוג סכום': amountTypeLabels[rule.amount_type] || rule.amount_type,
          'סוג הוצאה': expenseTypeLabels[rule.expense_type] || rule.expense_type,
          'אמצעי תשלום': paymentMethodLabels[rule.payment_method] || rule.payment_method,
          'הערות': rule.notes || ''
        };
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'כללי סיווג');
      
      // Use Blob for sandbox compatibility
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rules_export.xlsx';
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

  const expenseCategories = categories.filter((c) => c.type === 'expense');

  return (
    <Layout>
      <div data-ev-id="ev_f4aea55dd8" className="md:mr-52 flex flex-col gap-6 pb-24 md:pb-6">
        {/* Header */}
        <div data-ev-id="ev_ee982a6183" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div data-ev-id="ev_43b0c6d11b">
            <h2 data-ev-id="ev_0491ea8ae1" className="text-2xl font-bold text-foreground">כללי סיווג</h2>
            <p data-ev-id="ev_69d581449c" className="text-muted-foreground">
              {rules.length} כללים במערכת
              {filteredRules.length !== rules.length && ` (מוצגים ${filteredRules.length})`}
            </p>
          </div>
          <div data-ev-id="ev_23ceee6792" className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4" />
              ייצוא
            </Button>
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="w-4 h-4" />
              הוסף כלל
            </Button>
          </div>
        </div>

        {/* Add form */}
        {showAddForm &&
        <Card>
            <h3 data-ev-id="ev_433c9643af" className="font-semibold text-foreground mb-4">הוספת כלל חדש</h3>
            <div data-ev-id="ev_195cbb5595" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input
              label="שם ההוצאה"
              placeholder="לדוגמה: סופר יהודה"
              value={newRuleName}
              onChange={(e) => setNewRuleName(e.target.value)} />

              <Select
              label="קטגוריה"
              value={newRuleCategoryId}
              onChange={(e) => setNewRuleCategoryId(e.target.value)}
              options={[
              { value: '', label: 'ללא קטגוריה' },
              ...expenseCategories.map((c) => ({ value: c.id, label: c.name }))]
              } />

              <Select
              label="תדירות"
              value={newRuleFrequency}
              onChange={(e) => setNewRuleFrequency(e.target.value as Frequency)}
              options={Object.entries(frequencyLabels).map(([value, label]) => ({ value, label }))} />

              <Select
              label="סוג סכום"
              value={newRuleAmountType}
              onChange={(e) => setNewRuleAmountType(e.target.value as AmountType)}
              options={Object.entries(amountTypeLabels).map(([value, label]) => ({ value, label }))} />

              <Select
              label="סוג הוצאה"
              value={newRuleExpenseType}
              onChange={(e) => setNewRuleExpenseType(e.target.value as ExpenseType)}
              options={Object.entries(expenseTypeLabels).map(([value, label]) => ({ value, label }))} />

              <Select
              label="אמצעי תשלום"
              value={newRulePaymentMethod}
              onChange={(e) => setNewRulePaymentMethod(e.target.value as PaymentMethod)}
              options={Object.entries(paymentMethodLabels).map(([value, label]) => ({ value, label }))} />

              <Select
              label="כרטיס אשראי"
              value={newRuleCreditCardId}
              onChange={(e) => setNewRuleCreditCardId(e.target.value)}
              options={[
              { value: '', label: 'לא נבחר' },
              ...creditCards.map((c) => ({ value: c.id, label: `${c.name}${c.last_four_digits ? ` (${c.last_four_digits})` : ''}` }))]
              } />
              
              <Input
              label="הערות"
              placeholder="הערה או תיאור קצר"
              value={newRuleNotes}
              onChange={(e) => setNewRuleNotes(e.target.value)} />
            </div>
            <div data-ev-id="ev_57205bbbf1" className="flex gap-3 mt-4">
              <Button onClick={handleAddRule} disabled={loading || !newRuleName.trim()}>
                שמור
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                ביטול
              </Button>
            </div>
          </Card>
        }

        {/* Search and filters */}
        <div data-ev-id="ev_5b2af548df" className="flex flex-col gap-3">
          <div data-ev-id="ev_831b0ec14c" className="flex gap-3">
            <div data-ev-id="ev_d57bdb71d1" className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input data-ev-id="ev_0d7b93975a"
              type="text"
              placeholder="חיפוש כלל..."
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

          {/* Filter panel */}
          {showFilters &&
          <Card className="grid grid-cols-2 md:grid-cols-5 gap-3">
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

            </Card>
          }
        </div>

        {/* Bulk actions */}
        {selectedIds.size > 0 &&
        <Card className="bg-primary/5 border-primary">
            <div data-ev-id="ev_a86356278b" className="flex flex-col gap-4">
              <div data-ev-id="ev_aa2fc783ee" className="flex items-center justify-between">
                <span data-ev-id="ev_7422fec040" className="font-medium text-foreground">
                  נבחרו {selectedIds.size} כללים
                </span>
                <div data-ev-id="ev_238c890bd1" className="flex gap-2">
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
            <div data-ev-id="ev_25c838315b" className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-4 border-t border-border">
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

                  <div data-ev-id="ev_4fd74851d3" className="md:col-span-5 flex justify-end">
                    <Button onClick={handleBulkUpdate} disabled={loading}>
                      עדכן {selectedIds.size} כללים
                    </Button>
                  </div>
                </div>
            }
            </div>
          </Card>
        }

        {/* Rules list */}
        {loading ?
        <Card className="text-center py-8">
            <div data-ev-id="ev_f88c8e043f" className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          </Card> :
        filteredRules.length === 0 ?
        <Card className="text-center py-8">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p data-ev-id="ev_340f3b165b" className="text-muted-foreground">
              {hasActiveFilters ? 'לא נמצאו כללים' : 'אין כללי סיווג עדיין'}
            </p>
            <p data-ev-id="ev_95b8c44597" className="text-sm text-muted-foreground mt-2">
              כללי סיווג עוזרים לסווג הוצאות אוטומטית בייבוא
            </p>
          </Card> :

        <Card variant="outlined" className="p-0 overflow-hidden">
            <div data-ev-id="ev_dd59ff1839" className="overflow-x-auto">
              <table data-ev-id="ev_aeef93806e" className="w-full">
                <thead data-ev-id="ev_b83d833926" className="bg-muted">
                  <tr data-ev-id="ev_8178c2a70b">
                    <th data-ev-id="ev_7fd038bee1" className="p-3 w-10">
                      <button data-ev-id="ev_deac02c458" onClick={toggleSelectAll} className="p-1">
                        {selectedIds.size === filteredRules.length && filteredRules.length > 0 ?
                      <CheckSquare className="w-5 h-5 text-primary" /> :

                      <Square className="w-5 h-5 text-muted-foreground" />
                      }
                      </button>
                    </th>
                    <th data-ev-id="ev_4ef0a21e21" className="text-right p-3 text-sm font-medium text-muted-foreground">
                        <button data-ev-id="ev_b9c24e4dc4" onClick={() => handleSort('expense_name')} className="flex items-center gap-1 hover:text-foreground">
                          שם <SortIcon field="expense_name" />
                        </button>
                      </th>
                    <th data-ev-id="ev_b31fa48741" className="text-right p-3 text-sm font-medium text-muted-foreground hidden md:table-cell">
                        <button data-ev-id="ev_a69dcfb642" onClick={() => handleSort('category')} className="flex items-center gap-1 hover:text-foreground">
                          קטגוריה <SortIcon field="category" />
                        </button>
                      </th>
                    <th data-ev-id="ev_8a7e85ff9d" className="text-right p-3 text-sm font-medium text-muted-foreground hidden lg:table-cell">
                        <button data-ev-id="ev_d7c84c2007" onClick={() => handleSort('frequency')} className="flex items-center gap-1 hover:text-foreground">
                          תדירות <SortIcon field="frequency" />
                        </button>
                      </th>
                    <th data-ev-id="ev_3d37174584" className="text-right p-3 text-sm font-medium text-muted-foreground hidden lg:table-cell">
                        <button data-ev-id="ev_4f7684f779" onClick={() => handleSort('expense_type')} className="flex items-center gap-1 hover:text-foreground">
                          סוג <SortIcon field="expense_type" />
                        </button>
                      </th>
                    <th data-ev-id="ev_a973cb4cd6" className="p-3"></th>
                  </tr>
                </thead>
                <tbody data-ev-id="ev_0203083697" className="divide-y divide-border">
                  {filteredRules.map((rule) => {
                  const category = categories.find((c) => c.id === rule.category_id);
                  const isSelected = selectedIds.has(rule.id);
                  return (
                    <tr data-ev-id="ev_cfb00d58f3" key={rule.id} className={`hover:bg-muted/50 ${isSelected ? 'bg-primary/5' : ''}`}>
                        <td data-ev-id="ev_7c33edec98" className="p-3">
                          <button data-ev-id="ev_50161d0ba4" onClick={() => toggleSelect(rule.id)} className="p-1">
                            {isSelected ?
                          <CheckSquare className="w-5 h-5 text-primary" /> :

                          <Square className="w-5 h-5 text-muted-foreground" />
                          }
                          </button>
                        </td>
                        <td data-ev-id="ev_a7db131f99" className="p-3">
                          <p data-ev-id="ev_9870ebeae0" className="font-medium text-foreground">{rule.expense_name}</p>
                          {rule.notes && <p data-ev-id="ev_5affb0f94c" className="text-xs text-muted-foreground">{rule.notes}</p>}
                          <p data-ev-id="ev_ee46887578" className="text-sm text-muted-foreground md:hidden">
                            {category?.name || 'ללא קטגוריה'}
                          </p>
                        </td>
                        <td data-ev-id="ev_3779ebd6d6" className="p-3 hidden md:table-cell">
                          {category ?
                        <span data-ev-id="ev_4911f48588" className="bg-primary/10 text-primary px-2 py-1 rounded text-sm">
                              {category.name}
                            </span> :

                        <span data-ev-id="ev_61f901dedd" className="text-muted-foreground text-sm">ללא</span>
                        }
                        </td>
                        <td data-ev-id="ev_b8bfbfe8b3" className="p-3 text-muted-foreground hidden lg:table-cell">
                          {frequencyLabels[rule.frequency] || rule.frequency}
                        </td>
                        <td data-ev-id="ev_f4278c14c6" className="p-3 text-muted-foreground hidden lg:table-cell">
                          {expenseTypeLabels[rule.expense_type] || rule.expense_type}
                        </td>
                        <td data-ev-id="ev_b6e5805864" className="p-3">
                          <div data-ev-id="ev_3765c00cf2" className="flex gap-2 justify-end">
                            <button data-ev-id="ev_5dd492de51"
                          onClick={() => setEditingRule(rule)}
                          className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground">

                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button data-ev-id="ev_ff9af018cb"
                          onClick={() => handleDeleteRule(rule.id)}
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
        {editingRule &&
        <div data-ev-id="ev_00aa1f3796" className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setEditingRule(null)}>
            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h3 data-ev-id="ev_b1449b2e88" className="text-lg font-bold text-foreground mb-4">עריכת כלל</h3>
              <div data-ev-id="ev_37b6cf4646" className="flex flex-col gap-4">
                <Input
                label="שם ההוצאה"
                value={editingRule.expense_name}
                onChange={(e) => setEditingRule({ ...editingRule, expense_name: e.target.value })} />

                <Select
                label="קטגוריה"
                value={editingRule.category_id || ''}
                onChange={(e) => setEditingRule({ ...editingRule, category_id: e.target.value })}
                options={[
                { value: '', label: 'ללא קטגוריה' },
                ...expenseCategories.map((c) => ({ value: c.id, label: c.name }))]
                } />

                <Select
                label="תדירות"
                value={editingRule.frequency}
                onChange={(e) => setEditingRule({ ...editingRule, frequency: e.target.value as Frequency })}
                options={Object.entries(frequencyLabels).map(([value, label]) => ({ value, label }))} />

                <Select
                label="סוג סכום"
                value={editingRule.amount_type}
                onChange={(e) => setEditingRule({ ...editingRule, amount_type: e.target.value as AmountType })}
                options={Object.entries(amountTypeLabels).map(([value, label]) => ({ value, label }))} />

                <Select
                label="סוג הוצאה"
                value={editingRule.expense_type}
                onChange={(e) => setEditingRule({ ...editingRule, expense_type: e.target.value as ExpenseType })}
                options={Object.entries(expenseTypeLabels).map(([value, label]) => ({ value, label }))} />

                <Select
                label="אמצעי תשלום"
                value={editingRule.payment_method}
                onChange={(e) => setEditingRule({ ...editingRule, payment_method: e.target.value as PaymentMethod })}
                options={Object.entries(paymentMethodLabels).map(([value, label]) => ({ value, label }))} />

                <Select
                label="כרטיס אשראי"
                value={editingRule.credit_card_id || ''}
                onChange={(e) => setEditingRule({ ...editingRule, credit_card_id: e.target.value })}
                options={[
                { value: '', label: 'לא נבחר' },
                ...creditCards.map((c) => ({ value: c.id, label: `${c.name}${c.last_four_digits ? ` (${c.last_four_digits})` : ''}` }))]
                } />
                
                <Input
                label="הערות"
                placeholder="הערה או תיאור קצר"
                value={editingRule.notes || ''}
                onChange={(e) => setEditingRule({ ...editingRule, notes: e.target.value })} />
                <div data-ev-id="ev_e7d6b312a4" className="flex gap-3 mt-4">
                  <Button onClick={() => handleUpdateRule(editingRule)}>שמור</Button>
                  <Button variant="outline" onClick={() => setEditingRule(null)}>ביטול</Button>
                </div>
              </div>
            </Card>
          </div>
        }
      </div>
    </Layout>);

}