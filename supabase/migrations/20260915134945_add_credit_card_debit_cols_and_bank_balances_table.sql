-- Add columns to credit_cards for tracking next debit
ALTER TABLE public.credit_cards
  ADD COLUMN next_total_debit NUMERIC(12,2),
  ADD COLUMN next_debit_date DATE,
  ADD COLUMN next_debit_updated_at TIMESTAMPTZ;

-- Create bank_balances table
CREATE TABLE public.bank_balances (
  household_id UUID NOT NULL PRIMARY KEY REFERENCES public.households(id) ON DELETE CASCADE,
  balance NUMERIC(12,2) NOT NULL,
  as_of_date DATE NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on bank_balances
ALTER TABLE public.bank_balances ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for bank_balances (same pattern as credit_cards and other household tables)
CREATE POLICY "Members can view household bank balances" ON public.bank_balances
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = bank_balances.household_id
        AND hm.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Members can insert household bank balances" ON public.bank_balances
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = bank_balances.household_id
        AND hm.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Members can update household bank balances" ON public.bank_balances
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = bank_balances.household_id
        AND hm.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = bank_balances.household_id
        AND hm.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Members can delete household bank balances" ON public.bank_balances
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = bank_balances.household_id
        AND hm.user_id = (SELECT auth.uid())
    )
  );

-- Add index for better policy performance
CREATE INDEX idx_bank_balances_household_id ON public.bank_balances(household_id);