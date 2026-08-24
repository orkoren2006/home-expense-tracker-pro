import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router';
import { Upload, Settings, List, TrendingDown, TrendingUp, CreditCard, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { useHousehold } from '@/hooks/useHousehold';
import { supabase } from '@/integrations/supabase/client';
import type { Expense } from '@/types';

export default function Home() {
  const { household, categories, expenseRules } = useHousehold();
  const [monthlyExpenses, setMonthlyExpenses] = useState<Expense[]>([]);
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

      const { data } = await supabase.
      from('expenses').
      select('*').
      eq('household_id', household.id).
      eq('billing_month', billingMonth);

      const expenses = (data ?? []) as Expense[];
      setMonthlyExpenses(expenses);

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
  const mandatoryExpenses = monthlyExpenses.
  filter((e) => e.expense_type === 'mandatory').
  reduce((sum, e) => sum + Number(e.amount), 0);

  const monthName = selectedMonth.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });

  return (
    <Layout>
      <div data-ev-id="ev_3527df7105" className="md:mr-52 flex flex-col gap-6 pb-24 md:pb-6">
        {/* Welcome header */}
        <div data-ev-id="ev_06299b7557" className="flex items-center justify-between">
          <div data-ev-id="ev_395d5c5060">
            <h2 data-ev-id="ev_7f2967efd7" className="text-2xl font-bold text-foreground">שלום!</h2>
            <p data-ev-id="ev_beaa27431f" className="text-muted-foreground">סיכום החודש</p>
          </div>
          <div data-ev-id="ev_299babe16a" className="flex items-center gap-2 bg-card border border-border rounded-lg p-2">
            <button data-ev-id="ev_23121a8981"
            onClick={goToNextMonth}
            className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
            title="חודש הבא">

              <ChevronRight className="w-5 h-5" />
            </button>
            <span data-ev-id="ev_75e9f5c40a" className="font-medium text-foreground min-w-[120px] text-center">
              {monthName}
            </span>
            <button data-ev-id="ev_43d483923f"
            onClick={goToPrevMonth}
            className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
            title="חודש קודם">

              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div data-ev-id="ev_4589b0a0c7" className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="flex flex-col gap-2">
            <div data-ev-id="ev_40e79dfd25" className="flex items-center gap-2 text-muted-foreground">
              <TrendingDown className="w-4 h-4" />
              <span data-ev-id="ev_8390c70a22" className="text-sm">סה״כ הוצאות</span>
            </div>
            <p data-ev-id="ev_68d40a8c2f" className="text-2xl font-bold text-foreground">
              {loading ? '...' : `₪${totalExpenses.toLocaleString()}`}
            </p>
          </Card>

          <Card className="flex flex-col gap-2">
            <div data-ev-id="ev_d16bb28ddd" className="flex items-center gap-2 text-muted-foreground">
              <CreditCard className="w-4 h-4" />
              <span data-ev-id="ev_866fd1f65e" className="text-sm">הוצאות חובה</span>
            </div>
            <p data-ev-id="ev_90f9271b7e" className="text-2xl font-bold text-foreground">
              {loading ? '...' : `₪${mandatoryExpenses.toLocaleString()}`}
            </p>
          </Card>

          <Card className="flex flex-col gap-2">
            <div data-ev-id="ev_e3ff621686" className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              <span data-ev-id="ev_a1b6c54a57" className="text-sm">קטגוריות</span>
            </div>
            <p data-ev-id="ev_e9e6629ec6" className="text-2xl font-bold text-foreground">
              {categories.filter((c) => c.type === 'expense').length}
            </p>
          </Card>

          <Card className="flex flex-col gap-2">
            <div data-ev-id="ev_63971ade95" className="flex items-center gap-2 text-muted-foreground">
              <List className="w-4 h-4" />
              <span data-ev-id="ev_e46d3316e6" className="text-sm">כללי סיווג</span>
            </div>
            <p data-ev-id="ev_5c711e6bbb" className="text-2xl font-bold text-foreground">{expenseRules.length}</p>
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
                <Link to="/expenses" className="text-sm text-amber-700 hover:underline">
                  לחץ לסיווג ←
                </Link>
              </div>
            </div>
          </Card>
        }

        {/* Quick actions */}
        <div data-ev-id="ev_b379b5ccf4">
          <h3 data-ev-id="ev_b034e115a6" className="text-lg font-semibold text-foreground mb-4">פעולות מהירות</h3>
          <div data-ev-id="ev_5d788f3684" className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/import"
              className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary hover:shadow-md transition-all">

              <div data-ev-id="ev_c48213d0a5" className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <div data-ev-id="ev_27e390bd0c">
                <h4 data-ev-id="ev_3a44d7cd92" className="font-semibold text-foreground">ייבוא אקסל</h4>
                <p data-ev-id="ev_d836d9c0a1" className="text-sm text-muted-foreground">טען הוצאות מחברת אשראי</p>
              </div>
            </Link>

            <Link
              to="/expenses"
              className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary hover:shadow-md transition-all">

              <div data-ev-id="ev_87174a79ef" className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center">
                <List className="w-6 h-6 text-secondary-foreground" />
              </div>
              <div data-ev-id="ev_0ae398fb3c">
                <h4 data-ev-id="ev_949641fa3a" className="font-semibold text-foreground">רשימת הוצאות</h4>
                <p data-ev-id="ev_80b60e47c6" className="text-sm text-muted-foreground">צפה, סנן וערוך</p>
              </div>
            </Link>

            <Link
              to="/settings"
              className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary hover:shadow-md transition-all">

              <div data-ev-id="ev_6e62ff4b81" className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Settings className="w-6 h-6 text-muted-foreground" />
              </div>
              <div data-ev-id="ev_8beb3fa2e5">
                <h4 data-ev-id="ev_2e65bbd5dd" className="font-semibold text-foreground">הגדרות</h4>
                <p data-ev-id="ev_8c77761a02" className="text-sm text-muted-foreground">קטגוריות, כרטיסים, בית</p>
              </div>
            </Link>
          </div>
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
            <div data-ev-id="ev_6ef7d8d18e">
              <h3 data-ev-id="ev_977093bf13" className="text-lg font-semibold text-foreground mb-4">הוצאות לפי קטגוריה</h3>
              <Card variant="outlined" className="p-0 overflow-hidden">
                <div data-ev-id="ev_75fd250c4f" className="divide-y divide-border">
                  {sorted.map(([catName, total]) =>
                  <div data-ev-id="ev_d2b6685ca8" key={catName} className="flex items-center justify-between p-4">
                      <div data-ev-id="ev_50cb668d25">
                        <p data-ev-id="ev_f751e0648e" className="font-medium text-foreground">{catName}</p>
                        <p data-ev-id="ev_efd44102d1" className="text-sm text-muted-foreground">
                          {(total / totalExpenses * 100).toFixed(0)}% מהסה"כ
                        </p>
                      </div>
                      <p data-ev-id="ev_326fd1976d" className="font-semibold text-foreground">₪{total.toLocaleString()}</p>
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