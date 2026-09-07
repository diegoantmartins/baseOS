/**
 * competitionBracketViewModel.ts — Projeção Pura do Chaveamento de Competição (Fase 4.9)
 *
 * Responsabilidades:
 * - Projeção 100% pura (sem chamadas de rede ou Supabase)
 * - Mapeamento hierárquico de estágios, rodadas e slots
 * - Tradução de todos os 8 tipos de ParticipantReference para texto em linguagem natural
 * - Detecção estrita de inconsistências entre MatchSlot e Match materializado
 * - Derivação determinística de estados visuais (MatchSlotVisualState)
 * - Suporte compatível e isolado para competições legadas sem MatchSlots relacionais
 *
 * Regra Arquitetural:
 * - A UI NUNCA decide progressão, classificação ou cruzamento.
 * - Apenas projeta os dados canônicos em estruturas prontas para componentes React.
 */

import type {
  CompetitionRecord,
  MatchRecord,
  MatchSlotRecord,
  RoundRecord,
  StageRecord,
  TeamRecord,
} from '@/types/entities';
import type { ParticipantReference } from '@/types/competitionConfig';

// ============================================================================
// TIPOS DO VIEW MODEL
// ============================================================================

export type MatchSlotVisualState =
  | 'pending'                  // Aguardando participantes (nenhum ou parcial)
  | 'partial'                  // Apenas um participante definido
  | 'resolved_unmaterialized'  // Participantes definidos, aguardando materialização pelo Runtime
  | 'materialized'             // Partida esportiva real criada e agendada
  | 'in_progress'              // Partida ao vivo em andamento
  | 'completed'                // Partida concluída com resultado canônico
  | 'bye'                      // Avanço estrutural por isenção (BYE)
  | 'blocked'                  // Estrutura existente que depende de etapas anteriores
  | 'inconsistent';            // Divergência detectada entre Slot e Match

export interface ParticipantViewModel {
  side: 'A' | 'B';
  teamId: string | null;
  displayName: string;
  shortName: string;
  logoUrl?: string;
  seed?: number;
  isResolved: boolean;
  isBye: boolean;
  rawReference?: ParticipantReference;
}

export interface MatchSlotViewModel {
  slotId: string;
  stageId: string;
  stageName: string;
  roundId: string;
  roundName: string;
  roundOrder: number;
  position: number;
  label: string;
  visualState: MatchSlotVisualState;
  participantA: ParticipantViewModel;
  participantB: ParticipantViewModel;
  matchId: string | null;
  matchNumber: number | null;
  canOpenMatch: boolean;        // Boolean(matchId) && match != null
  scheduledTime?: string;
  venue?: string;
  court?: string;
  scoreA?: number;
  scoreB?: number;
  sets?: { a: number; b: number }[];
  winnerTeamId?: string | null;
  winnerSide?: 'A' | 'B' | null;
  isInconsistent: boolean;
  inconsistencyReason?: string;
}

export interface RoundViewModel {
  roundId: string;
  roundOrder: number;
  name: string;
  slotsCount: number;
  status: string;
  slots: MatchSlotViewModel[];
}

export interface StageViewModel {
  stageId: string;
  stageOrder: number;
  name: string;
  stageType: string;
  status: string;
  rounds: RoundViewModel[];
}

export interface PodiumViewModel {
  champion?: TeamRecord | null;
  runnerUp?: TeamRecord | null;
  thirdPlace?: TeamRecord | null;
  isDecided: boolean;
}

export interface CompetitionBracketViewModel {
  competitionId: string;
  competitionName: string;
  isLegacy: boolean;
  hasMatchSlots: boolean;
  stages: StageViewModel[];
  podium?: PodiumViewModel;
}

export interface BuildBracketViewModelInput {
  competition: CompetitionRecord;
  stages?: StageRecord[];
  rounds?: RoundRecord[];
  slots?: MatchSlotRecord[];
  matches?: MatchRecord[];
  teams?: TeamRecord[];
}

// ============================================================================
// FORMATADORES E HELPERS DE PARTICIPANTE
// ============================================================================

/**
 * Traduz uma referência estrutural (ParticipantReference) em texto legível.
 * Nunca vaza IDs artificiais como 'TBD-A-1' ou 'fake-team'.
 */
