import { ClipboardList, Trophy, Users, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type ReportType = 'boletim' | 'standings' | 'roster' | 'podium';

interface ReportSelectorProps {
  activeReport: ReportType;
  onSelectReport: (report: ReportType) => void;
  matchCount?: number;
  teamCount?: number;
}

export function ReportSelector({
  activeReport,
  onSelectReport,
  matchCount,
  teamCount,
}: ReportSelectorProps) {
  const categories = [
    {
      name: 'Competição & Confrontos',
      items: [
        {
          id: 'boletim' as ReportType,
          label: 'Boletim Geral de Jogos',
          description: 'Confrontos, horários e resultados',
          icon: ClipboardList,
          count: matchCount,
        },
        {
          id: 'standings' as ReportType,
          label: 'Classificação por Grupos',
          description: 'Tabelas oficiais CBV/FIVB',
          icon: Trophy,
        },
      ],
    },
    {
      name: 'Equipes & Delegações',
      items: [
        {
          id: 'roster' as ReportType,
          label: 'Relação Nominal das Equipes',
          description: 'Elencos, comissão e fichas',
          icon: Users,
          count: teamCount,
        },
      ],
    },
    {
      name: 'Documentos Oficiais & Premiação',
      items: [
        {
          id: 'podium' as ReportType,
          label: 'Quadro de Honra & Pódio Oficial',
          description: 'Pódio homologado e premiação',
          icon: Award,
        },
      ],
    },
  ];

  return (
    <div className="no-print space-y-3" role="region" aria-label="Seletor de Relatórios">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {categories.map((cat) => (
          <div key={cat.name} className="p-2.5 rounded-xl bg-card border border-border space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground px-1 block">
              {cat.name}
            </span>
            <div className="grid grid-cols-1 gap-1.5" role="tablist">
              {cat.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeReport === item.id;
                return (
                  <Button
                    key={item.id}
                    variant="ghost"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => onSelectReport(item.id)}
                    className={`w-full justify-start h-auto py-2 px-2.5 rounded-lg border text-left transition-all ${
                      isActive
                        ? 'bg-zinc-900 border-amber-500/60 shadow-xs ring-1 ring-amber-500/20 text-foreground font-semibold'
                        : 'bg-zinc-900/40 border-border hover:bg-zinc-800/60 hover:border-zinc-700 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 w-full">
                      <div
                        className={`p-1.5 rounded-md shrink-0 ${
                          isActive
                            ? 'bg-amber-500 text-zinc-950 font-bold'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs truncate block">{item.label}</span>
                          {item.count !== undefined && (
                            <span className="text-[10px] font-mono tabular-nums text-muted-foreground shrink-0">
                              {item.count}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-normal truncate block">
                          {item.description}
                        </span>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
