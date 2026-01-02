/**
 * Messages d'erreur d'authentification traduits en français
 */

// Alias pour compatibilité avec l'import existant
export const translateAuthError = (error: string | null): string => {
  return getAuthErrorMessage(error);
};

export const getAuthErrorMessage = (error: string | null): string => {
  if (!error) return 'Une erreur est survenue';

  const errorLower = error.toLowerCase();

  // Erreurs d'email/mot de passe
  if (errorLower.includes('invalid login credentials') || errorLower.includes('invalid_credentials')) {
    return 'Email ou mot de passe incorrect';
  }
  if (errorLower.includes('email not confirmed')) {
    return 'Veuillez confirmer votre email avant de vous connecter';
  }
  if (errorLower.includes('user not found')) {
    return 'Aucun compte trouvé avec cet email';
  }
  if (errorLower.includes('invalid email')) {
    return 'Format d\'email invalide';
  }
  if (errorLower.includes('password') && errorLower.includes('weak')) {
    return 'Le mot de passe doit contenir au moins 6 caractères';
  }
  if (errorLower.includes('password') && errorLower.includes('short')) {
    return 'Le mot de passe est trop court';
  }

  // Erreurs de compte
  if (errorLower.includes('user already registered') || errorLower.includes('already exists')) {
    return 'Un compte existe déjà avec cet email';
  }
  if (errorLower.includes('signup disabled')) {
    return 'Les inscriptions sont temporairement désactivées';
  }

  // Erreurs de réseau
  if (errorLower.includes('network') || errorLower.includes('fetch')) {
    return 'Erreur de connexion. Vérifiez votre connexion internet';
  }
  if (errorLower.includes('timeout')) {
    return 'La connexion a expiré. Veuillez réessayer';
  }

  // Erreurs de session
  if (errorLower.includes('session expired') || errorLower.includes('refresh_token')) {
    return 'Votre session a expiré. Veuillez vous reconnecter';
  }
  if (errorLower.includes('not authenticated')) {
    return 'Vous devez être connecté pour effectuer cette action';
  }

  // Erreurs de rate limiting
  if (errorLower.includes('too many requests') || errorLower.includes('rate limit')) {
    return 'Trop de tentatives. Veuillez patienter quelques minutes';
  }

  // Erreurs OAuth
  if (errorLower.includes('oauth') || errorLower.includes('provider')) {
    return 'Erreur lors de la connexion avec ce fournisseur';
  }

  // Message par défaut
  return error;
};

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Email ou mot de passe incorrect',
  EMAIL_NOT_CONFIRMED: 'Veuillez confirmer votre email avant de vous connecter',
  USER_NOT_FOUND: 'Aucun compte trouvé avec cet email',
  USER_EXISTS: 'Un compte existe déjà avec cet email',
  WEAK_PASSWORD: 'Le mot de passe doit contenir au moins 6 caractères',
  NETWORK_ERROR: 'Erreur de connexion. Vérifiez votre connexion internet',
  SESSION_EXPIRED: 'Votre session a expiré. Veuillez vous reconnecter',
  RATE_LIMITED: 'Trop de tentatives. Veuillez patienter quelques minutes',
  GENERIC: 'Une erreur est survenue. Veuillez réessayer',
} as const;
