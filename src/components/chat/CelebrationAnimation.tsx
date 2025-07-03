
import React, { useEffect, useState } from 'react';

interface CelebrationAnimationProps {
  show: boolean;
  onComplete?: () => void;
}

const CelebrationAnimation: React.FC<CelebrationAnimationProps> = ({ show, onComplete }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      {/* Confettis animation */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-bounce`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${1 + Math.random()}s`
            }}
          />
        ))}
        {[...Array(15)].map((_, i) => (
          <div
            key={`star-${i}`}
            className={`absolute w-3 h-3 text-yellow-400 animate-ping`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`
            }}
          >
            ⭐
          </div>
        ))}
      </div>

      {/* Message de félicitations */}
      <div className="bg-green-500 text-white px-8 py-4 rounded-lg shadow-lg animate-bounce text-center">
        <div className="text-2xl font-bold mb-2">🎉 Félicitations ! 🎉</div>
        <p className="text-lg">Leçon terminée avec succès !</p>
      </div>
    </div>
  );
};

export default CelebrationAnimation;
