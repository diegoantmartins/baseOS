import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileSpreadsheet, Trophy, Users, FileDown, ClipboardList } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { dataAccess } from '@/services/dataAccess';
import { computeStandingsByGroup } from '@/services/standingsService';
import {
  generateMatchesBoletimPdf,
  generateStandingsReportPdf,
  generateTeamRosterReportPdf,
  downloadReportsPdf,
} from '@/lib/pdf/reportsPdf';
import type { CompetitionRecord, TeamRecord } from '@/types/entities';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const ReportsPage = () => {
  const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);
  const [competitionId, setCompetitionId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const comps = await dataAccess.listCompetitions();
    setCompetitions(comps);
    setCompetitionId(prev => prev || comps[0]?.id || '');
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const competition = competitions.find(c => c.id === competitionId) ?? null;

  const exportBoletim = async () => {
    if (!competition) return;
    const [matches, teams] = await Promise.all([dataAccess.listMatches(), dataAccess.listTeams()]);
    const rows = matches
      .filter(m => m.competitionId === competition.id)
      .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
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
          date: m.scheduledTime,
          time: new Date(m.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          venue: m.venue,
          court: m.court,
          teamAName: teamA?.name ?? m.teamAId,
          teamBName: teamB?.name ?? m.teamBId,
          scoreA: m.status === 'completed' ? setsA : undefined,
          scoreB: m.status === 'completed' ? setsB : undefined,
          statusLabel:
            m.status === 'completed' ? 'Finalizado' : m.status === 'in-progress' ? 'Ao vivo' : m.status === 'cancelled' ? 'Cancelado' : m.status === 'postponed' ? 'Adiado' : 'Agendado',
        };
      });
    const doc = generateMatchesBoletimPdf(rows, competition.name);
    downloadReportsPdf(doc, `boletim_${competition.name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()}.pdf`);
    toast.success('Boletim de jogos gerado!');
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
    const standings = computeStandingsByGroup(registrations, competitionMatches);
    const doc = generateStandingsReportPdf(
      standings.map(group => ({ groupName: group.groupName, standings: group.standings })),
      competition.name,
    );
    downloadReportsPdf(doc, `classificacao_${competition.name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()}.pdf`);
    toast.success('Relatório de classificação gerado!');
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
    toast.success('Relação nominal gerada!');
  };

  const reports: Array<{ title: string; description: string; icon: typeof FileSpreadsheet; action: () => void }> = [
    {
      title: 'Boletim de Jogos',
      description: 'Tabela geral com rodadas, horários, locais, quadras, confrontos e resultados da competição.',
      icon: ClipboardList,
      action: exportBoletim,
    },
    {
      title: 'Classificação por Grupos',
      description: 'Classificação com pontos FIVB/CBV, sets e pontos average, separada por grupos/fases.',
      icon: Trophy,
      action: exportStandings,
    },
    {
      title: 'Relação Nominal das Equipes',
      description: 'Elenco completo das equipes com número de camisa, função e documento de cada atleta.',
      icon: Users,
      action: exportRosters,
    },
  ];

  return (
    <MainLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Relatórios</h1>
            <p className="text-muted-foreground mt-1">Gere relatórios em PDF prontos para impressão</p>
          </div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-muted-foreground" />
            <Select value={competitionId} onValueChange={setCompetitionId} disabled={loading}>
              <SelectTrigger className="w-64">
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

        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {reports.map(report => (
            <Card key={report.title} className="card-elevated">
              <CardHeader>
                <div className="p-2.5 rounded-lg bg-primary/10 w-fit mb-2">
                  <report.icon className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-base">{report.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">{report.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="accent" className="w-full gap-2" onClick={report.action} disabled={loading}>
                  <FileDown className="w-4 h-4" />
                  Gerar PDF
                </Button>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      </motion.div>
    </MainLayout>
  );
};

export default ReportsPage;