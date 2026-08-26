import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Trophy, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { DrawGroup } from '@/types/draw';
import type { TeamRecord, CompetitionRecord } from '@/types/entities';

interface LiveDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: DrawGroup[];
  teams: TeamRecord[];
  competition: CompetitionRecord;
}

interface DrawEvent {
  teamId: string;
  groupName: string;
  order: number;
}

export function LiveDrawModal({ isOpen, onClose, groups, teams, competition }: LiveDrawModalProps) {
  const [drawSequence, setDrawSequence] = useState<DrawEvent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isRevealing, setIsRevealing] = useState(false);

  useEffect(() => {
    if (isOpen && groups.length > 0) {
      const seq: DrawEvent[] = [];
      const maxTeamsInGroup = Math.max(...groups.map(g => g.teams.length));
      
      let order = 0;
      for (let i = 0; i < maxTeamsInGroup; i++) {
        for (const group of groups) {
          if (group.teams[i]) {
            seq.push({
              teamId: group.teams[i].teamId,
              groupName: group.name,
              order: order++,
            });
          }
        }
      }
      setDrawSequence(seq);
      setCurrentIndex(-1);
      setIsRevealing(false);
    }
  }, [isOpen, groups]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentIndex < drawSequence.length - 1 && !isRevealing) {
      setIsRevealing(true);
      setCurrentIndex(prev => prev + 1);
      setTimeout(() => {
        setIsRevealing(false);
      }, 2500);
    }
  };

  const currentDraw = currentIndex >= 0 ? drawSequence[currentIndex] : null;
  const currentTeam = currentDraw ? teams.find(t => t.id === currentDraw.teamId) : null;
  const isFinished = currentIndex >= drawSequence.length - 1 && !isRevealing;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-50 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950 opacity-80" />
        
        <div className="relative z-10 flex items-center justify-between p-6 bg-black/40 backdrop-blur-sm border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-accent/20 rounded-xl border border-accent/50">
              <Trophy className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-white uppercase tracking-wider">
                Sorteio Oficial
              </h1>
              <p className="text-slate-400 text-sm font-medium">{competition.name}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white hover:bg-white/10">
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8">
          <AnimatePresence mode="wait">
            {isRevealing && currentTeam && (
              <motion.div
                key={`reveal-${currentTeam.id}`}
                initial={{ scale: 0.5, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, filter: 'blur(10px)' }}
                transition={{ type: "spring", damping: 15, stiffness: 100 }}
                className="absolute z-20 flex flex-col items-center justify-center pointer-events-none"
              >
                <motion.div 
                  initial={{ rotate: -5 }}
                  animate={{ rotate: 0 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                  className="bg-white text-slate-900 p-8 rounded-2xl shadow-2xl shadow-accent/20 border-4 border-accent flex flex-col items-center gap-6 w-96 text-center"
                >
                  <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center p-2 shadow-inner border border-slate-200">
                    {currentTeam.logoUrl ? (
                      <img src={currentTeam.logoUrl} alt={currentTeam.name} className="w-full h-full object-contain" />
                    ) : (
                      <Users className="w-10 h-10 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-3xl font-display font-black uppercase tracking-tight leading-tight">
                      {currentTeam.name}
                    </h2>
                    <p className="text-lg text-slate-500 font-medium mt-1">{currentTeam.city || 'Confirmado'}</p>
                  </div>
                  <Badge variant="default" className="bg-accent text-accent-foreground text-sm px-4 py-1.5 uppercase tracking-widest font-bold">
                    {currentDraw?.groupName}
                  </Badge>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 0.5, scale: 2 }}
                  exit={{ opacity: 0 }}
                  className="absolute -z-10 w-full h-full bg-accent blur-[100px] rounded-full pointer-events-none"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className={`w-full max-w-7xl grid gap-6 transition-all duration-1000 ${isRevealing ? 'opacity-30 blur-sm scale-95' : 'opacity-100 scale-100'}`} 
               style={{ gridTemplateColumns: `repeat(auto-fit, minmax(280px, 1fr))` }}>
            {groups.map((group) => {
              const drawnTeamsInGroup = drawSequence
                .filter(d => d.groupName === group.name && d.order <= currentIndex)
                .map(d => teams.find(t => t.id === d.teamId))
                .filter(Boolean);

              return (
                <div key={group.name} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                    <h3 className="text-xl font-display font-bold text-white uppercase tracking-wider">{group.name}</h3>
                    <Badge variant="outline" className="border-white/20 text-slate-300">
                      {drawnTeamsInGroup.length} / {group.teams.length}
                    </Badge>
                  </div>
                  <div className="flex-1 flex flex-col gap-3 min-h-[200px]">
                    {drawnTeamsInGroup.map((team, idx) => (
                      <motion.div 
                        key={team?.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * idx }}
                        className="flex items-center gap-3 bg-white/10 p-3 rounded-lg border border-white/5"
                      >
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                          {team?.logoUrl ? (
                            <img src={team.logoUrl} alt="" className="w-5 h-5 object-contain" />
                          ) : (
                            <span className="text-xs font-bold text-white">{idx + 1}</span>
                          )}
                        </div>
                        <span className="font-semibold text-sm text-slate-100 truncate">{team?.name}</span>
                      </motion.div>
                    ))}
                    
                    {Array.from({ length: group.teams.length - drawnTeamsInGroup.length }).map((_, i) => (
                      <div key={`empty-${i}`} className="flex items-center gap-3 p-3 rounded-lg border border-white/10 border-dashed bg-black/20">
                        <div className="w-8 h-8 rounded-full border border-white/20 border-dashed flex items-center justify-center shrink-0">
                          <span className="text-xs font-medium text-slate-600">?</span>
                        </div>
                        <span className="text-sm font-medium text-slate-600">Aguardando...</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 p-6 flex justify-center bg-black/40 backdrop-blur-sm border-t border-white/10">
          {!isFinished ? (
            <Button 
              size="lg" 
              onClick={handleNext} 
              disabled={isRevealing || drawSequence.length === 0}
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold px-12 py-6 text-lg h-auto rounded-full shadow-[0_0_40px_rgba(var(--accent),0.3)] transition-all hover:scale-105"
            >
              <Play className="w-6 h-6 mr-3 fill-current" />
              {currentIndex === -1 ? 'Iniciar Sorteio' : 'Sortear Próximo'}
            </Button>
          ) : (
            <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <h3 className="text-2xl font-display font-bold text-success mb-2">Sorteio Concluído!</h3>
              <p className="text-slate-400">Todos os grupos foram definidos.</p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
