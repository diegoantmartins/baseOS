import { useState, useMemo } from 'react';
import type { RefereesScheduleRow } from '@/lib/pdf/types';
import {
  UserCheck,
  Clock,
  MapPin,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RefereesScheduleReportViewProps {
  rows: RefereesScheduleRow[];
}

type FilterStatus = 'all' | 'complete' | 'partial' | 'pending';

export function RefereesScheduleReportView({ rows }: RefereesScheduleReportViewProps) {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');

  // Métricas operacionais da escala
  const metrics = useMemo(() => {
    let complete = 0;
    let partial = 0;
    let pending = 0;

    for (const r of rows) {
      const hasFirst = r.firstReferee && r.firstReferee !== '—';
      const hasSecond = r.secondReferee && r.secondReferee !== '—';
      const hasScorer = r.scorer && r.scorer !== '—';

      if (hasFirst && hasSecond && hasScorer) {
        complete++;
      } else if (hasFirst || hasSecond || hasScorer || (r.lineJudges && r.lineJudges.length > 0)) {
        partial++;
      } else {
        pending++;
      }
    }

    return {
      total: rows.length,
      complete,
      partial,
      pending,
    };
  }, [rows]);

  // Filtro interativo local
  const filteredRows = useMemo(() => {
    if (statusFilter === 'all') return rows;

    return rows.filter((r) => {
      const hasFirst = r.firstReferee && r.firstReferee !== '—';
      const hasSecond = r.secondReferee && r.secondReferee !== '—';
      const hasScorer = r.scorer && r.scorer !== '—';
      const isComplete = hasFirst && hasSecond && hasScorer;
      const isPartial = !isComplete && (hasFirst || hasSecond || hasScorer || (r.lineJudges && r.lineJudges.length > 0));
      const isPending = !hasFirst && !hasSecond && !hasScorer && (!r.lineJudges || r.lineJudges.length === 0);

      if (statusFilter === 'complete') return isComplete;
      if (statusFilter === 'partial') return isPartial;
      if (statusFilter === 'pending') return isPending;
      return true;
    });
  }, [rows, statusFilter]);

  if (rows.length === 0) {
    return (
      <div
        className="p-8 text-center rounded-xl bg-card border border-border text-muted-foreground text-xs space-y-2"
        data-testid="referees-schedule-empty"
      >
        <ShieldAlert className="w-8 h-8 text-zinc-600 mx-auto" />
        <p className="font-semibold text-zinc-300">Nenhuma partida encontrada para esta competição.</p>
        <p className="text-[11px] text-zinc-500">
          Cadastre partidas na tabela de jogos para gerenciar a escala de arbitragem e oficiais de mesa.
        </p>
      </div>
    );
  }

  return (
    <div
      className="space-y-4"
      data-testid="referees-schedule-view"
      role="region"
      aria-label="Escala Oficial de Arbitragem"
    >
      {/* Resumo Operacional da Escala */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`p-3 rounded-xl border text-left transition-all ${
            statusFilter === 'all'
              ? 'bg-zinc-900 border-amber-500/60 ring-1 ring-amber-500/20'
              : 'bg-card border-border hover:bg-zinc-900/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              Total de Partidas
            </span>
            <Users className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <p className="text-xl font-mono font-bold text-foreground mt-1 tabular-nums">
            {metrics.total}
          </p>
          <span className="text-[10px] text-muted-foreground">partidas no torneio</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('complete')}
          className={`p-3 rounded-xl border text-left transition-all ${
            statusFilter === 'complete'
              ? 'bg-zinc-900 border-emerald-500/60 ring-1 ring-emerald-500/20'
              : 'bg-card border-border hover:bg-zinc-900/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
              Escala Completa
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-xl font-mono font-bold text-emerald-400 mt-1 tabular-nums">
            {metrics.complete}
          </p>
          <span className="text-[10px] text-muted-foreground">1º, 2º árbitro e mesa</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('partial')}
          className={`p-3 rounded-xl border text-left transition-all ${
            statusFilter === 'partial'
              ? 'bg-zinc-900 border-amber-500/60 ring-1 ring-amber-500/20'
              : 'bg-card border-border hover:bg-zinc-900/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
              Designação Parcial
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-xl font-mono font-bold text-amber-400 mt-1 tabular-nums">
            {metrics.partial}
          </p>
          <span className="text-[10px] text-muted-foreground">oficiais pendentes</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('pending')}
          className={`p-3 rounded-xl border text-left transition-all ${
            statusFilter === 'pending'
              ? 'bg-zinc-900 border-zinc-500/60 ring-1 ring-zinc-500/20'
              : 'bg-card border-border hover:bg-zinc-900/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
              Sem Escala
            </span>
            <HelpCircle className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <p className="text-xl font-mono font-bold text-zinc-400 mt-1 tabular-nums">
            {metrics.pending}
          </p>
          <span className="text-[10px] text-muted-foreground">aguardando escala</span>
        </button>
      </div>

      {/* Visualização Desktop & Tablet (Tabela) */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-xs report-table">
          <thead>
            <tr className="border-b border-border bg-zinc-900/80 text-muted-foreground font-semibold text-left">
              <th scope="col" className="py-2.5 px-3 w-16 text-center font-mono">
                Jogo
              </th>
              <th scope="col" className="py-2.5 px-3 w-36">
                Data / Horário
              </th>
              <th scope="col" className="py-2.5 px-3 w-40">
                Quadra / Local
              </th>
              <th scope="col" className="py-2.5 px-3">
                Confronto
              </th>
              <th scope="col" className="py-2.5 px-3 w-40">
                1º Árbitro
              </th>
              <th scope="col" className="py-2.5 px-3 w-40">
                2º Árbitro
              </th>
              <th scope="col" className="py-2.5 px-3 w-48">
                Apontador / Mesa
              </th>
              <th scope="col" className="py-2.5 px-3 w-28 text-center">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredRows.map((row) => {
              const hasFirst = row.firstReferee && row.firstReferee !== '—';
              const hasSecond = row.secondReferee && row.secondReferee !== '—';
              const hasScorer = row.scorer && row.scorer !== '—';
              const isComplete = hasFirst && hasSecond && hasScorer;
              const isPending = !hasFirst && !hasSecond && !hasScorer && (!row.lineJudges || row.lineJudges.length === 0);

              return (
                <tr
                  key={row.matchNumber}
                  className="hover:bg-zinc-900/40 transition-colors"
                  data-testid={`referee-row-${row.matchNumber}`}
                >
                  {/* Número do Jogo & Rodada */}
                  <td className="py-2.5 px-3 text-center">
                    <span className="font-mono font-bold text-foreground block">
                      J.{String(row.matchNumber).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-muted-foreground block font-mono">
                      Rod. {row.round}
                    </span>
                  </td>

                  {/* Data & Horário */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5 font-mono text-foreground font-semibold">
                      <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span>{row.date || '—'}</span>
                      {row.time && <span className="text-zinc-400">· {row.time}</span>}
                    </div>
                    {row.phase && (
                      <span className="text-[10px] text-muted-foreground block truncate mt-0.5">
                        {row.groupName ? `Grupo ${row.groupName} · ` : ''}{row.phase}
                      </span>
                    )}
                  </td>

                  {/* Quadra / Local */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1 font-semibold text-foreground truncate">
                      <MapPin className="w-3 h-3 text-amber-500/80 shrink-0" />
                      <span className="truncate">{row.court || 'Quadra Principal'}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      {row.venue || '—'}
                    </span>
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
                        <span className="font-semibold text-foreground truncate max-w-[110px]" title={row.teamAName}>
                          {row.teamAShort || row.teamAName}
                        </span>
                      </div>

                      <span className="text-muted-foreground text-[10px] font-mono shrink-0">vs</span>

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
                        <span className="font-semibold text-foreground truncate max-w-[110px]" title={row.teamBName}>
                          {row.teamBShort || row.teamBName}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* 1º Árbitro */}
                  <td className="py-2.5 px-3">
                    {hasFirst ? (
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="font-medium text-foreground truncate max-w-[130px]">
                          {row.firstReferee}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic text-[11px]">— A definir</span>
                    )}
                  </td>

                  {/* 2º Árbitro */}
                  <td className="py-2.5 px-3">
                    {hasSecond ? (
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                        <span className="font-medium text-foreground truncate max-w-[130px]">
                          {row.secondReferee}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic text-[11px]">— A definir</span>
                    )}
                  </td>

                  {/* Apontador / Mesa */}
                  <td className="py-2.5 px-3">
                    {hasScorer ? (
                      <div>
                        <span className="font-medium text-foreground block truncate max-w-[150px]">
                          {row.scorer}
                        </span>
                        {row.assistantScorer && row.assistantScorer !== '—' && (
                          <span className="text-[10px] text-muted-foreground block truncate">
                            Assist: {row.assistantScorer}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic text-[11px]">— A definir</span>
                    )}
                  </td>

                  {/* Status da Escala */}
                  <td className="py-2.5 px-3 text-center">
                    {isComplete ? (
                      <Badge
                        variant="outline"
                        className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-normal"
                      >
                        Completa
                      </Badge>
                    ) : isPending ? (
                      <Badge
                        variant="outline"
                        className="bg-zinc-800/80 text-zinc-400 border-zinc-700/60 text-[10px] font-normal"
                      >
                        Pendente
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] font-normal"
                      >
                        Parcial
                      </Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Visualização Mobile (Cards Operacionais) */}
      <div className="md:hidden space-y-3">
        {filteredRows.map((row) => {
          const hasFirst = row.firstReferee && row.firstReferee !== '—';
          const hasSecond = row.secondReferee && row.secondReferee !== '—';
          const hasScorer = row.scorer && row.scorer !== '—';
          const isComplete = hasFirst && hasSecond && hasScorer;
          const isPending = !hasFirst && !hasSecond && !hasScorer && (!row.lineJudges || row.lineJudges.length === 0);

          return (
            <div
              key={row.matchNumber}
              className="p-3.5 rounded-xl bg-card border border-border space-y-3 text-xs"
              data-testid={`referee-card-${row.matchNumber}`}
            >
              {/* Header do Card: Jogo + Status */}
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono font-bold text-foreground">
                    J.{String(row.matchNumber).padStart(2, '0')}
                  </span>
                  <span className="text-muted-foreground font-mono">Rodada {row.round}</span>
                </div>
                {isComplete ? (
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]"
                  >
                    Completa
                  </Badge>
                ) : isPending ? (
                  <Badge
                    variant="outline"
                    className="bg-zinc-800/80 text-zinc-400 border-zinc-700/60 text-[10px]"
                  >
                    Pendente
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]"
                  >
                    Parcial
                  </Badge>
                )}
              </div>

              {/* Data, Horário e Local */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5 font-mono text-foreground">
                  <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span>{row.date || '—'} {row.time ? `· ${row.time}` : ''}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3 h-3 text-amber-500/80 shrink-0" />
                  <span className="truncate">{row.court || 'Quadra Principal'}</span>
                </div>
              </div>

              {/* Confronto */}
              <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/60 flex items-center justify-between font-semibold">
                <span className="truncate max-w-[45%] text-foreground">{row.teamAName}</span>
                <span className="text-[10px] font-mono text-muted-foreground px-1">vs</span>
                <span className="truncate max-w-[45%] text-foreground text-right">{row.teamBName}</span>
              </div>

              {/* Corpo de Arbitragem Designada */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                  Oficiais Designados
                </span>
                <div className="grid grid-cols-1 gap-1">
                  <div className="flex items-center justify-between py-1 px-2 rounded bg-zinc-900/40 border border-zinc-800/40">
                    <span className="text-[11px] text-muted-foreground">1º Árbitro:</span>
                    <span className={`font-medium ${hasFirst ? 'text-amber-400' : 'text-zinc-500 italic'}`}>
                      {hasFirst ? row.firstReferee : 'A definir'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 px-2 rounded bg-zinc-900/40 border border-zinc-800/40">
                    <span className="text-[11px] text-muted-foreground">2º Árbitro:</span>
                    <span className={`font-medium ${hasSecond ? 'text-zinc-200' : 'text-zinc-500 italic'}`}>
                      {hasSecond ? row.secondReferee : 'A definir'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 px-2 rounded bg-zinc-900/40 border border-zinc-800/40">
                    <span className="text-[11px] text-muted-foreground">Apontador:</span>
                    <span className={`font-medium ${hasScorer ? 'text-zinc-200' : 'text-zinc-500 italic'}`}>
                      {hasScorer ? row.scorer : 'A definir'}
                    </span>
                  </div>
                  {row.assistantScorer && row.assistantScorer !== '—' && (
                    <div className="flex items-center justify-between py-1 px-2 rounded bg-zinc-900/40 border border-zinc-800/40">
                      <span className="text-[11px] text-muted-foreground">Apontador Assistente:</span>
                      <span className="font-medium text-zinc-300">{row.assistantScorer}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
