// =====================================================================
// Schemas do Motor de Documentos — Ficha de Posição / Ordem de Saque
//
// A ficha representa as 8 filipetas "FICHA DE POSIÇÃO" do template
// (4 colunas × 2 linhas). Cada filipeta registra a formação de uma
// equipe para um set, com jogadores vinculados às posições I..VI.
// =====================================================================

import type { MatchDocument, PlayerPosition } from './match.schema';
import type { CleanZone, FieldCoords } from './sumula.schema';

/** Conteúdo de uma das 8 filipetas da folha. */
export type OrdemSaqueCard = {
  /** Índice da filipeta no template (0..7). */
  slot: number;
  teamId: string;
  teamName: string;
  setNumber: number;
  /** Jogador por posição (nome/número da camisa). */
  positions: Partial<Record<PlayerPosition, { name: string; number?: number }>>;
  libero?: { name: string; number?: number };
  captain?: { name: string; number?: number };
  coach?: string;
  signed?: boolean;
};

export type OrdemSaqueData = {
  match: MatchDocument;
  /** Filipetas a preencher (geralmente uma por equipe, por set). */
  cards: OrdemSaqueCard[];
};

export type OrdemSaqueFieldMap = Record<string, FieldCoords>;

export type OrdemSaqueGeometry = {
  pageWidth: number;
  pageHeight: number;
  /** Número de filipetas por página (4 col × 2 linhas = 8). */
  cols: number;
  rows: number;
  cleanZones: CleanZone[];
  logoZone: CleanZone;
  /** Posição (canto superior esquerdo) de cada filipeta. */
  cardSlots: { x: number; y: number; width: number; height: number }[];
  /** Campos por filipeta (coordenadas relativas ao canto da filipeta). */
  cardFields: OrdemSaqueFieldMap;
};

export type OrdemSaqueRenderer = (templateBytes: Uint8Array, data: OrdemSaqueData) => Promise<Uint8Array> | Uint8Array;