-- Add created_at column to income_rules
ALTER TABLE public.income_rules
ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();