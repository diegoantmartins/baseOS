/**
 * BaseOS - Serviço de Check-in e Conferência Presencial de Atletas
 *
 * Valida a elegibilidade e o quórum presencial no dia do jogo:
 *  - Mínimo de 6 atletas para vôlei de quadra e 2 atletas para vôlei de praia.
 *  - Presença de 1 capitão por equipe.
 *  - Máximo de 2 líberos identificados.
 *  - Unicidade e obrigatoriedade de número de camisa nos atletas que entrarão em quadra.
 */

import type { CompetitionAthlete } from '@/types/registration';
import type { CompetitionRecord } from '@/types/entities';

export type CheckinValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  teamAPresent: number;
  teamBPresent: number;
  minRequired: number;
};

export class MatchCheckinService {
  /**
   * Retorna o número mínimo de atletas exigido para entrar em quadra conforme a modalidade.
   */
  public static getMinAthletesRequired(modality?: 'indoor' | 'beach'): number {
    return modality === 'beach' ? 2 : 6;
  }

  /**
   * Valida a lista de atletas marcados como presentes para uma partida.
   */
  public static validateMatchCheckin(
    competition: CompetitionRecord | null,
    teamAAthletes: CompetitionAthlete[],
    teamBAthletes: CompetitionAthlete[],
    checkedInIds: string[]
  ): CheckinValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const minRequired = this.getMinAthletesRequired(competition?.modality);

    // Filtrar presentes de cada equipe
    const presentA = teamAAthletes.filter(a => checkedInIds.includes(a.id));
    const presentB = teamBAthletes.filter(a => checkedInIds.includes(a.id));

    // 1. Quórum mínimo Equipe A
    if (presentA.length < minRequired) {
      errors.push(`Equipe A possui apenas ${presentA.length} atleta(s) presente(s). Mínimo exigido: ${minRequired}.`);
    }

    // 2. Quórum mínimo Equipe B
    if (presentB.length < minRequired) {
      errors.push(`Equipe B possui apenas ${presentB.length} atleta(s) presente(s). Mínimo exigido: ${minRequired}.`);
    }

    // 3. Validação de Capitão presente
    const captainA = presentA.find(a => a.isCaptain);
    if (!captainA && presentA.length > 0) {
      warnings.push('Equipe A não possui um Capitão formalmente assinalado entre os presentes.');
    }

    const captainB = presentB.find(a => a.isCaptain);
    if (!captainB && presentB.length > 0) {
      warnings.push('Equipe B não possui um Capitão formalmente assinalado entre os presentes.');
    }

    // 4. Validação de Líberos (apenas quadra)
    if (competition?.modality !== 'beach') {
      const liberosA = presentA.filter(a => a.isLibero);
      if (liberosA.length > 2) {
        errors.push(`Equipe A possui ${liberosA.length} líberos assinalados (máximo regulamentar: 2).`);
      }

      const liberosB = presentB.filter(a => a.isLibero);
      if (liberosB.length > 2) {
        errors.push(`Equipe B possui ${liberosB.length} líberos assinalados (máximo regulamentar: 2).`);
      }
    }

    // 5. Validação de Número de Camisa (atletas presentes devem ter camisa única)
    const validateJerseys = (athletes: CompetitionAthlete[], teamLabel: string) => {
      const jerseySet = new Set<number>();
      for (const a of athletes) {
        if (a.jerseyNumber === undefined || a.jerseyNumber === null) {
          warnings.push(`${teamLabel}: Atleta "${a.name}" está sem número de camisa definido.`);
        } else {
          if (jerseySet.has(a.jerseyNumber)) {
            errors.push(`${teamLabel}: Número de camisa #${a.jerseyNumber} duplicado.`);
          }
          jerseySet.add(a.jerseyNumber);
        }
      }
    };

    validateJerseys(presentA, 'Equipe A');
    validateJerseys(presentB, 'Equipe B');

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      teamAPresent: presentA.length,
      teamBPresent: presentB.length,
      minRequired,
    };
  }
}
