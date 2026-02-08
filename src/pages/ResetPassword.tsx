/**
 * Page de réinitialisation du mot de passe
 * Permet à l'utilisateur de définir un nouveau mot de passe après avoir cliqué sur le lien reçu par email
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    // Vérifier que l'utilisateur arrive bien via un lien de reset (session recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // L'utilisateur est en mode récupération, on reste sur la page
        console.log('Password recovery mode activated');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({
        title: t('auth.resetPassword', 'Réinitialisation'),
        description: t('auth.passwordTooShort', 'Le mot de passe doit contenir au moins 6 caractères.'),
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: t('auth.resetPassword', 'Réinitialisation'),
        description: t('auth.passwordMismatch', 'Les mots de passe ne correspondent pas.'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      setIsSuccess(true);
      toast({
        title: t('auth.resetPasswordSuccess', 'Mot de passe modifié'),
        description: t('auth.resetPasswordSuccessDesc', 'Votre mot de passe a été mis à jour avec succès.'),
      });

      // Rediriger après 2 secondes
      setTimeout(() => navigate('/cours'), 2000);
    } catch (error: any) {
      toast({
        title: t('auth.resetPasswordError', 'Erreur'),
        description: error.message || t('auth.resetPasswordErrorDesc', 'Impossible de modifier le mot de passe.'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#25d366]/10 to-[#20c75a]/10 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden p-8 text-center">
          <CheckCircle className="mx-auto text-[#25d366] mb-4" size={64} />
          <h2 className="text-xl font-bold mb-2">
            {t('auth.resetPasswordSuccess', 'Mot de passe modifié !')}
          </h2>
          <p className="text-gray-500">
            {t('auth.redirecting', 'Redirection en cours...')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#25d366]/10 to-[#20c75a]/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-[#25d366] text-white p-6 text-center">
            <h1 className="text-2xl font-bold mb-2">EducaTok</h1>
            <p className="text-white/80">
              {t('auth.newPasswordTitle', 'Définir un nouveau mot de passe')}
            </p>
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth.newPassword', 'Nouveau mot de passe')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth.confirmPassword', 'Confirmer le mot de passe')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                  minLength={6}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#25d366] hover:bg-[#20c75a] text-white"
                disabled={isLoading}
              >
                {isLoading
                  ? t('common.loading', 'Chargement...')
                  : t('auth.updatePassword', 'Mettre à jour le mot de passe')}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
