/**
 * BaseOS — Public Competition Service
 * 
 * Camada pública de leitura para consulta e projeção sanitizada de competições,
 * equipes, grupos, partidas e classificação oficial.
 * 
 * Princípios de Engenharia:
 * 1. "A camada pública não seleciona nem retorna campos privados".
 * 2. Imutabilidade e integridade de slug canônico.
 * 3. Reutilização de SSOT: computeStandingsByGroup e CompetitionRulesService.getCanonicalMatchResult.
 * 4. Proteção de privacidade e LGPD: nenhum dado de atletas individuais é exposto no MVP.
 */

import { dataAccess } from '@/services/dataAccess';
import { CompetitionRulesService } from '@/services/competitionRulesService';
import { computeStandingsByGroup, type StandingsByGroup } from '@/services/standingsService';
import type { CompetitionRecord, CompetitionLifecycleStatus, CompetitionSupporter } from '@/types/entities';
import { sanitizeExternalUrl } from '@/lib/security';
import { normalizeSupporters } from '@/lib/supporters';
import { sortScheduleMatches } from '@/services/scheduleService';

// ============================================================================
// Utilitários Puros de Slug
// ============================================================================

/**
 * Gera um slug normalizado, limpo e seguro a partir do nome de uma competição.
 */
export function generateCompetitionSlug(name?: string): string {
  if (!name || typeof name !== 'string') return 'competicao';
  const clean = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return clean || 'competicao';
}

// ============================================================================
// DTOs Públicos Sanitizados (Sem dados privados ou sensíveis)
// ============================================================================

export interface PublicRulesDTO {
  setsToWin: number;
  regularSetPoints: number;
  tiebreakPoints: number;
  maxSets: number;
  pointsWinClear: number;
  pointsWinNarrow: number;
  pointsLossNarrow: number;
  pointsLossClear: number;
  pointsWoWin: number;
  pointsWoLoss: number;
}

export interface PublicCompetitionDTO {
  id: string;
  name: string;
  slug: string;
  modality: 'indoor' | 'beach';
  genderCategory: 'male' | 'female' | 'mixed';
  format: string;
  playerFormat: string;
  setFormat: string;
  status: CompetitionLifecycleStatus;
  statusLabel: string;
  startDate?: string;
  endDate?: string;
  venue?: string;
  description?: string;
  logoUrl?: string;
  supporters?: CompetitionSupporter[];
  publicRules: PublicRulesDTO;
}

export interface PublicTeamDTO {
  id: string;
  competitionId: string;
  teamId: string;
  teamName: string;
  shortName?: string;
  groupName?: string;
  logoUrl?: string;
  city?: string;
}

export interface PublicMatchDTO {
  id: string;
  competitionId: string;
  groupName?: string;
  round?: number;
  matchNumber?: number;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  teamALogoUrl?: string;
  teamBLogoUrl?: string;
  scheduledTime?: string;
  court?: string;
  venue?: string;
  status: string;
  winnerSide: 'A' | 'B' | null;
  winnerId: string | null;
  setsWonA: number;
  setsWonB: number;
  setScores: { setNumber: number; scoreA: number; scoreB: number }[];
  isCompleted: boolean;
  isHomologated: boolean;
  isWo: boolean;
  highlightAthlete?: {
    name: string;
    jerseyNumber?: number;
    teamName: string;
  } | null;
}

export interface PublicCompetitionBundle {
  competition: PublicCompetitionDTO;
  teams: PublicTeamDTO[];
  groups: string[];
  matches: PublicMatchDTO[];
  standings: StandingsByGroup;
}

// ============================================================================
// Mapeadores Sanitizados (Sanitization Layer)
// ============================================================================

/**
 * Traduz o status canônico de ciclo de vida para rótulo amigável ao espectador.
 */
