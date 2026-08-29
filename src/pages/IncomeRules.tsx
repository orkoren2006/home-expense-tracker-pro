import { useEffect, useState, useMemo } from 'react';
import { Search, Edit2, Trash2, Plus, Download, CheckSquare, Square, Filter, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useHousehold } from '@/hooks/useHousehold';
import { supabase } from '@/integrations/supabase/client';
import type { IncomeRule, Frequency, AmountType, IncomePaymentMethod, IncomeSource } from '@/types';
import {
  FREQUENCY_LABELS,
  AMOUNT_TYPE_LABELS,
  INCOME_PAYMENT_METHOD_LABELS,
  INCOME_SOURCE_LABELS } from
'@/types';

export default function IncomeRules() {
  const { household, classificationOptions, refreshData } = useHousehold();
  const [rules, setRules] = useState<IncomeRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRule, setEditingRule] = useState<IncomeRule | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [filterFrequency, setFilterFrequency] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<'income_name' | 'source' | 'frequency'>('income_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkFrequency, setBulkFrequency] = useState('');
  const [bulkAmountType, setBulkAmountType] = useState('');
  const [bulkSource, setBulkSource] = useState('');
  const [bulkPaymentMethod, setBulkPaymentMethod] = useState('');

  // New rule form
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleFrequency, setNewRuleFrequency] = useState<Frequency>('monthly');
  const [newRuleAmountType, setNewRuleAmountType] = useState<AmountType>('fixed');
  const [newRuleSource, setNewRuleSource] = useState<IncomeSource>('work');
  const [newRulePaymentMethod, setNewRulePaymentMethod] = useState<IncomePaymentMethod>('salary');
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

  const sourceLabels = useMemo(() => {
    const map = { ...INCOME_SOURCE_LABELS };
    classificationOptions.
    filter((o) => o.option_type === 'income_source').
    forEach((o) => {map[o.value as IncomeSource] = o.label;});
    return map;
  }, [classificationOptions]);

  const paymentMethodLabels = useMemo(() => {
    const map = { ...INCOME_PAYMENT_METHOD_LABELS };
    classificationOptions.
    filter((o) => o.option_type === 'income_payment_method').
    forEach((o) => {map[o.value as IncomePaymentMethod] = o.label;});
    return map;
  }, [classificationOptions]);

  const loadRules = async () => {
    if (!supabase || !household) return;

    setLoading(true);
    const { data } = await supabase.
    from('income_rules').
    select('*').
    eq('household_id', household.id).
    order('income_name');

    setRules((data ?? []) as IncomeRule[]);
    setLoading(false);
  };

  useEffect(() => {
    loadRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household]);

  const filteredRules = useMemo(() => {
    const filtered = rules.filter((rule) => {
      if (searchTerm && !rule.income_name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (filterFrequency && rule.frequency !== filterFrequency) return false;
      if (filterSource && rule.source !== filterSource) return false;
      if (filterPaymentMethod && rule.payment_method !== filterPaymentMethod) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'income_name':
          cmp = a.income_name.localeCompare(b.income_name, 'he');
          break;
        case 'source':
          cmp = (sourceLabels[a.source] || a.source).localeCompare(sourceLabels[b.source] || b.source, 'he');
          break;
        case 'frequency':
          cmp = (frequencyLabels[a.frequency] || a.frequency).localeCompare(frequencyLabels[b.frequency] || b.frequency, 'he');
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [rules, searchTerm, filterFrequency, filterSource, filterPaymentMethod, sortField, sortDirection, sourceLabels, frequencyLabels]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: {field: typeof sortField;}) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-50" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  const hasActiveFilters = filterFrequency || filterSource || filterPaymentMethod || searchTerm;

  const clearFilters = () => {
    setFilterFrequency('');
    setFilterSource('');
    setFilterPaymentMethod('');
    setSearchTerm('');
  };

  const handleAddRule = async () => {
    if (!supabase || !household || !newRuleName.trim()) return;

    setLoading(true);
    const { error } = await supabase.from('income_rules').upsert(
      {
        household_id: household.id,
        income_name: newRuleName.trim(),
        frequency: newRuleFrequency,
        amount_type: newRuleAmountType,
        source: newRuleSource,
        payment_method: newRulePaymentMethod,
        notes: newRuleNotes.trim() || null
      },
      { onConflict: 'household_id,income_name' }
    );

    if (!error) {
      setNewRuleName('');
      setNewRuleFrequency('monthly');
      setNewRuleAmountType('fixed');
      setNewRuleSource('work');
      setNewRulePaymentMethod('salary');
      setNewRuleNotes('');
      setShowAddForm(false);
      await loadRules();
      await refreshData();
    }
    setLoading(false);
  };

  const handleUpdateRule = async (rule: IncomeRule) => {
    if (!supabase) return;

    const { error } = await supabase.
    from('income_rules').
    update({
      income_name: rule.income_name,
      frequency: rule.frequency,
      amount_type: rule.amount_type,
      source: rule.source,
      payment_method: rule.payment_method,
      notes: rule.notes || null
    }).
    eq('id', rule.id);

    if (!error) {
      setRules((prev) => prev.map((r) => r.id === rule.id ? rule : r));
      setEditingRule(null);
      await refreshData();
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!supabase || !confirm('בטוח שברצונך למחוק כלל זה?')) return;

    await supabase.from('income_rules').delete().eq('id', id);
    await loadRules();
    await refreshData();
  };

  // Bulk actions
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRules.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRules.map((r) => r.id)));
    }
  };

  const handleBulkUpdate = async () => {
    if (!supabase || selectedIds.size === 0) return;

    const updates: Partial<IncomeRule> = {};
    if (bulkFrequency) updates.frequency = bulkFrequency as Frequency;
    if (bulkAmountType) updates.amount_type = bulkAmountType as AmountType;
    if (bulkSource) updates.source = bulkSource as IncomeSource;
    if (bulkPaymentMethod) updates.payment_method = bulkPaymentMethod as IncomePaymentMethod;

    if (Object.keys(updates).length === 0) return;

    setLoading(true);
    const { error } = await supabase.
    from('income_rules').
    update(updates).
    in('id', Array.from(selectedIds));

    if (!error) {
      await loadRules();
      setSelectedIds(new Set());
      setShowBulkEdit(false);
      setBulkFrequency('');
      setBulkAmountType('');
      setBulkSource('');
      setBulkPaymentMethod('');
      await refreshData();
    }
    setLoading(false);
  };

  const handleBulkDelete = async () => {
    if (!supabase || selectedIds.size === 0) return;
    if (!confirm(`בטוח שברצונך למחוק ${selectedIds.size} כללים?`)) return;

    setLoading(true);
    await supabase.from('income_rules').delete().in('id', Array.from(selectedIds));
    await loadRules();
    setSelectedIds(new Set());
    setLoading(false);
    await refreshData();
  };

  // Export to Excel
  const handleExport = () => {
    try {
      const dataToExport = filteredRules.length > 0 ? filteredRules : rules;

      if (dataToExport.length === 0) {
        alert('אין נתונים לייצוא');
        return;
      }

      const exportData = dataToExport.map((rule) => ({
        'שם הכנסה': rule.income_name,
        'מקור': sourceLabels[rule.source] || rule.source,
        'תדירות': frequencyLabels[rule.frequency] || rule.frequency,
        'סוג סכום': amountTypeLabels[rule.amount_type] || rule.amount_type,
        'אמצעי תשלום': paymentMethodLabels[rule.payment_method] || rule.payment_method,
        'הערות': rule.notes || ''
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'כללי הכנסות');
      XLSX.writeFile(wb, `income_rules_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error('Export error:', err);
      alert('שגיאה בייצוא');
    }
  };

  return (
    <Layout>
      <div data-ev-id="ev_b495d69ef7" className="md:mr-52 flex flex-col gap-6 pb-24 md:pb-6">
        {/* Header */}
        <div data-ev-id="ev_25caf1f2a1" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div data-ev-id="ev_0c361be26f">
            <h2 data-ev-id="ev_4dff4ae45a" className="text-2xl font-bold text-foreground">כללי הכנסות</h2>
            <p data-ev-id="ev_d067d25405" className="text-muted-foreground">
              {rules.length} כללים במערכת
              {filteredRules.length !== rules.length && ` (מוצגים ${filteredRules.length})`}
            </p>
          </div>
          <div data-ev-id="ev_68ee926868" className="flex gap-2 flex-wrap">
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
            <h3 data-ev-id="ev_5d430b61fa" className="font-semibold text-foreground mb-4">הוספת כלל חדש</h3>
            <div data-ev-id="ev_e42380bc54" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input
              label="שם ההכנסה"
              placeholder="לדוגמה: משכורת"
              value={newRuleName}
              onChange={(e) => setNewRuleName(e.target.value)} />

              <Select
              label="מקור"
              value={newRuleSource}
              onChange={(e) => setNewRuleSource(e.target.value as IncomeSource)}
              options={Object.entries(sourceLabels).map(([value, label]) => ({ value, label }))} />

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
              label="אמצעי תשלום"
              value={newRulePaymentMethod}
              onChange={(e) => setNewRulePaymentMethod(e.target.value as IncomePaymentMethod)}
              options={Object.entries(paymentMethodLabels).map(([value, label]) => ({ value, label }))} />

              <Input
              label="הערות"
              placeholder="הערה או תיאור קצר"
              value={newRuleNotes}
              onChange={(e) => setNewRuleNotes(e.target.value)} />

            </div>
            <div data-ev-id="ev_b7789e55a4" className="flex gap-3 mt-4">
              <Button onClick={handleAddRule} disabled={loading || !newRuleName.trim()}>
                שמור
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                ביטול
              </Button>
            </div>
          </Card>
        }

        {/* Bulk edit panel */}
        {selectedIds.size > 0 &&
        <Card className="bg-primary/5 border-primary/20">
            <div data-ev-id="ev_1448fd8b10" className="flex flex-col gap-4">
              <div data-ev-id="ev_030ff94305" className="flex items-center justify-between">
                <span data-ev-id="ev_ba7b1fc067" className="font-semibold text-foreground">
                  {selectedIds.size} כללים נבחרו
                </span>
                <div data-ev-id="ev_48320dc7fb" className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowBulkEdit(!showBulkEdit)}>
                    עריכה מרוכזת
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleBulkDelete}>
                    <Trash2 className="w-4 h-4" />
                    מחיקה
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {showBulkEdit &&
            <div data-ev-id="ev_dfad83ef4c" className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Select
                label="מקור"
                value={bulkSource}
                onChange={(e) => setBulkSource(e.target.value)}
                options={[
                { value: '', label: 'ללא שינוי' },
                ...Object.entries(sourceLabels).map(([value, label]) => ({ value, label }))]
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
                label="אמצעי תשלום"
                value={bulkPaymentMethod}
                onChange={(e) => setBulkPaymentMethod(e.target.value)}
                options={[
                { value: '', label: 'ללא שינוי' },
                ...Object.entries(paymentMethodLabels).map(([value, label]) => ({ value, label }))]
                } />

                  <Button onClick={handleBulkUpdate} className="col-span-2 md:col-span-4">
                    עדכן נבחרים
                  </Button>
                </div>
            }
            </div>
          </Card>
        }

        {/* Search and filters */}
        <Card className="p-4">
          <div data-ev-id="ev_54b94fe02d" className="flex flex-col gap-4">
            <div data-ev-id="ev_91d1365c42" className="flex gap-3">
              <div data-ev-id="ev_a25b26fe6b" className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input data-ev-id="ev_f9eb535250"
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
              <Button variant="ghost" onClick={clearFilters}>
                  <X className="w-4 h-4" />
                  נקה
                </Button>
              }
            </div>

            {showFilters &&
            <div data-ev-id="ev_b1b336bb89" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Select
                label="מקור"
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                options={[
                { value: '', label: 'הכל' },
                ...Object.entries(sourceLabels).map(([value, label]) => ({ value, label }))]
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
                label="אמצעי תשלום"
                value={filterPaymentMethod}
                onChange={(e) => setFilterPaymentMethod(e.target.value)}
                options={[
                { value: '', label: 'הכל' },
                ...Object.entries(paymentMethodLabels).map(([value, label]) => ({ value, label }))]
                } />

              </div>
            }
          </div>
        </Card>

        {/* Rules list */}
        {loading ?
        <Card className="text-center py-8">
            <div data-ev-id="ev_596c4fb719" className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          </Card> :
        filteredRules.length === 0 ?
        <Card className="text-center py-8">
            <p data-ev-id="ev_f24cedc23b" className="text-muted-foreground">
              {rules.length === 0 ? 'אין כללים עדיין' : 'לא נמצאו כללים מתאימים'}
            </p>
          </Card> :

        <Card className="overflow-x-auto">
            <table data-ev-id="ev_8cadcd235b" className="w-full">
              <thead data-ev-id="ev_4622f28fbd">
                <tr data-ev-id="ev_c672f3829c" className="border-b border-border">
                  <th data-ev-id="ev_60fb2a68b8" className="p-3 text-right">
                    <button data-ev-id="ev_0af07aebc0" onClick={toggleSelectAll} className="p-1">
                      {selectedIds.size === filteredRules.length ?
                    <CheckSquare className="w-4 h-4 text-primary" /> :

                    <Square className="w-4 h-4 text-muted-foreground" />
                    }
                    </button>
                  </th>
                  <th data-ev-id="ev_b447b84d8d" className="p-3 text-right">
                    <button data-ev-id="ev_6b56c3b949"
                  className="flex items-center gap-1 font-semibold text-foreground hover:text-primary"
                  onClick={() => toggleSort('income_name')}>

                      שם הכנסה
                      <SortIcon field="income_name" />
                    </button>
                  </th>
                  <th data-ev-id="ev_bbfc3047ff" className="p-3 text-right">
                    <button data-ev-id="ev_bc29005211"
                  className="flex items-center gap-1 font-semibold text-foreground hover:text-primary"
                  onClick={() => toggleSort('source')}>

                      מקור
                      <SortIcon field="source" />
                    </button>
                  </th>
                  <th data-ev-id="ev_1e8b5aed68" className="p-3 text-right">
                    <button data-ev-id="ev_0a57aae7d7"
                  className="flex items-center gap-1 font-semibold text-foreground hover:text-primary"
                  onClick={() => toggleSort('frequency')}>

                      תדירות
                      <SortIcon field="frequency" />
                    </button>
                  </th>
                  <th data-ev-id="ev_8fdb3f5b52" className="p-3 text-right font-semibold text-foreground">פעולות</th>
                </tr>
              </thead>
              <tbody data-ev-id="ev_9bbb18bc18">
                {filteredRules.map((rule) =>
              <tr data-ev-id="ev_f4865002fb" key={rule.id} className="border-b border-border hover:bg-muted/50">
                    <td data-ev-id="ev_fd41cc8b40" className="p-3">
                      <button data-ev-id="ev_2d2ba42a8e"
                  onClick={() => {
                    const newSet = new Set(selectedIds);
                    if (newSet.has(rule.id)) {
                      newSet.delete(rule.id);
                    } else {
                      newSet.add(rule.id);
                    }
                    setSelectedIds(newSet);
                  }}
                  className="p-1">

                        {selectedIds.has(rule.id) ?
                    <CheckSquare className="w-4 h-4 text-primary" /> :

                    <Square className="w-4 h-4 text-muted-foreground" />
                    }
                      </button>
                    </td>
                    <td data-ev-id="ev_b98bcbf29f" className="p-3">
                      {editingRule?.id === rule.id ?
                  <Input
                    value={editingRule.income_name}
                    onChange={(e) =>
                    setEditingRule({ ...editingRule, income_name: e.target.value })
                    }
                    className="min-w-[150px]" /> :


                  <span data-ev-id="ev_75696ff7a4" className="text-foreground">{rule.income_name}</span>
                  }
                    </td>
                    <td data-ev-id="ev_c7f627c72b" className="p-3">
                      {editingRule?.id === rule.id ?
                  <Select
                    value={editingRule.source}
                    onChange={(e) =>
                    setEditingRule({ ...editingRule, source: e.target.value as IncomeSource })
                    }
                    options={Object.entries(sourceLabels).map(([value, label]) => ({ value, label }))} /> :


                  <span data-ev-id="ev_6d63482866" className="text-muted-foreground">
                          {sourceLabels[rule.source] || rule.source}
                        </span>
                  }
                    </td>
                    <td data-ev-id="ev_24d2aa9f9b" className="p-3">
                      {editingRule?.id === rule.id ?
                  <Select
                    value={editingRule.frequency}
                    onChange={(e) =>
                    setEditingRule({ ...editingRule, frequency: e.target.value as Frequency })
                    }
                    options={Object.entries(frequencyLabels).map(([value, label]) => ({ value, label }))} /> :


                  <span data-ev-id="ev_b19ec2781d" className="text-muted-foreground">
                          {frequencyLabels[rule.frequency] || rule.frequency}
                        </span>
                  }
                    </td>
                    <td data-ev-id="ev_bcde58e63c" className="p-3">
                      <div data-ev-id="ev_232913c458" className="flex gap-2 justify-end">
                        {editingRule?.id === rule.id ?
                    <>
                            <Button size="sm" onClick={() => handleUpdateRule(editingRule)}>
                              שמור
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingRule(null)}>
                              ביטול
                            </Button>
                          </> :

                    <>
                            <button data-ev-id="ev_ec1a17966d"
                      onClick={() => setEditingRule(rule)}
                      className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground">

                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button data-ev-id="ev_2c91e4fd7b"
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-2 hover:bg-red-50 rounded-lg text-muted-foreground hover:text-red-600">

                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                    }
                      </div>
                    </td>
                  </tr>
              )}
              </tbody>
            </table>
          </Card>
        }
      </div>
    </Layout>);

}