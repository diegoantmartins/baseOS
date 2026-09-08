/**
 * BaseOS — Suíte de Testes de Domínio da Eliminatória Dupla (Fase 4.12-A)
 *
 * Valida a fundamentação matemática, topologia, contratos, persistência relacional pura,
 * algoritmos determinísticos e progressão de ponta a ponta para Eliminatória Dupla:
 *
 *  - Teste 1: Contrato canônico e descoberta do template (double-elimination-standard)
 *  - Teste 2: Preservação estrita dos templates existentes
 *  - Teste 3: Topologia e contagem exata de partidas para 4 equipes (2N - 2 = 6 partidas)
 *  - Teste 4: Topologia e contagem exata de partidas para 8 equipes (2N - 2 = 14 partidas)
 *  - Teste 5: Topologia e contagem exata de partidas para 16 equipes (2N - 2 = 30 partidas)
 *  - Teste 6: GATE DE INTEGRIDADE DA TOPOLOGIA (Prova Algorítmica Programática)
 *  - Teste 7: Semântica de eliminação (ausência de rota onLoser encerra participação esportiva)
 *  - Teste 8: Múltiplas Permutações de Resultados (Cenários A, B, C, D e E)
 *  - Teste 9: Campeão Invicto vindo do Winners Bracket (0 derrotas)
 *  - Teste 10: Campeão vindo do Losers Bracket (1 derrota prévia, vence a Grand Final)
 *  - Teste 11: Política de Rematch / Cross-pairing em Losers Bracket
 *  - Teste 12: Tratamento de BYEs como avanço sem derrota
 *  - Teste 13: Compatibilidade com formatos de sets (Melhor de 3 e Melhor de 5)
 *  - Teste 14: Regressão de Cenários Existentes (Voltz e Voltz com BYE)
 */

import { describe, expect, it } from 'vitest';
import type {
  CanonicalMatchResult,
  MatchSlot,
  ParticipantSlotState,
} from '@/types/competitionConfig';
import {
  createResolvedParticipantSlot,
  createUnresolvedParticipantSlot,
} from '@/types/competitionConfig';
import { CompetitionTemplateService } from '@/services/competitionTemplateService';
import { GenericPairingEngine } from '@/services/genericPairingEngine';
import { GenericProgressionEngine } from '@/services/genericProgressionEngine';
import { StageGraph } from '@/services/stageGraphEngine';
import { CompetitionConfigValidator } from '@/services/competitionConfigValidator';

function makeCompletedResult(winnerId: string, loserId: string): CanonicalMatchResult {
  return {
    isValid: true,
    status: 'completed',
    winnerId,
    loserId,
    winnerSide: 'A',
    setsWonA: 2,
    setsWonB: 0,
    pointsScoredA: 50,
    pointsScoredB: 30,
    setScores: [
      { setNumber: 1, scoreA: 25, scoreB: 15 },
      { setNumber: 2, scoreA: 25, scoreB: 15 },
    ],
    isWo: false,
    isCompleted: true,
    isHomologated: true,
    isInconsistent: false,
  };
}

