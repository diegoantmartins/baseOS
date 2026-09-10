// =====================================================================
// BaseOS Template - Documento Multi-Páginas para Lote de Súmulas
// =====================================================================

import React from 'react';
import { Document } from '@react-pdf/renderer';
import type { BaseosScoresheetData } from '../types/scoresheet';
import { BaseosThreeSetPage } from './BaseosThreeSetScoresheet';
import { BaseosFiveSetPage } from './BaseosFiveSetScoresheet';

export interface BaseosBatchScoresheetDocumentProps {
  matchesData: BaseosScoresheetData[];
  title?: string;
}

export const BaseosBatchScoresheetDocument: React.FC<BaseosBatchScoresheetDocumentProps> = ({
  matchesData,
  title,
}) => {
  return (
    <Document title={title || 'Sumulas_Oficiais_BaseOS'}>
      {matchesData.map((data, index) => {
        if (data.document.format === '5-sets') {
          return <BaseosFiveSetPage key={`match-5set-${data.match.id || index}`} data={data} />;
        }
        return <BaseosThreeSetPage key={`match-3set-${data.match.id || index}`} data={data} />;
      })}
    </Document>
  );
};
