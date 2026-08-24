// =====================================================================
// BaseOS Types - Metadados da Competição e Partida
// =====================================================================

export interface BaseosCompetitionData {
  name: string;
  phase: string;
  round: number | string;
  date: string;
  location: string;
  court: string;
  city: string;
}

export interface BaseosMatchInfo {
  id: string;
  number: number | string;
  category: string;
  gender: 'male' | 'female' | 'mixed';
  scheduledTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
}
