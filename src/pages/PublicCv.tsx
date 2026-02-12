/**
 * Page publique pour consulter un CV par son ID
 * Accessible sans authentification à /cv/:cvId
 */
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, GraduationCap, Briefcase, Star, Globe, Heart, Award, FolderOpen, Users } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const sectionIcons: Record<string, React.ReactNode> = {
  education: <GraduationCap className="w-4 h-4" />,
  experiences: <Briefcase className="w-4 h-4" />,
  skills: <Star className="w-4 h-4" />,
  languages: <Globe className="w-4 h-4" />,
  hobbies: <Heart className="w-4 h-4" />,
  certifications: <Award className="w-4 h-4" />,
  projects: <FolderOpen className="w-4 h-4" />,
  references: <Users className="w-4 h-4" />,
};

const PublicCv: React.FC = () => {
  const { cvId } = useParams<{ cvId: string }>();
  const navigate = useNavigate();

  const { data: cv, isLoading, error } = useQuery({
    queryKey: ['public-cv', cvId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_cvs')
        .select('*')
        .eq('id', cvId!)
        .single();
      if (error) throw error;

      // Charger le profil du propriétaire
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('id', data.user_id)
        .single();

      return { ...data, profile };
    },
    enabled: !!cvId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Chargement du CV...</p>
      </div>
    );
  }

  if (error || !cv) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-destructive">CV introuvable ou non public.</p>
        <Button variant="outline" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour
        </Button>
      </div>
    );
  }

  const personalInfo = cv.personal_info as any;
  const education = cv.education as any[];
  const experiences = cv.experiences as any[];
  const skills = cv.skills as any[];
  const languages = cv.languages as any[];
  const hobbies = cv.hobbies as any[];
  const certifications = cv.certifications as any[];
  const projects = cv.projects as any[];
  const references = cv.references as any[];
  const sectionOrder = cv.section_order || [];

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case 'personalInfo':
        return (
          <div key={sectionId} className="text-center mb-8">
            {cv.profile?.avatar_url && (
              <Avatar className="w-20 h-20 mx-auto mb-3">
                <AvatarImage src={cv.profile.avatar_url} />
                <AvatarFallback><User className="w-8 h-8" /></AvatarFallback>
              </Avatar>
            )}
            {personalInfo?.fullName && <h1 className="text-2xl font-bold">{personalInfo.fullName}</h1>}
            {personalInfo?.title && <p className="text-muted-foreground">{personalInfo.title}</p>}
            <p className="text-sm text-muted-foreground mt-1">
              {[personalInfo?.email, personalInfo?.phone, personalInfo?.address].filter(Boolean).join(' • ')}
            </p>
            {personalInfo?.summary && <p className="mt-3 text-sm max-w-2xl mx-auto">{personalInfo.summary}</p>}
          </div>
        );
      case 'education':
        return education?.length > 0 ? (
          <div key={sectionId} className="mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2 border-b border-border pb-2 mb-3">
              {sectionIcons.education} Éducation
            </h2>
            {education.map((e: any, i: number) => (
              <div key={i} className="mb-3">
                <p className="font-semibold text-sm">{e.degree} {e.field} — {e.school}</p>
                <p className="text-xs text-muted-foreground">{e.startDate} - {e.endDate}</p>
                {e.description && <p className="text-xs mt-1">{e.description}</p>}
              </div>
            ))}
          </div>
        ) : null;
      case 'experiences':
        return experiences?.length > 0 ? (
          <div key={sectionId} className="mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2 border-b border-border pb-2 mb-3">
              {sectionIcons.experiences} Expériences
            </h2>
            {experiences.map((e: any, i: number) => (
              <div key={i} className="mb-3">
                <p className="font-semibold text-sm">{e.position} — {e.company}</p>
                <p className="text-xs text-muted-foreground">{e.startDate} - {e.current ? 'Présent' : e.endDate}</p>
                {e.description && <p className="text-xs mt-1">{e.description}</p>}
              </div>
            ))}
          </div>
        ) : null;
      case 'skills':
        return skills?.length > 0 ? (
          <div key={sectionId} className="mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2 border-b border-border pb-2 mb-3">
              {sectionIcons.skills} Compétences
            </h2>
            <div className="flex flex-wrap gap-2">
              {skills.map((s: any, i: number) => (
                <Badge key={i} variant="secondary">{s.name} ({s.level})</Badge>
              ))}
            </div>
          </div>
        ) : null;
      case 'languages':
        return languages?.length > 0 ? (
          <div key={sectionId} className="mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2 border-b border-border pb-2 mb-3">
              {sectionIcons.languages} Langues
            </h2>
            <div className="flex flex-wrap gap-2">
              {languages.map((l: any, i: number) => (
                <Badge key={i} variant="outline">{l.name} — {l.level}</Badge>
              ))}
            </div>
          </div>
        ) : null;
      case 'hobbies':
        return hobbies?.length > 0 ? (
          <div key={sectionId} className="mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2 border-b border-border pb-2 mb-3">
              {sectionIcons.hobbies} Centres d'intérêt
            </h2>
            <p className="text-sm">{hobbies.map((h: any) => h.name).filter(Boolean).join(', ')}</p>
          </div>
        ) : null;
      case 'certifications':
        return certifications?.length > 0 ? (
          <div key={sectionId} className="mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2 border-b border-border pb-2 mb-3">
              {sectionIcons.certifications} Certifications
            </h2>
            {certifications.map((c: any, i: number) => (
              <p key={i} className="text-sm">{c.name} — {c.issuer} ({c.date})</p>
            ))}
          </div>
        ) : null;
      case 'projects':
        return projects?.length > 0 ? (
          <div key={sectionId} className="mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2 border-b border-border pb-2 mb-3">
              {sectionIcons.projects} Projets
            </h2>
            {projects.map((p: any, i: number) => (
              <div key={i} className="mb-2">
                <p className="font-semibold text-sm">{p.name}</p>
                {p.description && <p className="text-xs">{p.description}</p>}
                {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">{p.url}</a>}
              </div>
            ))}
          </div>
        ) : null;
      case 'references':
        return references?.length > 0 ? (
          <div key={sectionId} className="mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2 border-b border-border pb-2 mb-3">
              {sectionIcons.references} Références
            </h2>
            {references.map((r: any, i: number) => (
              <p key={i} className="text-sm">{r.name} — {r.position}, {r.company}</p>
            ))}
          </div>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Retour
        </Button>
        <div className="bg-background rounded-xl shadow-lg p-6 sm:p-10">
          {sectionOrder.map(id => renderSection(id))}
        </div>
      </div>
    </div>
  );
};

export default PublicCv;
