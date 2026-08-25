/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { BaseosThreeSetScoresheet } from '../src/document-engine/baseos/templates/BaseosThreeSetScoresheet';
import { BaseosFiveSetScoresheet } from '../src/document-engine/baseos/templates/BaseosFiveSetScoresheet';
import { createBlankBaseosScoresheetData } from '../src/document-engine/baseos/mapper/match.mapper';
import type { BaseosTeamData } from '../src/document-engine/baseos/types/team';

async function main() {
  const outDir = '/home/diego-martins/.gemini/antigravity-ide/brain/c1ce99eb-21dc-4a0a-aa05-0b2c19d4da6e';
  await fs.mkdir(outDir, { recursive: true });

  // 1. Dados BaseOS completos
  const data3 = createBlankBaseosScoresheetData('3-sets');
  data3.competition.name = 'CAMPEONATO PARANAENSE DE VOLEIBOL 2026';
  data3.competition.phase = 'SEMIFINAL';
  data3.competition.round = '2';
  data3.competition.date = '25/08/2026';
  data3.competition.location = 'GINÁSIO DE ESPORTES ALCIDES PAN';
  data3.competition.court = 'QUADRA PRINCIPAL';
  data3.competition.city = 'Toledo - PR';

  data3.match.number = 12;
  data3.match.category = 'ADULTO ESPECIAL';
  data3.match.gender = 'male';
  data3.match.scheduledTime = '19:30';

  const teamA: BaseosTeamData = {
    id: 'team-a',
    name: 'OSASCO VOLEIBOL CLUBE',
    shortName: 'OSA',
    athletes: [
      { jerseyNumber: 1, name: 'Fernanda Silva', isCaptain: true, isLibero: false, position: 'Levantadora' },
      { jerseyNumber: 4, name: 'Amanda Costa', isCaptain: false, isLibero: false, position: 'Ponteira' },
      { jerseyNumber: 7, name: 'Juliana Santos', isCaptain: false, isLibero: false, position: 'Oposta' },
      { jerseyNumber: 10, name: 'Patricia Lima', isCaptain: false, isLibero: false, position: 'Central' },
      { jerseyNumber: 12, name: 'Carla Oliveira', isCaptain: false, isLibero: false, position: 'Ponteira' },
      { jerseyNumber: 18, name: 'Renata Albuquerque', isCaptain: false, isLibero: false, position: 'Central' },
      { jerseyNumber: 20, name: 'Larissa Martins', isCaptain: false, isLibero: false, position: 'Levantadora' },
    ],
    liberos: [
      { jerseyNumber: 15, name: 'Beatriz Mendes', isCaptain: false, isLibero: true, position: 'Líbero' },
      { jerseyNumber: 13, name: 'Camila Brait', isCaptain: false, isLibero: true, position: 'Líbero' },
    ],
    staff: [
      { roleCode: 'T', roleLabel: 'Técnico', name: 'Luizomar de Moura' },
      { roleCode: 'AT1', roleLabel: 'Assistente Técnico', name: 'Jefferson Arosti' },
      { roleCode: 'PF', roleLabel: 'Preparador Físico', name: 'José Silva' },
      { roleCode: 'M/F', roleLabel: 'Médico / Fisioterapeuta', name: 'Dr. Roberto Mendes' },
    ],
  };

  const teamB: BaseosTeamData = {
    id: 'team-b',
    name: 'MINAS TÊNIS CLUBE',
    shortName: 'MIN',
    athletes: [
      { jerseyNumber: 3, name: 'Ana Cristina Souza', isCaptain: true, isLibero: false, position: 'Ponteira' },
      { jerseyNumber: 6, name: 'Marina Souza', isCaptain: false, isLibero: false, position: 'Central' },
      { jerseyNumber: 9, name: 'Letícia Hage', isCaptain: false, isLibero: false, position: 'Oposta' },
      { jerseyNumber: 18, name: 'Fernanda Silva', isCaptain: false, isLibero: false, position: 'Levantadora' },
      { jerseyNumber: 19, name: 'Amanda Costa', isCaptain: false, isLibero: false, position: 'Ponteira' },
      { jerseyNumber: 21, name: 'Isabela Paquiardi', isCaptain: false, isLibero: false, position: 'Central' },
      { jerseyNumber: 22, name: 'Priscila Heldes', isCaptain: false, isLibero: false, position: 'Levantadora' },
    ],
    liberos: [
      { jerseyNumber: 16, name: 'Kasiely Clemente', isCaptain: false, isLibero: true, position: 'Líbero' },
      { jerseyNumber: 17, name: 'Nyeme Costa', isCaptain: false, isLibero: true, position: 'Líbero' },
    ],
    staff: [
      { roleCode: 'T', roleLabel: 'Técnico', name: 'Nicola Negro' },
      { roleCode: 'AT1', roleLabel: 'Assistente Técnico', name: 'Rodrigo Fuentealba' },
      { roleCode: 'PF', roleLabel: 'Preparador Físico', name: 'Lucas Ramos' },
      { roleCode: 'M/F', roleLabel: 'Médico / Fisioterapeuta', name: 'Dr. Paulo Carvalho' },
    ],
  };

  data3.teams.A = teamA;
  data3.teams.B = teamB;

  data3.officials = {
    referee1: 'Carlos Silva (CBV)',
    referee2: 'Ana Santos (FPV)',
    scorer: 'Pedro Oliveira',
    assistantScorer: 'Mariana Lima',
    lineJudge1: 'João Batista',
    lineJudge2: 'Lucas Ferreira',
  };

  const data5 = createBlankBaseosScoresheetData('5-sets');
  Object.assign(data5.competition, data3.competition);
  Object.assign(data5.match, data3.match);
  data5.teams.A = JSON.parse(JSON.stringify(teamA));
  data5.teams.B = JSON.parse(JSON.stringify(teamB));
  data5.officials = { ...data3.officials };

  // 1. Render BaseOS React-PDF 3-sets
  const el3 = React.createElement(BaseosThreeSetScoresheet, { data: data3 }) as any;
  const blob3 = await pdf(el3).toBlob();
  const pdf3Path = path.join(outDir, 'baseos_react_sumula_3sets.pdf');
  await fs.writeFile(pdf3Path, Buffer.from(await blob3.arrayBuffer()));
  execSync(`pdftoppm -png -r 150 "${pdf3Path}" "${path.join(outDir, 'baseos_react_sumula_3sets')}"`);

  // 2. Render BaseOS React-PDF 5-sets
  const el5 = React.createElement(BaseosFiveSetScoresheet, { data: data5 }) as any;
  const blob5 = await pdf(el5).toBlob();
  const pdf5Path = path.join(outDir, 'baseos_react_sumula_5sets.pdf');
  await fs.writeFile(pdf5Path, Buffer.from(await blob5.arrayBuffer()));
  execSync(`pdftoppm -png -r 150 "${pdf5Path}" "${path.join(outDir, 'baseos_react_sumula_5sets')}"`);

  console.log('Sucesso total: renders 3-sets e 5-sets concluídos com perfeição!');
}

main().catch(console.error);
