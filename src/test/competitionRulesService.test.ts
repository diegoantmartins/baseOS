import { describe, expect, it } from 'vitest';
import { CompetitionRulesService } from '@/services/competitionRulesService';
import type { CompetitionRecord, SetScoreRecord } from '@/types/entities';

describe('CompetitionRulesService — Fonte Única da Verdade das Regras Esportivas', () => {
  const baseIndoorComp: CompetitionRecord = {
    id: 'comp-1',
    name: 'Superliga Regional 2026',
    modality: 'indoor',
    format: 'group-stage-knockout',
    playerFormat: '6x6',
    setFormat: '3-sets',
    genderCategory: 'female',
    status: 'planning',
    phaseSetRules: {
      groupStage: '3-sets',
      playoffs: '3-sets',
      semifinals: '5-sets',
      final: '5-sets',
    },
    tiebreakCriteriaOrder: ['points', 'victories', 'head-to-head'],
    advancingPerGroup: 2,
    bestThirdsCount: 0,
  };

  const baseBeachComp: CompetitionRecord = {
    id: 'comp-beach',
    name: 'Circuito de Praia 2026',
    modality: 'beach',
    format: 'round-robin',
    playerFormat: '2x2',
    setFormat: '3-sets',
    genderCategory: 'mixed',
    status: 'registration-open',
  };

  describe('1. Normalização de Competições Legadas (Backward Compatibility)', () => {
    it('normaliza competição indoor legada para o modelo canônico CompetitionConfig', () => {
      const config = CompetitionRulesService.getConfig(baseIndoorComp);
      expect(config.version).toBe(1);
      expect(config.format.defaultSetsToWin).toBe(2); // '3-sets' -> setsToWin: 2
      expect(config.format.setRules.regularSetPoints).toBe(25);
      expect(config.format.setRules.tiebreakPoints).toBe(15);
      expect(config.format.setRules.minAdvantage).toBe(2);
      expect(config.scoring.pointsWinClear).toBe(3);
      expect(config.scoring.pointsWinNarrow).toBe(2);
      expect(config.scoring.pointsLossNarrow).toBe(1);
      expect(config.scoring.pointsLossClear).toBe(0);
      expect(config.registration.minAthletes).toBe(6);
      expect(config.registration.maxAthletes).toBe(14);
      expect(config.registration.maxLiberos).toBe(2);
    });

    it('normaliza competição de praia com limites de atletas e pontuação de 21 pts', () => {
      const config = CompetitionRulesService.getConfig(baseBeachComp);
      expect(config.format.setRules.regularSetPoints).toBe(21);
      expect(config.format.setRules.tiebreakPoints).toBe(15);
      expect(config.registration.minAthletes).toBe(2);
      expect(config.registration.maxAthletes).toBe(4);
      expect(config.registration.maxLiberos).toBe(0);
    });

    it('reconhece strings legadas de sets ("best-of-5", "5-sets", "1-set")', () => {
      const compBestOf5 = { ...baseIndoorComp, setFormat: 'best-of-5' };
      expect(CompetitionRulesService.getConfig(compBestOf5).format.defaultSetsToWin).toBe(3);

      const comp1Set = { ...baseIndoorComp, setFormat: '1-set' };
      expect(CompetitionRulesService.getConfig(comp1Set).format.defaultSetsToWin).toBe(1);
    });
  });

  describe('2. Resolução de Formatos de Partida por Fase (setsToWin e maxSets)', () => {
    it('resolve formato padrão para fase de grupos (setsToWin = 2, maxSets = 3)', () => {
      const format = CompetitionRulesService.resolveMatchFormat(baseIndoorComp, 'group-stage');
      expect(format.setsToWin).toBe(2);
      expect(format.maxSets).toBe(3);
      expect(format.regularSetPoints).toBe(25);
    });

    it('resolve formato de melhor de 5 para a Final (setsToWin = 3, maxSets = 5)', () => {
      const format = CompetitionRulesService.resolveMatchFormat(baseIndoorComp, 'final');
      expect(format.setsToWin).toBe(3);
      expect(format.maxSets).toBe(5);
    });

    it('resolve formato de melhor de 5 para Semifinais independentemente de outras fases', () => {
      const format = CompetitionRulesService.resolveMatchFormat(baseIndoorComp, 'semifinal');
      expect(format.setsToWin).toBe(3);
      expect(format.maxSets).toBe(5);
    });

    it('honra sobrescrita pontual da partida (customSetFormat) sobre a regra da fase', () => {
      // Partida excepcional configurada para 1 set único
      const format = CompetitionRulesService.resolveMatchFormat(baseIndoorComp, 'final', '1-set');
      expect(format.setsToWin).toBe(1);
      expect(format.maxSets).toBe(1);
    });
  });

  describe('3. Cálculo de Pontuação na Classificação (FIVB 3-2-1-0 e WO)', () => {
    it('calcula 3 pontos para vitória limpa e 0 para derrota limpa em melhor de 5 (3x0 e 3x1)', () => {
      expect(CompetitionRulesService.calculateCompetitionPoints(baseIndoorComp, 3, 0)).toBe(3);
      expect(CompetitionRulesService.calculateCompetitionPoints(baseIndoorComp, 3, 1)).toBe(3);
      expect(CompetitionRulesService.calculateCompetitionPoints(baseIndoorComp, 0, 3)).toBe(0);
      expect(CompetitionRulesService.calculateCompetitionPoints(baseIndoorComp, 1, 3)).toBe(0);
    });

    it('calcula 2 pontos para vitória no tiebreak e 1 para derrota no tiebreak (3x2 e 2x3)', () => {
      expect(CompetitionRulesService.calculateCompetitionPoints(baseIndoorComp, 3, 2)).toBe(2);
      expect(CompetitionRulesService.calculateCompetitionPoints(baseIndoorComp, 2, 3)).toBe(1);
    });

    it('calcula pontuação correta para partidas de melhor de 3 (2x0 = 3 pts, 2x1 = 2 pts, 1x2 = 1 pt, 0x2 = 0 pt)', () => {
      expect(CompetitionRulesService.calculateCompetitionPoints(baseIndoorComp, 2, 0)).toBe(3);
      expect(CompetitionRulesService.calculateCompetitionPoints(baseIndoorComp, 2, 1)).toBe(2);
      expect(CompetitionRulesService.calculateCompetitionPoints(baseIndoorComp, 1, 2)).toBe(1);
      expect(CompetitionRulesService.calculateCompetitionPoints(baseIndoorComp, 0, 2)).toBe(0);
    });

    it('atribui 3 pontos para vitória por W.O. e 0 pontos para derrota por W.O.', () => {
      expect(CompetitionRulesService.calculateCompetitionPoints(baseIndoorComp, 2, 0, true)).toBe(3);
      expect(CompetitionRulesService.calculateCompetitionPoints(baseIndoorComp, 0, 2, true)).toBe(0);
    });
  });

  describe('4. Validação Matemática Unificada de Placares', () => {
    it('valida resultado 2x0 válido em partida melhor de 3', () => {
      const sets: SetScoreRecord[] = [
        { setNumber: 1, scoreA: 25, scoreB: 20 },
        { setNumber: 2, scoreA: 25, scoreB: 22 },
      ];
      const res = CompetitionRulesService.validateMatchScore(baseIndoorComp, sets, 'group-stage');
      expect(res.valid).toBe(true);
      expect(res.winner).toBe('A');
      expect(res.scoreA).toBe(2);
      expect(res.scoreB).toBe(0);
    });

    it('valida tiebreak 3x2 em semifinal (melhor de 5) com set de 15 pts', () => {
      const sets: SetScoreRecord[] = [
        { setNumber: 1, scoreA: 25, scoreB: 23 },
        { setNumber: 2, scoreA: 20, scoreB: 25 },
        { setNumber: 3, scoreA: 25, scoreB: 21 },
        { setNumber: 4, scoreA: 22, scoreB: 25 },
        { setNumber: 5, scoreA: 16, scoreB: 14 }, // Tiebreak com vantagem
      ];
      const res = CompetitionRulesService.validateMatchScore(baseIndoorComp, sets, 'semifinal');
      expect(res.valid).toBe(true);
      expect(res.winner).toBe('A');
      expect(res.scoreA).toBe(3);
      expect(res.scoreB).toBe(2);
    });

    it('bloqueia resultado 3x0 em partida de melhor de 3', () => {
      const sets: SetScoreRecord[] = [
        { setNumber: 1, scoreA: 25, scoreB: 20 },
        { setNumber: 2, scoreA: 25, scoreB: 22 },
        { setNumber: 3, scoreA: 25, scoreB: 18 },
      ];
      const res = CompetitionRulesService.validateMatchScore(baseIndoorComp, sets, 'group-stage');
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.includes('A partida já havia sido encerrada'))).toBe(true);
    });

    it('bloqueia sets sem vantagem mínima regulamentar de 2 pontos (ex: 25x24)', () => {
      const sets: SetScoreRecord[] = [
        { setNumber: 1, scoreA: 25, scoreB: 24 },
        { setNumber: 2, scoreA: 25, scoreB: 20 },
      ];
      const res = CompetitionRulesService.validateMatchScore(baseIndoorComp, sets, 'group-stage');
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.includes('vantagem de pelo menos 2 pontos'))).toBe(true);
    });

    it('valida resultado de W.O. estrito', () => {
      const setsWoValid: SetScoreRecord[] = [
        { setNumber: 1, scoreA: 25, scoreB: 0 },
        { setNumber: 2, scoreA: 25, scoreB: 0 },
      ];
      const res = CompetitionRulesService.validateMatchScore(baseIndoorComp, setsWoValid, 'group-stage', true);
      expect(res.valid).toBe(true);
      expect(res.winner).toBe('A');
    });
  });

  describe('5. Congelamento de Regras e Snapshot de Segurança', () => {
    it('indica que regras podem ser editadas quando a competição está em planejamento e sem jogos', () => {
      expect(CompetitionRulesService.areRulesLocked(baseIndoorComp, 0)).toBe(false);
    });

    it('bloqueia alteração de regras assim que houver jogos iniciados/realizados', () => {
      expect(CompetitionRulesService.areRulesLocked(baseIndoorComp, 1)).toBe(true);
    });

    it('bloqueia alteração de regras para status in-progress, playoffs e completed', () => {
      const inProgressComp = { ...baseIndoorComp, status: 'in-progress' as const };
      expect(CompetitionRulesService.areRulesLocked(inProgressComp, 0)).toBe(true);

      const playoffsComp = { ...baseIndoorComp, status: 'playoffs' as const };
      expect(CompetitionRulesService.areRulesLocked(playoffsComp, 0)).toBe(true);

      const completedComp = { ...baseIndoorComp, status: 'completed' as const };
      expect(CompetitionRulesService.areRulesLocked(completedComp, 0)).toBe(true);
    });

    it('dá preferência estrita ao rulesSnapshot congelado mesmo se o config for alterado', () => {
      const compWithSnapshot: CompetitionRecord = {
        ...baseIndoorComp,
        config: {
          ...CompetitionRulesService.getConfig(baseIndoorComp),
          format: {
            ...CompetitionRulesService.getConfig(baseIndoorComp).format,
            defaultSetsToWin: 3, // Alterado acidentalmente para 3
          },
        },
        rulesSnapshot: {
          ...CompetitionRulesService.getConfig(baseIndoorComp),
          format: {
            ...CompetitionRulesService.getConfig(baseIndoorComp).format,
            defaultSetsToWin: 2, // Congelado originalmente em 2
          },
        },
      };

      // Deve ler o rulesSnapshot (2), ignorando o config alterado (3)
      const config = CompetitionRulesService.getConfig(compWithSnapshot);
      expect(config.format.defaultSetsToWin).toBe(2);
    });
  });
});
