// =====================================================================
// Document Editor Service
//
// Ponta entre o repositório (MatchRecord) e o Motor de Documentos:
// - Mapeia a partida persistida para o modelo MatchDocument consumido
//   pelos geradores (elencos da competição + escalações do jogo).
// - Aplica as edições manuais do administrador: conteúdo (DocumentEdit)
//   e layout (TemplateLayout) — persistidas via dataAccess.
// =====================================================================

import type { DocumentType, MatchDocument, PlayerPosition, Team } from '../document-engine/schemas/match.schema';
import type { CompetitionTeam, CompetitionAthlete } from '../types/registration';
import type { MatchRecord, TeamRecord } from '../types/entities';
import type { DocumentEdit, TemplateLayout } from '../types/documentEdit';
import { dataAccess } from './dataAccess';

export type MatchContext = {
  match: MatchRecord;
  competitionName: string;
  competitionCategory: string;
  gender: MatchDocument['gender'];
  teamA: TeamRecord | undefined;
  teamB: TeamRecord | undefined;
  rosterA: CompetitionAthlete[];
  rosterB: CompetitionAthlete[];
  competitionTeamA: CompetitionTeam | undefined;
  competitionTeamB: CompetitionTeam | undefined;
  orgName: string;
  documentLogo?: string;
};

/** Carrega todo o contexto de uma partida para o editor de documentos. */
export async function loadMatchContext(matchId: string): Promise<MatchContext | null> {
  const match = await dataAccess.getMatch(matchId);
  if (!match) return null;

  const [competition, teams, competitionTeams, athletes, settings] = await Promise.all([
    dataAccess.getCompetition(match.competitionId),
    dataAccess.listTeams(),
    dataAccess.listCompetitionTeams(),
    dataAccess.listCompetitionAthletes(),
    dataAccess.getSettings(),
  ]);

  const teamA = teams.find(t => t.id === match.teamAId);
  const teamB = teams.find(t => t.id === match.teamBId);
  const competitionTeamA = competitionTeams.find(
    ct => ct.competitionId === match.competitionId && ct.teamId === match.teamAId,
  );
  const competitionTeamB = competitionTeams.find(
    ct => ct.competitionId === match.competitionId && ct.teamId === match.teamBId,
  );
  const rosterA = competitionTeamA
    ? athletes.filter(a => a.competitionTeamId === competitionTeamA.id)
    : [];
  const rosterB = competitionTeamB
    ? athletes.filter(a => a.competitionTeamId === competitionTeamB.id)
    : [];

  return {
    match,
    competitionName: competition?.name ?? '',
    competitionCategory: competition?.playerFormat ?? '',
    gender: (competition?.genderCategory ?? 'mixed') as MatchDocument['gender'],
    teamA,
    teamB,
    rosterA,
    rosterB,
    competitionTeamA,
    competitionTeamB,
    orgName: settings.orgName,
    documentLogo: settings.documentLogo,
  };
}

/** Constrói o modelo Team (jogadores da competição) a partir do elenco. */
function buildTeam(
  record: TeamRecord | undefined,
  roster: CompetitionAthlete[],
  match: MatchRecord,
  side: 'A' | 'B',
): Team {
  const id = side === 'A' ? match.teamAId : match.teamBId;
  const name = side === 'A' ? match.teamAName : match.teamBName;
  const shortName = side === 'A' ? match.teamAShortName : match.teamBShortName;
  const players = roster.map(a => ({
    id: a.id,
    name: a.name,
    shirtNumber: a.jerseyNumber,
    position: a.position,
    isCaptain: a.isCaptain,
    active: true,
  }));
  const coach = record?.coachName;
  const captain = roster.find(a => a.isCaptain);
  const liberoIds = new Set(roster.filter(a => a.isLibero).map(a => a.id));
  return {
    id,
    name,
    shortName,
    captainId: captain?.id || match.lineups?.[side === 'A' ? 'teamA' : 'teamB']?.captainId,
    logoUrl: record?.logoUrl,
    city: record?.city,
    state: record?.state,
    players,
    liberoPlayers: players.filter(p => liberoIds.has(p.id)),
    coach,
  };
}

const POSITIONS: PlayerPosition[] = ['I', 'II', 'III', 'IV', 'V', 'VI'];

/** Deriva as escalações (lineups) por set a partir do registro da partida. */
function buildLineups(
  match: MatchRecord,
  teamA: Team,
  teamB: Team,
): MatchDocument['lineups'] {
  if (!match.lineups) return [];
  const startersA = match.lineups.teamA.starterIds ?? [];
  const startersB = match.lineups.teamB.starterIds ?? [];
  if (startersA.length !== 6 || startersB.length !== 6) return [];
  const buildFor = (teamId: string, starters: string[], liberoId?: string) =>
    match.sets.map(set => ({
      setNumber: set.setNumber,
      teamId,
      positions: Object.fromEntries(
        POSITIONS.map((pos, i) => [pos, starters[i]]),
      ) as Record<PlayerPosition, string>,
      servingPosition: 'I' as const,
      liberoPlayerId: liberoId,
    }));
  return [
    ...buildFor(teamA.id, startersA, match.lineups?.teamA.liberoId),
    ...buildFor(teamB.id, startersB, match.lineups?.teamB.liberoId),
  ];
}

