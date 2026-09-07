import { describe, it, expect } from 'vitest';
import { CompetitionRulesService } from '@/services/competitionRulesService';
import { CompetitionLifecycleService } from '@/services/competitionLifecycleService';
import type { CompetitionRecord, MatchRecord } from '@/types/entities';

describe('Fase 4.5 — Resultado Canônico da Partida (CanonicalMatchResult)', () => {
  const baseIndoorComp: CompetitionRecord = {
    id: 'comp-canon-1',
    name: 'Copa Canônica Indoor 2026',
    modality: 'indoor',
    format: 'groups',
    playerFormat: '6x6',
    setFormat: '5-sets', // Melhor de 5 sets (3 para vencer)
    genderCategory: 'male',
    status: 'in-progress',
  };

  const baseBeachComp: CompetitionRecord = {
    id: 'comp-canon-2',
    name: 'Circuito Canônico Praia 2026',
    modality: 'beach',
    format: 'groups',
    playerFormat: '2x2',
    setFormat: '3-sets', // Melhor de 3 sets (2 para vencer, 21 pts)
    genderCategory: 'female',
    status: 'in-progress',
  };

  const sampleMatch: MatchRecord = {
    id: 'match-canon-1',
    competitionId: 'comp-canon-1',
    round: 1,
    matchNumber: 1,
    teamAId: 'team-a',
    teamBId: 'team-b',
    teamAName: 'Time A',
    teamBName: 'Time B',
    teamAShortName: 'TMA',
    teamBShortName: 'TMB',
    venue: 'Ginásio 1',
    scheduledTime: '2026-09-03T10:00:00Z',
    status: 'scheduled',
    sets: [],
    referees: [],
    createdAt: '2026-09-03T00:00:00Z',
    updatedAt: '2026-09-03T00:00:00Z',
  };

  it('partida sem resultado/agendada: retorna estado pendente e válido=false', () => {
    const res = CompetitionRulesService.getCanonicalMatchResult(baseIndoorComp, sampleMatch);
    expect(res.isValid).toBe(false);
    expect(res.isCompleted).toBe(false);
    expect(res.winnerId).toBeNull();
    expect(res.setsWonA).toBe(0);
    expect(res.setsWonB).toBe(0);
    expect(res.isInconsistent).toBe(false);
  });

  it('vitória 3x0 (limpa): deriva vencedor A, sets 3x0 e pontos totais', () => {
    const match: MatchRecord = {
      ...sampleMatch,
      status: 'completed',
      sets: [
        { setNumber: 1, scoreA: 25, scoreB: 18 },
        { setNumber: 2, scoreA: 25, scoreB: 20 },
        { setNumber: 3, scoreA: 25, scoreB: 22 },
      ],
      winnerId: 'team-a',
    };

    const res = CompetitionRulesService.getCanonicalMatchResult(baseIndoorComp, match);
    expect(res.isValid).toBe(true);
    expect(res.isCompleted).toBe(true);
    expect(res.winnerId).toBe('team-a');
    expect(res.loserId).toBe('team-b');
    expect(res.winnerSide).toBe('A');
    expect(res.setsWonA).toBe(3);
    expect(res.setsWonB).toBe(0);
    expect(res.pointsScoredA).toBe(75);
    expect(res.pointsScoredB).toBe(60);
    expect(res.isInconsistent).toBe(false);
  });

  it('vitória 3x1: deriva vencedor e contagem correta de parciais', () => {
    const match: MatchRecord = {
      ...sampleMatch,
      status: 'completed',
      sets: [
        { setNumber: 1, scoreA: 25, scoreB: 20 },
        { setNumber: 2, scoreA: 21, scoreB: 25 },
        { setNumber: 3, scoreA: 25, scoreB: 19 },
        { setNumber: 4, scoreA: 25, scoreB: 23 },
      ],
      winnerId: 'team-a',
    };

    const res = CompetitionRulesService.getCanonicalMatchResult(baseIndoorComp, match);
    expect(res.isValid).toBe(true);
    expect(res.winnerId).toBe('team-a');
    expect(res.setsWonA).toBe(3);
    expect(res.setsWonB).toBe(1);
    expect(res.pointsScoredA).toBe(96);
    expect(res.pointsScoredB).toBe(87);
  });

  it('vitória 3x2 (apertada com tiebreak): valida 15 pontos no 5º set', () => {
    const match: MatchRecord = {
      ...sampleMatch,
      status: 'completed',
      sets: [
        { setNumber: 1, scoreA: 25, scoreB: 20 },
        { setNumber: 2, scoreA: 20, scoreB: 25 },
        { setNumber: 3, scoreA: 25, scoreB: 22 },
        { setNumber: 4, scoreA: 22, scoreB: 25 },
        { setNumber: 5, scoreA: 15, scoreB: 13 },
      ],
      winnerId: 'team-a',
    };

    const res = CompetitionRulesService.getCanonicalMatchResult(baseIndoorComp, match);
    expect(res.isValid).toBe(true);
    expect(res.setsWonA).toBe(3);
    expect(res.setsWonB).toBe(2);
    expect(res.winnerId).toBe('team-a');
    expect(res.loserId).toBe('team-b');
  });

  it('derrota 2x3: deriva equipe B como vencedora', () => {
    const match: MatchRecord = {
      ...sampleMatch,
      status: 'completed',
      sets: [
        { setNumber: 1, scoreA: 25, scoreB: 20 },
        { setNumber: 2, scoreA: 20, scoreB: 25 },
        { setNumber: 3, scoreA: 25, scoreB: 22 },
        { setNumber: 4, scoreA: 22, scoreB: 25 },
        { setNumber: 5, scoreA: 13, scoreB: 15 },
      ],
      winnerId: 'team-b',
    };

    const res = CompetitionRulesService.getCanonicalMatchResult(baseIndoorComp, match);
    expect(res.isValid).toBe(true);
    expect(res.winnerId).toBe('team-b');
    expect(res.loserId).toBe('team-a');
    expect(res.winnerSide).toBe('B');
    expect(res.setsWonA).toBe(2);
    expect(res.setsWonB).toBe(3);
  });

  it('W.O. regulamentar: atribui placar e pontos canônicos mesmo com sets vazios', () => {
    const woMatch: MatchRecord = {
      ...sampleMatch,
      status: 'completed',
      isWo: true,
      winnerId: 'team-a',
      sets: [],
    };

    const res = CompetitionRulesService.getCanonicalMatchResult(baseIndoorComp, woMatch);
    expect(res.isValid).toBe(true);
    expect(res.isWo).toBe(true);
    expect(res.winnerId).toBe('team-a');
    expect(res.loserId).toBe('team-b');
    expect(res.setsWonA).toBe(3); // 3 sets para vencer
    expect(res.setsWonB).toBe(0);
    expect(res.pointsScoredA).toBe(75); // 3 * 25
    expect(res.pointsScoredB).toBe(0);
    expect(res.isInconsistent).toBe(false);
  });

  it('W.O. no Vôlei de Praia (melhor de 3): atribui 2x0 e 42x0 pontos', () => {
    const beachWoMatch: MatchRecord = {
      ...sampleMatch,
      competitionId: 'comp-canon-2',
      status: 'completed',
      isWo: true,
      winnerId: 'team-b',
      sets: [],
    };

    const res = CompetitionRulesService.getCanonicalMatchResult(baseBeachComp, beachWoMatch);
    expect(res.isValid).toBe(true);
    expect(res.isWo).toBe(true);
    expect(res.winnerId).toBe('team-b');
    expect(res.loserId).toBe('team-a');
    expect(res.setsWonB).toBe(2); // 2 sets para vencer
    expect(res.setsWonA).toBe(0);
    expect(res.pointsScoredB).toBe(42); // 2 * 21
    expect(res.pointsScoredA).toBe(0);
  });

  it('resultado incompleto: detecta pendência e impede marcação de concluído válido', () => {
    const incompleteMatch: MatchRecord = {
      ...sampleMatch,
      status: 'completed',
      sets: [
        { setNumber: 1, scoreA: 25, scoreB: 20 },
        { setNumber: 2, scoreA: 25, scoreB: 22 },
        // Falta o 3º set para melhor de 5
      ],
      winnerId: 'team-a',
    };

    const res = CompetitionRulesService.getCanonicalMatchResult(baseIndoorComp, incompleteMatch);
    expect(res.isValid).toBe(false);
    expect(res.isInconsistent).toBe(true);
    expect(res.inconsistencyReason).toContain('Partida incompleta');
  });

  it('resultado matematicamente inválido: detecta ausência de 2 pontos de vantagem', () => {
    const invalidMatch: MatchRecord = {
      ...sampleMatch,
      status: 'completed',
      sets: [
        { setNumber: 1, scoreA: 25, scoreB: 24 }, // Inválido: precisa de 2 de vantagem
        { setNumber: 2, scoreA: 25, scoreB: 20 },
        { setNumber: 3, scoreA: 25, scoreB: 20 },
      ],
      winnerId: 'team-a',
    };

    const res = CompetitionRulesService.getCanonicalMatchResult(baseIndoorComp, invalidMatch);
    expect(res.isValid).toBe(false);
    expect(res.isInconsistent).toBe(true);
    expect(res.inconsistencyReason).toContain('vantagem');
  });

  it('vencedor inconsistente: detecta e corrige se winnerId do record divergir dos sets', () => {
    const forgedMatch: MatchRecord = {
      ...sampleMatch,
      status: 'completed',
      sets: [
        { setNumber: 1, scoreA: 20, scoreB: 25 },
        { setNumber: 2, scoreA: 18, scoreB: 25 },
        { setNumber: 3, scoreA: 21, scoreB: 25 },
      ],
      winnerId: 'team-a', // Fraudulento: Time B venceu 3x0, mas winnerId diz Time A
    };

    const res = CompetitionRulesService.getCanonicalMatchResult(baseIndoorComp, forgedMatch);
    expect(res.isInconsistent).toBe(true);
    expect(res.inconsistencyReason).toContain('diverge do vencedor apurado pelos sets');
    // O vencedor canônico derivado é SEMPRE o verdadeiro apurado pelos sets (team-b)
    expect(res.winnerId).toBe('team-b');
    expect(res.loserId).toBe('team-a');
  });

  it('partida homologada: registra metadados oficiais e trava alteração', () => {
    const homologatedMatch: MatchRecord = {
      ...sampleMatch,
      status: 'homologated',
      sets: [
        { setNumber: 1, scoreA: 25, scoreB: 18 },
        { setNumber: 2, scoreA: 25, scoreB: 20 },
        { setNumber: 3, scoreA: 25, scoreB: 22 },
      ],
      winnerId: 'team-a',
      homologatedAt: '2026-09-03T12:00:00Z',
      homologatedBy: 'Delegado Oficial CBV',
    };

    const res = CompetitionRulesService.getCanonicalMatchResult(baseIndoorComp, homologatedMatch);
    expect(res.isHomologated).toBe(true);
    expect(res.homologatedAt).toBe('2026-09-03T12:00:00Z');
    expect(res.homologatedBy).toBe('Delegado Oficial CBV');

    // Trava de ciclo de vida bloqueia alteração em partida homologada
    expect(CompetitionLifecycleService.canRecordResult(baseIndoorComp, homologatedMatch)).toBe(false);
  });
});
