// =====================================================================
// BaseOS Service - Fachada do Motor Documental
// =====================================================================

import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { PDFDocument } from 'pdf-lib';
import { dataAccess } from '@/services/dataAccess';
import type { BaseosScoresheetData, DocumentState, ScoresheetFormat, ScoresheetOutput } from '../types/scoresheet';
import { mapMatchRecordToBaseosScoresheet, createBlankBaseosScoresheetData } from '../mapper/match.mapper';
export const generateBlankBaseosScoresheetData = createBlankBaseosScoresheetData;
import { validateBaseosScoresheetData } from '../validation/validator';
import { BaseosThreeSetScoresheet } from '../templates/BaseosThreeSetScoresheet';
import { BaseosFiveSetScoresheet } from '../templates/BaseosFiveSetScoresheet';
import { BaseosBatchScoresheetDocument } from '../templates/BaseosBatchScoresheetDocument';
import type { CompetitionAthlete } from '@/types/registration';
import type { MatchRecord } from '@/types/entities';

import { getMatchRosters } from '@/services/registrationService';

/** Carrega os dados da partida e monta a estrutura oficial BaseosScoresheetData */
export async function loadBaseosScoresheetData(
  matchId: string,
  forcedState?: DocumentState,
  output: ScoresheetOutput = 'print-a4',
): Promise<BaseosScoresheetData | null> {
  const match = await dataAccess.getMatch(matchId);
  if (!match) return null;

  const [competition, teams, rosters] = await Promise.all([
    dataAccess.getCompetition(match.competitionId),
    dataAccess.listTeams(),
    getMatchRosters(match.id),
  ]);

  const teamA = teams.find(t => t.id === match.teamAId);
  const teamB = teams.find(t => t.id === match.teamBId);

  let rosterA = rosters.teamA;
  let rosterB = rosters.teamB;

  // Fallback inteligente: se não houver atletas inscritos nesta competição específica, busca em qualquer cadastro existente da equipe
  if (rosterA.length === 0 || rosterB.length === 0) {
    const persons = await dataAccess.listPersons();

    if (rosterA.length === 0 && match.teamAId) {
      const teamPersons = persons.filter(p => p.teamIds?.includes(match.teamAId));
      if (teamPersons.length > 0) {
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
      const teamPersons = persons.filter(p => p.teamIds?.includes(match.teamBId));
      if (teamPersons.length > 0) {
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
    output,
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

/** Gera a Súmula em Branco (modelo limpo para impressão) com suporte a quantidade personalizada de cópias */
export async function generateBlankBaseosPdfBlob(
  format: ScoresheetFormat = '3-sets',
  output: ScoresheetOutput = 'print-a4',
  copies: number = 1,
): Promise<Blob> {
  const blankData = createBlankBaseosScoresheetData(format, output);
  const singleBlob = await generateBaseosPdfBlob(blankData);
  if (copies <= 1) return singleBlob;

  const singleBytes = await singleBlob.arrayBuffer();
  const srcDoc = await PDFDocument.load(singleBytes);
  const outDoc = await PDFDocument.create();

  for (let c = 0; c < copies; c++) {
    const pageIndices = srcDoc.getPageIndices();
    const copiedPages = await outDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach(p => outDoc.addPage(p));
  }

  const outBytes = await outDoc.save();
  return new Blob([outBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
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

export interface BatchScoresheetOptions {
  competitionName?: string;
  fileName?: string;
  onProgress?: (current: number, total: number) => void;
}

/**
 * Converte uma lista heterogênea de partidas (BaseosScoresheetData | MatchRecord | matchId)
 * em uma lista ordenada canônica de BaseosScoresheetData, respeitando individualmente
 * o formato de cada partida (3 ou 5 sets via CompetitionRulesService.resolveMatchFormat).
 */
export async function resolveBatchScoresheetsData(
  items: (BaseosScoresheetData | MatchRecord | string)[],
  onProgress?: (current: number, total: number) => void,
): Promise<BaseosScoresheetData[]> {
  const result: BaseosScoresheetData[] = [];
  const total = items.length;

  for (let i = 0; i < total; i++) {
    const item = items[i];
    if (typeof item === 'string') {
      const data = await loadBaseosScoresheetData(item);
      if (data) result.push(data);
    } else if (item && typeof item === 'object' && 'document' in item && 'competition' in item && 'sets' in item) {
      result.push(item as BaseosScoresheetData);
    } else if (item && typeof item === 'object' && 'id' in item && 'competitionId' in item) {
      const data = await loadBaseosScoresheetData((item as MatchRecord).id);
      if (data) result.push(data);
    }

    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  return result;
}

/** Gera o Blob binário de um PDF compilado contendo múltiplas súmulas em lote */
export async function generateBaseosBatchPdfBlob(
  matchesData: BaseosScoresheetData[],
  title?: string,
): Promise<Blob> {
  const docElement = React.createElement(BaseosBatchScoresheetDocument, { matchesData, title });
  const pdfInstance = pdf(docElement);
  return pdfInstance.toBlob();
}

/** Executa o download de súmulas em lote em um único PDF compilado */
export async function downloadBaseosBatchScoresheets(
  matchesOrData: (BaseosScoresheetData | MatchRecord | string)[],
  competitionNameOrOptions?: string | BatchScoresheetOptions,
  legacyCustomFileName?: string,
): Promise<void> {
  const options: BatchScoresheetOptions =
    typeof competitionNameOrOptions === 'string'
      ? { competitionName: competitionNameOrOptions, fileName: legacyCustomFileName }
      : competitionNameOrOptions || {};

  const scoresheetsData = await resolveBatchScoresheetsData(matchesOrData, options.onProgress);

  if (scoresheetsData.length === 0) {
    throw new Error('Nenhuma súmula pôde ser carregada para o lote.');
  }

  const compName =
    options.competitionName ||
    scoresheetsData[0]?.competition.name ||
    'Competicao';
  const safeCompName = compName.replace(/[^a-zA-Z0-9_-]/g, '_');

  const defaultFileName = `Sumulas_${safeCompName}_${scoresheetsData.length}_jogos.pdf`;
  let targetFileName = options.fileName || legacyCustomFileName || defaultFileName;
  if (!targetFileName.toLowerCase().endsWith('.pdf')) {
    targetFileName += '.pdf';
  }

  const docTitle = targetFileName.replace(/\.pdf$/i, '');
  const blob = await generateBaseosBatchPdfBlob(scoresheetsData, docTitle);

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = targetFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

