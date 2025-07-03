
import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface ExerciseStatusProps {
  status: string;
}

const ExerciseStatus: React.FC<ExerciseStatusProps> = ({ status }) => {
  return (
    <div className={`flex items-center space-x-1 mt-2 text-xs ${
      status === 'approved' ? 'text-green-600' : 'text-red-600'
    }`}>
      {status === 'approved' ? <CheckCircle size={12} /> : <XCircle size={12} />}
      <span>{status === 'approved' ? 'Validé' : 'Refusé'}</span>
    </div>
  );
};

export default ExerciseStatus;
