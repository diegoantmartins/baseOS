// Testes do validador de sorteio do BASEOS.

import { describe, expect, it } from 'vitest';
import {
  validateDrawConfig,
  formatValidationErrors,
  getValidationSummary,
} from '@/services/drawValidator';
import type { DrawConfig } from '@/types/draw';
import type { TeamRecord } from '@/types/entities';

const createTeams = (count: number): TeamRecord[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `team-${i + 1}`,
    name: `Equipe ${i + 1}`,
    shortName: `E${i + 1}`,
    modality: 'indoor' as const,
  }));

const baseConfig: DrawConfig = {
  groupsCount: 2,
  seedingMode: 'seeded',
  seed: 123,
  headSeeds: [],
};

describe('validateDrawConfig', () => {
  describe('configuração inválida', () => {
    it('rejeita configuração nula', () => {
      const result = validateDrawConfig(null as unknown as DrawConfig, []);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_CONFIGURATION');
    });

    it('rejeita seed não numérica', () => {
      const config = { ...baseConfig, seed: NaN };
      const teams = createTeams(4);
      const result = validateDrawConfig(config, teams);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_CONFIGURATION')).toBe(true);
    });

    it('rejeita modo de sorteio inválido', () => {
      const config = { ...baseConfig, seedingMode: 'invalid' as 'random' | 'seeded' };
      const teams = createTeams(4);
      const result = validateDrawConfig(config, teams);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_CONFIGURATION')).toBe(true);
    });
  });

  describe('validação de equipes', () => {
    it('rejeita lista de equipes vazia', () => {
      const result = validateDrawConfig(baseConfig, []);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INSUFFICIENT_TEAMS');
    });

    it('rejeita apenas uma equipe', () => {
      const teams = createTeams(1);
      const result = validateDrawConfig(baseConfig, teams);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INSUFFICIENT_TEAMS');
    });

    it('aceita duas equipes', () => {
      const teams = createTeams(2);
      const result = validateDrawConfig(baseConfig, teams);
      expect(result.valid).toBe(true);
    });

    it('avisa com menos de 4 equipes', () => {
      const teams = createTeams(3);
      const result = validateDrawConfig(baseConfig, teams);
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('validação de grupos', () => {
    it('rejeita grupos menores que 1', () => {
      const config = { ...baseConfig, groupsCount: 0 };
      const teams = createTeams(4);
      const result = validateDrawConfig(config, teams);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_GROUP_COUNT');
    });

    it('rejeita grupos maiores que equipes', () => {
      const config = { ...baseConfig, groupsCount: 10 };
      const teams = createTeams(4);
      const result = validateDrawConfig(config, teams);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_GROUP_COUNT');
    });

    it('aceita grupos iguais às equipes', () => {
      const config = { ...baseConfig, groupsCount: 4 };
      const teams = createTeams(4);
      const result = validateDrawConfig(config, teams);
      expect(result.valid).toBe(true);
    });
  });

  describe('validação de cabeças de chave', () => {
    it('rejeita cabeça com ID inexistente', () => {
      const config = { ...baseConfig, headSeeds: ['team-999'] };
      const teams = createTeams(4);
      const result = validateDrawConfig(config, teams);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_HEAD_SEEDS');
      expect(result.errors[0].message).toContain('inexistentes');
    });

    it('rejeita cabeça duplicada', () => {
      const config = { ...baseConfig, headSeeds: ['team-1', 'team-1'] };
      const teams = createTeams(4);
      const result = validateDrawConfig(config, teams);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_HEAD_SEEDS');
      expect(result.errors[0].message).toContain('duplicadas');
    });

    it('rejeita mais cabeças que grupos', () => {
      const config = { ...baseConfig, groupsCount: 2, headSeeds: ['team-1', 'team-2', 'team-3'] };
      const teams = createTeams(4);
      const result = validateDrawConfig(config, teams);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_HEAD_SEEDS');
      expect(result.errors[0].message).toContain('Excesso');
    });

    it('avisa quando há cabeças mas modo é random', () => {
      const config: DrawConfig = { ...baseConfig, seedingMode: 'random', headSeeds: ['team-1', 'team-2'] };
      const teams = createTeams(4);
      const result = validateDrawConfig(config, teams);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('não influenciarão'))).toBe(true);
    });

    it('aceita configuração válida com cabeças', () => {
      const config = { ...baseConfig, groupsCount: 2, headSeeds: ['team-1', 'team-2'] };
      const teams = createTeams(4);
      const result = validateDrawConfig(config, teams);
      expect(result.valid).toBe(true);
    });

    it('avisa quando cabeças = grupos (config ideal)', () => {
      const config = { ...baseConfig, groupsCount: 4, headSeeds: ['team-1', 'team-2', 'team-3', 'team-4'] };
      const teams = createTeams(8);
      const result = validateDrawConfig(config, teams);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('ideal'))).toBe(true);
    });
  });

  describe('validação completa', () => {
    it('configuração válida retorna valid=true', () => {
      const config: DrawConfig = {
        groupsCount: 2,
        seedingMode: 'seeded',
        seed: 42,
        headSeeds: ['team-1'],
      };
      const teams = createTeams(8);
      const result = validateDrawConfig(config, teams);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

describe('formatValidationErrors', () => {
  it('retorna mensagem de sucesso para configuração válida', () => {
    const result = validateDrawConfig(baseConfig, createTeams(4));
    const msg = formatValidationErrors(result);
    expect(msg).toContain('sucesso');
  });

  it('formata erros com detalhes', () => {
    const config = { ...baseConfig, groupsCount: 0 };
    const teams = createTeams(4);
    const result = validateDrawConfig(config, teams);
    const msg = formatValidationErrors(result);
    expect(msg).toContain('•');
    expect(msg).toContain('Quantidade de grupos inválida');
  });
});

describe('getValidationSummary', () => {
  it('retorna "Configuração válida" para válido sem warnings', () => {
    const config: DrawConfig = { ...baseConfig, groupsCount: 2, headSeeds: [] };
    const teams = createTeams(4);
    const result = validateDrawConfig(config, teams);
    const summary = getValidationSummary(result);
    expect(summary).toBe('Configuração válida.');
  });

  it('conta avisos', () => {
    const config: DrawConfig = { ...baseConfig, seedingMode: 'random', headSeeds: ['team-1'] };
    const teams = createTeams(4);
    const result = validateDrawConfig(config, teams);
    const summary = getValidationSummary(result);
    expect(summary).toContain('aviso(s)');
  });

  it('conta erros', () => {
    const config: DrawConfig = { ...baseConfig, groupsCount: 0 };
    const teams = createTeams(4);
    const result = validateDrawConfig(config, teams);
    const summary = getValidationSummary(result);
    expect(summary).toContain('erro(s)');
  });
});
