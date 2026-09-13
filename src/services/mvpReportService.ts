/**
 * mvpReportService — Serviço puro de agregação e resolução do Relatório de Destaques / MVP
 * 
 * Regras do Domínio:
 * - Single Source of Truth (SSOT): MatchRecord.highlightAthleteId
 * - Resolução segura do atleta através de CompetitionAthlete -> CompetitionTeam -> TeamRecord
 * - Tratamento explícito de partidas sem MVP ("Sem destaque registrado")
 * - Tratamento explícito de inconsistências ("Atleta não localizado") sem mascarar dados
 * - Ordenação determinística de partidas e do ranking/leaderboard
 * - Zero efeitos colaterais e zero dependências de rede / N+1
 */

import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';
import type { CompetitionAthlete, CompetitionTeam } from '@/types/registration';
import type {
  MvpLeaderboardRow,
  MvpMatchRow,
  MvpReportData,
} from '@/lib/pdf/types';

export interface BuildMvpReportParams {
  competition: CompetitionRecord | null | undefined;
  matches: MatchRecord[];
  teams: TeamRecord[];
  athletes: CompetitionAthlete[];
  competitionTeams: CompetitionTeam[];
}

/**
 * Constrói o View Model completo e unificado para o Relatório de Destaques / MVP
 */
