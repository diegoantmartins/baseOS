/**
 * BaseOS — ParticipantResolutionEngine (Motor Puro de Resolução de Participantes)
 *
 * Responsável por:
 * 1. Avaliar referências abstratas de participantes (ParticipantReference) contra o estado atual do torneio;
 * 2. Determinar o status determinístico: 'resolved', 'unresolved', 'invalid' ou 'bye';
 * 3. Resolver vencedores e perdedores de partidas a partir de CanonicalMatchResult homologados;
 * 4. Tratar folgas esportivas (BYE) como avanço automático do adversário, sem equipes fictícias;
 * 5. Resolver posições de fase de grupos e ranking intergrupos unificado.
 *
 * MODO: Domínio Puro em Memória (Sem dependência de banco, I/O ou UI).
 */

import type {
  CanonicalMatchResult,
  MatchSlot,
  ParticipantReference,
  ParticipantResolutionStatus,
  ParticipantSlotState,
} from '@/types/competitionConfig';
import type { TeamRecord } from '@/types/entities';
import type { OverallStandingResult } from './overallStandingsEngine';
import type { StandingsByGroup } from './standingsService';

export interface ResolutionContext {
  teams?: TeamRecord[];
  standingsByStage?: Record<string, StandingsByGroup>;
  overallStandingsByStage?: Record<string, OverallStandingResult[]>;
  canonicalResultsBySlot?: Record<string, CanonicalMatchResult>;
  slotsById?: Record<string, MatchSlot>;
}

