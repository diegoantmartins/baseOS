import React from 'react';
import { Badge } from '@/components/ui/badge';
import { SectionCard } from '@/components/ui/Section';
import type { CompetitionAthlete } from '@/types/registration';

export interface CompetitionAthletesTabProps {
  selectedAthletes: CompetitionAthlete[];
}

export function CompetitionAthletesTab({
  selectedAthletes,
}: CompetitionAthletesTabProps) {
  return (
    <SectionCard
      title={`Atletas Confirmados (${selectedAthletes.length})`}
      description="Relação de atletas inscritos por equipe para esta competição."
      divided
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {selectedAthletes.map((ath) => (
          <div
            key={ath.id}
            className="p-3 rounded-lg border border-border bg-zinc-900/40 flex items-center justify-between text-xs"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground truncate">{ath.name}</span>
                {ath.jerseyNumber && (
                  <span className="px-1.5 py-0.2 rounded bg-primary/15 text-primary font-mono font-bold text-[10px]">
                    #{ath.jerseyNumber}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground capitalize mt-0.5">{ath.position || 'Geral'}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {ath.isCaptain && <Badge variant="secondary" className="text-[9px]">CAP</Badge>}
              {ath.isLibero && <Badge variant="outline" className="text-[9px]">LIB</Badge>}
            </div>
          </div>
        ))}
        {selectedAthletes.length === 0 && (
          <p className="text-xs text-muted-foreground col-span-3 py-6 text-center">
            Nenhum atleta cadastrado nos elencos desta competição ainda.
          </p>
        )}
      </div>
    </SectionCard>
  );
}
