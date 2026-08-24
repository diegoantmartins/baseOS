// =====================================================================
// BaseOS Domain - Regras de Elenco e Capacidade da Súmula
// =====================================================================

export const ROSTER_CAPACITY = {
  MAX_REGULAR_ATHLETES: 14,
  MAX_LIBEROS: 2,
  TOTAL_ATHLETES_GRID: 16,
  MIN_PLAYERS_TO_START: 6,
  MAX_STAFF_MEMBERS: 5,
} as const;

export const STAFF_ROLES = [
  { code: 'T', label: 'Técnico' },
  { code: 'AT1', label: 'Assistente Técnico 1' },
  { code: 'AT2', label: 'Assistente Técnico 2' },
  { code: 'PF', label: 'Preparador Físico' },
  { code: 'M/F', label: 'Médico / Fisioterapeuta' },
] as const;

export type StaffRoleCode = (typeof STAFF_ROLES)[number]['code'];
