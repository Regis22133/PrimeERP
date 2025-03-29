/**
 * Generates a secure random password
 * @returns Generated password string
 */
export function gerarSenhaSegura(): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+[]{}|;:,.<>?';

  const all = upper + lower + numbers + special;
  let senha = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    special[Math.floor(Math.random() * special.length)],
  ];

  for (let i = 4; i < 12; i++) {
    senha.push(all[Math.floor(Math.random() * all.length)]);
  }

  return senha.sort(() => Math.random() - 0.5).join('');
}

/**
 * Validates password strength
 * @param password Password to validate
 * @returns Object containing validation result and any error messages
 */
export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (password.length < 8) {
    return { isValid: false, message: 'A senha deve ter pelo menos 8 caracteres' };
  }

  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'A senha deve conter pelo menos uma letra maiúscula' };
  }

  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'A senha deve conter pelo menos uma letra minúscula' };
  }

  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: 'A senha deve conter pelo menos um número' };
  }

  if (!/[!@#$%^&*()_+\[\]{}|;:,.<>?]/.test(password)) {
    return { isValid: false, message: 'A senha deve conter pelo menos um caractere especial (!@#$%^&*()_+[]{}|;:,.<>?)' };
  }

  return { isValid: true };
}