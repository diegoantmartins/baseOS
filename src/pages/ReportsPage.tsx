import { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileSpreadsheet, Trophy, Users, Eye, ClipboardList, Award, Filter, Download } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
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
import type { CompetitionRecord, MatchRecord, TeamRecord, PersonRecord } from '@/types/entities';
import type { CompetitionAthlete } from '@/types/registration';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function ReportsPage() {
  const navigate = useNavigate();
  const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);
  const [competitionId, setCompetitionId] = useState<string>('');
  
  // Filters
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');

  const [loading, setLoading] = useState(true);
  const [blankDialogOpen, setBlankDialogOpen] = useState(false);
  const [blankDefaultFormat, setBlankDefaultFormat] = useState<'3-sets' | '5-sets'>('3-sets');
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [athletes, setAthletes] = useState<CompetitionAthlete[]>([]); // simplified for counts
  
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
    } catch {
      toast.error('Erro ao carregar dados dos relatórios');
    } finally {
      setLoading(false);
    }
  }, [competitionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const competition = competitions.find(c => c.id === competitionId) ?? null;

  // Derive filtered matches
  const filteredMatches = useMemo(() => {
    if (!competition) return [];
    let list = matches.filter(m => m.competitionId === competition.id);
    if (selectedPhase !== 'all') {
      list = list.filter(m => m.phase === selectedPhase || (selectedPhase === 'classificatória' && m.phase === 'classificatoria'));
    }
    return list;
  }, [competition, matches, selectedPhase]);

  // Derive filtered teams
  const filteredTeams = useMemo(() => {
    if (!competition) return [];
    const teamIds = new Set<string>();
    filteredMatches.forEach(m => {
      if (m.teamAId) teamIds.add(m.teamAId);
      if (m.teamBId) teamIds.add(m.teamBId);
    });
    return Array.from(teamIds).map(id => teams.find(t => t.id === id)).filter(Boolean) as TeamRecord[];
  }, [competition, filteredMatches, teams]);

  const completedMatches = filteredMatches.filter(m => m.status === 'completed' || m.status === 'homologated');

  // Export CSV functions
  const downloadCsv = (filename: string, csvContent: string) => {
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportBoletimCsv = () => {
    if (!competition) return;
    const header = "Jogo,Fase,Grupo,Data,Hora,Local,Equipe A,Equipe B,Placar A,Placar B,Status\n";
    const rows = filteredMatches.map(m => {
      const teamA = teams.find(t => t.id === m.teamAId);
      const teamB = teams.find(t => t.id === m.teamBId);
      const setsA = m.sets.filter(s => s.scoreA > s.scoreB).length;
      const setsB = m.sets.filter(s => s.scoreB > s.scoreA).length;
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
        m.status
      ].map(v => `"${v}"`).join(',');
    }).join('\n');
    downloadCsv(`boletim_${competition.name}.csv`, header + rows);
  };


  const openBoletimPreview = () => {
    if (!competition) return;
    setPreviewDialog({
      open: true,
      title: 'Boletim Geral de Jogos & Confrontos',
      subtitle: `${competition.name} · Visualização oficial antes de impressão/download`,
      filename: `boletim_${competition.name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()}.pdf`,
      generatePdf: async () => {
        const rows = filteredMatches
          .sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''))
          .map(m => {
            const teamA = teams.find(t => t.id === m.teamAId);
            const teamB = teams.find(t => t.id === m.teamBId);
            const setsA = m.sets.filter(s => s.scoreA > s.scoreB).length;
            const setsB = m.sets.filter(s => s.scoreB > s.scoreA).length;
            return {
              matchNumber: m.matchNumber,
              round: m.round,
              phase: m.phase,
              groupName: m.groupName,
              date: m.scheduledTime ? (m.scheduledTime.includes('T') ? m.scheduledTime.split('T')[0] : m.scheduledTime.split(' ')[0]) : '',
              time: m.scheduledTime ? (m.scheduledTime.includes('T') ? m.scheduledTime.split('T')[1].substring(0, 5) : m.scheduledTime.split(' ')[1]?.substring(0, 5) || '') : '',
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
                m.status === 'homologated' ? 'Homologado' : m.status === 'completed' ? 'Finalizado' : m.status === 'in-progress' ? 'Ao vivo' : m.status === 'cancelled' ? 'Cancelado' : 'Agendado',
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
        const [ctData] = await Promise.all([
          dataAccess.listCompetitionTeams(),
        ]);
        const cts = ctData.filter(ct => ct.competitionId === competition.id);
        const registrations: { team: TeamRecord; groupName?: string }[] = [];
        for (const ct of cts) {
          const team = teams.find(t => t.id === ct.teamId);
          if (!team) continue;
          
          const groupMatch = filteredMatches.find(m => m.teamAId === team.id || m.teamBId === team.id);
          registrations.push({ team, groupName: groupMatch?.groupName ?? competition.groupName });
        }
        const standings = computeStandingsByGroup(registrations, filteredMatches, {
          criteria: competition.tiebreakCriteriaOrder,
        });
        return generateStandingsReportPdf(
          standings.map(group => ({ groupName: group.groupName, standings: group.standings })),
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
          ? competitionTeams.filter(ct => ct.competitionId === competition.id)
          : competitionTeams;
        
        const activeTeamIds = new Set(filteredTeams.map(t => t.id));
        const finalCt = selectedPhase !== 'all' ? filteredCt.filter(ct => activeTeamIds.has(ct.teamId)) : filteredCt;

        const filteredCtIds = new Set(finalCt.map(c => c.id));
        const filteredRows = rows.filter(r => filteredCtIds.has(r.competitionTeamId));

        const grouped = new Map<string, typeof rows>();
        for (const row of filteredRows) {
          const key = row.competitionTeamId;
          grouped.set(key, [...(grouped.get(key) ?? []), row]);
        }
        return generateTeamRosterReportPdf(
          [...grouped.entries()].map(([ctId, list]) => {
            const ct = competitionTeams.find(c => c.id === ctId);
            const team = ct ? teams.find(t => t.id === ct.teamId) : undefined;
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
              athletes: list.map(a => ({
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
      title: 'Quadro de Honra & Pódio Oficial',
      subtitle: `${competition.name} · Encerramento e Premiações Homologadas`,
      filename: `podio_final_${competition.name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()}.pdf`,
      generatePdf: async () => {
        const podium = computePodium(filteredMatches);

        const champion = teams.find(t => t.id === podium.championTeamId);
        const runnerUp = teams.find(t => t.id === podium.runnerUpTeamId);
        const third = teams.find(t => t.id === podium.thirdPlaceTeamId);
        const fourth = teams.find(t => t.id === podium.fourthPlaceTeamId);

        const catName = competition.genderCategory === 'male' ? 'Masculino' : competition.genderCategory === 'female' ? 'Feminino' : 'Misto';
        return generatePodiumReportPdf({
          competitionName: competition.name,
          categoryName: catName,
          champion: champion ? { name: champion.name, shortName: champion.shortName, logoUrl: champion.logoUrl } : undefined,
          runnerUp: runnerUp ? { name: runnerUp.name, shortName: runnerUp.shortName, logoUrl: runnerUp.logoUrl } : undefined,
          third: third ? { name: third.name, shortName: third.shortName, logoUrl: third.logoUrl } : undefined,
          fourth: fourth ? { name: fourth.name, shortName: fourth.shortName, logoUrl: fourth.logoUrl } : undefined,
        });
      },
    });
  };

  return (
    <MainLayout>
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* SIDEBAR DE FILTROS */}
        <div className="w-full md:w-64 shrink-0 space-y-6">
          <div>
            <h2 className="text-xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary" /> Filtros
            </h2>
            <Card className="card-elevated">
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label>Competição</Label>
                  <Select value={competitionId} onValueChange={setCompetitionId} disabled={loading}>
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {competitions.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Fase / Grupo</Label>
                  <Select value={selectedPhase} onValueChange={setSelectedPhase} disabled={loading}>
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="Todas as Fases" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Fases</SelectItem>
                      <SelectItem value="classificatória">Classificatória</SelectItem>
                      <SelectItem value="quartas">Quartas de Final</SelectItem>
                      <SelectItem value="semifinal">Semifinal</SelectItem>
                      <SelectItem value="final">Final</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Gênero</Label>
                  <Select value={selectedGender} onValueChange={setSelectedGender} disabled={loading}>
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="female">Feminino</SelectItem>
                      <SelectItem value="mixed">Misto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ÁREA PRINCIPAL (DASHBOARD & RELATÓRIOS) */}
        <div className="flex-1 space-y-6">
          <div className="mb-2">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-2.5">
              <FileSpreadsheet className="w-8 h-8 text-primary" />
              Painel de Relatórios
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Visualize estatísticas gerais e exporte os documentos baseados nos filtros ativos.
            </p>
          </div>
          
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="card-elevated border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Equipes</span>
                  <Users className="w-4 h-4" />
                </div>
                <div className="text-3xl font-black text-foreground">{filteredTeams.length}</div>
              </CardContent>
            </Card>
            <Card className="card-elevated border-l-4 border-l-accent">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Atletas</span>
                  <Users className="w-4 h-4" />
                </div>
                <div className="text-3xl font-black text-foreground">
                  {filteredTeams.length * 10}
                </div>
              </CardContent>
            </Card>
            <Card className="card-elevated border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Jogos Listados</span>
                  <ClipboardList className="w-4 h-4" />
                </div>
                <div className="text-3xl font-black text-foreground">{filteredMatches.length}</div>
              </CardContent>
            </Card>
            <Card className="card-elevated border-l-4 border-l-success">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Concluídos</span>
                  <Trophy className="w-4 h-4" />
                </div>
                <div className="text-3xl font-black text-foreground">{completedMatches.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* LISTA DE RELATÓRIOS */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold font-display text-foreground mt-4">Documentos Disponíveis</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* Boletim Geral */}
              <Card className="card-elevated hover:border-primary/40 transition-all flex flex-col justify-between">
                <CardHeader className="pb-3 flex flex-row gap-3 space-y-0">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 h-fit">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-display">Boletim de Jogos</CardTitle>
                    <CardDescription className="text-xs leading-relaxed mt-1">Tabela geral com horários e confrontos da competição.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 flex gap-2">
                  <Button variant="accent" className="flex-1 gap-2 text-xs" onClick={openBoletimPreview} disabled={loading || !competition}>
                    <Eye className="w-4 h-4" /> Ver PDF
                  </Button>
                  <Button variant="outline" className="gap-2 text-xs" onClick={exportBoletimCsv} disabled={loading || !competition || filteredMatches.length === 0}>
                    <Download className="w-4 h-4" /> CSV
                  </Button>
                </CardContent>
              </Card>

              {/* Classificação */}
              <Card className="card-elevated hover:border-primary/40 transition-all flex flex-col justify-between">
                <CardHeader className="pb-3 flex flex-row gap-3 space-y-0">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 h-fit">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-display">Classificação por Grupos</CardTitle>
                    <CardDescription className="text-xs leading-relaxed mt-1">Classificação oficial e critérios de desempate CBV.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 flex gap-2">
                  <Button variant="accent" className="w-full gap-2 text-xs" onClick={openStandingsPreview} disabled={loading || !competition}>
                    <Eye className="w-4 h-4" /> Ver PDF
                  </Button>
                </CardContent>
              </Card>

              {/* Relação Nominal */}
              <Card className="card-elevated hover:border-primary/40 transition-all flex flex-col justify-between">
                <CardHeader className="pb-3 flex flex-row gap-3 space-y-0">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 h-fit">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-display">Relação Nominal das Equipes</CardTitle>
                    <CardDescription className="text-xs leading-relaxed mt-1">Elenco completo com números, capitão e assinaturas.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 flex gap-2">
                  <Button variant="accent" className="w-full gap-2 text-xs" onClick={openRostersPreview} disabled={loading}>
                    <Eye className="w-4 h-4" /> Ver PDF
                  </Button>
                </CardContent>
              </Card>

              {/* Pódio Final */}
              <Card className="card-elevated hover:border-primary/40 transition-all flex flex-col justify-between">
                <CardHeader className="pb-3 flex flex-row gap-3 space-y-0">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 h-fit">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-display">Quadro de Honra</CardTitle>
                    <CardDescription className="text-xs leading-relaxed mt-1">Relatório final com Campeão, Vice e 3º colocado.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 flex gap-2">
                  <Button variant="accent" className="w-full gap-2 text-xs" onClick={openPodiumPreview} disabled={loading || !competition}>
                    <Eye className="w-4 h-4" /> Ver PDF
                  </Button>
                </CardContent>
              </Card>
              
            </div>
          </div>
        </div>
      </div>

      {/* Modais Originais */}
      <ReportPreviewDialog
        open={previewDialog.open}
        onOpenChange={open => setPreviewDialog(prev => ({ ...prev, open }))}
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
        onOpenChange={v => { if (!v) setSelectedMatch(null); }}
      />
    </MainLayout>
  );
}
