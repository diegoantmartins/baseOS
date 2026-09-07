// Dados de demonstração (seed) do VolleyPro.
// Datas de prazo são relativas a Date.now() para a demo sempre funcionar.

import type { CompetitionRecord, MatchRecord, ModalityRecord, PersonRecord, RefereeRecord, TeamRecord, VenueRecord } from '@/types/entities';
import type { CompetitionAthlete, CompetitionTeam } from '@/types/registration';
import type { DrawRecord } from '@/types/draw';

export const SEED_VERSION = 'voleipro.v14_exclusive_two_competitions_2026';

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
    defaultSetFormat: '5-sets',
    defaultSetPoints: 25,
    defaultTiebreakPoints: 15,
    description: 'Voleibol de quadra oficial (6x6) regulamento FIVB/CBV.',
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
    name: 'Ginásio Poliesportivo Central',
    address: 'Av. das Nações Unidas, 1500 - Centro Esportivo',
    responsible: 'Coordenação de Eventos Esportivos',
    courts: ['Quadra Principal', 'Quadra Auxiliar'],
    courtDetails: [
      { id: 'c1', name: 'Quadra Principal', status: 'active', notes: 'Piso flutuante de madeira maciça, placar eletrônico central' },
      { id: 'c2', name: 'Quadra Auxiliar', status: 'active', notes: 'Piso vinílico Taraflex homologado CBV' },
    ],
    createdAt: iso(-30 * DAY),
    updatedAt: iso(-10 * DAY),
  },
  {
    id: 'venue-2',
    name: 'Arena Multiuso Olímpica',
    address: 'Parque Olímpico da Juventude, Bloco B',
    responsible: 'Secretaria de Esporte e Lazer',
    courts: ['Quadra Central', 'Quadra de Aquecimento'],
    courtDetails: [
      { id: 'c3', name: 'Quadra Central', status: 'active', notes: 'Capacidade para 3.500 espectadores, cabine de transmissão' },
      { id: 'c4', name: 'Quadra de Aquecimento', status: 'active', notes: 'Área reservada para pré-jogo das equipes' },
    ],
    createdAt: iso(-30 * DAY),
    updatedAt: iso(-10 * DAY),
  },
];

export const seedCompetitions: CompetitionRecord[] = [
  {
    id: 'comp-masculino-2026',
    name: 'Liga Nacional Pro 2026 - Masculino',
    slug: 'liga-nacional-pro-masculino-2026',
    modality: 'indoor',
    format: 'round-robin',
    playerFormat: '6x6',
    setFormat: '5-sets',
    genderCategory: 'male',
    startDate: iso(-7 * DAY).slice(0, 10),
    endDate: iso(7 * DAY).slice(0, 10),
    venue: 'Ginásio Poliesportivo Central',
    status: 'in-progress',
  },
  {
    id: 'comp-feminino-2026',
    name: 'Liga Nacional Pro 2026 - Feminino',
    slug: 'liga-nacional-pro-feminino-2026',
    modality: 'indoor',
    format: 'round-robin',
    playerFormat: '6x6',
    setFormat: '5-sets',
    genderCategory: 'female',
    startDate: iso(-7 * DAY).slice(0, 10),
    endDate: iso(7 * DAY).slice(0, 10),
    venue: 'Arena Multiuso Olímpica',
    status: 'in-progress',
  },
];

