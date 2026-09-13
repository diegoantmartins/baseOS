/**
 * MatchStatisticsReportView.tsx
 *
 * Componente de visualização nativa HTML-First para o
 * Relatório de Estatísticas de Partidas, Sets e Duração (BaseOS Fase 7.5 Prompt 8).
 *
 * Apresenta:
 * - Métricas executivas da competição (Jogos, Sets, Pontos, Médias de Sets/Pontos)
 * - Tabela de desempenho agregado por equipe (J, V, D, Sets+, Sets-, Saldo, Médias)
 * - Lista de confrontos com parciais detalhadas set a set
 * - Filtros operacionais (Equipe, Fase, Status e Busca textual)
 * - Responsividade adaptativa (tabela de alta densidade no Desktop, cards no Mobile)
 * - Declaração de transparência estatística (Duração: Não registrada)
 *
 * Design System: Enterprise Dark SaaS (Zinc-950/900, Âmbar-500, contadores mono).
 */

import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  HelpCircle,
  Search,
  Trophy,
  Volleyball,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { MatchStatisticsReportData } from '@/lib/pdf/types';

interface MatchStatisticsReportViewProps {
  data: MatchStatisticsReportData;
  className?: string;
  initialTeamFilter?: string;
  initialPhaseFilter?: string;
  initialStatusFilter?: string;
}

