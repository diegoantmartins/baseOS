// @vitest-environment node
// =====================================================================
// BaseOS - Validação e Geração de PDFs Reais de Inspeção para Torneio
// Casos A, B, C, D, E, F, G (Conformidade Seção 10 do Edital)
// =====================================================================

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { PDFDocument } from 'pdf-lib';
import {
  createBaseosDocumentElement,
  createBlankBaseosScoresheetData,
  createBlankBaseosServeOrderData,
  BaseosServeOrderDocument,
  generateBlankServeOrderPdfBlob,
  generateBlankBaseosPdfBlob,
  type BaseosScoresheetData,
  type BaseosServeOrderData,
} from '@/document-engine/baseos';

describe('BaseOS - Teste Visual Real dos PDFs (Casos A a G)', () => {
  const outputDir = path.resolve(process.cwd(), 'dist/pdf-inspection/tournament');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const saveAndInspectPdf = async (
    docElement: React.ReactElement,
    fileName: string,
    expectedPages: number,
  ) => {
    const buffer = await renderToBuffer(
      docElement as unknown as Parameters<typeof renderToBuffer>[0],
    );
    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, buffer);

    expect(fs.existsSync(filePath)).toBe(true);
    expect(fs.statSync(filePath).size).toBeGreaterThan(1000);

    const pdfDoc = await PDFDocument.load(buffer);
    expect(pdfDoc.getPageCount()).toBe(expectedPages);

    const page = pdfDoc.getPage(0);
    const { width, height } = page.getSize();
    // A4 Landscape: 841.89 x 595.28 pt (margem de tolerância 1pt)
    expect(width).toBeGreaterThan(840);
    expect(width).toBeLessThan(843);
    expect(height).toBeGreaterThan(594);
    expect(height).toBeLessThan(596);

    return { filePath, size: fs.statSync(filePath).size, pages: pdfDoc.getPageCount() };
  };

  it('Caso A: Equipe com poucos atletas (6 atletas) - Súmula 3-Sets (1 pág A4)', async () => {
    const data: BaseosScoresheetData = createBlankBaseosScoresheetData('3-sets', 'print-a4');
    data.document.state = 'prefilled';
    data.competition.name = 'Torneio Triangular Regional';
    data.match.number = '01';
    data.teams.A.name = 'Vôlei Clube Estrela';
    data.teams.B.name = 'Associação Desportiva Norte';
    data.teams.A.athletes = [
      { id: 'a1', name: 'Carlos Silva', jerseyNumber: 1, isCaptain: true },
      { id: 'a2', name: 'Marcos Souza', jerseyNumber: 2 },
      { id: 'a3', name: 'Rafael Dias', jerseyNumber: 3 },
      { id: 'a4', name: 'Bruno Lima', jerseyNumber: 4 },
      { id: 'a5', name: 'Lucas Costa', jerseyNumber: 5 },
      { id: 'a6', name: 'Gabriel Pires', jerseyNumber: 6 },
    ];
    data.teams.B.athletes = [
      { id: 'b1', name: 'Felipe Santos', jerseyNumber: 7, isCaptain: true },
      { id: 'b2', name: 'Thiago Rocha', jerseyNumber: 8 },
      { id: 'b3', name: 'Daniel Alves', jerseyNumber: 9 },
      { id: 'b4', name: 'André Martins', jerseyNumber: 10 },
      { id: 'b5', name: 'Pedro Ribeiro', jerseyNumber: 11 },
      { id: 'b6', name: 'Gustavo Nunes', jerseyNumber: 12 },
    ];

    const element = createBaseosDocumentElement(data);
    const info = await saveAndInspectPdf(element, 'CASO_A_poucos_atletas_3sets.pdf', 1);
    expect(info.pages).toBe(1);
  });

  it('Caso B: Elenco Completo (14 atletas + 2 líberos = 16 atletas) - Súmula 3-Sets (1 pág A4)', async () => {
    const data: BaseosScoresheetData = createBlankBaseosScoresheetData('3-sets', 'print-a4');
    data.document.state = 'prefilled';
    data.competition.name = 'Copa Estadual de Clubes Adulto 2026';
    data.match.number = '02';
    data.teams.A.name = 'Sada Cruzeiro BaseOS';
    data.teams.B.name = 'Minas Tênis Clube BaseOS';

    data.teams.A.athletes = Array.from({ length: 14 }, (_, i) => ({
      id: `a-${i + 1}`,
      name: `Atleta Titular/Reserva A${i + 1}`,
      jerseyNumber: i + 1,
      isCaptain: i === 0,
    }));
    data.teams.A.liberos = [
      { id: 'al-1', name: 'Líbero Principal A', jerseyNumber: 15 },
      { id: 'al-2', name: 'Líbero Reserva A', jerseyNumber: 16 },
    ];

    data.teams.B.athletes = Array.from({ length: 14 }, (_, i) => ({
      id: `b-${i + 1}`,
      name: `Atleta Titular/Reserva B${i + 1}`,
      jerseyNumber: i + 1,
      isCaptain: i === 0,
    }));
    data.teams.B.liberos = [
      { id: 'bl-1', name: 'Líbero Principal B', jerseyNumber: 15 },
      { id: 'bl-2', name: 'Líbero Reserva B', jerseyNumber: 16 },
    ];

    const element = createBaseosDocumentElement(data);
    const info = await saveAndInspectPdf(element, 'CASO_B_14atletas_2liberos_3sets.pdf', 1);
    expect(info.pages).toBe(1);
  });

  it('Caso C: Nomes Longos em Português com Sobrenomes Compostos - Súmula 3-Sets (1 pág A4)', async () => {
    const data: BaseosScoresheetData = createBlankBaseosScoresheetData('3-sets', 'print-a4');
    data.document.state = 'prefilled';
    data.competition.name = 'Campeonato Metropolitano Aberto de Voleibol';
    data.match.number = '03';
    data.teams.A.name = 'Associação Atlética Acadêmica de Engenharia de Software';
    data.teams.B.name = 'Sociedade Esportiva e Recreativa Beneficente Progresso';

    data.teams.A.athletes = [
      { id: 'c1', name: 'Luiz Guilherme de Souza Vasconcellos Filho', jerseyNumber: 4, isCaptain: true },
      { id: 'c2', name: 'Antônio Francisco Cavalcanti de Albuquerque Neto', jerseyNumber: 7 },
      { id: 'c3', name: 'João Victor Pereira dos Santos e Oliveira Júnior', jerseyNumber: 10 },
      { id: 'c4', name: 'Bernardo Henrique de Castro Guimarães Peixoto', jerseyNumber: 12 },
    ];
    data.teams.A.liberos = [
      { id: 'cl1', name: 'Pedro Henrique da Silva Albuquerque Lemos', jerseyNumber: 18 },
    ];

    data.teams.B.athletes = [
      { id: 'c5', name: 'Marcello Roberto Alcantara Silveira de Menezes', jerseyNumber: 5, isCaptain: true },
      { id: 'c6', name: 'Gabriel Fernando Bittencourt Figueiredo Mattos', jerseyNumber: 8 },
    ];

    const element = createBaseosDocumentElement(data);
    const info = await saveAndInspectPdf(element, 'CASO_C_nomes_longos_portugues.pdf', 1);
    expect(info.pages).toBe(1);
  });

  it('Caso D: Competição com Nome Longo e Complexo - Súmula 3-Sets (1 pág A4)', async () => {
    const data: BaseosScoresheetData = createBlankBaseosScoresheetData('3-sets', 'print-a4');
    data.document.state = 'prefilled';
    data.competition.name =
      'XXXVIII CAMPEONATO CITADINO INTERMUNICIPAL DA FEDERAÇÃO CATARINENSE DE VOLEIBOL INDOOR 2026';
    data.match.number = '04';
    data.teams.A.name = 'Clube Esportivo e Cultural São Bento do Sul';
    data.teams.B.name = 'Fundação Municipal de Esportes de Balneário Camboriú';

    const element = createBaseosDocumentElement(data);
    const info = await saveAndInspectPdf(element, 'CASO_D_competicao_nome_longo.pdf', 1);
    expect(info.pages).toBe(1);
  });

  it('Caso E: Partida Completa de 3 Sets (com parciais e vencedor) - Súmula 3-Sets (1 pág A4)', async () => {
    const data: BaseosScoresheetData = createBlankBaseosScoresheetData('3-sets', 'print-a4');
    data.document.state = 'completed';
    data.competition.name = 'Copa Cidade dos Ipês 2026';
    data.match.number = '05';
    data.teams.A.name = 'Equipe Alfa';
    data.teams.B.name = 'Equipe Beta';

    data.result = {
      winnerSide: 'A',
      winnerTeamName: 'Equipe Alfa',
      finalScoreSetsA: 2,
      finalScoreSetsB: 1,
      totalDurationMinutes: 68,
      startTime: '14:00',
      endTime: '15:08',
      setResults: [
        { setNumber: 1, scoreA: 25, scoreB: 22, durationMinutes: 24, timeOutsA: 1, timeOutsB: 2, substitutionsA: 2, substitutionsB: 1 },
        { setNumber: 2, scoreA: 21, scoreB: 25, durationMinutes: 26, timeOutsA: 2, timeOutsB: 1, substitutionsA: 3, substitutionsB: 2 },
        { setNumber: 3, scoreA: 15, scoreB: 12, durationMinutes: 18, timeOutsA: 1, timeOutsB: 1, substitutionsA: 1, substitutionsB: 0 },
      ],
    };

    const element = createBaseosDocumentElement(data);
    const info = await saveAndInspectPdf(element, 'CASO_E_partida_3sets_concluida.pdf', 1);
    expect(info.pages).toBe(1);
  });

  it('Caso F: Partida de 5 Sets (Formato 5 Sets com Tie-break) - Súmula 5-Sets (1 pág A4)', async () => {
    const data: BaseosScoresheetData = createBlankBaseosScoresheetData('5-sets', 'print-a4');
    data.document.state = 'completed';
    data.competition.name = 'Superliga Nacional - Grande Final';
    data.match.number = '06';
    data.teams.A.name = 'Itambé Minas';
    data.teams.B.name = 'Vôlei Renata Campinas';

    data.result = {
      winnerSide: 'A',
      winnerTeamName: 'Itambé Minas',
      finalScoreSetsA: 3,
      finalScoreSetsB: 2,
      totalDurationMinutes: 125,
      startTime: '19:30',
      endTime: '21:35',
      setResults: [
        { setNumber: 1, scoreA: 25, scoreB: 20, durationMinutes: 24, timeOutsA: 1, timeOutsB: 2, substitutionsA: 1, substitutionsB: 2 },
        { setNumber: 2, scoreA: 22, scoreB: 25, durationMinutes: 26, timeOutsA: 2, timeOutsB: 1, substitutionsA: 2, substitutionsB: 2 },
        { setNumber: 3, scoreA: 25, scoreB: 23, durationMinutes: 28, timeOutsA: 1, timeOutsB: 2, substitutionsA: 3, substitutionsB: 1 },
        { setNumber: 4, scoreA: 19, scoreB: 25, durationMinutes: 25, timeOutsA: 2, timeOutsB: 1, substitutionsA: 2, substitutionsB: 1 },
        { setNumber: 5, scoreA: 16, scoreB: 14, durationMinutes: 22, timeOutsA: 1, timeOutsB: 2, substitutionsA: 1, substitutionsB: 1 },
      ],
    };

    const element = createBaseosDocumentElement(data);
    const info = await saveAndInspectPdf(element, 'CASO_F_partida_5sets_concluida.pdf', 1);
    expect(info.pages).toBe(1);
  });

  it('Caso G: Ordem de Saque Impressa pela Rotina Independente em Branco (1 cópia e 4 cópias)', async () => {
    // 1. Ordem de Saque em Branco 3 Sets - 1 Cópia (1 página)
    const singleBlob = await generateBlankServeOrderPdfBlob('3-sets', 1);
    const singleBytes = Buffer.from(await singleBlob.arrayBuffer());
    const singlePath = path.join(outputDir, 'CASO_G_ordem_saque_em_branco_1copia.pdf');
    fs.writeFileSync(singlePath, singleBytes);

    const doc1 = await PDFDocument.load(singleBytes);
    expect(doc1.getPageCount()).toBe(1);

    // 2. Ordem de Saque em Branco 3 Sets - 4 Cópias Solicitadas pelo Operador (4 páginas)
    const multiBlob = await generateBlankServeOrderPdfBlob('3-sets', 4);
    const multiBytes = Buffer.from(await multiBlob.arrayBuffer());
    const multiPath = path.join(outputDir, 'CASO_G_ordem_saque_em_branco_4copias.pdf');
    fs.writeFileSync(multiPath, multiBytes);

    const docMulti = await PDFDocument.load(multiBytes);
    expect(docMulti.getPageCount()).toBe(4);

    // 3. Súmula em Branco 3 Sets - 2 Cópias Solicitadas pelo Operador (2 páginas)
    const sumulaMultiBlob = await generateBlankBaseosPdfBlob('3-sets', 'print-a4', 2);
    const sumulaMultiBytes = Buffer.from(await sumulaMultiBlob.arrayBuffer());
    const sumulaMultiPath = path.join(outputDir, 'CASO_G_sumula_em_branco_2copias.pdf');
    fs.writeFileSync(sumulaMultiPath, sumulaMultiBytes);

    const docSumulaMulti = await PDFDocument.load(sumulaMultiBytes);
    expect(docSumulaMulti.getPageCount()).toBe(2);
  });
});
