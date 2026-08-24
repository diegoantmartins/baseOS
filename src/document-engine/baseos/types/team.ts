// =====================================================================
// BaseOS Types - Entidades de Equipes e Elenco
// =====================================================================

import type { StaffRoleCode } from '../domain/roster.rules';

export interface BaseosAthleteEntry {
  id?: string;
  jerseyNumber?: number;
  name: string;
  isCaptain?: boolean;
  isLibero?: boolean;
  position?: string;
  documentNumber?: string;
}

export interface BaseosStaffEntry {
  roleCode: StaffRoleCode;
  roleLabel: string;
  name: string;
  documentNumber?: string;
}

export interface BaseosTeamData {
  id: string;
  name: string;
  shortName: string;
  logoUrl?: string;
  city?: string;
  /** Atletas regulares cadastrados (máx 14). Linhas não preenchidas viram espaços em branco */
  athletes: BaseosAthleteEntry[];
  /** Até 2 líberos cadastrados */
  liberos: BaseosAthleteEntry[];
  /** Comissão técnica mapeada por funções */
  staff: BaseosStaffEntry[];
}
