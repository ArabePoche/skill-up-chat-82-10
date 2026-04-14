
-- Table des dépenses programmées
CREATE TABLE public.scheduled_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  payment_method TEXT,
  recurrence TEXT NOT NULL DEFAULT 'monthly', -- 'monthly' ou 'yearly'
  next_due_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_confirmed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_scheduled_expenses_school ON public.scheduled_expenses(school_id);
CREATE INDEX idx_scheduled_expenses_due ON public.scheduled_expenses(next_due_date) WHERE is_active = true;

-- RLS
ALTER TABLE public.scheduled_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view scheduled expenses of their school"
ON public.scheduled_expenses FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can create scheduled expenses"
ON public.scheduled_expenses FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update scheduled expenses"
ON public.scheduled_expenses FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Users can delete scheduled expenses"
ON public.scheduled_expenses FOR DELETE TO authenticated
USING (true);

-- Trigger updated_at
CREATE TRIGGER update_scheduled_expenses_updated_at
BEFORE UPDATE ON public.scheduled_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
