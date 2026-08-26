// Dados de demonstração (seed) do VolleyPro.
// Datas de prazo são relativas a Date.now() para a demo sempre funcionar.

import type { CompetitionRecord, MatchRecord, ModalityRecord, PersonRecord, RefereeRecord, TeamRecord, VenueRecord } from '@/types/entities';
import type { CompetitionAthlete, CompetitionTeam } from '@/types/registration';
import type { DrawRecord } from '@/types/draw';

export const SEED_VERSION = 'voleipro.v8_full_scoresheet_simulation';

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

function iso(deltaMs: number): string {
  return new Date(Date.now() + deltaMs).toISOString();
}

/** Gera um escudo em SVG (data URI) com a sigla da equipe. */
function teamLogo(shortName: string, bg: string, fg = '#ffffff'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><circle cx="60" cy="60" r="56" fill="${bg}"/><circle cx="60" cy="60" r="50" fill="none" stroke="${fg}" stroke-width="3" stroke-dasharray="6 4"/><text x="60" y="74" font-family="Arial, sans-serif" font-size="34" font-weight="bold" fill="${fg}" text-anchor="middle">${shortName}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const seedModalities: ModalityRecord[] = [
  {
    id: 'mod-indoor',
    name: 'Vôlei de Quadra',
    type: 'indoor',
    defaultPlayerFormat: '6x6',
    defaultSetFormat: '3-sets',
    defaultSetPoints: 25,
    defaultTiebreakPoints: 15,
    description: 'Voleibol de quadra oficial (6x6 ou 4x4) regulamento FIVB/CBV.',
  },
  {
    id: 'mod-beach',
    name: 'Vôlei de Praia',
    type: 'beach',
    defaultPlayerFormat: '2x2',
    defaultSetFormat: '3-sets',
    defaultSetPoints: 21,
    defaultTiebreakPoints: 15,
    description: 'Vôlei de praia em duplas (2x2) ou quartetos (4x4) regulamento FIVB.',
  },
];

export const seedVenues: VenueRecord[] = [
  {
    id: 'venue-1',
    name: 'Ginásio UNIPAR',
    address: 'Rua da Integração, s/n - Toledo/PR',
    responsible: 'Coordenação Esportiva UNIPAR',
    courts: ['Quadra 1', 'Quadra 2'],
    courtDetails: [
      { id: 'c1', name: 'Quadra 1', status: 'active', notes: 'Piso de madeira flutuante' },
      { id: 'c2', name: 'Quadra 2', status: 'active', notes: 'Piso vinílico' },
    ],
    createdAt: iso(-10 * DAY),
    updatedAt: iso(-10 * DAY),
  },
  {
    id: 'venue-2',
    name: 'Ginásio Municipal',
    address: 'Centro Esportivo, Toledo/PR',
    responsible: 'Secretaria de Esportes',
    courts: ['Quadra Principal', 'Quadra Auxiliar'],
    courtDetails: [
      { id: 'c3', name: 'Quadra Principal', status: 'active', notes: 'Capacidade 2000 pessoas' },
      { id: 'c4', name: 'Quadra Auxiliar', status: 'active', notes: 'Aquecimento e jogos paralelos' },
    ],
    createdAt: iso(-10 * DAY),
    updatedAt: iso(-10 * DAY),
  },
  {
    id: 'venue-3',
    name: 'Arena de Praia',
    address: 'Orla do Lago, Toledo/PR',
    responsible: 'Clube de Praia Toledo',
    courts: ['Areia 1', 'Areia 2'],
    courtDetails: [
      { id: 'c5', name: 'Areia 1', status: 'active', notes: 'Quadra central de areia' },
      { id: 'c6', name: 'Areia 2', status: 'active', notes: 'Quadra secundária' },
    ],
    createdAt: iso(-10 * DAY),
    updatedAt: iso(-10 * DAY),
  },
];

export const seedCompetitions: CompetitionRecord[] = [
  {
    id: 'comp-toledo-2026',
    name: 'Copa Toledo 2026 - Masculino',
    modality: 'indoor',
    format: 'round-robin',
    playerFormat: '6x6',
    setFormat: '3-sets',
    genderCategory: 'male',
    startDate: iso(3 * DAY).slice(0, 10),
    endDate: iso(24 * DAY).slice(0, 10),
    venue: 'Ginásio Municipal',
    status: 'in-progress',
  },
];

export const seedTeams: TeamRecord[] = [
  {
    id: 'team-1',
    name: 'Osasco Voleibol',
    shortName: 'OSA',
    modality: 'indoor',
    coachName: 'Luizomar de Moura',
    assistantCoach: 'Jefferson Arosti',
    physicalTrainer: 'Marcelo Zangalo',
    doctor: 'Dr. Fernando Moretti',
    managerName: 'Diego Martins',
    managerPhone: '(45) 99999-1111',
    managerEmail: 'diego@voleipro.com',
    managerPassword: 'OSA@2026',
    registrationToken: 'token-osa-2026',
    logoUrl: teamLogo('OSA', '#1a5aa8'),
  },
  {
    id: 'team-2',
    name: 'Minas Tênis Clube',
    shortName: 'MIN',
    modality: 'indoor',
    coachName: 'Nicola Negro',
    assistantCoach: 'Rodrigo Fuentealba',
    physicalTrainer: 'Alexandre Marinho',
    doctor: 'Dra. Camila Santos',
    managerName: 'Roberto Silva',
    managerPhone: '(31) 98888-2222',
    managerEmail: 'minas@volei.com',
    managerPassword: 'MIN@2026',
    registrationToken: 'token-min-2026',
    logoUrl: teamLogo('MIN', '#7a1f2b'),
  },
  {
    id: 'team-3',
    name: 'Praia Clube',
    shortName: 'PRA',
    modality: 'indoor',
    coachName: 'Paulo Coco',
    assistantCoach: 'Gabriel Leite',
    physicalTrainer: 'Fabio Silva',
    doctor: 'Dr. Gustavo Rocha',
    logoUrl: teamLogo('PRA', '#c8102e'),
  },
  {
    id: 'team-4',
    name: 'Flamengo',
    shortName: 'FLA',
    modality: 'indoor',
    coachName: 'Bernardinho',
    assistantCoach: 'Kadu Ribas',
    physicalTrainer: 'Guilherme Tenius',
    doctor: 'Dr. Claudio Cardone',
    logoUrl: teamLogo('FLA', '#8b1f2c'),
  },
  {
    id: 'team-5',
    name: 'Sesi-SP',
    shortName: 'SES',
    modality: 'indoor',
    coachName: 'Rubinho Guimarães',
    assistantCoach: 'Rodolfo Lino',
    physicalTrainer: 'Carlos Caires',
    doctor: 'Dr. Sergio Xavier',
    logoUrl: teamLogo('SES', '#e5383b'),
  },
  {
    id: 'team-6',
    name: 'Sada Cruzeiro',
    shortName: 'SAD',
    modality: 'indoor',
    coachName: 'Filipe Ferraz',
    assistantCoach: 'Beto Martelete',
    physicalTrainer: 'Fabio Correia',
    doctor: 'Dr. Daniel Carvalho',
    logoUrl: teamLogo('SAD', '#0066b3'),
  },
  {
    id: 'team-7',
    name: 'Curitiba Vôlei',
    shortName: 'CUR',
    modality: 'indoor',
    coachName: 'Paulo Barreto',
    assistantCoach: 'Luiz Henrique',
    physicalTrainer: 'Roberto Nery',
    doctor: 'Dra. Beatriz Mendes',
    logoUrl: teamLogo('CUR', '#2d7d46'),
  },
  {
    id: 'team-8',
    name: 'Barueri',
    shortName: 'BAR',
    modality: 'indoor',
    coachName: 'Wagão',
    assistantCoach: 'Junior Alexandre',
    physicalTrainer: 'Eduardo Fernandes',
    doctor: 'Dr. Alexandre Lins',
    logoUrl: teamLogo('BAR', '#f7a600', '#333333'),
  },
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
  makeCompetitionTeam('ct-1', 'comp-toledo-2026', 'team-1', 6 * DAY, 'submitted'),
  makeCompetitionTeam('ct-2', 'comp-toledo-2026', 'team-2', 6 * DAY, 'submitted'),
  makeCompetitionTeam('ct-3', 'comp-toledo-2026', 'team-3', 6 * DAY, 'submitted'),
  makeCompetitionTeam('ct-4', 'comp-toledo-2026', 'team-4', 6 * DAY, 'submitted'),
  makeCompetitionTeam('ct-5', 'comp-toledo-2026', 'team-5', 6 * DAY, 'submitted'),
  makeCompetitionTeam('ct-6', 'comp-toledo-2026', 'team-6', 6 * DAY, 'submitted'),
  makeCompetitionTeam('ct-7', 'comp-toledo-2026', 'team-7', 6 * DAY, 'submitted'),
  makeCompetitionTeam('ct-8', 'comp-toledo-2026', 'team-8', 6 * DAY, 'submitted'),
];

const MALE_NAMES = [
  'Lucas Silva', 'Gabriel Santos', 'Rafael Oliveira', 'Matheus Costa', 'João Pedro Alves',
  'Thiago Almeida', 'Bruno Rodrigues', 'Felipe Cardoso', 'André Pereira', 'Diego Martins',
  'Vitor Hugo', 'Caio Rocha', 'Rodrigo Nunes', 'Paulo Henrique', 'Marcos Vinícius',
  'Eduardo Lima', 'Gustavo Moraes', 'Igor Freitas', 'Leonardo Barbosa', 'Renan Ribeiro',
  'Fábio Teixeira', 'Daniel Souza', 'Hugo Carvalho', 'Alex Barreto', 'Murilo Endres',
  'Wallace Souza', 'Lucão Santos', 'Ricardo Lucarelli', 'Alan Souza', 'Douglas Souza',
  'Yoandy Leal', 'Thales Hoss', 'Maique Nascimento', 'Fernando Cachopa', 'Bruninho Rezende',
  'Isac Santos', 'Flávio Gualberto', 'Otávio Pinto', 'Honorato', 'Adriano Cavalcante',
  'Felipe Roque', 'Darlan Souza', 'Abouba Dramé', 'Judson Amabel', 'Matheus Brasília',
  'Alexandre Elias', 'Lucas Saatkamp', 'Maurício Souza', 'Evandro Guerra', 'Éder Carbonera',
  'Leandro Vissotto', 'Giba Godoy', 'Dante Amaral', 'Gustavo Endres', 'Rodrigão Santana',
  'Serginho Escadinha', 'Nalbert Betancourt', 'Giovane Gávio', 'Marcelo Negrão', 'Tande Britto'
];

const ROSTER_POSITIONS = [
  'Levantador',
  'Ponteiro',
  'Central',
  'Oposto',
  'Ponteiro',
  'Líbero',
  'Levantador',
  'Central',
  'Ponteiro',
  'Oposto',
  'Central',
  'Líbero',
];

function docNumber(seedValue: number): string {
  const digits = String(10000000000 + seedValue * 137).padStart(11, '0');
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/** Gera um elenco completo (12 atletas: 10 regulares + 2 líberos, 1 capitão) com camisas 1-12 únicas na equipe. */
function makeRoster(
  idPrefix: string,
  competitionTeamId: string,
  namePool: string[],
  offset: number,
  gender: CompetitionAthlete['gender'],
): CompetitionAthlete[] {
  return ROSTER_POSITIONS.map((position, i) => {
    const name = namePool[(offset + i) % namePool.length];
    return {
      id: `${idPrefix}-${String(i + 1).padStart(2, '0')}`,
      competitionTeamId,
      name,
      jerseyNumber: i + 1,
      position,
      isCaptain: i === 0,
      isLibero: i === 5 || i === 11,
      gender,
      documentNumber: docNumber(offset * 12 + i + 100),
      createdAt: iso(-2 * DAY),
      updatedAt: iso(-2 * DAY),
    };
  });
}

export const seedCompetitionAthletes: CompetitionAthlete[] = [
  ...makeRoster('ath-1', 'ct-1', MALE_NAMES, 0, 'male'),
  ...makeRoster('ath-2', 'ct-2', MALE_NAMES, 6, 'male'),
  ...makeRoster('ath-3', 'ct-3', MALE_NAMES, 12, 'male'),
  ...makeRoster('ath-4', 'ct-4', MALE_NAMES, 18, 'male'),
  ...makeRoster('ath-5', 'ct-5', MALE_NAMES, 24, 'male'),
  ...makeRoster('ath-6', 'ct-6', MALE_NAMES, 30, 'male'),
  ...makeRoster('ath-7', 'ct-7', MALE_NAMES, 36, 'male'),
  ...makeRoster('ath-8', 'ct-8', MALE_NAMES, 42, 'male'),
];

function makeMatch(
  id: string,
  matchNumber: number,
  round: number,
  groupName: string,
  teamAId: string,
  teamBId: string,
  athPrefixA: string,
  athPrefixB: string,
  dateDeltaHours: number,
  court: string,
): MatchRecord {
  const teamA = seedTeams.find(t => t.id === teamAId)!;
  const teamB = seedTeams.find(t => t.id === teamBId)!;
  return {
    id,
    competitionId: 'comp-toledo-2026',
    round,
    matchNumber,
    teamAId,
    teamBId,
    teamAName: teamA.name,
    teamBName: teamB.name,
    teamAShortName: teamA.shortName,
    teamBShortName: teamB.shortName,
    venue: 'Ginásio Municipal',
    court,
    phase: 'Fase de Grupos',
    groupName,
    scheduledTime: iso(dateDeltaHours * HOUR),
    status: 'scheduled',
    sets: [],
    referees: [
      { role: 'first', name: 'Carlos Silva' },
      { role: 'second', name: 'Ana Santos' },
    ],
    lineups: {
      teamA: {
        starterIds: [
          `${athPrefixA}-01`,
          `${athPrefixA}-02`,
          `${athPrefixA}-03`,
          `${athPrefixA}-04`,
          `${athPrefixA}-05`,
          `${athPrefixA}-06`,
        ],
        captainId: `${athPrefixA}-01`,
        liberoId: `${athPrefixA}-06`,
      },
      teamB: {
        starterIds: [
          `${athPrefixB}-01`,
          `${athPrefixB}-02`,
          `${athPrefixB}-03`,
          `${athPrefixB}-04`,
          `${athPrefixB}-05`,
          `${athPrefixB}-06`,
        ],
        captainId: `${athPrefixB}-01`,
        liberoId: `${athPrefixB}-06`,
      },
    },
    customSetFormat: '3-sets',
    createdAt: iso(-1 * DAY),
    updatedAt: iso(-1 * DAY),
  };
}

export const seedMatches: MatchRecord[] = [
  // --- GRUPO A ---
  // Rodada 1
  makeMatch('match-01', 1, 1, 'Grupo A', 'team-1', 'team-2', 'ath-1', 'ath-2', 24, 'Quadra Principal'),
  makeMatch('match-02', 2, 1, 'Grupo A', 'team-3', 'team-4', 'ath-3', 'ath-4', 24, 'Quadra Auxiliar'),
  // Rodada 2
  makeMatch('match-03', 3, 2, 'Grupo A', 'team-1', 'team-3', 'ath-1', 'ath-3', 26, 'Quadra Principal'),
  makeMatch('match-04', 4, 2, 'Grupo A', 'team-2', 'team-4', 'ath-2', 'ath-4', 26, 'Quadra Auxiliar'),
  // Rodada 3
  makeMatch('match-05', 5, 3, 'Grupo A', 'team-4', 'team-1', 'ath-4', 'ath-1', 29, 'Quadra Principal'),
  makeMatch('match-06', 6, 3, 'Grupo A', 'team-2', 'team-3', 'ath-2', 'ath-3', 29, 'Quadra Auxiliar'),

  // --- GRUPO B ---
  // Rodada 1
  makeMatch('match-07', 7, 1, 'Grupo B', 'team-5', 'team-6', 'ath-5', 'ath-6', 25, 'Quadra Principal'),
  makeMatch('match-08', 8, 1, 'Grupo B', 'team-7', 'team-8', 'ath-7', 'ath-8', 25, 'Quadra Auxiliar'),
  // Rodada 2
  makeMatch('match-09', 9, 2, 'Grupo B', 'team-5', 'team-7', 'ath-5', 'ath-7', 27, 'Quadra Principal'),
  makeMatch('match-10', 10, 2, 'Grupo B', 'team-6', 'team-8', 'ath-6', 'ath-8', 27, 'Quadra Auxiliar'),
  // Rodada 3
  makeMatch('match-11', 11, 3, 'Grupo B', 'team-8', 'team-5', 'ath-8', 'ath-5', 30, 'Quadra Principal'),
  makeMatch('match-12', 12, 3, 'Grupo B', 'team-6', 'team-7', 'ath-6', 'ath-7', 30, 'Quadra Auxiliar'),
];

export const seedDraws: DrawRecord[] = [
  {
    id: 'draw-1',
    competitionId: 'comp-toledo-2026',
    config: { groupsCount: 2, seedingMode: 'seeded', seed: 2026, headSeeds: ['team-1', 'team-5'] },
    groups: [
      {
        name: 'Grupo A',
        teams: [
          { teamId: 'team-1', seed: 1 },
          { teamId: 'team-2', seed: 2 },
          { teamId: 'team-3', seed: 3 },
          { teamId: 'team-4', seed: 4 },
        ],
      },
      {
        name: 'Grupo B',
        teams: [
          { teamId: 'team-5', seed: 1 },
          { teamId: 'team-6', seed: 2 },
          { teamId: 'team-7', seed: 3 },
          { teamId: 'team-8', seed: 4 },
        ],
      },
    ],
    matches: [
      { round: 1, matchNumber: 1, teamAId: 'team-1', teamBId: 'team-2', groupName: 'Grupo A', phase: 'groups' },
      { round: 1, matchNumber: 2, teamAId: 'team-3', teamBId: 'team-4', groupName: 'Grupo A', phase: 'groups' },
      { round: 2, matchNumber: 3, teamAId: 'team-1', teamBId: 'team-3', groupName: 'Grupo A', phase: 'groups' },
      { round: 2, matchNumber: 4, teamAId: 'team-2', teamBId: 'team-4', groupName: 'Grupo A', phase: 'groups' },
      { round: 3, matchNumber: 5, teamAId: 'team-4', teamBId: 'team-1', groupName: 'Grupo A', phase: 'groups' },
      { round: 3, matchNumber: 6, teamAId: 'team-2', teamBId: 'team-3', groupName: 'Grupo A', phase: 'groups' },
      { round: 1, matchNumber: 7, teamAId: 'team-5', teamBId: 'team-6', groupName: 'Grupo B', phase: 'groups' },
      { round: 1, matchNumber: 8, teamAId: 'team-7', teamBId: 'team-8', groupName: 'Grupo B', phase: 'groups' },
      { round: 2, matchNumber: 9, teamAId: 'team-5', teamBId: 'team-7', groupName: 'Grupo B', phase: 'groups' },
      { round: 2, matchNumber: 10, teamAId: 'team-6', teamBId: 'team-8', groupName: 'Grupo B', phase: 'groups' },
      { round: 3, matchNumber: 11, teamAId: 'team-8', teamBId: 'team-5', groupName: 'Grupo B', phase: 'groups' },
      { round: 3, matchNumber: 12, teamAId: 'team-6', teamBId: 'team-7', groupName: 'Grupo B', phase: 'groups' },
    ],
    createdAt: iso(-1 * DAY),
    updatedAt: iso(-1 * DAY),
  },
];

export const seedPersons: PersonRecord[] = [
  {
    id: 'per-1',
    fullName: 'Diego Martins',
    nickname: 'Diego',
    documentId: '123.456.789-00',
    roles: ['manager', 'athlete'],
    teamIds: ['team-1'],
    email: 'diego@voleipro.com',
    phone: '(45) 99999-1111',
    createdAt: iso(-30 * DAY),
    updatedAt: iso(-30 * DAY),
  },
  {
    id: 'per-2',
    fullName: 'Luizomar de Moura',
    nickname: 'Luizomar',
    roles: ['coach'],
    teamIds: ['team-1'],
    email: 'luizomar@osasco.com',
    phone: '(11) 98888-2222',
    createdAt: iso(-30 * DAY),
    updatedAt: iso(-30 * DAY),
  },
  {
    id: 'per-3',
    fullName: 'Carlos Silva',
    nickname: 'Carlos Árbitro',
    roles: ['referee'],
    email: 'carlos.arbitro@cbv.com',
    createdAt: iso(-30 * DAY),
    updatedAt: iso(-30 * DAY),
  },
];