export function buildMvpReportData({
  competition,
  matches,
  teams,
  athletes,
  competitionTeams,
}: BuildMvpReportParams): MvpReportData {
  if (!competition) {
    return {
      competitionName: '',
      metrics: {
        totalMatches: 0,
        matchesWithMvp: 0,
        matchesWithoutMvp: 0,
        distinctHighlightedAthletes: 0,
        totalMvpAwards: 0,
      },
      leaderboard: [],
      matches: [],
    };
  }

  // Índices para resolução instantânea em memória O(1)
  const teamMap = new Map<string, TeamRecord>(teams.map((t) => [t.id, t]));
  const compTeamMap = new Map<string, CompetitionTeam>(competitionTeams.map((ct) => [ct.id, ct]));
  const athleteMap = new Map<string, CompetitionAthlete>(athletes.map((a) => [a.id, a]));

  // Filtra apenas partidas pertencentes à competição ativa
  const compMatches = matches.filter((m) => m.competitionId === competition.id);

  // Mapeia cada partida para o View Model MvpMatchRow
  const matchRows: MvpMatchRow[] = compMatches.map((m) => {
    const teamA = teamMap.get(m.teamAId);
    const teamB = teamMap.get(m.teamBId);

    const dt = m.scheduledTime ? new Date(m.scheduledTime) : null;
    const isValidDate = dt && !isNaN(dt.getTime());
    const dateStr = isValidDate
      ? dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '';
    const timeStr = isValidDate
      ? dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : '';

    const statusLabel =
      m.status === 'completed' || m.status === 'homologated'
        ? 'Finalizado'
        : m.status === 'in-progress'
        ? 'Em andamento'
        : m.status === 'cancelled'
        ? 'Cancelado'
        : 'Agendado';

    const isFinished = m.status === 'completed' || m.status === 'homologated';
    const scoreA = m.sets.filter((s) => s.scoreA > s.scoreB).length;
    const scoreB = m.sets.filter((s) => s.scoreB > s.scoreA).length;
    const setsScoreLabel = isFinished && m.sets.length > 0 ? `${scoreA} × ${scoreB}` : '—';

    const rawHighlightId = m.highlightAthleteId?.trim();
    const hasRawHighlight = Boolean(rawHighlightId && rawHighlightId !== '');

    let athleteId: string | undefined;
    let athleteName: string | undefined;
    let jerseyNumber: number | undefined;
    let athleteTeamId: string | undefined;
    let athleteTeamName: string | undefined;
    let athleteTeamShort: string | undefined;
    let isUnresolvedAthlete = false;

    if (hasRawHighlight && rawHighlightId) {
      const athlete = athleteMap.get(rawHighlightId);
      if (athlete) {
        athleteId = athlete.id;
        athleteName = athlete.name;
        jerseyNumber = athlete.jerseyNumber;

        // Resolve a equipe do atleta através do vínculo com a competição
        const compTeam = compTeamMap.get(athlete.competitionTeamId);
        const masterTeam = compTeam ? teamMap.get(compTeam.teamId) : undefined;

        athleteTeamId = masterTeam?.id || compTeam?.teamId;
        athleteTeamName =
          masterTeam?.name ||
          compTeam?.teamName ||
          (m.teamAId === compTeam?.teamId ? m.teamAName : m.teamBName);
        athleteTeamShort = masterTeam?.shortName || compTeam?.teamShortName || athleteTeamName;
      } else {
        // Seção 6.3: MVP registrado mas atleta não localizado (inconsistência real)
        isUnresolvedAthlete = true;
        athleteId = rawHighlightId;
        athleteName = 'Atleta não localizado';
        athleteTeamName = 'Equipe não identificada';
        athleteTeamShort = '—';
      }
    }

    return {
      matchId: m.id,
      matchNumber: m.matchNumber,
      round: m.round || 1,
      phase: m.phase,
      groupName: m.groupName,
      date: dateStr,
      time: timeStr,
      scheduledTime: m.scheduledTime || '',
      venue: m.venue || '—',
      court: m.court,
      teamAId: m.teamAId,
      teamAName: teamA?.name || m.teamAName,
      teamAShort: teamA?.shortName || m.teamAShortName,
      teamALogo: teamA?.logoUrl,
      teamBId: m.teamBId,
      teamBName: teamB?.name || m.teamBName,
      teamBShort: teamB?.shortName || m.teamBShortName,
      teamBLogo: teamB?.logoUrl,
      scoreA: isFinished && m.sets.length > 0 ? scoreA : undefined,
      scoreB: isFinished && m.sets.length > 0 ? scoreB : undefined,
      setsScoreLabel,
      status: m.status,
      statusLabel,
      hasHighlight: hasRawHighlight,
      athleteId,
      athleteName,
      jerseyNumber,
      athleteTeamId,
      athleteTeamName,
      athleteTeamShort,
      isUnresolvedAthlete,
    };
  });

  // Ordenação determinística das partidas:
  // 1. Data/Horário cronológico
  // 2. Ginásio / Local / Quadra
  // 3. Número do jogo
  // Partidas sem horário vão ao final
  const sortedMatchRows = matchRows.slice().sort((a, b) => {
    const timeA = a.scheduledTime ? new Date(a.scheduledTime).getTime() : 0;
    const timeB = b.scheduledTime ? new Date(b.scheduledTime).getTime() : 0;

    if (timeA === 0 && timeB !== 0) return 1;
    if (timeA !== 0 && timeB === 0) return -1;
    if (timeA !== timeB) return timeA - timeB;

    const venueComp = (a.venue || '').localeCompare(b.venue || '');
    if (venueComp !== 0) return venueComp;

    const courtComp = (a.court || '').localeCompare(b.court || '');
    if (courtComp !== 0) return courtComp;

    return a.matchNumber - b.matchNumber;
  });

  // Construção do Ranking / Leaderboard agregado de MVPs
  const mvpAggMap = new Map<
    string,
    {
      athleteId: string;
      athleteName: string;
      jerseyNumber?: number;
      teamId?: string;
      teamName: string;
      teamShortName?: string;
      teamLogoUrl?: string;
      mvpCount: number;
      matchNumbers: number[];
    }
  >();

  for (const m of sortedMatchRows) {
    if (m.hasHighlight && m.athleteId && !m.isUnresolvedAthlete && m.athleteName) {
      const existing = mvpAggMap.get(m.athleteId);
      if (existing) {
        existing.mvpCount += 1;
        existing.matchNumbers.push(m.matchNumber);
      } else {
        const teamObj = m.athleteTeamId ? teamMap.get(m.athleteTeamId) : undefined;
        mvpAggMap.set(m.athleteId, {
          athleteId: m.athleteId,
          athleteName: m.athleteName,
          jerseyNumber: m.jerseyNumber,
          teamId: m.athleteTeamId,
          teamName: m.athleteTeamName || 'Equipe',
          teamShortName: m.athleteTeamShort,
          teamLogoUrl: teamObj?.logoUrl,
          mvpCount: 1,
          matchNumbers: [m.matchNumber],
        });
      }
    }
  }

  // Ordenação determinística do Leaderboard:
  // 1. Quantidade de MVPs DESC
  // 2. Nome do atleta ASC
  // 3. ID do atleta ASC como desempate final
  const sortedLeaderboardEntries = Array.from(mvpAggMap.values()).sort((a, b) => {
    if (b.mvpCount !== a.mvpCount) {
      return b.mvpCount - a.mvpCount;
    }
    const nameComp = a.athleteName.localeCompare(b.athleteName, 'pt-BR');
    if (nameComp !== 0) {
      return nameComp;
    }
    return a.athleteId.localeCompare(b.athleteId);
  });

  const leaderboard: MvpLeaderboardRow[] = sortedLeaderboardEntries.map((item, idx) => ({
    ...item,
    position: idx + 1,
    matchNumbers: item.matchNumbers.sort((x, y) => x - y),
  }));

  // Métricas do Relatório
  const totalMatches = sortedMatchRows.length;
  const matchesWithMvp = sortedMatchRows.filter((m) => m.hasHighlight).length;
  const matchesWithoutMvp = totalMatches - matchesWithMvp;
  const distinctHighlightedAthletes = leaderboard.length;
  const totalMvpAwards = leaderboard.reduce((acc, row) => acc + row.mvpCount, 0);

  const leader = leaderboard[0];

  return {
    competitionName: competition.name,
    metrics: {
      totalMatches,
      matchesWithMvp,
      matchesWithoutMvp,
      distinctHighlightedAthletes,
      totalMvpAwards,
      leaderName: leader?.athleteName,
      leaderMvpCount: leader?.mvpCount,
      leaderTeamName: leader?.teamName,
    },
    leaderboard,
    matches: sortedMatchRows,
  };
}
