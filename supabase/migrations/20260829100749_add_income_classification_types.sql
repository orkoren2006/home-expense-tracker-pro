-- Update classification_options constraint to include income types
ALTER TABLE public.classification_options
  DROP CONSTRAINT IF EXISTS classification_options_option_type_check;

ALTER TABLE public.classification_options
  ADD CONSTRAINT classification_options_option_type_check
  CHECK (option_type IN ('frequency', 'amount_type', 'expense_type', 'payment_method', 'income_source', 'income_payment_method'));