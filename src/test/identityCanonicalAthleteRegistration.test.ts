import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { authService } from '@/services/authService';
import {
  dataAccess,
  resetLocalData,
} from '@/services/dataAccess';
import {
  addAthlete,
  updateAthlete,
  listRoster,
} from '@/services/registrationService';
import {
  normalizeCpf,
  getOrCreateAthleteIdentity,
} from '@/services/identityService';
import type { CompetitionAthleteInput } from '@/types/registration';

describe('BASEOS — FASE 11.4: Cadastro Canônico de Atletas + Matching por CPF + Inscrição Transacional', () => {
  beforeEach(async () => {
    localStorage.clear();
    resetLocalData();

    // Habilita status 'registration-open' nas competições de teste para validar o fluxo de inscrição
    await dataAccess.updateCompetition('comp-masculino-2026', { status: 'registration-open' });
    await dataAccess.updateCompetition('comp-feminino-2026', { status: 'registration-open' });
    await dataAccess.updateCompetition('comp-copa-pro-2026', { status: 'registration-open' });

    vi.spyOn(authService, 'isPlatformAdmin').mockReturnValue(true);
    localStorage.setItem('baseos.global_view', 'true');
    localStorage.setItem('baseos.active_org_id', 'all');
  });

  // TESTE 1 — CPF novo
  it('TESTE 1: CPF inexistente cria AthleteIdentity, cria CompetitionAthlete e preenche athleteId', async () => {
    const input: CompetitionAthleteInput = {
      name: 'Novo Atleta Canônico',
      jerseyNumber: 15,
      position: 'Ponteiro',
      documentNumber: '999.888.777-66',
      birthDate: '1995-04-12',
      isCaptain: false,
      isLibero: false,
      gender: 'male',
    };

    const res = await addAthlete('ct-m-1', input);
    expect(res.ok).toBe(true);
    expect(res.athlete).toBeDefined();
    expect(res.athlete?.athleteId).toBeDefined();

    // Verifica que a identidade canônica foi persistida em athletes
    const identity = await dataAccess.getAthleteByCpf('99988877766');
    expect(identity).toBeDefined();
    expect(identity?.id).toBe(res.athlete?.athleteId);
    expect(identity?.name).toBe('Novo Atleta Canônico');
    expect(identity?.normalizedCpf).toBe('99988877766');
  });

  // TESTE 2 — CPF existente
  it('TESTE 2: CPF existente reutiliza athletes.id e cria nova participação sem duplicar identidade', async () => {
    // Cria previamente uma identidade canônica existente no banco global
    const existingIdentity = await dataAccess.createAthlete({
      name: 'Lucas Silveira',
      normalizedCpf: '10000013799',
    });
    expect(existingIdentity).toBeDefined();
    const existingAthleteId = existingIdentity.id;

    // Cria nova equipe na Copa Regional para inscrever o atleta em outra competição
    const copaTeam = await dataAccess.createCompetitionTeam({
      competitionId: 'comp-copa-pro-2026',
      teamId: 'team-m-2',
      teamName: 'Maringá Vôlei',
      teamShortName: 'MAR',
      registrationDeadline: new Date(Date.now() + 86400000).toISOString(),
      isLocked: false,
      status: 'approved',
    });

    // Tenta inscrever com o mesmo CPF na equipe da nova competição
    const input: CompetitionAthleteInput = {
      name: 'Lucas Silveira Outro Nome',
      jerseyNumber: 19,
      position: 'Oposto',
      documentNumber: '100.000.137-99',
      isCaptain: false,
      isLibero: false,
      gender: 'male',
    };

    const res = await addAthlete(copaTeam.id, input);
    expect(res.ok).toBe(true);
    expect(res.athlete).toBeDefined();
    expect(res.athlete?.athleteId).toBe(existingAthleteId);

    // Confirma que não foi criada uma segunda identidade global
    const allAthletes = await dataAccess.listAthletes();
    const matchingIdentities = allAthletes.filter(a => a.normalizedCpf === '10000013799');
    expect(matchingIdentities).toHaveLength(1);
  });

  // TESTE 3 — CPF com formatação diferente
  it('TESTE 3: Formatos distintos de CPF (pontuado, sem pontuação, com espaços) resultam na mesma identidade', async () => {
    const cpfFormatted = '  222.333.444-55 ';
    const cpfClean = '22233344455';
    const cpfSpaced = '222 333 444 55';

    expect(normalizeCpf(cpfFormatted)).toBe(cpfClean);
    expect(normalizeCpf(cpfSpaced)).toBe(cpfClean);

    // Cria com formatado
    const identity1 = await getOrCreateAthleteIdentity(
      { name: 'Carlos Teste', documentNumber: cpfFormatted },
      dataAccess,
    );

    // Resolve com clean
    const identity2 = await getOrCreateAthleteIdentity(
      { name: 'Carlos Teste', documentNumber: cpfClean },
      dataAccess,
    );

    // Resolve com spaced
    const identity3 = await getOrCreateAthleteIdentity(
      { name: 'Carlos Teste', documentNumber: cpfSpaced },
      dataAccess,
    );

    expect(identity1.id).toBe(identity2.id);
    expect(identity2.id).toBe(identity3.id);
    expect(identity1.normalizedCpf).toBe('22233344455');
  });

  // TESTE 4 — mesmo nome sem CPF
  it('TESTE 4: Atletas com mesmo nome e sem CPF geram identidades distintas e isoladas (sem merge automático)', async () => {
    const input1: CompetitionAthleteInput = {
      name: 'Pedro Sem CPF Teste',
      jerseyNumber: 21,
      position: 'Central',
      isCaptain: false,
      isLibero: false,
      gender: 'male',
    };

    const input2: CompetitionAthleteInput = {
      name: 'Pedro Sem CPF Teste',
      jerseyNumber: 22,
      position: 'Ponteiro',
      isCaptain: false,
      isLibero: false,
      gender: 'male',
    };

    const res1 = await addAthlete('ct-m-1', input1);
    expect(res1.ok).toBe(true);

    const res2 = await addAthlete('ct-m-3', input2);
    expect(res2.ok).toBe(true);

    // As duas participações devem ter athleteId distintos
    expect(res1.athlete?.athleteId).toBeDefined();
    expect(res2.athlete?.athleteId).toBeDefined();
    expect(res1.athlete?.athleteId).not.toEqual(res2.athlete?.athleteId);

    // Consulta ambas identidades na base canônica
    const identity1 = await dataAccess.getAthleteById(res1.athlete!.athleteId!);
    const identity2 = await dataAccess.getAthleteById(res2.athlete!.athleteId!);
    expect(identity1).toBeDefined();
    expect(identity2).toBeDefined();
    expect(identity1?.id).not.toEqual(identity2?.id);
    expect(identity1?.name).toBe('Pedro Sem CPF Teste');
    expect(identity2?.name).toBe('Pedro Sem CPF Teste');
    expect(identity1?.normalizedCpf).toBeUndefined();
    expect(identity2?.normalizedCpf).toBeUndefined();
  });

  // TESTE 5 — atleta em duas competições e isolamento na edição
  it('TESTE 5: Mesmo atleta participa de 2 competições (1 identidade, 2 participações) e edição contextual preserva dados da outra', async () => {
    const cpf = '33344455566';
    const inputComp1: CompetitionAthleteInput = {
      name: 'Mariana Silva',
      jerseyNumber: 15,
      position: 'Levantadora',
      documentNumber: cpf,
      isCaptain: false,
      isLibero: false,
      gender: 'female',
    };

    // Inscreve na equipe ct-f-1 (competição feminino 2026)
    const res1 = await addAthlete('ct-f-1', inputComp1);
    expect(res1.ok).toBe(true);
    const participation1 = res1.athlete!;

    // Cria equipe na Copa Regional para a segunda participação
    const copaTeam = await dataAccess.createCompetitionTeam({
      competitionId: 'comp-copa-pro-2026',
      teamId: 'team-f-vortex',
      teamName: 'Vortex Feminino',
      teamShortName: 'VFX',
      registrationDeadline: new Date(Date.now() + 86400000).toISOString(),
      isLocked: false,
      status: 'approved',
    });

    const inputComp2: CompetitionAthleteInput = {
      name: 'Mariana Silva',
      jerseyNumber: 19, // Camisa diferente na Copa
      position: 'Levantadora',
      documentNumber: cpf,
      isCaptain: false,
      isLibero: false,
      gender: 'female',
    };

    const res2 = await addAthlete(copaTeam.id, inputComp2);
    expect(res2.ok).toBe(true);
    const participation2 = res2.athlete!;

    // Ambas participações compartilham a mesma identidade canônica
    expect(participation1.athleteId).toBe(participation2.athleteId);
    expect(participation1.id).not.toBe(participation2.id);

    // Edição contextual na competição 1: altera camisa e status de capitã na comp 1
    const updateRes = await updateAthlete(participation1.id, {
      ...inputComp1,
      jerseyNumber: 18,
      isCaptain: false,
    });
    expect(updateRes.ok).toBe(true);
    expect(updateRes.athlete?.jerseyNumber).toBe(18);

    // Participação 2 na competição 2 continua intacta
    const rosterComp2 = await listRoster(copaTeam.id);
    const part2Reloaded = rosterComp2.find(a => a.id === participation2.id);
    expect(part2Reloaded).toBeDefined();
    expect(part2Reloaded?.jerseyNumber).toBe(19);
    expect(part2Reloaded?.isCaptain).toBe(false);
    expect(part2Reloaded?.athleteId).toBe(participation1.athleteId);
  });

  // TESTE 6 — mesma equipe em duas competições
  it('TESTE 6: Mesma equipe (team_id) participa de duas competições distintas sem duplicar registro de teams', async () => {
    const allTeams = await dataAccess.listTeams();
    const teamM1 = allTeams.find(t => t.id === 'team-m-1');
    expect(teamM1).toBeDefined();

    const matches = allTeams.filter(t => t.id === 'team-m-1');
    expect(matches).toHaveLength(1);

    const participations = await dataAccess.listCompetitionTeams();
    const teamM1Participations = participations.filter(p => p.teamId === 'team-m-1');
    expect(teamM1Participations.length).toBeGreaterThanOrEqual(2);
    const compIds = teamM1Participations.map(p => p.competitionId);
    expect(compIds).toContain('comp-masculino-2026');
    expect(compIds).toContain('comp-copa-pro-2026');
  });

  // TESTE 7 — concorrência
  it('TESTE 7: Concorrência simultânea com o mesmo CPF resulta em uma única identidade canônica', async () => {
    const simultaneousCpf = '44455566677';

    // Executa chamadas simultâneas simulando duas requisições concorrentes
    const [id1, id2] = await Promise.all([
      getOrCreateAthleteIdentity(
        { name: 'Atleta Concorrente A', documentNumber: simultaneousCpf },
        dataAccess,
      ),
      getOrCreateAthleteIdentity(
        { name: 'Atleta Concorrente B', documentNumber: simultaneousCpf },
        dataAccess,
      ),
    ]);

    expect(id1.id).toBe(id2.id);
    expect(id1.normalizedCpf).toBe('44455566677');

    const allAthletes = await dataAccess.listAthletes();
    const matches = allAthletes.filter(a => a.normalizedCpf === simultaneousCpf);
    expect(matches).toHaveLength(1);
  });

  // TESTE 8 — autorização de dirigente
  it('TESTE 8: Usuário sem vínculo de membership com a equipe é rejeitado em registerCompetitionAthleteAuth', async () => {
    // demo-team tem membership apenas para team-m-2 / ct-m-2
    // Tentativa de cadastrar na equipe ct-m-3 (da qual demo-team não faz parte)
    const unauthorizedRes = await dataAccess.registerCompetitionAthleteAuth!(
      'ct-m-3',
      {
        name: 'Tentativa Invasiva',
        jerseyNumber: 1,
        position: 'Ponteiro',
        documentNumber: '55566677788',
        isCaptain: false,
        isLibero: false,
        gender: 'male',
      },
      { userId: 'demo-team' },
    );

    expect(unauthorizedRes.ok).toBe(false);
    expect(unauthorizedRes.error).toMatch(/não autorizado/i);
  });

  // TESTE 9 — membership inválida (blocked / ended)
  it('TESTE 9: Membership com status blocked ou ended não autoriza o cadastro de atleta', async () => {
    // Cria membership com status blocked para um usuário de teste
    const blockedUserId = 'user-blocked-test';
    await dataAccess.createUserMembership({
      userId: blockedUserId,
      organizationId: 'org-vortex',
      teamId: 'team-m-1',
      competitionTeamId: 'ct-m-1',
      role: 'team_manager',
      status: 'blocked',
    });

    const blockedRes = await dataAccess.registerCompetitionAthleteAuth!(
      'ct-m-1',
      {
        name: 'Atleta Bloqueado',
        jerseyNumber: 25,
        position: 'Central',
        documentNumber: '66677788899',
        isCaptain: false,
        isLibero: false,
        gender: 'male',
      },
      { userId: blockedUserId },
    );

    expect(blockedRes.ok).toBe(false);
    expect(blockedRes.error).toMatch(/não autorizado/i);

    // Cria membership com status ended para outro usuário de teste
    const endedUserId = 'user-ended-test';
    await dataAccess.createUserMembership({
      userId: endedUserId,
      organizationId: 'org-vortex',
      teamId: 'team-m-1',
      competitionTeamId: 'ct-m-1',
      role: 'team_manager',
      status: 'ended',
    });

    const endedRes = await dataAccess.registerCompetitionAthleteAuth!(
      'ct-m-1',
      {
        name: 'Atleta Ended',
        jerseyNumber: 26,
        position: 'Central',
        documentNumber: '77788899900',
        isCaptain: false,
        isLibero: false,
        gender: 'male',
      },
      { userId: endedUserId },
    );

    expect(endedRes.ok).toBe(false);
    expect(endedRes.error).toMatch(/não autorizado/i);
  });

  // TESTE 10 — persistência de athleteId
  it('TESTE 10: competition_athletes.athleteId aponta de forma determinística para athletes.id', async () => {
    const input: CompetitionAthleteInput = {
      name: 'Thiago Pontes',
      jerseyNumber: 14,
      position: 'Oposto',
      documentNumber: '888.999.000-11',
      isCaptain: false,
      isLibero: false,
      gender: 'male',
    };

    const res = await addAthlete('ct-m-1', input);
    expect(res.ok).toBe(true);
    expect(res.athlete?.athleteId).toBeDefined();

    // Busca diretamente na coleção de competition_athletes
    const roster = await dataAccess.listCompetitionAthletes('ct-m-1');
    const persisted = roster.find(a => a.id === res.athlete?.id);
    expect(persisted).toBeDefined();
    expect(persisted?.athleteId).toBe(res.athlete?.athleteId);

    // Valida que o athlete existe na coleção de athletes
    const identity = await dataAccess.getAthleteById(persisted!.athleteId!);
    expect(identity).toBeDefined();
    expect(identity?.name).toBe('Thiago Pontes');
    expect(identity?.normalizedCpf).toBe('88899900011');
  });

  // TESTE 11 — regressão ct-m-2
  it('TESTE 11: Preservação estrita dos 12 atletas existentes em ct-m-2', async () => {
    const rosterM2 = await dataAccess.listCompetitionAthletes('ct-m-2');
    expect(rosterM2).toHaveLength(12);

    // Todos os 12 possuem dados canônicos válidos
    rosterM2.forEach(athlete => {
      expect(athlete.competitionTeamId).toBe('ct-m-2');
      expect(athlete.name.trim().length).toBeGreaterThan(0);
      expect(athlete.position.trim().length).toBeGreaterThan(0);
      expect(athlete.jerseyNumber).toBeGreaterThanOrEqual(1);
    });
  });

  // TESTE 12 — Verificações Estruturais de Segurança SQL da Fase 11.4
  describe('TESTE 12: Análise Estática de Segurança e Idempotência das Migrations SQL', () => {
    const migrationPath = path.resolve(
      __dirname,
      '../../supabase/migrations/20260916000001_phase_11_canonical_athlete_registration.sql',
    );

    it('a migration da Fase 11.4 existe e é legível', () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
    });

    it('não contém políticas com bypass indevido (USING (true) ou WITH CHECK (true))', () => {
      const content = fs.readFileSync(migrationPath, 'utf8');
      // Remove comentários SQL de linha e bloco antes da análise
      const sqlCode = content
        .replace(/--.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '');

      expect(sqlCode).not.toMatch(/USING\s*\(\s*true\s*\)/i);
      expect(sqlCode).not.toMatch(/WITH\s+CHECK\s*\(\s*true\s*\)/i);
    });

    it('contém a RPC transacional register_competition_athlete_auth com verificação de auth.uid() e membership ativa', () => {
      const content = fs.readFileSync(migrationPath, 'utf8');
      expect(content).toContain('register_competition_athlete_auth');
      expect(content).toContain('auth.uid()');
      expect(content).toContain("status = 'active'");
    });

    it('contém get_or_create_athlete_id com tratamento atômico de concorrência por CPF', () => {
      const content = fs.readFileSync(migrationPath, 'utf8');
      expect(content).toContain('get_or_create_athlete_id');
      expect(content).toContain('ON CONFLICT (normalized_cpf)');
    });

    it('define search_path estrito nas funções SECURITY DEFINER', () => {
      const content = fs.readFileSync(migrationPath, 'utf8');
      const securityDefinerMatches = content.match(/SECURITY\s+DEFINER/gi);
      expect(securityDefinerMatches).not.toBeNull();
      expect(content).toMatch(/SET\s+search_path\s*=\s*public/i);
    });
  });
});