export const seedTeams: TeamRecord[] = [
  // ── EQUIPES MASCULINAS INÉDITAS (LIGA NACIONAL PRO MASCULINO) ──
  {
    id: 'team-m-1',
    name: 'Vortex Vôlei Clube',
    shortName: 'VVC',
    modality: 'indoor',
    coachName: 'Ricardo Valente',
    assistantCoach: 'Marcio Fontes',
    physicalTrainer: 'Bruno Medeiros',
    doctor: 'Dr. Fernando Moretti',
    managerName: 'Diego Martins',
    managerPhone: '(11) 98765-4321',
    managerEmail: 'contato@vortexvolei.com',
    logoUrl: teamLogo('VVC', '#0284c7'),
  },
  {
    id: 'team-m-2',
    name: 'Titanium Voleibol',
    shortName: 'TIT',
    modality: 'indoor',
    coachName: 'Marcos Silveira',
    assistantCoach: 'André Nogueira',
    physicalTrainer: 'Lucas Rezende',
    doctor: 'Dr. Roberto Lins',
    managerName: 'Carlos Titanium',
    managerPhone: '(21) 97654-3210',
    managerEmail: 'diretoria@titaniumvolei.com',
    logoUrl: teamLogo('TIT', '#ea580c'),
  },
  {
    id: 'team-m-3',
    name: 'Fênix Vôlei Brasil',
    shortName: 'FNX',
    modality: 'indoor',
    coachName: 'Alexandre Prado',
    assistantCoach: 'Gustavo Paiva',
    physicalTrainer: 'Rafael Duarte',
    doctor: 'Dr. Sergio Xavier',
    logoUrl: teamLogo('FNX', '#dc2626'),
  },
  {
    id: 'team-m-4',
    name: 'Águias do Planalto',
    shortName: 'AGP',
    modality: 'indoor',
    coachName: 'Eduardo Fontes',
    assistantCoach: 'Felipe Barreto',
    physicalTrainer: 'Rodrigo Salles',
    doctor: 'Dr. Claudio Cardone',
    logoUrl: teamLogo('AGP', '#16a34a'),
  },
  {
    id: 'team-m-5',
    name: 'Aurora Esporte Clube',
    shortName: 'AEC',
    modality: 'indoor',
    coachName: 'Sérgio Ramos',
    assistantCoach: 'Leandro Vilela',
    physicalTrainer: 'Tiago Drummond',
    doctor: 'Dr. Daniel Carvalho',
    logoUrl: teamLogo('AEC', '#7c3aed'),
  },
  {
    id: 'team-m-6',
    name: 'Guarani Voleibol',
    shortName: 'GVC',
    modality: 'indoor',
    coachName: 'Fabiano Toledo',
    assistantCoach: 'Marcelo Pires',
    physicalTrainer: 'Danilo Alcantara',
    doctor: 'Dr. Alexandre Lins',
    logoUrl: teamLogo('GVC', '#059669'),
  },
  {
    id: 'team-m-7',
    name: 'Siderúrgica Vôlei',
    shortName: 'SID',
    modality: 'indoor',
    coachName: 'Leandro Castro',
    assistantCoach: 'Valmir Santos',
    physicalTrainer: 'Emerson Rocha',
    doctor: 'Dr. Paulo Nery',
    logoUrl: teamLogo('SID', '#475569'),
  },
  {
    id: 'team-m-8',
    name: 'Trovão da Serra',
    shortName: 'TSV',
    modality: 'indoor',
    coachName: 'André Medina',
    assistantCoach: 'Cássio Brito',
    physicalTrainer: 'Matheus Antunes',
    doctor: 'Dr. Gilberto Ramos',
    logoUrl: teamLogo('TSV', '#2563eb'),
  },

  // ── EQUIPES FEMININAS INÉDITAS (LIGA NACIONAL PRO FEMININO) ──
  {
    id: 'team-f-1',
    name: 'Estrela do Sul Voleibol',
    shortName: 'EDS',
    modality: 'indoor',
    coachName: 'Renata Zanetti',
    assistantCoach: 'Carla Silveira',
    physicalTrainer: 'Fernanda Lemos',
    doctor: 'Dra. Camila Santos',
    managerName: 'Mariana Duarte',
    managerPhone: '(41) 99123-4567',
    managerEmail: 'diretoria@estreladosul.com.br',
    logoUrl: teamLogo('EDS', '#db2777'),
  },
  {
    id: 'team-f-2',
    name: 'Valkírias Vôlei Clube',
    shortName: 'VAL',
    modality: 'indoor',
    coachName: 'Camila Albuquerque',
    assistantCoach: 'Julio Miranda',
    physicalTrainer: 'Patrícia Prado',
    doctor: 'Dra. Beatriz Mendes',
    logoUrl: teamLogo('VAL', '#9333ea'),
  },
  {
    id: 'team-f-3',
    name: 'Serena Vôlei Clube',
    shortName: 'SRN',
    modality: 'indoor',
    coachName: 'Juliana Paes',
    assistantCoach: 'Helena Matos',
    physicalTrainer: 'Gisele Frota',
    doctor: 'Dra. Lucia Brandão',
    logoUrl: teamLogo('SRN', '#0d9488'),
  },
  {
    id: 'team-f-4',
    name: 'Magnólias Esporte Clube',
    shortName: 'MEC',
    modality: 'indoor',
    coachName: 'Fabiana Claudino',
    assistantCoach: 'Lauro Peixoto',
    physicalTrainer: 'Tatiana Rios',
    doctor: 'Dr. Flávio Rezende',
    logoUrl: teamLogo('MEC', '#c026d3'),
  },
  {
    id: 'team-f-5',
    name: 'Harmonia Vôlei Brasil',
    shortName: 'HVB',
    modality: 'indoor',
    coachName: 'Patrícia Meneghel',
    assistantCoach: 'Douglas Maia',
    physicalTrainer: 'Lorena Guimarães',
    doctor: 'Dra. Vanessa Costa',
    logoUrl: teamLogo('HVB', '#f97316'),
  },
  {
    id: 'team-f-6',
    name: 'Império das Quadras',
    shortName: 'IDQ',
    modality: 'indoor',
    coachName: 'Talita Antunes',
    assistantCoach: 'Vicente Cruz',
    physicalTrainer: 'Aline Moura',
    doctor: 'Dr. Henrique Barros',
    logoUrl: teamLogo('IDQ', '#1d4ed8'),
  },
  {
    id: 'team-f-7',
    name: 'Vanguarda Feminina Vôlei',
    shortName: 'VFV',
    modality: 'indoor',
    coachName: 'Bárbara Seixas',
    assistantCoach: 'Maurício Tavares',
    physicalTrainer: 'Débora Diniz',
    doctor: 'Dra. Sofia Alencar',
    logoUrl: teamLogo('VFV', '#65a30d'),
  },
  {
    id: 'team-f-8',
    name: 'Lótus Voleibol Clube',
    shortName: 'LVC',
    modality: 'indoor',
    coachName: 'Mariana Steinbrecher',
    assistantCoach: 'Estêvão Gomes',
    physicalTrainer: 'Clara Meireles',
    doctor: 'Dr. Rodrigo Pacheco',
    logoUrl: teamLogo('LVC', '#4f46e5'),
  },
];

export const seedReferees: RefereeRecord[] = [
  { id: 'ref-1', name: 'Carlos Alberto Silva', level: 'Internacional' },
  { id: 'ref-2', name: 'Ana Beatriz Santos', level: 'Internacional' },
  { id: 'ref-3', name: 'Pedro Henrique Oliveira', level: 'Nacional' },
  { id: 'ref-4', name: 'Maria Fernanda Costa', level: 'Nacional' },
  { id: 'ref-5', name: 'Luís Gustavo Nogueira', level: 'Estadual' },
  { id: 'ref-6', name: 'Juliana Cavalcanti', level: 'Nacional' },
];

function makeCompetitionTeam(
  id: string,
  competitionId: string,
  teamId: string,
  deadlineDelta: number,
  status: CompetitionTeam['status'] = 'approved',
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
    createdAt: iso(-8 * DAY),
    updatedAt: iso(-1 * DAY),
  };
}

