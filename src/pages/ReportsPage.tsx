/**
 * ReportsPage — Central Oficial de Documentos Operacionais e Relatórios (Fase 4: HTML-First)
 * Rota: /relatorios?competitionId=UUID&report=boletim|standings|roster|podium
 *
 * Responsabilidades:
 * - Experiência HTML-first: visualização nativa, responsiva e compartilhável diretamente no navegador
 * - Exportação PDF oficial sob demanda (reutilizando exatamente os mesmos View Models do HTML)
 * - Navegação contextual da Fase 3 (competitionId como SSOT, preservação de parâmetros via setSearchParams)
 * - Identidade visual e Apoiadores da Competição da Fase 2 (ordenados por tier com Powered by BaseOS)
 * - Suporte completo à impressão via navegador com formatação limpa (@media print)
 * - Compartilhamento contextual via Web Share API com fallback para área de transferência
 * - Exportação de dados brutos do Boletim em CSV
 * - Tratamento universal de estados (Loading, Error com Retry, Empty e ID inválido)
 *
 * Design System:
 * - Enterprise Dark SaaS (Zinc-950/900, Âmbar-500)
 * - Tipografia mono tabular para contadores e métricas
 * - Componentes universais: MainLayout, PageHeader, SectionCard, StateContainer, ReportSelector
 */

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { StateContainer } from '@/components/ui/StateContainer';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { dataAccess } from '@/services/dataAccess';
import { computeStandingsByGroup } from '@/services/standingsService';
import { computePodium } from '@/services/playoffsService';
import {
  generateMatchesBoletimPdf,
  generateStandingsReportPdf,
  generateTeamRosterReportPdf,
  generatePodiumReportPdf,
  downloadReportsPdf,
} from '@/lib/pdf/reportsPdf';
import type {
  MatchBoletimRow,
  StandingsReportGroup,
  RosterReportTeam,
  PodiumReportData,
} from '@/lib/pdf/reportsPdf';
import { ClassificationProbabilityService } from '@/services/classificationProbabilityService';
import type { CompetitionProbabilityResult } from '@/types/classificationProbability';
import { BlankSheetEmitDialog } from '@/components/match/BlankSheetEmitDialog';
import { MatchSheetEmitDialog } from '@/components/match/MatchSheetEmitDialog';
import { ReportPreviewDialog } from '@/components/report/ReportPreviewDialog';
import { ContextualHelpButton } from '@/components/help/ContextualHelpButton';
import {
  resolveActiveCompetition,
  setPersistedCompetitionId,
} from '@/services/competitionNavigationHelper';
import { ReportSelector, type ReportType } from '@/components/report/ReportSelector';
import { ReportHeader } from '@/components/report/ReportHeader';
import { ReportCompetitionIdentity } from '@/components/report/ReportCompetitionIdentity';
import { MatchesBoletimView } from '@/components/report/MatchesBoletimView';
import { StandingsReportView } from '@/components/report/StandingsReportView';
import { TeamRostersReportView } from '@/components/report/TeamRostersReportView';
import { PodiumReportView } from '@/components/report/PodiumReportView';
import type {
  CompetitionRecord,
  MatchRecord,
  TeamRecord,
} from '@/types/entities';
import type { CompetitionAthlete, CompetitionTeam } from '@/types/registration';

