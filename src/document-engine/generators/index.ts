// =====================================================================
// Motor de Documentos — entrada pública (index)
//
// Expõe o pipeline de geração dos documentos oficiais de uma partida:
// súmula 3 sets, súmula 5 sets e ficha de posição (ordem de saque).
//
// Geração sempre parte do template fixo (bytes). A validação garante
// os pré-requisitos regulamentares (dados da partida, escalações com
// posições I..VI preenchidas) antes de qualquer renderização.
// =====================================================================

import type { DocumentType, MatchDocument } from '../schemas/match.schema';
import type { OrdemSaqueData } from '../schemas/ordemSaque.schema';
import type { SumulaData } from '../schemas/sumula.schema';
import { sanitizeFileName } from '../utils/pdfUtils';
import type { GenerationOptions } from './sumula3.generator';
import { generateFiveSetScoresheet } from './sumula5.generator';
import { generateServeOrderSheet } from './ordemSaque.generator';
import { generateThreeSetScoresheet } from './sumula3.generator';

export { generateThreeSetScoresheet } from './sumula3.generator';
export { generateFiveSetScoresheet } from './sumula5.generator';
export { generateServeOrderSheet } from './ordemSaque.generator';

export type GenerateMatchDocumentsOptions = GenerationOptions & {
  /** Gera também a ficha de posição (ordem de saque). Padrão: true. */
  includeServeOrder?: boolean;
};

export type GenerateMatchDocumentsResult = {
  sumula: Uint8Array;
  sumulaType: DocumentType;
  serveOrder?: Uint8Array;
  fileName: string;
};

/** Nome do arquivo: SUMULA_[Nº]_[EQUIPE_A]_X_[EQUIPE_B].pdf */
export function buildSumulaFileName(match: MatchDocument): string {
  const a = sanitizeFileName(match.teamA.name).toUpperCase();
  const b = sanitizeFileName(match.teamB.name).toUpperCase();
  return `SUMULA_${match.matchNumber}_${a}_X_${b}.pdf`;
}

/** Validação leve antes da geração (Fase 1: pré-requisitos mínimos). */
export function validateForDocument(match: MatchDocument): string[] {
  const errors: string[] = [];
  if (!match.competitionName) errors.push('Competição sem nome');
  if (match.sets.length === 0) errors.push('Partida sem sets registrados');
  if (!match.teamA.name || !match.teamB.name) errors.push('Equipes sem nome');
  if (match.format !== '3-sets' && match.format !== '5-sets') {
    errors.push(`Formato inválido: ${match.format}`);
  }
  return errors;
}

/**
 * Gera todos os documentos oficiais de uma partida a partir do mesmo
 * template fixo: súmula (3 ou 5 sets conforme formato) + ficha de
 * posição/ordem de saque (opcional).
 */
export async function generateMatchDocuments(
  match: MatchDocument,
  options: GenerateMatchDocumentsOptions = {},
): Promise<GenerateMatchDocumentsResult> {
  const errors = validateForDocument(match);
  if (errors.length > 0) {
    throw new Error(`Documento não pode ser gerado: ${errors.join('; ')}`);
  }

  const sumulaData = buildSumulaData(match);
  const sumulaBytes =
    match.format === '3-sets'
      ? await generateThreeSetScoresheet(sumulaData, options)
      : await generateFiveSetScoresheet(sumulaData, options);

  const result: GenerateMatchDocumentsResult = {
    sumula: sumulaBytes,
    sumulaType: match.format === '3-sets' ? 'SUMMULA_3' : 'SUMMULA_5',
    fileName: buildSumulaFileName(match),
  };

  if (options.includeServeOrder !== false) {
    result.serveOrder = await generateServeOrderSheet(buildOrdemSaqueData(match), options);
  }

  return result;
}

/** Constrói os dados de preenchimento da súmula a partir da partida. */
export function buildSumulaData(match: MatchDocument): SumulaData {
  return {
    match,
    officials: match.officials,
    observations: match.observations,
    winnerTeamId: match.result?.winnerTeamId,
    sets: match.sets.map(set => ({
      number: set.number,
      pointsA: set.pointsA,
      pointsB: set.pointsB,
      lineupA: set.lineupA,
      lineupB: set.lineupB,
      sanctions: set.sanctions,
      substitutions: set.substitutions,
      improperRequests: [],
    })),
    setWinners: match.sets.map(set =>
      set.pointsA > set.pointsB ? 'A' : set.pointsB > set.pointsA ? 'B' : undefined,
    ),
  };
}

/** Constrói a ficha de posição a partir das escalações da partida. */
export function buildOrdemSaqueData(match: MatchDocument): OrdemSaqueData {
  const cards: OrdemSaqueData['cards'] = [];

  match.sets.forEach((set, i) => {
    const mkCard = (
      slot: number,
      team: MatchDocument['teamA'],
      lineup: MatchDocument['sets'][number]['lineupA'],
    ): OrdemSaqueData['cards'][number] | undefined => {
      if (!lineup) return undefined;
      const positions = Object.fromEntries(
        (['I', 'II', 'III', 'IV', 'V', 'VI'] as const).map(pos => {
          const player = team.players.find(p => p.id === lineup.positions[pos]);
          return [pos, { name: player?.name ?? '', number: player?.shirtNumber }];
        }),
      ) as OrdemSaqueData['cards'][number]['positions'];
      const liberoPlayer = lineup.liberoPlayerId
        ? team.players.find(p => p.id === lineup.liberoPlayerId)
        : undefined;
      return {
        slot,
        teamId: team.id,
        teamName: team.name,
        setNumber: set.number,
        positions,
        libero: liberoPlayer
          ? { name: liberoPlayer.name, number: liberoPlayer.shirtNumber }
          : undefined,
        coach: team.coach,
      };
    };

    const cardA = mkCard(i * 2, match.teamA, set.lineupA);
    const cardB = mkCard(i * 2 + 1, match.teamB, set.lineupB);
    if (cardA) cards.push(cardA);
    if (cardB) cards.push(cardB);
  });

  return { match, cards };
}