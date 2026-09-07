/**
 * ReportsPage — Central Oficial de Documentos Operacionais e Relatórios
 * Rota: /relatorios
 *
 * Responsabilidades:
 * - Emissão e visualização prévia de documentos operacionais em PDF editorial de alta definição
 * - Exportação de dados brutos de jogos e confrontos em formato CSV
 * - Categorização clara de documentos (Competição, Delegações, Premiação e Súmulas)
 * - Filtros contextuais por Competição, Fase/Grupo e Categoria de Gênero
 * - Resumo operacional com métricas consolidadas (Equipes, Atletas, Jogos, Concluídos)
 * - Tratamento universal de estados via StateContainer
 *
 * Design System:
 * - Enterprise Dark SaaS (Zinc-950/900, Âmbar-500)
 * - Tipografia mono tabular para contadores e métricas
 * - Componentes universais: MainLayout, PageHeader, SectionCard, StatusBadge, StateContainer, BreadcrumbNav
 */

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  Trophy,
  Users,
  Eye,
  ClipboardList,
  Award,
  Filter,
  Download,
  Calendar,
  Layers,
  FileText,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/Section';
import { StateContainer } from '@/components/ui/StateContainer';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { dataAccess } from '@/services/dataAccess';
import { computeStandingsByGroup } from '@/services/standingsService';
import { computePodium } from '@/services/playoffsService';
import {
  generateMatchesBoletimPdf,
  generateStandingsReportPdf,
  generateTeamRosterReportPdf,
  generatePodiumReportPdf,
} from '@/lib/pdf/reportsPdf';
import { BlankSheetEmitDialog } from '@/components/match/BlankSheetEmitDialog';
import { MatchSheetEmitDialog } from '@/components/match/MatchSheetEmitDialog';
import { ReportPreviewDialog } from '@/components/report/ReportPreviewDialog';
import { ContextualHelpButton } from '@/components/help/ContextualHelpButton';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';
import type { CompetitionAthlete } from '@/types/registration';

