// =====================================================================
// BaseOS Types - Oficiais, Sanções e Assinaturas
// =====================================================================

export interface SanctionEntry {
  type: 'warning' | 'penalty' | 'expulsion' | 'disqualification';
  typeCode: 'A' | 'P' | 'E' | 'D';
  teamSide: 'A' | 'B';
  teamName: string;
  individualNameOrJersey?: string;
  setNumber: number;
  scoreAtSanction: string;
}

export interface SignatureData {
  name?: string;
  signed: boolean;
  signedAt?: string;
}

export interface BaseosOfficialsData {
  referee1?: string;
  referee2?: string;
  scorer?: string;
  assistantScorer?: string;
  lineJudge1?: string;
  lineJudge2?: string;
  lineJudge3?: string;
  lineJudge4?: string;
}

export interface BaseosSignaturesData {
  referee1?: SignatureData;
  referee2?: SignatureData;
  scorer?: SignatureData;
  captainA?: SignatureData;
  captainB?: SignatureData;
  coachA?: SignatureData;
  coachB?: SignatureData;
}
