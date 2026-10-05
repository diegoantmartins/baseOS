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

export type AthleteIdentityDataAccess = {
  getAthleteByCpf: (cpf: string) => Promise<AthleteIdentity | null>;
  createAthlete: (input: Omit<AthleteIdentity, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<AthleteIdentity>;
};

/**
 * Resolução canônica de identidade de atleta.
 * Regras obrigatórias:
 * 1. CPF normalizado é a chave canônica quando disponível.
 * 2. Se o CPF existir na base global, reutiliza a identidade existente (athletes.id).
 * 3. Se o CPF não existir, cria nova AthleteIdentity com tratamento de concorrência.
 * 4. Se não houver CPF, gera SEMPRE nova identidade isolada (mesmo nome NÃO significa mesma pessoa).
 */
export async function getOrCreateAthleteIdentity(
  input: {
    name: string;
    documentNumber?: string;
    birthDate?: string;
  },
  dataAccessLayer: AthleteIdentityDataAccess,
): Promise<AthleteIdentity> {
  const normalizedCpf = normalizeCpf(input.documentNumber);

  if (normalizedCpf) {
    const existing = await dataAccessLayer.getAthleteByCpf(normalizedCpf);
    if (existing) {
      return existing;
    }
    try {
      return await dataAccessLayer.createAthlete({
        name: input.name.trim(),
        normalizedCpf,
        birthDate: input.birthDate,
      });
    } catch (error) {
      // Concorrência: se outra operação inseriu simultaneamente o mesmo CPF, busca novamente
      const retry = await dataAccessLayer.getAthleteByCpf(normalizedCpf);
      if (retry) {
        return retry;
      }
      throw error;
    }
  }

  // Atletas sem CPF: SEMPRE criar nova identidade isolada (mesmo nome ≠ mesma identidade)
  return dataAccessLayer.createAthlete({
    name: input.name.trim(),
    birthDate: input.birthDate,
  });
}
