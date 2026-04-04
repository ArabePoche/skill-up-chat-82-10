import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Building2, MapPin, Phone, Mail, Globe, Calendar, ArrowLeft, School as SchoolIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import SchoolJoinRequestModal from '@/school/components/SchoolJoinRequestModal';
import { School } from '@/school/hooks/useSchool';
import { useAuth } from '@/hooks/useAuth';
import { useUserSchools } from '@/school/hooks/useUserSchools';

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
  const isPersonnel = !!userSchools?.find(
    s => s.id === schoolId && s.role !== 'parent'
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

  const headerStyle = school.primary_color
    ? { background: `linear-gradient(135deg, ${school.primary_color}33, ${school.primary_color}11)` }
    : undefined;

  return (
    <div className="min-h-screen bg-background">
      {/* Header avec logo et nom de l'école */}
      <div
        className="relative h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-end p-6"
        style={headerStyle}
      >
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 left-4"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back', { defaultValue: 'Retour' })}
        </Button>

        <div className="flex items-center gap-4">
          {school.logo_url ? (
            <img
              src={school.logo_url}
              alt={school.name}
              className="h-16 w-16 rounded-full object-cover bg-background border-2 border-background shadow"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-background border-2 border-primary/20 flex items-center justify-center shadow">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{school.name}</h1>
            <span className="text-sm text-muted-foreground">
              {school.school_type === 'virtual' && t('school.virtual', { defaultValue: 'École Virtuelle' })}
              {school.school_type === 'physical' && t('school.physical', { defaultValue: 'École Physique' })}
              {school.school_type === 'both' && t('school.both', { defaultValue: 'Virtuel et Physique' })}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-2xl mx-auto">
        {/* Description */}
        {school.description && (
          <p className="text-muted-foreground">{school.description}</p>
        )}

        {/* Informations de contact */}
        <div className="space-y-2">
          {(school.city || school.country) && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{[school.city, school.country].filter(Boolean).join(', ')}</span>
            </div>
          )}
          {school.address && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{school.address}</span>
            </div>
          )}
          {school.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href={`tel:${school.phone}`} className="hover:underline">{school.phone}</a>
            </div>
          )}
          {school.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href={`mailto:${school.email}`} className="hover:underline">{school.email}</a>
            </div>
          )}
          {school.website && (
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
              <a
                href={school.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                {school.website}
              </a>
            </div>
          )}
          {school.founded_year && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{t('school.founded', { defaultValue: 'Fondée en' })} {school.founded_year}</span>
            </div>
          )}
        </div>

        {/* Boutons d'action */}
        <div className="flex flex-col gap-3 pt-2">
          <Button
            className="w-full"
            size="lg"
            onClick={() => setShowJoinModal(true)}
          >
            {t('school.joinSchool', { defaultValue: "Rejoindre l'école" })}
          </Button>
          {isPersonnel && (
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={() => navigate(`/school?id=${school.id}`)}
            >
              <SchoolIcon className="h-4 w-4 mr-2" />
              {t('school.accessSchoolOS', { defaultValue: 'Accéder à School-OS' })}
            </Button>
          )}
        </div>
      </div>

      <SchoolJoinRequestModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        school={school}
      />
    </div>
  );
};

export default SchoolSitePage;
