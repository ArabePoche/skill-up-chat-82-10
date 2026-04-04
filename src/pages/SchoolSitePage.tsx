import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Building2, MapPin, Phone, Mail, Globe, Calendar, ArrowLeft,
  School as SchoolIcon, ExternalLink, Languages, UserPlus,
  Users, GraduationCap, BookOpen, BarChart2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import SchoolJoinRequestModal from '@/school/components/SchoolJoinRequestModal';
import { ParentCodeConfirmation } from '@/school-os/families/components/ParentCodeConfirmation';
import { School } from '@/school/hooks/useSchool';
import { useAuth } from '@/hooks/useAuth';
import { useUserSchools } from '@/school/hooks/useUserSchools';
import { motion } from 'framer-motion';

/**
 * Page publique d'une école
 * Affiche les informations publiques de l'école et propose 2 actions :
 * - Rejoindre l'école (ouvre la modal de demande d'adhésion)
 * - Accéder à School-OS (navigue vers l'interface de gestion)
 */
const SchoolSitePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const schoolId = searchParams.get('id');
  const [showJoinModal, setShowJoinModal] = useState(false);

  const { data: userSchools } = useUserSchools(user?.id);
  const PERSONNEL_ROLES = ['owner', 'admin', 'teacher', 'secretary', 'staff', 'supervisor'];
  const isPersonnel = !!userSchools?.find(
    s => s.id === schoolId && PERSONNEL_ROLES.includes(s.role)
  );

  const { data: school, isLoading } = useQuery({
    queryKey: ['school-site', schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', schoolId)
        .single();
      if (error) return null;
      return data as School;
    },
    enabled: !!schoolId,
  });

  const { data: stats } = useQuery({
    queryKey: ['school-stats', schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      const [studentsResult, teachersResult, classesResult] = await Promise.all([
        supabase
          .from('students_school')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId),
        supabase
          .from('school_teachers')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId),
        supabase
          .from('classes')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId),
      ]);
      return {
        students: studentsResult.error ? 0 : (studentsResult.count ?? 0),
        teachers: teachersResult.error ? 0 : (teachersResult.count ?? 0),
        classes: classesResult.error ? 0 : (classesResult.count ?? 0),
      };
    },
    enabled: !!schoolId,
  });

  if (!schoolId) {
    navigate(-1);
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6">
        <Building2 className="h-16 w-16 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">
          {t('school.notFound', { defaultValue: 'École introuvable' })}
        </p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back', { defaultValue: 'Retour' })}
        </Button>
      </div>
    );
  }

  const primaryColor = school.primary_color || '#3b82f6';
  const secondaryColor = school.secondary_color || '#1e40af';

  const getSchoolTypeLabel = (type: string) => {
    switch (type) {
      case 'virtual': return t('school.virtual', { defaultValue: 'École en ligne' });
      case 'physical': return t('school.physical', { defaultValue: 'École physique' });
      case 'both': return t('school.both', { defaultValue: 'Hybride' });
      default: return type;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="max-w-2xl mx-auto px-4 py-4 space-y-6"
      >
        {/* Header / Hero Section */}
        <div
          className="relative rounded-xl overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
        >
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 left-4 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-0"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.back', { defaultValue: 'Retour' })}
          </Button>

          <div className="px-6 pt-16 pb-10 text-white">
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

            {user && (
              <div className="flex flex-wrap gap-2 mt-4">
                <Button
                  onClick={() => setShowJoinModal(true)}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-0"
                  variant="outline"
                >
                  <UserPlus size={18} />
                  {t('school.joinSchool', { defaultValue: "Rejoindre cette école" })}
                </Button>
                {isPersonnel && (
                  <Button
                    onClick={() => navigate(`/school?id=${school.id}`)}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-0"
                    variant="outline"
                  >
                    <SchoolIcon size={18} />
                    {t('school.accessSchoolOS', { defaultValue: 'Accéder à School-OS' })}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Confirmation de code parental en attente */}
        {user && <ParentCodeConfirmation />}

        {/* Section À propos */}
        <section className="bg-card rounded-xl p-5 shadow-sm border border-border">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Building2 size={18} className="text-primary" />
            {t('school.about', { defaultValue: 'À propos' })}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {school.description || t('school.noDescription', { defaultValue: 'Aucune description disponible pour cette école.' })}
          </p>

          {(school.founded_year || school.teaching_language) && (
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
              {school.founded_year && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar size={16} className="text-muted-foreground" />
                  <span>{t('school.founded', { defaultValue: 'Fondée en' })} {school.founded_year}</span>
                </div>
              )}
              {school.teaching_language && (
                <div className="flex items-center gap-2 text-sm">
                  <Languages size={16} className="text-muted-foreground" />
                  <span>{school.teaching_language}</span>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Section Statistiques */}
        {stats && (stats.students > 0 || stats.teachers > 0 || stats.classes > 0) && (
          <section className="bg-card rounded-xl p-5 shadow-sm border border-border">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart2 size={18} className="text-primary" />
              {t('school.statistics', { defaultValue: 'Statistiques' })}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              {stats.students > 0 && (
                <div>
                  <div className="text-2xl font-bold text-primary">{stats.students}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                    <Users size={12} />
                    {t('school.students', { defaultValue: 'Élèves' })}
                  </div>
                </div>
              )}
              {stats.teachers > 0 && (
                <div>
                  <div className="text-2xl font-bold text-primary">{stats.teachers}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                    <GraduationCap size={12} />
                    {t('school.teachers', { defaultValue: 'Enseignants' })}
                  </div>
                </div>
              )}
              {stats.classes > 0 && (
                <div>
                  <div className="text-2xl font-bold text-primary">{stats.classes}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                    <BookOpen size={12} />
                    {t('school.classes', { defaultValue: 'Classes' })}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Section Localisation */}
        {(school.address || school.city || school.country) && (
          <section className="bg-card rounded-xl p-5 shadow-sm border border-border">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-primary" />
              {t('school.location', { defaultValue: 'Localisation' })}
            </h2>
            <div className="space-y-2 text-sm">
              {school.address && (
                <div className="flex items-start gap-2">
                  <MapPin size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                  <span>{school.address}</span>
                </div>
              )}
              {(school.city || school.country) && (
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-muted-foreground shrink-0" />
                  <span>{[school.city, school.country].filter(Boolean).join(', ')}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Section Contact */}
        {(school.phone || school.email || school.website) && (
          <section className="bg-card rounded-xl p-5 shadow-sm border border-border">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Phone size={18} className="text-primary" />
              {t('school.contact', { defaultValue: 'Contact' })}
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
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="text-center py-6 border-t border-border">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {school.name} • {t('school.allRightsReserved', { defaultValue: 'Tous droits réservés' })}
          </p>
        </footer>
      </motion.div>

      <SchoolJoinRequestModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        school={school}
      />
    </div>
  );
};

export default SchoolSitePage;