/** Constrói o modelo MatchDocument a partir do contexto persistido. */
export function buildMatchDocument(ctx: MatchContext): MatchDocument {
  const { match } = ctx;
  const teamA = buildTeam(ctx.teamA, ctx.rosterA, match, 'A');
  const teamB = buildTeam(ctx.teamB, ctx.rosterB, match, 'B');

  const officials: MatchDocument['officials'] = {
    referee1: match.referees.find(r => r.role.includes('1') || r.role.toLowerCase().includes('primeiro'))?.name,
    referee2: match.referees.find(r => r.role.includes('2') || r.role.toLowerCase().includes('segundo'))?.name,
    scorer: match.referees.find(r => r.role.toLowerCase().includes('pont') || r.role.toLowerCase().includes('anot') || r.role.toLowerCase().includes('mesa'))?.name,
  };

  const format = match.sets.length <= 3 ? '3-sets' : '5-sets';

  const lineups = buildLineups(match, teamA, teamB);

  const sets: MatchDocument['sets'] = match.sets.map(set => {
    const lineupA = lineups.find(l => l.setNumber === set.setNumber && l.teamId === teamA.id);
    const lineupB = lineups.find(l => l.setNumber === set.setNumber && l.teamId === teamB.id);
    return {
      number: set.setNumber,
      pointsA: set.scoreA,
      pointsB: set.scoreB,
      lineupA: lineupA
        ? { ...lineupA, teamId: teamA.id }
        : undefined,
      lineupB: lineupB
        ? { ...lineupB, teamId: teamB.id }
        : undefined,
      substitutions: [],
      timeouts: [],
      sanctions: [],
    };
  });

  const setsA = match.sets.filter(s => s.scoreA > s.scoreB).length;
  const setsB = match.sets.filter(s => s.scoreB > s.scoreA).length;

  const formattedDate = match.scheduledTime.slice(0, 10);
  const formattedTime = match.scheduledTime.slice(11, 16);

  const phaseLabel = match.phase
    ? (match.groupName && !match.phase.includes(match.groupName) ? `${match.phase} (${match.groupName})` : match.phase)
    : (match.groupName ? `Fase de Grupos (${match.groupName})` : 'Fase de Grupos');

  return {
    id: match.id,
    matchNumber: match.matchNumber,
    competitionId: match.competitionId,
    competitionName: ctx.competitionName,
    categoryName: ctx.competitionCategory,
    gender: ctx.gender,
    phase: phaseLabel,
    round: match.round,
    date: formattedDate,
    startTime: formattedTime,
    venue: match.venue,
    court: match.court,
    format,
    status: match.status === 'completed' ? 'FINISHED' : match.status === 'cancelled' ? 'CANCELLED' : 'IN_PROGRESS',
    teamA,
    teamB,
    lineups,
    sets,
    officials,
    result:
      match.sets.length > 0
        ? {
            winnerTeamId: match.winnerId ?? (setsA > setsB ? teamA.id : setsB > setsA ? teamB.id : undefined),
            teamASets: setsA,
            teamBSets: setsB,
            totalSets: match.sets.length,
          }
        : undefined,
    observations: match.observations,
  };
}

/** Recolhe as edições de conteúdo e layout persistidas para a partida. */
export async function loadDocumentEdits(
  matchId: string,
  documentType: DocumentType,
  templateKind: string,
): Promise<{ edit: DocumentEdit | null; layout: TemplateLayout | null }> {
  const [edit, layout] = await Promise.all([
    dataAccess.getDocumentEdit({ matchId, documentType }),
    dataAccess.getTemplateLayout(templateKind),
  ]);
  return { edit, layout };
}

/** Salva a edição de conteúdo de um documento. */
export function saveDocumentEdit(
  matchId: string,
  documentType: DocumentEdit['documentType'],
  values: Record<string, string>,
): Promise<DocumentEdit> {
  return dataAccess.saveDocumentEdit({ matchId, documentType, values });
}

/** Salva o ajuste de layout de um template. */
export function saveTemplateLayout(
  templateKind: TemplateLayout['templateKind'],
  fields: TemplateLayout['fields'],
): Promise<TemplateLayout> {
  return dataAccess.saveTemplateLayout({ templateKind, fields });
}

/** Converte data URI (settings.documentLogo) em bytes para o gerador. */
export function dataUriToBytes(dataUri: string): Uint8Array | undefined {
  if (!dataUri) return undefined;
  const base64 = dataUri.split(',')[1];
  if (!base64) return undefined;
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return undefined;
  }
}