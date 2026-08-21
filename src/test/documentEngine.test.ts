// Testes do Motor de Documentos — Fase 1:
// - carregamento dos 3 templates fixos (pdf-lib + node:fs)
// - dimensões esperadas das páginas
// - geração da súmula 3 sets, 5 sets e ficha de posição com dados de
//   exemplo (seção 42 do spec: CAMPEONATO TESTE, EQUIPE AZUL x VERMELHA)

import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { loadTemplateBytes, TEMPLATE_PAGE_SIZES } from '@/document-engine/utils/pdfUtils';
import { generateThreeSetScoresheet } from '@/document-engine/generators/sumula3.generator';
import { generateFiveSetScoresheet } from '@/document-engine/generators/sumula5.generator';
import { generateServeOrderSheet } from '@/document-engine/generators/ordemSaque.generator';
import { buildOrdemSaqueData, buildSumulaData, generateMatchDocuments } from '@/document-engine/generators';
import type { MatchDocument } from '@/document-engine/schemas/match.schema';
import type { OrdemSaqueData } from '@/document-engine/schemas/ordemSaque.schema';

const TEMPLATE_NAMES = ['sumula3', 'sumula5', 'ordem-saque'] as const;

describe('templates fixos (Fase 1)', () => {
  it.each(TEMPLATE_NAMES)('carrega o template %s via pdf-lib', async kind => {
    const bytes = await loadTemplateBytes(kind);
    expect(bytes.length).toBeGreaterThan(10_000);
    const doc = await PDFDocument.load(bytes, { updateMetadata: false });
    expect(doc.getPageCount()).toBe(1);
    const page = doc.getPage(0);
    expect(page.getWidth()).toBeCloseTo(TEMPLATE_PAGE_SIZES[kind].width, 1);
    expect(page.getHeight()).toBeCloseTo(TEMPLATE_PAGE_SIZES[kind].height, 1);
  });

  it('templates têm as dimensões esperadas (992x566, 1190x841, 841x595)', () => {
    expect(TEMPLATE_PAGE_SIZES.sumula3).toEqual({ width: 992, height: 566 });
    expect(TEMPLATE_PAGE_SIZES.sumula5).toEqual({ width: 1190, height: 841 });
    expect(TEMPLATE_PAGE_SIZES['ordem-saque']).toEqual({ width: 841, height: 595 });
  });
});

function buildMatch(format: '3-sets' | '5-sets'): MatchDocument {
  const players = (prefix: string) =>
    Array.from({ length: 12 }, (_, i) => ({
      id: `${prefix}${i + 1}`,
      name: `${prefix} Jogador ${i + 1}`,
      shirtNumber: i + 1,
      position: i < 6 ? 'Titular' : 'Reserva',
      active: true,
    }));
  const teamA = { id: 'azul', name: 'EQUIPE AZUL', shortName: 'AZUL', players: players('A'), liberoPlayers: [] };
  const teamB = { id: 'vermelha', name: 'EQUIPE VERMELHA', shortName: 'VERM', players: players('B'), liberoPlayers: [] };
  const startersA = teamA.players.slice(0, 6).map(p => p.id);
  const startersB = teamB.players.slice(0, 6).map(p => p.id);
  const POSITIONS = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const;
  const lineup = (teamId: string, starters: string[]) => ({
    setNumber: 0,
    teamId,
    positions: Object.fromEntries(POSITIONS.map((pos, i) => [pos, starters[i]])) as Record<(typeof POSITIONS)[number], string>,
    servingPosition: 'I' as const,
  });
  const setScores =
    format === '3-sets'
      ? [
          { pointsA: 25, pointsB: 21 },
          { pointsA: 23, pointsB: 25 },
          { pointsA: 25, pointsB: 19 },
        ]
      : [
          { pointsA: 25, pointsB: 20 },
          { pointsA: 21, pointsB: 25 },
          { pointsA: 25, pointsB: 22 },
          { pointsA: 19, pointsB: 25 },
          { pointsA: 15, pointsB: 12 },
        ];
  return {
    id: 'partida-teste',
    matchNumber: 1,
    competitionId: 'comp-teste',
    competitionName: 'CAMPEONATO TESTE',
    categoryName: 'LIVRE',
    gender: 'male',
    phase: 'FASE ÚNICA',
    round: 1,
    date: '2026-08-20',
    startTime: '19:00',
    venue: 'GINÁSIO TESTE',
    court: '1',
    city: 'CURITIBA',
    format,
    status: 'FINISHED',
    teamA,
    teamB,
    lineups: [],
    sets: setScores.map((s, i) => ({
      number: i + 1,
      pointsA: s.pointsA,
      pointsB: s.pointsB,
      lineupA: { ...lineup(teamA.id, startersA), setNumber: i + 1 },
      lineupB: { ...lineup(teamB.id, startersB), setNumber: i + 1 },
      substitutions: [],
      timeouts: [],
      sanctions: [],
    })),
    officials: { referee1: 'Árbitro 1 Teste', referee2: 'Árbitro 2 Teste', scorer: 'Apontador Teste' },
    result: {
      winnerTeamId: 'azul',
      teamASets: format === '3-sets' ? 2 : 3,
      teamBSets: format === '3-sets' ? 1 : 2,
      totalSets: format === '3-sets' ? 3 : 5,
    },
    observations: 'Partida válida pelo campeonato teste.',
  };
}

describe('geração de documentos (Fase 1)', () => {
  it('gera a súmula 3 sets com 1 página de 992x566', async () => {
    const bytes = await generateThreeSetScoresheet(buildSumulaData(buildMatch('3-sets')));
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getPage(0).getWidth()).toBeCloseTo(992, 1);
    expect(doc.getPage(0).getHeight()).toBeCloseTo(566, 1);
  });

  it('gera a súmula 5 sets com 1 página de 1190x841', async () => {
    const bytes = await generateFiveSetScoresheet(buildSumulaData(buildMatch('5-sets')));
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getPage(0).getWidth()).toBeCloseTo(1190, 1);
    expect(doc.getPage(0).getHeight()).toBeCloseTo(841, 1);
  });

  it('gera a ficha de posição (ordem de saque) com 1 página de 841x595', async () => {
    const match = buildMatch('5-sets');
    const data: OrdemSaqueData = buildOrdemSaqueData(match);
    expect(data.cards.length).toBeGreaterThanOrEqual(2);
    const bytes = await generateServeOrderSheet(data);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getPage(0).getWidth()).toBeCloseTo(841, 1);
    expect(doc.getPage(0).getHeight()).toBeCloseTo(595, 1);
  });

  it('generateMatchDocuments gera súmula + ficha de posição', async () => {
    const result = await generateMatchDocuments(buildMatch('3-sets'));
    expect(result.sumula.length).toBeGreaterThan(10_000);
    expect(result.serveOrder?.length).toBeGreaterThan(10_000);
    expect(result.fileName).toMatch(/^SUMULA_1_EQUIPE_AZUL_X_EQUIPE_VERMELHA\.pdf$/);
  });

  it('rejeita partida sem sets', async () => {
    const match = buildMatch('3-sets');
    match.sets = [];
    await expect(generateMatchDocuments(match)).rejects.toThrow(/sem sets/i);
  });
});