/**
 * StandingsTable — Tabela Oficial de Classificação por Grupo
 *
 * Componente modular utilizado tanto na StandingsPage quanto em detalhes da competição.
 * - Utiliza DataTable universal com Enterprise Dark (Zinc-950/900, Âmbar-500)
 * - Tipografia tabular mono para números, sets e pontos
 * - Destaque sutil para top-3 (1º âmbar, 2º prata/zinc, 3º bronze)
 * - Identificação clara de zona de classificação/avanço
 * - Indicadores visuais para Set Average (SV/SP) e Pontos Average (PM/PS)
 */

import React from 'react';
import { Trophy, Award } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/badge';
import type { TeamStandingResult } from '@/services/standingsService';
import { cn } from '@/lib/utils';

export interface StandingsTableProps {
  standings: TeamStandingResult[];
  title?: string;
  advancingPerGroup?: number;
  logoUrlById?: Record<string, string>;
  isProvisional?: boolean;
}

export function StandingsTable({
  standings,
  title = 'Classificação Oficial',
  advancingPerGroup = 2,
  logoUrlById = {},
  isProvisional = false,
}: StandingsTableProps) {
  const columns: DataTableColumn<TeamStandingResult>[] = [
    {
      id: 'position',
      header: 'Pos',
      isNumeric: true,
      cell: ({ row }) => {
        const pos = row.position;
        const isAdvancing = pos <= advancingPerGroup;

        return (
          <div className="flex items-center gap-1.5 font-mono tabular-nums">
            <span
              className={cn(
                'w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs shrink-0',
                pos === 1 && 'bg-amber-500/20 text-amber-400 border border-amber-500/40',
                pos === 2 && 'bg-zinc-700/40 text-zinc-300 border border-zinc-600/40',
                pos === 3 && 'bg-amber-800/20 text-amber-500/90 border border-amber-700/30',
                pos > 3 && isAdvancing && 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
                pos > 3 && !isAdvancing && 'bg-zinc-900 text-zinc-500 border border-zinc-800',
              )}
            >
              {pos}º
            </span>
          </div>
        );
      },
    },
    {
      id: 'team',
      header: 'Equipe',
      cell: ({ row }) => {
        const logo = logoUrlById[row.teamId];
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            {logo ? (
              <img
                src={logo}
                alt=""
                className="w-6 h-6 rounded-full object-contain bg-zinc-900 border border-zinc-800 shrink-0"
              />
            ) : (
              <div className="w-6 h-6 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                {row.teamShortName ? row.teamShortName.charAt(0) : 'E'}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-foreground truncate max-w-[140px] sm:max-w-[220px]">
                  {row.teamName}
                </span>
                {row.teamShortName && (
                  <Badge variant="outline" className="text-[9px] py-0 px-1 border-zinc-800 bg-zinc-900 text-zinc-400 font-mono">
                    {row.teamShortName}
                  </Badge>
                )}
              </div>
              {row.tiebreakReason && (
                <p className="text-[10px] text-amber-400/90 truncate font-mono mt-0.5">
                  {row.tiebreakReason}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: 'matchesPlayed',
      header: 'J',
      isNumeric: true,
      align: 'center',
      cell: ({ row }) => (
        <span className="font-mono tabular-nums text-xs text-foreground">{row.matchesPlayed}</span>
      ),
    },
    {
      id: 'matchesWon',
      header: 'V',
      isNumeric: true,
      align: 'center',
      cell: ({ row }) => (
        <span className="font-mono tabular-nums text-xs font-semibold text-emerald-400">
          {row.matchesWon}
        </span>
      ),
    },
    {
      id: 'matchesLost',
      header: 'D',
      isNumeric: true,
      align: 'center',
      cell: ({ row }) => (
        <span className="font-mono tabular-nums text-xs text-rose-400/80">{row.matchesLost}</span>
      ),
    },
    {
      id: 'sets',
      header: 'Sets (P-C)',
      align: 'center',
      cell: ({ row }) => {
        const ratio = row.setsLost === 0 ? (row.setsWon > 0 ? 'MAX' : '0.00') : row.setsRatio.toFixed(2);
        return (
          <div className="text-center font-mono tabular-nums text-xs">
            <span className="text-foreground font-medium">{row.setsWon} - {row.setsLost}</span>
            <span className="text-[10px] text-muted-foreground ml-1">({ratio})</span>
          </div>
        );
      },
    },
    {
      id: 'setsBalance',
      header: 'Saldo Sets',
      isNumeric: true,
      align: 'center',
      cell: ({ row }) => {
        const bal = row.setsBalance ?? (row.setsWon - row.setsLost);
        return (
          <span
            className={cn(
              'font-mono tabular-nums text-xs',
              bal > 0 && 'text-emerald-400 font-semibold',
              bal < 0 && 'text-rose-400',
              bal === 0 && 'text-muted-foreground',
            )}
          >
            {bal > 0 ? `+${bal}` : bal}
          </span>
        );
      },
    },
    {
      id: 'points',
      header: 'Pontos (P-C)',
      align: 'center',
      cell: ({ row }) => {
        const ratio = row.pointsLost === 0 ? (row.pointsWon > 0 ? 'MAX' : '0.000') : row.pointsRatio.toFixed(3);
        return (
          <div className="text-center font-mono tabular-nums text-xs">
            <span className="text-foreground">{row.pointsWon} - {row.pointsLost}</span>
            <span className="text-[10px] text-muted-foreground ml-1">({ratio})</span>
          </div>
        );
      },
    },
    {
      id: 'pointsBalance',
      header: 'Saldo Pts',
      isNumeric: true,
      align: 'center',
      cell: ({ row }) => {
        const bal = row.pointsBalance;
        return (
          <span
            className={cn(
              'font-mono tabular-nums text-xs',
              bal > 0 && 'text-emerald-400 font-semibold',
              bal < 0 && 'text-rose-400',
              bal === 0 && 'text-muted-foreground',
            )}
          >
            {bal > 0 ? `+${bal}` : bal}
          </span>
        );
      },
    },
    {
      id: 'competitionPoints',
      header: 'PTS',
      isNumeric: true,
      align: 'center',
      cell: ({ row }) => (
        <span className="font-mono tabular-nums text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
          {row.competitionPoints}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-2">
      <DataTable
        data={standings}
        columns={columns}
        emptyTitle="Sem dados de classificação"
        emptyDescription="Ainda não há partidas finalizadas com parciais calculadas para este grupo."
      />

      {/* Legenda Informativa */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground pt-1 px-1">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/20 border border-emerald-500/40" />
            <span>Zona de Classificação (Top {advancingPerGroup})</span>
          </div>
          {isProvisional && (
            <div className="flex items-center gap-1 text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>Resultados provisórios pendentes de homologação</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px]">
          <span>Set Avg = Sets Pró ÷ Contra</span>
          <span>·</span>
          <span>Pts Avg = Pontos Pró ÷ Contra</span>
        </div>
      </div>
    </div>
  );
}
