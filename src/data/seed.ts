// Dados de demonstração (seed) do VolleyPro.
// Datas de prazo são relativas a Date.now() para a demo sempre funcionar.

import type { CompetitionRecord, MatchRecord, RefereeRecord, TeamRecord } from '@/types/entities';
import type { CompetitionAthlete, CompetitionTeam } from '@/types/registration';

export const SEED_VERSION = 'voleipro.v1';

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

function iso(deltaMs: number): string {
  return new Date(Date.now() + deltaMs).toISOString();
}

export const seedCompetitions: CompetitionRecord[] = [
  {
    id: 'comp-1',
    name: 'Copa Verão 2026 - Masculino',
    modality: 'indoor',
    format: 'round-robin',
    playerFormat: '6x6',
    setFormat: '3-sets',
    genderCategory: 'male',
    startDate: iso(-10 * DAY).slice(0, 10),
    endDate: iso(20 * DAY).slice(0, 10),
    venue: 'Ginásio Municipal',
    status: 'in-progress',
  },
  {
    id: 'comp-2',
    name: 'Copa Verão 2026 - Misto',
    modality: 'indoor',
    format: 'round-robin',
    playerFormat: '6x6',
    setFormat: '3-sets',
    genderCategory: 'mixed',
    defaultDeadline: iso(5 * DAY),
    startDate: iso(10 * DAY).slice(0, 10),
    venue: 'Ginásio Municipal',
    status: 'registration',
  },
];

export const seedTeams: TeamRecord[] = [
  { id: 'team-1', name: 'Osasco Voleibol', shortName: 'OSA', modality: 'indoor', coachName: 'Luizomar de Moura' },
  { id: 'team-2', name: 'Minas Tênis Clube', shortName: 'MIN', modality: 'indoor', coachName: 'Nicola Negro' },
  { id: 'team-3', name: 'Praia Clube', shortName: 'PRA', modality: 'indoor', coachName: 'Paulo Coco' },
  { id: 'team-4', name: 'Flamengo', shortName: 'FLA', modality: 'indoor', coachName: 'Bernardinho' },
  { id: 'team-5', name: 'Sesi-SP', shortName: 'SES', modality: 'indoor', coachName: 'Rubinho Guimarães' },
  { id: 'team-6', name: 'Sada Cruzeiro', shortName: 'SAD', modality: 'indoor', coachName: 'Filipe Ferraz' },
  { id: 'team-7', name: 'Curitiba Vôlei', shortName: 'CUR', modality: 'indoor', coachName: 'Paulo Barreto' },
  { id: 'team-8', name: 'Barueri', shortName: 'BAR', modality: 'indoor', coachName: 'Wagão' },
];

export const seedReferees: RefereeRecord[] = [
  { id: 'ref-1', name: 'Carlos Silva', level: 'Nacional' },
  { id: 'ref-2', name: 'Ana Santos', level: 'Internacional' },
  { id: 'ref-3', name: 'Pedro Oliveira', level: 'Nacional' },
  { id: 'ref-4', name: 'Maria Costa', level: 'Estadual' },
];

function makeCompetitionTeam(
  id: string,
  competitionId: string,
  teamId: string,
  deadlineDelta: number,
  status: CompetitionTeam['status'],
  locked = false,
): CompetitionTeam {
  const team = seedTeams.find(t => t.id === teamId)!;
  return {
    id,
    competitionId,
    teamId,
    teamName: team.name,
    teamShortName: team.shortName,
    accessToken: `${competitionId}-${team.shortName.toLowerCase()}-${id}`.replace(/[^a-z0-9-]/g, ''),
    registrationDeadline: iso(deadlineDelta),
    isLocked: locked,
    status,
    createdAt: iso(-3 * DAY),
    updatedAt: iso(-3 * DAY),
  };
}

