import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Minus, 
  RotateCcw, 
  Clock, 
  Shuffle, 
  FileText,
  AlertTriangle,
  Check,
  Volleyball,
  Waves,
  ChevronRight,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TeamData {
  name: string;
  shortName: string;
  score: number;
  sets: number;
  timeouts: number;
  color: 'teamA' | 'teamB';
}

interface SetScore {
  setNumber: number;
  scoreA: number;
  scoreB: number;
  winner?: 'A' | 'B';
}

interface MatchSheetInterfaceProps {
  modality?: 'indoor' | 'beach';
  format?: '3-sets' | '5-sets' | '1-set' | '2-sets';
}

export function MatchSheetInterface({ 
  modality = 'indoor', 
  format = '3-sets' 
}: MatchSheetInterfaceProps) {
  const [currentSet, setCurrentSet] = useState(1);
  const [teamA, setTeamA] = useState<TeamData>({
    name: 'Vôlei Osasco',
    shortName: 'OSA',
    score: 18,
    sets: 1,
    timeouts: 2,
    color: 'teamA',
  });
  const [teamB, setTeamB] = useState<TeamData>({
    name: 'Minas Tênis Clube',
    shortName: 'MIN',
    score: 15,
    sets: 0,
    timeouts: 2,
    color: 'teamB',
  });
  const [setHistory, setSetHistory] = useState<SetScore[]>([
    { setNumber: 1, scoreA: 25, scoreB: 22, winner: 'A' },
  ]);
  const [servingTeam, setServingTeam] = useState<'A' | 'B'>('A');
  const [matchStatus, setMatchStatus] = useState<'warmup' | 'in-progress' | 'timeout' | 'set-break' | 'completed'>('in-progress');

  const addPoint = (team: 'A' | 'B') => {
    if (team === 'A') {
      setTeamA(prev => ({ ...prev, score: prev.score + 1 }));
    } else {
      setTeamB(prev => ({ ...prev, score: prev.score + 1 }));
    }
    setServingTeam(team);
  };

  const removePoint = (team: 'A' | 'B') => {
    if (team === 'A' && teamA.score > 0) {
      setTeamA(prev => ({ ...prev, score: prev.score - 1 }));
    } else if (team === 'B' && teamB.score > 0) {
      setTeamB(prev => ({ ...prev, score: prev.score - 1 }));
    }
  };

  const callTimeout = (team: 'A' | 'B') => {
    if (team === 'A' && teamA.timeouts > 0) {
      setTeamA(prev => ({ ...prev, timeouts: prev.timeouts - 1 }));
    } else if (team === 'B' && teamB.timeouts > 0) {
      setTeamB(prev => ({ ...prev, timeouts: prev.timeouts - 1 }));
    }
    setMatchStatus('timeout');
  };

  const maxSets = format === '5-sets' ? 5 : format === '3-sets' || format === '2-sets' ? 3 : 1;
  const setsToWin = format === '5-sets' ? 3 : format === '3-sets' || format === '2-sets' ? 2 : 1;

  return (
    <div className="space-y-6">
      {/* Match Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${modality === 'indoor' ? 'bg-indoor text-indoor-foreground' : 'bg-beach text-beach-foreground'}`}>
            {modality === 'indoor' ? (
              <Volleyball className="w-6 h-6" />
            ) : (
              <Waves className="w-6 h-6" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              Súmula Digital
            </h1>
            <p className="text-muted-foreground">
              {modality === 'indoor' ? 'Vôlei de Quadra' : 'Vôlei de Praia'} · {format.replace('-', ' ').toUpperCase()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={matchStatus === 'in-progress' ? 'default' : 'secondary'} className="gap-1.5 px-3 py-1.5">
            {matchStatus === 'in-progress' && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
              </span>
            )}
            {matchStatus === 'in-progress' ? 'Em Andamento' : 
             matchStatus === 'timeout' ? 'Tempo Técnico' :
             matchStatus === 'set-break' ? 'Intervalo' :
             matchStatus === 'warmup' ? 'Aquecimento' : 'Finalizado'}
          </Badge>
          <Button variant="outline" size="sm" className="gap-2">
            <FileText className="w-4 h-4" />
            Gerar PDF
          </Button>
        </div>
      </motion.div>

      {/* Scoreboard */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="card-elevated overflow-hidden">
          <div className="grid grid-cols-[1fr,auto,1fr]">
            {/* Team A */}
            <div className="p-6 bg-gradient-to-br from-teamA/10 to-transparent">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-xl bg-teamA/20 flex items-center justify-center">
                  <span className="text-2xl font-display font-bold text-teamA">
                    {teamA.shortName}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold text-foreground">
                    {teamA.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    {servingTeam === 'A' && (
                      <Badge className="bg-teamA text-teamA-foreground gap-1">
                        <Volleyball className="w-3 h-3" />
                        Sacando
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Score Display */}
              <div className="flex items-center justify-center gap-4">
                <Button 
                  variant="outline" 
                  size="icon-lg"
                  onClick={() => removePoint('A')}
                  className="rounded-full"
                >
                  <Minus className="w-5 h-5" />
                </Button>
                <motion.div
                  key={teamA.score}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="w-32 h-32 rounded-2xl bg-teamA flex items-center justify-center shadow-lg"
                >
                  <span className="score-display text-6xl text-teamA-foreground">
                    {teamA.score}
                  </span>
                </motion.div>
                <Button 
                  variant="accent" 
                  size="icon-lg"
                  onClick={() => addPoint('A')}
                  className="rounded-full"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </div>

              {/* Sets Won */}
              <div className="mt-6 flex items-center justify-center gap-2">
                <span className="text-sm text-muted-foreground">Sets:</span>
                <div className="flex gap-1">
                  {Array.from({ length: setsToWin }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                        i < teamA.sets ? 'bg-teamA text-teamA-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {i < teamA.sets ? <Check className="w-4 h-4" /> : i + 1}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex items-center justify-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => callTimeout('A')}
                  disabled={teamA.timeouts === 0}
                >
                  <Clock className="w-4 h-4" />
                  Tempo ({teamA.timeouts})
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Shuffle className="w-4 h-4" />
                  Substituição
                </Button>
              </div>
            </div>

            {/* Center Divider */}
            <div className="flex flex-col items-center justify-center px-8 py-6 bg-muted/30">
              <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground">Set</p>
                <span className="text-4xl font-display font-bold text-foreground">
                  {currentSet}
                </span>
              </div>
              
              <div className="w-px h-16 bg-border" />
              
              {/* Set History */}
              <div className="mt-4 space-y-2">
                {setHistory.map((set) => (
                  <div
                    key={set.setNumber}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className={`w-6 text-center font-semibold ${set.winner === 'A' ? 'text-teamA' : 'text-muted-foreground'}`}>
                      {set.scoreA}
                    </span>
                    <span className="text-muted-foreground">-</span>
                    <span className={`w-6 text-center font-semibold ${set.winner === 'B' ? 'text-teamB' : 'text-muted-foreground'}`}>
                      {set.scoreB}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Team B */}
            <div className="p-6 bg-gradient-to-bl from-teamB/10 to-transparent">
              <div className="flex items-center justify-end gap-4 mb-6">
                <div className="text-right">
                  <h2 className="text-xl font-display font-bold text-foreground">
                    {teamB.name}
                  </h2>
                  <div className="flex items-center justify-end gap-2 mt-1">
                    {servingTeam === 'B' && (
                      <Badge className="bg-teamB text-teamB-foreground gap-1">
                        <Volleyball className="w-3 h-3" />
                        Sacando
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="w-16 h-16 rounded-xl bg-teamB/20 flex items-center justify-center">
                  <span className="text-2xl font-display font-bold text-teamB">
                    {teamB.shortName}
                  </span>
                </div>
              </div>

              {/* Score Display */}
              <div className="flex items-center justify-center gap-4">
                <Button 
                  variant="outline" 
                  size="icon-lg"
                  onClick={() => removePoint('B')}
                  className="rounded-full"
                >
                  <Minus className="w-5 h-5" />
                </Button>
                <motion.div
                  key={teamB.score}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="w-32 h-32 rounded-2xl bg-teamB flex items-center justify-center shadow-lg"
                >
                  <span className="score-display text-6xl text-teamB-foreground">
                    {teamB.score}
                  </span>
                </motion.div>
                <Button 
                  variant="accent" 
                  size="icon-lg"
                  onClick={() => addPoint('B')}
                  className="rounded-full"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </div>

              {/* Sets Won */}
              <div className="mt-6 flex items-center justify-center gap-2">
                <span className="text-sm text-muted-foreground">Sets:</span>
                <div className="flex gap-1">
                  {Array.from({ length: setsToWin }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                        i < teamB.sets ? 'bg-teamB text-teamB-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {i < teamB.sets ? <Check className="w-4 h-4" /> : i + 1}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex items-center justify-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => callTimeout('B')}
                  disabled={teamB.timeouts === 0}
                >
                  <Clock className="w-4 h-4" />
                  Tempo ({teamB.timeouts})
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Shuffle className="w-4 h-4" />
                  Substituição
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Quick Actions & Serve Order */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Serve Order */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-accent" />
                Ordem de Saque
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                {/* Team A Rotation */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3">{teamA.shortName}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[4, 3, 2, 5, 6, 1].map((pos, idx) => (
                      <div
                        key={idx}
                        className={`aspect-square rounded-lg flex items-center justify-center font-bold text-lg ${
                          idx === 0 && servingTeam === 'A'
                            ? 'bg-teamA text-teamA-foreground ring-2 ring-accent ring-offset-2'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        {pos}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Team B Rotation */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3">{teamB.shortName}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[2, 3, 4, 1, 6, 5].map((pos, idx) => (
                      <div
                        key={idx}
                        className={`aspect-square rounded-lg flex items-center justify-center font-bold text-lg ${
                          idx === 0 && servingTeam === 'B'
                            ? 'bg-teamB text-teamB-foreground ring-2 ring-accent ring-offset-2'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        {pos}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Match Events */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Eventos da Partida
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-10 h-10 rounded-full bg-teamA/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-teamA" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Substituição - OSA</p>
                    <p className="text-xs text-muted-foreground">Jogadora #7 entrou por #12</p>
                  </div>
                  <span className="text-xs text-muted-foreground">18-14</span>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/10">
                  <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-warning" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Tempo Técnico - MIN</p>
                    <p className="text-xs text-muted-foreground">Tempo solicitado</p>
                  </div>
                  <span className="text-xs text-muted-foreground">15-12</span>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <Check className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Fim do 1º Set</p>
                    <p className="text-xs text-muted-foreground">OSA vence 25-22</p>
                  </div>
                  <span className="text-xs text-muted-foreground">Set 1</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
