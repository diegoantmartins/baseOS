import { useMemo, useState } from 'react';
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
  ChevronRight,
  User,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { downloadMatchSheetPdf } from '@/lib/pdf/matchSheetPdf';
import { buildMatchSheetData } from '@/lib/pdf/matchSheetDataBuilder';
import { toast } from 'sonner';
import type { MatchRecord } from '@/types/entities';
import type { CompetitionRecord } from '@/types/entities';
import type { CompetitionAthlete } from '@/types/registration';

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

// Posições da quadra em ordem de rotação (1 = sacador)
const ROTATION_POSITIONS = ['1', '6', '5', '4', '3', '2'];

function athleteLabel(athlete: CompetitionAthlete): string {
  return athlete.jerseyNumber !== undefined ? `#${athlete.jerseyNumber} ${athlete.name}` : athlete.name;
}

interface TeamLineup {
  starterIds: string[];
  captainId?: string;
  liberoId?: string;
}

interface MatchSheetInterfaceProps {
  modality?: 'indoor' | 'beach';
  format?: '3-sets' | '5-sets' | '1-set' | '2-sets';
  match?: MatchRecord | null;
  competition?: CompetitionRecord | null;
  teamARoster?: CompetitionAthlete[];
  teamBRoster?: CompetitionAthlete[];
}

