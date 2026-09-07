// Validador do módulo de sorteio do BASEOS.
//
// Fornece validação robusta para configurações de sorteio,
// garantindo que dados inválidos sejam rejeitados com
// mensagens claras antes da execução.
//
// Validações realizadas:
//  - Configuração de grupos (quantidade, limites)
//  - Equipes (existência, quantidade mínima)
//  - Cabeças de chave (IDs, duplicidade, limites)
//  - Consistência entre configuração e equipes

import type { DrawConfig, DrawSeedingMode } from '@/types/draw';
import type { TeamRecord } from '@/types/entities';

export type DrawValidationErrorCode =
  | 'VALID'
  | 'INVALID_CONFIGURATION'
  | 'INVALID_TEAMS'
  | 'INVALID_HEAD_SEEDS'
  | 'INSUFFICIENT_TEAMS'
  | 'INVALID_GROUP_COUNT'
  | 'INCONSISTENT_STATE';

export interface DrawValidationError {
  code: DrawValidationErrorCode;
  message: string;
  details?: string;
}

export interface DrawValidationResult {
  valid: boolean;
  errors: DrawValidationError[];
  warnings: string[];
}

function createError(code: DrawValidationErrorCode, message: string, details?: string): DrawValidationError {
  return { code, message, details };
}

