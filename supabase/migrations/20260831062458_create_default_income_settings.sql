CREATE TABLE public.default_income_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL UNIQUE,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  amount_type TEXT NOT NULL DEFAULT 'fixed',
  payment_method TEXT NOT NULL DEFAULT 'salary',
  source TEXT NOT NULL DEFAULT 'work',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.default_income_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view household default income settings" ON public.default_income_settings
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = default_income_settings.household_id
    AND hm.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Users can insert household default income settings" ON public.default_income_settings
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = default_income_settings.household_id
    AND hm.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Users can update household default income settings" ON public.default_income_settings
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = default_income_settings.household_id
    AND hm.user_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = default_income_settings.household_id
    AND hm.user_id = (SELECT auth.uid())
  ));

CREATE INDEX idx_default_income_settings_household_id ON public.default_income_settings(household_id);