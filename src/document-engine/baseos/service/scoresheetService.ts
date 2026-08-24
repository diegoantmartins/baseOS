// =====================================================================
// BaseOS Service - Fachada do Motor Documental
// =====================================================================

import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { dataAccess } from '@/services/dataAccess';
import type { BaseosScoresheetData, DocumentState, ScoresheetFormat } from '../types/scoresheet';
import { mapMatchRecordToBaseosScoresheet, createBlankBaseosScoresheetData } from '../mapper/match.mapper';
import { validateBaseosScoresheetData } from '../validation/validator';
import { BaseosThreeSetScoresheet } from '../templates/BaseosThreeSetScoresheet';
import { BaseosFiveSetScoresheet } from '../templates/BaseosFiveSetScoresheet';
import type { CompetitionAthlete } from '@/types/registration';

/** Carrega os dados da partida e monta a estrutura oficial BaseosScoresheetData */
export async function loadBaseosScoresheetData(
  matchId: string,
  forcedState?: DocumentState,
): Promise<BaseosScoresheetData | null> {
  const match = await dataAccess.getMatch(matchId);
  if (!match) return null;

  const [competition, teams, competitionTeams, athletes] = await Promise.all([
    dataAccess.getCompetition(match.competitionId),
    dataAccess.listTeams(),
    dataAccess.listCompetitionTeams(),
    dataAccess.listCompetitionAthletes(),
  ]);

  const teamA = teams.find(t => t.id === match.teamAId);
  const teamB = teams.find(t => t.id === match.teamBId);

  // Busca elencos da competição
  const ctA = competitionTeams.find(
    ct => ct.competitionId === match.competitionId && ct.teamId === match.teamAId,
  );
  const ctB = competitionTeams.find(
    ct => ct.competitionId === match.competitionId && ct.teamId === match.teamBId,
  );

  let rosterA = ctA ? athletes.filter(a => a.competitionTeamId === ctA.id) : [];
  let rosterB = ctB ? athletes.filter(a => a.competitionTeamId === ctB.id) : [];

  // Fallback inteligente: se não houver atletas inscritos nesta competição específica, busca em qualquer cadastro existente da equipe
  if (rosterA.length === 0 || rosterB.length === 0) {
    if (rosterA.length === 0 && match.teamAId) {
      const anyCtA = competitionTeams.find(ct => ct.teamId === match.teamAId);
      if (anyCtA) {
        rosterA = athletes.filter(a => a.competitionTeamId === anyCtA.id);
      } else {
        const persons = await dataAccess.listPersons();
        const teamPersons = persons.filter(p => p.teamIds?.includes(match.teamAId));
        rosterA = teamPersons.map((p, i) => ({
          id: p.id,
          competitionTeamId: 'fallback-ct-a',
          name: p.fullName || p.nickname || `Jogador ${i + 1}`,
          jerseyNumber: i + 1,
          position: i < 6 ? 'Titular' : 'Reserva',
          isCaptain: i === 0,
          isLibero: i === 5,
          gender: 'male',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
      }
    }

    if (rosterB.length === 0 && match.teamBId) {
      const anyCtB = competitionTeams.find(ct => ct.teamId === match.teamBId);
      if (anyCtB) {
        rosterB = athletes.filter(a => a.competitionTeamId === anyCtB.id);
      } else {
        const persons = await dataAccess.listPersons();
        const teamPersons = persons.filter(p => p.teamIds?.includes(match.teamBId));
        rosterB = teamPersons.map((p, i) => ({
          id: p.id,
          competitionTeamId: 'fallback-ct-b',
          name: p.fullName || p.nickname || `Jogador ${i + 1}`,
          jerseyNumber: i + 1,
          position: i < 6 ? 'Titular' : 'Reserva',
          isCaptain: i === 0,
          isLibero: i === 5,
          gender: 'male',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
      }
    }
  }

  const scoresheetData = mapMatchRecordToBaseosScoresheet(
    match,
    competition,
    teamA,
    teamB,
    rosterA,
    rosterB,
    forcedState,
  );

  // Validação estrita
  const validation = validateBaseosScoresheetData(scoresheetData);
  if (!validation.valid) {
    console.warn('[BaseOS Scoresheet] Avisos de validação:', validation.warnings);
  }

  return scoresheetData;
}

/** Cria o elemento React Document do template correspondente */
export function createBaseosDocumentElement(data: BaseosScoresheetData): React.ReactElement {
  if (data.document.format === '5-sets') {
    return React.createElement(BaseosFiveSetScoresheet, { data });
  }
  return React.createElement(BaseosThreeSetScoresheet, { data });
}

/** Gera o Blob binário do PDF a partir dos dados do BaseOS */
export async function generateBaseosPdfBlob(data: BaseosScoresheetData): Promise<Blob> {
  const docElement = createBaseosDocumentElement(data);
  const pdfInstance = pdf(docElement);
  return pdfInstance.toBlob();
}

/** Gera a Súmula em Branco (modelo limpo para impressão) */
export async function generateBlankBaseosPdfBlob(format: ScoresheetFormat = '3-sets'): Promise<Blob> {
  const blankData = createBlankBaseosScoresheetData(format);
  return generateBaseosPdfBlob(blankData);
}

/** Executa o download direto do PDF no navegador */
export async function downloadBaseosScoresheet(
  data: BaseosScoresheetData,
  customFileName?: string,
): Promise<void> {
  const blob = await generateBaseosPdfBlob(data);
  const fileName =
    customFileName ||
    `Sumula_BaseOS_${data.match.number || '1'}_${data.document.state}_${data.document.format}.pdf`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Imprime o documento silenciosamente via iframe */
export async function printBaseosScoresheet(data: BaseosScoresheetData): Promise<void> {
  const blob = await generateBaseosPdfBlob(data);
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.src = url;
  document.body.appendChild(iframe);
  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  };
}
