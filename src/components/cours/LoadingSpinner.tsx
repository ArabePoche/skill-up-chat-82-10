
import React from 'react';

interface LoadingSpinnerProps {
  message: string;
  subtitle?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message, subtitle }) => {
  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pt-16 md:pb-4 flex items-center justify-center">
      <div className="text-center">
        <div className="text-lg font-semibold mb-2">{message}</div>
        {subtitle && <p className="text-gray-600">{subtitle}</p>}
      </div>
    </div>
  );
};

export default LoadingSpinner;