export const seedCompetitionTeams: CompetitionTeam[] = [
  // Masculino (comp-1): OSA com prazo vencido (exemplo de bloqueio), MIN em preenchimento,
  // PRA e FLA apenas convidadas.
  makeCompetitionTeam('ct-1', 'comp-1', 'team-1', -1 * DAY, 'submitted', true),
  makeCompetitionTeam('ct-2', 'comp-1', 'team-2', 6 * DAY, 'in_progress'),
  makeCompetitionTeam('ct-3', 'comp-1', 'team-3', 6 * DAY, 'invited'),
  makeCompetitionTeam('ct-4', 'comp-1', 'team-4', 6 * DAY, 'invited'),
  // Misto (comp-2): todas convidadas
  makeCompetitionTeam('ct-5', 'comp-2', 'team-5', 5 * DAY, 'invited'),
  makeCompetitionTeam('ct-6', 'comp-2', 'team-6', 5 * DAY, 'invited'),
  makeCompetitionTeam('ct-7', 'comp-2', 'team-7', 5 * DAY, 'invited'),
  makeCompetitionTeam('ct-8', 'comp-2', 'team-8', 5 * DAY, 'invited'),
];

const FEMALE_NAMES = ['Fernanda Silva', 'Amanda Costa', 'Juliana Santos', 'Patricia Lima', 'Carla Oliveira', 'Beatriz Mendes', 'Gabriela Guimarães', 'Natália Pereira', 'Rosamaria Montibeller', 'Carol Gattaz', 'Thaisa Menezes', 'Léia Silva', 'Ana Cristina Souza', 'Marina Souza', 'Letícia Hage', 'Kasiely Clemente'];

function makeAthlete(
  id: string,
  competitionTeamId: string,
  name: string,
  jerseyNumber: number,
  position: string,
  extra: Partial<CompetitionAthlete> = {},
): CompetitionAthlete {
  return {
    id,
    competitionTeamId,
    name,
    jerseyNumber,
    position,
    isCaptain: false,
    isLibero: false,
    gender: 'female',
    createdAt: iso(-2 * DAY),
    updatedAt: iso(-2 * DAY),
    ...extra,
  };
}

export const seedCompetitionAthletes: CompetitionAthlete[] = [
  // Elenco OSA (ct-1) - 12 atletas, 1 capitã e 1 líbero
  makeAthlete('ath-101', 'ct-1', FEMALE_NAMES[0], 1, 'Levantadora', { isCaptain: true }),
  makeAthlete('ath-102', 'ct-1', FEMALE_NAMES[1], 4, 'Ponteira'),
  makeAthlete('ath-103', 'ct-1', FEMALE_NAMES[2], 7, 'Oposta'),
  makeAthlete('ath-104', 'ct-1', FEMALE_NAMES[3], 10, 'Central'),
  makeAthlete('ath-105', 'ct-1', FEMALE_NAMES[4], 12, 'Ponteira'),
  makeAthlete('ath-106', 'ct-1', FEMALE_NAMES[5], 15, 'Líbero', { isLibero: true }),
  makeAthlete('ath-107', 'ct-1', FEMALE_NAMES[6], 2, 'Ponteira'),
  makeAthlete('ath-108', 'ct-1', FEMALE_NAMES[7], 5, 'Central'),
  makeAthlete('ath-109', 'ct-1', FEMALE_NAMES[8], 8, 'Oposta'),
  makeAthlete('ath-110', 'ct-1', FEMALE_NAMES[9], 11, 'Central'),
  makeAthlete('ath-111', 'ct-1', FEMALE_NAMES[10], 14, 'Levantadora'),
  makeAthlete('ath-112', 'ct-1', FEMALE_NAMES[11], 17, 'Ponteira'),
  // Elenco MIN (ct-2) - 9 atletas (em preenchimento)
  makeAthlete('ath-201', 'ct-2', FEMALE_NAMES[12], 3, 'Ponteira', { isCaptain: true }),
  makeAthlete('ath-202', 'ct-2', FEMALE_NAMES[13], 6, 'Central'),
  makeAthlete('ath-203', 'ct-2', FEMALE_NAMES[14], 9, 'Oposta'),
  makeAthlete('ath-204', 'ct-2', FEMALE_NAMES[15], 16, 'Líbero', { isLibero: true }),
  makeAthlete('ath-205', 'ct-2', FEMALE_NAMES[0], 18, 'Levantadora'),
  makeAthlete('ath-206', 'ct-2', FEMALE_NAMES[1], 19, 'Ponteira'),
  makeAthlete('ath-207', 'ct-2', FEMALE_NAMES[2], 20, 'Central'),
  makeAthlete('ath-208', 'ct-2', FEMALE_NAMES[3], 21, 'Ponteira'),
  makeAthlete('ath-209', 'ct-2', FEMALE_NAMES[4], 22, 'Levantadora'),
];

