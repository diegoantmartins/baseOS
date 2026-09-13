import { useState, useMemo } from 'react';
import type { DailyScheduleRow } from '@/lib/pdf/types';
import {
  Calendar,
  Clock,
  MapPin,
  CalendarDays,
  Building2,
  AlertTriangle,
  Trophy,
  CheckCircle2,
  Radio,
  HelpCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DailyScheduleReportViewProps {
  rows: DailyScheduleRow[];
  selectedDate?: string;
  onDateChange?: (date: string) => void;
}

export function DailyScheduleReportView({
  rows,
  selectedDate: externalDate,
  onDateChange: externalOnDateChange,
}: DailyScheduleReportViewProps) {
  const [internalDate, setInternalDate] = useState<string>('all');
  const activeDate = externalDate !== undefined ? externalDate : internalDate;
  const setDate = externalOnDateChange || setInternalDate;

  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'live' | 'completed'>('all');

  // Extrai datas únicas disponíveis ordenadas cronologicamente
  const availableDates = useMemo(() => {
    const datesMap = new Map<string, { dateStr: string; label: string; count: number }>();
    for (const r of rows) {
      if (!r.date) continue;
      const existing = datesMap.get(r.date);
      if (existing) {
        existing.count++;
      } else {
        datesMap.set(r.date, { dateStr: r.date, label: r.date, count: 1 });
      }
    }
    return Array.from(datesMap.values()).sort((a, b) => {
      // Ordenação de data no formato DD/MM/YYYY ou YYYY-MM-DD
      const parseD = (s: string) => {
        if (s.includes('/')) {
          const [d, m, y] = s.split('/');
          return new Date(Number(y), Number(m) - 1, Number(d)).getTime();
        }
        return new Date(s).getTime();
      };
      return parseD(a.dateStr) - parseD(b.dateStr);
    });
  }, [rows]);

  // Filtra por data ativa e status
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      // Filtro de data
      if (activeDate !== 'all' && r.date !== activeDate) {
        return false;
      }
      // Filtro de status
      if (statusFilter === 'scheduled' && r.status !== 'scheduled') return false;
      if (statusFilter === 'live' && r.status !== 'in-progress') return false;
      if (statusFilter === 'completed' && r.status !== 'completed' && r.status !== 'homologated') return false;
      return true;
    });
  }, [rows, activeDate, statusFilter]);

  // Métricas operacionais consolidadas
  const metrics = useMemo(() => {
    const uniqueVenues = new Set<string>();
    const uniqueCourts = new Set<string>();
    let conflictsCount = 0;
    let liveCount = 0;
    let completedCount = 0;

    for (const r of filteredRows) {
      if (r.venue && r.venue !== '—') uniqueVenues.add(r.venue);
      if (r.court) uniqueCourts.add(`${r.venue}_${r.court}`);
      if (r.hasConflict) conflictsCount++;
      if (r.status === 'in-progress') liveCount++;
      if (r.status === 'completed' || r.status === 'homologated') completedCount++;
    }

    return {
      total: filteredRows.length,
      venuesCount: uniqueVenues.size,
      courtsCount: uniqueCourts.size,
      conflictsCount,
      liveCount,
      completedCount,
    };
  }, [filteredRows]);

  if (rows.length === 0) {
    return (
      <div
        className="p-8 text-center rounded-xl bg-card border border-border text-muted-foreground text-xs space-y-2"
        data-testid="daily-schedule-empty"
      >
        <CalendarDays className="w-8 h-8 text-zinc-600 mx-auto" />
        <p className="font-semibold text-zinc-300">Nenhuma partida encontrada nesta competição.</p>
        <p className="text-[11px] text-zinc-500">
          Cadastre partidas com data e horário para gerar a programação diária oficial.
        </p>
      </div>
    );
  }

  return (
    <div
      className="space-y-4"
      data-testid="daily-schedule-view"
      role="region"
      aria-label="Programação Diária e Ordem dos Jogos"
    >
      {/* ── Seletor de Datas (Pills / Tabs) ── */}
      {availableDates.length > 1 && (
        <div className="no-print flex items-center gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Seletor de Datas da Programação">
          <button
            type="button"
            role="tab"
            aria-selected={activeDate === 'all'}
            onClick={() => setDate('all')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap transition-all ${
              activeDate === 'all'
                ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold shadow-xs'
                : 'bg-zinc-900/60 border-border text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            Todas as Datas ({rows.length})
          </button>
          {availableDates.map((item) => {
            const isSelected = activeDate === item.dateStr;
            return (
              <button
                key={item.dateStr}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setDate(item.dateStr)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold shadow-xs'
                    : 'bg-zinc-900/60 border-border text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                <Calendar className="w-3 h-3" />
                <span>{item.label}</span>
                <span className={`text-[10px] font-mono px-1 rounded ${isSelected ? 'bg-black/20 text-zinc-950' : 'bg-zinc-800 text-zinc-400'}`}>
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Resumo Operacional da Programação ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
        <div className="p-3 rounded-xl bg-card border border-border">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase font-bold tracking-wider">
              {activeDate === 'all' ? 'Total Programado' : 'Jogos do Dia'}
            </span>
            <CalendarDays className="w-3.5 h-3.5 text-amber-500/80" />
          </div>
          <p className="text-xl font-mono font-bold text-foreground mt-1 tabular-nums">
            {metrics.total}
          </p>
          <span className="text-[10px] text-muted-foreground">
            {activeDate === 'all' ? 'em todas as datas' : `data: ${activeDate}`}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-card border border-border">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase font-bold tracking-wider">
              Locais Utilizados
            </span>
            <Building2 className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <p className="text-xl font-mono font-bold text-foreground mt-1 tabular-nums">
            {metrics.venuesCount}
          </p>
          <span className="text-[10px] text-muted-foreground">ginásios e arenas</span>
        </div>

        <div className="p-3 rounded-xl bg-card border border-border">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase font-bold tracking-wider">
              Quadras em Atividade
            </span>
            <MapPin className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <p className="text-xl font-mono font-bold text-foreground mt-1 tabular-nums">
            {metrics.courtsCount}
          </p>
          <span className="text-[10px] text-muted-foreground">espaços simultâneos</span>
        </div>

        <div className="p-3 rounded-xl bg-card border border-border">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase font-bold tracking-wider">
              Jogos Concluídos
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-xl font-mono font-bold text-emerald-400 mt-1 tabular-nums">
            {metrics.completedCount}
          </p>
          <span className="text-[10px] text-muted-foreground">
            {metrics.liveCount > 0 ? `${metrics.liveCount} ao vivo` : 'homologados ou finalizados'}
          </span>
        </div>
      </div>

      {/* ── Aviso de Conflito de Horário (se houver sobreposição confiável) ── */}
      {metrics.conflictsCount > 0 && (
        <div className="no-print p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300 flex items-center gap-2.5 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <span className="font-bold">Atenção:</span> Existem{' '}
            <span className="font-mono font-bold">{metrics.conflictsCount}</span> partida(s) com potencial
            sobreposição de horário no mesmo local e quadra. Verifique a tabela abaixo.
          </div>
        </div>
      )}

      {/* ── Barra de Filtros Operacionais de Status ── */}
      <div className="no-print flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1 bg-zinc-900/60 p-1 rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-amber-500 text-zinc-950 font-bold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            Todos os Status
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('scheduled')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              statusFilter === 'scheduled'
                ? 'bg-amber-500 text-zinc-950 font-bold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            Agendados
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('live')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              statusFilter === 'live'
                ? 'bg-amber-500 text-zinc-950 font-bold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            Ao Vivo
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('completed')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              statusFilter === 'completed'
                ? 'bg-amber-500 text-zinc-950 font-bold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            Concluídos
          </button>
        </div>
      </div>

      {/* ── Tabela Estruturada (Desktop & Tablet md+) ── */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-xs report-table">
          <thead>
            <tr className="border-b border-border bg-zinc-900/80 text-muted-foreground font-semibold text-left">
              <th scope="col" className="py-2.5 px-3 w-16 text-center font-mono">
                Jogo
              </th>
              <th scope="col" className="py-2.5 px-3 w-36">
                Horário & Data
              </th>
              <th scope="col" className="py-2.5 px-3 w-48">
                Local & Quadra
              </th>
              <th scope="col" className="py-2.5 px-3">
                Confronto
              </th>
              <th scope="col" className="py-2.5 px-3 w-36">
                Fase / Chave
              </th>
              <th scope="col" className="py-2.5 px-3 w-28 text-center">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredRows.map((row) => {
              const isCompleted = row.status === 'completed' || row.status === 'homologated';
              const isLive = row.status === 'in-progress';
              const hasScore = row.scoreA !== undefined && row.scoreB !== undefined;

              return (
                <tr
                  key={row.matchId || row.matchNumber}
                  className="hover:bg-zinc-900/40 transition-colors"
                  data-testid={`daily-schedule-row-${row.matchNumber}`}
                >
                  {/* Número do Jogo */}
                  <td className="py-2.5 px-3 text-center">
                    <span className="font-mono font-bold text-foreground block">
                      J.{String(row.matchNumber).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-muted-foreground block font-mono">
                      Rod. {row.round}
                    </span>
                  </td>

                  {/* Horário & Data */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5 font-mono text-foreground font-semibold">
                      <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="text-sm font-bold">{row.time || '—'}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block font-mono mt-0.5">
                      {row.date || '—'}
                    </span>
                  </td>

                  {/* Local & Quadra */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1 font-semibold text-foreground truncate">
                      <MapPin className="w-3 h-3 text-amber-500/80 shrink-0" />
                      <span className="truncate">{row.court || 'Quadra Principal'}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block truncate" title={row.venue}>
                      {row.venue || '—'}
                    </span>
                    {row.hasConflict && (
                      <span className="inline-flex items-center gap-1 text-[9px] text-amber-400 font-bold bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/30 mt-1">
                        <AlertTriangle className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                        Sobreposição
                      </span>
                    )}
                  </td>

                  {/* Confronto */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {row.teamALogo ? (
                          <img
                            src={row.teamALogo}
                            alt={row.teamAName}
                            className="w-4 h-4 rounded object-contain bg-zinc-950 p-0.5 border border-zinc-800 shrink-0"
                          />
                        ) : (
                          <div className="w-4 h-4 rounded bg-zinc-800 flex items-center justify-center text-[8px] font-bold text-zinc-300 shrink-0">
                            {(row.teamAShort || row.teamAName).slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="font-semibold text-foreground truncate max-w-[120px]" title={row.teamAName}>
                          {row.teamAShort || row.teamAName}
                        </span>
                      </div>

                      {hasScore ? (
                        <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono font-bold text-foreground shrink-0 text-xs">
                          {row.scoreA} × {row.scoreB}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[10px] font-mono shrink-0 px-1">vs</span>
                      )}

                      <div className="flex items-center gap-1.5 min-w-0">
                        {row.teamBLogo ? (
                          <img
                            src={row.teamBLogo}
                            alt={row.teamBName}
                            className="w-4 h-4 rounded object-contain bg-zinc-950 p-0.5 border border-zinc-800 shrink-0"
                          />
                        ) : (
                          <div className="w-4 h-4 rounded bg-zinc-800 flex items-center justify-center text-[8px] font-bold text-zinc-300 shrink-0">
                            {(row.teamBShort || row.teamBName).slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="font-semibold text-foreground truncate max-w-[120px]" title={row.teamBName}>
                          {row.teamBShort || row.teamBName}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Fase / Chave */}
                  <td className="py-2.5 px-3">
                    <span className="font-medium text-foreground block truncate">
                      {row.phase || 'Classificatória'}
                    </span>
                    <span className="text-[10px] text-muted-foreground block font-mono">
                      {row.groupName ? `Grupo ${row.groupName}` : 'Chave Única'}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-2.5 px-3 text-center">
                    {isCompleted ? (
                      <Badge
                        variant="outline"
                        className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-normal"
                      >
                        {row.statusLabel}
                      </Badge>
                    ) : isLive ? (
                      <Badge
                        variant="outline"
                        className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] font-normal animate-pulse"
                      >
                        Ao Vivo
                      </Badge>
                    ) : row.status === 'cancelled' ? (
                      <Badge
                        variant="outline"
                        className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px] font-normal"
                      >
                        Cancelado
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-zinc-800/80 text-zinc-400 border-zinc-700/60 text-[10px] font-normal"
                      >
                        {row.statusLabel}
                      </Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Visualização Mobile (Cards Dedicados Verticais < md) ── */}
      <div className="md:hidden space-y-3">
        {filteredRows.map((row) => {
          const isCompleted = row.status === 'completed' || row.status === 'homologated';
          const isLive = row.status === 'in-progress';
          const hasScore = row.scoreA !== undefined && row.scoreB !== undefined;

          return (
            <div
              key={row.matchId || row.matchNumber}
              className="p-3.5 rounded-xl bg-card border border-border space-y-3 text-xs"
              data-testid={`daily-schedule-card-${row.matchNumber}`}
            >
              {/* Header do Card: Horário em Destaque + Jogo e Status */}
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 font-mono font-bold text-sm text-amber-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{row.time || '—'}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-[10px] font-bold text-foreground">
                    J.{String(row.matchNumber).padStart(2, '0')}
                  </span>
                </div>
                {isCompleted ? (
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]"
                  >
                    {row.statusLabel}
                  </Badge>
                ) : isLive ? (
                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] animate-pulse"
                  >
                    Ao Vivo
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-zinc-800/80 text-zinc-400 border-zinc-700/60 text-[10px]"
                  >
                    {row.statusLabel}
                  </Badge>
                )}
              </div>

              {/* Local, Quadra e Data */}
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1 truncate font-semibold text-foreground">
                  <MapPin className="w-3 h-3 text-amber-500/80 shrink-0" />
                  <span className="truncate">{row.court || 'Quadra Principal'}</span>
                  <span className="text-zinc-500 font-normal">({row.venue || '—'})</span>
                </div>
                <span className="font-mono text-zinc-400 shrink-0">{row.date}</span>
              </div>

              {/* Confronto */}
              <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60 flex items-center justify-between font-semibold">
                <span className="truncate max-w-[42%] text-foreground">{row.teamAName}</span>
                {hasScore ? (
                  <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 font-mono text-xs font-bold text-foreground">
                    {row.scoreA} × {row.scoreB}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-muted-foreground px-1">vs</span>
                )}
                <span className="truncate max-w-[42%] text-foreground text-right">{row.teamBName}</span>
              </div>

              {/* Fase / Rodada */}
              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                <span>{row.phase || 'Classificatória'}</span>
                <span>{row.groupName ? `Grupo ${row.groupName}` : `Rodada ${row.round}`}</span>
              </div>

              {row.hasConflict && (
                <div className="p-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>Atenção: potencial sobreposição de horário nesta quadra.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
