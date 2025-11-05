/**
 * Composant d'onboarding pour sélectionner la langue au premier lancement
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

const languages = [
  { code: 'fr', name: 'Français', flag: '🇫🇷', nativeName: 'Français' },
  { code: 'en', name: 'English', flag: '🇬🇧', nativeName: 'English' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦', nativeName: 'العربية' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸', nativeName: 'Español' }
];

interface LanguageOnboardingProps {
  onComplete: () => void;
}

const LanguageOnboarding: React.FC<LanguageOnboardingProps> = ({ onComplete }) => {
  const { i18n } = useTranslation();
  const [selectedLang, setSelectedLang] = useState(i18n.language || 'fr');

  const handleConfirm = () => {
    i18n.changeLanguage(selectedLang);
    localStorage.setItem('languageSelected', 'true');
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-primary via-primary-glow to-accent flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in fade-in-0 zoom-in-95 duration-300">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🌍</div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Bienvenue · Welcome
          </h1>
          <p className="text-muted-foreground">
            Sélectionnez votre langue · Choose your language
          </p>
        </div>

        <div className="space-y-3 mb-8">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setSelectedLang(lang.code)}
              className={`w-full p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 ${
                selectedLang === lang.code
                  ? 'border-primary bg-primary/10 shadow-md scale-[1.02]'
                  : 'border-border bg-card hover:border-primary/50 hover:bg-accent/50'
              }`}
            >
              <span className="text-4xl">{lang.flag}</span>
              <div className="flex-1 text-left">
                <div className="font-semibold text-foreground">{lang.nativeName}</div>
                <div className="text-sm text-muted-foreground">{lang.name}</div>
              </div>
              {selectedLang === lang.code && (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground text-sm">✓</span>
                </div>
              )}
            </button>
          ))}
        </div>

        <Button
          onClick={handleConfirm}
          className="w-full py-6 text-lg font-semibold"
          size="lg"
        >
          Continuer · Continue · متابعة · Continuar
        </Button>
      </div>
    </div>
  );
};

export default LanguageOnboarding;
