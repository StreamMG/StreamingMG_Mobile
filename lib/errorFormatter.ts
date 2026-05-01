/**
 * lib/errorFormatter.ts
 * 
 * Utilitaire centralisé pour formater les erreurs serveur
 * en messages explicites et compréhensibles pour l'utilisateur.
 */

export interface ServerError {
  message?: string;
  code?: string;
}

export function formatError(error: any, defaultMessage = "Une erreur est survenue."): string {
  // Erreur réseau
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return "Délai d'attente dépassé. Vérifiez votre connexion.";
    }
    if (error.message?.includes('Network Error')) {
      return "Impossible de contacter le serveur. Vérifiez votre connexion internet.";
    }
    return defaultMessage;
  }

  const serverError: ServerError = error.response.data || {};
  const code = serverError.code;
  const status = error.response.status;

  // Gestion par code d'erreur serveur
  if (code) {
    const errorMessages: Record<string, string> = {
      // Authentification
      'EMAIL_DUPLICATE': 'Cette adresse email est déjà utilisée.',
      'INVALID_CREDENTIALS': 'Email ou mot de passe incorrect.',
      'INVALID_REFRESH_TOKEN': 'Votre session a expiré. Veuillez vous reconnecter.',
      'RATE_LIMIT': 'Trop de tentatives. Réessayez dans 15 minutes.',
      
      // Contenu
      'CONTENT_NOT_FOUND': 'Ce contenu est introuvable.',
      'AUDIO_NOT_FOUND': 'Ce fichier audio est introuvable.',
      'HLS_FORBIDDEN': 'Accès à la vidéo refusé. Token invalide.',
      'NOT_FOUND': 'Ressource introuvable.',
      
      // Profil
      'USERNAME_DUPLICATE': 'Ce nom d\'utilisateur est déjà pris.',
      'INVALID_USERNAME': 'Nom d\'utilisateur invalide (3 à 30 caractères).',
      'WRONG_PASSWORD': 'Mot de passe actuel incorrect.',
      'WEAK_PASSWORD': 'Le nouveau mot de passe est trop faible (minimum 8 caractères).',
      
      // Upload
      'THUMBNAIL_REQUIRED': 'La vignette est obligatoire.',
      'INVALID_MIME_TYPE': 'Type de fichier non autorisé (JPEG ou PNG uniquement).',
      'FILE_TOO_LARGE': 'Fichier trop volumineux (max 5 Mo pour la vignette).',
      'PRICE_REQUIRED': 'Le prix est requis pour un contenu payant.',
      'MISSING_THUMBNAIL': 'Une image (vignette) est requise pour cet upload.',
      
      // Paiements
      'FORBIDDEN': 'Accès refusé.',
      'ALREADY_SUBSCRIBED': 'Vous avez déjà un abonnement Premium actif.',
      'ALREADY_PURCHASED': 'Vous avez déjà acheté ce contenu.',
      'ALREADY_DOWNLOADED': 'Ce contenu est déjà téléchargé.',
      'INVALID_PLAN': 'Plan d\'abonnement invalide.',
      'INVALID_STRIPE_SIGNATURE': 'Erreur de sécurité lors du paiement.',
      'DUPLICATE_PURCHASE': 'Vous avez déjà acheté ce contenu.',
      
      // Autres
      'PREMIUM_REQUIRED': 'Ce contenu nécessite un abonnement Premium.',
      'PURCHASE_REQUIRED': 'Ce contenu doit être acheté.',
    };

    if (errorMessages[code]) {
      return errorMessages[code];
    }
  }

  // Gestion par code HTTP
  if (status === 401) {
    return "Session expirée. Veuillez vous reconnecter.";
  }
  if (status === 403) {
    return "Accès refusé.";
  }
  if (status === 404) {
    return "Ressource introuvable.";
  }
  if (status === 429) {
    return "Trop de requêtes. Réessayez plus tard.";
  }
  if (status === 500) {
    return "Erreur serveur. Réessayez ultérieurement.";
  }

  // Message serveur par défaut
  return serverError.message || defaultMessage;
}
