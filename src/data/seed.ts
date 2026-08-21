// Dados de demonstração (seed) do VolleyPro.
// Datas de prazo são relativas a Date.now() para a demo sempre funcionar.

import type { CompetitionRecord, MatchRecord, RefereeRecord, TeamRecord, VenueRecord } from '@/types/entities';
import type { CompetitionAthlete, CompetitionTeam } from '@/types/registration';
import type { DrawRecord } from '@/types/draw';

export const SEED_VERSION = 'voleipro.v2';

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

export const seedVenues: VenueRecord[] = [
  {
    id: 'venue-1',
    name: 'Ginásio UNIPAR',
    address: 'Rua da Integração, s/n - Toledo/PR',
    courts: ['Quadra 1', 'Quadra 2'],
    createdAt: iso(-10 * DAY),
    updatedAt: iso(-10 * DAY),
  },
  {
    id: 'venue-2',
    name: 'Ginásio Municipal',
    address: 'Centro Esportivo, Toledo/PR',
    courts: ['Quadra Principal', 'Quadra Auxiliar'],
    createdAt: iso(-10 * DAY),
    updatedAt: iso(-10 * DAY),
  },
  {
    id: 'venue-3',
    name: 'Arena de Praia',
    address: 'Orla do Lago, Toledo/PR',
    courts: ['Areia 1', 'Areia 2'],
    createdAt: iso(-10 * DAY),
    updatedAt: iso(-10 * DAY),
  },
];

// Competição única: 8 equipes em 2 grupos de 4, sem partidas/horários
// (o organizador cria os confrontos e horários após o sorteio).
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
  { id: 'team-1', name: 'Osasco Voleibol', shortName: 'OSA', modality: 'indoor', coachName: 'Luizomar de Moura', logoUrl: teamLogo('OSA', '#1a5aa8') },
  { id: 'team-2', name: 'Minas Tênis Clube', shortName: 'MIN', modality: 'indoor', coachName: 'Nicola Negro', logoUrl: teamLogo('MIN', '#7a1f2b') },
  { id: 'team-3', name: 'Praia Clube', shortName: 'PRA', modality: 'indoor', coachName: 'Paulo Coco', logoUrl: teamLogo('PRA', '#c8102e') },
  { id: 'team-4', name: 'Flamengo', shortName: 'FLA', modality: 'indoor', coachName: 'Bernardinho', logoUrl: teamLogo('FLA', '#8b1f2c') },
  { id: 'team-5', name: 'Sesi-SP', shortName: 'SES', modality: 'indoor', coachName: 'Rubinho Guimarães', logoUrl: teamLogo('SES', '#e5383b') },
  { id: 'team-6', name: 'Sada Cruzeiro', shortName: 'SAD', modality: 'indoor', coachName: 'Filipe Ferraz', logoUrl: teamLogo('SAD', '#0066b3') },
  { id: 'team-7', name: 'Curitiba Vôlei', shortName: 'CUR', modality: 'indoor', coachName: 'Paulo Barreto', logoUrl: teamLogo('CUR', '#2d7d46') },
  { id: 'team-8', name: 'Barueri', shortName: 'BAR', modality: 'indoor', coachName: 'Wagão', logoUrl: teamLogo('BAR', '#f7a600', '#333333') },
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

const MALE_NAMES = ['Lucas Silva', 'Gabriel Santos', 'Rafael Oliveira', 'Matheus Costa', 'João Pedro Alves', 'Thiago Almeida', 'Bruno Rodrigues', 'Felipe Cardoso', 'André Pereira', 'Diego Martins', 'Vitor Hugo', 'Caio Rocha', 'Rodrigo Nunes', 'Paulo Henrique', 'Marcos Vinícius', 'Eduardo Lima', 'Gustavo Moraes', 'Igor Freitas', 'Leonardo Barbosa', 'Renan Ribeiro', 'Fábio Teixeira', 'Daniel Souza', 'Hugo Carvalho', 'Alex Barreto'];

const ROSTER_POSITIONS = ['Levantador', 'Ponteira', 'Central', 'Oposta', 'Ponteira', 'Líbero', 'Ponteira', 'Central', 'Oposta', 'Levantador', 'Central', 'Ponteira'];

function docNumber(seedValue: number): string {
  const digits = String(10000000000 + seedValue * 137).padStart(11, '0');
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/** Gera um elenco completo (12 atletas, 1 capitão e 1 líbero) com camisas 1-12 únicas na equipe. */
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
      isLibero: i === 5,
      gender,
      documentNumber: docNumber(offset * 12 + i + 100),
      createdAt: iso(-2 * DAY),
      updatedAt: iso(-2 * DAY),
    };
  });
}

export const seedCompetitionAthletes: CompetitionAthlete[] = [
  ...makeRoster('ath-1', 'ct-1', MALE_NAMES, 0, 'male'),
  ...makeRoster('ath-2', 'ct-2', MALE_NAMES, 4, 'male'),
  ...makeRoster('ath-3', 'ct-3', MALE_NAMES, 8, 'male'),
  ...makeRoster('ath-4', 'ct-4', MALE_NAMES, 12, 'male'),
  ...makeRoster('ath-5', 'ct-5', MALE_NAMES, 16, 'male'),
  ...makeRoster('ath-6', 'ct-6', MALE_NAMES, 20, 'male'),
  ...makeRoster('ath-7', 'ct-7', MALE_NAMES, 2, 'male'),
  ...makeRoster('ath-8', 'ct-8', MALE_NAMES, 6, 'male'),
];

// Sem partidas pré-criadas: o organizador gera os confrontos (Sorteio) e
// define horários depois. As chaves já ficam definidas (2 grupos de 4).
export const seedMatches: MatchRecord[] = [];

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
    matches: [],
    createdAt: iso(-1 * DAY),
    updatedAt: iso(-1 * DAY),
  },
];