export function formatParticipantReference(
  ref: ParticipantReference | undefined,
  teamsById: Map<string, TeamRecord>,
  slotsById: Map<string, MatchSlotRecord>,
): { displayName: string; shortName: string } {
  if (!ref) {
    return { displayName: 'A definir', shortName: 'TBD' };
  }

  switch (ref.type) {
    case 'resolved-team': {
      const team = teamsById.get(ref.teamId);
      if (team) {
        return { displayName: team.name, shortName: team.shortName || team.name.slice(0, 3).toUpperCase() };
      }
      return { displayName: `Equipe #${ref.teamId}`, shortName: 'EQP' };
    }

    case 'group-position': {
      const groupLetter = String.fromCharCode(65 + ref.groupIndex);
      return {
        displayName: `${ref.position}º Grupo ${groupLetter}`,
        shortName: `${ref.position}º ${groupLetter}`,
      };
    }

    case 'overall-ranking': {
      return {
        displayName: `${ref.position}º Geral`,
        shortName: `${ref.position}º G`,
      };
    }

    case 'stage-position': {
      return {
        displayName: `${ref.position}º da Fase`,
        shortName: `${ref.position}º F`,
      };
    }

    case 'match-winner': {
      const sourceSlot = slotsById.get(ref.slotId);
      const slotLabel = sourceSlot?.label || ref.slotId;
      return {
        displayName: `Vencedor ${slotLabel}`,
        shortName: `Venc ${slotLabel}`,
      };
    }

    case 'match-loser': {
      const sourceSlot = slotsById.get(ref.slotId);
      const slotLabel = sourceSlot?.label || ref.slotId;
      return {
        displayName: `Perdedor ${slotLabel}`,
        shortName: `Perd ${slotLabel}`,
      };
    }

    case 'seed': {
      return {
        displayName: `Cabeça de Chave ${ref.seedNumber}`,
        shortName: `Seed ${ref.seedNumber}`,
      };
    }

    case 'bye': {
      return {
        displayName: 'BYE',
        shortName: 'BYE',
      };
    }

    default:
      return { displayName: 'A definir', shortName: 'TBD' };
  }
}

/**
 * Constrói a representação de um participante individual (Lado A ou Lado B).
 */
function buildParticipantViewModel(
  side: 'A' | 'B',
  status: string,
  teamId: string | null,
  reference: ParticipantReference | undefined,
  teamsById: Map<string, TeamRecord>,
  slotsById: Map<string, MatchSlotRecord>,
): ParticipantViewModel {
  const isBye = reference?.type === 'bye' || status === 'bye';
  const isResolved = (status === 'resolved' && Boolean(teamId)) || isBye;

  if (isBye) {
    return {
      side,
      teamId: null,
      displayName: 'BYE',
      shortName: 'BYE',
      isResolved: true,
      isBye: true,
      rawReference: reference,
    };
  }

  if (teamId) {
    const team = teamsById.get(teamId);
    if (team) {
      return {
        side,
        teamId,
        displayName: team.name,
        shortName: team.shortName || team.name.slice(0, 3).toUpperCase(),
        logoUrl: team.logoUrl,
        isResolved: true,
        isBye: false,
        rawReference: reference,
      };
    }
    return {
      side,
      teamId,
      displayName: `Equipe #${teamId}`,
      shortName: 'EQP',
      isResolved: true,
      isBye: false,
      rawReference: reference,
    };
  }

  // Participante não resolvido ainda: exibir significado estrutural
  const formatted = formatParticipantReference(reference, teamsById, slotsById);
  return {
    side,
    teamId: null,
    displayName: formatted.displayName,
    shortName: formatted.shortName,
    isResolved: false,
    isBye: false,
    rawReference: reference,
  };
}

/**
 * Calcula o número de sets vencidos por uma equipe em um MatchRecord.
 */
function computeSetsWon(match: MatchRecord, teamSide: 'A' | 'B'): number {
  if (!match.sets || match.sets.length === 0) return 0;
  return match.sets.filter((s) => (teamSide === 'A' ? s.scoreA > s.scoreB : s.scoreB > s.scoreA)).length;
}

// ============================================================================
// CONSTRUTOR PRINCIPAL DO VIEW MODEL
// ============================================================================

