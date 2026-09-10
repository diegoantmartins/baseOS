import { describe, it, expect } from 'vitest';
import { ScoringEngine } from '@/services/scoringEngine';
import { CompetitionRulesService } from '@/services/competitionRulesService';
import {
  computeStandings,
  competitionPointsFromSets,
} from '@/services/standingsService';
import {
  DEFAULT_INDOOR_COMPETITION_CONFIG,
  DEFAULT_BEACH_COMPETITION_CONFIG,
  type CanonicalMatchResult,
  type CompetitionConfig,
  type ScoringSystemConfig,
} from '@/types/competitionConfig';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';

describe('Fase 5.2 — Auditoria + Unificação da Pontuação da Classificação', () => {
  const teamA: TeamRecord = { id: 'team-a', name: 'Alpha Team', shortName: 'ALP', modality: 'indoor' };
  const teamB: TeamRecord = { id: 'team-b', name: 'Beta Team', shortName: 'BET', modality: 'indoor' };

  const createTestMatch = (
    overrides: Partial<MatchRecord> & Pick<MatchRecord, 'id' | 'competitionId' | 'teamAId' | 'teamBId' | 'sets'>,
  ): MatchRecord => ({
    id: overrides.id,
    competitionId: overrides.competitionId,
    round: overrides.round ?? 1,
    matchNumber: overrides.matchNumber ?? 1,
    teamAId: overrides.teamAId,
    teamBId: overrides.teamBId,
    teamAName: overrides.teamAName ?? 'Alpha Team',
    teamBName: overrides.teamBName ?? 'Beta Team',
    teamAShortName: overrides.teamAShortName ?? 'ALP',
    teamBShortName: overrides.teamBShortName ?? 'BET',
    venue: overrides.venue ?? 'Ginásio Central',
    court: overrides.court ?? 'Quadra 1',
    scheduledTime: overrides.scheduledTime ?? '2026-09-01T10:00:00Z',
    status: overrides.status ?? 'completed',
    sets: overrides.sets,
    referees: overrides.referees ?? [],
    createdAt: overrides.createdAt ?? '2026-09-01T00:00:00Z',
    updatedAt: overrides.updatedAt ?? '2026-09-01T00:00:00Z',
    ...overrides,
  });

  // ==========================================================================
  // 1. TESTE DE PROVA DA AUTORIDADE (DIVERGÊNCIA PROPOSAL)
  // ==========================================================================
  describe('1. Teste de Prova da Autoridade (Divergência Proposital)', () => {
    /**
     * Demonstra de forma inequívoca que a pontuação na tabela de classificação respeita
     * a configuração canônica da competição, e não premissas hardcoded externas.
     *
     * Cenário:
     * - Regulamento Amador: 2 pts por vitória limpa/apertada, 1 pt por derrota jogada (inclusive 0x3).
     * - Padrão Indoor FIVB: 3 pts vitória limpa, 0 pts derrota limpa.
     *
     * A partida termina em 3x0 para Team A.
     * Sob a regra canônica amadora da competição, Team B (derrotado) DEVE receber 1 ponto.
     * Sob a regra padrão, receberia 0 pontos.
     */
    it('prova que a classificação computa a regra canônica configurada na competição e não o padrão externo', () => {
      const amateurScoringConfig: ScoringSystemConfig = {
        systemType: 'simple',
        pointsWinClear: 2,
        pointsWinNarrow: 2,
        pointsLossNarrow: 1,
        pointsLossClear: 1, // Torneio amador de incentivo: derrota jogada pontua 1
        pointsWoWin: 2,
        pointsWoLoss: 0,
      };

      const amateurComp: CompetitionRecord = {
        id: 'comp-amateur-52',
        name: 'Torneio Amador Municipal 2026',
        modality: 'indoor',
        format: 'groups',
        playerFormat: '6x6',
        setFormat: '5-sets',
        genderCategory: 'male',
        status: 'in-progress',
        config: {
          ...DEFAULT_INDOOR_COMPETITION_CONFIG,
          scoring: amateurScoringConfig,
        },
      };

      const match3x0 = createTestMatch({
        id: 'm-amat-1',
        competitionId: amateurComp.id,
        teamAId: teamA.id,
        teamBId: teamB.id,
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 18 },
          { setNumber: 2, scoreA: 25, scoreB: 20 },
          { setNumber: 3, scoreA: 25, scoreB: 19 },
        ],
      });

      const standings = computeStandings(
        [
          { team: teamA, groupName: 'Grupo Único' },
          { team: teamB, groupName: 'Grupo Único' },
        ],
        [match3x0],
        { competition: amateurComp },
      );

      const standingA = standings.find((s) => s.teamId === teamA.id)!;
      const standingB = standings.find((s) => s.teamId === teamB.id)!;

      // Equipe A: venceu 3x0 -> 2 pontos (regra amadora), e não 3 pontos
      expect(standingA.competitionPoints).toBe(amateurScoringConfig.pointsWinClear);
      expect(standingA.competitionPoints).toBe(2);

      // Equipe B: perdeu 0x3 -> 1 ponto (regra amadora), e não 0 pontos
      expect(standingB.competitionPoints).toBe(amateurScoringConfig.pointsLossClear);
      expect(standingB.competitionPoints).toBe(1);
    });
  });

  // ==========================================================================
  // 2. CONFIGURAÇÃO PADRÃO INDOOR DO BASEOS
  // ==========================================================================
  describe('2. Configuração Padrão Indoor do BaseOS', () => {
    const defaultIndoorComp: CompetitionRecord = {
      id: 'comp-default-indoor',
      name: 'Liga Indoor Padrão',
      modality: 'indoor',
      format: 'groups',
      playerFormat: '6x6',
      setFormat: '5-sets',
      genderCategory: 'male',
      status: 'in-progress',
      config: DEFAULT_INDOOR_COMPETITION_CONFIG,
    };

    const cfg = DEFAULT_INDOOR_COMPETITION_CONFIG.scoring;

    it('atribui pontuação correta lida dinamicamente da configuração padrão indoor em 5 sets', () => {
      // 3x0 limpo
      expect(CompetitionRulesService.calculateCompetitionPoints(defaultIndoorComp, 3, 0)).toBe(cfg.pointsWinClear);
      expect(CompetitionRulesService.calculateCompetitionPoints(defaultIndoorComp, 0, 3)).toBe(cfg.pointsLossClear);

      // 3x1 limpo
      expect(CompetitionRulesService.calculateCompetitionPoints(defaultIndoorComp, 3, 1)).toBe(cfg.pointsWinClear);
      expect(CompetitionRulesService.calculateCompetitionPoints(defaultIndoorComp, 1, 3)).toBe(cfg.pointsLossClear);

      // 3x2 tiebreak
      expect(CompetitionRulesService.calculateCompetitionPoints(defaultIndoorComp, 3, 2)).toBe(cfg.pointsWinNarrow);
      expect(CompetitionRulesService.calculateCompetitionPoints(defaultIndoorComp, 2, 3)).toBe(cfg.pointsLossNarrow);
    });

    it('atribui pontuação correta lida dinamicamente da configuração padrão indoor em 3 sets', () => {
      // 2x0 limpo
      expect(CompetitionRulesService.calculateCompetitionPoints(defaultIndoorComp, 2, 0)).toBe(cfg.pointsWinClear);
      expect(CompetitionRulesService.calculateCompetitionPoints(defaultIndoorComp, 0, 2)).toBe(cfg.pointsLossClear);

      // 2x1 tiebreak
      expect(CompetitionRulesService.calculateCompetitionPoints(defaultIndoorComp, 2, 1)).toBe(cfg.pointsWinNarrow);
      expect(CompetitionRulesService.calculateCompetitionPoints(defaultIndoorComp, 1, 2)).toBe(cfg.pointsLossNarrow);
    });
  });

  // ==========================================================================
  // 3. TESTE EXPLÍCITO DO FORMATO DE 1 SET (DIV-02: PROTEÇÃO CONTRA REGRESSÃO)
  // ==========================================================================
  describe('3. Teste Explícito do Formato de 1 Set (setsToWin = 1, maxSets = 1)', () => {
    const singleSetComp: CompetitionRecord = {
      id: 'comp-1set-52',
      name: 'Festival de Set Único',
      modality: 'indoor',
      format: 'groups',
      playerFormat: '6x6',
      setFormat: '1-set',
      genderCategory: 'male',
      status: 'in-progress',
      config: {
        ...DEFAULT_INDOOR_COMPETITION_CONFIG,
        format: {
          defaultSetsToWin: 1,
          setRules: { regularSetPoints: 25, tiebreakPoints: 15, minAdvantage: 2 },
        },
      },
    };

    const cfg = singleSetComp.config!.scoring;

    it('em 1x0, aplica vitória limpa (pointsWinClear) e NÃO pode aplicar vitória apertada (pointsWinNarrow)', () => {
      const winnerPoints = CompetitionRulesService.calculateCompetitionPoints(singleSetComp, 1, 0);
      expect(winnerPoints).toBe(cfg.pointsWinClear);
      expect(winnerPoints).not.toBe(cfg.pointsWinNarrow);

      // Verificação direta no ScoringEngine
      const engineWinnerPoints = ScoringEngine.calculateTeamPoints(1, 0, false, cfg);
      expect(engineWinnerPoints).toBe(cfg.pointsWinClear);
      expect(engineWinnerPoints).not.toBe(cfg.pointsWinNarrow);
    });

    it('em 0x1, aplica derrota limpa (pointsLossClear) e NÃO pode aplicar derrota apertada (pointsLossNarrow)', () => {
      const loserPoints = CompetitionRulesService.calculateCompetitionPoints(singleSetComp, 0, 1);
      expect(loserPoints).toBe(cfg.pointsLossClear);
      expect(loserPoints).not.toBe(cfg.pointsLossNarrow);

      // Verificação direta no ScoringEngine
      const engineLoserPoints = ScoringEngine.calculateTeamPoints(0, 1, false, cfg);
      expect(engineLoserPoints).toBe(cfg.pointsLossClear);
      expect(engineLoserPoints).not.toBe(cfg.pointsLossNarrow);
    });

    it('computa a classificação oficial de partida de 1 set sem conceder ponto indevido ao derrotado', () => {
      const match1x0 = createTestMatch({
        id: 'm-1set-1',
        competitionId: singleSetComp.id,
        teamAId: teamA.id,
        teamBId: teamB.id,
        sets: [{ setNumber: 1, scoreA: 25, scoreB: 20 }],
      });

      const standings = computeStandings(
        [
          { team: teamA, groupName: 'Grupo 1' },
          { team: teamB, groupName: 'Grupo 1' },
        ],
        [match1x0],
        { competition: singleSetComp },
      );

      const standingA = standings.find((s) => s.teamId === teamA.id)!;
      const standingB = standings.find((s) => s.teamId === teamB.id)!;

      // Vencedor 1x0 ganha 3 pontos
      expect(standingA.competitionPoints).toBe(3);
      // Perdedor 0x1 com 0 sets ganha 0 pontos (jamais 1 ponto de tiebreak)
      expect(standingB.competitionPoints).toBe(0);
    });
  });

  // ==========================================================================
  // 4. CIRCUITO BLINDADO DE RULESSNAPSHOT
  // ==========================================================================
  describe('4. Circuito Blindado de rulesSnapshot', () => {
    it('comprova que o cálculo utiliza a pontuação do snapshot congelado e não o config mutado', () => {
      const frozenScoring: ScoringSystemConfig = {
        systemType: 'win-loss',
        pointsWinClear: 1,
        pointsWinNarrow: 1,
        pointsLossNarrow: 0,
        pointsLossClear: 0,
        pointsWoWin: 1,
        pointsWoLoss: 0,
      };

      const mutatedScoring: ScoringSystemConfig = {
        systemType: 'fivb-standard',
        pointsWinClear: 3,
        pointsWinNarrow: 2,
        pointsLossNarrow: 1,
        pointsLossClear: 0,
        pointsWoWin: 3,
        pointsWoLoss: 0,
      };

      const snapshotComp: CompetitionRecord = {
        id: 'comp-snapshot-52',
        name: 'Competição com Snapshot Congelado',
        modality: 'indoor',
        format: 'groups',
        playerFormat: '6x6',
        setFormat: '5-sets',
        genderCategory: 'male',
        status: 'in-progress',
        config: {
          ...DEFAULT_INDOOR_COMPETITION_CONFIG,
          scoring: mutatedScoring, // Config mutado após início
        },
        rulesSnapshot: {
          ...DEFAULT_INDOOR_COMPETITION_CONFIG,
          scoring: frozenScoring, // Snapshot original congelado
        },
      };

      // O getConfig DEVE resolver o snapshot
      const resolvedConfig = CompetitionRulesService.getConfig(snapshotComp);
      expect(resolvedConfig.scoring.systemType).toBe('win-loss');
      expect(resolvedConfig.scoring.pointsWinClear).toBe(1);

      // O cálculo de pontos deve seguir o snapshot congelado (1 ponto por vitória)
      const pointsWon = CompetitionRulesService.calculateCompetitionPoints(snapshotComp, 3, 0);
      expect(pointsWon).toBe(1);
      expect(pointsWon).not.toBe(3);
    });
  });

  // ==========================================================================
  // 5. REGRA CUSTOMIZADA DO REGULAMENTO
  // ==========================================================================
  describe('5. Regra Customizada do Regulamento', () => {
    it('aplica pontuação com valores customizados arbitrários suportados pelo ScoringSystemConfig', () => {
      const customScoring: ScoringSystemConfig = {
        systemType: 'custom',
        pointsWinClear: 4,
        pointsWinNarrow: 3,
        pointsLossNarrow: 2,
        pointsLossClear: 1,
        pointsWoWin: 4,
        pointsWoLoss: 0,
      };

      const customComp: CompetitionRecord = {
        id: 'comp-custom-52',
        name: 'Liga Customizada 4-3-2-1',
        modality: 'indoor',
        format: 'groups',
        playerFormat: '6x6',
        setFormat: '5-sets',
        genderCategory: 'male',
        status: 'in-progress',
        config: {
          ...DEFAULT_INDOOR_COMPETITION_CONFIG,
          scoring: customScoring,
        },
      };

      expect(CompetitionRulesService.calculateCompetitionPoints(customComp, 3, 0)).toBe(4);
      expect(CompetitionRulesService.calculateCompetitionPoints(customComp, 3, 2)).toBe(3);
      expect(CompetitionRulesService.calculateCompetitionPoints(customComp, 2, 3)).toBe(2);
      expect(CompetitionRulesService.calculateCompetitionPoints(customComp, 0, 3)).toBe(1);
    });
  });

  // ==========================================================================
  // 6. REGRA DE W.O. (WALKOVER)
  // ==========================================================================
  describe('6. Regra de W.O. (Walkover)', () => {
    const comp: CompetitionRecord = {
      id: 'comp-wo-52',
      name: 'Competição com W.O.',
      modality: 'indoor',
      format: 'groups',
      playerFormat: '6x6',
      setFormat: '5-sets',
      genderCategory: 'male',
      status: 'in-progress',
      config: DEFAULT_INDOOR_COMPETITION_CONFIG,
    };

    const cfg = DEFAULT_INDOOR_COMPETITION_CONFIG.scoring;

    it('atribui pointsWoWin ao vencedor e pointsWoLoss ao perdedor de W.O.', () => {
      expect(CompetitionRulesService.calculateCompetitionPoints(comp, 3, 0, true)).toBe(cfg.pointsWoWin);
      expect(CompetitionRulesService.calculateCompetitionPoints(comp, 0, 3, true)).toBe(cfg.pointsWoLoss);
    });

    it('ScoringEngine atribui pointsWoWin e pointsWoLoss em CanonicalMatchResult com isWo', () => {
      const canonicalWo: CanonicalMatchResult = {
        isValid: true,
        status: 'completed',
        winnerId: teamA.id,
        loserId: teamB.id,
        winnerSide: 'A',
        setsWonA: 3,
        setsWonB: 0,
        pointsScoredA: 75,
        pointsScoredB: 0,
        setScores: [],
        isWo: true,
        isCompleted: true,
        isHomologated: true,
        isInconsistent: false,
      };

      const res = ScoringEngine.calculatePoints(canonicalWo, cfg);
      expect(res.isWo).toBe(true);
      expect(res.pointsA).toBe(cfg.pointsWoWin);
      expect(res.pointsB).toBe(cfg.pointsWoLoss);
      expect(res.winnerPoints).toBe(cfg.pointsWoWin);
      expect(res.loserPoints).toBe(cfg.pointsWoLoss);
    });
  });

  // ==========================================================================
  // 7. FALLBACK DEFENSIVO E GUARDA DE ESTADOS INCOMPLETOS
  // ==========================================================================
  describe('7. Fallback Defensivo e Guarda de Estados Incompletos', () => {
    it('competitionPointsFromSets sem competition aplica fallback normalizado para indoor', () => {
      expect(competitionPointsFromSets(3, 0)).toBe(3);
      expect(competitionPointsFromSets(3, 2)).toBe(2);
      expect(competitionPointsFromSets(2, 3)).toBe(1);
      expect(competitionPointsFromSets(0, 3)).toBe(0);
      expect(competitionPointsFromSets(3, 0, true)).toBe(3);
      expect(competitionPointsFromSets(0, 3, true)).toBe(0);
    });

    it('setsWon === setsLost representa estado incompleto ou inválido e retorna 0 defensivamente', () => {
      const cfg = DEFAULT_INDOOR_COMPETITION_CONFIG.scoring;
      // Voleibol não possui empate. Placar igual é estado incompleto ou inválido:
      expect(ScoringEngine.calculateTeamPoints(1, 1, false, cfg)).toBe(0);
      expect(ScoringEngine.calculateTeamPoints(2, 2, false, cfg)).toBe(0);
      expect(ScoringEngine.calculateTeamPoints(0, 0, false, cfg)).toBe(0);
    });
  });

  // ==========================================================================
  // 8. VÔLEI DE PRAIA (MODALITY = BEACH)
  // ==========================================================================
  describe('8. Vôlei de Praia (modality = beach)', () => {
    it('propaga contexto de praia e calcula pontuação normalmente', () => {
      const beachComp: CompetitionRecord = {
        id: 'comp-beach-52',
        name: 'Circuito de Praia 2026',
        modality: 'beach',
        format: 'groups',
        playerFormat: '2x2',
        setFormat: '3-sets',
        genderCategory: 'male',
        status: 'in-progress',
        config: DEFAULT_BEACH_COMPETITION_CONFIG,
      };

      const cfg = DEFAULT_BEACH_COMPETITION_CONFIG.scoring;

      // Praia: melhor de 3 sets (parciais de 21 pontos)
      // 2x0 -> vitória limpa
      expect(CompetitionRulesService.calculateCompetitionPoints(beachComp, 2, 0)).toBe(cfg.pointsWinClear);
      expect(CompetitionRulesService.calculateCompetitionPoints(beachComp, 0, 2)).toBe(cfg.pointsLossClear);

      // 2x1 -> vitória apertada
      expect(CompetitionRulesService.calculateCompetitionPoints(beachComp, 2, 1)).toBe(cfg.pointsWinNarrow);
      expect(CompetitionRulesService.calculateCompetitionPoints(beachComp, 1, 2)).toBe(cfg.pointsLossNarrow);
    });
  });

  // ==========================================================================
  // 9. TESTE DE EQUIVALÊNCIA DE RESULTADO ENTRE APIS
  // ==========================================================================
  describe('9. Teste de Equivalência de Resultado entre APIs', () => {
    /**
     * Demonstra que CompetitionRulesService.calculateCompetitionPoints produz
     * exatamente o mesmo valor correspondente ao lado da equipe apurado por
     * ScoringEngine.calculatePoints(canonical, config.scoring).
     */
    it('produz resultado idêntico entre CompetitionRulesService e ScoringEngine para todos os cenários', () => {
      const comp: CompetitionRecord = {
        id: 'comp-equiv-52',
        name: 'Liga de Equivalência',
        modality: 'indoor',
        format: 'groups',
        playerFormat: '6x6',
        setFormat: '5-sets',
        genderCategory: 'male',
        status: 'in-progress',
        config: DEFAULT_INDOOR_COMPETITION_CONFIG,
      };

      const scenarios: Array<{ setsA: number; setsB: number; isWo: boolean; desc: string }> = [
        { setsA: 3, setsB: 0, isWo: false, desc: '3x0' },
        { setsA: 3, setsB: 1, isWo: false, desc: '3x1' },
        { setsA: 3, setsB: 2, isWo: false, desc: '3x2' },
        { setsA: 2, setsB: 3, isWo: false, desc: '2x3' },
        { setsA: 1, setsB: 3, isWo: false, desc: '1x3' },
        { setsA: 0, setsB: 3, isWo: false, desc: '0x3' },
        { setsA: 2, setsB: 0, isWo: false, desc: '2x0' },
        { setsA: 2, setsB: 1, isWo: false, desc: '2x1' },
        { setsA: 1, setsB: 2, isWo: false, desc: '1x2' },
        { setsA: 0, setsB: 2, isWo: false, desc: '0x2' },
        { setsA: 1, setsB: 0, isWo: false, desc: '1x0' },
        { setsA: 0, setsB: 1, isWo: false, desc: '0x1' },
        { setsA: 3, setsB: 0, isWo: true, desc: 'W.O. A vence' },
        { setsA: 0, setsB: 3, isWo: true, desc: 'W.O. B vence' },
      ];

      for (const sc of scenarios) {
        const canonical: CanonicalMatchResult = {
          isValid: true,
          status: 'completed',
          winnerId: sc.setsA > sc.setsB ? teamA.id : teamB.id,
          loserId: sc.setsA > sc.setsB ? teamB.id : teamA.id,
          winnerSide: sc.setsA > sc.setsB ? 'A' : 'B',
          setsWonA: sc.setsA,
          setsWonB: sc.setsB,
          pointsScoredA: sc.setsA * 25,
          pointsScoredB: sc.setsB * 20,
          setScores: [],
          isWo: sc.isWo,
          isCompleted: true,
          isHomologated: true,
          isInconsistent: false,
        };

        const engineResult = ScoringEngine.calculatePoints(canonical, comp.config!.scoring);
        const rulesPointsA = CompetitionRulesService.calculateCompetitionPoints(comp, sc.setsA, sc.setsB, sc.isWo);
        const rulesPointsB = CompetitionRulesService.calculateCompetitionPoints(comp, sc.setsB, sc.setsA, sc.isWo);

        expect(rulesPointsA, `Cenário ${sc.desc} - Time A`).toBe(engineResult.pointsA);
        expect(rulesPointsB, `Cenário ${sc.desc} - Time B`).toBe(engineResult.pointsB);

        // Também valida o método de conveniência calculateMatchPoints
        const matchPointsResult = CompetitionRulesService.calculateMatchPoints(comp, canonical);
        expect(matchPointsResult.pointsA, `calculateMatchPoints ${sc.desc} - Time A`).toBe(engineResult.pointsA);
        expect(matchPointsResult.pointsB, `calculateMatchPoints ${sc.desc} - Time B`).toBe(engineResult.pointsB);
      }
    });
  });
});
