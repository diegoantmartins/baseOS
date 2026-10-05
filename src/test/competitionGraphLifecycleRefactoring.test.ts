import { describe, it, expect, beforeEach } from 'vitest';
import type { CompetitionRecord, MatchRecord, StageRecord, TeamRecord } from '@/types/entities';
import { CompetitionRulesService, isSingleStageRoundRobin } from '@/services/competitionRulesService';
import { CompetitionLifecycleService } from '@/services/competitionLifecycleService';
import { computePodium } from '@/services/playoffsService';
import { dataAccess } from '@/services/dataAccess';

describe('Refatoração do Motor de Competições — Graph-Driven Rules & Lifecycle (Tarefas 1 & 2)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const teams: TeamRecord[] = [
    { id: 'team-1', name: 'Sada Cruzeiro', shortName: 'SAD', modality: 'indoor' },
    { id: 'team-2', name: 'Itambé Minas', shortName: 'MIN', modality: 'indoor' },
    { id: 'team-3', name: 'Vôlei Renata', shortName: 'REN', modality: 'indoor' },
    { id: 'team-4', name: 'Suzano Vôlei', shortName: 'SUZ', modality: 'indoor' },
  ];

  function makeMatch(
    id: string,
    compId: string,
    teamAId: string,
    teamBId: string,
    winner: 'A' | 'B',
    phase = 'Rodada Única',
    status: 'homologated' | 'completed' | 'scheduled' | 'in-progress' = 'homologated',
  ): MatchRecord {
    return {
      id,
      competitionId: compId,
      round: 1,
      matchNumber: 1,
      teamAId,
      teamBId,
      teamAName: teamAId,
      teamBName: teamBId,
      teamAShortName: teamAId,
      teamBShortName: teamBId,
      venue: 'Ginásio do Riacho',
      scheduledTime: '2026-10-02T10:00:00Z',
      phase,
      status,
      sets: [
        { setNumber: 1, scoreA: winner === 'A' ? 25 : 20, scoreB: winner === 'B' ? 25 : 20 },
        { setNumber: 2, scoreA: winner === 'A' ? 25 : 22, scoreB: winner === 'B' ? 25 : 22 },
        { setNumber: 3, scoreA: winner === 'A' ? 25 : 18, scoreB: winner === 'B' ? 25 : 18 },
      ],
      winnerId: winner === 'A' ? teamAId : teamBId,
      referees: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  describe('TAREFA 1: CompetitionRulesService (Desacoplamento de Tipos & DAG Metadata)', () => {
    it('deve avaliar Round-Robin estritamente via DAG competition_stages.stage_type sem strings em português', () => {
      const compWithCustomPhases: CompetitionRecord = {
        id: 'comp-dag-1',
        name: 'Liga Aberta Experimental',
        modality: 'indoor',
        format: 'custom-format',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'male',
        status: 'in-progress',
      };

      // Partidas com nomes customizados que poderiam conter palavras aleatórias
      const matches: MatchRecord[] = [
        makeMatch('m1', compWithCustomPhases.id, 'team-1', 'team-2', 'A', 'Confronto Inicial'),
      ];

      // Caso 1: Estágio no banco com stage_type = 'round-robin'
      const roundRobinStage: StageRecord = {
        id: 'stage-row-1',
        competitionId: compWithCustomPhases.id,
        stageId: 'fase-unica',
        name: 'Primeira Etapa',
        stageOrder: 1,
        stageType: 'round-robin',
        status: 'in-progress',
        isLocked: false,
      };

      expect(isSingleStageRoundRobin(compWithCustomPhases, matches, [roundRobinStage])).toBe(true);

      // Caso 2: Se adicionado um segundo estágio do tipo 'knockout', não é mais fase única
      const knockoutStage: StageRecord = {
        id: 'stage-row-2',
        competitionId: compWithCustomPhases.id,
        stageId: 'fase-final',
        name: 'Etapa Decisiva',
        stageOrder: 2,
        stageType: 'knockout',
        status: 'pending',
        isLocked: false,
      };

      expect(isSingleStageRoundRobin(compWithCustomPhases, matches, [roundRobinStage, knockoutStage])).toBe(false);
    });

    it('resolve configuração de sets através do DAG sem depender de match strings', () => {
      const competition: CompetitionRecord = {
        id: 'comp-sets-dag',
        name: 'Superliga Sets Test',
        modality: 'indoor',
        format: 'custom',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'male',
        status: 'in-progress',
        config: {
          version: 1,
          format: {
            formatType: 'custom',
            defaultSetsToWin: 2,
            stages: [
              {
                id: 'stage-super-final',
                order: 1,
                name: 'Fase de Ouro',
                type: 'knockout',
                matchRulesOverride: {
                  setsToWin: 3,
                },
              },
            ],
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
            pointsWoLoss: 0,
            pointsWoWin: 3,
          },
          standings: {
            tiebreakCriteriaOrder: ['points', 'victories'],
            advancingPerGroup: 2,
          },
          registration: {
            minAthletes: 6,
            maxAthletes: 14,
            maxLiberos: 2,
            maxCaptains: 1,
            requireJerseyNumberOnRegistration: false,
          },
        },
      };

      // Resolução com fase correspondente ao nome do estágio do DAG com override
      const formatResolved = CompetitionRulesService.resolveMatchFormat(competition, 'Fase de Ouro');
      expect(formatResolved.setsToWin).toBe(3);
      expect(formatResolved.maxSets).toBe(5);
    });
  });

  describe('TAREFA 2: Ciclo de Vida e Bug do Turno Único (CompetitionLifecycleService)', () => {
    it('encerra torneio de Turno Único para status "completed" assim que 100% dos jogos são homologados', async () => {
      const compRoundRobin: CompetitionRecord = {
        id: 'comp-turno-unico-real',
        name: 'Campeonato Metropolitano - Turno Único',
        modality: 'indoor',
        format: 'round-robin',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'male',
        status: 'in-progress',
      };

      await dataAccess.createCompetition(compRoundRobin);

      // Partidas do turno único (4 equipes, todos contra todos = 6 jogos)
      // Nenhuma partida tem phase === 'final' ou 'terceiro_lugar'
      const matches: MatchRecord[] = [
        makeMatch('m1', compRoundRobin.id, 'team-1', 'team-2', 'A', 'Turno Único'),
        makeMatch('m2', compRoundRobin.id, 'team-1', 'team-3', 'A', 'Turno Único'),
        makeMatch('m3', compRoundRobin.id, 'team-1', 'team-4', 'A', 'Turno Único'),
        makeMatch('m4', compRoundRobin.id, 'team-2', 'team-3', 'A', 'Turno Único'),
        makeMatch('m5', compRoundRobin.id, 'team-2', 'team-4', 'A', 'Turno Único'),
        makeMatch('m6', compRoundRobin.id, 'team-3', 'team-4', 'A', 'Turno Único'),
      ];

      for (const m of matches) {
        await dataAccess.createMatch(m);
      }

      // Executa a sincronização do ciclo de vida após homologação dos jogos
      const syncResult = await CompetitionLifecycleService.syncLifecycleAfterMatchProgression(
        compRoundRobin.id,
        'Operador Teste DAG',
      );

      expect(syncResult.ok).toBe(true);
      expect(syncResult.updated).toBe(true);
      expect(syncResult.competition?.status).toBe('completed');
      expect(syncResult.competition?.championTeamId).toBe('team-1');
      expect(syncResult.competition?.runnerUpTeamId).toBe('team-2');
      expect(syncResult.competition?.thirdPlaceTeamId).toBe('team-3');

      // Verifica persistência no banco / dataAccess
      const reloadedComp = await dataAccess.getCompetition(compRoundRobin.id);
      expect(reloadedComp?.status).toBe('completed');
      expect(reloadedComp?.championTeamId).toBe('team-1');
    });

    it('avança o status das fases individuais (competition_stages.status) no DAG', async () => {
      const compDAG: CompetitionRecord = {
        id: 'comp-dag-stages',
        name: 'Torneio Fase a Fase',
        modality: 'indoor',
        format: 'custom',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'male',
        status: 'in-progress',
      };

      await dataAccess.createCompetition(compDAG);

      const stage1 = await dataAccess.createStage({
        id: 'stage-row-1',
        competitionId: compDAG.id,
        stageId: 'fase-classificatoria',
        name: 'Fase Inicial',
        stageOrder: 1,
        stageType: 'round-robin',
        status: 'pending',
        isLocked: false,
      });

      const match1 = await dataAccess.createMatch(
        makeMatch('match-s1-1', compDAG.id, 'team-1', 'team-2', 'A', 'Fase Inicial', 'in-progress')
      );

      // 1. Ao iniciar jogo, o estágio avança para 'in-progress'
      await CompetitionLifecycleService.syncLifecycleAfterMatchProgression(compDAG.id, 'Operador');
      const stagesAfterStart = await dataAccess.listStages(compDAG.id);
      expect(stagesAfterStart.find(s => s.id === stage1.id)?.status).toBe('in-progress');

      // 2. Ao homologar todos os jogos do estágio, o estágio avança para 'completed'
      await dataAccess.updateMatch(match1.id, { status: 'homologated' });
      await CompetitionLifecycleService.syncLifecycleAfterMatchProgression(compDAG.id, 'Operador');
      const stagesAfterEnd = await dataAccess.listStages(compDAG.id);
      expect(stagesAfterEnd.find(s => s.id === stage1.id)?.status).toBe('completed');

      // Como todos os estágios do grafo foram concluídos e 100% dos jogos homologados, a competição completa
      const finishedComp = await dataAccess.getCompetition(compDAG.id);
      expect(finishedComp?.status).toBe('completed');
    });

    it('computePodium calcula o pódio oficial por Standings mesmo sem match com phase === "final"', () => {
      const comp: CompetitionRecord = {
        id: 'comp-no-final-string',
        name: 'Liga sem Final Literal',
        modality: 'indoor',
        format: 'round-robin',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'male',
        status: 'in-progress',
      };

      const matches: MatchRecord[] = [
        makeMatch('m1', comp.id, 'team-1', 'team-2', 'A', 'Chave A'),
        makeMatch('m2', comp.id, 'team-1', 'team-3', 'A', 'Chave A'),
        makeMatch('m3', comp.id, 'team-2', 'team-3', 'A', 'Chave A'),
      ];

      const podium = computePodium(matches, comp);
      expect(podium.championTeamId).toBe('team-1');
      expect(podium.runnerUpTeamId).toBe('team-2');
      expect(podium.thirdPlaceTeamId).toBe('team-3');
    });
  });
});
