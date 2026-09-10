/**
 * BaseOS — TieBreakEngine (Motor de Desempate e Resolução de Mini-Tabela)
 *
 * Responsável por ordenar deterministicamente equipes empatadas sem violar transitividade,
 * aplicando o algoritmo canônico de Mini-Tabela (H2H Multi-Equipe) para 2, 3 ou mais equipes.
 *
 * PRINCÍPIOS:
 * 1. Respeito Estrito à Configuração: consome a ordem de tiebreakCriteriaOrder definida no regulamento.
 *    Nunca introduz fallbacks implícitos não configurados.
 * 2. Algoritmo por Particionamento: em vez de Array.sort com comparator não transitivo,
 *    agrupa equipes em classes de equivalência (blocos de empate) e refina sucessivamente cada bloco.
 * 3. Mini-Tabela para 3+ Equipes: quando o critério de confronto direto é aplicado a 3+ equipes,
 *    avalia-se exclusivamente o subconjunto de partidas jogadas entre essas equipes.
 * 4. Resolução Recursiva de Subconjuntos: se a mini-tabela separa uma ou mais equipes (ex: A > B = C),
 *    o subconjunto restante (B e C) é resolvido de acordo com as regras aplicáveis.
 * 5. Ciclos Irredutíveis e Empate Não Resolvido: se um ciclo for matematicamente idêntico,
 *    o bloco avança para o próximo critério configurado. Se todos os critérios se esgotarem sem desempate,
 *    retorna estado explícito de empate não resolvido (unresolvedTie = true), sem inventar sorteio.
 */

import type { CompetitionRecord, MatchRecord, TiebreakCriterionId } from '@/types/entities';
import type { TeamStandingResult } from './standingsService';
import { accumulateStats, headToHeadWinner } from './standingsService';

export interface MiniTableStats {
  teamId: string;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  setsWon: number;
  setsLost: number;
  setsBalance?: number;
  setsRatio: number;
  pointsWon: number;
  pointsLost: number;
  pointsBalance: number;
  pointsRatio: number;
  competitionPoints: number;
}

export class TieBreakEngine {
  /**
   * Ordena uma lista de equipes utilizando particionamento determinístico e mini-tabela.
   */
  public static resolveStandings(
    rows: TeamStandingResult[],
    matches: MatchRecord[],
    criteriaOrder: TiebreakCriterionId[],
    options?: { onlyHomologated?: boolean; competition?: CompetitionRecord },
  ): TeamStandingResult[] {
    if (rows.length <= 1) {
      return rows.map((r, idx) => ({ ...r, position: idx + 1 }));
    }

    const onlyHomologated = options?.onlyHomologated ?? false;
    const competition = options?.competition;

    // Inicialmente, todas as equipes formam uma única partição não ordenada
    let partitions: TeamStandingResult[][] = [rows.map(r => ({ ...r }))];

    for (const criterion of criteriaOrder) {
      const nextPartitions: TeamStandingResult[][] = [];

      for (const partition of partitions) {
        if (partition.length <= 1) {
          nextPartitions.push(partition);
          continue;
        }

        // Refina a partição aplicando o critério atual
        const refined = this.refinePartition(partition, criterion, matches, criteriaOrder, onlyHomologated, competition);
        if (refined.length > 1 && criterion !== 'points') {
          const topGroup = refined[0];
          const secondGroup = refined[1];
          if (topGroup.length > 0 && secondGroup.length > 0) {
            const topTeam = topGroup[0];
            const otherTeam = secondGroup[0];
            for (const team of topGroup) {
              if (!team.tiebreakReason) {
                team.tiebreakReason = this.buildReason(criterion, topTeam, otherTeam);
              }
            }
          }
        }
        nextPartitions.push(...refined);
      }

      partitions = nextPartitions;

      // Se todas as partições foram reduzidas a tamanho 1, o desempate está 100% resolvido
      if (partitions.every(p => p.length === 1)) {
        break;
      }
    }

    // Achatar as partições e atribuir posições
    const result: TeamStandingResult[] = [];
    let currentPosition = 1;

    for (const partition of partitions) {
      const isUnresolved = partition.length > 1;
      const tiePos = currentPosition;

      for (const row of partition) {
        row.position = tiePos;
        if (isUnresolved) {
          row.isTied = true;
          row.unresolvedTie = true;
          if (!row.tiebreakReason) {
            row.tiebreakReason = `Empate não resolvido após aplicação de todos os critérios configurados`;
          }
        }
        result.push(row);
      }

      currentPosition += partition.length;
    }

    return result;
  }

