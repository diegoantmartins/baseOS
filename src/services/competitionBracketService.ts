/**
 * CompetitionBracketService — Serviço Canônico de Fases, Chaveamentos e Geração de Partidas
 *
 * Responsabilidades:
 * - Unificação de fases da competição (fase de grupos e chaveamento eliminatório/playoffs)
 * - Validação de integridade estrutural (número de equipes, grupos, sementes/seeds)
 * - Proteção estrita contra destruição ou regeneração de fases com partidas já iniciadas ou disputadas
 * - Avanço canônico de equipes baseado em CompetitionRulesService.getCanonicalMatchResult
 * - Apuração de pódio e integração com CompetitionLifecycleService e CompetitionConfig
 */

import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';
import type { StandingsByGroup, TeamStandingResult } from '@/services/standingsService';
import { CompetitionRulesService } from './competitionRulesService';
import {
  generateTwoGroupPlayoffs,
  generateFourGroupPlayoffs,
  buildPlayoffMatches,
  advancePlayoffMatches,
  computePodium,
  type PlayoffMatchSlot,
} from './playoffsService';

export interface BracketCheckResult {
  ok: boolean;
  errors: string[];
}

/**
 * Gera chaveamento para competição de 1 grupo único (torneio round-robin geral).
 * - Se houver pelo menos 2 equipes: Final (1º x 2º).
 * - Se houver pelo menos 4 equipes: Disputa de 3º Lugar (3º x 4º) e Final (1º x 2º).
 */
export function generateSingleGroupPlayoffs(standings: TeamStandingResult[]): PlayoffMatchSlot[] {
  const getTeamAt = (pos: number): { description: string; teamId?: string } => {
    const s = standings.find((row) => row.position === pos);
    return {
      description: `${pos}º Colocado Geral`,
      teamId: s?.teamId,
    };
  };

  const slots: PlayoffMatchSlot[] = [];

  if (standings.length >= 4) {
    slots.push({
      phase: 'terceiro_lugar',
      matchIndex: 1,
      label: 'Disputa de 3º Lugar',
      sourceTeamA: getTeamAt(3),
      sourceTeamB: getTeamAt(4),
    });
  }

  if (standings.length >= 2) {
    slots.push({
      phase: 'final',
      matchIndex: slots.length + 1,
      label: 'Grande Final',
      sourceTeamA: getTeamAt(1),
      sourceTeamB: getTeamAt(2),
    });
  }

  return slots;
}

export class CompetitionBracketService {
  /**
   * Avalia se a fase de grupos pode ser gerada, alterada ou re-sorteada.
   * Regra absoluta: Se qualquer partida da fase classificatória já tiver sido iniciada,
   * possuir parciais cadastradas ou estiver finalizada/homologada, a estrutura esportiva
   * está congelada para preservar o histórico.
   */
  public static canModifyGroupStage(
    competition: CompetitionRecord,
    matches: MatchRecord[] = [],
  ): BracketCheckResult {
    const errors: string[] = [];

    if (competition.status === 'completed' || competition.status === 'cancelled') {
      errors.push(`Competição está ${competition.status === 'completed' ? 'concluída' : 'cancelada'}. Alterações de fase bloqueadas.`);
    }

    const groupMatches = matches.filter(
      (m) =>
        m.competitionId === competition.id &&
        (!m.phase || m.phase === 'classificatória' || m.phase === 'classificatoria'),
    );

    const hasStartedOrPlayedMatches = groupMatches.some(
      (m) =>
        m.status === 'in-progress' ||
        m.status === 'completed' ||
        m.status === 'homologated' ||
        (m.sets && m.sets.length > 0),
    );

    if (hasStartedOrPlayedMatches) {
      errors.push(
        'Não é permitido alterar ou re-sortear a fase de grupos pois já existem partidas em andamento ou finalizadas.',
      );
    }

    return { ok: errors.length === 0, errors };
  }

  /**
   * Avalia se o chaveamento eliminatório (playoffs) pode ser gerado ou regenerado.
   * Regra: Se qualquer partida eliminatória já tiver sido jogada, o chaveamento não pode ser resetado.
   */
  public static canModifyPlayoffs(
    competition: CompetitionRecord,
    matches: MatchRecord[] = [],
  ): BracketCheckResult {
    const errors: string[] = [];

    if (competition.status === 'completed' || competition.status === 'cancelled') {
      errors.push(`Competição está ${competition.status === 'completed' ? 'concluída' : 'cancelada'}. Alterações de playoffs bloqueadas.`);
    }

    const playoffMatches = matches.filter(
      (m) =>
        m.competitionId === competition.id &&
        m.phase &&
        m.phase !== 'classificatória' &&
        m.phase !== 'classificatoria',
    );

    const hasStartedPlayoffs = playoffMatches.some(
      (m) =>
        m.status === 'in-progress' ||
        m.status === 'completed' ||
        m.status === 'homologated' ||
        (m.sets && m.sets.length > 0),
    );

    if (hasStartedPlayoffs) {
      errors.push(
        'Não é permitido regenerar o chaveamento eliminatório pois já existem partidas dos playoffs em andamento ou finalizadas.',
      );
    }

    return { ok: errors.length === 0, errors };
  }

  /**
   * Gera a grade canônica de playoffs com base na quantidade de grupos e na classificação oficial.
   */
  public static generatePlayoffSlots(
    competition: CompetitionRecord,
    groupStandings: StandingsByGroup,
    overallStandings?: TeamStandingResult[],
  ): PlayoffMatchSlot[] {
    const groupsCount = groupStandings.length;

    if (groupsCount >= 4) {
      return generateFourGroupPlayoffs(groupStandings);
    }

    if (groupsCount === 2) {
      return generateTwoGroupPlayoffs(groupStandings);
    }

    if (groupsCount === 1) {
      const standings = groupStandings[0]?.standings ?? overallStandings ?? [];
      return generateSingleGroupPlayoffs(standings);
    }

    if (overallStandings && overallStandings.length >= 2) {
      return generateSingleGroupPlayoffs(overallStandings);
    }

    return [];
  }

  /**
   * Constrói os registros de partida de playoffs respeitando os formatos de set de cada fase.
   */
  public static buildPlayoffMatchRecords(
    competition: CompetitionRecord,
    slots: PlayoffMatchSlot[],
    teams: TeamRecord[],
    startMatchNumber: number,
  ): Array<Omit<MatchRecord, 'id' | 'createdAt' | 'updatedAt'>> {
    return buildPlayoffMatches(competition, slots, teams, startMatchNumber);
  }

  /**
   * Propaga avanços de vencedores e perdedores nos playoffs usando estritamente o Resultado Canônico.
   */
  public static advancePlayoffBrackets(
    competition: CompetitionRecord,
    matches: MatchRecord[],
    teams: TeamRecord[],
  ): { updatedMatches: MatchRecord[]; changed: boolean } {
    return advancePlayoffMatches(matches, teams, competition);
  }

  /**
   * Apura o pódio esportivo oficial da competição através dos resultados canônicos da final e 3º lugar.
   */
  public static getPodium(
    competition: CompetitionRecord,
    matches: MatchRecord[],
  ) {
    return computePodium(matches, competition);
  }
}
