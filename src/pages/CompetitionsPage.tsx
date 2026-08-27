/**
 * CompetitionsPage — Gestão de Competições e Torneios do BaseOS
 *
 * Responsabilidades:
 * - Ciclo completo: planejamento, inscrições, sorteio, confrontos, classificação e relatórios
 * - Master-Detail com filtros rápidos (busca por nome, modalidade, status)
 * - Orquestração modularizada com componentes especializados por domínio
 * - Preservação estrita de regras esportivas, permissões (RBAC / useCapability), auditoria (AuditService) e geração de PDF
 *
 * Design System:
 * - Enterprise Dark SaaS (Zinc-950/900, Âmbar-500)
 * - Tratamento de 4 estados (Loading, Normal, Empty, Error)
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Section, SectionCard } from '@/components/ui/Section';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { StateContainer } from '@/components/ui/StateContainer';
import { CompetitionHeader, type CompetitionTab } from '@/components/competition/CompetitionHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Calendar,
  Dices,
  FileSpreadsheet,
} from 'lucide-react';
import { dataAccess } from '@/services/dataAccess';
import { computeStandingsByGroup, computeBestThirds } from '@/services/standingsService';
import { computePodium } from '@/services/playoffsService';
import { generateStandingsReportPdf, downloadReportsPdf } from '@/lib/pdf/reportsPdf';
import { evaluateCompetitionReadiness } from '@/services/competitionReadinessService';
import type { CompetitionRecord, MatchRecord, TeamRecord, ModalityRecord, VenueRecord, CompetitionLifecycleStatus } from '@/types/entities';
import type { CompetitionAthlete, CompetitionTeam } from '@/types/registration';
import { useAuth } from '@/components/auth/useAuth';
import { useCapability } from '@/hooks/useCapability';
import { ConfirmActionDialog } from '@/components/common/ConfirmActionDialog';
import { AuditService } from '@/lib/security';
import { CompetitionLifecycleService } from '@/services/competitionLifecycleService';
import { ContextualHelpButton } from '@/components/help/ContextualHelpButton';

// Componentes Modularizados (Fase 9.3)
import { CompetitionSidebarList } from '@/components/competition/CompetitionSidebarList';
import { CompetitionOverviewTab } from '@/components/competition/tabs/CompetitionOverviewTab';
import { CompetitionConfigTab } from '@/components/competition/tabs/CompetitionConfigTab';
import { CompetitionTeamsTab } from '@/components/competition/tabs/CompetitionTeamsTab';
import { CompetitionAthletesTab } from '@/components/competition/tabs/CompetitionAthletesTab';
import { CompetitionStandingsTab } from '@/components/competition/tabs/CompetitionStandingsTab';
import { CompetitionFormDialog } from '@/components/competition/dialogs/CompetitionFormDialog';
import { CompetitionSettingsEditDialog } from '@/components/competition/dialogs/CompetitionSettingsEditDialog';

export default function CompetitionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { session } = useAuth();
  const { can } = useCapability();

  // Estados de dados
  const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);
  const [modalities, setModalities] = useState<ModalityRecord[]>([]);
  const [venues, setVenues] = useState<VenueRecord[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [competitionTeams, setCompetitionTeams] = useState<CompetitionTeam[]>([]);
  const [competitionAthletes, setCompetitionAthletes] = useState<CompetitionAthlete[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  
  // Estados de controle e interface
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CompetitionTab>('overview');
  const [createOpen, setCreateOpen] = useState(false);
  const [editConfigOpen, setEditConfigOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<CompetitionLifecycleStatus | null>(null);

  // Estados de filtros da lista
  const [searchTerm, setSearchTerm] = useState('');
  const [modalityFilter, setModalityFilter] = useState<'all' | 'indoor' | 'beach'>('all');

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setIsError(false);
      const [comps, mods, vns, tms, cts, aths, ms] = await Promise.all([
        dataAccess.listCompetitions(),
        dataAccess.listModalities(),
        dataAccess.listVenues(),
        dataAccess.listTeams(),
        dataAccess.listCompetitionTeams(),
        dataAccess.listCompetitionAthletes(),
        dataAccess.listMatches(),
      ]);
      setCompetitions(comps);
      setModalities(mods);
      setVenues(vns);
      setTeams(tms);
      setCompetitionTeams(cts);
      setCompetitionAthletes(aths);
      setMatches(ms);
      setSelectedId((prev) => prev ?? comps[0]?.id ?? null);
    } catch (err: unknown) {
      setIsError(true);
      setErrorMessage(
        err instanceof Error ? err.message : 'Falha ao carregar as competições.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setCreateOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Filtragem de competições na barra lateral
  const filteredCompetitions = useMemo(() => {
    return competitions.filter((comp) => {
      const matchesSearch = comp.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesModality = modalityFilter === 'all' || comp.modality === modalityFilter;
      return matchesSearch && matchesModality;
    });
  }, [competitions, searchTerm, modalityFilter]);

  const selected = competitions.find((c) => c.id === selectedId) ?? null;

  // Dados da competição selecionada
  const selectedTeams = useMemo(() => {
    if (!selected) return [];
    return competitionTeams.filter((ct) => ct.competitionId === selected.id);
  }, [selected, competitionTeams]);

  const selectedMatches = useMemo(() => {
    if (!selected) return [];
    return matches.filter((m) => m.competitionId === selected.id);
  }, [selected, matches]);

  const selectedAthletes = useMemo(() => {
    if (!selected) return [];
    const teamIds = selectedTeams.map((t) => t.id);
    return competitionAthletes.filter((a) => teamIds.includes(a.competitionTeamId));
  }, [selected, selectedTeams, competitionAthletes]);

  // Classificação por grupos
  const standings = useMemo(() => {
    if (!selected) return [];
    const registrations: { team: TeamRecord; groupName?: string }[] = [];
    for (const ct of selectedTeams) {
      const team = teams.find((t) => t.id === ct.teamId);
      if (!team) continue;
      const groupMatch = selectedMatches.find((m) => m.teamAId === team.id || m.teamBId === team.id);
      registrations.push({ team, groupName: groupMatch?.groupName ?? selected.groupName });
    }
    return computeStandingsByGroup(registrations, selectedMatches, {
      criteria: selected.tiebreakCriteriaOrder,
    });
  }, [selected, selectedTeams, teams, selectedMatches]);

  // Melhores terceiros
  const bestThirds = useMemo(() => {
    if (!selected?.bestThirdsCount || selected.bestThirdsCount <= 0) return [];
    return computeBestThirds(standings, selected.bestThirdsCount);
  }, [selected, standings]);

  // Pódio
  const podium = useMemo(() => {
    if (!selected) return null;
    return computePodium(selectedMatches);
  }, [selected, selectedMatches]);

  // Prontidão
  const readinessReport = useMemo(() => {
    if (!selected) return null;
    return evaluateCompetitionReadiness({
      competition: selected,
      modalities,
      venues,
      teams,
      competitionTeams,
      athletes: competitionAthletes,
      matches,
    });
  }, [selected, modalities, venues, teams, competitionTeams, competitionAthletes, matches]);

  // Chaveamento
  const bracketMatches = useMemo(() => {
    if (!selected) return [];
    const rounds = new Map<number, MatchRecord[]>();
    for (const m of selectedMatches.filter((m) => m.phase !== 'group-stage' && m.phase !== 'classificatoria')) {
      const r = m.round ?? 1;
      const list = rounds.get(r) ?? [];
      list.push(m);
      rounds.set(r, list);
    }
    const setsWon = (m: MatchRecord, team: 'A' | 'B') =>
      m.sets.filter((s) => (team === 'A' ? s.scoreA : s.scoreB) > (team === 'A' ? s.scoreB : s.scoreA)).length;
    return [...rounds.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([round, ms]) =>
        [...ms].sort((a, b) => a.matchNumber - b.matchNumber).map((m) => ({
          id: m.id,
          round,
          position: m.matchNumber,
          teamA: { id: m.teamAId, name: m.teamAName, shortName: m.teamAShortName },
          teamB: { id: m.teamBId, name: m.teamBName, shortName: m.teamBShortName },
          scoreA: m.sets.length > 0 ? setsWon(m, 'A') : undefined,
          scoreB: m.sets.length > 0 ? setsWon(m, 'B') : undefined,
          winner: m.winnerId ? (m.winnerId === m.teamAId ? ('A' as const) : ('B' as const)) : undefined,
          scheduled: m.scheduledTime,
        })),
      );
  }, [selected, selectedMatches]);

  const handleExportStandings = () => {
    if (!selected) return;
    const doc = generateStandingsReportPdf(
      standings.map((group) => ({ groupName: group.groupName, standings: group.standings })),
      selected.name,
    );
    const safeName = selected.name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    downloadReportsPdf(doc, `classificacao_${safeName}.pdf`);
    toast.success('Relatório de classificação gerado!');
  };

  const handleUpdateStatus = async (newStatus: CompetitionLifecycleStatus) => {
    if (!can('competition:edit')) {
      toast.error('Você não possui permissão para alterar o status da competição.');
      return;
    }
    if (!selected) return;

    const operatorName = session?.user?.name || 'Organizador';

    await dataAccess.updateCompetition(selected.id, { status: newStatus });
    AuditService.logEvent(
      'Alteração de Ciclo de Competição',
      session?.user?.email || 'organizador',
      'info',
      `Competição "${selected.name}" avançou para status "${newStatus}" por ${operatorName}.`,
    );
    toast.success(`Status da competição alterado para "${newStatus}".`);
    await refresh();
  };

  const requestStatusTransition = (targetStatus: CompetitionLifecycleStatus) => {
    if (!can('competition:edit')) {
      toast.error('Você não possui permissão para alterar o status da competição.');
      return;
    }
    if (!selected) return;

    const validation = CompetitionLifecycleService.validateTransition(selected, targetStatus, {
      teams: selectedTeams,
      matches: selectedMatches,
      championTeamId: selected.championTeamId,
      runnerUpTeamId: selected.runnerUpTeamId,
    });

    if (!validation.valid) {
      toast.error('Transição de fase não permitida:', {
        description: validation.errors.join(' • '),
      });
      return;
    }

    if (validation.warnings.length > 0) {
      toast.warning('Aviso sobre a fase:', {
        description: validation.warnings.join(' • '),
      });
    }

    setPendingStatus(targetStatus);
  };

  const handleCreate = async (input: Omit<CompetitionRecord, 'id'>) => {
    if (!can('competition:create')) {
      toast.error('Você não possui permissão para cadastrar competições.');
      return;
    }
    const created = await dataAccess.createCompetition(input);
    AuditService.logEvent(
      'Criação de Competição',
      session?.user?.email || 'organizador',
      'success',
      `Nova competição "${created.name}" criada por ${session?.user?.name || 'Organizador'}.`,
    );
    toast.success(`Competição "${created.name}" criada com sucesso!`);
    setCreateOpen(false);
    await refresh();
    setSelectedId(created.id);
  };

  const handleUpdateConfig = async (updates: Partial<CompetitionRecord>) => {
    if (!can('competition:edit')) {
      toast.error('Você não possui permissão para editar configurações.');
      return;
    }
    if (!selected) return;

    await dataAccess.updateCompetition(selected.id, updates);
    toast.success('Configurações da competição atualizadas com sucesso!');
    setEditConfigOpen(false);
    await refresh();
  };

  // Colunas da tabela de partidas dentro da aba "matches"
  const matchColumns: DataTableColumn<MatchRecord>[] = [
    {
      id: 'matchNumber',
      header: 'Nº Jogo',
      isNumeric: true,
      cell: ({ row }) => (
        <span className="font-semibold text-foreground">Jogo #{row.matchNumber}</span>
      ),
    },
    {
      id: 'phase',
      header: 'Fase / Grupo',
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px] bg-zinc-900 border-zinc-800 text-zinc-300 capitalize">
          {row.phase || row.groupName || 'Geral'}
        </Badge>
      ),
    },
    {
      id: 'confronto',
      header: 'Confronto',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-foreground truncate max-w-[140px]">{row.teamAName}</span>
          <span className="text-[10px] text-muted-foreground font-normal">vs</span>
          <span className="font-semibold text-foreground truncate max-w-[140px]">{row.teamBName}</span>
        </div>
      ),
    },
    {
      id: 'court',
      header: 'Quadra / Local',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.court || row.venue || 'A definir'}</span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.status} className="text-[10px] h-5" />,
    },
    {
      id: 'actions',
      header: 'Ação',
      align: 'right',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-zinc-800"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/sumulas/${row.id}`);
          }}
        >
          Súmula
        </Button>
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-3.5">
        {/* ── PageHeader Oficial ── */}
        <PageHeader
          title="Gestão de Competições"
          description="Planejamento de torneios, controle de fases, chaveamento e homologação de resultados esportivos."
          primaryAction={
            can('competition:create') && (
              <Button
                size="sm"
                className="gap-1.5 text-xs font-semibold shadow-none"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Competição
              </Button>
            )
          }
          secondaryActions={
            <ContextualHelpButton
              articles={[
                { articleId: 'fluxo-competicao-passo-a-passo', label: 'Guia do Organizador: do Rascunho à Final' },
                { articleId: 'ciclo-vida-competicao', label: 'Entendendo os status do torneio' },
                { articleId: 'abrir-inscricoes', label: 'Como abrir e encerrar inscrições' },
                { articleId: 'criterios-desempate', label: 'Critérios de desempate homologados' },
              ]}
              label="Ajuda em torneios"
            />
          }
        />

        {/* ── Gestão de Estados Universais ── */}
        <StateContainer
          isLoading={loading}
          isError={isError}
          errorTitle="Não foi possível carregar as competições"
          errorDescription={errorMessage}
          onRetry={refresh}
          isEmpty={competitions.length === 0}
          emptyTitle="Nenhuma competição cadastrada"
          emptyDescription="Cadastre seu primeiro torneio para iniciar a gestão de equipes, chaves e súmulas."
          emptyAction={
            can('competition:create') && (
              <Button
                size="sm"
                className="gap-1.5 text-xs font-semibold shadow-none"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                Cadastrar Nova Competição
              </Button>
            )
          }
        >
          {/* ── Grid Mestre-Detalhe ── */}
          <div className="grid grid-cols-1 lg:grid-cols-[300px,1fr] gap-4 items-start">
            {/* ── Coluna Esquerda: Seletor & Filtros de Torneios (Modularizado) ── */}
            <CompetitionSidebarList
              competitions={competitions}
              filteredCompetitions={filteredCompetitions}
              selectedId={selectedId}
              onSelect={setSelectedId}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              modalityFilter={modalityFilter}
              onModalityFilterChange={setModalityFilter}
            />

            {/* ── Coluna Direita: Contexto do Torneio Selecionado ── */}
            {selected ? (
              <div className="space-y-3.5 min-w-0">
                {/* Cabeçalho do Torneio com Abas Operacionais */}
                <CompetitionHeader
                  competition={selected}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  extraStats={{
                    teamsCount: selectedTeams.length,
                    matchesCount: selectedMatches.length,
                    athletesCount: selectedAthletes.length,
                  }}
                />

                {/* ── Aba 1: Visão Geral (Modularizado) ── */}
                {activeTab === 'overview' && (
                  <CompetitionOverviewTab
                    selected={selected}
                    selectedTeams={selectedTeams}
                    selectedMatches={selectedMatches}
                    teams={teams}
                    readinessReport={readinessReport}
                    podium={podium}
                    canEdit={can('competition:edit')}
                    onRefresh={refresh}
                    onRequestStatusTransition={requestStatusTransition}
                    onNavigateTab={setActiveTab}
                  />
                )}

                {/* ── Aba 2: Configurações Regulamentares (Modularizado) ── */}
                {activeTab === 'config' && (
                  <CompetitionConfigTab
                    selected={selected}
                    canEdit={can('competition:edit')}
                    onOpenEditConfig={() => setEditConfigOpen(true)}
                  />
                )}

                {/* ── Aba 3: Equipes Participantes (Modularizado) ── */}
                {activeTab === 'teams' && (
                  <CompetitionTeamsTab
                    selected={selected}
                    selectedTeams={selectedTeams}
                    selectedAthletes={selectedAthletes}
                    teams={teams}
                  />
                )}

                {/* ── Aba 4: Atletas (Modularizado) ── */}
                {activeTab === 'athletes' && (
                  <CompetitionAthletesTab
                    selectedAthletes={selectedAthletes}
                  />
                )}

                {/* ── Aba 5: Sorteio ── */}
                {activeTab === 'draw' && (
                  <SectionCard density="loose" className="text-center">
                    <div className="max-w-md mx-auto space-y-4">
                      <Dices className="w-10 h-10 text-primary mx-auto" />
                      <div>
                        <h3 className="text-base font-bold text-foreground">Motor de Sorteio de Grupos</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Realize sorteio automático ou manual com potes, cabeças de chave e geração de tabela Berger.
                        </p>
                      </div>
                      <Button onClick={() => navigate(`/sorteio/${selected.id}`)} className="text-xs gap-1.5">
                        Acessar Motor de Sorteio
                      </Button>
                    </div>
                  </SectionCard>
                )}

                {/* ── Aba 6: Jogos ── */}
                {activeTab === 'matches' && (
                  <Section
                    title={`Confrontos da Competição (${selectedMatches.length})`}
                    description="Partidas agendadas, em andamento e finalizadas deste torneio."
                    actions={
                      <Button variant="outline" size="sm" onClick={() => navigate('/jogos')} className="text-xs gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Abrir Central de Jogos
                      </Button>
                    }
                  >
                    <DataTable
                      data={selectedMatches}
                      columns={matchColumns}
                      emptyTitle="Nenhum confronto gerado"
                      emptyDescription="Realize o sorteio das chaves para gerar os jogos automaticamente."
                      emptyAction={
                        <Button size="sm" onClick={() => navigate(`/sorteio/${selected.id}`)} className="text-xs gap-1.5">
                          <Dices className="w-3.5 h-3.5" />
                          Sortear Chaves
                        </Button>
                      }
                      onRowClick={(row) => navigate(`/sumulas/${row.id}`)}
                    />
                  </Section>
                )}

                {/* ── Aba 7: Classificação (Modularizado) ── */}
                {activeTab === 'standings' && (
                  <CompetitionStandingsTab
                    selected={selected}
                    standings={standings}
                    bestThirds={bestThirds}
                    bracketMatches={bracketMatches}
                    teams={teams}
                    onExportStandings={handleExportStandings}
                  />
                )}

                {/* ── Aba 8: Relatórios ── */}
                {activeTab === 'reports' && (
                  <SectionCard density="loose" className="text-center">
                    <div className="max-w-md mx-auto space-y-4">
                      <FileSpreadsheet className="w-10 h-10 text-primary mx-auto" />
                      <div>
                        <h3 className="text-base font-bold text-foreground">Central de Relatórios e Documentos</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Emita súmulas oficiais, ordens de saque, classificação detalhada e boletins da competição.
                        </p>
                      </div>
                      <Button onClick={() => navigate('/relatorios')} className="text-xs gap-1.5">
                        Abrir Central de Relatórios
                      </Button>
                    </div>
                  </SectionCard>
                )}
              </div>
            ) : (
              <SectionCard title="Nenhuma competição selecionada" description="Selecione um torneio à esquerda para gerenciar.">
                <p className="text-xs text-muted-foreground">
                  Você pode selecionar um campeonato na lista ao lado ou criar um novo torneio pelo botão superior.
                </p>
              </SectionCard>
            )}
          </div>
        </StateContainer>
      </div>

      {/* ── Modais Auxiliares (Modularizados) ── */}
      <CompetitionFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        modalities={modalities}
        venues={venues}
      />

      <ConfirmActionDialog
        open={pendingStatus !== null}
        onOpenChange={(open) => !open && setPendingStatus(null)}
        title="Avançar Fase da Competição"
        variant={pendingStatus === 'completed' ? 'destructive' : 'accent'}
        description={
          pendingStatus === 'completed'
            ? 'Deseja finalizar oficialmente a competição? Esta ação consolidará o quadro de honra e pódio final.'
            : pendingStatus === 'in-progress'
            ? 'Deseja iniciar oficialmente a fase de jogos? Certifique-se de que a tabela e as quadras estejam definidas.'
            : pendingStatus === 'playoffs'
            ? 'Deseja iniciar a fase eliminatória (Mata-mata)? Os confrontos da fase de grupos serão congelados.'
            : pendingStatus === 'registration-closed'
            ? 'Deseja encerrar o período de inscrições de novas equipes e atletas?'
            : `Deseja avançar o status da competição para "${pendingStatus}"?`
        }
        confirmText="Confirmar Alteração"
        onConfirm={async () => {
          if (pendingStatus) {
            await handleUpdateStatus(pendingStatus);
            setPendingStatus(null);
          }
        }}
      />

      {selected && (
        <CompetitionSettingsEditDialog
          open={editConfigOpen}
          onOpenChange={setEditConfigOpen}
          competition={selected}
          onSave={handleUpdateConfig}
        />
      )}
    </MainLayout>
  );
}