export function getPublicStatusLabel(status: CompetitionLifecycleStatus): string {
  switch (status) {
    case 'planning':
      return 'Em Planejamento';
    case 'registration-open':
      return 'Inscrições Abertas';
    case 'registration-closed':
      return 'Inscrições Encerradas';
    case 'draw-pending':
      return 'Aguardando Sorteio';
    case 'groups-defined':
      return 'Grupos Definidos';
    case 'in-progress':
      return 'Em Andamento';
    case 'playoffs':
      return 'Fase Final';
    case 'completed':
      return 'Finalizada';
    case 'cancelled':
      return 'Cancelada';
    default:
      return 'Competição Oficial';
  }
}

/**
 * Projeta estritamente os campos públicos e as regras esportivas de uma competição.
 */
export function sanitizePublicCompetition(comp: CompetitionRecord): PublicCompetitionDTO {
  const cfg = CompetitionRulesService.getConfig(comp);
  const setsToWin = cfg.format.defaultSetsToWin;
  const regularSetPoints = cfg.format.setRules.regularSetPoints;
  const tiebreakPoints = cfg.format.setRules.tiebreakPoints;
  const maxSets = (setsToWin * 2) - 1;

  const pointsWinClear = cfg.scoring.pointsWinClear;
  const pointsWinNarrow = cfg.scoring.pointsWinNarrow;
  const pointsLossNarrow = cfg.scoring.pointsLossNarrow;
  const pointsLossClear = cfg.scoring.pointsLossClear;
  const pointsWoWin = cfg.scoring.pointsWoWin;
  const pointsWoLoss = cfg.scoring.pointsWoLoss;

  const sanitizedSupporters: CompetitionSupporter[] = normalizeSupporters(comp.supporters);

  return {
    id: comp.id,
    name: comp.name,
    slug: comp.slug || generateCompetitionSlug(comp.name),
    modality: comp.modality,
    genderCategory: comp.genderCategory,
    format: comp.format,
    playerFormat: comp.playerFormat,
    setFormat: comp.setFormat,
    status: comp.status,
    statusLabel: getPublicStatusLabel(comp.status),
    startDate: comp.startDate,
    endDate: comp.endDate,
    venue: comp.venue,
    description: comp.description,
    logoUrl: comp.logoUrl || undefined,
    supporters: sanitizedSupporters,
    publicRules: {
      setsToWin,
      regularSetPoints,
      tiebreakPoints,
      maxSets,
      pointsWinClear,
      pointsWinNarrow,
      pointsLossNarrow,
      pointsLossClear,
      pointsWoWin,
      pointsWoLoss,
    },
  };
}

// ============================================================================
// Métodos do Serviço Público
// ============================================================================

