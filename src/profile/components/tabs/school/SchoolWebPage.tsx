/**
 * SchoolWebPage - Page web complète d'une école style site officiel
 * Affiche toutes les informations avec un design moderne Material 3
 */
import React from 'react';
import { 
  X, MapPin, Phone, Mail, Globe, Calendar, Building2, 
  Users, GraduationCap, BookOpen, Image as ImageIcon,
  ExternalLink, Award, Languages
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

interface School {
  id: string;
  name: string;
  description: string | null;
  school_type: string;
  country: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  founded_year: number | null;
  teaching_language: string | null;
}

interface SchoolWebPageProps {
  school: School;
  onClose: () => void;
}

const SchoolWebPage: React.FC<SchoolWebPageProps> = ({ school, onClose }) => {
  const { t } = useTranslation();

  const getSchoolTypeLabel = (type: string) => {
    switch (type) {
      case 'virtual': return 'École en ligne';
      case 'physical': return 'École physique';
      case 'both': return 'Hybride';
      default: return type;
    }
  };

  const primaryColor = school.primary_color || '#3b82f6';
  const secondaryColor = school.secondary_color || '#1e40af';

  // Programmes/cycles fictifs pour le placeholder
  const cycles = [
    { name: 'Primaire', icon: BookOpen, description: 'Du CP au CM2' },
    { name: 'Collège', icon: GraduationCap, description: 'De la 6ème à la 3ème' },
    { name: 'Lycée', icon: Award, description: 'Seconde, Première, Terminale' },
  ];

  // Stats placeholder
  const stats = [
    { label: 'Élèves', value: '500+', icon: Users },
    { label: 'Enseignants', value: '35', icon: GraduationCap },
    { label: 'Classes', value: '24', icon: Building2 },
    { label: 'Taux de réussite', value: '95%', icon: Award },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full"
    >
      {/* Header / Hero Section */}
      <div 
        className="relative rounded-xl overflow-hidden mb-6"
        style={{ 
          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` 
        }}
      >
        {/* Bouton Fermer */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-colors"
        >
          <X size={20} className="text-white" />
        </button>

        <div className="px-6 py-10 text-white">
          {/* Logo et nom */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center overflow-hidden">
              {school.logo_url ? (
                <img 
                  src={school.logo_url} 
                  alt={school.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 size={36} className="text-white" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{school.name}</h1>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {getSchoolTypeLabel(school.school_type)}
                </span>
                {school.city && (
                  <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs flex items-center gap-1">
                    <MapPin size={10} />
                    {school.city}
                  </span>
                )}
                {school.country && (
                  <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    {school.country}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="space-y-6 px-1">
        {/* Section À propos */}
        <section className="bg-card rounded-xl p-5 shadow-sm border border-border">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Building2 size={18} className="text-primary" />
            À propos
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {school.description || 'Aucune description disponible pour cette école.'}
          </p>
          
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
            {school.founded_year && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar size={16} className="text-muted-foreground" />
                <span>Fondée en {school.founded_year}</span>
              </div>
            )}
            {school.teaching_language && (
              <div className="flex items-center gap-2 text-sm">
                <Languages size={16} className="text-muted-foreground" />
                <span>{school.teaching_language}</span>
              </div>
            )}
          </div>
        </section>

        {/* Section Cycles & Programmes */}
        <section className="bg-card rounded-xl p-5 shadow-sm border border-border">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <GraduationCap size={18} className="text-primary" />
            Cycles & Programmes
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {cycles.map((cycle, index) => (
              <div
                key={index}
                className="p-4 bg-muted/50 rounded-xl text-center hover:bg-muted transition-colors"
              >
                <div 
                  className="w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${primaryColor}20` }}
                >
                  <cycle.icon size={20} style={{ color: primaryColor }} />
                </div>
                <p className="font-medium text-sm">{cycle.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{cycle.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section Statistiques */}
        <section className="bg-card rounded-xl p-5 shadow-sm border border-border">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Award size={18} className="text-primary" />
            Statistiques
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <div 
                key={index}
                className="text-center p-3 rounded-xl bg-muted/50"
              >
                <stat.icon size={24} className="mx-auto mb-2 text-primary" />
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section Galerie */}
        <section className="bg-card rounded-xl p-5 shadow-sm border border-border">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ImageIcon size={18} className="text-primary" />
            Galerie
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div 
                key={i}
                className="aspect-square bg-muted rounded-lg flex items-center justify-center"
              >
                <ImageIcon size={24} className="text-muted-foreground/30" />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Aucune photo disponible
          </p>
        </section>

        {/* Section Localisation */}
        <section className="bg-card rounded-xl p-5 shadow-sm border border-border">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin size={18} className="text-primary" />
            Localisation
          </h2>
          
          {/* Map placeholder */}
          <div className="aspect-video bg-muted rounded-xl mb-4 flex items-center justify-center">
            <div className="text-center">
              <MapPin size={32} className="mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Carte bientôt disponible</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {school.address && (
              <div className="flex items-start gap-2">
                <MapPin size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                <span>{school.address}</span>
              </div>
            )}
            {school.city && (
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-muted-foreground shrink-0" />
                <span>{school.city}{school.country && `, ${school.country}`}</span>
              </div>
            )}
          </div>
        </section>

        {/* Section Contact */}
        <section className="bg-card rounded-xl p-5 shadow-sm border border-border">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Phone size={18} className="text-primary" />
            Contact
          </h2>

          <div className="space-y-3">
            {school.phone && (
              <a 
                href={`tel:${school.phone}`}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <Phone size={18} className="text-primary" />
                <span className="text-sm">{school.phone}</span>
              </a>
            )}
            
            {school.email && (
              <a 
                href={`mailto:${school.email}`}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <Mail size={18} className="text-primary" />
                <span className="text-sm">{school.email}</span>
              </a>
            )}
            
            {school.website && (
              <a 
                href={school.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <Globe size={18} className="text-primary" />
                <span className="text-sm flex-1">{school.website}</span>
                <ExternalLink size={14} className="text-muted-foreground" />
              </a>
            )}

            {!school.phone && !school.email && !school.website && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune information de contact disponible
              </p>
            )}
          </div>

          <Button 
            className="w-full mt-4"
            style={{ backgroundColor: primaryColor }}
          >
            Contacter l'école
          </Button>
        </section>

        {/* Footer */}
        <footer className="text-center py-6 border-t border-border">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {school.name} • Tous droits réservés
          </p>
        </footer>
      </div>
    </motion.div>
  );
};

export default SchoolWebPage;
