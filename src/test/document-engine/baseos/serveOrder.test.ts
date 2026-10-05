// @vitest-environment node
// =====================================================================
// BaseOS Tests - Suíte de Testes da Ordem de Saque Canônica
// =====================================================================

import { describe, it, expect, beforeAll } from 'vitest';
import {
  createBlankBaseosServeOrderData,
  mapScoresheetToServeOrderData,
  resolveServeOrderFormat,
  generateServeOrderCards,
  generateServeOrderPdfBlob,
  generateBlankServeOrderPdfBlob,
  generateGamePackagePdfBlob,
  loadBaseosScoresheetData,
  type BaseosScoresheetData,
  type BaseosServeOrderData,
} from '@/document-engine/baseos';
import { dataAccess } from '@/services/dataAccess';
import { DEFAULT_INDOOR_COMPETITION_CONFIG } from '@/types/competitionConfig';

if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    key: (i: number) => Object.keys(store)[i] || null,
    length: 0,
  } as unknown as Storage;
}

describe('BaseOS Ordem de Saque Canônica - Testes de Regras e Formato', () => {
  describe('1. Resolução Canônica de Formato (setsToWin / maxSets)', () => {
    it('resolve corretamente formato para setsToWin = 1 (1-set)', () => {
      const mockScoresheet = {
        document: { format: '3-sets' },
        rules: { setsToWin: 1, maxSets: 1 },
      } as unknown as BaseosScoresheetData;

      expect(resolveServeOrderFormat(mockScoresheet)).toBe('1-set');
    });

    it('resolve corretamente formato para setsToWin = 2 (3-sets)', () => {
      const mockScoresheet = {
        document: { format: '3-sets' },
        rules: { setsToWin: 2, maxSets: 3 },
      } as unknown as BaseosScoresheetData;

      expect(resolveServeOrderFormat(mockScoresheet)).toBe('3-sets');
    });

    it('resolve corretamente formato para setsToWin = 3 (5-sets)', () => {
      const mockScoresheet = {
        document: { format: '5-sets' },
        rules: { setsToWin: 3, maxSets: 5 },
      } as unknown as BaseosScoresheetData;

      expect(resolveServeOrderFormat(mockScoresheet)).toBe('5-sets');
    });

    it('faz fallback para document.format quando rules for indefinido', () => {
      const mock3 = { document: { format: '3-sets' } } as unknown as BaseosScoresheetData;
      const mock5 = { document: { format: '5-sets' } } as unknown as BaseosScoresheetData;

      expect(resolveServeOrderFormat(mock3)).toBe('3-sets');
      expect(resolveServeOrderFormat(mock5)).toBe('5-sets');
    });
  });

  describe('2. Geração e Semântica de Fichas (Oficiais vs Reservas)', () => {
    it('para 1-set: gera 8 cards com 2 sets oficiais (decisivos) e 6 reservas', () => {
      const cards = generateServeOrderCards(
        { name: 'Time Alpha' },
        { name: 'Time Beta' },
        '1-set',
        1,
      );

      expect(cards).toHaveLength(8);

      const cardsA = cards.filter(c => c.teamSide === 'A');
      const cardsB = cards.filter(c => c.teamSide === 'B');

      expect(cardsA).toHaveLength(4);
      expect(cardsB).toHaveLength(4);

      // Equipe A: 1 oficial + 3 reservas
      expect(cardsA[0].cardType).toBe('official-set');
      expect(cardsA[0].setNumber).toBe(1);
      expect(cardsA[0].isDecidingSet).toBe(true);
      expect(cardsA[1].cardType).toBe('reserve');
      expect(cardsA[1].setNumber).toBeUndefined();
      expect(cardsA[2].cardType).toBe('reserve');
      expect(cardsA[3].cardType).toBe('reserve');

      // Equipe B: 1 oficial + 3 reservas
      expect(cardsB[0].cardType).toBe('official-set');
      expect(cardsB[0].setNumber).toBe(1);
      expect(cardsB[0].isDecidingSet).toBe(true);
      expect(cardsB[1].cardType).toBe('reserve');
      expect(cardsB[2].cardType).toBe('reserve');
      expect(cardsB[3].cardType).toBe('reserve');
    });

    it('para 3-sets: gera 8 cards com 6 sets oficiais e 2 reservas (1 página)', () => {
      const cards = generateServeOrderCards(
        { name: 'Time Alpha' },
        { name: 'Time Beta' },
        '3-sets',
        42,
      );

      expect(cards).toHaveLength(8);

      const cardsA = cards.filter(c => c.teamSide === 'A');
      const cardsB = cards.filter(c => c.teamSide === 'B');

      expect(cardsA).toHaveLength(4);
      expect(cardsB).toHaveLength(4);

      // Equipe A
      expect(cardsA[0].setNumber).toBe(1);
      expect(cardsA[0].cardType).toBe('official-set');
      expect(cardsA[1].setNumber).toBe(2);
      expect(cardsA[1].cardType).toBe('official-set');
      expect(cardsA[2].setNumber).toBe(3);
      expect(cardsA[2].cardType).toBe('official-set');
      expect(cardsA[2].isDecidingSet).toBe(true);
      expect(cardsA[3].cardType).toBe('reserve');
      expect(cardsA[3].setNumber).toBeUndefined();

      // Equipe B
      expect(cardsB[0].setNumber).toBe(1);
      expect(cardsB[1].setNumber).toBe(2);
      expect(cardsB[2].setNumber).toBe(3);
      expect(cardsB[2].isDecidingSet).toBe(true);
      expect(cardsB[3].cardType).toBe('reserve');
    });

    it('para 5-sets: gera 16 cards com 10 sets oficiais e 6 reservas (2 páginas)', () => {
      const cards = generateServeOrderCards(
        { name: 'Time Alpha' },
        { name: 'Time Beta' },
        '5-sets',
        99,
      );

      expect(cards).toHaveLength(16);

      const cardsA = cards.filter(c => c.teamSide === 'A');
      const cardsB = cards.filter(c => c.teamSide === 'B');

      expect(cardsA).toHaveLength(8);
      expect(cardsB).toHaveLength(8);

      // Sets 1 a 4
      for (let i = 0; i < 4; i++) {
        expect(cardsA[i].cardType).toBe('official-set');
        expect(cardsA[i].setNumber).toBe(i + 1);
        expect(cardsA[i].isDecidingSet).toBe(false);
      }

      // Set 5 é decisivo
      expect(cardsA[4].cardType).toBe('official-set');
      expect(cardsA[4].setNumber).toBe(5);
      expect(cardsA[4].isDecidingSet).toBe(true);

      // Reservas 1 a 3
      expect(cardsA[5].cardType).toBe('reserve');
      expect(cardsA[6].cardType).toBe('reserve');
      expect(cardsA[7].cardType).toBe('reserve');
      expect(cardsA[5].setNumber).toBeUndefined();
    });
  });

  describe('3. Ausência Total de Referências a Terceiros (FPV / Itaipu)', () => {
    it('garante que a estrutura gerada não contém referências a FPV ou Itaipu', () => {
      const blankData = createBlankBaseosServeOrderData('3-sets');
      const jsonString = JSON.stringify(blankData);

      expect(jsonString).not.toContain('FPV');
      expect(jsonString).not.toContain('Paranaense');
      expect(jsonString).not.toContain('Itaipu');
      expect(jsonString).not.toContain('BINACIONAL');
      expect(blankData.document.type).toBe('BASEOS_SERVE_ORDER');
    });
  });

  describe('4. Teste de Conteúdo Extremo (Robustez e Nomes Longos)', () => {
    it('suporta nomes longos de competição, equipes e técnicos sem erros', () => {
      const extremeData: BaseosServeOrderData = {
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
          teamA: {
            name: 'Associação Atlética e Cultural Beneficente dos Funcionários de Pato Branco',
            coachName: 'Prof. Washington Luís de Albuquerque Silveira Júnior',
            libero1Jersey: 18,
            libero2Jersey: 99,
            captainJersey: 10,
          },
          teamB: {
            name: 'Sociedade Esportiva Recreativa e Desportiva União da Vitória Voleibol Clube',
            coachName: 'Treinador Carlos Alberto de Oliveira Santos Brandão e Souza',
            libero1Jersey: 25,
            captainJersey: 7,
          },
        },
        rules: {
          setsToWin: 2,
          maxSets: 3,
          format: '3-sets',
        },
        cards: generateServeOrderCards(
          {
            name: 'Associação Atlética e Cultural Beneficente dos Funcionários de Pato Branco',
            coachName: 'Prof. Washington Luís de Albuquerque Silveira Júnior',
            libero1Jersey: 18,
            libero2Jersey: 99,
            captainJersey: 10,
          },
          {
            name: 'Sociedade Esportiva Recreativa e Desportiva União da Vitória Voleibol Clube',
            coachName: 'Treinador Carlos Alberto de Oliveira Santos Brandão e Souza',
            libero1Jersey: 25,
            captainJersey: 7,
          },
          '3-sets',
          '999/2026-F',
        ),
      };

      expect(extremeData.cards).toHaveLength(8);
      expect(extremeData.teams.teamA.name.length).toBeGreaterThan(60);
      expect(extremeData.competition.name.length).toBeGreaterThan(80);
    });
  });

  describe('5. Teste de Integração Real com matchId (E2E Documental)', () => {
    it('carrega partida real a partir de matchId e gera Ordem de Saque contextualizada e Pacote do Jogo', async () => {
      const comp = await dataAccess.createCompetition({
        name: 'Copa Integração BaseOS 2026',
        modality: 'indoor',
        format: 'groups',
        genderCategory: 'male',
        playerFormat: '6x6',
        setFormat: '3-sets',
        status: 'in-progress',
        startDate: '2026-09-01',
        endDate: '2026-09-30',
        config: {
          ...DEFAULT_INDOOR_COMPETITION_CONFIG,
          format: {
            ...DEFAULT_INDOOR_COMPETITION_CONFIG.format,
            defaultSetsToWin: 2,
          },
        },
      });

      const teamA = await dataAccess.createTeam({
        name: 'Vortex Vôlei Clube',
        shortName: 'VTX',
        modality: 'indoor',
        coachName: 'Marcelo Mendez',
      });

      const teamB = await dataAccess.createTeam({
        name: 'Fênix Voleibol',
        shortName: 'FNX',
        modality: 'indoor',
        coachName: 'Bernardo Rezende',
      });

      const match = await dataAccess.createMatch({
        competitionId: comp.id,
        round: 1,
        matchNumber: 15,
        teamAId: teamA.id,
        teamBId: teamB.id,
        teamAName: teamA.name,
        teamBName: teamB.name,
        teamAShortName: 'VTX',
        teamBShortName: 'FNX',
        venue: 'Ginásio Central',
        scheduledTime: '2026-09-15T19:00:00Z',
        court: 'Quadra Central',
        phase: 'Fase Classificatória',
        status: 'scheduled',
        referees: [],
        sets: [],
      });

      const scoresheetData = await loadBaseosScoresheetData(match.id, 'prefilled');
      expect(scoresheetData).not.toBeNull();
      if (!scoresheetData) return;

      const serveOrderData = mapScoresheetToServeOrderData(scoresheetData);

      expect(serveOrderData.document.type).toBe('BASEOS_SERVE_ORDER');
      expect(serveOrderData.match.number).toBe(15);
      expect(serveOrderData.teams.teamA.name).toBe('Vortex Vôlei Clube');
      expect(serveOrderData.teams.teamB.name).toBe('Fênix Voleibol');

      // Gera o Blob real da Ordem de Saque
      const blob = await generateServeOrderPdfBlob(serveOrderData);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
      expect(blob.size).toBeGreaterThan(2000);

      // Gera o Pacote do Jogo unificado (Súmula + Ordem de Saque)
      const packageBlob = await generateGamePackagePdfBlob(scoresheetData);
      expect(packageBlob).toBeInstanceOf(Blob);
      expect(packageBlob.type).toBe('application/pdf');
      expect(packageBlob.size).toBeGreaterThan(5000);
    });
  });

  describe('6. Geração de Blobs em Branco e Formatos 1, 3 e 5 sets', () => {
    it('gera Blob em branco de 1 set', async () => {
      const blob = await generateBlankServeOrderPdfBlob('1-set');
      expect(blob.type).toBe('application/pdf');
      expect(blob.size).toBeGreaterThan(1000);
    });

    it('gera Blob em branco de 3 sets', async () => {
      const blob = await generateBlankServeOrderPdfBlob('3-sets');
      expect(blob.type).toBe('application/pdf');
      expect(blob.size).toBeGreaterThan(1000);
    });

    it('gera Blob em branco de 5 sets', async () => {
      const blob = await generateBlankServeOrderPdfBlob('5-sets');
      expect(blob.type).toBe('application/pdf');
      expect(blob.size).toBeGreaterThan(1000);
    });
  });
});
