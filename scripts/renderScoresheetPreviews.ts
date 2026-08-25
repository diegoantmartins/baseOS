import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import {
  buildSumulaData,
  generateThreeSetScoresheet,
  generateFiveSetScoresheet,
} from '../src/document-engine/generators';
import type { MatchDocument } from '../src/document-engine/schemas/match.schema';

async function main() {
  const match3Sets: MatchDocument = {
    id: 'match-demo-3sets',
    competitionId: 'comp-1',
    competitionName: 'CAMPEONATO PARANAENSE DE VOLEIBOL 2026',
    categoryName: 'ADULTO ESPECIAL',
    gender: 'male',
    matchNumber: 12,
    round: 2,
    phase: 'SEMIFINAL',
    format: '3-sets',
    date: '25/08/2026',
    startTime: '19:30',
    venue: 'GINÁSIO DE ESPORTES ALCIDES PAN',
    court: 'QUADRA PRINCIPAL',
    city: 'Toledo',
    state: 'PR',
    teamA: {
      id: 'team-1',
      name: 'OSASCO VOLEIBOL CLUBE',
      coach: 'Luizomar de Moura',
      assistantCoach: 'Jefferson Arosti',
      preparer: 'José Silva',
      doctor: 'Dr. Roberto Mendes',
      players: [
        { id: 'p1', name: 'Fernanda Silva (C)', shirtNumber: 1, isLibero: false, isCaptain: true, position: 'setter' },
        { id: 'p2', name: 'Amanda Costa', shirtNumber: 4, isLibero: false, position: 'outside_hitter' },
        { id: 'p3', name: 'Juliana Santos', shirtNumber: 7, isLibero: false, position: 'opposite' },
        { id: 'p4', name: 'Patricia Lima', shirtNumber: 10, isLibero: false, position: 'middle_blocker' },
        { id: 'p5', name: 'Carla Oliveira', shirtNumber: 12, isLibero: false, position: 'outside_hitter' },
        { id: 'p6', name: 'Beatriz Mendes (L1)', shirtNumber: 15, isLibero: true, position: 'libero' },
        { id: 'p7', name: 'Renata Albuquerque', shirtNumber: 18, isLibero: false, position: 'middle_blocker' },
        { id: 'p8', name: 'Larissa Martins', shirtNumber: 20, isLibero: false, position: 'setter' },
        { id: 'p9', name: 'Camila Brait (L2)', shirtNumber: 13, isLibero: true, position: 'libero' },
        { id: 'p10', name: 'Tifanny Abreu', shirtNumber: 25, isLibero: false, position: 'opposite' },
      ],
    },
    teamB: {
      id: 'team-2',
      name: 'MINAS TÊNIS CLUBE',
      coach: 'Nicola Negro',
      assistantCoach: 'Rodrigo Fuentealba',
      preparer: 'Lucas Ramos',
      doctor: 'Dr. Paulo Carvalho',
      players: [
        { id: 'p11', name: 'Ana Cristina Souza (C)', shirtNumber: 3, isLibero: false, isCaptain: true, position: 'outside_hitter' },
        { id: 'p12', name: 'Marina Souza', shirtNumber: 6, isLibero: false, position: 'middle_blocker' },
        { id: 'p13', name: 'Letícia Hage', shirtNumber: 9, isLibero: false, position: 'opposite' },
        { id: 'p14', name: 'Kasiely Clemente (L1)', shirtNumber: 16, isLibero: true, position: 'libero' },
        { id: 'p15', name: 'Fernanda Silva', shirtNumber: 18, isLibero: false, position: 'setter' },
        { id: 'p16', name: 'Amanda Costa', shirtNumber: 19, isLibero: false, position: 'outside_hitter' },
        { id: 'p17', name: 'Isabela Paquiardi', shirtNumber: 21, isLibero: false, position: 'middle_blocker' },
        { id: 'p18', name: 'Priscila Heldes', shirtNumber: 22, isLibero: false, position: 'setter' },
        { id: 'p19', name: 'Nyeme Costa (L2)', shirtNumber: 17, isLibero: true, position: 'libero' },
        { id: 'p20', name: 'Thaisa Daher', shirtNumber: 8, isLibero: false, position: 'middle_blocker' },
      ],
    },
    sets: [
      {
        number: 1,
        pointsA: 25,
        pointsB: 22,
        durationMinutes: 28,
        lineupA: { teamId: 'team-1', setNumber: 1, positions: { I: 'p1', II: 'p2', III: 'p3', IV: 'p4', V: 'p5', VI: 'p7' }, servingPosition: 'I' },
        lineupB: { teamId: 'team-2', setNumber: 1, positions: { I: 'p11', II: 'p12', III: 'p13', IV: 'p15', V: 'p16', VI: 'p17' }, servingPosition: 'I' },
        substitutions: [],
        sanctions: [],
      },
      {
        number: 2,
        pointsA: 23,
        pointsB: 25,
        durationMinutes: 30,
        lineupA: { teamId: 'team-1', setNumber: 2, positions: { I: 'p1', II: 'p2', III: 'p3', IV: 'p4', V: 'p5', VI: 'p7' }, servingPosition: 'I' },
        lineupB: { teamId: 'team-2', setNumber: 2, positions: { I: 'p11', II: 'p12', III: 'p13', IV: 'p15', V: 'p16', VI: 'p17' }, servingPosition: 'I' },
        substitutions: [],
        sanctions: [],
      },
      {
        number: 3,
        pointsA: 25,
        pointsB: 18,
        durationMinutes: 24,
        lineupA: { teamId: 'team-1', setNumber: 3, positions: { I: 'p1', II: 'p2', III: 'p3', IV: 'p4', V: 'p5', VI: 'p7' }, servingPosition: 'I' },
        lineupB: { teamId: 'team-2', setNumber: 3, positions: { I: 'p11', II: 'p12', III: 'p13', IV: 'p15', V: 'p16', VI: 'p17' }, servingPosition: 'I' },
        substitutions: [],
        sanctions: [],
      },
    ],
    officials: {
      referee1: 'Carlos Silva (CBV)',
      referee2: 'Ana Santos (FPV)',
      scorer: 'Pedro Oliveira',
      assistantScorer: 'Mariana Lima',
      judge1: 'João Batista',
      judge2: 'Lucas Ferreira',
    },
    result: {
      winnerTeamId: 'team-1',
      finalScoreSetsA: 2,
      finalScoreSetsB: 1,
    },
    observations: 'Partida realizada em conformidade com as regras oficiais da CBV/FIVB. Sem intercorrências graves.',
  };

  const match5Sets: MatchDocument = {
    ...match3Sets,
    id: 'match-demo-5sets',
    format: '5-sets',
    sets: [
      ...match3Sets.sets,
      {
        number: 4,
        pointsA: 22,
        pointsB: 25,
        durationMinutes: 27,
        lineupA: { teamId: 'team-1', setNumber: 4, positions: { I: 'p1', II: 'p2', III: 'p3', IV: 'p4', V: 'p5', VI: 'p7' }, servingPosition: 'I' },
        lineupB: { teamId: 'team-2', setNumber: 4, positions: { I: 'p11', II: 'p12', III: 'p13', IV: 'p15', V: 'p16', VI: 'p17' }, servingPosition: 'I' },
        substitutions: [],
        sanctions: [],
      },
      {
        number: 5,
        pointsA: 15,
        pointsB: 12,
        durationMinutes: 18,
        lineupA: { teamId: 'team-1', setNumber: 5, positions: { I: 'p1', II: 'p2', III: 'p3', IV: 'p4', V: 'p5', VI: 'p7' }, servingPosition: 'I' },
        lineupB: { teamId: 'team-2', setNumber: 5, positions: { I: 'p11', II: 'p12', III: 'p13', IV: 'p15', V: 'p16', VI: 'p17' }, servingPosition: 'I' },
        substitutions: [],
        sanctions: [],
      },
    ],
    result: {
      winnerTeamId: 'team-1',
      finalScoreSetsA: 3,
      finalScoreSetsB: 2,
    },
  };

  const outDir = '/home/diego-martins/.gemini/antigravity-ide/brain/c1ce99eb-21dc-4a0a-aa05-0b2c19d4da6e';
  await fs.mkdir(outDir, { recursive: true });

  // 1. Gerar e converter Súmula de 3 Sets
  const sumula3Data = buildSumulaData(match3Sets);
  const pdf3Bytes = await generateThreeSetScoresheet(sumula3Data);
  const pdf3Path = path.join(outDir, 'sumula_3_sets_oficial.pdf');
  await fs.writeFile(pdf3Path, pdf3Bytes);
  execSync(`pdftoppm -png -r 150 "${pdf3Path}" "${path.join(outDir, 'preview_sumula_3_sets')}"`);

  // 2. Gerar e converter Súmula de 5 Sets
  const sumula5Data = buildSumulaData(match5Sets);
  const pdf5Bytes = await generateFiveSetScoresheet(sumula5Data);
  const pdf5Path = path.join(outDir, 'sumula_5_sets_oficial.pdf');
  await fs.writeFile(pdf5Path, pdf5Bytes);
  execSync(`pdftoppm -png -r 150 "${pdf5Path}" "${path.join(outDir, 'preview_sumula_5_sets')}"`);

  console.log('PDFs e PNGs gerados com sucesso no diretório de artefatos!');
}

main().catch(console.error);
