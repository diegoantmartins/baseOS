/**
 * Fase 8.3 Operational Flow Test Suite — BaseOS
 * 
 * Validação rigorosa das regras operacionais da Fase 8.3:
 * 1. Capacidade: maxTeams deve ser explícito em config.registration.maxTeams. Zero inferência silenciosa.
 * 2. Fluxo de aprovação: canApproveTeam exige status 'submitted', elenco mínimo e vagas disponíveis.
 * 3. Elegibilidade para sorteio: APENAS equipes com status === 'approved' e elenco válido entram no sorteio.
 * 4. is_locked é trava de edição de elenco, NÃO bloqueia sorteio de equipes confirmadas.
 */

import { describe, expect, it } from 'vitest';
import { CompetitionRegistrationService } from '@/services/competitionRegistrationService';
import { CompetitionDrawEligibilityService } from '@/services/competitionDrawEligibilityService';
import type { CompetitionRecord } from '@/types/entities';
import type { CompetitionAthlete, CompetitionTeam } from '@/types/registration';

describe('BaseOS Fase 8.3 — Fluxo Operacional e Capacidade Canônica', () => {
  const baseCompetition: CompetitionRecord = {
    id: 'comp-fase83',
    name: 'Copa Regional de Voleibol 2026',
    slug: 'copa-regional-2026',
    modality: 'indoor',
    format: 'groups-playoffs',
    playerFormat: '6x6',
    setFormat: '3-sets',
    genderCategory: 'male',
    status: 'registration-open',
    groupsCount: 2,
    teamsPerGroup: 2,
    advancingPerGroup: 2,
    tiebreakCriteriaOrder: ['points', 'head-to-head'],
    config: {
      registration: {
        minAthletes: 6,
        maxAthletes: 14,
        maxCaptains: 1,
        maxLiberos: 2,
        requireJerseyNumberOnRegistration: false,
        maxTeams: 2, // Capacidade explícita de 2 vagas
      },
    } as unknown as CompetitionRecord['config'],
    createdAt: '2026-09-13T10:00:00Z',
    updatedAt: '2026-09-13T10:00:00Z',
  };

  const createMockAthlete = (id: string, teamId: string, name: string, isCaptain = false): CompetitionAthlete => ({
    id,
    competitionTeamId: teamId,
    name,
    position: 'Ponteiro',
    isCaptain,
    isLibero: false,
    gender: 'male',
    createdAt: '2026-09-13T10:00:00Z',
    updatedAt: '2026-09-13T10:00:00Z',
  });

  const createRoster = (teamId: string, count: number): CompetitionAthlete[] => {
    return Array.from({ length: count }, (_, i) =>
      createMockAthlete(`ath-${teamId}-${i + 1}`, teamId, `Atleta ${i + 1}`, i === 0),
    );
  };

  describe('1. Capacidade Sem Inferência Silenciosa (Ajuste 1 do Usuário)', () => {
    it('getCapacity retorna maxTeams quando explicitamente configurado', () => {
      const cap = CompetitionRegistrationService.getCapacity(baseCompetition);
      expect(cap.isConfigured).toBe(true);
      expect(cap.maxTeams).toBe(2);
    });

    it('getCapacity NUNCA infere capacidade se config.registration.maxTeams estiver ausente', () => {
      const compWithoutMax: CompetitionRecord = {
        ...baseCompetition,
        groupsCount: 4,
        teamsPerGroup: 4, // Multiplicação daria 16, mas NÃO DEVE inferir!
        config: {
          registration: {
            minAthletes: 6,
            maxAthletes: 14,
            maxCaptains: 1,
            maxLiberos: 2,
            requireJerseyNumberOnRegistration: false,
          },
        } as unknown as CompetitionRecord['config'],
      };

      const cap = CompetitionRegistrationService.getCapacity(compWithoutMax);
      expect(cap.isConfigured).toBe(false);
      expect(cap.maxTeams).toBe(0);

      // canApproveTeam deve falhar com erro operacional claro
      const mockTeam: CompetitionTeam = {
        id: 'ct-1',
        competitionId: compWithoutMax.id,
        teamId: 'team-1',
        teamName: 'Equipe Alpha',
        teamShortName: 'ALP',
        accessToken: 'tok-1',
        registrationDeadline: '2026-10-01T00:00:00Z',
        isLocked: false,
        status: 'submitted',
        createdAt: '2026-09-13T10:00:00Z',
        updatedAt: '2026-09-13T10:00:00Z',
      };

      const athletes = createRoster('ct-1', 6);
      const approval = CompetitionRegistrationService.canApproveTeam(
        compWithoutMax,
        mockTeam,
        [mockTeam],
        athletes,
      );

      expect(approval.ok).toBe(false);
      expect(approval.errors.some((e) => e.includes('maxTeams') && e.includes('não foi configurada'))).toBe(true);
    });
  });

  describe('2. Ciclo de Aprovação e Rejeição Operacional', () => {
    const teamA: CompetitionTeam = {
      id: 'ct-a',
      competitionId: baseCompetition.id,
      teamId: 'team-a',
      teamName: 'Time A',
      teamShortName: 'TMA',
      accessToken: 'tok-a',
      registrationDeadline: '2026-10-01T00:00:00Z',
      isLocked: false,
      status: 'submitted',
      createdAt: '2026-09-13T10:00:00Z',
      updatedAt: '2026-09-13T10:00:00Z',
    };

    const teamB: CompetitionTeam = {
      id: 'ct-b',
      competitionId: baseCompetition.id,
      teamId: 'team-b',
      teamName: 'Time B',
      teamShortName: 'TMB',
      accessToken: 'tok-b',
      registrationDeadline: '2026-10-01T00:00:00Z',
      isLocked: false,
      status: 'submitted',
      createdAt: '2026-09-13T10:00:00Z',
      updatedAt: '2026-09-13T10:00:00Z',
    };

    const teamC: CompetitionTeam = {
      id: 'ct-c',
      competitionId: baseCompetition.id,
      teamId: 'team-c',
      teamName: 'Time C',
      teamShortName: 'TMC',
      accessToken: 'tok-c',
      registrationDeadline: '2026-10-01T00:00:00Z',
      isLocked: false,
      status: 'submitted',
      createdAt: '2026-09-13T10:00:00Z',
      updatedAt: '2026-09-13T10:00:00Z',
    };

    it('impede aprovação de equipe que não enviou elenco (status: invited)', () => {
      const invitedTeam: CompetitionTeam = { ...teamA, status: 'invited' };
      const res = CompetitionRegistrationService.canApproveTeam(
        baseCompetition,
        invitedTeam,
        [invitedTeam],
        createRoster('ct-a', 6),
      );
      expect(res.ok).toBe(false);
      expect(res.errors[0]).toContain('submitted');
    });

    it('impede aprovação de equipe com elenco abaixo do mínimo (ex: 5 atletas em 6x6)', () => {
      const res = CompetitionRegistrationService.canApproveTeam(
        baseCompetition,
        teamA,
        [teamA],
        createRoster('ct-a', 5),
      );
      expect(res.ok).toBe(false);
      expect(res.errors[0]).toContain('Elenco incompleto: a equipe possui 5/6 atletas');
    });

    it('aprova equipe quando submitted, elenco completo e dentro da capacidade', () => {
      const res = CompetitionRegistrationService.canApproveTeam(
        baseCompetition,
        teamA,
        [teamA],
        createRoster('ct-a', 6),
      );
      expect(res.ok).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('bloqueia overbooking quando a capacidade máxima de vagas for atingida', () => {
      // 2 vagas: Time A e Time B já aprovados
      const approvedA: CompetitionTeam = { ...teamA, status: 'approved' };
      const approvedB: CompetitionTeam = { ...teamB, status: 'approved' };

      const allRegs = [approvedA, approvedB, teamC];
      const athletes = [
        ...createRoster('ct-a', 6),
        ...createRoster('ct-b', 6),
        ...createRoster('ct-c', 6),
      ];

      // Tentar aprovar Time C deve falhar por falta de vagas
      const res = CompetitionRegistrationService.canApproveTeam(
        baseCompetition,
        teamC,
        allRegs,
        athletes,
      );

      expect(res.ok).toBe(false);
      expect(res.errors.some((e) => e.includes('Capacidade máxima de equipes atingida (2/2 confirmadas)'))).toBe(true);
    });
  });

  describe('3. Elegibilidade Estrita para o Sorteio Oficial', () => {
    it('SOMENTE equipes com status === approved e elenco mínimo entram no sorteio', () => {
      const teamA: CompetitionTeam = {
        id: 'ct-a',
        competitionId: baseCompetition.id,
        teamId: 'team-a',
        teamName: 'Time A',
        teamShortName: 'TMA',
        accessToken: 'tok-a',
        registrationDeadline: '2026-10-01T00:00:00Z',
        isLocked: false,
        status: 'approved', // Confirmada
        createdAt: '2026-09-13T10:00:00Z',
        updatedAt: '2026-09-13T10:00:00Z',
      };

      const teamB: CompetitionTeam = {
        id: 'ct-b',
        competitionId: baseCompetition.id,
        teamId: 'team-b',
        teamName: 'Time B',
        teamShortName: 'TMB',
        accessToken: 'tok-b',
        registrationDeadline: '2026-10-01T00:00:00Z',
        isLocked: false,
        status: 'submitted', // Apenas enviada, não confirmada!
        createdAt: '2026-09-13T10:00:00Z',
        updatedAt: '2026-09-13T10:00:00Z',
      };

      const teamC: CompetitionTeam = {
        id: 'ct-c',
        competitionId: baseCompetition.id,
        teamId: 'team-c',
        teamName: 'Time C',
        teamShortName: 'TMC',
        accessToken: 'tok-c',
        registrationDeadline: '2026-10-01T00:00:00Z',
        isLocked: false,
        status: 'invited', // Apenas convidada
        createdAt: '2026-09-13T10:00:00Z',
        updatedAt: '2026-09-13T10:00:00Z',
      };

      const athletes = [
        ...createRoster('ct-a', 6),
        ...createRoster('ct-b', 6),
        ...createRoster('ct-c', 6),
      ];

      const report = CompetitionDrawEligibilityService.evaluateCompetitionDrawEligibility({
        competition: baseCompetition,
        competitionTeams: [teamA, teamB, teamC],
        athletes,
      });

      // Apenas Time A é elegível
      expect(report.eligibleCount).toBe(1);
      expect(report.blockedCount).toBe(2);
      expect(report.eligibleTeams.map(t => t.competitionTeamId)).toEqual(['ct-a']);

      // Bloqueio do sorteio: quorum mínimo de 2 equipes aprovadas não atingido
      expect(report.canExecuteDraw).toBe(false);
      expect(report.drawBlockers.some((b) => b.includes('Não existem equipes elegíveis'))).toBe(true);
    });

    it('is_locked NÃO bloqueia a equipe para o sorteio se estiver aprovada e com elenco completo', () => {
      const teamA: CompetitionTeam = {
        id: 'ct-a',
        competitionId: baseCompetition.id,
        teamId: 'team-a',
        teamName: 'Time A',
        teamShortName: 'TMA',
        accessToken: 'tok-a',
        registrationDeadline: '2026-10-01T00:00:00Z',
        isLocked: true, // Bloqueada para edições de elenco pela equipe
        status: 'approved',
        createdAt: '2026-09-13T10:00:00Z',
        updatedAt: '2026-09-13T10:00:00Z',
      };

      const teamB: CompetitionTeam = {
        id: 'ct-b',
        competitionId: baseCompetition.id,
        teamId: 'team-b',
        teamName: 'Time B',
        teamShortName: 'TMB',
        accessToken: 'tok-b',
        registrationDeadline: '2026-10-01T00:00:00Z',
        isLocked: false,
        status: 'approved',
        createdAt: '2026-09-13T10:00:00Z',
        updatedAt: '2026-09-13T10:00:00Z',
      };

      const athletes = [
        ...createRoster('ct-a', 6),
        ...createRoster('ct-b', 6),
      ];

      const closedCompetition: CompetitionRecord = {
        ...baseCompetition,
        status: 'registration-closed',
        groupsCount: 1,
      };

      const report = CompetitionDrawEligibilityService.evaluateCompetitionDrawEligibility({
        competition: closedCompetition,
        competitionTeams: [teamA, teamB],
        athletes,
      });

      expect(report.canExecuteDraw).toBe(true);
      expect(report.eligibleCount).toBe(2);
      expect(report.eligibleTeams.map(t => t.competitionTeamId)).toContain('ct-a');
      expect(report.eligibleTeams.map(t => t.competitionTeamId)).toContain('ct-b');
    });
  });

  describe('4. Cenários Obrigatórios de Capacidade da Fase 8.5 (Seção 15)', () => {
    const comp12: CompetitionRecord = {
      ...baseCompetition,
      config: {
        registration: {
          minAthletes: 6,
          maxAthletes: 14,
          maxCaptains: 1,
          maxLiberos: 2,
          requireJerseyNumberOnRegistration: false,
          maxTeams: 12, // maxTeams = 12
        },
      } as unknown as CompetitionRecord['config'],
    };

    const makeTeam = (id: string, status: CompetitionTeam['status']): CompetitionTeam => ({
      id,
      competitionId: comp12.id,
      teamId: `team-${id}`,
      teamName: `Equipe ${id}`,
      teamShortName: id.toUpperCase().slice(0, 3),
      accessToken: `tok-${id}`,
      registrationDeadline: '2026-10-01T00:00:00Z',
      isLocked: false,
      status,
      createdAt: '2026-09-13T10:00:00Z',
      updatedAt: '2026-09-13T10:00:00Z',
    });

    it('Cenário A: maxTeams = 12, approved = 11 -> APROVAR NOVA EQUIPE = permitido', () => {
      const approvedTeams = Array.from({ length: 11 }, (_, i) => makeTeam(`ct-app-${i + 1}`, 'approved'));
      const candidate = makeTeam('ct-cand', 'submitted');
      const allTeams = [...approvedTeams, candidate];
      const athletes = createRoster('ct-cand', 6);

      const res = CompetitionRegistrationService.canApproveTeam(
        comp12,
        candidate,
        allTeams,
        athletes,
      );

      expect(res.ok).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('Cenário B: maxTeams = 12, approved = 12 -> APROVAR NOVA EQUIPE = bloqueado', () => {
      const approvedTeams = Array.from({ length: 12 }, (_, i) => makeTeam(`ct-app-${i + 1}`, 'approved'));
      const candidate = makeTeam('ct-cand', 'submitted');
      const allTeams = [...approvedTeams, candidate];
      const athletes = createRoster('ct-cand', 6);

      const res = CompetitionRegistrationService.canApproveTeam(
        comp12,
        candidate,
        allTeams,
        athletes,
      );

      expect(res.ok).toBe(false);
      expect(res.errors.some((e) => e.includes('Capacidade máxima de equipes atingida (12/12 confirmadas)'))).toBe(true);
    });

    it('Cenário C: maxTeams ausente -> APROVAÇÃO = bloqueada (sem inferência ou fallback arbitrário)', () => {
      const compNoMax: CompetitionRecord = {
        ...baseCompetition,
        groupsCount: 4,
        teamsPerGroup: 3, // Daria 12 se inferido, mas NUNCA deve inferir!
        config: {
          registration: {
            minAthletes: 6,
            maxAthletes: 14,
            maxCaptains: 1,
            maxLiberos: 2,
            requireJerseyNumberOnRegistration: false,
          },
        } as unknown as CompetitionRecord['config'],
      };

      const candidate = makeTeam('ct-cand', 'submitted');
      const athletes = createRoster('ct-cand', 6);

      const cap = CompetitionRegistrationService.getCapacity(compNoMax);
      expect(cap.isConfigured).toBe(false);
      expect(cap.maxTeams).toBe(0);

      const res = CompetitionRegistrationService.canApproveTeam(
        compNoMax,
        candidate,
        [candidate],
        athletes,
      );

      expect(res.ok).toBe(false);
      expect(res.errors.some((e) => e.includes('maxTeams') && e.includes('não foi configurada'))).toBe(true);
    });

    it('Cenário D: maxTeams = 12, submitted = 5, approved = 8 -> capacidade ocupada = 8, vagas restantes = 4 (submitted NÃO ocupa slot definitivo)', () => {
      const approvedTeams = Array.from({ length: 8 }, (_, i) => makeTeam(`ct-app-${i + 1}`, 'approved'));
      const submittedTeams = Array.from({ length: 5 }, (_, i) => makeTeam(`ct-sub-${i + 1}`, 'submitted'));
      const allTeams = [...approvedTeams, ...submittedTeams];

      // Verificação de ocupação canônica de capacidade
      const cap = CompetitionRegistrationService.getCapacity(comp12);
      expect(cap.maxTeams).toBe(12);

      const occupiedSlots = allTeams.filter((t) => t.status === 'approved').length;
      const remainingSlots = cap.maxTeams - occupiedSlots;

      expect(occupiedSlots).toBe(8);
      expect(remainingSlots).toBe(4);

      // Qualquer uma das 5 equipes submitted pode ser aprovada pois ainda restam 4 vagas
      const targetSubmitted = submittedTeams[0];
      const athletes = createRoster(targetSubmitted.id, 6);

      const res = CompetitionRegistrationService.canApproveTeam(
        comp12,
        targetSubmitted,
        allTeams,
        athletes,
      );

      expect(res.ok).toBe(true);
      expect(res.errors).toHaveLength(0);
    });
  });
});

