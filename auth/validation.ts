export const validateUsername = (value: string): string | null => {
  if (!value) return 'Le nom d\'utilisateur est requis';
  if (value.length < 3) return 'Minimum 3 caractères';
  if (value.length > 30) return 'Maximum 30 caractères';
  if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Lettres, chiffres et _ uniquement';
  return null;
};

export const validateEmail = (value: string): string | null => {
  if (!value) return 'L\'email est requis';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) return 'Format d\'email invalide';
  return null;
};

export const validatePassword = (value: string): string | null => {
  if (!value) return 'Le mot de passe est requis';
  if (value.length < 8) return 'Minimum 8 caractères';
  if (!/[A-Z]/.test(value)) return 'Au moins 1 lettre majuscule';
  if (!/[0-9]/.test(value)) return 'Au moins 1 chiffre';
  return null;
};

export const validateConfirmPassword = (
  password: string,
  confirm: string
): string | null => {
  if (!confirm) return 'Veuillez confirmer le mot de passe';
  if (password !== confirm) return 'Les mots de passe ne correspondent pas';
  return null;
};

export const getPasswordStrength = (password: string): {
  score: number; // 0-4
  label: string;
  color: string;
} => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const capped = Math.min(score, 4);
  const labels = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'];
  const colors = ['#ed333b', '#f5c211', '#f5c211', '#57e389', '#2ec27e'];
  return { score: capped, label: labels[capped], color: colors[capped] };
};
