import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Shuffle,
  Save,
  RefreshCw,
  Trophy,
  Users,
  ClipboardList,
  CheckCircle2,
  Dices,
  Calendar,
  ArrowRight,
  GripVertical,
  MonitorPlay,
} from 'lucide-react';
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { MainLayout } from '@/components/layout/MainLayout';
import { LiveDrawModal } from '@/components/draw/LiveDrawModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { dataAccess } from '@/services/dataAccess';
import { runDraw, roundRobinMatchCount, roundRobinRoundCount, generateDrawMatches } from '@/services/drawService';
import { suggestGroupsCount } from '@/types/draw';
import type { DrawConfig, DrawGroup, DrawMatchProposal, DrawRecord } from '@/types/draw';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';
import type { CompetitionTeam } from '@/types/registration';
import { cn } from '@/lib/utils';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const DrawPage = () => {
  const { competitionId: routeCompetitionId } = useParams<{ competitionId: string }>();
  const navigate = useNavigate();

  const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [competitionTeams, setCompetitionTeams] = useState<CompetitionTeam[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [existingDraw, setExistingDraw] = useState<DrawRecord | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);

  const [groupsCount, setGroupsCount] = useState(2);
  const [seedingMode, setSeedingMode] = useState<DrawConfig['seedingMode']>('seeded');
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 100000));
  const [headSeeds, setHeadSeeds] = useState<string[]>([]);

  const [preview, setPreview] = useState<{ groups: DrawGroup[]; matches: DrawMatchProposal[] } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  const handleGroupDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const currentGroups = preview?.groups ?? existingDraw?.groups ?? null;
    if (!over || !currentGroups) return;

    const teamId = String(active.id);
    const targetGroupName = String(over.id);

    const currentGroup = currentGroups.find(g => g.teams.some(t => t.teamId === teamId));
    if (!currentGroup || currentGroup.name === targetGroupName) return;

    const entryToMove = currentGroup.teams.find(t => t.teamId === teamId);
    if (!entryToMove) return;

    const newGroups = currentGroups.map(g => {
      if (g.name === currentGroup.name) {
        return { ...g, teams: g.teams.filter(t => t.teamId !== teamId) };
      }
      if (g.name === targetGroupName) {
        return { ...g, teams: [...g.teams, entryToMove] };
      }
      return g;
    });

    const newMatches = generateDrawMatches(newGroups);
    setPreview({ groups: newGroups, matches: newMatches });
    toast.info(`Equipe movida para o ${targetGroupName} e tabela recalculada!`);
  };

  const refresh = useCallback(async () => {
    const [comps, teams, cts, ms, draws] = await Promise.all([
      dataAccess.listCompetitions(),
      dataAccess.listTeams(),
      dataAccess.listCompetitionTeams(),
      dataAccess.listMatches(),
      dataAccess.listDraws(),
    ]);
    setCompetitions(comps);
    setTeams(teams);
    setCompetitionTeams(cts);
    setMatches(ms);
    const firstId = routeCompetitionId ?? comps[0]?.id ?? '';
    setSelectedId(firstId);
    const draw = draws.find(d => d.competitionId === firstId) ?? null;
    setExistingDraw(draw);
    setLoading(false);
  }, [routeCompetitionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selected = competitions.find(c => c.id === selectedId) ?? null;

  const registeredTeams = useMemo(() => {
    if (!selected) return [];
    const cts = competitionTeams.filter(ct => ct.competitionId === selected.id && ct.status !== 'rejected');
    return cts
      .map(ct => teams.find(t => t.id === ct.teamId))
      .filter((t): t is TeamRecord => Boolean(t));
  }, [selected, competitionTeams, teams]);

  const registeredMatchCount = useMemo(() => {
    if (!selected || registeredTeams.length < 2) return 0;
    const perGroup = Math.ceil(registeredTeams.length / groupsCount);
    return roundRobinMatchCount(perGroup) * Math.min(groupsCount, registeredTeams.length);
  }, [selected, registeredTeams, groupsCount]);

  const canDraw = (registeredTeams.length >= 2 && groupsCount >= 1 && groupsCount <= registeredTeams.length);

  const handleSelectCompetition = (id: string) => {
    setSelectedId(id);
    setExistingDraw(null);
    setPreview(null);
    void dataAccess.getDrawByCompetition(id).then(d => setExistingDraw(d));
    if (routeCompetitionId !== id) navigate(`/sorteio/${id}`, { replace: true });
  };

  const handleRunDraw = () => {
    if (!selected || !canDraw) return;
    const result = runDraw(selected, registeredTeams, {
      groupsCount,
      seedingMode,
      seed,
      headSeeds: seedingMode === 'seeded' ? headSeeds : [],
    });
    setPreview({ groups: result.groups, matches: result.matches });
  };

  const handleSaveDraw = async () => {
    if (!selected || !preview) return;
    setSaving(true);
    try {
      await dataAccess.saveDraw({
        competitionId: selected.id,
        config: { groupsCount, seedingMode, seed, headSeeds: seedingMode === 'seeded' ? headSeeds : [] },
        groups: preview.groups,
        matches: preview.matches,
      });

      // Remove os jogos antigos da fase classificatória e gera a nova tabela.
      const oldMatches = matches.filter(
        m => m.competitionId === selected.id && (m.phase === 'classificatória' || m.phase === 'classificatoria'),
      );
      if (oldMatches.length > 0) {
        await dataAccess.deleteMatches(oldMatches.map(m => m.id));
      }

      const baseDate = selected.startDate ?? new Date().toISOString().slice(0, 10);
      const venueName = selected.venue ?? 'Ginásio Municipal';
      const savedMatches = preview.matches;
      for (let i = 0; i < savedMatches.length; i++) {
        const proposal = savedMatches[i];
        const teamA = teams.find(t => t.id === proposal.teamAId);
        const teamB = teams.find(t => t.id === proposal.teamBId);
        const hour = 9 + (i % 8);
        await dataAccess.createMatch({
          competitionId: selected.id,
          round: proposal.round,
          matchNumber: proposal.matchNumber,
          teamAId: proposal.teamAId,
          teamBId: proposal.teamBId,
          teamAName: teamA?.name ?? '',
          teamBName: teamB?.name ?? '',
          teamAShortName: teamA?.shortName ?? '',
          teamBShortName: teamB?.shortName ?? '',
          venue: venueName,
          court: undefined,
          phase: proposal.phase,
          groupName: proposal.groupName,
          scheduledTime: `${baseDate}T${String(hour).padStart(2, '0')}:00:00`,
          status: 'scheduled',
          sets: [],
          referees: [],
        });
      }

      setSaving(false);
      toast.success('Sorteio salvo e jogos gerados!', {
        description: `${savedMatches.length} jogos criados na fase classificatória.`,
      });
      await refresh();
    } catch (error) {
      console.error(error);
      setSaving(false);
      toast.error('Erro ao salvar o sorteio.');
    }
  };

  const groupsToShow = preview?.groups ?? existingDraw?.groups ?? null;
  const matchesToShow = preview?.matches ?? existingDraw?.matches ?? null;

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-96 w-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Sorteio</h1>
            <p className="text-muted-foreground mt-1">
              Distribua as equipes inscritas em grupos e gere a tabela da fase classificatória
            </p>
          </div>
          <div className="w-full md:w-80">
            <Select value={selectedId} onValueChange={handleSelectCompetition}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a competição" />
              </SelectTrigger>
              <SelectContent>
                {competitions.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {!selected ? (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              Nenhuma competição cadastrada.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[380px,1fr] gap-6 items-start">
            {/* Configuração do sorteio */}
            <Card className="card-elevated">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <Dices className="w-5 h-5 text-accent" />
                  Configuração
                </CardTitle>
                <CardDescription>
                  {registeredTeams.length} equipe(s) inscrita(s) · {selected.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 p-5">
                <div className="space-y-2">
                  <Label>Número de grupos</Label>
                  <Select
                    value={String(groupsCount)}
                    onValueChange={v => {
                      const count = Number(v);
                      setGroupsCount(count);
                      setHeadSeeds(prev => prev.slice(0, count));
                      setPreview(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: Math.max(1, Math.min(8, registeredTeams.length)) }, (_, i) => i + 1).map(n => (
                        <SelectItem key={n} value={String(n)}>
                          {n} {n === 1 ? 'grupo' : 'grupos'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {groupsCount > 1 && (
                    <p className="text-xs text-muted-foreground">
                      Sugerido: {suggestGroupsCount(registeredTeams.length)} grupo(s) para {registeredTeams.length} equipes.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Tipo de sorteio</Label>
                  <RadioGroup value={seedingMode} onValueChange={v => { setSeedingMode(v as DrawConfig['seedingMode']); setPreview(null); }}>
                    <div className="flex items-start space-x-2 rounded-lg border border-border p-3">
                      <RadioGroupItem value="seeded" id="mode-seeded" />
                      <div>
                        <Label htmlFor="mode-seeded" className="font-medium">Sorteio dirigido</Label>
                        <p className="text-xs text-muted-foreground">
                          Cabeças de chave ficam uma por grupo; as demais são distribuídas aleatoriamente (padrão CBV/FIVB).
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2 rounded-lg border border-border p-3">
                      <RadioGroupItem value="random" id="mode-random" />
                      <div>
                        <Label htmlFor="mode-random" className="font-medium">Sorteio puro</Label>
                        <p className="text-xs text-muted-foreground">Todas as equipes são distribuídas de forma totalmente aleatória.</p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {seedingMode === 'seeded' && (
                  <div className="space-y-2">
                    <Label>Cabeças de chave (uma por grupo)</Label>
                    <div className="max-h-44 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                      {registeredTeams.map(team => (
                        <label
                          key={team.id}
                          className="flex items-center gap-2 p-2 text-sm hover:bg-muted/50 cursor-pointer"
                        >
                          <Checkbox
                            checked={headSeeds.includes(team.id)}
                            disabled={headSeeds.includes(team.id) && headSeeds.indexOf(team.id) >= groupsCount}
                            onCheckedChange={checked => {
                              setHeadSeeds(prev => {
                                const next = checked
                                  ? [...prev, team.id]
                                  : prev.filter(id => id !== team.id);
                                return next.slice(0, groupsCount);
                              });
                              setPreview(null);
                            }}
                          />
                          <span className="font-medium">{team.name}</span>
                          <span className="text-xs text-muted-foreground">{team.shortName}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Máximo {groupsCount} (1 por grupo). A 1ª selecionada é a cabeça de chave nº 1.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-1.5">
                      <Label htmlFor="draw-seed">Semente do sorteio</Label>
                      <Input
                        id="draw-seed"
                        type="number"
                        value={seed}
                        onChange={e => {
                          setSeed(Number(e.target.value) || 0);
                          setPreview(null);
                        }}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => {
                        setSeed(Math.floor(Math.random() * 100000));
                        setPreview(null);
                      }}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Nova
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A mesma semente reproduz exatamente o mesmo sorteio (registro oficial).
                  </p>
                </div>

                <div className="pt-2 border-t border-border space-y-2">
                  <Button variant="accent" className="w-full gap-2" onClick={handleRunDraw} disabled={!canDraw}>
                    <Shuffle className="w-4 h-4" />
                    Realizar Sorteio
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={handleSaveDraw}
                    disabled={!preview || saving}
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Salvando...' : 'Salvar Sorteio e Gerar Jogos'}
                  </Button>
                  {existingDraw && !preview && (
                    <p className="text-xs text-center text-muted-foreground">
                      Sorteio salvo em {new Date(existingDraw.updatedAt).toLocaleString('pt-BR')}. Salve novamente para substituí-lo.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Resultado do sorteio */}
            <div className="space-y-6">
              {!canDraw && (
                <Card>
                  <CardContent className="p-10 text-center text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    Esta competição precisa de pelo menos 2 equipes inscritas para realizar o sorteio.
                  </CardContent>
                </Card>
              )}

              {canDraw && !groupsToShow && (
                <Card>
                  <CardContent className="p-10 text-center space-y-2">
                    <Trophy className="w-10 h-10 mx-auto text-muted-foreground/50" />
                    <p className="text-muted-foreground">
                      Configure o sorteio ao lado e clique em <strong>Realizar Sorteio</strong>.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {registeredMatchCount > 0 && `${registeredMatchCount} jogos serão gerados na fase classificatória.`}
                    </p>
                  </CardContent>
                </Card>
              )}

              {groupsToShow && (
                <>
                  <DndContext sensors={sensors} onDragEnd={handleGroupDragEnd}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {groupsToShow.map(group => (
                        <DroppableGroupCard
                          key={group.name}
                          group={group}
                          teams={teams}
                        />
                      ))}
                    </div>
                  </DndContext>

                  <Card className="card-elevated">
                    <CardHeader className="border-b border-border py-3 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-display flex items-center gap-2">
                          <ClipboardList className="w-4 h-4 text-accent" />
                          Tabela de Jogos ({matchesToShow?.length ?? 0} jogos)
                        </CardTitle>
                        {matchesToShow && (
                          <CardDescription>
                            {roundRobinRoundCount(Math.ceil((registeredTeams.length ?? 0) / Math.max(groupsCount, 1)))} rodadas por grupo · turno único
                          </CardDescription>
                        )}
                      </div>
                      <Button variant="accent" size="sm" onClick={() => setIsLiveModalOpen(true)} className="gap-2">
                        <MonitorPlay className="w-4 h-4" />
                        Modo Apresentação (Live)
                      </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border text-left text-xs text-muted-foreground">
                              <th className="p-3">Jogo</th>
                              <th className="p-3">Rodada</th>
                              <th className="p-3">Grupo</th>
                              <th className="p-3">Equipe A</th>
                              <th className="p-3">Equipe B</th>
                            </tr>
                          </thead>
                          <tbody>
                            {matchesToShow?.map(match => {
                              const teamA = teams.find(t => t.id === match.teamAId);
                              const teamB = teams.find(t => t.id === match.teamBId);
                              return (
                                <tr key={`${match.matchNumber}-${match.teamAId}-${match.teamBId}`} className="border-b border-border/60 hover:bg-muted/40">
                                  <td className="p-3 font-semibold">{match.matchNumber}</td>
                                  <td className="p-3">{match.round}ª</td>
                                  <td className="p-3"><Badge variant="outline">{match.groupName}</Badge></td>
                                  <td className="p-3 font-medium">{teamA?.name ?? match.teamAId}</td>
                                  <td className="p-3 font-medium">{teamB?.name ?? match.teamBId}</td>
                                </tr>
                              );
                            })}
                            {(!matchesToShow || matchesToShow.length === 0) && (
                              <tr>
                                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                                  Nenhum jogo gerado para este sorteio.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-card border border-border">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Deseja ajustar os horários e quadras?</p>
                      <p className="text-xs text-muted-foreground">Acesse a Central de Jogos para definir as datas, horários e quadras de cada confronto.</p>
                    </div>
                    <Button variant="accent" size="sm" className="gap-2 shrink-0" onClick={() => navigate('/jogos')}>
                      <Calendar className="w-4 h-4" />
                      Ir para Agenda & Horários
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>

                  {!preview && existingDraw && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      Sorteio oficial da competição salvo em {new Date(existingDraw.updatedAt).toLocaleString('pt-BR')}.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {selected && groupsToShow && (
        <LiveDrawModal
          isOpen={isLiveModalOpen}
          onClose={() => setIsLiveModalOpen(false)}
          groups={groupsToShow}
          teams={teams}
          competition={selected}
        />
      )}
    </MainLayout>
  );
};

function DroppableGroupCard({ group, teams }: { group: DrawGroup; teams: TeamRecord[] }) {
  const { isOver, setNodeRef } = useDroppable({
    id: group.name,
  });

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        'card-elevated transition-all',
        isOver && 'border-primary ring-2 ring-primary/20 bg-primary/5'
      )}
    >
      <CardHeader className="border-b border-border py-3">
        <CardTitle className="text-base font-display flex items-center justify-between">
          <span>{group.name}</span>
          <Badge variant="outline">{group.teams.length} equipes</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-1.5 min-h-[120px]">
        {group.teams.map((entry, idx) => {
          const team = teams.find(t => t.id === entry.teamId);
          return (
            <DraggableTeamRow
              key={entry.teamId}
              teamId={entry.teamId}
              idx={idx}
              team={team}
            />
          );
        })}
        {group.teams.length === 0 && (
          <div className="h-20 flex items-center justify-center text-xs text-muted-foreground border border-dashed rounded-lg">
            Arraste uma equipe para cá
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DraggableTeamRow({
  teamId,
  idx,
  team,
}: {
  teamId: string;
  idx: number;
  team?: TeamRecord;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: teamId,
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg bg-card border border-border/60 hover:bg-muted/50 cursor-grab active:cursor-grabbing transition-all select-none',
        isDragging && 'opacity-40 shadow-xl ring-2 ring-primary'
      )}
    >
      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
      <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">
        {idx + 1}
      </span>
      {team?.logoUrl && (
        <img src={team.logoUrl} alt="" className="w-6 h-6 rounded object-contain bg-muted p-0.5" />
      )}
      <span className="font-medium text-sm truncate">{team?.name ?? teamId}</span>
    </div>
  );
}

export default DrawPage;