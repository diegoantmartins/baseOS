// Types padronizados para geração de PDFs de súmula
// Garante consistência em todo o sistema VolleyPro

import type { TeamStandingResult } from '@/services/standingsService';

// --- Dados da partida (formato unificado) ---

/** Informações de uma equipe no PDF */
export interface TeamInfo {
  name: string;
  shortName: string;
  logoUrl?: string;
  athletes: PdfAthlete[];
  coach?: string;
  assistantCoach?: string;
  physicalTrainer?: string;
  doctor?: string;
}

/** Atleta no formato PDF - padronizado */
export interface PdfAthlete {
  jerseyNumber?: number; // Opcional, confirmado no dia
  name: string;
  position?: string;
  captain?: boolean;
  libero?: boolean;
  documentNumber?: string; // RG/CPF
}

/** Resultado de um set */
export interface SetResult {
  setNumber: number;
  scoreA: number;
  scoreB: number;
  duration?: string;
}

/** Dados completos da súmula - formato unificado */
export interface MatchSheetData {
  /** Nome do sistema/organizador */
  orgName?: string;
  /** Modo da súmula: 'pre' = em branco para mesa, 'post' = resultado final */
  sheetMode?: 'pre' | 'post';
  competition: string;
  category: string;
  genderCategory?: 'male' | 'female' | 'mixed';
  modality: 'indoor' | 'beach';
  format: '3-sets' | '5-sets' | '1-set' | '2-sets';
  playerFormat: '6x6' | '4x4' | '2x2' | '3x3';
  date: string;
  time: string;
  venue: string;
  court?: string;
  city?: string;
  phase?: string;
  groupName?: string;
  round: number;
  matchNumber: number;
  teamA: TeamInfo;
  teamB: TeamInfo;
  sets: SetResult[];
  finalScoreA: number;
  finalScoreB: number;
  winner?: 'A' | 'B';
  referees: { role: string; name: string }[];
  timeouts: PdfTimeout[];
  substitutions: PdfSubstitution[];
  sanctions: PdfSanction[];
  observations?: string;
  startTime?: string;
  endTime?: string;
}

/** Tempo técnico no PDF */
export interface PdfTimeout {
  set: number;
  team: 'A' | 'B';
  'B';
  score: string;
}

/** Substituição no PDF */
export interface PdfSubstitution {
  set: number;
  team: 'A' | 'B';
  playerIn: number;
  playerOut: number;
  score: string;
}

/** Sanção no PDF */
export interface PdfSanction {
  set: number;
  team: 'A' | 'B';
  player: string;
  type: string;
}

// --- Configurações de layout ---

/** Configurações de layout do PDF */
export interface PdfLayoutConfig {
  pageWidth: number;
  pageHeight: number;
  margin: number;
  contentWidth: number;
}

/** Cores padronizadas (grayscale para impressão B&W) */
export const PDF_COLORS = {
  black: '#000000',
  darkGray: '#333333',
  mediumGray: '#666666',
  lightGray: '#999999',
  white: '#FFFFFF',
  headerBlue: '#1e3a5f',
  lightBlue: '#eaeaea',
  zebra: '#f8f8f8',
} as const;

// --- Types para relatórios ---

/** Linha do boletim de jogos */
export interface MatchBoletimRow {
  matchNumber: number;
  round: number;
  phase?: string;
  groupName?: string;
  date: string;
  time: string;
  venue: string;
  court?: string;
  teamAName: string;
  teamAShort?: string;
  teamALogo?: string;
  teamBName: string;
  teamBShort?: string;
  teamBLogo?: string;
  scoreA?: number;
  scoreB?: number;
  statusLabel: string;
}

/** Dados para relatório de classificação */
export interface StandingsReportGroup {
  groupName: string;
  standings: TeamStandingResult[];
}

/** Atleta no relatório de elenco */
export interface RosterReportAthlete {
  jerseyNumber?: number;
  name: string;
  position: string;
  documentNumber?: string;
  isCaptain: boolean;
  isLibero: boolean;
}

/** Equipe no relatório de elenco */
export interface RosterReportTeam {
  name: string;
  shortName: string;
  coach?: string;
  assistantCoach?: string;
  medicalStaff?: string;
  city?: string;
  state?: string;
  modality?: string;
  logoUrl?: string;
  athletes: RosterReportAthlete[];
}

/** Dados do pódio */
export interface PodiumReportData {
  competitionName: string;
  categoryName?: string;
  orgName?: string;
  champion?: { name: string; shortName?: string; logoUrl?: string };
  runnerUp?: { name: string; shortName?: string; logoUrl?: string };
  third?: { name: string; shortName?: string; logoUrl?: string };
  fourth?: { name: string; shortName?: string; logoUrl?: string };
}

// --- Types para fichas de posição ---

/** Ficha de posição individual */
export interface PositionCardData {
  team: MatchSheetData['teamA'];
  opponent: MatchSheetData['teamB'];
  setLabel: string;
  orgName: string;
}