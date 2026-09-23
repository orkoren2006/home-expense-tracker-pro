import { useEffect, useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { useHousehold } from '@/hooks/useHousehold';
import { supabase } from '@/integrations/supabase/client';
import type { Expense, Income, Category } from '@/types';
import {
  PAYMENT_METHOD_LABELS,
  EXPENSE_TYPE_LABELS,
  INCOME_SOURCE_LABELS } from
'@/types';
import { Calculator, TrendingDown, TrendingUp, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';

type TabType = 'expenses' | 'incomes';

interface FilterState {
  categories: string[];
  expenseTypes: string[];
  paymentMethods: string[];
  incomeSources: string[];
}

export default function Analytics() {
  const { household, categories, classificationOptions } = useHousehold();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('expenses');

  // Data
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);

  // Month range
  const [rangeStart, setRangeStart] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [rangeEnd, setRangeEnd] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Filters
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    expenseTypes: [],
    paymentMethods: [],
    incomeSources: []
  });

  // Dropdown states
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Build label maps including custom classification options
  const paymentMethodLabels: Record<string, string> = useMemo(() => {
    const labels = { ...PAYMENT_METHOD_LABELS };
    (classificationOptions ?? []).forEach((opt) => {
      if (opt.option_type === 'payment_method') {
        labels[opt.value] = opt.label;
      }
    });
    return labels;
  }, [classificationOptions]);

  const incomeSourceLabels: Record<string, string> = useMemo(() => {
    const labels = { ...INCOME_SOURCE_LABELS };
    (classificationOptions ?? []).forEach((opt) => {
      if (opt.option_type === 'income_source') {
        labels[opt.value] = opt.label;
      }
    });
    return labels;
  }, [classificationOptions]);

  // Load data
  useEffect(() => {
    if (!supabase || !household) return;

    const loadData = async () => {
      setLoading(true);

      const [expensesRes, incomesRes] = await Promise.all([
      supabase.
      from('expenses').
      select('*').
      eq('household_id', household.id).
      gte('billing_month', rangeStart).
      lte('billing_month', rangeEnd).
      order('billing_month'),
      supabase.
      from('incomes').
      select('*').
      eq('household_id', household.id).
      gte('billing_month', rangeStart).
      lte('billing_month', rangeEnd).
      order('billing_month')]
      );

      setExpenses((expensesRes.data ?? []) as Expense[]);
      setIncomes((incomesRes.data ?? []) as Income[]);
      setLoading(false);
    };

    loadData();
  }, [household, rangeStart, rangeEnd]);

  // Helper to format month string (YYYY-MM) to Hebrew
  const formatMonthStr = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  // Category name lookup (memoized)
  const getCategoryName = useMemo(() => {
    return (categoryId?: string) => {
      if (!categoryId) return 'ללא קטגוריה';
      const cat = (categories ?? []).find((c) => c.id === categoryId);
      return cat?.name ?? 'לא ידוע';
    };
  }, [categories]);

  // Get unique values for filters
  const uniqueCategories = useMemo(() => {
    const catIds = new Set(expenses.map((e) => e.category_id).filter(Boolean));
    return Array.from(catIds).map((id) => ({
      id: id as string,
      name: getCategoryName(id as string)
    }));
  }, [expenses, getCategoryName]);

  const uniqueExpenseTypes = Object.entries(EXPENSE_TYPE_LABELS).map(([key, label]) => ({
    id: key,
    name: label
  }));

  const uniquePaymentMethods = useMemo(() => {
    const methods = new Set(expenses.map((e) => e.payment_method));
    return Array.from(methods).map((m) => ({
      id: m,
      name: paymentMethodLabels[m] || m
    }));
  }, [expenses, paymentMethodLabels]);

  const uniqueIncomeSources = useMemo(() => {
    const sources = new Set(incomes.map((i) => i.source));
    return Array.from(sources).map((s) => ({
      id: s,
      name: incomeSourceLabels[s] || s
    }));
  }, [incomes, incomeSourceLabels]);

  // Filter toggle functions
  const toggleFilter = (filterType: keyof FilterState, value: string) => {
    setFilters((prev) => {
      const current = prev[filterType];
      const updated = current.includes(value) ?
      current.filter((v) => v !== value) :
      [...current, value];
      return { ...prev, [filterType]: updated };
    });
  };

  const clearFilters = () => {
    setFilters({
      categories: [],
      expenseTypes: [],
      paymentMethods: [],
      incomeSources: []
    });
  };

  // Filtered data
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (filters.categories.length > 0 && !filters.categories.includes(e.category_id ?? '')) {
        return false;
      }
      if (filters.expenseTypes.length > 0 && !filters.expenseTypes.includes(e.expense_type)) {
        return false;
      }
      if (filters.paymentMethods.length > 0 && !filters.paymentMethods.includes(e.payment_method)) {
        return false;
      }
      return true;
    });
  }, [expenses, filters]);

  const filteredIncomes = useMemo(() => {
    return incomes.filter((i) => {
      if (filters.incomeSources.length > 0 && !filters.incomeSources.includes(i.source)) {
        return false;
      }
      return true;
    });
  }, [incomes, filters]);

  // Calculate stats
  const expenseStats = useMemo(() => {
    const total = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const count = filteredExpenses.length;
    const amounts = filteredExpenses.map((e) => Number(e.amount));
    const avg = count > 0 ? total / count : 0;
    const highest = amounts.length > 0 ? Math.max(...amounts) : 0;
    const lowest = amounts.length > 0 ? Math.min(...amounts) : 0;

    // Group by month
    const byMonth: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      byMonth[e.billing_month ?? ''] = (byMonth[e.billing_month ?? ''] || 0) + Number(e.amount);
    });
    const monthTotals = Object.entries(byMonth).map(([month, amount]) => ({ month, amount }));
    const sortedMonths = [...monthTotals].sort((a, b) => b.amount - a.amount);
    const highestMonth = sortedMonths[0] || null;
    const lowestMonth = sortedMonths[sortedMonths.length - 1] || null;
    const monthCount = Object.keys(byMonth).length;
    const avgMonthly = monthCount > 0 ? total / monthCount : 0;

    // Group by category
    const byCategory: Record<string, {count: number;total: number;amounts: number[];}> = {};
    filteredExpenses.forEach((e) => {
      const catId = e.category_id ?? 'uncategorized';
      if (!byCategory[catId]) {
        byCategory[catId] = { count: 0, total: 0, amounts: [] };
      }
      byCategory[catId].count += 1;
      byCategory[catId].total += Number(e.amount);
      byCategory[catId].amounts.push(Number(e.amount));
    });

    const categoryBreakdown = Object.entries(byCategory).map(([catId, data]) => ({
      categoryId: catId,
      categoryName: catId === 'uncategorized' ? 'ללא קטגוריה' : getCategoryName(catId),
      count: data.count,
      total: data.total,
      avg: data.count > 0 ? data.total / data.count : 0,
      highest: Math.max(...data.amounts),
      lowest: Math.min(...data.amounts)
    })).sort((a, b) => b.total - a.total);

    return {
      total,
      count,
      avg,
      highest,
      lowest,
      highestMonth,
      lowestMonth,
      avgMonthly,
      categoryBreakdown
    };
  }, [filteredExpenses, getCategoryName]);

  const incomeStats = useMemo(() => {
    const total = filteredIncomes.reduce((sum, i) => sum + Number(i.amount), 0);
    const count = filteredIncomes.length;
    const amounts = filteredIncomes.map((i) => Number(i.amount));
    const avg = count > 0 ? total / count : 0;
    const highest = amounts.length > 0 ? Math.max(...amounts) : 0;
    const lowest = amounts.length > 0 ? Math.min(...amounts) : 0;

    // Group by month
    const byMonth: Record<string, number> = {};
    filteredIncomes.forEach((i) => {
      byMonth[i.billing_month ?? ''] = (byMonth[i.billing_month ?? ''] || 0) + Number(i.amount);
    });
    const monthTotals = Object.entries(byMonth).map(([month, amount]) => ({ month, amount }));
    const sortedMonths = [...monthTotals].sort((a, b) => b.amount - a.amount);
    const highestMonth = sortedMonths[0] || null;
    const lowestMonth = sortedMonths[sortedMonths.length - 1] || null;
    const monthCount = Object.keys(byMonth).length;
    const avgMonthly = monthCount > 0 ? total / monthCount : 0;

    // Group by source
    const bySource: Record<string, {count: number;total: number;amounts: number[];}> = {};
    filteredIncomes.forEach((i) => {
      const source = i.source;
      if (!bySource[source]) {
        bySource[source] = { count: 0, total: 0, amounts: [] };
      }
      bySource[source].count += 1;
      bySource[source].total += Number(i.amount);
      bySource[source].amounts.push(Number(i.amount));
    });

    const sourceBreakdown = Object.entries(bySource).map(([source, data]) => ({
      source,
      sourceName: incomeSourceLabels[source] || source,
      count: data.count,
      total: data.total,
      avg: data.count > 0 ? data.total / data.count : 0,
      highest: Math.max(...data.amounts),
      lowest: Math.min(...data.amounts)
    })).sort((a, b) => b.total - a.total);

    return {
      total,
      count,
      avg,
      highest,
      lowest,
      highestMonth,
      lowestMonth,
      avgMonthly,
      sourceBreakdown
    };
  }, [filteredIncomes, incomeSourceLabels]);

  // Dropdown component
  const FilterDropdown = ({
    id,
    label,
    options,
    selected,
    onToggle






  }: {id: string;label: string;options: {id: string;name: string;}[];selected: string[];onToggle: (value: string) => void;}) => {
    const isOpen = openDropdown === id;
    return (
      <div data-ev-id="ev_8aacc8b60b" className="relative">
        <button data-ev-id="ev_a2534a1269"
        onClick={() => setOpenDropdown(isOpen ? null : id)}
        className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
        selected.length > 0 ?
        'bg-primary/10 border-primary text-primary' :
        'border-border hover:bg-muted'}`
        }>

          <span data-ev-id="ev_3c120eab0b">{label}</span>
          {selected.length > 0 &&
          <span data-ev-id="ev_e9d9617a09" className="bg-primary text-primary-foreground px-1.5 py-0.5 rounded text-xs">
              {selected.length}
            </span>
          }
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {isOpen &&
        <div data-ev-id="ev_9cf25a693d" className="absolute top-full mt-1 right-0 bg-card border border-border rounded-lg shadow-lg p-2 z-20 min-w-[200px] max-h-[300px] overflow-y-auto">
            {options.map((opt) =>
          <label data-ev-id="ev_bfc5469f2c"
          key={opt.id}
          className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer">

                <input data-ev-id="ev_76350f3038"
            type="checkbox"
            checked={selected.includes(opt.id)}
            onChange={() => onToggle(opt.id)}
            className="rounded border-border" />

                <span data-ev-id="ev_168a23ed85" className="text-sm">{opt.name}</span>
              </label>
          )}
            {options.length === 0 &&
          <p data-ev-id="ev_9eb288ff3a" className="text-sm text-muted-foreground p-2">אין אפשרויות</p>
          }
          </div>
        }
      </div>);

  };

  const hasActiveFilters =
  filters.categories.length > 0 ||
  filters.expenseTypes.length > 0 ||
  filters.paymentMethods.length > 0 ||
  filters.incomeSources.length > 0;

  return (
    <Layout>
      <div data-ev-id="ev_709ccebfff" className="md:mr-52 flex flex-col gap-6 pb-24 md:pb-6">
        {/* Header */}
        <div data-ev-id="ev_26476b596f" className="flex items-center justify-between">
          <div data-ev-id="ev_d2f53ba9df" className="flex items-center gap-3">
            <Calculator className="w-6 h-6 text-primary" />
            <h2 data-ev-id="ev_29ec61f0ee" className="text-2xl font-bold text-foreground">חישובים מתקדמים</h2>
          </div>
        </div>

        {/* Month range selector */}
        <Card>
          <div data-ev-id="ev_52816fcb5a" className="flex flex-wrap items-center gap-4">
            <div data-ev-id="ev_b2e8447f02" className="flex items-center gap-2">
              <label data-ev-id="ev_e59db731af" className="text-sm text-muted-foreground">מחודש:</label>
              <input data-ev-id="ev_4f35ac2ea0"
              type="month"
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value)}
              className="px-3 py-2 border border-border rounded-md bg-background text-sm" />

            </div>
            <div data-ev-id="ev_ab10b654c9" className="flex items-center gap-2">
              <label data-ev-id="ev_f8fb793e83" className="text-sm text-muted-foreground">עד חודש:</label>
              <input data-ev-id="ev_e15c40ea51"
              type="month"
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
              className="px-3 py-2 border border-border rounded-md bg-background text-sm" />

            </div>
            {/* Quick selections */}
            <div data-ev-id="ev_cfe4e99ab5" className="flex gap-2">
              <button data-ev-id="ev_2d12e9532c"
              onClick={() => {
                const now = new Date();
                const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
                setRangeStart(`${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`);
                setRangeEnd(end);
              }}
              className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-sm rounded-md">

                3 חודשים
              </button>
              <button data-ev-id="ev_6b34f1a144"
              onClick={() => {
                const now = new Date();
                const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
                setRangeStart(`${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`);
                setRangeEnd(end);
              }}
              className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-sm rounded-md">

                6 חודשים
              </button>
              <button data-ev-id="ev_4246683c0e"
              onClick={() => {
                const now = new Date();
                const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
                setRangeStart(`${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`);
                setRangeEnd(end);
              }}
              className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-sm rounded-md">

                12 חודשים
              </button>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div data-ev-id="ev_3dda29b954" className="flex gap-2 border-b border-border">
          <button data-ev-id="ev_37e63c08dd"
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
          activeTab === 'expenses' ?
          'border-primary text-primary' :
          'border-transparent text-muted-foreground hover:text-foreground'}`
          }>

            <div data-ev-id="ev_a95edf52f5" className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              הוצאות
            </div>
          </button>
          <button data-ev-id="ev_7ec34cb77f"
          onClick={() => setActiveTab('incomes')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
          activeTab === 'incomes' ?
          'border-primary text-primary' :
          'border-transparent text-muted-foreground hover:text-foreground'}`
          }>

            <div data-ev-id="ev_e55064845b" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              הכנסות
            </div>
          </button>
        </div>

        {/* Filters */}
        <Card>
          <div data-ev-id="ev_694bbe7085" className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span data-ev-id="ev_331b7aeea4" className="text-sm font-medium">סינון</span>
            {hasActiveFilters &&
            <button data-ev-id="ev_84237f0332"
            onClick={clearFilters}
            className="text-xs text-primary hover:underline flex items-center gap-1 mr-auto">

                <X className="w-3 h-3" />
                נקה הכל
              </button>
            }
          </div>
          <div data-ev-id="ev_e2970f7d83" className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
            {activeTab === 'expenses' &&
            <>
                <FilterDropdown
                id="categories"
                label="קטגוריה"
                options={uniqueCategories}
                selected={filters.categories}
                onToggle={(v) => toggleFilter('categories', v)} />

                <FilterDropdown
                id="expenseTypes"
                label="סוג הוצאה"
                options={uniqueExpenseTypes}
                selected={filters.expenseTypes}
                onToggle={(v) => toggleFilter('expenseTypes', v)} />

                <FilterDropdown
                id="paymentMethods"
                label="אמצעי תשלום"
                options={uniquePaymentMethods}
                selected={filters.paymentMethods}
                onToggle={(v) => toggleFilter('paymentMethods', v)} />

              </>
            }
            {activeTab === 'incomes' &&
            <FilterDropdown
              id="incomeSources"
              label="מקור הכנסה"
              options={uniqueIncomeSources}
              selected={filters.incomeSources}
              onToggle={(v) => toggleFilter('incomeSources', v)} />

            }
          </div>
        </Card>

        {loading ?
        <div data-ev-id="ev_b904094fdc" className="flex justify-center py-12">
            <div data-ev-id="ev_2de207798e" className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div> :

        <>
            {/* Expenses tab content */}
            {activeTab === 'expenses' &&
          <div data-ev-id="ev_c8488d9735" className="flex flex-col gap-4">
                {/* Summary cards */}
                <div data-ev-id="ev_46b45f1f6a" className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="flex flex-col gap-1">
                    <span data-ev-id="ev_b8f492c97b" className="text-xs text-muted-foreground">סה"כ הוצאות</span>
                    <p data-ev-id="ev_ab142b6ece" className="text-xl font-bold text-red-600">
                      ₪{expenseStats.total.toLocaleString()}
                    </p>
                    <span data-ev-id="ev_7da9595ed3" className="text-xs text-muted-foreground">{expenseStats.count} פריטים</span>
                  </Card>
                  <Card className="flex flex-col gap-1">
                    <span data-ev-id="ev_18481c8b05" className="text-xs text-muted-foreground">ממוצע חודשי</span>
                    <p data-ev-id="ev_41c64f7a84" className="text-xl font-bold text-foreground">
                      ₪{Math.round(expenseStats.avgMonthly).toLocaleString()}
                    </p>
                  </Card>
                  <Card className="flex flex-col gap-1">
                    <span data-ev-id="ev_c5143cb1c3" className="text-xs text-muted-foreground">החודש הגבוה ביותר</span>
                    <p data-ev-id="ev_34abc0277d" className="text-lg font-bold text-red-600">
                      {expenseStats.highestMonth ?
                  <>
                          ₪{expenseStats.highestMonth.amount.toLocaleString()}
                          <span data-ev-id="ev_1a205aae61" className="text-xs text-muted-foreground font-normal block">
                            {formatMonthStr(expenseStats.highestMonth.month)}
                          </span>
                        </> :
                  '-'}
                    </p>
                  </Card>
                  <Card className="flex flex-col gap-1">
                    <span data-ev-id="ev_e13afe2c56" className="text-xs text-muted-foreground">החודש הנמוך ביותר</span>
                    <p data-ev-id="ev_cb0fb9da0d" className="text-lg font-bold text-green-600">
                      {expenseStats.lowestMonth ?
                  <>
                          ₪{expenseStats.lowestMonth.amount.toLocaleString()}
                          <span data-ev-id="ev_67fe8d4df0" className="text-xs text-muted-foreground font-normal block">
                            {formatMonthStr(expenseStats.lowestMonth.month)}
                          </span>
                        </> :
                  '-'}
                    </p>
                  </Card>
                </div>

                {/* Category breakdown table */}
                <Card>
                  <h3 data-ev-id="ev_ac52f5bfa7" className="font-semibold text-foreground mb-3">פירוט לפי קטגוריה</h3>
                  {expenseStats.categoryBreakdown.length > 0 ?
              <div data-ev-id="ev_dcf86e9630" className="overflow-x-auto">
                      <table data-ev-id="ev_2429049d8a" className="w-full text-sm">
                        <thead data-ev-id="ev_2ff028848b">
                          <tr data-ev-id="ev_7fffc85ce1" className="border-b border-border">
                            <th data-ev-id="ev_a03776001e" className="text-right py-2 px-2 font-medium text-muted-foreground">קטגוריה</th>
                            <th data-ev-id="ev_6be948765b" className="text-right py-2 px-2 font-medium text-muted-foreground">מספר</th>
                            <th data-ev-id="ev_1f089bacb1" className="text-right py-2 px-2 font-medium text-muted-foreground">סה"כ</th>
                            <th data-ev-id="ev_0432a89edf" className="text-right py-2 px-2 font-medium text-muted-foreground">ממוצע</th>
                            <th data-ev-id="ev_2654df38f2" className="text-right py-2 px-2 font-medium text-muted-foreground">גבוה</th>
                            <th data-ev-id="ev_53bf02a74d" className="text-right py-2 px-2 font-medium text-muted-foreground">נמוך</th>
                          </tr>
                        </thead>
                        <tbody data-ev-id="ev_67876e85cc">
                          {expenseStats.categoryBreakdown.map((cat) =>
                    <tr data-ev-id="ev_c76b358b28" key={cat.categoryId} className="border-b border-border/50 hover:bg-muted/30">
                              <td data-ev-id="ev_d3526ec0d1" className="py-2 px-2 font-medium">{cat.categoryName}</td>
                              <td data-ev-id="ev_92b9e658ac" className="py-2 px-2 text-muted-foreground">{cat.count}</td>
                              <td data-ev-id="ev_2de462f3cc" className="py-2 px-2 text-red-600 font-medium">₪{cat.total.toLocaleString()}</td>
                              <td data-ev-id="ev_7e3e9c52df" className="py-2 px-2">₪{Math.round(cat.avg).toLocaleString()}</td>
                              <td data-ev-id="ev_b032f4acdc" className="py-2 px-2">₪{cat.highest.toLocaleString()}</td>
                              <td data-ev-id="ev_cb32dc9978" className="py-2 px-2">₪{cat.lowest.toLocaleString()}</td>
                            </tr>
                    )}
                        </tbody>
                      </table>
                    </div> :

              <p data-ev-id="ev_709d398d62" className="text-muted-foreground text-center py-4">אין נתונים להצגה</p>
              }
                </Card>
              </div>
          }

            {/* Incomes tab content */}
            {activeTab === 'incomes' &&
          <div data-ev-id="ev_340a0207fa" className="flex flex-col gap-4">
                {/* Summary cards */}
                <div data-ev-id="ev_e764b67e29" className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="flex flex-col gap-1">
                    <span data-ev-id="ev_b3becf9db7" className="text-xs text-muted-foreground">סה"כ הכנסות</span>
                    <p data-ev-id="ev_d196f452a3" className="text-xl font-bold text-green-600">
                      ₪{incomeStats.total.toLocaleString()}
                    </p>
                    <span data-ev-id="ev_51c600e028" className="text-xs text-muted-foreground">{incomeStats.count} פריטים</span>
                  </Card>
                  <Card className="flex flex-col gap-1">
                    <span data-ev-id="ev_f3c7df4325" className="text-xs text-muted-foreground">ממוצע חודשי</span>
                    <p data-ev-id="ev_79b2a4fb47" className="text-xl font-bold text-foreground">
                      ₪{Math.round(incomeStats.avgMonthly).toLocaleString()}
                    </p>
                  </Card>
                  <Card className="flex flex-col gap-1">
                    <span data-ev-id="ev_b831143d37" className="text-xs text-muted-foreground">החודש הגבוה ביותר</span>
                    <p data-ev-id="ev_21444ca77d" className="text-lg font-bold text-green-600">
                      {incomeStats.highestMonth ?
                  <>
                          ₪{incomeStats.highestMonth.amount.toLocaleString()}
                          <span data-ev-id="ev_5fda1b3e7d" className="text-xs text-muted-foreground font-normal block">
                            {formatMonthStr(incomeStats.highestMonth.month)}
                          </span>
                        </> :
                  '-'}
                    </p>
                  </Card>
                  <Card className="flex flex-col gap-1">
                    <span data-ev-id="ev_7ef896b21e" className="text-xs text-muted-foreground">החודש הנמוך ביותר</span>
                    <p data-ev-id="ev_5381430e7c" className="text-lg font-bold text-red-600">
                      {incomeStats.lowestMonth ?
                  <>
                          ₪{incomeStats.lowestMonth.amount.toLocaleString()}
                          <span data-ev-id="ev_d6e61e826b" className="text-xs text-muted-foreground font-normal block">
                            {formatMonthStr(incomeStats.lowestMonth.month)}
                          </span>
                        </> :
                  '-'}
                    </p>
                  </Card>
                </div>

                {/* Source breakdown table */}
                <Card>
                  <h3 data-ev-id="ev_6878df55b8" className="font-semibold text-foreground mb-3">פירוט לפי מקור הכנסה</h3>
                  {incomeStats.sourceBreakdown.length > 0 ?
              <div data-ev-id="ev_67b4d4d252" className="overflow-x-auto">
                      <table data-ev-id="ev_55b4a55fae" className="w-full text-sm">
                        <thead data-ev-id="ev_4abf767e68">
                          <tr data-ev-id="ev_b345eae272" className="border-b border-border">
                            <th data-ev-id="ev_91e72ae330" className="text-right py-2 px-2 font-medium text-muted-foreground">מקור</th>
                            <th data-ev-id="ev_a338c86ec1" className="text-right py-2 px-2 font-medium text-muted-foreground">מספר</th>
                            <th data-ev-id="ev_232686ffc8" className="text-right py-2 px-2 font-medium text-muted-foreground">סה"כ</th>
                            <th data-ev-id="ev_a6cd37aa7b" className="text-right py-2 px-2 font-medium text-muted-foreground">ממוצע</th>
                            <th data-ev-id="ev_84ea59d4b6" className="text-right py-2 px-2 font-medium text-muted-foreground">גבוה</th>
                            <th data-ev-id="ev_880c8f10ee" className="text-right py-2 px-2 font-medium text-muted-foreground">נמוך</th>
                          </tr>
                        </thead>
                        <tbody data-ev-id="ev_9ece14c612">
                          {incomeStats.sourceBreakdown.map((src) =>
                    <tr data-ev-id="ev_31d88fd52a" key={src.source} className="border-b border-border/50 hover:bg-muted/30">
                              <td data-ev-id="ev_96ee43d00e" className="py-2 px-2 font-medium">{src.sourceName}</td>
                              <td data-ev-id="ev_bff2158230" className="py-2 px-2 text-muted-foreground">{src.count}</td>
                              <td data-ev-id="ev_d6d4925f61" className="py-2 px-2 text-green-600 font-medium">₪{src.total.toLocaleString()}</td>
                              <td data-ev-id="ev_fb949c766c" className="py-2 px-2">₪{Math.round(src.avg).toLocaleString()}</td>
                              <td data-ev-id="ev_bde58a31a8" className="py-2 px-2">₪{src.highest.toLocaleString()}</td>
                              <td data-ev-id="ev_9ff27c819f" className="py-2 px-2">₪{src.lowest.toLocaleString()}</td>
                            </tr>
                    )}
                        </tbody>
                      </table>
                    </div> :

              <p data-ev-id="ev_f5131d4a6c" className="text-muted-foreground text-center py-4">אין נתונים להצגה</p>
              }
                </Card>
              </div>
          }
          </>
        }
      </div>

      {/* Click outside to close dropdowns */}
      {openDropdown &&
      <div data-ev-id="ev_3f12628a93"
      className="fixed inset-0 z-10"
      onClick={() => setOpenDropdown(null)} />

      }
    </Layout>);

}