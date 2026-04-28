export interface PasswordStrengthResult {
  score: number; // 0-4
  isValid: boolean;
  feedback: string[];
}

export function validatePasswordStrength(
  password: string
): PasswordStrengthResult {
  const feedback: string[] = [];
  let score = 0;

  if (!password || password.length < 8) {
    feedback.push("Mindestens 8 Zeichen erforderlich");
    return { score: 0, isValid: false, feedback };
  }

  // Length
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  // Character variety
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (!hasLower) {
    feedback.push("Enthält keine Kleinbuchstaben");
  } else {
    score++;
  }

  if (!hasUpper) {
    feedback.push("Enthält keine Großbuchstaben");
  }

  if (!hasNumber) {
    feedback.push("Enthält keine Zahlen");
  }

  if (!hasSpecial) {
    feedback.push("Enthält keine Sonderzeichen");
  }

  // Common patterns
  const commonPatterns = [
    /^123/,
    /password/i,
    /qwerty/i,
    /admin/i,
    /letmein/i,
    /welcome/i,
    /monkey/i,
    /dragon/i,
    /master/i,
    /sunshine/i,
  ];

  if (commonPatterns.some((p) => p.test(password))) {
    feedback.push("Enthält gängige Passwörter oder Muster");
    score = Math.max(0, score - 1);
  }

  const isValid = feedback.length === 0;
  return {
    score: Math.min(4, Math.max(0, score - 1)),
    isValid,
    feedback,
  };
}

export function passwordStrengthLabel(score: number): string {
  switch (score) {
    case 0:
      return "Sehr schwach";
    case 1:
      return "Schwach";
    case 2:
      return "Mittel";
    case 3:
      return "Stark";
    case 4:
      return "Sehr stark";
    default:
      return "Unbekannt";
  }
}