export class ParticipantResolutionEngine {
  /**
   * Resolve uma referência de participante pura contra o contexto da competição.
   */
  public static resolveReference(
    reference: ParticipantReference,
    side: 'A' | 'B',
    context: ResolutionContext = {},
  ): ParticipantSlotState {
    switch (reference.type) {
      case 'bye': {
        return {
          side,
          reference,
          status: 'bye',
          resolvedTeamId: null,
          displayPlaceholder: 'BYE',
          isBye: true,
        };
      }

      case 'resolved-team': {
        const team = context.teams?.find(t => t.id === reference.teamId);
        const name = team?.name ?? reference.teamName ?? reference.teamId;

        return {
          side,
          reference,
          status: 'resolved',
          resolvedTeamId: reference.teamId,
          resolvedTeamName: name,
          displayPlaceholder: name,
          isBye: false,
        };
      }

      case 'seed': {
        // Se houver time mapeado por seed
        return {
          side,
          reference,
          status: 'unresolved',
          resolvedTeamId: null,
          displayPlaceholder: `Seed ${reference.seedNumber}`,
          isBye: false,
        };
      }

      case 'group-position': {
        const groupStandings = context.standingsByStage?.[reference.stageId];
        const groupIndex = reference.groupIndex;
        const pos = reference.position;
        const groupLetter = String.fromCharCode(65 + groupIndex);
        const defaultPlaceholder = `${pos}º Colocado - Grupo ${groupLetter}`;

        if (!groupStandings) {
          return {
            side,
            reference,
            status: 'unresolved',
            resolvedTeamId: null,
            displayPlaceholder: defaultPlaceholder,
            isBye: false,
          };
        }

        const targetGroup = groupStandings[groupIndex];
        if (!targetGroup) {
          return {
            side,
            reference,
            status: 'invalid',
            resolvedTeamId: null,
            displayPlaceholder: `Grupo inválido (${groupIndex})`,
            isBye: false,
          };
        }

        const standingRow = targetGroup.standings.find(s => s.position === pos);
        if (!standingRow) {
          // Posição ainda não consolidada ou fora do número de equipes do grupo
          if (pos > targetGroup.standings.length && targetGroup.standings.length > 0) {
            return {
              side,
              reference,
              status: 'invalid',
              resolvedTeamId: null,
              displayPlaceholder: `Posição ${pos} inválida no Grupo ${groupLetter}`,
              isBye: false,
            };
          }

          return {
            side,
            reference,
            status: 'unresolved',
            resolvedTeamId: null,
            displayPlaceholder: defaultPlaceholder,
            isBye: false,
          };
        }

        const team = context.teams?.find(t => t.id === standingRow.teamId);
        const teamName = team?.name ?? standingRow.teamName ?? standingRow.teamId;

        return {
          side,
          reference,
          status: 'resolved',
          resolvedTeamId: standingRow.teamId,
          resolvedTeamName: teamName,
          displayPlaceholder: teamName,
          isBye: false,
        };
      }

      case 'overall-ranking': {
        const overall = context.overallStandingsByStage?.[reference.stageId];
        const pos = reference.position;
        const defaultPlaceholder = `${pos}º Colocado Geral`;

        if (!overall || overall.length === 0) {
          return {
            side,
            reference,
            status: 'unresolved',
            resolvedTeamId: null,
            displayPlaceholder: defaultPlaceholder,
            isBye: false,
          };
        }

        let candidates = overall;
        if (reference.filter === 'group-winners-only') {
          candidates = overall.filter(r => r.groupPosition === 1);
        } else if (reference.filter === 'group-runners-up-only') {
          candidates = overall.filter(r => r.groupPosition === 2);
        } else if (reference.filter === 'non-winners') {
          candidates = overall.filter(r => r.groupPosition > 1);
        }

        const row = candidates.find(r => r.overallRank === pos || r.position === pos);
        if (!row) {
          return {
            side,
            reference,
            status: 'unresolved',
            resolvedTeamId: null,
            displayPlaceholder: defaultPlaceholder,
            isBye: false,
          };
        }

        const team = context.teams?.find(t => t.id === row.teamId);
        const teamName = team?.name ?? row.teamName ?? row.teamId;

        return {
          side,
          reference,
          status: 'resolved',
          resolvedTeamId: row.teamId,
          resolvedTeamName: teamName,
          displayPlaceholder: teamName,
          isBye: false,
        };
      }

      case 'stage-position': {
        const overall = context.overallStandingsByStage?.[reference.stageId];
        const pos = reference.position;
        const defaultPlaceholder = `${pos}º Colocado da Fase`;

        if (!overall || overall.length === 0) {
          return {
            side,
            reference,
            status: 'unresolved',
            resolvedTeamId: null,
            displayPlaceholder: defaultPlaceholder,
            isBye: false,
          };
        }

        const row = overall.find(r => r.position === pos || r.overallRank === pos);
        if (!row) {
          return {
            side,
            reference,
            status: 'unresolved',
            resolvedTeamId: null,
            displayPlaceholder: defaultPlaceholder,
            isBye: false,
          };
        }

        const team = context.teams?.find(t => t.id === row.teamId);
        const teamName = team?.name ?? row.teamName ?? row.teamId;

        return {
          side,
          reference,
          status: 'resolved',
          resolvedTeamId: row.teamId,
          resolvedTeamName: teamName,
          displayPlaceholder: teamName,
          isBye: false,
        };
      }

      case 'match-winner': {
        const sourceSlot = context.slotsById?.[reference.slotId];
        const defaultPlaceholder = `Vencedor ${reference.slotId}`;

        // Tratamento nativo de BYE no slot de origem:
        // Se uma das pontas do slot for BYE e a outra for uma equipe resolvida,
        // o participante conhecido avança automaticamente como vencedor sem necessidade de partida.
        if (sourceSlot) {
          if (sourceSlot.participantB.isBye && sourceSlot.participantA.status === 'resolved' && sourceSlot.participantA.resolvedTeamId) {
            return {
              side,
              reference,
              status: 'resolved',
              resolvedTeamId: sourceSlot.participantA.resolvedTeamId,
              resolvedTeamName: sourceSlot.participantA.resolvedTeamName,
              displayPlaceholder: sourceSlot.participantA.resolvedTeamName ?? sourceSlot.participantA.resolvedTeamId,
              isBye: false,
            };
          }
          if (sourceSlot.participantA.isBye && sourceSlot.participantB.status === 'resolved' && sourceSlot.participantB.resolvedTeamId) {
            return {
              side,
              reference,
              status: 'resolved',
              resolvedTeamId: sourceSlot.participantB.resolvedTeamId,
              resolvedTeamName: sourceSlot.participantB.resolvedTeamName,
              displayPlaceholder: sourceSlot.participantB.resolvedTeamName ?? sourceSlot.participantB.resolvedTeamId,
              isBye: false,
            };
          }
        }

        const result = context.canonicalResultsBySlot?.[reference.slotId];
        if (!result) {
          return {
            side,
            reference,
            status: 'unresolved',
            resolvedTeamId: null,
            displayPlaceholder: defaultPlaceholder,
            isBye: false,
          };
        }

        if (!result.isValid || !result.isCompleted || !result.winnerId) {
          return {
            side,
            reference,
            status: result.isInconsistent ? 'invalid' : 'unresolved',
            resolvedTeamId: null,
            displayPlaceholder: defaultPlaceholder,
            isBye: false,
          };
        }

        const team = context.teams?.find(t => t.id === result.winnerId);
        const teamName = team?.name ?? result.winnerId;

        return {
          side,
          reference,
          status: 'resolved',
          resolvedTeamId: result.winnerId,
          resolvedTeamName: teamName,
          displayPlaceholder: teamName,
          isBye: false,
        };
      }

      case 'match-loser': {
        const defaultPlaceholder = `Perdedor ${reference.slotId}`;
        const result = context.canonicalResultsBySlot?.[reference.slotId];

        if (!result) {
          return {
            side,
            reference,
            status: 'unresolved',
            resolvedTeamId: null,
            displayPlaceholder: defaultPlaceholder,
            isBye: false,
          };
        }

        if (!result.isValid || !result.isCompleted || !result.loserId) {
          return {
            side,
            reference,
            status: result.isInconsistent ? 'invalid' : 'unresolved',
            resolvedTeamId: null,
            displayPlaceholder: defaultPlaceholder,
            isBye: false,
          };
        }

        const team = context.teams?.find(t => t.id === result.loserId);
        const teamName = team?.name ?? result.loserId;

        return {
          side,
          reference,
          status: 'resolved',
          resolvedTeamId: result.loserId,
          resolvedTeamName: teamName,
          displayPlaceholder: teamName,
          isBye: false,
        };
      }
    }
  }

  /**
   * Atualiza e resolve os participantes A e B de um MatchSlot.
   */
  public static resolveSlot(slot: MatchSlot, context: ResolutionContext = {}): MatchSlot {
    const participantA = this.resolveReference(slot.participantA.reference, 'A', context);
    const participantB = this.resolveReference(slot.participantB.reference, 'B', context);

    return {
      ...slot,
      participantA,
      participantB,
    };
  }

  /**
   * Atualiza e resolve uma lista de MatchSlots em memória.
   */
  public static resolveSlots(slots: MatchSlot[], context: ResolutionContext = {}): MatchSlot[] {
    // Monta mapa de slots para autolookup de BYEs e referências
    const slotsMap: Record<string, MatchSlot> = { ...(context.slotsById ?? {}) };
    for (const slot of slots) {
      slotsMap[slot.slotId] = slot;
    }

    const mergedContext = {
      ...context,
      slotsById: slotsMap,
    };

    return slots.map(slot => this.resolveSlot(slot, mergedContext));
  }
}
