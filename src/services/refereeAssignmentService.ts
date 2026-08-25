/**
 * BaseOS - Serviço de Escalação e Conflitos de Arbitragem
 *
 * Gerencia a atribuição de oficiais e previne conflitos de escala:
 *  - 1º Árbitro (Principal)
 *  - 2º Árbitro (Auxiliar)
 *  - Apontador (Mesa)
 *  - Apontador Assistente
 *  - Juízes de Linha
 *
 * Detecta sobreposições de escala em múltiplas quadras/jogos no mesmo horário.
 */

import type { MatchRecord, MatchRefereeRecord } from '@/types/entities';

export type RefereeConflict = {
  refereeName: string;
  roleInMatchA: string;
  roleInMatchB: string;
  matchIdA: string;
  matchIdB: string;
  matchNumberA: number;
  matchNumberB: number;
  message: string;
};

export const STANDARD_REFEREE_ROLES = [
  '1º Árbitro',
  '2º Árbitro',
  'Apontador',
  'Apontador Assistente',
  'Juiz de Linha 1',
  'Juiz de Linha 2',
] as const;

export class RefereeAssignmentService {
  /**
   * Detecta conflitos de escala de arbitragem para uma partida contra todas as demais.
   */
  public static detectRefereeConflicts(
    targetMatch: MatchRecord,
    refereesToAssign: MatchRefereeRecord[],
    allMatches: MatchRecord[]
  ): RefereeConflict[] {
    const conflicts: RefereeConflict[] = [];
    const targetTime = new Date(targetMatch.scheduledTime).getTime();
    if (Number.isNaN(targetTime)) return conflicts;

    // Estimativa de duração padrão de 75 minutos para cálculo de sobreposição
    const matchDurationMs = 75 * 60 * 1000;

    for (const ref of refereesToAssign) {
      if (!ref.name || !ref.name.trim()) continue;
      const refNameNorm = ref.name.trim().toLowerCase();

      for (const other of allMatches) {
        if (other.id === targetMatch.id) continue;
        if (other.status === 'cancelled' || other.status === 'completed' || other.status === 'homologated') continue;

        const otherTime = new Date(other.scheduledTime).getTime();
        if (Number.isNaN(otherTime)) continue;

        const timeDiffMs = Math.abs(targetTime - otherTime);

        // Se houver sobreposição temporal
        if (timeDiffMs < matchDurationMs) {
          const matchRef = other.referees?.find(r => r.name.trim().toLowerCase() === refNameNorm);
          if (matchRef) {
            conflicts.push({
              refereeName: ref.name,
              roleInMatchA: ref.role,
              roleInMatchB: matchRef.role,
              matchIdA: targetMatch.id,
              matchIdB: other.id,
              matchNumberA: targetMatch.matchNumber,
              matchNumberB: other.matchNumber,
              message: `Conflito de Arbitragem: "${ref.name}" já está escalado como "${matchRef.role}" no Jogo #${other.matchNumber} no mesmo horário / intervalo.`,
            });
          }
        }
      }
    }

    return conflicts;
  }
}