export const seedCompetitionTeams: CompetitionTeam[] = [
  // LIGA NACIONAL PRO MASCULINO (8 Equipes)
  makeCompetitionTeam('ct-m-1', 'comp-masculino-2026', 'team-m-1', 10 * DAY, 'approved', false),
  makeCompetitionTeam('ct-m-2', 'comp-masculino-2026', 'team-m-2', 10 * DAY, 'approved', false),
  makeCompetitionTeam('ct-m-3', 'comp-masculino-2026', 'team-m-3', 10 * DAY, 'approved', false),
  makeCompetitionTeam('ct-m-4', 'comp-masculino-2026', 'team-m-4', 10 * DAY, 'approved', false),
  makeCompetitionTeam('ct-m-5', 'comp-masculino-2026', 'team-m-5', 10 * DAY, 'approved', false),
  makeCompetitionTeam('ct-m-6', 'comp-masculino-2026', 'team-m-6', 10 * DAY, 'approved', false),
  makeCompetitionTeam('ct-m-7', 'comp-masculino-2026', 'team-m-7', 10 * DAY, 'approved', false),
  makeCompetitionTeam('ct-m-8', 'comp-masculino-2026', 'team-m-8', 10 * DAY, 'approved', false),

  // LIGA NACIONAL PRO FEMININO (8 Equipes)
  makeCompetitionTeam('ct-f-1', 'comp-feminino-2026', 'team-f-1', 10 * DAY, 'approved', false),
  makeCompetitionTeam('ct-f-2', 'comp-feminino-2026', 'team-f-2', 10 * DAY, 'approved', false),
  makeCompetitionTeam('ct-f-3', 'comp-feminino-2026', 'team-f-3', 10 * DAY, 'approved', false),
  makeCompetitionTeam('ct-f-4', 'comp-feminino-2026', 'team-f-4', 10 * DAY, 'approved', false),
  makeCompetitionTeam('ct-f-5', 'comp-feminino-2026', 'team-f-5', 10 * DAY, 'approved', false),
  makeCompetitionTeam('ct-f-6', 'comp-feminino-2026', 'team-f-6', 10 * DAY, 'approved', false),
  makeCompetitionTeam('ct-f-7', 'comp-feminino-2026', 'team-f-7', 10 * DAY, 'approved', false),
  makeCompetitionTeam('ct-f-8', 'comp-feminino-2026', 'team-f-8', 10 * DAY, 'approved', false),
];

const MALE_NAMES = [
  'Lucas Silveira', 'Gabriel Santos', 'Rafael Oliveira', 'Matheus Costa', 'João Pedro Alves',
  'Thiago Almeida', 'Bruno Rodrigues', 'Felipe Cardoso', 'André Pereira', 'Diego Martins',
  'Vitor Hugo', 'Caio Rocha', 'Rodrigo Nunes', 'Paulo Henrique', 'Marcos Vinícius',
  'Eduardo Lima', 'Gustavo Moraes', 'Igor Freitas', 'Leonardo Barbosa', 'Renan Ribeiro',
  'Fábio Teixeira', 'Daniel Souza', 'Hugo Carvalho', 'Alex Barreto', 'Murilo Endres',
  'Wallace Souza', 'Lucas Valente', 'Ricardo Fontes', 'Alan Rezende', 'Douglas Silveira',
  'Fernando Salles', 'Thales Hoss', 'Maique Nascimento', 'Flávio Gualberto', 'Otávio Pinto',
  'Adriano Cavalcante', 'Darlan Souza', 'Abouba Dramé', 'Judson Amabel', 'Matheus Brasília',
  'Alexandre Elias', 'Lucas Saatkamp', 'Maurício Souza', 'Evandro Guerra', 'Éder Carbonera',
  'Leandro Vissotto', 'Arthur Nery', 'Bernardo Castro', 'Caio Drummond', 'Denis Alcantara',
  'Enzo Pacheco', 'Fabrício Rios', 'Guilherme Maia', 'Heitor Brandt', 'Italo Meireles',
  'Juliano Toledo', 'Kauê Brandão', 'Luan Moretti', 'Murilo Peixoto', 'Natan Silveira'
];

const FEMALE_NAMES = [
  'Gabriela Guimarães', 'Thaisa Menezes', 'Ana Cristina Souza', 'Rosamaria Montibeller', 'Macris Carneiro',
  'Nyeme Costa', 'Lorenne Teixeira', 'Priscila Daroit', 'Roberta Ratzke', 'Kisy Nascimento',
  'Julia Bergmann', 'Diana Alecrim', 'Lara Nobre', 'Natália Araújo', 'Tainara Santos',
  'Lorrayna Marys', 'Helena Wenk', 'Sabrina Groth', 'Luzia Neves', 'Jheovana Sebastião',
  'Bárbara Bruch', 'Camila Brait', 'Carol Gattaz', 'Dani Lins', 'Fabiana Oliveira',
  'Fernanda Garay', 'Jaqueline Carvalho', 'Sheilla Castro', 'Paula Pequeno', 'Walewska Oliveira',
  'Fofão Helia', 'Virna Dias', 'Leila Barros', 'Hilma Caldeira', 'Ana Moser',
  'Fernanda Venturini', 'Ida Álvares', 'Márcia Fu', 'Érika Coimbra', 'Sassá Welissa',
  'Fabíola de Souza', 'Tandara Caixeta', 'Adenízia Silva', 'Juciely Barreto', 'Natália Pereira',
  'Monique Pavão', 'Michelle Pavão', 'Drussyla Costa', 'Amanda Campos', 'Mara Leão',
  'Valquíria Dullius', 'Mayany Souza', 'Juma Silva', 'Kenya Malachias', 'Lyara Medeiros',
  'Laís Vasques', 'Keyla Alves', 'Paulina Souza', 'Beatriz Carvalho', 'Giovanna Gasparini'
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
    const isFemale = gender === 'female';
    const posLabel = isFemale
      ? position.replace('Levantador', 'Levantadora').replace('Ponteiro', 'Ponteira').replace('Oposto', 'Oposta').replace('Líbero', 'Líbera')
      : position;

    return {
      id: `${idPrefix}-${String(i + 1).padStart(2, '0')}`,
      competitionTeamId,
      name,
      jerseyNumber: i + 1,
      position: posLabel,
      isCaptain: i === 0,
      isLibero: i === 5 || i === 11,
      gender,
      documentNumber: docNumber(offset * 12 + i + 100),
      createdAt: iso(-7 * DAY),
      updatedAt: iso(-1 * DAY),
    };
  });
}