export const publicCompetitionService = {
  /**
   * Busca uma competição pelo seu slug oficial permanente.
   * Retorna null se o slug não for encontrado ou não pertencer a nenhuma competição.
   */
  async getPublicCompetitionBySlug(slug: string): Promise<PublicCompetitionDTO | null> {
    if (!slug || typeof slug !== 'string') return null;
    const comp = await dataAccess.getCompetitionBySlug(slug.trim());
    if (!comp) return null;
    return sanitizePublicCompetition(comp);
  },

  /**
   * Carrega o pacote completo de visualização pública da competição:
   * Metadados esportivos, equipes participantes, grupos, partidas e classificação oficial.
   */
  async getPublicCompetitionBundle(slug: string): Promise<PublicCompetitionBundle | null> {
    const rawComp = await dataAccess.getCompetitionBySlug(slug.trim());
    if (!rawComp) return null;

    const competition = sanitizePublicCompetition(rawComp);

    // Carrega dados relacionados usando a camada canônica de persistência
    const [compTeams, allMasterTeams, matches, draw] = await Promise.all([
      dataAccess.listCompetitionTeams(rawComp.id),
      dataAccess.listTeams(),
      dataAccess.listMatches(rawComp.id),
      dataAccess.getDrawByCompetition(rawComp.id),
    ]);

    const masterTeamMap = new Map<string, typeof allMasterTeams[0]>(allMasterTeams.map(t => [t.id, t]));

    // Mapeamento de grupos de cada equipe via sorteio oficial ou partidas
    const teamGroupMap = new Map<string, string>();
    if (draw?.groups) {
      for (const grp of draw.groups) {
        for (const t of grp.teams) {
          teamGroupMap.set(t.teamId, grp.name);
        }
      }
    }
    // Fallback de grupos por partidas caso sorteio ainda não esteja mapeado
    for (const m of matches) {
      if (m.groupName) {
        if (!teamGroupMap.has(m.teamAId)) teamGroupMap.set(m.teamAId, m.groupName);
        if (!teamGroupMap.has(m.teamBId)) teamGroupMap.set(m.teamBId, m.groupName);
      }
    }

    // Projeta equipes públicas sanitizadas (SEM access_token, SEM deadline, SEM atletas)
    const teams: PublicTeamDTO[] = compTeams.map(ct => {
      const master = masterTeamMap.get(ct.teamId);
      const groupName = teamGroupMap.get(ct.teamId);
      return {
        id: ct.id,
        competitionId: ct.competitionId,
        teamId: ct.teamId,
        teamName: ct.teamName || master?.name || 'Equipe Desconhecida',
        shortName: ct.teamShortName || master?.shortName,
        groupName,
        logoUrl: master?.logoUrl,
        city: master?.city,
      };
    });

    // Grupos ordenados
    const groupsSet = new Set<string>();
    teamGroupMap.forEach(groupName => {
      if (groupName && groupName.trim()) {
        groupsSet.add(groupName.trim());
      }
    });
    const groups = Array.from(groupsSet).sort();

    // Carrega atletas das equipes para resolução do Destaque da Partida (MVP) se houver partidas homologadas com destaque
    const hasHighlights = matches.some(m => m.status === 'homologated' && m.highlightAthleteId);
    let allAthletes: Awaited<ReturnType<typeof dataAccess.listCompetitionAthletes>> = [];
    if (hasHighlights && compTeams.length > 0) {
      const athleteArrays = await Promise.all(compTeams.map(ct => dataAccess.listCompetitionAthletes(ct.id)));
      allAthletes = athleteArrays.flat();
    }

    // DTO de Partidas calculado exclusivamente via CompetitionRulesService.getCanonicalMatchResult
    // Ordenação canônica via Schedule Engine unificado
    const sortedMatches = sortScheduleMatches(matches);
    const publicMatches: PublicMatchDTO[] = sortedMatches.map(m => {
      const canonical = CompetitionRulesService.getCanonicalMatchResult(rawComp, m);
      const teamA = masterTeamMap.get(m.teamAId);
      const teamB = masterTeamMap.get(m.teamBId);

      // Destaque da Partida (MVP): visível exclusivamente após homologação oficial
      let highlightAthlete: PublicMatchDTO['highlightAthlete'] = null;
      if (canonical.isHomologated && m.highlightAthleteId) {
        const ath = allAthletes.find(a => a.id === m.highlightAthleteId);
        if (ath) {
          const compTeam = compTeams.find(ct => ct.id === ath.competitionTeamId);
          const master = compTeam ? masterTeamMap.get(compTeam.teamId) : undefined;
          highlightAthlete = {
            name: ath.name,
            jerseyNumber: ath.jerseyNumber,
            teamName: master?.name || compTeam?.teamName || (m.teamAId === compTeam?.teamId ? m.teamAName : m.teamBName),
          };
        }
      }

      return {
        id: m.id,
        competitionId: m.competitionId,
        groupName: m.groupName,
        round: m.round,
        matchNumber: m.matchNumber,
        teamAId: m.teamAId,
        teamBId: m.teamBId,
        teamAName: teamA?.name ?? 'A Definir',
        teamBName: teamB?.name ?? 'A Definir',
        teamALogoUrl: teamA?.logoUrl,
        teamBLogoUrl: teamB?.logoUrl,
        scheduledTime: m.scheduledTime,
        court: m.court,
        venue: m.venue,
        status: m.status,
        winnerSide: canonical.winnerSide,
        winnerId: canonical.winnerId,
        setsWonA: canonical.setsWonA,
        setsWonB: canonical.setsWonB,
        setScores: canonical.setScores,
        isCompleted: canonical.isCompleted,
        isHomologated: canonical.isHomologated,
        isWo: canonical.isWo,
        highlightAthlete,
      };
    });

    // Classificação oficial gerada exclusivamente pelo standingsService canônico
    const standingInputs: { team: typeof allMasterTeams[0]; groupName?: string }[] = [];
    for (const ct of compTeams) {
      const team = masterTeamMap.get(ct.teamId);
      if (team) {
        standingInputs.push({
          team,
          groupName: teamGroupMap.get(ct.teamId) ?? 'Grupo A',
        });
      }
    }

    const standings = computeStandingsByGroup(standingInputs, matches, {
      competition: rawComp,
    });

    return {
      competition,
      teams,
      groups,
      matches: publicMatches,
      standings,
    };
  },

  /**
   * Carregamento sob demanda de partidas públicas.
   */
  async getPublicMatches(competitionId: string): Promise<PublicMatchDTO[]> {
    const [rawComp, matches, allMasterTeams] = await Promise.all([
      dataAccess.getCompetition(competitionId),
      dataAccess.listMatches(competitionId),
      dataAccess.listTeams(),
    ]);

    const masterTeamMap = new Map<string, typeof allMasterTeams[0]>(allMasterTeams.map(t => [t.id, t]));
    const sortedMatches = sortScheduleMatches(matches);

    return sortedMatches.map(m => {
      const canonical = CompetitionRulesService.getCanonicalMatchResult(rawComp, m);
      const teamA = masterTeamMap.get(m.teamAId);
      const teamB = masterTeamMap.get(m.teamBId);

      return {
        id: m.id,
        competitionId: m.competitionId,
        groupName: m.groupName,
        round: m.round,
        matchNumber: m.matchNumber,
        teamAId: m.teamAId,
        teamBId: m.teamBId,
        teamAName: teamA?.name ?? 'A Definir',
        teamBName: teamB?.name ?? 'A Definir',
        teamALogoUrl: teamA?.logoUrl,
        teamBLogoUrl: teamB?.logoUrl,
        scheduledTime: m.scheduledTime,
        court: m.court,
        venue: m.venue,
        status: m.status,
        winnerSide: canonical.winnerSide,
        winnerId: canonical.winnerId,
        setsWonA: canonical.setsWonA,
        setsWonB: canonical.setsWonB,
        setScores: canonical.setScores,
        isCompleted: canonical.isCompleted,
        isHomologated: canonical.isHomologated,
        isWo: canonical.isWo,
      };
    });
  },

  /**
   * Carregamento sob demanda da classificação pública.
   */
  async getPublicStandings(competitionId: string): Promise<StandingsByGroup> {
    const [rawComp, compTeams, allMasterTeams, matches, draw] = await Promise.all([
      dataAccess.getCompetition(competitionId),
      dataAccess.listCompetitionTeams(competitionId),
      dataAccess.listTeams(),
      dataAccess.listMatches(competitionId),
      dataAccess.getDrawByCompetition(competitionId),
    ]);

    const masterTeamMap = new Map<string, typeof allMasterTeams[0]>(allMasterTeams.map(t => [t.id, t]));
    const teamGroupMap = new Map<string, string>();
    if (draw?.groups) {
      for (const grp of draw.groups) {
        for (const t of grp.teams) {
          teamGroupMap.set(t.teamId, grp.name);
        }
      }
    }
    for (const m of matches) {
      if (m.groupName) {
        if (!teamGroupMap.has(m.teamAId)) teamGroupMap.set(m.teamAId, m.groupName);
        if (!teamGroupMap.has(m.teamBId)) teamGroupMap.set(m.teamBId, m.groupName);
      }
    }

    const standingInputs: { team: typeof allMasterTeams[0]; groupName?: string }[] = [];
    for (const ct of compTeams) {
      const team = masterTeamMap.get(ct.teamId);
      if (team) {
        standingInputs.push({
          team,
          groupName: teamGroupMap.get(ct.teamId) ?? 'Grupo A',
        });
      }
    }

    return computeStandingsByGroup(standingInputs, matches, {
      competition: rawComp ?? undefined,
    });
  },
};
