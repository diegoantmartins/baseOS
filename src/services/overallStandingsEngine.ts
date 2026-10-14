/**
 * BaseOS — OverallStandingsEngine (Motor de Classificação Intergrupos)
 *
 * Responsável por unificar a classificação de múltiplos grupos em um ranking geral consolidado.
 *
 * PRINCÍPIOS:
 * 1. Estratégias Configuráveis: 'by-group-position-first' é a primeira estratégia suportada,
 *    mas a arquitetura permite outras estratégias como 'pure-overall-stats'.
 * 2. Determinismo Matemático: ordenação pura, previsível e estável para a mesma entrada.
 * 3. Consultas Declarativas: provê seletores puros para extração de faixas de posições
 *    (ex: posições 1 a 4 para vaga direta, 5 a 12 para Play-In).
 */

import type { CompetitionRecord, MatchRecord, TiebreakCriterionId } from '@/types/entities';
import type { OverallRankingStrategy } from '@/types/competitionConfig';
import type { StandingsByGroup, TeamStandingResult } from './standingsService';
import { TieBreakEngine } from './tieBreakEngine';

export interface OverallStandingResult extends TeamStandingResult {
  /** Posição original da equipe em seu respectivo grupo (ex: 1º, 2º, 3º) */
  groupPosition: number;
  /** Posição consolidada no ranking geral unificado (1..N) */
  overallRank: number;
}

export interface OverallStandingsOptions {
  /** Estratégia de agregação: 'by-group-position-first' (padrão) ou 'pure-overall-stats' */
  strategy?: OverallRankingStrategy;
  /** Critérios de desempate a serem aplicados no ranking geral */
  criteria?: TiebreakCriterionId[];
  /** Partidas disputadas para desempate */
  matches?: MatchRecord[];
  /** Apenas partidas homologadas */
  onlyHomologated?: boolean;
  /** Registro da competição */
  competition?: CompetitionRecord;
}

