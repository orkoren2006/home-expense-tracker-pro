-- Display settings for configurable column visibility in expenses and incomes tables
CREATE TABLE public.display_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  expense_columns JSONB NOT NULL DEFAULT '["name", "amount", "date", "category", "credit_card"]'::jsonb,
  income_columns JSONB NOT NULL DEFAULT '["name", "amount", "date", "source"]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT display_settings_household_unique UNIQUE (household_id)
);

-- Enable RLS
ALTER TABLE public.display_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies - household members can read and write their own settings
CREATE POLICY "Members can view display settings"
  ON public.display_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = display_settings.household_id
      AND hm.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Members can insert display settings"
  ON public.display_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = display_settings.household_id
      AND hm.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Members can update display settings"
  ON public.display_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = display_settings.household_id
      AND hm.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = display_settings.household_id
      AND hm.user_id = (SELECT auth.uid())
    )
  );

-- Index for faster lookups
CREATE INDEX idx_display_settings_household ON public.display_settings(household_id);