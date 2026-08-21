import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import {
  buildSumulaData,
  buildOrdemSaqueData,
  generateThreeSetScoresheet,
  generateFiveSetScoresheet,
  generateServeOrderSheet,
} from '../src/document-engine/generators';
import type { MatchDocument } from '../src/document-engine/schemas/match.schema';

async function main() {
  const match: MatchDocument = {
    id: 'match-demo-1',
    competitionId: 'comp-1',
    competitionName: 'COPA TOLEDO 2026 - MASCULINO',
    categoryName: 'ADULTO ESPECIAL',
    gender: 'male',
    matchNumber: 7,
    round: 1,
    phase: 'CLASSIFICATÓRIA',
    format: '3-sets',
    date: '22/08/2026',
    startTime: '19:00',
    venue: 'GINÁSIO MUNICIPAL',
    court: 'QUADRA 1',
    teamA: {
      id: 'team-1',
      name: 'OSASCO VOLEIBOL',
      coach: 'Luizomar de Moura',
      players: [
        { id: 'p1', name: 'Fernanda Silva (C)', shirtNumber: 1, isLibero: false, position: 'setter' },
        { id: 'p2', name: 'Amanda Costa', shirtNumber: 4, isLibero: false, position: 'outside_hitter' },
        { id: 'p3', name: 'Juliana Santos', shirtNumber: 7, isLibero: false, position: 'opposite' },
        { id: 'p4', name: 'Patricia Lima', shirtNumber: 10, isLibero: false, position: 'middle_blocker' },
        { id: 'p5', name: 'Carla Oliveira', shirtNumber: 12, isLibero: false, position: 'outside_hitter' },
        { id: 'p6', name: 'Beatriz Mendes (L)', shirtNumber: 15, isLibero: true, position: 'libero' },
        { id: 'p7', name: 'Renata Albuquerque', shirtNumber: 18, isLibero: false, position: 'middle_blocker' },
        { id: 'p8', name: 'Larissa Martins', shirtNumber: 20, isLibero: false, position: 'setter' },
      ],
    },
    teamB: {
      id: 'team-2',
      name: 'MINAS TÊNIS CLUBE',
      coach: 'Nicola Negro',
      players: [
        { id: 'p9', name: 'Ana Cristina Souza (C)', shirtNumber: 3, isLibero: false, position: 'outside_hitter' },
        { id: 'p10', name: 'Marina Souza', shirtNumber: 6, isLibero: false, position: 'middle_blocker' },
        { id: 'p11', name: 'Letícia Hage', shirtNumber: 9, isLibero: false, position: 'opposite' },
        { id: 'p12', name: 'Kasiely Clemente (L)', shirtNumber: 16, isLibero: true, position: 'libero' },
        { id: 'p13', name: 'Fernanda Silva', shirtNumber: 18, isLibero: false, position: 'setter' },
        { id: 'p14', name: 'Amanda Costa', shirtNumber: 19, isLibero: false, position: 'outside_hitter' },
        { id: 'p15', name: 'Isabela Paquiardi', shirtNumber: 21, isLibero: false, position: 'middle_blocker' },
        { id: 'p16', name: 'Priscila Heldes', shirtNumber: 22, isLibero: false, position: 'setter' },
      ],
    },
    sets: [
      {
        number: 1,
        pointsA: 25,
        pointsB: 22,
        lineupA: { teamId: 'team-1', setNumber: 1, positions: { I: 'p1', II: 'p2', III: 'p3', IV: 'p4', V: 'p5', VI: 'p7' }, servingPosition: 'I' },
        lineupB: { teamId: 'team-2', setNumber: 1, positions: { I: 'p9', II: 'p10', III: 'p11', IV: 'p13', V: 'p14', VI: 'p15' }, servingPosition: 'I' },
        substitutions: [],
        sanctions: [],
      },
      {
        number: 2,
        pointsA: 23,
        pointsB: 25,
        lineupA: { teamId: 'team-1', setNumber: 2, positions: { I: 'p1', II: 'p2', III: 'p3', IV: 'p4', V: 'p5', VI: 'p7' }, servingPosition: 'I' },
        lineupB: { teamId: 'team-2', setNumber: 2, positions: { I: 'p9', II: 'p10', III: 'p11', IV: 'p13', V: 'p14', VI: 'p15' }, servingPosition: 'I' },
        substitutions: [],
        sanctions: [],
      },
      {
        number: 3,
        pointsA: 25,
        pointsB: 18,
        lineupA: { teamId: 'team-1', setNumber: 3, positions: { I: 'p1', II: 'p2', III: 'p3', IV: 'p4', V: 'p5', VI: 'p7' }, servingPosition: 'I' },
        lineupB: { teamId: 'team-2', setNumber: 3, positions: { I: 'p9', II: 'p10', III: 'p11', IV: 'p13', V: 'p14', VI: 'p15' }, servingPosition: 'I' },
        substitutions: [],
        sanctions: [],
      },
    ],
    officials: {
      referee1: 'Carlos Silva',
      referee2: 'Ana Santos',
      scorer: 'Pedro Oliveira',
    },
    result: {
      winnerTeamId: 'team-1',
    },
    observations: 'Partida realizada no Ginásio Municipal de Toledo com transmissão oficial.',
  };

  const outDir = '/home/diego-martins/.gemini/antigravity-ide/brain/6e877f8a-f8f4-4606-8f90-988b662b3438/scratch/pdf_renders';
  await fs.mkdir(outDir, { recursive: true });

  // 1. Súmula 3 sets
  const sumulaData = buildSumulaData(match);
  const pdfBytes = await generateThreeSetScoresheet(sumulaData);
  const pdfPath = path.join(outDir, 'sumula_oficial_3_sets.pdf');
  await fs.writeFile(pdfPath, pdfBytes);
  execSync(`pdftoppm -png -r 150 "${pdfPath}" "${path.join(outDir, 'sumula_oficial_3_sets')}"`);

  // 2. Fichas de Ordem de Saque
  const ordemData = buildOrdemSaqueData(match);
  const ordemBytes = await generateServeOrderSheet(ordemData);
  const ordemPath = path.join(outDir, 'ordem_saque_oficial.pdf');
  await fs.writeFile(ordemPath, ordemBytes);
  execSync(`pdftoppm -png -r 150 "${ordemPath}" "${path.join(outDir, 'ordem_saque_oficial')}"`);

  console.log('Todos os documentos gerados e convertidos com sucesso!');
}

main().catch(console.error);
