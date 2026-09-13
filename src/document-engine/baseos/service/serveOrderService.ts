// =====================================================================
// BaseOS Service - Fachada da Ordem de Saque / Fichas de Posição
// =====================================================================

import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { PDFDocument } from 'pdf-lib';
import type {
  BaseosServeOrderData,
  ServeOrderCardData,
  ServeOrderFormat,
  ServeOrderTeamData,
} from '../types/serveOrder';
import type { BaseosScoresheetData, ScoresheetFormat } from '../types/scoresheet';
import { BaseosServeOrderDocument } from '../templates/BaseosServeOrderDocument';
import { generateBaseosPdfBlob } from './scoresheetService';

/**
 * Resolve o formato canônico da Ordem de Saque respeitando as regras esportivas:
 * setsToWin = 1 -> '1-set'
 * setsToWin = 3 -> '5-sets'
 * setsToWin = 2 (padrão) -> '3-sets'
 */
export function resolveServeOrderFormat(scoresheetData: BaseosScoresheetData): ServeOrderFormat {
  const setsToWin = scoresheetData.rules?.setsToWin;
  const maxSets = scoresheetData.rules?.maxSets;

  if (setsToWin === 1 || maxSets === 1) {
    return '1-set';
  }
  if (setsToWin === 3 || maxSets === 5 || scoresheetData.document.format === '5-sets') {
    return '5-sets';
  }
  return '3-sets';
}

/**
 * Gera as filipetas para a Ordem de Saque com separação semântica estrita
 * entre sets oficiais e fichas de reserva.
 */
export function generateServeOrderCards(
  teamA: ServeOrderTeamData,
  teamB: ServeOrderTeamData,
  format: ServeOrderFormat,
  matchNumber?: number | string,
): ServeOrderCardData[] {
  const cards: ServeOrderCardData[] = [];

  const createCard = (
    side: 'A' | 'B',
    team: ServeOrderTeamData,
    cardType: 'official-set' | 'reserve',
    setNumber?: number,
    isDecidingSet?: boolean,
  ): ServeOrderCardData => ({
    teamSide: side,
    teamName: team.name,
    cardType,
    setNumber,
    isDecidingSet,
    coachName: team.coachName,
    libero1Jersey: team.libero1Jersey,
    libero2Jersey: team.libero2Jersey,
    captainJersey: team.captainJersey,
    matchNumber,
  });

  if (format === '1-set') {
    // 1 Set Único: 1 oficial + 3 reservas por equipe (Total: 8 cards / 1 página)
    cards.push(createCard('A', teamA, 'official-set', 1, true));
    for (let i = 0; i < 3; i++) cards.push(createCard('A', teamA, 'reserve'));

    cards.push(createCard('B', teamB, 'official-set', 1, true));
    for (let i = 0; i < 3; i++) cards.push(createCard('B', teamB, 'reserve'));
  } else if (format === '3-sets') {
    // Melhor de 3 Sets: 3 oficiais (S1, S2, S3 Decisivo) + 1 reserva por equipe (Total: 8 cards / 1 página)
    cards.push(createCard('A', teamA, 'official-set', 1, false));
    cards.push(createCard('A', teamA, 'official-set', 2, false));
    cards.push(createCard('A', teamA, 'official-set', 3, true));
    cards.push(createCard('A', teamA, 'reserve'));

    cards.push(createCard('B', teamB, 'official-set', 1, false));
    cards.push(createCard('B', teamB, 'official-set', 2, false));
    cards.push(createCard('B', teamB, 'official-set', 3, true));
    cards.push(createCard('B', teamB, 'reserve'));
  } else {
    // Melhor de 5 Sets: Página 1 (S1..S4) + Página 2 (S5 Decisivo + 3 reservas) (Total: 16 cards / 2 páginas)
    // Equipe A (8 cards)
    cards.push(createCard('A', teamA, 'official-set', 1, false));
    cards.push(createCard('A', teamA, 'official-set', 2, false));
    cards.push(createCard('A', teamA, 'official-set', 3, false));
    cards.push(createCard('A', teamA, 'official-set', 4, false));
    cards.push(createCard('A', teamA, 'official-set', 5, true));
    for (let i = 0; i < 3; i++) cards.push(createCard('A', teamA, 'reserve'));

    // Equipe B (8 cards)
    cards.push(createCard('B', teamB, 'official-set', 1, false));
    cards.push(createCard('B', teamB, 'official-set', 2, false));
    cards.push(createCard('B', teamB, 'official-set', 3, false));
    cards.push(createCard('B', teamB, 'official-set', 4, false));
    cards.push(createCard('B', teamB, 'official-set', 5, true));
    for (let i = 0; i < 3; i++) cards.push(createCard('B', teamB, 'reserve'));
  }

  return cards;
}

