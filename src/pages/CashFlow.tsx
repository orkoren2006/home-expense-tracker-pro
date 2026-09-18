import { useEffect, useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, X, Check, TrendingDown, Wallet, CreditCard, Calendar, AlertTriangle } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useHousehold } from '@/hooks/useHousehold';
import { supabase } from '@/integrations/supabase/client';

interface BankBalance {
  household_id: string;
  balance: number;
  as_of_date: string;
  updated_at: string;
}

interface CreditCardWithDebit {
  id: string;
  name: string;
  last_four_digits: string | null;
  next_total_debit: number | null;
  next_debit_date: string | null;
  next_debit_updated_at: string | null;
}

interface ScheduledCashFlow {
  id: string;
  household_id: string;
  name: string;
  amount: number;
  day_of_month: number;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  created_at: string;
}

interface IncludedItem {
  name: string;
  amount: number;
  date: Date;
  type: 'credit' | 'scheduled';
}

export default function CashFlow() {
  const { household } = useHousehold();
  const [bankBalance, setBankBalance] = useState<BankBalance | null>(null);
  const [cardsWithDebit, setCardsWithDebit] = useState<CreditCardWithDebit[]>([]);
  const [scheduledFlows, setScheduledFlows] = useState<ScheduledCashFlow[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state for adding/editing
  const [showForm, setShowForm] = useState(false);
  const [editingFlow, setEditingFlow] = useState<ScheduledCashFlow | null>(null);
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDayOfMonth, setFormDayOfMonth] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!supabase || !household) return;

      setLoading(true);

      const { data: balanceData } = await supabase.
      from('bank_balances').
      select('*').
      eq('household_id', household.id).
      single();

      if (balanceData) {
        setBankBalance(balanceData as BankBalance);
      }

      const { data: cardsData } = await supabase.
      from('credit_cards').
      select('id, name, last_four_digits, next_total_debit, next_debit_date, next_debit_updated_at').
      eq('household_id', household.id);

      if (cardsData) {
        setCardsWithDebit(cardsData as CreditCardWithDebit[]);
      }

      const { data: flowsData } = await supabase.
      from('scheduled_cash_flows').
      select('*').
      eq('household_id', household.id).
      order('day_of_month', { ascending: true });

      if (flowsData) {
        setScheduledFlows(flowsData as ScheduledCashFlow[]);
      }

      setLoading(false);
    };

    if (household) {
      fetchData();
    }
  }, [household]);

  const loadData = async () => {
    if (!supabase || !household) return;

    setLoading(true);

    const { data: balanceData } = await supabase.
    from('bank_balances').
    select('*').
    eq('household_id', household.id).
    single();

    if (balanceData) {
      setBankBalance(balanceData as BankBalance);
    }

    const { data: cardsData } = await supabase.
    from('credit_cards').
    select('id, name, last_four_digits, next_total_debit, next_debit_date, next_debit_updated_at').
    eq('household_id', household.id);

    if (cardsData) {
      setCardsWithDebit(cardsData as CreditCardWithDebit[]);
    }

    const { data: flowsData } = await supabase.
    from('scheduled_cash_flows').
    select('*').
    eq('household_id', household.id).
    order('day_of_month', { ascending: true });

    if (flowsData) {
      setScheduledFlows(flowsData as ScheduledCashFlow[]);
    }

    setLoading(false);
  };

  // Calculate target month and included items based on new spec
  const { targetMonth, targetYear, targetDate, includedItems, totalDeductions, projectedBalance } = useMemo(() => {
    const today = new Date();
    const referenceDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Step 1: Determine target month
    let targetMonth: number;
    let targetYear: number;
    if (referenceDay <= 10) {
      targetMonth = currentMonth;
      targetYear = currentYear;
    } else {
      targetMonth = currentMonth + 1;
      targetYear = currentYear;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear = currentYear + 1;
      }
    }

    // Target date is the 10th of target month
    const targetDate = new Date(targetYear, targetMonth, 10);

    const includedItems: IncludedItem[] = [];

    // Credit card debit - treated as day 2 of target month
    const creditDebitDay = 2;
    const totalCreditDebit = cardsWithDebit.
    filter((c) => c.next_total_debit !== null).
    reduce((sum, c) => sum + (c.next_total_debit || 0), 0);

    if (totalCreditDebit > 0) {
      // Check if credit debit should be included
      const isCurrentMonth = targetMonth === currentMonth && targetYear === currentYear;
      const shouldIncludeCredit = isCurrentMonth ? creditDebitDay >= referenceDay : true;

      if (shouldIncludeCredit) {
        includedItems.push({
          name: 'חיוב אשראי',
          amount: totalCreditDebit,
          date: new Date(targetYear, targetMonth, creditDebitDay),
          type: 'credit'
        });
      }
    }

    // Scheduled cash flows
    for (const flow of scheduledFlows) {
      const flowDay = flow.day_of_month;
      const isCurrentMonth = targetMonth === currentMonth && targetYear === currentYear;

      // Check if day should be included based on target month
      const shouldIncludeByDay = isCurrentMonth ? flowDay >= referenceDay : true;
      if (!shouldIncludeByDay) continue;

      // Calculate exact date in target month
      // Handle months with fewer days (e.g., day 31 in a 30-day month)
      const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      const actualDay = Math.min(flowDay, lastDayOfTargetMonth);
      const exactDate = new Date(targetYear, targetMonth, actualDay);

      // Check if flow is active on this exact date
      const startDate = new Date(flow.start_date);
      startDate.setHours(0, 0, 0, 0);

      const endDate = flow.end_date ? new Date(flow.end_date) : null;
      if (endDate) endDate.setHours(23, 59, 59, 999);

      if (exactDate < startDate) continue;
      if (endDate && exactDate > endDate) continue;

      includedItems.push({
        name: flow.name,
        amount: flow.amount,
        date: exactDate,
        type: 'scheduled'
      });
    }

    // Sort by date
    includedItems.sort((a, b) => a.date.getTime() - b.date.getTime());

    const totalDeductions = includedItems.reduce((sum, item) => sum + item.amount, 0);
    const projectedBalance = bankBalance ? bankBalance.balance - totalDeductions : null;

    return { targetMonth, targetYear, targetDate, includedItems, totalDeductions, projectedBalance };
  }, [bankBalance, cardsWithDebit, scheduledFlows]);

  const resetForm = () => {
    setFormName('');
    setFormAmount('');
    setFormDayOfMonth('');
    setFormStartDate('');
    setFormEndDate('');
    setFormNotes('');
    setEditingFlow(null);
    setShowForm(false);
  };

  const startEditing = (flow: ScheduledCashFlow) => {
    setEditingFlow(flow);
    setFormName(flow.name);
    setFormAmount(String(flow.amount));
    setFormDayOfMonth(String(flow.day_of_month));
    setFormStartDate(flow.start_date);
    setFormEndDate(flow.end_date || '');
    setFormNotes(flow.notes || '');
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!supabase || !household || !formName.trim() || !formAmount || !formDayOfMonth || !formStartDate) return;

    const dayNum = parseInt(formDayOfMonth);
    if (dayNum < 1 || dayNum > 31) {
      alert('יום בחודש חייב להיות בין 1 ל-31');
      return;
    }

    const flowData = {
      household_id: household.id,
      name: formName.trim(),
      amount: parseFloat(formAmount),
      day_of_month: dayNum,
      start_date: formStartDate,
      end_date: formEndDate || null,
      notes: formNotes.trim() || null
    };

    if (editingFlow) {
      await supabase.
      from('scheduled_cash_flows').
      update(flowData).
      eq('id', editingFlow.id);
    } else {
      await supabase.
      from('scheduled_cash_flows').
      insert(flowData);
    }

    resetForm();
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!supabase || !confirm('בטוח שברצונך למחוק תזרים זה?')) return;

    await supabase.
    from('scheduled_cash_flows').
    delete().
    eq('id', id);

    loadData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatCurrencyWithCents = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('he-IL');
  };

  const formatDateObj = (date: Date) => {
    return date.toLocaleDateString('he-IL');
  };

  const getMonthName = (month: number) => {
    const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    return months[month];
  };

  if (loading) {
    return (
      <Layout>
        <div data-ev-id="ev_6cf8b60043" className="md:mr-52 flex items-center justify-center py-12">
          <div data-ev-id="ev_f95b401ac8" className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </Layout>);

  }

  return (
    <Layout>
      <div data-ev-id="ev_3d6b06c6ee" className="md:mr-52 flex flex-col gap-6 pb-24 md:pb-6">
        <div data-ev-id="ev_de36bb5fb7">
          <h2 data-ev-id="ev_513ff2499e" className="text-2xl font-bold text-foreground">תזרים מזומנים</h2>
          <p data-ev-id="ev_823a11a38b" className="text-muted-foreground">תחזית יתרת העו"ש ל-10 ל{getMonthName(targetMonth)} {targetYear}</p>
        </div>

        {/* Summary Cards */}
        <div data-ev-id="ev_18a23d5e23" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Current Balance */}
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5">
            <div data-ev-id="ev_91009bcd44" className="flex items-center gap-3 mb-2">
              <div data-ev-id="ev_82e32c0579" className="p-2 bg-blue-500/20 rounded-lg">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <span data-ev-id="ev_c9b4aa3833" className="text-sm text-muted-foreground">יתרת עו"ש נוכחית</span>
            </div>
            <p data-ev-id="ev_c751d7a6f9" className="text-2xl font-bold text-foreground">
              {bankBalance ? formatCurrency(bankBalance.balance) : '—'}
            </p>
            {bankBalance &&
            <p data-ev-id="ev_5a1413f3ff" className="text-xs text-muted-foreground mt-1">
                נכון ל-{formatDate(bankBalance.as_of_date)}
              </p>
            }
          </Card>

          {/* Total Deductions */}
          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5">
            <div data-ev-id="ev_f7363bf89b" className="flex items-center gap-3 mb-2">
              <div data-ev-id="ev_45232bfb72" className="p-2 bg-red-500/20 rounded-lg">
                <Calendar className="w-5 h-5 text-red-600" />
              </div>
              <span data-ev-id="ev_dbe69f86bd" className="text-sm text-muted-foreground">סה"כ חיובים צפויים</span>
            </div>
            <p data-ev-id="ev_620192e968" className="text-2xl font-bold text-red-600">
              {totalDeductions > 0 ? `-${formatCurrency(totalDeductions)}` : '—'}
            </p>
            <p data-ev-id="ev_f0ca457e98" className="text-xs text-muted-foreground mt-1">
              {includedItems.length} פריטים עד 10/{targetMonth + 1}
            </p>
          </Card>

          {/* Projected Balance */}
          <Card className={`bg-gradient-to-br ${
          projectedBalance !== null && projectedBalance < 0 ?
          'from-red-500/20 to-red-600/10 border-red-500/30' :
          'from-green-500/10 to-green-600/5'}`
          }>
            <div data-ev-id="ev_20ff4616db" className="flex items-center gap-3 mb-2">
              <div data-ev-id="ev_271512a811" className={`p-2 rounded-lg ${
              projectedBalance !== null && projectedBalance < 0 ?
              'bg-red-500/20' :
              'bg-green-500/20'}`
              }>
                {projectedBalance !== null && projectedBalance < 0 ?
                <AlertTriangle className="w-5 h-5 text-red-600" /> :

                <TrendingDown className="w-5 h-5 text-green-600" />
                }
              </div>
              <span data-ev-id="ev_90e6ffa665" className="text-sm text-muted-foreground">יתרה צפויה ל-10/{targetMonth + 1}/{targetYear}</span>
            </div>
            <p data-ev-id="ev_61f8ea8ecd" className={`text-2xl font-bold ${
            projectedBalance !== null && projectedBalance < 0 ?
            'text-red-600' :
            'text-green-600'}`
            }>
              {projectedBalance !== null ? formatCurrency(projectedBalance) : '—'}
            </p>
          </Card>
        </div>

        {/* Credit Card Breakdown */}
        {cardsWithDebit.some((c) => c.next_total_debit !== null && c.next_total_debit > 0) &&
        <Card>
            <div data-ev-id="ev_3725e0a977" className="flex items-center gap-3 mb-4">
              <div data-ev-id="ev_ba2385b265" className="p-2 bg-red-500/20 rounded-lg">
                <CreditCard className="w-5 h-5 text-red-600" />
              </div>
              <h3 data-ev-id="ev_4667875247" className="font-semibold text-foreground">פירוט חיובי אשראי לפי כרטיס</h3>
            </div>
            <div data-ev-id="ev_6a89ab1e6a" className="flex flex-col gap-2">
              {cardsWithDebit.
            filter((c) => c.next_total_debit !== null && c.next_total_debit > 0).
            map((card) =>
            <div data-ev-id="ev_e68f13e946" key={card.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div data-ev-id="ev_507a977187" className="flex items-center gap-2">
                      <span data-ev-id="ev_36f1d1cfd7" className="text-foreground">{card.name}</span>
                      {card.last_four_digits &&
                <span data-ev-id="ev_2861613bfe" className="text-xs text-muted-foreground">({card.last_four_digits})</span>
                }
                    </div>
                    <span data-ev-id="ev_ee9b9147ff" className="font-medium text-red-600 font-mono">
                      {formatCurrencyWithCents(card.next_total_debit || 0)}
                    </span>
                  </div>
            )}
              <div data-ev-id="ev_015eae7c65" className="flex items-center justify-between py-2 pt-3 border-t-2 border-border font-bold">
                <span data-ev-id="ev_8511716074" className="text-foreground">סה"כ אשראי</span>
                <span data-ev-id="ev_e6c7376db3" className="text-red-600 font-mono">
                  {formatCurrencyWithCents(
                  cardsWithDebit.
                  filter((c) => c.next_total_debit !== null).
                  reduce((sum, c) => sum + (c.next_total_debit || 0), 0)
                )}
                </span>
              </div>
            </div>
          </Card>
        }

        {/* Included Items Breakdown */}
        {includedItems.length > 0 &&
        <Card>
            <h3 data-ev-id="ev_18f7289123" className="font-semibold text-foreground mb-4">פירוט חיובים עד 10/{targetMonth + 1}/{targetYear}</h3>
            <div data-ev-id="ev_37c6e359ae" className="flex flex-col gap-2">
              {includedItems.map((item, index) =>
            <div data-ev-id="ev_dec9e9cf7c" key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div data-ev-id="ev_fa49c1b29f" className="flex items-center gap-3">
                    {item.type === 'credit' ?
                <CreditCard className="w-4 h-4 text-red-500" /> :

                <Calendar className="w-4 h-4 text-orange-500" />
                }
                    <div data-ev-id="ev_361b6bee87">
                      <span data-ev-id="ev_396c177770" className="text-foreground">{item.name}</span>
                      <span data-ev-id="ev_12ef803ad0" className="text-xs text-muted-foreground mr-2">
                        ({formatDateObj(item.date)})
                      </span>
                    </div>
                  </div>
                  <span data-ev-id="ev_387f234352" className="font-medium text-red-600">
                    -{formatCurrency(item.amount)}
                  </span>
                </div>
            )}
              <div data-ev-id="ev_59316f2c56" className="flex items-center justify-between py-2 pt-3 border-t-2 border-border font-bold">
                <span data-ev-id="ev_bcbd1e9d1f" className="text-foreground">סה"כ</span>
                <span data-ev-id="ev_8cfe5bd264" className="text-red-600">-{formatCurrency(totalDeductions)}</span>
              </div>
            </div>
          </Card>
        }

        {/* Scheduled Cash Flows Management */}
        <Card>
          <div data-ev-id="ev_931854ca53" className="flex items-center justify-between mb-4">
            <h3 data-ev-id="ev_b57197479b" className="font-semibold text-foreground">הוצאות קבועות (צ'קים, הוראות קבע וכו')</h3>
            <Button onClick={() => setShowForm(true)} size="sm">
              <Plus className="w-4 h-4 ml-1" />
              הוסף
            </Button>
          </div>

          {/* Add/Edit Form */}
          {showForm &&
          <div data-ev-id="ev_e9c09564ab" className="bg-muted/50 rounded-lg p-4 mb-4">
              <div data-ev-id="ev_1b45adfeee" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <Input
                label="שם ההוצאה"
                placeholder="למשל: צ'ק לספק X"
                value={formName}
                onChange={(e) => setFormName(e.target.value)} />

                <Input
                label="סכום"
                type="number"
                step="0.01"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)} />

                <Input
                label="יום בחודש (1-31)"
                type="number"
                min="1"
                max="31"
                value={formDayOfMonth}
                onChange={(e) => setFormDayOfMonth(e.target.value)} />

                <Input
                label="תאריך התחלה"
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)} />

                <Input
                label="תאריך סיום (אופציונלי)"
                type="date"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)} />

                <Input
                label="הערות"
                placeholder="הערות נוספות"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)} />

              </div>
              <div data-ev-id="ev_836b12aaa8" className="flex gap-2">
                <Button onClick={handleSubmit}>
                  <Check className="w-4 h-4 ml-1" />
                  {editingFlow ? 'עדכן' : 'הוסף'}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  <X className="w-4 h-4 ml-1" />
                  ביטול
                </Button>
              </div>
            </div>
          }

          {/* List */}
          {scheduledFlows.length === 0 ?
          <p data-ev-id="ev_6a06ac37cb" className="text-muted-foreground text-center py-8">
              אין הוצאות קבועות מתוכננות
            </p> :

          <div data-ev-id="ev_70334e4281" className="overflow-x-auto">
              <table data-ev-id="ev_e2cb703257" className="w-full">
                <thead data-ev-id="ev_644bce8a3a">
                  <tr data-ev-id="ev_43f6470e8a" className="border-b border-border">
                    <th data-ev-id="ev_273b362d1b" className="text-right p-3 text-sm font-medium text-muted-foreground">שם</th>
                    <th data-ev-id="ev_898945d5c1" className="text-right p-3 text-sm font-medium text-muted-foreground">סכום</th>
                    <th data-ev-id="ev_cd78975de4" className="text-right p-3 text-sm font-medium text-muted-foreground">יום בחודש</th>
                    <th data-ev-id="ev_aac4be4c13" className="text-right p-3 text-sm font-medium text-muted-foreground">תקופה</th>
                    <th data-ev-id="ev_a4ecd9f470" className="text-right p-3 text-sm font-medium text-muted-foreground">הערות</th>
                    <th data-ev-id="ev_70f9105951" className="p-3"></th>
                  </tr>
                </thead>
                <tbody data-ev-id="ev_42f1acbb41">
                  {scheduledFlows.map((flow) =>
                <tr data-ev-id="ev_b91cc6eb64" key={flow.id} className="border-b border-border hover:bg-muted/50">
                      <td data-ev-id="ev_b06473ac8d" className="p-3 text-foreground">{flow.name}</td>
                      <td data-ev-id="ev_7d18ab0462" className="p-3 text-foreground font-medium">{formatCurrency(flow.amount)}</td>
                      <td data-ev-id="ev_d28efcf948" className="p-3 text-foreground">{flow.day_of_month}</td>
                      <td data-ev-id="ev_2b81194599" className="p-3 text-muted-foreground text-sm">
                        {formatDate(flow.start_date)}
                        {flow.end_date ? ` - ${formatDate(flow.end_date)}` : ' - ללא הגבלה'}
                      </td>
                      <td data-ev-id="ev_bf35dffcff" className="p-3 text-muted-foreground text-sm">{flow.notes || '—'}</td>
                      <td data-ev-id="ev_55879461ed" className="p-3">
                        <div data-ev-id="ev_178f122783" className="flex gap-2 justify-end">
                          <button data-ev-id="ev_9605cb50fc"
                      onClick={() => startEditing(flow)}
                      className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground">

                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button data-ev-id="ev_474bc57efd"
                      onClick={() => handleDelete(flow.id)}
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
          }
        </Card>

        {/* Info about no data */}
        {!bankBalance &&
        <Card className="bg-muted/50">
            <p data-ev-id="ev_c64cbc3446" className="text-muted-foreground text-center">
              לא נמצאו נתוני יתרת עו"ש. הנתונים יעודכנו אוטומטית על ידי הסקריפט החיצוני.
            </p>
          </Card>
        }
      </div>
    </Layout>);

}