export function validateDrawConfig(
  config: DrawConfig,
  teams: TeamRecord[],
): DrawValidationResult {
  const errors: DrawValidationError[] = [];
  const warnings: string[] = [];

  if (!config || typeof config !== 'object') {
    errors.push(createError(
      'INVALID_CONFIGURATION',
      'Configuração do sorteio inválida.',
      'A configuração fornecida não é um objeto válido.'
    ));
    return { valid: false, errors, warnings };
  }

  const teamIds = new Set(teams.map(t => t.id));

  // Validação de equipes (PRIORITÁRIA)
  const teamValidation = validateTeams(teams);
  if (teamValidation.error) {
    errors.push(teamValidation.error);
    // Se não há equipes suficientes, retornar imediatamente
    return { valid: false, errors, warnings: teamValidation.warnings };
  }
  warnings.push(...teamValidation.warnings);

  // Validação de grupos
  const groupValidation = validateGroupCount(config.groupsCount, teams.length);
  if (groupValidation.error) {
    errors.push(groupValidation.error);
  }

  // Validação de cabeças de chave
  const headSeedsValidation = validateHeadSeeds(
    config.headSeeds,
    teamIds,
    config.groupsCount,
    config.seedingMode,
    teams.length
  );
  if (headSeedsValidation.error) {
    errors.push(headSeedsValidation.error);
  }
  warnings.push(...headSeedsValidation.warnings);

  // Validação de seed
  if (typeof config.seed !== 'number' || !Number.isFinite(config.seed)) {
    errors.push(createError(
      'INVALID_CONFIGURATION',
      'Seed inválida.',
      'A seed deve ser um número finito.'
    ));
  }

  // Validação de modo
  if (config.seedingMode !== 'random' && config.seedingMode !== 'seeded') {
    errors.push(createError(
      'INVALID_CONFIGURATION',
      'Modo de sorteio inválido.',
      `Modo "${config.seedingMode}" não é reconhecido. Use "random" ou "seeded".`
    ));
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateGroupCount(groupsCount: number, teamCount: number): { error?: DrawValidationError; warnings: string[] } {
  const warnings: string[] = [];
  let error: DrawValidationError | undefined;

  if (typeof groupsCount !== 'number' || !Number.isFinite(groupsCount)) {
    error = createError(
      'INVALID_GROUP_COUNT',
      'Quantidade de grupos inválida.',
      'A quantidade de grupos deve ser um número finito.'
    );
  } else if (groupsCount < 1) {
    error = createError(
      'INVALID_GROUP_COUNT',
      'Quantidade de grupos inválida.',
      `É necessário pelo menos 1 grupo. Valor informado: ${groupsCount}.`
    );
  } else if (groupsCount > teamCount) {
    error = createError(
      'INVALID_GROUP_COUNT',
      'Quantidade de grupos maior que o número de equipes.',
      `${groupsCount} grupos não podem ser formados com ${teamCount} equipes.`
    );
  }

  return { error, warnings };
}

function validateTeams(teams: TeamRecord[]): { error?: DrawValidationError; warnings: string[] } {
  const warnings: string[] = [];
  let error: DrawValidationError | undefined;

  if (!Array.isArray(teams)) {
    error = createError(
      'INVALID_TEAMS',
      'Lista de equipes inválida.',
      'As equipes devem ser fornecidas como um array.'
    );
  } else if (teams.length === 0) {
    error = createError(
      'INSUFFICIENT_TEAMS',
      'Nenhuma equipe disponível para o sorteio.',
      'É necessário pelo menos 2 equipes inscritas.'
    );
  } else if (teams.length === 1) {
    error = createError(
      'INSUFFICIENT_TEAMS',
      'Apenas uma equipe disponível.',
      `São necessárias pelo menos 2 equipes para realizar o sorteio. Equipes encontradas: ${teams.length}.`
    );
  } else if (teams.length < 4) {
    warnings.push(
      `Atenção: apenas ${teams.length} equipes inscritas. Considere usar um único grupo para esta quantidade.`
    );
  }

  return { error, warnings };
}

function validateHeadSeeds(
  headSeeds: string[] | undefined,
  validTeamIds: Set<string>,
  groupsCount: number,
  seedingMode: DrawSeedingMode,
  teamCount: number
): { error?: DrawValidationError; warnings: string[] } {
  const warnings: string[] = [];
  let error: DrawValidationError | undefined;

  if (!Array.isArray(headSeeds)) {
    headSeeds = [];
  }

  // Verificar IDs inexistentes
  const invalidIds = headSeeds.filter(id => !validTeamIds.has(id));
  if (invalidIds.length > 0) {
    error = createError(
      'INVALID_HEAD_SEEDS',
      'Cabeças de chave com IDs inexistentes.',
      `As seguintes equipes não estão inscritas: ${invalidIds.join(', ')}.`
    );
    return { error, warnings };
  }

  // Verificar duplicatas
  const uniqueIds = new Set(headSeeds);
  if (uniqueIds.size !== headSeeds.length) {
    const duplicates = headSeeds.filter((id, idx) => headSeeds.indexOf(id) !== idx);
    error = createError(
      'INVALID_HEAD_SEEDS',
      'Cabeças de chave duplicadas.',
      `IDs duplicados encontrados: ${[...new Set(duplicates)].join(', ')}.`
    );
    return { error, warnings };
  }

  // Verificar limite de cabeças por grupos
  if (headSeeds.length > groupsCount) {
    error = createError(
      'INVALID_HEAD_SEEDS',
      `Excesso de cabeças de chave para o número de grupos.`,
      `Existem ${headSeeds.length} cabeças de chave configuradas para apenas ${groupsCount} grupo(s). Cada cabeça de chave ocupa um grupo diferente.`
    );
  }

  // Warning se modo random mas há cabeças marcadas
  if (seedingMode === 'random' && headSeeds.length > 0) {
    warnings.push(
      'Cabeças de chave foram configuradas, mas o modo "Sorteio Puro" foi selecionado. ' +
      'As cabeças de chave não influenciarão o resultado neste modo.'
    );
  }

  // Warning sobre heads = groups (ideal)
  if (headSeeds.length === groupsCount && groupsCount > 1 && groupsCount < teamCount) {
    warnings.push(
      'Configuração ideal: cada grupo terá exatamente uma cabeça de chave.'
    );
  }

  return { error, warnings };
}

export function formatValidationErrors(result: DrawValidationResult): string {
  if (result.valid) {
    return 'Sorteio validado com sucesso.';
  }

  const messages = result.errors.map(e => {
    let msg = `• ${e.message}`;
    if (e.details) {
      msg += `\n  ${e.details}`;
    }
    return msg;
  });

  return [
    'Não foi possível realizar o sorteio:',
    ...messages,
  ].join('\n');
}

export function getValidationSummary(result: DrawValidationResult): string {
  if (result.valid) {
    const warningCount = result.warnings.length;
    if (warningCount > 0) {
      return `${warningCount} aviso(s) encontrado(s).`;
    }
    return 'Configuração válida.';
  }

  const errorCount = result.errors.length;
  return `${errorCount} erro(s) encontrado(s).`;
}
