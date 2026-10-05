// @vitest-environment node
// =====================================================================
// BaseOS - Validação dos 7 Casos de Teste Forenses da Súmula de 3 Sets
// =====================================================================

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { renderToBuffer } from '@react-pdf/renderer';
import {
  generateBlankBaseosScoresheetData,
  createBaseosDocumentElement,
  mapMatchRecordToBaseosScoresheet,
} from '@/document-engine/baseos';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';
import type { CompetitionAthlete } from '@/types/registration';

describe('BaseOS 3 Sets — Validação Forense dos 7 Casos de Teste (Seção 19)', () => {
  const outputDir = path.resolve(process.cwd(), 'dist/pdf-inspection/three-sets-scenarios');

  const dummyComp: CompetitionRecord = {
    id: 'comp-cenarios-3s',
    name: 'Copa Regional BaseOS 2026 - 3 Sets Forense',
    modality: 'indoor',
    format: 'groups-playoffs',
    playerFormat: '6x6',
    setFormat: '3-sets',
    genderCategory: 'male',
    status: 'in-progress',
  };

  const teamA: TeamRecord = {
    id: 'team-a',
    name: 'Atlético Vôlei Clube',
    shortName: 'AVC',
    modality: 'indoor',
  };

  const teamB: TeamRecord = {
    id: 'team-b',
    name: 'Cruzeiro Esporte Vôlei',
    shortName: 'CEV',
    modality: 'indoor',
  };

  const athletesA: CompetitionAthlete[] = Array.from({ length: 14 }, (_, i) => ({
    id: `ath-a-${i + 1}`,
    competitionTeamId: 'ct-a',
    name: `Jogador Titular A${i + 1}`,
    jerseyNumber: i + 1,
    position: i < 6 ? 'Titular' : 'Reserva',
    isCaptain: i === 0,
    isLibero: i >= 12,
    gender: 'male',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const athletesB: CompetitionAthlete[] = Array.from({ length: 14 }, (_, i) => ({
    id: `ath-b-${i + 1}`,
    competitionTeamId: 'ct-b',
    name: `Jogador Titular B${i + 1}`,
    jerseyNumber: i + 1,
    position: i < 6 ? 'Titular' : 'Reserva',
    isCaptain: i === 0,
    isLibero: i >= 12,
    gender: 'male',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  function makeMatch(id: string, matchNumber: number, sets: Array<{ setNumber: number; scoreA: number; scoreB: number }>): MatchRecord {
    return {
      id,
      competitionId: dummyComp.id,
      round: 1,
      matchNumber,
      teamAId: teamA.id,
      teamBId: teamB.id,
      teamAName: teamA.name,
      teamBName: teamB.name,
      teamAShortName: teamA.shortName,
      teamBShortName: teamB.shortName,
      venue: 'Arena Poliesportiva Central',
      scheduledTime: '2026-10-30T19:30:00Z',
      status: 'completed',
      sets,
      referees: [
        { name: 'Árbitro Principal CBV', role: 'first' },
        { name: 'Segundo Árbitro CBV', role: 'second' },
        { name: 'Apontador Oficial FPV', role: 'scorer' },
      ],
      winnerId: sets[sets.length - 1].scoreA > sets[sets.length - 1].scoreB ? teamA.id : teamB.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // TESTE 1: Set 1 (25x23), Set 2 (25x19), Set 3 (15x13)
  it('TESTE 1 — Set 1 (25x23), Set 2 (25x19), Set 3 (15x13)', async () => {
    const match = makeMatch('match-t1', 1, [
      { setNumber: 1, scoreA: 25, scoreB: 23 },
      { setNumber: 2, scoreA: 25, scoreB: 19 },
      { setNumber: 3, scoreA: 15, scoreB: 13 },
    ]);
    const scoresheetData = mapMatchRecordToBaseosScoresheet(match, dummyComp, teamA, teamB, athletesA, athletesB, 'completed');
    expect(scoresheetData.sets.set1.score).toEqual({ teamA: 25, teamB: 23 });
    expect(scoresheetData.sets.set2.score).toEqual({ teamA: 25, teamB: 19 });
    expect(scoresheetData.sets.set3.score).toEqual({ teamA: 15, teamB: 13 });

    const buffer = await renderToBuffer(createBaseosDocumentElement(scoresheetData));
    const filePath = path.join(outputDir, 'cenario_01_25x23_25x19_15x13.pdf');
    fs.writeFileSync(filePath, buffer);
    expect(fs.existsSync(filePath)).toBe(true);
    expect(buffer.length).toBeGreaterThan(15000);
  });

  // TESTE 2: Set 1 (25x10), Set 2 (25x22), Set 3 (15x8)
  it('TESTE 2 — Set 1 (25x10), Set 2 (25x22), Set 3 (15x8)', async () => {
    const match = makeMatch('match-t2', 2, [
      { setNumber: 1, scoreA: 25, scoreB: 10 },
      { setNumber: 2, scoreA: 25, scoreB: 22 },
      { setNumber: 3, scoreA: 15, scoreB: 8 },
    ]);
    const scoresheetData = mapMatchRecordToBaseosScoresheet(match, dummyComp, teamA, teamB, athletesA, athletesB, 'completed');
    expect(scoresheetData.sets.set1.score).toEqual({ teamA: 25, teamB: 10 });
    expect(scoresheetData.sets.set2.score).toEqual({ teamA: 25, teamB: 22 });
    expect(scoresheetData.sets.set3.score).toEqual({ teamA: 15, teamB: 8 });

    const buffer = await renderToBuffer(createBaseosDocumentElement(scoresheetData));
    const filePath = path.join(outputDir, 'cenario_02_25x10_25x22_15x8.pdf');
    fs.writeFileSync(filePath, buffer);
    expect(fs.existsSync(filePath)).toBe(true);
    expect(buffer.length).toBeGreaterThan(15000);
  });

  // TESTE 3: Tie-break (14x14)
  it('TESTE 3 — Tie-break em deuce prolongado (14x14)', async () => {
    const match = makeMatch('match-t3', 3, [
      { setNumber: 1, scoreA: 25, scoreB: 20 },
      { setNumber: 2, scoreA: 20, scoreB: 25 },
      { setNumber: 3, scoreA: 14, scoreB: 14 },
    ]);
    const scoresheetData = mapMatchRecordToBaseosScoresheet(match, dummyComp, teamA, teamB, athletesA, athletesB, 'completed');
    expect(scoresheetData.sets.set3.score).toEqual({ teamA: 14, teamB: 14 });

    const buffer = await renderToBuffer(createBaseosDocumentElement(scoresheetData));
    const filePath = path.join(outputDir, 'cenario_03_tiebreak_14x14.pdf');
    fs.writeFileSync(filePath, buffer);
    expect(fs.existsSync(filePath)).toBe(true);
    expect(buffer.length).toBeGreaterThan(15000);
  });

  // TESTE 4: Tie-break (15x13)
  it('TESTE 4 — Tie-break terminado em 15x13', async () => {
    const match = makeMatch('match-t4', 4, [
      { setNumber: 1, scoreA: 25, scoreB: 21 },
      { setNumber: 2, scoreA: 21, scoreB: 25 },
      { setNumber: 3, scoreA: 15, scoreB: 13 },
    ]);
    const scoresheetData = mapMatchRecordToBaseosScoresheet(match, dummyComp, teamA, teamB, athletesA, athletesB, 'completed');
    expect(scoresheetData.sets.set3.score).toEqual({ teamA: 15, teamB: 13 });

    const buffer = await renderToBuffer(createBaseosDocumentElement(scoresheetData));
    const filePath = path.join(outputDir, 'cenario_04_tiebreak_15x13.pdf');
    fs.writeFileSync(filePath, buffer);
    expect(fs.existsSync(filePath)).toBe(true);
    expect(buffer.length).toBeGreaterThan(15000);
  });

  // TESTE 5: Tie-break (15x14 / 16x14)
  it('TESTE 5 — Tie-break vantagem mínima (16x14 após 15x14)', async () => {
    const match = makeMatch('match-t5', 5, [
      { setNumber: 1, scoreA: 23, scoreB: 25 },
      { setNumber: 2, scoreA: 25, scoreB: 22 },
      { setNumber: 3, scoreA: 16, scoreB: 14 },
    ]);
    const scoresheetData = mapMatchRecordToBaseosScoresheet(match, dummyComp, teamA, teamB, athletesA, athletesB, 'completed');
    expect(scoresheetData.sets.set3.score).toEqual({ teamA: 16, teamB: 14 });

    const buffer = await renderToBuffer(createBaseosDocumentElement(scoresheetData));
    const filePath = path.join(outputDir, 'cenario_05_tiebreak_16x14.pdf');
    fs.writeFileSync(filePath, buffer);
    expect(fs.existsSync(filePath)).toBe(true);
    expect(buffer.length).toBeGreaterThan(15000);
  });

  // TESTE 6: Equipe A chega primeiro aos 8 (ex: 8x5 na troca, finaliza 15x10)
  it('TESTE 6 — Equipe A chega primeiro aos 8 pontos na troca', async () => {
    const match = makeMatch('match-t6', 6, [
      { setNumber: 1, scoreA: 25, scoreB: 20 },
      { setNumber: 2, scoreA: 20, scoreB: 25 },
      { setNumber: 3, scoreA: 15, scoreB: 10 },
    ]);
    const scoresheetData = mapMatchRecordToBaseosScoresheet(match, dummyComp, teamA, teamB, athletesA, athletesB, 'completed');
    scoresheetData.sets.set3.sideChange = {
      required: true,
      atPoint: 8,
      completed: true,
      pointsAtChange: { teamA: 8, teamB: 5 },
    };

    const buffer = await renderToBuffer(createBaseosDocumentElement(scoresheetData));
    const filePath = path.join(outputDir, 'cenario_06_time_A_chega_aos_8.pdf');
    fs.writeFileSync(filePath, buffer);
    expect(fs.existsSync(filePath)).toBe(true);
    expect(buffer.length).toBeGreaterThan(15000);
  });

  // TESTE 7: Equipe B chega primeiro aos 8 (ex: 4x8 na troca, finaliza 11x15)
  it('TESTE 7 — Equipe B chega primeiro aos 8 pontos na troca', async () => {
    const match = makeMatch('match-t7', 7, [
      { setNumber: 1, scoreA: 20, scoreB: 25 },
      { setNumber: 2, scoreA: 25, scoreB: 20 },
      { setNumber: 3, scoreA: 11, scoreB: 15 },
    ]);
    const scoresheetData = mapMatchRecordToBaseosScoresheet(match, dummyComp, teamA, teamB, athletesA, athletesB, 'completed');
    scoresheetData.sets.set3.sideChange = {
      required: true,
      atPoint: 8,
      completed: true,
      pointsAtChange: { teamA: 4, teamB: 8 },
    };

    const buffer = await renderToBuffer(createBaseosDocumentElement(scoresheetData));
    const filePath = path.join(outputDir, 'cenario_07_time_B_chega_aos_8.pdf');
    fs.writeFileSync(filePath, buffer);
    expect(fs.existsSync(filePath)).toBe(true);
    expect(buffer.length).toBeGreaterThan(15000);
  });
});
