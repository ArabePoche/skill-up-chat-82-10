
import React from 'react';

interface ProfileProgressProps {
  enrollments: any[];
}

const ProfileProgress: React.FC<ProfileProgressProps> = ({ enrollments }) => {
  if (!enrollments || enrollments.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border mb-6">
      <h3 className="font-semibold mb-3">Progression actuelle</h3>
      <div className="space-y-3">
        {enrollments.slice(0, 3).map((enrollment) => {
          const formation = enrollment.formations;
          // Calculer la progression (à améliorer avec de vraies données)
          const progress = Math.floor(Math.random() * 100); // Temporaire
          
          return (
            <div key={enrollment.formation_id}>
              <div className="flex justify-between text-sm mb-1">
                <span className="truncate">{formation?.title || 'Formation'}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-edu-primary h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProfileProgress;
