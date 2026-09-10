// @vitest-environment node
// =====================================================================
// BaseOS - Geração de PDFs da Ordem de Saque para Inspeção Visual
// =====================================================================

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import {
  BaseosServeOrderDocument,
  createBlankBaseosServeOrderData,
  generateServeOrderCards,
  generateGamePackagePdfBlob,
  type BaseosServeOrderData,
  type BaseosScoresheetData,
  createBlankBaseosScoresheetData,
} from '@/document-engine/baseos';

import { renderToBuffer } from '@react-pdf/renderer';

describe('Geração de PDFs reais da Ordem de Saque para inspeção visual', () => {
  const outputDir = path.resolve(process.cwd(), 'dist/pdf-inspection/serve-order');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const savePdfToFile = async (docElement: React.ReactElement, fileName: string) => {
    const buffer = await renderToBuffer(
      docElement as unknown as Parameters<typeof renderToBuffer>[0],
    );
    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, buffer);
    expect(fs.existsSync(filePath)).toBe(true);
    expect(fs.statSync(filePath).size).toBeGreaterThan(1000);
    return filePath;
  };

  it('1. Gera Ordem de Saque 3 Sets Preenchida (A4 Landscape, 1 pág)', async () => {
    const data: BaseosServeOrderData = {
      document: {
        type: 'BASEOS_SERVE_ORDER',
        version: '1.0',
        state: 'prefilled',
        format: '3-sets',
        generatedAt: new Date().toISOString(),
      },
      competition: {
        name: 'Liga Paranaense de Voleibol 2026',
        category: 'Adulto',
        gender: 'Masculino',
        phase: 'Classificatória',
        round: '1',
      },
      match: {
        number: 12,
        date: '15/10/2026',
        time: '19:30',
        court: 'Principal',
        city: 'Curitiba',
      },
      teams: {
        teamA: {
          name: 'Vortex Vôlei Clube',
          coachName: 'Marcelo Mendez',
          libero1Jersey: 10,
          libero2Jersey: 15,
          captainJersey: 7,
        },
        teamB: {
          name: 'Fênix Voleibol Clube',
          coachName: 'Bernardo Rezende',
          libero1Jersey: 18,
          captainJersey: 1,
        },
      },
      rules: { setsToWin: 2, maxSets: 3, format: '3-sets' },
      cards: generateServeOrderCards(
        {
          name: 'Vortex Vôlei Clube',
          coachName: 'Marcelo Mendez',
          libero1Jersey: 10,
          libero2Jersey: 15,
          captainJersey: 7,
        },
        {
          name: 'Fênix Voleibol Clube',
          coachName: 'Bernardo Rezende',
          libero1Jersey: 18,
          captainJersey: 1,
        },
        '3-sets',
        12,
      ),
    };

    const element = React.createElement(BaseosServeOrderDocument, { data });
    await savePdfToFile(element, 'ordem_saque_3sets_preenchida.pdf');
  });

  it('2. Gera Ordem de Saque 3 Sets em Branco', async () => {
    const data = createBlankBaseosServeOrderData('3-sets');
    const element = React.createElement(BaseosServeOrderDocument, { data });
    await savePdfToFile(element, 'ordem_saque_3sets_em_branco.pdf');
  });

  it('3. Gera Ordem de Saque 5 Sets Preenchida (A4 Landscape, 2 págs)', async () => {
    const data: BaseosServeOrderData = {
      document: {
        type: 'BASEOS_SERVE_ORDER',
        version: '1.0',
        state: 'prefilled',
        format: '5-sets',
        generatedAt: new Date().toISOString(),
      },
      competition: {
        name: 'Superliga Nacional Masculina 2026',
        category: 'Especial',
        gender: 'Masculino',
        phase: 'Final',
        round: 'Jogo 1',
      },
      match: {
        number: 101,
        date: '20/11/2026',
        time: '21:00',
        court: 'Arena Multiuso',
        city: 'Belo Horizonte',
      },
      teams: {
        teamA: {
          name: 'Sada Cruzeiro Vôlei',
          coachName: 'Filipe Ferraz',
          libero1Jersey: 17,
          captainJersey: 8,
        },
        teamB: {
          name: 'Itambé Minas Tênis',
          coachName: 'Guilherme Novaes',
          libero1Jersey: 4,
          libero2Jersey: 9,
          captainJersey: 14,
        },
      },
      rules: { setsToWin: 3, maxSets: 5, format: '5-sets' },
      cards: generateServeOrderCards(
        {
          name: 'Sada Cruzeiro Vôlei',
          coachName: 'Filipe Ferraz',
          libero1Jersey: 17,
          captainJersey: 8,
        },
        {
          name: 'Itambé Minas Tênis',
          coachName: 'Guilherme Novaes',
          libero1Jersey: 4,
          libero2Jersey: 9,
          captainJersey: 14,
        },
        '5-sets',
        101,
      ),
    };

    const element = React.createElement(BaseosServeOrderDocument, { data });
    await savePdfToFile(element, 'ordem_saque_5sets_preenchida.pdf');
  });

  it('4. Gera Ordem de Saque 5 Sets em Branco', async () => {
    const data = createBlankBaseosServeOrderData('5-sets');
    const element = React.createElement(BaseosServeOrderDocument, { data });
    await savePdfToFile(element, 'ordem_saque_5sets_em_branco.pdf');
  });

  it('5. Gera Ordem de Saque 1 Set Preenchida (setsToWin = 1)', async () => {
    const data: BaseosServeOrderData = {
      document: {
        type: 'BASEOS_SERVE_ORDER',
        version: '1.0',
        state: 'prefilled',
        format: '1-set',
        generatedAt: new Date().toISOString(),
      },
      competition: {
        name: 'Torneio Relâmpago 1 Set 2026',
        category: 'Livre',
        gender: 'Misto',
      },
      match: {
        number: 5,
        court: 'Quadra 2',
      },
      teams: {
        teamA: { name: 'Time Vermelho', coachName: 'Carlos Silva' },
        teamB: { name: 'Time Azul', coachName: 'Roberto Lima' },
      },
      rules: { setsToWin: 1, maxSets: 1, format: '1-set' },
      cards: generateServeOrderCards(
        { name: 'Time Vermelho', coachName: 'Carlos Silva' },
        { name: 'Time Azul', coachName: 'Roberto Lima' },
        '1-set',
        5,
      ),
    };

    const element = React.createElement(BaseosServeOrderDocument, { data });
    await savePdfToFile(element, 'ordem_saque_1set_preenchida.pdf');
  });

  it('6. Gera Ordem de Saque com Estresse de Nomes Longos', async () => {
    const teamA = {
      name: 'Associação Atlética e Cultural Beneficente dos Funcionários de Pato Branco',
      coachName: 'Prof. Dr. Washington Luís de Albuquerque Silveira Júnior',
      libero1Jersey: 18,
      libero2Jersey: 99,
      captainJersey: 10,
    };
    const teamB = {
      name: 'Sociedade Esportiva Recreativa e Desportiva União da Vitória Voleibol Clube',
      coachName: 'Treinador Carlos Alberto de Oliveira Santos Brandão e Souza',
      libero1Jersey: 25,
      captainJersey: 7,
    };

    const data: BaseosServeOrderData = {
      document: {
        type: 'BASEOS_SERVE_ORDER',
        version: '1.0',
        state: 'prefilled',
        format: '3-sets',
        generatedAt: new Date().toISOString(),
      },
      competition: {
        name: 'Campeonato Municipal Metropolitano de Voleibol Interclubes Amador e Profissional do Estado do Paraná 2026',
        category: 'Adulto Masculino Master Série Ouro Especial',
        gender: 'Masculino',
        phase: 'Fase Final Eliminatória Decisiva',
        round: 'Rodada 14 - Semifinal 1',
      },
      match: {
        number: '999/2026-F',
        date: '31/12/2026',
        time: '21:45',
        court: 'Ginásio Poliesportivo Central Municipal de Alto Rendimento',
        city: 'São José dos Pinhais - Região Metropolitana',
      },
      teams: {
        teamA,
        teamB,
      },
      rules: {
        setsToWin: 2,
        maxSets: 3,
        format: '3-sets',
      },
      cards: generateServeOrderCards(teamA, teamB, '3-sets', '999/2026-F'),
    };

    const element = React.createElement(BaseosServeOrderDocument, { data });
    await savePdfToFile(element, 'ordem_saque_estresse_nomes_longos.pdf');
  });

  it('7. Gera Pacote Completo do Jogo (Súmula + Ordem de Saque unificadas)', async () => {
    const scoresheetData = createBlankBaseosScoresheetData('3-sets');
    scoresheetData.teams.A.name = 'Vortex Vôlei Clube';
    scoresheetData.teams.B.name = 'Fênix Voleibol Clube';
    scoresheetData.match.number = 42;

    const packageBlob = await generateGamePackagePdfBlob(scoresheetData);
    const buffer = Buffer.from(await packageBlob.arrayBuffer());
    const filePath = path.join(outputDir, 'pacote_completo_jogo_3sets.pdf');
    fs.writeFileSync(filePath, buffer);

    expect(fs.existsSync(filePath)).toBe(true);
    expect(fs.statSync(filePath).size).toBeGreaterThan(5000);
  });
});
