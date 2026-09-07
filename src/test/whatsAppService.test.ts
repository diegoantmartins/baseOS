import { describe, expect, it, vi } from 'vitest';
import {
  buildTeamRegistrationWhatsAppMessage,
  buildWhatsAppWebUrl,
  normalizePhoneNumber,
  openWhatsAppWeb,
} from '@/services/whatsAppService';

describe('whatsAppService', () => {
  describe('normalizePhoneNumber', () => {
    it('deve retornar string vazia para entrada vazia ou nula', () => {
      expect(normalizePhoneNumber('')).toBe('');
      expect(normalizePhoneNumber(undefined)).toBe('');
    });

    it('deve remover caracteres não numéricos como parênteses, traços e espaços', () => {
      expect(normalizePhoneNumber('(31) 98765-4321')).toBe('5531987654321');
      expect(normalizePhoneNumber('(11) 2345-6789')).toBe('551123456789');
    });

    it('deve manter prefixo 55 se já estiver presente', () => {
      expect(normalizePhoneNumber('+55 (31) 98765-4321')).toBe('5531987654321');
      expect(normalizePhoneNumber('5531987654321')).toBe('5531987654321');
    });

    it('não deve injetar 55 se o número tiver formato internacional diferente', () => {
      expect(normalizePhoneNumber('+1 555 123 4567')).toBe('15551234567');
    });
  });

  describe('buildTeamRegistrationWhatsAppMessage', () => {
    it('deve montar a mensagem conforme o template oficial', () => {
      const msg = buildTeamRegistrationWhatsAppMessage({
        managerName: 'Carlos Silva',
        teamName: 'Cruzeiro Vôlei',
        competitionName: 'Superliga 2026',
        portalUrl: 'http://localhost:5173/equipe/inscricao/token-123',
        managerEmail: 'carlos@cruzeiro.com',
        deadlineIso: '2026-10-15T23:59:00.000Z',
      });

      expect(msg).toContain('Olá, Carlos Silva! 👋');
      expect(msg).toContain('*Cruzeiro Vôlei*');
      expect(msg).toContain('*Superliga 2026*');
      expect(msg).toContain('http://localhost:5173/equipe/inscricao/token-123');
      expect(msg).toContain('E-mail: carlos@cruzeiro.com');
      expect(msg).toContain('dispensa senha inicial');
      expect(msg).toContain('Prazo para cadastro dos atletas:');
    });

    it('deve usar valores padrão quando gestor ou e-mail não forem informados', () => {
      const msg = buildTeamRegistrationWhatsAppMessage({
        teamName: 'Minas TC',
        competitionName: 'Campeonato Mineiro',
        portalUrl: 'http://localhost:5173/equipe/inscricao/token-456',
      });

      expect(msg).toContain('Olá, Responsável! 👋');
      expect(msg).not.toContain('E-mail:');
      expect(msg).toContain('Conforme regulamento da competição');
    });
  });

  describe('buildWhatsAppWebUrl', () => {
    it('deve gerar a URL com parâmetro phone normalizado e mensagem codificada', () => {
      const url = buildWhatsAppWebUrl('(31) 98765-4321', 'Olá, Teste!');
      expect(url).toBe('https://api.whatsapp.com/send?phone=5531987654321&text=Ol%C3%A1%2C%20Teste!');
    });

    it('deve gerar a URL sem parâmetro phone caso telefone não seja informado', () => {
      const url = buildWhatsAppWebUrl('', 'Olá, Teste!');
      expect(url).toBe('https://api.whatsapp.com/send?text=Ol%C3%A1%2C%20Teste!');
    });
  });

  describe('openWhatsAppWeb', () => {
    it('deve chamar window.open com a URL gerada e targets seguros', () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      openWhatsAppWeb('(31) 99999-8888', 'Mensagem teste');

      expect(openSpy).toHaveBeenCalledTimes(1);
      expect(openSpy).toHaveBeenCalledWith(
        'https://api.whatsapp.com/send?phone=5531999998888&text=Mensagem%20teste',
        '_blank',
        'noopener,noreferrer'
      );

      openSpy.mockRestore();
    });
  });
});
