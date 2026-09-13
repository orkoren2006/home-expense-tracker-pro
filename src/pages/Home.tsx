import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router';
import { TrendingDown, TrendingUp, CreditCard, AlertCircle, ChevronRight, ChevronLeft, Scale } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { useHousehold } from '@/hooks/useHousehold';
import { supabase } from '@/integrations/supabase/client';
import type { Expense, Income } from '@/types';
import { PAYMENT_METHOD_LABELS, INCOME_SOURCE_LABELS } from '@/types';

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

  const monthName = selectedMonth.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });

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
          </div>
        </div>

        {/* Stats cards */}
        <div data-ev-id="ev_abc6c2cd38" className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="flex flex-col gap-2">
            <div data-ev-id="ev_5ff190e8a6" className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span data-ev-id="ev_809f7b1968" className="text-sm">סה"כ הכנסות</span>
            </div>
            <p data-ev-id="ev_fe587fd393" className="text-2xl font-bold text-green-600">
              {loading ? '...' : `₪${totalIncomes.toLocaleString()}`}
            </p>
          </Card>

          <Card className="flex flex-col gap-2">
            <div data-ev-id="ev_b7ed4c883b" className="flex items-center gap-2 text-muted-foreground">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span data-ev-id="ev_c23c907471" className="text-sm">סה"כ הוצאות</span>
            </div>
            <p data-ev-id="ev_a1160dd3a2" className="text-2xl font-bold text-red-600">
              {loading ? '...' : `₪${totalExpenses.toLocaleString()}`}
            </p>
          </Card>

          <Card className="flex flex-col gap-2">
            <div data-ev-id="ev_963282d526" className="flex items-center gap-2 text-muted-foreground">
              <Scale className="w-4 h-4" />
              <span data-ev-id="ev_b9f6855ea7" className="text-sm">מאזן</span>
            </div>
            <p data-ev-id="ev_9cc4409903" className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {loading ? '...' : `${balance >= 0 ? '+' : ''}₪${balance.toLocaleString()}`}
            </p>
          </Card>

          <Card className="flex flex-col gap-2">
            <div data-ev-id="ev_f477cbfd7d" className="flex items-center gap-2 text-muted-foreground">
              <CreditCard className="w-4 h-4" />
              <span data-ev-id="ev_0468eb9f5c" className="text-sm">הוצאות חובה</span>
            </div>
            <p data-ev-id="ev_18a8935863" className="text-2xl font-bold text-foreground">
              {loading ? '...' : `₪${mandatoryExpenses.toLocaleString()}`}
            </p>
          </Card>
        </div>

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