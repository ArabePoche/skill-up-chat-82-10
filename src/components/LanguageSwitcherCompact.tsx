/**
 * Version compacte du sélecteur de langue pour la navbar
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

const languages = [
  { code: 'fr', flag: '🇫🇷' },
  { code: 'en', flag: '🇬🇧' },
  { code: 'ar', flag: '🇸🇦' },
  { code: 'es', flag: '🇪🇸' }
];

const LanguageSwitcherCompact: React.FC = () => {
  const { i18n } = useTranslation();

  const changeLanguage = () => {
    const currentIndex = languages.findIndex(lang => lang.code === i18n.language);
    const nextIndex = (currentIndex + 1) % languages.length;
    i18n.changeLanguage(languages[nextIndex].code);
  };

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={changeLanguage}
      className="p-1 h-8 w-8"
      title="Changer de langue"
    >
      <span className="text-lg">{currentLanguage.flag}</span>
    </Button>
  );
};

export default LanguageSwitcherCompact;