/**
 * Mapeia os dados canônicos da Súmula (BaseosScoresheetData) para a Ordem de Saque
 * sem inclusão desnecessária de elenco completo e com dados contextuais seguros.
 */
export function mapScoresheetToServeOrderData(
  scoresheetData: BaseosScoresheetData,
): BaseosServeOrderData {
  const format = resolveServeOrderFormat(scoresheetData);

  const teamACoach = scoresheetData.teams.A.staff.find(s => s.roleCode === 'T')?.name;
  const teamBCoach = scoresheetData.teams.B.staff.find(s => s.roleCode === 'T')?.name;

  const teamALibero1 = scoresheetData.teams.A.liberos?.[0]?.jerseyNumber;
  const teamALibero2 = scoresheetData.teams.A.liberos?.[1]?.jerseyNumber;
  const teamBLibero1 = scoresheetData.teams.B.liberos?.[0]?.jerseyNumber;
  const teamBLibero2 = scoresheetData.teams.B.liberos?.[1]?.jerseyNumber;

  const teamACaptain = scoresheetData.teams.A.athletes.find(a => a.isCaptain)?.jerseyNumber;
  const teamBCaptain = scoresheetData.teams.B.athletes.find(a => a.isCaptain)?.jerseyNumber;

  const teamA: ServeOrderTeamData = {
    name: scoresheetData.teams.A.name,
    shortName: scoresheetData.teams.A.shortName,
    coachName: teamACoach,
    libero1Jersey: teamALibero1,
    libero2Jersey: teamALibero2,
    captainJersey: teamACaptain,
  };

  const teamB: ServeOrderTeamData = {
    name: scoresheetData.teams.B.name,
    shortName: scoresheetData.teams.B.shortName,
    coachName: teamBCoach,
    libero1Jersey: teamBLibero1,
    libero2Jersey: teamBLibero2,
    captainJersey: teamBCaptain,
  };

  const maxSets = format === '1-set' ? 1 : format === '5-sets' ? 5 : 3;
  const setsToWin = format === '1-set' ? 1 : format === '5-sets' ? 3 : 2;

  const cards = generateServeOrderCards(teamA, teamB, format, scoresheetData.match.number);

  return {
    document: {
      type: 'BASEOS_SERVE_ORDER',
      version: '1.0',
      state: scoresheetData.document.state === 'blank' ? 'blank' : 'prefilled',
      format,
      generatedAt: new Date().toISOString(),
    },
    competition: {
      name: scoresheetData.competition.name,
      category: scoresheetData.match.category,
      gender: scoresheetData.match.gender,
      phase: scoresheetData.competition.phase,
      round: String(scoresheetData.competition.round || ''),
    },
    match: {
      number: scoresheetData.match.number,
      date: scoresheetData.competition.date,
      time: scoresheetData.match.scheduledTime,
      court: scoresheetData.competition.court,
      city: scoresheetData.competition.city,
    },
    teams: {
      teamA,
      teamB,
    },
    rules: {
      setsToWin,
      maxSets,
      format,
    },
    cards,
  };
}

/**
 * Cria a estrutura em branco da Ordem de Saque para impressão limpa.
 */
export function createBlankBaseosServeOrderData(
  format: ServeOrderFormat = '3-sets',
): BaseosServeOrderData {
  const teamA: ServeOrderTeamData = { name: 'EQUIPE A' };
  const teamB: ServeOrderTeamData = { name: 'EQUIPE B' };
  const maxSets = format === '1-set' ? 1 : format === '5-sets' ? 5 : 3;
  const setsToWin = format === '1-set' ? 1 : format === '5-sets' ? 3 : 2;

  const cards = generateServeOrderCards(teamA, teamB, format);

  return {
    document: {
      type: 'BASEOS_SERVE_ORDER',
      version: '1.0',
      state: 'blank',
      format,
      generatedAt: new Date().toISOString(),
    },
    competition: {
      name: 'COMPETIÇÃO OFICIAL BASEOS',
    },
    match: {},
    teams: {
      teamA,
      teamB,
    },
    rules: {
      setsToWin,
      maxSets,
      format,
    },
    cards,
  };
}