  /**
   * Refina uma partição de equipes empatadas aplicando um critério específico.
   */
  private static refinePartition(
    partition: TeamStandingResult[],
    criterion: TiebreakCriterionId,
    matches: MatchRecord[],
    criteriaOrder: TiebreakCriterionId[],
    onlyHomologated: boolean,
    competition?: CompetitionRecord,
  ): TeamStandingResult[][] {
    switch (criterion) {
      case 'points':
        return this.groupByMetric(partition, r => r.competitionPoints, 'desc');

      case 'victories':
        return this.groupByMetric(partition, r => r.matchesWon, 'desc');

      case 'sets-balance':
        return this.groupByMetric(partition, r => r.setsBalance ?? (r.setsWon - r.setsLost), 'desc');

      case 'set-average':
      case 'sets-ratio':
        return this.groupByMetric(partition, r => r.setsRatio, 'desc');

      case 'points-balance':
        return this.groupByMetric(partition, r => r.pointsBalance, 'desc');

      case 'points-average':
      case 'points-ratio':
        return this.groupByMetric(partition, r => r.pointsRatio, 'desc');

      case 'head-to-head':
      case 'head-to-head-mini-table':
        return this.resolveHeadToHead(partition, matches, criteriaOrder, onlyHomologated, competition);

      case 'draw':
        // Sorteio determinístico configurado explicitamente
        return this.resolveDeterministicDraw(partition);

      default:
        // Critério desconhecido não altera a partição
        return [partition];
    }
  }

