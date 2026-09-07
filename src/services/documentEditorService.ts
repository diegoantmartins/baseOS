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
import type { DocumentEdit, FieldLayoutOverride, TemplateLayout } from '../types/documentEdit';
import { dataAccess } from './dataAccess';

export type MatchContext = {
  match: MatchRecord;
  competitionName: string;
  competitionCategory: string;
  competitionSetFormat?: string;
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
  
  let rosterA = competitionTeamA
    ? athletes.filter(a => a.competitionTeamId === competitionTeamA.id)
    : [];
  let rosterB = competitionTeamB
    ? athletes.filter(a => a.competitionTeamId === competitionTeamB.id)
    : [];

  // Fallback para atletas globais cadastrados na equipe caso a equipe não tenha elenco específico nesta competição
  if (rosterA.length === 0 || rosterB.length === 0) {
    const persons = await dataAccess.listPersons();
    const gender = (competition?.genderCategory === 'female' ? 'female' : 'male') as 'male' | 'female';
    if (rosterA.length === 0 && match.teamAId) {
      const teamPersons = persons.filter(p => p.teamIds?.includes(match.teamAId));
      rosterA = teamPersons.map((p, i) => ({
        id: p.id,
        competitionTeamId: competitionTeamA?.id || 'ct-fallback-a',
        name: p.fullName || p.nickname || `Jogador ${i + 1}`,
        jerseyNumber: i + 1,
        position: i < 6 ? 'Titular' : 'Reserva',
        isCaptain: i === 0,
        isLibero: false,
        gender,
        rg: p.documentId || '',
        cpf: p.documentId || '',
        birthDate: p.birthDate || '',
        photoUrl: p.photoUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }
    if (rosterB.length === 0 && match.teamBId) {
      const teamPersons = persons.filter(p => p.teamIds?.includes(match.teamBId));
      rosterB = teamPersons.map((p, i) => ({
        id: p.id,
        competitionTeamId: competitionTeamB?.id || 'ct-fallback-b',
        name: p.fullName || p.nickname || `Jogador ${i + 1}`,
        jerseyNumber: i + 1,
        position: i < 6 ? 'Titular' : 'Reserva',
        isCaptain: i === 0,
        isLibero: false,
        gender,
        rg: p.documentId || '',
        cpf: p.documentId || '',
        birthDate: p.birthDate || '',
        photoUrl: p.photoUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }
  }

  return {
    match,
    competitionName: competition?.name ?? '',
    competitionCategory: competition?.playerFormat ?? '',
    competitionSetFormat: competition?.setFormat,
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
  const players = roster.map((a, idx) => ({
    id: a.id,
    name: a.name,
    shirtNumber: a.jerseyNumber ?? (idx + 1),
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
  const totalSets = Math.max(match.sets.length, 1);
  const lineups: MatchDocument['lineups'] = [];

  for (let setNo = 1; setNo <= totalSets; setNo++) {
    if (startersA.length >= 6) {
      lineups.push({
        setNumber: setNo,
        teamId: teamA.id,
        positions: {
          I: startersA[0],
          II: startersA[1],
          III: startersA[2],
          IV: startersA[3],
          V: startersA[4],
          VI: startersA[5],
        },
        servingPosition: 'I',
        liberoPlayerId: teamA.liberoPlayers?.[0]?.id || match.lineups.teamA.liberoId,
      });
    }
    if (startersB.length >= 6) {
      lineups.push({
        setNumber: setNo,
        teamId: teamB.id,
        positions: {
          I: startersB[0],
          II: startersB[1],
          III: startersB[2],
          IV: startersB[3],
          V: startersB[4],
          VI: startersB[5],
        },
        servingPosition: 'I',
        liberoPlayerId: teamB.liberoPlayers?.[0]?.id || match.lineups.teamB.liberoId,
      });
    }
  }

  return lineups;
}

/**
 * Constrói o modelo MatchDocument a partir do contexto da partida.
 * Garante que dados de data, hora, local e categoria sejam formatados.
 */
export function buildMatchDocument(ctx: MatchContext): MatchDocument {
  const { match } = ctx;
  const teamA = buildTeam(ctx.teamA, ctx.rosterA, match, 'A');
  const teamB = buildTeam(ctx.teamB, ctx.rosterB, match, 'B');

  const officials: MatchDocument['officials'] = {
    referee1: match.referees.find(r => r.role.includes('1') || r.role.toLowerCase().includes('primeiro'))?.name,
    referee2: match.referees.find(r => r.role.includes('2') || r.role.toLowerCase().includes('segundo'))?.name,
    scorer: match.referees.find(r => r.role.toLowerCase().includes('pont') || r.role.toLowerCase().includes('anot') || r.role.toLowerCase().includes('mesa'))?.name,
  };

  const format: '3-sets' | '5-sets' =
    ctx.competitionSetFormat === '5-sets' || match.customSetFormat === '5-sets' || match.sets.length > 3
      ? '5-sets'
      : '3-sets';

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

  const formattedDate = match.scheduledTime ? match.scheduledTime.slice(0, 10) : '';
  const formattedTime = match.scheduledTime && match.scheduledTime.length >= 16 ? match.scheduledTime.slice(11, 16) : '';

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
  templateKind: import('../document-engine/schemas/sumula.schema').TemplateKind,
): Promise<{ edit: DocumentEdit | null; layout: TemplateLayout | null }> {
  const [edit, layout] = await Promise.all([
    dataAccess.getDocumentEdit({ matchId, documentType }),
    dataAccess.getTemplateLayout(templateKind),
  ]);
  return { edit, layout };
}

/** Salva as edições manuais de valores de campos da partida. */
export async function saveDocumentEdit(
  matchId: string,
  documentType: DocumentType,
  values: Record<string, string>,
): Promise<DocumentEdit> {
  const existing = await dataAccess.getDocumentEdit({ matchId, documentType });
  const edit: DocumentEdit = {
    id: existing?.id || `${matchId}_${documentType}`,
    matchId,
    documentType,
    values,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return dataAccess.saveDocumentEdit(edit);
}

/** Salva as edições manuais de layout de campos do template. */
export async function saveTemplateLayout(
  templateKind: import('../document-engine/schemas/sumula.schema').TemplateKind,
  fields: Record<string, FieldLayoutOverride>,
): Promise<TemplateLayout> {
  const layout: TemplateLayout = {
    id: templateKind,
    templateKind,
    fields,
    updatedAt: new Date().toISOString(),
  };
  return dataAccess.saveTemplateLayout(layout);
}

/** Utilitário para converter data URI para Uint8Array. */
export function dataUriToBytes(dataUri?: string): Uint8Array | undefined {
  if (!dataUri || typeof dataUri !== 'string' || !dataUri.startsWith('data:')) {
    return undefined;
  }
  const parts = dataUri.split(',');
  if (parts.length < 2 || !parts[1]) {
    return undefined;
  }
  try {
    const binary = atob(parts[1]);
    if (binary.length === 0) return undefined;
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return undefined;
  }
}