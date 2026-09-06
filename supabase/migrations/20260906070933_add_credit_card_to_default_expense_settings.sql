-- Add credit_card_id column to default_expense_settings
ALTER TABLE public.default_expense_settings
ADD COLUMN credit_card_id UUID REFERENCES public.credit_cards ON DELETE SET NULL;