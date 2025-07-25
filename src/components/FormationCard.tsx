
import React from 'react';
import { Play, Users, Star } from 'lucide-react';

interface Formation {
  id: string;
  title: string;
  author?: string;
  image_url?: string;
  progress?: number;
  students: number;
  rating: number;
  isTeacher?: boolean;
  thumbnail_url?: string;
}

interface FormationCardProps {
  formation: Formation;
  isTeacherSection?: boolean;
  onClick: (formation: Formation) => void;
}

const FormationCard: React.FC<FormationCardProps> = ({ formation, isTeacherSection = false, onClick }) => (
  <div
    onClick={() => onClick(formation)}
    className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
  >
    <div className="relative">
      <div className="w-full h-32 sm:h-48 bg-gradient-to-br from-[#25d366]/10 to-[#20c75a]/10 flex items-center justify-center">
        {formation.image_url || formation.thumbnail_url ? (
          <img 
            src={formation.image_url || formation.thumbnail_url} 
            alt={formation.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <Play size={32} className="text-[#25d366] sm:w-10 sm:h-10" />
        )}
      </div>
      <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
        {isTeacherSection ? `${formation.students} élèves` : `${formation.progress || 0}% complété`}
      </div>
      {isTeacherSection && (
        <div className="absolute top-2 left-2 bg-[#25d366] text-white px-2 py-1 rounded text-xs">
          👨‍🏫 Professeur
        </div>
      )}
    </div>

    <div className="p-3 sm:p-4">
      <h3 className="font-semibold text-base sm:text-lg mb-2 line-clamp-2">{formation.title}</h3>
      <p className="text-sm text-gray-600 mb-3">Par {formation.author || 'Auteur inconnu'}</p>
      
      <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
        <div className="flex items-center space-x-1">
          <Users size={14} />
          <span className="text-xs sm:text-sm">{formation.students} étudiants</span>
        </div>
        <div className="flex items-center space-x-1">
          <Star size={14} className="text-yellow-400 fill-current" />
          <span className="text-xs sm:text-sm">{formation.rating}</span>
        </div>
      </div>

      {!isTeacherSection && formation.progress !== undefined && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-[#25d366] h-2 rounded-full transition-all duration-300"
            style={{ width: `${formation.progress}%` }}
          ></div>
        </div>
      )}
    </div>
  </div>
);

export default FormationCard;
