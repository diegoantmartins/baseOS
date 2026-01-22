import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Team {
  id: string;
  name: string;
  shortName: string;
  seed?: number;
}

interface BracketMatch {
  id: string;
  round: number;
  position: number;
  teamA?: Team;
  teamB?: Team;
  scoreA?: number;
  scoreB?: number;
  winner?: 'A' | 'B';
  scheduled?: string;
}

interface TournamentBracketProps {
  matches?: BracketMatch[][];
  title?: string;
}

const mockBracket: BracketMatch[][] = [
  // Quartas de Final
  [
    { id: '1', round: 1, position: 1, teamA: { id: '1', name: 'Osasco Voleibol', shortName: 'OSA', seed: 1 }, teamB: { id: '8', name: 'Barueri', shortName: 'BAR', seed: 8 }, scoreA: 3, scoreB: 0, winner: 'A' },
    { id: '2', round: 1, position: 2, teamA: { id: '4', name: 'Praia Clube', shortName: 'PRA', seed: 4 }, teamB: { id: '5', name: 'Flamengo', shortName: 'FLA', seed: 5 }, scoreA: 3, scoreB: 2, winner: 'A' },
    { id: '3', round: 1, position: 3, teamA: { id: '3', name: 'Sesc RJ', shortName: 'SEC', seed: 3 }, teamB: { id: '6', name: 'Curitiba', shortName: 'CUR', seed: 6 }, scoreA: 3, scoreB: 1, winner: 'A' },
    { id: '4', round: 1, position: 4, teamA: { id: '2', name: 'Minas TC', shortName: 'MIN', seed: 2 }, teamB: { id: '7', name: 'Pinheiros', shortName: 'PIN', seed: 7 }, scoreA: 3, scoreB: 0, winner: 'A' },
  ],
  // Semifinal
  [
    { id: '5', round: 2, position: 1, teamA: { id: '1', name: 'Osasco Voleibol', shortName: 'OSA', seed: 1 }, teamB: { id: '4', name: 'Praia Clube', shortName: 'PRA', seed: 4 }, scoreA: 3, scoreB: 2, winner: 'A' },
    { id: '6', round: 2, position: 2, teamA: { id: '3', name: 'Sesc RJ', shortName: 'SEC', seed: 3 }, teamB: { id: '2', name: 'Minas TC', shortName: 'MIN', seed: 2 }, scoreA: 1, scoreB: 3, winner: 'B' },
  ],
  // Final
  [
    { id: '7', round: 3, position: 1, teamA: { id: '1', name: 'Osasco Voleibol', shortName: 'OSA', seed: 1 }, teamB: { id: '2', name: 'Minas TC', shortName: 'MIN', seed: 2 } },
  ],
];

export function TournamentBracket({ 
  matches = mockBracket, 
  title = 'Chaveamento' 
}: TournamentBracketProps) {
  const roundNames = ['Quartas de Final', 'Semifinal', 'Final'];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-bold text-foreground">{title}</h2>
      
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-8 min-w-max">
          {matches.map((round, roundIdx) => (
            <div key={roundIdx} className="flex flex-col">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4 text-center">
                {roundNames[roundIdx] || `Rodada ${roundIdx + 1}`}
              </h3>
              
              <div 
                className="flex flex-col justify-around flex-1"
                style={{ gap: `${Math.pow(2, roundIdx + 1) * 16}px` }}
              >
                {round.map((match, matchIdx) => (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: roundIdx * 0.2 + matchIdx * 0.1 }}
                  >
                    <BracketMatchCard match={match} />
                  </motion.div>
                ))}
              </div>
            </div>
          ))}

          {/* Champion Display */}
          {matches[matches.length - 1]?.[0]?.winner && (
            <div className="flex flex-col justify-center">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4 text-center">
                Campeão
              </h3>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 }}
                className="bg-gradient-to-br from-accent to-accent/80 rounded-xl p-6 text-center shadow-glow"
              >
                <div className="text-4xl mb-2">🏆</div>
                <p className="font-display font-bold text-accent-foreground text-lg">
                  {matches[matches.length - 1][0].winner === 'A'
                    ? matches[matches.length - 1][0].teamA?.name
                    : matches[matches.length - 1][0].teamB?.name}
                </p>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BracketMatchCard({ match }: { match: BracketMatch }) {
  const isCompleted = match.winner !== undefined;
  
  return (
    <div className="w-64 bg-card rounded-xl border border-border shadow-md overflow-hidden">
      {/* Team A */}
      <div
        className={cn(
          'flex items-center justify-between p-3 border-b border-border transition-colors',
          isCompleted && match.winner === 'A' && 'bg-success/10',
          isCompleted && match.winner === 'B' && 'opacity-60'
        )}
      >
        <div className="flex items-center gap-2">
          {match.teamA?.seed && (
            <span className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
              {match.teamA.seed}
            </span>
          )}
          <span className={cn(
            'font-medium',
            isCompleted && match.winner === 'A' && 'text-success font-bold'
          )}>
            {match.teamA?.name || 'A definir'}
          </span>
        </div>
        {match.scoreA !== undefined && (
          <span className={cn(
            'font-display font-bold text-lg',
            isCompleted && match.winner === 'A' && 'text-success'
          )}>
            {match.scoreA}
          </span>
        )}
      </div>

      {/* Team B */}
      <div
        className={cn(
          'flex items-center justify-between p-3 transition-colors',
          isCompleted && match.winner === 'B' && 'bg-success/10',
          isCompleted && match.winner === 'A' && 'opacity-60'
        )}
      >
        <div className="flex items-center gap-2">
          {match.teamB?.seed && (
            <span className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
              {match.teamB.seed}
            </span>
          )}
          <span className={cn(
            'font-medium',
            isCompleted && match.winner === 'B' && 'text-success font-bold'
          )}>
            {match.teamB?.name || 'A definir'}
          </span>
        </div>
        {match.scoreB !== undefined && (
          <span className={cn(
            'font-display font-bold text-lg',
            isCompleted && match.winner === 'B' && 'text-success'
          )}>
            {match.scoreB}
          </span>
        )}
      </div>
    </div>
  );
}