export const seedCompetitionAthletes: CompetitionAthlete[] = [
  // ── ATLETAS LIGA NACIONAL MASCULINA (8 Elencos x 12 Atletas) ──
  ...makeRoster('ath-m1', 'ct-m-1', MALE_NAMES, 0, 'male'),
  ...makeRoster('ath-m2', 'ct-m-2', MALE_NAMES, 7, 'male'),
  ...makeRoster('ath-m3', 'ct-m-3', MALE_NAMES, 14, 'male'),
  ...makeRoster('ath-m4', 'ct-m-4', MALE_NAMES, 21, 'male'),
  ...makeRoster('ath-m5', 'ct-m-5', MALE_NAMES, 28, 'male'),
  ...makeRoster('ath-m6', 'ct-m-6', MALE_NAMES, 35, 'male'),
  ...makeRoster('ath-m7', 'ct-m-7', MALE_NAMES, 42, 'male'),
  ...makeRoster('ath-m8', 'ct-m-8', MALE_NAMES, 49, 'male'),

  // ── ATLETAS LIGA NACIONAL FEMININA (8 Elencos x 12 Atletas) ──
  ...makeRoster('ath-f1', 'ct-f-1', FEMALE_NAMES, 0, 'female'),
  ...makeRoster('ath-f2', 'ct-f-2', FEMALE_NAMES, 7, 'female'),
  ...makeRoster('ath-f3', 'ct-f-3', FEMALE_NAMES, 14, 'female'),
  ...makeRoster('ath-f4', 'ct-f-4', FEMALE_NAMES, 21, 'female'),
  ...makeRoster('ath-f5', 'ct-f-5', FEMALE_NAMES, 28, 'female'),
  ...makeRoster('ath-f6', 'ct-f-6', FEMALE_NAMES, 35, 'female'),
  ...makeRoster('ath-f7', 'ct-f-7', FEMALE_NAMES, 42, 'female'),
  ...makeRoster('ath-f8', 'ct-f-8', FEMALE_NAMES, 49, 'female'),
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
  competitionId: string,
  phase: string,
  customSetFormat: '3-sets' | '5-sets' = '5-sets',
  status: MatchRecord['status'] = 'scheduled',
  sets: MatchRecord['sets'] = [],
  winnerId?: string,
): MatchRecord {
  const teamA = seedTeams.find(t => t.id === teamAId)!;
  const teamB = seedTeams.find(t => t.id === teamBId)!;
  const venue = competitionId === 'comp-feminino-2026' ? 'Arena Multiuso Olímpica' : 'Ginásio Poliesportivo Central';

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
    venue,
    court,
    phase,
    groupName,
    scheduledTime: iso(dateDeltaHours * HOUR),
    status,
    sets,
    winnerId,
    referees: [
      { role: 'first', name: 'Carlos Alberto Silva' },
      { role: 'second', name: 'Ana Beatriz Santos' },
      { role: 'scorer', name: 'Pedro Henrique Oliveira' },
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
    customSetFormat,
    createdAt: iso(-7 * DAY),
    updatedAt: iso(-1 * DAY),
  };
}

