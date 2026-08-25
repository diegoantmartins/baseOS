import { describe, it, expect } from 'vitest';
import { pdf } from '@react-pdf/renderer';
import React from 'react';
import { BaseosThreeSetScoresheet } from '@/document-engine/baseos/templates/BaseosThreeSetScoresheet';
import { createBlankBaseosScoresheetData } from '@/document-engine/baseos/mapper/match.mapper';

describe('BaseOS Document Engine - 3 Sets Template Rendering', () => {
  it('renderiza o template de 3 sets em branco gerando um Blob PDF válido', async () => {
    const data = createBlankBaseosScoresheetData('3-sets');
    const docElement = React.createElement(BaseosThreeSetScoresheet, { data });
    const instance = pdf(docElement as React.ReactElement);
    const blob = await instance.toBlob();

    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(1000);
    expect(blob.type).toBe('application/pdf');
  });
});
