// Testes do serviço de autenticação (modo demo / LocalStorage).

import { beforeEach, describe, expect, it } from 'vitest';
import { authService, clearAuthSession } from '@/services/authService';

beforeEach(() => {
  clearAuthSession();
  localStorage.clear();
});

describe('authService (modo demo)', () => {
  it('autentica com credenciais demo válidas', async () => {
    const result = await authService.signIn('organizador@voleipro.app', 'demo123');
    expect(result.ok).toBe(true);
    expect(result.session?.user.role).toBe('organizer');
    expect(result.session?.user.name).toBe('Ana Organizadora');
  });

  it('persiste a sessão entre chamadas', async () => {
    await authService.signIn('arbitro@voleipro.app', 'demo123');
    const restored = authService.getStoredSession();
    expect(restored?.user.email).toBe('arbitro@voleipro.app');
    expect(restored?.user.role).toBe('referee');
  });

  it('rejeita senha incorreta', async () => {
    const result = await authService.signIn('organizador@voleipro.app', 'senha-errada');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('E-mail ou senha inválidos');
  });

  it('rejeita e-mail desconhecido', async () => {
    const result = await authService.signIn('nao-existe@voleipro.app', 'demo123');
    expect(result.ok).toBe(false);
  });

  it('ignora maiúsculas no e-mail', async () => {
    const result = await authService.signIn('Organizador@Voleipro.App', 'demo123');
    expect(result.ok).toBe(true);
  });

  it('faz logout e limpa a sessão', async () => {
    await authService.signIn('equipe@voleipro.app', 'demo123');
    await authService.signOut();
    expect(authService.getStoredSession()).toBeNull();
  });

  it('perfil de equipe carrega vínculo com a inscrição', async () => {
    await authService.signIn('equipe@voleipro.app', 'demo123');
    expect(authService.getStoredSession()?.user.competitionTeamId).toBe('ct-2');
  });

  it('notifica assinantes sobre mudanças de sessão', async () => {
    const seen: Array<{ email?: string } | null> = [];
    const unsubscribe = authService.subscribe(s => seen.push(s ? { email: s.user.email } : null));
    await authService.signIn('organizador@voleipro.app', 'demo123');
    await authService.signOut();
    unsubscribe();
    expect(seen).toEqual([{ email: 'organizador@voleipro.app' }, null]);
  });

  it('valida perfil por papel', () => {
    expect(authService.hasRole(null, ['organizer'])).toBe(false);
    expect(authService.hasRole({ user: { id: 'x', email: 'a@b', name: 'A', role: 'referee' } }, ['referee', 'organizer'])).toBe(true);
    expect(authService.hasRole({ user: { id: 'x', email: 'a@b', name: 'A', role: 'team' } }, ['organizer'])).toBe(false);
  });
});