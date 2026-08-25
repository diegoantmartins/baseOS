// Smoke test da geração dos PDFs oficiais do sistema (súmula 3/5 sets e fichas de posição somente em A4).

import { beforeAll, describe, expect, it } from 'vitest';
import {
  generateOfficialMatchSheetPdf,
  generatePositionOrderSheetPdf,
  generateBlankOfficialMatchSheetPdf,
  generateBlankPositionSheetsPdf,
  printOfficialPdf,
  previewOfficialPdf,
  downloadOfficialPdf,
} from '@/lib/pdf/officialMatchSheetPdf';
import {
  SHEET3_A4,
  SHEET5_A4,
  validateScoresheetLayout,
  PAGE_A4_LANDSCAPE,
} from '@/lib/pdf/scoresheetLayout';
import type { MatchSheetData } from '@/lib/pdf/matchSheetPdf';

beforeAll(() => {
  window.alert = () => undefined;
  window.open = () => null;
  Object.defineProperty(URL, 'createObjectURL', { writable: true, value: () => 'blob:mock' });
});

function baseData(overrides: Partial<MatchSheetData> = {}): MatchSheetData {
  return {
    competition: 'Copa Toledo 2026 - Masculino',
    category: 'Masculino Adulto',
    genderCategory: 'male',
    modality: 'indoor',
    format: '3-sets',
    playerFormat: '6x6',
    date: '22/08/2026',
    time: '19:00',
    venue: 'Ginásio Municipal',
    court: 'Quadra 1',
    city: 'Toledo - PR',
    phase: 'Classificatória',
    groupName: 'Grupo A',
    round: 1,
    matchNumber: 7,
    teamA: {
      name: 'Osasco Voleibol',
      shortName: 'OSA',
      athletes: [
        { jerseyNumber: 1, name: 'Fernanda Silva', position: 'Levantadora', captain: true },
        { jerseyNumber: 15, name: 'Beatriz Mendes', position: 'Líbero', libero: true },
      ],
      coach: 'Luizomar de Moura',
    },
    teamB: {
      name: 'Minas Tênis Clube',
      shortName: 'MIN',
      athletes: [
        { jerseyNumber: 3, name: 'Ana Cristina Souza', position: 'Ponteira', captain: true },
        { jerseyNumber: 16, name: 'Kasiely Clemente', position: 'Líbero', libero: true },
      ],
      coach: 'Nicola Negro',
    },
    sets: [],
    finalScoreA: 0,
    finalScoreB: 0,
    referees: [
      { role: '1º Árbitro', name: 'Carlos Silva' },
      { role: '2º Árbitro', name: 'Ana Santos' },
      { role: 'Apontador', name: 'Pedro Oliveira' },
    ],
    timeouts: [],
    substitutions: [],
    sanctions: [],
    observations: 'Jogo válido pela fase classificatória - Grupo A.',
    orgName: 'VolleyPro',
    sheetMode: 'pre',
    ...overrides,
  };
}

describe('generateOfficialMatchSheetPdf — Súmulas 3 e 5 Sets exclusivamente em A4 Paisagem', () => {
  it('gera PDF de 1 página A4 paisagem (297 × 210 mm) para 3 sets', () => {
    const doc = generateOfficialMatchSheetPdf(baseData({ format: '3-sets' }));
    expect(doc.getNumberOfPages()).toBe(1);
    expect(doc.internal.pageSize.getWidth()).toBeCloseTo(PAGE_A4_LANDSCAPE.width, 0);
    expect(doc.internal.pageSize.getHeight()).toBeCloseTo(PAGE_A4_LANDSCAPE.height, 0);
  });

  it('gera PDF de 1 página A4 paisagem (297 × 210 mm) para 5 sets (sem A3)', () => {
    const doc = generateOfficialMatchSheetPdf(baseData({ format: '5-sets' }));
    expect(doc.getNumberOfPages()).toBe(1);
    expect(doc.internal.pageSize.getWidth()).toBeCloseTo(PAGE_A4_LANDSCAPE.width, 0);
    expect(doc.internal.pageSize.getHeight()).toBeCloseTo(PAGE_A4_LANDSCAPE.height, 0);
  });

  it('layout de 3 sets e 5 sets cabe rigorosamente dentro da página A4 sem overflow', () => {
    expect(() => validateScoresheetLayout(SHEET3_A4)).not.toThrow();
    expect(() => validateScoresheetLayout(SHEET5_A4)).not.toThrow();
  });

  it('gera súmula em branco de 3 sets e 5 sets em A4', () => {
    const blank3 = generateBlankOfficialMatchSheetPdf('3-sets');
    expect(blank3.getNumberOfPages()).toBe(1);
    expect(blank3.internal.pageSize.getWidth()).toBeCloseTo(297, 0);

    const blank5 = generateBlankOfficialMatchSheetPdf('5-sets');
    expect(blank5.getNumberOfPages()).toBe(1);
    expect(blank5.internal.pageSize.getWidth()).toBeCloseTo(297, 0);
  });

  it('gera Fichas de Posição em A4 paisagem', () => {
    const doc3 = generatePositionOrderSheetPdf(baseData({ format: '3-sets' }));
    expect(doc3.getNumberOfPages()).toBe(1);
    expect(doc3.internal.pageSize.getWidth()).toBeCloseTo(297, 0);

    const doc5 = generatePositionOrderSheetPdf(baseData({ format: '5-sets' }));
    expect(doc5.getNumberOfPages()).toBe(2);
    expect(doc5.internal.pageSize.getWidth()).toBeCloseTo(297, 0);
  });

  it('não lança erro com elenco vazio', () => {
    const doc = generateOfficialMatchSheetPdf(baseData({ teamA: { name: 'A', shortName: 'A', athletes: [] } }));
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it('imprime sem lançar erro', () => {
    const doc = generateOfficialMatchSheetPdf(baseData());
    expect(() => printOfficialPdf(doc)).not.toThrow();
  });

  it('visualiza sem lançar erro', () => {
    const doc = generateOfficialMatchSheetPdf(baseData());
    expect(() => previewOfficialPdf(doc)).not.toThrow();
  });
});