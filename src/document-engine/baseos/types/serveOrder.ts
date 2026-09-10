// =====================================================================
// BaseOS Types - Contrato da Ordem de Saque / Ficha de Posição Inicial
// =====================================================================

export type ServeOrderFormat = '1-set' | '3-sets' | '5-sets';
export type ServeOrderDocumentState = 'blank' | 'prefilled';
export type ServeOrderCardType = 'official-set' | 'reserve';

export interface ServeOrderCardData {
  teamSide: 'A' | 'B';
  teamName: string;
  cardType: ServeOrderCardType;
  setNumber?: number; // 1 a 5 (somente quando cardType === 'official-set')
  isDecidingSet?: boolean;
  coachName?: string;
  libero1Jersey?: number;
  libero2Jersey?: number;
  captainJersey?: number;
  matchNumber?: number | string;
}

export interface ServeOrderTeamData {
  name: string;
  shortName?: string;
  coachName?: string;
  libero1Jersey?: number;
  libero2Jersey?: number;
  captainJersey?: number;
}

export interface BaseosServeOrderData {
  document: {
    type: 'BASEOS_SERVE_ORDER';
    version: '1.0';
    state: ServeOrderDocumentState;
    format: ServeOrderFormat;
    generatedAt: string;
  };
  competition: {
    name: string;
    category?: string;
    gender?: string;
    phase?: string;
    round?: string;
    group?: string;
  };
  match: {
    number?: number | string;
    date?: string;
    time?: string;
    court?: string;
    city?: string;
  };
  teams: {
    teamA: ServeOrderTeamData;
    teamB: ServeOrderTeamData;
  };
  rules: {
    setsToWin: number;
    maxSets: number;
    format: ServeOrderFormat;
  };
  cards: ServeOrderCardData[];
}
