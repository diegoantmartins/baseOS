/**
 * matchStatisticsReportService.ts
 *
 * Serviço desacoplado para geração do View Model do
 * Relatório de Estatísticas de Partidas, Sets e Duração (BaseOS Fase 7.5 Prompt 8).
 *
 * Consolida dados matematicamente comprovados e reais de:
 * - Confrontos da competição (MatchRecord)
 * - Parciais e placares de cada set (SetScoreRecord[])
 * - Totais de sets e pontos por partida
 * - Resumo de desempenho e pontuação por equipe
 * - Médias de sets e pontos por confronto
 *
 * REGRA CENTRAL DE HONESTIDADE ESTATÍSTICA:
 * - NÃO inventa duração de jogo (declara explicitamente 'Não registrada')
 * - NÃO inventa ralis, aces, bloqueios, erros ou estatísticas individuais
 * - Distingue partidas jogadas, W.O., em andamento e agendadas
 */

import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';
import { CompetitionRulesService } from '@/services/competitionRulesService';
import type {
  MatchStatisticsReportData,
  MatchStatisticsRow,
  MatchStatisticsSetRow,
  TeamStatisticsSummaryRow,
} from '@/lib/pdf/types';

export interface BuildMatchStatisticsReportParams {
  competition: CompetitionRecord | null | undefined;
  matches: MatchRecord[];
  teams: TeamRecord[];
}

/**
 * Traduz o status do ciclo de vida da partida para label em português
 */
export function formatMatchStatus(status: string, isWo?: boolean): string {
  if (isWo || status === 'wo') return 'W.O.';
  switch (status) {
    case 'homologated':
      return 'Homologada';
    case 'completed':
      return 'Finalizada';
    case 'in-progress':
      return 'Em Andamento';
    case 'warmup':
      return 'Aquecimento';
    case 'set-break':
      return 'Intervalo';
    case 'timeout':
      return 'Tempo';
    case 'sheet_available':
      return 'Súmula Pronta';
    case 'scheduled':
      return 'Agendada';
    case 'postponed':
      return 'Adiada';
    case 'rescheduled':
      return 'Remarcada';
    case 'cancelled':
      return 'Cancelada';
    default:
      return status || 'Agendada';
  }
}

/**
 * Formata data ISO para DD/MM/AAAA
 */
export function formatDate(isoStr?: string): string {
  if (!isoStr) return '—';
  try {
    const parts = isoStr.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(isoStr);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    }
  } catch {
    // Fallback
  }
  return '—';
}

/**
 * Formata horário para HH:mm
 */
export function formatTime(isoStr?: string): string {
  if (!isoStr) return '—';
  try {
    if (isoStr.includes('T')) {
      const timePart = isoStr.split('T')[1];
      if (timePart) return timePart.substring(0, 5);
    }
    const d = new Date(isoStr);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
  } catch {
    // Fallback
  }
  return '—';
}

/**
 * Constrói o View Model completo e auditado de Estatísticas de Partidas e Sets
 */
