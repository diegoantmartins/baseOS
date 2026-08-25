import { describe, it, expect, beforeEach } from 'vitest';
import {
  validatePasswordStrength,
  analyzePasswordStrength,
  AuditService,
  SecurityConfigService,
} from '@/lib/security';
import { authService, clearAuthSession } from '@/services/authService';

describe('Módulo de Segurança e Troca de Senha', () => {
  beforeEach(() => {
    localStorage.clear();
    clearAuthSession();
  });

  describe('Validador e Analisador de Força de Senha', () => {
    it('deve rejeitar senhas com menos de 8 caracteres', () => {
      const res = validatePasswordStrength('Ab1!');
      expect(res.valid).toBe(false);
      expect(res.message).toContain('mínimo 8 caracteres');
    });

    it('deve rejeitar senhas sem números ou sem letras', () => {
      const onlyLetters = validatePasswordStrength('Abcdefghij');
      expect(onlyLetters.valid).toBe(false);

      const onlyNumbers = validatePasswordStrength('1234567890');
      expect(onlyNumbers.valid).toBe(false);
    });

    it('deve aprovar senhas válidas com letras e números', () => {
      const valid = validatePasswordStrength('Volei2026!');
      expect(valid.valid).toBe(true);
    });

    it('deve calcular pontuação e checklist detalhado na análise de força', () => {
      const weak = analyzePasswordStrength('12345678');
      expect(weak.isValid).toBe(false);
      expect(weak.criteria.hasMinLength).toBe(true);
      expect(weak.criteria.hasUpper).toBe(false);

      const strong = analyzePasswordStrength('VoleiPro#2026');
      expect(strong.isValid).toBe(true);
      expect(strong.criteria.hasMinLength).toBe(true);
      expect(strong.criteria.hasUpper).toBe(true);
      expect(strong.criteria.hasLower).toBe(true);
      expect(strong.criteria.hasNumber).toBe(true);
      expect(strong.criteria.hasSpecial).toBe(true);
      expect(strong.score).toBeGreaterThanOrEqual(80);
      expect(['strong', 'very-strong']).toContain(strong.level);
    });
  });

  describe('AuditService (Auditoria e Logs)', () => {
    it('deve registrar e recuperar eventos no log com sanitização', () => {
      AuditService.logEvent('Troca de Senha', 'admin@voleipro.app', 'success', 'Senha alterada com sucesso.');
      const logs = AuditService.getLogs();
      expect(logs.length).toBeGreaterThanOrEqual(1);

      const latest = logs[0];
      expect(latest.event).toBe('Troca de Senha');
      expect(latest.user).toBe('admin@voleipro.app');
      expect(latest.type).toBe('success');
    });

    it('deve limpar logs quando solicitado', () => {
      AuditService.logEvent('Teste', 'user@test.com', 'info');
      AuditService.clearLogs();
      const logs = AuditService.getLogs();
      // O getLogs recarrega o seed padrão se vazio
      expect(logs.length).toBe(1);
      expect(logs[0].event).toContain('Inicialização');
    });
  });

  describe('SecurityConfigService (Preferências e Inatividade)', () => {
    it('deve salvar e recuperar preferências de inatividade', () => {
      SecurityConfigService.savePreferences({
        inactivityTimeoutEnabled: true,
        inactivityTimeoutMinutes: 15,
      });

      const prefs = SecurityConfigService.getPreferences();
      expect(prefs.inactivityTimeoutEnabled).toBe(true);
      expect(prefs.inactivityTimeoutMinutes).toBe(15);
    });
  });

  describe('Troca de Senha no authService', () => {
    it('deve falhar a troca de senha se não houver usuário logado', async () => {
      const res = await authService.changePassword('demo123', 'NovaSenha123!');
      expect(res.ok).toBe(false);
      expect(res.error).toContain('Sessão expirada');
    });

    it('deve falhar a troca de senha se a senha atual estiver incorreta', async () => {
      // Faz login como organizador
      await authService.signIn('organizador@voleipro.app', 'demo123');

      const res = await authService.changePassword('senhaErrada', 'NovaSenha123!');
      expect(res.ok).toBe(false);
      expect(res.error).toContain('atual informada está incorreta');
    });

    it('deve trocar a senha com sucesso e permitir login com a nova senha', async () => {
      // 1. Login inicial com demo123
      const login1 = await authService.signIn('organizador@voleipro.app', 'demo123');
      expect(login1.ok).toBe(true);

      // 2. Troca para NovaSenha2026!
      const changeRes = await authService.changePassword('demo123', 'NovaSenha2026!');
      expect(changeRes.ok).toBe(true);

      // 3. Logout
      await authService.signOut();

      // 4. Login com a senha antiga deve falhar
      const loginOld = await authService.signIn('organizador@voleipro.app', 'demo123');
      expect(loginOld.ok).toBe(false);

      // 5. Login com a nova senha deve ter sucesso
      const loginNew = await authService.signIn('organizador@voleipro.app', 'NovaSenha2026!');
      expect(loginNew.ok).toBe(true);
    });

    it('administrador deve conseguir redefinir a senha de outro usuário', async () => {
      // Login como organizador/admin
      await authService.signIn('organizador@voleipro.app', 'demo123');

      // Redefine a senha do árbitro (demo-referee)
      const resetRes = await authService.adminResetPassword('demo-referee', 'ArbitroForte99!');
      expect(resetRes.ok).toBe(true);

      // Logout do admin
      await authService.signOut();

      // Árbitro loga com a nova senha definida pelo admin
      const refLogin = await authService.signIn('arbitro@voleipro.app', 'ArbitroForte99!');
      expect(refLogin.ok).toBe(true);
    });
  });
});
