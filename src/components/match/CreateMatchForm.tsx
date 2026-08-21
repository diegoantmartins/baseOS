import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Volleyball,
  Waves,
  Trophy,
  UserCheck,
  Plus,
  X,
  ChevronRight,
  Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { dataAccess } from '@/services/dataAccess';
import { GENDER_CATEGORY_LABELS } from '@/types/registration';
import type { CompetitionRecord } from '@/types/entities';
import type { RefereeRecord } from '@/types/entities';
import type { TeamRecord } from '@/types/entities';
import type { VenueRecord } from '@/types/entities';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';

// Form validation schema
const createMatchSchema = z.object({
  competitionId: z.string().min(1, 'Selecione uma competição'),
  modality: z.enum(['indoor', 'beach'], { required_error: 'Selecione a modalidade' }),
  playerFormat: z.enum(['6x6', '4x4', '2x2', '3x3'], { required_error: 'Selecione o formato' }),
  setFormat: z.enum(['1-set', '2-sets', '3-sets', '5-sets'], { required_error: 'Selecione o formato de sets' }),
  teamAId: z.string().min(1, 'Selecione a equipe A'),
  teamBId: z.string().min(1, 'Selecione a equipe B'),
  date: z.string().min(1, 'Informe a data'),
  time: z.string().min(1, 'Informe o horário'),
  venue: z.string().min(1, 'Informe o local'),
  court: z.string().optional(),
  referee1Id: z.string().min(1, 'Selecione o 1º árbitro'),
  referee2Id: z.string().optional(),
  scorerId: z.string().optional(),
  round: z.number().min(1, 'Informe a rodada'),
  matchNumber: z.number().min(1, 'Informe o número do jogo'),
  observations: z.string().optional(),
}).refine(data => data.teamAId !== data.teamBId, {
  message: 'As equipes devem ser diferentes',
  path: ['teamBId'],
});

type CreateMatchFormData = z.infer<typeof createMatchSchema>;

interface CreateMatchFormProps {
  onSubmit?: (data: CreateMatchFormData) => void;
  onCancel?: () => void;
  /** Quando informada, a competição fica fixa (fluxo "dentro da competição"). */
  defaultCompetitionId?: string;
}

