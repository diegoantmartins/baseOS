import { describe, it, expect } from 'vitest';
import { CompetitionLifecycleService } from '@/services/competitionLifecycleService';
import { CompetitionRulesService } from '@/services/competitionRulesService';
import { accumulateStats, computeStandings } from '@/services/standingsService';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';

describe('Fase 4.4 — Teste de Integração de Ciclo de Vida e Integridade Temporal', () => {
  it('executa o fluxo completo de ponta a ponta com congelamento e integridade histórica', () => {
    // 1. Criar competição em planejamento (planning)
    const initialComp: CompetitionRecord = {
      id: 'comp-integration-1',
      name: 'Torneio Integração 2026',
      modality: 'indoor',
      format: 'groups',
      playerFormat: '6x6',
      setFormat: '3-sets',
      genderCategory: 'male',
      status: 'planning',
      groupsCount: 1,
      advancingPerGroup: 2,
    };

    const teams: TeamRecord[] = [
      { id: 't-1', name: 'Alpha', shortName: 'ALP', modality: 'indoor', status: 'confirmed' },
      { id: 't-2', name: 'Beta', shortName: 'BET', modality: 'indoor', status: 'confirmed' },
    ];

    // 2. Configurar regras antes do início (PERMITIDO)
    expect(CompetitionLifecycleService.canEditRules(initialComp, 0)).toBe(true);

    const configuredComp: CompetitionRecord = {
      ...initialComp,
      config: {
        version: 1,
        format: {
          defaultSetsToWin: 2,
          setRules: { regularSetPoints: 25, tiebreakPoints: 15, minAdvantage: 2 },
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
          tiebreakCriteriaOrder: ['points', 'head-to-head', 'set-average', 'points-average'],
          advancingPerGroup: 2,
        },
        registration: {
          minAthletes: 6,
          maxAthletes: 14,
          maxCaptains: 1,
          maxLiberos: 2,
          requireJerseyNumberOnRegistration: false,
        },
      },
    };

    // 3. Iniciar competição e congelar regras esportivas (rulesSnapshot)
    expect(CompetitionLifecycleService.canCreateMatch(configuredComp)).toBe(true);

    const activeComp: CompetitionRecord = {
      ...configuredComp,
      status: 'in-progress',
    };

    const frozenComp = CompetitionLifecycleService.freezeRulesSnapshot(activeComp);
    expect(frozenComp.rulesSnapshot).toBeDefined();
    expect(frozenComp.rulesSnapshot?.format.defaultSetsToWin).toBe(2);

    // 4. Tentar alterar regras esportivas após o início (BLOQUEADO)
    expect(CompetitionLifecycleService.canEditRules(frozenComp, 0)).toBe(false);

    // 5. Se config externa for modificada indevidamente, o motor prioriza o rulesSnapshot
    const mutatedComp: CompetitionRecord = {
      ...frozenComp,
      config: {
        ...frozenComp.config!,
        format: {
          defaultSetsToWin: 3, // Tentativa de adulteração pós-início
          setRules: { regularSetPoints: 21, tiebreakPoints: 11, minAdvantage: 2 },
        },
      },
    };

    const effectiveConfig = CompetitionRulesService.getConfig(mutatedComp);
    expect(effectiveConfig.format.defaultSetsToWin).toBe(2); // Mantém os 2 sets do snapshot!
    expect(effectiveConfig.format.setRules.regularSetPoints).toBe(25);

    // 6. Criar e registrar partida oficial
    const match: MatchRecord = {
      id: 'match-1',
      competitionId: frozenComp.id,
      round: 1,
      matchNumber: 1,
      teamAId: 't-1',
      teamBId: 't-2',
      teamAName: 'Alpha',
      teamBName: 'Beta',
      teamAShortName: 'ALP',
      teamBShortName: 'BET',
      venue: 'Ginásio Central',
      court: '1',
      scheduledTime: '2026-09-03T18:00:00Z',
      status: 'scheduled',
      sets: [],
      referees: [],
      createdAt: '2026-09-03T00:00:00Z',
      updatedAt: '2026-09-03T00:00:00Z',
    };

    expect(CompetitionLifecycleService.canRecordResult(frozenComp, match)).toBe(true);

    // 7. Lançar resultado válido e verificar apuração
    const sets = [
      { setNumber: 1, scoreA: 25, scoreB: 20 },
      { setNumber: 2, scoreA: 25, scoreB: 22 },
    ];

    const validation = CompetitionRulesService.validateMatchScore(frozenComp, sets);
    expect(validation.valid).toBe(true);
    expect(validation.winner).toBe('A');

    const completedMatch: MatchRecord = {
      ...match,
      sets,
      winnerId: 't-1',
      status: 'completed',
    };

    // 8. Classificação atualizada conforme regras congeladas
    const statsA = accumulateStats([completedMatch], 't-1', false, frozenComp);
    const statsB = accumulateStats([completedMatch], 't-2', false, frozenComp);
    expect(statsA.competitionPoints).toBe(3); // 2x0 claro = 3 pontos
    expect(statsB.competitionPoints).toBe(0);

    const standings = computeStandings([{ team: teams[0] }, { team: teams[1] }], [completedMatch], {
      competition: frozenComp,
    });
    expect(standings[0].teamId).toBe('t-1');
    expect(standings[0].competitionPoints).toBe(3);

    // 9. Encerrar competição (completed)
    const finishedComp: CompetitionRecord = {
      ...frozenComp,
      status: 'completed',
      championTeamId: 't-1',
      runnerUpTeamId: 't-2',
    };

    // 10. Garantir bloqueio total em competição encerrada
    expect(CompetitionLifecycleService.canEditCompetition(finishedComp)).toBe(false);
    expect(CompetitionLifecycleService.canEditRules(finishedComp, [completedMatch])).toBe(false);
    expect(CompetitionLifecycleService.canCreateMatch(finishedComp)).toBe(false);
    expect(CompetitionLifecycleService.canRecordResult(finishedComp, completedMatch)).toBe(false);

    // Integridade histórica intacta
    const finalConfig = CompetitionRulesService.getConfig(finishedComp);
    expect(finalConfig.format.defaultSetsToWin).toBe(2);
    expect(finalConfig.format.setRules.regularSetPoints).toBe(25);
  });
});
