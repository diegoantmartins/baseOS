// =====================================================================
// BaseOS Types - Contrato Raiz da Súmula Oficial
// =====================================================================

import type { BaseosCompetitionData, BaseosMatchInfo } from './competition';
import type { BaseosTeamData } from './team';
import type { BaseosSetData } from './set';
import type { BaseosOfficialsData, BaseosSignaturesData, SanctionEntry } from './officials';

export type DocumentState = 'blank' | 'prefilled' | 'completed';
export type ScoresheetFormat = '3-sets' | '5-sets';
export type ScoresheetOutput = 'print-a4' | 'master';

export interface SetResultEntry {
  setNumber: number;
  scoreA: number;
  scoreB: number;
  durationMinutes?: number;
  timeOutsA: number;
  timeOutsB: number;
  substitutionsA: number;
  substitutionsB: number;
}

export interface MatchResultData {
  winnerTeamName?: string;
  winnerSide?: 'A' | 'B';
  finalScoreSetsA?: number;
  finalScoreSetsB?: number;
  setResults: SetResultEntry[];
  totalDurationMinutes?: number;
  startTime?: string;
  endTime?: string;
}

export interface BaseosScoresheetData {
  document: {
    type: 'BASEOS_VOLLEYBALL_SCORESHEET';
    version: '1.0';
    state: DocumentState;
    format: ScoresheetFormat;
    output: ScoresheetOutput;
    generatedAt: string;
    documentHash?: string;
  };
  competition: BaseosCompetitionData;
  match: BaseosMatchInfo;
  teams: {
    A: BaseosTeamData;
    B: BaseosTeamData;
  };
  sets: {
    set1: BaseosSetData;
    set2: BaseosSetData;
    set3: BaseosSetData;
    set4?: BaseosSetData;
    set5?: BaseosSetData;
  };
  sanctions: SanctionEntry[];
  improperRequests: {
    teamA: boolean;
    teamB: boolean;
  };
  officials: BaseosOfficialsData;
  signatures: BaseosSignaturesData;
  result?: MatchResultData;
  observations?: string;
}
