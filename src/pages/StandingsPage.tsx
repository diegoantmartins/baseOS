/**
 * StandingsPage — Tabela Oficial de Classificação do BaseOS
 * Rota: /classificacao
 *
 * Responsabilidades:
 * - Apresentação das tabelas de classificação por grupos (Chave A, B, etc.) calculadas pelo standingsService
 * - Visualização comparativa de Melhores Terceiros Colocados (computeBestThirds)
 * - Identificação e alerta claro de resultados pendentes de homologação oficial
 * - Apresentação contextual dos critérios oficiais de desempate CBV/FIVB da competição
 * - Exportação de relatório oficial de classificação em PDF de alta resolução (generateStandingsReportPdf)
 * - Tratamento dos 4 estados universais via StateContainer
 *
 * Design System:
 * - Enterprise Dark SaaS (Zinc-950/900, Âmbar-500)
 * - Tipografia tabular mono para todos os números esportivos, sets, pontos e saldos
 * - Componentes universais: MainLayout, PageHeader, SectionCard, StatusBadge, DataTable, StateContainer
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Trophy,
  FileDown,
  Layers,
  Volleyball,
  Users,
  Calendar,
  AlertTriangle,
  HelpCircle,
  Award,
  ChevronDown,
  ChevronRight,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/Section';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StateContainer } from '@/components/ui/StateContainer';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { StandingsTable } from '@/components/competition/StandingsTable';
import { ContextualHelpButton } from '@/components/help/ContextualHelpButton';
import { dataAccess } from '@/services/dataAccess';
import {
  computeStandingsByGroup,
  computeBestThirds,
  TIEBREAK_CRITERIA_LABELS,
  type TeamStandingResult,
  type StandingInput,
} from '@/services/standingsService';
import { CompetitionRulesService } from '@/services/competitionRulesService';
import { generateStandingsReportPdf, downloadReportsPdf, type StandingsReportGroup } from '@/lib/pdf/reportsPdf';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';
import type { CompetitionTeam } from '@/types/registration';
import { cn } from '@/lib/utils';

export function StandingsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const competitionParam = searchParams.get('competitionId');

  // Estados de dados
  const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [competitionTeams, setCompetitionTeams] = useState<CompetitionTeam[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string>('');
  const [selectedGroupTab, setSelectedGroupTab] = useState<string>('all');
  const [showCriteria, setShowCriteria] = useState(false);

  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setIsError(false);
      const [rawComps, rawMatches, rawTeams, rawCt] = await Promise.all([
        dataAccess.listCompetitions(),
        dataAccess.listMatches(),
        dataAccess.listTeams(),
        dataAccess.listCompetitionTeams(),
      ]);
      setCompetitions(rawComps);
      setMatches(rawMatches);
      setTeams(rawTeams);
      setCompetitionTeams(rawCt);

      // Definir competição selecionada (ou parâmetro de URL ou a primeira disponível)
      if (rawComps.length > 0) {
        if (competitionParam && rawComps.some((c) => c.id === competitionParam)) {
          setSelectedCompId(competitionParam);
        } else if (!selectedCompId || !rawComps.some((c) => c.id === selectedCompId)) {
          setSelectedCompId(rawComps[0].id);
        }
      }
    } catch (err: unknown) {
      setIsError(true);
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao carregar os dados de classificação.');
    } finally {
      setLoading(false);
    }
  }, [competitionParam, selectedCompId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selectedCompetition = useMemo(
    () => competitions.find((c) => c.id === selectedCompId) || null,
    [competitions, selectedCompId],
  );

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const logoUrlById = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t.logoUrl ?? ''])),
    [teams],
  );

  // Partidas e equipes da competição selecionada
  const compMatches = useMemo(
    () => (selectedCompetition ? matches.filter((m) => m.competitionId === selectedCompetition.id) : []),
    [matches, selectedCompetition],
  );

  const compRegistrations = useMemo(() => {
    if (!selectedCompetition) return [];
    const filteredCt = competitionTeams.filter((ct) => ct.competitionId === selectedCompetition.id);
    const inputs: StandingInput[] = [];

    for (const ct of filteredCt) {
      const team = teamById.get(ct.teamId);
      if (!team) continue;
      // Procura se a equipe já tem grupo atribuído em partida ou usa o default
      const groupMatch = compMatches.find((m) => m.teamAId === ct.teamId || m.teamBId === ct.teamId);
      inputs.push({
        team,
        groupName: groupMatch?.groupName ?? selectedCompetition.groupName ?? 'A',
      });
    }
    return inputs;
  }, [selectedCompetition, competitionTeams, compMatches, teamById]);

  // Cálculo da classificação por grupos (standingsService)
  const groupStandings = useMemo(() => {
    if (!selectedCompetition || compRegistrations.length === 0) return [];
    return computeStandingsByGroup(compRegistrations, compMatches, {
      competition: selectedCompetition,
    });
  }, [selectedCompetition, compRegistrations, compMatches]);

  // Cálculo dos melhores terceiros colocados (se configurado)
  const bestThirds = useMemo(() => {
    if (!selectedCompetition?.bestThirdsCount || selectedCompetition.bestThirdsCount <= 0) return [];
    return computeBestThirds(groupStandings, selectedCompetition.bestThirdsCount);
  }, [selectedCompetition, groupStandings]);

  // Verificação de resultados provisórios (partidas concluídas mas ainda não homologadas)
  const hasPendingHomologation = useMemo(() => {
    return compMatches.some((m) => m.status === 'completed');
  }, [compMatches]);

  // Grupos filtrados pela aba de visualização
  const visibleGroups = useMemo(() => {
    if (selectedGroupTab === 'all') return groupStandings;
    return groupStandings.filter((g) => g.groupName === selectedGroupTab);
  }, [groupStandings, selectedGroupTab]);

  // Exportar relatório oficial de classificação em PDF
  const handleExportPdf = () => {
    if (!selectedCompetition || groupStandings.length === 0) {
      toast.error('Nenhuma classificação disponível para exportar.');
      return;
    }

    try {
      const pdfGroups: StandingsReportGroup[] = [
        ...groupStandings,
        ...(bestThirds.length > 0 ? [{ groupName: 'Melhores Terceiros', standings: bestThirds }] : []),
      ];
      const doc = generateStandingsReportPdf(
        pdfGroups,
        selectedCompetition.name,
        'VolleyPro / BaseOS',
      );
      downloadReportsPdf(doc, `classificacao_${selectedCompetition.name.replace(/\s+/g, '_').toLowerCase()}.pdf`);
      toast.success('Relatório de classificação oficial gerado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar relatório em PDF.');
    }
  };

  const handleSelectCompetition = (compId: string) => {
    setSelectedCompId(compId);
    setSelectedGroupTab('all');
    setSearchParams({ competitionId: compId });
  };

  return (
    <MainLayout>
      <div className="space-y-3.5">
        {/* ── PageHeader Oficial ── */}
        <PageHeader
          title="Classificação"
          description="Tabela oficial de classificação por grupos, pontuação CBV/FIVB, saldo de sets, parciais e critérios homologados."
          secondaryActions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8 rounded-md border-border hover:bg-zinc-800/60 font-medium"
                onClick={handleExportPdf}
                disabled={groupStandings.length === 0}
              >
                <FileDown className="w-3.5 h-3.5 text-zinc-400" />
                Exportar Classificação (PDF)
              </Button>
              <ContextualHelpButton
                articles={[
                  { articleId: 'criterios-desempate', label: 'Critérios de desempate CBV/FIVB' },
                  { articleId: 'calculo-pontos-sets', label: 'Como funciona a pontuação por sets' },
                  { articleId: 'repescagem-melhores-terceiros', label: 'Repescagem de melhores terceiros' },
                ]}
                label="Ajuda na classificação"
              />
            </div>
          }
        />

        {/* ── Gestão de Estados Universais ── */}
        <StateContainer
          isLoading={loading}
          isError={isError}
          errorTitle="Não foi possível carregar a classificação"
          errorDescription={errorMessage}
          onRetry={refresh}
          isEmpty={competitions.length === 0}
          emptyTitle="Nenhuma competição cadastrada"
          emptyDescription="Cadastre um campeonato e inscreva as equipes para gerar a tabela de classificação oficial."
          emptyAction={
            <Button
              size="sm"
              className="gap-1.5 text-xs font-semibold shadow-none"
              onClick={() => navigate('/competicoes?new=1')}
            >
              Criar Campeonato
            </Button>
          }
        >
          <div className="space-y-3.5">
            {/* ── Seletor & Contexto da Competição ── */}
            <div className="p-4 rounded-xl bg-card border border-border space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                    Competição Selecionada
                  </span>
                  <div className="flex items-center gap-2">
                    <Select value={selectedCompId} onValueChange={handleSelectCompetition}>
                      <SelectTrigger className="w-full sm:w-[320px] text-xs h-8 bg-zinc-900 border-zinc-800 font-semibold text-foreground">
                        <SelectValue placeholder="Selecione o campeonato" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        {competitions.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="text-xs">
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedCompetition && (
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={selectedCompetition.status} className="text-[10px] h-5" />
                    <Badge variant="outline" className="text-[10px] h-5 font-mono border-zinc-800 bg-zinc-900 text-zinc-300">
                      {selectedCompetition.modality === 'indoor' ? 'Vôlei de Quadra' : 'Vôlei de Praia'}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] h-5 font-mono border-zinc-800 bg-zinc-900 text-zinc-300">
                      {selectedCompetition.playerFormat}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Métricas contextuais da competição */}
              {selectedCompetition && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Equipes Inscritas</span>
                    <p className="text-sm font-bold font-mono tabular-nums text-foreground">
                      {compRegistrations.length} equipes
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Formato da Fase</span>
                    <p className="text-sm font-bold font-mono tabular-nums text-foreground">
                      {selectedCompetition.groupsCount || 1} Grupo(s) · {selectedCompetition.advancingPerGroup || 2} Avançam
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Jogos Realizados</span>
                    <p className="text-sm font-bold font-mono tabular-nums text-foreground">
                      {compMatches.filter((m) => m.status === 'completed' || m.status === 'homologated').length} / {compMatches.length}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Homologação</span>
                    <p className="text-sm font-bold font-mono tabular-nums text-foreground">
                      {compMatches.filter((m) => m.status === 'homologated').length} homologados
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Alerta Operacional: Resultados Pendentes de Homologação ── */}
            {hasPendingHomologation && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-amber-200">
                    Aviso: Existem resultados pendentes de homologação oficial
                  </p>
                  <p className="text-[11px] text-amber-300/80 leading-relaxed">
                    A classificação abaixo inclui parciais provisórias de jogos recém-encerrados. A classificação se torna definitiva após a homologação na central de jogos.
                  </p>
                </div>
              </div>
            )}

            {/* ── Navegação por Abas de Grupos ── */}
            {groupStandings.length > 1 && (
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 border-b border-border">
                <button
                  onClick={() => setSelectedGroupTab('all')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-semibold rounded-md transition-colors',
                    selectedGroupTab === 'all'
                      ? 'bg-zinc-800 text-foreground border border-zinc-700/60'
                      : 'text-muted-foreground hover:text-foreground hover:bg-zinc-900',
                  )}
                >
                  Todos os Grupos ({groupStandings.length})
                </button>
                {groupStandings.map((g) => (
                  <button
                    key={g.groupName}
                    onClick={() => setSelectedGroupTab(g.groupName)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-semibold rounded-md transition-colors',
                      selectedGroupTab === g.groupName
                        ? 'bg-zinc-800 text-foreground border border-zinc-700/60'
                        : 'text-muted-foreground hover:text-foreground hover:bg-zinc-900',
                    )}
                  >
                    {g.groupName} ({g.standings.length})
                  </button>
                ))}
              </div>
            )}

            {/* ── Tabelas de Classificação por Grupo ── */}
            {groupStandings.length === 0 ? (
              <SectionCard density="loose" className="text-center">
                <div className="max-w-md mx-auto py-8 space-y-3">
                  <Trophy className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                  <div>
                    <p className="font-semibold text-sm text-foreground">Sem dados de classificação</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      As equipes ainda não disputaram partidas nesta competição. Realize os lançamentos na Central de Jogos.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => navigate('/jogos')}
                  >
                    Ir para Central de Jogos
                  </Button>
                </div>
              </SectionCard>
            ) : (
              visibleGroups.map((group) => (
                <SectionCard
                  key={group.groupName}
                  title={`Classificação — ${group.groupName}`}
                  description={`Critérios oficiais da CBV/FIVB aplicados para desempate e ordenação.`}
                  density="dense"
                  divided
                >
                  <StandingsTable
                    standings={group.standings}
                    title={group.groupName}
                    advancingPerGroup={selectedCompetition?.advancingPerGroup || 2}
                    logoUrlById={logoUrlById}
                    isProvisional={hasPendingHomologation}
                  />
                </SectionCard>
              ))
            )}

            {/* ── Seção: Melhores Terceiros Colocados (se houver) ── */}
            {bestThirds.length > 0 && (
              <SectionCard
                title="Ranking Comparativo dos Melhores Terceiros Colocados"
                description={`Apenas os ${selectedCompetition?.bestThirdsCount} melhores terceiros colocados avançam para a fase eliminatória conforme o regulamento.`}
                density="dense"
                divided
              >
                <div className="space-y-2">
                  <StandingsTable
                    standings={bestThirds}
                    title="Melhores Terceiros"
                    advancingPerGroup={selectedCompetition?.bestThirdsCount || 2}
                    logoUrlById={logoUrlById}
                    isProvisional={hasPendingHomologation}
                  />
                </div>
              </SectionCard>
            )}

            {/* ── Seção Informativa: Critérios de Desempate Homologados ── */}
            <SectionCard
              title="Critérios de Desempate Homologados"
              description="Ordem estrita de aplicação dos critérios de classificação configurados para esta competição."
              density="dense"
            >
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  {((selectedCompetition && CompetitionRulesService.getConfig(selectedCompetition).standings?.tiebreakCriteriaOrder) || [
                    'points',
                    'head-to-head',
                    'set-average',
                    'points-average',
                    'sets-balance',
                    'points-balance',
                    'victories',
                    'draw',
                  ]).map((crit, idx) => (
                    <div
                      key={crit}
                      className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-center gap-2"
                    >
                      <span className="w-5 h-5 rounded bg-zinc-800 text-zinc-400 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-medium text-foreground truncate">
                        {TIEBREAK_CRITERIA_LABELS[crit] || crit}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 text-[11px] text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-primary" />
                    Regra de Pontuação por Sets (FIVB / CBV):
                  </p>
                  <p>
                    • Vitória por <strong>3x0</strong> ou <strong>3x1</strong> = <strong>3 pontos</strong> para o vencedor, 0 para o perdedor.
                  </p>
                  <p>
                    • Vitória por <strong>3x2</strong> = <strong>2 pontos</strong> para o vencedor, <strong>1 ponto</strong> para o perdedor.
                  </p>
                  <p>
                    • Vitória no Vôlei de Praia (melhor de 3) por <strong>2x0</strong> = <strong>3 pontos</strong>; <strong>2x1</strong> = <strong>2 pontos</strong> (1 ponto para o perdedor).
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>
        </StateContainer>
      </div>
    </MainLayout>
  );
}

export default StandingsPage;
