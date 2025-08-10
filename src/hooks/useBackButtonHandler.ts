
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const useBackButtonHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Gérer le bouton retour du navigateur
      console.log('Back button pressed', event);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate, location]);
};

export default useBackButtonHandler;