import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { translateAuthError } from '@/utils/authErrorMessages';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà connecté
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        navigate('/cours');
      }
    };
    checkUser();

    // Écouter les changements d'état d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Vérifier si le profil est complété
        checkProfileCompletion(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkProfileCompletion = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('profile_completed')
        .eq('id', userId)
        .single();

      if (profile?.profile_completed) {
        navigate('/cours');
      } else {
        navigate('/complete-profile');
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du profil:', error);
      navigate('/complete-profile');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: t('auth.forgotPassword', 'Mot de passe oublié'),
        description: t('auth.enterEmailFirst', 'Veuillez entrer votre adresse email.'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setResetEmailSent(true);
      toast({
        title: t('auth.resetEmailSent', 'Email envoyé'),
        description: t('auth.resetEmailSentDesc', 'Un lien de réinitialisation a été envoyé à votre adresse email.'),
      });
    } catch (error: any) {
      const errorMessage = translateAuthError(error.message || '');
      toast({
        title: t('auth.resetPasswordError', 'Erreur'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          await checkProfileCompletion(data.user.id);
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              first_name: firstName,
              last_name: lastName,
            }
          }
        });

        if (error) throw error;

        if (data.user) {
          toast({
            title: t('auth.signupSuccess'),
            description: "Veuillez vérifier votre email pour confirmer votre compte.",
          });
        }
      }
    } catch (error: any) {
      const errorMessage = translateAuthError(error.message || '');
      toast({
        title: isLogin ? t('auth.loginError') : t('auth.signupError'),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Vue "Mot de passe oublié"
  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#25d366]/10 to-[#20c75a]/10 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-[#25d366] text-white p-6 text-center">
              <h1 className="text-2xl font-bold mb-2">EducaTok</h1>
              <p className="text-white/80">
                {t('auth.forgotPassword', 'Mot de passe oublié ?')}
              </p>
            </div>

            <div className="p-6">
              {resetEmailSent ? (
                <div className="text-center space-y-4">
                  <Mail className="mx-auto text-[#25d366]" size={48} />
                  <h2 className="text-lg font-semibold">
                    {t('auth.resetEmailSent', 'Email envoyé !')}
                  </h2>
                  <p className="text-gray-500 text-sm">
                    {t('auth.resetEmailSentDesc', 'Un lien de réinitialisation a été envoyé à votre adresse email. Vérifiez votre boîte de réception.')}
                  </p>
                  <Button
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmailSent(false);
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    {t('auth.backToLogin', 'Retour à la connexion')}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <p className="text-gray-500 text-sm text-center mb-2">
                    {t('auth.forgotPasswordDesc', 'Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.')}
                  </p>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <Input
                      type="email"
                      placeholder={t('auth.emailPlaceholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#25d366] hover:bg-[#20c75a] text-white"
                    disabled={isLoading}
                  >
                    {isLoading
                      ? t('common.loading')
                      : t('auth.sendResetLink', 'Envoyer le lien')}
                  </Button>

                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="w-full text-center text-[#25d366] hover:underline text-sm mt-2"
                  >
                    {t('auth.backToLogin', 'Retour à la connexion')}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#25d366]/10 to-[#20c75a]/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-[#25d366] text-white p-6 text-center">
            <h1 className="text-2xl font-bold mb-2">EducaTok</h1>
            <p className="text-white/80">
              {isLogin ? t('auth.loginTitle') : t('auth.signupTitle')}
            </p>
          </div>

          {/* Form */}
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <Input
                      type="text"
                      placeholder={t('auth.firstName')}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <Input
                      type="text"
                      placeholder={t('auth.lastName')}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </>
              )}

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {isLogin && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-[#25d366] hover:underline"
                  >
                    {t('auth.forgotPassword', 'Mot de passe oublié ?')}
                  </button>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-[#25d366] hover:bg-[#20c75a] text-white"
                disabled={isLoading}
              >
                {isLoading ? t('common.loading') : (isLogin ? t('common.login') : t('common.signup'))}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-[#25d366] hover:underline"
              >
                {isLogin 
                  ? t('auth.noAccount') 
                  : t('auth.hasAccount')
                }
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center mx-auto text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={16} className="mr-1" />
            {t('common.back')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