export function ReportsPage() {
  const navigate = useNavigate();

  // Estados de dados
  const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);
  const [competitionId, setCompetitionId] = useState<string>('');
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [athletes, setAthletes] = useState<CompetitionAthlete[]>([]);

  // Filtros operacionais
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');

  // Estados de controle e modais
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [blankDialogOpen, setBlankDialogOpen] = useState(false);
  const [blankDefaultFormat, setBlankDefaultFormat] = useState<'3-sets' | '5-sets'>('3-sets');
  const [selectedMatch, setSelectedMatch] = useState<MatchRecord | null>(null);

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
      const [comps, mList, tList, aList] = await Promise.all([
        dataAccess.listCompetitions(),
        dataAccess.listMatches(),
        dataAccess.listTeams(),
        dataAccess.listCompetitionAthletes(),
      ]);
      setCompetitions(comps);
      setMatches(mList);
      setTeams(tList);
      setAthletes(aList);

      if (comps.length > 0 && !competitionId) {
        setCompetitionId(comps[0].id);
      }
    } catch (err: unknown) {
      setIsError(true);
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao carregar os dados dos relatórios.');
    } finally {
      setLoading(false);
    }
  }, [competitionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const competition = useMemo(
    () => competitions.find((c) => c.id === competitionId) ?? null,
    [competitions, competitionId],
  );

  // Partidas filtradas
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

  // Exportação em CSV
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

  // Funções de pré-visualização de relatórios em PDF
  const openBoletimPreview = () => {
    if (!competition) return;
    setPreviewDialog({
      open: true,
      title: 'Boletim Geral de Jogos e Confrontos',
      subtitle: `${competition.name} · Visualização oficial antes de impressão/download`,
      filename: `boletim_${competition.name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()}.pdf`,
      generatePdf: async () => {
        const rows = filteredMatches
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
            };
          });
        return generateMatchesBoletimPdf(rows, competition.name);
      },
    });
  };

  const openStandingsPreview = () => {
    if (!competition) return;
    setPreviewDialog({
      open: true,
      title: 'Relatório Oficial de Classificação por Grupos',
      subtitle: `${competition.name} · Critérios e desempate FIVB/CBV`,
      filename: `classificacao_${competition.name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()}.pdf`,
      generatePdf: async () => {
        const ctData = await dataAccess.listCompetitionTeams();
        const cts = ctData.filter((ct) => ct.competitionId === competition.id);
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
          criteria: competition.tiebreakCriteriaOrder,
          competition,
        });
        return generateStandingsReportPdf(
          standings.map((group) => ({ groupName: group.groupName, standings: group.standings })),
          competition.name,
        );
      },
    });
  };

  const openRostersPreview = () => {
    setPreviewDialog({
      open: true,
      title: 'Relação Nominal das Equipes',
      subtitle: `${competition ? competition.name : 'Todas as Equipes'} · Fichas cadastrais oficiais`,
      filename: 'relacao_nominal_equipes.pdf',
      generatePdf: async () => {
        const [rows, competitionTeams] = await Promise.all([
          dataAccess.listCompetitionAthletes(),
          dataAccess.listCompetitionTeams(),
        ]);
        const filteredCt = competition
          ? competitionTeams.filter((ct) => ct.competitionId === competition.id)
          : competitionTeams;

        const activeTeamIds = new Set(filteredTeams.map((t) => t.id));
        const finalCt =
          selectedPhase !== 'all'
            ? filteredCt.filter((ct) => activeTeamIds.has(ct.teamId))
            : filteredCt;

        const filteredCtIds = new Set(finalCt.map((c) => c.id));
        const filteredRows = rows.filter((r) => filteredCtIds.has(r.competitionTeamId));

        const grouped = new Map<string, typeof rows>();
        for (const row of filteredRows) {
          const key = row.competitionTeamId;
          grouped.set(key, [...(grouped.get(key) ?? []), row]);
        }
        return generateTeamRosterReportPdf(
          [...grouped.entries()].map(([ctId, list]) => {
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
          }),
          competition ? competition.name : 'Todas as competições',
        );
      },
    });
  };

  const openPodiumPreview = () => {
    if (!competition) return;
    setPreviewDialog({
      open: true,
      title: 'Quadro de Honra e Pódio Oficial',
      subtitle: `${competition.name} · Encerramento e Premiações Homologadas`,
      filename: `podio_final_${competition.name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()}.pdf`,
      generatePdf: async () => {
        const podium = computePodium(filteredMatches);

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
        return generatePodiumReportPdf({
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
        });
      },
    });
  };

  return (
    <MainLayout>
      <div className="space-y-3.5">
        {/* PageHeader Oficial */}
        <PageHeader
          title="Relatórios e Documentos"
          description="Emissão de documentos operacionais, boletins e relatórios oficiais homologados em PDF e CSV."
          primaryAction={
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8 rounded-md border-border hover:bg-zinc-800/60 font-medium"
              onClick={() => setBlankDialogOpen(true)}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-400" />
              Súmula em Branco
            </Button>
          }
          secondaryActions={
            <ContextualHelpButton
              articles={[
                { articleId: 'relatorios-gerais', label: 'Como emitir boletins e relatórios' },
                { articleId: 'relatorios-encerramento', label: 'Boletim de encerramento e pódio' },
                { articleId: 'gerar-sumula', label: 'Como emitir e imprimir súmulas' },
              ]}
              label="Ajuda em relatórios"
            />
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
          <div className="space-y-3.5">
            {/* Barra de Filtros Contextuais */}
            <div className="p-4 rounded-xl bg-card border border-border space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Competição</Label>
                  <Select value={competitionId} onValueChange={setCompetitionId}>
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
                  <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Fase / Chave</Label>
                  <Select value={selectedPhase} onValueChange={setSelectedPhase}>
                    <SelectTrigger className="w-full h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                      <SelectValue placeholder="Todas as Fases" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="all" className="text-xs">Todas as Fases</SelectItem>
                      <SelectItem value="classificatória" className="text-xs">Classificatória / Grupos</SelectItem>
                      <SelectItem value="quartas" className="text-xs">Quartas de Final</SelectItem>
                      <SelectItem value="semifinal" className="text-xs">Semifinais</SelectItem>
                      <SelectItem value="final" className="text-xs">Grande Final</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Categoria de Gênero</Label>
                  <Select value={selectedGender} onValueChange={setSelectedGender}>
                    <SelectTrigger className="w-full h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="all" className="text-xs">Todas as Categorias</SelectItem>
                      <SelectItem value="male" className="text-xs">Masculino</SelectItem>
                      <SelectItem value="female" className="text-xs">Feminino</SelectItem>
                      <SelectItem value="mixed" className="text-xs">Misto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Resumo Operacional em Métricas Reais */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground">Equipes Ativas</span>
                  <p className="text-sm font-bold font-mono tabular-nums text-foreground">
                    {filteredTeams.length} equipes
                  </p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground">Atletas Vinculados</span>
                  <p className="text-sm font-bold font-mono tabular-nums text-foreground">
                    {athletes.length} atletas
                  </p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground">Jogos no Filtro</span>
                  <p className="text-sm font-bold font-mono tabular-nums text-foreground">
                    {filteredMatches.length} jogos
                  </p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground">Jogos Concluídos</span>
                  <p className="text-sm font-bold font-mono tabular-nums text-foreground">
                    {completedMatches.length} realizados
                  </p>
                </div>
              </div>
            </div>

            {/* Categorias de Documentos Operacionais */}
            <div className="space-y-6">
              {/* Categoria 1: Competição & Confrontos */}
              <SectionCard
                title="Competição & Confrontos"
                description="Boletins oficiais de tabela, agenda de quadras e classificação por grupos."
                density="dense"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card Boletim de Jogos */}
                  <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300 shrink-0">
                        <ClipboardList className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <h4 className="text-xs font-semibold text-foreground">Boletim Geral de Jogos</h4>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Tabela completa de confrontos, horários, ginásios, quadras e resultados com escudos oficiais.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5 text-xs h-8 font-medium shadow-none"
                        onClick={openBoletimPreview}
                        disabled={!competition || filteredMatches.length === 0}
                      >
                        <Eye className="w-3.5 h-3.5" /> Visualizar PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs h-8 border-border hover:bg-zinc-800/60"
                        onClick={exportBoletimCsv}
                        disabled={!competition || filteredMatches.length === 0}
                      >
                        <Download className="w-3.5 h-3.5" /> CSV
                      </Button>
                    </div>
                  </div>

                  {/* Card Classificação Oficial */}
                  <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300 shrink-0">
                        <Trophy className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <h4 className="text-xs font-semibold text-foreground">Classificação por Grupos</h4>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Tabela oficial homologada com pontuação CBV/FIVB, saldo de sets, saldo de pontos e desempates.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        className="w-full gap-1.5 text-xs h-8 font-medium shadow-none"
                        onClick={openStandingsPreview}
                        disabled={!competition}
                      >
                        <Eye className="w-3.5 h-3.5" /> Visualizar PDF
                      </Button>
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Categoria 2: Equipes & Delegações */}
              <SectionCard
                title="Equipes & Delegações"
                description="Relação nominal com elenco de atletas, comissão técnica e ficha cadastral por equipe."
                density="dense"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card Relação Nominal */}
                  <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300 shrink-0">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <h4 className="text-xs font-semibold text-foreground">Relação Nominal das Equipes</h4>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Ficha editorial completa (1 equipe por página) contendo elenco numerado, capitão, líbero e comissão técnica.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        className="w-full gap-1.5 text-xs h-8 font-medium shadow-none"
                        onClick={openRostersPreview}
                      >
                        <Eye className="w-3.5 h-3.5" /> Visualizar PDF
                      </Button>
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Categoria 3: Documentos Oficiais & Premiação */}
              <SectionCard
                title="Documentos Oficiais & Premiação"
                description="Relatórios homologados de encerramento, pódio final e modelos de súmula oficial."
                density="dense"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card Quadro de Honra */}
                  <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300 shrink-0">
                        <Award className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <h4 className="text-xs font-semibold text-foreground">Quadro de Honra & Pódio Oficial</h4>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Relatório oficial de encerramento com Campeão (Ouro), Vice (Prata) e 3º colocado (Bronze).
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        className="w-full gap-1.5 text-xs h-8 font-medium shadow-none"
                        onClick={openPodiumPreview}
                        disabled={!competition}
                      >
                        <Eye className="w-3.5 h-3.5" /> Visualizar PDF
                      </Button>
                    </div>
                  </div>

                  {/* Card Súmula em Branco */}
                  <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300 shrink-0">
                        <FileSpreadsheet className="w-4 h-4 text-zinc-400" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <h4 className="text-xs font-semibold text-foreground">Súmula Oficial em Branco</h4>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Emissão rápida de súmula oficial padronizada CBV/FIVB em branco para preenchimento manual em mesa.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1.5 text-xs h-8 border-border hover:bg-zinc-800/60 font-medium"
                        onClick={() => setBlankDialogOpen(true)}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-400" /> Configurar & Emitir
                      </Button>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>
        </StateContainer>
      </div>

      {/* Diálogos Originais */}
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
