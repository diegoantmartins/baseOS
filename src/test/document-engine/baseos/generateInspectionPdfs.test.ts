// @vitest-environment node
// =====================================================================
// BaseOS - Geração Real de PDFs para Inspeção Visual da Fase 3
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

describe('Geração de PDFs reais para inspeção visual — Fase Súmula 3', () => {
  const outputDir = path.resolve(process.cwd(), 'dist/pdf-inspection');

  const dummyComp: CompetitionRecord = {
    id: 'comp-inspecao',
    name: 'Campeonato Metropolitano de Voleibol BaseOS 2026',
    modality: 'indoor',
    format: 'groups-playoffs',
    playerFormat: '6x6',
    setFormat: '5-sets',
    genderCategory: 'male',
    status: 'in-progress',
  };

  const teamA: TeamRecord = {
    id: 'team-a',
    name: 'Olympico Club / Belo Horizonte',
    shortName: 'OLY',
    modality: 'indoor',
  };

  const teamB: TeamRecord = {
    id: 'team-b',
    name: 'Mackenzie Esporte Clube',
    shortName: 'MKZ',
    modality: 'indoor',
  };

  const athletesA: CompetitionAthlete[] = Array.from({ length: 12 }, (_, i) => ({
    id: `ath-a-${i + 1}`,
    competitionTeamId: 'ct-a',
    name: `Atleta Titular da Silva Nº ${i + 1}`,
    jerseyNumber: i + 1,
    position: i < 6 ? 'Titular' : 'Reserva',
    isCaptain: i === 0,
    isLibero: i >= 10,
    gender: 'male',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const athletesB: CompetitionAthlete[] = Array.from({ length: 12 }, (_, i) => ({
    id: `ath-b-${i + 1}`,
    competitionTeamId: 'ct-b',
    name: `Jogador Competidor Santos Nº ${i + 1}`,
    jerseyNumber: i + 1,
    position: i < 6 ? 'Titular' : 'Reserva',
    isCaptain: i === 0,
    isLibero: i >= 10,
    gender: 'male',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const match3Sets: MatchRecord = {
    id: 'match-3s',
    competitionId: 'comp-inspecao',
    round: 1,
    matchNumber: 101,
    teamAId: 'team-a',
    teamBId: 'team-b',
    teamAName: teamA.name,
    teamBName: teamB.name,
    teamAShortName: teamA.shortName,
    teamBShortName: teamB.shortName,
    venue: 'Ginásio do Riacho - Contagem',
    scheduledTime: '2026-10-20T19:00:00Z',
    status: 'completed',
    sets: [
      { setNumber: 1, scoreA: 25, scoreB: 20 },
      { setNumber: 2, scoreA: 23, scoreB: 25 },
      { setNumber: 3, scoreA: 25, scoreB: 18 },
    ],
    referees: [
      { name: 'Carlos Eduardo Silveira', role: 'first' },
      { name: 'Mariana Pires Rocha', role: 'second' },
      { name: 'Lucas Gabriel Martins', role: 'scorer' },
    ],
    winnerId: 'team-a',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const match5Sets: MatchRecord = {
    id: 'match-5s',
    competitionId: 'comp-inspecao',
    round: 2,
    matchNumber: 102,
    teamAId: 'team-a',
    teamBId: 'team-b',
    teamAName: teamA.name,
    teamBName: teamB.name,
    teamAShortName: teamA.shortName,
    teamBShortName: teamB.shortName,
    venue: 'Arena UniBH - Rua da Bahia',
    scheduledTime: '2026-10-21T21:30:00Z',
    status: 'completed',
    sets: [
      { setNumber: 1, scoreA: 25, scoreB: 23 },
      { setNumber: 2, scoreA: 22, scoreB: 25 },
      { setNumber: 3, scoreA: 25, scoreB: 19 },
      { setNumber: 4, scoreA: 20, scoreB: 25 },
      { setNumber: 5, scoreA: 15, scoreB: 13 },
    ],
    referees: [
      { name: 'Carlos Eduardo Silveira', role: 'first' },
      { name: 'Mariana Pires Rocha', role: 'second' },
      { name: 'Lucas Gabriel Martins', role: 'scorer' },
    ],
    winnerId: 'team-a',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('gera os 6 PDFs oficiais reais para inspeção visual', async () => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 1. 3 sets - Blank (A4)
    const blank3Data = generateBlankBaseosScoresheetData('3-sets', 'print-a4');
    const fileBlank3 = path.join(outputDir, 'sumula_3sets_blank_a4.pdf');
    const bufBlank3 = await renderToBuffer(createBaseosDocumentElement(blank3Data));
    fs.writeFileSync(fileBlank3, bufBlank3);
    expect(fs.existsSync(fileBlank3)).toBe(true);
    expect(bufBlank3.length).toBeGreaterThan(10000);

    // 2. 3 sets - Preenchido (A4)
    const dummyComp3: CompetitionRecord = { ...dummyComp, setFormat: '3-sets' };
    const filled3Data = mapMatchRecordToBaseosScoresheet(
      match3Sets,
      dummyComp3,
      teamA,
      teamB,
      athletesA,
      athletesB,
      'completed',
      'print-a4',
    );
    const fileFilled3 = path.join(outputDir, 'sumula_3sets_preenchida_a4.pdf');
    const bufFilled3 = await renderToBuffer(createBaseosDocumentElement(filled3Data));
    fs.writeFileSync(fileFilled3, bufFilled3);
    expect(fs.existsSync(fileFilled3)).toBe(true);
    expect(bufFilled3.length).toBeGreaterThan(10000);

    // 3. 5 sets - Blank (A4)
    const blank5Data = generateBlankBaseosScoresheetData('5-sets', 'print-a4');
    const fileBlank5 = path.join(outputDir, 'sumula_5sets_blank_a4.pdf');
    const bufBlank5 = await renderToBuffer(createBaseosDocumentElement(blank5Data));
    fs.writeFileSync(fileBlank5, bufBlank5);
    expect(fs.existsSync(fileBlank5)).toBe(true);
    expect(bufBlank5.length).toBeGreaterThan(10000);

    // 4. 5 sets - Preenchido (A4)
    const filled5Data = mapMatchRecordToBaseosScoresheet(
      match5Sets,
      dummyComp,
      teamA,
      teamB,
      athletesA,
      athletesB,
      'completed',
      'print-a4',
    );
    const fileFilled5 = path.join(outputDir, 'sumula_5sets_preenchida_a4.pdf');
    const bufFilled5 = await renderToBuffer(createBaseosDocumentElement(filled5Data));
    fs.writeFileSync(fileFilled5, bufFilled5);
    expect(fs.existsSync(fileFilled5)).toBe(true);
    expect(bufFilled5.length).toBeGreaterThan(10000);

    // Atualizar cópias oficiais na pasta public
    const publicDir = path.resolve(process.cwd(), 'public');
    fs.writeFileSync(path.join(publicDir, 'sumula_5sets_oficial_em_branco.pdf'), bufBlank5);
    fs.writeFileSync(path.join(publicDir, 'sumula_5sets_oficial_preenchida.pdf'), bufFilled5);

    // Gerar imagens PNG de alta resolução para visualização imediata
    try {
      const { execSync } = await import('child_process');
      execSync(`pdftoppm -png -r 150 -singlefile "${fileBlank5}" "${path.join(outputDir, 'sumula_5sets_blank')}"`);
      execSync(`pdftoppm -png -r 150 -singlefile "${fileFilled5}" "${path.join(outputDir, 'sumula_5sets_preenchida')}"`);

      const artifactDir = '/home/diego-martins/.gemini/antigravity-ide/brain/e77df1d6-ede3-426f-b3ec-08dcfd5a2409';
      if (fs.existsSync(artifactDir)) {
        fs.copyFileSync(path.join(outputDir, 'sumula_5sets_blank.png'), path.join(artifactDir, 'sumula_5sets_blank.png'));
        fs.copyFileSync(path.join(outputDir, 'sumula_5sets_preenchida.png'), path.join(artifactDir, 'sumula_5sets_preenchida.png'));
      }
    } catch (err) {
      console.warn('Aviso na conversão para PNG:', err);
    }

    // 5. 5 sets - Blank (A3 Master)
    const blank5A3Data = generateBlankBaseosScoresheetData('5-sets', 'master');
    const fileBlank5A3 = path.join(outputDir, 'sumula_5sets_blank_a3.pdf');
    const bufBlank5A3 = await renderToBuffer(createBaseosDocumentElement(blank5A3Data));
    fs.writeFileSync(fileBlank5A3, bufBlank5A3);
    expect(fs.existsSync(fileBlank5A3)).toBe(true);
    expect(bufBlank5A3.length).toBeGreaterThan(10000);

    // 6. 5 sets - Preenchido (A3 Master)
    const filled5A3Data = mapMatchRecordToBaseosScoresheet(
      match5Sets,
      dummyComp,
      teamA,
      teamB,
      athletesA,
      athletesB,
      'completed',
      'master',
    );
    const fileFilled5A3 = path.join(outputDir, 'sumula_5sets_preenchida_a3.pdf');
    const bufFilled5A3 = await renderToBuffer(createBaseosDocumentElement(filled5A3Data));
    fs.writeFileSync(fileFilled5A3, bufFilled5A3);
    expect(fs.existsSync(fileFilled5A3)).toBe(true);
    expect(bufFilled5A3.length).toBeGreaterThan(10000);

    // 7. 5 sets - Preenchido com Vitória da Equipe B (1 : 3)
    const match5SetsTeamBWin: MatchRecord = {
      ...match5Sets,
      id: 'match-5s-b-win',
      winnerId: 'team-b',
      sets: [
        { setNumber: 1, scoreA: 20, scoreB: 25 },
        { setNumber: 2, scoreA: 25, scoreB: 22 },
        { setNumber: 3, scoreA: 19, scoreB: 25 },
        { setNumber: 4, scoreA: 23, scoreB: 25 },
      ],
    };
    const filled5TeamBWinData = mapMatchRecordToBaseosScoresheet(
      match5SetsTeamBWin,
      dummyComp,
      teamA,
      teamB,
      athletesA,
      athletesB,
      'completed',
      'print-a4',
    );
    expect(filled5TeamBWinData.result?.finalScoreSetsA).toBe(1);
    expect(filled5TeamBWinData.result?.finalScoreSetsB).toBe(3);
    expect(filled5TeamBWinData.result?.winnerSide).toBe('B');

    const fileFilled5TeamB = path.join(outputDir, 'sumula_5sets_vitoria_time_b_a4.pdf');
    const bufFilled5TeamB = await renderToBuffer(createBaseosDocumentElement(filled5TeamBWinData));
    fs.writeFileSync(fileFilled5TeamB, bufFilled5TeamB);
    expect(fs.existsSync(fileFilled5TeamB)).toBe(true);
    expect(bufFilled5TeamB.length).toBeGreaterThan(10000);
  }, 180000);
});
