import { describe, it, expect } from 'vitest';
import { evaluateCompetitionReadiness } from '@/services/competitionReadinessService';
import { getHelpArticleById } from '@/data/helpArticles';
import type {
  CompetitionRecord,
  MatchRecord,
  TeamRecord,
  ModalityRecord,
  VenueRecord,
} from '@/types/entities';
import type { CompetitionTeam, CompetitionAthlete } from '@/types/registration';
import type { DrawRecord } from '@/types/draw';

describe('Competition Readiness System — BaseOS', () => {
  const baseModality: ModalityRecord = {
    id: 'mod-indoor-1',
    name: 'Vôlei de Quadra',
    type: 'indoor',
    defaultPlayerFormat: '6x6',
    defaultSetFormat: '3-sets',
    defaultSetPoints: 25,
    defaultTiebreakPoints: 15,
  };

  const baseVenue: VenueRecord = {
    id: 'ven-1',
    name: 'Ginásio Poliesportivo Central',
    courts: ['Quadra Principal', 'Quadra 2'],
    courtDetails: [
      { id: 'c1', name: 'Quadra Principal', status: 'active' },
      { id: 'c2', name: 'Quadra 2', status: 'active' },
    ],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const sampleTeams: TeamRecord[] = [
    { id: 't1', name: 'Vôlei Taubaté', shortName: 'TAU', modality: 'indoor' },
    { id: 't2', name: 'Sada Cruzeiro', shortName: 'SAD', modality: 'indoor' },
    { id: 't3', name: 'Minas Tênis Clube', shortName: 'MTC', modality: 'indoor' },
    { id: 't4', name: 'Sesi Bauru', shortName: 'SES', modality: 'indoor' },
  ];

  const sampleCompTeams: CompetitionTeam[] = [
    {
      id: 'ct1',
      competitionId: 'comp-1',
      teamId: 't1',
      teamName: 'Vôlei Taubaté',
      teamShortName: 'TAU',
      accessToken: 'tok-1',
      status: 'submitted',
      registrationDeadline: '2026-12-31T23:59:59Z',
      isLocked: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'ct2',
      competitionId: 'comp-1',
      teamId: 't2',
      teamName: 'Sada Cruzeiro',
      teamShortName: 'SAD',
      accessToken: 'tok-2',
      status: 'submitted',
      registrationDeadline: '2026-12-31T23:59:59Z',
      isLocked: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'ct3',
      competitionId: 'comp-1',
      teamId: 't3',
      teamName: 'Minas Tênis Clube',
      teamShortName: 'MTC',
      accessToken: 'tok-3',
      status: 'submitted',
      registrationDeadline: '2026-12-31T23:59:59Z',
      isLocked: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'ct4',
      competitionId: 'comp-1',
      teamId: 't4',
      teamName: 'Sesi Bauru',
      teamShortName: 'SES',
      accessToken: 'tok-4',
      status: 'submitted',
      registrationDeadline: '2026-12-31T23:59:59Z',
      isLocked: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  const generateAthletesForTeam = (compTeamId: string, count: number = 6): CompetitionAthlete[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `ath-${compTeamId}-${i + 1}`,
      competitionTeamId: compTeamId,
      name: `Atleta ${i + 1} (${compTeamId})`,
      jerseyNumber: i + 1,
      position: i === 0 ? 'Levantador' : i === 5 ? 'Líbero' : 'Ponteiro',
      isCaptain: i === 0,
      isLibero: i === 5,
      gender: 'male',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }));
  };

  it('1. Competição vazia / recém-criada deve apresentar estágio PREPARACAO e pendências', () => {
    const emptyComp: CompetitionRecord = {
      id: 'comp-empty',
      name: '',
      modality: 'indoor',
      format: '3-sets',
      playerFormat: '6x6',
      setFormat: '3-sets',
      genderCategory: 'male',
      status: 'planning',
    };

    const report = evaluateCompetitionReadiness({
      competition: emptyComp,
      modalities: [baseModality],
      venues: [],
      teams: [],
      competitionTeams: [],
      athletes: [],
      matches: [],
    });

    expect(report.globalStage).toBe('PREPARACAO');
    expect(report.percentage).toBeLessThan(40);
    expect(report.canHomologate).toBe(false);
    expect(report.pendingTasks.length).toBeGreaterThan(0);
    expect(report.pendingTasks.some(t => t.id === 'task-comp-name')).toBe(true);
    expect(report.steps[0].status).toBe('attention'); // falta nome
    expect(report.steps[3].status).toBe('pending'); // sem equipes
    expect(report.steps[5].status).toBe('blocked'); // sorteio bloqueado
  });

  it('2. Competição com equipes cadastradas mas com pendências de elenco', () => {
    const comp: CompetitionRecord = {
      id: 'comp-1',
      name: 'Superliga Paulista 2026',
      modality: 'indoor',
      format: '3-sets',
      playerFormat: '6x6',
      setFormat: '3-sets',
      genderCategory: 'male',
      startDate: '2026-09-01',
      endDate: '2026-10-01',
      status: 'registration-open',
    };

    // ct1 com apenas 2 atletas (abaixo do mínimo 6)
    const incompleteAthletes: CompetitionAthlete[] = [
      { id: 'a1', competitionTeamId: 'ct1', name: 'João', position: 'Ponteiro', jerseyNumber: 5, isCaptain: false, isLibero: false, gender: 'male', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
      { id: 'a2', competitionTeamId: 'ct1', name: 'Pedro', position: 'Levantador', jerseyNumber: 5, isCaptain: false, isLibero: false, gender: 'male', createdAt: '2026-01-01', updatedAt: '2026-01-01' }, // camisa duplicada e sem capitão
    ];

    const report = evaluateCompetitionReadiness({
      competition: comp,
      modalities: [baseModality],
      venues: [baseVenue],
      teams: sampleTeams,
      competitionTeams: sampleCompTeams,
      athletes: incompleteAthletes,
      matches: [],
    });

    expect(report.steps[3].status).toBe('completed'); // equipes cadastradas
    expect(report.steps[4].status).toBe('attention'); // elencos pendentes
    expect(report.pendingTasks.some(t => t.id.startsWith('task-roster-'))).toBe(true);
  });

  it('3. Competição pronta para iniciar jogos quando tabela e quadras estão configuradas', () => {
    const comp: CompetitionRecord = {
      id: 'comp-1',
      name: 'Superliga Paulista 2026',
      modality: 'indoor',
      format: '3-sets',
      playerFormat: '6x6',
      setFormat: '3-sets',
      genderCategory: 'male',
      startDate: '2026-09-01',
      endDate: '2026-10-01',
      status: 'groups-defined',
      tiebreakCriteriaOrder: ['points', 'victories', 'head-to-head', 'set-average', 'points-average'],
    };

    const allAthletes = sampleCompTeams.flatMap(ct => generateAthletesForTeam(ct.id, 8));

    const draw: DrawRecord = {
      id: 'draw-1',
      competitionId: 'comp-1',
      config: {
        groupsCount: 1,
        seedingMode: 'random',
        seed: 42,
        headSeeds: [],
      },
      groups: [
        {
          name: 'Chave Única',
          teams: sampleCompTeams.map((ct, idx) => ({ teamId: ct.teamId, seed: idx + 1 })),
        },
      ],
      matches: [],
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };

    const scheduledMatches: MatchRecord[] = [
      {
        id: 'm1',
        competitionId: 'comp-1',
        round: 1,
        matchNumber: 1,
        teamAId: 't1',
        teamBId: 't2',
        teamAName: 'Taubaté',
        teamBName: 'Cruzeiro',
        teamAShortName: 'TAU',
        teamBShortName: 'SAD',
        groupName: 'Chave Única',
        scheduledTime: '2026-09-10T19:00:00Z',
        venue: 'Ginásio Poliesportivo Central',
        court: 'Quadra Principal',
        status: 'scheduled',
        sets: [],
        referees: [],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ];

    const report = evaluateCompetitionReadiness({
      competition: comp,
      modalities: [baseModality],
      venues: [baseVenue],
      teams: sampleTeams,
      competitionTeams: sampleCompTeams,
      athletes: allAthletes,
      draws: [draw],
      matches: scheduledMatches,
    });

    expect(report.globalStage).toBe('PRONTA_PARA_INICIAR');
    expect(report.steps[0].status).toBe('completed');
    expect(report.steps[3].status).toBe('completed');
    expect(report.steps[4].status).toBe('completed');
    expect(report.steps[5].status).toBe('completed');
    expect(report.steps[7].status).toBe('completed');
    expect(report.steps[8].status).toBe('completed');
    expect(report.nextAction?.actionLabel).toBe('Ir para Central de Jogos');
  });

  it('4. Competição em andamento com progresso proporcional de partidas', () => {
    const comp: CompetitionRecord = {
      id: 'comp-1',
      name: 'Superliga Paulista 2026',
      modality: 'indoor',
      format: '3-sets',
      playerFormat: '6x6',
      setFormat: '3-sets',
      genderCategory: 'male',
      startDate: '2026-09-01',
      status: 'in-progress',
    };

    const matchesList: MatchRecord[] = [
      {
        id: 'm1',
        competitionId: 'comp-1',
        round: 1,
        matchNumber: 1,
        teamAId: 't1',
        teamBId: 't2',
        teamAName: 'Taubaté',
        teamBName: 'Cruzeiro',
        teamAShortName: 'TAU',
        teamBShortName: 'SAD',
        scheduledTime: '2026-09-10T19:00:00Z',
        venue: 'Ginásio',
        court: 'Quadra 1',
        status: 'completed',
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 20 },
          { setNumber: 2, scoreA: 25, scoreB: 22 },
        ],
        winnerId: 't1',
        referees: [],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      {
        id: 'm2',
        competitionId: 'comp-1',
        round: 1,
        matchNumber: 2,
        teamAId: 't3',
        teamBId: 't4',
        teamAName: 'Minas',
        teamBName: 'Sesi',
        teamAShortName: 'MTC',
        teamBShortName: 'SES',
        scheduledTime: '2026-09-10T21:00:00Z',
        venue: 'Ginásio',
        court: 'Quadra 1',
        status: 'in-progress',
        sets: [{ setNumber: 1, scoreA: 18, scoreB: 15 }],
        referees: [],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ];

    const report = evaluateCompetitionReadiness({
      competition: comp,
      modalities: [baseModality],
      venues: [baseVenue],
      teams: sampleTeams,
      competitionTeams: sampleCompTeams,
      athletes: sampleCompTeams.flatMap(ct => generateAthletesForTeam(ct.id, 8)),
      matches: matchesList,
    });

    expect(report.globalStage).toBe('EM_ANDAMENTO');
    expect(report.matchesStats.total).toBe(2);
    expect(report.matchesStats.completed).toBe(1);
    expect(report.matchesStats.inProgress).toBe(1);
    expect(report.matchesStats.percentageCompleted).toBe(50);
  });

  it('5. Competição pronta para homologação quando todos os jogos e pódio estão concluídos', () => {
    const comp: CompetitionRecord = {
      id: 'comp-1',
      name: 'Superliga Paulista 2026',
      modality: 'indoor',
      format: '3-sets',
      playerFormat: '6x6',
      setFormat: '3-sets',
      genderCategory: 'male',
      startDate: '2026-09-01',
      status: 'playoffs',
      championTeamId: 't1',
      runnerUpTeamId: 't2',
      thirdPlaceTeamId: 't3',
    };

    const finalMatches: MatchRecord[] = [
      {
        id: 'm-final',
        competitionId: 'comp-1',
        round: 2,
        matchNumber: 10,
        phase: 'final',
        teamAId: 't1',
        teamBId: 't2',
        teamAName: 'Taubaté',
        teamBName: 'Cruzeiro',
        teamAShortName: 'TAU',
        teamBShortName: 'SAD',
        scheduledTime: '2026-09-20T19:00:00Z',
        venue: 'Ginásio',
        court: 'Quadra 1',
        status: 'completed',
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 23 },
          { setNumber: 2, scoreA: 25, scoreB: 21 },
        ],
        winnerId: 't1',
        referees: [],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ];

    const report = evaluateCompetitionReadiness({
      competition: comp,
      modalities: [baseModality],
      venues: [baseVenue],
      teams: sampleTeams,
      competitionTeams: sampleCompTeams,
      athletes: sampleCompTeams.flatMap(ct => generateAthletesForTeam(ct.id, 8)),
      matches: finalMatches,
    });

    expect(report.globalStage).toBe('PRONTA_PARA_HOMOLOGACAO');
    expect(report.canHomologate).toBe(true);
    expect(report.nextAction?.actionLabel).toBe('Homologar Competição');
  });

  it('6. Teste de Determinismo e Imutabilidade', () => {
    const comp: CompetitionRecord = {
      id: 'comp-test',
      name: 'Torneio Teste',
      modality: 'beach',
      format: '3-sets',
      playerFormat: '2x2',
      setFormat: '3-sets',
      genderCategory: 'mixed',
      status: 'planning',
    };

    const compClone = JSON.parse(JSON.stringify(comp));
    const sampleTeamsClone = JSON.parse(JSON.stringify(sampleTeams));

    const report1 = evaluateCompetitionReadiness({
      competition: comp,
      teams: sampleTeams,
    });

    const report2 = evaluateCompetitionReadiness({
      competition: comp,
      teams: sampleTeams,
    });

    // Determinismo
    expect(report1).toEqual(report2);

    // Não-mutação
    expect(comp).toEqual(compClone);
    expect(sampleTeams).toEqual(sampleTeamsClone);
  });

  it('7. Teste de Integridade de Artigos e Rotas', () => {
    const comp: CompetitionRecord = {
      id: 'comp-1',
      name: 'Torneio',
      modality: 'indoor',
      format: '3-sets',
      playerFormat: '6x6',
      setFormat: '3-sets',
      genderCategory: 'male',
      status: 'in-progress',
    };

    const report = evaluateCompetitionReadiness({
      competition: comp,
      teams: sampleTeams,
      competitionTeams: sampleCompTeams,
      athletes: sampleCompTeams.flatMap(ct => generateAthletesForTeam(ct.id, 6)),
    });

    // Cada etapa que possui articleId deve apontar para um artigo real da Base de Conhecimento
    for (const step of report.steps) {
      if (step.articleId) {
        const article = getHelpArticleById(step.articleId);
        expect(article, `Artigo ${step.articleId} referenciado na etapa ${step.stepNumber} deve existir`).toBeDefined();
      }
      if (step.route) {
        expect(step.route.startsWith('/')).toBe(true);
      }
    }

    // Cada pendência com articleId deve apontar para um artigo real
    for (const task of report.pendingTasks) {
      if (task.articleId) {
        const article = getHelpArticleById(task.articleId);
        expect(article, `Artigo ${task.articleId} na pendência "${task.title}" deve existir`).toBeDefined();
      }
    }
  });
});
