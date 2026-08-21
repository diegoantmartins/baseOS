// TEMPORÁRIO — Fase 2: gera os PDFs dos 3 documentos com dados da seção 42
// e grava em /home/diego-martins/docker/tmp/opencode/fase2/ para análise.

import { describe, it } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { generateThreeSetScoresheet } from '@/document-engine/generators/sumula3.generator';
import { generateFiveSetScoresheet } from '@/document-engine/generators/sumula5.generator';
import { generateServeOrderSheet } from '@/document-engine/generators/ordemSaque.generator';
import { buildOrdemSaqueData, buildSumulaData } from '@/document-engine/generators';
import { loadTemplateBytes } from '@/document-engine/utils/pdfUtils';
import type { MatchDocument } from '@/document-engine/schemas/match.schema';

const OUT = '/home/diego-martins/docker/tmp/opencode/fase2';

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

describe('FASE 2 dump', () => {
  it('grava os 3 PDFs gerados + templates em disco', async () => {
    mkdirSync(OUT, { recursive: true });
    const m3 = buildMatch('3-sets');
    const m5 = buildMatch('5-sets');
    const [sum3, sum5, ordem] = await Promise.all([
      generateThreeSetScoresheet(buildSumulaData(m3)),
      generateFiveSetScoresheet(buildSumulaData(m5)),
      generateServeOrderSheet(buildOrdemSaqueData(m5)),
    ]);
    writeFileSync(`${OUT}/sumula3-gerada.pdf`, sum3);
    writeFileSync(`${OUT}/sumula5-gerada.pdf`, sum5);
    writeFileSync(`${OUT}/ordem-gerada.pdf`, ordem);
    writeFileSync(`${OUT}/sumula3-template.pdf`, await loadTemplateBytes('sumula3'));
    writeFileSync(`${OUT}/sumula5-template.pdf`, await loadTemplateBytes('sumula5'));
    writeFileSync(`${OUT}/ordem-template.pdf`, await loadTemplateBytes('ordem-saque'));
  });
});