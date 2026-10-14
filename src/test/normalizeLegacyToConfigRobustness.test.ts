import { describe, it, expect } from 'vitest';
import { parseLegacySetFormat, formatSetsToWinLabel } from '@/types/competitionConfig';
import { CompetitionRulesService } from '@/services/competitionRulesService';
import type { CompetitionRecord } from '@/types/entities';

describe('HOTFIX: Robustez contra TypeError e.trim is not a function', () => {
  describe('parseLegacySetFormat', () => {
    it('deve lidar seguramente com números (1, 2, 3, 5)', () => {
      expect(parseLegacySetFormat(1)).toBe(1);
      expect(parseLegacySetFormat(2)).toBe(2);
      expect(parseLegacySetFormat(3)).toBe(3);
      expect(parseLegacySetFormat(5)).toBe(3);
      expect(parseLegacySetFormat(0)).toBe(2);
    });

    it('deve lidar seguramente com valores nullish, objetos e tipos inválidos', () => {
      expect(parseLegacySetFormat(null)).toBe(2);
      expect(parseLegacySetFormat(undefined)).toBe(2);
      expect(parseLegacySetFormat({})).toBe(2);
      expect(parseLegacySetFormat([])).toBe(2);
      expect(parseLegacySetFormat(true)).toBe(2);
      expect(parseLegacySetFormat(false)).toBe(2);
    });

    it('deve lidar seguramente com strings válidas legadas e numéricas', () => {
      expect(parseLegacySetFormat('3-sets')).toBe(2);
      expect(parseLegacySetFormat('5-sets')).toBe(3);
      expect(parseLegacySetFormat('best-of-5')).toBe(3);
      expect(parseLegacySetFormat('1-set')).toBe(1);
      expect(parseLegacySetFormat('2')).toBe(2);
      expect(parseLegacySetFormat('3')).toBe(2); // '3' cai no default 2
      expect(parseLegacySetFormat('5')).toBe(3);
      expect(parseLegacySetFormat('1')).toBe(1);
    });
  });

  describe('formatSetsToWinLabel', () => {
    it('deve formatar números e SetsToWin corretamente', () => {
      expect(formatSetsToWinLabel(1)).toBe('Set Único');
      expect(formatSetsToWinLabel(2)).toBe('Melhor de 3 sets');
      expect(formatSetsToWinLabel(3)).toBe('Melhor de 5 sets');
      expect(formatSetsToWinLabel(5)).toBe('Melhor de 5 sets');
      expect(formatSetsToWinLabel(0)).toBe('Melhor de 3 sets');
    });
  });

  describe('CompetitionRulesService.normalizeLegacyToConfig', () => {
    it('não deve disparar TypeError quando phaseSetRules contiver números inteiros vindos do DB', () => {
      const mockCompetition: CompetitionRecord = {
        id: 'comp-test',
        name: '4º Campeonato Voltz',
        modality: 'indoor',
        format: 'groups-play-in-knockout',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'mixed',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        organizationId: 'org-1',
        supporters: [],
        phaseSetRules: {
          groupStage: 2,
          playoffs: 2,
          quarterfinals: 2,
          semifinals: 3,
          final: 3,
        },
      };

      expect(() => {
        const config = CompetitionRulesService.normalizeLegacyToConfig(mockCompetition);
        expect(config.format.phaseOverrides?.groupStage).toBe(2);
        expect(config.format.phaseOverrides?.quarterfinals).toBe(2);
        expect(config.format.phaseOverrides?.semifinals).toBe(3);
        expect(config.format.phaseOverrides?.final).toBe(3);
      }).not.toThrow();
    });

    it('não deve disparar erro ao calcular getRosterLimits para competição com config moderna', () => {
      const mockCompetition: CompetitionRecord = {
        id: 'comp-test-limits',
        name: '4º Campeonato Voltz',
        modality: 'indoor',
        format: 'groups-play-in-knockout',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'mixed',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        organizationId: 'org-1',
        supporters: [],
        config: {
          version: 1,
          format: {
            defaultSetsToWin: 2,
            phaseOverrides: {
              groupStage: 2,
              quarterfinals: 2,
              semifinals: 3,
              final: 3,
            },
            setRules: {
              regularSetPoints: 25,
              tiebreakPoints: 15,
              minAdvantage: 2,
            },
          },
          scoring: {
            systemType: 'fivb-standard',
            pointsWinClear: 3,
            pointsWinNarrow: 2,
            pointsLossNarrow: 1,
            pointsLossClear: 0,
            pointsWoWin: 3,
            pointsWoLoss: 0,
          },
          standings: {
            tiebreakCriteriaOrder: ['points', 'victories'],
            advancingPerGroup: 2,
            bestThirds: { enabled: false, count: 0 },
          },
          registration: {
            minAthletes: 6,
            maxAthletes: 14,
            maxCaptains: 1,
            maxLiberos: 2,
            requireJerseyNumberOnRegistration: false,
          },
        },
        phaseSetRules: {
          groupStage: 2,
          playoffs: 2,
          semifinals: 3,
          final: 3,
        },
      };

      expect(() => {
        const limits = CompetitionRulesService.getRosterLimits(mockCompetition);
        expect(limits.min).toBe(6);
        expect(limits.max).toBe(14);
        expect(limits.maxLiberos).toBe(2);
      }).not.toThrow();
    });
  });
});
