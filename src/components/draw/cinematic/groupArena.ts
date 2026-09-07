import type { DrawGroup } from '@/types/draw';
import type { DrawRevealEvent } from '@/components/draw/drawRevealSequence';

export type GroupArenaStatus = 'active' | 'pending' | 'completed';

export interface GroupArenaTeamEntry {
  teamId: string;
  seed: number;
  revealed: boolean;
  isCurrent: boolean;
}

export interface GroupArenaCard {
  name: string;
  teams: GroupArenaTeamEntry[];
  revealedCount: number;
  totalCount: number;
  status: GroupArenaStatus;
  isCurrentGroup: boolean;
}

/**
 * Deriva o ordinal de uma cabeça de chave (1..N) a partir dos dados reais do
 * motor. Apenas no modo 'seeded' as cabeças fazem sentido (posição previamente
 * determinada pelo regulamento/configuração). NÃO decide resultados — apenas
 * apresenta a posição já definida pelo motor.
 *
 * Retorna `undefined` quando a equipe não é cabeça de chave ou quando o modo é
 * 'random' (cabeças ignoradas pelo sorteio).
 */
export function headSeedOrdinalOf(
  teamId: string,
  seedingMode: 'random' | 'seeded',
  headSeeds: string[],
): number | undefined {
  if (seedingMode !== 'seeded') return undefined;
  const index = headSeeds.indexOf(teamId);
  return index === -1 ? undefined : index + 1;
}

export function buildGroupArena(
  groups: DrawGroup[],
  revealSequence: DrawRevealEvent[] = [],
  activeGroupName?: string | null,
): GroupArenaCard[] {
  const revealedByTeam = new Set(revealSequence.map(item => item.teamId));
  const activeGroup = activeGroupName ?? revealSequence[revealSequence.length - 1]?.groupName ?? null;

  return groups.map(group => {
    const teams = group.teams.map(entry => ({
      teamId: entry.teamId,
      seed: entry.seed,
      revealed: revealedByTeam.has(entry.teamId),
      isCurrent: group.name === activeGroup,
    }));

    const revealedCount = teams.filter(team => team.revealed).length;
    const totalCount = teams.length;
    const status: GroupArenaStatus =
      group.name === activeGroup ? 'active' : totalCount > 0 && revealedCount === totalCount ? 'completed' : 'pending';

    return {
      name: group.name,
      teams,
      revealedCount,
      totalCount,
      status,
      isCurrentGroup: group.name === activeGroup,
    };
  });
}
