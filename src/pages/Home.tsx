import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router';
import { TrendingDown, TrendingUp, CreditCard, AlertCircle, ChevronRight, ChevronLeft, Scale, BarChart3, X, Calendar } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { useHousehold } from '@/hooks/useHousehold';
import { supabase } from '@/integrations/supabase/client';
import type { Expense, Income } from '@/types';
import { PAYMENT_METHOD_LABELS, INCOME_SOURCE_LABELS } from '@/types';
import { MonthPicker } from '@/components/MonthPicker';
import { formatMonthHebrew } from '@/lib/constants';

export default function Home() {
  const { household, categories, expenseRules, classificationOptions } = useHousehold();
  const [monthlyExpenses, setMonthlyExpenses] = useState<Expense[]>([]);
  const [monthlyIncomes, setMonthlyIncomes] = useState<Income[]>([]);
  const [unclassifiedCount, setUnclassifiedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Month selection - default to current month
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Range mode state
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [rangeStart, setRangeStart] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [rangeEnd, setRangeEnd] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showRangeModal, setShowRangeModal] = useState(false);

  // Range stats
  const [rangeStats, setRangeStats] = useState<{
    totalExpenses: number;
    totalIncomes: number;
    monthlyExpensesBreakdown: {month: string;amount: number;}[];
    monthlyIncomesBreakdown: {month: string;amount: number;}[];
    avgExpenses: number;
    avgIncomes: number;
    highestExpenseMonth: {month: string;amount: number;} | null;
    lowestExpenseMonth: {month: string;amount: number;} | null;
    highestIncomeMonth: {month: string;amount: number;} | null;
    lowestIncomeMonth: {month: string;amount: number;} | null;
  } | null>(null);

  // Credit insights state - responsive to range mode
  const [creditInsights, setCreditInsights] = useState<{
    lastMonthAmount: number; // Only shown in single month mode
    avgAmount: number;
    highestMonth: {month: string;amount: number;} | null;
    lowestMonth: {month: string;amount: number;} | null;
    monthsCompared: number;
    currentDay: number;
    isRangeMode: boolean;
  }>({
    lastMonthAmount: 0,
    avgAmount: 0,
    highestMonth: null,
    lowestMonth: null,
    monthsCompared: 0,
    currentDay: new Date().getDate(),
    isRangeMode: false
  });

  useEffect(() => {
    if (!supabase || !household) return;

    const loadData = async () => {
      setLoading(true);
      // Use billing_month for filtering (YYYY-MM format)
      const billingMonth = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`;
      console.log('Home filter by billing_month:', billingMonth);

      // Load expenses and incomes in parallel
      const [expensesRes, incomesRes] = await Promise.all([
      supabase.from('expenses').select('*').eq('household_id', household.id).eq('billing_month', billingMonth),
      supabase.from('incomes').select('*').eq('household_id', household.id).eq('billing_month', billingMonth)]
      );

      const expenses = (expensesRes.data ?? []) as Expense[];
      const incomes = (incomesRes.data ?? []) as Income[];
      setMonthlyExpenses(expenses);
      setMonthlyIncomes(incomes);

      // Count unclassified (no category)
      const unclassified = expenses.filter((e) => !e.category_id).length;
      setUnclassifiedCount(unclassified);
      setLoading(false);
    };

    loadData();
  }, [household, selectedMonth]);

  // Load credit insights - grouped by billing_month, with pagination
  useEffect(() => {
    if (!supabase || !household) return;

    const loadCreditInsights = async () => {
      const today = new Date();
      const currentDay = today.getDate();
      const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

      // Helper to extract month string (YYYY-MM) from date - parse directly to avoid timezone issues
      const getMonthFromDate = (dateStr: string): string => {
        const parts = dateStr.split('T')[0].split('-');
        if (parts.length >= 2) {
          return `${parts[0]}-${parts[1]}`;
        }
        return '';
      };

      // Helper to extract day from date string
      const getDayFromDate = (dateStr: string): number => {
        const parts = dateStr.split('T')[0].split('-');
        if (parts.length >= 3) {
          return parseInt(parts[2], 10);
        }
        return 1;
      };

      // Paginated fetch - Supabase limits to 1000 rows silently
      const PAGE_SIZE = 1000;
      let allCreditExpenses: Expense[] = [];
      let offset = 0;
      let keepFetching = true;

      while (keepFetching) {
        const { data: batch } = await supabase.
        from('expenses').
        select('*').
        eq('household_id', household.id).
        eq('payment_method', 'credit').
        range(offset, offset + PAGE_SIZE - 1);

        if (batch && batch.length > 0) {
          allCreditExpenses = [...allCreditExpenses, ...(batch as Expense[])];
          offset += PAGE_SIZE;
          if (batch.length < PAGE_SIZE) {
            keepFetching = false;
          }
        } else {
          keepFetching = false;
        }
      }

      if (allCreditExpenses.length === 0) {
        setCreditInsights({
          lastMonthAmount: 0,
          avgAmount: 0,
          highestMonth: null,
          lowestMonth: null,
          monthsCompared: 0,
          currentDay,
          isRangeMode
        });
        return;
      }

      // Group expenses by BILLING_MONTH (not date)
      const byMonth: Record<string, Expense[]> = {};
      allCreditExpenses.forEach((exp) => {
        const billingMonth = exp.billing_month;
        if (!billingMonth) return;
        if (!byMonth[billingMonth]) byMonth[billingMonth] = [];
        byMonth[billingMonth].push(exp);
      });

      // Filter months based on range mode
      let relevantMonths = Object.keys(byMonth);
      if (isRangeMode) {
        relevantMonths = relevantMonths.filter((m) => m >= rangeStart && m <= rangeEnd);
      }

      // Calculate "up to this day" for each month
      // Logic: if date month < billing_month -> always include (transaction was known from start of billing month)
      //        if date month == billing_month -> compare day numbers
      const monthTotals = relevantMonths.map((billingMonth) => {
        const expenses = byMonth[billingMonth];
        const upToDay = expenses.
        filter((e) => {
          if (!e.date) return true; // Include if no date
          const dateMonth = getMonthFromDate(e.date);
          if (dateMonth < billingMonth) {
            // Transaction date is from earlier month - always include
            return true;
          } else {
            // Same month - compare day numbers
            return getDayFromDate(e.date) <= currentDay;
          }
        }).
        reduce((sum, e) => sum + Number(e.amount), 0);
        return { month: billingMonth, upToDay };
      });

      if (isRangeMode) {
        // Range mode: calculate from selected months only
        const avgAmount = monthTotals.length > 0 ?
        monthTotals.reduce((sum, m) => sum + m.upToDay, 0) / monthTotals.length :
        0;

        const sortedByUpToDay = [...monthTotals].sort((a, b) => b.upToDay - a.upToDay);
        const highestMonth = sortedByUpToDay[0] || null;
        const lowestMonth = sortedByUpToDay[sortedByUpToDay.length - 1] || null;

        setCreditInsights({
          lastMonthAmount: 0, // Not relevant in range mode
          avgAmount,
          highestMonth: highestMonth ? { month: highestMonth.month, amount: highestMonth.upToDay } : null,
          lowestMonth: lowestMonth ? { month: lowestMonth.month, amount: lowestMonth.upToDay } : null,
          monthsCompared: monthTotals.length,
          currentDay,
          isRangeMode: true
        });
      } else {
        // Single month mode: use full history, exclude current month
        const previousMonths = monthTotals.filter((m) => m.month !== currentMonthStr);

        // Last month (the month before current calendar month)
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
        const lastMonthData = monthTotals.find((m) => m.month === lastMonthStr);
        const lastMonthAmount = lastMonthData?.upToDay || 0;

        // Average from all previous months
        const avgAmount = previousMonths.length > 0 ?
        previousMonths.reduce((sum, m) => sum + m.upToDay, 0) / previousMonths.length :
        0;

        // Highest and lowest (excluding current month), by upToDay
        const sortedByUpToDay = [...previousMonths].sort((a, b) => b.upToDay - a.upToDay);
        const highestMonth = sortedByUpToDay[0] || null;
        const lowestMonth = sortedByUpToDay[sortedByUpToDay.length - 1] || null;

        setCreditInsights({
          lastMonthAmount,
          avgAmount,
          highestMonth: highestMonth ? { month: highestMonth.month, amount: highestMonth.upToDay } : null,
          lowestMonth: lowestMonth ? { month: lowestMonth.month, amount: lowestMonth.upToDay } : null,
          monthsCompared: previousMonths.length,
          currentDay,
          isRangeMode: false
        });
      }
    };

    loadCreditInsights();
  }, [household, isRangeMode, rangeStart, rangeEnd]);

  // Load range data when in range mode
  useEffect(() => {
    if (!supabase || !household || !isRangeMode) {
      setRangeStats(null);
      return;
    }

    const loadRangeData = async () => {
      setLoading(true);

      // Load all expenses and incomes in the range
      const [expensesRes, incomesRes] = await Promise.all([
      supabase.from('expenses').select('*').
      eq('household_id', household.id).
      gte('billing_month', rangeStart).
      lte('billing_month', rangeEnd).
      order('billing_month'),
      supabase.from('incomes').select('*').
      eq('household_id', household.id).
      gte('billing_month', rangeStart).
      lte('billing_month', rangeEnd).
      order('billing_month')]
      );

      const expenses = (expensesRes.data ?? []) as Expense[];
      const incomes = (incomesRes.data ?? []) as Income[];

      // Group by month
      const expensesByMonth: Record<string, number> = {};
      const incomesByMonth: Record<string, number> = {};

      expenses.forEach((e) => {
        expensesByMonth[e.billing_month] = (expensesByMonth[e.billing_month] || 0) + Number(e.amount);
      });
      incomes.forEach((i) => {
        incomesByMonth[i.billing_month] = (incomesByMonth[i.billing_month] || 0) + Number(i.amount);
      });

      // Convert to arrays
      const monthlyExpensesBreakdown = Object.entries(expensesByMonth).
      map(([month, amount]) => ({ month, amount })).
      sort((a, b) => a.month.localeCompare(b.month));
      const monthlyIncomesBreakdown = Object.entries(incomesByMonth).
      map(([month, amount]) => ({ month, amount })).
      sort((a, b) => a.month.localeCompare(b.month));

      // Calculate totals
      const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const totalIncomes = incomes.reduce((sum, i) => sum + Number(i.amount), 0);

      // Count months in range
      const [startYear, startMo] = rangeStart.split('-').map(Number);
      const [endYear, endMo] = rangeEnd.split('-').map(Number);
      const monthCount = (endYear - startYear) * 12 + (endMo - startMo) + 1;

      // Averages
      const avgExpenses = monthCount > 0 ? totalExpenses / monthCount : 0;
      const avgIncomes = monthCount > 0 ? totalIncomes / monthCount : 0;

      // Find highest/lowest months
      const sortedExpenses = [...monthlyExpensesBreakdown].sort((a, b) => b.amount - a.amount);
      const sortedIncomes = [...monthlyIncomesBreakdown].sort((a, b) => b.amount - a.amount);

      setRangeStats({
        totalExpenses,
        totalIncomes,
        monthlyExpensesBreakdown,
        monthlyIncomesBreakdown,
        avgExpenses,
        avgIncomes,
        highestExpenseMonth: sortedExpenses[0] || null,
        lowestExpenseMonth: sortedExpenses[sortedExpenses.length - 1] || null,
        highestIncomeMonth: sortedIncomes[0] || null,
        lowestIncomeMonth: sortedIncomes[sortedIncomes.length - 1] || null
      });

      // Also set monthly data for current display
      setMonthlyExpenses(expenses);
      setMonthlyIncomes(incomes);
      setUnclassifiedCount(expenses.filter((e) => !e.category_id).length);
      setLoading(false);
    };

    loadRangeData();
  }, [household, isRangeMode, rangeStart, rangeEnd]);

  // Quick range selections
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
    setRangeStats(null);
  };

  const goToPrevMonth = () => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const totalExpenses = monthlyExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalIncomes = monthlyIncomes.reduce((sum, e) => sum + Number(e.amount), 0);
  const balance = totalIncomes - totalExpenses;
  const mandatoryExpenses = monthlyExpenses.
  filter((e) => e.expense_type === 'mandatory').
  reduce((sum, e) => sum + Number(e.amount), 0);
  const optionalExpenses = monthlyExpenses.
  filter((e) => e.expense_type === 'optional').
  reduce((sum, e) => sum + Number(e.amount), 0);
  const luxuryExpenses = monthlyExpenses.
  filter((e) => e.expense_type === 'luxury').
  reduce((sum, e) => sum + Number(e.amount), 0);

  const monthName = selectedMonth.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });

  // Range display name
  const rangeDisplayName = isRangeMode ?
  `${formatMonthHebrew(rangeStart)} - ${formatMonthHebrew(rangeEnd)}` :
  monthName;

  // Build label maps including custom classification options
  const paymentMethodLabels: Record<string, string> = { ...PAYMENT_METHOD_LABELS };
  const incomeSourceLabels: Record<string, string> = { ...INCOME_SOURCE_LABELS };

  (classificationOptions ?? []).forEach((opt) => {
    if (opt.option_type === 'payment_method') {
      paymentMethodLabels[opt.value] = opt.label;
    } else if (opt.option_type === 'income_source') {
      incomeSourceLabels[opt.value] = opt.label;
    }
  });

  return (
    <Layout>
      <div data-ev-id="ev_3527df7105" className="md:mr-52 flex flex-col gap-6 pb-24 md:pb-6">
        {/* Welcome header with sticky month navigation */}
        <div data-ev-id="ev_fb617fcf08" className="flex items-center justify-between">
          <div data-ev-id="ev_6875557226">
            <h2 data-ev-id="ev_3bc8f30c35" className="text-2xl font-bold text-foreground">שלום!</h2>
            <p data-ev-id="ev_b05564e2c6" className="text-muted-foreground">סיכום החודש</p>
          </div>
        </div>

        {/* Sticky month navigation */}
        <div data-ev-id="ev_b7782cec9e" className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-2 -mx-4 px-4 md:-mx-6 md:px-6">
          <div data-ev-id="ev_b24b431572" className="flex items-center justify-center gap-2 bg-card border border-border rounded-lg p-2 shadow-sm">
            {!isRangeMode &&
            <>
                <button data-ev-id="ev_a74d083bf0"
              onClick={goToNextMonth}
              className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
              title="חודש הבא">
                  <ChevronRight className="w-5 h-5" />
                </button>
                <span data-ev-id="ev_419442a76e" className="font-medium text-foreground min-w-[120px] text-center">
                  {monthName}
                </span>
                <button data-ev-id="ev_d06a2bd515"
              onClick={goToPrevMonth}
              className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
              title="חודש קודם">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </>
            }
            {isRangeMode &&
            <>
                <span data-ev-id="ev_21bc5aeb4e" className="font-medium text-foreground text-center">
                  {rangeDisplayName}
                </span>
                <button data-ev-id="ev_1d0d1706f4"
              onClick={exitRangeMode}
              className="p-1 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
              title="חזרה לתצוגת חודש">
                  <X className="w-4 h-4" />
                </button>
              </>
            }
            <div data-ev-id="ev_f935ab527b" className="border-r border-border h-6 mx-1" />
            <button data-ev-id="ev_6645a21f97"
            onClick={() => setShowRangeModal(true)}
            className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            title="בחירת טווח חודשים">
              <Calendar className="w-4 h-4" />
              <span data-ev-id="ev_7662689a8c" className="text-sm hidden md:inline">טווח</span>
            </button>
          </div>
        </div>

        {/* Range selection modal */}
        {showRangeModal &&
        <div data-ev-id="ev_c181b1f451" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowRangeModal(false)}>
            <Card className="p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
              <div data-ev-id="ev_5596ab0a33" className="flex justify-between items-center mb-4">
                <h3 data-ev-id="ev_42719120c3" className="font-semibold text-lg">בחירת טווח חודשים</h3>
                <button data-ev-id="ev_843d717966" onClick={() => setShowRangeModal(false)} className="p-1 hover:bg-muted rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Quick selections */}
              <div data-ev-id="ev_7dfa536f68" className="flex flex-wrap gap-2 mb-4">
                <button data-ev-id="ev_056341fe03"
              onClick={() => selectLastNMonths(3)}
              className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-md text-sm font-medium">
                  3 חודשים
                </button>
                <button data-ev-id="ev_ee8854998e"
              onClick={() => selectLastNMonths(6)}
              className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-md text-sm font-medium">
                  6 חודשים
                </button>
                <button data-ev-id="ev_489b54b44f"
              onClick={() => selectLastNMonths(12)}
              className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-md text-sm font-medium">
                  12 חודשים
                </button>
              </div>

              {/* Custom range */}
              <div data-ev-id="ev_402c895ea6" className="space-y-3">
                <p data-ev-id="ev_f10c8a6d1e" className="text-sm text-muted-foreground">או בחר טווח מותאם אישית:</p>
                <div data-ev-id="ev_b9a2267aca" className="flex gap-3 items-center">
                  <div data-ev-id="ev_3a9495cc67" className="flex-1">
                    <label data-ev-id="ev_8addd26fbf" className="text-sm text-muted-foreground block mb-1">מחודש</label>
                    <MonthPicker value={rangeStart} onChange={setRangeStart} />
                  </div>
                  <span data-ev-id="ev_a7ee42e618" className="text-muted-foreground mt-5">עד</span>
                  <div data-ev-id="ev_8722129c78" className="flex-1">
                    <label data-ev-id="ev_b9d08bd5b2" className="text-sm text-muted-foreground block mb-1">עד חודש</label>
                    <MonthPicker value={rangeEnd} onChange={setRangeEnd} />
                  </div>
                </div>
                <button data-ev-id="ev_818092d1eb"
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

        {/* Stats cards - different display for single month vs range */}
        {!isRangeMode ?
        <div data-ev-id="ev_abc6c2cd38" className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="flex flex-col gap-2">
              <div data-ev-id="ev_207cd37d85" className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span data-ev-id="ev_6038c8fff2" className="text-sm">סה"כ הכנסות</span>
              </div>
              <p data-ev-id="ev_99581e8529" className="text-2xl font-bold text-green-600">
                {loading ? '...' : `₪${Math.round(totalIncomes).toLocaleString()}`}
              </p>
            </Card>

            <Card className="flex flex-col gap-2">
              <div data-ev-id="ev_a5dbefd94c" className="flex items-center gap-2 text-muted-foreground">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <span data-ev-id="ev_58f33946fa" className="text-sm">סה"כ הוצאות</span>
              </div>
              <p data-ev-id="ev_87546036f6" className="text-2xl font-bold text-red-600">
                {loading ? '...' : `₪${Math.round(totalExpenses).toLocaleString()}`}
              </p>
            </Card>

            <Card className="flex flex-col gap-2">
              <div data-ev-id="ev_a66b76371c" className="flex items-center gap-2 text-muted-foreground">
                <Scale className="w-4 h-4" />
                <span data-ev-id="ev_cbc2382a33" className="text-sm">מאזן</span>
              </div>
              <p data-ev-id="ev_ec2487fe6e" className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {loading ? '...' : `${balance >= 0 ? '+' : '-'}₪${Math.round(Math.abs(balance)).toLocaleString()}`}
              </p>
            </Card>

            {/* Expense types - single box with 3 rows */}
            <Card className="flex flex-col gap-2">
              <div data-ev-id="ev_7e9b3385b4" className="flex items-center justify-between">
                <span data-ev-id="ev_6d024ba335" className="text-sm text-muted-foreground">חובה</span>
                <span data-ev-id="ev_a5cfb7f4b8" className="font-bold text-foreground">
                  {loading ? '...' : `₪${Math.round(mandatoryExpenses).toLocaleString()}`}
                </span>
              </div>
              <div data-ev-id="ev_775cf1351c" className="flex items-center justify-between">
                <span data-ev-id="ev_77338ab88f" className="text-sm text-muted-foreground">לקצץ</span>
                <span data-ev-id="ev_c38a421e3a" className="font-bold text-foreground">
                  {loading ? '...' : `₪${Math.round(optionalExpenses).toLocaleString()}`}
                </span>
              </div>
              <div data-ev-id="ev_e29d6bb230" className="flex items-center justify-between">
                <span data-ev-id="ev_dc87369400" className="text-sm text-muted-foreground">מותרות</span>
                <span data-ev-id="ev_e56bdae277" className="font-bold text-foreground">
                  {loading ? '...' : `₪${Math.round(luxuryExpenses).toLocaleString()}`}
                </span>
              </div>
            </Card>
          </div> : (

        /* Range mode - expanded stats */
        <div data-ev-id="ev_59e227c1fd" className="flex flex-col gap-4">
            {/* Main totals */}
            <div data-ev-id="ev_e7d45444cd" className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card className="flex flex-col gap-2">
                <div data-ev-id="ev_dee94175ca" className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span data-ev-id="ev_010c0bf01b" className="text-sm">סה"כ הכנסות</span>
                </div>
                <p data-ev-id="ev_896a66a538" className="text-2xl font-bold text-green-600">
                  {loading ? '...' : `₪${(rangeStats?.totalIncomes ?? 0).toLocaleString()}`}
                </p>
              </Card>

              <Card className="flex flex-col gap-2">
                <div data-ev-id="ev_5e6386968d" className="flex items-center gap-2 text-muted-foreground">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  <span data-ev-id="ev_249769f3e5" className="text-sm">סה"כ הוצאות</span>
                </div>
                <p data-ev-id="ev_689e5b8ca8" className="text-2xl font-bold text-red-600">
                  {loading ? '...' : `₪${(rangeStats?.totalExpenses ?? 0).toLocaleString()}`}
                </p>
              </Card>

              <Card className="flex flex-col gap-2 col-span-2 md:col-span-1">
                <div data-ev-id="ev_e87da4f543" className="flex items-center gap-2 text-muted-foreground">
                  <Scale className="w-4 h-4" />
                  <span data-ev-id="ev_699298f1a2" className="text-sm">מאזן כולל</span>
                </div>
                <p data-ev-id="ev_c07caabf65" className={`text-2xl font-bold ${(rangeStats?.totalIncomes ?? 0) - (rangeStats?.totalExpenses ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {loading ? '...' : `₪${Math.abs((rangeStats?.totalIncomes ?? 0) - (rangeStats?.totalExpenses ?? 0)).toLocaleString()}`}
                </p>
              </Card>
            </div>

            {/* Averages and extremes */}
            <div data-ev-id="ev_d1079c6e4c" className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="flex flex-col gap-1 bg-blue-50/50 border-blue-100">
                <span data-ev-id="ev_20720dc52e" className="text-xs text-muted-foreground">ממוצע הוצאות חודשי</span>
                <p data-ev-id="ev_243080237f" className="text-lg font-bold text-foreground">
                  {loading ? '...' : `₪${Math.round(rangeStats?.avgExpenses ?? 0).toLocaleString()}`}
                </p>
              </Card>

              <Card className="flex flex-col gap-1 bg-blue-50/50 border-blue-100">
                <span data-ev-id="ev_0fe41081f9" className="text-xs text-muted-foreground">ממוצע הכנסות חודשי</span>
                <p data-ev-id="ev_1905134544" className="text-lg font-bold text-foreground">
                  {loading ? '...' : `₪${Math.round(rangeStats?.avgIncomes ?? 0).toLocaleString()}`}
                </p>
              </Card>

              <Card className="flex flex-col gap-1 bg-red-50/50 border-red-100">
                <span data-ev-id="ev_a518d17e9a" className="text-xs text-muted-foreground">הוצאות הכי גבוהות</span>
                <p data-ev-id="ev_43346e8a7d" className="text-lg font-bold text-red-600">
                  {loading ? '...' : rangeStats?.highestExpenseMonth ?
                <>
                      ₪{rangeStats.highestExpenseMonth.amount.toLocaleString()}
                      <span data-ev-id="ev_09e4c919e2" className="text-xs text-muted-foreground font-normal block">
                        {formatMonthHebrew(rangeStats.highestExpenseMonth.month)}
                      </span>
                    </> :
                '-'}
                </p>
              </Card>

              <Card className="flex flex-col gap-1 bg-green-50/50 border-green-100">
                <span data-ev-id="ev_1356b8466c" className="text-xs text-muted-foreground">הוצאות הכי נמוכות</span>
                <p data-ev-id="ev_959f2616d4" className="text-lg font-bold text-green-600">
                  {loading ? '...' : rangeStats?.lowestExpenseMonth ?
                <>
                      ₪{rangeStats.lowestExpenseMonth.amount.toLocaleString()}
                      <span data-ev-id="ev_50ca1b39cd" className="text-xs text-muted-foreground font-normal block">
                        {formatMonthHebrew(rangeStats.lowestExpenseMonth.month)}
                      </span>
                    </> :
                '-'}
                </p>
              </Card>
            </div>
          </div>)
        }

        {/* Credit insights */}
        {creditInsights.monthsCompared > 0 &&
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200">
            <div data-ev-id="ev_44bf67c4ae" className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              <h3 data-ev-id="ev_86f7575875" className="font-semibold text-foreground">
                תובנות אשראי (עד יום {creditInsights.currentDay} בחודש)
                {creditInsights.isRangeMode && <span data-ev-id="ev_b012a539c1" className="text-sm font-normal text-muted-foreground"> - לפי הטווח שנבחר</span>}
              </h3>
            </div>
            
            <div data-ev-id="ev_4eeab2a47b" className={`grid grid-cols-1 gap-4 ${creditInsights.isRangeMode ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
              {/* Last month - only in single month mode */}
              {!creditInsights.isRangeMode &&
            <div data-ev-id="ev_caa800543b" className="bg-background/50 rounded-lg p-3">
                  <p data-ev-id="ev_0a1b7fe628" className="text-sm text-muted-foreground mb-1">חודש שעבר</p>
                  <p data-ev-id="ev_45fb6a06af" className="text-xl font-bold text-foreground">
                    ₪{Math.round(creditInsights.lastMonthAmount).toLocaleString()}
                  </p>
                </div>
            }

              {/* Average */}
              <div data-ev-id="ev_3de5953e35" className="bg-background/50 rounded-lg p-3">
                <p data-ev-id="ev_a0d0b5f220" className="text-sm text-muted-foreground mb-1">ממוצע</p>
                <p data-ev-id="ev_8853858c86" className="text-xl font-bold text-foreground">
                  ₪{Math.round(creditInsights.avgAmount).toLocaleString()}
                </p>
                <p data-ev-id="ev_eab3830c24" className="text-xs text-muted-foreground">
                  מ-{creditInsights.monthsCompared} חודשים
                </p>
              </div>

              {/* Highest month */}
              {creditInsights.highestMonth &&
            <div data-ev-id="ev_2a01e83926" className="bg-background/50 rounded-lg p-3">
                  <p data-ev-id="ev_dc6005568a" className="text-sm text-muted-foreground mb-1">החודש הגבוה ביותר</p>
                  <p data-ev-id="ev_51b061d8a0" className="text-xl font-bold text-red-600">
                    ₪{Math.round(creditInsights.highestMonth.amount).toLocaleString()}
                  </p>
                  <p data-ev-id="ev_880d04c28c" className="text-xs text-muted-foreground">
                    {formatMonthHebrew(creditInsights.highestMonth.month)}
                  </p>
                </div>
            }

              {/* Lowest month */}
              {creditInsights.lowestMonth &&
            <div data-ev-id="ev_6af81b2b47" className="bg-background/50 rounded-lg p-3">
                  <p data-ev-id="ev_736a4a9367" className="text-sm text-muted-foreground mb-1">החודש הנמוך ביותר</p>
                  <p data-ev-id="ev_0028c28a78" className="text-xl font-bold text-green-600">
                    ₪{Math.round(creditInsights.lowestMonth.amount).toLocaleString()}
                  </p>
                  <p data-ev-id="ev_abed996e1a" className="text-xs text-muted-foreground">
                    {formatMonthHebrew(creditInsights.lowestMonth.month)}
                  </p>
                </div>
            }
            </div>
          </Card>
        }

        {/* Alert for unclassified expenses */}
        {unclassifiedCount > 0 &&
        <Card className="bg-amber-50 border border-amber-200">
            <div data-ev-id="ev_19502f1cbc" className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
              <div data-ev-id="ev_fb205cacbd">
                <p data-ev-id="ev_d6648ce231" className="font-medium text-amber-800">
                  יש {unclassifiedCount} הוצאות ללא קטגוריה
                </p>
                <Link data-ev-id="ev_629605c5e4" to="/expenses" className="text-sm text-amber-700 hover:underline">
                  לחץ לסיווג ←
                </Link>
              </div>
            </div>
          </Card>
        }

        {/* Payment method & Income source breakdown - grid */}
        <div data-ev-id="ev_b12f5a1582" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Payment method breakdown */}
          <Card>
            <h3 data-ev-id="ev_e7a16680ed" className="font-semibold text-foreground mb-3">הוצאות לפי אמצעי תשלום</h3>
            {monthlyExpenses.length > 0 ? (() => {
              const byPayment: Record<string, number> = {};
              monthlyExpenses.forEach((e) => {
                const methodLabel = paymentMethodLabels[e.payment_method] || e.payment_method;
                byPayment[methodLabel] = (byPayment[methodLabel] || 0) + Number(e.amount);
              });
              const sorted = Object.entries(byPayment).sort((a, b) => b[1] - a[1]);
              return (
                <div data-ev-id="ev_54db482fc4" className="flex flex-col gap-2">
                  {sorted.map(([methodName, total]) =>
                  <div data-ev-id="ev_657276a73b" key={methodName} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                      <span data-ev-id="ev_c66db46eb0" className="text-foreground">{methodName}</span>
                      <span data-ev-id="ev_a6ffa5d30b" className="font-semibold text-red-600">₪{total.toLocaleString()}</span>
                    </div>
                  )}
                </div>);

            })() : <p data-ev-id="ev_84f46464d3" className="text-muted-foreground text-sm">אין הוצאות בחודש זה</p>}
          </Card>

          {/* Income by source breakdown */}
          <Card>
            <h3 data-ev-id="ev_63e24509e1" className="font-semibold text-foreground mb-3">הכנסות לפי מקור</h3>
            {monthlyIncomes.length > 0 ? (() => {
              const bySource: Record<string, {total: number;key: string;}> = {};
              monthlyIncomes.forEach((inc) => {
                const sourceLabel = incomeSourceLabels[inc.source] || inc.source;
                if (!bySource[sourceLabel]) {
                  bySource[sourceLabel] = { total: 0, key: inc.source };
                }
                bySource[sourceLabel].total += Number(inc.amount);
              });
              const sorted = Object.entries(bySource).sort((a, b) => b[1].total - a[1].total);
              return (
                <div data-ev-id="ev_c95e3e2780" className="flex flex-col gap-2">
                  {sorted.map(([sourceName, { total, key }]) => {
                    const isSavingsWithdrawal = key === 'savings';
                    return (
                      <div data-ev-id="ev_f8fecd3298" key={sourceName} className={`flex items-center justify-between py-2 border-b border-border last:border-b-0 ${isSavingsWithdrawal ? 'bg-amber-50 -mx-4 px-4 rounded' : ''}`}>
                        <span data-ev-id="ev_de4234dbd5" className={isSavingsWithdrawal ? 'text-amber-800 font-medium' : 'text-foreground'}>
                          {isSavingsWithdrawal && '⚠️ '}{sourceName}
                        </span>
                        <span data-ev-id="ev_ed6e10dd08" className={`font-semibold ${isSavingsWithdrawal ? 'text-amber-700' : 'text-green-600'}`}>₪{total.toLocaleString()}</span>
                      </div>);

                  })}
                </div>);

            })() : <p data-ev-id="ev_4de3b1f445" className="text-muted-foreground text-sm">אין הכנסות בחודש זה</p>}
          </Card>
        </div>

        {/* Category breakdown */}
        {monthlyExpenses.length > 0 && (() => {
          const byCategory: Record<string, number> = {};
          monthlyExpenses.forEach((e) => {
            const catName = categories.find((c) => c.id === e.category_id)?.name || 'ללא קטגוריה';
            byCategory[catName] = (byCategory[catName] || 0) + Number(e.amount);
          });
          const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
          return (
            <div data-ev-id="ev_04cb73bc39">
              <h3 data-ev-id="ev_0472bee886" className="text-lg font-semibold text-foreground mb-4">הוצאות לפי קטגוריה</h3>
              <Card variant="outlined" className="p-0 overflow-hidden">
                <div data-ev-id="ev_590c5aaa5d" className="divide-y divide-border">
                  {sorted.map(([catName, total]) =>
                  <div data-ev-id="ev_56d919de7d" key={catName} className="flex items-center justify-between p-4">
                      <div data-ev-id="ev_5c78b57ea1">
                        <p data-ev-id="ev_80a987d8a7" className="font-medium text-foreground">{catName}</p>
                        <p data-ev-id="ev_991ae01878" className="text-sm text-muted-foreground">
                          {(total / totalExpenses * 100).toFixed(0)}% מהסה"כ
                        </p>
                      </div>
                      <p data-ev-id="ev_44dee03096" className="font-semibold text-foreground">₪{total.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>);
        })()}

        {/* Recent expenses */}
        {monthlyExpenses.length > 0 &&
        <div data-ev-id="ev_8f8e7c3d56">
            <h3 data-ev-id="ev_d8131b928c" className="text-lg font-semibold text-foreground mb-4">הוצאות אחרונות</h3>
            <Card variant="outlined" className="p-0 overflow-hidden">
              <div data-ev-id="ev_3d754dfff9" className="divide-y divide-border">
                {monthlyExpenses.slice(0, 5).map((expense) => {
                const category = categories.find((c) => c.id === expense.category_id);
                return (
                  <div data-ev-id="ev_4764d79c0d" key={expense.id} className="flex items-center justify-between p-4">
                      <div data-ev-id="ev_6186b63444">
                        <p data-ev-id="ev_6640e2c76c" className="font-medium text-foreground">{expense.name}</p>
                        <p data-ev-id="ev_a04125ea92" className="text-sm text-muted-foreground">
                          {category?.name || 'ללא קטגוריה'}
                        </p>
                      </div>
                      <div data-ev-id="ev_24a188d4d0" className="text-left">
                        <p data-ev-id="ev_c19aab577f" className="font-semibold text-foreground">
                          ₪{Number(expense.amount).toLocaleString()}
                        </p>
                        <p data-ev-id="ev_c97b7e1d94" className="text-sm text-muted-foreground">
                          {new Date(expense.date).toLocaleDateString('he-IL')}
                        </p>
                      </div>
                    </div>);

              })}
              </div>
            </Card>
          </div>
        }
      </div>
    </Layout>);

}