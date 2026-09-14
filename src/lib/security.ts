/**
 * Módulo de Segurança do BaseOS
 *
 * Provê sanitização de entradas (XSS prevention), validação e análise de força de senha,
 * controle de bloqueio de tentativas de autenticação (Rate Limiting),
 * auditoria persistente de ações críticas e configurações de inatividade.
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
 * Validação básica de requisitos de segurança para senhas.
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

export type PasswordCriteria = {
  hasMinLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
};

export type PasswordStrengthAnalysis = {
  score: number; // 0 a 100
  level: 'very-weak' | 'weak' | 'fair' | 'strong' | 'very-strong';
  label: string;
  color: string;
  criteria: PasswordCriteria;
  isValid: boolean;
};

/**
 * Análise detalhada da força da senha com checklist e pontuação percentual.
 */
export function analyzePasswordStrength(password: string): PasswordStrengthAnalysis {
  const pwd = password || '';
  const criteria: PasswordCriteria = {
    hasMinLength: pwd.length >= 8,
    hasUpper: /[A-Z]/.test(pwd),
    hasLower: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSpecial: /[^A-Za-z0-9]/.test(pwd),
  };

  let points = 0;
  if (criteria.hasMinLength) points += 25;
  if (pwd.length >= 12) points += 15;
  if (criteria.hasUpper && criteria.hasLower) points += 20;
  else if (criteria.hasUpper || criteria.hasLower) points += 10;
  if (criteria.hasNumber) points += 20;
  if (criteria.hasSpecial) points += 20;

  const score = Math.min(100, points);

  let level: PasswordStrengthAnalysis['level'] = 'very-weak';
  let label = 'Muito Fraca';
  let color = 'bg-destructive text-destructive';

  if (score >= 90) {
    level = 'very-strong';
    label = 'Excelente';
    color = 'bg-emerald-500 text-emerald-500';
  } else if (score >= 70) {
    level = 'strong';
    label = 'Forte';
    color = 'bg-green-500 text-green-500';
  } else if (score >= 50) {
    level = 'fair';
    label = 'Razoável';
    color = 'bg-amber-500 text-amber-500';
  } else if (score >= 25) {
    level = 'weak';
    label = 'Fraca';
    color = 'bg-orange-500 text-orange-500';
  }

  const isValid = criteria.hasMinLength && (criteria.hasUpper || criteria.hasLower) && criteria.hasNumber;

  return {
    score,
    level,
    label,
    color,
    criteria,
    isValid,
  };
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

// ─── AUDIT LOG SERVICE ──────────────────────────────────────────────────────────

export type AuditEventType = 'info' | 'success' | 'warning' | 'error';

export type AuditLogEntry = {
  id: string;
  event: string;
  user: string;
  ip: string;
  time: string;
  type: AuditEventType;
  details?: string;
};

const AUDIT_LOGS_KEY = 'baseos.security.audit_logs.v1';

export class AuditService {
  public static getLogs(): AuditLogEntry[] {
    try {
      const raw = localStorage.getItem(AUDIT_LOGS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    // Dados iniciais de seed se vazio
    const initial: AuditLogEntry[] = [
      {
        id: 'log-1',
        event: 'Inicialização do Sistema de Segurança',
        user: 'Sistema BaseOS',
        ip: '127.0.0.1',
        time: new Date(Date.now() - 3600000 * 24).toLocaleString('pt-BR'),
        type: 'info',
        details: 'Proteção contra força bruta e auditoria ativados.',
      },
    ];
    this.saveLogs(initial);
    return initial;
  }

  private static saveLogs(logs: AuditLogEntry[]): void {
    try {
      // Manter até os 100 últimos logs
      const trimmed = logs.slice(0, 100);
      localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(trimmed));
    } catch {
      // storage unavailable
    }
  }

  public static logEvent(
    event: string,
    user: string,
    type: AuditEventType = 'info',
    details?: string
  ): AuditLogEntry {
    const logs = this.getLogs();
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      event: sanitizeInput(event),
      user: sanitizeInput(user) || 'Anônimo / Sistema',
      ip: '127.0.0.1 (Local)',
      time: new Date().toLocaleString('pt-BR'),
      type,
      details: details ? sanitizeInput(details) : undefined,
    };
    logs.unshift(newLog);
    this.saveLogs(logs);
    return newLog;
  }

  public static clearLogs(): void {
    localStorage.removeItem(AUDIT_LOGS_KEY);
  }
}

// ─── CONFIGURAÇÕES DE SEGURANÇA E INATIVIDADE ────────────────────────────────

export type SecurityPreferences = {
  inactivityTimeoutEnabled: boolean;
  inactivityTimeoutMinutes: number;
  requireStrongPassword: boolean;
  twoFactorEnabled: boolean;
};

const SECURITY_PREFS_KEY = 'baseos.security.preferences.v1';

export const DEFAULT_SECURITY_PREFS: SecurityPreferences = {
  inactivityTimeoutEnabled: true,
  inactivityTimeoutMinutes: 30,
  requireStrongPassword: true,
  twoFactorEnabled: false,
};

export class SecurityConfigService {
  public static getPreferences(): SecurityPreferences {
    try {
      const raw = localStorage.getItem(SECURITY_PREFS_KEY);
      if (raw) return { ...DEFAULT_SECURITY_PREFS, ...JSON.parse(raw) };
    } catch {
      // fallback
    }
    return DEFAULT_SECURITY_PREFS;
  }

  public static savePreferences(prefs: Partial<SecurityPreferences>): SecurityPreferences {
    const current = this.getPreferences();
    const updated = { ...current, ...prefs };
    try {
      localStorage.setItem(SECURITY_PREFS_KEY, JSON.stringify(updated));
    } catch {
      // fallback
    }
    return updated;
  }
}

/**
 * Sanitiza e valida URLs externas para exibição segura em links de apoiadores e parceiros.
 * Aceita exclusivamente os protocolos http: e https:.
 * Rejeita esquemas perigosos como javascript:, data:, vbscript: e caracteres de injeção.
 * Se a URL for válida mas não tiver protocolo explícito, normaliza com https://.
 */
export function sanitizeExternalUrl(url?: string | null): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  // Rejeita esquemas perigosos imediatamente
  if (/^(javascript|data|vbscript|file|blob):/i.test(trimmed)) {
    return undefined;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      const result = parsed.toString();
      if (result.endsWith('/') && !trimmed.endsWith('/') && parsed.pathname === '/') {
        return result.slice(0, -1);
      }
      return result;
    }
    return undefined;
  } catch {
    // Tenta prefixar https:// se for um domínio (ex: 'www.empresa.com.br' ou 'patrocinador.com/volei')
    if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(trimmed)) {
      try {
        const fallback = new URL(`https://${trimmed}`);
        if (fallback.protocol === 'https:') {
          const result = fallback.toString();
          if (result.endsWith('/') && !trimmed.endsWith('/') && fallback.pathname === '/') {
            return result.slice(0, -1);
          }
          return result;
        }
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
}

/**
 * Gerador oficial de senhas seguras e amigáveis para dirigentes e gestores de equipes.
 * Formato padrão: PalavraVolei@1234 (ex.: Volei@4821, Bloqueio@9123).
 * Atende plenamente à validação de validatePasswordStrength (letras, números, símbolos, 8+ chars).
 */
export function generateRandomPassword(): string {
  const words = ['Volei', 'Ace', 'Bloqueio', 'Saque', 'Ponto', 'Quadra', 'Manchete', 'Ataque'];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${word}@${num}`;
}
