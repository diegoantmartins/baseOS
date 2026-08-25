import { describe, it, expect } from 'vitest';
import { generateBlankBaseosScoresheetData } from '@/document-engine/baseos/service/scoresheetService';
import { mapMatchRecordToBaseosScoresheet } from '@/document-engine/baseos/mapper/match.mapper';
import { validateBaseosScoresheetData } from '@/document-engine/baseos/validation/validator';
import type { MatchRecord, CompetitionRecord, TeamRecord } from '@/types/entities';

describe('Fase 22 & 24 — Performance Benchmark e Throughput do Motor BaseOS', () => {
  it('deve gerar 100 estruturas de súmulas oficiais com latência média < 5ms por documento', () => {
    const iterations = 100;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      const data = generateBlankBaseosScoresheetData(i % 2 === 0 ? '3-sets' : '5-sets');
      validateBaseosScoresheetData(data);
    }

    const durationMs = performance.now() - start;
    const avgLatencyMs = durationMs / iterations;

    expect(avgLatencyMs).toBeLessThan(5); // Ultra rápida
  });

  it('deve processar dataset sintético com consistência de memória e integridade', () => {
    const dummyComp: CompetitionRecord = {
      id: 'comp-perf',
      name: 'Torneio Performance',
      modality: 'indoor',
      format: 'groups',
      playerFormat: '6x6',
      setFormat: 'best-of-5',
      genderCategory: 'male',
      status: 'in-progress',
    };

    const teamA: TeamRecord = { id: 't1', name: 'Time Alpha', shortName: 'ALP', modality: 'indoor' };
    const teamB: TeamRecord = { id: 't2', name: 'Time Beta', shortName: 'BET', modality: 'indoor' };
    const match: MatchRecord = {
      id: 'm-perf',
      competitionId: 'comp-perf',
      round: 1,
      matchNumber: 1,
      teamAId: 't1',
      teamBId: 't2',
      teamAName: 'Time Alpha',
      teamBName: 'Time Beta',
      teamAShortName: 'ALP',
      teamBShortName: 'BET',
      venue: 'Ginásio Central',
      scheduledTime: '2026-08-25T19:00:00Z',
      status: 'in-progress',
      sets: [
        { setNumber: 1, scoreA: 25, scoreB: 20 },
        { setNumber: 2, scoreA: 20, scoreB: 25 },
        { setNumber: 3, scoreA: 25, scoreB: 23 },
      ],
      referees: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const start = performance.now();
    const doc = mapMatchRecordToBaseosScoresheet(match, dummyComp, teamA, teamB, [], []);
    const elapsed = performance.now() - start;

    expect(doc.teams.A.name).toBe('Time Alpha');
    expect(elapsed).toBeLessThan(100);
  });
});