export function ReportsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCompId = searchParams.get('competitionId');
  const reportParam = searchParams.get('report');

  // Relatório ativo na URL (fallback controlado para 'boletim')
  const activeReport: ReportType =
    reportParam === 'standings' || reportParam === 'roster' || reportParam === 'podium'
      ? reportParam
      : 'boletim';

  // Estados de dados principais
  const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);
  const [competitionId, setCompetitionId] = useState<string>('');
  const [isExplicitInvalid, setIsExplicitInvalid] = useState(false);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [athletes, setAthletes] = useState<CompetitionAthlete[]>([]);
  const [competitionTeams, setCompetitionTeams] = useState<CompetitionTeam[]>([]);

  // Filtros operacionais
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');

  // Estados de controle e modais
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const [blankDialogOpen, setBlankDialogOpen] = useState(false);
  const [blankDefaultFormat] = useState<'3-sets' | '5-sets'>('3-sets');
  const [selectedMatch, setSelectedMatch] = useState<MatchRecord | null>(null);

  // Carimbo de data de geração do relatório (estável durante a sessão da página)
  const [generatedTimestamp] = useState<string>(() =>
    new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  );

  // Dialog legado de preview mantido para compatibilidade
  const [previewDialog, setPreviewDialog] = useState<{
    open: boolean;
    title: string;
    subtitle?: string;
    filename: string;
    generatePdf: () => Promise<Blob | import('jspdf').default | Uint8Array>;
  }>({
    open: false,
    title: '',
    filename: '',
    generatePdf: async () => new Blob(),
  });

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setIsError(false);
      const [comps, mList, tList, aList, ctList] = await Promise.all([
        dataAccess.listCompetitions(),
        dataAccess.listMatches(),
        dataAccess.listTeams(),
        dataAccess.listCompetitionAthletes(),
        dataAccess.listCompetitionTeams(),
      ]);
      setCompetitions(comps);
      setMatches(mList);
      setTeams(tList);
      setAthletes(aList);
      setCompetitionTeams(ctList);
    } catch (err: unknown) {
      setIsError(true);
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao carregar os dados dos relatórios.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Sincroniza competição ativa com a URL e contexto local com precedência canônica da Fase 3
  useEffect(() => {
    if (competitions.length === 0) return;
    const resolved = resolveActiveCompetition({
      searchParamId: urlCompId,
      competitions,
    });
    setIsExplicitInvalid(resolved.isExplicitInvalid);
    if (resolved.selectedId) {
      setCompetitionId(resolved.selectedId);
    } else if (resolved.isExplicitInvalid) {
      setCompetitionId('');
    }
  }, [urlCompId, competitions]);

  const handleCompetitionChange = (newId: string) => {
    setCompetitionId(newId);
    if (newId) {
      setPersistedCompetitionId(newId);
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (newId) {
          next.set('competitionId', newId);
        } else {
          next.delete('competitionId');
        }
        return next;
      },
      { replace: false },
    );
  };

  const handleSelectReport = (newReport: ReportType) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('report', newReport);
        return next;
      },
      { replace: false },
    );
  };

  const competition = useMemo(
    () => competitions.find((c) => c.id === competitionId) ?? null,
    [competitions, competitionId],
  );

  // Partidas filtradas exclusivamente para a competição ativa
  const filteredMatches = useMemo(() => {
    if (!competition) return [];
    let list = matches.filter((m) => m.competitionId === competition.id);
    if (selectedPhase !== 'all') {
      list = list.filter(
        (m) =>
          m.phase === selectedPhase ||
          (selectedPhase === 'classificatória' && m.phase === 'classificatoria'),
      );
    }
    return list;
  }, [competition, matches, selectedPhase]);

  // Equipes vinculadas às partidas filtradas
  const filteredTeams = useMemo(() => {
    if (!competition) return [];
    const teamIds = new Set<string>();
    filteredMatches.forEach((m) => {
      if (m.teamAId) teamIds.add(m.teamAId);
      if (m.teamBId) teamIds.add(m.teamBId);
    });
    return Array.from(teamIds)
      .map((id) => teams.find((t) => t.id === id))
      .filter(Boolean) as TeamRecord[];
  }, [competition, filteredMatches, teams]);

  const completedMatches = useMemo(
    () => filteredMatches.filter((m) => m.status === 'completed' || m.status === 'homologated'),
    [filteredMatches],
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMADA DE VIEW MODEL UNIFICADA (HTML E PDF COMPARTILHAM 100% DOS DADOS)
  // ═══════════════════════════════════════════════════════════════════════════

  // 1. View Model: Boletim Geral de Jogos (MatchBoletimRow[])
  const boletimRows: MatchBoletimRow[] = useMemo(() => {
    if (!competition) return [];
    return filteredMatches
      .slice()
      .sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''))
      .map((m) => {
        const teamA = teams.find((t) => t.id === m.teamAId);
        const teamB = teams.find((t) => t.id === m.teamBId);
        const setsA = m.sets.filter((s) => s.scoreA > s.scoreB).length;
        const setsB = m.sets.filter((s) => s.scoreB > s.scoreA).length;
        return {
          matchNumber: m.matchNumber,
          round: m.round,
          phase: m.phase,
          groupName: m.groupName,
          date: m.scheduledTime
            ? m.scheduledTime.includes('T')
              ? m.scheduledTime.split('T')[0]
              : m.scheduledTime.split(' ')[0]
            : '',
          time: m.scheduledTime
            ? m.scheduledTime.includes('T')
              ? m.scheduledTime.split('T')[1].substring(0, 5)
              : m.scheduledTime.split(' ')[1]?.substring(0, 5) || ''
            : '',
          venue: m.venue || 'Ginásio Principal',
          court: m.court,
          teamAName: teamA?.name ?? m.teamAName,
          teamAShort: teamA?.shortName,
          teamALogo: teamA?.logoUrl,
          teamBName: teamB?.name ?? m.teamBName,
          teamBShort: teamB?.shortName,
          teamBLogo: teamB?.logoUrl,
          scoreA: m.status === 'completed' || m.status === 'homologated' ? setsA : undefined,
          scoreB: m.status === 'completed' || m.status === 'homologated' ? setsB : undefined,
          statusLabel:
            m.status === 'homologated'
              ? 'Homologado'
              : m.status === 'completed'
              ? 'Finalizado'
              : m.status === 'in-progress'
              ? 'Ao vivo'
              : m.status === 'cancelled'
              ? 'Cancelado'
              : 'Agendado',
          highlightAthleteName: (() => {
            if (m.status !== 'homologated' || !m.highlightAthleteId) return undefined;
            const ath = athletes.find((a) => a.id === m.highlightAthleteId);
            return ath ? `${ath.jerseyNumber != null ? `#${ath.jerseyNumber} ` : ''}${ath.name}` : undefined;
          })(),
          highlightTeamShort: (() => {
            if (m.status !== 'homologated' || !m.highlightAthleteId) return undefined;
            const ath = athletes.find((a) => a.id === m.highlightAthleteId);
            if (!ath) return undefined;
            const ct = competitionTeams.find((c) => c.id === ath.competitionTeamId);
            return ct?.teamShortName || (ct?.teamId === m.teamAId ? m.teamAShortName : m.teamBShortName);
          })(),
        };
      });
  }, [competition, filteredMatches, teams, athletes, competitionTeams]);

  // 2. View Model: Classificação por Grupos (StandingsReportGroup[])
  const standingsGroups: StandingsReportGroup[] = useMemo(() => {
    if (!competition) return [];
    const cts = competitionTeams.filter((ct) => ct.competitionId === competition.id);
    const registrations: { team: TeamRecord; groupName?: string }[] = [];
    for (const ct of cts) {
      const team = teams.find((t) => t.id === ct.teamId);
      if (!team) continue;
      const groupMatch = filteredMatches.find(
        (m) => m.teamAId === team.id || m.teamBId === team.id,
      );
      registrations.push({
        team,
        groupName: groupMatch?.groupName ?? competition.groupName ?? 'A',
      });
    }
    const standings = computeStandingsByGroup(registrations, filteredMatches, {
      competition,
    });
    return standings.map((group) => ({
      groupName: group.groupName,
      standings: group.standings,
    }));
  }, [competition, competitionTeams, filteredMatches, teams]);

  // 2.1. View Model: Probabilidade de Classificação (Fase 5)
  const probabilityResult: CompetitionProbabilityResult | undefined = useMemo(() => {
    if (!competition || activeReport !== 'standings') return undefined;
    return ClassificationProbabilityService.calculateCompetitionProbabilities(
      competition,
      filteredMatches,
      teams,
      competitionTeams,
    );
  }, [competition, activeReport, filteredMatches, teams, competitionTeams]);

  // 3. View Model: Relação Nominal das Equipes (RosterReportTeam[])
  const rosterTeams: RosterReportTeam[] = useMemo(() => {
    if (!competition) return [];
    const filteredCt = competitionTeams.filter((ct) => ct.competitionId === competition.id);
    const activeTeamIds = new Set(filteredTeams.map((t) => t.id));
    const finalCt =
      selectedPhase !== 'all'
        ? filteredCt.filter((ct) => activeTeamIds.has(ct.teamId))
        : filteredCt;

    const filteredCtIds = new Set(finalCt.map((c) => c.id));
    const filteredRows = athletes.filter((r) => filteredCtIds.has(r.competitionTeamId));

    const grouped = new Map<string, typeof athletes>();
    for (const row of filteredRows) {
      const key = row.competitionTeamId;
      grouped.set(key, [...(grouped.get(key) ?? []), row]);
    }

    return [...grouped.entries()].map(([ctId, list]) => {
      const ct = competitionTeams.find((c) => c.id === ctId);
      const team = ct ? teams.find((t) => t.id === ct.teamId) : undefined;
      return {
        name: team?.name ?? 'Equipe',
        shortName: team?.shortName ?? '—',
        coach: team?.coachName,
        assistantCoach: undefined,
        medicalStaff: team?.managerName ? `Dir: ${team.managerName}` : undefined,
        city: team?.city,
        state: team?.state,
        modality: team?.modality,
        logoUrl: team?.logoUrl,
        athletes: list.map((a) => ({
          jerseyNumber: a.jerseyNumber,
          name: a.name,
          position: a.position,
          documentNumber: a.documentNumber,
          isCaptain: a.isCaptain,
          isLibero: a.isLibero,
        })),
      };
    });
  }, [competition, competitionTeams, filteredTeams, selectedPhase, athletes, teams]);

  // 4. View Model: Quadro de Honra & Pódio Final (PodiumReportData)
  const podiumData: PodiumReportData = useMemo(() => {
    if (!competition) {
      return { competitionName: 'Competição' };
    }
    const podium = computePodium(filteredMatches, competition);
    const champion = teams.find((t) => t.id === podium.championTeamId);
    const runnerUp = teams.find((t) => t.id === podium.runnerUpTeamId);
    const third = teams.find((t) => t.id === podium.thirdPlaceTeamId);
    const fourth = teams.find((t) => t.id === podium.fourthPlaceTeamId);
    const catName =
      competition.genderCategory === 'male'
        ? 'Masculino'
        : competition.genderCategory === 'female'
        ? 'Feminino'
        : 'Misto';
    return {
      competitionName: competition.name,
      categoryName: catName,
      champion: champion
        ? { name: champion.name, shortName: champion.shortName, logoUrl: champion.logoUrl }
        : undefined,
      runnerUp: runnerUp
        ? { name: runnerUp.name, shortName: runnerUp.shortName, logoUrl: runnerUp.logoUrl }
        : undefined,
      third: third
        ? { name: third.name, shortName: third.shortName, logoUrl: third.logoUrl }
        : undefined,
      fourth: fourth
        ? { name: fourth.name, shortName: fourth.shortName, logoUrl: fourth.logoUrl }
        : undefined,
    };
  }, [competition, filteredMatches, teams]);

  // ═══════════════════════════════════════════════════════════════════════════
  // AÇÕES DO RELATÓRIO (COMPARTILHAMENTO, IMPRESSÃO, PDF E CSV)
  // ═══════════════════════════════════════════════════════════════════════════

  const handleShare = async () => {
    if (!competition) return;
    const url = window.location.href;
    const reportNames = {
      boletim: 'Boletim Geral de Jogos',
      standings: 'Classificação Oficial por Grupos',
      roster: 'Relação Nominal das Equipes',
      podium: 'Quadro de Honra e Pódio',
    };
    const reportTitle = `${reportNames[activeReport]} — ${competition.name}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: reportTitle,
          text: `Acesse o ${reportTitle} no BaseOS`,
          url,
        });
      } catch {
        // Cancelamento pelo usuário
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link contextual do relatório copiado para a área de transferência!');
      } catch {
        toast.error('Erro ao copiar link do relatório.');
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = () => {
    if (!competition) return;
    setIsPdfLoading(true);
    try {
      const safeName = competition.name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
      if (activeReport === 'boletim') {
        const doc = generateMatchesBoletimPdf(boletimRows, competition.name);
        downloadReportsPdf(doc, `boletim_${safeName}.pdf`);
      } else if (activeReport === 'standings') {
        const doc = generateStandingsReportPdf(standingsGroups, competition.name);
        downloadReportsPdf(doc, `classificacao_${safeName}.pdf`);
      } else if (activeReport === 'roster') {
        const doc = generateTeamRosterReportPdf(rosterTeams, competition.name);
        downloadReportsPdf(doc, `relacao_nominal_${safeName}.pdf`);
      } else if (activeReport === 'podium') {
        const doc = generatePodiumReportPdf(podiumData);
        downloadReportsPdf(doc, `podio_final_${safeName}.pdf`);
      }
      toast.success('Download do PDF oficial iniciado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao exportar PDF do relatório.');
    } finally {
      setIsPdfLoading(false);
    }
  };

  const downloadCsv = (filename: string, csvContent: string) => {
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportBoletimCsv = () => {
    if (!competition) return;
    const header = 'Jogo,Fase,Grupo,Data,Hora,Local,Equipe A,Equipe B,Placar A,Placar B,Status\n';
    const rows = filteredMatches
      .map((m) => {
        const teamA = teams.find((t) => t.id === m.teamAId);
        const teamB = teams.find((t) => t.id === m.teamBId);
        const setsA = m.sets.filter((s) => s.scoreA > s.scoreB).length;
        const setsB = m.sets.filter((s) => s.scoreB > s.scoreA).length;
        return [
          m.matchNumber,
          m.phase || '',
          m.groupName || '',
          m.scheduledTime ? m.scheduledTime.split('T')[0] : '',
          m.scheduledTime ? m.scheduledTime.split('T')[1]?.substring(0, 5) : '',
          m.venue || '',
          teamA?.name || m.teamAName,
          teamB?.name || m.teamBName,
          setsA,
          setsB,
          m.status,
        ]
          .map((v) => `"${v}"`)
          .join(',');
      })
      .join('\n');
    downloadCsv(`boletim_${competition.name}.csv`, header + rows);
    toast.success('Boletim em CSV exportado com sucesso!');
  };

  // Metadados do relatório ativo
  const reportMeta = {
    boletim: {
      title: 'Boletim Oficial de Confrontos',
      subtitle: `${competition?.name ?? ''} · Confrontos, horários, ginásios e resultados`,
    },
    standings: {
      title: 'Tabela Oficial de Classificação',
      subtitle: `${competition?.name ?? ''} · Pontuação e critérios oficiais CBV/FIVB`,
    },
    roster: {
      title: 'Fichas Cadastrais das Equipes',
      subtitle: `${competition?.name ?? ''} · Elencos com atletas, capitão, líbero e comissão`,
    },
    podium: {
      title: 'Quadro Oficial de Premiações',
      subtitle: `${competition?.name ?? ''} · Encerramento e premiações homologadas`,
    },
  }[activeReport];

  return (
    <MainLayout>
      <div className="space-y-4">
        {/* PageHeader Oficial */}
        <PageHeader
          title="Relatórios e Documentos"
          description="Emissão de documentos operacionais, boletins e relatórios oficiais homologados em HTML e PDF."
          primaryAction={
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8 rounded-md border-border hover:bg-zinc-800/60 font-medium no-print"
              onClick={() => setBlankDialogOpen(true)}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-400" />
              Súmula em Branco
            </Button>
          }
          secondaryActions={
            <div className="no-print">
              <ContextualHelpButton
                articles={[
                  { articleId: 'relatorios-gerais', label: 'Como emitir boletins e relatórios' },
                  { articleId: 'relatorios-encerramento', label: 'Boletim de encerramento e pódio' },
                  { articleId: 'gerar-sumula', label: 'Como emitir e imprimir súmulas' },
                ]}
                label="Ajuda em relatórios"
              />
            </div>
          }
        />

        {/* Gestão de Estados Universais */}
        <StateContainer
          isLoading={loading}
          isError={isError}
          errorTitle="Não foi possível carregar a central de relatórios"
          errorDescription={errorMessage}
          onRetry={refresh}
          isEmpty={competitions.length === 0}
          emptyTitle="Nenhuma competição encontrada"
          emptyDescription="Cadastre uma competição para gerar boletins e relatórios oficiais."
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
          <div className="space-y-4">
            {/* Tratamento de ID Inválido da Fase 3 (Sem fallback silencioso) */}
            {isExplicitInvalid && (
              <div className="no-print p-4 rounded-xl border border-red-500/40 bg-red-950/20 text-red-300 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">Competição não encontrada</p>
                  <p className="text-xs text-red-400">
                    O identificador &quot;{urlCompId}&quot; informado na URL não existe ou foi excluído.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs border-red-500/30 hover:bg-red-900/30"
                  onClick={() => {
                    if (competitions.length > 0) {
                      handleCompetitionChange(competitions[0].id);
                    }
                  }}
                >
                  Ver primeira competição
                </Button>
              </div>
            )}

            {/* Barra de Filtros Contextuais */}
            <div className="no-print p-4 rounded-xl bg-card border border-border space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Competição
                  </Label>
                  <Select value={competitionId} onValueChange={handleCompetitionChange}>
                    <SelectTrigger className="w-full h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md font-semibold">
                      <SelectValue placeholder="Selecione..." />
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

                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Fase / Chave
                  </Label>
                  <Select value={selectedPhase} onValueChange={setSelectedPhase}>
                    <SelectTrigger className="w-full h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                      <SelectValue placeholder="Todas as Fases" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="all" className="text-xs">
                        Todas as Fases
                      </SelectItem>
                      <SelectItem value="classificatória" className="text-xs">
                        Classificatória / Grupos
                      </SelectItem>
                      <SelectItem value="quartas" className="text-xs">
                        Quartas de Final
                      </SelectItem>
                      <SelectItem value="semifinal" className="text-xs">
                        Semifinais
                      </SelectItem>
                      <SelectItem value="final" className="text-xs">
                        Grande Final
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Categoria de Gênero
                  </Label>
                  <Select value={selectedGender} onValueChange={setSelectedGender}>
                    <SelectTrigger className="w-full h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="all" className="text-xs">
                        Todas as Categorias
                      </SelectItem>
                      <SelectItem value="male" className="text-xs">
                        Masculino
                      </SelectItem>
                      <SelectItem value="female" className="text-xs">
                        Feminino
                      </SelectItem>
                      <SelectItem value="mixed" className="text-xs">
                        Misto
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Resumo Operacional em Métricas Reais */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Equipes Ativas
                  </span>
                  <p className="text-sm font-bold font-mono tabular-nums text-foreground">
                    {filteredTeams.length} equipes
                  </p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Atletas Vinculados
                  </span>
                  <p className="text-sm font-bold font-mono tabular-nums text-foreground">
                    {athletes.length} atletas
                  </p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Jogos no Filtro
                  </span>
                  <p className="text-sm font-bold font-mono tabular-nums text-foreground">
                    {filteredMatches.length} jogos
                  </p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Jogos Concluídos
                  </span>
                  <p className="text-sm font-bold font-mono tabular-nums text-foreground">
                    {completedMatches.length} realizados
                  </p>
                </div>
              </div>
            </div>

            {/* Seletor Oficial de Relatórios HTML */}
            <ReportSelector
              activeReport={activeReport}
              onSelectReport={handleSelectReport}
              matchCount={filteredMatches.length}
              teamCount={filteredTeams.length}
            />

            {/* Card Principal: Experiência HTML-First do Relatório */}
            {competition ? (
              <div className="p-5 sm:p-6 rounded-xl bg-card border border-border space-y-6">
                {/* Cabeçalho de Ações e Navegação Contextual */}
                <ReportHeader
                  title={reportMeta.title}
                  subtitle={reportMeta.subtitle}
                  competitionId={competition.id}
                  onPrint={handlePrint}
                  onShare={handleShare}
                  onExportPdf={handleExportPdf}
                  onExportCsv={activeReport === 'boletim' ? exportBoletimCsv : undefined}
                  isPdfLoading={isPdfLoading}
                />

                {/* Identidade da Competição, Apoiadores e Powered by BaseOS */}
                <ReportCompetitionIdentity
                  competition={competition}
                  generatedAt={generatedTimestamp}
                />

                {/* Visualização HTML Nativa Conforme o Relatório Selecionado */}
                <div className="pt-2">
                  {activeReport === 'boletim' && <MatchesBoletimView rows={boletimRows} />}
                  {activeReport === 'standings' && (
                    <StandingsReportView
                      groups={standingsGroups}
                      probabilityResult={probabilityResult}
                    />
                  )}
                  {activeReport === 'roster' && <TeamRostersReportView teams={rosterTeams} />}
                  {activeReport === 'podium' && <PodiumReportView data={podiumData} />}
                </div>
              </div>
            ) : (
              !isExplicitInvalid && (
                <div className="p-8 text-center rounded-xl bg-card border border-border text-muted-foreground text-xs">
                  Selecione uma competição na lista acima para visualizar e emitir relatórios oficiais.
                </div>
              )
            )}
          </div>
        </StateContainer>
      </div>

      {/* Diálogos Operacionais */}
      <ReportPreviewDialog
        open={previewDialog.open}
        onOpenChange={(open) => setPreviewDialog((prev) => ({ ...prev, open }))}
        title={previewDialog.title}
        subtitle={previewDialog.subtitle}
        filename={previewDialog.filename}
        generatePdf={previewDialog.generatePdf}
      />

      <BlankSheetEmitDialog
        open={blankDialogOpen}
        onOpenChange={setBlankDialogOpen}
        defaultFormat={blankDefaultFormat}
      />

      <MatchSheetEmitDialog
        match={selectedMatch}
        competition={competition}
        open={selectedMatch !== null}
        onOpenChange={(v) => {
          if (!v) setSelectedMatch(null);
        }}
      />
    </MainLayout>
  );
}

export default ReportsPage;
