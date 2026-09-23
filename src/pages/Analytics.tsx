import { useEffect, useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { useHousehold } from '@/hooks/useHousehold';
import { supabase } from '@/integrations/supabase/client';
import { MonthPicker } from '@/components/MonthPicker';
import { formatMonthHebrew } from '@/lib/constants';
import type { Expense, Income } from '@/types';
import {
  PAYMENT_METHOD_LABELS,
  EXPENSE_TYPE_LABELS,
  INCOME_SOURCE_LABELS } from
'@/types';
import { Calculator, TrendingDown, TrendingUp, Filter, X, ChevronDown, ChevronUp, ChevronRight, ChevronLeft, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

type TabType = 'expenses' | 'incomes';
type SortField = 'categoryName' | 'count' | 'total' | 'avg' | 'highest' | 'lowest' | 'sourceName';
type SortDir = 'asc' | 'desc';

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
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [showRangeModal, setShowRangeModal] = useState(false);

  // Current single month for navigation
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Sorting
  const [expenseSortField, setExpenseSortField] = useState<SortField>('total');
  const [expenseSortDir, setExpenseSortDir] = useState<SortDir>('desc');
  const [incomeSortField, setIncomeSortField] = useState<SortField>('total');
  const [incomeSortDir, setIncomeSortDir] = useState<SortDir>('desc');

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

  // Get effective date range based on mode
  const effectiveRange = useMemo(() => {
    if (isRangeMode) {
      return { start: rangeStart, end: rangeEnd };
    } else {
      const month = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`;
      return { start: month, end: month };
    }
  }, [isRangeMode, rangeStart, rangeEnd, selectedMonth]);

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
      gte('billing_month', effectiveRange.start).
      lte('billing_month', effectiveRange.end).
      order('billing_month'),
      supabase.
      from('incomes').
      select('*').
      eq('household_id', household.id).
      gte('billing_month', effectiveRange.start).
      lte('billing_month', effectiveRange.end).
      order('billing_month')]
      );

      setExpenses((expensesRes.data ?? []) as Expense[]);
      setIncomes((incomesRes.data ?? []) as Income[]);
      setLoading(false);
    };

    loadData();
  }, [household, effectiveRange]);

  // Navigation functions
  const goToPrevMonth = () => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const selectLastNMonths = (n: number) => {
    const now = new Date();
    const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const start = new Date(now.getFullYear(), now.getMonth() - n + 1, 1);
    const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
    setRangeStart(startStr);
    setRangeEnd(end);
    setIsRangeMode(true);
    setShowRangeModal(false);
  };

  const exitRangeMode = () => {
    setIsRangeMode(false);
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
    }));

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

  // Sorted category breakdown
  const sortedCategoryBreakdown = useMemo(() => {
    const sorted = [...expenseStats.categoryBreakdown];
    sorted.sort((a, b) => {
      const aVal = a[expenseSortField as keyof typeof a];
      const bVal = b[expenseSortField as keyof typeof b];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return expenseSortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return expenseSortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return sorted;
  }, [expenseStats.categoryBreakdown, expenseSortField, expenseSortDir]);

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
    }));

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

  // Sorted source breakdown
  const sortedSourceBreakdown = useMemo(() => {
    const sorted = [...incomeStats.sourceBreakdown];
    sorted.sort((a, b) => {
      const aVal = a[incomeSortField as keyof typeof a];
      const bVal = b[incomeSortField as keyof typeof b];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return incomeSortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return incomeSortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return sorted;
  }, [incomeStats.sourceBreakdown, incomeSortField, incomeSortDir]);

  // Sort header component
  const SortHeader = ({ field, label, sortField, sortDir, onSort





  }: {field: SortField;label: string;sortField: SortField;sortDir: SortDir;onSort: (field: SortField) => void;}) =>
  <th data-ev-id="ev_093507fba5"
  className="text-right py-2 px-2 font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
  onClick={() => onSort(field)}>

      <div data-ev-id="ev_e0b134dc66" className="flex items-center gap-1">
        <span data-ev-id="ev_7abd32244c">{label}</span>
        {sortField === field ?
      sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" /> :

      <ArrowUpDown className="w-3 h-3 opacity-30" />
      }
      </div>
    </th>;


  const handleExpenseSort = (field: SortField) => {
    if (expenseSortField === field) {
      setExpenseSortDir(expenseSortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setExpenseSortField(field);
      setExpenseSortDir('desc');
    }
  };

  const handleIncomeSort = (field: SortField) => {
    if (incomeSortField === field) {
      setIncomeSortDir(incomeSortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setIncomeSortField(field);
      setIncomeSortDir('desc');
    }
  };

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
      <div data-ev-id="ev_ccd735a871" className="relative">
        <button data-ev-id="ev_dd3792ceac"
        onClick={() => setOpenDropdown(isOpen ? null : id)}
        className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
        selected.length > 0 ?
        'bg-primary/10 border-primary text-primary' :
        'border-border hover:bg-muted'}`
        }>

          <span data-ev-id="ev_a2517e7d55">{label}</span>
          {selected.length > 0 &&
          <span data-ev-id="ev_56a2d6ee19" className="bg-primary text-primary-foreground px-1.5 py-0.5 rounded text-xs">
              {selected.length}
            </span>
          }
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {isOpen &&
        <div data-ev-id="ev_8a74595f78" className="absolute top-full mt-1 right-0 bg-card border border-border rounded-lg shadow-lg p-2 z-20 min-w-[200px] max-h-[300px] overflow-y-auto">
            {options.map((opt) =>
          <label data-ev-id="ev_c3f025bfb6"
          key={opt.id}
          className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer">

                <input data-ev-id="ev_6a116b9a8e"
            type="checkbox"
            checked={selected.includes(opt.id)}
            onChange={() => onToggle(opt.id)}
            className="rounded border-border" />

                <span data-ev-id="ev_8bb8a53f7d" className="text-sm">{opt.name}</span>
              </label>
          )}
            {options.length === 0 &&
          <p data-ev-id="ev_b03c94dadb" className="text-sm text-muted-foreground p-2">אין אפשרויות</p>
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

  const monthName = selectedMonth.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  const rangeDisplayName = isRangeMode ?
  `${formatMonthHebrew(rangeStart)} - ${formatMonthHebrew(rangeEnd)}` :
  monthName;

  // Format amount - positive values without minus, negative (credits) in green with minus on left
  const formatAmount = (amount: number, isCredit = false) => {
    const absAmount = Math.abs(amount);
    if (amount < 0 || isCredit) {
      return <span data-ev-id="ev_fa87bb70be" className="text-green-600">₪{absAmount.toLocaleString()}−</span>;
    }
    return <>₪{absAmount.toLocaleString()}</>;
  };

  return (
    <Layout>
      <div data-ev-id="ev_356111919e" className="md:mr-52 flex flex-col gap-6 pb-24 md:pb-6">
        {/* Header */}
        <div data-ev-id="ev_658e4c87e5" className="flex items-center justify-between">
          <div data-ev-id="ev_c3b4c73090" className="flex items-center gap-3">
            <Calculator className="w-6 h-6 text-primary" />
            <h2 data-ev-id="ev_b36aeab057" className="text-2xl font-bold text-foreground">חישובים מתקדמים</h2>
          </div>
        </div>

        {/* Sticky month navigation - same style as Home */}
        <div data-ev-id="ev_6abf37a2ab" className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-2 -mx-4 px-4 md:-mx-6 md:px-6">
          <div data-ev-id="ev_282e0b96ef" className="flex items-center justify-center gap-2 bg-card border border-border rounded-lg p-2 shadow-sm">
            {!isRangeMode &&
            <>
                <button data-ev-id="ev_438db048b2"
              onClick={goToNextMonth}
              className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
              title="חודש הבא">

                  <ChevronRight className="w-5 h-5" />
                </button>
                <span data-ev-id="ev_215ff40dce" className="font-medium text-foreground min-w-[120px] text-center">
                  {monthName}
                </span>
                <button data-ev-id="ev_c9ec9293e9"
              onClick={goToPrevMonth}
              className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
              title="חודש קודם">

                  <ChevronLeft className="w-5 h-5" />
                </button>
              </>
            }
            {isRangeMode &&
            <>
                <span data-ev-id="ev_e50edb49b3" className="font-medium text-foreground text-center">
                  {rangeDisplayName}
                </span>
                <button data-ev-id="ev_4169a0680e"
              onClick={exitRangeMode}
              className="p-1 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
              title="חזרה לתצוגת חודש">

                  <X className="w-4 h-4" />
                </button>
              </>
            }
            <div data-ev-id="ev_bbb4711b12" className="border-r border-border h-6 mx-1" />
            <button data-ev-id="ev_f1f12389e8"
            onClick={() => setShowRangeModal(true)}
            className="px-3 py-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors text-sm"
            title="בחירת טווח חודשים">

              טווח
            </button>
          </div>
        </div>

        {/* Range selection modal */}
        {showRangeModal &&
        <div data-ev-id="ev_c3aa23f7bc" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowRangeModal(false)}>
            <Card className="p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
              <div data-ev-id="ev_86639ad74a" className="flex justify-between items-center mb-4">
                <h3 data-ev-id="ev_fec65f2498" className="font-semibold text-lg">בחירת טווח חודשים</h3>
                <button data-ev-id="ev_8abb2c9569" onClick={() => setShowRangeModal(false)} className="p-1 hover:bg-muted rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Quick selections */}
              <div data-ev-id="ev_080661e088" className="flex flex-wrap gap-2 mb-4">
                <button data-ev-id="ev_f1e06be0e6"
              onClick={() => selectLastNMonths(3)}
              className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-md text-sm font-medium">

                  3 חודשים
                </button>
                <button data-ev-id="ev_b764bb63dd"
              onClick={() => selectLastNMonths(6)}
              className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-md text-sm font-medium">

                  6 חודשים
                </button>
                <button data-ev-id="ev_3a8a22e823"
              onClick={() => selectLastNMonths(12)}
              className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-md text-sm font-medium">

                  12 חודשים
                </button>
              </div>

              {/* Custom range */}
              <div data-ev-id="ev_1d88d5f56e" className="space-y-3">
                <p data-ev-id="ev_228a7b8f86" className="text-sm text-muted-foreground">או בחר טווח מותאם אישית:</p>
                <div data-ev-id="ev_4c1018c204" className="flex gap-3 items-center">
                  <div data-ev-id="ev_12935652eb" className="flex-1">
                    <label data-ev-id="ev_05c6e36eb7" className="text-sm text-muted-foreground block mb-1">מחודש</label>
                    <MonthPicker value={rangeStart} onChange={setRangeStart} />
                  </div>
                  <span data-ev-id="ev_e465f63b4a" className="text-muted-foreground mt-5">עד</span>
                  <div data-ev-id="ev_2eab88e971" className="flex-1">
                    <label data-ev-id="ev_5d63166b3e" className="text-sm text-muted-foreground block mb-1">עד חודש</label>
                    <MonthPicker value={rangeEnd} onChange={setRangeEnd} />
                  </div>
                </div>
                <button data-ev-id="ev_94d0e28f15"
              onClick={() => {
                setIsRangeMode(true);
                setShowRangeModal(false);
              }}
              className="w-full py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90">

                  הצג סיכום
                </button>
              </div>
            </Card>
          </div>
        }

        {/* Tabs */}
        <div data-ev-id="ev_cfb49ab529" className="flex gap-2 border-b border-border">
          <button data-ev-id="ev_ad3dec111d"
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
          activeTab === 'expenses' ?
          'border-primary text-primary' :
          'border-transparent text-muted-foreground hover:text-foreground'}`
          }>

            <div data-ev-id="ev_b15fe41d91" className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              הוצאות
            </div>
          </button>
          <button data-ev-id="ev_f8cbd00854"
          onClick={() => setActiveTab('incomes')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
          activeTab === 'incomes' ?
          'border-primary text-primary' :
          'border-transparent text-muted-foreground hover:text-foreground'}`
          }>

            <div data-ev-id="ev_85d5a05d33" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              הכנסות
            </div>
          </button>
        </div>

        {/* Filters */}
        <Card>
          <div data-ev-id="ev_9196ed8daf" className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span data-ev-id="ev_cd4f1945a7" className="text-sm font-medium">סינון</span>
            {hasActiveFilters &&
            <button data-ev-id="ev_4d967f552f"
            onClick={clearFilters}
            className="text-xs text-primary hover:underline flex items-center gap-1 mr-auto">

                <X className="w-3 h-3" />
                נקה הכל
              </button>
            }
          </div>
          <div data-ev-id="ev_4de8234a17" className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
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
        <div data-ev-id="ev_8d2e4c51e4" className="flex justify-center py-12">
            <div data-ev-id="ev_c4f897f16c" className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div> :

        <>
            {/* Expenses tab content */}
            {activeTab === 'expenses' &&
          <div data-ev-id="ev_72631dfc35" className="flex flex-col gap-4">
                {/* Summary cards */}
                <div data-ev-id="ev_4374d4d600" className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="flex flex-col gap-1">
                    <span data-ev-id="ev_90c4c9e036" className="text-xs text-muted-foreground">סה"כ הוצאות</span>
                    <p data-ev-id="ev_350e3dd0bc" className="text-xl font-bold text-red-600">
                      ₪{expenseStats.total.toLocaleString()}
                    </p>
                    <span data-ev-id="ev_7ae37ccc30" className="text-xs text-muted-foreground">{expenseStats.count} פריטים</span>
                  </Card>
                  <Card className="flex flex-col gap-1">
                    <span data-ev-id="ev_ef66fc2a4b" className="text-xs text-muted-foreground">ממוצע חודשי</span>
                    <p data-ev-id="ev_6a1fade944" className="text-xl font-bold text-foreground">
                      ₪{Math.round(expenseStats.avgMonthly).toLocaleString()}
                    </p>
                  </Card>
                  <Card className="flex flex-col gap-1">
                    <span data-ev-id="ev_a7d7c01a0c" className="text-xs text-muted-foreground">החודש הגבוה ביותר</span>
                    <p data-ev-id="ev_ff140945c1" className="text-lg font-bold text-red-600">
                      {expenseStats.highestMonth ?
                  <>
                          ₪{expenseStats.highestMonth.amount.toLocaleString()}
                          <span data-ev-id="ev_908f928a03" className="text-xs text-muted-foreground font-normal block">
                            {formatMonthHebrew(expenseStats.highestMonth.month)}
                          </span>
                        </> :
                  '-'}
                    </p>
                  </Card>
                  <Card className="flex flex-col gap-1">
                    <span data-ev-id="ev_28a5addda4" className="text-xs text-muted-foreground">החודש הנמוך ביותר</span>
                    <p data-ev-id="ev_b626b72326" className="text-lg font-bold text-green-600">
                      {expenseStats.lowestMonth ?
                  <>
                          ₪{expenseStats.lowestMonth.amount.toLocaleString()}
                          <span data-ev-id="ev_9f3118eebb" className="text-xs text-muted-foreground font-normal block">
                            {formatMonthHebrew(expenseStats.lowestMonth.month)}
                          </span>
                        </> :
                  '-'}
                    </p>
                  </Card>
                </div>

                {/* Category breakdown table */}
                <Card>
                  <h3 data-ev-id="ev_cfd312cabc" className="font-semibold text-foreground mb-3">פירוט לפי קטגוריה</h3>
                  {sortedCategoryBreakdown.length > 0 ?
              <div data-ev-id="ev_40d6785584" className="overflow-x-auto">
                      <table data-ev-id="ev_e4031259f5" className="w-full text-sm">
                        <thead data-ev-id="ev_a7105ddc9b">
                          <tr data-ev-id="ev_229091edb5" className="border-b border-border">
                            <SortHeader field="categoryName" label="קטגוריה" sortField={expenseSortField} sortDir={expenseSortDir} onSort={handleExpenseSort} />
                            <SortHeader field="count" label="מספר" sortField={expenseSortField} sortDir={expenseSortDir} onSort={handleExpenseSort} />
                            <SortHeader field="total" label="סהכ" sortField={expenseSortField} sortDir={expenseSortDir} onSort={handleExpenseSort} />
                            <SortHeader field="avg" label="ממוצע" sortField={expenseSortField} sortDir={expenseSortDir} onSort={handleExpenseSort} />
                            <SortHeader field="highest" label="גבוה" sortField={expenseSortField} sortDir={expenseSortDir} onSort={handleExpenseSort} />
                            <SortHeader field="lowest" label="נמוך" sortField={expenseSortField} sortDir={expenseSortDir} onSort={handleExpenseSort} />
                          </tr>
                        </thead>
                        <tbody data-ev-id="ev_e493a976d5">
                          {sortedCategoryBreakdown.map((cat) =>
                    <tr data-ev-id="ev_5399c7d242" key={cat.categoryId} className="border-b border-border/50 hover:bg-muted/30">
                              <td data-ev-id="ev_447db840c2" className="py-2 px-2 font-medium">{cat.categoryName}</td>
                              <td data-ev-id="ev_b7577bac8f" className="py-2 px-2 text-muted-foreground">{cat.count}</td>
                              <td data-ev-id="ev_e57eb186cf" className={`py-2 px-2 font-medium ${cat.total < 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatAmount(cat.total, cat.total < 0)}
                              </td>
                              <td data-ev-id="ev_ab526c9524" className="py-2 px-2">₪{Math.round(Math.abs(cat.avg)).toLocaleString()}</td>
                              <td data-ev-id="ev_258f10aed0" className="py-2 px-2">₪{Math.abs(cat.highest).toLocaleString()}</td>
                              <td data-ev-id="ev_39482864aa" className="py-2 px-2">₪{Math.abs(cat.lowest).toLocaleString()}</td>
                            </tr>
                    )}
                        </tbody>
                      </table>
                    </div> :

              <p data-ev-id="ev_d57fe33bfd" className="text-muted-foreground text-center py-4">אין נתונים להצגה</p>
              }
                </Card>
              </div>
          }

            {/* Incomes tab content */}
            {activeTab === 'incomes' &&
          <div data-ev-id="ev_e2da8cbdc6" className="flex flex-col gap-4">
                {/* Summary cards */}
                <div data-ev-id="ev_2febb0c810" className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="flex flex-col gap-1">
                    <span data-ev-id="ev_884a0f3401" className="text-xs text-muted-foreground">סה"כ הכנסות</span>
                    <p data-ev-id="ev_2a9bbc886b" className="text-xl font-bold text-green-600">
                      ₪{incomeStats.total.toLocaleString()}
                    </p>
                    <span data-ev-id="ev_05f092d266" className="text-xs text-muted-foreground">{incomeStats.count} פריטים</span>
                  </Card>
                  <Card className="flex flex-col gap-1">
                    <span data-ev-id="ev_bb1b41454d" className="text-xs text-muted-foreground">ממוצע חודשי</span>
                    <p data-ev-id="ev_0ee37cbdd3" className="text-xl font-bold text-foreground">
                      ₪{Math.round(incomeStats.avgMonthly).toLocaleString()}
                    </p>
                  </Card>
                  <Card className="flex flex-col gap-1">
                    <span data-ev-id="ev_9f94778b7f" className="text-xs text-muted-foreground">החודש הגבוה ביותר</span>
                    <p data-ev-id="ev_fa032a0d3c" className="text-lg font-bold text-green-600">
                      {incomeStats.highestMonth ?
                  <>
                          ₪{incomeStats.highestMonth.amount.toLocaleString()}
                          <span data-ev-id="ev_ffcd99d27e" className="text-xs text-muted-foreground font-normal block">
                            {formatMonthHebrew(incomeStats.highestMonth.month)}
                          </span>
                        </> :
                  '-'}
                    </p>
                  </Card>
                  <Card className="flex flex-col gap-1">
                    <span data-ev-id="ev_399c3af7a5" className="text-xs text-muted-foreground">החודש הנמוך ביותר</span>
                    <p data-ev-id="ev_45f438f1a1" className="text-lg font-bold text-red-600">
                      {incomeStats.lowestMonth ?
                  <>
                          ₪{incomeStats.lowestMonth.amount.toLocaleString()}
                          <span data-ev-id="ev_ad9557a8a3" className="text-xs text-muted-foreground font-normal block">
                            {formatMonthHebrew(incomeStats.lowestMonth.month)}
                          </span>
                        </> :
                  '-'}
                    </p>
                  </Card>
                </div>

                {/* Source breakdown table */}
                <Card>
                  <h3 data-ev-id="ev_4a10f5b5fa" className="font-semibold text-foreground mb-3">פירוט לפי מקור הכנסה</h3>
                  {sortedSourceBreakdown.length > 0 ?
              <div data-ev-id="ev_e73bab7b6f" className="overflow-x-auto">
                      <table data-ev-id="ev_54d82e29e0" className="w-full text-sm">
                        <thead data-ev-id="ev_bc3e9ffe3e">
                          <tr data-ev-id="ev_bcc5996008" className="border-b border-border">
                            <SortHeader field="sourceName" label="מקור" sortField={incomeSortField} sortDir={incomeSortDir} onSort={handleIncomeSort} />
                            <SortHeader field="count" label="מספר" sortField={incomeSortField} sortDir={incomeSortDir} onSort={handleIncomeSort} />
                            <SortHeader field="total" label="סהכ" sortField={incomeSortField} sortDir={incomeSortDir} onSort={handleIncomeSort} />
                            <SortHeader field="avg" label="ממוצע" sortField={incomeSortField} sortDir={incomeSortDir} onSort={handleIncomeSort} />
                            <SortHeader field="highest" label="גבוה" sortField={incomeSortField} sortDir={incomeSortDir} onSort={handleIncomeSort} />
                            <SortHeader field="lowest" label="נמוך" sortField={incomeSortField} sortDir={incomeSortDir} onSort={handleIncomeSort} />
                          </tr>
                        </thead>
                        <tbody data-ev-id="ev_c27918c194">
                          {sortedSourceBreakdown.map((src) =>
                    <tr data-ev-id="ev_9b1b5553c7" key={src.source} className="border-b border-border/50 hover:bg-muted/30">
                              <td data-ev-id="ev_2a0f3fb000" className="py-2 px-2 font-medium">{src.sourceName}</td>
                              <td data-ev-id="ev_5007290a57" className="py-2 px-2 text-muted-foreground">{src.count}</td>
                              <td data-ev-id="ev_b7ccd90ea2" className="py-2 px-2 text-green-600 font-medium">₪{src.total.toLocaleString()}</td>
                              <td data-ev-id="ev_a125ca2fb7" className="py-2 px-2">₪{Math.round(src.avg).toLocaleString()}</td>
                              <td data-ev-id="ev_631ffee9bf" className="py-2 px-2">₪{src.highest.toLocaleString()}</td>
                              <td data-ev-id="ev_d906d03c0c" className="py-2 px-2">₪{src.lowest.toLocaleString()}</td>
                            </tr>
                    )}
                        </tbody>
                      </table>
                    </div> :

              <p data-ev-id="ev_6d8d008be5" className="text-muted-foreground text-center py-4">אין נתונים להצגה</p>
              }
                </Card>
              </div>
          }
          </>
        }
      </div>

      {/* Click outside to close dropdowns */}
      {openDropdown &&
      <div data-ev-id="ev_487ea556a2"
      className="fixed inset-0 z-10"
      onClick={() => setOpenDropdown(null)} />

      }
    </Layout>);

}