export class CompetitionBracketViewModelBuilder {
  /**
   * Constrói o CompetitionBracketViewModel de forma 100% pura.
   */
  public static build(input: BuildBracketViewModelInput): CompetitionBracketViewModel {
    const {
      competition,
      stages = [],
      rounds = [],
      slots = [],
      matches = [],
      teams = [],
    } = input;

    // Se não houver estágios e nem slots no novo modelo, utiliza fallback legado
    if (stages.length === 0 && slots.length === 0) {
      return this.buildLegacy(competition, matches, teams);
    }

    const teamsById = new Map<string, TeamRecord>(teams.map((t) => [t.id, t]));
    const matchesById = new Map<string, MatchRecord>(matches.map((m) => [m.id, m]));
    const matchesBySlotId = new Map<string, MatchRecord>();
    for (const m of matches) {
      if (m.slotId) matchesBySlotId.set(m.slotId, m);
    }
    const slotsById = new Map<string, MatchSlotRecord>(slots.map((s) => [s.slotId, s]));

    // Agrupa rounds por stageRowId
    const roundsByStageId = new Map<string, RoundRecord[]>();
    for (const r of rounds) {
      const list = roundsByStageId.get(r.stageRowId) ?? [];
      list.push(r);
      roundsByStageId.set(r.stageRowId, list);
    }

    // Agrupa slots por roundRowId
    const slotsByRoundId = new Map<string, MatchSlotRecord[]>();
    for (const s of slots) {
      const list = slotsByRoundId.get(s.roundRowId) ?? [];
      list.push(s);
      slotsByRoundId.set(s.roundRowId, list);
    }

    // Ordena stages por stageOrder
    const sortedStages = [...stages].sort((a, b) => a.stageOrder - b.stageOrder);

    const stageViewModels: StageViewModel[] = sortedStages.map((stage) => {
      const stageRounds = (roundsByStageId.get(stage.id) ?? []).sort(
        (a, b) => a.roundOrder - b.roundOrder,
      );

      const roundViewModels: RoundViewModel[] = stageRounds.map((round) => {
        const roundSlots = (slotsByRoundId.get(round.id) ?? []).sort(
          (a, b) => a.position - b.position,
        );

        const slotViewModels: MatchSlotViewModel[] = roundSlots.map((slot) => {
          const participantA = buildParticipantViewModel(
            'A',
            slot.participantAStatus,
            slot.resolvedTeamAId,
            slot.participantAReference,
            teamsById,
            slotsById,
          );

          const participantB = buildParticipantViewModel(
            'B',
            slot.participantBStatus,
            slot.resolvedTeamBId,
            slot.participantBReference,
            teamsById,
            slotsById,
          );

          // Identifica partida materializada (por matchId ou por slot_id)
          const match = (slot.matchId ? matchesById.get(slot.matchId) : null) || matchesBySlotId.get(slot.slotId);

          // ------------------------------------------------------------------
          // Verificação Estrita de Inconsistência (Item 11 dos Requisitos)
          // ------------------------------------------------------------------
          let isInconsistent = false;
          let inconsistencyReason: string | undefined;

          if (slot.matchId && !match) {
            isInconsistent = true;
            inconsistencyReason = `Partida '${slot.matchId}' vinculada ao slot não foi encontrada no banco.`;
          } else if (match) {
            // Se o slot possui time resolvido A, a partida DEVE ter o mesmo timeA
            if (slot.resolvedTeamAId && match.teamAId && slot.resolvedTeamAId !== match.teamAId) {
              isInconsistent = true;
              inconsistencyReason = `Divergência de Equipe A: Slot aponta para '${slot.resolvedTeamAId}' mas Partida possui '${match.teamAId}'.`;
            }
            // Se o slot possui time resolvido B, a partida DEVE ter o mesmo timeB
            if (slot.resolvedTeamBId && match.teamBId && slot.resolvedTeamBId !== match.teamBId) {
              isInconsistent = true;
              inconsistencyReason = `Divergência de Equipe B: Slot aponta para '${slot.resolvedTeamBId}' mas Partida possui '${match.teamBId}'.`;
            }
          }

          // ------------------------------------------------------------------
          // Determinação do Estado Visual (MatchSlotVisualState)
          // ------------------------------------------------------------------
          let visualState: MatchSlotVisualState = 'pending';

          if (isInconsistent) {
            visualState = 'inconsistent';
          } else if (participantA.isBye || participantB.isBye) {
            visualState = 'bye';
          } else if (match) {
            if (match.status === 'completed' || match.status === 'homologated') {
              visualState = 'completed';
            } else if (match.status === 'in-progress') {
              visualState = 'in_progress';
            } else {
              visualState = 'materialized';
            }
          } else if (participantA.isResolved && participantB.isResolved) {
            visualState = 'resolved_unmaterialized';
          } else if (participantA.isResolved || participantB.isResolved) {
            visualState = 'partial';
          } else {
            visualState = 'pending';
          }

          // ------------------------------------------------------------------
          // Placar e Vencedor
          // ------------------------------------------------------------------
          let scoreA: number | undefined;
          let scoreB: number | undefined;
          let sets: { a: number; b: number }[] | undefined;
          let winnerSide: 'A' | 'B' | null = null;
          const winnerTeamId = match?.winnerId ?? null;

          if (match) {
            if (match.sets && match.sets.length > 0) {
              scoreA = computeSetsWon(match, 'A');
              scoreB = computeSetsWon(match, 'B');
              sets = match.sets.map((s) => ({ a: s.scoreA, b: s.scoreB }));
            }
            if (winnerTeamId) {
              if (winnerTeamId === match.teamAId) winnerSide = 'A';
              else if (winnerTeamId === match.teamBId) winnerSide = 'B';
            }
          }

          const canOpenMatch = Boolean(match && match.id);

          return {
            slotId: slot.slotId,
            stageId: stage.stageId,
            stageName: stage.name,
            roundId: round.roundId,
            roundName: round.name,
            roundOrder: round.roundOrder,
            position: slot.position,
            label: slot.label || `${round.name} - Jogo ${slot.position}`,
            visualState,
            participantA,
            participantB,
            matchId: match?.id ?? slot.matchId ?? null,
            matchNumber: match?.matchNumber ?? null,
            canOpenMatch,
            scheduledTime: match?.scheduledTime,
            venue: match?.venue,
            court: match?.court,
            scoreA,
            scoreB,
            sets,
            winnerTeamId,
            winnerSide,
            isInconsistent,
            inconsistencyReason,
          };
        });

        return {
          roundId: round.roundId,
          roundOrder: round.roundOrder,
          name: round.name,
          slotsCount: round.slotsCount,
          status: round.status,
          slots: slotViewModels,
        };
      });

      return {
        stageId: stage.stageId,
        stageOrder: stage.stageOrder,
        name: stage.name,
        stageType: stage.stageType,
        status: stage.status,
        rounds: roundViewModels,
      };
    });

    // Pódio oficial (se disponível na competição)
    const podium: PodiumViewModel = {
      champion: competition.championTeamId ? teamsById.get(competition.championTeamId) : null,
      runnerUp: competition.runnerUpTeamId ? teamsById.get(competition.runnerUpTeamId) : null,
      thirdPlace: competition.thirdPlaceTeamId ? teamsById.get(competition.thirdPlaceTeamId) : null,
      isDecided: Boolean(competition.championTeamId),
    };

    return {
      competitionId: competition.id,
      competitionName: competition.name,
      isLegacy: false,
      hasMatchSlots: slots.length > 0,
      stages: stageViewModels,
      podium,
    };
  }

