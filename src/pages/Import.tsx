import { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, FileSpreadsheet, Check, AlertCircle, X } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { ExpenseClassificationModal } from '@/components/ExpenseClassificationModal';
import { useHousehold } from '@/hooks/useHousehold';
import { supabase } from '@/integrations/supabase/client';
import { parseExcelFile, parseWithMapping, type CreditCardProvider } from '@/utils/excelParsers';
import type { ParsedExpense, ColumnMapping, Frequency, AmountType, ExpenseType, PaymentMethod } from '@/types';

const PROVIDER_NAMES: Record<CreditCardProvider, string> = {
  isracard: 'ישראכרט',
  cal: 'כאל',
  generic: 'לא זוהה'
};

export default function Import() {
  const { household, refreshData, expenseRules, creditCards } = useHousehold();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [provider, setProvider] = useState<CreditCardProvider | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [rawData, setRawData] = useState<Record<string, unknown>[]>([]);
  const [expenses, setExpenses] = useState<ParsedExpense[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'month' | 'mapping' | 'classify' | 'done'>('upload');

  // Selected month for all expenses in the file
  const [selectedYear, setSelectedYear] = useState(() => {
    const now = new Date();
    // Default to previous month
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return prevMonth.getFullYear();
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return prevMonth.getMonth() + 1; // 1-indexed
  });

  // Manual mapping for generic format
  const [mapping, setMapping] = useState<ColumnMapping>({
    name: '',
    amount: '',
    date: '',
    credit_card: ''
  });

  // Classification state - SEPARATED into auto and manual
  const [autoClassifiedExpenses, setAutoClassifiedExpenses] = useState<
    Array<ParsedExpense & {
      category_id: string;
      frequency: Frequency;
      amount_type: AmountType;
      expense_type: ExpenseType;
      payment_method: PaymentMethod;
      credit_card_id: string;
    }>>([]);

  // These are expenses that need manual classification
  const [manualExpenses, setManualExpenses] = useState<ParsedExpense[]>([]);
  const [currentManualIndex, setCurrentManualIndex] = useState(0);
  const [manualClassifiedExpenses, setManualClassifiedExpenses] = useState<
    Array<ParsedExpense & {
      category_id: string;
      frequency: Frequency;
      amount_type: AmountType;
      expense_type: ExpenseType;
      payment_method: PaymentMethod;
      credit_card_id: string;
    }>>([]);

  // Track if we already processed this batch
  const hasProcessedRef = useRef(false);

  // Process expenses when entering classify step - separate auto vs manual
  useEffect(() => {
    if (step !== 'classify' || expenses.length === 0 || hasProcessedRef.current) return;

    hasProcessedRef.current = true;

    const autoList: typeof autoClassifiedExpenses = [];
    const needManual: ParsedExpense[] = [];

    expenses.forEach((expense) => {
      const rule = expenseRules.find(
        (r) => r.expense_name.toLowerCase() === expense.name.toLowerCase()
      );

      if (rule) {
        // Auto-classify
        autoList.push({
          ...expense,
          category_id: rule.category_id || '',
          frequency: rule.frequency,
          amount_type: rule.amount_type,
          expense_type: rule.expense_type,
          payment_method: rule.payment_method,
          credit_card_id: ''
        });
      } else {
        // Needs manual classification
        needManual.push(expense);
      }
    });

    console.log(`Auto-classified: ${autoList.length}, Need manual: ${needManual.length}`);

    setAutoClassifiedExpenses(autoList);
    setManualExpenses(needManual);
    setCurrentManualIndex(0);
    setManualClassifiedExpenses([]);

    // If all were auto-classified, save immediately
    if (needManual.length === 0) {
      saveExpensesWithList(autoList);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, expenses.length]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      await processFile(droppedFile);
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      await processFile(selectedFile);
    }
  };

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setError('');
    setLoading(true);

    try {
      const result = await parseExcelFile(selectedFile);
      setProvider(result.provider);
      setColumns(result.columns);
      setRawData(result.rawData);

      if (result.provider !== 'generic' && result.expenses.length > 0) {
        console.log('Parsed expenses:', result.expenses.length);
        setExpenses(result.expenses);
        setStep('month'); // Go to month selection first
      } else {
        setStep('mapping');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בקריאת הקובץ');
    }

    setLoading(false);
  };

  const handleMappingSubmit = () => {
    if (!mapping.name || !mapping.amount || !mapping.date) {
      setError('נא למפות את כל השדות');
      return;
    }

    const parsed = parseWithMapping(rawData, mapping);
    if (parsed.length === 0) {
      setError('לא נמצאו הוצאות תקינות');
      return;
    }

    setExpenses(parsed);
    setStep('month'); // Go to month selection first
  };

  // Apply selected month to all expenses and proceed to classification
  const handleMonthConfirm = () => {
    // Create billing_month string (YYYY-MM format)
    // Keep original dates from Excel, only set billing_month for filtering
    console.log('Setting billing month:', `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`, 'for', expenses.length, 'expenses');
    setStep('classify');
  };

  const handleClassify = async (classification: {
    category_id: string;
    frequency: Frequency;
    amount_type: AmountType;
    expense_type: ExpenseType;
    payment_method: PaymentMethod;
    remember: boolean;
  }) => {
    const currentExpense = manualExpenses[currentManualIndex];
    if (!currentExpense) return;

    console.log('handleClassify for manual expense:', currentManualIndex, currentExpense.name);

    // Save the rule if remember is checked
    if (classification.remember && supabase && household) {
      await supabase.from('expense_rules').upsert(
        {
          household_id: household.id,
          expense_name: currentExpense.name,
          category_id: classification.category_id || null,
          frequency: classification.frequency,
          amount_type: classification.amount_type,
          expense_type: classification.expense_type,
          payment_method: classification.payment_method
        },
        { onConflict: 'household_id,expense_name' }
      );
    }

    // Add to manual classified list
    const newClassified = {
      ...currentExpense,
      category_id: classification.category_id,
      frequency: classification.frequency,
      amount_type: classification.amount_type,
      expense_type: classification.expense_type,
      payment_method: classification.payment_method,
      credit_card_id: ''
    };

    const updatedManualList = [...manualClassifiedExpenses, newClassified];
    setManualClassifiedExpenses(updatedManualList);

    // Move to next manual expense or finish
    if (currentManualIndex < manualExpenses.length - 1) {
      setCurrentManualIndex((prev) => prev + 1);
    } else {
      // Combine auto + manual and save
      const allExpenses = [...autoClassifiedExpenses, ...updatedManualList];
      await saveExpensesWithList(allExpenses);
    }
  };

  const handleSkip = async () => {
    const currentExpense = manualExpenses[currentManualIndex];
    if (!currentExpense) return;

    // Add with defaults
    const newClassified = {
      ...currentExpense,
      category_id: '',
      frequency: 'one_time' as const,
      amount_type: 'variable' as const,
      expense_type: 'optional' as const,
      payment_method: 'credit' as const,
      credit_card_id: ''
    };

    const updatedManualList = [...manualClassifiedExpenses, newClassified];
    setManualClassifiedExpenses(updatedManualList);

    if (currentManualIndex < manualExpenses.length - 1) {
      setCurrentManualIndex((prev) => prev + 1);
    } else {
      // Combine auto + manual and save
      const allExpenses = [...autoClassifiedExpenses, ...updatedManualList];
      await saveExpensesWithList(allExpenses);
    }
  };

  const saveExpensesWithList = async (expenseList: typeof autoClassifiedExpenses) => {
    if (!supabase || !household) return;

    setLoading(true);
    const batchId = `import_${Date.now()}`;

    // Create billing_month string
    const billingMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    
    const toSave = expenseList.map((exp) => {
      // Match credit card by last 4 digits if available
      let creditCardId: string | null = null;
      if (exp.credit_card_last_four) {
        const matchedCard = creditCards.find(
          (card) => card.last_four_digits === exp.credit_card_last_four
        );
        if (matchedCard) {
          creditCardId = matchedCard.id;
        }
      }
      
      return {
        household_id: household.id,
        name: exp.name,
        amount: exp.amount,
        date: exp.date,
        billing_month: billingMonth,
        category_id: exp.category_id || null,
        frequency: exp.frequency,
        amount_type: exp.amount_type,
        expense_type: exp.expense_type,
        payment_method: exp.payment_method,
        credit_card_id: creditCardId,
        import_batch_id: batchId
      };
    });

    console.log('Saving expenses:', toSave.length, 'items');

    const { error: saveError } = await supabase.from('expenses').insert(toSave);

    if (saveError) {
      console.error('Save expenses error:', saveError);
      setError(`שגיאה בשמירת ההוצאות: ${saveError.message}`);
    } else {
      console.log('Expenses saved successfully');
      await refreshData();
      setStep('done');
    }

    setLoading(false);
  };



  const resetImport = () => {
    setFile(null);
    setProvider(null);
    setColumns([]);
    setRawData([]);
    setExpenses([]);
    hasProcessedRef.current = false;
    setAutoClassifiedExpenses([]);
    setManualExpenses([]);
    setCurrentManualIndex(0);
    setManualClassifiedExpenses([]);
    setError('');
    setStep('upload');
    setMapping({ name: '', amount: '', date: '' });
  };

  return (
    <Layout>
      <div data-ev-id="ev_50d651d3fe" className="md:mr-52 flex flex-col gap-6 pb-24 md:pb-6">
        <div data-ev-id="ev_9753d38406">
          <h2 data-ev-id="ev_faba46b516" className="text-2xl font-bold text-foreground">ייבוא אקסל</h2>
          <p data-ev-id="ev_4ad49b22e4" className="text-muted-foreground">טען הוצאות מחברת האשראי</p>
        </div>

        {/* Upload step */}
        {step === 'upload' &&
        <Card
          className={`border-2 border-dashed transition-colors ${
          isDragging ? 'border-primary bg-primary/5' : 'border-border'}`
          }
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}>

            <div data-ev-id="ev_ccb5b06e76" className="flex flex-col items-center gap-4 py-8">
              <div data-ev-id="ev_251931c9ff" className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div data-ev-id="ev_3e62e91e7b" className="text-center">
                <p data-ev-id="ev_8ff0eeb054" className="font-semibold text-foreground">גרור קובץ לכאן</p>
                <p data-ev-id="ev_623025bf8d" className="text-sm text-muted-foreground">או לחץ לבחירה</p>
              </div>
              <input data-ev-id="ev_82478b3f0e"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            className="hidden"
            id="file-input" />

              <label data-ev-id="ev_c9e5783a91" htmlFor="file-input" className="inline-flex items-center justify-center font-medium rounded-lg transition-colors px-4 py-2 text-base gap-2 border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground cursor-pointer">
                  <FileSpreadsheet className="w-4 h-4" />
                  בחר קובץ
              </label>
            </div>
          </Card>
        }

        {/* Mapping step */}
        {step === 'mapping' &&
        <Card>
            <h3 data-ev-id="ev_5e681598fc" className="text-lg font-semibold text-foreground mb-4">מיפוי עמודות</h3>
            <p data-ev-id="ev_d46c970c74" className="text-muted-foreground mb-6">
              הפורמט לא זוהה אוטומטית. בחר את העמודות המתאימות:
            </p>

            <div data-ev-id="ev_244d3aa475" className="flex flex-col gap-4">
              <Select
              label="שם הוצאה"
              value={mapping.name}
              onChange={(e) => setMapping((m) => ({ ...m, name: e.target.value }))}
              options={[
              { value: '', label: 'בחר עמודה...' },
              ...columns.map((c) => ({ value: c, label: c }))]
              } />


              <Select
              label="סכום"
              value={mapping.amount}
              onChange={(e) => setMapping((m) => ({ ...m, amount: e.target.value }))}
              options={[
              { value: '', label: 'בחר עמודה...' },
              ...columns.map((c) => ({ value: c, label: c }))]
              } />


              <Select
              label="תאריך"
              value={mapping.date}
              onChange={(e) => setMapping((m) => ({ ...m, date: e.target.value }))}
              options={[
              { value: '', label: 'בחר עמודה...' },
              ...columns.map((c) => ({ value: c, label: c }))]
              } />

              <Select
              label="כרטיס אשראי (4 ספרות אחרונות) - אופציונלי"
              value={mapping.credit_card || ''}
              onChange={(e) => setMapping((m) => ({ ...m, credit_card: e.target.value }))}
              options={[
              { value: '', label: 'לא נבחר' },
              ...columns.map((c) => ({ value: c, label: c }))]
              } />

              <div data-ev-id="ev_bd324d21f6" className="flex gap-3 mt-4">
                <Button onClick={handleMappingSubmit}>המשך</Button>
                <Button variant="outline" onClick={resetImport}>
                  ביטול
                </Button>
              </div>
            </div>
          </Card>
        }

        {/* Month selection step */}
        {step === 'month' &&
        <Card>
            <h3 data-ev-id="ev_99bfb421dd" className="text-lg font-semibold text-foreground mb-4">בחירת חודש</h3>
            <p data-ev-id="ev_37257a8ebb" className="text-muted-foreground mb-6">
              לאיזה חודש מיועדות ההוצאות בקובץ זה? ({expenses.length} הוצאות)
            </p>
            
            <div data-ev-id="ev_bdf78713a9" className="flex gap-4 items-end">
              <Select
              label="חודש"
              value={String(selectedMonth)}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              options={[
              { value: '1', label: 'ינואר' },
              { value: '2', label: 'פברואר' },
              { value: '3', label: 'מרץ' },
              { value: '4', label: 'אפריל' },
              { value: '5', label: 'מאי' },
              { value: '6', label: 'יוני' },
              { value: '7', label: 'יולי' },
              { value: '8', label: 'אוגוסט' },
              { value: '9', label: 'ספטמבר' },
              { value: '10', label: 'אוקטובר' },
              { value: '11', label: 'נובמבר' },
              { value: '12', label: 'דצמבר' }]
              } />

              <Select
              label="שנה"
              value={String(selectedYear)}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              options={(() => {
                const currentYear = new Date().getFullYear();
                return [
                  { value: String(currentYear - 1), label: String(currentYear - 1) },
                  { value: String(currentYear), label: String(currentYear) },
                  { value: String(currentYear + 1), label: String(currentYear + 1) },
                  { value: String(currentYear + 2), label: String(currentYear + 2) },
                ];
              })()}
              />

            </div>
            
            <div data-ev-id="ev_9b6c8f0832" className="flex gap-3 mt-6">
              <Button onClick={handleMonthConfirm}>המשך</Button>
              <Button variant="outline" onClick={resetImport}>ביטול</Button>
            </div>
          </Card>
        }

        {/* Classification step */}
        {step === 'classify' && manualExpenses[currentManualIndex] &&
        <>
            <Card className="bg-muted/50">
              <div data-ev-id="ev_970d3055af" className="flex items-center justify-between">
                <div data-ev-id="ev_93868af727" className="flex items-center gap-3">
                  {provider && provider !== 'generic' &&
                <span data-ev-id="ev_df78d8e1b0" className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                      {PROVIDER_NAMES[provider]}
                    </span>
                }
                  <span data-ev-id="ev_3724b7aa43" className="text-muted-foreground">
                    סיווג ידני: {currentManualIndex + 1} / {manualExpenses.length}
                  </span>
                  {autoClassifiedExpenses.length > 0 &&
                <span data-ev-id="ev_3e3d0b6e03" className="text-green-600 text-sm">
                      ({autoClassifiedExpenses.length} סווגו אוטומטית)
                    </span>
                }
                </div>
                <Button variant="ghost" size="sm" onClick={resetImport}>
                  <X className="w-4 h-4" />
                  ביטול
                </Button>
              </div>
            </Card>

            <ExpenseClassificationModal
            expense={manualExpenses[currentManualIndex]}
            onSave={handleClassify}
            onSkip={handleSkip}
            onClose={resetImport} />

          </>
        }

        {/* Done step */}
        {step === 'done' &&
        <Card className="text-center py-8">
            <div data-ev-id="ev_179675e2a4" className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 data-ev-id="ev_fe97ba383f" className="text-xl font-bold text-foreground mb-2">הייבוא הושלם!</h3>
            <p data-ev-id="ev_2868bb75fb" className="text-muted-foreground mb-4">
              {autoClassifiedExpenses.length + manualClassifiedExpenses.length} הוצאות נוספו בהצלחה
            </p>
            {autoClassifiedExpenses.length > 0 &&
          <p data-ev-id="ev_5dad7ac718" className="text-sm text-green-600 mb-2">
                ✓ {autoClassifiedExpenses.length} סווגו אוטומטית
              </p>
          }
            {manualClassifiedExpenses.length > 0 &&
          <p data-ev-id="ev_a630b3a675" className="text-sm text-blue-600 mb-4">
                ✓ {manualClassifiedExpenses.length} סווגו ידנית
              </p>
          }
            <Button onClick={resetImport}>ייבוא נוסף</Button>
          </Card>
        }

        {/* Loading */}
        {loading &&
        <Card className="text-center py-8">
            <div data-ev-id="ev_a63b0c2b3e" className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p data-ev-id="ev_8c36e1ff00" className="text-muted-foreground">מעבד...</p>
          </Card>
        }

        {/* Error */}
        {error &&
        <Card className="bg-red-50 border border-red-200">
            <div data-ev-id="ev_df897735a4" className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <p data-ev-id="ev_5eccb18140" className="text-red-800">{error}</p>
            </div>
          </Card>
        }
      </div>
    </Layout>);

}