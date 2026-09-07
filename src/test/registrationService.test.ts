// Testes de regras de negócio do módulo de inscrição online por equipe.

import { beforeEach, describe, expect, it } from 'vitest';
import {
  addAthlete,
  getCompetitionTeamByToken,
  isDeadlineExpired,
  isRegistrationLocked,
  listRoster,
  markRosterSubmitted,
  removeAthlete,
  updateAthlete,
  validateAthleteInput,
  validateRosterMinimum,
} from '@/services/registrationService';
import { dataAccess, resetLocalData } from '@/services/dataAccess';
import type { CompetitionAthlete, CompetitionAthleteInput } from '@/types/registration';

const baseInput: CompetitionAthleteInput = {
  name: 'Teste Silva',
  jerseyNumber: 10,
  position: 'Central',
  isCaptain: false,
  isLibero: false,
  gender: 'female',
};

function ct(deadlineIso: string, locked = false) {
  return {
    id: 'ct-test',
    competitionId: 'comp-1',
    teamId: 'team-1',
    teamName: 'Osasco Voleibol',
    teamShortName: 'OSA',
    accessToken: 'token-test',
    registrationDeadline: deadlineIso,
    isLocked: locked,
    status: 'invited' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

beforeEach(async () => {
  resetLocalData();
  await dataAccess.updateCompetition('comp-masculino-2026', { status: 'registration-open' });
});

describe('Validação de prazo limite', () => {
  it('permite inscrição antes do prazo', () => {
    const team = ct(new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString());
    expect(isDeadlineExpired(team)).toBe(false);
    expect(isRegistrationLocked(team)).toBe(false);
  });

  it('bloqueia inscrição após o prazo', () => {
    const team = ct(new Date(Date.now() - 1 * 3600 * 1000).toISOString());
    expect(isDeadlineExpired(team)).toBe(true);
    expect(isRegistrationLocked(team)).toBe(true);
  });

  it('bloqueia quando o organizador trava manualmente', () => {
    const team = ct(new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(), true);
    expect(isDeadlineExpired(team)).toBe(false);
    expect(isRegistrationLocked(team)).toBe(true);
  });

  it('não permite adicionar atleta com prazo expirado', async () => {
    await dataAccess.updateCompetitionTeam('ct-m-1', {
      registrationDeadline: new Date(Date.now() - 3600 * 1000).toISOString(),
    });
    const result = await addAthlete('ct-m-1', baseInput, '6x6');
    expect(result.ok).toBe(false);
    expect(result.errors.join()).toContain('Prazo');
  });
});

describe('Validação de duplicidade de camisa', () => {
  it('recusa camisa já usada na mesma equipe', () => {
    const existing: CompetitionAthlete[] = [
      {
        id: 'x1',
        competitionTeamId: 'ct-m-1',
        name: 'A',
        jerseyNumber: 7,
        position: 'Ponteiro(a)',
        isCaptain: false,
        isLibero: false,
        gender: 'female',
        createdAt: '',
        updatedAt: '',
      },
    ];
    const result = validateAthleteInput({ ...baseInput, jerseyNumber: 7 }, existing, '6x6');
    expect(result.valid).toBe(false);
    expect(result.errors.join()).toContain('camisa');
  });

  it('permite editar mantendo a própria camisa', () => {
    const existing: CompetitionAthlete[] = [
      {
        id: 'x1',
        competitionTeamId: 'ct-m-1',
        name: 'A',
        jerseyNumber: 7,
        position: 'Ponteiro(a)',
        isCaptain: false,
        isLibero: false,
        gender: 'female',
        createdAt: '',
        updatedAt: '',
      },
    ];
    const result = validateAthleteInput({ ...baseInput, jerseyNumber: 7 }, existing, '6x6', 'x1');
    expect(result.valid).toBe(true);
  });

  it('recusa número fora do intervalo 1-99', () => {
    const result = validateAthleteInput({ ...baseInput, jerseyNumber: 100 }, [], '6x6');
    expect(result.valid).toBe(false);
  });

  it('recusa adicionar atleta com camisa duplicada no repositório', async () => {
    const result = await addAthlete('ct-m-2', { ...baseInput, jerseyNumber: 3 }, '6x6');
    expect(result.ok).toBe(false);
    expect(result.errors.join()).toContain('camisa 3');
  });
});

describe('Regras de capitão e líbero', () => {
  const withCaptain: CompetitionAthlete[] = [
    {
      id: 'x1',
      competitionTeamId: 'ct-m-1',
      name: 'A',
      jerseyNumber: 1,
      position: 'Levantador(a)',
      isCaptain: true,
      isLibero: false,
      gender: 'female',
      createdAt: '',
      updatedAt: '',
    },
  ];

  it('permite apenas 1 capitão', () => {
    const result = validateAthleteInput({ ...baseInput, isCaptain: true }, withCaptain, '6x6');
    expect(result.valid).toBe(false);
    expect(result.errors.join()).toContain('1 capitão');
  });

  const withTwoLiberos: CompetitionAthlete[] = [
    {
      id: 'l1',
      competitionTeamId: 'ct-m-1',
      name: 'L1',
      jerseyNumber: 1,
      position: 'Líbero',
      isCaptain: false,
      isLibero: true,
      gender: 'female',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'l2',
      competitionTeamId: 'ct-m-1',
      name: 'L2',
      jerseyNumber: 2,
      position: 'Líbero',
      isCaptain: false,
      isLibero: true,
      gender: 'female',
      createdAt: '',
      updatedAt: '',
    },
  ];

  it('permite até 2 líberos', () => {
    const result = validateAthleteInput({ ...baseInput, isLibero: true }, withTwoLiberos, '6x6');
    expect(result.valid).toBe(false);
    expect(result.errors.join()).toContain('2 líberos');
  });

  it('aceita o segundo líbero quando existe apenas um', () => {
    const result = validateAthleteInput({ ...baseInput, isLibero: true }, [withTwoLiberos[0]], '6x6');
    expect(result.valid).toBe(true);
  });
});

describe('Limites de elenco', () => {
  it('exige mínimo de 6 atletas para 6x6', () => {
    const five: CompetitionAthlete[] = Array.from({ length: 5 }, (_, i) => ({
      id: `a${i}`,
      competitionTeamId: 'ct-m-1',
      name: `Atleta ${i}`,
      jerseyNumber: i + 1,
      position: 'Ponteiro(a)',
      isCaptain: i === 0,
      isLibero: false,
      gender: 'female',
      createdAt: '',
      updatedAt: '',
    }));
    expect(validateRosterMinimum(five, '6x6').valid).toBe(false);
    expect(validateRosterMinimum([...five, five[0]], '6x6').valid).toBe(true);
  });

  it('recusa ultrapassar o máximo de 14 atletas (6x6)', async () => {
    // Seed do ct-m-2 já tem 12 atletas (camisas 1-12); adiciona até 14
    for (let i = 0; i < 2; i++) {
      const result = await addAthlete('ct-m-2', { ...baseInput, name: `Atleta ${i}`, jerseyNumber: 20 + i }, '6x6');
      expect(result.ok).toBe(true);
    }
    const result = await addAthlete('ct-m-2', { ...baseInput, name: 'Extra', jerseyNumber: 99 }, '6x6');
    expect(result.ok).toBe(false);
    expect(result.errors.join()).toContain('14 atletas');
  });
});

describe('Operações de elenco', () => {
  it('cria, atualiza e remove atleta', async () => {
    const created = await addAthlete('ct-m-2', { ...baseInput, jerseyNumber: 30 }, '6x6');
    expect(created.ok).toBe(true);

    const roster = await dataAccess.listCompetitionAthletes('ct-m-2');
    const athlete = roster.find(a => a.name === 'Teste Silva');
    expect(athlete).toBeDefined();
    expect(roster.filter(a => a.isCaptain).length).toBe(1); // seed já tem 1 capitão

    const updated = await updateAthlete(athlete!.id, { ...baseInput, jerseyNumber: 30, name: 'Novo Nome' }, '6x6');
    expect(updated.ok).toBe(true);
    expect(updated.athlete?.name).toBe('Novo Nome');

    const removed = await removeAthlete(athlete!.id);
    expect(removed.ok).toBe(true);
    expect(await dataAccess.listCompetitionAthletes('ct-m-2')).toHaveLength(12);
  });

  it('permite cadastrar atleta sem número de camisa (confirmação no dia)', async () => {
    const result = await addAthlete('ct-m-2', { ...baseInput, jerseyNumber: undefined }, '6x6');
    expect(result.ok).toBe(true);
    expect(result.athlete?.jerseyNumber).toBeUndefined();

    const roster = await listRoster('ct-m-2');
    const added = roster.find(a => a.name === 'Teste Silva');
    expect(added).toBeDefined();
  });

  it('não permite editar atleta de equipe bloqueada', async () => {
    const roster = await dataAccess.listCompetitionAthletes('ct-m-1');
    const athlete = roster[0];
    // Trava o prazo do ct-m-1 (seed com prazo válido)
    await dataAccess.updateCompetitionTeam('ct-m-1', {
      registrationDeadline: new Date(Date.now() - 3600 * 1000).toISOString(),
    });
    const result = await updateAthlete(athlete.id, { ...baseInput, jerseyNumber: 99, name: 'X' }, '6x6');
    expect(result.ok).toBe(false);
  });

  it('busca inscrição por token', async () => {
    const team = await getCompetitionTeamByToken('comp-masculino-2026-vvc-ct-m-1');
    expect(team).not.toBeNull();
    expect(team?.teamShortName).toBe('VVC');
  });

  it('finaliza o elenco (status submitted)', async () => {
    const updated = await markRosterSubmitted('ct-m-2');
    expect(updated?.status).toBe('submitted');
  });
});
