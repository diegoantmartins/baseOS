import type { PodiumReportData } from '@/lib/pdf/reportsPdf';
import { Award, Trophy, Medal } from 'lucide-react';

interface PodiumReportViewProps {
  data: PodiumReportData;
}

export function PodiumReportView({ data }: PodiumReportViewProps) {
  const hasPodium = Boolean(data.champion || data.runnerUp || data.third || data.fourth);

  if (!hasPodium) {
    return (
      <div className="p-8 text-center rounded-xl bg-card border border-border space-y-2">
        <Award className="w-8 h-8 text-amber-500/60 mx-auto" />
        <h4 className="text-sm font-bold text-foreground">Quadro de Honra em Andamento</h4>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          O pódio e as premiações oficiais da competição serão apurados e homologados automaticamente
          assim que as partidas de semifinal, final e disputa de 3º lugar forem concluídas.
        </p>
      </div>
    );
  }

  const podiumSlots = [
    {
      place: 1,
      title: 'Campeão Oficial',
      metal: 'Ouro',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      iconColor: 'text-amber-400',
      cardBg: 'bg-amber-500/[0.04] border-amber-500/30',
      team: data.champion,
    },
    {
      place: 2,
      title: 'Vice-Campeão',
      metal: 'Prata',
      badgeColor: 'bg-zinc-300/10 text-zinc-300 border-zinc-400/30',
      iconColor: 'text-zinc-300',
      cardBg: 'bg-zinc-500/[0.03] border-zinc-700/50',
      team: data.runnerUp,
    },
    {
      place: 3,
      title: '3º Colocado',
      metal: 'Bronze',
      badgeColor: 'bg-amber-700/10 text-amber-500 border-amber-700/30',
      iconColor: 'text-amber-600',
      cardBg: 'bg-amber-700/[0.03] border-amber-800/40',
      team: data.third,
    },
    {
      place: 4,
      title: '4º Colocado',
      metal: 'Menção Honrosa',
      badgeColor: 'bg-zinc-800 text-muted-foreground border-zinc-700/50',
      iconColor: 'text-muted-foreground',
      cardBg: 'bg-card border-border',
      team: data.fourth,
    },
  ];

  return (
    <div className="space-y-6" data-testid="podium-report-view">
      {/* Grade do Pódio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {podiumSlots.map((slot) => (
          <div
            key={slot.place}
            className={`p-5 rounded-xl border flex flex-col justify-between space-y-4 ${slot.cardBg}`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border font-mono ${slot.badgeColor}`}
              >
                {slot.metal}
              </span>
              <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
                <Trophy className={`w-5 h-5 ${slot.iconColor}`} />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block font-mono">
                {slot.place}º Lugar · {slot.title}
              </span>
              {slot.team ? (
                <div className="flex items-center gap-3">
                  {slot.team.logoUrl ? (
                    <img
                      src={slot.team.logoUrl}
                      alt={slot.team.name}
                      className="w-10 h-10 rounded-lg object-contain bg-zinc-950 p-1 border border-zinc-800 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0">
                      {(slot.team.shortName || slot.team.name).slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">
                      {slot.team.name}
                    </p>
                    {slot.team.shortName && (
                      <p className="text-xs text-muted-foreground font-mono">
                        {slot.team.shortName}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  A definir nas finais
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-border/40 text-[10px] text-muted-foreground font-mono">
              Premiação homologada CBV/FIVB
            </div>
          </div>
        ))}
      </div>

      {/* Nota Oficial de Encerramento */}
      <div className="p-4 rounded-xl bg-zinc-900/40 border border-border text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground">
          Encerramento Oficial e Premiações:
        </p>
        <p>
          As posições do Quadro de Honra foram apuradas diretamente a partir das súmulas oficiais homologadas
          conforme as regras desportivas do BaseOS.
        </p>
      </div>
    </div>
  );
}
