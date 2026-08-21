// Smoke test da geração dos PDFs oficiais do sistema (súmula 3/5 sets e fichas de posição).

import { beforeAll, describe, expect, it } from 'vitest';
import {
  generateOfficialMatchSheetPdf,
  generatePositionOrderSheetPdf,
  printOfficialPdf,
  previewOfficialPdf,
  downloadOfficialPdf,
} from '@/lib/pdf/officialMatchSheetPdf';
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

describe('generateOfficialMatchSheetPdf', () => {
  it('gera PDF de 1 página A4 paisagem para 3 sets', () => {
    const doc = generateOfficialMatchSheetPdf(baseData());
    expect(doc.getNumberOfPages()).toBe(1);
    expect(doc.internal.pageSize.getWidth()).toBeCloseTo(297, 0);
    expect(doc.internal.pageSize.getHeight()).toBeCloseTo(210, 0);
  });

  it('gera PDF de 1 página A3 paisagem para 5 sets', () => {
    const doc = generateOfficialMatchSheetPdf(baseData({ format: '5-sets' }));
    expect(doc.getNumberOfPages()).toBe(1);
    expect(doc.internal.pageSize.getWidth()).toBeCloseTo(420, 0);
    expect(doc.internal.pageSize.getHeight()).toBeCloseTo(297, 0);
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

  it('baixa sem lançar erro', () => {
    const doc = generateOfficialMatchSheetPdf(baseData());
    expect(() => downloadOfficialPdf(doc, 'sumula_teste.pdf')).not.toThrow();
  });
});

describe('generatePositionOrderSheetPdf', () => {
  it('gera PDF de 1 página A4 paisagem com 8 fichas', () => {
    const doc = generatePositionOrderSheetPdf(baseData());
    expect(doc.getNumberOfPages()).toBe(1);
    expect(doc.internal.pageSize.getWidth()).toBeCloseTo(297, 0);
    expect(doc.internal.pageSize.getHeight()).toBeCloseTo(210, 0);
  });

  it('gera PDF também para formato 5 sets (6 fichas por equipe em 2 páginas)', () => {
    const doc = generatePositionOrderSheetPdf(baseData({ format: '5-sets' }));
    expect(doc.getNumberOfPages()).toBe(2);
  });
});