  /**
   * Agrupa equipes por uma métrica quantitativa e ordena os grupos.
   */
  private static groupByMetric(
    partition: TeamStandingResult[],
    getMetric: (r: TeamStandingResult) => number,
    direction: 'desc' | 'asc',
  ): TeamStandingResult[][] {
    const groups = new Map<number, TeamStandingResult[]>();

    for (const row of partition) {
      const val = getMetric(row);
      // Arredonda para 4 casas decimais para evitar imprecisões infinitesimais de float
      const key = Math.round(val * 10000) / 10000;
      const list = groups.get(key) ?? [];
      list.push(row);
      groups.set(key, list);
    }

    const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
      return direction === 'desc' ? b - a : a - b;
    });

    return sortedKeys.map(k => groups.get(k)!);
  }

  /**
   * Resolve o confronto direto (H2H) para 2 ou mais equipes.
   */
  private static resolveHeadToHead(
    partition: TeamStandingResult[],
    matches: MatchRecord[],
    criteriaOrder: TiebreakCriterionId[],
    onlyHomologated: boolean,
    competition?: CompetitionRecord,
  ): TeamStandingResult[][] {
    // Caso 1: 2 Equipes -> Confronto direto tradicional
    if (partition.length === 2) {
      const [teamA, teamB] = partition;
      const winnerId = headToHeadWinner(matches, teamA.teamId, teamB.teamId, onlyHomologated, competition);

      if (winnerId === teamA.teamId) {
        teamA.tiebreakReason = `Venceu o confronto direto contra ${teamB.teamName}`;
        return [[teamA], [teamB]];
      }
      if (winnerId === teamB.teamId) {
        teamB.tiebreakReason = `Venceu o confronto direto contra ${teamA.teamName}`;
        return [[teamB], [teamA]];
      }

      // Empate no confronto direto (ou não jogaram ainda) -> permanecem juntas
      return [partition];
    }

    // Caso 2: 3 ou mais Equipes -> Construção e Avaliação da MINI-TABELA
    return this.resolveMiniTable(partition, matches, criteriaOrder, onlyHomologated, competition);
  }

  /**
   * Constrói a mini-tabela isolada entre as equipes envolvidas no empate.
   */
  public static buildMiniTable(
    teams: TeamStandingResult[],
    matches: MatchRecord[],
    options?: { onlyHomologated?: boolean; competition?: CompetitionRecord },
  ): Map<string, MiniTableStats> {
    const teamIds = new Set(teams.map(t => t.teamId));
    const onlyHomologated = options?.onlyHomologated ?? false;
    const competition = options?.competition;

    // Isola partidas onde AMBAS as equipes pertencem ao subgrupo empatado
    const internalMatches = matches.filter(m => {
      return teamIds.has(m.teamAId) && teamIds.has(m.teamBId);
    });

    const miniStatsMap = new Map<string, MiniTableStats>();

    for (const team of teams) {
      const stats = accumulateStats(internalMatches, team.teamId, onlyHomologated, competition);
      miniStatsMap.set(team.teamId, {
        teamId: team.teamId,
        ...stats,
      });
    }

    return miniStatsMap;
  }

  /**
   * Avalia o desempate na Mini-Tabela de acordo com critérios da mini-tabela.
   */
  private static resolveMiniTable(
    partition: TeamStandingResult[],
    matches: MatchRecord[],
    criteriaOrder: TiebreakCriterionId[],
    onlyHomologated: boolean,
    competition?: CompetitionRecord,
  ): TeamStandingResult[][] {
    const miniStatsMap = this.buildMiniTable(partition, matches, { onlyHomologated, competition });

    // Critérios avaliados DENTRO da mini-tabela (pontos internos, vitórias internas, set ratio interno, point ratio interno)
    const miniCriteria: Array<(stats: MiniTableStats) => number> = [
      s => s.competitionPoints,
      s => s.matchesWon,
      s => s.setsRatio,
      s => s.pointsRatio,
    ];

    let currentGroups: TeamStandingResult[][] = [partition];

    for (const getMiniMetric of miniCriteria) {
      const nextGroups: TeamStandingResult[][] = [];

      for (const group of currentGroups) {
        if (group.length <= 1) {
          nextGroups.push(group);
          continue;
        }

        // Agrupa pelo critério da mini-tabela
        const grouped = this.groupByMetric(group, r => {
          const stats = miniStatsMap.get(r.teamId);
          return stats ? getMiniMetric(stats) : 0;
        }, 'desc');

        // Se o agrupamento conseguiu separar equipes (ex: A > B e C)
        if (grouped.length > 1) {
          for (const subGroup of grouped) {
            // Se o subgrupo ainda tiver 2 equipes, reavalia confronto direto entre as duas
            if (subGroup.length === 2) {
              const h2h = this.resolveHeadToHead(subGroup, matches, criteriaOrder, onlyHomologated, competition);
              nextGroups.push(...h2h);
            } else if (subGroup.length > 2 && subGroup.length < group.length) {
              // Subgrupo menor que 3+ equipes: recursão na mini-tabela menor
              const rec = this.resolveMiniTable(subGroup, matches, criteriaOrder, onlyHomologated, competition);
              nextGroups.push(...rec);
            } else {
              nextGroups.push(subGroup);
            }
          }
        } else {
          // Todas as equipes do grupo empataram neste critério da mini-tabela
          nextGroups.push(group);
        }
      }

      currentGroups = nextGroups;

      // Se separou tudo, encerra avaliação da mini-tabela
      if (currentGroups.every(g => g.length === 1)) {
        break;
      }
    }

    // Se houve separação (parcial ou total)
    if (currentGroups.length > 1) {
      for (const g of currentGroups) {
        if (g.length === 1) {
          g[0].tiebreakReason = `Desempatado por Mini-Tabela de Confronto Direto`;
        }
      }
      return currentGroups;
    }

    // Se a mini-tabela resultou em ciclo irredutível ou empate perfeito (todas iguais),
    // NÃO tenta adivinhar nem inventar fallback. Retorna a partição intacta para que
    // o algoritmo continue para o PRÓXIMO critério configurado em tiebreakCriteriaOrder.
    return [partition];
  }

  /**
   * Resolução por sorteio determinístico estável (alfanumérico do ID do time).
   */
  private static resolveDeterministicDraw(partition: TeamStandingResult[]): TeamStandingResult[][] {
    const sorted = [...partition].sort((a, b) => a.teamId.localeCompare(b.teamId));
    return sorted.map((row) => {
      row.tiebreakReason = `Desempate por sorteio determinístico (Critério 'draw')`;
      return [row];
    });
  }

  /**
   * Constrói explicação textual do desempate para exibição na classificação.
   */
  private static buildReason(
    criterion: TiebreakCriterionId,
    top: TeamStandingResult,
    other: TeamStandingResult,
  ): string {
    switch (criterion) {
      case 'victories':
        return `${top.teamName} tem mais vitórias (${top.matchesWon} vs ${other.matchesWon})`;
      case 'sets-balance':
        return `${top.teamName} tem melhor saldo de sets (${top.setsBalance ?? (top.setsWon - top.setsLost)} vs ${other.setsBalance ?? (other.setsWon - other.setsLost)})`;
      case 'set-average':
      case 'sets-ratio':
        return `${top.teamName} tem melhor set average (${top.setsRatio.toFixed(3)} vs ${other.setsRatio.toFixed(3)})`;
      case 'points-balance':
        return `${top.teamName} tem melhor saldo de pontos (${top.pointsBalance} vs ${other.pointsBalance})`;
      case 'points-average':
      case 'points-ratio':
        return `${top.teamName} tem melhor pontos average (${top.pointsRatio.toFixed(3)} vs ${other.pointsRatio.toFixed(3)})`;
      default:
        return `Desempatado pelo critério ${criterion}`;
    }
  }
}
