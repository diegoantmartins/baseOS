// Tipos do Módulo de Sorteio (VolleyPro)
//
// O sorteio distribui as equipes inscritas de uma competição em grupos
// (fase classificatória) e gera a tabela de jogos (turno único) de cada
// grupo. Suporta dois modos:
//  - 'random':  distribuição aleatória com semente determinística (reproduzível);
//  - 'seeded':  sorteio dirigido — cabeças de chave (headSeeds) ficam uma por
//               grupo e as demais são distribuídas aleatoriamente de forma
//               balanceada (padrão FIVB/CBV).
//
// A geração dos jogos usa o método do círculo (Berger table), garantindo que
// cada dupla se enfrenta uma única vez com o menor número de rodadas.

export type DrawSeedingMode = 'random' | 'seeded';

export type DrawConfig = {
  /** Número de grupos/chaves da fase classificatória. */
  groupsCount: number;
  /** 'random' = sorteio puro; 'seeded' = sorteio dirigido com cabeças de chave. */
  seedingMode: DrawSeedingMode;
  /** Semente numérica para um sorteio determinístico e reproduzível. */
  seed: number;
  /** IDs das equipes cabeças de chave, em ordem de prioridade (1ª = mais forte). */
  headSeeds: string[];
};

/** Entrada do sorteio: uma equipe inscrita. */
export type DrawTeamEntry = {
  teamId: string;
  /** Posição inicial na ordem do sorteio (1 = primeiro sorteado). */
  seed: number;
};

export type DrawGroup = {
  /** Nome do grupo/chave (ex.: 'Grupo A'). */
  name: string;
  /** Equipes do grupo, na ordem em que foram sorteadas. */
  teams: DrawTeamEntry[];
};

/** Proposta de jogo gerada pelo sorteio (fase classificatória). */
export type DrawMatchProposal = {
  round: number;
  matchNumber: number;
  teamAId: string;
  teamBId: string;
  groupName: string;
  /** Fase do jogo (padrão: 'classificatória'). */
  phase: string;
};

/** Resultado do sorteio (cálculo puro, sem persistência). */
export type DrawResult = {
  competitionId: string;
  config: DrawConfig;
  groups: DrawGroup[];
  matches: DrawMatchProposal[];
};

/** Sorteio persistido (um por competição). */
export type DrawRecord = DrawResult & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

/** Sugere o número ideal de grupos a partir da quantidade de equipes. */
export function suggestGroupsCount(teamCount: number): number {
  if (teamCount <= 4) return 1;
  if (teamCount <= 8) return 2;
  if (teamCount <= 12) return 3;
  return 4;
}