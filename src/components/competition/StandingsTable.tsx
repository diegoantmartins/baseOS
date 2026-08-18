import { motion } from 'framer-motion';
import { 
  Trophy, 
  TrendingUp, 
  TrendingDown,
  Minus 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { TeamStandingResult } from '@/services/standingsService';

interface StandingsTableProps {
  standings?: TeamStandingResult[];
  title?: string;
}

const mockStandings: TeamStandingResult[] = [
  { position: 1, teamId: '1', teamName: 'Osasco Voleibol Clube', teamShortName: 'OSA', matchesPlayed: 18, matchesWon: 16, matchesLost: 2, setsWon: 50, setsLost: 12, setsRatio: 4.17, pointsWon: 1450, pointsLost: 1120, pointsRatio: 1.295, pointsBalance: 330, competitionPoints: 47 },
  { position: 2, teamId: '2', teamName: 'Minas Tênis Clube', teamShortName: 'MIN', matchesPlayed: 18, matchesWon: 15, matchesLost: 3, setsWon: 48, setsLost: 15, setsRatio: 3.2, pointsWon: 1420, pointsLost: 1180, pointsRatio: 1.203, pointsBalance: 240, competitionPoints: 44 },
  { position: 3, teamId: '3', teamName: 'Praia Clube', teamShortName: 'PRA', matchesPlayed: 18, matchesWon: 14, matchesLost: 4, setsWon: 45, setsLost: 18, setsRatio: 2.5, pointsWon: 1380, pointsLost: 1200, pointsRatio: 1.15, pointsBalance: 180, competitionPoints: 41 },
  { position: 4, teamId: '4', teamName: 'Sesc RJ Flamengo', teamShortName: 'SEC', matchesPlayed: 18, matchesWon: 13, matchesLost: 5, setsWon: 42, setsLost: 21, setsRatio: 2.0, pointsWon: 1350, pointsLost: 1220, pointsRatio: 1.107, pointsBalance: 130, competitionPoints: 38 },
  { position: 5, teamId: '5', teamName: 'Dentil/Praia Clube', teamShortName: 'DEN', matchesPlayed: 18, matchesWon: 11, matchesLost: 7, setsWon: 38, setsLost: 28, setsRatio: 1.357, pointsWon: 1300, pointsLost: 1280, pointsRatio: 1.016, pointsBalance: 20, competitionPoints: 32 },
  { position: 6, teamId: '6', teamName: 'Curitiba Vôlei', teamShortName: 'CUR', matchesPlayed: 18, matchesWon: 10, matchesLost: 8, setsWon: 35, setsLost: 30, setsRatio: 1.167, pointsWon: 1280, pointsLost: 1290, pointsRatio: 0.992, pointsBalance: -10, competitionPoints: 29 },
  { position: 7, teamId: '7', teamName: 'São Paulo/Barueri', teamShortName: 'BAR', matchesPlayed: 18, matchesWon: 8, matchesLost: 10, setsWon: 30, setsLost: 35, setsRatio: 0.857, pointsWon: 1220, pointsLost: 1320, pointsRatio: 0.924, pointsBalance: -100, competitionPoints: 24 },
  { position: 8, teamId: '8', teamName: 'Pinheiros', teamShortName: 'PIN', matchesPlayed: 18, matchesWon: 5, matchesLost: 13, setsWon: 22, setsLost: 42, setsRatio: 0.524, pointsWon: 1150, pointsLost: 1400, pointsRatio: 0.821, pointsBalance: -250, competitionPoints: 16 },
];

export function StandingsTable({ 
  standings = mockStandings, 
  title = 'Classificação' 
}: StandingsTableProps) {
  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="text-xl font-display flex items-center gap-2">
          <Trophy className="w-5 h-5 text-accent" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground w-12">#</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Equipe</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">J</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">V</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">D</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Sets</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Pontos</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Pts</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((standing, idx) => {
                const setsRatio = (standing.setsWon / standing.setsLost).toFixed(2);
                const pointsRatio = (standing.pointsWon / standing.pointsLost).toFixed(3);

                return (
                  <motion.tr
                    key={standing.teamId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn(
                      'border-b border-border/50 hover:bg-muted/50 transition-colors',
                      standing.position <= 4 && 'bg-success/5'
                    )}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold',
                          standing.position === 1 && 'bg-warning text-warning-foreground',
                          standing.position === 2 && 'bg-muted-foreground/60 text-background',
                          standing.position === 3 && 'bg-beach text-beach-foreground',
                          standing.position > 3 && 'bg-muted text-foreground'
                        )}>
                          {standing.position}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center font-bold text-sm text-foreground">
                          {standing.teamShortName}
                        </div>
                        <span className="font-medium text-foreground">{standing.teamName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center text-muted-foreground">{standing.matchesPlayed}</td>
                    <td className="py-4 px-4 text-center font-semibold text-success">{standing.matchesWon}</td>
                    <td className="py-4 px-4 text-center text-destructive">{standing.matchesLost}</td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-foreground">{standing.setsWon}-{standing.setsLost}</span>
                      <span className="text-xs text-muted-foreground ml-1">({setsRatio})</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-foreground">{standing.pointsWon}-{standing.pointsLost}</span>
                      <span className="text-xs text-muted-foreground ml-1">({pointsRatio})</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="font-display font-bold text-lg text-accent">
                        {standing.competitionPoints}
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-border flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-success/20 border border-success" />
            <span>Zona de classificação</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs">Set Avg = SV/SP</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs">Pts Avg = PM/PS</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