export function CreateMatchForm({ onSubmit, onCancel, defaultCompetitionId }: CreateMatchFormProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 3;
  const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [referees, setReferees] = useState<RefereeRecord[]>([]);
  const [venues, setVenues] = useState<VenueRecord[]>([]);
  const [lockedCompetition, setLockedCompetition] = useState<CompetitionRecord | null>(null);
  const [registeredTeamIds, setRegisteredTeamIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      dataAccess.listCompetitions(),
      dataAccess.listTeams(),
      dataAccess.listReferees(),
      dataAccess.listVenues(),
      defaultCompetitionId ? dataAccess.listCompetitionTeams(defaultCompetitionId) : Promise.resolve([]),
    ]).then(([comps, teams, refs, venues, cts]) => {
      setCompetitions(comps);
      setTeams(teams);
      setReferees(refs);
      setVenues(venues);
      if (defaultCompetitionId) {
        const comp = comps.find(c => c.id === defaultCompetitionId) ?? null;
        setLockedCompetition(comp);
        setRegisteredTeamIds(new Set(cts.map(ct => ct.teamId)));
      }
    });
  }, [defaultCompetitionId]);

  const form = useForm<CreateMatchFormData>({
    resolver: zodResolver(createMatchSchema),
    defaultValues: {
      modality: 'indoor',
      playerFormat: '6x6',
      setFormat: '3-sets',
      round: 1,
      matchNumber: 1,
    },
  });

  useEffect(() => {
    if (lockedCompetition) {
      form.setValue('competitionId', lockedCompetition.id);
      form.setValue('modality', lockedCompetition.modality);
      form.setValue('playerFormat', lockedCompetition.playerFormat as CreateMatchFormData['playerFormat']);
      form.setValue('setFormat', lockedCompetition.setFormat as CreateMatchFormData['setFormat']);
    }
  }, [lockedCompetition, form]);

  const modality = form.watch('modality');
  const teamAId = form.watch('teamAId');
  const selectedVenue = form.watch('venue');

  const filteredTeams = useMemo(() => {
    const byModality = teams.filter(t => t.modality === modality);
    if (!lockedCompetition) return byModality;
    return byModality.filter(t => registeredTeamIds.has(t.id));
  }, [teams, modality, lockedCompetition, registeredTeamIds]);
  const availableTeamsForB = useMemo(() => filteredTeams.filter(t => t.id !== teamAId), [filteredTeams, teamAId]);
  const venueCourts = useMemo(
    () => venues.find(v => v.name === selectedVenue)?.courts ?? [],
    [venues, selectedVenue],
  );

  const handleSubmit = (data: CreateMatchFormData) => {
    onSubmit?.(data);
  };

  const nextStep = async () => {
    let fieldsToValidate: (keyof CreateMatchFormData)[] = [];
    
    if (step === 1) {
      fieldsToValidate = ['competitionId', 'modality', 'playerFormat', 'setFormat'];
    } else if (step === 2) {
      fieldsToValidate = ['teamAId', 'teamBId', 'round', 'matchNumber'];
    }

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid && step < totalSteps) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <Card className="card-elevated max-w-4xl mx-auto">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent/10">
              <Plus className="w-5 h-5 text-accent" />
            </div>
            <div>
              <CardTitle className="text-xl font-display">Nova Partida</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Preencha os dados para agendar uma nova partida
              </p>
            </div>
          </div>
          {onCancel && (
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 mt-6">
          {[
            { num: 1, label: 'Competição', icon: Trophy },
            { num: 2, label: 'Equipes', icon: Users },
            { num: 3, label: 'Local e Data', icon: Calendar },
          ].map((s, idx) => (
            <div key={s.num} className="flex items-center">
              <button
                type="button"
                onClick={() => s.num < step && setStep(s.num)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                  step === s.num
                    ? 'bg-accent text-accent-foreground'
                    : step > s.num
                    ? 'bg-success/10 text-success cursor-pointer hover:bg-success/20'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                <s.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{s.label}</span>
              </button>
              {idx < 2 && (
                <ChevronRight className="w-4 h-4 mx-2 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      </CardHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardContent className="p-6">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Step 1: Competition & Format */}
              {step === 1 && (
                <div className="space-y-6">
                  {lockedCompetition ? (
                    <div className="p-4 rounded-xl border border-accent/40 bg-accent/5 space-y-3">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-accent" />
                        <p className="font-semibold">Competição: {lockedCompetition.name}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{GENDER_CATEGORY_LABELS[lockedCompetition.genderCategory]}</Badge>
                        <Badge variant="outline">
                          {lockedCompetition.modality === 'indoor' ? 'Quadra' : 'Praia'} ·{' '}
                          {lockedCompetition.playerFormat} · {lockedCompetition.setFormat}
                        </Badge>
                        {registeredTeamIds.size > 0 && (
                          <Badge variant="secondary">{registeredTeamIds.size} equipe(s) inscrita(s)</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        A partida será agendada nesta competição. Use as equipes inscritas.
                      </p>
                    </div>
                  ) : (
                    <FormField
                      control={form.control}
                      name="competitionId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Competição</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a competição" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {competitions.map(comp => (
                                <SelectItem key={comp.id} value={comp.id}>
                                  {comp.name}
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    {GENDER_CATEGORY_LABELS[comp.genderCategory]}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {lockedCompetition ? (
                      <div>
                        <p className="text-sm font-medium mb-2">Modalidade</p>
                        <div className="p-4 rounded-xl border-2 border-accent/40 bg-accent/5 flex items-center gap-3">
                          {lockedCompetition.modality === 'indoor' ? (
                            <Volleyball className="w-8 h-8 text-indoor" />
                          ) : (
                            <Waves className="w-8 h-8 text-beach" />
                          )}
                          <span className="font-medium">
                            {lockedCompetition.modality === 'indoor' ? 'Quadra' : 'Praia'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <FormField
                        control={form.control}
                        name="modality"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Modalidade</FormLabel>
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  field.onChange('indoor');
                                  form.setValue('playerFormat', '6x6');
                                  form.setValue('setFormat', '3-sets');
                                }}
                                className={cn(
                                  'p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2',
                                  field.value === 'indoor'
                                    ? 'border-indoor bg-indoor/10'
                                    : 'border-border hover:border-indoor/50'
                                )}
                              >
                                <Volleyball className={cn('w-8 h-8', field.value === 'indoor' ? 'text-indoor' : 'text-muted-foreground')} />
                                <span className={cn('font-medium', field.value === 'indoor' ? 'text-indoor' : 'text-foreground')}>Quadra</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  field.onChange('beach');
                                  form.setValue('playerFormat', '2x2');
                                  form.setValue('setFormat', '2-sets');
                                }}
                                className={cn(
                                  'p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2',
                                  field.value === 'beach'
                                    ? 'border-beach bg-beach/10'
                                    : 'border-border hover:border-beach/50'
                                )}
                              >
                                <Waves className={cn('w-8 h-8', field.value === 'beach' ? 'text-beach' : 'text-muted-foreground')} />
                                <span className={cn('font-medium', field.value === 'beach' ? 'text-beach' : 'text-foreground')}>Praia</span>
                              </button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="playerFormat"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Formato de Jogadores</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={Boolean(lockedCompetition)}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {modality === 'indoor' ? (
                                  <>
                                    <SelectItem value="6x6">6x6 (Tradicional)</SelectItem>
                                    <SelectItem value="4x4">4x4</SelectItem>
                                  </>
                                ) : (
                                  <>
                                    <SelectItem value="2x2">2x2 (Duplas)</SelectItem>
                                    <SelectItem value="3x3">3x3 (Trios)</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="setFormat"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Formato de Sets</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={Boolean(lockedCompetition)}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {modality === 'indoor' ? (
                                  <>
                                    <SelectItem value="3-sets">Melhor de 3 sets</SelectItem>
                                    <SelectItem value="5-sets">Melhor de 5 sets</SelectItem>
                                  </>
                                ) : (
                                  <>
                                    <SelectItem value="1-set">1 set (21 pontos)</SelectItem>
                                    <SelectItem value="2-sets">Melhor de 2 sets</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Teams */}
              {step === 2 && (
                <div className="space-y-6">
                  {lockedCompetition && filteredTeams.length === 0 && (
                    <div className="p-3 rounded-lg border border-destructive/40 bg-destructive/5 text-sm text-destructive">
                      Nenhuma equipe inscrita nesta competição. Faça as inscrições antes de agendar partidas.
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="round"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rodada</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="matchNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número do Jogo</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-6 items-end">
                    <FormField
                      control={form.control}
                      name="teamAId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-teamA/10 text-teamA border-teamA">A</Badge>
                            Equipe A
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-14">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {filteredTeams.map(team => (
                                <SelectItem key={team.id} value={team.id}>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-muted-foreground">{team.shortName}</span>
                                    <span>{team.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center justify-center pb-2">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-lg font-bold text-muted-foreground">VS</span>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="teamBId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-teamB/10 text-teamB border-teamB">B</Badge>
                            Equipe B
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-14">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableTeamsForB.map(team => (
                                <SelectItem key={team.id} value={team.id}>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-muted-foreground">{team.shortName}</span>
                                    <span>{team.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Venue, Date & Referees */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="venue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Local
                          </FormLabel>
                          <Select
                            onValueChange={v => {
                              field.onChange(v);
                              form.setValue('court', '');
                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o local" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {venues.length === 0 && (
                                <SelectItem value="Ginásio Municipal">Ginásio Municipal</SelectItem>
                              )}
                              {venues.map(venue => (
                                <SelectItem key={venue.id} value={venue.name}>
                                  <div className="flex flex-col">
                                    <span>{venue.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {venue.address ?? `${venue.courts.length} quadra(s)`}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="court"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quadra/Arena</FormLabel>
                          {venueCourts.length > 0 ? (
                            <Select onValueChange={field.onChange} value={field.value ?? ''}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione a quadra" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {venueCourts.map(court => (
                                  <SelectItem key={court} value={court}>
                                    {court}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <FormControl>
                              <Input placeholder="Ex: Quadra Principal" {...field} />
                            </FormControl>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Data
                          </FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Horário
                          </FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-accent" />
                    Arbitragem
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="referee1Id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>1º Árbitro *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {referees.map(ref => (
                                <SelectItem key={ref.id} value={ref.id}>
                                  <div className="flex items-center gap-2">
                                    <span>{ref.name}</span>
                                    <Badge variant="outline" className="text-xs">{ref.level}</Badge>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="referee2Id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>2º Árbitro</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Opcional" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {referees.map(ref => (
                                <SelectItem key={ref.id} value={ref.id}>
                                  <div className="flex items-center gap-2">
                                    <span>{ref.name}</span>
                                    <Badge variant="outline" className="text-xs">{ref.level}</Badge>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="scorerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Apontador</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Opcional" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {referees.map(ref => (
                                <SelectItem key={ref.id} value={ref.id}>
                                  {ref.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="observations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Informações adicionais sobre a partida..."
                            className="resize-none"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Adicione notas ou instruções especiais para esta partida.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </motion.div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={step === 1}
              >
                Voltar
              </Button>

              <div className="flex items-center gap-3">
                {onCancel && (
                  <Button type="button" variant="ghost" onClick={onCancel}>
                    Cancelar
                  </Button>
                )}
                
                {step < totalSteps ? (
                  <Button type="button" variant="accent" onClick={nextStep}>
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button type="submit" variant="accent" className="gap-2">
                    <Save className="w-4 h-4" />
                    Agendar Partida
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </form>
      </Form>
    </Card>
  );
}
