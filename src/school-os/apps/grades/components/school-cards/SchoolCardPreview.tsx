/**
 * Composant de prévisualisation d'une carte scolaire individuelle
 * Format carte d'identité avec photo, infos élève, école et année scolaire
 */
import React from 'react';
import { SchoolCardStudent } from './useSchoolCardData';
import { GraduationCap } from 'lucide-react';

interface SchoolCardPreviewProps {
  student: SchoolCardStudent;
  schoolName: string;
  schoolYearLabel: string;
  schoolLogoUrl?: string;
}

export const SchoolCardPreview: React.FC<SchoolCardPreviewProps> = ({
  student,
  schoolName,
  schoolYearLabel,
  schoolLogoUrl,
}) => {
  const formattedDob = student.date_of_birth
    ? new Date(student.date_of_birth).toLocaleDateString('fr-FR')
    : '—';

  return (
    <div
      className="school-card-render bg-white text-black rounded-lg overflow-hidden border-2 border-primary/30 shadow-md"
      style={{ width: 340, height: 210, fontFamily: 'Arial, sans-serif' }}
    >
      {/* En-tête avec nom de l'école */}
      <div
        className="flex items-center gap-2 px-3 py-1.5"
        style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)' }}
      >
        {schoolLogoUrl ? (
          <img
            src={schoolLogoUrl}
            alt="Logo"
            className="w-7 h-7 rounded-full object-cover bg-white"
            crossOrigin="anonymous"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-[11px] leading-tight truncate">{schoolName}</p>
          <p className="text-blue-100 text-[9px]">Carte Scolaire — {schoolYearLabel}</p>
        </div>
      </div>

      {/* Corps de la carte */}
      <div className="flex gap-3 p-3">
        {/* Photo */}
        <div className="w-20 h-24 rounded bg-gray-100 border border-gray-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
          {student.photo_url ? (
            <img
              src={student.photo_url}
              alt={`${student.first_name} ${student.last_name}`}
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="text-gray-400 text-2xl font-bold">
              {student.first_name?.[0]}{student.last_name?.[0]}
            </div>
          )}
        </div>

        {/* Informations */}
        <div className="flex-1 flex flex-col justify-between min-w-0 text-[10px]">
          <div className="space-y-1">
            <div>
              <span className="text-gray-500">Nom :</span>{' '}
              <span className="font-bold text-[12px]">{student.last_name}</span>
            </div>
            <div>
              <span className="text-gray-500">Prénom :</span>{' '}
              <span className="font-bold text-[12px]">{student.first_name}</span>
            </div>
            <div>
              <span className="text-gray-500">Né(e) le :</span>{' '}
              <span className="font-semibold">{formattedDob}</span>
            </div>
            <div>
              <span className="text-gray-500">Classe :</span>{' '}
              <span className="font-semibold">{student.class_name}</span>
            </div>
          </div>
          {student.student_code && (
            <div className="mt-1 px-2 py-0.5 bg-gray-100 rounded text-center">
              <span className="text-gray-500 text-[9px]">Matricule : </span>
              <span className="font-mono font-bold text-[10px]">{student.student_code}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
