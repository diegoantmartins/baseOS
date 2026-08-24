// =====================================================================
// BaseOS Mapper - Roster Mapper (Sem Atletas Fictícios)
// =====================================================================

import type { CompetitionAthlete } from '@/types/registration';
import type { BaseosAthleteEntry } from '../types/team';
import { ROSTER_CAPACITY } from '../domain/roster.rules';

export function mapRoster(rawAthletes: CompetitionAthlete[]): {
  athletes: BaseosAthleteEntry[];
  liberos: BaseosAthleteEntry[];
} {
  const regular: BaseosAthleteEntry[] = [];
  const liberos: BaseosAthleteEntry[] = [];

  // Separa líberos de atletas regulares
  for (const a of rawAthletes) {
    const entry: BaseosAthleteEntry = {
      id: a.id,
      jerseyNumber: a.jerseyNumber ?? undefined,
      name: a.name,
      isCaptain: a.isCaptain,
      isLibero: a.isLibero,
      position: a.position,
      documentNumber: a.documentNumber || (a as any).rg || (a as any).cpf,
    };

    if (a.isLibero) {
      if (liberos.length < ROSTER_CAPACITY.MAX_LIBEROS) {
        liberos.push(entry);
      }
    } else {
      if (regular.length < ROSTER_CAPACITY.MAX_REGULAR_ATHLETES) {
        regular.push(entry);
      }
    }
  }

  // Ordena atletas regulares por número da camisa (atletas sem camisa no fim)
  regular.sort((a, b) => {
    if (a.jerseyNumber === undefined) return 1;
    if (b.jerseyNumber === undefined) return -1;
    return a.jerseyNumber - b.jerseyNumber;
  });

  return {
    athletes: regular,
    liberos,
  };
}
