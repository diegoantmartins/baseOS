import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { generateOfficialMatchSheetPdf, generatePositionOrderSheetPdf } from '../src/lib/pdf/officialMatchSheetPdf';

async function main() {
  const matchData = {
    orgName: 'VolleyPro',
    competition: 'Copa Toledo 2026 - Masculino',
    category: 'Masculino Adulto',
    genderCategory: 'male' as const,
    modality: 'indoor' as const,
    format: '3-sets' as const,
    playerFormat: '6x6' as const,
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
        { jerseyNumber: 4, name: 'Amanda Costa', position: 'Ponteira' },
        { jerseyNumber: 7, name: 'Juliana Santos', position: 'Oposta' },
        { jerseyNumber: 10, name: 'Patricia Lima', position: 'Central' },
        { jerseyNumber: 12, name: 'Carla Oliveira', position: 'Ponteira' },
        { jerseyNumber: 15, name: 'Beatriz Mendes', position: 'Líbero', libero: true },
        { jerseyNumber: 18, name: 'Renata Albuquerque', position: 'Central' },
        { jerseyNumber: 20, name: 'Larissa Martins', position: 'Levantadora' },
      ],
      coach: 'Luizomar de Moura',
    },
    teamB: {
      name: 'Minas Tênis Clube',
      shortName: 'MIN',
      athletes: [
        { jerseyNumber: 3, name: 'Ana Cristina Souza', position: 'Ponteira', captain: true },
        { jerseyNumber: 6, name: 'Marina Souza', position: 'Central' },
        { jerseyNumber: 9, name: 'Letícia Hage', position: 'Oposta' },
        { jerseyNumber: 16, name: 'Kasiely Clemente', position: 'Líbero', libero: true },
        { jerseyNumber: 18, name: 'Fernanda Silva', position: 'Levantadora' },
        { jerseyNumber: 19, name: 'Amanda Costa', position: 'Ponteira' },
        { jerseyNumber: 21, name: 'Isabela Paquiardi', position: 'Central' },
        { jerseyNumber: 22, name: 'Priscila Heldes', position: 'Levantadora' },
      ],
      coach: 'Nicola Negro',
    },
    sets: [
      { setNumber: 1, scoreA: 25, scoreB: 22 },
      { setNumber: 2, scoreA: 23, scoreB: 25 },
      { setNumber: 3, scoreA: 25, scoreB: 18 },
    ],
    finalScoreA: 2,
    finalScoreB: 1,
    winner: 'A' as const,
    referees: [
      { role: '1º Árbitro', name: 'Carlos Silva' },
      { role: '2º Árbitro', name: 'Ana Santos' },
      { role: 'Apontador', name: 'Pedro Oliveira' },
    ],
    timeouts: [],
    substitutions: [],
    sanctions: [],
    observations: 'Jogo válido pela fase classificatória - Grupo A. Partida realizada com sucesso.',
  };

  const outDir = '/home/diego-martins/.gemini/antigravity-ide/brain/6e877f8a-f8f4-4606-8f90-988b662b3438/scratch/pdf_renders';
  await fs.mkdir(outDir, { recursive: true });

  // 1. Súmula 3 sets
  const doc3 = generateOfficialMatchSheetPdf(matchData);
  const pdf3Path = path.join(outDir, 'sumula_3_sets_preenchida.pdf');
  await fs.writeFile(pdf3Path, Buffer.from(doc3.output('arraybuffer')));
  execSync(`pdftoppm -png -r 150 "${pdf3Path}" "${path.join(outDir, 'sumula_3_sets_preenchida')}"`);

  // 2. Ficha de Posição / Ordem de Saque
  const docOrdem = generatePositionOrderSheetPdf(matchData);
  const pdfOrdemPath = path.join(outDir, 'ordem_saque_preenchida.pdf');
  await fs.writeFile(pdfOrdemPath, Buffer.from(docOrdem.output('arraybuffer')));
  execSync(`pdftoppm -png -r 150 "${pdfOrdemPath}" "${path.join(outDir, 'ordem_saque_preenchida')}"`);

  console.log('Súmulas renderizadas com sucesso em PNG!');
}

main().catch(console.error);
