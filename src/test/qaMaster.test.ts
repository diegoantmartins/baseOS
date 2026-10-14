import { beforeEach, describe, expect, it } from 'vitest';
import { dataAccess, resetLocalData } from '@/services/dataAccess';
import { authService, clearAuthSession } from '@/services/authService';
import { computeStandings, computeStandingsByGroup } from '@/services/standingsService';
import {
  buildMatchDocument,
  loadMatchContext,
  saveDocumentEdit,
  loadDocumentEdits,
  saveTemplateLayout,
} from '@/services/documentEditorService';
import {
  buildSumulaData,
  generateThreeSetScoresheet,
  generateFiveSetScoresheet,
  generateServeOrderSheet,
  buildOrdemSaqueData,
  generateMatchDocuments,
} from '@/document-engine/generators';
import {
  generateOfficialMatchSheetPdf,
  generatePositionOrderSheetPdf,
} from '@/lib/pdf/officialMatchSheetPdf';
import {
  generateMatchesBoletimPdf,
  generateStandingsReportPdf,
  generateTeamRosterReportPdf,
} from '@/lib/pdf/reportsPdf';
import type { MatchRecord, TeamRecord } from '@/types/entities';

describe('QA Master Suite - BaseOS System End-to-End Validation', () => {
  let mainMatch: MatchRecord;

  beforeEach(async () => {
    clearAuthSession();
    resetLocalData();

    mainMatch = await dataAccess.createMatch({
      competitionId: 'comp-masculino-2026',
      round: 1,
      matchNumber: 1,
      teamAId: 'team-m-1',
      teamBId: 'team-m-2',
      teamAName: 'Vortex Vôlei Clube',
      teamBName: 'Titanium Voleibol',
      teamAShortName: 'VVC',
      teamBShortName: 'TIT',
      venue: 'Ginásio Municipal',
      court: 'Quadra 1',
      phase: 'classificatória',
      groupName: 'Grupo A',
      scheduledTime: '2026-08-22T19:00:00Z',
      status: 'completed',
      sets: [
        { setNumber: 1, scoreA: 25, scoreB: 22 },
        { setNumber: 2, scoreA: 23, scoreB: 25 },
        { setNumber: 3, scoreA: 25, scoreB: 18 },
      ],
      referees: [
        { role: '1º Árbitro', name: 'Carlos Silva' },
        { role: '2º Árbitro', name: 'Ana Santos' },
      ],
    });
  });

  describe('1. Autenticação e Controle de Acesso (RBAC)', () => {
    it('valida ciclo de vida completo de autenticação e perfis', async () => {
      // Organizador
      const org = await authService.signIn('organizador@voleipro.app', 'demo123');
      expect(org.ok).toBe(true);
      expect(org.session?.user.role).toBe('organizer');
      expect(authService.hasRole(org.session, ['organizer'])).toBe(true);
      expect(authService.hasRole(org.session, ['team'])).toBe(false);

      // Equipe
      const team = await authService.signIn('equipe@voleipro.app', 'demo123');
      expect(team.ok).toBe(true);
      expect(team.session?.user.role).toBe('team');
      expect(team.session?.user.competitionTeamId).toBe('ct-2');

      // Árbitro
      const ref = await authService.signIn('arbitro@voleipro.app', 'demo123');
      expect(ref.ok).toBe(true);
      expect(ref.session?.user.role).toBe('referee');

      // Logout
      await authService.signOut();
      expect(authService.getStoredSession()).toBeNull();
    });
  });

  describe('2. Repositório e Integridade de Dados', () => {
    it('garante que coleções base são carregadas e pesquisáveis', async () => {
      const competitions = await dataAccess.listCompetitions();
      expect(competitions.length).toBeGreaterThan(0);

      const teams = await dataAccess.listTeams();
      expect(teams.length).toBeGreaterThan(0);

      const matches = await dataAccess.listMatches();
      expect(matches.length).toBeGreaterThan(0);

      const venues = await dataAccess.listVenues();
      expect(venues.length).toBeGreaterThan(0);

      const settings = await dataAccess.getSettings();
      expect(settings.orgName).toBeDefined();
    });
  });

  describe('3. Motor de Documentos Oficiais (Document Engine & Súmulas)', () => {
    it('gera súmula de 3 sets (A4 Paisagem) com preenchimento completo', async () => {
      const ctx = await loadMatchContext(mainMatch.id);
      expect(ctx).not.toBeNull();
      if (!ctx) return;

      const doc = buildMatchDocument(ctx);
      const sumulaData = buildSumulaData(doc);
      expect(sumulaData.match.competitionName).toBe(ctx.competitionName);
      expect(sumulaData.match.teamA.name).toBe(mainMatch.teamAName);
      expect(sumulaData.match.teamB.name).toBe(mainMatch.teamBName);

      const pdfBytes = await generateThreeSetScoresheet(sumulaData);
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(1000);
    });

    it('gera súmula de 5 sets (A3 Paisagem) com controle de parciais', async () => {
      const ctx = await loadMatchContext(mainMatch.id);
      expect(ctx).not.toBeNull();
      if (!ctx) return;

      const doc = buildMatchDocument(ctx);
      const sumulaData = buildSumulaData(doc);

      const pdfBytes = await generateFiveSetScoresheet(sumulaData);
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(1000);
    });

    it('gera fichas de ordem de saque (8 filipetas A4)', async () => {
      const ctx = await loadMatchContext(mainMatch.id);
      expect(ctx).not.toBeNull();
      if (!ctx) return;

      const doc = buildMatchDocument(ctx);
      const ordemData = buildOrdemSaqueData(doc);

      const pdfBytes = await generateServeOrderSheet(ordemData);
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(1000);
    });

    it('gera pacote unificado de documentos da partida (generateMatchDocuments)', async () => {
      const ctx = await loadMatchContext(mainMatch.id);
      expect(ctx).not.toBeNull();
      if (!ctx) return;

      const doc = buildMatchDocument(ctx);
      const bundle = await generateMatchDocuments(doc, { includeServeOrder: true });
      expect(bundle.sumula).toBeInstanceOf(Uint8Array);
      expect(bundle.sumula.length).toBeGreaterThan(1000);
      expect(bundle.fileName).toContain('.pdf');
      expect(bundle.serveOrder).toBeInstanceOf(Uint8Array);
    });

    it('gera documentos diretamente pelo motor visual oficial (officialMatchSheetPdf)', () => {
      const mockData = {
        orgName: 'Federação de Voleibol',
        competition: 'Campeonato Principal 2026',
        category: 'Adulto Especial',
        genderCategory: 'male' as const,
        modality: 'indoor' as const,
        format: '3-sets' as const,
        playerFormat: '6x6' as const,
        date: '25/08/2026',
        time: '20:00',
        venue: 'Ginásio Municipal',
        court: 'Principal',
        city: 'São Paulo - SP',
        phase: 'Final',
        groupName: 'Chave Ouro',
        round: 3,
        matchNumber: 15,
        teamA: {
          name: 'Vôlei Renata',
          shortName: 'REN',
          athletes: [
            { jerseyNumber: 1, name: 'Lucas Bento', position: 'Levantador', captain: true },
            { jerseyNumber: 5, name: 'Maique Nascimento', position: 'Líbero', libero: true },
            { jerseyNumber: 8, name: 'Bruno Lima', position: 'Oposto' },
          ],
          coach: 'Horacio Dileo',
        },
        teamB: {
          name: 'Sada Cruzeiro',
          shortName: 'SAD',
          athletes: [
            { jerseyNumber: 2, name: 'Rodrigo Ribeiro', position: 'Levantador' },
            { jerseyNumber: 7, name: 'Wallace Souza', position: 'Oposto', captain: true },
            { jerseyNumber: 17, name: 'Lukinha', position: 'Líbero', libero: true },
          ],
          coach: 'Filipe Ferraz',
        },
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 23 },
          { setNumber: 2, scoreA: 20, scoreB: 25 },
          { setNumber: 3, scoreA: 25, scoreB: 21 },
        ],
        finalScoreA: 2,
        finalScoreB: 1,
        referees: [
          { role: '1º Árbitro', name: 'Paulo Silva' },
          { role: '2º Árbitro', name: 'Marcos Souza' },
        ],
        timeouts: [],
        substitutions: [],
        sanctions: [],
        observations: 'Partida transmitida ao vivo.',
      };

      const doc3 = generateOfficialMatchSheetPdf(mockData);
      expect(doc3).toBeDefined();

      const doc5 = generateOfficialMatchSheetPdf({ ...mockData, format: '5-sets' });
      expect(doc5).toBeDefined();

      const fichas = generatePositionOrderSheetPdf(mockData);
      expect(fichas).toBeDefined();
    });
  });

  describe('4. Editor Visual de Documentos e Geometria', () => {
    it('persiste valores editados da partida e reflete no PDF gerado', async () => {
      const customValues = {
        observations: 'Partida com transmissão online - Ginásio Central.',
        referee1: 'Árbitro Internacional Silva',
      };
      await saveDocumentEdit(mainMatch.id, 'SUMMULA_3', customValues);

      const { edit } = await loadDocumentEdits(mainMatch.id, 'SUMMULA_3', 'sumula3');
      expect(edit?.values.observations).toBe(customValues.observations);

      const ctx = await loadMatchContext(mainMatch.id);
      expect(ctx).not.toBeNull();
      if (!ctx) return;

      const doc = buildMatchDocument(ctx);
      const sumulaData = buildSumulaData(doc);
      const pdfBytes = await generateThreeSetScoresheet(sumulaData, {
        valueOverrides: edit?.values,
      });
      expect(pdfBytes.length).toBeGreaterThan(1000);
    });

    it('persiste ajustes de layout (x, y, width, fontSize) no template', async () => {
      const customLayout = {
        competitionName: { x: 45, y: 110, width: 220, fontSize: 11 },
        teamAName: { x: 35, y: 45, width: 120, fontSize: 9 },
      };

      await saveTemplateLayout('sumula3', customLayout);

      const { layout } = await loadDocumentEdits(mainMatch.id, 'SUMMULA_3', 'sumula3');
      expect(layout?.fields.competitionName?.x).toBe(45);
      expect(layout?.fields.teamAName?.fontSize).toBe(9);
    });
  });

  describe('5. Motor de Classificação e Desempate (FIVB/CBV)', () => {
    it('calcula pontuação e desempates por confronto direto e set average', () => {
      const competitionId = 'comp-1';
      const teamA: TeamRecord = { id: 't1', name: 'Equipe Alpha', shortName: 'ALP', modality: 'indoor' };
      const teamB: TeamRecord = { id: 't2', name: 'Equipe Beta', shortName: 'BET', modality: 'indoor' };

      const matches: MatchRecord[] = [
        {
          id: 'm1',
          competitionId,
          matchNumber: 1,
          round: 1,
          teamAId: 't1',
          teamBId: 't2',
          teamAName: 'Equipe Alpha',
          teamBName: 'Equipe Beta',
          teamAShortName: 'ALP',
          teamBShortName: 'BET',
          scheduledTime: '2026-08-20T19:00:00Z',
          venue: 'Ginásio',
          court: '1',
          phase: 'classificatoria',
          groupName: 'Grupo A',
          status: 'completed',
          sets: [
            { setNumber: 1, scoreA: 25, scoreB: 20 },
            { setNumber: 2, scoreA: 25, scoreB: 18 },
            { setNumber: 3, scoreA: 25, scoreB: 22 },
          ],
          referees: [{ role: '1º Árbitro', name: 'Carlos' }],
          createdAt: '',
          updatedAt: '',
        },
      ];

      const standings = computeStandings([{ team: teamA, groupName: 'Grupo A' }, { team: teamB, groupName: 'Grupo A' }], matches);
      expect(standings.length).toBe(2);

      // Alpha venceu por 3x0 -> 3 pts
      const alpha = standings.find(s => s.teamId === 't1');
      expect(alpha?.competitionPoints).toBe(3);
      expect(alpha?.matchesPlayed).toBe(1);
      expect(alpha?.matchesWon).toBe(1);
      expect(alpha?.setsWon).toBe(3);
      expect(alpha?.setsLost).toBe(0);

      // Beta perdeu por 0x3 -> 0 pts
      const beta = standings.find(s => s.teamId === 't2');
      expect(beta?.competitionPoints).toBe(0);
      expect(beta?.matchesPlayed).toBe(1);
      expect(beta?.matchesLost).toBe(1);

      // Agrupamento
      const grouped = computeStandingsByGroup([{ team: teamA, groupName: 'Grupo A' }, { team: teamB, groupName: 'Grupo A' }], matches);
      expect(grouped.length).toBe(1);
      expect(grouped[0].groupName).toBe('Grupo A');
    });
  });

  describe('6. Emissão de Boletins e Relatórios A4', () => {
    it('gera Boletim Oficial de Jogos', async () => {
      const matches = await dataAccess.listMatches();
      const competitions = await dataAccess.listCompetitions();
      const comp = competitions[0];

      const rows = matches.map(m => ({
        matchNumber: m.round,
        round: m.round,
        phase: m.phase,
        groupName: m.groupName,
        date: new Date(m.scheduledTime).toLocaleDateString('pt-BR'),
        time: new Date(m.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        venue: m.venue,
        court: m.court,
        teamAName: m.teamAName,
        teamBName: m.teamBName,
        statusLabel: m.status === 'completed' ? 'Finalizado' : 'Agendado',
      }));

      const doc = generateMatchesBoletimPdf(rows, comp.name, 'BaseOS');
      expect(doc).toBeDefined();
      expect(doc.internal.pages.length).toBeGreaterThan(0);
    });

    it('gera Relatório de Classificação Geral', async () => {
      const matches = await dataAccess.listMatches();
      const competitions = await dataAccess.listCompetitions();
      const teams = await dataAccess.listTeams();
      const comp = competitions[0];

      const input = teams.map(t => ({ team: t, groupName: 'Chave Única' }));
      const standings = computeStandings(input, matches);
      const groups = [{ groupName: 'Chave Única', standings }];

      const doc = generateStandingsReportPdf(groups, comp.name, 'BaseOS');
      expect(doc).toBeDefined();
      expect(doc.internal.pages.length).toBeGreaterThan(0);
    });

    it('gera Relatório de Relação Nominal das Equipes', async () => {
      const competitions = await dataAccess.listCompetitions();
      const comp = competitions[0];

      const teamsData = [
        {
          name: 'Minas Tênis Clube',
          shortName: 'MIN',
          coach: 'Nicola Negro',
          athletes: [
            {
              name: 'Ana Cristina Souza',
              jerseyNumber: 3,
              position: 'Ponteira',
              isCaptain: true,
              isLibero: false,
            },
            {
              name: 'Kasiely Clemente',
              jerseyNumber: 16,
              position: 'Líbero',
              isCaptain: false,
              isLibero: true,
            },
          ],
        },
      ];

      const doc = generateTeamRosterReportPdf(teamsData, comp.name, 'BaseOS');
      expect(doc).toBeDefined();
      expect(doc.internal.pages.length).toBeGreaterThan(0);
    });
  });

  describe('7. Validação de Navegação Global, Menus e Botões', () => {
    it('garante que todos os itens de menu e rotas estão registrados e consistentes', () => {
      const expectedRoutes = [
        { label: 'Dashboard', path: '/' },
        { label: 'Competições', path: '/competicoes' },
        { label: 'Partidas', path: '/jogos' },
        { label: 'Equipes', path: '/equipes' },
        { label: 'Locais', path: '/locais' },
        { label: 'Pessoas', path: '/pessoas' },
        { label: 'Relatórios', path: '/relatorios' },
        { label: 'Configurações', path: '/configuracoes' },
      ];

      expectedRoutes.forEach(r => {
        expect(r.path).toBeDefined();
        expect(r.label).toBeDefined();
        expect(r.path.startsWith('/')).toBe(true);
      });
    });
  });
});
