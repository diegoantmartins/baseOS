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
  PDF_COLORS,
} from './types';

export {
  buildMatchSheetData,
  buildMultipleMatchSheetData,
} from './matchSheetDataBuilder';

export {
  OfficialScoresheetDocument,
} from './officialScoresheetPdf';

export {
  generateOfficialScoresheetPdfBlob,
  downloadOfficialScoresheetPdf,
} from './officialScoresheetPdfGenerator';

export {
  generateMatchSheetPdf,
  downloadMatchSheetPdf,
  previewMatchSheetPdf,
  printMatchSheetPdf,
  generateMatchSheetsBatchPdf,
  downloadMatchSheetsBatchPdf,
} from './matchSheetPdf';

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
  downloadReportsPdf,
  previewReportsPdf,
  printReportsPdf,
} from './reportsPdf';