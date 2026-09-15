import type { AthleteIdentity } from '@/types/identity';

/**
 * Normaliza CPF para a chave técnica de identidade.
 * A validação de dígitos verificadores é uma regra de cadastro futura; aqui não
 * a aplicamos para não impedir a migração de identidades históricas existentes.
 */
export function normalizeCpf(value: string | null | undefined): string | undefined {
  if (value == null || value.trim() === '') return undefined;
  const normalized = value.replace(/\D/g, '');
  if (normalized.length !== 11) {
    throw new Error('CPF deve conter 11 dígitos.');
  }
  return normalized;
}

/** Localiza identidade global por CPF normalizado, sem criar uma duplicata. */
export function findAthleteByCpf(
  athletes: readonly AthleteIdentity[],
  cpf: string | null | undefined,
): AthleteIdentity | undefined {
  const normalizedCpf = normalizeCpf(cpf);
  if (!normalizedCpf) return undefined;
  return athletes.find((athlete) => athlete.normalizedCpf === normalizedCpf);
}
