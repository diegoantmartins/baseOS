/**
 * BaseOS — Schedule Engine (Motor Canônico de Agenda e Ordenação de Partidas)
 *
 * Função pura e determinística para ordenação da agenda de jogos.
 * Garante paridade em todos os consumidores do sistema (Admin, Público, Relatórios, Portal).
 *
 * Critérios canônicos de ordenação:
 *  1. round ASC (Rodada - default 1 se ausente)
 *  2. scheduledTime ASC (Data/Hora - partidas sem horário alocadas no final da rodada)
 *  3. court ASC natural (Quadra - ordenação alfanumérica natural, ex: "Quadra 2" antes de "Quadra 10")
 *  4. matchNumber ASC (Número do jogo - desempate final preservando a identidade oficial da partida)
 *
 * Regras:
 *  - Função puramente declarativa e idempotente;
 *  - Não muta o array de entrada (retorna shallow copy ordenada);
 *  - Preserva o matchNumber intacto sem renumerar partidas.
 */

import type { MatchRecord } from '@/types/entities';

export function sortScheduleMatches(matches: MatchRecord[]): MatchRecord[] {
  if (!matches || matches.length === 0) return [];

  return [...matches].sort((a, b) => {
    // 1. Rodada (round) ASC
    const roundA = a.round ?? 1;
    const roundB = b.round ?? 1;
    if (roundA !== roundB) return roundA - roundB;

    // 2. Horário agendado (scheduledTime) ASC
    const hasTimeA = Boolean(a.scheduledTime && a.scheduledTime.trim());
    const hasTimeB = Boolean(b.scheduledTime && b.scheduledTime.trim());

    if (hasTimeA && hasTimeB) {
      const timeA = new Date(a.scheduledTime).getTime();
      const timeB = new Date(b.scheduledTime).getTime();
      const validA = !Number.isNaN(timeA);
      const validB = !Number.isNaN(timeB);

      if (validA && validB && timeA !== timeB) {
        return timeA - timeB;
      }
      if (validA && !validB) return -1;
      if (!validA && validB) return 1;
    } else if (hasTimeA && !hasTimeB) {
      return -1; // Com horário definido vem antes
    } else if (!hasTimeA && hasTimeB) {
      return 1;
    }

    // 3. Quadra (court) ASC natural
    const courtA = (a.court ?? '').trim();
    const courtB = (b.court ?? '').trim();
    if (courtA && courtB) {
      const courtComp = courtA.localeCompare(courtB, undefined, { numeric: true, sensitivity: 'base' });
      if (courtComp !== 0) return courtComp;
    } else if (courtA && !courtB) {
      return -1; // Quadra definida vem antes
    } else if (!courtA && courtB) {
      return 1;
    }

    // 4. Número oficial do jogo (matchNumber) ASC
    const numA = a.matchNumber ?? 0;
    const numB = b.matchNumber ?? 0;
    return numA - numB;
  });
}