/**
 * Gera o Blob binário da Ordem de Saque a partir do contrato tipado.
 */
export async function generateServeOrderPdfBlob(data: BaseosServeOrderData): Promise<Blob> {
  const docElement = React.createElement(BaseosServeOrderDocument, {
    data,
  }) as unknown as Parameters<typeof pdf>[0];
  const pdfInstance = pdf(docElement);
  return pdfInstance.toBlob();
}

/**
 * Gera o Blob da Ordem de Saque em Branco.
 */
export async function generateBlankServeOrderPdfBlob(
  format: ServeOrderFormat = '3-sets',
): Promise<Blob> {
  const blankData = createBlankBaseosServeOrderData(format);
  return generateServeOrderPdfBlob(blankData);
}

/**
 * Executa o download direto da Ordem de Saque no navegador.
 */
export async function downloadServeOrderSheet(
  data: BaseosServeOrderData,
  customFileName?: string,
): Promise<void> {
  const blob = await generateServeOrderPdfBlob(data);
  const fileName =
    customFileName ||
    `Ordem_de_Saque_BaseOS_${data.match.number || '1'}_${data.document.state}_${data.document.format}.pdf`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Imprime a Ordem de Saque silenciosamente via iframe.
 */
export async function printServeOrderSheet(data: BaseosServeOrderData): Promise<void> {
  const blob = await generateServeOrderPdfBlob(data);
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

/**
 * FASE B (P2 Não-Bloqueante): Gera o Pacote Completo do Jogo
 * Concatenando Súmula Canônica (A4 Retrato) + Ordem de Saque (A4 Paisagem) via pdf-lib.
 */
/**
 * Converte um Blob em Uint8Array com suporte universal (modern browsers e fallback para FileReader em JSDOM)
 */
async function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function') {
    return new Uint8Array(await blob.arrayBuffer());
  }
  return new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(new Error('Falha ao ler ArrayBuffer do Blob'));
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Gera o Pacote Oficial do Jogo unificado em um único PDF multi-páginas:
 * Concatenando Súmula Canônica (A4 Paisagem) + Ordem de Saque (A4 Paisagem) via pdf-lib.
 */
export async function generateGamePackagePdfBlob(
  scoresheetData: BaseosScoresheetData,
): Promise<Blob> {
  try {
    // 1. Gera os dois PDFs independentes
    const sumulaBlob = await generateBaseosPdfBlob(scoresheetData);
    const serveOrderData = mapScoresheetToServeOrderData(scoresheetData);
    const serveOrderBlob = await generateServeOrderPdfBlob(serveOrderData);

    // 2. Converte para Uint8Array com fallback universal
    const sumulaBytes = await blobToUint8Array(sumulaBlob);
    const serveOrderBytes = await blobToUint8Array(serveOrderBlob);

    // 3. Concatena usando pdf-lib
    const mergedDoc = await PDFDocument.create();
    const loadedSumula = await PDFDocument.load(sumulaBytes);
    const loadedServeOrder = await PDFDocument.load(serveOrderBytes);

    const sumulaPages = await mergedDoc.copyPages(loadedSumula, loadedSumula.getPageIndices());
    sumulaPages.forEach(p => mergedDoc.addPage(p));

    const serveOrderPages = await mergedDoc.copyPages(
      loadedServeOrder,
      loadedServeOrder.getPageIndices(),
    );
    serveOrderPages.forEach(p => mergedDoc.addPage(p));

    const mergedPdfBytes = await mergedDoc.save();
    return new Blob([mergedPdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  } catch (error) {
    console.error('[BaseOS] Falha ao gerar Pacote do Jogo unificado:', error);
    // Fallback gracioso: retorna a Súmula para não bloquear a emissão
    return generateBaseosPdfBlob(scoresheetData);
  }
}