export function MatchStatisticsReportView({
  data,
  className = '',
  initialTeamFilter = 'all',
  initialPhaseFilter = 'all',
  initialStatusFilter = 'all',
}: MatchStatisticsReportViewProps) {
  const [activeTab, setActiveTab] = useState<'matches' | 'teams'>('matches');
  const [selectedTeam, setSelectedTeam] = useState<string>(initialTeamFilter);
  const [selectedPhase, setSelectedPhase] = useState<string>(initialPhaseFilter);
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatusFilter);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extrai listas únicas para os seletores de filtros
  const availableTeams = useMemo(() => {
    const map = new Map<string, string>();
    data.matches.forEach((m) => {
      map.set(m.teamAId, m.teamAName);
      map.set(m.teamBId, m.teamBName);
    });
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [data.matches]);

  const availablePhases = useMemo(() => {
    const set = new Set<string>();
    data.matches.forEach((m) => {
      if (m.phase) set.add(m.phase);
    });
    return [...set];
  }, [data.matches]);

  // Filtra as partidas com base nos filtros selecionados
  const filteredMatches = useMemo(() => {
    return data.matches.filter((m) => {
      // 1. Filtro de equipe
      if (selectedTeam !== 'all') {
        if (m.teamAId !== selectedTeam && m.teamBId !== selectedTeam) {
          return false;
        }
      }

      // 2. Filtro de fase
      if (selectedPhase !== 'all') {
        if (m.phase !== selectedPhase) return false;
      }

      // 3. Filtro de status
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'completed' && !m.isCompleted) return false;
        if (selectedStatus === 'in-progress' && m.status !== 'in-progress') return false;
        if (selectedStatus === 'scheduled' && m.status !== 'scheduled' && m.status !== 'sheet_available') return false;
        if (selectedStatus === 'wo' && !m.isWo) return false;
      }

      // 4. Busca textual
      if (searchQuery.trim() !== '') {
        const q = searchQuery.trim().toLowerCase();
        const matchTeamA = m.teamAName.toLowerCase().includes(q);
        const matchTeamB = m.teamBName.toLowerCase().includes(q);
        const matchPhase = (m.phase || '').toLowerCase().includes(q);
        const matchVenue = (m.venue || '').toLowerCase().includes(q);
        const matchNumber = m.matchNumber.toString() === q || `jogo ${m.matchNumber}`.includes(q) || `#${m.matchNumber}`.includes(q);

        if (!matchTeamA && !matchTeamB && !matchPhase && !matchVenue && !matchNumber) {
          return false;
        }
      }

      return true;
    });
  }, [data.matches, selectedTeam, selectedPhase, selectedStatus, searchQuery]);

  return (
    <div className={`space-y-6 ${className}`} data-testid="match-statistics-report-view">
      {/* 1. Métricas Executivas da Competição */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total de Jogos */}
        <div className="p-3.5 rounded-xl bg-card border border-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase font-bold tracking-wider">Total de Jogos</span>
            <Volleyball className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <p className="text-xl font-bold font-mono text-foreground tabular-nums">
            {data.metrics.totalMatches}
          </p>
          <span className="text-[10px] text-muted-foreground block">
            {data.metrics.completedMatches} concluídos
          </span>
        </div>

        {/* Jogos Concluídos */}
        <div className="p-3.5 rounded-xl bg-card border border-border space-y-1">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Concluídos</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-bold font-mono text-foreground tabular-nums">
            {data.metrics.completedMatches}
          </p>
          <span className="text-[10px] text-emerald-400/90 font-medium block">
            {data.metrics.woMatches > 0 ? `${data.metrics.woMatches} por W.O.` : 'Com resultado'}
          </span>
        </div>

        {/* Sets Disputados */}
        <div className="p-3.5 rounded-xl bg-card border border-border space-y-1">
          <div className="flex items-center justify-between text-blue-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Sets Disputados</span>
            <BarChart3 className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-bold font-mono text-foreground tabular-nums">
            {data.metrics.totalSetsPlayed}
          </p>
          <span className="text-[10px] text-blue-400/90 font-medium block">
            {data.metrics.averageSetsPerMatch} sets/partida
          </span>
        </div>

        {/* Pontos Totais */}
        <div className="p-3.5 rounded-xl bg-card border border-border space-y-1">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Pontos Totais</span>
            <Zap className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-bold font-mono text-foreground tabular-nums">
            {data.metrics.totalPointsScored.toLocaleString('pt-BR')}
          </p>
          <span className="text-[10px] text-muted-foreground block">
            ~{data.metrics.averagePointsPerSet} pts/set
          </span>
        </div>

        {/* Média Sets / Jogo */}
        <div className="p-3.5 rounded-xl bg-card border border-border space-y-1">
          <div className="flex items-center justify-between text-indigo-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Média Sets/Jogo</span>
            <Trophy className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-bold font-mono text-foreground tabular-nums">
            {data.metrics.averageSetsPerMatch}
          </p>
          <span className="text-[10px] text-muted-foreground block">
            {data.metrics.tiebreakMatchesCount} com tiebreak
          </span>
        </div>

        {/* Duração Oficial (Transparência de Domínio) */}
        <div className="p-3.5 rounded-xl bg-card border border-border space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Duração</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <p className="text-sm font-semibold text-zinc-400 font-mono pt-1">
            Não registrada
          </p>
          <span className="text-[9px] text-muted-foreground block truncate" title={data.metrics.durationNotice}>
            Sem cronômetro no DB
          </span>
        </div>
      </div>

      {/* 2. Abas de Visualização (Confrontos x Desempenho por Equipe) */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'matches' | 'teams')} className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border pb-3 no-print">
          <TabsList className="bg-zinc-900 border border-zinc-800 p-0.5 h-8">
            <TabsTrigger value="matches" className="text-xs h-7 px-3 data-[state=active]:bg-zinc-800">
              Confrontos e Parciais ({filteredMatches.length})
            </TabsTrigger>
            <TabsTrigger value="teams" className="text-xs h-7 px-3 data-[state=active]:bg-zinc-800">
              Desempenho por Equipe ({data.teamSummaries.length})
            </TabsTrigger>
          </TabsList>

          {/* Aviso Oficial de Transparência Estatística */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-zinc-900/60 px-3 py-1 rounded-md border border-zinc-800">
            <HelpCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="text-[11px]">
              Dados extraídos dos sets oficiais homologados. Estatísticas individuais não persistidas.
            </span>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────────────── */}
        {/* ABA 1: CONFRONTOS E PARCIAIS SET A SET                                */}
        {/* ───────────────────────────────────────────────────────────────────── */}
        <TabsContent value="matches" className="space-y-4 m-0">
          {/* Barra de Filtros Operacionais */}
          <div className="p-3.5 rounded-xl bg-card border border-border space-y-3 no-print">
            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro por Equipe */}
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="w-full sm:w-44 h-8 text-xs bg-zinc-900 border-zinc-800">
                  <SelectValue placeholder="Todas as equipes" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800 max-h-56">
                  <SelectItem value="all" className="text-xs">
                    Todas as Equipes
                  </SelectItem>
                  {availableTeams.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filtro por Fase */}
              {availablePhases.length > 0 && (
                <Select value={selectedPhase} onValueChange={setSelectedPhase}>
                  <SelectTrigger className="w-full sm:w-36 h-8 text-xs bg-zinc-900 border-zinc-800">
                    <SelectValue placeholder="Todas as fases" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-800">
                    <SelectItem value="all" className="text-xs">
                      Todas as Fases
                    </SelectItem>
                    {availablePhases.map((phase) => (
                      <SelectItem key={phase} value={phase} className="text-xs capitalize">
                        {phase}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Filtro por Status */}
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full sm:w-36 h-8 text-xs bg-zinc-900 border-zinc-800">
                  <SelectValue placeholder="Status do jogo" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800">
                  <SelectItem value="all" className="text-xs">
                    Todos os Status
                  </SelectItem>
                  <SelectItem value="completed" className="text-xs">
                    Concluídas
                  </SelectItem>
                  <SelectItem value="in-progress" className="text-xs">
                    Em Andamento
                  </SelectItem>
                  <SelectItem value="scheduled" className="text-xs">
                    Agendadas
                  </SelectItem>
                  <SelectItem value="wo" className="text-xs">
                    W.O.
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Busca Textual */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar equipe, fase, jogo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs bg-zinc-900 border-zinc-800"
                />
              </div>
            </div>
          </div>

          {/* Tabela Desktop */}
          <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" aria-label="Estatísticas detalhadas dos confrontos">
                <thead className="bg-zinc-900/80 border-b border-border text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  <tr>
                    <th scope="col" className="py-2.5 px-3 w-14 text-center font-mono">Jogo</th>
                    <th scope="col" className="py-2.5 px-3 w-32">Data / Hora</th>
                    <th scope="col" className="py-2.5 px-3 w-28">Fase / Grupo</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Equipe Mandante (A)</th>
                    <th scope="col" className="py-2.5 px-3 w-24 text-center">Placar Sets</th>
                    <th scope="col" className="py-2.5 px-3 text-left">Equipe Visitante (B)</th>
                    <th scope="col" className="py-2.5 px-3">Parciais dos Sets</th>
                    <th scope="col" className="py-2.5 px-3 w-24 text-center font-mono">Saldo Pts</th>
                    <th scope="col" className="py-2.5 px-3 w-24 text-center">Duração</th>
                    <th scope="col" className="py-2.5 px-3 w-28 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredMatches.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-muted-foreground text-xs italic">
                        Nenhum confronto encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredMatches.map((m) => {
                      const isWinnerA = m.winnerSide === 'A';
                      const isWinnerB = m.winnerSide === 'B';

                      return (
                        <tr
                          key={m.matchId}
                          data-testid={`match-stat-row-${m.matchNumber}`}
                          className="hover:bg-zinc-900/40 transition-colors"
                        >
                          {/* Número do Jogo */}
                          <td className="py-2 px-3 text-center font-mono font-semibold text-foreground">
                            #{m.matchNumber}
                          </td>

                          {/* Data / Hora */}
                          <td className="py-2 px-3 text-muted-foreground">
                            <div>{m.date}</div>
                            <div className="text-[10px] text-zinc-500">{m.time}</div>
                          </td>

                          {/* Fase / Grupo */}
                          <td className="py-2 px-3 text-muted-foreground">
                            <span className="capitalize block truncate max-w-[110px]">
                              {m.phase || '—'}
                            </span>
                            {m.groupName && (
                              <span className="text-[10px] text-zinc-500 block truncate">
                                {m.groupName}
                              </span>
                            )}
                          </td>

                          {/* Equipe A */}
                          <td className={`py-2 px-3 text-right font-medium ${isWinnerA ? 'text-amber-400 font-bold' : 'text-foreground'}`}>
                            {m.teamAName}
                            {m.teamAShortName && (
                              <span className="text-[10px] text-muted-foreground font-mono ml-1">
                                [{m.teamAShortName}]
                              </span>
                            )}
                          </td>

                          {/* Placar em Sets */}
                          <td className="py-2 px-3 text-center">
                            {m.isCompleted || m.setsPlayed > 0 ? (
                              <Badge
                                variant={m.isCompleted ? 'default' : 'outline'}
                                className="font-mono text-xs px-2 py-0.5 bg-zinc-900 border-zinc-800"
                              >
                                {m.teamASetsWon} × {m.teamBSetsWon}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground font-mono">—</span>
                            )}
                          </td>

                          {/* Equipe B */}
                          <td className={`py-2 px-3 text-left font-medium ${isWinnerB ? 'text-amber-400 font-bold' : 'text-foreground'}`}>
                            {m.teamBName}
                            {m.teamBShortName && (
                              <span className="text-[10px] text-muted-foreground font-mono ml-1">
                                [{m.teamBShortName}]
                              </span>
                            )}
                          </td>

                          {/* Parciais dos Sets */}
                          <td className="py-2 px-3">
                            {m.sets.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {m.sets.map((s) => (
                                  <span
                                    key={s.setNumber}
                                    className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-300"
                                    title={`Set ${s.setNumber}: ${s.scoreA} x ${s.scoreB} (Dif: ${s.pointDifference})`}
                                  >
                                    {s.scoreA}-{s.scoreB}
                                  </span>
                                ))}
                              </div>
                            ) : m.isWo ? (
                              <Badge variant="outline" className="text-[10px] text-red-400 border-red-900/60 bg-red-950/30">
                                W.O. Oficial
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">—</span>
                            )}
                          </td>

                          {/* Saldo de Pontos */}
                          <td className="py-2 px-3 text-center font-mono">
                            {m.isCompleted ? (
                              <span className={m.teamAPoints >= m.teamBPoints ? 'text-emerald-400' : 'text-amber-400'}>
                                {m.teamAPoints} : {m.teamBPoints}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>

                          {/* Duração */}
                          <td className="py-2 px-3 text-center font-mono text-zinc-500 text-[11px]">
                            {m.durationLabel}
                          </td>

                          {/* Status */}
                          <td className="py-2 px-3 text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-medium h-5 ${
                                m.status === 'homologated'
                                  ? 'border-emerald-800/60 text-emerald-400 bg-emerald-950/30'
                                  : m.status === 'completed'
                                  ? 'border-blue-800/60 text-blue-400 bg-blue-950/30'
                                  : m.status === 'in-progress'
                                  ? 'border-amber-800/60 text-amber-400 bg-amber-950/30 animate-pulse'
                                  : m.isWo
                                  ? 'border-red-800/60 text-red-400 bg-red-950/30'
                                  : 'border-zinc-800 text-zinc-400 bg-zinc-900/60'
                              }`}
                            >
                              {m.statusLabel}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cards Mobile */}
          <div className="block md:hidden space-y-3">
            {filteredMatches.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-xs bg-card rounded-xl border border-border">
                Nenhum confronto encontrado.
              </div>
            ) : (
              filteredMatches.map((m) => (
                <div
                  key={m.matchId}
                  data-testid={`match-stat-card-${m.matchNumber}`}
                  className="p-3.5 rounded-xl bg-card border border-border space-y-2.5"
                >
                  <div className="flex items-center justify-between text-xs border-b border-border/60 pb-2">
                    <span className="font-bold font-mono text-amber-400">Jogo #{m.matchNumber}</span>
                    <Badge variant="outline" className="text-[10px] h-5">
                      {m.statusLabel}
                    </Badge>
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold ${m.winnerSide === 'A' ? 'text-amber-400' : 'text-foreground'}`}>
                        {m.teamAName}
                      </span>
                      <span className="font-mono font-bold text-sm">
                        {m.isCompleted || m.setsPlayed > 0 ? m.teamASetsWon : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold ${m.winnerSide === 'B' ? 'text-amber-400' : 'text-foreground'}`}>
                        {m.teamBName}
                      </span>
                      <span className="font-mono font-bold text-sm">
                        {m.isCompleted || m.setsPlayed > 0 ? m.teamBSetsWon : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Parciais dos Sets */}
                  {m.sets.length > 0 && (
                    <div className="pt-1.5 border-t border-border/40">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">
                        Parciais:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {m.sets.map((s) => (
                          <span
                            key={s.setNumber}
                            className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-300"
                          >
                            Set {s.setNumber}: {s.scoreA}-{s.scoreB}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                    <span>{m.date} · {m.time}</span>
                    <span className="font-mono">Duração: {m.durationLabel}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* ───────────────────────────────────────────────────────────────────── */}
        {/* ABA 2: DESEMPENHO CONSOLIDADO POR EQUIPE                              */}
        {/* ───────────────────────────────────────────────────────────────────── */}
        <TabsContent value="teams" className="space-y-4 m-0">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" aria-label="Desempenho consolidado das equipes">
                <thead className="bg-zinc-900/80 border-b border-border text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  <tr>
                    <th scope="col" className="py-2.5 px-3 w-12 text-center font-mono">Pos</th>
                    <th scope="col" className="py-2.5 px-3">Equipe</th>
                    <th scope="col" className="py-2.5 px-3 w-14 text-center font-mono" title="Jogos Disputados">J</th>
                    <th scope="col" className="py-2.5 px-3 w-14 text-center font-mono text-emerald-400" title="Vitórias">V</th>
                    <th scope="col" className="py-2.5 px-3 w-14 text-center font-mono text-rose-400" title="Derrotas">D</th>
                    <th scope="col" className="py-2.5 px-3 w-20 text-center font-mono" title="Aproveitamento">% Vit</th>
                    <th scope="col" className="py-2.5 px-3 w-16 text-center font-mono" title="Sets Vencidos">Sets+</th>
                    <th scope="col" className="py-2.5 px-3 w-16 text-center font-mono" title="Sets Perdidos">Sets-</th>
                    <th scope="col" className="py-2.5 px-3 w-20 text-center font-mono" title="Set Average (Sets+ / Sets-)">Set Avg</th>
                    <th scope="col" className="py-2.5 px-3 w-16 text-center font-mono" title="Pontos Pró">Pts+</th>
                    <th scope="col" className="py-2.5 px-3 w-16 text-center font-mono" title="Pontos Contra">Pts-</th>
                    <th scope="col" className="py-2.5 px-3 w-20 text-center font-mono" title="Saldo de Pontos (Pts+ - Pts-)">Saldo</th>
                    <th scope="col" className="py-2.5 px-3 w-20 text-center font-mono" title="Point Average (Pts+ / Pts-)">Pts Avg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data.teamSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-8 text-center text-muted-foreground text-xs italic">
                        Nenhuma equipe com jogos registrados na competição.
                      </td>
                    </tr>
                  ) : (
                    data.teamSummaries.map((t, idx) => (
                      <tr
                        key={t.teamId}
                        data-testid={`team-stat-row-${t.teamId}`}
                        className="hover:bg-zinc-900/40 transition-colors font-mono"
                      >
                        <td className="py-2.5 px-3 text-center font-bold text-foreground">
                          {idx + 1}º
                        </td>
                        <td className="py-2.5 px-3 font-sans font-semibold text-foreground">
                          {t.teamName}
                          {t.teamShortName && (
                            <span className="text-[10px] text-muted-foreground font-mono ml-1.5">
                              [{t.teamShortName}]
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">{t.matchesPlayed}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-emerald-400">{t.wins}</td>
                        <td className="py-2.5 px-3 text-center text-rose-400">{t.losses}</td>
                        <td className="py-2.5 px-3 text-center font-semibold text-zinc-300">{t.winRate}%</td>
                        <td className="py-2.5 px-3 text-center text-emerald-400">{t.setsWon}</td>
                        <td className="py-2.5 px-3 text-center text-rose-400">{t.setsLost}</td>
                        <td className="py-2.5 px-3 text-center text-zinc-400">
                          {t.setRatio === 999 ? 'MAX' : t.setRatio !== null ? t.setRatio.toFixed(3) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center">{t.pointsScored}</td>
                        <td className="py-2.5 px-3 text-center">{t.pointsConceded}</td>
                        <td className={`py-2.5 px-3 text-center font-bold ${t.pointBalance > 0 ? 'text-emerald-400' : t.pointBalance < 0 ? 'text-rose-400' : 'text-zinc-400'}`}>
                          {t.pointBalance > 0 ? `+${t.pointBalance}` : t.pointBalance}
                        </td>
                        <td className="py-2.5 px-3 text-center text-zinc-400">
                          {t.pointRatio === 999 ? 'MAX' : t.pointRatio !== null ? t.pointRatio.toFixed(3) : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
