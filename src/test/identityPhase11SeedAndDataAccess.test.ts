import { beforeEach, describe, expect, it } from 'vitest';
import {
  seedAthletes,
  seedCompetitionAthletes,
  seedCompetitions,
  seedCompetitionTeams,
  seedOrganizations,
  seedTeams,
  seedUserMemberships,
} from '@/data/seed';
import {
  clearEntireDatabase,
  dataAccess,
  resetLocalData,
} from '@/services/dataAccess';
import {
  planAthleteBackfill,
  planFullIdentityBackfill,
  planLegacyTeamMembership,
} from '@/services/identityBackfillService';
import { normalizeCpf } from '@/services/identityService';
import type { AthleteIdentity } from '@/types/identity';
import fs from 'fs';
import path from 'path';

describe('Fase 11.2 — Seed da Fundação de Identidade e Acesso Contextual', () => {
  beforeEach(() => {
    localStorage.clear();
    resetLocalData();
  });

  it('inicializa organizations com dados e status válidos', () => {
    expect(seedOrganizations.length).toBeGreaterThanOrEqual(3);
    const orgVortex = seedOrganizations.find(o => o.id === 'org-vortex');
    expect(orgVortex).toBeDefined();
    expect(orgVortex?.name).toBe('Associação Vortex Esportes');
    expect(orgVortex?.status).toBe('active');
  });

  it('Cenário A: usuário com 1 membership ativa, 1 equipe e 1 competição', () => {
    const memA = seedUserMemberships.filter(m => m.userId === 'demo-team');
    expect(memA).toHaveLength(1);
    expect(memA[0].status).toBe('active');
    expect(memA[0].teamId).toBe('team-m-2');
    expect(memA[0].competitionId).toBe('comp-masculino-2026');
  });

  it('Cenário B: mesmo usuário com 2 memberships ativas em equipes diferentes', () => {
    const memB = seedUserMemberships.filter(m => m.userId === 'user-manager-multi');
    expect(memB).toHaveLength(2);
    expect(memB.every(m => m.status === 'active')).toBe(true);
    const teamIds = memB.map(m => m.teamId);
    expect(teamIds).toContain('team-m-3');
    expect(teamIds).toContain('team-m-4');
    expect(teamIds[0]).not.toEqual(teamIds[1]);
  });

  it('Cenário C: mesmo usuário administrando Clube X Masculino e Clube X Feminino sob a mesma organização', () => {
    const vortexMemberships = seedUserMemberships.filter(
      m => m.userId === 'demo-admin' && m.organizationId === 'org-vortex' && m.role === 'team_manager',
    );
    expect(vortexMemberships).toHaveLength(2);
    const teamIds = vortexMemberships.map(m => m.teamId);
    expect(teamIds).toContain('team-m-1');
    expect(teamIds).toContain('team-f-vortex');

    const teamM = seedTeams.find(t => t.id === 'team-m-1');
    const teamF = seedTeams.find(t => t.id === 'team-f-vortex');
    expect(teamM?.organizationId).toBe('org-vortex');
    expect(teamM?.genderCategory).toBe('male');
    expect(teamF?.organizationId).toBe('org-vortex');
    expect(teamF?.genderCategory).toBe('female');
  });

  it('Cenário D: mesma equipe participando de 2 competições sem duplicar registro de team', () => {
    const teamsMatching = seedTeams.filter(t => t.id === 'team-m-1');
    expect(teamsMatching).toHaveLength(1);

    const participations = seedCompetitionTeams.filter(ct => ct.teamId === 'team-m-1');
    expect(participations.length).toBeGreaterThanOrEqual(2);
    const compIds = participations.map(p => p.competitionId);
    expect(compIds).toContain('comp-masculino-2026');
    expect(compIds).toContain('comp-copa-pro-2026');
  });

  it('Cenário E: mesmo atleta participando de competições diferentes com a mesma identidade global', () => {
    const athlete001 = seedAthletes.find(a => a.id === 'athlete-001');
    expect(athlete001).toBeDefined();
    expect(athlete001?.normalizedCpf).toBe('10000013700');

    const participations = seedCompetitionAthletes.filter(ca => ca.athleteId === 'athlete-001');
    expect(participations.length).toBeGreaterThanOrEqual(2);

    const compTeamIds = participations.map(p => p.competitionTeamId);
    expect(compTeamIds).toContain('ct-m-1');
    expect(compTeamIds).toContain('ct-m-1-copa');
  });

  it('Cenário F: atletas sem CPF com mesmo nome mantêm identidades distintas e nunca sofrem merge', () => {
    const noCpfAthletes = seedAthletes.filter(a => a.name === 'Pedro Sem CPF');
    expect(noCpfAthletes.length).toBeGreaterThanOrEqual(2);
    expect(noCpfAthletes.every(a => !a.normalizedCpf)).toBe(true);

    const ids = new Set(noCpfAthletes.map(a => a.id));
    expect(ids.size).toBe(noCpfAthletes.length);
  });
});

