/**
 * Competition Readiness System — BaseOS
 *
 * Motor puro, determinístico e somente-leitura de avaliação do estado da competição.
 * Responsabilidades:
 *  - Ler dados reais do domínio (Competição, Modalidade, Locais, Equipes, Elencos, Sorteio, Jogos, Resultados)
 *  - Avaliar o status das 13 etapas sequenciais (completed, in_progress, pending, blocked, attention)
 *  - Identificar pendências reais com links de ação e ajuda
 *  - Calcular percentual ponderado do ciclo de vida operacional
 *  - Recomendar a próxima ação prioritária
 *  - Indicar prontidão para início e prontidão para homologação final
 */

import type {
  CompetitionRecord,
  MatchRecord,
  TeamRecord,
  ModalityRecord,
  VenueRecord,
} from '@/types/entities';
import type { CompetitionTeam, CompetitionAthlete } from '@/types/registration';
import type { DrawRecord } from '@/types/draw';
import type {
  StepStatus,
  GlobalCompetitionStage,
  EvaluatedJourneyStep,
  CompetitionPendingTask,
  CompetitionNextAction,
  CompetitionReadinessReport,
  EvaluateCompetitionData,
} from '@/types/readiness';
import { validateRosterMinimum, getRosterLimits } from '@/services/registrationService';
import { computePodium } from '@/services/playoffsService';
import { detectScheduleConflicts } from '@/services/scheduleConflictService';
import {
  buildCompetitionUrl,
  buildMatchesUrl,
  buildReportsUrl,
  buildDrawUrl,
  buildRegistrationsUrl,
} from '@/services/competitionNavigationHelper';

