import { useState, useMemo } from 'react';
import type { MvpReportData } from '@/lib/pdf/types';
import {
  Trophy,
  Medal,
  Star,
  Search,
  Users,
  Calendar,
  AlertCircle,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MvpReportViewProps {
  data: MvpReportData;
  className?: string;
  initialTab?: 'ranking' | 'matches';
  initialTeamFilter?: string;
  initialStatusFilter?: 'all' | 'with-mvp' | 'without-mvp';
}

export function MvpReportView({
  data,
  className = '',
  initialTab = 'ranking',
  initialTeamFilter = 'all',
  initialStatusFilter = 'all',
}: MvpReportViewProps) {
  const [activeTab, setActiveTab] = useState<'ranking' | 'matches'>(initialTab);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>(initialTeamFilter);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'with-mvp' | 'without-mvp'>(initialStatusFilter);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Lista única de equipes para o filtro
  const availableTeams = useMemo(() => {
    const map = new Map<string, string>();
    data.matches.forEach((m) => {
      if (m.teamAId && m.teamAName) map.set(m.teamAId, m.teamAName);
      if (m.teamBId && m.teamBName) map.set(m.teamBId, m.teamBName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [data.matches]);

  // Filtragem das partidas
  const filteredMatches = useMemo(() => {
    return data.matches.filter((m) => {
      // Filtro por equipe
      if (selectedTeamFilter !== 'all') {
        if (m.teamAId !== selectedTeamFilter && m.teamBId !== selectedTeamFilter && m.athleteTeamId !== selectedTeamFilter) {
          return false;
        }
      }

      // Filtro por status de MVP
      if (selectedStatusFilter === 'with-mvp' && !m.hasHighlight) {
        return false;
      }
      if (selectedStatusFilter === 'without-mvp' && m.hasHighlight) {
        return false;
      }

      // Filtro por busca textual
      if (searchQuery.trim() !== '') {
        const query = searchQuery.trim().toLowerCase();
        const matchAthlete = (m.athleteName || '').toLowerCase().includes(query);
        const matchTeamA = m.teamAName.toLowerCase().includes(query);
        const matchTeamB = m.teamBName.toLowerCase().includes(query);
        const matchMvpTeam = (m.athleteTeamName || '').toLowerCase().includes(query);
        const matchNumber = m.matchNumber.toString().includes(query);
        if (!matchAthlete && !matchTeamA && !matchTeamB && !matchMvpTeam && !matchNumber) {
          return false;
        }
      }

      return true;
    });
  }, [data.matches, selectedTeamFilter, selectedStatusFilter, searchQuery]);

  // Filtragem do ranking/leaderboard
  const filteredLeaderboard = useMemo(() => {
    return data.leaderboard.filter((row) => {
      if (selectedTeamFilter !== 'all' && row.teamId !== selectedTeamFilter) {
        return false;
      }
      if (searchQuery.trim() !== '') {
        const query = searchQuery.trim().toLowerCase();
        const matchName = row.athleteName.toLowerCase().includes(query);
        const matchTeam = row.teamName.toLowerCase().includes(query);
        if (!matchName && !matchTeam) {
          return false;
        }
      }
      return true;
    });
  }, [data.leaderboard, selectedTeamFilter, searchQuery]);

  return (
    <div className={`space-y-6 ${className}`} data-testid="mvp-report-view">
      {/* 1. Métricas Operacionais Consolidadas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-card border border-border space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase font-bold tracking-wider">Total de Jogos</span>
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <p className="text-xl font-bold font-mono text-foreground tabular-nums">
            {data.metrics.totalMatches}
          </p>
          <span className="text-[10px] text-muted-foreground block">
            {data.metrics.matchesWithMvp} com destaque ({Math.round((data.metrics.matchesWithMvp / (data.metrics.totalMatches || 1)) * 100)}%)
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border space-y-1">
          <div className="flex items-center justify-between text-amber-500">
            <span className="text-[10px] uppercase font-bold tracking-wider">Jogos com MVP</span>
            <Trophy className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-bold font-mono text-foreground tabular-nums">
            {data.metrics.matchesWithMvp}
          </p>
          <span className="text-[10px] text-amber-400/90 font-medium block">
            Destaques oficiais
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Sem Destaque</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-bold font-mono text-foreground tabular-nums">
            {data.metrics.matchesWithoutMvp}
          </p>
          <span className="text-[10px] text-muted-foreground block">
            Aguardando indicação
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border space-y-1">
          <div className="flex items-center justify-between text-blue-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Atletas Premiados</span>
            <Users className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-bold font-mono text-foreground tabular-nums">
            {data.metrics.distinctHighlightedAthletes}
          </p>
          <span className="text-[10px] text-blue-400/90 font-medium block">
            Atletas distintos
          </span>
        </div>

        <div className="col-span-2 sm:col-span-3 lg:col-span-1 p-3.5 rounded-xl bg-card border border-border space-y-1">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Maior Destaque</span>
            <Medal className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-sm font-bold text-foreground truncate" title={data.metrics.leaderName || '—'}>
            {data.metrics.leaderName || '—'}
          </p>
          <span className="text-[10px] text-muted-foreground truncate block">
            {data.metrics.leaderMvpCount
              ? `${data.metrics.leaderMvpCount}x MVP · ${data.metrics.leaderTeamName || ''}`
              : 'Nenhum destaque ainda'}
          </span>
        </div>
      </div>

      {/* 2. Barra de Filtros e Alternância de Visualização */}
      <div className="p-4 rounded-xl bg-card border border-border space-y-3 no-print">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Alternância de Abas Operacionais */}
          <div className="inline-flex p-0.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <Button
              type="button"
              variant={activeTab === 'ranking' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('ranking')}
              className="h-7 text-xs font-semibold px-3"
            >
              <Trophy className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
              Ranking de Destaques
              <Badge variant="secondary" className="ml-1.5 px-1 py-0 text-[10px] h-4">
                {data.leaderboard.length}
              </Badge>
            </Button>
            <Button
              type="button"
              variant={activeTab === 'matches' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('matches')}
              className="h-7 text-xs font-semibold px-3"
            >
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-zinc-400" />
              Partidas & Destaques
              <Badge variant="secondary" className="ml-1.5 px-1 py-0 text-[10px] h-4">
                {data.matches.length}
              </Badge>
            </Button>
          </div>

          {/* Filtros em Linha */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-1 sm:max-w-xl justify-end">
            {/* Filtro de Equipe */}
            <Select value={selectedTeamFilter} onValueChange={setSelectedTeamFilter}>
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

            {/* Filtro de Status de MVP (Apenas na aba Partidas) */}
            {activeTab === 'matches' && (
              <Select
                value={selectedStatusFilter}
                onValueChange={(v) => setSelectedStatusFilter(v as 'all' | 'with-mvp' | 'without-mvp')}
              >
                <SelectTrigger className="w-full sm:w-40 h-8 text-xs bg-zinc-900 border-zinc-800">
                  <SelectValue placeholder="Status do destaque" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800">
                  <SelectItem value="all" className="text-xs">
                    Todos os Jogos
                  </SelectItem>
                  <SelectItem value="with-mvp" className="text-xs">
                    Apenas com MVP
                  </SelectItem>
                  <SelectItem value="without-mvp" className="text-xs">
                    Sem Destaque
                  </SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Busca textual */}
            <div className="relative w-full sm:w-44">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar atleta/equipe..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs bg-zinc-900 border-zinc-800"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Aba: Ranking de Destaques (Leaderboard) */}
      {activeTab === 'ranking' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Medal className="w-4 h-4 text-amber-400" />
              Quadro Geral de Atletas Destaque
            </h3>
            <span className="text-xs text-muted-foreground">
              {filteredLeaderboard.length} {filteredLeaderboard.length === 1 ? 'atleta listado' : 'atletas listados'}
            </span>
          </div>

          {filteredLeaderboard.length === 0 ? (
            <div className="p-8 rounded-xl bg-card border border-border text-center space-y-2">
              <Star className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-sm font-semibold text-foreground">Nenhum atleta encontrado</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Não há registros de MVP correspondentes aos filtros selecionados ou nenhuma partida possui destaque registrado.
              </p>
            </div>
          ) : (
            <>
              {/* Tabela Desktop */}
              <div className="hidden md:block rounded-xl border border-border overflow-hidden bg-card">
                <table className="w-full text-left text-xs" aria-label="Ranking de Atletas Destaque">
                  <caption className="sr-only">Ranking de atletas destaque por quantidade de prêmios de MVP</caption>
                  <thead className="bg-zinc-900/80 border-b border-border text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    <tr>
                      <th scope="col" className="py-2.5 px-4 w-14 text-center">Pos</th>
                      <th scope="col" className="py-2.5 px-4">Atleta</th>
                      <th scope="col" className="py-2.5 px-4">Equipe</th>
                      <th scope="col" className="py-2.5 px-4 text-center w-28">Destaques</th>
                      <th scope="col" className="py-2.5 px-4">Confrontos em Evidência</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredLeaderboard.map((row) => (
                      <tr key={row.athleteId} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="py-3 px-4 text-center">
                          {row.position === 1 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30 text-xs">
                              1º
                            </span>
                          ) : row.position === 2 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-300/20 text-zinc-300 font-bold border border-zinc-400/30 text-xs">
                              2º
                            </span>
                          ) : row.position === 3 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-800/30 text-amber-500 font-bold border border-amber-700/30 text-xs">
                              3º
                            </span>
                          ) : (
                            <span className="font-mono text-muted-foreground font-semibold">
                              {row.position}º
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {row.jerseyNumber != null && (
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                                #{row.jerseyNumber}
                              </span>
                            )}
                            <span className="font-semibold text-foreground">{row.athleteName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground font-medium">
                          {row.teamName}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 font-bold font-mono text-amber-400 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                            <Trophy className="w-3 h-3" />
                            {row.mvpCount} {row.mvpCount === 1 ? 'prêmio' : 'prêmios'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {row.matchNumbers.map((mNum) => (
                              <span
                                key={mNum}
                                className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400"
                              >
                                Jogo #{mNum}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards Mobile */}
              <div className="md:hidden space-y-2.5">
                {filteredLeaderboard.map((row) => (
                  <div
                    key={row.athleteId}
                    className="p-3.5 rounded-xl bg-card border border-border space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-amber-400 font-mono">
                          {row.position}º Lugar
                        </span>
                        {row.jerseyNumber != null && (
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                            #{row.jerseyNumber}
                          </span>
                        )}
                        <span className="font-bold text-sm text-foreground">{row.athleteName}</span>
                      </div>
                      <span className="font-bold font-mono text-xs text-amber-400 flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        {row.mvpCount}x
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                      <span>{row.teamName}</span>
                      <span className="text-[11px] font-mono">
                        {row.matchNumbers.map((n) => `#${n}`).join(', ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 4. Aba: Partidas & Destaques */}
      {activeTab === 'matches' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-zinc-400" />
              Confrontos da Competição & Destaques Oficiais
            </h3>
            <span className="text-xs text-muted-foreground">
              {filteredMatches.length} {filteredMatches.length === 1 ? 'partida listada' : 'partidas listadas'}
            </span>
          </div>

          {filteredMatches.length === 0 ? (
            <div className="p-8 rounded-xl bg-card border border-border text-center space-y-2">
              <Calendar className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-sm font-semibold text-foreground">Nenhuma partida encontrada</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Não há partidas correspondentes aos filtros de equipe ou status de destaque selecionados.
              </p>
            </div>
          ) : (
            <>
              {/* Tabela Desktop */}
              <div className="hidden md:block rounded-xl border border-border overflow-hidden bg-card">
                <table className="w-full text-left text-xs" aria-label="Tabela de Partidas e Destaques">
                  <caption className="sr-only">Relação oficial de confrontos e destaques da partida homologados</caption>
                  <thead className="bg-zinc-900/80 border-b border-border text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    <tr>
                      <th scope="col" className="py-2.5 px-4 w-20">Jogo</th>
                      <th scope="col" className="py-2.5 px-4 w-32">Data / Hora</th>
                      <th scope="col" className="py-2.5 px-4 w-36">Local / Quadra</th>
                      <th scope="col" className="py-2.5 px-4">Confronto</th>
                      <th scope="col" className="py-2.5 px-4 text-center w-24">Placar</th>
                      <th scope="col" className="py-2.5 px-4 w-52">Destaque da Partida (MVP)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredMatches.map((m) => (
                      <tr key={m.matchId} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-foreground">
                          J.{String(m.matchNumber).padStart(2, '0')}
                          {m.phase && <span className="block text-[10px] font-normal text-muted-foreground">{m.phase}</span>}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-semibold text-foreground block">
                            {m.date || 'A definir'}
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground block">
                            {m.time ? `${m.time}h` : '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          <span className="block truncate font-medium text-foreground" title={m.venue}>
                            {m.venue}
                          </span>
                          <span className="block text-[10px] truncate">{m.court || 'Quadra Principal'}</span>
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">{m.teamAName}</span>
                            <span className="text-muted-foreground text-[10px]">vs</span>
                            <span className="font-semibold">{m.teamBName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-xs">
                          {m.setsScoreLabel !== '—' ? (
                            <span className="px-2 py-0.5 rounded bg-zinc-800 text-foreground border border-zinc-700">
                              {m.setsScoreLabel}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[11px] font-normal">
                              {m.statusLabel}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {m.hasHighlight && m.athleteName ? (
                            m.isUnresolvedAthlete ? (
                              <div className="flex items-center gap-1.5 text-red-400 text-xs">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span className="font-medium">Atleta não localizado</span>
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  {m.jerseyNumber != null && (
                                    <span className="font-mono text-[10px] font-bold px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                      #{m.jerseyNumber}
                                    </span>
                                  )}
                                  <span className="font-bold text-foreground text-xs">{m.athleteName}</span>
                                </div>
                                <span className="text-[10px] text-muted-foreground block pl-5">
                                  {m.athleteTeamName}
                                </span>
                              </div>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/70 italic">
                              <XCircle className="w-3 h-3 text-zinc-600" />
                              Sem destaque registrado
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards Mobile */}
              <div className="md:hidden space-y-2.5">
                {filteredMatches.map((m) => (
                  <div
                    key={m.matchId}
                    className="p-3.5 rounded-xl bg-card border border-border space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-primary">
                        Jogo #{m.matchNumber} {m.phase ? `· ${m.phase}` : ''}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {m.date} {m.time ? `· ${m.time}h` : ''}
                      </span>
                    </div>

                    <div className="text-sm font-semibold flex items-center justify-between gap-2">
                      <span className="truncate">{m.teamAName}</span>
                      <span className="font-mono font-bold text-xs shrink-0 px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700">
                        {m.setsScoreLabel}
                      </span>
                      <span className="truncate text-right">{m.teamBName}</span>
                    </div>

                    <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate max-w-[180px]">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {m.venue}
                      </span>

                      {m.hasHighlight && m.athleteName ? (
                        m.isUnresolvedAthlete ? (
                          <span className="text-red-400 text-[11px] flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Atleta não localizado
                          </span>
                        ) : (
                          <span className="text-amber-400 font-bold text-xs flex items-center gap-1">
                            <Trophy className="w-3.5 h-3.5 text-amber-400" />
                            {m.jerseyNumber != null ? `#${m.jerseyNumber} ` : ''}{m.athleteName}
                          </span>
                        )
                      ) : (
                        <span className="text-zinc-500 text-[11px] italic">
                          Sem destaque
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
