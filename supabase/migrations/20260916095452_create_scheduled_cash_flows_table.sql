-- Create scheduled_cash_flows table for manual recurring expenses
CREATE TABLE public.scheduled_cash_flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  day_of_month INTEGER NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 31),
  start_date DATE NOT NULL,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_cash_flows ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (same pattern as credit_cards and other household tables)
CREATE POLICY "Members can view household scheduled cash flows" ON public.scheduled_cash_flows
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = scheduled_cash_flows.household_id
        AND hm.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Members can insert household scheduled cash flows" ON public.scheduled_cash_flows
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = scheduled_cash_flows.household_id
        AND hm.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Members can update household scheduled cash flows" ON public.scheduled_cash_flows
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = scheduled_cash_flows.household_id
        AND hm.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = scheduled_cash_flows.household_id
        AND hm.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Members can delete household scheduled cash flows" ON public.scheduled_cash_flows
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = scheduled_cash_flows.household_id
        AND hm.user_id = (SELECT auth.uid())
    )
  );

-- Add index for better query performance
CREATE INDEX idx_scheduled_cash_flows_household_id ON public.scheduled_cash_flows(household_id);
CREATE INDEX idx_scheduled_cash_flows_dates ON public.scheduled_cash_flows(start_date, end_date);