  /**
   * Adaptador de compatibilidade para competições legadas (sem estágios/slots relacionais).
   * Constrói uma árvore visual genérica a partir dos registros de `matches` pré-existentes.
   */
  public static buildLegacy(
    competition: CompetitionRecord,
    matches: MatchRecord[] = [],
    teams: TeamRecord[] = [],
  ): CompetitionBracketViewModel {
    const teamsById = new Map<string, TeamRecord>(teams.map((t) => [t.id, t]));

    // Filtra apenas jogos que não sejam de fase de grupos
    const playoffMatches = matches.filter(
      (m) =>
        m.competitionId === competition.id &&
        m.phase !== 'group-stage' &&
        m.phase !== 'classificatória' &&
        m.phase !== 'classificatoria',
    );

    // Agrupa por round numérico
    const roundsMap = new Map<number, MatchRecord[]>();
    for (const m of playoffMatches) {
      const r = m.round || 1;
      const list = roundsMap.get(r) ?? [];
      list.push(m);
      roundsMap.set(r, list);
    }

    const sortedRoundNumbers = [...roundsMap.keys()].sort((a, b) => a - b);

    const roundNamesFallback = (order: number, total: number): string => {
      if (order === total) return 'Final';
      if (order === total - 1) return 'Semifinais';
      if (order === total - 2) return 'Quartas de Final';
      if (order === total - 3) return 'Oitavas de Final';
      return `Rodada ${order}`;
    };

    const roundViewModels: RoundViewModel[] = sortedRoundNumbers.map((rNum, idx) => {
      const rMatches = (roundsMap.get(rNum) ?? []).sort((a, b) => a.matchNumber - b.matchNumber);
      const roundName = roundNamesFallback(idx + 1, sortedRoundNumbers.length);

      const slots: MatchSlotViewModel[] = rMatches.map((m, slotIdx) => {
        const teamA = teamsById.get(m.teamAId);
        const teamB = teamsById.get(m.teamBId);

        const isByeA = m.teamAId === '__BYE__' || m.teamAName === 'BYE';
        const isByeB = m.teamBId === '__BYE__' || m.teamBName === 'BYE';

        const participantA: ParticipantViewModel = {
          side: 'A',
          teamId: isByeA ? null : m.teamAId,
          displayName: isByeA ? 'BYE' : (teamA?.name || m.teamAName || 'A definir'),
          shortName: isByeA ? 'BYE' : (teamA?.shortName || m.teamAShortName || 'TBD'),
          logoUrl: teamA?.logoUrl,
          isResolved: !m.teamAId.startsWith('TBD') && !isByeA,
          isBye: isByeA,
        };

        const participantB: ParticipantViewModel = {
          side: 'B',
          teamId: isByeB ? null : m.teamBId,
          displayName: isByeB ? 'BYE' : (teamB?.name || m.teamBName || 'A definir'),
          shortName: isByeB ? 'BYE' : (teamB?.shortName || m.teamBShortName || 'TBD'),
          logoUrl: teamB?.logoUrl,
          isResolved: !m.teamBId.startsWith('TBD') && !isByeB,
          isBye: isByeB,
        };

        let visualState: MatchSlotVisualState = 'materialized';
        if (m.status === 'completed' || m.status === 'homologated') {
          visualState = 'completed';
        } else if (m.status === 'in-progress') {
          visualState = 'in_progress';
        }

        const scoreA = m.sets && m.sets.length > 0 ? computeSetsWon(m, 'A') : undefined;
        const scoreB = m.sets && m.sets.length > 0 ? computeSetsWon(m, 'B') : undefined;

        return {
          slotId: `legacy-slot-${m.id}`,
          stageId: 'legacy-playoffs',
          stageName: 'Fase Eliminatória',
          roundId: `legacy-round-${rNum}`,
          roundName,
          roundOrder: idx + 1,
          position: slotIdx + 1,
          label: `${roundName} - Jogo ${m.matchNumber}`,
          visualState,
          participantA,
          participantB,
          matchId: m.id,
          matchNumber: m.matchNumber,
          canOpenMatch: true,
          scheduledTime: m.scheduledTime,
          venue: m.venue,
          court: m.court,
          scoreA,
          scoreB,
          sets: m.sets?.map((s) => ({ a: s.scoreA, b: s.scoreB })),
          winnerTeamId: m.winnerId ?? null,
          winnerSide: m.winnerId ? (m.winnerId === m.teamAId ? 'A' : 'B') : null,
          isInconsistent: false,
        };
      });

      return {
        roundId: `legacy-round-${rNum}`,
        roundOrder: idx + 1,
        name: roundName,
        slotsCount: slots.length,
        status: 'in-progress',
        slots,
      };
    });

    const stages: StageViewModel[] =
      roundViewModels.length > 0
        ? [
            {
              stageId: 'legacy-playoffs',
              stageOrder: 1,
              name: 'Fase Eliminatória',
              stageType: 'knockout',
              status: competition.status === 'completed' ? 'completed' : 'in-progress',
              rounds: roundViewModels,
            },
          ]
        : [];

    return {
      competitionId: competition.id,
      competitionName: competition.name,
      isLegacy: true,
      hasMatchSlots: false,
      stages,
      podium: {
        champion: competition.championTeamId ? teamsById.get(competition.championTeamId) : null,
        runnerUp: competition.runnerUpTeamId ? teamsById.get(competition.runnerUpTeamId) : null,
        thirdPlace: competition.thirdPlaceTeamId ? teamsById.get(competition.thirdPlaceTeamId) : null,
        isDecided: Boolean(competition.championTeamId),
      },
    };
  }
}
