import { describe, it, expect } from 'vitest';
import {
  CompetitionActionGuideService,
} from '@/services/competitionActionGuideService';
import type { CompetitionRecord, MatchRecord } from '@/types/entities';
import type { CompetitionTeam, CompetitionAthlete } from '@/types/registration';

describe('CompetitionActionGuideService (Fase 8.4 - UX Operacional e Próxima Ação)', () => {
  const baseCompetition: CompetitionRecord = {
    id: 'comp-voltz-1',
    name: 'Superliga Voltz 2026',
    slug: 'superliga-voltz-2026',
    modality: 'indoor',
    format: 'groups-playoffs',
    playerFormat: '6x6',
    setFormat: '3-sets',
    genderCategory: 'male',
    status: 'registration-open',
    groupsCount: 1,
    teamsPerGroup: 4,
    advancingPerGroup: 2,
    config: {
      registration: {
        maxTeams: 4, // Capacidade explícita
        minAthletes: 6,
        maxAthletes: 14,
        maxCaptains: 1,
        maxLiberos: 2,
        requireJerseyNumberOnRegistration: false,
      },
    } as unknown as CompetitionRecord['config'],
  };

  const createAthleteRoster = (teamId: string, count: number): CompetitionAthlete[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `ath-${teamId}-${i + 1}`,
      competitionTeamId: teamId,
      name: `Atleta ${i + 1}`,
      position: 'Ponteiro',
      gender: 'female' as const,
      jerseyNumber: i + 1,
      isCaptain: i === 0,
      isLibero: i === 1,
      createdAt: '2026-09-13T10:00:00Z',
      updatedAt: '2026-09-13T10:00:00Z',
    }));
  };

  const createTeam = (props: Partial<CompetitionTeam> & { id: string; teamId: string; teamName: string; status: CompetitionTeam['status'] }): CompetitionTeam => ({
    teamShortName: props.teamShortName || props.teamName.substring(0, 3).toUpperCase(),
    accessToken: props.accessToken || `tok-${props.id}`,
    registrationDeadline: props.registrationDeadline || '2026-10-01T23:59:59Z',
    isLocked: props.isLocked ?? false,
    competitionId: props.competitionId || baseCompetition.id,
    createdAt: '2026-09-13T10:00:00Z',
    updatedAt: '2026-09-13T10:00:00Z',
    ...props,
  });

  it('1. Competição recém-criada (0 equipes): orienta a "Convidar Equipes"', () => {
    const guide = CompetitionActionGuideService.evaluateCompetitionActionGuide({
      competition: baseCompetition,
      competitionTeams: [],
    });

    expect(guide.scenario).toBe('NO_TEAMS');
    expect(guide.title).toBe('Convidar Equipes');
    expect(guide.primaryAction.label).toBe('Convidar Equipes');
    expect(guide.primaryAction.route).toContain('/inscricoes');
    expect(guide.capacity.confirmedCount).toBe(0);
    expect(guide.capacity.availableSpots).toBe(4);
    expect(guide.capacity.isFull).toBe(false);
  });

  it('2. Inscrições abertas com equipes convidadas: orienta a "Acompanhar Inscrições"', () => {
    const team1 = createTeam({
      id: 'ct-1',
      teamId: 'team-1',
      teamName: 'Minas Tênis',
      teamShortName: 'MTC',
      status: 'invited',
    });

    const guide = CompetitionActionGuideService.evaluateCompetitionActionGuide({
      competition: baseCompetition,
      competitionTeams: [team1],
    });

    expect(guide.scenario).toBe('REGISTRATION_OPEN');
    expect(guide.title).toBe('Acompanhar Inscrições');
    expect(guide.capacity.confirmedCount).toBe(0);
    expect(guide.capacity.availableSpots).toBe(4);
  });

  it('3. Equipes aguardando análise (submitted): orienta prioritariamente a "Revisar Inscrições"', () => {
    const team1 = createTeam({
      id: 'ct-1',
      teamId: 'team-1',
      teamName: 'Sada Cruzeiro',
      teamShortName: 'SAD',
      status: 'submitted', // Enviou elenco
    });

    const guide = CompetitionActionGuideService.evaluateCompetitionActionGuide({
      competition: baseCompetition,
      competitionTeams: [team1],
      athletes: createAthleteRoster('ct-1', 8),
    });

    expect(guide.scenario).toBe('PENDING_REVIEWS');
    expect(guide.title).toBe('Revisar Inscrições');
    expect(guide.subtitle).toContain('1 equipe(s) enviaram elenco e aguardam análise');
    expect(guide.pendingPoints.some((p) => p.message.includes('aguardando análise'))).toBe(true);

    // REGRA DE DOMÍNIO: submitted NÃO ocupa vaga confirmada
    expect(guide.capacity.confirmedCount).toBe(0);
    expect(guide.capacity.submittedCount).toBe(1);
    expect(guide.capacity.availableSpots).toBe(4);
  });

  it('4. Capacidade parcialmente preenchida com equipes aprovadas', () => {
    const team1 = createTeam({
      id: 'ct-1',
      teamId: 'team-1',
      teamName: 'Sada Cruzeiro',
      teamShortName: 'SAD',
      status: 'approved',
    });
    const team2 = createTeam({
      id: 'ct-2',
      teamId: 'team-2',
      teamName: 'Vôlei Renata',
      teamShortName: 'VRE',
      status: 'approved',
    });

    const guide = CompetitionActionGuideService.evaluateCompetitionActionGuide({
      competition: baseCompetition,
      competitionTeams: [team1, team2],
      athletes: [...createAthleteRoster('ct-1', 6), ...createAthleteRoster('ct-2', 6)],
    });

    expect(guide.scenario).toBe('REGISTRATION_OPEN');
    expect(guide.capacity.confirmedCount).toBe(2);
    expect(guide.capacity.availableSpots).toBe(2);
    expect(guide.capacity.isFull).toBe(false);
    expect(guide.capacity.displayText).toBe('2 / 4 equipes confirmadas');
  });

  it('5. Capacidade máxima atingida (4/4): orienta a "Encerrar Inscrições"', () => {
    const teams: CompetitionTeam[] = ['t1', 't2', 't3', 't4'].map((id, index) => createTeam({
      id: `ct-${id}`,
      teamId: id,
      teamName: `Equipe ${index + 1}`,
      teamShortName: `EQ${index + 1}`,
      status: 'approved',
    }));

    const athletes = teams.flatMap((t) => createAthleteRoster(t.id, 6));

    const guide = CompetitionActionGuideService.evaluateCompetitionActionGuide({
      competition: baseCompetition,
      competitionTeams: teams,
      athletes,
    });

    expect(guide.scenario).toBe('CAPACITY_REACHED');
    expect(guide.title).toBe('Encerrar Inscrições');
    expect(guide.capacity.confirmedCount).toBe(4);
    expect(guide.capacity.availableSpots).toBe(0);
    expect(guide.capacity.isFull).toBe(true);
    expect(guide.canCloseRegistrations).toBe(true);
  });

  it('6. Capacidade não configurada: emite pendência de bloqueio e NUNCA infere capacidade', () => {
    const unconfiguredCompetition: CompetitionRecord = {
      ...baseCompetition,
      config: {
        registration: {
          // maxTeams AUSENTE intencionalmente
          minAthletes: 6,
          maxAthletes: 14,
        },
      } as unknown as CompetitionRecord['config'],
    };

    const guide = CompetitionActionGuideService.evaluateCompetitionActionGuide({
      competition: unconfiguredCompetition,
      competitionTeams: [],
    });

    expect(guide.capacity.isConfigured).toBe(false);
    expect(guide.capacity.maxTeams).toBe(0);
    expect(guide.capacity.displayText).toContain('capacidade não configurada');

    // Pendência bloqueadora deve estar ativa
    const blocker = guide.pendingPoints.find((p) => p.id === 'pending-capacity-missing');
    expect(blocker).toBeDefined();
    expect(blocker?.severity).toBe('blocker');
    expect(blocker?.message).toContain('Capacidade da competição não configurada');
  });

  it('7. Inscrições encerradas com quórum apto: orienta a "Realizar Sorteio Oficial"', () => {
    const closedCompetition: CompetitionRecord = {
      ...baseCompetition,
      status: 'registration-closed',
    };

    const teams: CompetitionTeam[] = ['t1', 't2'].map((id, index) => createTeam({
      id: `ct-${id}`,
      teamId: id,
      teamName: `Equipe ${index + 1}`,
      teamShortName: `EQ${index + 1}`,
      status: 'approved',
    }));

    const athletes = teams.flatMap((t) => createAthleteRoster(t.id, 6));

    const guide = CompetitionActionGuideService.evaluateCompetitionActionGuide({
      competition: closedCompetition,
      competitionTeams: teams,
      athletes,
    });

    expect(guide.scenario).toBe('READY_FOR_DRAW');
    expect(guide.title).toBe('Realizar Sorteio Oficial');
    expect(guide.drawEligibility.canExecuteDraw).toBe(true);
    expect(guide.drawEligibility.eligibleCount).toBe(2);
    expect(guide.primaryAction.route).toContain('/sorteio');
    expect(guide.canReopenRegistrations).toBe(true); // Exceção permitida
  });

  it('8. Inscrições encerradas com menos de 2 equipes aptas: bloqueia sorteio com explicação clara', () => {
    const closedCompetition: CompetitionRecord = {
      ...baseCompetition,
      status: 'registration-closed',
    };

    const team1 = createTeam({
      id: 'ct-1',
      teamId: 'team-1',
      teamName: 'Sada Cruzeiro',
      teamShortName: 'SAD',
      status: 'approved',
    });

    const guide = CompetitionActionGuideService.evaluateCompetitionActionGuide({
      competition: closedCompetition,
      competitionTeams: [team1],
      athletes: createAthleteRoster('ct-1', 6),
    });

    expect(guide.scenario).toBe('DRAW_BLOCKED');
    expect(guide.title).toBe('Regularizar Equipes para o Sorteio');
    expect(guide.drawEligibility.canExecuteDraw).toBe(false);
    expect(guide.drawEligibility.blockers.length).toBeGreaterThan(0);
    expect(guide.primaryAction.label).toBe('Revisar Inscrições e Elencos');
  });

  it('9. is_locked NÃO bloqueia equipe para o sorteio', () => {
    const closedCompetition: CompetitionRecord = {
      ...baseCompetition,
      status: 'registration-closed',
    };

    const team1 = createTeam({
      id: 'ct-1',
      teamId: 'team-1',
      teamName: 'Time 1',
      teamShortName: 'T1',
      isLocked: true, // Bloqueada para edições pela equipe
      status: 'approved',
    });
    const team2 = createTeam({
      id: 'ct-2',
      teamId: 'team-2',
      teamName: 'Time 2',
      teamShortName: 'T2',
      isLocked: true,
      status: 'approved',
    });

    const athletes = [
      ...createAthleteRoster('ct-1', 6),
      ...createAthleteRoster('ct-2', 6),
    ];

    const guide = CompetitionActionGuideService.evaluateCompetitionActionGuide({
      competition: closedCompetition,
      competitionTeams: [team1, team2],
      athletes,
    });

    expect(guide.drawEligibility.canExecuteDraw).toBe(true);
    expect(guide.drawEligibility.eligibleCount).toBe(2);
  });

  it('10. Grupos definidos / Sorteio realizado: orienta a "Iniciar os Jogos da Competição"', () => {
    const groupsDefinedComp: CompetitionRecord = {
      ...baseCompetition,
      status: 'groups-defined',
    };

    const guide = CompetitionActionGuideService.evaluateCompetitionActionGuide({
      competition: groupsDefinedComp,
      competitionTeams: [],
    });

    expect(guide.scenario).toBe('GROUPS_DEFINED');
    expect(guide.title).toBe('Iniciar os Jogos da Competição');
    expect(guide.primaryAction.route).toContain('/jogos');
  });

  it('11. Competição em andamento: orienta a "Lançar Resultados e Súmulas"', () => {
    const inProgressComp: CompetitionRecord = {
      ...baseCompetition,
      status: 'in-progress',
    };

    const matches: MatchRecord[] = [
      {
        id: 'm-1',
        competitionId: baseCompetition.id,
        teamAId: 'team-1',
        teamBId: 'team-2',
        teamAName: 'Time 1',
        teamBName: 'Time 2',
        phase: 'group',
        status: 'scheduled',
      } as unknown as MatchRecord,
    ];

    const guide = CompetitionActionGuideService.evaluateCompetitionActionGuide({
      competition: inProgressComp,
      competitionTeams: [],
      matches,
    });

    expect(guide.scenario).toBe('IN_PROGRESS');
    expect(guide.title).toBe('Lançar Resultados e Súmulas');
    expect(guide.primaryAction.route).toContain('/jogos');
  });

  it('12. Competição em mata-mata (playoffs): orienta a "Conduzir Fases Finais"', () => {
    const playoffsComp: CompetitionRecord = {
      ...baseCompetition,
      status: 'playoffs',
    };

    const guide = CompetitionActionGuideService.evaluateCompetitionActionGuide({
      competition: playoffsComp,
      competitionTeams: [],
    });

    expect(guide.scenario).toBe('PLAYOFFS');
    expect(guide.title).toBe('Conduzir Fases Finais (Mata-mata)');
  });

  it('13. Competição finalizada: orienta a "Visualizar Pódio e Relatórios"', () => {
    const completedComp: CompetitionRecord = {
      ...baseCompetition,
      status: 'completed',
    };

    const guide = CompetitionActionGuideService.evaluateCompetitionActionGuide({
      competition: completedComp,
      competitionTeams: [],
    });

    expect(guide.scenario).toBe('COMPLETED');
    expect(guide.title).toBe('Torneio Concluído');
    expect(guide.primaryAction.label).toBe('Visualizar Pódio e Relatórios');
  });

  it('14. Competição cancelada: estado terminal protegido', () => {
    const cancelledComp: CompetitionRecord = {
      ...baseCompetition,
      status: 'cancelled',
    };

    const guide = CompetitionActionGuideService.evaluateCompetitionActionGuide({
      competition: cancelledComp,
      competitionTeams: [],
    });

    expect(guide.scenario).toBe('CANCELLED');
    expect(guide.title).toBe('Competição Cancelada');
    expect(guide.canCloseRegistrations).toBe(false);
    expect(guide.canReopenRegistrations).toBe(false);
  });

  it('15. getBusinessStatusLabel converte enums técnicos para rótulos amigáveis de produto', () => {
    expect(CompetitionActionGuideService.getBusinessStatusLabel('planning')).toBe('Em preparação');
    expect(CompetitionActionGuideService.getBusinessStatusLabel('registration-open')).toBe('Inscrições abertas');
    expect(CompetitionActionGuideService.getBusinessStatusLabel('registration-closed')).toBe('Inscrições encerradas');
    expect(CompetitionActionGuideService.getBusinessStatusLabel('draw-pending')).toBe('Sorteio pendente');
    expect(CompetitionActionGuideService.getBusinessStatusLabel('groups-defined')).toBe('Grupos definidos');
    expect(CompetitionActionGuideService.getBusinessStatusLabel('in-progress')).toBe('Em andamento');
    expect(CompetitionActionGuideService.getBusinessStatusLabel('playoffs')).toBe('Mata-mata');
    expect(CompetitionActionGuideService.getBusinessStatusLabel('completed')).toBe('Finalizado');
    expect(CompetitionActionGuideService.getBusinessStatusLabel('cancelled')).toBe('Cancelado');
  });
});
