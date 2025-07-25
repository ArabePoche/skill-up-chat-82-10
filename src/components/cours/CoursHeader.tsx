
import React from 'react';

interface CoursHeaderProps {
  title: string;
  subtitle: string;
}

const CoursHeader: React.FC<CoursHeaderProps> = ({ title, subtitle }) => {
  return (
    <div className="bg-white shadow-sm sticky top-0 z-30">
      <div className="p-4">
        <h1 className="text-xl sm:text-2xl font-bold">{title}</h1>
        <p className="text-sm sm:text-base text-gray-600">{subtitle}</p>
      </div>
    </div>
  );
};

export default CoursHeader;
