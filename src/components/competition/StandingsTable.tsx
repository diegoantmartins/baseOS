import { motion } from 'framer-motion';
import { 
  Trophy, 
  Medal, 
  TrendingUp, 
  TrendingDown,
  Minus 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface TeamStanding {
  position: number;
  previousPosition?: number;
  team: {
    id: string;
    name: string;
    shortName: string;
    logoUrl?: string;
  };
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  setsWon: number;
  setsLost: number;
  pointsWon: number;
  pointsLost: number;
  competitionPoints: number;
}

interface StandingsTableProps {
  standings?: TeamStanding[];
  title?: string;
}

const mockStandings: TeamStanding[] = [
  { position: 1, previousPosition: 1, team: { id: '1', name: 'Osasco Voleibol Clube', shortName: 'OSA' }, matchesPlayed: 18, matchesWon: 16, matchesLost: 2, setsWon: 50, setsLost: 12, pointsWon: 1450, pointsLost: 1120, competitionPoints: 47 },
  { position: 2, previousPosition: 3, team: { id: '2', name: 'Minas Tênis Clube', shortName: 'MIN' }, matchesPlayed: 18, matchesWon: 15, matchesLost: 3, setsWon: 48, setsLost: 15, pointsWon: 1420, pointsLost: 1180, competitionPoints: 44 },
  { position: 3, previousPosition: 2, team: { id: '3', name: 'Praia Clube', shortName: 'PRA' }, matchesPlayed: 18, matchesWon: 14, matchesLost: 4, setsWon: 45, setsLost: 18, pointsWon: 1380, pointsLost: 1200, competitionPoints: 41 },
  { position: 4, previousPosition: 4, team: { id: '4', name: 'Sesc RJ Flamengo', shortName: 'SEC' }, matchesPlayed: 18, matchesWon: 13, matchesLost: 5, setsWon: 42, setsLost: 21, pointsWon: 1350, pointsLost: 1220, competitionPoints: 38 },
  { position: 5, previousPosition: 6, team: { id: '5', name: 'Dentil/Praia Clube', shortName: 'DEN' }, matchesPlayed: 18, matchesWon: 11, matchesLost: 7, setsWon: 38, setsLost: 28, pointsWon: 1300, pointsLost: 1280, competitionPoints: 32 },
  { position: 6, previousPosition: 5, team: { id: '6', name: 'Curitiba Vôlei', shortName: 'CUR' }, matchesPlayed: 18, matchesWon: 10, matchesLost: 8, setsWon: 35, setsLost: 30, pointsWon: 1280, pointsLost: 1290, competitionPoints: 29 },
  { position: 7, previousPosition: 7, team: { id: '7', name: 'São Paulo/Barueri', shortName: 'BAR' }, matchesPlayed: 18, matchesWon: 8, matchesLost: 10, setsWon: 30, setsLost: 35, pointsWon: 1220, pointsLost: 1320, competitionPoints: 24 },
  { position: 8, previousPosition: 8, team: { id: '8', name: 'Pinheiros', shortName: 'PIN' }, matchesPlayed: 18, matchesWon: 5, matchesLost: 13, setsWon: 22, setsLost: 42, pointsWon: 1150, pointsLost: 1400, competitionPoints: 16 },
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
                const positionChange = standing.previousPosition 
                  ? standing.previousPosition - standing.position 
                  : 0;
                const setsRatio = (standing.setsWon / standing.setsLost).toFixed(2);
                const pointsRatio = (standing.pointsWon / standing.pointsLost).toFixed(3);

                return (
                  <motion.tr
                    key={standing.team.id}
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
                        {positionChange > 0 && (
                          <TrendingUp className="w-4 h-4 text-success" />
                        )}
                        {positionChange < 0 && (
                          <TrendingDown className="w-4 h-4 text-destructive" />
                        )}
                        {positionChange === 0 && standing.previousPosition && (
                          <Minus className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center font-bold text-sm text-foreground">
                          {standing.team.shortName}
                        </div>
                        <span className="font-medium text-foreground">{standing.team.name}</span>
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
            <span>Classificados para playoffs</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-success" />
            <span>Subiu</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-destructive" />
            <span>Desceu</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
