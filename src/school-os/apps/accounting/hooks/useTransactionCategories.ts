/**
 * Hook pour gérer les catégories de transactions personnalisées
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TransactionCategory {
  id: string;
  school_id: string;
  name: string;
  type: 'income' | 'expense';
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// Catégories par défaut
const DEFAULT_INCOME_CATEGORIES = [
  'Frais de scolarité',
  'Inscription',
  'Réinscription',
  'Activités parascolaires',
  'Cantine',
  'Transport',
  'Uniforme',
  'Fournitures',
  'Donations',
  'Subventions',
  'Autres revenus',
];

const DEFAULT_EXPENSE_CATEGORIES = [
  'Salaires Personnel',
  'Charges sociales',
  'Loyer',
  'Électricité',
  'Eau',
  'Internet',
  'Téléphone',
  'Fournitures bureau',
  'Matériel pédagogique',
  'Maintenance',
  'Assurances',
  'Impôts et taxes',
  'Transport',
  'Alimentation cantine',
  'Marketing',
  'Formation',
  'Autres dépenses',
];

/**
 * Récupérer les catégories de transactions d'une école
 */
export const useTransactionCategories = (schoolId?: string) => {
  return useQuery({
    queryKey: ['transaction-categories', schoolId],
    queryFn: async () => {
      if (!schoolId) return { income: DEFAULT_INCOME_CATEGORIES, expense: DEFAULT_EXPENSE_CATEGORIES };

      const { data, error } = await (supabase as any)
        .from('school_transaction_categories')
        .select('*')
        .eq('school_id', schoolId)
        .order('name');

      if (error) throw error;

      const categories = data as TransactionCategory[];
      
      // Si pas de catégories personnalisées, retourner les catégories par défaut
      if (!categories || categories.length === 0) {
        return { 
          income: DEFAULT_INCOME_CATEGORIES, 
          expense: DEFAULT_EXPENSE_CATEGORIES,
          raw: []
        };
      }

      // Séparer par type
      const incomeCategories = categories
        .filter(c => c.type === 'income')
        .map(c => c.name);
      const expenseCategories = categories
        .filter(c => c.type === 'expense')
        .map(c => c.name);

      return {
        income: incomeCategories.length > 0 ? incomeCategories : DEFAULT_INCOME_CATEGORIES,
        expense: expenseCategories.length > 0 ? expenseCategories : DEFAULT_EXPENSE_CATEGORIES,
        raw: categories
      };
    },
    enabled: !!schoolId,
  });
};

/**
 * Ajouter une catégorie
 */
export const useAddTransactionCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (category: { school_id: string; name: string; type: 'income' | 'expense' }) => {
      const { data, error } = await (supabase as any)
        .from('school_transaction_categories')
        .insert(category)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-categories'] });
      toast.success('Catégorie ajoutée');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Cette catégorie existe déjà');
      } else {
        toast.error('Erreur lors de l\'ajout');
      }
    },
  });
};

/**
 * Modifier une catégorie
 */
export const useUpdateTransactionCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await (supabase as any)
        .from('school_transaction_categories')
        .update({ name })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-categories'] });
      toast.success('Catégorie modifiée');
    },
    onError: () => {
      toast.error('Erreur lors de la modification');
    },
  });
};

/**
 * Supprimer une catégorie
 */
export const useDeleteTransactionCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('school_transaction_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-categories'] });
      toast.success('Catégorie supprimée');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });
};

/**
 * Initialiser les catégories par défaut pour une école
 */
export const useInitializeDefaultCategories = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schoolId: string) => {
      const categories = [
        ...DEFAULT_INCOME_CATEGORIES.map(name => ({ school_id: schoolId, name, type: 'income', is_default: true })),
        ...DEFAULT_EXPENSE_CATEGORIES.map(name => ({ school_id: schoolId, name, type: 'expense', is_default: true })),
      ];

      const { error } = await (supabase as any)
        .from('school_transaction_categories')
        .insert(categories);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-categories'] });
      toast.success('Catégories initialisées');
    },
    onError: () => {
      toast.error('Erreur lors de l\'initialisation');
    },
  });
};
