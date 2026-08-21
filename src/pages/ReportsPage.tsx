import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileSpreadsheet, Trophy, Users, FileDown, ClipboardList, Award, Sparkles, PenLine } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { dataAccess } from '@/services/dataAccess';
import { computeStandingsByGroup, computeBestThirds } from '@/services/standingsService';
import { computePodium } from '@/services/playoffsService';
import {
  generateMatchesBoletimPdf,
  generateStandingsReportPdf,
  generateTeamRosterReportPdf,
  generatePodiumReportPdf,
  downloadReportsPdf,
} from '@/lib/pdf/reportsPdf';
import { BlankSheetEmitDialog } from '@/components/match/BlankSheetEmitDialog';
import { MatchSheetEmitDialog } from '@/components/match/MatchSheetEmitDialog';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';

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
  const [loading, setLoading] = useState(true);
  const [blankDialogOpen, setBlankDialogOpen] = useState(false);
  const [blankDefaultFormat, setBlankDefaultFormat] = useState<'3-sets' | '5-sets'>('3-sets');
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchRecord | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [comps, mList] = await Promise.all([
        dataAccess.listCompetitions(),
        dataAccess.listMatches(),
      ]);
      setCompetitions(comps);
      setMatches(mList);
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

  const exportBoletim = async () => {
    if (!competition) return;
    const [matches, teams] = await Promise.all([dataAccess.listMatches(), dataAccess.listTeams()]);
    const rows = matches
      .filter(m => m.competitionId === competition.id)
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
    const doc = generateMatchesBoletimPdf(rows, competition.name);
    downloadReportsPdf(doc, `boletim_${competition.name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()}.pdf`);
    toast.success('Boletim de jogos gerado com sucesso!');
  };

  const exportStandings = async () => {
    if (!competition) return;
    const [teams, competitionTeams, matches] = await Promise.all([
      dataAccess.listTeams(),
      dataAccess.listCompetitionTeams(),
      dataAccess.listMatches(),
    ]);
    const competitionMatches = matches.filter(m => m.competitionId === competition.id);
    const cts = competitionTeams.filter(ct => ct.competitionId === competition.id);
    const registrations: { team: TeamRecord; groupName?: string }[] = [];
    for (const ct of cts) {
      const team = teams.find(t => t.id === ct.teamId);
      if (!team) continue;
      const groupMatch = competitionMatches.find(m => m.teamAId === team.id || m.teamBId === team.id);
      registrations.push({ team, groupName: groupMatch?.groupName ?? competition.groupName });
    }
    const standings = computeStandingsByGroup(registrations, competitionMatches, {
      criteria: competition.tiebreakCriteriaOrder,
    });
    const doc = generateStandingsReportPdf(
      standings.map(group => ({ groupName: group.groupName, standings: group.standings })),
      competition.name,
    );
    downloadReportsPdf(doc, `classificacao_${competition.name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()}.pdf`);
    toast.success('Relatório de classificação gerado com sucesso!');
  };

  const exportRosters = async () => {
    const [rows, competitionTeams, teams] = await Promise.all([
      dataAccess.listCompetitionAthletes(),
      dataAccess.listCompetitionTeams(),
      dataAccess.listTeams(),
    ]);
    const grouped = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = row.competitionTeamId;
      grouped.set(key, [...(grouped.get(key) ?? []), row]);
    }
    const doc = generateTeamRosterReportPdf(
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
    downloadReportsPdf(doc, 'relacao_nominal_equipes.pdf');
    toast.success('Relação nominal de elencos (1 equipe por folha) gerada!');
  };

  const exportPodiumReport = async () => {
    if (!competition) return;
    const [matches, teams] = await Promise.all([dataAccess.listMatches(), dataAccess.listTeams()]);
    const compMatches = matches.filter(m => m.competitionId === competition.id);
    const podium = computePodium(compMatches);

    const champion = teams.find(t => t.id === podium.championTeamId);
    const runnerUp = teams.find(t => t.id === podium.runnerUpTeamId);
    const third = teams.find(t => t.id === podium.thirdPlaceTeamId);
    const fourth = teams.find(t => t.id === podium.fourthPlaceTeamId);

    const catName = competition.genderCategory === 'male' ? 'Masculino' : competition.genderCategory === 'female' ? 'Feminino' : 'Misto';
    const doc = generatePodiumReportPdf({
      competitionName: competition.name,
      categoryName: catName,
      champion: champion ? { name: champion.name, shortName: champion.shortName, logoUrl: champion.logoUrl } : undefined,
      runnerUp: runnerUp ? { name: runnerUp.name, shortName: runnerUp.shortName, logoUrl: runnerUp.logoUrl } : undefined,
      third: third ? { name: third.name, shortName: third.shortName, logoUrl: third.logoUrl } : undefined,
      fourth: fourth ? { name: fourth.name, shortName: fourth.shortName, logoUrl: fourth.logoUrl } : undefined,
    });

    downloadReportsPdf(doc, `podio_final_${competition.name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()}.pdf`);
    toast.success('Relatório de Pódio e Encerramento gerado com sucesso!');
  };

  const reports = [
    {
      title: 'Boletim de Jogos & Confrontos',
      description: 'Tabela geral com rodadas, horários, ginásios, quadras, equipes e resultados das partidas.',
      icon: ClipboardList,
      action: exportBoletim,
      requiresComp: true,
    },
    {
      title: 'Classificação por Grupos & Critérios',
      description: 'Classificação com pontos FIVB/CBV, sets ratio, pontos ratio e justificativa de desempates.',
      icon: Trophy,
      action: exportStandings,
      requiresComp: true,
    },
    {
      title: 'Relação Nominal das Equipes',
      description: 'Elenco completo das equipes inscritas com número de camisa, capitão, líbero e documentos.',
      icon: Users,
      action: exportRosters,
      requiresComp: false,
    },
    {
      title: 'Quadro de Honra & Pódio Final',
      description: 'Relatório oficial com Campeão, Vice-campeão, 3º colocado e 4º colocado da competição.',
      icon: Award,
      action: exportPodiumReport,
      requiresComp: true,
    },
    {
      title: 'Súmula Oficial em Branco (3 Sets)',
      description: 'Modelo oficial padrão A4 em branco para preenchimento manual na mesa de arbitragem.',
      icon: FileSpreadsheet,
      action: () => {
        setBlankDefaultFormat('3-sets');
        setBlankDialogOpen(true);
      },
      requiresComp: false,
    },
    {
      title: 'Súmula Oficial em Branco (5 Sets)',
      description: 'Modelo oficial padrão A3 em branco para partidas de até 5 sets com tiebreak.',
      icon: FileSpreadsheet,
      action: () => {
        setBlankDefaultFormat('5-sets');
        setBlankDialogOpen(true);
      },
      requiresComp: false,
    },
    {
      title: 'Fichas de Posição / Saque em Branco',
      description: 'Conjunto de 8 fichas em folha A4 com quadrículas de rotação I a VI e assinatura do técnico.',
      icon: ClipboardList,
      action: () => {
        setBlankDialogOpen(true);
      },
      requiresComp: false,
    },
  ];

  return (
    <MainLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-2.5">
              <FileSpreadsheet className="w-8 h-8 text-primary" />
              Central de Relatórios & Documentos
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gere e baixe boletins, classificações, súmulas e listas nominais em formato PDF oficial.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={competitionId} onValueChange={setCompetitionId} disabled={loading}>
              <SelectTrigger className="w-64 text-xs">
                <SelectValue placeholder="Selecione a competição" />
              </SelectTrigger>
              <SelectContent>
                {competitions.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reports.map(report => {
            const Icon = report.icon;
            return (
              <Card key={report.title} className="card-elevated hover:border-primary/40 transition-all flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary w-fit mb-2">
                    <Icon className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-base font-display">{report.title}</CardTitle>
                  <CardDescription className="text-xs leading-relaxed">{report.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button variant="accent" className="w-full gap-2 text-xs" onClick={report.action} disabled={loading || (report.requiresComp && !competition)}>
                    <FileDown className="w-4 h-4" />
                    Gerar PDF
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>
      </motion.div>

      {/* Modal de Emissão de Súmulas em Branco */}
      <BlankSheetEmitDialog
        open={blankDialogOpen}
        onOpenChange={setBlankDialogOpen}
        defaultFormat={blankDefaultFormat}
      />

      {/* Modal de Emissão de Súmula Oficial de Jogo */}
      <MatchSheetEmitDialog
        match={selectedMatch}
        competition={competition}
        open={selectedMatch !== null}
        onOpenChange={v => { if (!v) setSelectedMatch(null); }}
      />
    </MainLayout>
  );
}