export const seedMatches: MatchRecord[] = [
  // ==========================================================================
  // 🏆 1. LIGA NACIONAL PRO MASCULINO 2026 (5 SETS)
  // ==========================================================================
  // ── GRUPO A (MASCULINO - FINALIZADO) ──
  // R1: Vortex 3x0 Titanium (25x21, 25x23, 25x19)
  makeMatch('match-m-01', 1, 1, 'Grupo A', 'team-m-1', 'team-m-2', 'ath-m1', 'ath-m2', -120, 'Quadra Principal', 'comp-masculino-2026', 'Fase de Grupos', '5-sets', 'completed', [
    { setNumber: 1, scoreA: 25, scoreB: 21 },
    { setNumber: 2, scoreA: 25, scoreB: 23 },
    { setNumber: 3, scoreA: 25, scoreB: 19 },
  ], 'team-m-1'),
  // R1: Fênix 3x1 Águias (25x20, 22x25, 25x21, 25x18)
  makeMatch('match-m-02', 2, 1, 'Grupo A', 'team-m-3', 'team-m-4', 'ath-m3', 'ath-m4', -118, 'Quadra Auxiliar', 'comp-masculino-2026', 'Fase de Grupos', '5-sets', 'completed', [
    { setNumber: 1, scoreA: 25, scoreB: 20 },
    { setNumber: 2, scoreA: 22, scoreB: 25 },
    { setNumber: 3, scoreA: 25, scoreB: 21 },
    { setNumber: 4, scoreA: 25, scoreB: 18 },
  ], 'team-m-3'),
  // R2: Vortex 3x1 Fênix (25x22, 23x25, 25x19, 25x20)
  makeMatch('match-m-03', 3, 2, 'Grupo A', 'team-m-1', 'team-m-3', 'ath-m1', 'ath-m3', -96, 'Quadra Principal', 'comp-masculino-2026', 'Fase de Grupos', '5-sets', 'completed', [
    { setNumber: 1, scoreA: 25, scoreB: 22 },
    { setNumber: 2, scoreA: 23, scoreB: 25 },
    { setNumber: 3, scoreA: 25, scoreB: 19 },
    { setNumber: 4, scoreA: 25, scoreB: 20 },
  ], 'team-m-1'),
  // R2: Titanium 3x0 Águias (25x18, 25x22, 25x20)
  makeMatch('match-m-04', 4, 2, 'Grupo A', 'team-m-2', 'team-m-4', 'ath-m2', 'ath-m4', -94, 'Quadra Auxiliar', 'comp-masculino-2026', 'Fase de Grupos', '5-sets', 'completed', [
    { setNumber: 1, scoreA: 25, scoreB: 18 },
    { setNumber: 2, scoreA: 25, scoreB: 22 },
    { setNumber: 3, scoreA: 25, scoreB: 20 },
  ], 'team-m-2'),
  // R3: Vortex 3x0 Águias (25x17, 25x19, 25x21)
  makeMatch('match-m-05', 5, 3, 'Grupo A', 'team-m-1', 'team-m-4', 'ath-m1', 'ath-m4', -72, 'Quadra Principal', 'comp-masculino-2026', 'Fase de Grupos', '5-sets', 'completed', [
    { setNumber: 1, scoreA: 25, scoreB: 17 },
    { setNumber: 2, scoreA: 25, scoreB: 19 },
    { setNumber: 3, scoreA: 25, scoreB: 21 },
  ], 'team-m-1'),
  // R3: Titanium 3x1 Fênix (25x23, 25x21, 22x25, 25x20) -> Titanium avança em 2º
  makeMatch('match-m-06', 6, 3, 'Grupo A', 'team-m-2', 'team-m-3', 'ath-m2', 'ath-m3', -70, 'Quadra Auxiliar', 'comp-masculino-2026', 'Fase de Grupos', '5-sets', 'completed', [
    { setNumber: 1, scoreA: 25, scoreB: 23 },
    { setNumber: 2, scoreA: 25, scoreB: 21 },
    { setNumber: 3, scoreA: 22, scoreB: 25 },
    { setNumber: 4, scoreA: 25, scoreB: 20 },
  ], 'team-m-2'),

  // ── GRUPO B (MASCULINO - FINALIZADO) ──
  // R1: Aurora 3x2 Guarani (25x23, 21x25, 25x22, 23x25, 15x12)
  makeMatch('match-m-07', 7, 1, 'Grupo B', 'team-m-5', 'team-m-6', 'ath-m5', 'ath-m6', -120, 'Quadra Principal', 'comp-masculino-2026', 'Fase de Grupos', '5-sets', 'completed', [
    { setNumber: 1, scoreA: 25, scoreB: 23 },
    { setNumber: 2, scoreA: 21, scoreB: 25 },
    { setNumber: 3, scoreA: 25, scoreB: 22 },
    { setNumber: 4, scoreA: 23, scoreB: 25 },
    { setNumber: 5, scoreA: 15, scoreB: 12 },
  ], 'team-m-5'),
  // R1: Siderúrgica 3x1 Trovão (25x22, 25x20, 20x25, 25x19)
  makeMatch('match-m-08', 8, 1, 'Grupo B', 'team-m-7', 'team-m-8', 'ath-m7', 'ath-m8', -118, 'Quadra Auxiliar', 'comp-masculino-2026', 'Fase de Grupos', '5-sets', 'completed', [
    { setNumber: 1, scoreA: 25, scoreB: 22 },
    { setNumber: 2, scoreA: 25, scoreB: 20 },
    { setNumber: 3, scoreA: 20, scoreB: 25 },
    { setNumber: 4, scoreA: 25, scoreB: 19 },
  ], 'team-m-7'),
  // R2: Aurora 3x0 Siderúrgica (25x20, 25x18, 25x22)
  makeMatch('match-m-09', 9, 2, 'Grupo B', 'team-m-5', 'team-m-7', 'ath-m5', 'ath-m7', -96, 'Quadra Principal', 'comp-masculino-2026', 'Fase de Grupos', '5-sets', 'completed', [
    { setNumber: 1, scoreA: 25, scoreB: 20 },
    { setNumber: 2, scoreA: 25, scoreB: 18 },
    { setNumber: 3, scoreA: 25, scoreB: 22 },
  ], 'team-m-5'),
  // R2: Guarani 3x1 Trovão (25x21, 25x19, 23x25, 25x18)
  makeMatch('match-m-10', 10, 2, 'Grupo B', 'team-m-6', 'team-m-8', 'ath-m6', 'ath-m8', -94, 'Quadra Auxiliar', 'comp-masculino-2026', 'Fase de Grupos', '5-sets', 'completed', [
    { setNumber: 1, scoreA: 25, scoreB: 21 },
    { setNumber: 2, scoreA: 25, scoreB: 19 },
    { setNumber: 3, scoreA: 23, scoreB: 25 },
    { setNumber: 4, scoreA: 25, scoreB: 18 },
  ], 'team-m-6'),
  // R3: Aurora 3x1 Trovão (25x19, 22x25, 25x21, 25x20)
  makeMatch('match-m-11', 11, 3, 'Grupo B', 'team-m-5', 'team-m-8', 'ath-m5', 'ath-m8', -72, 'Quadra Principal', 'comp-masculino-2026', 'Fase de Grupos', '5-sets', 'completed', [
    { setNumber: 1, scoreA: 25, scoreB: 19 },
    { setNumber: 2, scoreA: 22, scoreB: 25 },
    { setNumber: 3, scoreA: 25, scoreB: 21 },
    { setNumber: 4, scoreA: 25, scoreB: 20 },
  ], 'team-m-5'),
  // R3: Guarani 3x0 Siderúrgica (25x21, 25x22, 25x19) -> Guarani avança em 2º
  makeMatch('match-m-12', 12, 3, 'Grupo B', 'team-m-6', 'team-m-7', 'ath-m6', 'ath-m7', -70, 'Quadra Auxiliar', 'comp-masculino-2026', 'Fase de Grupos', '5-sets', 'completed', [
    { setNumber: 1, scoreA: 25, scoreB: 21 },
    { setNumber: 2, scoreA: 25, scoreB: 22 },
    { setNumber: 3, scoreA: 25, scoreB: 19 },
  ], 'team-m-6'),

  // ── 🔥 SEMIFINAIS MASCULINAS (EM ANDAMENTO / AGENDADAS HOJE) ──
  // Semifinal 1: 1º Grupo A (Vortex) vs 2º Grupo B (Guarani)
  makeMatch(
    'match-m-semi-01',
    13,
    4,
    'Semifinais',
    'team-m-1',
    'team-m-6',
    'ath-m1',
    'ath-m6',
    3,
    'Quadra Principal',
    'comp-masculino-2026',
    'Semifinal',
    '5-sets',
    'scheduled',
  ),
  // Semifinal 2: 1º Grupo B (Aurora) vs 2º Grupo A (Titanium)
  makeMatch(
    'match-m-semi-02',
    14,
    4,
    'Semifinais',
    'team-m-5',
    'team-m-2',
    'ath-m5',
    'ath-m2',
    5,
    'Quadra Principal',
    'comp-masculino-2026',
    'Semifinal',
    '5-sets',
    'scheduled',
  ),

  // ==========================================================================
  // 🏆 2. LIGA NACIONAL PRO FEMININO 2026 (5 SETS)
  // ==========================================================================
  // ── GRUPO A (FEMININO - FINALIZADO) ──
  // R1: Estrela do Sul 3x0 Valkírias (25x22, 25x20, 25x18)
  makeMatch('match-f-01', 1, 1, 'Grupo A', 'team-f-1', 'team-f-2', 'ath-f1', 'ath-f2', -120, 'Quadra Central', 'comp-feminino-2026', 'Fase de Grupos', '5-sets', 'completed', [
    { setNumber: 1, scoreA: 25, scoreB: 22 },
    { setNumber: 2, scoreA: 25, scoreB: 20 },
    { setNumber: 3, scoreA: 25, scoreB: 18 },
  ], 'team-f-1'),
  // R1: Serena 3x1 Magnólias (25x23, 25x21, 21x25, 25x19)
  makeMatch('match-f-02', 2, 1, 'Grupo A', 'team-f-3', 'team-f-4', 'ath-f3', 'ath-f4', -118, 'Quadra Central', 'comp-feminino-2026', 'Fase de Grupos', '5-sets', 'completed', [
    { setNumber: 1, scoreA: 25, scoreB: 23 },
    { setNumber: 2, scoreA: 25, scoreB: 21 },
    { setNumber: 3, scoreA: 21, scoreB: 25 },
    { setNumber: 4, scoreA: 25, scoreB: 19 },
  ], 'team-f-3'),
  // R2: Estrela do Sul 3x1 Serena (25x21, 23x25, 25x18, 25x20)
  makeMatch('match-f-03', 3, 2, 'Grupo A', 'team-f-1', 'team-f-3', 'ath-f1', 'ath-f3', -96, 'Quadra Central', 'comp-feminino-2026', 'Fase de Grupos', '5-sets', 'completed', [
    { setNumber: 1, scoreA: 25, scoreB: 21 },
    { setNumber: 2, scoreA: 23, scoreB: 25 },
    { setNumber: 3, scoreA: 25, scoreB: 18 },
    { setNumber: 4, scoreA: 25, scoreB: 20 },
  ], 'team-f-1'),
  // R2: Valkírias 3x2 Magnólias (23x25, 25x20, 22x25, 25x21, 15x11)
  makeMatch('match-f-04', 4, 2, 'Grupo A', 'team-f-2', 'team-f-4', 'ath-f2', 'ath-f4', -94, 'Quadra Central', 'comp-feminino-2026', 'Fase de Grupos', '5-sets', 'completed', [
    { setNumber: 1, scoreA: 23, scoreB: 25 },
    { setNumber: 2, scoreA: 25, scoreB: 20 },
    { setNumber: 3, scoreA: 22, scoreB: 25 },
    { setNumber: 4, scoreA: 25, scoreB: 21 },
    { setNumber: 5, scoreA: 15, scoreB: 11 },
  ], 'team-f-2'),
  // R3: Estrela do Sul 3x0 Magnólias (25x19, 25x16, 25x21)
  makeMatch('match-f-05', 5, 3, 'Grupo A', 'team-f-1', 'team-f-4', 'ath-f1', 'ath-f4', -72, 'Quadra Central', 'comp-feminino-2026', 'Fase de Grupos', '5-sets', 'completed', [
    { setNumber: 1, scoreA: 25, scoreB: 19 },
    { setNumber: 2, scoreA: 25, scoreB: 16 },
    { setNumber: 3, scoreA: 25, scoreB: 21 },
  ], 'team-f-1'),
  // R3: Valkírias 3x1 Serena (25x20, 21x25, 25x22, 25x19) -> Valkírias avança em 2º
  makeMatch('match-f-06', 6, 3, 'Grupo A', 'team-f-2', 'team-f-3', 'ath-f2', 'ath-f3', -70, 'Quadra Central', 'comp-feminino-2026', 'Fase de Grupos', '5-sets', 'completed', [
    { setNumber: 1, scoreA: 25, scoreB: 20 },
    { setNumber: 2, scoreA: 21, scoreB: 25 },
    { setNumber: 3, scoreA: 25, scoreB: 22 },
    { setNumber: 4, scoreA: 25, scoreB: 19 },
  ], 'team-f-2'),

  // ── GRUPO B (FEMININO - FINALIZADO) ──
  // R1: Harmonia 3x2 Império (25x22, 20x25, 25x23, 22x25, 15x13)
  makeMatch('match-f-07', 7, 1, 'Grupo B', 'team-f-5', 'team-f-6', 'ath-f5', 'ath-f6', -120, 'Quadra Central', 'comp-feminino-2026', 'Fase de Grupos', '5-sets', 'completed', [
    { setNumber: 1, scoreA: 25, scoreB: 22 },
    { setNumber: 2, scoreA: 20, scoreB: 25 },
    { setNumber: 3, scoreA: 25, scoreB: 23 },
    { setNumber: 4, scoreA: 22, scoreB: 25 },
    { setNumber: 5, scoreA: 15, scoreB: 13 },
  ], 'team-f-5'),
  // R1: Vanguarda 3x1 Lótus (25x21, 25x20, 23x25, 25x19)
  makeMatch('match-f-08', 8, 1, 'Grupo B', 'team-f-7', 'team-f-8', 'ath-f7', 'ath-f8', -118, 'Quadra Central', 'comp-feminino-2026', 'Fase de Grupos', '5-sets', 'completed', [
    { setNumber: 1, scoreA: 25, scoreB: 21 },
    { setNumber: 2, scoreA: 25, scoreB: 20 },
    { setNumber: 3, scoreA: 23, scoreB: 25 },
    { setNumber: 4, scoreA: 25, scoreB: 19 },
  ], 'team-f-7'),
  // R2: Harmonia 3x1 Vanguarda (25x19, 25x21, 22x25, 25x18)
  makeMatch('match-f-09', 9, 2, 'Grupo B', 'team-f-5', 'team-f-7', 'ath-f5', 'ath-f7', -96, 'Quadra Central', 'comp-feminino-2026', 'Fase de Grupos', '5-sets', 'completed', [
    { setNumber: 1, scoreA: 25, scoreB: 19 },
    { setNumber: 2, scoreA: 25, scoreB: 21 },
    { setNumber: 3, scoreA: 22, scoreB: 25 },
    { setNumber: 4, scoreA: 25, scoreB: 18 },
  ], 'team-f-5'),
  // R2: Império 3x0 Lótus (25x18, 25x17, 25x20)
  makeMatch('match-f-10', 10, 2, 'Grupo B', 'team-f-6', 'team-f-8', 'ath-f6', 'ath-f8', -94, 'Quadra Central', 'comp-feminino-2026', 'Fase de Grupos', '5-sets', 'completed', [
    { setNumber: 1, scoreA: 25, scoreB: 18 },
    { setNumber: 2, scoreA: 25, scoreB: 17 },
    { setNumber: 3, scoreA: 25, scoreB: 20 },
  ], 'team-f-6'),
  // R3: Harmonia 3x0 Lótus (25x17, 25x19, 25x16)
  makeMatch('match-f-11', 11, 3, 'Grupo B', 'team-f-5', 'team-f-8', 'ath-f5', 'ath-f8', -72, 'Quadra Central', 'comp-feminino-2026', 'Fase de Grupos', '5-sets', 'completed', [
    { setNumber: 1, scoreA: 25, scoreB: 17 },
    { setNumber: 2, scoreA: 25, scoreB: 19 },
    { setNumber: 3, scoreA: 25, scoreB: 16 },
  ], 'team-f-5'),
  // R3: Império 3x0 Vanguarda (25x20, 25x22, 25x21) -> Império avança em 2º
  makeMatch('match-f-12', 12, 3, 'Grupo B', 'team-f-6', 'team-f-7', 'ath-f6', 'ath-f7', -70, 'Quadra Central', 'comp-feminino-2026', 'Fase de Grupos', '5-sets', 'completed', [
    { setNumber: 1, scoreA: 25, scoreB: 20 },
    { setNumber: 2, scoreA: 25, scoreB: 22 },
    { setNumber: 3, scoreA: 25, scoreB: 21 },
  ], 'team-f-6'),

  // ── 🔥 SEMIFINAIS FEMININAS (EM ANDAMENTO / AGENDADAS) ──
  // Semifinal 1: 1º Grupo A (Estrela do Sul) vs 2º Grupo B (Império das Quadras)
  makeMatch(
    'match-f-semi-01',
    13,
    4,
    'Semifinais',
    'team-f-1',
    'team-f-6',
    'ath-f1',
    'ath-f6',
    24,
    'Quadra Central',
    'comp-feminino-2026',
    'Semifinal',
    '5-sets',
    'scheduled',
  ),
  // Semifinal 2: 1º Grupo B (Harmonia Vôlei) vs 2º Grupo A (Valkírias)
  makeMatch(
    'match-f-semi-02',
    14,
    4,
    'Semifinais',
    'team-f-5',
    'team-f-2',
    'ath-f5',
    'ath-f2',
    26,
    'Quadra Central',
    'comp-feminino-2026',
    'Semifinal',
    '5-sets',
    'scheduled',
  ),
];