export function buildMatchStatisticsReportData({
  competition,
  matches,
  teams,
}: BuildMatchStatisticsReportParams): MatchStatisticsReportData {
  if (!competition) {
    return {
      competitionId: '',
      competitionName: 'Competição',
      metrics: {
        totalMatches: 0,
        completedMatches: 0,
        inProgressMatches: 0,
        scheduledMatches: 0,
        woMatches: 0,
        cancelledMatches: 0,
        totalSetsPlayed: 0,
        totalPointsScored: 0,
        averageSetsPerMatch: 0,
        averagePointsPerMatch: 0,
        averagePointsPerSet: 0,
        tiebreakMatchesCount: 0,
        durationNotice: 'Duração de partida não registrada no domínio atual do BaseOS.',
      },
      matches: [],
      teamSummaries: [],
    };
  }

  // Mapa de equipes O(1)
  const teamMap = new Map<string, TeamRecord>(teams.map((t) => [t.id, t]));

  // Filtra partidas da competição ativa
  const compMatches = matches.filter((m) => m.competitionId === competition.id);

  // Ordenação determinística das partidas:
  // 1. Data/Horário ASC
  // 2. Número da partida ASC
  // 3. ID ASC
  const sortedMatches = compMatches.slice().sort((a, b) => {
    const timeA = a.scheduledTime ? new Date(a.scheduledTime).getTime() : 0;
    const timeB = b.scheduledTime ? new Date(b.scheduledTime).getTime() : 0;
    if (timeA !== timeB) return timeA - timeB;
    if (a.matchNumber !== b.matchNumber) return a.matchNumber - b.matchNumber;
    return a.id.localeCompare(b.id);
  });

  // Estrutura para acumular estatísticas das equipes
  const teamStatsMap = new Map<
    string,
    {
      teamId: string;
      teamName: string;
      teamShortName?: string;
      teamLogo?: string;
      matchesPlayed: number;
      wins: number;
      losses: number;
      setsWon: number;
      setsLost: number;
      pointsScored: number;
      pointsConceded: number;
    }
  >();

  // Inicializa mapa com as equipes conhecidas
  for (const t of teams) {
    teamStatsMap.set(t.id, {
      teamId: t.id,
      teamName: t.name,
      teamShortName: t.shortName,
      teamLogo: t.logoUrl,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      setsWon: 0,
      setsLost: 0,
      pointsScored: 0,
      pointsConceded: 0,
    });
  }

  let totalSetsInCompleted = 0;
  let totalPointsInCompleted = 0;
  let allSetsCount = 0;
  let allPointsCount = 0;
  let tiebreakMatchesCount = 0;

  const matchRows: MatchStatisticsRow[] = sortedMatches.map((m) => {
    const teamA = teamMap.get(m.teamAId);
    const teamB = teamMap.get(m.teamBId);

    const isWo = Boolean(m.isWo || m.status === 'wo');
    const isCompleted = m.status === 'completed' || m.status === 'homologated';
    const isInProgress =
      m.status === 'in-progress' ||
      m.status === 'warmup' ||
      m.status === 'set-break' ||
      m.status === 'timeout';

    // Avaliação canônica oficial das regras
    const canonical = CompetitionRulesService.getCanonicalMatchResult(competition, m);

    // Detalhamento set a set
    const setsDetail: MatchStatisticsSetRow[] = (m.sets || []).map((s) => ({
      setNumber: s.setNumber,
      scoreA: s.scoreA,
      scoreB: s.scoreB,
      pointDifference: Math.abs(s.scoreA - s.scoreB),
      winnerSide: s.scoreA > s.scoreB ? 'A' : s.scoreB > s.scoreA ? 'B' : null,
    }));

    const setsPlayed = setsDetail.length;
    allSetsCount += setsPlayed;

    // Pontos totais da partida
    const teamAPoints = canonical.pointsScoredA;
    const teamBPoints = canonical.pointsScoredB;
    const matchPointsTotal = teamAPoints + teamBPoints;
    allPointsCount += matchPointsTotal;

    const pointDifference = Math.abs(teamAPoints - teamBPoints);

    // Label do placar em sets
    let setsScoreLabel = '—';
    if (isCompleted || isInProgress) {
      setsScoreLabel = `${canonical.setsWonA} x ${canonical.setsWonB}`;
    }

    // Label do detalhamento dos sets
    let setsBreakdownLabel = '—';
    if (setsDetail.length > 0) {
      setsBreakdownLabel = setsDetail.map((s) => `${s.scoreA}-${s.scoreB}`).join(', ');
    } else if (isWo) {
      setsBreakdownLabel = `W.O. (${canonical.setsWonA > canonical.setsWonB ? 'Vitória Equipe A' : 'Vitória Equipe B'})`;
    }

    // Identificação de set desempate (Tiebreak)
    const formatConfig = CompetitionRulesService.resolveMatchFormat(
      competition,
      m.phase,
      m.customSetFormat,
    );
    if (isCompleted && setsPlayed === formatConfig.maxSets) {
      tiebreakMatchesCount++;
    }

    // Nome do vencedor
    let winnerName: string | undefined;
    if (canonical.winnerId) {
      if (canonical.winnerId === m.teamAId) {
        winnerName = teamA?.name || m.teamAName;
      } else if (canonical.winnerId === m.teamBId) {
        winnerName = teamB?.name || m.teamBName;
      }
    }

    // Se a partida foi concluída ou W.O., atualiza acumuladores por equipe
    if (isCompleted) {
      totalSetsInCompleted += setsPlayed;
      totalPointsInCompleted += matchPointsTotal;

      // Atualiza estatísticas da Equipe A
      let statsA = teamStatsMap.get(m.teamAId);
      if (!statsA) {
        statsA = {
          teamId: m.teamAId,
          teamName: teamA?.name || m.teamAName,
          teamShortName: teamA?.shortName || m.teamAShortName,
          teamLogo: teamA?.logoUrl,
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          setsWon: 0,
          setsLost: 0,
          pointsScored: 0,
          pointsConceded: 0,
        };
        teamStatsMap.set(m.teamAId, statsA);
      }
      statsA.matchesPlayed += 1;
      statsA.setsWon += canonical.setsWonA;
      statsA.setsLost += canonical.setsWonB;
      statsA.pointsScored += teamAPoints;
      statsA.pointsConceded += teamBPoints;
      if (canonical.winnerSide === 'A') {
        statsA.wins += 1;
      } else if (canonical.winnerSide === 'B') {
        statsA.losses += 1;
      }

      // Atualiza estatísticas da Equipe B
      let statsB = teamStatsMap.get(m.teamBId);
      if (!statsB) {
        statsB = {
          teamId: m.teamBId,
          teamName: teamB?.name || m.teamBName,
          teamShortName: teamB?.shortName || m.teamBShortName,
          teamLogo: teamB?.logoUrl,
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          setsWon: 0,
          setsLost: 0,
          pointsScored: 0,
          pointsConceded: 0,
        };
        teamStatsMap.set(m.teamBId, statsB);
      }
      statsB.matchesPlayed += 1;
      statsB.setsWon += canonical.setsWonB;
      statsB.setsLost += canonical.setsWonA;
      statsB.pointsScored += teamBPoints;
      statsB.pointsConceded += teamAPoints;
      if (canonical.winnerSide === 'B') {
        statsB.wins += 1;
      } else if (canonical.winnerSide === 'A') {
        statsB.losses += 1;
      }
    }

    return {
      matchId: m.id,
      matchNumber: m.matchNumber,
      date: formatDate(m.scheduledTime),
      time: formatTime(m.scheduledTime),
      scheduledTime: m.scheduledTime,
      venue: m.venue || 'Ginásio Principal',
      court: m.court,
      phase: m.phase,
      groupName: m.groupName,
      round: m.round,
      teamAId: m.teamAId,
      teamBId: m.teamBId,
      teamAName: teamA?.name || m.teamAName,
      teamBName: teamB?.name || m.teamBName,
      teamAShortName: teamA?.shortName || m.teamAShortName,
      teamBShortName: teamB?.shortName || m.teamBShortName,
      teamALogo: teamA?.logoUrl,
      teamBLogo: teamB?.logoUrl,
      setsPlayed,
      teamASetsWon: canonical.setsWonA,
      teamBSetsWon: canonical.setsWonB,
      teamAPoints,
      teamBPoints,
      pointDifference,
      winnerId: canonical.winnerId,
      winnerSide: canonical.winnerSide,
      winnerName,
      status: m.status,
      statusLabel: formatMatchStatus(m.status, isWo),
      isWo,
      isCompleted,
      setsScoreLabel,
      setsBreakdownLabel,
      durationLabel: 'Não registrada', // Regra: o domínio não possui cronômetro persistido
      sets: setsDetail,
    };
  });

  // Métricas agregadas
  const totalMatches = matchRows.length;
  const completedMatches = matchRows.filter((r) => r.isCompleted).length;
  const inProgressMatches = matchRows.filter(
    (r) =>
      r.status === 'in-progress' ||
      r.status === 'warmup' ||
      r.status === 'set-break' ||
      r.status === 'timeout',
  ).length;
  const scheduledMatches = matchRows.filter(
    (r) => r.status === 'scheduled' || r.status === 'sheet_available',
  ).length;
  const woMatches = matchRows.filter((r) => r.isWo).length;
  const cancelledMatches = matchRows.filter(
    (r) => r.status === 'cancelled' || r.status === 'postponed',
  ).length;

  const averageSetsPerMatch =
    completedMatches > 0
      ? Number((totalSetsInCompleted / completedMatches).toFixed(2))
      : 0;

  const averagePointsPerMatch =
    completedMatches > 0
      ? Number((totalPointsInCompleted / completedMatches).toFixed(1))
      : 0;

  const averagePointsPerSet =
    allSetsCount > 0
      ? Number((allPointsCount / allSetsCount).toFixed(1))
      : 0;

  // Monta e ordena o resumo das equipes (apenas equipes que possuem ao menos 1 jogo na competição)
  const participatingTeamIds = new Set<string>();
  for (const m of compMatches) {
    if (m.teamAId) participatingTeamIds.add(m.teamAId);
    if (m.teamBId) participatingTeamIds.add(m.teamBId);
  }

  const teamSummaries: TeamStatisticsSummaryRow[] = [...teamStatsMap.values()]
    .filter((t) => participatingTeamIds.has(t.teamId))
    .map((t) => {
      const winRate =
        t.matchesPlayed > 0 ? Math.round((t.wins / t.matchesPlayed) * 100) : 0;
      const setRatio =
        t.setsLost === 0
          ? t.setsWon > 0
            ? 999
            : null
          : Number((t.setsWon / t.setsLost).toFixed(3));
      const pointRatio =
        t.pointsConceded === 0
          ? t.pointsScored > 0
            ? 999
            : null
          : Number((t.pointsScored / t.pointsConceded).toFixed(3));
      const pointBalance = t.pointsScored - t.pointsConceded;

      return {
        teamId: t.teamId,
        teamName: t.teamName,
        teamShortName: t.teamShortName,
        teamLogo: t.teamLogo,
        matchesPlayed: t.matchesPlayed,
        wins: t.wins,
        losses: t.losses,
        winRate,
        setsWon: t.setsWon,
        setsLost: t.setsLost,
        setRatio,
        pointsScored: t.pointsScored,
        pointsConceded: t.pointsConceded,
        pointRatio,
        pointBalance,
      };
    })
    .sort((a, b) => {
      // 1. Vitórias DESC
      if (a.wins !== b.wins) return b.wins - a.wins;
      // 2. Set Ratio DESC
      const ratioA = a.setRatio ?? -1;
      const ratioB = b.setRatio ?? -1;
      if (ratioA !== ratioB) return ratioB - ratioA;
      // 3. Saldo de pontos DESC
      if (a.pointBalance !== b.pointBalance) return b.pointBalance - a.pointBalance;
      // 4. Nome da equipe ASC
      return a.teamName.localeCompare(b.teamName, 'pt-BR');
    });

  return {
    competitionId: competition.id,
    competitionName: competition.name,
    competitionModality: competition.modality,
    metrics: {
      totalMatches,
      completedMatches,
      inProgressMatches,
      scheduledMatches,
      woMatches,
      cancelledMatches,
      totalSetsPlayed: allSetsCount,
      totalPointsScored: allPointsCount,
      averageSetsPerMatch,
      averagePointsPerMatch,
      averagePointsPerSet,
      tiebreakMatchesCount,
      durationNotice:
        'Duração de partida não registrada no domínio atual do BaseOS.',
    },
    matches: matchRows,
    teamSummaries,
  };
}
