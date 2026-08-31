import { useEffect, useState, useMemo } from 'react';
import { Search, Filter, Edit2, Trash2, Download, Plus, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useHousehold } from '@/hooks/useHousehold';
import { supabase } from '@/integrations/supabase/client';
import type { Income, Frequency, AmountType, IncomePaymentMethod, IncomeSource } from '@/types';
import {
  FREQUENCY_LABELS,
  AMOUNT_TYPE_LABELS,
  INCOME_PAYMENT_METHOD_LABELS,
  INCOME_SOURCE_LABELS } from
'@/types';

export default function Incomes() {
  const { household, incomeRules, defaultIncomeSettings, refreshData } = useHousehold();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);

  // Filters
  const [filterMonth, setFilterMonth] = useState('');
  const [filterFrequency, setFilterFrequency] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<'name' | 'amount' | 'date'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Add income form - two step flow
  const [addStep, setAddStep] = useState<'name' | 'details'>('name');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIncomeName, setNewIncomeName] = useState('');
  const [newIncomeAmount, setNewIncomeAmount] = useState('');
  const [newIncomeDate, setNewIncomeDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newIncomeBillingMonth, setNewIncomeBillingMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [newIncomeFrequency, setNewIncomeFrequency] = useState<Frequency>(
    defaultIncomeSettings?.frequency || 'monthly'
  );
  const [newIncomeAmountType, setNewIncomeAmountType] = useState<AmountType>(
    defaultIncomeSettings?.amount_type || 'fixed'
  );
  const [newIncomePaymentMethod, setNewIncomePaymentMethod] = useState<IncomePaymentMethod>(
    defaultIncomeSettings?.payment_method || 'salary'
  );
  const [newIncomeSource, setNewIncomeSource] = useState<IncomeSource>(
    defaultIncomeSettings?.source || 'work'
  );
  const [newIncomeNotes, setNewIncomeNotes] = useState('');
  const [rememberRule, setRememberRule] = useState(true);
  const [hasExistingRule, setHasExistingRule] = useState(false);

  const loadIncomes = async () => {
    if (!supabase || !household) return;

    setLoading(true);
    let query = supabase.
    from('incomes').
    select('*').
    eq('household_id', household.id).
    order('date', { ascending: false });

    if (filterMonth) {
      query = query.eq('billing_month', filterMonth);
    }

    const { data } = await query;
    setIncomes((data ?? []) as Income[]);
    setLoading(false);
  };

  useEffect(() => {
    loadIncomes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household, filterMonth]);

  // Sync form defaults when context loads
  useEffect(() => {
    if (defaultIncomeSettings) {
      setNewIncomeFrequency(defaultIncomeSettings.frequency);
      setNewIncomeAmountType(defaultIncomeSettings.amount_type);
      setNewIncomePaymentMethod(defaultIncomeSettings.payment_method);
      setNewIncomeSource(defaultIncomeSettings.source);
    }
  }, [defaultIncomeSettings]);

  const filteredIncomes = useMemo(() => {
    const filtered = incomes.filter((income) => {
      if (searchTerm && !income.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (filterFrequency && income.frequency !== filterFrequency) return false;
      if (filterSource && income.source !== filterSource) return false;
      if (filterPaymentMethod && income.payment_method !== filterPaymentMethod) return false;
      return true;
    });

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
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [incomes, searchTerm, filterFrequency, filterSource, filterPaymentMethod, sortField, sortDirection]);

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

  const totalAmount = filteredIncomes.reduce((sum, e) => sum + Number(e.amount), 0);
  const hasActiveFilters = filterFrequency || filterSource || filterPaymentMethod || searchTerm;

  const clearFilters = () => {
    setFilterFrequency('');
    setFilterSource('');
    setFilterPaymentMethod('');
    setSearchTerm('');
  };

  const resetAddForm = () => {
    setAddStep('name');
    setNewIncomeName('');
    setNewIncomeAmount('');
    setNewIncomeDate(new Date().toISOString().split('T')[0]);
    const now = new Date();
    setNewIncomeBillingMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    setNewIncomeFrequency(defaultIncomeSettings?.frequency || 'monthly');
    setNewIncomeAmountType(defaultIncomeSettings?.amount_type || 'fixed');
    setNewIncomePaymentMethod(defaultIncomeSettings?.payment_method || 'salary');
    setNewIncomeSource(defaultIncomeSettings?.source || 'work');
    setNewIncomeNotes('');
    setRememberRule(true);
    setHasExistingRule(false);
  };

  const proceedToDetails = () => {
    if (!newIncomeName.trim()) return;

    const matchingRule = incomeRules.find(
      (rule) => rule.income_name.toLowerCase() === newIncomeName.trim().toLowerCase()
    );

    if (matchingRule) {
      setNewIncomeFrequency(matchingRule.frequency as Frequency);
      setNewIncomeAmountType(matchingRule.amount_type as AmountType);
      setNewIncomePaymentMethod(matchingRule.payment_method as IncomePaymentMethod);
      setNewIncomeSource(matchingRule.source as IncomeSource);
      setNewIncomeNotes(matchingRule.notes || '');
      setHasExistingRule(true);
    } else {
      setHasExistingRule(false);
    }

    setAddStep('details');
  };

  const handleAddIncome = async () => {
    if (!supabase || !household || !newIncomeName.trim() || !newIncomeAmount) return;

    const amount = parseFloat(newIncomeAmount);
    if (isNaN(amount)) return;

    // Save income rule if remember is checked and no existing rule
    if (rememberRule && !hasExistingRule) {
      const { error: ruleError } = await supabase.from('income_rules').upsert(
        {
          household_id: household.id,
          income_name: newIncomeName.trim(),
          frequency: newIncomeFrequency,
          amount_type: newIncomeAmountType,
          payment_method: newIncomePaymentMethod,
          source: newIncomeSource,
          notes: newIncomeNotes.trim() || null
        },
        { onConflict: 'household_id,income_name' }
      );
      if (ruleError) {
        console.error('Error saving income rule:', ruleError);
      }
    }

    const { error } = await supabase.from('incomes').insert({
      household_id: household.id,
      name: newIncomeName.trim(),
      amount: amount,
      date: newIncomeDate,
      billing_month: newIncomeBillingMonth,
      frequency: newIncomeFrequency,
      amount_type: newIncomeAmountType,
      payment_method: newIncomePaymentMethod,
      source: newIncomeSource,
      notes: newIncomeNotes.trim() || null
    });

    if (!error) {
      resetAddForm();
      setShowAddForm(false);
      await loadIncomes();
      await refreshData(); // Refresh to get updated rules
    }
  };

  const handleDelete = async (id: string) => {
    if (!supabase || !confirm('בטוח שברצונך למחוק הכנסה זו?')) return;

    await supabase.from('incomes').delete().eq('id', id);
    setIncomes((prev) => prev.filter((e) => e.id !== id));
  };

  const handleUpdateIncome = async (updatedIncome: Income) => {
    if (!supabase) return;

    const { error } = await supabase.
    from('incomes').
    update({
      name: updatedIncome.name,
      amount: updatedIncome.amount,
      date: updatedIncome.date,
      billing_month: updatedIncome.billing_month,
      frequency: updatedIncome.frequency,
      amount_type: updatedIncome.amount_type,
      payment_method: updatedIncome.payment_method,
      source: updatedIncome.source,
      notes: updatedIncome.notes || null
    }).
    eq('id', updatedIncome.id);

    if (!error) {
      setIncomes((prev) => prev.map((e) => e.id === updatedIncome.id ? updatedIncome : e));
      setEditingIncome(null);
    }
  };

  const handleExport = () => {
    const data = filteredIncomes.map((income) => ({
      'שם': income.name,
      'סכום': income.amount,
      'תאריך': income.date,
      'חודש': income.billing_month,
      'תדירות': FREQUENCY_LABELS[income.frequency as Frequency] || income.frequency,
      'סוג סכום': AMOUNT_TYPE_LABELS[income.amount_type as AmountType] || income.amount_type,
      'אמצעי תשלום': INCOME_PAYMENT_METHOD_LABELS[income.payment_method as IncomePaymentMethod] || income.payment_method,
      'מקור': INCOME_SOURCE_LABELS[income.source as IncomeSource] || income.source,
      'הערות': income.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Incomes');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'incomes.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Generate month options
  const monthOptions = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
    monthOptions.push({ value, label });
  }

  return (
    <Layout>
      <div data-ev-id="ev_7dde391492" className="md:mr-52 flex flex-col gap-6 pb-24 md:pb-6">
        {/* Header */}
        <div data-ev-id="ev_4bd65f6b3c" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div data-ev-id="ev_fa5853f4c3">
            <h2 data-ev-id="ev_c584076ed9" className="text-2xl font-bold text-foreground">רשימת הכנסות</h2>
            <p data-ev-id="ev_82e86c3d2a" className="text-muted-foreground">
              סה"כ: ₪{totalAmount.toLocaleString()} ({filteredIncomes.length} הכנסות)
            </p>
          </div>
          <div data-ev-id="ev_3199ba68ce" className="flex gap-2">
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4" />
              הכנסה חדשה
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4" />
              ייצוא
            </Button>
          </div>
        </div>

        {/* Add income form - Step 1: Name */}
        {showAddForm && addStep === 'name' &&
        <Card>
            <div data-ev-id="ev_9c8b473fee" className="flex items-center justify-between mb-4">
              <h3 data-ev-id="ev_ad82d1d360" className="text-lg font-semibold text-foreground">הוספת הכנסה חדשה</h3>
              <button data-ev-id="ev_faefafc655" onClick={() => {resetAddForm();setShowAddForm(false);}} className="p-1 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p data-ev-id="ev_a210ea6a66" className="text-muted-foreground mb-4">
              הזן את שם ההכנסה. אם קיים כלל מתאים, הסיווגים יוזנו אוטומטית.
            </p>
            <div data-ev-id="ev_44ebf7cbdd" className="max-w-md">
              <Input
              label="שם ההכנסה *"
              placeholder="לדוגמה: משכורת, שכירות..."
              value={newIncomeName}
              onChange={(e) => setNewIncomeName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && proceedToDetails()} />
            </div>
            <div data-ev-id="ev_74779fb7f2" className="flex gap-3 mt-4">
              <Button onClick={proceedToDetails} disabled={!newIncomeName.trim()}>
                המשך
              </Button>
              <Button variant="outline" onClick={() => {resetAddForm();setShowAddForm(false);}}>
                ביטול
              </Button>
            </div>
          </Card>
        }

        {/* Add income form - Step 2: Details */}
        {showAddForm && addStep === 'details' &&
        <Card>
            <div data-ev-id="ev_8360f04385" className="flex items-center justify-between mb-4">
              <div data-ev-id="ev_3009144f27">
                <h3 data-ev-id="ev_fc8c2f9ac4" className="text-lg font-semibold text-foreground">פרטי ההכנסה</h3>
                <p data-ev-id="ev_3f612b3601" className="text-muted-foreground text-sm">{newIncomeName}</p>
              </div>
              <button data-ev-id="ev_c0f8c36230" onClick={() => {resetAddForm();setShowAddForm(false);}} className="p-1 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            {incomeRules.find((r) => r.income_name.toLowerCase() === newIncomeName.trim().toLowerCase()) &&
          <div data-ev-id="ev_0ab69dab74" className="bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg p-3 mb-4 text-sm">
                ✓ נמצא כלל מתאים - הסיווגים הוזנו אוטומטית
              </div>
          }
            <div data-ev-id="ev_d10e98721e" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input
              label="סכום *"
              type="number"
              step="0.01"
              placeholder="5000.00"
              value={newIncomeAmount}
              onChange={(e) => setNewIncomeAmount(e.target.value)} />
              <Input
              label="תאריך"
              type="date"
              value={newIncomeDate}
              onChange={(e) => setNewIncomeDate(e.target.value)} />
              <Select
              label="חודש הכנסה *"
              value={newIncomeBillingMonth}
              onChange={(e) => setNewIncomeBillingMonth(e.target.value)}
              options={monthOptions} />
              <Select
              label="תדירות"
              value={newIncomeFrequency}
              onChange={(e) => setNewIncomeFrequency(e.target.value as Frequency)}
              options={Object.entries(FREQUENCY_LABELS).map(([value, label]) => ({ value, label }))} />
              <Select
              label="סוג סכום"
              value={newIncomeAmountType}
              onChange={(e) => setNewIncomeAmountType(e.target.value as AmountType)}
              options={Object.entries(AMOUNT_TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
              <Select
              label="אמצעי תשלום"
              value={newIncomePaymentMethod}
              onChange={(e) => setNewIncomePaymentMethod(e.target.value as IncomePaymentMethod)}
              options={Object.entries(INCOME_PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value, label }))} />
              <Select
              label="מקור"
              value={newIncomeSource}
              onChange={(e) => setNewIncomeSource(e.target.value as IncomeSource)}
              options={Object.entries(INCOME_SOURCE_LABELS).map(([value, label]) => ({ value, label }))} />
              <Input
              label="הערות"
              placeholder="הערה או תיאור קצר"
              value={newIncomeNotes}
              onChange={(e) => setNewIncomeNotes(e.target.value)} />
            </div>
            
            {!hasExistingRule &&
          <label data-ev-id="ev_755b6e0381" className="flex items-center gap-2 cursor-pointer mt-4">
                <input data-ev-id="ev_e37371dc47"
            type="checkbox"
            checked={rememberRule}
            onChange={(e) => setRememberRule(e.target.checked)}
            className="w-5 h-5 rounded border-border text-primary focus:ring-primary" />

                <span data-ev-id="ev_0313bb47c0" className="text-foreground">זכור להבא (סווג אוטומטית בפעם הבאה)</span>
              </label>
          }
            
            <div data-ev-id="ev_36dc287a90" className="flex gap-3 mt-4">
              <Button onClick={handleAddIncome} disabled={!newIncomeAmount}>
                שמור הכנסה
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
          <div data-ev-id="ev_a0776a10af" className="flex flex-col gap-4">
            <div data-ev-id="ev_ef4b2c374a" className="flex gap-3">
              <div data-ev-id="ev_5c24b01969" className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input data-ev-id="ev_083efe9d30"
                type="text"
                placeholder="חיפוש הכנסה..."
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
            <div data-ev-id="ev_544a42822f" className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Select
                label="חודש"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                options={[{ value: '', label: 'כל הזמנים' }, ...monthOptions]} />
                <Select
                label="תדירות"
                value={filterFrequency}
                onChange={(e) => setFilterFrequency(e.target.value)}
                options={[
                { value: '', label: 'הכל' },
                ...Object.entries(FREQUENCY_LABELS).map(([value, label]) => ({ value, label }))]
                } />
                <Select
                label="מקור"
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                options={[
                { value: '', label: 'הכל' },
                ...Object.entries(INCOME_SOURCE_LABELS).map(([value, label]) => ({ value, label }))]
                } />
                <Select
                label="אמצעי תשלום"
                value={filterPaymentMethod}
                onChange={(e) => setFilterPaymentMethod(e.target.value)}
                options={[
                { value: '', label: 'הכל' },
                ...Object.entries(INCOME_PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value, label }))]
                } />
              </div>
            }
          </div>
        </Card>

        {/* Incomes list */}
        {loading ?
        <Card className="text-center py-8">
            <div data-ev-id="ev_bdaf69f24d" className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          </Card> :
        filteredIncomes.length === 0 ?
        <Card className="text-center py-8">
              <p data-ev-id="ev_9562093b34" className="text-muted-foreground">אין הכנסות להצגה</p>
            </Card> :
        <Card variant="outlined" className="p-0 overflow-hidden">
              <div data-ev-id="ev_e90a361bef" className="overflow-x-auto">
                <table data-ev-id="ev_7c5c368122" className="w-full">
                  <thead data-ev-id="ev_1352160be8" className="bg-muted">
                    <tr data-ev-id="ev_601c65ff94">
                      <th data-ev-id="ev_8e28a548af" className="text-right p-3 text-sm font-medium text-muted-foreground">
                        <button data-ev-id="ev_602f776964" onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-foreground">
                          שם <SortIcon field="name" />
                        </button>
                      </th>
                      <th data-ev-id="ev_9ece153f12" className="text-right p-3 text-sm font-medium text-muted-foreground">
                        <button data-ev-id="ev_2b4480096d" onClick={() => handleSort('amount')} className="flex items-center gap-1 hover:text-foreground">
                          סכום <SortIcon field="amount" />
                        </button>
                      </th>
                      <th data-ev-id="ev_ac8259a32c" className="text-right p-3 text-sm font-medium text-muted-foreground hidden md:table-cell">
                        <button data-ev-id="ev_6264fd678f" onClick={() => handleSort('date')} className="flex items-center gap-1 hover:text-foreground">
                          תאריך <SortIcon field="date" />
                        </button>
                      </th>
                      <th data-ev-id="ev_c0490960a5" className="text-right p-3 text-sm font-medium text-muted-foreground hidden md:table-cell">
                        מקור
                      </th>
                      <th data-ev-id="ev_a03196849d" className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody data-ev-id="ev_253cae1675" className="divide-y divide-border">
                    {filteredIncomes.map((income) =>
                <tr data-ev-id="ev_458dfad23f" key={income.id} className="hover:bg-muted/50">
                        <td data-ev-id="ev_c3a3c8e904" className="p-3">
                          <p data-ev-id="ev_18a17d8d79" className="font-medium text-foreground">{income.name}</p>
                          {income.notes && <p data-ev-id="ev_ae15e9a257" className="text-xs text-muted-foreground">{income.notes}</p>}
                          <p data-ev-id="ev_37550ebdf0" className="text-sm text-muted-foreground md:hidden">
                            {new Date(income.date).toLocaleDateString('he-IL')}
                          </p>
                        </td>
                        <td data-ev-id="ev_80db3ee260" className="p-3 font-semibold text-green-600">
                          ₪{Number(income.amount).toLocaleString()}
                        </td>
                        <td data-ev-id="ev_e0ac8247ab" className="p-3 text-muted-foreground hidden md:table-cell">
                          {new Date(income.date).toLocaleDateString('he-IL')}
                        </td>
                        <td data-ev-id="ev_ae2e8bdc1d" className="p-3 hidden md:table-cell">
                          <span data-ev-id="ev_e04f32c0c6" className="text-foreground text-sm">
                            {INCOME_SOURCE_LABELS[income.source as IncomeSource] || income.source}
                          </span>
                        </td>
                        <td data-ev-id="ev_af655e99d1" className="p-3">
                          <div data-ev-id="ev_2f92b4daa4" className="flex gap-2 justify-end">
                            <button data-ev-id="ev_cf8fcdd959"
                      onClick={() => setEditingIncome(income)}
                      className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button data-ev-id="ev_319cc0d655"
                      onClick={() => handleDelete(income.id)}
                      className="p-2 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-500">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                )}
                  </tbody>
                </table>
              </div>
            </Card>
        }

        {/* Edit modal */}
        {editingIncome &&
        <div data-ev-id="ev_d591afb800" className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" dir="rtl">
            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div data-ev-id="ev_adb75226ee" className="flex items-center justify-between mb-4">
                <h3 data-ev-id="ev_3667cd9c03" className="text-lg font-semibold text-foreground">עריכת הכנסה</h3>
                <button data-ev-id="ev_e591162c58" onClick={() => setEditingIncome(null)} className="p-1 hover:bg-muted rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div data-ev-id="ev_20be0e565b" className="flex flex-col gap-4">
                <Input
                label="שם"
                value={editingIncome.name}
                onChange={(e) => setEditingIncome({ ...editingIncome, name: e.target.value })} />
                <Input
                label="סכום"
                type="number"
                step="0.01"
                value={String(editingIncome.amount)}
                onChange={(e) => setEditingIncome({ ...editingIncome, amount: parseFloat(e.target.value) || 0 })} />
                <Input
                label="תאריך"
                type="date"
                value={editingIncome.date}
                onChange={(e) => setEditingIncome({ ...editingIncome, date: e.target.value })} />
                <Select
                label="חודש הכנסה"
                value={editingIncome.billing_month || ''}
                onChange={(e) => setEditingIncome({ ...editingIncome, billing_month: e.target.value })}
                options={monthOptions} />
                <Select
                label="תדירות"
                value={editingIncome.frequency}
                onChange={(e) => setEditingIncome({ ...editingIncome, frequency: e.target.value as Frequency })}
                options={Object.entries(FREQUENCY_LABELS).map(([value, label]) => ({ value, label }))} />
                <Select
                label="סוג סכום"
                value={editingIncome.amount_type}
                onChange={(e) => setEditingIncome({ ...editingIncome, amount_type: e.target.value as AmountType })}
                options={Object.entries(AMOUNT_TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
                <Select
                label="אמצעי תשלום"
                value={editingIncome.payment_method}
                onChange={(e) => setEditingIncome({ ...editingIncome, payment_method: e.target.value as IncomePaymentMethod })}
                options={Object.entries(INCOME_PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value, label }))} />
                <Select
                label="מקור"
                value={editingIncome.source}
                onChange={(e) => setEditingIncome({ ...editingIncome, source: e.target.value as IncomeSource })}
                options={Object.entries(INCOME_SOURCE_LABELS).map(([value, label]) => ({ value, label }))} />
                <Input
                label="הערות"
                value={editingIncome.notes || ''}
                onChange={(e) => setEditingIncome({ ...editingIncome, notes: e.target.value })} />
                <div data-ev-id="ev_56ab8c25cf" className="flex gap-3">
                  <Button onClick={() => handleUpdateIncome(editingIncome)}>שמור</Button>
                  <Button variant="outline" onClick={() => setEditingIncome(null)}>ביטול</Button>
                </div>
              </div>
            </Card>
          </div>
        }
      </div>
    </Layout>);

}