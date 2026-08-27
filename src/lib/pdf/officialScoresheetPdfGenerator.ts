import React from 'react';
import { pdf, type DocumentProps } from '@react-pdf/renderer';
import { OfficialScoresheetDocument } from './officialScoresheetPdf';
import type { MatchSheetData } from './matchSheetPdf';

/**
 * Gera os bytes da Súmula Oficial usando @react-pdf/renderer
 */
export async function generateOfficialScoresheetPdfBlob(data: MatchSheetData): Promise<Blob> {
  const docElement = React.createElement(OfficialScoresheetDocument, { data }) as React.ReactElement<DocumentProps>;
  return await pdf(docElement).toBlob();
}

/**
 * Faz download direto da Súmula Oficial em PDF
 */
export async function downloadOfficialScoresheetPdf(data: MatchSheetData, filename?: string): Promise<void> {
  const blob = await generateOfficialScoresheetPdfBlob(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = filename || `sumula_oficial_cbv_${data.teamA.shortName}_vs_${data.teamB.shortName}.pdf`;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
