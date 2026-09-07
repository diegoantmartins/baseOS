import { describe, expect, it } from 'vitest';
import type { MatchSlot, ParticipantSlotState, StageDefinition } from '@/types/competitionConfig';
import type { TeamRecord } from '@/types/entities';
import { OverallStandingsEngine, type OverallStandingResult } from '@/services/overallStandingsEngine';
import { GenericPairingEngine } from '@/services/genericPairingEngine';
import { GenericProgressionEngine } from '@/services/genericProgressionEngine';
import { ParticipantResolutionEngine, type ResolutionContext } from '@/services/participantResolutionEngine';
import { StageGraph } from '@/services/stageGraphEngine';
import { createResolvedParticipantSlot, createUnresolvedParticipantSlot } from '@/types/competitionConfig';
import type { StandingsByGroup } from '@/services/standingsService';

function createMockRow(
  teamId: string,
  teamName: string,
  groupName: string,
  position: number,
  points: number,
  wins: number,
  setsRatio: number,
  pointsRatio: number,
): import('@/services/standingsService').TeamStandingResult {
  return {
    teamId,
    teamName,
    teamShortName: teamId.toUpperCase(),
    groupName,
    position,
    matchesPlayed: 2,
    matchesWon: wins,
    matchesLost: 2 - wins,
    setsWon: wins * 2,
    setsLost: (2 - wins) * 2,
    setsRatio,
    pointsWon: 100,
    pointsLost: Math.round(100 / pointsRatio),
    pointsBalance: 100 - Math.round(100 / pointsRatio),
    pointsRatio,
    competitionPoints: points,
  };
}

