// Barrel export for PDF generation system
// Re-exports all public APIs from the pdf module

export type {
  MatchSheetData,
  TeamInfo,
  PdfAthlete,
  SetResult,
  PdfTimeout,
  PdfSubstitution,
  PdfSanction,
  PdfLayoutConfig,
  MatchBoletimRow,
  StandingsReportGroup,
  RosterReportAthlete,
  RosterReportTeam,
  PodiumReportData,
  PositionCardData,
  RefereesScheduleRow,
  DailyScheduleRow,
  MvpMatchRow,
  MvpLeaderboardRow,
  MvpReportData,
  DelegationAthleteRow,
  DelegationTeamRow,
  DelegationReportData,
  MatchStatisticsSetRow,
  MatchStatisticsRow,
  TeamStatisticsSummaryRow,
  MatchStatisticsReportData,
  PDF_COLORS,
} from './types';

export {
  buildMatchSheetData,
  buildMultipleMatchSheetData,
} from './matchSheetDataBuilder';



export {
  generateMatchSheetPdf,
  downloadMatchSheetPdf,
  previewMatchSheetPdf,
  printMatchSheetPdf,
  generateMatchSheetsBatchPdf,
  downloadMatchSheetsBatchPdf,
  downloadOfficialBaseosMatchSheet,
  generateOfficialBaseosScoresheetBlob,
} from './matchSheetPdf';

// --- Motor Documental Canônico Oficial BaseOS ---
export {
  loadBaseosScoresheetData,
  generateBaseosPdfBlob,
  generateBlankBaseosPdfBlob,
  downloadBaseosScoresheet,
  printBaseosScoresheet,
  downloadBaseosBatchScoresheets,
  generateBaseosBatchPdfBlob,
  createBaseosDocumentElement,
  mapMatchRecordToBaseosScoresheet,
  mapMatchSheetDataToBaseos,
  createBlankBaseosScoresheetData,
} from '@/document-engine/baseos';
export type { BaseosScoresheetData } from '@/document-engine/baseos';

export {
  generateOfficialMatchSheetPdf,
  generatePositionOrderSheetPdf,
  generateBlankOfficialMatchSheetPdf,
  generateBlankPositionSheetsPdf,
  printOfficialPdf,
  printPositionPdf,
  previewOfficialPdf,
  previewPositionPdf,
  downloadOfficialPdf,
  downloadPositionPdf,
} from './officialMatchSheetPdf';

export {
  generateMatchesBoletimPdf,
  generateStandingsReportPdf,
  generateTeamRosterReportPdf,
  generatePodiumReportPdf,
  generateRefereesSchedulePdf,
  generateDailySchedulePdf,
  generateMvpReportPdf,
  generateDelegationReportPdf,
  generateMatchStatisticsReportPdf,
  parseMatchReferees,
  downloadReportsPdf,
  previewReportsPdf,
  printReportsPdf,
} from './reportsPdf';