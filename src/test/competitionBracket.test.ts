import { describe, it, expect } from 'vitest';
import { CompetitionBracketService } from '@/services/competitionBracketService';
import { generateGroupRoundRobin } from '@/services/drawService';
import { dataAccess } from '@/services/dataAccess';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';
import type { StandingsByGroup } from '@/services/standingsService';

describe('Fase 4.8 — Fases, Grupos, Chaveamentos e Geração de Partidas', () => {
  const comp: CompetitionRecord = {
    id: 'comp-bracket-1',
    name: 'Copa dos Campeões 2026',
    modality: 'indoor',
    format: 'groups',
    playerFormat: '6x6',
    setFormat: '5-sets',
    genderCategory: 'male',
    status: 'in-progress',
    groupsCount: 2,
    config: {
      version: 1,
      format: {
        defaultSetsToWin: 3,
        setRules: { regularSetPoints: 25, tiebreakPoints: 15, minAdvantage: 2 },
        phaseOverrides: {
          semifinals: 3,
          final: 3,
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
        tiebreakCriteriaOrder: ['points', 'victories', 'set-average'],
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

  const teams: TeamRecord[] = [
    { id: 'team-1', name: 'Alpha', shortName: 'ALP', modality: 'indoor', createdAt: '', updatedAt: '' },
    { id: 'team-2', name: 'Beta', shortName: 'BET', modality: 'indoor', createdAt: '', updatedAt: '' },
    { id: 'team-3', name: 'Gamma', shortName: 'GAM', modality: 'indoor', createdAt: '', updatedAt: '' },
    { id: 'team-4', name: 'Delta', shortName: 'DEL', modality: 'indoor', createdAt: '', updatedAt: '' },
  ];

  describe('1. Algoritmo de Tabela Berger (Round-Robin) e Integridade de Grupos', () => {
    it('gera tabela perfeita de turno único para número par de equipes sem folgas', () => {
      const matchSchedule = generateGroupRoundRobin(['team-1', 'team-2', 'team-3', 'team-4']);
      // 4 equipes -> 4 * 3 / 2 = 6 jogos em 3 rodadas
      expect(matchSchedule).toHaveLength(6);
      const rounds = new Set(matchSchedule.map((m) => m.round));
      expect(rounds.size).toBe(3);

      // Nenhuma equipe joga contra si mesma
      matchSchedule.forEach((m) => {
        expect(m.teamAId).not.toBe(m.teamBId);
      });
    });

    it('gera tabela com folga (BYE) para número ímpar de equipes sem criar partidas fantasmas', () => {
      const matchSchedule = generateGroupRoundRobin(['team-1', 'team-2', 'team-3']);
      // 3 equipes -> 3 rodadas, cada equipe joga 2 partidas (total 3 jogos)
      expect(matchSchedule).toHaveLength(3);
      matchSchedule.forEach((m) => {
        expect(m.teamAId).not.toBe('__BYE__');
        expect(m.teamBId).not.toBe('__BYE__');
      });
    });

    it('bloqueia alteração/re-sorteio da fase de grupos se já existirem partidas iniciadas ou finalizadas', () => {
      const matchesWithCompleted: MatchRecord[] = [
        {
          id: 'm-group-1',
          competitionId: comp.id,
          round: 1,
          matchNumber: 1,
          teamAId: 'team-1',
          teamBId: 'team-2',
          teamAName: 'Alpha',
          teamBName: 'Beta',
          teamAShortName: 'ALP',
          teamBShortName: 'BET',
          venue: 'Quadra 1',
          scheduledTime: '2026-09-03T10:00:00Z',
          phase: 'classificatória',
          status: 'completed',
          sets: [{ setNumber: 1, scoreA: 25, scoreB: 20 }],
          referees: [],
          createdAt: '',
          updatedAt: '',
        },
      ];

      const check = CompetitionBracketService.canModifyGroupStage(comp, matchesWithCompleted);
      expect(check.ok).toBe(false);
      expect(check.errors[0]).toContain('Não é permitido alterar ou re-sortear a fase de grupos');
    });

    it('permite alteração se todas as partidas da fase estiverem agendadas e não jogadas', () => {
      const scheduledOnly: MatchRecord[] = [
        {
          id: 'm-group-1',
          competitionId: comp.id,
          round: 1,
          matchNumber: 1,
          teamAId: 'team-1',
          teamBId: 'team-2',
          teamAName: 'Alpha',
          teamBName: 'Beta',
          teamAShortName: 'ALP',
          teamBShortName: 'BET',
          venue: 'Quadra 1',
          scheduledTime: '2026-09-03T10:00:00Z',
          phase: 'classificatória',
          status: 'scheduled',
          sets: [],
          referees: [],
          createdAt: '',
          updatedAt: '',
        },
      ];

      const check = CompetitionBracketService.canModifyGroupStage(comp, scheduledOnly);
      expect(check.ok).toBe(true);
      expect(check.errors).toHaveLength(0);
    });
  });

  describe('2. Geração de Chaveamentos Eliminatórios (Playoffs)', () => {
    const mockStandings: StandingsByGroup = [
      {
        groupName: 'Grupo A',
        standings: [
          { teamId: 'team-1', position: 1, teamName: 'Alpha', teamShortName: 'ALP', matchesPlayed: 1, matchesWon: 1, matchesLost: 0, competitionPoints: 3, setsWon: 2, setsLost: 0, setsRatio: 2, pointsWon: 50, pointsLost: 40, pointsBalance: 10, pointsRatio: 1.25 },
          { teamId: 'team-2', position: 2, teamName: 'Beta', teamShortName: 'BET', matchesPlayed: 1, matchesWon: 0, matchesLost: 1, competitionPoints: 0, setsWon: 0, setsLost: 2, setsRatio: 0, pointsWon: 40, pointsLost: 50, pointsBalance: -10, pointsRatio: 0.8 },
        ],
      },
      {
        groupName: 'Grupo B',
        standings: [
          { teamId: 'team-3', position: 1, teamName: 'Gamma', teamShortName: 'GAM', matchesPlayed: 1, matchesWon: 1, matchesLost: 0, competitionPoints: 3, setsWon: 2, setsLost: 0, setsRatio: 2, pointsWon: 50, pointsLost: 40, pointsBalance: 10, pointsRatio: 1.25 },
          { teamId: 'team-4', position: 2, teamName: 'Delta', teamShortName: 'DEL', matchesPlayed: 1, matchesWon: 0, matchesLost: 1, competitionPoints: 0, setsWon: 0, setsLost: 2, setsRatio: 0, pointsWon: 40, pointsLost: 50, pointsBalance: -10, pointsRatio: 0.8 },
        ],
      },
    ];

    it('gera chaveamento olímpico para 2 grupos: Semifinais (1A x 2B, 1B x 2A) + 3º Lugar + Final', () => {
      const slots = CompetitionBracketService.generatePlayoffSlots(comp, mockStandings);
      expect(slots).toHaveLength(4);

      // Semi 1: 1A x 2B
      expect(slots[0].phase).toBe('semifinal');
      expect(slots[0].sourceTeamA.teamId).toBe('team-1');
      expect(slots[0].sourceTeamB.teamId).toBe('team-4');

      // Semi 2: 1B x 2A
      expect(slots[1].phase).toBe('semifinal');
      expect(slots[1].sourceTeamA.teamId).toBe('team-3');
      expect(slots[1].sourceTeamB.teamId).toBe('team-2');

      // 3º Lugar e Final
      expect(slots[2].phase).toBe('terceiro_lugar');
      expect(slots[3].phase).toBe('final');
    });

    it('gera chaveamento para 1 grupo único (final direta entre 1º e 2º)', () => {
      const singleGroup = [mockStandings[0]];
      const slots = CompetitionBracketService.generatePlayoffSlots({ ...comp, groupsCount: 1 }, singleGroup);
      expect(slots).toHaveLength(1);
      expect(slots[0].phase).toBe('final');
      expect(slots[0].sourceTeamA.teamId).toBe('team-1');
      expect(slots[0].sourceTeamB.teamId).toBe('team-2');
    });

    it('aplica o formato de sets canônico por fase ao construir os registros', () => {
      const slots = CompetitionBracketService.generatePlayoffSlots(comp, mockStandings);
      const records = CompetitionBracketService.buildPlayoffMatchRecords(comp, slots, teams, 10);
      expect(records).toHaveLength(4);
      expect(records[0].matchNumber).toBe(10);
      expect(records[0].customSetFormat).toBe('5-sets'); // semifinal configurada como setsToWin: 3 -> 5-sets
    });
  });

  describe('3. Avanço Automático Canônico e Pódio Oficial', () => {
    it('avança vencedores para a final e perdedores para 3º lugar baseado no resultado canônico', () => {
      const playoffMatches: MatchRecord[] = [
        {
          id: 'semi-1',
          competitionId: comp.id,
          round: 1,
          matchNumber: 1,
          teamAId: 'team-1',
          teamBId: 'team-4',
          teamAName: 'Alpha',
          teamBName: 'Delta',
          teamAShortName: 'ALP',
          teamBShortName: 'DEL',
          venue: 'Ginásio',
          phase: 'semifinal',
          status: 'completed',
          scheduledTime: '2026-09-03T14:00:00Z',
          sets: [
            { setNumber: 1, scoreA: 25, scoreB: 20 },
            { setNumber: 2, scoreA: 25, scoreB: 22 },
            { setNumber: 3, scoreA: 25, scoreB: 23 },
          ], // Alpha vence 3x0 (canonical winner = team-1, loser = team-4)
          referees: [],
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'semi-2',
          competitionId: comp.id,
          round: 1,
          matchNumber: 2,
          teamAId: 'team-3',
          teamBId: 'team-2',
          teamAName: 'Gamma',
          teamBName: 'Beta',
          teamAShortName: 'GAM',
          teamBShortName: 'BET',
          venue: 'Ginásio',
          phase: 'semifinal',
          status: 'completed',
          scheduledTime: '2026-09-03T16:00:00Z',
          sets: [
            { setNumber: 1, scoreA: 20, scoreB: 25 },
            { setNumber: 2, scoreA: 21, scoreB: 25 },
            { setNumber: 3, scoreA: 19, scoreB: 25 },
          ], // Beta vence 3x0 (canonical winner = team-2, loser = team-3)
          referees: [],
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'disputa-3',
          competitionId: comp.id,
          round: 2,
          matchNumber: 3,
          teamAId: 'TBD-A',
          teamBId: 'TBD-B',
          teamAName: 'Perdedor Semi 1',
          teamBName: 'Perdedor Semi 2',
          teamAShortName: 'TBD',
          teamBShortName: 'TBD',
          venue: 'Ginásio',
          phase: 'terceiro_lugar',
          status: 'awaiting_schedule',
          scheduledTime: '2026-09-03T18:00:00Z',
          sets: [],
          referees: [],
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'final',
          competitionId: comp.id,
          round: 2,
          matchNumber: 4,
          teamAId: 'TBD-A',
          teamBId: 'TBD-B',
          teamAName: 'Vencedor Semi 1',
          teamBName: 'Vencedor Semi 2',
          teamAShortName: 'TBD',
          teamBShortName: 'TBD',
          venue: 'Ginásio',
          phase: 'final',
          status: 'awaiting_schedule',
          scheduledTime: '2026-09-03T20:00:00Z',
          sets: [],
          referees: [],
          createdAt: '',
          updatedAt: '',
        },
      ];

      const { updatedMatches, changed } = CompetitionBracketService.advancePlayoffBrackets(
        comp,
        playoffMatches,
        teams,
      );

      expect(changed).toBe(true);

      const finalMatch = updatedMatches.find((m) => m.phase === 'final');
      expect(finalMatch?.teamAId).toBe('team-1'); // Vencedor Semi 1 (Alpha)
      expect(finalMatch?.teamBId).toBe('team-2'); // Vencedor Semi 2 (Beta)

      const thirdMatch = updatedMatches.find((m) => m.phase === 'terceiro_lugar');
      expect(thirdMatch?.teamAId).toBe('team-4'); // Perdedor Semi 1 (Delta)
      expect(thirdMatch?.teamBId).toBe('team-3'); // Perdedor Semi 2 (Gamma)
    });

    it('apura o pódio com precisão esportiva após a final e disputa de 3º lugar', () => {
      const finalAndThirdMatches: MatchRecord[] = [
        {
          id: 'final-done',
          competitionId: comp.id,
          round: 2,
          matchNumber: 4,
          teamAId: 'team-1',
          teamBId: 'team-2',
          teamAName: 'Alpha',
          teamBName: 'Beta',
          teamAShortName: 'ALP',
          teamBShortName: 'BET',
          venue: 'Ginásio',
          phase: 'final',
          status: 'completed',
          scheduledTime: '2026-09-03T20:00:00Z',
          sets: [
            { setNumber: 1, scoreA: 25, scoreB: 20 },
            { setNumber: 2, scoreA: 25, scoreB: 22 },
            { setNumber: 3, scoreA: 25, scoreB: 18 },
          ], // Alpha campeão 3x0
          referees: [],
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'third-done',
          competitionId: comp.id,
          round: 2,
          matchNumber: 3,
          teamAId: 'team-4',
          teamBId: 'team-3',
          teamAName: 'Delta',
          teamBName: 'Gamma',
          teamAShortName: 'DEL',
          teamBShortName: 'GAM',
          venue: 'Ginásio',
          phase: 'terceiro_lugar',
          status: 'completed',
          scheduledTime: '2026-09-03T18:00:00Z',
          sets: [
            { setNumber: 1, scoreA: 25, scoreB: 20 },
            { setNumber: 2, scoreA: 25, scoreB: 23 },
            { setNumber: 3, scoreA: 25, scoreB: 21 },
          ], // Delta 3º colocado 3x0
          referees: [],
          createdAt: '',
          updatedAt: '',
        },
      ];

      const podium = CompetitionBracketService.getPodium(comp, finalAndThirdMatches);
      expect(podium.championTeamId).toBe('team-1'); // Alpha Campeão
      expect(podium.runnerUpTeamId).toBe('team-2'); // Beta Vice-campeão
      expect(podium.thirdPlaceTeamId).toBe('team-4'); // Delta 3º Lugar
      expect(podium.fourthPlaceTeamId).toBe('team-3'); // Gamma 4º Lugar
    });
  });

  describe('4. Blindagem em dataAccess.saveDrawWithMatches', () => {
    it('recusa sobrescrever a fase classificatória se houver partidas iniciadas ou jogadas', async () => {
      // Criar competição e partida finalizada
      const testComp = await dataAccess.createCompetition({
        name: 'Torneio Teste Blindagem',
        modality: 'indoor',
        format: 'groups',
        playerFormat: '6x6',
        setFormat: '5-sets',
        genderCategory: 'male',
        status: 'in-progress',
      });

      const playedMatch = await dataAccess.createMatch({
        competitionId: testComp.id,
        round: 1,
        matchNumber: 1,
        teamAId: 'team-1',
        teamBId: 'team-2',
        teamAName: 'Alpha',
        teamBName: 'Beta',
        teamAShortName: 'ALP',
        teamBShortName: 'BET',
        venue: 'Ginásio',
        phase: 'classificatória',
        status: 'completed',
        sets: [{ setNumber: 1, scoreA: 25, scoreB: 20 }],
        scheduledTime: '2026-09-03T10:00:00Z',
        referees: [],
      });

      // Tentar salvar novo sorteio por cima da partida jogada
      await expect(
        dataAccess.saveDrawWithMatches(
          {
            competitionId: testComp.id,
            config: { groupsCount: 1, seedingMode: 'random', seed: 123, headSeeds: [] },
            groups: [],
            matches: [],
            status: 'preview',
          },
          [
            {
              round: 1,
              matchNumber: 100,
              teamAId: 'team-3',
              teamBId: 'team-4',
              teamAName: 'Gamma',
              teamBName: 'Delta',
              teamAShortName: 'GAM',
              teamBShortName: 'DEL',
              groupName: 'Grupo A',
              phase: 'classificatória',
              scheduledTime: '2026-09-03T12:00:00Z',
              venue: 'Ginásio',
            },
          ],
        ),
      ).rejects.toThrow('Não é possível substituir as partidas da fase classificatória');

      // Limpeza
      await dataAccess.deleteMatches([playedMatch.id]);
      await dataAccess.deleteCompetition(testComp.id);
    });
  });
});