export const seedDraws: DrawRecord[] = [
  // Sorteio Masculino
  {
    id: 'draw-masculino-2026',
    competitionId: 'comp-masculino-2026',
    config: { groupsCount: 2, seedingMode: 'seeded', seed: 2026, headSeeds: ['team-m-1', 'team-m-5'] },
    groups: [
      {
        name: 'Grupo A',
        teams: [
          { teamId: 'team-m-1', seed: 1 },
          { teamId: 'team-m-2', seed: 2 },
          { teamId: 'team-m-3', seed: 3 },
          { teamId: 'team-m-4', seed: 4 },
        ],
      },
      {
        name: 'Grupo B',
        teams: [
          { teamId: 'team-m-5', seed: 1 },
          { teamId: 'team-m-6', seed: 2 },
          { teamId: 'team-m-7', seed: 3 },
          { teamId: 'team-m-8', seed: 4 },
        ],
      },
    ],
    matches: [
      { round: 1, matchNumber: 1, teamAId: 'team-m-1', teamBId: 'team-m-2', groupName: 'Grupo A', phase: 'groups' },
      { round: 1, matchNumber: 2, teamAId: 'team-m-3', teamBId: 'team-m-4', groupName: 'Grupo A', phase: 'groups' },
      { round: 2, matchNumber: 3, teamAId: 'team-m-1', teamBId: 'team-m-3', groupName: 'Grupo A', phase: 'groups' },
      { round: 2, matchNumber: 4, teamAId: 'team-m-2', teamBId: 'team-m-4', groupName: 'Grupo A', phase: 'groups' },
      { round: 3, matchNumber: 5, teamAId: 'team-m-1', teamBId: 'team-m-4', groupName: 'Grupo A', phase: 'groups' },
      { round: 3, matchNumber: 6, teamAId: 'team-m-2', teamBId: 'team-m-3', groupName: 'Grupo A', phase: 'groups' },
      { round: 1, matchNumber: 7, teamAId: 'team-m-5', teamBId: 'team-m-6', groupName: 'Grupo B', phase: 'groups' },
      { round: 1, matchNumber: 8, teamAId: 'team-m-7', teamBId: 'team-m-8', groupName: 'Grupo B', phase: 'groups' },
      { round: 2, matchNumber: 9, teamAId: 'team-m-5', teamBId: 'team-m-7', groupName: 'Grupo B', phase: 'groups' },
      { round: 2, matchNumber: 10, teamAId: 'team-m-6', teamBId: 'team-m-8', groupName: 'Grupo B', phase: 'groups' },
      { round: 3, matchNumber: 11, teamAId: 'team-m-5', teamBId: 'team-m-8', groupName: 'Grupo B', phase: 'groups' },
      { round: 3, matchNumber: 12, teamAId: 'team-m-6', teamBId: 'team-m-7', groupName: 'Grupo B', phase: 'groups' },
    ],
    createdAt: iso(-7 * DAY),
    updatedAt: iso(-1 * DAY),
  },

  // Sorteio Feminino
  {
    id: 'draw-feminino-2026',
    competitionId: 'comp-feminino-2026',
    config: { groupsCount: 2, seedingMode: 'seeded', seed: 2026, headSeeds: ['team-f-1', 'team-f-5'] },
    groups: [
      {
        name: 'Grupo A',
        teams: [
          { teamId: 'team-f-1', seed: 1 },
          { teamId: 'team-f-2', seed: 2 },
          { teamId: 'team-f-3', seed: 3 },
          { teamId: 'team-f-4', seed: 4 },
        ],
      },
      {
        name: 'Grupo B',
        teams: [
          { teamId: 'team-f-5', seed: 1 },
          { teamId: 'team-f-6', seed: 2 },
          { teamId: 'team-f-7', seed: 3 },
          { teamId: 'team-f-8', seed: 4 },
        ],
      },
    ],
    matches: [
      { round: 1, matchNumber: 1, teamAId: 'team-f-1', teamBId: 'team-f-2', groupName: 'Grupo A', phase: 'groups' },
      { round: 1, matchNumber: 2, teamAId: 'team-f-3', teamBId: 'team-f-4', groupName: 'Grupo A', phase: 'groups' },
      { round: 2, matchNumber: 3, teamAId: 'team-f-1', teamBId: 'team-f-3', groupName: 'Grupo A', phase: 'groups' },
      { round: 2, matchNumber: 4, teamAId: 'team-f-2', teamBId: 'team-f-4', groupName: 'Grupo A', phase: 'groups' },
      { round: 3, matchNumber: 5, teamAId: 'team-f-1', teamBId: 'team-f-4', groupName: 'Grupo A', phase: 'groups' },
      { round: 3, matchNumber: 6, teamAId: 'team-f-2', teamBId: 'team-f-3', groupName: 'Grupo A', phase: 'groups' },
      { round: 1, matchNumber: 7, teamAId: 'team-f-5', teamBId: 'team-f-6', groupName: 'Grupo B', phase: 'groups' },
      { round: 1, matchNumber: 8, teamAId: 'team-f-7', teamBId: 'team-f-8', groupName: 'Grupo B', phase: 'groups' },
      { round: 2, matchNumber: 9, teamAId: 'team-f-5', teamBId: 'team-f-7', groupName: 'Grupo B', phase: 'groups' },
      { round: 2, matchNumber: 10, teamAId: 'team-f-6', teamBId: 'team-f-8', groupName: 'Grupo B', phase: 'groups' },
      { round: 3, matchNumber: 11, teamAId: 'team-f-5', teamBId: 'team-f-8', groupName: 'Grupo B', phase: 'groups' },
      { round: 3, matchNumber: 12, teamAId: 'team-f-6', teamBId: 'team-f-7', groupName: 'Grupo B', phase: 'groups' },
    ],
    createdAt: iso(-7 * DAY),
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
    teamIds: ['team-m-1'],
    email: 'diego@voleipro.com',
    phone: '(11) 98765-4321',
    createdAt: iso(-30 * DAY),
    updatedAt: iso(-30 * DAY),
  },
  {
    id: 'per-2',
    fullName: 'Ricardo Valente',
    nickname: 'Valente',
    roles: ['coach'],
    teamIds: ['team-m-1'],
    email: 'ricardo@vortexvolei.com',
    phone: '(11) 98888-2222',
    createdAt: iso(-30 * DAY),
    updatedAt: iso(-30 * DAY),
  },
  {
    id: 'per-3',
    fullName: 'Carlos Alberto Silva',
    nickname: 'Carlos Árbitro',
    roles: ['referee'],
    email: 'carlos.arbitro@cbv.com',
    createdAt: iso(-30 * DAY),
    updatedAt: iso(-30 * DAY),
  },
];
