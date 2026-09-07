import type { DrawGroup } from '@/types/draw';

export interface DrawRevealEvent {
  teamId: string;
  groupName: string;
  order: number;
}

/**
 * Constrói a sequência oficial de revelação do sorteio.
 *
 * Padrão oficial de sorteios esportivos (FIVB / UEFA / CBV):
 * Intercala os grupos por rodada de vagas / potes:
 *  - Rodada 1 (Vaga 1 / Cabeças de chave): Grupo A, depois Grupo B, Grupo C...
 *  - Rodada 2 (Vaga 2): Grupo A, depois Grupo B, Grupo C...
 *  - Rodada 3 (Vaga 3): Grupo A, depois Grupo B, Grupo C...
 *  - e assim por diante até preencher todos os grupos.
 */
export function buildRevealSequence(groups: DrawGroup[]): DrawRevealEvent[] {
  const seq: DrawRevealEvent[] = [];
  if (!groups || groups.length === 0) return seq;

  const maxTeamsInAnyGroup = Math.max(...groups.map((g) => g.teams.length), 0);
  let order = 0;

  for (let slotIndex = 0; slotIndex < maxTeamsInAnyGroup; slotIndex++) {
    for (const group of groups) {
      const team = group.teams[slotIndex];
      if (team) {
        seq.push({
          teamId: team.teamId,
          groupName: group.name,
          order: order++,
        });
      }
    }
  }

  return seq;
}
