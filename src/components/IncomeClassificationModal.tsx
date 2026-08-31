import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useHousehold } from '@/hooks/useHousehold';
import type { ParsedIncome, Frequency, AmountType, IncomePaymentMethod, IncomeSource } from '@/types';
import {
  FREQUENCY_LABELS,
  AMOUNT_TYPE_LABELS,
  INCOME_PAYMENT_METHOD_LABELS,
  INCOME_SOURCE_LABELS } from
'@/types';

interface IncomeClassificationModalProps {
  income: ParsedIncome;
  onSave: (classification: {
    frequency: Frequency;
    amount_type: AmountType;
    payment_method: IncomePaymentMethod;
    source: IncomeSource;
    remember: boolean;
  }) => void;
  onSkip: () => void;
  onClose: () => void;
}

export function IncomeClassificationModal({
  income,
  onSave,
  onSkip,
  onClose
}: IncomeClassificationModalProps) {
  const { incomeRules, classificationOptions, defaultIncomeSettings } = useHousehold();

  // Check if there's an existing rule for this income name
  const existingRule = incomeRules.find(
    (rule) => rule.income_name.toLowerCase() === income.name.toLowerCase()
  );

  const [frequency, setFrequency] = useState<Frequency>(
    existingRule?.frequency || defaultIncomeSettings?.frequency || 'monthly'
  );
  const [amountType, setAmountType] = useState<AmountType>(
    existingRule?.amount_type || defaultIncomeSettings?.amount_type || 'fixed'
  );
  const [paymentMethod, setPaymentMethod] = useState<IncomePaymentMethod>(
    existingRule?.payment_method || defaultIncomeSettings?.payment_method || 'salary'
  );
  const [source, setSource] = useState<IncomeSource>(
    existingRule?.source || defaultIncomeSettings?.source || 'work'
  );
  const [remember, setRemember] = useState(true);

  // If rule exists, don't show modal - parent handles auto-classification
  if (existingRule) {
    return null;
  }

  // Build options with custom ones
  const frequencyOptions = [
  ...Object.entries(FREQUENCY_LABELS).map(([value, label]) => ({ value, label })),
  ...classificationOptions.
  filter((o) => o.option_type === 'frequency').
  map((o) => ({ value: o.value, label: o.label }))];


  const amountTypeOptions = [
  ...Object.entries(AMOUNT_TYPE_LABELS).map(([value, label]) => ({ value, label })),
  ...classificationOptions.
  filter((o) => o.option_type === 'amount_type').
  map((o) => ({ value: o.value, label: o.label }))];


  const paymentMethodOptions = [
  ...Object.entries(INCOME_PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value, label })),
  ...classificationOptions.
  filter((o) => o.option_type === 'income_payment_method').
  map((o) => ({ value: o.value, label: o.label }))];


  const sourceOptions = [
  ...Object.entries(INCOME_SOURCE_LABELS).map(([value, label]) => ({ value, label })),
  ...classificationOptions.
  filter((o) => o.option_type === 'income_source').
  map((o) => ({ value: o.value, label: o.label }))];


  const handleSave = () => {
    onSave({
      frequency,
      amount_type: amountType,
      payment_method: paymentMethod,
      source,
      remember
    });
  };

  return (
    <div data-ev-id="ev_0a0018ff14" className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" dir="rtl">
      <div data-ev-id="ev_fa0d171924" className="bg-card rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div data-ev-id="ev_9c6dc0e651" className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
          <h2 data-ev-id="ev_0977a36cff" className="text-lg font-bold text-foreground">סיווג הכנסה</h2>
          <button data-ev-id="ev_0e420d3845" onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div data-ev-id="ev_37dc8bb904" className="p-4">
          {/* Income info */}
          <div data-ev-id="ev_b8933c8c2a" className="bg-muted rounded-xl p-4 mb-6">
            <p data-ev-id="ev_a3cdc2dd7c" className="font-semibold text-foreground text-lg">{income.name}</p>
            <div data-ev-id="ev_26dccb0544" className="flex justify-between mt-2 text-sm text-muted-foreground">
              <span data-ev-id="ev_4c3334717a">₪{income.amount.toLocaleString()}</span>
              <span data-ev-id="ev_a9efb13ab6">{new Date(income.date).toLocaleDateString('he-IL')}</span>
            </div>
          </div>

          {/* Classification form */}
          <div data-ev-id="ev_331ab7adb2" className="flex flex-col gap-4">
            <Select
              label="מקור הכנסה"
              value={source}
              onChange={(e) => setSource(e.target.value as IncomeSource)}
              options={sourceOptions} />


            <Select
              label="אמצעי תשלום"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as IncomePaymentMethod)}
              options={paymentMethodOptions} />


            <Select
              label="תדירות"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as Frequency)}
              options={frequencyOptions} />


            <Select
              label="סוג סכום"
              value={amountType}
              onChange={(e) => setAmountType(e.target.value as AmountType)}
              options={amountTypeOptions} />


            <label data-ev-id="ev_112b8ac9b2" className="flex items-center gap-2 cursor-pointer">
              <input data-ev-id="ev_205ae7e595"
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-5 h-5 rounded border-border text-primary focus:ring-primary" />

              <span data-ev-id="ev_736d208800" className="text-foreground">זכור להבא (סווג אוטומטית בפעם הבאה)</span>
            </label>
          </div>
        </div>

        <div data-ev-id="ev_330c889134" className="sticky bottom-0 bg-card border-t border-border p-4 flex gap-3">
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