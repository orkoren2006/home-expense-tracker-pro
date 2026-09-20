-- Add expense_rules_columns to display_settings
ALTER TABLE public.display_settings 
ADD COLUMN IF NOT EXISTS expense_rules_columns TEXT[] NOT NULL DEFAULT ARRAY['expense_name', 'category', 'frequency', 'expense_type', 'payment_method', 'credit_card', 'amount_type', 'notes'];

-- Create notes table for user memos
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  month TEXT, -- Format: YYYY-MM or NULL for general notes
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Create policies (same pattern as other household tables)
CREATE POLICY "notes_select" ON public.notes
  FOR SELECT TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM public.household_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "notes_insert" ON public.notes
  FOR INSERT TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.household_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "notes_update" ON public.notes
  FOR UPDATE TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM public.household_members
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.household_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "notes_delete" ON public.notes
  FOR DELETE TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM public.household_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Index for better query performance
CREATE INDEX idx_notes_household_id ON public.notes(household_id);
CREATE INDEX idx_notes_month ON public.notes(month);