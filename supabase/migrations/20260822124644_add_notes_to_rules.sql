-- Add notes field to expense_rules
ALTER TABLE public.expense_rules ADD COLUMN IF NOT EXISTS notes TEXT;

-- Ensure expenses table has notes field (it might already exist)
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS notes TEXT;