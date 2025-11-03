
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, Globe, Calendar, Heart, Settings, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getNames } from 'country-list';
import { TeacherApplicationForm } from '@/teacher-application/components/TeacherApplicationForm';
import { getPhoneCodeByCountry } from '@/utils/countryPhoneCodes';
import { useTranslation } from 'react-i18next';

const CompleteProfile = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    phoneCountryCode: '',
    country: '',
    gender: '',
    age: '',
    interests: [] as string[],
    wantToBeInstructor: false,
    newPassword: '',
    language: 'fr'
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [phoneError, setPhoneError] = useState<string>('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { i18n, t } = useTranslation();

  // Utilisation de la bibliothèque country-list pour obtenir la liste des pays
  const countries = getNames();

  const interestOptions = [
    { key: 'technology', label: t('completeProfile.interestOptions.technology') },
    { key: 'sciences', label: t('completeProfile.interestOptions.sciences') },
    { key: 'literature', label: t('completeProfile.interestOptions.literature') },
    { key: 'arts', label: t('completeProfile.interestOptions.arts') },
    { key: 'sport', label: t('completeProfile.interestOptions.sport') },
    { key: 'religion', label: t('completeProfile.interestOptions.religion') },
    { key: 'travel', label: t('completeProfile.interestOptions.travel') },
    { key: 'cooking', label: t('completeProfile.interestOptions.cooking') },
    { key: 'photography', label: t('completeProfile.interestOptions.photography') },
    { key: 'education', label: t('completeProfile.interestOptions.education') },
    { key: 'business', label: t('completeProfile.interestOptions.business') },
    { key: 'bakery', label: t('completeProfile.interestOptions.bakery') }
  ];

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      setIsInitializing(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        navigate('/auth');
        return;
      }

      if (!session?.user) {
        console.log('No user session found, redirecting to auth');
        navigate('/auth');
        return;
      }

      console.log('User session found:', session.user.id);
      setUser(session.user);

      // Charger les données existantes du profil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Profile fetch error:', profileError);
      }

      if (profile) {
        console.log('Profile loaded:', profile);
        const profileLanguage = profile.language || 'fr';
        setFormData({
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          phone: profile.phone || '',
          phoneCountryCode: profile.phone_country_code || '',
          country: profile.country || '',
          gender: profile.gender || '',
          age: profile.age ? profile.age.toString() : '',
          interests: profile.interests || [],
          wantToBeInstructor: profile.is_teacher || false,
          newPassword: '',
          language: profileLanguage
        });
        // Appliquer la langue du profil à l'interface
        i18n.changeLanguage(profileLanguage);
      }
    } catch (error: any) {
      console.error('Error in checkUser:', error);
      toast({
        title: t('completeProfile.error'),
        description: "Erreur lors du chargement du profil",
        variant: "destructive",
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleInterestToggle = (interestKey: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interestKey)
        ? prev.interests.filter(i => i !== interestKey)
        : [...prev.interests, interestKey]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    try {
      // Réinitialiser l'erreur de téléphone
      setPhoneError('');

      // Vérifier l'unicité du numéro de téléphone si renseigné
      if (formData.phone && formData.phoneCountryCode) {
        const { data: existingProfiles, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('phone_country_code', formData.phoneCountryCode)
          .eq('phone', formData.phone)
          .neq('id', user.id);

        if (checkError) {
          console.error('Erreur vérification téléphone:', checkError);
          setPhoneError(t('completeProfile.phoneVerificationError'));
          toast({
            title: t('completeProfile.error'),
            description: t('completeProfile.phoneVerificationError'),
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        if (existingProfiles && existingProfiles.length > 0) {
          setPhoneError(t('completeProfile.phoneAlreadyUsed'));
          toast({
            title: t('completeProfile.error'),
            description: t('completeProfile.phoneAlreadyUsed'),
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      }

      // Mettre à jour le profil
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          phone_country_code: formData.phoneCountryCode,
          country: formData.country,
          gender: formData.gender,
          age: formData.age ? parseInt(formData.age) : null,
          interests: formData.interests,
          is_teacher: formData.wantToBeInstructor,
          language: formData.language,
          profile_completed: true
        });

      if (profileError) {
      // Vérifier si c'est une erreur de contrainte unique sur le numéro de téléphone
        if (profileError.code === '23505' && profileError.message?.includes('unique_phone_per_country')) {
          setPhoneError(t('completeProfile.phoneAlreadyUsed'));
          toast({
            title: t('completeProfile.error'),
            description: t('completeProfile.phoneAlreadyUsed'),
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        throw profileError;
      }

      // Changer le mot de passe si fourni
      if (formData.newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: formData.newPassword
        });

        if (passwordError) throw passwordError;
      }

      toast({
        title: t('completeProfile.profileUpdated'),
        description: t('completeProfile.profileUpdatedDesc'),
      });

      navigate('/cours');
    } catch (error: any) {
      console.error('Submit error:', error);
      toast({
        title: t('completeProfile.error'),
        description: error.message || "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">{t('completeProfile.loading')}</div>
          <p className="text-gray-600">{t('completeProfile.initializing')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">{t('completeProfile.redirecting')}</div>
          <p className="text-gray-600">{t('completeProfile.mustBeConnected')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h1 className="text-2xl font-bold text-center mb-6">{t('completeProfile.title')}</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informations personnelles */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center">
                <User className="mr-2" size={20} />
                {t('completeProfile.personalInfo')}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">{t('completeProfile.firstName')} {t('completeProfile.required')}</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">{t('completeProfile.lastName')} {t('completeProfile.required')}</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="country">{t('completeProfile.country')}</Label>
                <select
                  id="country"
                  value={formData.country}
                  onChange={(e) => {
                    const selectedCountry = e.target.value;
                    const phoneCode = getPhoneCodeByCountry(selectedCountry);
                    setFormData(prev => ({ 
                      ...prev, 
                      country: selectedCountry,
                      phoneCountryCode: phoneCode
                    }));
                  }}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="">{t('completeProfile.selectCountry')}</option>
                  {countries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="phone">{t('completeProfile.phone')}</Label>
                <div className="flex gap-2">
                  <Input
                    id="phoneCode"
                    type="text"
                    value={formData.phoneCountryCode}
                    readOnly
                    className="bg-muted w-20 text-center"
                    placeholder="+XX"
                  />
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, phone: e.target.value }));
                        setPhoneError('');
                      }}
                      className={`pl-10 ${phoneError ? 'border-red-500 focus:ring-red-500' : ''}`}
                      placeholder={t('completeProfile.phonePlaceholder')}
                    />
                  </div>
                </div>
                {phoneError && (
                  <p className="text-red-600 text-sm mt-2 flex items-start gap-1">
                    <span className="font-semibold">⚠</span>
                    <span>{phoneError}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gender">{t('completeProfile.gender')}</Label>
                  <select
                    id="gender"
                    value={formData.gender}
                    onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="">{t('completeProfile.selectGender')}</option>
                    <option value="homme">{t('completeProfile.male')}</option>
                    <option value="femme">{t('completeProfile.female')}</option>
                    <option value="autre">{t('completeProfile.other')}</option>
                    <option value="prefere_ne_pas_dire">{t('completeProfile.preferNotToSay')}</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="age">{t('completeProfile.age')}</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <Input
                      id="age"
                      type="number"
                      value={formData.age}
                      onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                      className="pl-10"
                      min="13"
                      max="120"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Centres d'intérêt */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center">
                <Heart className="mr-2" size={20} />
                {t('completeProfile.interests')}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {interestOptions.map(interest => (
                  <button
                    key={interest.key}
                    type="button"
                    onClick={() => handleInterestToggle(interest.key)}
                    className={`p-2 text-sm rounded-md border transition-colors ${
                      formData.interests.includes(interest.key)
                        ? 'bg-[#25d366] text-white border-[#25d366]'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-[#25d366]'
                    }`}
                  >
                    {interest.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Options avancées */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center">
                <Settings className="mr-2" size={20} />
                {t('completeProfile.options')}
              </h2>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="instructor"
                  checked={formData.wantToBeInstructor}
                  onChange={(e) => setFormData(prev => ({ ...prev, wantToBeInstructor: e.target.checked }))}
                  className="w-4 h-4 text-[#25d366] border-gray-300 rounded focus:ring-[#25d366]"
                />
                <Label htmlFor="instructor">{t('completeProfile.wantToBeInstructor')}</Label>
              </div>

              {/* Formulaire de candidature d'encadreur */}
              {formData.wantToBeInstructor && user && (
                <div className="mt-6">
                  <TeacherApplicationForm 
                  userId={user.id}
                  onSuccess={() => {
                    toast({
                      title: t('completeProfile.applicationSubmitted'),
                      description: t('completeProfile.applicationSubmittedDesc'),
                    });
                  }}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="language">{t('completeProfile.language')}</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, language: 'fr' }));
                      i18n.changeLanguage('fr');
                    }}
                    className={`flex items-center gap-3 p-3 rounded-md border transition-all ${
                      formData.language === 'fr'
                        ? 'bg-[#25d366] text-white border-[#25d366] shadow-sm'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-[#25d366]'
                    }`}
                  >
                    <span className="text-2xl">🇫🇷</span>
                    <span className="font-medium">Français</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, language: 'en' }));
                      i18n.changeLanguage('en');
                    }}
                    className={`flex items-center gap-3 p-3 rounded-md border transition-all ${
                      formData.language === 'en'
                        ? 'bg-[#25d366] text-white border-[#25d366] shadow-sm'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-[#25d366]'
                    }`}
                  >
                    <span className="text-2xl">🇬🇧</span>
                    <span className="font-medium">English</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, language: 'ar' }));
                      i18n.changeLanguage('ar');
                    }}
                    className={`flex items-center gap-3 p-3 rounded-md border transition-all ${
                      formData.language === 'ar'
                        ? 'bg-[#25d366] text-white border-[#25d366] shadow-sm'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-[#25d366]'
                    }`}
                  >
                    <span className="text-2xl">🇸🇦</span>
                    <span className="font-medium">العربية</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, language: 'es' }));
                      i18n.changeLanguage('es');
                    }}
                    className={`flex items-center gap-3 p-3 rounded-md border transition-all ${
                      formData.language === 'es'
                        ? 'bg-[#25d366] text-white border-[#25d366] shadow-sm'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-[#25d366]'
                    }`}
                  >
                    <span className="text-2xl">🇪🇸</span>
                    <span className="font-medium">Español</span>
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="newPassword">{t('completeProfile.newPassword')}</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={formData.newPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/cours')}
              >
                {t('completeProfile.skipForNow')}
              </Button>
              <Button
                type="submit"
                className="bg-[#25d366] hover:bg-[#20c75a]"
                disabled={isLoading}
              >
                {isLoading ? t('completeProfile.loading') : t('completeProfile.saveProfile')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile;
