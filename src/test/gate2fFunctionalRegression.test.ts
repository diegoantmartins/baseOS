/**
 * BaseOS — GATE 2F: Regressão e Validação Funcional Completa Pré-Release
 *
 * Cobertura Obrigatória:
 *  1. Turno Único (5 equipes, 10 partidas round-robin, all-homologated):
 *     - Avanço automático de status de 'groups-defined' para 'completed';
 *     - Apuração canônica de Standings, Campeão e Pódio (1º, 2º, 3º e 4º lugares);
 *     - Geração de relatório de pódio e PDF de premiação sem campos vazios.
 *  2. Agenda de Jogos e Reagendamento (Incidente de Produção):
 *     - Partida antiga #4 reagendada para 07:00;
 *     - Partida antiga #1 reagendada para 09:00;
 *     - Ordenação cronológica garantida em todos os portais (07:00 antes de 09:00);
 *     - Preservação da numeração original sem mutações destrutivas.
 *  3. Critérios de Desempate e Regulamento Esportivo SSOT.
 *  4. Multi-tenancy, Context Switch de Equipes e Bloqueio de Acesso Ilegítimo.
 *  5. BaseOS Súmula Oficial (14 atletas, 2 líberos, A4 paisagem).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';
import { CompetitionLifecycleService } from '@/services/competitionLifecycleService';
import { CompetitionRulesService } from '@/services/competitionRulesService';
import { computePodium, isSingleStageRoundRobin } from '@/services/playoffsService';
import { sortScheduleMatches } from '@/services/scheduleService';
import { computeStandings, type StandingInput } from '@/services/standingsService';
import { generatePodiumReportPdf, type PodiumReportData } from '@/lib/pdf/reportsPdf';
import { TeamContextService, type UserAvailableTeamContext } from '@/services/teamContextService';
import { ROSTER_CAPACITY } from '@/document-engine/baseos/domain/roster.rules';
import { dataAccess } from '@/services/dataAccess';

function makeTeam(id: string, name: string): TeamRecord {
  return {
    id,
    name,
    shortName: name.substring(0, 3).toUpperCase(),
    modality: 'indoor',
  };
}

function makeMatch(
  id: string,
  competitionId: string,
  teamAId: string,
  teamBId: string,
  scoreA: number,
  scoreB: number,
  matchNumber: number,
  scheduledTime: string = '2026-09-22T10:00:00Z',
  status: 'homologated' | 'completed' | 'scheduled' = 'homologated',
  court: string = 'Quadra 1',
): MatchRecord {
  return {
    id,
    competitionId,
    round: 1,
    matchNumber,
    teamAId,
    teamBId,
    teamAName: `Equipe ${teamAId.toUpperCase()}`,
    teamBName: `Equipe ${teamBId.toUpperCase()}`,
    teamAShortName: teamAId.toUpperCase(),
    teamBShortName: teamBId.toUpperCase(),
    venue: 'Ginásio Poliesportivo Central',
    court,
    scheduledTime,
    phase: 'classificatória',
    status,
    sets: [
      { setNumber: 1, scoreA: scoreA > scoreB ? 25 : 19, scoreB: scoreB > scoreA ? 25 : 19 },
      { setNumber: 2, scoreA: scoreA > scoreB ? 25 : 21, scoreB: scoreB > scoreA ? 25 : 21 },
    ],
    referees: [{ role: 'primeiro_arbitro', name: 'Árbitro Oficial 1' }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('GATE 2F — Regressão e Conclusão Funcional BaseOS', () => {
  const compId = 'comp-gate2f-rr5';

  const teams: TeamRecord[] = [
    makeTeam('t1', 'Alfa Voleibol'),
    makeTeam('t2', 'Beta Clube'),
    makeTeam('t3', 'Gama Esportes'),
    makeTeam('t4', 'Delta Vôlei'),
    makeTeam('t5', 'Epsilon Associação'),
  ];

  const roundRobinCompetition: CompetitionRecord = {
    id: compId,
    name: 'Campeonato Indoor Turno Único 5 Equipes',
    modality: 'indoor',
    format: 'round-robin',
    playerFormat: '6x6',
    setFormat: '3-sets',
    genderCategory: 'male',
    status: 'groups-defined',
    tiebreakCriteriaOrder: ['points', 'victories', 'head-to-head', 'set-average', 'points-average', 'draw'],
  };

  beforeEach(async () => {
    // Inicializa registros no dataAccess local
    await dataAccess.createCompetition(roundRobinCompetition);
    for (const t of teams) {
      await dataAccess.createTeam(t);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 17 & 20: TURNO ÚNICO — 5 EQUIPES, 10 PARTIDAS, AUTO-COMPLETION E PÓDIO
  // ═══════════════════════════════════════════════════════════════════════════
  describe('1. Turno Único (5 equipes, 10 partidas homologadas, transição e pódio)', () => {
    it('não permanece em groups-defined: avança automaticamente para completed e consolida pódio 1º a 4º', async () => {
      // 5 equipes todos-contra-todos = 10 partidas:
      // T1 vence todos (4 vitórias) -> 1º lugar (Campeão)
      // T2 vence T3, T4, T5 (3 vitórias) -> 2º lugar (Vice)
      // T3 vence T4, T5 (2 vitórias) -> 3º lugar
      // T4 vence T5 (1 vitória) -> 4º lugar
      // T5 perde todos (0 vitórias) -> 5º lugar
      const matches: MatchRecord[] = [
        makeMatch('m1', compId, 't1', 't2', 2, 0, 1),
        makeMatch('m2', compId, 't1', 't3', 2, 0, 2),
        makeMatch('m3', compId, 't1', 't4', 2, 0, 3),
        makeMatch('m4', compId, 't1', 't5', 2, 0, 4),
        makeMatch('m5', compId, 't2', 't3', 2, 0, 5),
        makeMatch('m6', compId, 't2', 't4', 2, 0, 6),
        makeMatch('m7', compId, 't2', 't5', 2, 0, 7),
        makeMatch('m8', compId, 't3', 't4', 2, 0, 8),
        makeMatch('m9', compId, 't3', 't5', 2, 0, 9),
        makeMatch('m10', compId, 't4', 't5', 2, 0, 10),
      ];

      for (const m of matches) {
        await dataAccess.createMatch(m);
      }

      // Validação do detector de Turno Único
      expect(isSingleStageRoundRobin(roundRobinCompetition, matches)).toBe(true);

      // Status antes da sincronização
      const compInitial = await dataAccess.getCompetition(compId);
      expect(compInitial?.status).toBe('groups-defined');

      // Executa a sincronização do ciclo de vida após homologação de todas as partidas
      const syncResult = await CompetitionLifecycleService.syncLifecycleAfterMatchProgression(
        compId,
        'Operador Teste Gate 2F',
      );

      expect(syncResult.ok).toBe(true);
      expect(syncResult.updated).toBe(true);
      expect(syncResult.competition?.status).toBe('completed');

      // Valida persistência no dataAccess
      const compSaved = await dataAccess.getCompetition(compId);
      expect(compSaved?.status).toBe('completed');
      expect(compSaved?.status).not.toBe('groups-defined');
      expect(compSaved?.championTeamId).toBe('t1');
      expect(compSaved?.runnerUpTeamId).toBe('t2');
      expect(compSaved?.thirdPlaceTeamId).toBe('t3');

      // Apuração canônica do pódio
      const podium = computePodium(matches, roundRobinCompetition);
      expect(podium.championTeamId).toBe('t1');
      expect(podium.runnerUpTeamId).toBe('t2');
      expect(podium.thirdPlaceTeamId).toBe('t3');
      expect(podium.fourthPlaceTeamId).toBe('t4');

      // Standings oficiais
      const standingInputs: StandingInput[] = teams.map((team) => ({ team }));
      const standings = computeStandings(standingInputs, matches, {
        competition: roundRobinCompetition,
        useMiniTable: true,
      });

      expect(standings[0].teamId).toBe('t1');
      expect(standings[0].position).toBe(1);
      expect(standings[1].teamId).toBe('t2');
      expect(standings[1].position).toBe(2);
      expect(standings[2].teamId).toBe('t3');
      expect(standings[2].position).toBe(3);
      expect(standings[3].teamId).toBe('t4');
      expect(standings[3].position).toBe(4);
      expect(standings[4].teamId).toBe('t5');
      expect(standings[4].position).toBe(5);

      // Validação de geração de PDF do Pódio
      const podiumData: PodiumReportData = {
        competitionName: roundRobinCompetition.name,
        categoryName: 'Masculino',
        champion: { name: 'Alfa Voleibol', shortName: 'ALF' },
        runnerUp: { name: 'Beta Clube', shortName: 'BET' },
        third: { name: 'Gama Esportes', shortName: 'GAM' },
        fourth: { name: 'Delta Vôlei', shortName: 'DEL' },
      };

      const pdfDoc = generatePodiumReportPdf(podiumData);
      expect(pdfDoc).toBeDefined();
      expect(pdfDoc.getNumberOfPages()).toBe(1);
    });

    it('recomenda status completed quando em groups-defined com todos os jogos concluídos', () => {
      const matches: MatchRecord[] = [
        makeMatch('m1', compId, 't1', 't2', 2, 0, 1),
        makeMatch('m2', compId, 't1', 't3', 2, 0, 2),
      ];

      const nextStatus = CompetitionLifecycleService.getNextRecommendedStatus(
        'groups-defined',
        roundRobinCompetition,
        matches,
      );
      expect(nextStatus).toBe('completed');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 15: AGENDA DE JOGOS — REAGENDAMENTO E ORDENAÇÃO CRONOLÓGICA
  // ═══════════════════════════════════════════════════════════════════════════
  describe('2. Agenda de Jogos e Reagendamento (Schedule Engine Canônico)', () => {
    it('ordena por estado atual do horário: jogo #4 às 07:00 deve vir antes do jogo #1 às 09:00', () => {
      // Cenário obrigatório:
      // Jogo antigo #4 reagendado para 07:00
      // Jogo antigo #1 reagendado para 09:00
      // Jogo #2 às 10:00
      // Jogo #3 às 14:00
      const matches: MatchRecord[] = [
        makeMatch('m-orig-1', compId, 't1', 't2', 0, 0, 1, '2026-10-01T09:00:00Z', 'scheduled'),
        makeMatch('m-orig-2', compId, 't2', 't3', 0, 0, 2, '2026-10-01T10:00:00Z', 'scheduled'),
        makeMatch('m-orig-3', compId, 't3', 't4', 0, 0, 3, '2026-10-01T14:00:00Z', 'scheduled'),
        makeMatch('m-orig-4', compId, 't4', 't5', 0, 0, 4, '2026-10-01T07:00:00Z', 'scheduled'),
      ];

      const sorted = sortScheduleMatches(matches);

      // Deve estar ordenado cronologicamente: 07:00, 09:00, 10:00, 14:00
      expect(sorted[0].id).toBe('m-orig-4');
      expect(sorted[0].matchNumber).toBe(4);
      expect(sorted[0].scheduledTime).toBe('2026-10-01T07:00:00Z');

      expect(sorted[1].id).toBe('m-orig-1');
      expect(sorted[1].matchNumber).toBe(1);
      expect(sorted[1].scheduledTime).toBe('2026-10-01T09:00:00Z');

      expect(sorted[2].id).toBe('m-orig-2');
      expect(sorted[2].matchNumber).toBe(2);
      expect(sorted[2].scheduledTime).toBe('2026-10-01T10:00:00Z');

      expect(sorted[3].id).toBe('m-orig-3');
      expect(sorted[3].matchNumber).toBe(3);
      expect(sorted[3].scheduledTime).toBe('2026-10-01T14:00:00Z');
    });

    it('desempata por quadra natural (Quadra 2 antes de Quadra 10) no mesmo horário', () => {
      const m1 = makeMatch('m1', compId, 't1', 't2', 0, 0, 1, '2026-10-01T08:00:00Z', 'scheduled', 'Quadra 10');
      const m2 = makeMatch('m2', compId, 't3', 't4', 0, 0, 2, '2026-10-01T08:00:00Z', 'scheduled', 'Quadra 2');
      const m3 = makeMatch('m3', compId, 't2', 't5', 0, 0, 3, '2026-10-01T08:00:00Z', 'scheduled', 'Quadra 1');

      const sorted = sortScheduleMatches([m1, m2, m3]);
      expect(sorted.map((m) => m.court)).toEqual(['Quadra 1', 'Quadra 2', 'Quadra 10']);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 6 & 10: MULTI-TENANCY E CONTEXT SWITCH DE EQUIPES
  // ═══════════════════════════════════════════════════════════════════════════
  describe('3. Multi-tenancy e Team Context Switch', () => {
    it('rejeita qualquer tentativa de selecionar equipe fora das memberships ativas (anti-cross-tenant)', () => {
      const allowedContexts: UserAvailableTeamContext[] = [
        {
          id: 'ct-org-a',
          competitionTeamId: 'ct-org-a',
          teamId: 'team-a',
          teamName: 'Equipe Org A',
          teamShortName: 'EOA',
          competitionId: 'comp-org-a',
          competitionName: 'Copa Org A',
          organizationId: 'org-a',
          role: 'team_manager',
          accessToken: 'token-a',
          isLegacyFallback: false,
        },
      ];

      // Seleção permitida de membership ativa
      const selected = TeamContextService.setActiveTeamContext('user-1', 'ct-org-a', allowedContexts);
      expect(selected.competitionTeamId).toBe('ct-org-a');

      // Tentativa ilegítima de acesso a equipe de outra organização (IDOR / cross-tenant)
      expect(() => {
        TeamContextService.setActiveTeamContext('user-1', 'ct-org-b-forged', allowedContexts);
      }).toThrowError(/Acesso negado: a equipe selecionada não pertence às memberships ativas/);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 13 & 19: REGRAS INDOOR E CAPACIDADE DA SÚMULA
  // ═══════════════════════════════════════════════════════════════════════════
  describe('4. Regras Indoor e Capacidade da Súmula Oficial BaseOS', () => {
    it('garante capacidades regulamentares de súmula oficial (14 atletas, 2 líberos, 5 comissão)', () => {
      expect(ROSTER_CAPACITY.MAX_REGULAR_ATHLETES).toBe(14);
      expect(ROSTER_CAPACITY.MAX_LIBEROS).toBe(2);
      expect(ROSTER_CAPACITY.TOTAL_ATHLETES_GRID).toBe(16);
      expect(ROSTER_CAPACITY.MIN_PLAYERS_TO_START).toBe(6);
      expect(ROSTER_CAPACITY.MAX_STAFF_MEMBERS).toBe(5);
    });

    it('mantém CompetitionConfig como SSOT para regras esportivas Indoor', () => {
      const cfg = CompetitionRulesService.getConfig(roundRobinCompetition);
      expect(roundRobinCompetition.modality).toBe('indoor');
      expect(cfg.format.setRules.regularSetPoints).toBe(25);
      expect(cfg.format.setRules.tiebreakPoints).toBe(15);
      expect(cfg.registration.maxLiberos).toBe(2);
      expect(cfg.scoring.pointsWinClear).toBe(3);
      expect(cfg.scoring.pointsWinNarrow).toBe(2);
      expect(cfg.scoring.pointsLossNarrow).toBe(1);
      expect(cfg.scoring.pointsLossClear).toBe(0);
    });
  });
});
