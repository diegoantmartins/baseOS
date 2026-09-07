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

      // Desempata as equipes deste escalão (tier) entre si utilizando os critérios configurados
      const sortedTier = TieBreakEngine.resolveStandings(tierTeams, matches, criteria, { onlyHomologated, competition });

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

