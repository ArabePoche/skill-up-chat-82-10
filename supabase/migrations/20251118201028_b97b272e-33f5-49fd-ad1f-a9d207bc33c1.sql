-- Table pour les transactions comptables de l'école
CREATE TABLE public.school_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  reference_number TEXT,
  payment_method TEXT,
  attached_file_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les recherches fréquentes
CREATE INDEX idx_school_transactions_school_id ON public.school_transactions(school_id);
CREATE INDEX idx_school_transactions_type ON public.school_transactions(type);
CREATE INDEX idx_school_transactions_date ON public.school_transactions(transaction_date);
CREATE INDEX idx_school_transactions_category ON public.school_transactions(category);

-- Enable RLS
ALTER TABLE public.school_transactions ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Propriétaires peuvent voir transactions de leur école"
  ON public.school_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = school_transactions.school_id
      AND schools.owner_id = auth.uid()
    )
  );

CREATE POLICY "Propriétaires peuvent créer transactions"
  ON public.school_transactions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = school_transactions.school_id
      AND schools.owner_id = auth.uid()
    )
  );

CREATE POLICY "Propriétaires peuvent modifier leurs transactions"
  ON public.school_transactions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = school_transactions.school_id
      AND schools.owner_id = auth.uid()
    )
  );

CREATE POLICY "Propriétaires peuvent supprimer leurs transactions"
  ON public.school_transactions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.schools
      WHERE schools.id = school_transactions.school_id
      AND schools.owner_id = auth.uid()
    )
  );

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_school_transactions_updated_at
  BEFORE UPDATE ON public.school_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Vue pour les statistiques comptables
CREATE OR REPLACE VIEW public.school_accounting_stats AS
SELECT 
  school_id,
  DATE_TRUNC('month', transaction_date) as month,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense,
  SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as net_balance
FROM public.school_transactions
GROUP BY school_id, DATE_TRUNC('month', transaction_date);