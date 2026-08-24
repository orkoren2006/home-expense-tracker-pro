-- Fix: Allow household creators to view their household immediately after creation
-- (before they're added as a member)
DROP POLICY IF EXISTS "Members can view their household" ON public.households;

CREATE POLICY "Members and creators can view household" ON public.households
  FOR SELECT TO authenticated
  USING (
    public.is_household_member(id) OR (SELECT auth.uid()) = created_by
  );