describe('Cenários Esportivos Reais da Competição (Domínio Puro em Memória)', () => {
  describe('Cenário 1: 12 Equipes (4 Grupos x 3 -> Ranking Geral -> Play-In 5..12 -> Quartas -> Semis -> Final)', () => {
    const teams: TeamRecord[] = Array.from({ length: 12 }, (_, i) => ({
      id: `team-${i + 1}`,
      name: `Equipe ${i + 1}`,
      shortName: `EQ${i + 1}`,
      modality: 'indoor',
    }));

    // Simula a classificação dos 4 grupos (3 equipes por grupo)
    // 1ºs colocados com pontos decrescentes:
    // Grupo A: team-1 (1º, 6 pts, ratio 2.0)
    // Grupo B: team-2 (1º, 6 pts, ratio 1.5)
    // Grupo C: team-3 (1º, 5 pts, ratio 1.3)
    // Grupo D: team-4 (1º, 5 pts, ratio 1.2)
    const mockGroupStandings: StandingsByGroup = [
      {
        groupName: 'Grupo A',
        standings: [
          createMockRow('team-1', 'Equipe 1', 'Grupo A', 1, 6, 2, 4.0, 2.0),
          createMockRow('team-5', 'Equipe 5', 'Grupo A', 2, 3, 1, 1.0, 1.4),
          createMockRow('team-9', 'Equipe 9', 'Grupo A', 3, 0, 0, 0.25, 0.6),
        ],
      },
      {
        groupName: 'Grupo B',
        standings: [
          createMockRow('team-2', 'Equipe 2', 'Grupo B', 1, 6, 2, 3.0, 1.5),
          createMockRow('team-6', 'Equipe 6', 'Grupo B', 2, 3, 1, 1.0, 1.3),
          createMockRow('team-10', 'Equipe 10', 'Grupo B', 3, 0, 0, 0.25, 0.7),
        ],
      },
      {
        groupName: 'Grupo C',
        standings: [
          createMockRow('team-3', 'Equipe 3', 'Grupo C', 1, 5, 2, 2.5, 1.3),
          createMockRow('team-7', 'Equipe 7', 'Grupo C', 2, 3, 1, 1.0, 1.2),
          createMockRow('team-11', 'Equipe 11', 'Grupo C', 3, 0, 0, 0.2, 0.5),
        ],
      },
      {
        groupName: 'Grupo D',
        standings: [
          createMockRow('team-4', 'Equipe 4', 'Grupo D', 1, 5, 2, 2.0, 1.2),
          createMockRow('team-8', 'Equipe 8', 'Grupo D', 2, 3, 1, 1.0, 1.1),
          createMockRow('team-12', 'Equipe 12', 'Grupo D', 3, 0, 0, 0.1, 0.4),
        ],
      },
    ];

    it('consolida o ranking intergrupos ordenando por escalão (1ºs, depois 2ºs, depois 3ºs)', () => {
      const overall = OverallStandingsEngine.computeOverallStandings(mockGroupStandings, {
        strategy: 'by-group-position-first',
      });

      expect(overall).toHaveLength(12);

      // Top 4 são rigorosamente os vencedores de grupo (posições 1 a 4)
      const top4 = overall.slice(0, 4);
      expect(top4.map(t => t.teamId)).toEqual(['team-1', 'team-2', 'team-3', 'team-4']);
      expect(top4.every(t => t.groupPosition === 1)).toBe(true);

      // Posições 5 a 8 são os 2º colocados de grupo
      const playInTop = overall.slice(4, 8);
      expect(playInTop.every(t => t.groupPosition === 2)).toBe(true);

      // Posições 9 a 12 são os 3º colocados de grupo
      const playInBottom = overall.slice(8, 12);
      expect(playInBottom.every(t => t.groupPosition === 3)).toBe(true);
    });

    it('gera confrontos matemáticos do Play-In (5x12, 6x11, 7x10, 8x9) via High-Low sem nenhum valor hardcoded', () => {
      const overall = OverallStandingsEngine.computeOverallStandings(mockGroupStandings);
      const playInTeams = OverallStandingsEngine.getPositionsRange(overall, 5, 12);
      expect(playInTeams).toHaveLength(8);

      // Converte para ParticipantSlotState através de referências puras
      const participants: ParticipantSlotState[] = playInTeams.map(t =>
        createUnresolvedParticipantSlot(
          'A',
          { type: 'overall-ranking', stageId: 'groups', position: t.overallRank },
          `${t.overallRank}º Geral`,
        ),
      );

      const playInSlots = GenericPairingEngine.pair(
        participants,
        { strategy: 'high-low' },
        { stageId: 'play-in', roundId: 'r1', slotIdPrefix: 'PLAYIN' },
      );

      expect(playInSlots).toHaveLength(4);

      // Jogo 1: 5 x 12
      expect(playInSlots[0].participantA.reference).toEqual({ type: 'overall-ranking', stageId: 'groups', position: 5 });
      expect(playInSlots[0].participantB.reference).toEqual({ type: 'overall-ranking', stageId: 'groups', position: 12 });

      // Jogo 2: 6 x 11
      expect(playInSlots[1].participantA.reference).toEqual({ type: 'overall-ranking', stageId: 'groups', position: 6 });
      expect(playInSlots[1].participantB.reference).toEqual({ type: 'overall-ranking', stageId: 'groups', position: 11 });

      // Jogo 3: 7 x 10
      expect(playInSlots[2].participantA.reference).toEqual({ type: 'overall-ranking', stageId: 'groups', position: 7 });
      expect(playInSlots[2].participantB.reference).toEqual({ type: 'overall-ranking', stageId: 'groups', position: 10 });

      // Jogo 4: 8 x 9
      expect(playInSlots[3].participantA.reference).toEqual({ type: 'overall-ranking', stageId: 'groups', position: 8 });
      expect(playInSlots[3].participantB.reference).toEqual({ type: 'overall-ranking', stageId: 'groups', position: 9 });

      // Resolve os participantes contra os dados do ranking
      const context: ResolutionContext = {
        teams,
        overallStandingsByStage: {
          groups: overall,
        },
      };

      const resolvedPlayIn = ParticipantResolutionEngine.resolveSlots(playInSlots, context);

      // Confirmação com as equipes reais calculadas matematicamente
      expect(resolvedPlayIn[0].participantA.resolvedTeamId).toBe(overall[4].teamId); // 5º
      expect(resolvedPlayIn[0].participantB.resolvedTeamId).toBe(overall[11].teamId); // 12º

      expect(resolvedPlayIn[1].participantA.resolvedTeamId).toBe(overall[5].teamId); // 6º
      expect(resolvedPlayIn[1].participantB.resolvedTeamId).toBe(overall[10].teamId); // 11º

      expect(resolvedPlayIn[2].participantA.resolvedTeamId).toBe(overall[6].teamId); // 7º
      expect(resolvedPlayIn[2].participantB.resolvedTeamId).toBe(overall[9].teamId); // 10º

      expect(resolvedPlayIn[3].participantA.resolvedTeamId).toBe(overall[7].teamId); // 8º
      expect(resolvedPlayIn[3].participantB.resolvedTeamId).toBe(overall[8].teamId); // 9º
    });
  });

  describe('Cenário 2: 6 Equipes (2 Grupos x 3 -> Semifinais e Final)', () => {
    // 2 grupos de 3 equipes
    const mock2Groups: StandingsByGroup = [
      {
        groupName: 'Grupo A',
        standings: [
          createMockRow('team-1', 'Time 1A', 'Grupo A', 1, 6, 2, 4.0, 1.66),
          createMockRow('team-2', 'Time 2A', 'Grupo A', 2, 3, 1, 1.0, 1.0),
          createMockRow('team-3', 'Time 3A', 'Grupo A', 3, 0, 0, 0.25, 0.6),
        ],
      },
      {
        groupName: 'Grupo B',
        standings: [
          createMockRow('team-4', 'Time 1B', 'Grupo B', 1, 6, 2, 3.0, 1.35),
          createMockRow('team-5', 'Time 2B', 'Grupo B', 2, 3, 1, 1.0, 1.0),
          createMockRow('team-6', 'Time 3B', 'Grupo B', 3, 0, 0, 0.25, 0.72),
        ],
      },
    ];

    it('permite cruzamento direto das semis (1ºA x 2ºB e 1ºB x 2ºA) para 6 equipes', () => {
      const participants: ParticipantSlotState[] = [
        createUnresolvedParticipantSlot('A', { type: 'group-position', stageId: 'groups', groupIndex: 0, position: 1 }, '1ºA'),
        createUnresolvedParticipantSlot('A', { type: 'group-position', stageId: 'groups', groupIndex: 0, position: 2 }, '2ºA'),
        createUnresolvedParticipantSlot('A', { type: 'group-position', stageId: 'groups', groupIndex: 1, position: 1 }, '1ºB'),
        createUnresolvedParticipantSlot('A', { type: 'group-position', stageId: 'groups', groupIndex: 1, position: 2 }, '2ºB'),
      ];

      const semiSlots = GenericPairingEngine.pair(
        participants,
        { strategy: 'same-position-cross' },
        { stageId: 'knockout', roundId: 'semis' },
      );

      expect(semiSlots).toHaveLength(2);

      const context: ResolutionContext = {
        standingsByStage: {
          groups: mock2Groups,
        },
      };

      const resolved = ParticipantResolutionEngine.resolveSlots(semiSlots, context);

      // Semi 1: 1ºA (team-1) x 2ºB (team-5)
      expect(resolved[0].participantA.resolvedTeamId).toBe('team-1');
      expect(resolved[0].participantB.resolvedTeamId).toBe('team-5');

      // Semi 2: 1ºB (team-4) x 2ºA (team-2)
      expect(resolved[1].participantA.resolvedTeamId).toBe('team-4');
      expect(resolved[1].participantB.resolvedTeamId).toBe('team-2');
    });
  });

  describe('Cenário 3: Knockout Genérico (8, 4 e 2 participantes)', () => {
    it('gera chave eliminatória de 8 participantes (4 partidas)', () => {
      const participants = Array.from({ length: 8 }, (_, i) =>
        createResolvedParticipantSlot('A', `seed-${i + 1}`, `Seed ${i + 1}`),
      );

      const slots = GenericPairingEngine.pair(
        participants,
        { strategy: 'seeded-bracket', bracketSize: 8 },
        { stageId: 'ko', roundId: 'qf' },
      );

      expect(slots).toHaveLength(4);
    });

    it('gera chave eliminatória de 4 participantes (2 partidas)', () => {
      const participants = Array.from({ length: 4 }, (_, i) =>
        createResolvedParticipantSlot('A', `seed-${i + 1}`, `Seed ${i + 1}`),
      );

      const slots = GenericPairingEngine.pair(
        participants,
        { strategy: 'seeded-bracket', bracketSize: 4 },
        { stageId: 'ko', roundId: 'sf' },
      );

      expect(slots).toHaveLength(2);
      expect(slots[0].participantA.resolvedTeamId).toBe('seed-1');
      expect(slots[0].participantB.resolvedTeamId).toBe('seed-4');
      expect(slots[1].participantA.resolvedTeamId).toBe('seed-2');
      expect(slots[1].participantB.resolvedTeamId).toBe('seed-3');
    });

    it('gera final única de 2 participantes (1 partida)', () => {
      const participants = [
        createResolvedParticipantSlot('A', 'team-finalist-1', 'Finalista 1'),
        createResolvedParticipantSlot('A', 'team-finalist-2', 'Finalista 2'),
      ];

      const slots = GenericPairingEngine.pair(
        participants,
        { strategy: 'seeded-bracket', bracketSize: 2 },
        { stageId: 'ko', roundId: 'final' },
      );

      expect(slots).toHaveLength(1);
      expect(slots[0].participantA.resolvedTeamId).toBe('team-finalist-1');
      expect(slots[0].participantB.resolvedTeamId).toBe('team-finalist-2');
    });
  });

  describe('Cenário 4: Knockout com BYE (5 Participantes em Chave de 8)', () => {
    it('gerencia 5 participantes com 3 BYEs e propaga automaticamente sem partidas fantasmas', () => {
      const participants = Array.from({ length: 5 }, (_, i) =>
        createResolvedParticipantSlot('A', `team-seed-${i + 1}`, `Seed ${i + 1}`),
      );

      // Rodada 1: Quartas de Final (8 slots -> 4 partidas com 3 BYEs)
      const qfSlots = GenericPairingEngine.pair(
        participants,
        { strategy: 'seeded-bracket', bracketSize: 8 },
        { stageId: 'ko', roundId: 'qf' },
      );

      expect(qfSlots).toHaveLength(4);

      // Adiciona rotas para as Semifinais
      // QF1 e QF2 -> SF1; QF3 e QF4 -> SF2
      qfSlots[0].progressionRoute = {
        sourceSlotId: qfSlots[0].slotId,
        onWinner: { targetStageId: 'ko', targetRoundId: 'sf', targetSlotId: 'SLOT-SF-01', targetSide: 'A' },
      };
      qfSlots[1].progressionRoute = {
        sourceSlotId: qfSlots[1].slotId,
        onWinner: { targetStageId: 'ko', targetRoundId: 'sf', targetSlotId: 'SLOT-SF-01', targetSide: 'B' },
      };
      qfSlots[2].progressionRoute = {
        sourceSlotId: qfSlots[2].slotId,
        onWinner: { targetStageId: 'ko', targetRoundId: 'sf', targetSlotId: 'SLOT-SF-02', targetSide: 'A' },
      };
      qfSlots[3].progressionRoute = {
        sourceSlotId: qfSlots[3].slotId,
        onWinner: { targetStageId: 'ko', targetRoundId: 'sf', targetSlotId: 'SLOT-SF-02', targetSide: 'B' },
      };

      // Cria os slots vazios das Semifinais
      const sfSlots: MatchSlot[] = [
        {
          slotId: 'SLOT-SF-01',
          stageId: 'ko',
          roundId: 'sf',
          position: 1,
          participantA: createUnresolvedParticipantSlot('A', { type: 'match-winner', slotId: qfSlots[0].slotId }, 'Vencedor QF 1'),
          participantB: createUnresolvedParticipantSlot('B', { type: 'match-winner', slotId: qfSlots[1].slotId }, 'Vencedor QF 2'),
        },
        {
          slotId: 'SLOT-SF-02',
          stageId: 'ko',
          roundId: 'sf',
          position: 2,
          participantA: createUnresolvedParticipantSlot('A', { type: 'match-winner', slotId: qfSlots[2].slotId }, 'Vencedor QF 3'),
          participantB: createUnresolvedParticipantSlot('B', { type: 'match-winner', slotId: qfSlots[3].slotId }, 'Vencedor QF 4'),
        },
      ];

      // Executa a progressão pura SEM NENHUM RESULTADO CADASTRADO (apenas os BYEs)
      const allSlots = [...qfSlots, ...sfSlots];
      const evalResult = GenericProgressionEngine.evaluate(allSlots, {
        canonicalResultsBySlot: {},
      });

      const updatedSf1 = evalResult.updatedSlots.find(s => s.slotId === 'SLOT-SF-01');
      const updatedSf2 = evalResult.updatedSlots.find(s => s.slotId === 'SLOT-SF-02');

      // Seed 1 enfrentou BYE em QF 1 -> Avançou automaticamente para SF1 lado A!
      expect(updatedSf1?.participantA.status).toBe('resolved');
      expect(updatedSf1?.participantA.resolvedTeamId).toBe('team-seed-1');

      // QF 2 era Seed 4 x Seed 5 (partida real) -> Continua UNRESOLVED até ser disputada!
      expect(updatedSf1?.participantB.status).toBe('unresolved');

      // Seed 2 enfrentou BYE em QF 3 -> Avançou automaticamente para SF2 lado A!
      expect(updatedSf2?.participantA.status).toBe('resolved');
      expect(updatedSf2?.participantA.resolvedTeamId).toBe('team-seed-2');

      // Seed 3 enfrentou BYE em QF 4 -> Avançou automaticamente para SF2 lado B!
      expect(updatedSf2?.participantB.status).toBe('resolved');
      expect(updatedSf2?.participantB.resolvedTeamId).toBe('team-seed-3');

      // Constatação esportiva: SF2 já está 100% definida (Seed 2 x Seed 3) apenas pelos BYEs determinísticos,
      // sem ter criado nenhum time fantasma no sistema!
    });
  });
});
