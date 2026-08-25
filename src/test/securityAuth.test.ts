import { describe, it, expect, beforeEach } from 'vitest';
import { LoginRateLimiter, validatePasswordStrength, sanitizeInput, stripUnsafeHtml } from '@/lib/security';
import { authService } from '@/services/authService';

describe('Fase 7 & 14 — Segurança de Autenticação, Rate Limiting e Sanitização', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('deve validar requisitos de força de senha (mínimo 8 caracteres, alfanumérico)', () => {
    expect(validatePasswordStrength('12345').valid).toBe(false);
    expect(validatePasswordStrength('abcdefgh').valid).toBe(false);
    expect(validatePasswordStrength('12345678').valid).toBe(false);
    expect(validatePasswordStrength('SenhaForte123').valid).toBe(true);
  });

  it('deve bloquear tentativas excessivas de login (Brute Force Lockout após 5 falhas)', () => {
    const email = 'atacante@exemplo.com';

    // 1ª a 4ª tentativa
    for (let i = 1; i <= 4; i++) {
      const res = LoginRateLimiter.recordFailure(email);
      expect(res.locked).toBe(false);
      expect(res.attemptsLeft).toBe(5 - i);
    }

    // 5ª tentativa -> Bloqueio imediato por 5 minutos
    const fifth = LoginRateLimiter.recordFailure(email);
    expect(fifth.locked).toBe(true);
    expect(fifth.attemptsLeft).toBe(0);

    // Verificação de lockout ativo
    const status = LoginRateLimiter.isLockedOut(email);
    expect(status.locked).toBe(true);
    expect(status.remainingSeconds).toBeGreaterThan(0);
  });

  it('deve limpar histórico de falhas após login bem-sucedido', () => {
    const email = 'usuario@exemplo.com';
    LoginRateLimiter.recordFailure(email);
    LoginRateLimiter.recordFailure(email);

    LoginRateLimiter.recordSuccess(email);

    const status = LoginRateLimiter.isLockedOut(email);
    expect(status.locked).toBe(false);
  });

  it('deve sanitizar entradas contra XSS e injeção de HTML', () => {
    const malicious = '<script>alert("XSS")</script><img src="x" onerror="stealCookies()">';
    const sanitized = sanitizeInput(malicious);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('&lt;script&gt;');

    const stripped = stripUnsafeHtml(malicious);
    expect(stripped).not.toContain('<script>');
    expect(stripped).not.toContain('onerror=');
  });

  it('deve gerenciar sessões sem expor senhas em plaintext', async () => {
    const res = await authService.signIn('organizador@voleipro.app', 'demo123');
    expect(res.ok).toBe(true);
    expect('password' in (res.session?.user || {})).toBe(false);

    const stored = authService.getStoredSession();
    expect(stored?.user.email).toBe('organizador@voleipro.app');
    expect('password' in (stored?.user || {})).toBe(false);

    await authService.signOut();
    expect(authService.getStoredSession()).toBeNull();
  });
});
