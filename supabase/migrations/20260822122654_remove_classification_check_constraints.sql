-- Remove CHECK constraints to allow custom classification values

-- expense_rules table
ALTER TABLE public.expense_rules DROP CONSTRAINT IF EXISTS expense_rules_frequency_check;
ALTER TABLE public.expense_rules DROP CONSTRAINT IF EXISTS expense_rules_amount_type_check;
ALTER TABLE public.expense_rules DROP CONSTRAINT IF EXISTS expense_rules_expense_type_check;
ALTER TABLE public.expense_rules DROP CONSTRAINT IF EXISTS expense_rules_payment_method_check;

-- expenses table
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_frequency_check;
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_amount_type_check;
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_expense_type_check;
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_payment_method_check;

-- default_expense_settings table
ALTER TABLE public.default_expense_settings DROP CONSTRAINT IF EXISTS default_expense_settings_frequency_check;
ALTER TABLE public.default_expense_settings DROP CONSTRAINT IF EXISTS default_expense_settings_amount_type_check;
ALTER TABLE public.default_expense_settings DROP CONSTRAINT IF EXISTS default_expense_settings_expense_type_check;
ALTER TABLE public.default_expense_settings DROP CONSTRAINT IF EXISTS default_expense_settings_payment_method_check;