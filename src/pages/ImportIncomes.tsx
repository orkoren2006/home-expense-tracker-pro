import { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, FileSpreadsheet, Check, AlertCircle, X } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { IncomeClassificationModal } from '@/components/IncomeClassificationModal';
import { useHousehold } from '@/hooks/useHousehold';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import type {
  ParsedIncome,
  IncomeColumnMapping,
  Frequency,
  AmountType,
  IncomePaymentMethod,
  IncomeSource } from
'@/types';

export default function ImportIncomes() {
  const { household, refreshData, incomeRules } = useHousehold();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [rawData, setRawData] = useState<Record<string, unknown>[]>([]);
  const [incomes, setIncomes] = useState<ParsedIncome[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'mapping' | 'month' | 'classify' | 'done'>('upload');

  // Selected month for all incomes in the file
  const [selectedYear, setSelectedYear] = useState(() => {
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return prevMonth.getFullYear();
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return prevMonth.getMonth() + 1;
  });

  // Manual mapping
  const [mapping, setMapping] = useState<IncomeColumnMapping>({
    name: '',
    amount: '',
    date: '',
    notes: ''
  });

  // Classification state
  const [autoClassifiedIncomes, setAutoClassifiedIncomes] = useState<
    Array<ParsedIncome & {
      frequency: Frequency;
      amount_type: AmountType;
      payment_method: IncomePaymentMethod;
      source: IncomeSource;
    }>>(
    []);

  const [manualIncomes, setManualIncomes] = useState<ParsedIncome[]>([]);
  const [currentManualIndex, setCurrentManualIndex] = useState(0);
  const [manualClassifiedIncomes, setManualClassifiedIncomes] = useState<
    Array<ParsedIncome & {
      frequency: Frequency;
      amount_type: AmountType;
      payment_method: IncomePaymentMethod;
      source: IncomeSource;
    }>>(
    []);

  const hasProcessedRef = useRef(false);

  // Process incomes when entering classify step
  useEffect(() => {
    if (step !== 'classify' || incomes.length === 0 || hasProcessedRef.current) return;

    hasProcessedRef.current = true;

    const autoList: typeof autoClassifiedIncomes = [];
    const needManual: ParsedIncome[] = [];

    incomes.forEach((income) => {
      const rule = incomeRules.find(
        (r) => r.income_name.toLowerCase() === income.name.toLowerCase()
      );

      if (rule) {
        autoList.push({
          ...income,
          frequency: rule.frequency,
          amount_type: rule.amount_type,
          payment_method: rule.payment_method,
          source: rule.source
        });
      } else {
        needManual.push(income);
      }
    });

    setAutoClassifiedIncomes(autoList);
    setManualIncomes(needManual);
    setCurrentManualIndex(0);
    setManualClassifiedIncomes([]);

    if (needManual.length === 0) {
      saveIncomesWithList(autoList);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, incomes.length]);

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
      const arrayBuffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);

      if (data.length === 0) {
        throw new Error('הקובץ ריק');
      }

      const cols = Object.keys(data[0]);
      setColumns(cols);
      setRawData(data);
      setStep('mapping');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בקריאת הקובץ');
    }

    setLoading(false);
  };

  const parseDate = (value: unknown): string => {
    if (!value) return new Date().toISOString().split('T')[0];

    // Excel serial date number
    if (typeof value === 'number') {
      // Excel epoch is Dec 30, 1899 (accounting for the leap year bug)
      // Use UTC to avoid timezone issues
      const excelEpoch = Date.UTC(1899, 11, 30);
      const msPerDay = 24 * 60 * 60 * 1000;
      const utcDate = new Date(excelEpoch + value * msPerDay);
      const year = utcDate.getUTCFullYear();
      const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(utcDate.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    const str = String(value).trim();

    // Try DD/MM/YYYY or DD-MM-YYYY (Israeli format)
    const slashParts = str.split('/');
    const dashParts = str.split('-');

    if (slashParts.length === 3) {
      const [day, month, year] = slashParts.map((p) => parseInt(p, 10));
      if (day && month && year && day <= 31 && month <= 12) {
        const fullYear = year < 100 ? 2000 + year : year;
        return `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    // Check if it's already YYYY-MM-DD format
    if (dashParts.length === 3 && dashParts[0].length === 4) {
      const [year, month, day] = dashParts.map((p) => parseInt(p, 10));
      if (year && month && day && month <= 12 && day <= 31) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    // Try DD-MM-YYYY format
    if (dashParts.length === 3 && dashParts[2].length === 4) {
      const [day, month, year] = dashParts.map((p) => parseInt(p, 10));
      if (day && month && year && day <= 31 && month <= 12) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    // Fallback: try native Date parsing (but be careful with format)
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return new Date().toISOString().split('T')[0];
  };

  const parseAmount = (value: unknown): number => {
    if (typeof value === 'number') return Math.abs(value);
    const str = String(value).replace(/[^0-9.-]/g, '');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : Math.abs(num);
  };

  const handleMappingSubmit = () => {
    if (!mapping.name || !mapping.amount || !mapping.date) {
      setError('נא למפות את כל השדות');
      return;
    }

    const parsed: ParsedIncome[] = rawData.map((row) => ({
      name: String(row[mapping.name] || '').trim(),
      amount: parseAmount(row[mapping.amount]),
      date: parseDate(row[mapping.date]),
      notes: mapping.notes && row[mapping.notes] ? String(row[mapping.notes]).trim() : undefined,
      originalRow: row
    })).filter((inc) => inc.name && inc.amount > 0);

    if (parsed.length === 0) {
      setError('לא נמצאו הכנסות תקינות');
      return;
    }

    setIncomes(parsed);
    setStep('month');
  };

  const handleMonthConfirm = () => {
    setStep('classify');
  };

  const handleClassify = async (classification: {
    frequency: Frequency;
    amount_type: AmountType;
    payment_method: IncomePaymentMethod;
    source: IncomeSource;
    remember: boolean;
  }) => {
    const currentIncome = manualIncomes[currentManualIndex];
    if (!currentIncome) return;

    // Save the rule if remember is checked
    if (classification.remember && supabase && household) {
      await supabase.from('income_rules').upsert(
        {
          household_id: household.id,
          income_name: currentIncome.name,
          frequency: classification.frequency,
          amount_type: classification.amount_type,
          payment_method: classification.payment_method,
          source: classification.source
        },
        { onConflict: 'household_id,income_name' }
      );
    }

    const newClassified = {
      ...currentIncome,
      frequency: classification.frequency,
      amount_type: classification.amount_type,
      payment_method: classification.payment_method,
      source: classification.source
    };

    const updatedManualList = [...manualClassifiedIncomes, newClassified];
    setManualClassifiedIncomes(updatedManualList);

    if (currentManualIndex < manualIncomes.length - 1) {
      setCurrentManualIndex((prev) => prev + 1);
    } else {
      const allIncomes = [...autoClassifiedIncomes, ...updatedManualList];
      await saveIncomesWithList(allIncomes);
    }
  };

  const handleSkip = async () => {
    const currentIncome = manualIncomes[currentManualIndex];
    if (!currentIncome) return;

    const newClassified = {
      ...currentIncome,
      frequency: 'monthly' as const,
      amount_type: 'fixed' as const,
      payment_method: 'salary' as const,
      source: 'work' as const
    };

    const updatedManualList = [...manualClassifiedIncomes, newClassified];
    setManualClassifiedIncomes(updatedManualList);

    if (currentManualIndex < manualIncomes.length - 1) {
      setCurrentManualIndex((prev) => prev + 1);
    } else {
      const allIncomes = [...autoClassifiedIncomes, ...updatedManualList];
      await saveIncomesWithList(allIncomes);
    }
  };

  const saveIncomesWithList = async (incomeList: typeof autoClassifiedIncomes) => {
    if (!supabase || !household) return;

    setLoading(true);
    const batchId = `import_income_${Date.now()}`;
    const billingMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

    const toSave = incomeList.map((inc) => ({
      household_id: household.id,
      name: inc.name,
      amount: inc.amount,
      date: inc.date,
      billing_month: billingMonth,
      frequency: inc.frequency,
      amount_type: inc.amount_type,
      payment_method: inc.payment_method,
      source: inc.source,
      notes: inc.notes || null,
      import_batch_id: batchId
    }));

    const { error: saveError } = await supabase.from('incomes').insert(toSave);

    if (saveError) {
      setError(`שגיאה בשמירת ההכנסות: ${saveError.message}`);
    } else {
      await refreshData();
      setStep('done');
    }

    setLoading(false);
  };

  const resetImport = () => {
    setFile(null);
    setColumns([]);
    setRawData([]);
    setIncomes([]);
    hasProcessedRef.current = false;
    setAutoClassifiedIncomes([]);
    setManualIncomes([]);
    setCurrentManualIndex(0);
    setManualClassifiedIncomes([]);
    setError('');
    setStep('upload');
    setMapping({ name: '', amount: '', date: '' });
  };

  return (
    <Layout>
      <div data-ev-id="ev_b732574c5d" className="md:mr-52 flex flex-col gap-6 pb-24 md:pb-6">
        <div data-ev-id="ev_8a12e006cb">
          <h2 data-ev-id="ev_02cfb032f0" className="text-2xl font-bold text-foreground">ייבוא הכנסות</h2>
          <p data-ev-id="ev_9fbaa55463" className="text-muted-foreground">טען הכנסות מקובץ אקסל</p>
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

            <div data-ev-id="ev_4ce921fd63" className="flex flex-col items-center gap-4 py-8">
              <div data-ev-id="ev_69e8bf8eeb" className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div data-ev-id="ev_beac87a535" className="text-center">
                <p data-ev-id="ev_1f2d4f67b5" className="font-semibold text-foreground">גרור קובץ לכאן</p>
                <p data-ev-id="ev_173aeca984" className="text-sm text-muted-foreground">או לחץ לבחירה</p>
              </div>
              <input data-ev-id="ev_bdbd1fe71d"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            className="hidden"
            id="income-file-input" />

              <label data-ev-id="ev_cda5c8be05"
            htmlFor="income-file-input"
            className="inline-flex items-center justify-center font-medium rounded-lg transition-colors px-4 py-2 text-base gap-2 border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground cursor-pointer">

                <FileSpreadsheet className="w-4 h-4" />
                בחר קובץ
              </label>
            </div>
          </Card>
        }

        {/* Mapping step */}
        {step === 'mapping' &&
        <Card>
            <h3 data-ev-id="ev_715f59f4ff" className="text-lg font-semibold text-foreground mb-4">מיפוי עמודות</h3>
            <p data-ev-id="ev_25932adcb2" className="text-muted-foreground mb-6">בחר את העמודות המתאימות:</p>

            <div data-ev-id="ev_c4f2792602" className="flex flex-col gap-4">
              <Select
              label="שם הכנסה"
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
              label="הערות - אופציונלי"
              value={mapping.notes || ''}
              onChange={(e) => setMapping((m) => ({ ...m, notes: e.target.value }))}
              options={[
              { value: '', label: 'לא נבחר' },
              ...columns.map((c) => ({ value: c, label: c }))]
              } />

              <div data-ev-id="ev_fd68f24a67" className="flex gap-3 mt-4">
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
            <h3 data-ev-id="ev_828df14fa5" className="text-lg font-semibold text-foreground mb-4">בחירת חודש</h3>
            <p data-ev-id="ev_4b6a46ddcc" className="text-muted-foreground mb-6">
              לאיזה חודש מיועדות ההכנסות בקובץ זה? ({incomes.length} הכנסות)
            </p>

            <div data-ev-id="ev_398df869e7" className="flex gap-4 items-end">
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
                { value: String(currentYear + 2), label: String(currentYear + 2) }];

              })()} />

            </div>

            <div data-ev-id="ev_49343463a3" className="flex gap-3 mt-6">
              <Button onClick={handleMonthConfirm}>המשך</Button>
              <Button variant="outline" onClick={resetImport}>
                ביטול
              </Button>
            </div>
          </Card>
        }

        {/* Classification step */}
        {step === 'classify' && manualIncomes[currentManualIndex] &&
        <>
            <Card className="bg-muted/50">
              <div data-ev-id="ev_b19e017d44" className="flex items-center justify-between">
                <div data-ev-id="ev_17a08488fb" className="flex items-center gap-3">
                  <span data-ev-id="ev_de5dac0437" className="text-muted-foreground">
                    סיווג ידני: {currentManualIndex + 1} / {manualIncomes.length}
                  </span>
                  {autoClassifiedIncomes.length > 0 &&
                <span data-ev-id="ev_7316c9f250" className="text-green-600 text-sm">
                      ({autoClassifiedIncomes.length} סווגו אוטומטית)
                    </span>
                }
                </div>
                <Button variant="ghost" size="sm" onClick={resetImport}>
                  <X className="w-4 h-4" />
                  ביטול
                </Button>
              </div>
            </Card>

            <IncomeClassificationModal
            income={manualIncomes[currentManualIndex]}
            onSave={handleClassify}
            onSkip={handleSkip}
            onClose={resetImport} />

          </>
        }

        {/* Done step */}
        {step === 'done' &&
        <Card className="text-center py-8">
            <div data-ev-id="ev_7ea668dc9f" className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 data-ev-id="ev_713810b643" className="text-xl font-bold text-foreground mb-2">הייבוא הושלם!</h3>
            <p data-ev-id="ev_1ef72db8df" className="text-muted-foreground mb-4">
              {autoClassifiedIncomes.length + manualClassifiedIncomes.length} הכנסות נוספו בהצלחה
            </p>
            {autoClassifiedIncomes.length > 0 &&
          <p data-ev-id="ev_54df28e645" className="text-sm text-green-600 mb-2">
                ✓ {autoClassifiedIncomes.length} סווגו אוטומטית
              </p>
          }
            {manualClassifiedIncomes.length > 0 &&
          <p data-ev-id="ev_64146f0af1" className="text-sm text-blue-600 mb-4">
                ✓ {manualClassifiedIncomes.length} סווגו ידנית
              </p>
          }
            <Button onClick={resetImport}>ייבוא נוסף</Button>
          </Card>
        }

        {/* Loading */}
        {loading &&
        <Card className="text-center py-8">
            <div data-ev-id="ev_87b2bf1e8c" className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p data-ev-id="ev_0ba6117029" className="text-muted-foreground">מעבד...</p>
          </Card>
        }

        {/* Error */}
        {error &&
        <Card className="bg-red-50 border border-red-200">
            <div data-ev-id="ev_e9980daf5b" className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <p data-ev-id="ev_4f39f6fd4e" className="text-red-800">{error}</p>
            </div>
          </Card>
        }
      </div>
    </Layout>);

}