describe('Fase 11.2 — Backfill Local (identityBackfillService)', () => {
  it('planAthleteBackfill reusa CPF existente e cria identidades isoladas para registros sem CPF', () => {
    const now = new Date().toISOString();
    const existing: AthleteIdentity[] = [
      {
        id: 'ath-canonical-1',
        normalizedCpf: '11122233344',
        name: 'Carlos Silva',
        createdAt: now,
        updatedAt: now,
      },
    ];

    const legacy = [
      {
        id: 'part-1',
        competitionTeamId: 'ct-1',
        name: 'Carlos Silva',
        documentNumber: '111.222.333-44',
      },
      {
        id: 'part-2',
        competitionTeamId: 'ct-2',
        name: 'João Sem Documento',
      },
      {
        id: 'part-3',
        competitionTeamId: 'ct-3',
        name: 'João Sem Documento', // Mesmo nome, mas sem CPF
      },
    ];

    const plan = planAthleteBackfill(legacy, existing, now);
    expect(plan).toHaveLength(3);

    // part-1 deve reutilizar
    expect(plan[0].reuseExistingIdentity).toBe(true);
    expect(plan[0].athlete.id).toBe('ath-canonical-1');

    // part-2 e part-3 não devem ser mesclados
    expect(plan[1].reuseExistingIdentity).toBe(false);
    expect(plan[2].reuseExistingIdentity).toBe(false);
    expect(plan[1].athlete.id).not.toBe(plan[2].athlete.id);
  });

  it('planLegacyTeamMembership gera chave e dados determinísticos', () => {
    const now = new Date().toISOString();
    const mem = planLegacyTeamMembership('user-1', 'org-1', 'comp-1', 'team-1', 'ct-1', now);
    expect(mem.id).toBe('membership-backfill-user-1-ct-1');
    expect(mem.userId).toBe('user-1');
    expect(mem.organizationId).toBe('org-1');
    expect(mem.role).toBe('team_manager');
    expect(mem.status).toBe('active');
  });

  it('planFullIdentityBackfill planeja atletas, memberships e detecta casos ambíguos', () => {
    const now = new Date().toISOString();
    const plan = planFullIdentityBackfill({
      competitions: [{ id: 'comp-1', organizationId: 'org-1' }],
      teams: [{ id: 'team-1', organizationId: 'org-1' }],
      competitionTeams: [{ id: 'ct-1', competitionId: 'comp-1', teamId: 'team-1' }],
      competitionAthletes: [
        { id: 'leg-ath-1', competitionTeamId: 'ct-1', name: 'Atleta A', documentNumber: '12345678901' },
        { id: 'leg-ath-2', competitionTeamId: 'ct-1', name: 'Atleta Sem Doc' },
      ],
      existingAthletes: [],
      legacyProfiles: [
        { id: 'prof-valid', role: 'team', competitionTeamId: 'ct-1' },
        { id: 'prof-ambiguous-1', role: 'team' }, // sem competitionTeamId
        { id: 'prof-ambiguous-2', role: 'team', competitionTeamId: 'ct-inexistente' },
      ],
      defaultOrganizationId: 'org-default',
      now,
    });

    expect(plan.stats.totalLegacyAthletes).toBe(2);
    expect(plan.stats.newAthletes).toBe(2);
    expect(plan.stats.athletesWithoutCpf).toBe(1);
    expect(plan.stats.createdMemberships).toBe(1);
    expect(plan.stats.ambiguousProfilesCount).toBe(2);
    expect(plan.membershipPlans[0].userId).toBe('prof-valid');
    expect(plan.ambiguousProfiles.map(p => p.userId)).toContain('prof-ambiguous-1');
    expect(plan.ambiguousProfiles.map(p => p.userId)).toContain('prof-ambiguous-2');
  });
});

