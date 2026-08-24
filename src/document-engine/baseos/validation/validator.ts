// =====================================================================
// BaseOS Validator - Validação Estrita Pré-Renderização
// =====================================================================

import type { BaseosScoresheetData } from '../types/scoresheet';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateBaseosScoresheetData(data: BaseosScoresheetData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data.document || data.document.type !== 'BASEOS_VOLLEYBALL_SCORESHEET') {
    errors.push('Tipo de documento inválido. Deve ser BASEOS_VOLLEYBALL_SCORESHEET.');
  }

  if (data.document.format === '3-sets' && data.sets.set4) {
    errors.push('Formato de 3 sets não pode conter Set 4 ou Set 5.');
  }

  if (!data.teams.A?.name?.trim() && data.document.state !== 'blank') {
    warnings.push('Equipe A sem nome informado.');
  }

  if (!data.teams.B?.name?.trim() && data.document.state !== 'blank') {
    warnings.push('Equipe B sem nome informado.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
