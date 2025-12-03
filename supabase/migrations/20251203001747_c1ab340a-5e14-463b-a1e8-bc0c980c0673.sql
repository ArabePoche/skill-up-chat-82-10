-- Table pour les catégories de transactions personnalisées par école
CREATE TABLE public.school_transaction_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(school_id, name, type)
);

-- Enable RLS
ALTER TABLE public.school_transaction_categories ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their school's categories"
ON public.school_transaction_categories FOR SELECT
USING (true);

CREATE POLICY "Users can insert categories for their school"
ON public.school_transaction_categories FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their school's categories"
ON public.school_transaction_categories FOR UPDATE
USING (true);

CREATE POLICY "Users can delete their school's categories"
ON public.school_transaction_categories FOR DELETE
USING (is_default = false);

-- Trigger for updated_at
CREATE TRIGGER update_school_transaction_categories_updated_at
BEFORE UPDATE ON public.school_transaction_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();