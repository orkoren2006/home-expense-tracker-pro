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

export default function CashFlow() {
  const { household, creditCards } = useHousehold();
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

      // Load bank balance
      const { data: balanceData } = await supabase
        .from('bank_balances')
        .select('*')
        .eq('household_id', household.id)
        .single();

      if (balanceData) {
        setBankBalance(balanceData as BankBalance);
      }

      // Load credit cards with debit info
      const { data: cardsData } = await supabase
        .from('credit_cards')
        .select('id, name, last_four_digits, next_total_debit, next_debit_date, next_debit_updated_at')
        .eq('household_id', household.id);

      if (cardsData) {
        setCardsWithDebit(cardsData as CreditCardWithDebit[]);
      }

      // Load scheduled cash flows
      const { data: flowsData } = await supabase
        .from('scheduled_cash_flows')
        .select('*')
        .eq('household_id', household.id)
        .order('day_of_month', { ascending: true });

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

    // Load bank balance
    const { data: balanceData } = await supabase.
    from('bank_balances').
    select('*').
    eq('household_id', household.id).
    single();

    if (balanceData) {
      setBankBalance(balanceData as BankBalance);
    }

    // Load credit cards with debit info
    const { data: cardsData } = await supabase.
    from('credit_cards').
    select('id, name, last_four_digits, next_total_debit, next_debit_date, next_debit_updated_at').
    eq('household_id', household.id);

    if (cardsData) {
      setCardsWithDebit(cardsData as CreditCardWithDebit[]);
    }

    // Load scheduled cash flows
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

  // Calculate total expected credit card debit
  const totalCreditDebit = useMemo(() => {
    return cardsWithDebit.
    filter((c) => c.next_total_debit !== null).
    reduce((sum, c) => sum + (c.next_total_debit || 0), 0);
  }, [cardsWithDebit]);

  // Get the earliest next debit date
  const nextDebitDate = useMemo(() => {
    const dates = cardsWithDebit.
    filter((c) => c.next_debit_date).
    map((c) => c.next_debit_date as string);
    if (dates.length === 0) return null;
    return dates.sort()[0];
  }, [cardsWithDebit]);

  // Calculate scheduled flows that fall between today and next debit date
  const relevantScheduledFlows = useMemo(() => {
    if (!nextDebitDate) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const debitDate = new Date(nextDebitDate);

    return scheduledFlows.filter((flow) => {
      const startDate = new Date(flow.start_date);
      const endDate = flow.end_date ? new Date(flow.end_date) : null;

      // Check if today is within the flow's active period
      if (today < startDate) return false;
      if (endDate && today > endDate) return false;

      // Check if the day_of_month falls between today and debit date
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const todayDay = today.getDate();
      const debitDay = debitDate.getDate();
      const debitMonth = debitDate.getMonth();
      const debitYear = debitDate.getFullYear();

      // Simple case: same month
      if (currentYear === debitYear && currentMonth === debitMonth) {
        return flow.day_of_month >= todayDay && flow.day_of_month <= debitDay;
      }

      // Different months: check if day falls in remaining current month or beginning of next
      if (flow.day_of_month >= todayDay) return true; // Falls in current month after today
      if (currentYear === debitYear && currentMonth + 1 === debitMonth && flow.day_of_month <= debitDay) return true;
      if (currentYear + 1 === debitYear && currentMonth === 11 && debitMonth === 0 && flow.day_of_month <= debitDay) return true;

      return false;
    });
  }, [scheduledFlows, nextDebitDate]);

  const totalScheduledAmount = useMemo(() => {
    return relevantScheduledFlows.reduce((sum, flow) => sum + flow.amount, 0);
  }, [relevantScheduledFlows]);

  // Calculate projected balance
  const projectedBalance = useMemo(() => {
    if (!bankBalance) return null;
    return bankBalance.balance - totalCreditDebit - totalScheduledAmount;
  }, [bankBalance, totalCreditDebit, totalScheduledAmount]);

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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('he-IL');
  };

  if (loading) {
    return (
      <Layout>
        <div data-ev-id="ev_b9ba3032b5" className="md:mr-52 flex items-center justify-center py-12">
          <div data-ev-id="ev_b1eee308f1" className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </Layout>);

  }

  return (
    <Layout>
      <div data-ev-id="ev_de16c4e45f" className="md:mr-52 flex flex-col gap-6 pb-24 md:pb-6">
        <div data-ev-id="ev_2db4fda2ff">
          <h2 data-ev-id="ev_f6c664df07" className="text-2xl font-bold text-foreground">תזרים מזומנים</h2>
          <p data-ev-id="ev_0cfccc45c4" className="text-muted-foreground">תחזית יתרת העו"ש</p>
        </div>

        {/* Summary Cards */}
        <div data-ev-id="ev_2445323131" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Current Balance */}
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5">
            <div data-ev-id="ev_4410a9f360" className="flex items-center gap-3 mb-2">
              <div data-ev-id="ev_fa66650b26" className="p-2 bg-blue-500/20 rounded-lg">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <span data-ev-id="ev_465bbb59c2" className="text-sm text-muted-foreground">יתרת עו"ש</span>
            </div>
            <p data-ev-id="ev_e57dacbbae" className="text-2xl font-bold text-foreground">
              {bankBalance ? formatCurrency(bankBalance.balance) : '—'}
            </p>
            {bankBalance &&
            <p data-ev-id="ev_c658021194" className="text-xs text-muted-foreground mt-1">
                נכון ל-{formatDate(bankBalance.as_of_date)}
              </p>
            }
          </Card>

          {/* Credit Card Debit */}
          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5">
            <div data-ev-id="ev_502e322892" className="flex items-center gap-3 mb-2">
              <div data-ev-id="ev_f53573f13a" className="p-2 bg-red-500/20 rounded-lg">
                <CreditCard className="w-5 h-5 text-red-600" />
              </div>
              <span data-ev-id="ev_85691fc230" className="text-sm text-muted-foreground">חיוב אשראי צפוי</span>
            </div>
            <p data-ev-id="ev_e50f90a621" className="text-2xl font-bold text-red-600">
              {totalCreditDebit > 0 ? `-${formatCurrency(totalCreditDebit)}` : '—'}
            </p>
            {nextDebitDate &&
            <p data-ev-id="ev_eacfdee140" className="text-xs text-muted-foreground mt-1">
                בתאריך {formatDate(nextDebitDate)}
              </p>
            }
          </Card>

          {/* Scheduled Flows */}
          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5">
            <div data-ev-id="ev_dfd1452715" className="flex items-center gap-3 mb-2">
              <div data-ev-id="ev_78e1b1c606" className="p-2 bg-orange-500/20 rounded-lg">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <span data-ev-id="ev_a9ec5ce406" className="text-sm text-muted-foreground">הוצאות קבועות צפויות</span>
            </div>
            <p data-ev-id="ev_01eed67d56" className="text-2xl font-bold text-orange-600">
              {totalScheduledAmount > 0 ? `-${formatCurrency(totalScheduledAmount)}` : '—'}
            </p>
            <p data-ev-id="ev_5e5c7fcd06" className="text-xs text-muted-foreground mt-1">
              {relevantScheduledFlows.length} פריטים עד החיוב
            </p>
          </Card>

          {/* Projected Balance */}
          <Card className={`bg-gradient-to-br ${
          projectedBalance !== null && projectedBalance < 0 ?
          'from-red-500/20 to-red-600/10 border-red-500/30' :
          'from-green-500/10 to-green-600/5'}`
          }>
            <div data-ev-id="ev_31129548a1" className="flex items-center gap-3 mb-2">
              <div data-ev-id="ev_8434a27b77" className={`p-2 rounded-lg ${
              projectedBalance !== null && projectedBalance < 0 ?
              'bg-red-500/20' :
              'bg-green-500/20'}`
              }>
                {projectedBalance !== null && projectedBalance < 0 ?
                <AlertTriangle className="w-5 h-5 text-red-600" /> :

                <TrendingDown className="w-5 h-5 text-green-600" />
                }
              </div>
              <span data-ev-id="ev_a9a550cb76" className="text-sm text-muted-foreground">יתרה צפויה</span>
            </div>
            <p data-ev-id="ev_1f97b254d0" className={`text-2xl font-bold ${
            projectedBalance !== null && projectedBalance < 0 ?
            'text-red-600' :
            'text-green-600'}`
            }>
              {projectedBalance !== null ? formatCurrency(projectedBalance) : '—'}
            </p>
            <p data-ev-id="ev_3f4a32509b" className="text-xs text-muted-foreground mt-1">
              לאחר כל החיובים
            </p>
          </Card>
        </div>

        {/* Credit Card Breakdown */}
        {cardsWithDebit.some((c) => c.next_total_debit !== null) &&
        <Card>
            <h3 data-ev-id="ev_b4c7e7b885" className="font-semibold text-foreground mb-4">פירוט חיובי אשראי</h3>
            <div data-ev-id="ev_dedfeb4f88" className="flex flex-col gap-2">
              {cardsWithDebit.
            filter((c) => c.next_total_debit !== null).
            map((card) =>
            <div data-ev-id="ev_a9abd26cb4" key={card.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div data-ev-id="ev_c578a84df1" className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <span data-ev-id="ev_d9fb955808" className="text-foreground">{card.name}</span>
                      {card.last_four_digits &&
                <span data-ev-id="ev_4dc9141b24" className="text-xs text-muted-foreground">({card.last_four_digits})</span>
                }
                    </div>
                    <span data-ev-id="ev_4cdd65ba97" className="font-medium text-red-600">
                      {formatCurrency(card.next_total_debit || 0)}
                    </span>
                  </div>
            )}
            </div>
          </Card>
        }

        {/* Scheduled Cash Flows Management */}
        <Card>
          <div data-ev-id="ev_73f49a4ce6" className="flex items-center justify-between mb-4">
            <h3 data-ev-id="ev_2dce2e9eab" className="font-semibold text-foreground">הוצאות קבועות (צ'קים, הוראות קבע וכו')</h3>
            <Button onClick={() => setShowForm(true)} size="sm">
              <Plus className="w-4 h-4 ml-1" />
              הוסף
            </Button>
          </div>

          {/* Add/Edit Form */}
          {showForm &&
          <div data-ev-id="ev_769d4be587" className="bg-muted/50 rounded-lg p-4 mb-4">
              <div data-ev-id="ev_724485f17d" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
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
              <div data-ev-id="ev_bca5ba2cf3" className="flex gap-2">
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
          <p data-ev-id="ev_3cfa0eadd4" className="text-muted-foreground text-center py-8">
              אין הוצאות קבועות מתוכננות
            </p> :

          <div data-ev-id="ev_77d87d2999" className="overflow-x-auto">
              <table data-ev-id="ev_2e478cace4" className="w-full">
                <thead data-ev-id="ev_2e95d4a45d">
                  <tr data-ev-id="ev_d2fb388d4e" className="border-b border-border">
                    <th data-ev-id="ev_b1f28b14fc" className="text-right p-3 text-sm font-medium text-muted-foreground">שם</th>
                    <th data-ev-id="ev_0b15fa8fe0" className="text-right p-3 text-sm font-medium text-muted-foreground">סכום</th>
                    <th data-ev-id="ev_220499ec1f" className="text-right p-3 text-sm font-medium text-muted-foreground">יום בחודש</th>
                    <th data-ev-id="ev_bc58ef6cfc" className="text-right p-3 text-sm font-medium text-muted-foreground">תקופה</th>
                    <th data-ev-id="ev_368ff3d313" className="text-right p-3 text-sm font-medium text-muted-foreground">הערות</th>
                    <th data-ev-id="ev_af84980151" className="p-3"></th>
                  </tr>
                </thead>
                <tbody data-ev-id="ev_d0bcab702a">
                  {scheduledFlows.map((flow) =>
                <tr data-ev-id="ev_c47d4a19ea" key={flow.id} className="border-b border-border hover:bg-muted/50">
                      <td data-ev-id="ev_8243429a34" className="p-3 text-foreground">{flow.name}</td>
                      <td data-ev-id="ev_69d0dcbb04" className="p-3 text-foreground font-medium">{formatCurrency(flow.amount)}</td>
                      <td data-ev-id="ev_a27a3736cc" className="p-3 text-foreground">{flow.day_of_month}</td>
                      <td data-ev-id="ev_9bfc1fa2cc" className="p-3 text-muted-foreground text-sm">
                        {formatDate(flow.start_date)}
                        {flow.end_date ? ` - ${formatDate(flow.end_date)}` : ' - ללא הגבלה'}
                      </td>
                      <td data-ev-id="ev_7b71335896" className="p-3 text-muted-foreground text-sm">{flow.notes || '—'}</td>
                      <td data-ev-id="ev_af7b0a6802" className="p-3">
                        <div data-ev-id="ev_3f1114438d" className="flex gap-2 justify-end">
                          <button data-ev-id="ev_046b9113ac"
                      onClick={() => startEditing(flow)}
                      className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground">

                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button data-ev-id="ev_b27ba561aa"
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
            <p data-ev-id="ev_17120b3e23" className="text-muted-foreground text-center">
              לא נמצאו נתוני יתרת עו"ש. הנתונים יעודכנו אוטומטית על ידי הסקריפט החיצוני.
            </p>
          </Card>
        }
      </div>
    </Layout>);

}