export function evaluateCompetitionReadiness(data: EvaluateCompetitionData): CompetitionReadinessReport {
  const comp = data.competition;
  const modalities = data.modalities ?? [];
  const venues = data.venues ?? [];
  const allTeams = data.teams ?? [];
  const compTeams = (data.competitionTeams ?? []).filter(ct => ct.competitionId === comp.id);
  const athletes = data.athletes ?? [];
  const draws = (data.draws ?? []).filter(d => d.competitionId === comp.id);
  const matches = (data.matches ?? []).filter(m => m.competitionId === comp.id);

  const pendingTasks: CompetitionPendingTask[] = [];
  const steps: EvaluatedJourneyStep[] = [];

  // =========================================================================
  // ETAPA 01 — COMPETIÇÃO
  // =========================================================================
  const hasName = Boolean(comp.name && comp.name.trim());
  const hasModality = Boolean(comp.modality);
  const hasPeriod = Boolean(comp.startDate);
  const isCancelled = comp.status === 'cancelled';

  let step01Status: StepStatus = 'completed';
  const step01Blockers: string[] = [];
  const step01Warnings: string[] = [];

  if (!hasName) {
    step01Status = 'attention';
    step01Blockers.push('Nome da competição não informado.');
    pendingTasks.push({
      id: 'task-comp-name',
      severity: 'blocker',
      title: 'Nome da competição ausente',
      description: 'Informe o nome oficial da competição para prosseguir.',
      route: buildCompetitionUrl(comp.id, 'config'),
      actionLabel: 'Editar Competição',
      articleId: 'criar-competicao',
    });
  }
  if (!hasPeriod) {
    step01Warnings.push('Data de início da competição não definida.');
    pendingTasks.push({
      id: 'task-comp-period',
      severity: 'warning',
      title: 'Data de início pendente',
      description: 'Configure as datas de início e encerramento previstas.',
      route: buildCompetitionUrl(comp.id, 'config'),
      actionLabel: 'Definir Datas',
      articleId: 'criar-competicao',
    });
  }

  steps.push({
    stepNumber: '01',
    id: 'etapa-01-competicao',
    title: 'Competição',
    description: step01Status === 'completed'
      ? 'Dados cadastrais da competição configurados.'
      : 'Configuração cadastral básica pendente.',
    status: step01Status,
    metrics: [
      { label: 'Status Oficial', value: comp.status },
      { label: 'Modalidade', value: comp.modality === 'beach' ? 'Praia' : 'Quadra' },
    ],
    blockers: step01Blockers.length > 0 ? step01Blockers : undefined,
    warnings: step01Warnings.length > 0 ? step01Warnings : undefined,
    articleId: 'criar-competicao',
    route: buildCompetitionUrl(comp.id, 'config'),
    actionLabel: 'Gerenciar Competição',
    guideLabel: 'Ver como criar',
  });

  // =========================================================================
  // ETAPA 02 — MODALIDADE
  // =========================================================================
  const matchedModality = modalities.find(m => m.id === comp.modalityId || m.type === comp.modality);
  const setFormat = comp.setFormat || matchedModality?.defaultSetFormat || '3-sets';
  const playerFormat = comp.playerFormat || matchedModality?.defaultPlayerFormat || (comp.modality === 'beach' ? '2x2' : '6x6');
  
  let step02Status: StepStatus = 'completed';
  const step02Warnings: string[] = [];

  if (!comp.setFormat && !matchedModality) {
    step02Status = 'attention';
    step02Warnings.push('Formato de sets não definido na competição ou modalidade.');
    pendingTasks.push({
      id: 'task-modality-sets',
      severity: 'warning',
      title: 'Regras de sets pendentes',
      description: 'Defina se a disputa será em melhor de 3 ou melhor de 5 sets.',
      route: '/modalidades',
      actionLabel: 'Configurar Modalidade',
      articleId: 'configurar-modalidade',
    });
  }

  steps.push({
    stepNumber: '02',
    id: 'etapa-02-modalidade',
    title: 'Modalidade',
    description: `Formato ${playerFormat}, regras de sets (${setFormat}).`,
    status: step02Status,
    metrics: [
      { label: 'Formato', value: playerFormat },
      { label: 'Sets', value: setFormat === '5-sets' ? 'Melhor de 5' : 'Melhor de 3' },
    ],
    warnings: step02Warnings.length > 0 ? step02Warnings : undefined,
    articleId: 'configurar-modalidade',
    route: '/modalidades',
    actionLabel: 'Configurar Modalidade',
    guideLabel: 'Ver regras de modalidade',
  });

  // =========================================================================
  // ETAPA 03 — LOCAIS E QUADRAS
  // =========================================================================
  const totalVenues = venues.length;
  const totalCourts = venues.reduce((acc, v) => acc + (v.courts?.length || (v.courtDetails?.filter(c => c.status === 'active').length || 1)), 0);
  
  let step03Status: StepStatus = 'completed';
  const step03Warnings: string[] = [];

  if (totalVenues === 0 && !comp.venue) {
    step03Status = 'attention';
    step03Warnings.push('Nenhum local ou praça esportiva cadastrada no sistema.');
    pendingTasks.push({
      id: 'task-venues-empty',
      severity: 'warning',
      title: 'Nenhum local cadastrado',
      description: 'Cadastre os ginásios e quadras onde as partidas serão realizadas.',
      route: '/locais',
      actionLabel: 'Cadastrar Locais',
      articleId: 'configurar-locais-quadras',
    });
  }

  steps.push({
    stepNumber: '03',
    id: 'etapa-03-locais-quadras',
    title: 'Locais e Quadras',
    description: totalVenues > 0 ? `${totalVenues} locais e ${totalCourts} quadras disponíveis.` : (comp.venue ? `Local principal: ${comp.venue}` : 'Nenhum local cadastrado.'),
    status: step03Status,
    metrics: [
      { label: 'Locais', value: totalVenues || (comp.venue ? 1 : 0) },
      { label: 'Quadras', value: totalCourts || (comp.courtsCount || 1) },
    ],
    warnings: step03Warnings.length > 0 ? step03Warnings : undefined,
    articleId: 'configurar-locais-quadras',
    route: '/locais',
    actionLabel: 'Gerenciar Locais',
    guideLabel: 'Ver cadastro de quadras',
  });

  // =========================================================================
  // ETAPA 04 — EQUIPES
  // =========================================================================
  // Equipes inscritas na competição
  const registeredTeamIds = new Set(compTeams.map(ct => ct.teamId));
  const registeredTeams = allTeams.filter(t => registeredTeamIds.has(t.id));
  const enrolledCount = Math.max(compTeams.length, registeredTeams.length);

  let step04Status: StepStatus = 'completed';
  const step04Blockers: string[] = [];

  if (enrolledCount === 0) {
    step04Status = 'pending';
    step04Blockers.push('Nenhuma equipe inscrita nesta competição.');
    pendingTasks.push({
      id: 'task-teams-empty',
      severity: 'blocker',
      title: 'Nenhuma equipe cadastrada',
      description: 'Cadastre as equipes participantes ou gere o link de auto-inscrição.',
      route: buildRegistrationsUrl(comp.id),
      actionLabel: 'Inscrever Equipes',
      articleId: 'cadastrar-equipe',
    });
  } else if (enrolledCount === 1) {
    step04Status = 'attention';
    step04Blockers.push('Apenas 1 equipe cadastrada. É necessário no mínimo 2 equipes para disputar partidas.');
    pendingTasks.push({
      id: 'task-teams-min',
      severity: 'blocker',
      title: 'Mínimo de equipes não atingido',
      description: 'Cadastre ao menos mais uma equipe para viabilizar os confrontos.',
      route: buildRegistrationsUrl(comp.id),
      actionLabel: 'Adicionar Equipes',
      articleId: 'cadastrar-equipe',
    });
  }

  const isPreCompetition = comp.status !== 'in-progress' && comp.status !== 'completed' && comp.status !== 'cancelled' && draws.length === 0 && matches.length === 0;
  const submittedTeams = compTeams.filter(ct => ct.status === 'submitted');
  if (submittedTeams.length > 0 && isPreCompetition) {
    pendingTasks.push({
      id: 'task-registrations-submitted',
      severity: 'warning',
      title: `${submittedTeams.length} inscrição(ões) aguardando confirmação`,
      description: 'Analise o elenco das equipes que finalizaram o cadastro e confirme sua participação oficial.',
      route: buildRegistrationsUrl(comp.id),
      actionLabel: 'Revisar Inscrições',
      articleId: 'cadastrar-equipe',
    });
  }

  steps.push({
    stepNumber: '04',
    id: 'etapa-04-equipes',
    title: 'Equipes',
    description: enrolledCount >= 2 ? `${enrolledCount} equipes inscritas e aptas.` : `${enrolledCount} equipe(s) inscrita(s).`,
    status: step04Status,
    metrics: [
      { label: 'Inscritas', value: enrolledCount },
    ],
    blockers: step04Blockers.length > 0 ? step04Blockers : undefined,
    articleId: 'cadastrar-equipe',
    route: buildCompetitionUrl(comp.id, 'teams'),
    actionLabel: 'Gerenciar Equipes',
    guideLabel: 'Ver como cadastrar',
  });

  // =========================================================================
  // ETAPA 05 — ATLETAS E ELENCOS
  // =========================================================================
  const rosterLimits = getRosterLimits(playerFormat);
  const teamsWithRosterIssues: { teamName: string; reason: string }[] = [];

  if (enrolledCount > 0) {
    compTeams.forEach(ct => {
      const teamAthletes = athletes.filter(a => a.competitionTeamId === ct.id);
      const team = allTeams.find(t => t.id === ct.teamId);
      const teamName = team?.name || 'Equipe';

      const minCheck = validateRosterMinimum(teamAthletes, playerFormat);
      if (!minCheck.valid) {
        teamsWithRosterIssues.push({
          teamName,
          reason: `Abaixo do mínimo de ${rosterLimits.min} atletas (atual: ${teamAthletes.length}).`,
        });
      }

      // Check camisa duplicada
      const jerseyNumbers = teamAthletes.map(a => a.jerseyNumber).filter(j => j !== undefined && j !== null);
      const uniqueJerseys = new Set(jerseyNumbers);
      if (jerseyNumbers.length !== uniqueJerseys.size) {
        teamsWithRosterIssues.push({
          teamName,
          reason: 'Camisas duplicadas encontradas no elenco.',
        });
      }

      // Check capitão
      const captains = teamAthletes.filter(a => a.isCaptain);
      if (teamAthletes.length >= rosterLimits.min && captains.length === 0) {
        teamsWithRosterIssues.push({
          teamName,
          reason: 'Capitão da equipe não foi definido.',
        });
      }
    });
  }

  let step05Status: StepStatus = 'completed';
  const step05Warnings: string[] = [];

  if (enrolledCount === 0) {
    step05Status = 'blocked';
  } else if (teamsWithRosterIssues.length > 0) {
    step05Status = 'attention';
    step05Warnings.push(`${teamsWithRosterIssues.length} equipe(s) com pendências no elenco.`);
    teamsWithRosterIssues.slice(0, 3).forEach(issue => {
      pendingTasks.push({
        id: `task-roster-${issue.teamName}`,
        severity: 'warning',
        title: `Elenco pendente: ${issue.teamName}`,
        description: issue.reason,
        route: buildCompetitionUrl(comp.id, 'athletes'),
        actionLabel: 'Ajustar Elenco',
        articleId: 'cadastrar-atleta',
      });
    });
  }

  steps.push({
    stepNumber: '05',
    id: 'etapa-05-atletas-elencos',
    title: 'Atletas e Elencos',
    description: teamsWithRosterIssues.length === 0 && enrolledCount > 0
      ? `Elencos de todas as ${enrolledCount} equipes configurados e válidos.`
      : (enrolledCount === 0 ? 'Aguardando cadastro de equipes.' : `${teamsWithRosterIssues.length} equipe(s) com pendências de elenco.`),
    status: step05Status,
    metrics: [
      { label: 'Total Atletas', value: athletes.length },
      { label: 'Pendências', value: teamsWithRosterIssues.length },
    ],
    warnings: step05Warnings.length > 0 ? step05Warnings : undefined,
    articleId: 'cadastrar-atleta',
    route: buildCompetitionUrl(comp.id, 'athletes'),
    actionLabel: 'Gerenciar Atletas',
    guideLabel: 'Ver regras de elenco',
  });

  // =========================================================================
  // ETAPA 06 — GRUPOS E SORTEIO
  // =========================================================================
  const drawRecord = draws[0];
  const hasDrawGroups = Boolean(drawRecord?.groups && drawRecord.groups.length > 0);
  const groupsFromMatches = new Set(matches.map(m => m.groupName).filter(Boolean));
  const groupsCount = hasDrawGroups ? drawRecord.groups.length : groupsFromMatches.size;

  let step06Status: StepStatus = 'completed';
  const step06Blockers: string[] = [];

  if (enrolledCount < 2) {
    step06Status = 'blocked';
    step06Blockers.push('Inscreva ao menos 2 equipes para realizar o sorteio de grupos.');
  } else if (!hasDrawGroups && groupsFromMatches.size === 0 && matches.length === 0) {
    step06Status = 'pending';
    step06Blockers.push('Equipes cadastradas, mas ainda não distribuídas nos grupos.');
    pendingTasks.push({
      id: 'task-draw-pending',
      severity: 'blocker',
      title: 'Sorteio de grupos pendente',
      description: 'Distribua as equipes inscritas em grupos (Chaves A, B...) para gerar os confrontos.',
      route: buildDrawUrl(comp.id),
      actionLabel: 'Realizar Sorteio',
      articleId: 'sorteio-grupos',
    });
  }

  steps.push({
    stepNumber: '06',
    id: 'etapa-06-grupos-sorteio',
    title: 'Grupos e Sorteio',
    description: groupsCount > 0
      ? `${groupsCount} grupo(s) configurado(s) com equipes distribuídas.`
      : 'Distribuição de equipes em grupos pendente.',
    status: step06Status,
    metrics: [
      { label: 'Grupos', value: groupsCount },
    ],
    blockers: step06Blockers.length > 0 ? step06Blockers : undefined,
    articleId: 'sorteio-grupos',
    route: buildDrawUrl(comp.id),
    actionLabel: 'Abrir Sorteio e Grupos',
    guideLabel: 'Ver como sortear',
  });

  // =========================================================================
  // ETAPA 07 — REGRAS DE CLASSIFICAÇÃO
  // =========================================================================
  const hasTiebreakRules = Boolean(comp.tiebreakCriteriaOrder && comp.tiebreakCriteriaOrder.length > 0) || Boolean(comp.tiebreakCriteria && comp.tiebreakCriteria.length > 0);
  let step07Status: StepStatus = 'completed';

  if (!hasTiebreakRules) {
    step07Status = 'attention';
    pendingTasks.push({
      id: 'task-standings-rules',
      severity: 'info',
      title: 'Critérios de desempate',
      description: 'Revise a ordem de critérios de desempate da competição (FIVB/CBV).',
      route: buildCompetitionUrl(comp.id, 'config'),
      actionLabel: 'Revisar Classificação',
      articleId: 'regras-classificacao',
    });
  }

  steps.push({
    stepNumber: '07',
    id: 'etapa-07-classificacao',
    title: 'Classificação',
    description: 'Regras de pontuação oficial e critérios de desempate configurados.',
    status: step07Status,
    metrics: [
      { label: 'Critérios', value: comp.tiebreakCriteriaOrder?.length || 7 },
      { label: 'Classificados/Grupo', value: comp.advancingPerGroup || 2 },
    ],
    articleId: 'regras-classificacao',
    route: buildCompetitionUrl(comp.id, 'standings'),
    actionLabel: 'Ver Classificação',
    guideLabel: 'Ver critérios de desempate',
  });

  // =========================================================================
  // ETAPA 08 — CONFRONTOS
  // =========================================================================
  const groupMatches = matches.filter(m => !m.phase || m.phase === 'group' || m.phase === 'classificatória' || Boolean(m.groupName));
  let step08Status: StepStatus = 'completed';
  const step08Blockers: string[] = [];

  if (step06Status === 'blocked' || step06Status === 'pending') {
    step08Status = 'blocked';
    step08Blockers.push('Configure e confirme os grupos antes de gerar os confrontos.');
  } else if (matches.length === 0) {
    step08Status = 'pending';
    step08Blockers.push('Grupos definidos, mas a tabela de confrontos ainda não foi gerada.');
    pendingTasks.push({
      id: 'task-matches-generate',
      severity: 'blocker',
      title: 'Confrontos não gerados',
      description: 'Gere a tabela de partidas da fase de grupos para programar as rodadas.',
      route: buildDrawUrl(comp.id),
      actionLabel: 'Gerar Tabela de Jogos',
      articleId: 'gerar-confrontos',
    });
  }

  steps.push({
    stepNumber: '08',
    id: 'etapa-08-confrontos',
    title: 'Confrontos',
    description: matches.length > 0 ? `${matches.length} partidas geradas para o campeonato.` : 'Geração de confrontos pendente.',
    status: step08Status,
    metrics: [
      { label: 'Partidas Geradas', value: matches.length },
    ],
    blockers: step08Blockers.length > 0 ? step08Blockers : undefined,
    articleId: 'gerar-confrontos',
    route: buildMatchesUrl(comp.id),
    actionLabel: 'Ver Jogos Gerados',
    guideLabel: 'Ver geração de jogos',
  });

  // =========================================================================
  // ETAPA 09 — TABELA E HORÁRIOS
  // =========================================================================
  const matchesWithoutDate = matches.filter(m => !m.scheduledTime);
  const matchesWithoutCourt = matches.filter(m => !m.court && !m.venue);
  
  let step09Status: StepStatus = 'completed';
  const step09Warnings: string[] = [];

  if (matches.length === 0) {
    step09Status = 'blocked';
  } else if (matchesWithoutDate.length > 0 || matchesWithoutCourt.length > 0) {
    step09Status = 'attention';
    if (matchesWithoutDate.length > 0) {
      step09Warnings.push(`${matchesWithoutDate.length} partida(s) sem data/horário definido.`);
      pendingTasks.push({
        id: 'task-match-schedule-time',
        severity: 'warning',
        title: `${matchesWithoutDate.length} jogo(s) sem horário`,
        description: 'Defina os horários de início das partidas para publicação da tabela.',
        route: buildMatchesUrl(comp.id),
        actionLabel: 'Definir Horários',
        articleId: 'montar-tabela-jogos',
      });
    }
    if (matchesWithoutCourt.length > 0) {
      step09Warnings.push(`${matchesWithoutCourt.length} partida(s) sem quadra atribuída.`);
      pendingTasks.push({
        id: 'task-match-schedule-court',
        severity: 'warning',
        title: `${matchesWithoutCourt.length} jogo(s) sem quadra`,
        description: 'Aloque as quadras de jogo para evitar conflitos de local.',
        route: buildMatchesUrl(comp.id),
        actionLabel: 'Alocar Quadras',
        articleId: 'montar-tabela-jogos',
      });
    }
  }

  steps.push({
    stepNumber: '09',
    id: 'etapa-09-tabela',
    title: 'Tabela e Horários',
    description: matches.length > 0 && matchesWithoutCourt.length === 0 && matchesWithoutDate.length === 0
      ? 'Todas as partidas possuem data, horário e quadra atribuídos.'
      : (matches.length === 0 ? 'Aguardando geração de confrontos.' : `${matchesWithoutDate.length} sem horário / ${matchesWithoutCourt.length} sem quadra.`),
    status: step09Status,
    metrics: [
      { label: 'Com Horário', value: `${matches.length - matchesWithoutDate.length}/${matches.length}` },
      { label: 'Com Quadra', value: `${matches.length - matchesWithoutCourt.length}/${matches.length}` },
    ],
    warnings: step09Warnings.length > 0 ? step09Warnings : undefined,
    articleId: 'montar-tabela-jogos',
    route: buildMatchesUrl(comp.id),
    actionLabel: 'Escalar Partidas',
    guideLabel: 'Ver agendamento',
  });

  // =========================================================================
  // ETAPA 10 — REALIZAÇÃO DAS PARTIDAS
  // =========================================================================
  const scheduledCount = matches.filter(m => m.status === 'scheduled' || m.status === 'awaiting_schedule' || !m.status).length;
  const inProgressCount = matches.filter(m => m.status === 'in-progress' || m.status === 'warmup' || m.status === 'timeout' || m.status === 'set-break').length;
  const completedCount = matches.filter(m => m.status === 'completed' || m.status === 'homologated' || m.status === 'awaiting_homologation' || m.status === 'wo').length;
  const matchCompletionPct = matches.length > 0 ? Math.round((completedCount / matches.length) * 100) : 0;

  let step10Status: StepStatus = 'pending';
  if (matches.length === 0) {
    step10Status = 'blocked';
  } else if (completedCount === matches.length && matches.length > 0) {
    step10Status = 'completed';
  } else if (completedCount > 0 || inProgressCount > 0) {
    step10Status = 'in_progress';
  }

  steps.push({
    stepNumber: '10',
    id: 'etapa-10-partidas',
    title: 'Realização das Partidas',
    description: matches.length > 0
      ? `${completedCount} de ${matches.length} partidas concluídas (${matchCompletionPct}%).`
      : 'Nenhuma partida programada.',
    status: step10Status,
    metrics: [
      { label: 'Concluídas', value: completedCount },
      { label: 'Ao Vivo', value: inProgressCount },
      { label: 'Agendadas', value: scheduledCount },
    ],
    articleId: 'abrir-partida',
    route: buildMatchesUrl(comp.id),
    actionLabel: 'Central de Jogos',
    guideLabel: 'Ver operação de jogo',
  });

  // =========================================================================
  // ETAPA 11 — SÚMULAS E RESULTADOS
  // =========================================================================
  const finishedMatchesWithoutSets = matches.filter(m => (m.status === 'completed' || m.status === 'homologated') && (!m.sets || m.sets.length === 0));
  let step11Status: StepStatus = 'pending';

  if (completedCount === 0) {
    step11Status = matches.length === 0 ? 'blocked' : 'pending';
  } else if (finishedMatchesWithoutSets.length > 0) {
    step11Status = 'attention';
    pendingTasks.push({
      id: 'task-missing-sets',
      severity: 'blocker',
      title: `${finishedMatchesWithoutSets.length} jogo(s) sem placar de sets`,
      description: 'Partidas marcadas como finalizadas não possuem as parciais registradas.',
      route: buildMatchesUrl(comp.id),
      actionLabel: 'Lançar Placar',
      articleId: 'lancar-resultado-sets',
    });
  } else {
    step11Status = completedCount === matches.length && matches.length > 0 ? 'completed' : 'in_progress';
  }

  steps.push({
    stepNumber: '11',
    id: 'etapa-11-sumulas-resultados',
    title: 'Súmulas e Resultados',
    description: finishedMatchesWithoutSets.length === 0 && completedCount > 0
      ? `Resultados e súmulas válidas para ${completedCount} partida(s) finalizada(s).`
      : (finishedMatchesWithoutSets.length > 0 ? `${finishedMatchesWithoutSets.length} partida(s) com súmula/sets pendentes.` : 'Aguardando encerramento das partidas.'),
    status: step11Status,
    metrics: [
      { label: 'Súmulas Válidas', value: completedCount - finishedMatchesWithoutSets.length },
      { label: 'Pendentes', value: finishedMatchesWithoutSets.length },
    ],
    articleId: 'gerar-sumula',
    route: '/sumulas',
    actionLabel: 'Visualizar Súmulas',
    guideLabel: 'Ver emissão de súmulas',
  });

  // =========================================================================
  // ETAPA 12 — FASES FINAIS (MATA-MATA)
  // =========================================================================
  const playoffMatches = matches.filter(m => m.phase && ['oitavas', 'quartas', 'semifinal', 'terceiro_lugar', 'final'].includes(m.phase));
  const hasPlayoffs = playoffMatches.length > 0;
  const playoffCompleted = playoffMatches.filter(m => m.status === 'completed' || m.status === 'homologated').length;

  let step12Status: StepStatus = 'pending';

  if (matches.length === 0 || completedCount < groupMatches.length) {
    step12Status = 'blocked';
  } else if (!hasPlayoffs && groupMatches.length > 0 && completedCount >= groupMatches.length) {
    step12Status = 'pending';
    pendingTasks.push({
      id: 'task-generate-playoffs',
      severity: 'blocker',
      title: 'Fase de grupos concluída: Gerar Mata-mata',
      description: 'Todas as partidas dos grupos foram finalizadas. Gere a fase eliminatória para definir o pódio.',
      route: buildMatchesUrl(comp.id),
      actionLabel: 'Gerar Fases Finais',
      articleId: 'fases-finais-mata-mata',
    });
  } else if (hasPlayoffs && playoffCompleted === playoffMatches.length) {
    step12Status = 'completed';
  } else if (hasPlayoffs) {
    step12Status = 'in_progress';
  }

  steps.push({
    stepNumber: '12',
    id: 'etapa-12-fases-finais',
    title: 'Fases Finais',
    description: hasPlayoffs
      ? `${playoffCompleted} de ${playoffMatches.length} jogos eliminatórios concluídos.`
      : (completedCount >= groupMatches.length && groupMatches.length > 0 ? 'Fase de grupos encerrada. Pronta para mata-mata.' : 'Aguardando conclusão da fase classificatória.'),
    status: step12Status,
    metrics: [
      { label: 'Jogos Mata-mata', value: playoffMatches.length },
      { label: 'Concluídos', value: playoffCompleted },
    ],
    articleId: 'fases-finais-mata-mata',
    route: buildCompetitionUrl(comp.id, 'matches'),
    actionLabel: 'Fases da Competição',
    guideLabel: 'Ver mata-mata',
  });

  // =========================================================================
  // ETAPA 13 — HOMOLOGAÇÃO E ENCERRAMENTO
  // =========================================================================
  const podium = computePodium(matches);
  const hasPodium = Boolean(podium.championTeamId || comp.championTeamId);
  const allMatchesFinished = matches.length > 0 && completedCount === matches.length;
  const noCriticalBlockers = pendingTasks.filter(t => t.severity === 'blocker').length === 0;
  
  const canHomologate = allMatchesFinished && hasPodium && noCriticalBlockers && comp.status !== 'completed';

  let step13Status: StepStatus = 'pending';
  if (comp.status === 'completed') {
    step13Status = 'completed';
  } else if (canHomologate) {
    step13Status = 'in_progress';
    pendingTasks.push({
      id: 'task-ready-to-homologate',
      severity: 'info',
      title: '🏆 Competição pronta para homologação',
      description: 'Todas as partidas e o pódio foram apurados. Realize a homologação formal para encerramento.',
      route: buildCompetitionUrl(comp.id, 'standings'),
      actionLabel: 'Homologar Torneio',
      articleId: 'relatorios-encerramento',
    });
  } else {
    step13Status = 'blocked';
  }

  steps.push({
    stepNumber: '13',
    id: 'etapa-13-homologacao',
    title: 'Homologação e Encerramento',
    description: comp.status === 'completed'
      ? 'Competição formalmente homologada e encerrada.'
      : (canHomologate ? 'Pronta para homologação oficial.' : 'Aguardando finalização de todas as partidas e apuração do pódio.'),
    status: step13Status,
    metrics: [
      { label: 'Campeão', value: (allTeams.find(t => t.id === (comp.championTeamId || podium.championTeamId))?.name) || (comp.status === 'completed' ? 'Apurado' : 'A definir') },
      { label: 'Homologação', value: comp.status === 'completed' ? 'Sim' : (canHomologate ? 'Pronta' : 'Pendente') },
    ],
    articleId: 'relatorios-encerramento',
    route: buildReportsUrl(comp.id),
    actionLabel: 'Emitir Boletins',
    guideLabel: 'Ver encerramento',
  });

  // =========================================================================
  // CÁLCULO DO PROGRESSO OPERACIONAL PONDERADO
  // =========================================================================
  // Pesos:
  // - Preparação (Etapas 01 a 05): 30% (6% cada)
  // - Programação (Etapas 06 a 09): 20% (5% cada)
  // - Execução & Súmulas (Etapas 10 e 11): 35% (Etapa 10: 25% * % concluído + Etapa 11: 10% * % súmulas válidas)
  // - Fases Finais (Etapa 12): 10% (5% gerado + 5% concluído)
  // - Homologação (Etapa 13): 5%
  let weightedProgress = 0;

  // Etapas 01 a 05
  [0, 1, 2, 3, 4].forEach(idx => {
    if (steps[idx].status === 'completed') weightedProgress += 6;
    else if (steps[idx].status === 'in_progress' || steps[idx].status === 'attention') weightedProgress += 3;
  });

  // Etapas 06 a 09
  [5, 6, 7, 8].forEach(idx => {
    if (steps[idx].status === 'completed') weightedProgress += 5;
    else if (steps[idx].status === 'in_progress' || steps[idx].status === 'attention') weightedProgress += 2.5;
  });

  // Etapa 10 (Execução de partidas: até 25%)
  if (matches.length > 0) {
    weightedProgress += Math.round((completedCount / matches.length) * 25);
  }

  // Etapa 11 (Súmulas válidas: até 10%)
  if (completedCount > 0) {
    const validScoresCount = completedCount - finishedMatchesWithoutSets.length;
    weightedProgress += Math.round((validScoresCount / completedCount) * 10);
  }

  // Etapa 12 (Fases Finais: até 10%)
  if (hasPlayoffs) {
    weightedProgress += 5;
    if (playoffCompleted === playoffMatches.length && playoffMatches.length > 0) {
      weightedProgress += 5;
    }
  }

  // Etapa 13 (Homologação: 5%)
  if (comp.status === 'completed') {
    weightedProgress += 5;
  } else if (canHomologate) {
    weightedProgress += 3;
  }

  const finalPercentage = Math.min(100, Math.max(0, Math.round(weightedProgress)));
  const completedStepsCount = steps.filter(s => s.status === 'completed').length;

  // =========================================================================
  // DETERMINAÇÃO DO ESTÁGIO GLOBAL
  // =========================================================================
  let globalStage: GlobalCompetitionStage = 'PREPARACAO';
  let globalStageLabel = 'Fase de Preparação';

  if (comp.status === 'completed') {
    globalStage = 'HOMOLOGADA';
    globalStageLabel = 'Homologada / Concluída';
  } else if (comp.status === 'cancelled') {
    globalStage = 'ENCERRADA';
    globalStageLabel = 'Cancelada / Encerrada';
  } else if (canHomologate) {
    globalStage = 'PRONTA_PARA_HOMOLOGACAO';
    globalStageLabel = 'Pronta para Homologação';
  } else if (hasPlayoffs && playoffCompleted < playoffMatches.length) {
    globalStage = 'FASES_FINAIS';
    globalStageLabel = 'Fases Finais / Playoffs';
  } else if (inProgressCount > 0 || (completedCount > 0 && completedCount < matches.length)) {
    globalStage = 'EM_ANDAMENTO';
    globalStageLabel = 'Competição em Andamento';
  } else if (steps[0].status === 'completed' && steps[3].status === 'completed' && steps[5].status === 'completed' && steps[7].status === 'completed' && matches.length > 0) {
    globalStage = 'PRONTA_PARA_INICIAR';
    globalStageLabel = 'Pronta para Iniciar Jogos';
  } else {
    globalStage = 'PREPARACAO';
    globalStageLabel = 'Fase de Preparação';
  }

  // =========================================================================
  // DETERMINAÇÃO DA PRÓXIMA AÇÃO RECOMENDADA
  // =========================================================================
  let nextAction: CompetitionNextAction | null = null;

  const blockerTask = pendingTasks.find(t => t.severity === 'blocker');
  const warningTask = pendingTasks.find(t => t.severity === 'warning');

  if (blockerTask) {
    nextAction = {
      title: blockerTask.title,
      description: blockerTask.description,
      route: blockerTask.route,
      actionLabel: blockerTask.actionLabel,
      articleId: blockerTask.articleId,
      guideLabel: 'Ver guia passo a passo',
    };
  } else if (warningTask) {
    nextAction = {
      title: warningTask.title,
      description: warningTask.description,
      route: warningTask.route,
      actionLabel: warningTask.actionLabel,
      articleId: warningTask.articleId,
      guideLabel: 'Ver guia passo a passo',
    };
  } else if (globalStage === 'PRONTA_PARA_INICIAR') {
    nextAction = {
      title: 'Iniciar as primeiras partidas',
      description: 'A tabela e as equipes estão prontas. Faça o check-in na quadra e inicie a rodada de abertura.',
      route: buildMatchesUrl(comp.id),
      actionLabel: 'Ir para Central de Jogos',
      articleId: 'abrir-partida',
      guideLabel: 'Como operar partidas',
    };
  } else if (globalStage === 'EM_ANDAMENTO' || globalStage === 'FASES_FINAIS') {
    nextAction = {
      title: 'Conduzir partidas e registrar placares',
      description: `${scheduledCount + inProgressCount} partida(s) pendente(s) de conclusão.`,
      route: buildMatchesUrl(comp.id),
      actionLabel: 'Lançar Resultados',
      articleId: 'lancar-resultado-sets',
      guideLabel: 'Como lançar sets',
    };
  } else if (globalStage === 'PRONTA_PARA_HOMOLOGACAO') {
    nextAction = {
      title: 'Homologar resultados e encerrar',
      description: 'Todos os jogos foram finalizados e o campeão foi apurado.',
      route: buildCompetitionUrl(comp.id, 'standings'),
      actionLabel: 'Homologar Competição',
      articleId: 'relatorios-encerramento',
      guideLabel: 'Como homologar',
    };
  }

  return {
    competitionId: comp.id,
    competitionName: comp.name,
    percentage: finalPercentage,
    completedStepsCount,
    totalStepsCount: 13,
    globalStage,
    globalStageLabel,
    steps,
    pendingTasks,
    nextAction,
    canHomologate,
    matchesStats: {
      total: matches.length,
      scheduled: scheduledCount,
      inProgress: inProgressCount,
      completed: completedCount,
      percentageCompleted: matchCompletionPct,
    },
  };
}
