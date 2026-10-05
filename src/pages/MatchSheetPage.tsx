/**
 * MatchSheetPage — Central Oficial de Súmulas e Documentos de Partida
 * Rotas: /sumulas e /sumulas/:matchId
 *
 * Responsabilidades:
 * - Listagem tabular de súmulas com filtros por competição, status e busca nominal
 * - Resumo operacional com métricas reais (Total, Pendentes, Ao Vivo, Homologadas)
 * - Visualização e edição individual da Súmula Digital (/sumulas/:matchId)
 * - Escalação tática em quadra (CourtLineupDnd) e Card para redes sociais (MatchSocialCard)
 * - Emissão e visualização em tempo real de PDF de alta definição (MatchPdfPreview / MatchSheetEmitDialog)
 * - Tratamento universal de estados via StateContainer
 *
 * Design System:
 * - Enterprise Dark SaaS (Zinc-950/900, Âmbar-500)
 * - Tipografia mono tabular para números de jogo, horários e placares
 * - Componentes universais: MainLayout, PageHeader, SectionCard, StatusBadge, DataTable, StateContainer, BreadcrumbNav
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ClipboardList,
  Calendar,
  Clock,
  MapPin,
  Volleyball,
  Search,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  Activity,
  ChevronRight,
  Eye,
  LayoutGrid,
  Share2,
  ShieldCheck,
  Trophy,
  Plus,
  Filter,
  Loader2,
} from 'lucide-react';
import {
  loadBaseosScoresheetData,
  downloadBaseosBatchScoresheets,
  type BaseosScoresheetData,
} from '@/document-engine/baseos';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/Section';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { StateContainer } from '@/components/ui/StateContainer';
import { BreadcrumbNav } from '@/components/navigation/BreadcrumbNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MatchSheetInterface } from '@/components/match-sheet/MatchSheetInterface';
import { MatchPdfPreview } from '@/components/match/MatchPdfPreview';
import { MatchSheetEmitDialog } from '@/components/match/MatchSheetEmitDialog';
import { BlankSheetEmitDialog } from '@/components/match/BlankSheetEmitDialog';
import { CourtLineupDnd } from '@/components/match/CourtLineupDnd';
import { MatchSocialCard } from '@/components/match/MatchSocialCard';
import { ContextualHelpButton } from '@/components/help/ContextualHelpButton';
import { dataAccess } from '@/services/dataAccess';
import { getMatchRosters } from '@/services/registrationService';
import { buildMatchSheetData, type MatchSheetData } from '@/lib/pdf/matchSheetDataBuilder';
import type { MatchRecord, CompetitionRecord } from '@/types/entities';
import type { CompetitionAthlete } from '@/types/registration';
import { useAuth } from '@/components/auth/useAuth';
import { useCapability } from '@/hooks/useCapability';
import { cn } from '@/lib/utils';

export function MatchSheetPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();

  const { session, loading: authLoading } = useAuth();
  const user = session?.user;
  const { canSubmitMatchScore, hasCapability } = useCapability();

  // Defesa de aplicação (Camada 2 - Page Guard)
  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      navigate('/login', { replace: true });
      return;
    }
    if (user?.role === 'team') {
      navigate('/portal/equipe', { replace: true });
      return;
    }
    if (user?.role === 'viewer') {
      navigate('/', { replace: true });
      return;
    }
  }, [session, authLoading, user?.role, navigate]);

  // Estados de dados da listagem geral
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Estados de filtros da listagem
  const [searchQuery, setSearchQuery] = useState('');
  const [competitionFilter, setCompetitionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Estados de modais da listagem
  const [blankSheetOpen, setBlankSheetOpen] = useState(false);
  const [emitDialogMatch, setEmitDialogMatch] = useState<MatchRecord | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  // Estados da súmula individual (/sumulas/:matchId)
  const [match, setMatch] = useState<MatchRecord | null>(null);
  const [competition, setCompetition] = useState<CompetitionRecord | null>(null);
  const [teamARoster, setTeamARoster] = useState<CompetitionAthlete[]>([]);
  const [teamBRoster, setTeamBRoster] = useState<CompetitionAthlete[]>([]);
  const [pdfData, setPdfData] = useState<MatchSheetData | null>(null);
  const [activeTab, setActiveTab] = useState<'sheet' | 'tactical' | 'social'>('sheet');
  const [tacticalTeam, setTacticalTeam] = useState<'A' | 'B'>('A');
  const [loadingSingle, setLoadingSingle] = useState(Boolean(matchId));
  const [notFound, setNotFound] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Destaque da Partida (MVP) derivado dos elencos carregados
  const highlightAthlete = useMemo(() => {
    if (!match?.highlightAthleteId) return undefined;
    return (
      teamARoster.find((a) => a.id === match.highlightAthleteId) ||
      teamBRoster.find((a) => a.id === match.highlightAthleteId)
    );
  }, [match?.highlightAthleteId, teamARoster, teamBRoster]);

  const highlightTeamName = useMemo(() => {
    if (!highlightAthlete || !match) return undefined;
    const inA = teamARoster.some((a) => a.id === highlightAthlete.id);
    return inA ? match.teamAName : match.teamBName;
  }, [highlightAthlete, match, teamARoster]);

  // Carrega listagem de partidas e campeonatos
  const loadListData = useCallback(async () => {
    try {
      setLoadingList(true);
      setIsError(false);
      const [mList, cList] = await Promise.all([
        dataAccess.listMatches(),
        dataAccess.listCompetitions(),
      ]);
      setMatches(mList);
      setCompetitions(cList);
    } catch (err: unknown) {
      setIsError(true);
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao carregar as súmulas.');
    } finally {
      setLoadingList(false);
    }
  }, []);

  // Carrega partida individual
  const loadSingleMatch = useCallback(async (id: string) => {
    try {
      setLoadingSingle(true);
      setNotFound(false);
      setIsError(false);
      const found = await dataAccess.getMatch(id);
      if (!found) {
        setNotFound(true);
        return;
      }
      setMatch(found);
      const comp = await dataAccess.getCompetition(found.competitionId);
      setCompetition(comp);
      const rosters = await getMatchRosters(found.id);
      setTeamARoster(rosters.teamA);
      setTeamBRoster(rosters.teamB);
      setPdfData(await buildMatchSheetData(found, comp, rosters.teamA, rosters.teamB));
    } catch (err: unknown) {
      setIsError(true);
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao carregar detalhes da súmula.');
    } finally {
      setLoadingSingle(false);
    }
  }, []);

  useEffect(() => {
    if (matchId) {
      loadSingleMatch(matchId);
    } else {
      loadListData();
    }
  }, [matchId, loadSingleMatch, loadListData]);

  const canEdit = useMemo(() => {
    if (!match) return false;
    return canSubmitMatchScore(match) || hasCapability('scoresheet:edit');
  }, [match, canSubmitMatchScore, hasCapability]);

  const handlePersist = useCallback(
    async (updates: Partial<MatchRecord>) => {
      if (!match) return;
      if (!canEdit) {
        toast.error('Acesso negado: você não tem permissão para alterar esta súmula.');
        return;
      }
      const updated = await dataAccess.updateMatch(match.id, updates);
      if (updated) {
        setMatch(updated);
        setPdfData(await buildMatchSheetData(updated, competition, teamARoster, teamBRoster));
        toast.success('Súmula atualizada com sucesso!');
      }
    },
    [match, canEdit, competition, teamARoster, teamBRoster],
  );

  const compById = useMemo(() => new Map(competitions.map((c) => [c.id, c])), [competitions]);

  // Filtragem da tabela de súmulas
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (competitionFilter !== 'all' && m.competitionId !== competitionFilter) return false;
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const comp = compById.get(m.competitionId)?.name || '';
        const haystack = `${m.matchNumber} ${m.teamAName} ${m.teamBName} ${m.teamAShortName || ''} ${m.teamBShortName || ''} ${comp} ${m.venue} ${m.court || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [matches, competitionFilter, statusFilter, searchQuery, compById]);

  // Métricas reais do resumo operacional
  const totalSheets = matches.length;
  const pendingSheets = useMemo(
    () => matches.filter((m) => m.status === 'scheduled' || m.status === 'awaiting_schedule').length,
    [matches],
  );
  const liveSheets = useMemo(() => matches.filter((m) => m.status === 'in-progress').length, [matches]);
  const homologatedSheets = useMemo(() => matches.filter((m) => m.status === 'homologated').length, [matches]);

  const handleDownloadBatch = async () => {
    if (filteredMatches.length === 0) {
      toast.error('Nenhuma partida disponível para exportação em lote.');
      return;
    }
    setBatchLoading(true);
    try {
      toast.info(`Gerando ${filteredMatches.length} súmulas oficiais BaseOS em arquivo único...`);
      const scoresheetsData: BaseosScoresheetData[] = [];
      for (const m of filteredMatches) {
        const data = await loadBaseosScoresheetData(m.id);
        if (data) scoresheetsData.push(data);
      }
      if (scoresheetsData.length === 0) {
        throw new Error('Nenhuma súmula pôde ser carregada.');
      }
      const compName =
        competitionFilter !== 'all'
          ? compById.get(competitionFilter)?.name || 'Competicao'
          : 'Todas_Competicoes';
      await downloadBaseosBatchScoresheets(scoresheetsData, compName);
      toast.success(`${scoresheetsData.length} súmulas oficiais geradas em lote com sucesso!`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar lote de súmulas oficiais.');
    } finally {
      setBatchLoading(false);
    }
  };

  // Colunas da DataTable de Súmulas
  const columns: DataTableColumn<MatchRecord>[] = [
    {
      id: 'matchNumber',
      header: 'Jogo',
      isNumeric: true,
      cell: ({ row }) => (
        <div className="w-9 h-8 rounded-md bg-zinc-900 border border-zinc-800 text-foreground font-mono font-bold text-xs flex items-center justify-center tabular-nums">
          #{row.matchNumber}
        </div>
      ),
    },
    {
      id: 'matchup',
      header: 'Confronto',
      cell: ({ row }) => {
        const comp = compById.get(row.competitionId);
        return (
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground text-xs truncate max-w-[130px] sm:max-w-[180px]">
                {row.teamAName}
              </span>
              <Badge variant="outline" className="text-[9px] py-0 px-1 border-zinc-800 bg-zinc-900 text-zinc-400 font-mono">
                {row.teamAShortName || 'A'}
              </Badge>
              <span className="text-muted-foreground text-xs font-semibold">vs</span>
              <span className="font-semibold text-foreground text-xs truncate max-w-[130px] sm:max-w-[180px]">
                {row.teamBName}
              </span>
              <Badge variant="outline" className="text-[9px] py-0 px-1 border-zinc-800 bg-zinc-900 text-zinc-400 font-mono">
                {row.teamBShortName || 'B'}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {comp?.name || 'Competição'} {row.phase ? `· ${row.phase}` : ''} {row.groupName ? `(Chave ${row.groupName})` : ''}
            </p>
          </div>
        );
      },
    },
    {
      id: 'schedule',
      header: 'Data & Local',
      cell: ({ row }) => (
        <div className="text-xs min-w-0">
          <p className="font-medium text-foreground flex items-center gap-1 font-mono tabular-nums">
            <Clock className="w-3 h-3 text-zinc-400" />
            {new Date(row.scheduledTime).toLocaleDateString('pt-BR')} às{' '}
            {new Date(row.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-zinc-400" />
            {row.venue} {row.court ? `· ${row.court}` : ''}
          </p>
        </div>
      ),
    },
    {
      id: 'result',
      header: 'Placar',
      align: 'center',
      cell: ({ row }) => {
        const isFinished = row.status === 'completed' || row.status === 'homologated';
        if (isFinished && row.sets.length > 0) {
          const setsA = row.sets.filter((s) => s.scoreA > s.scoreB).length;
          const setsB = row.sets.filter((s) => s.scoreB > s.scoreA).length;
          return (
            <div className="text-center">
              <span className="font-bold font-mono text-sm tabular-nums text-foreground bg-zinc-900/90 px-2 py-0.5 rounded border border-zinc-800">
                {setsA} - {setsB}
              </span>
            </div>
          );
        }
        return <span className="text-xs text-muted-foreground font-mono">—</span>;
      },
    },
    {
      id: 'status',
      header: 'Situação',
      cell: ({ row }) => <StatusBadge status={row.status} className="text-[10px] h-5" />,
    },
    {
      id: 'actions',
      header: 'Ações',
      align: 'right',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            className="h-7 px-2 text-xs gap-1 font-medium shadow-none"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/sumulas/${row.id}`);
            }}
          >
            <Eye className="w-3.5 h-3.5" />
            Abrir Súmula
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs gap-1 border-border hover:bg-zinc-800/60 font-medium"
            onClick={(e) => {
              e.stopPropagation();
              setEmitDialogMatch(row);
            }}
          >
            <FileText className="w-3.5 h-3.5 text-zinc-400" />
            PDF
          </Button>
        </div>
      ),
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // MODO 1: VISUALIZAÇÃO INDIVIDUAL (/sumulas/:matchId)
  // ─────────────────────────────────────────────────────────────────────────
  if (matchId) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <BreadcrumbNav
            items={[
              { label: 'Painel', href: '/dashboard' },
              { label: 'Partidas', href: '/jogos' },
              { label: 'Súmulas Oficiais', href: '/sumulas' },
              { label: match ? `Jogo #${match.matchNumber}` : 'Súmula Digital' },
            ]}
          />

          <StateContainer
            isLoading={loadingSingle}
            isError={isError || notFound}
            errorTitle={notFound ? 'Partida não encontrada' : 'Erro ao carregar a súmula'}
            errorDescription={
              notFound
                ? 'A partida solicitada não foi localizada no sistema.'
                : errorMessage || 'Tente novamente mais tarde.'
            }
            onRetry={() => loadSingleMatch(matchId)}
            isEmpty={false}
          >
            {match && (
              <div className="space-y-6">
                {/* Header Individual */}
                <PageHeader
                  title={`Súmula Digital · Jogo #${match.matchNumber}`}
                  description={`${match.teamAName} vs ${match.teamBName} · ${competition?.name || 'Competição Oficial'}`}
                  badge={<StatusBadge status={match.status} className="text-[10px] h-5" />}
                  primaryAction={
                    <Button
                      size="sm"
                      className="gap-1.5 text-xs font-semibold shadow-none"
                      onClick={() => setEmitDialogMatch(match)}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Emitir PDF Homologado
                    </Button>
                  }
                  secondaryActions={
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-8 rounded-md border-border hover:bg-zinc-800/60"
                      onClick={() => navigate('/sumulas')}
                    >
                      Voltar à Central
                    </Button>
                  }
                />

                {/* Banner de Homologação */}
                {match.status === 'homologated' && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        Esta súmula foi <strong>homologada oficialmente</strong> por{' '}
                        {match.homologatedBy || 'Organizador'} em{' '}
                        {match.homologatedAt
                          ? new Date(match.homologatedAt).toLocaleString('pt-BR')
                          : 'data registrada'}
                        .
                      </span>
                    </div>
                    {highlightAthlete && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold text-xs shrink-0">
                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                        Destaque: {highlightAthlete.jerseyNumber !== undefined ? `#${highlightAthlete.jerseyNumber} ` : ''}{highlightAthlete.name} ({highlightTeamName})
                      </span>
                    )}
                  </div>
                )}

                {/* Grid com Súmula e Preview em Tempo Real */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    <Tabs
                      value={activeTab}
                      onValueChange={(v) => setActiveTab(v as 'sheet' | 'tactical' | 'social')}
                      className="space-y-4"
                    >
                      <TabsList className="grid w-full grid-cols-3 bg-zinc-900 border border-zinc-800">
                        <TabsTrigger value="sheet" className="gap-2 text-xs font-semibold">
                          <ClipboardList className="w-4 h-4" />
                          Súmula Digital
                        </TabsTrigger>
                        <TabsTrigger value="tactical" className="gap-2 text-xs font-semibold">
                          <LayoutGrid className="w-4 h-4" />
                          Escalação em Quadra
                        </TabsTrigger>
                        <TabsTrigger value="social" className="gap-2 text-xs font-semibold">
                          <Share2 className="w-4 h-4" />
                          Card para Redes
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="sheet" className="space-y-4">
                        <MatchSheetInterface
                          modality="indoor"
                          format={(competition?.setFormat ?? '3-sets') as '3-sets' | '5-sets'}
                          match={match}
                          competition={competition}
                          teamARoster={teamARoster}
                          teamBRoster={teamBRoster}
                          readOnly={!canEdit}
                          onPersist={canEdit ? handlePersist : undefined}
                        />
                      </TabsContent>

                      <TabsContent value="tactical" className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Button
                            variant={tacticalTeam === 'A' ? 'default' : 'outline'}
                            size="sm"
                            className="text-xs h-8 font-medium"
                            onClick={() => setTacticalTeam('A')}
                          >
                            {match.teamAName} (Equipe A)
                          </Button>
                          <Button
                            variant={tacticalTeam === 'B' ? 'default' : 'outline'}
                            size="sm"
                            className="text-xs h-8 font-medium"
                            onClick={() => setTacticalTeam('B')}
                          >
                            {match.teamBName} (Equipe B)
                          </Button>
                        </div>

                        {tacticalTeam === 'A' ? (
                          <CourtLineupDnd
                            teamName={match.teamAName}
                            teamShortName={match.teamAShortName || 'A'}
                            roster={teamARoster}
                          />
                        ) : (
                          <CourtLineupDnd
                            teamName={match.teamBName}
                            teamShortName={match.teamBShortName || 'B'}
                            roster={teamBRoster}
                          />
                        )}
                      </TabsContent>

                      <TabsContent value="social" className="space-y-4">
                        <MatchSocialCard
                          competitionName={competition?.name || 'Campeonato'}
                          categoryName={competition?.format || 'Voleibol'}
                          genderCategory={competition?.genderCategory}
                          teamAName={match.teamAName}
                          teamAShortName={match.teamAShortName || 'A'}
                          teamBName={match.teamBName}
                          teamBShortName={match.teamBShortName || 'B'}
                          sets={match.sets.map((s) => ({
                            number: s.setNumber,
                            scoreA: s.scoreA,
                            scoreB: s.scoreB,
                          }))}
                          finalScoreA={pdfData?.finalScoreA ?? 0}
                          finalScoreB={pdfData?.finalScoreB ?? 0}
                          winner={pdfData?.winner}
                          mvpName={highlightAthlete?.name}
                          mvpNumber={highlightAthlete?.jerseyNumber}
                          mvpTeam={highlightTeamName}
                          date={new Date(match.scheduledTime).toLocaleDateString('pt-BR')}
                          venue={match.venue}
                        />
                      </TabsContent>
                    </Tabs>
                  </div>

                  <div className="lg:col-span-1 space-y-4">
                    <SectionCard title="Súmula Oficial em PDF" description="Visualização gerada em tempo real." density="dense">
                      <MatchPdfPreview matchId={match.id} />
                    </SectionCard>
                  </div>
                </div>
              </div>
            )}
          </StateContainer>
        </div>

        {/* Modal de Emissão de Súmula */}
        {emitDialogMatch && (
          <MatchSheetEmitDialog
            open={emitDialogMatch !== null}
            onOpenChange={(open) => !open && setEmitDialogMatch(null)}
            match={emitDialogMatch}
            competition={competition}
          />
        )}
      </MainLayout>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MODO 2: CENTRAL GERAL DE SÚMULAS (/sumulas)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <div className="space-y-3.5">
        {/* PageHeader Oficial */}
        <PageHeader
          title="Súmulas Oficiais"
          description="Emissão, acompanhamento, preenchimento digital e homologação das súmulas das competições."
          primaryAction={
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8 rounded-md border-border hover:bg-zinc-800/60 font-medium"
                onClick={handleDownloadBatch}
                disabled={batchLoading || filteredMatches.length === 0}
                title="Baixar todas as súmulas da lista em lote em um único PDF compilado"
              >
                {batchLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-primary" />
                )}
                Súmulas em Lote ({filteredMatches.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8 rounded-md border-border hover:bg-zinc-800/60 font-medium"
                onClick={() => setBlankSheetOpen(true)}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-400" />
                Súmula em Branco
              </Button>
            </div>
          }
          secondaryActions={
            <ContextualHelpButton
              articles={[
                { articleId: 'gerar-sumula', label: 'Como emitir e imprimir súmulas' },
                { articleId: 'abrir-partida', label: 'Check-in e início de partida' },
                { articleId: 'lancar-resultado-sets', label: 'Lançamento de parciais e resultado' },
              ]}
              label="Ajuda em súmulas"
            />
          }
        />

        {/* Gestão de Estados Universais */}
        <StateContainer
          isLoading={loadingList}
          isError={isError}
          errorTitle="Não foi possível carregar as súmulas"
          errorDescription={errorMessage}
          onRetry={loadListData}
          isEmpty={matches.length === 0}
          emptyTitle="Nenhuma súmula cadastrada"
          emptyDescription="Cadastre os confrontos na Central de Jogos para gerar as súmulas eletrônicas oficiais."
          emptyAction={
            <Button
              size="sm"
              className="gap-1.5 text-xs font-semibold shadow-none"
              onClick={() => navigate('/jogos/novo')}
            >
              <Plus className="w-3.5 h-3.5" />
              Criar Novo Confronto
            </Button>
          }
        >
          <div className="space-y-3.5">
            {/* Resumo Operacional de Súmulas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SectionCard density="dense" className="bg-card/70 border-border/80">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-0.5">
                  <span>Total de Súmulas</span>
                  <ClipboardList className="w-3.5 h-3.5 text-primary" />
                </div>
                <p className="text-xl font-bold font-mono tabular-nums text-foreground">{totalSheets}</p>
              </SectionCard>

              <SectionCard density="dense" className="bg-card/70 border-border/80">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-0.5">
                  <span>Pendentes</span>
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <p className="text-xl font-bold font-mono tabular-nums text-foreground">{pendingSheets}</p>
              </SectionCard>

              <SectionCard density="dense" className="bg-card/70 border-border/80">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-0.5">
                  <span>Em Jogo</span>
                  <Activity className="w-3.5 h-3.5 text-rose-500" />
                </div>
                <p className="text-xl font-bold font-mono tabular-nums text-foreground">{liveSheets}</p>
              </SectionCard>

              <SectionCard density="dense" className="bg-card/70 border-border/80">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-0.5">
                  <span>Homologadas</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <p className="text-xl font-bold font-mono tabular-nums text-foreground">{homologatedSheets}</p>
              </SectionCard>
            </div>

            {/* Seção Principal: Controles e Tabela */}
            <SectionCard
              title="Grade de Súmulas Oficiais"
              description="Acesse o preenchimento digital ao vivo ou emita o documento em PDF."
              divided
            >
              {/* Barra de Filtros */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                  <Input
                    placeholder="Buscar por jogo #, equipe, sigla, ginásio ou competição..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 text-xs pl-8 bg-zinc-900 border-zinc-800"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Select value={competitionFilter} onValueChange={setCompetitionFilter}>
                    <SelectTrigger className="w-[180px] text-xs h-8 bg-zinc-900 border-zinc-800">
                      <SelectValue placeholder="Competição" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="all" className="text-xs">Todas as Competições</SelectItem>
                      {competitions.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px] text-xs h-8 bg-zinc-900 border-zinc-800">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="all" className="text-xs">Todos os Status</SelectItem>
                      <SelectItem value="scheduled" className="text-xs">Agendados</SelectItem>
                      <SelectItem value="in-progress" className="text-xs">Em Jogo</SelectItem>
                      <SelectItem value="completed" className="text-xs">Finalizados</SelectItem>
                      <SelectItem value="homologated" className="text-xs">Homologados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tabela de Súmulas */}
              <DataTable
                data={filteredMatches}
                columns={columns}
                emptyTitle="Nenhuma súmula encontrada"
                emptyDescription="Tente ajustar a busca ou os filtros de competição e status."
              />
            </SectionCard>
          </div>
        </StateContainer>
      </div>

      {/* Modal Súmula em Branco */}
      <BlankSheetEmitDialog open={blankSheetOpen} onOpenChange={setBlankSheetOpen} />

      {/* Modal Emissão Súmula da Partida */}
      {emitDialogMatch && (
        <MatchSheetEmitDialog
          open={emitDialogMatch !== null}
          onOpenChange={(open) => !open && setEmitDialogMatch(null)}
          match={emitDialogMatch}
          competition={compById.get(emitDialogMatch.competitionId) || null}
        />
      )}
    </MainLayout>
  );
}

export default MatchSheetPage;