function makeSet(setNumber: number, scoreA: number, scoreB: number) {
  return { setNumber, scoreA, scoreB };
}

function makeMatch(
  id: string,
  competitionId: string,
  round: number,
  matchNumber: number,
  teamAId: string,
  teamBId: string,
  scheduledDelta: number,
  status: MatchRecord['status'],
  sets: MatchRecord['sets'],
): MatchRecord {
  const teamA = seedTeams.find(t => t.id === teamAId)!;
  const teamB = seedTeams.find(t => t.id === teamBId)!;
  const scoreA = sets.reduce((acc, s) => acc + (s.scoreA > s.scoreB ? 1 : 0), 0);
  const scoreB = sets.reduce((acc, s) => acc + (s.scoreB > s.scoreA ? 1 : 0), 0);
  return {
    id,
    competitionId,
    round,
    matchNumber,
    teamAId,
    teamBId,
    teamAName: teamA.name,
    teamBName: teamB.name,
    teamAShortName: teamA.shortName,
    teamBShortName: teamB.shortName,
    venue: 'Ginásio Municipal',
    court: 'Quadra Principal',
    scheduledTime: iso(scheduledDelta),
    status,
    sets,
    referees: [
      { role: '1º Árbitro', name: 'Carlos Silva' },
      { role: '2º Árbitro', name: 'Ana Santos' },
      { role: 'Apontador', name: 'Pedro Oliveira' },
    ],
    winnerId: scoreA > scoreB ? teamAId : scoreB > scoreA ? teamBId : undefined,
    createdAt: iso(-9 * DAY),
    updatedAt: iso(-9 * DAY),
  };
}

export const seedMatches: MatchRecord[] = [
  // 1º turno (todos completos, para classificação)
  makeMatch('match-1', 'comp-1', 1, 1, 'team-1', 'team-2', -8 * DAY, 'completed', [makeSet(1, 25, 22), makeSet(2, 23, 25), makeSet(3, 25, 18), makeSet(4, 25, 20)]),
  makeMatch('match-2', 'comp-1', 1, 2, 'team-3', 'team-4', -8 * DAY, 'completed', [makeSet(1, 22, 25), makeSet(2, 25, 21), makeSet(3, 25, 19), makeSet(4, 21, 25), makeSet(5, 15, 12)]),
  makeMatch('match-3', 'comp-1', 1, 3, 'team-1', 'team-3', -7 * DAY, 'completed', [makeSet(1, 25, 20), makeSet(2, 25, 17), makeSet(3, 25, 23)]),
  makeMatch('match-4', 'comp-1', 1, 4, 'team-2', 'team-4', -7 * DAY, 'completed', [makeSet(1, 25, 23), makeSet(2, 22, 25), makeSet(3, 20, 25), makeSet(4, 24, 26)]),
  makeMatch('match-5', 'comp-1', 1, 5, 'team-1', 'team-4', -6 * DAY, 'completed', [makeSet(1, 25, 21), makeSet(2, 25, 19), makeSet(3, 25, 22)]),
  makeMatch('match-6', 'comp-1', 1, 6, 'team-2', 'team-3', -6 * DAY, 'completed', [makeSet(1, 25, 21), makeSet(2, 20, 25), makeSet(3, 25, 19), makeSet(4, 25, 23)]),
  // 2º turno: agendada (exemplo para a súmula digital com atletas reais)
  makeMatch('match-7', 'comp-1', 2, 7, 'team-1', 'team-2', 2 * DAY, 'scheduled', []),
];
