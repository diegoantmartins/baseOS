import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Volleyball,
  Clock,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Play,
  Pause,
  Maximize2,
  Shield,
  Award,
  History,
  Timer,
  AlertCircle,
  Flag,
} from 'lucide-react';
import { toast } from 'sonner';
import { dataAccess } from '@/services/dataAccess';
import { AuditService } from '@/lib/security';
import { useAuth } from '@/components/auth/AuthContext';
import { useCapability } from '@/hooks/useCapability';
import { ConfirmActionDialog } from '@/components/common/ConfirmActionDialog';
import type { CompetitionRecord, MatchRecord, SetScoreRecord } from '@/types/entities';

interface LiveScorerDeskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: MatchRecord | null;
  competition: CompetitionRecord | null;
  onMatchUpdated?: () => void;
}

type PointEvent = {
  id: string;
  setNumber: number;
  scoreA: number;
  scoreB: number;
  team: 'A' | 'B';
  timestamp: string;
  note?: string;
};

export const LiveScorerDeskModal: React.FC<LiveScorerDeskModalProps> = ({
  open,
  onOpenChange,
  match,
  competition,
  onMatchUpdated,
}) => {
  const { session } = useAuth();
  const { canSubmitMatchScore, can } = useCapability();

  const [currentSetNumber, setCurrentSetNumber] = useState(1);
  const [setsHistory, setSetsHistory] = useState<SetScoreRecord[]>([]);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [servingTeam, setServingTeam] = useState<'A' | 'B'>('A');

  // Timeouts por set (máximo 2 por equipe)
  const [timeoutsA, setTimeoutsA] = useState(0);
  const [timeoutsB, setTimeoutsB] = useState(0);
  const [timeoutTimer, setTimeoutTimer] = useState<number | null>(null);

  // Histórico de pontos para Undo
  const [pointLog, setPointLog] = useState<PointEvent[]>([]);

  // Modais de confirmação
  const [confirmFinalizeOpen, setConfirmFinalizeOpen] = useState(false);
  const [confirmNextSetOpen, setConfirmNextSetOpen] = useState(false);

  // Carregar dados da partida
  useEffect(() => {
    if (match) {
      if (match.sets && match.sets.length > 0) {
        setSetsHistory(match.sets);
        setCurrentSetNumber(match.sets.length + (match.status === 'completed' ? 0 : 1));
      } else {
        setSetsHistory([]);
        setCurrentSetNumber(1);
      }
      setScoreA(0);
      setScoreB(0);
      setTimeoutsA(0);
      setTimeoutsB(0);
      setPointLog([]);
    }
  }, [match]);

  // Cronômetro do pedido de tempo (Timeout 30s)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (timeoutTimer !== null && timeoutTimer > 0) {
      timer = setInterval(() => {
        setTimeoutTimer(prev => (prev && prev > 1 ? prev - 1 : null));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [timeoutTimer]);

  if (!match) return null;

  const setPointsTarget = currentSetNumber === 5 || (competition?.modality === 'beach' && currentSetNumber === 3) ? 15 : 25;
  const maxSetsToWin = competition?.setFormat === 'best-of-5' || match.customSetFormat === '5-sets' ? 3 : 2;

  // Contagem de sets ganhos
  const setsWonA = setsHistory.filter(s => s.scoreA > s.scoreB).length;
  const setsWonB = setsHistory.filter(s => s.scoreB > s.scoreA).length;

  const isMatchPointA = setsWonA === maxSetsToWin - 1 && scoreA >= setPointsTarget - 1 && scoreA - scoreB >= 1;
  const isMatchPointB = setsWonB === maxSetsToWin - 1 && scoreB >= setPointsTarget - 1 && scoreB - scoreA >= 1;
  const isSetPointA = !isMatchPointA && scoreA >= setPointsTarget - 1 && scoreA - scoreB >= 1;
  const isSetPointB = !isMatchPointB && scoreB >= setPointsTarget - 1 && scoreB - scoreA >= 1;

  const isSetFinished = (scoreA >= setPointsTarget || scoreB >= setPointsTarget) && Math.abs(scoreA - scoreB) >= 2;
  const setWinner = isSetFinished ? (scoreA > scoreB ? 'A' : 'B') : null;

  const handleAddPoint = (team: 'A' | 'B') => {
    if (isSetFinished) {
      toast.info('O set já atingiu a pontuação final. Clique em "Salvar Set" para avançar.');
      return;
    }

    const nextScoreA = team === 'A' ? scoreA + 1 : scoreA;
    const nextScoreB = team === 'B' ? scoreB + 1 : scoreB;

    setScoreA(nextScoreA);
    setScoreB(nextScoreB);
    setServingTeam(team);

    const event: PointEvent = {
      id: `pt-${Date.now()}`,
      setNumber: currentSetNumber,
      scoreA: nextScoreA,
      scoreB: nextScoreB,
      team,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
    };
    setPointLog(prev => [event, ...prev]);
  };

  const handleUndoPoint = () => {
    if (pointLog.length === 0) return;
    const last = pointLog[0];
    const rest = pointLog.slice(1);

    if (last.team === 'A') {
      setScoreA(prev => Math.max(0, prev - 1));
    } else {
      setScoreB(prev => Math.max(0, prev - 1));
    }
    setPointLog(rest);
    if (rest.length > 0) {
      setServingTeam(rest[0].team);
    }
    toast.info('Último ponto desfeito.');
  };

  const handleRequestTimeout = (team: 'A' | 'B') => {
    if (team === 'A') {
      if (timeoutsA >= 2) {
        toast.error('Equipe A já utilizou os 2 tempos deste set.');
        return;
      }
      setTimeoutsA(prev => prev + 1);
    } else {
      if (timeoutsB >= 2) {
        toast.error('Equipe B já utilizou os 2 tempos deste set.');
        return;
      }
      setTimeoutsB(prev => prev + 1);
    }
    setTimeoutTimer(30);
    toast.info(`Tempo técnico de 30s solicitado por ${team === 'A' ? match.teamAName : match.teamBName}!`);
  };

  const handleConfirmSaveSet = async () => {
    if (!isSetFinished) {
      toast.error('O set ainda não atingiu os critérios de término (diferença mínima de 2 pontos).');
      return;
    }

    const newSetRecord: SetScoreRecord = {
      setNumber: currentSetNumber,
      scoreA,
      scoreB,
    };

    const updatedSets = [...setsHistory, newSetRecord];
    setSetsHistory(updatedSets);

    const newSetsWonA = updatedSets.filter(s => s.scoreA > s.scoreB).length;
    const newSetsWonB = updatedSets.filter(s => s.scoreB > s.scoreA).length;

    const matchEnded = newSetsWonA === maxSetsToWin || newSetsWonB === maxSetsToWin;

    if (matchEnded) {
      const winnerId = newSetsWonA > newSetsWonB ? match.teamAId : match.teamBId;
      await dataAccess.updateMatch(match.id, {
        sets: updatedSets,
        winnerId,
        status: 'completed',
      });
      AuditService.logEvent(
        'Partida Finalizada na Mesa de Jogo',
        session?.user?.email || 'apontador',
        'success',
        `Jogo #${match.matchNumber} finalizado na mesa: ${match.teamAName} (${newSetsWonA}) x (${newSetsWonB}) ${match.teamBName}.`
      );
      toast.success('Partida concluída com sucesso!');
      onMatchUpdated?.();
      onOpenChange(false);
    } else {
      await dataAccess.updateMatch(match.id, {
        sets: updatedSets,
        status: 'in-progress',
      });
      toast.success(`Set ${currentSetNumber} salvo! Iniciando Set ${currentSetNumber + 1}.`);
      setCurrentSetNumber(prev => prev + 1);
      setScoreA(0);
      setScoreB(0);
      setTimeoutsA(0);
      setTimeoutsB(0);
      setPointLog([]);
      onMatchUpdated?.();
    }
    setConfirmNextSetOpen(false);
  };

  const handleQuickFinalize = async () => {
    const winnerId = setsWonA > setsWonB ? match.teamAId : match.teamBId;
    await dataAccess.updateMatch(match.id, {
      sets: setsHistory,
      winnerId,
      status: 'completed',
    });
    toast.success('Partida encerrada e salva!');
    onMatchUpdated?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-background/95 backdrop-blur-md">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volleyball className="w-5 h-5 text-primary animate-pulse" />
              <DialogTitle className="text-base sm:text-lg font-bold">
                Mesa do Apontador · Jogo #{match.matchNumber}
              </DialogTitle>
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                Set {currentSetNumber} (Meta: {setPointsTarget} pts)
              </Badge>
            </div>
            <Badge variant="default" className="text-xs uppercase font-bold tracking-wider">
              {match.status === 'in-progress' ? 'Ao Vivo' : match.status}
            </Badge>
          </div>
        </DialogHeader>

        {/* Timeout Banner em Contagem Regressiva */}
        {timeoutTimer !== null && (
          <div className="p-3 rounded-xl bg-amber-500 text-white text-center font-bold flex items-center justify-center gap-2 shadow-lg animate-bounce">
            <Timer className="w-5 h-5" />
            <span>Tempo Técnico em Andamento: {timeoutTimer}s</span>
          </div>
        )}

        {/* Placar de Sets Acumulado */}
        <div className="flex items-center justify-center gap-3 py-1 text-xs text-muted-foreground font-semibold">
          <span>Sets: <strong>{match.teamAName}</strong> {setsWonA}</span>
          <span>x</span>
          <span>{setsWonB} <strong>{match.teamBName}</strong></span>
          <span className="text-[11px] bg-muted px-2 py-0.5 rounded-full">
            Melhor de {maxSetsToWin === 3 ? '5' : '3'} Sets
          </span>
        </div>

        {/* Painel Principal do Placar com Botões Gigantes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          {/* LADO A: EQUIPE A */}
          <Card className={`border-2 transition-all ${servingTeam === 'A' ? 'border-primary shadow-md bg-primary/5' : 'border-border'}`}>
            <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-between min-h-[260px]">
              <div className="text-center w-full">
                <div className="flex items-center justify-center gap-2">
                  <h3 className="font-bold text-base sm:text-lg text-foreground truncate">{match.teamAName}</h3>
                  {servingTeam === 'A' && (
                    <Badge variant="default" className="text-[10px] bg-primary text-primary-foreground gap-1">
                      <Volleyball className="w-3 h-3" /> Saque
                    </Badge>
                  )}
                </div>
                {isMatchPointA && <Badge variant="destructive" className="mt-1 text-[10px] animate-pulse">MATCH POINT</Badge>}
                {isSetPointA && <Badge variant="default" className="mt-1 text-[10px] bg-amber-600">SET POINT</Badge>}
              </div>

              {/* Número do Placar */}
              <div className="my-2">
                <span className="text-6xl sm:text-7xl font-mono font-black text-foreground">
                  {scoreA}
                </span>
              </div>

              {/* Botão Gigante de Ponto */}
              <Button
                type="button"
                variant="accent"
                size="lg"
                className="w-full h-16 text-lg font-bold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                onClick={() => handleAddPoint('A')}
              >
                +1 Ponto {match.teamAShortName || 'Equipe A'}
              </Button>

              {/* Pedido de Tempo */}
              <div className="flex items-center justify-between w-full pt-3 text-xs">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-[11px] h-7 gap-1"
                  onClick={() => handleRequestTimeout('A')}
                  disabled={timeoutsA >= 2}
                >
                  <Clock className="w-3 h-3" />
                  Pedir Tempo ({2 - timeoutsA} restantes)
                </Button>
                <span className="text-muted-foreground text-[11px]">Tempos: {timeoutsA}/2</span>
              </div>
            </CardContent>
          </Card>

          {/* LADO B: EQUIPE B */}
          <Card className={`border-2 transition-all ${servingTeam === 'B' ? 'border-primary shadow-md bg-primary/5' : 'border-border'}`}>
            <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-between min-h-[260px]">
              <div className="text-center w-full">
                <div className="flex items-center justify-center gap-2">
                  <h3 className="font-bold text-base sm:text-lg text-foreground truncate">{match.teamBName}</h3>
                  {servingTeam === 'B' && (
                    <Badge variant="default" className="text-[10px] bg-primary text-primary-foreground gap-1">
                      <Volleyball className="w-3 h-3" /> Saque
                    </Badge>
                  )}
                </div>
                {isMatchPointB && <Badge variant="destructive" className="mt-1 text-[10px] animate-pulse">MATCH POINT</Badge>}
                {isSetPointB && <Badge variant="default" className="mt-1 text-[10px] bg-amber-600">SET POINT</Badge>}
              </div>

              {/* Número do Placar */}
              <div className="my-2">
                <span className="text-6xl sm:text-7xl font-mono font-black text-foreground">
                  {scoreB}
                </span>
              </div>

              {/* Botão Gigante de Ponto */}
              <Button
                type="button"
                variant="accent"
                size="lg"
                className="w-full h-16 text-lg font-bold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                onClick={() => handleAddPoint('B')}
              >
                +1 Ponto {match.teamBShortName || 'Equipe B'}
              </Button>

              {/* Pedido de Tempo */}
              <div className="flex items-center justify-between w-full pt-3 text-xs">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-[11px] h-7 gap-1"
                  onClick={() => handleRequestTimeout('B')}
                  disabled={timeoutsB >= 2}
                >
                  <Clock className="w-3 h-3" />
                  Pedir Tempo ({2 - timeoutsB} restantes)
                </Button>
                <span className="text-muted-foreground text-[11px]">Tempos: {timeoutsB}/2</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerta de Set Finalizado */}
        {isSetFinished && (
          <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-900 dark:text-emerald-300 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <span>Set {currentSetNumber} concluído: Vitória do {setWinner === 'A' ? match.teamAName : match.teamBName}!</span>
            </div>
            <Button
              type="button"
              variant="accent"
              className="font-bold gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setConfirmNextSetOpen(true)}
            >
              <CheckCircle className="w-4 h-4" />
              Salvar e Avançar Set
            </Button>
          </div>
        )}

        {/* Barra de Ações Rápidas: Desfazer Ponto, Histórico e Fechamento */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t text-xs">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleUndoPoint}
              disabled={pointLog.length === 0}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Desfazer Último Ponto
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => setServingTeam(prev => (prev === 'A' ? 'B' : 'A'))}
            >
              <Volleyball className="w-3 h-3" />
              Alternar Saque Manualmente
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {setsHistory.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs font-semibold text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmFinalizeOpen(true)}
              >
                Encerrar Partida
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Fechar Painel
            </Button>
          </div>
        </div>

        {/* Histórico dos Sets Anteriores */}
        {setsHistory.length > 0 && (
          <div className="pt-3 border-t">
            <h4 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" /> Histórico de Sets desta Partida:
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
              {setsHistory.map((s, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-muted/40 border border-border/60">
                  <div className="text-[10px] text-muted-foreground font-semibold">Set {s.setNumber}</div>
                  <div className="font-bold text-sm text-foreground">{s.scoreA} x {s.scoreB}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>

      {/* Confirmação de Avanço de Set */}
      <ConfirmActionDialog
        open={confirmNextSetOpen}
        onOpenChange={setConfirmNextSetOpen}
        title={`Salvar Resultado do Set ${currentSetNumber}`}
        variant="accent"
        description={`Confirmar fechamento do Set ${currentSetNumber} com o placar de ${scoreA} x ${scoreB}? O resultado será registrado na súmula oficial.`}
        confirmText="Confirmar Set"
        onConfirm={handleConfirmSaveSet}
      />

      {/* Confirmação de Encerramento da Partida */}
      <ConfirmActionDialog
        open={confirmFinalizeOpen}
        onOpenChange={setConfirmFinalizeOpen}
        title="Finalizar Partida"
        variant="destructive"
        description={`Deseja encerrar a partida agora com o placar atual de sets (${setsWonA} x ${setsWonB})?`}
        confirmText="Encerrar Partida"
        onConfirm={handleQuickFinalize}
      />
    </Dialog>
  );
};
