-- Custom classification options table
CREATE TABLE public.classification_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households ON DELETE CASCADE NOT NULL,
  option_type TEXT NOT NULL CHECK (option_type IN ('frequency', 'amount_type', 'expense_type', 'payment_method')),
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(household_id, option_type, value)
);

CREATE INDEX idx_classification_options_household ON public.classification_options(household_id);
CREATE INDEX idx_classification_options_type ON public.classification_options(option_type);

ALTER TABLE public.classification_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view classification options" ON public.classification_options
  FOR SELECT TO authenticated
  USING (public.is_household_member(household_id));

CREATE POLICY "Members can manage classification options" ON public.classification_options
  FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "Members can update classification options" ON public.classification_options
  FOR UPDATE TO authenticated
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "Members can delete classification options" ON public.classification_options
  FOR DELETE TO authenticated
  USING (public.is_household_member(household_id) AND is_default = false);