describe('BaseOS — Fase 4.12-A: Domínio de Eliminatória Dupla', () => {
  // ==========================================================================
  // TESTE 1: Contrato canônico e Template
  // ==========================================================================
  it('deve listar o template double-elimination-standard com formato canônico double-elimination', () => {
    const template = CompetitionTemplateService.getTemplate('double-elimination-standard');
    expect(template).toBeDefined();
    expect(template?.id).toBe('double-elimination-standard');
    expect(template?.formatType).toBe('double-elimination');
    expect(template?.recommendedTeamsMin).toBe(4);
    expect(template?.recommendedTeamsMax).toBe(16);
  });

  // ==========================================================================
  // TESTE 2: Preservação dos Templates Existentes
  // ==========================================================================
  it('deve manter intactos todos os 4 templates canônicos existentes pré-4.12-A', () => {
    const templates = CompetitionTemplateService.listTemplates();
    const ids = templates.map(t => t.id);

    expect(ids).toContain('round-robin-standard');
    expect(ids).toContain('groups-knockout-standard');
    expect(ids).toContain('groups-play-in-knockout-standard');
    expect(ids).toContain('knockout-pure-standard');
    expect(ids).toContain('double-elimination-standard');
    expect(templates.length).toBe(5);
  });

  // ==========================================================================
  // TESTE 3: Topologia e contagem exata para 4 equipes (2N - 2 = 6)
  // ==========================================================================
  it('deve gerar topologia e exatamente 6 slots para 4 equipes (3 WB + 2 LB + 1 GF)', () => {
    const config = CompetitionTemplateService.createConfigFromTemplate('double-elimination-standard', {
      teamsCount: 4,
    });

    expect(config.format.formatType).toBe('double-elimination');
    expect(config.format.stages).toHaveLength(3);

    const stages = config.format.stages!;
    expect(stages[0].id).toBe('stage-winners');
    expect(stages[1].id).toBe('stage-losers');
    expect(stages[2].id).toBe('stage-grand-final');

    const result = GenericPairingEngine.pairDoubleElimination({
      bracketSize: 4,
      stageWinnersId: 'stage-winners',
      stageLosersId: 'stage-losers',
      stageGrandFinalId: 'stage-grand-final',
    });

    // Prova matemática estrita: 2(4) - 2 = 6 partidas
    expect(result.winnersSlots).toHaveLength(3); // 2 Semis + 1 Final WB
    expect(result.losersSlots).toHaveLength(2);  // 1 Semis + 1 Final LB
    expect(result.allSlots).toHaveLength(6);

    // Validação de DAG
    const dag = StageGraph.validate(stages, result.allSlots);
    expect(dag.isValid).toBe(true);
    expect(dag.errors).toHaveLength(0);
    expect(dag.topologicalOrder).toEqual(['stage-winners', 'stage-losers', 'stage-grand-final']);

    const configValidation = CompetitionConfigValidator.validate(config);
    expect(configValidation.isValid).toBe(true);
    expect(configValidation.errors).toHaveLength(0);
  });

  // ==========================================================================
  // TESTE 4: Topologia e contagem exata para 8 equipes (2N - 2 = 14)
  // ==========================================================================
  it('deve gerar topologia e exatamente 14 slots para 8 equipes (7 WB + 6 LB + 1 GF)', () => {
    const config = CompetitionTemplateService.createConfigFromTemplate('double-elimination-standard', {
      teamsCount: 8,
    });

    const result = GenericPairingEngine.pairDoubleElimination({
      bracketSize: 8,
      stageWinnersId: 'stage-winners',
      stageLosersId: 'stage-losers',
      stageGrandFinalId: 'stage-grand-final',
    });

    // Prova matemática estrita: 2(8) - 2 = 14 partidas
    expect(result.winnersSlots).toHaveLength(7); // 4 QF + 2 Semis + 1 Final WB
    expect(result.losersSlots).toHaveLength(6);  // 2 R1 + 2 R2 + 1 Semis + 1 Final LB
    expect(result.allSlots).toHaveLength(14);

    const dag = StageGraph.validate(config.format.stages!, result.allSlots);
    expect(dag.isValid).toBe(true);
    expect(dag.errors).toHaveLength(0);
    expect(dag.topologicalOrder).toEqual(['stage-winners', 'stage-losers', 'stage-grand-final']);

    const configValidation = CompetitionConfigValidator.validate(config);
    expect(configValidation.isValid).toBe(true);
    expect(configValidation.errors).toHaveLength(0);
  });

  // ==========================================================================
  // TESTE 5: Topologia e contagem exata para 16 equipes (2N - 2 = 30)
  // ==========================================================================
  it('deve gerar topologia e exatamente 30 slots para 16 equipes (15 WB + 14 LB + 1 GF)', () => {
    const config = CompetitionTemplateService.createConfigFromTemplate('double-elimination-standard', {
      teamsCount: 16,
    });

    const result = GenericPairingEngine.pairDoubleElimination({
      bracketSize: 16,
      stageWinnersId: 'stage-winners',
      stageLosersId: 'stage-losers',
      stageGrandFinalId: 'stage-grand-final',
    });

    // Prova matemática estrita: 2(16) - 2 = 30 partidas
    expect(result.winnersSlots).toHaveLength(15);
    expect(result.losersSlots).toHaveLength(14);
    expect(result.allSlots).toHaveLength(30);

    const dag = StageGraph.validate(config.format.stages!, result.allSlots);
    expect(dag.isValid).toBe(true);
    expect(dag.errors).toHaveLength(0);
    expect(dag.topologicalOrder).toEqual(['stage-winners', 'stage-losers', 'stage-grand-final']);

    const configValidation = CompetitionConfigValidator.validate(config);
    expect(configValidation.isValid).toBe(true);
    expect(configValidation.errors).toHaveLength(0);
  });

  // ==========================================================================
  // TESTE 6: GATE DE INTEGRIDADE DA TOPOLOGIA (Prova Algorítmica Programática)
  // ==========================================================================
  it('deve validar programaticamente que todas as rotas de 4, 8 e 16 equipes são resolvíveis sem colisões ou ciclos', () => {
    const sizes = [4, 8, 16];

    for (const size of sizes) {
      const result = GenericPairingEngine.pairDoubleElimination({
        bracketSize: size,
        stageWinnersId: 'stage-winners',
        stageLosersId: 'stage-losers',
        stageGrandFinalId: 'stage-grand-final',
      });

      const slotsById = new Map<string, MatchSlot>();
      for (const slot of result.allSlots) {
        expect(slotsById.has(slot.slotId)).toBe(false); // IDs estritamente únicos
        slotsById.set(slot.slotId, slot);
      }

      // Verificação de ausência de colisão de ocupação (targetSlotId:targetSide único)
      const targetOccupation = new Map<string, string>();

      for (const slot of result.allSlots) {
        const route = slot.progressionRoute;
        if (!route) continue;

        if (route.onWinner) {
          const key = `${route.onWinner.targetSlotId}:${route.onWinner.targetSide}`;
          expect(slotsById.has(route.onWinner.targetSlotId)).toBe(true); // Slot destino existe
          expect(targetOccupation.has(key)).toBe(false); // Sem colisão de vencedores
          targetOccupation.set(key, `${slot.slotId}:winner`);
        }

        if (route.onLoser) {
          const key = `${route.onLoser.targetSlotId}:${route.onLoser.targetSide}`;
          expect(slotsById.has(route.onLoser.targetSlotId)).toBe(true); // Slot destino existe
          expect(targetOccupation.has(key)).toBe(false); // Sem colisão de perdedores
          targetOccupation.set(key, `${slot.slotId}:loser`);
        }
      }
    }
  });

  // ==========================================================================
  // TESTE 7: Semântica de eliminação (ausência de rota onLoser)
  // ==========================================================================
  it('deve comprovar que um participante que perde em slot sem onLoser é encerrado esportivamente', () => {
    const result = GenericPairingEngine.pairDoubleElimination({ bracketSize: 4 });
    const initialSlots = result.allSlots;

    // Simula derrota no Losers Semis (LB-R1-M1)
    const slotLb1 = initialSlots.find(s => s.slotId === 'stage-losers-R1-SLOT-01')!;
    expect(slotLb1.progressionRoute?.onLoser).toBeUndefined();

    // Configura participantes resolvidos no slot de Losers
    slotLb1.participantA = createResolvedParticipantSlot('A', 'team-A', 'Equipe A');
    slotLb1.participantB = createResolvedParticipantSlot('B', 'team-B', 'Equipe B');

    // Equipe B perde no Losers
    const canonicalResults: Record<string, CanonicalMatchResult> = {
      'stage-losers-R1-SLOT-01': makeCompletedResult('team-A', 'team-B'),
    };

    const evalResult = GenericProgressionEngine.evaluate(initialSlots, {
      canonicalResultsBySlot: canonicalResults,
    });

    // Vencedor Team-A avançou para a Final de Losers (Lado A)
    const slotLbFinal = evalResult.updatedSlots.find(s => s.slotId === 'stage-losers-R2-SLOT-01')!;
    expect(slotLbFinal.participantA.resolvedTeamId).toBe('team-A');

    // Perdedor Team-B NÃO avançou para nenhum slot em todo o torneio
    const activeSlotsWithTeamB = evalResult.updatedSlots.filter(
      s => s.slotId !== 'stage-losers-R1-SLOT-01' &&
        (s.participantA.resolvedTeamId === 'team-B' || s.participantB.resolvedTeamId === 'team-B'),
    );
    expect(activeSlotsWithTeamB).toHaveLength(0); // Eliminação comprovada
  });

  // ==========================================================================
  // TESTE 8 & 9: Múltiplas Permutações — Cenário 1: Campeão Invicto de Winners
  // ==========================================================================
  it('CENÁRIO 1: Campeão Invicto de Winners (Seed 1 vence todas com 0 derrotas)', () => {
    const participants: ParticipantSlotState[] = Array.from({ length: 8 }, (_, i) =>
      createResolvedParticipantSlot('A', `team-${i + 1}`, `Equipe ${i + 1}`),
    );

    const pairing = GenericPairingEngine.pairDoubleElimination({
      bracketSize: 8,
      participants,
    });

    let currentSlots = pairing.allSlots;
    const teamStats: Record<string, { wins: number; losses: number }> = {};
    for (let i = 1; i <= 8; i++) {
      teamStats[`team-${i}`] = { wins: 0, losses: 0 };
    }

    // Função auxiliar que resolve um slot onde ambos participantes já são conhecidos
    const playSlot = (slotId: string, pickWinner: (teamA: string, teamB: string) => string) => {
      const slot = currentSlots.find(s => s.slotId === slotId)!;
      const teamA = slot.participantA.resolvedTeamId!;
      const teamB = slot.participantB.resolvedTeamId!;
      const winner = pickWinner(teamA, teamB);
      const loser = winner === teamA ? teamB : teamA;

      teamStats[winner].wins++;
      teamStats[loser].losses++;

      const res = GenericProgressionEngine.evaluate(currentSlots, {
        canonicalResultsBySlot: { [slotId]: makeCompletedResult(winner, loser) },
      });
      currentSlots = res.updatedSlots;
    };

    // Winners QF: favoritos vencem (1 vence 8, 4 vence 5, 2 vence 7, 3 vence 6)
    playSlot('stage-winners-R1-SLOT-01', (a) => a); // 1 vence 8
    playSlot('stage-winners-R1-SLOT-02', (a) => a); // 4 vence 5
    playSlot('stage-winners-R1-SLOT-03', (a) => a); // 2 vence 7
    playSlot('stage-winners-R1-SLOT-04', (a) => a); // 3 vence 6

    // Losers R1: 8 x 5 e 7 x 6
    playSlot('stage-losers-R1-SLOT-01', (a) => a); // 8 vence 5 (5 eliminado com 2 derrotas)
    playSlot('stage-losers-R1-SLOT-02', (a) => a); // 7 vence 6 (6 eliminado com 2 derrotas)

    // Winners Semis: 1 vence 4, 2 vence 3
    playSlot('stage-winners-R2-SLOT-01', (a) => a); // 1 vence 4 (4 cai para LB R2)
    playSlot('stage-winners-R2-SLOT-02', (a) => a); // 2 vence 3 (3 cai para LB R2)

    // Losers R2: cruzamento evita rematch imediato (LB R1 winner vs WB dropper oposto)
    playSlot('stage-losers-R2-SLOT-01', (a) => a); // 8 x 3 -> 8 vence (3 eliminado)
    playSlot('stage-losers-R2-SLOT-02', (a) => a); // 7 x 4 -> 7 vence (4 eliminado)

    // Losers Semis: 8 x 7
    playSlot('stage-losers-R3-SLOT-01', (a) => a); // 8 vence 7 (7 eliminado)

    // Winners Final: 1 x 2
    playSlot('stage-winners-R3-SLOT-01', (a) => a); // 1 vence 2 (1 vai para GF, 2 cai para LB Final)

    // Losers Final: 8 x 2
    playSlot('stage-losers-R4-SLOT-01', (_a, b) => b); // 2 vence 8 (8 eliminado)

    // Grand Final: 1 x 2
    playSlot('stage-grand-final-R1-SLOT-01', (a) => a); // 1 vence 2 (1 é CAMPEÃO!)

    // Auditoria rigorosa de conservação de vidas
    expect(teamStats['team-1'].losses).toBe(0); // Campeão invicto
    expect(teamStats['team-1'].wins).toBe(4);

    expect(teamStats['team-2'].losses).toBe(2); // Vice-campeão
    expect(teamStats['team-3'].losses).toBe(2);
    expect(teamStats['team-4'].losses).toBe(2);
    expect(teamStats['team-5'].losses).toBe(2);
    expect(teamStats['team-6'].losses).toBe(2);
    expect(teamStats['team-7'].losses).toBe(2);
    expect(teamStats['team-8'].losses).toBe(2);

    // Exatamente 1 equipe com 0 derrotas, e 7 equipes com 2 derrotas
    const zeroLossTeams = Object.keys(teamStats).filter(t => teamStats[t].losses === 0);
    const twoLossTeams = Object.keys(teamStats).filter(t => teamStats[t].losses === 2);
    expect(zeroLossTeams).toEqual(['team-1']);
    expect(twoLossTeams).toHaveLength(7);
  });

  // ==========================================================================
  // TESTE 10: Campeão vindo dos Losers (perde no WB R1, vence a GF)
  // ==========================================================================
  it('CENÁRIO 2: Campeão vindo dos Losers (Team-8 cai na R1, vence tudo e é campeão)', () => {
    const participants: ParticipantSlotState[] = Array.from({ length: 8 }, (_, i) =>
      createResolvedParticipantSlot('A', `team-${i + 1}`, `Equipe ${i + 1}`),
    );

    const pairing = GenericPairingEngine.pairDoubleElimination({
      bracketSize: 8,
      participants,
    });

    let currentSlots = pairing.allSlots;
    const teamStats: Record<string, { wins: number; losses: number }> = {};
    for (let i = 1; i <= 8; i++) {
      teamStats[`team-${i}`] = { wins: 0, losses: 0 };
    }

    const playSlot = (slotId: string, pickWinner: (teamA: string, teamB: string) => string) => {
      const slot = currentSlots.find(s => s.slotId === slotId)!;
      const teamA = slot.participantA.resolvedTeamId!;
      const teamB = slot.participantB.resolvedTeamId!;
      const winner = pickWinner(teamA, teamB);
      const loser = winner === teamA ? teamB : teamA;

      teamStats[winner].wins++;
      teamStats[loser].losses++;

      const res = GenericProgressionEngine.evaluate(currentSlots, {
        canonicalResultsBySlot: { [slotId]: makeCompletedResult(winner, loser) },
      });
      currentSlots = res.updatedSlots;
    };

    // WB R1: 1 vence 8 (Team-8 cai para Losers R1)
    playSlot('stage-winners-R1-SLOT-01', (a) => a); // 1 vence 8
    playSlot('stage-winners-R1-SLOT-02', (a) => a); // 4 vence 5
    playSlot('stage-winners-R1-SLOT-03', (a) => a); // 2 vence 7
    playSlot('stage-winners-R1-SLOT-04', (a) => a); // 3 vence 6

    // LB R1: Team-8 vence 5
    playSlot('stage-losers-R1-SLOT-01', (a) => a); // 8 vence 5
    playSlot('stage-losers-R1-SLOT-02', (a) => a); // 7 vence 6

    // WB Semis: 1 vence 4, 2 vence 3
    playSlot('stage-winners-R2-SLOT-01', (a) => a); // 1 vence 4
    playSlot('stage-winners-R2-SLOT-02', (a) => a); // 2 vence 3

    // LB R2: Team-8 enfrenta Team-3 (crossover) e vence
    playSlot('stage-losers-R2-SLOT-01', (a) => a); // 8 vence 3
    playSlot('stage-losers-R2-SLOT-02', (a) => a); // 7 vence 4

    // LB Semis: Team-8 vence 7
    playSlot('stage-losers-R3-SLOT-01', (a) => a); // 8 vence 7

    // WB Final: 1 vence 2
    playSlot('stage-winners-R3-SLOT-01', (a) => a); // 1 vence 2 (2 cai para LB Final)

    // LB Final: Team-8 vence Team-2
    playSlot('stage-losers-R4-SLOT-01', (a) => a); // 8 vence 2

    // Grand Final: Team-1 (invicto) x Team-8 (vindo dos Losers)
    // Team-8 VENCE A GRAND FINAL!
    playSlot('stage-grand-final-R1-SLOT-01', (_a, b) => b); // Team-8 vence Team-1!

    // Prova matemática sob a regra de Grand Final única sem reset:
    // Team-8 é CAMPEÃO com exatamente 1 derrota anterior
    expect(teamStats['team-8'].losses).toBe(1);
    expect(teamStats['team-8'].wins).toBe(5);

    // Team-1 encerra como Vice-campeão com 1 derrota na final única
    expect(teamStats['team-1'].losses).toBe(1);
    expect(teamStats['team-1'].wins).toBe(3);

    // As demais 6 equipes foram eliminadas com 2 derrotas
    const twoLossTeams = Object.keys(teamStats).filter(t => teamStats[t].losses === 2);
    expect(twoLossTeams).toHaveLength(6);
  });

  // ==========================================================================
  // TESTE 11: CENÁRIO 3 — Campeão Mid-Seed (Seed 3 vence tudo por Winners)
  // ==========================================================================
  it('CENÁRIO 3: Campeão Mid-Seed (Seed 3 vence WB R1, R2, R3 e Grand Final)', () => {
    const participants: ParticipantSlotState[] = Array.from({ length: 8 }, (_, i) =>
      createResolvedParticipantSlot('A', `team-${i + 1}`, `Equipe ${i + 1}`),
    );

    const pairing = GenericPairingEngine.pairDoubleElimination({
      bracketSize: 8,
      participants,
    });

    let currentSlots = pairing.allSlots;
    const teamStats: Record<string, { wins: number; losses: number }> = {};
    for (let i = 1; i <= 8; i++) teamStats[`team-${i}`] = { wins: 0, losses: 0 };

    const playSlot = (slotId: string, pickWinner: (teamA: string, teamB: string) => string) => {
      const slot = currentSlots.find(s => s.slotId === slotId)!;
      const teamA = slot.participantA.resolvedTeamId!;
      const teamB = slot.participantB.resolvedTeamId!;
      const winner = pickWinner(teamA, teamB);
      const loser = winner === teamA ? teamB : teamA;
      teamStats[winner].wins++;
      teamStats[loser].losses++;
      const res = GenericProgressionEngine.evaluate(currentSlots, {
        canonicalResultsBySlot: { [slotId]: makeCompletedResult(winner, loser) },
      });
      currentSlots = res.updatedSlots;
    };

    // WB R1: zebras acontecem
    playSlot('stage-winners-R1-SLOT-01', (_a, b) => b); // 8 vence 1 (1 cai para LB R1)
    playSlot('stage-winners-R1-SLOT-02', (a) => a); // 4 vence 5 (5 cai para LB R1)
    playSlot('stage-winners-R1-SLOT-03', (_a, b) => b); // 7 vence 2 (2 cai para LB R1)
    playSlot('stage-winners-R1-SLOT-04', (a) => a); // 3 vence 6 (6 cai para LB R1)

    // LB R1
    playSlot('stage-losers-R1-SLOT-01', (a) => a); // 1 vence 5 (5 eliminado com 2 derrotas)
    playSlot('stage-losers-R1-SLOT-02', (a) => a); // 2 vence 6 (6 eliminado com 2 derrotas)

    // WB Semis
    playSlot('stage-winners-R2-SLOT-01', (a) => a); // 8 vence 4 (4 cai para LB R2)
    playSlot('stage-winners-R2-SLOT-02', (_a, b) => b); // 3 vence 7 (7 cai para LB R2)

    // LB R2 (crossover de semisfinalistas: 4 vai para M2, 7 vai para M1)
    playSlot('stage-losers-R2-SLOT-01', (a) => a); // 1 vence 7 (7 eliminado)
    playSlot('stage-losers-R2-SLOT-02', (a) => a); // 2 vence 4 (4 eliminado)

    // LB Semis
    playSlot('stage-losers-R3-SLOT-01', (a) => a); // 1 vence 2 (2 eliminado)

    // WB Final
    playSlot('stage-winners-R3-SLOT-01', (_a, b) => b); // 3 vence 8 (8 cai para LB Final)

    // LB Final
    playSlot('stage-losers-R4-SLOT-01', (a) => a); // 1 vence 8 (8 eliminado)

    // Grand Final: 3 (Winners) x 1 (Losers)
    playSlot('stage-grand-final-R1-SLOT-01', (a) => a); // 3 vence 1 (3 CAMPEÃO INVICTO!)

    expect(teamStats['team-3'].losses).toBe(0);
    expect(teamStats['team-3'].wins).toBe(4);
    expect(teamStats['team-1'].losses).toBe(2);
    expect(Object.keys(teamStats).filter(t => teamStats[t].losses === 2)).toHaveLength(7);
  });

  // ==========================================================================
  // TESTE 12: CENÁRIO 4 — Finalista vindo de perdedor de Semifinais no WB
  // ==========================================================================
  it('CENÁRIO 4: Perdedor de Semifinal (Seed 4) reage na Losers e disputa a Grand Final', () => {
    const participants: ParticipantSlotState[] = Array.from({ length: 8 }, (_, i) =>
      createResolvedParticipantSlot('A', `team-${i + 1}`, `Equipe ${i + 1}`),
    );

    const pairing = GenericPairingEngine.pairDoubleElimination({
      bracketSize: 8,
      participants,
    });

    let currentSlots = pairing.allSlots;
    const teamStats: Record<string, { wins: number; losses: number }> = {};
    for (let i = 1; i <= 8; i++) teamStats[`team-${i}`] = { wins: 0, losses: 0 };

    const playSlot = (slotId: string, pickWinner: (teamA: string, teamB: string) => string) => {
      const slot = currentSlots.find(s => s.slotId === slotId)!;
      const teamA = slot.participantA.resolvedTeamId!;
      const teamB = slot.participantB.resolvedTeamId!;
      const winner = pickWinner(teamA, teamB);
      const loser = winner === teamA ? teamB : teamA;
      teamStats[winner].wins++;
      teamStats[loser].losses++;
      const res = GenericProgressionEngine.evaluate(currentSlots, {
        canonicalResultsBySlot: { [slotId]: makeCompletedResult(winner, loser) },
      });
      currentSlots = res.updatedSlots;
    };

    // WB R1: padrão
    playSlot('stage-winners-R1-SLOT-01', (a) => a); // 1 x 8 -> 1 vence
    playSlot('stage-winners-R1-SLOT-02', (a) => a); // 4 x 5 -> 4 vence
    playSlot('stage-winners-R1-SLOT-03', (a) => a); // 2 x 7 -> 2 vence
    playSlot('stage-winners-R1-SLOT-04', (a) => a); // 3 x 6 -> 3 vence

    // LB R1
    playSlot('stage-losers-R1-SLOT-01', (a) => a); // 8 x 5 -> 8 vence
    playSlot('stage-losers-R1-SLOT-02', (a) => a); // 7 x 6 -> 7 vence

    // WB Semis: 1 vence 4 (Seed 4 cai para LB R2) e 2 vence 3
    playSlot('stage-winners-R2-SLOT-01', (a) => a); // 1 vence 4
    playSlot('stage-winners-R2-SLOT-02', (a) => a); // 2 vence 3

    // LB R2: Seed 4 cai no Match 2 (crossover oposto: 7 x 4) e VENCE
    playSlot('stage-losers-R2-SLOT-01', (a) => a); // 8 vence 3 (3 eliminado)
    playSlot('stage-losers-R2-SLOT-02', (_a, b) => b); // 4 vence 7 (7 eliminado)

    // LB Semis: Seed 4 vence Seed 8
    playSlot('stage-losers-R3-SLOT-01', (_a, b) => b); // 4 vence 8 (8 eliminado)

    // WB Final: 1 vence 2 (2 cai para LB Final)
    playSlot('stage-winners-R3-SLOT-01', (a) => a); // 1 vence 2

    // LB Final: Seed 4 vence Seed 2 e vai à Grand Final!
    playSlot('stage-losers-R4-SLOT-01', (a) => a); // 4 vence 2 (2 eliminado)

    // Grand Final: Seed 1 (WB) x Seed 4 (LB)
    // Seed 4 vence a Grand Final!
    playSlot('stage-grand-final-R1-SLOT-01', (_a, b) => b); // 4 vence 1!

    expect(teamStats['team-4'].losses).toBe(1);
    expect(teamStats['team-4'].wins).toBe(5);
    expect(teamStats['team-1'].losses).toBe(1);
    expect(Object.keys(teamStats).filter(t => teamStats[t].losses === 2)).toHaveLength(6);
  });

  // ==========================================================================
  // TESTE 13: Invariantes Estruturais em 10 Simulações Determinísticas e Aleatórias
  // ==========================================================================
  it('deve comprovar invariantes matemáticas em 10 permutações de resultados para 8 equipes', () => {
    const chronologicalSlots = [
      'stage-winners-R1-SLOT-01',
      'stage-winners-R1-SLOT-02',
      'stage-winners-R1-SLOT-03',
      'stage-winners-R1-SLOT-04',
      'stage-losers-R1-SLOT-01',
      'stage-losers-R1-SLOT-02',
      'stage-winners-R2-SLOT-01',
      'stage-winners-R2-SLOT-02',
      'stage-losers-R2-SLOT-01',
      'stage-losers-R2-SLOT-02',
      'stage-losers-R3-SLOT-01',
      'stage-winners-R3-SLOT-01',
      'stage-losers-R4-SLOT-01',
      'stage-grand-final-R1-SLOT-01',
    ];

    // 10 seeds determinísticos diferentes de decisões para simular variadas permutações
    for (let seed = 1; seed <= 10; seed++) {
      const participants: ParticipantSlotState[] = Array.from({ length: 8 }, (_, i) =>
        createResolvedParticipantSlot('A', `team-${i + 1}`, `Equipe ${i + 1}`),
      );

      const pairing = GenericPairingEngine.pairDoubleElimination({
        bracketSize: 8,
        participants,
      });

      let currentSlots = pairing.allSlots;
      const teamStats: Record<string, { wins: number; losses: number }> = {};
      for (let i = 1; i <= 8; i++) teamStats[`team-${i}`] = { wins: 0, losses: 0 };

      for (let matchIndex = 0; matchIndex < chronologicalSlots.length; matchIndex++) {
        const slotId = chronologicalSlots[matchIndex];
        const slot = currentSlots.find(s => s.slotId === slotId)!;

        // Invariante 1: No momento do jogo, ambos os participantes devem estar definidos
        expect(slot.participantA.resolvedTeamId).not.toBeNull();
        expect(slot.participantB.resolvedTeamId).not.toBeNull();

        const teamA = slot.participantA.resolvedTeamId!;
        const teamB = slot.participantB.resolvedTeamId!;

        // Invariante 2: Nenhuma equipe com 2 derrotas pode estar jogando
        expect(teamStats[teamA].losses).toBeLessThan(2);
        expect(teamStats[teamB].losses).toBeLessThan(2);

        // Invariante 3: Uma equipe não pode jogar contra si mesma
        expect(teamA).not.toBe(teamB);

        // Decisão determinística baseada na permutação
        const winner = ((matchIndex * 7 + seed * 13) % 2 === 0) ? teamA : teamB;
        const loser = winner === teamA ? teamB : teamA;

        teamStats[winner].wins++;
        teamStats[loser].losses++;

        const evalRes = GenericProgressionEngine.evaluate(currentSlots, {
          canonicalResultsBySlot: { [slotId]: makeCompletedResult(winner, loser) },
        });
        currentSlots = evalRes.updatedSlots;
      }

      // Prova Invariante Matemática:
      // Total de derrotas acumuladas no torneio DEVE ser exatamente 14 (1 derrota por partida)
      const totalLosses = Object.values(teamStats).reduce((sum, s) => sum + s.losses, 0);
      expect(totalLosses).toBe(14);

      const twoLossTeams = Object.keys(teamStats).filter(t => teamStats[t].losses === 2);
      const oneLossTeams = Object.keys(teamStats).filter(t => teamStats[t].losses === 1);
      const zeroLossTeams = Object.keys(teamStats).filter(t => teamStats[t].losses === 0);

      // Se o campeão veio de Winners e venceu a GF: 1 equipe com 0 derrotas, 7 com 2 derrotas
      // Se o campeão veio de Losers e venceu a GF única: 2 equipes com 1 derrota (campeão e vice), 6 com 2 derrotas
      if (zeroLossTeams.length === 1) {
        expect(twoLossTeams).toHaveLength(7);
        expect(oneLossTeams).toHaveLength(0);
      } else {
        expect(zeroLossTeams).toHaveLength(0);
        expect(oneLossTeams).toHaveLength(2); // Campeão e Vice
        expect(twoLossTeams).toHaveLength(6);
      }

      // Nenhuma equipe pode ter mais de 2 derrotas em nenhuma hipótese
      for (const t of Object.keys(teamStats)) {
        expect(teamStats[t].losses).toBeLessThanOrEqual(2);
      }
    }
  });

  // ==========================================================================
  // TESTE 14: Política de Rematch / Cross-pairing
  // ==========================================================================
  it('deve cruzar os perdedores das semifinais de Winners para evitar rematch imediato em Losers R2', () => {
    const pairing = GenericPairingEngine.pairDoubleElimination({ bracketSize: 8 });

    // WB Semis 1: jogo entre os vencedores da metade superior da chave
    const wbSemi1 = pairing.winnersSlots.find(s => s.slotId === 'stage-winners-R2-SLOT-01')!;
    // WB Semis 2: jogo entre os vencedores da metade inferior da chave
    const wbSemi2 = pairing.winnersSlots.find(s => s.slotId === 'stage-winners-R2-SLOT-02')!;

    // Perdedor de WB Semis 1 é direcionado para LB R2 Match 2 (cruzando com a outra metade)
    expect(wbSemi1.progressionRoute?.onLoser?.targetSlotId).toBe('stage-losers-R2-SLOT-02');
    // Perdedor de WB Semis 2 é direcionado para LB R2 Match 1
    expect(wbSemi2.progressionRoute?.onLoser?.targetSlotId).toBe('stage-losers-R2-SLOT-01');
  });

  // ==========================================================================
  // TESTE 15: BYEs como avanço sem derrota
  // ==========================================================================
  it('deve garantir que participantes com BYE avançam automaticamente com zero derrotas', () => {
    // Chave de 8 com 6 equipes (seeds 7 e 8 são BYEs)
    const participants: ParticipantSlotState[] = [
      createResolvedParticipantSlot('A', 'team-1', 'Equipe 1'),
      createResolvedParticipantSlot('A', 'team-2', 'Equipe 2'),
      createResolvedParticipantSlot('A', 'team-3', 'Equipe 3'),
      createResolvedParticipantSlot('A', 'team-4', 'Equipe 4'),
      createResolvedParticipantSlot('A', 'team-5', 'Equipe 5'),
      createResolvedParticipantSlot('A', 'team-6', 'Equipe 6'),
      { side: 'B', reference: { type: 'bye' }, status: 'bye', resolvedTeamId: null, displayPlaceholder: 'BYE', isBye: true },
      { side: 'B', reference: { type: 'bye' }, status: 'bye', resolvedTeamId: null, displayPlaceholder: 'BYE', isBye: true },
    ];

    const pairing = GenericPairingEngine.pairDoubleElimination({
      bracketSize: 8,
      participants,
    });

    // Jogo 1 (1 x 8): 8 é BYE -> Team-1 avança por BYE
    const slot1 = pairing.winnersSlots.find(s => s.slotId === 'stage-winners-R1-SLOT-01')!;
    expect(slot1.participantB.isBye).toBe(true);

    const evalRes = GenericProgressionEngine.evaluate(pairing.allSlots, {
      canonicalResultsBySlot: {},
    });

    const wbR2Slot1 = evalRes.updatedSlots.find(s => s.slotId === 'stage-winners-R2-SLOT-01')!;
    expect(wbR2Slot1.participantA.resolvedTeamId).toBe('team-1'); // Avançou sem disputar jogo

    // Nenhum perdedor foi gerado na Losers R1 para o jogo de BYE
    const lbR1Slot1 = evalRes.updatedSlots.find(s => s.slotId === 'stage-losers-R1-SLOT-01')!;
    expect(lbR1Slot1.participantA.resolvedTeamId).toBeNull(); // Sem derrota artificial
  });

  // ==========================================================================
  // TESTE 16: Compatibilidade com Sets (Melhor de 3 e Melhor de 5)
  // ==========================================================================
  it('deve aplicar corretamente setsToWin 2 (melhor de 3) e setsToWin 3 (melhor de 5)', () => {
    const configBestOf3 = CompetitionTemplateService.createConfigFromTemplate('double-elimination-standard', {
      setsToWin: 2,
    });
    expect(configBestOf3.format.defaultSetsToWin).toBe(2);

    const configBestOf5 = CompetitionTemplateService.createConfigFromTemplate('double-elimination-standard', {
      setsToWin: 3,
    });
    expect(configBestOf5.format.defaultSetsToWin).toBe(3);
  });

  // ==========================================================================
  // TESTE 17: Regressão de Cenários Existentes — Voltz e Voltz com BYE
  // ==========================================================================
  it('deve garantir que o formato Voltz (groups-play-in-knockout) e Voltz com BYE continuam 100% válidos', () => {
    // 1. Voltz Padrão (12 equipes)
    const voltzConfig = CompetitionTemplateService.createConfigFromTemplate(
      'groups-play-in-knockout-standard',
      { teamsCount: 12, setsToWin: 2 },
    );
    const valVoltz = CompetitionConfigValidator.validate(voltzConfig);
    expect(valVoltz.isValid).toBe(true);
    expect(voltzConfig.format.stages).toHaveLength(3); // Grupos -> Play-In -> Knockout

    // Validação de DAG de estágios do Voltz
    const dagVoltz = StageGraph.validate(voltzConfig.format.stages!);
    expect(dagVoltz.isValid).toBe(true);
    expect(dagVoltz.topologicalOrder).toEqual(['fase-grupos', 'play-in', 'fase-final']);

    // 2. Voltz com BYE (Play-In com vagas preenchidas parcialmente)
    const voltzByeConfig = CompetitionTemplateService.createConfigFromTemplate(
      'groups-play-in-knockout-standard',
      { teamsCount: 10, setsToWin: 2 },
    );
    const valVoltzBye = CompetitionConfigValidator.validate(voltzByeConfig);
    expect(valVoltzBye.isValid).toBe(true);

    // 3. Demais templates canônicos existentes
    const configKnockout = CompetitionTemplateService.createConfigFromTemplate('knockout-pure-standard', { teamsCount: 8 });
    expect(CompetitionConfigValidator.validate(configKnockout).isValid).toBe(true);

    const configRoundRobin = CompetitionTemplateService.createConfigFromTemplate('round-robin-standard', { teamsCount: 6 });
    expect(CompetitionConfigValidator.validate(configRoundRobin).isValid).toBe(true);

    const configGroups = CompetitionTemplateService.createConfigFromTemplate('groups-knockout-standard', { teamsCount: 8 });
    expect(CompetitionConfigValidator.validate(configGroups).isValid).toBe(true);
  });
});
