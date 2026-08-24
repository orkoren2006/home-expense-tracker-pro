-- Profiles table (auto-created on signup)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Households table
CREATE TABLE public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL DEFAULT substring(md5(random()::text), 1, 8),
  created_by UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

-- Household members table
CREATE TABLE public.household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(household_id, user_id)
);

CREATE INDEX idx_household_members_household ON public.household_members(household_id);
CREATE INDEX idx_household_members_user ON public.household_members(user_id);

ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;

-- Helper function to check household membership (avoids RLS recursion)
CREATE FUNCTION public.is_household_member(_household_id uuid)
RETURNS boolean LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = _household_id AND user_id = (SELECT auth.uid())
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_household_member(uuid) TO authenticated;

-- Household policies
CREATE POLICY "Members can view their household" ON public.households
  FOR SELECT TO authenticated
  USING (public.is_household_member(id));

CREATE POLICY "Authenticated users can create households" ON public.households
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = created_by);

-- Household members policies
CREATE POLICY "Members can view household members" ON public.household_members
  FOR SELECT TO authenticated
  USING (public.is_household_member(household_id));

CREATE POLICY "Users can join households" ON public.household_members
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can leave households" ON public.household_members
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'income')),
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(household_id, name, type)
);

CREATE INDEX idx_categories_household ON public.categories(household_id);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view categories" ON public.categories
  FOR SELECT TO authenticated
  USING (public.is_household_member(household_id));

CREATE POLICY "Members can manage categories" ON public.categories
  FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "Members can update categories" ON public.categories
  FOR UPDATE TO authenticated
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "Members can delete categories" ON public.categories
  FOR DELETE TO authenticated
  USING (public.is_household_member(household_id));

-- Credit cards table
CREATE TABLE public.credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  last_four_digits TEXT,
  provider TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_cards_household ON public.credit_cards(household_id);

ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view credit cards" ON public.credit_cards
  FOR SELECT TO authenticated
  USING (public.is_household_member(household_id));

CREATE POLICY "Members can manage credit cards" ON public.credit_cards
  FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "Members can update credit cards" ON public.credit_cards
  FOR UPDATE TO authenticated
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "Members can delete credit cards" ON public.credit_cards
  FOR DELETE TO authenticated
  USING (public.is_household_member(household_id));

-- Expense rules table (for learning expense classifications)
CREATE TABLE public.expense_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households ON DELETE CASCADE NOT NULL,
  expense_name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories ON DELETE SET NULL,
  frequency TEXT NOT NULL DEFAULT 'one_time' CHECK (frequency IN ('one_time', 'monthly', 'yearly', 'weekly')),
  amount_type TEXT NOT NULL DEFAULT 'variable' CHECK (amount_type IN ('fixed', 'variable')),
  expense_type TEXT NOT NULL DEFAULT 'optional' CHECK (expense_type IN ('mandatory', 'optional', 'luxury')),
  payment_method TEXT NOT NULL DEFAULT 'credit' CHECK (payment_method IN ('credit', 'cash', 'transfer', 'check')),
  credit_card_id UUID REFERENCES public.credit_cards ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(household_id, expense_name)
);

CREATE INDEX idx_expense_rules_household ON public.expense_rules(household_id);
CREATE INDEX idx_expense_rules_name ON public.expense_rules(expense_name);

ALTER TABLE public.expense_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view expense rules" ON public.expense_rules
  FOR SELECT TO authenticated
  USING (public.is_household_member(household_id));

CREATE POLICY "Members can manage expense rules" ON public.expense_rules
  FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "Members can update expense rules" ON public.expense_rules
  FOR UPDATE TO authenticated
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "Members can delete expense rules" ON public.expense_rules
  FOR DELETE TO authenticated
  USING (public.is_household_member(household_id));

-- Expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  date DATE NOT NULL,
  category_id UUID REFERENCES public.categories ON DELETE SET NULL,
  frequency TEXT NOT NULL DEFAULT 'one_time' CHECK (frequency IN ('one_time', 'monthly', 'yearly', 'weekly')),
  amount_type TEXT NOT NULL DEFAULT 'variable' CHECK (amount_type IN ('fixed', 'variable')),
  expense_type TEXT NOT NULL DEFAULT 'optional' CHECK (expense_type IN ('mandatory', 'optional', 'luxury')),
  payment_method TEXT NOT NULL DEFAULT 'credit' CHECK (payment_method IN ('credit', 'cash', 'transfer', 'check')),
  credit_card_id UUID REFERENCES public.credit_cards ON DELETE SET NULL,
  notes TEXT,
  import_batch_id TEXT,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_household ON public.expenses(household_id);
CREATE INDEX idx_expenses_date ON public.expenses(date);
CREATE INDEX idx_expenses_category ON public.expenses(category_id);
CREATE INDEX idx_expenses_batch ON public.expenses(import_batch_id);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view expenses" ON public.expenses
  FOR SELECT TO authenticated
  USING (public.is_household_member(household_id));

CREATE POLICY "Members can add expenses" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "Members can update expenses" ON public.expenses
  FOR UPDATE TO authenticated
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "Members can delete expenses" ON public.expenses
  FOR DELETE TO authenticated
  USING (public.is_household_member(household_id));

-- Default expense settings
CREATE TABLE public.default_expense_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households ON DELETE CASCADE NOT NULL UNIQUE,
  category_id UUID REFERENCES public.categories ON DELETE SET NULL,
  frequency TEXT NOT NULL DEFAULT 'one_time' CHECK (frequency IN ('one_time', 'monthly', 'yearly', 'weekly')),
  amount_type TEXT NOT NULL DEFAULT 'variable' CHECK (amount_type IN ('fixed', 'variable')),
  expense_type TEXT NOT NULL DEFAULT 'optional' CHECK (expense_type IN ('mandatory', 'optional', 'luxury')),
  payment_method TEXT NOT NULL DEFAULT 'credit' CHECK (payment_method IN ('credit', 'cash', 'transfer', 'check'))
);

ALTER TABLE public.default_expense_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view default settings" ON public.default_expense_settings
  FOR SELECT TO authenticated
  USING (public.is_household_member(household_id));

CREATE POLICY "Members can manage default settings" ON public.default_expense_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(household_id));

CREATE POLICY "Members can update default settings" ON public.default_expense_settings
  FOR UPDATE TO authenticated
  USING (public.is_household_member(household_id))
  WITH CHECK (public.is_household_member(household_id));