export function MatchSheetInterface({
  modality = 'indoor',
  format = '3-sets',
  match = null,
  competition = null,
  teamARoster = [],
  teamBRoster = [],
}: MatchSheetInterfaceProps) {
  const hasRealData = Boolean(match && teamARoster.length >= 0);

  const [currentSet, setCurrentSet] = useState(1);
  const [teamA, setTeamA] = useState<TeamData>({
    name: match?.teamAName ?? 'Vôlei Osasco',
    shortName: match?.teamAShortName ?? 'OSA',
    score: 0,
    sets: 0,
    timeouts: 2,
    color: 'teamA',
  });
  const [teamB, setTeamB] = useState<TeamData>({
    name: match?.teamBName ?? 'Minas Tênis Clube',
    shortName: match?.teamBShortName ?? 'MIN',
    score: 0,
    sets: 0,
    timeouts: 2,
    color: 'teamB',
  });
  const [setHistory, setSetHistory] = useState<SetScore[]>([]);
  const [servingTeam, setServingTeam] = useState<'A' | 'B'>('A');
  const [matchStatus, setMatchStatus] = useState<'warmup' | 'in-progress' | 'timeout' | 'set-break' | 'completed'>(hasRealData ? 'warmup' : 'in-progress');

  const [lineupA, setLineupA] = useState<TeamLineup>(() => buildInitialLineup(teamARoster));
  const [lineupB, setLineupB] = useState<TeamLineup>(() => buildInitialLineup(teamBRoster));
  const [rotationA, setRotationA] = useState(0);
  const [rotationB, setRotationB] = useState(0);

  const [events, setEvents] = useState<{ id: number; icon: 'sub' | 'timeout' | 'check'; team: 'A' | 'B'; text: string; score: string }[]>([]);

  const startersA = useMemo(() => lineupA.starterIds.map(id => teamARoster.find(a => a.id === id)!).filter(Boolean), [lineupA.starterIds, teamARoster]);
  const startersB = useMemo(() => lineupB.starterIds.map(id => teamBRoster.find(a => a.id === id)!).filter(Boolean), [lineupB.starterIds, teamBRoster]);

  const addPoint = (team: 'A' | 'B') => {
    if (team === 'A') {
      setTeamA(prev => ({ ...prev, score: prev.score + 1 }));
    } else {
      setTeamB(prev => ({ ...prev, score: prev.score + 1 }));
    }
    setServingTeam(team);
    if (matchStatus === 'warmup') setMatchStatus('in-progress');
    // Rotação: se a equipe que marcou continuava sacando, roda a ordem
    if (servingTeam === team) {
      if (team === 'A') setRotationA(prev => (prev + 1) % 6);
      else setRotationB(prev => (prev + 1) % 6);
    }
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
    setEvents(prev => [
      { id: Date.now(), icon: 'timeout', team, text: `Tempo solicitado - ${team === 'A' ? teamA.shortName : teamB.shortName}`, score: `${teamA.score}-${teamB.score}` },
      ...prev,
    ]);
  };

  const endSet = () => {
    const winner: 'A' | 'B' = teamA.score > teamB.score ? 'A' : 'B';
    setSetHistory(prev => [...prev, { setNumber: currentSet, scoreA: teamA.score, scoreB: teamB.score, winner }]);
    setEvents(prev => [
      { id: Date.now(), icon: 'check', team: winner, text: `Fim do ${currentSet}º set`, score: `${Math.max(teamA.score, teamB.score)}-${Math.min(teamA.score, teamB.score)}` },
      ...prev,
    ]);
    if (winner === 'A') setTeamA(prev => ({ ...prev, sets: prev.sets + 1, score: 0 }));
    else setTeamB(prev => ({ ...prev, sets: prev.sets + 1, score: 0 }));
    const setsToWin = format === '5-sets' ? 3 : format === '3-sets' || format === '2-sets' ? 2 : 1;
    if (winner === 'A' && teamA.sets + 1 >= setsToWin) setMatchStatus('completed');
    else if (winner === 'B' && teamB.sets + 1 >= setsToWin) setMatchStatus('completed');
    else {
      setMatchStatus('set-break');
      setCurrentSet(prev => prev + 1);
    }
  };

  const maxSets = format === '5-sets' ? 5 : format === '3-sets' || format === '2-sets' ? 3 : 1;
  const setsToWin = format === '5-sets' ? 3 : format === '3-sets' || format === '2-sets' ? 2 : 1;

  const handlePdf = async () => {
    if (!match) {
      toast.error('Selecione uma partida para gerar o PDF.');
      return;
    }
    try {
      const pdfData = await buildMatchSheetData(match, competition, teamARoster, teamBRoster);
      downloadMatchSheetPdf(pdfData);
      toast.success('PDF da súmula gerado!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar o PDF.');
    }
  };

  const rotationOrderA = useMemo(() => {
    const shifted = startersA.map((_, i) => startersA[(i + rotationA) % startersA.length]);
    if (shifted.length < 6) {
      // Placeholders para posições vazias
      return ROTATION_POSITIONS.map((_, idx) => shifted[idx]?.jerseyNumber ?? '-');
    }
    return shifted.map(a => a.jerseyNumber);
  }, [startersA, rotationA]);

  const rotationOrderB = useMemo(() => {
    const shifted = startersB.map((_, i) => startersB[(i + rotationB) % startersB.length]);
    if (shifted.length < 6) {
      return ROTATION_POSITIONS.map((_, idx) => shifted[idx]?.jerseyNumber ?? '-');
    }
    return shifted.map(a => a.jerseyNumber);
  }, [startersB, rotationB]);

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
              <Volleyball className="w-6 h-6" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Súmula Digital</h1>
            <p className="text-muted-foreground">
              {competition?.name ?? 'Vôlei de Quadra'} · {format.replace('-', ' ').toUpperCase()}
              {hasRealData && ` · Jogo ${match?.matchNumber} (Rodada ${match?.round})`}
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
          <Button variant="outline" size="sm" className="gap-2" onClick={handlePdf}>
            <FileText className="w-4 h-4" />
            Gerar PDF
          </Button>
        </div>
      </motion.div>

      {/* Escalação Inicial */}
      {(matchStatus === 'warmup' || matchStatus === 'set-break') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LineupCard
            title={`Escalação Inicial - ${teamA.shortName}`}
            roster={teamARoster}
            lineup={lineupA}
            color="teamA"
            onChange={setLineupA}
          />
          <LineupCard
            title={`Escalação Inicial - ${teamB.shortName}`}
            roster={teamBRoster}
            lineup={lineupB}
            color="teamB"
            onChange={setLineupB}
          />
        </div>
      )}

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
                  <span className="text-2xl font-display font-bold text-teamA">{teamA.shortName}</span>
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold text-foreground">{teamA.name}</h2>
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

              <div className="flex items-center justify-center gap-4">
                <Button variant="outline" size="icon" className="rounded-full w-11 h-11" onClick={() => removePoint('A')}>
                  <Minus className="w-5 h-5" />
                </Button>
                <motion.div
                  key={teamA.score}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="w-32 h-32 rounded-2xl bg-teamA flex items-center justify-center shadow-lg"
                >
                  <span className="font-display text-6xl text-teamA-foreground">{teamA.score}</span>
                </motion.div>
                <Button variant="default" size="icon" className="rounded-full w-11 h-11" onClick={() => addPoint('A')} disabled={matchStatus === 'completed'}>
                  <Plus className="w-5 h-5" />
                </Button>
              </div>

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

              <div className="mt-6 flex items-center justify-center gap-3">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => callTimeout('A')} disabled={teamA.timeouts === 0}>
                  <Clock className="w-4 h-4" />
                  Tempo ({teamA.timeouts})
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={endSet} disabled={matchStatus === 'completed'}>
                  <Check className="w-4 h-4" />
                  Encerrar Set
                </Button>
              </div>
            </div>

            {/* Center */}
            <div className="flex flex-col items-center justify-center px-8 py-6 bg-muted/30">
              <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground">Set</p>
                <span className="text-4xl font-display font-bold text-foreground">{currentSet}</span>
              </div>
              <div className="w-px h-16 bg-border" />
              <div className="mt-4 space-y-2">
                {setHistory.map(set => (
                  <div key={set.setNumber} className="flex items-center gap-2 text-sm">
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
                  <h2 className="text-xl font-display font-bold text-foreground">{teamB.name}</h2>
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
                  <span className="text-2xl font-display font-bold text-teamB">{teamB.shortName}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4">
                <Button variant="outline" size="icon" className="rounded-full w-11 h-11" onClick={() => removePoint('B')}>
                  <Minus className="w-5 h-5" />
                </Button>
                <motion.div
                  key={teamB.score}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="w-32 h-32 rounded-2xl bg-teamB flex items-center justify-center shadow-lg"
                >
                  <span className="font-display text-6xl text-teamB-foreground">{teamB.score}</span>
                </motion.div>
                <Button variant="default" size="icon" className="rounded-full w-11 h-11" onClick={() => addPoint('B')} disabled={matchStatus === 'completed'}>
                  <Plus className="w-5 h-5" />
                </Button>
              </div>

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

              <div className="mt-6 flex items-center justify-center gap-3">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => callTimeout('B')} disabled={teamB.timeouts === 0}>
                  <Clock className="w-4 h-4" />
                  Tempo ({teamB.timeouts})
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={endSet} disabled={matchStatus === 'completed'}>
                  <Check className="w-4 h-4" />
                  Encerrar Set
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Ordem de Saque + Eventos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Serve Order */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-accent" />
                Ordem de Saque (por camisa)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3">{teamA.shortName}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {ROTATION_POSITIONS.map((pos, idx) => (
                      <div
                        key={pos + idx + rotationA}
                        className={`rounded-lg p-2 text-center font-bold ${
                          idx === 0 && servingTeam === 'A'
                            ? 'bg-teamA text-teamA-foreground ring-2 ring-accent ring-offset-2'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        <span className="block text-2xl">{rotationOrderA[idx] ?? '-'}</span>
                        <span className="block text-[10px] opacity-70">pos {pos}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3">{teamB.shortName}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {ROTATION_POSITIONS.map((pos, idx) => (
                      <div
                        key={pos + idx + rotationB}
                        className={`rounded-lg p-2 text-center font-bold ${
                          idx === 0 && servingTeam === 'B'
                            ? 'bg-teamB text-teamB-foreground ring-2 ring-accent ring-offset-2'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        <span className="block text-2xl">{rotationOrderB[idx] ?? '-'}</span>
                        <span className="block text-[10px] opacity-70">pos {pos}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Posição 1 = sacador. A rotação avança quando a equipe pontua mantendo o saque.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Events */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Eventos da Partida
              </CardTitle>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum evento registrado. Inicie os pontos para registrar eventos.
                </p>
              ) : (
                <div className="space-y-3">
                  {events.slice(0, 6).map(event => (
                    <div key={event.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        event.icon === 'sub' ? 'bg-teamA/20 text-teamA' :
                        event.icon === 'timeout' ? 'bg-warning/20 text-warning' : 'bg-accent/20 text-accent'
                      }`}>
                        {event.icon === 'sub' ? <Shuffle className="w-5 h-5" /> :
                         event.icon === 'timeout' ? <Clock className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{event.text}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{event.score}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

// Classes estáticas do Tailwind (não podem ser dinâmicas)
const COLOR_STARTER: Record<'teamA' | 'teamB', string> = {
  teamA: 'bg-teamA text-teamA-foreground border-transparent',
  teamB: 'bg-teamB text-teamB-foreground border-transparent',
};

// ============================================================================
// Cartão de escalação inicial
// ============================================================================

function buildInitialLineup(roster: CompetitionAthlete[]): TeamLineup {
  const starters = roster.slice(0, 6).map(a => a.id);
  const captain = roster.find(a => a.isCaptain)?.id;
  const libero = roster.find(a => a.isLibero)?.id;
  return { starterIds: starters, captainId: captain, liberoId: libero };
}

interface LineupCardProps {
  title: string;
  roster: CompetitionAthlete[];
  lineup: TeamLineup;
  color: 'teamA' | 'teamB';
  onChange: (lineup: TeamLineup) => void;
}

function LineupCard({ title, roster, lineup, color, onChange }: LineupCardProps) {
  const toggleStarter = (id: string) => {
    const isStarter = lineup.starterIds.includes(id);
    if (isStarter) {
      onChange({ ...lineup, starterIds: lineup.starterIds.filter(s => s !== id) });
    } else {
      if (lineup.starterIds.length >= 6) {
        toast.warning('Limite de 6 titulares atingido.');
        return;
      }
      onChange({ ...lineup, starterIds: [...lineup.starterIds, id] });
    }
  };

  return (
    <Card className="card-elevated">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <Users className={`w-5 h-5 ${color === 'teamA' ? 'text-teamA' : 'text-teamB'}`} />
          {title}
          <Badge variant="outline">{lineup.starterIds.length}/6</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {roster.length === 0 && (
            <p className="text-sm text-muted-foreground w-full">
              Nenhum atleta inscrito para esta equipe.
            </p>
          )}
          {roster.map(athlete => {
            const isStarter = lineup.starterIds.includes(athlete.id);
            const isCaptain = lineup.captainId === athlete.id;
            const isLibero = lineup.liberoId === athlete.id;
            return (
              <button
                key={athlete.id}
                type="button"
                onClick={() => toggleStarter(athlete.id)}
                className={`rounded-lg px-3 py-2 text-sm font-medium border transition-all ${
                  isStarter
                    ? COLOR_STARTER[color]
                    : 'bg-muted/50 border-border hover:border-accent'
                }`}
              >
                {athlete.jerseyNumber !== undefined && `#${athlete.jerseyNumber} `}
                {athlete.name.split(' ')[0]}
                {isCaptain && ' (C)'}
                {isLibero && ' (L)'}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Capitão</label>
            <Select
              value={lineup.captainId ?? ''}
              onValueChange={v => onChange({ ...lineup, captainId: v || undefined })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                {roster.map(athlete => (
                  <SelectItem key={athlete.id} value={athlete.id}>
                    {athleteLabel(athlete)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Líbero</label>
            <Select
              value={lineup.liberoId ?? ''}
              onValueChange={v => onChange({ ...lineup, liberoId: v || undefined })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                {roster.map(athlete => (
                  <SelectItem key={athlete.id} value={athlete.id}>
                    {athleteLabel(athlete)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="w-4 h-4" />
          Titulares + capitão + líbero definem a ordem de saque da súmula.
        </div>
      </CardContent>
    </Card>
  );
}