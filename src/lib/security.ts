/**
 * Módulo de Segurança do BaseOS
 *
 * Provê sanitização de entradas (XSS prevention), validação de força de senha
 * e controle de bloqueio de tentativas de autenticação (Rate Limiting).
 */

/**
 * Sanitiza entradas de texto para prevenir XSS e injeção de marcadores HTML/Script.
 */
export function sanitizeInput(input: string | undefined | null): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Remove tags perigosas (<script>, <iframe>, onclick, etc.) preservando texto limpo.
 */
export function stripUnsafeHtml(input: string): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
}

/**
 * Validação de requisitos de segurança para senhas.
 */
export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { valid: false, message: 'A senha deve conter no mínimo 8 caracteres.' };
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return { valid: false, message: 'A senha deve conter pelo menos uma letra e um número.' };
  }
  return { valid: true };
}

// Memory tracker for login failures (Lockout protection)
const FAILED_ATTEMPTS_KEY = 'baseos.auth.failed_attempts.v1';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutos

type AttemptRecord = {
  count: number;
  lockedUntil?: number;
};

export class LoginRateLimiter {
  private static getRecords(): Record<string, AttemptRecord> {
    try {
      const raw = localStorage.getItem(FAILED_ATTEMPTS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private static saveRecords(records: Record<string, AttemptRecord>): void {
    try {
      localStorage.setItem(FAILED_ATTEMPTS_KEY, JSON.stringify(records));
    } catch {
      // Storage unavailable
    }
  }

  public static isLockedOut(email: string): { locked: boolean; remainingSeconds?: number } {
    const key = email.trim().toLowerCase();
    const records = this.getRecords();
    const rec = records[key];

    if (!rec || !rec.lockedUntil) return { locked: false };

    const now = Date.now();
    if (now < rec.lockedUntil) {
      const remainingSeconds = Math.ceil((rec.lockedUntil - now) / 1000);
      return { locked: true, remainingSeconds };
    }

    // Lockout expired: reset
    delete records[key];
    this.saveRecords(records);
    return { locked: false };
  }

  public static recordFailure(email: string): { locked: boolean; attemptsLeft: number } {
    const key = email.trim().toLowerCase();
    const records = this.getRecords();
    const rec = records[key] || { count: 0 };

    rec.count += 1;
    if (rec.count >= MAX_FAILED_ATTEMPTS) {
      rec.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      records[key] = rec;
      this.saveRecords(records);
      return { locked: true, attemptsLeft: 0 };
    }

    records[key] = rec;
    this.saveRecords(records);
    return { locked: false, attemptsLeft: MAX_FAILED_ATTEMPTS - rec.count };
  }

  public static recordSuccess(email: string): void {
    const key = email.trim().toLowerCase();
    const records = this.getRecords();
    if (records[key]) {
      delete records[key];
      this.saveRecords(records);
    }
  }
}
