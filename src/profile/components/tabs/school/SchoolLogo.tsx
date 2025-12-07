/**
 * SchoolLogo - Logo stylisé "School" inspiré de Google
 * Les deux "o" sont mis en avant avec des couleurs Google
 */
import React from 'react';

const SchoolLogo: React.FC = () => {
  return (
    <h2 className="text-3xl font-normal tracking-tight select-none">
      <span className="text-blue-500">S</span>
      <span className="text-destructive">c</span>
      <span className="text-yellow-500">h</span>
      <span className="text-blue-500">o</span>
      <span className="text-green-500">o</span>
      <span className="text-destructive">l</span>
    </h2>
  );
};

export default SchoolLogo;
