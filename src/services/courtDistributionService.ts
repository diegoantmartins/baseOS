/**
 * BaseOS — Court Distribution Service
 *
 * Gerencia o agendamento e a alocação dinâmica de quadras simultâneas (ex: Quadra 1 e Quadra 2),
 * com validação de conflitos de horário e alertas de descanso mínimo entre partidas consecutivas.
 */

import type { MatchRecord } from '@/types/entities';

export interface CourtDistributionProposal {
  matchId: string;
  matchNumber: number;
  scheduledTime: string;
  teamAName: string;
  teamBName: string;
  assignedCourt: 'Quadra 1' | 'Quadra 2';
  previousCourt?: string;
}

export interface RestWarning {
  teamName: string;
  teamId: string;
  matchA: { id: string; matchNumber: number; time: string; court: string };
  matchB: { id: string; matchNumber: number; time: string; court: string };
  reason: string;
}

export interface CourtDistributionResult {
  proposals: CourtDistributionProposal[];
  warnings: RestWarning[];
  court1Count: number;
  court2Count: number;
}

/**
 * Distribui automaticamente partidas entre 'Quadra 1' e 'Quadra 2'.
 *
 * Regras do Algoritmo:
 * 1. Ordena cronologicamente por horário de início e depois por matchNumber.
 * 2. Agrupa por slots de horário:
 *    - Se houver 2 partidas no mesmo horário, uma vai para Quadra 1 e outra para Quadra 2.
 *    - Se as partidas tiverem horários sequenciais/únicos, alterna 1 a 1 entre Quadra 1 e Quadra 2.
 * 3. Valida se uma mesma equipe possui jogos no mesmo horário (conflito crítico)
 *    ou jogos consecutivos sem intervalo mínimo de descanso (alerta de descanso).
 */
export function distributeCourtsDynamically(
  matches: MatchRecord[],
  targetPhase = 'group-stage'
): CourtDistributionResult {
  // Filtra partidas da fase solicitada (ou todas se não houver fase)
  const eligibleMatches = matches.filter((m) => {
    if (!targetPhase) return true;
    if (targetPhase === 'group-stage') {
      return !m.phase || m.phase === 'group-stage' || m.phase === 'classificatória';
    }
    return m.phase === targetPhase;
  });

  // Ordena cronologicamente
  const sorted = [...eligibleMatches].sort((a, b) => {
    const timeA = new Date(a.scheduledTime).getTime() || 0;
    const timeB = new Date(b.scheduledTime).getTime() || 0;
    if (timeA !== timeB) return timeA - timeB;
    return (a.matchNumber || 0) - (b.matchNumber || 0);
  });

  const proposals: CourtDistributionProposal[] = [];
  const timeSlotMap = new Map<string, MatchRecord[]>();

  for (const m of sorted) {
    const timeKey = m.scheduledTime ? m.scheduledTime.slice(0, 16) : 'sem_horario';
    const list = timeSlotMap.get(timeKey) || [];
    list.push(m);
    timeSlotMap.set(timeKey, list);
  }

  let alternateIndex = 0;

  for (const [_, slotMatches] of timeSlotMap.entries()) {
    if (slotMatches.length >= 2) {
      // Slot com múltiplas partidas simultâneas
      slotMatches.forEach((m, idx) => {
        const assignedCourt: 'Quadra 1' | 'Quadra 2' = idx % 2 === 0 ? 'Quadra 1' : 'Quadra 2';
        proposals.push({
          matchId: m.id,
          matchNumber: m.matchNumber,
          scheduledTime: m.scheduledTime,
          teamAName: m.teamAName,
          teamBName: m.teamBName,
          assignedCourt,
          previousCourt: m.court,
        });
      });
    } else {
      // Partida avulsa ou sequencial: alterna entre quadras
      const m = slotMatches[0];
      const assignedCourt: 'Quadra 1' | 'Quadra 2' = alternateIndex % 2 === 0 ? 'Quadra 1' : 'Quadra 2';
      proposals.push({
        matchId: m.id,
        matchNumber: m.matchNumber,
        scheduledTime: m.scheduledTime,
        teamAName: m.teamAName,
        teamBName: m.teamBName,
        assignedCourt,
        previousCourt: m.court,
      });
      alternateIndex++;
    }
  }

  // Análise de Conflitos e Descanso por Equipe
  const warnings: RestWarning[] = [];
  const teamMatchesMap = new Map<
    string,
    { teamName: string; matches: { match: MatchRecord; proposal: CourtDistributionProposal }[] }
  >();

  for (const prop of proposals) {
    const m = sorted.find((match) => match.id === prop.matchId);
    if (!m) continue;

    // Time A
    const listA = teamMatchesMap.get(m.teamAId) || { teamName: m.teamAName, matches: [] };
    listA.matches.push({ match: m, proposal: prop });
    teamMatchesMap.set(m.teamAId, listA);

    // Time B
    const listB = teamMatchesMap.get(m.teamBId) || { teamName: m.teamBName, matches: [] };
    listB.matches.push({ match: m, proposal: prop });
    teamMatchesMap.set(m.teamBId, listB);
  }

  // Verifica intervalos de descanso entre partidas consecutivas da mesma equipe
  for (const [teamId, entry] of teamMatchesMap.entries()) {
    const teamMatches = entry.matches.sort((a, b) => {
      const tA = new Date(a.match.scheduledTime).getTime() || 0;
      const tB = new Date(b.match.scheduledTime).getTime() || 0;
      return tA - tB;
    });

    for (let i = 0; i < teamMatches.length - 1; i++) {
      const current = teamMatches[i];
      const next = teamMatches[i + 1];

      const currentTime = new Date(current.match.scheduledTime).getTime() || 0;
      const nextTime = new Date(next.match.scheduledTime).getTime() || 0;
      const diffMinutes = (nextTime - currentTime) / (1000 * 60);

      // Conflito simultâneo
      if (currentTime === nextTime && currentTime > 0) {
        warnings.push({
          teamName: entry.teamName,
          teamId,
          matchA: {
            id: current.match.id,
            matchNumber: current.match.matchNumber,
            time: current.match.scheduledTime,
            court: current.proposal.assignedCourt,
          },
          matchB: {
            id: next.match.id,
            matchNumber: next.match.matchNumber,
            time: next.match.scheduledTime,
            court: next.proposal.assignedCourt,
          },
          reason: `A equipe ${entry.teamName} está escalada para dois jogos simultâneos no mesmo horário (#${current.match.matchNumber} e #${next.match.matchNumber}).`,
        });
      } else if (diffMinutes > 0 && diffMinutes <= 60) {
        // Intervalo menor ou igual a 60 minutos (jogos consecutivos sem descanso regulamentar)
        warnings.push({
          teamName: entry.teamName,
          teamId,
          matchA: {
            id: current.match.id,
            matchNumber: current.match.matchNumber,
            time: current.match.scheduledTime,
            court: current.proposal.assignedCourt,
          },
          matchB: {
            id: next.match.id,
            matchNumber: next.match.matchNumber,
            time: next.match.scheduledTime,
            court: next.proposal.assignedCourt,
          },
          reason: `A equipe ${entry.teamName} joga partidas consecutivas (Jogos #${current.match.matchNumber} e #${next.match.matchNumber}) com apenas ${Math.round(diffMinutes)}min de intervalo.`,
        });
      }
    }
  }

  const court1Count = proposals.filter((p) => p.assignedCourt === 'Quadra 1').length;
  const court2Count = proposals.filter((p) => p.assignedCourt === 'Quadra 2').length;

  return {
    proposals,
    warnings,
    court1Count,
    court2Count,
  };
}