describe('Fase 11.3 — DataAccess (Organizations & Athletes)', () => {
  beforeEach(() => {
    localStorage.clear();
    resetLocalData();
  });

  it('listOrganizations retorna organizações do seed', async () => {
    const orgs = await dataAccess.listOrganizations();
    expect(orgs.length).toBeGreaterThanOrEqual(3);
    expect(orgs.some(o => o.id === 'org-vortex')).toBe(true);
  });

  it('getOrganizationById busca organização pelo ID', async () => {
    const org = await dataAccess.getOrganizationById('org-vortex');
    expect(org).not.toBeNull();
    expect(org?.name).toBe('Associação Vortex Esportes');

    const notFound = await dataAccess.getOrganizationById('org-inexistente');
    expect(notFound).toBeNull();
  });

  it('createOrganization insere e persiste nova organização', async () => {
    const created = await dataAccess.createOrganization({
      name: 'Clube Atlético Paulistano',
      legalName: 'Clube Atlético Paulistano Desportos',
      documentNumber: '12.345.678/0001-99',
      status: 'active',
    });

    expect(created.id).toBeDefined();
    expect(created.name).toBe('Clube Atlético Paulistano');

    const fetched = await dataAccess.getOrganizationById(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.name).toBe('Clube Atlético Paulistano');
  });

  it('listAthletes retorna atletas cadastrados', async () => {
    const athletes = await dataAccess.listAthletes();
    expect(athletes.length).toBeGreaterThanOrEqual(4);
    expect(athletes.some(a => a.id === 'athlete-001')).toBe(true);
  });

  it('getAthleteById busca atleta pelo ID', async () => {
    const athlete = await dataAccess.getAthleteById('athlete-001');
    expect(athlete).not.toBeNull();
    expect(athlete?.name).toBe('Lucas Silveira');

    const notFound = await dataAccess.getAthleteById('athlete-nao-existe');
    expect(notFound).toBeNull();
  });

  it('getAthleteByCpf busca por CPF normalizado (com formatação ou dígitos)', async () => {
    const byFormatted = await dataAccess.getAthleteByCpf('100.000.137-00');
    expect(byFormatted).not.toBeNull();
    expect(byFormatted?.id).toBe('athlete-001');

    const byRaw = await dataAccess.getAthleteByCpf('10000013700');
    expect(byRaw).not.toBeNull();
    expect(byRaw?.id).toBe('athlete-001');

    const notFound = await dataAccess.getAthleteByCpf('999.999.999-99');
    expect(notFound).toBeNull();
  });

  it('createAthlete cria novo atleta com CPF normalizado', async () => {
    const newAthlete = await dataAccess.createAthlete({
      name: 'Maurício Souza',
      normalizedCpf: '555.444.333-22',
      birthDate: '1990-09-20',
    });

    expect(newAthlete.id).toBeDefined();
    expect(newAthlete.normalizedCpf).toBe('55544433322');

    const fetched = await dataAccess.getAthleteByCpf('55544433322');
    expect(fetched).not.toBeNull();
    expect(fetched?.name).toBe('Maurício Souza');
  });

  it('createAthlete bloqueia duplicidade de CPF (uq_athletes_normalized_cpf)', async () => {
    await expect(
      dataAccess.createAthlete({
        name: 'Clone Lucas Silveira',
        normalizedCpf: '100.000.137-00', // CPF existente de athlete-001
      }),
    ).rejects.toThrow(/Violação de unicidade/);
  });

  it('clearEntireDatabase limpa organizations, athletes e memberships', async () => {
    clearEntireDatabase();

    const orgs = await dataAccess.listOrganizations();
    expect(orgs).toHaveLength(0);

    const athletes = await dataAccess.listAthletes();
    expect(athletes).toHaveLength(0);

    const memberships = await dataAccess.listUserMemberships('demo-admin');
    expect(memberships).toHaveLength(0);
  });
});

describe('Fase 11.3 — Auditoria Estrutural da Migration de RLS', () => {
  const migrationPath = path.resolve(
    __dirname,
    '../../supabase/migrations/20260915120000_phase_11_initial_rls_policies.sql',
  );

  it('a migration de RLS existe no caminho esperado', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it('a migration NÃO possui USING (true) permissivo para atletas, organizações ou memberships', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    const sqlCode = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

    // Não pode conter USING (true) ou USING(true)
    const hasUsingTrue = /USING\s*\(\s*true\s*\)/i.test(sqlCode);
    expect(hasUsingTrue).toBe(false);
  });

  it('a migration restringe leitura de user_memberships a user_id = auth.uid() ou admin/organizer', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('user_id = auth.uid()');
    expect(sql).toContain('public.is_admin_or_organizer()');
  });

  it('a migration isola leitura de athletes por vínculo de elenco', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('ca.athlete_id = athletes.id');
    expect(sql).toContain('ca.competition_team_id = p.competition_team_id');
  });

  it('a migration restringe escrita a admin e organizer', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('"user_memberships_admin_organizer_all"');
    expect(sql).toContain('"organizations_admin_organizer_all"');
    expect(sql).toContain('"athletes_admin_organizer_all"');
  });
});
