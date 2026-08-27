-- Create incomes table
CREATE TABLE public.incomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  billing_month TEXT, -- YYYY-MM format for monthly filtering
  frequency TEXT NOT NULL DEFAULT 'one_time',
  amount_type TEXT NOT NULL DEFAULT 'variable',
  payment_method TEXT NOT NULL DEFAULT 'transfer',
  source TEXT NOT NULL DEFAULT 'work',
  notes TEXT,
  import_batch_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create income_rules table for auto-classification
CREATE TABLE public.income_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  income_name TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  amount_type TEXT NOT NULL DEFAULT 'fixed',
  payment_method TEXT NOT NULL DEFAULT 'transfer',
  source TEXT NOT NULL DEFAULT 'work',
  notes TEXT,
  UNIQUE(household_id, income_name)
);

-- Enable RLS
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_rules ENABLE ROW LEVEL SECURITY;

-- Incomes policies
CREATE POLICY "Users can view household incomes" ON public.incomes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = incomes.household_id
    AND hm.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Users can insert household incomes" ON public.incomes
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = incomes.household_id
    AND hm.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Users can update household incomes" ON public.incomes
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = incomes.household_id
    AND hm.user_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = incomes.household_id
    AND hm.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Users can delete household incomes" ON public.incomes
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = incomes.household_id
    AND hm.user_id = (SELECT auth.uid())
  ));

-- Income rules policies
CREATE POLICY "Users can view household income rules" ON public.income_rules
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = income_rules.household_id
    AND hm.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Users can insert household income rules" ON public.income_rules
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = income_rules.household_id
    AND hm.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Users can update household income rules" ON public.income_rules
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = income_rules.household_id
    AND hm.user_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = income_rules.household_id
    AND hm.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Users can delete household income rules" ON public.income_rules
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = income_rules.household_id
    AND hm.user_id = (SELECT auth.uid())
  ));

-- Indexes for performance
CREATE INDEX idx_incomes_household_id ON public.incomes(household_id);
CREATE INDEX idx_incomes_billing_month ON public.incomes(billing_month);
CREATE INDEX idx_income_rules_household_id ON public.income_rules(household_id);