// =====================================================================
// BaseOS Mapper - Team Mapper
// =====================================================================

import type { TeamRecord } from '@/types/entities';
import type { CompetitionAthlete } from '@/types/registration';
import type { BaseosTeamData, BaseosStaffEntry } from '../types/team';
import { mapRoster } from './roster.mapper';
import { STAFF_ROLES } from '../domain/roster.rules';

export function mapTeam(
  teamRecord: TeamRecord | undefined,
  fallbackName: string,
  fallbackShortName: string,
  roster: CompetitionAthlete[],
): BaseosTeamData {
  const { athletes, liberos } = mapRoster(roster);

  const staff: BaseosStaffEntry[] = [];
  if (teamRecord?.coachName?.trim()) {
    staff.push({
      roleCode: 'T',
      roleLabel: 'Técnico',
      name: teamRecord.coachName.trim(),
    });
  }
  if (teamRecord?.assistantCoach?.trim()) {
    staff.push({
      roleCode: 'AT1',
      roleLabel: 'Assistente Técnico',
      name: teamRecord.assistantCoach.trim(),
    });
  }
  if (teamRecord?.physicalTrainer?.trim()) {
    staff.push({
      roleCode: 'PF',
      roleLabel: 'Preparador Físico',
      name: teamRecord.physicalTrainer.trim(),
    });
  }
  if (teamRecord?.doctor?.trim()) {
    staff.push({
      roleCode: 'M/F',
      roleLabel: 'Médico',
      name: teamRecord.doctor.trim(),
    });
  }

  // Preenche as outras posições da comissão técnica vazias para anotação
  for (const role of STAFF_ROLES) {
    if (!staff.some(s => s.roleCode === role.code)) {
      staff.push({
        roleCode: role.code,
        roleLabel: role.label,
        name: '',
      });
    }
  }

  return {
    id: teamRecord?.id || 'team-id',
    name: teamRecord?.name || fallbackName,
    shortName: teamRecord?.shortName || fallbackShortName,
    logoUrl: teamRecord?.logoUrl,
    city: teamRecord?.city,
    athletes,
    liberos,
    staff,
  };
}

export function createBlankTeam(side: 'A' | 'B'): BaseosTeamData {
  return {
    id: `blank-${side.toLowerCase()}`,
    name: `EQUIPE ${side}`,
    shortName: `EQ ${side}`,
    athletes: [],
    liberos: [],
    staff: STAFF_ROLES.map(r => ({ roleCode: r.code, roleLabel: r.label, name: '' })),
  };
}
