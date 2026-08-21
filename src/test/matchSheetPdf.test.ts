// Smoke test da geração do PDF da súmula oficial.

import { describe, expect, it } from 'vitest';
import { generateMatchSheetPdf } from '@/lib/pdf/matchSheetPdf';
import type { MatchSheetData } from '@/lib/pdf/matchSheetPdf';

function baseData(overrides: Partial<MatchSheetData> = {}): MatchSheetData {
  return {
    competition: 'Copa Teste 2026',
    category: 'Sub-21',
    genderCategory: 'female',
    modality: 'indoor',
    format: '5-sets',
    playerFormat: '6x6',
    date: '2026-08-15',
    time: '14:00',
    venue: 'Ginásio Municipal',
    round: 1,
    matchNumber: 7,
    teamA: {
      name: 'Osasco Voleibol',
      shortName: 'OSA',
      athletes: [
        { jerseyNumber: 1, name: 'Ana Souza', position: 'Levantadora', captain: true, documentNumber: '123.456.789-00' },
        { jerseyNumber: 9, name: 'Bia Lima', position: 'Ponteira', libero: true, documentNumber: '987.654.321-00' },
      ],
      coach: 'Prof. Carlos',
    },
    teamB: {
      name: 'SESI Bauru',
      shortName: 'BAU',
      athletes: [{ jerseyNumber: 2, name: 'Carla Dias', position: 'Central' }],
    },
    sets: [
      { setNumber: 1, scoreA: 25, scoreB: 22 },
      { setNumber: 2, scoreA: 25, scoreB: 18 },
      { setNumber: 3, scoreA: 21, scoreB: 25 },
      { setNumber: 4, scoreA: 25, scoreB: 20 },
      { setNumber: 5, scoreA: 15, scoreB: 12 },
    ],
    finalScoreA: 3,
    finalScoreB: 1,
    winner: 'A',
    referees: [
      { role: 'Árbitro 1', name: 'João Pedro' },
      { role: 'Apontador(a)', name: 'Maria Clara' },
    ],
    timeouts: [{ team: 'A', set: 2, score: '20:18' }],
    substitutions: [{ team: 'B', set: 3, playerIn: 4, playerOut: 2, score: '12:10' }],
    sanctions: [{ team: 'B', player: 'Carla Dias', type: 'Cartão amarelo', set: 3 }],
    observations: 'Jogo válido pela fase classificatória.',
    orgName: 'Federação Teste',
    sheetMode: 'post',
    ...overrides,
  };
}

describe('generateMatchSheetPdf', () => {
  it('gera PDF para partida feminina 6x6 indoor', () => {
    const doc = generateMatchSheetPdf(baseData());
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    expect(doc.getNumberOfPages()).toBeLessThanOrEqual(5);
  });

  it('gera PDF para partida masculina de vôlei de praia 2x2', () => {
    const doc = generateMatchSheetPdf(
      baseData({
        genderCategory: 'male',
        modality: 'beach',
        format: '3-sets',
        playerFormat: '2x2',
        teamA: {
          name: 'Dupla A',
          shortName: 'DUP A',
          athletes: [
            { jerseyNumber: 1, name: 'Pedro Ramos', captain: true },
            { jerseyNumber: 2, name: 'Lucas Nunes' },
          ],
        },
        teamB: {
          name: 'Dupla B',
          shortName: 'DUP B',
          athletes: [
            { jerseyNumber: 1, name: 'Rafael Dias', captain: true },
            { jerseyNumber: 2, name: 'Thiago Melo' },
          ],
        },
        sets: [
          { setNumber: 1, scoreA: 21, scoreB: 18 },
          { setNumber: 2, scoreA: 21, scoreB: 15 },
          { setNumber: 3, scoreA: 15, scoreB: 13 },
        ],
        finalScoreA: 2,
        finalScoreB: 1,
      }),
    );
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it('gera PDF para partida sem sets lançados (pré-jogo)', () => {
    const doc = generateMatchSheetPdf(
      baseData({
        sets: [],
        finalScoreA: 0,
        finalScoreB: 0,
        winner: undefined,
        sheetMode: 'pre',
      }),
    );
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it('usa o nome da organização no cabeçalho e aceita escudos SVG', () => {
    const svgLogo =
      'data:image/svg+xml;utf8,' +
      encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="#222"/></svg>');
    const doc = generateMatchSheetPdf(
      baseData({
        orgName: 'Liga Regional de Vôlei',
        teamA: {
          ...baseData().teamA,
          logoUrl: svgLogo,
        },
        teamB: {
          ...baseData().teamB,
          logoUrl: svgLogo,
        },
      }),
    );
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });
});
