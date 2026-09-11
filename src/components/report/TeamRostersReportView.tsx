import type { RosterReportTeam } from '@/lib/pdf/reportsPdf';
import { Shield, UserCheck } from 'lucide-react';

interface TeamRostersReportViewProps {
  teams: RosterReportTeam[];
}

export function TeamRostersReportView({ teams }: TeamRostersReportViewProps) {
  if (teams.length === 0) {
    return (
      <div className="p-8 text-center rounded-xl bg-card border border-border text-muted-foreground text-xs">
        Nenhuma delegação ou equipe vinculada encontrada para os filtros selecionados.
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="team-rosters-report-view">
      {teams.map((team) => (
        <div
          key={team.name}
          className="report-team-card rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4"
        >
          {/* Cabeçalho da Equipe */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div className="flex items-center gap-3">
              {team.logoUrl ? (
                <img
                  src={team.logoUrl}
                  alt={team.name}
                  className="w-10 h-10 rounded-lg object-contain bg-zinc-950 p-1 border border-zinc-800 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0">
                  {team.shortName || team.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm sm:text-base font-bold text-foreground">{team.name}</h4>
                  {team.shortName && (
                    <span className="text-xs text-muted-foreground font-mono">
                      [{team.shortName}]
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {team.city ? `${team.city}${team.state ? ` - ${team.state}` : ''}` : 'Cidade não informada'}
                  {team.modality ? ` · ${team.modality}` : ''}
                </p>
              </div>
            </div>

            {/* Comissão Técnica */}
            <div className="text-left sm:text-right text-xs text-muted-foreground space-y-0.5">
              {team.coach && (
                <p>
                  <span className="font-semibold text-foreground">Técnico:</span> {team.coach}
                </p>
              )}
              {team.medicalStaff && (
                <p>
                  <span className="font-semibold text-foreground">Staff:</span> {team.medicalStaff}
                </p>
              )}
            </div>
          </div>

          {/* Tabela Nominal de Atletas */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs report-table">
              <thead>
                <tr className="border-b border-border bg-zinc-900/80 text-muted-foreground font-semibold text-left">
                  <th className="py-2 px-3 w-14 text-center font-mono">Nº</th>
                  <th className="py-2 px-3">Nome Completo do Atleta</th>
                  <th className="py-2 px-3 w-36">Posição</th>
                  <th className="py-2 px-3 w-36 font-mono">Documento</th>
                  <th className="py-2 px-3 w-28 text-center">Função</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {team.athletes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-muted-foreground text-xs italic">
                      Nenhum atleta inscrito no elenco desta equipe até o momento.
                    </td>
                  </tr>
                ) : (
                  team.athletes.map((ath, idx) => (
                    <tr key={`${ath.name}-${idx}`} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="py-1.5 px-3 text-center font-mono font-bold text-foreground">
                        {ath.jerseyNumber ?? '—'}
                      </td>
                      <td className="py-1.5 px-3 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <span>{ath.name}</span>
                          {ath.isCaptain && (
                            <span
                              className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[9px] font-bold font-mono"
                              title="Capitão da Equipe"
                            >
                              CAP
                            </span>
                          )}
                          {ath.isLibero && (
                            <span
                              className="px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[9px] font-bold font-mono"
                              title="Líbero Oficial"
                            >
                              LÍB
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-1.5 px-3 text-muted-foreground capitalize">
                        {ath.position || 'Geral'}
                      </td>
                      <td className="py-1.5 px-3 font-mono text-muted-foreground">
                        {ath.documentNumber || '—'}
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        {ath.isCaptain ? (
                          <span className="text-[10px] font-semibold text-amber-400">Capitão</span>
                        ) : ath.isLibero ? (
                          <span className="text-[10px] font-semibold text-blue-400">Líbero</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Atleta</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="text-[11px] text-muted-foreground text-right font-mono">
            Total de Atletas Inscritos: {team.athletes.length}
          </div>
        </div>
      ))}
    </div>
  );
}
