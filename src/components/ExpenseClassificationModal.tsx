import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useHousehold } from '@/hooks/useHousehold';
import { supabase } from '@/integrations/supabase/client';
import type { ParsedExpense, Frequency, AmountType, ExpenseType, PaymentMethod } from '@/types';
import {
  FREQUENCY_LABELS,
  AMOUNT_TYPE_LABELS,
  EXPENSE_TYPE_LABELS,
  PAYMENT_METHOD_LABELS } from
'@/types';

interface ExpenseClassificationModalProps {
  expense: ParsedExpense;
  onSave: (classification: {
    category_id: string;
    frequency: Frequency;
    amount_type: AmountType;
    expense_type: ExpenseType;
    payment_method: PaymentMethod;
    remember: boolean;
  }) => void;
  onSkip: () => void;
  onClose: () => void;
}

export function ExpenseClassificationModal({
  expense,
  onSave,
  onSkip,
  onClose
}: ExpenseClassificationModalProps) {
  const { categories, creditCards, expenseRules, defaultSettings } = useHousehold();

  // Check if there's an existing rule for this expense name
  const existingRule = expenseRules.find(
    (rule) => rule.expense_name.toLowerCase() === expense.name.toLowerCase()
  );

  const expenseCategories = categories.filter((c) => c.type === 'expense');

  const [categoryId, setCategoryId] = useState(
    existingRule?.category_id || defaultSettings?.category_id || ''
  );
  const [frequency, setFrequency] = useState<Frequency>(
    existingRule?.frequency || defaultSettings?.frequency || 'one_time'
  );
  const [amountType, setAmountType] = useState<AmountType>(
    existingRule?.amount_type || defaultSettings?.amount_type || 'variable'
  );
  const [expenseType, setExpenseType] = useState<ExpenseType>(
    existingRule?.expense_type || defaultSettings?.expense_type || 'optional'
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    existingRule?.payment_method || defaultSettings?.payment_method || 'credit'
  );
  const [remember, setRemember] = useState(true);

  // If rule exists, don't show modal - parent handles auto-classification
  if (existingRule) {
    return null;
  }

  const handleSave = () => {
    onSave({
      category_id: categoryId,
      frequency,
      amount_type: amountType,
      expense_type: expenseType,
      payment_method: paymentMethod,
      remember
    });
  };

  return (
    <div data-ev-id="ev_5781922e87" className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" dir="rtl">
      <div data-ev-id="ev_290c82fffb" className="bg-card rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div data-ev-id="ev_43b621a3b4" className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
          <h2 data-ev-id="ev_4fcd641d55" className="text-lg font-bold text-foreground">סיווג הוצאה</h2>
          <button data-ev-id="ev_4479f63475" onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div data-ev-id="ev_6b08171743" className="p-4">
          {/* Expense info */}
          <div data-ev-id="ev_54b1aadb48" className="bg-muted rounded-xl p-4 mb-6">
            <p data-ev-id="ev_0eb7a62909" className="font-semibold text-foreground text-lg">{expense.name}</p>
            <div data-ev-id="ev_38da61eb1d" className="flex justify-between mt-2 text-sm text-muted-foreground">
              <span data-ev-id="ev_bfaadce937">₪{expense.amount.toLocaleString()}</span>
              <span data-ev-id="ev_33e81ab5ee">{new Date(expense.date).toLocaleDateString('he-IL')}</span>
            </div>
          </div>

          {/* Classification form */}
          <div data-ev-id="ev_7f4f7735ce" className="flex flex-col gap-4">
            <Select
              label="קטגוריה"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              options={[
              { value: '', label: 'בחר קטגוריה...' },
              ...expenseCategories.map((c) => ({ value: c.id, label: c.name }))]
              } />


            <Select
              label="תדירות תשלום"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as Frequency)}
              options={Object.entries(FREQUENCY_LABELS).map(([value, label]) => ({
                value,
                label
              }))} />


            <Select
              label="סוג סכום"
              value={amountType}
              onChange={(e) => setAmountType(e.target.value as AmountType)}
              options={Object.entries(AMOUNT_TYPE_LABELS).map(([value, label]) => ({
                value,
                label
              }))} />


            <Select
              label="סוג הוצאה"
              value={expenseType}
              onChange={(e) => setExpenseType(e.target.value as ExpenseType)}
              options={Object.entries(EXPENSE_TYPE_LABELS).map(([value, label]) => ({
                value,
                label
              }))} />


            <Select
              label="אמצעי תשלום"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              options={Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({
                value,
                label
              }))} />


            

            <label data-ev-id="ev_c5d405de36" className="flex items-center gap-2 cursor-pointer">
              <input data-ev-id="ev_b648e3029b"
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-5 h-5 rounded border-border text-primary focus:ring-primary" />

              <span data-ev-id="ev_62e24375aa" className="text-foreground">זכור להבא (סווג אוטומטית בפעם הבאה)</span>
            </label>
          </div>
        </div>

        <div data-ev-id="ev_634b9d2022" className="sticky bottom-0 bg-card border-t border-border p-4 flex gap-3">
          <Button onClick={handleSave} className="flex-1">
            שמור
          </Button>
          <Button variant="outline" onClick={onSkip}>
            דלג
          </Button>
        </div>
      </div>
    </div>);

}