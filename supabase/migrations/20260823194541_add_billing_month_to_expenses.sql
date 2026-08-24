ALTER TABLE public.expenses ADD COLUMN billing_month TEXT;

CREATE INDEX idx_expenses_billing_month ON public.expenses(billing_month);