export class OverallStandingsEngine {
  /**
   * Consolida a classificação de múltiplos grupos em um ranking unificado.
   */
  public static computeOverallStandings(
    groupStandings: StandingsByGroup,
    options?: OverallStandingsOptions,
  ): OverallStandingResult[] {
    const strategy = options?.strategy ?? 'by-group-position-first';
    const criteria = options?.criteria ?? [
      'points',
      'victories',
      'set-average',
      'points-average',
      'sets-balance',
      'points-balance',
      'draw',
    ];
    const matches = options?.matches ?? [];
    const onlyHomologated = options?.onlyHomologated ?? false;
    const competition = options?.competition;

    // Se for agregação pura baseada em estatísticas globais acumuladas
    if (strategy === 'pure-overall-stats') {
      const allRows: TeamStandingResult[] = [];
      for (const group of groupStandings) {
        for (const row of group.standings) {
          allRows.push({ ...row });
        }
      }

      const sorted = TieBreakEngine.resolveStandings(allRows, matches, criteria, { onlyHomologated, competition });
      return sorted.map((row, idx) => ({
        ...row,
        groupPosition: row.position,
        overallRank: idx + 1,
        position: idx + 1,
      }));
    }

    // Estratégia 'by-group-position-first':
    // Agrupa equipes pela posição em seus respectivos grupos (ex: todos os 1ºs, todos os 2ºs, etc.)
    const maxGroupSize = Math.max(...groupStandings.map(g => g.standings.length), 0);
    const result: OverallStandingResult[] = [];
    let currentOverallRank = 1;

    for (let pos = 1; pos <= maxGroupSize; pos++) {
      // Coleta todas as equipes que ficaram na posição `pos` em seus grupos
      const tierTeams: TeamStandingResult[] = [];

      for (const group of groupStandings) {
        const teamInPos = group.standings.find(s => s.position === pos);
        if (teamInPos) {
          tierTeams.push({ ...teamInPos });
        }
      }

      if (tierTeams.length === 0) continue;

      // Se houver mais de uma equipe e assimetria no número de partidas disputadas (ex: chaves [4, 3, 3])
      const playedCounts = new Set(tierTeams.map((t) => t.matchesPlayed).filter((mp) => mp > 0));
      const hasAsymmetry = playedCounts.size > 1;

      let sortedTier: TeamStandingResult[];
      if (hasAsymmetry) {
        // Ordenação normalizada por partida para justiça esportiva em chaves desiguais (FIVB / CBV)
        sortedTier = [...tierTeams].sort((a, b) => {
          // 1. Pontos normalizados por jogo (points / matchesPlayed)
          const ppa = a.matchesPlayed > 0 ? a.competitionPoints / a.matchesPlayed : 0;
          const ppb = b.matchesPlayed > 0 ? b.competitionPoints / b.matchesPlayed : 0;
          if (Math.abs(ppa - ppb) > 0.0001) return ppb - ppa;

          // 2. Vitórias normalizadas por jogo (victories / matchesPlayed)
          const vpa = a.matchesPlayed > 0 ? a.matchesWon / a.matchesPlayed : 0;
          const vpb = b.matchesPlayed > 0 ? b.matchesWon / b.matchesPlayed : 0;
          if (Math.abs(vpa - vpb) > 0.0001) return vpb - vpa;

          // 3. Set Average / Sets Ratio
          const sra = a.setsRatio;
          const srb = b.setsRatio;
          if (Math.abs(sra - srb) > 0.0001) return srb - sra;

          // 4. Points Average / Points Ratio
          const pra = a.pointsRatio;
          const prb = b.pointsRatio;
          if (Math.abs(pra - prb) > 0.0001) return prb - pra;

          // 5. Saldo de sets normalizado por jogo
          const sba = a.matchesPlayed > 0 ? (a.setsWon - a.setsLost) / a.matchesPlayed : 0;
          const sbb = b.matchesPlayed > 0 ? (b.setsWon - b.setsLost) / b.matchesPlayed : 0;
          if (Math.abs(sba - sbb) > 0.0001) return sbb - sba;

          // 6. Saldo de pontos normalizado por jogo
          const pba = a.matchesPlayed > 0 ? a.pointsBalance / a.matchesPlayed : 0;
          const pbb = b.matchesPlayed > 0 ? b.pointsBalance / b.matchesPlayed : 0;
          if (Math.abs(pba - pbb) > 0.0001) return pbb - pba;

          // 7. Desempate alfabético estável
          return a.teamName.localeCompare(b.teamName);
        });
      } else {
        // Desempata as equipes deste escalão (tier) entre si utilizando os critérios configurados
        sortedTier = TieBreakEngine.resolveStandings(tierTeams, matches, criteria, { onlyHomologated, competition });
      }

      for (const team of sortedTier) {
        result.push({
          ...team,
          groupPosition: pos,
          overallRank: currentOverallRank,
          position: currentOverallRank,
        });
        currentOverallRank++;
      }
    }

    return result;
  }

  /**
   * Retorna apenas os vencedores de grupo (1º colocados de cada chave).
   */
  public static getGroupWinners(overall: OverallStandingResult[]): OverallStandingResult[] {
    return overall.filter(s => s.groupPosition === 1);
  }

  /**
   * Retorna os segundos colocados de cada grupo.
   */
  public static getSecondPlaced(overall: OverallStandingResult[]): OverallStandingResult[] {
    return overall.filter(s => s.groupPosition === 2);
  }

  /**
   * Retorna os terceiros colocados de cada grupo.
   */
  public static getThirdPlaced(overall: OverallStandingResult[]): OverallStandingResult[] {
    return overall.filter(s => s.groupPosition === 3);
  }

  /**
   * Retorna um intervalo fechado de posições do ranking geral (ex: 5 a 12 inclusive).
   * Útil para fases de repescagem / Play-In parametrizadas.
   */
  public static getPositionsRange(
    overall: OverallStandingResult[],
    startRank: number,
    endRank: number,
  ): OverallStandingResult[] {
    return overall.filter(s => s.overallRank >= startRank && s.overallRank <= endRank);
  }
}

export const computeOverallStandings = OverallStandingsEngine.computeOverallStandings;
export const getGroupWinners = OverallStandingsEngine.getGroupWinners;
export const getSecondPlaced = OverallStandingsEngine.getSecondPlaced;
export const getThirdPlaced = OverallStandingsEngine.getThirdPlaced;
export const getPositionsRange = OverallStandingsEngine.getPositionsRange;

