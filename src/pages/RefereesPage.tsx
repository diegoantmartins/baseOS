/**
 * RefereesPage — Central Oficial de Arbitragem e Oficiais de Partida (BaseOS)
 * Rotas: /arbitros, /referees e /arbitragem
 *
 * Responsabilidades:
 * - Gestão do quadro de árbitros, apontadores e oficiais de mesa
 * - Visualização de níveis de certificação (Regional, Nacional, Internacional)
 * - Monitoramento em tempo real de status (Disponível, Em Jogo / Ocupado)
 * - Acompanhamento da escala de arbitragem por partida e data
 * - Gestão universal de estados via StateContainer
 * - Diálogos operacionais de cadastro, edição, perfil e escala completa
 *
 * Design System:
 * - Enterprise Dark SaaS (Zinc-950/900, Âmbar-500)
 * - Tipografia tabular mono para contadores e números de partidas
 * - Componentes universais: MainLayout, PageHeader, SectionCard, StatusBadge, DataTable, StateContainer
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Users2,
  Plus,
  Search,
  Award,
  Calendar,
  Clock,
  Edit,
  Eye,
  CheckCircle2,
  Building2,
  Activity,
  ShieldAlert,
  UserCheck,
  Filter,
  FileText,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/Section';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { StateContainer } from '@/components/ui/StateContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ContextualHelpButton } from '@/components/help/ContextualHelpButton';
import { dataAccess } from '@/services/dataAccess';
import { sortScheduleMatches } from '@/services/scheduleService';
import type { CompetitionRecord, MatchRecord, RefereeRecord } from '@/types/entities';

export type RefereeLevel = 'regional' | 'national' | 'international';

export interface RefereeView extends RefereeRecord {
  level: RefereeLevel;
  matchesRefereed: number;
  activeCompetitions: string[];
  status: 'available' | 'busy' | 'unavailable';
  nextMatch?: { date: string; teams: string; compName?: string };
}

const LEVELS: RefereeLevel[] = ['regional', 'national', 'international'];

export function RefereesPage() {
  const navigate = useNavigate();

  // Estados de dados
  const [referees, setReferees] = useState<RefereeView[]>([]);
  const [schedule, setSchedule] = useState<MatchRecord[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Filtros operacionais
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modais
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<RefereeView | null>(null);
  const [viewing, setViewing] = useState<RefereeView | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setIsError(false);
      const [refereeRows, matches, comps] = await Promise.all([
        dataAccess.listReferees(),
        dataAccess.listMatches(),
        dataAccess.listCompetitions(),
      ]);

      const upcoming = sortScheduleMatches(
        matches.filter((m) => new Date(m.scheduledTime).getTime() > Date.now())
      );
      setSchedule(upcoming);
      setCompetitions(comps);

      const now = Date.now();
      const compMap = new Map(comps.map((c) => [c.id, c.name]));

      const view: RefereeView[] = refereeRows.map((r) => {
        const mine = matches.filter((m) => m.referees.some((ref) => ref.name === r.name));
        const isBusy = mine.some(
          (m) =>
            m.status === 'in-progress' ||
            m.status === 'warmup' ||
            m.status === 'timeout' ||
            m.status === 'set-break',
        );
        const next = sortScheduleMatches(
          mine.filter((m) => m.status !== 'completed' && m.status !== 'homologated' && new Date(m.scheduledTime).getTime() > now)
        )[0];

        return {
          ...r,
          level: LEVELS.includes(r.level as RefereeLevel) ? (r.level as RefereeLevel) : 'regional',
          matchesRefereed: mine.filter((m) => m.status === 'completed' || m.status === 'homologated').length,
          activeCompetitions: mine
            .map((m) => compMap.get(m.competitionId) || m.competitionId)
            .filter((v, i, arr) => arr.indexOf(v) === i),
          status: isBusy ? 'busy' : 'available',
          nextMatch: next
            ? {
                date: next.scheduledTime,
                teams: `${next.teamAShortName || next.teamAName} vs ${next.teamBShortName || next.teamBName}`,
                compName: compMap.get(next.competitionId),
              }
            : undefined,
        };
      });

      setReferees(view);
    } catch (err: unknown) {
      setIsError(true);
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao carregar os dados de arbitragem.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const compName = useCallback(
    (id: string) => competitions.find((c) => c.id === id)?.name ?? id,
    [competitions],
  );

  const scheduleByReferee = useCallback(
    (name: string) => schedule.filter((m) => m.referees.some((ref) => ref.name === name)),
    [schedule],
  );

  // Filtragem da lista de oficiais
  const filteredReferees = useMemo(() => {
    return referees.filter((referee) => {
      if (levelFilter !== 'all' && referee.level !== levelFilter) return false;
      if (statusFilter !== 'all' && referee.status !== statusFilter) return false;

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesName = referee.name.toLowerCase().includes(q);
        const matchesLevel = referee.level.toLowerCase().includes(q);
        const matchesComp = referee.activeCompetitions.some((c) => c.toLowerCase().includes(q));
        if (!matchesName && !matchesLevel && !matchesComp) return false;
      }
      return true;
    });
  }, [referees, search, levelFilter, statusFilter]);

  // Ações de persistência
  const handleCreate = async (input: Omit<RefereeRecord, 'id'>) => {
    try {
      await dataAccess.createReferee(input);
      toast.success(`Oficial "${input.name}" cadastrado com sucesso!`);
      setCreateOpen(false);
      await refresh();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao cadastrar oficial.');
    }
  };

  const handleUpdate = async (id: string, updates: Partial<RefereeRecord>) => {
    try {
      await dataAccess.updateReferee(id, updates);
      toast.success('Dados do oficial atualizados com sucesso!');
      setEditing(null);
      await refresh();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar oficial.');
    }
  };

  // Métricas reais do resumo operacional
  const totalReferees = referees.length;
  const availableReferees = useMemo(
    () => referees.filter((r) => r.status === 'available').length,
    [referees],
  );
  const busyReferees = useMemo(
    () => referees.filter((r) => r.status === 'busy').length,
    [referees],
  );
  const totalMatchesRefereed = useMemo(
    () => referees.reduce((acc, r) => acc + r.matchesRefereed, 0),
    [referees],
  );

  // Colunas da DataTable de Árbitros
  const columns: DataTableColumn<RefereeView>[] = [
    {
      id: 'referee',
      header: 'Oficial / Árbitro',
      cell: ({ row }) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 font-semibold font-mono text-xs flex items-center justify-center shrink-0">
            {row.name
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')}
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="font-semibold text-xs text-foreground truncate">{row.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {row.activeCompetitions.length > 0
                ? row.activeCompetitions.join(', ')
                : 'Sem competições ativas'}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'level',
      header: 'Certificação',
      cell: ({ row }) => {
        const levelLabels: Record<RefereeLevel, string> = {
          regional: 'Regional',
          national: 'Nacional',
          international: 'Internacional',
        };
        return (
          <Badge
            variant="outline"
            className="text-[10px] py-0 px-2 h-5 border-zinc-800 bg-zinc-900 text-zinc-300 font-mono"
          >
            {levelLabels[row.level] || row.level}
          </Badge>
        );
      },
    },
    {
      id: 'matchesRefereed',
      header: 'Jogos Atuados',
      isNumeric: true,
      align: 'center',
      cell: ({ row }) => (
        <span className="font-mono tabular-nums text-xs font-semibold text-foreground">
          {row.matchesRefereed}
        </span>
      ),
    },
    {
      id: 'nextMatch',
      header: 'Próxima Atuação',
      cell: ({ row }) => {
        if (!row.nextMatch) {
          return <span className="text-[11px] text-muted-foreground italic">Nenhum agendado</span>;
        }
        return (
          <div className="text-xs min-w-0">
            <p className="font-medium text-foreground truncate text-[11px]">
              {row.nextMatch.teams}
            </p>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono tabular-nums">
              <Clock className="w-2.5 h-2.5 text-zinc-500" />
              {new Date(row.nextMatch.date).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
              })}{' '}
              às{' '}
              {new Date(row.nextMatch.date).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        );
      },
    },
    {
      id: 'status',
      header: 'Disponibilidade',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              row.status === 'busy'
                ? 'bg-amber-400 animate-pulse'
                : 'bg-emerald-400'
            }`}
          />
          <span className="text-xs text-foreground font-medium">
            {row.status === 'busy' ? 'Em Jogo' : 'Disponível'}
          </span>
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Ações',
      align: 'right',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-zinc-800 rounded-md"
            aria-label="Ver perfil do árbitro"
            onClick={(e) => {
              e.stopPropagation();
              setViewing(row);
            }}
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-zinc-800 rounded-md"
            aria-label="Editar dados do árbitro"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(row);
            }}
          >
            <Edit className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-3.5">
        {/* PageHeader Oficial */}
        <PageHeader
          title="Arbitragem e Oficiais"
          description="Gerencie o quadro de árbitros, oficiais de mesa, certificações e escalas das competições."
          primaryAction={
            <Button
              size="sm"
              className="gap-1.5 text-xs font-semibold shadow-none"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Oficial
            </Button>
          }
          secondaryActions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8 rounded-md border-border hover:bg-zinc-800/60 font-medium"
                onClick={() => navigate('/relatorios?report=arbitragem')}
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                Relatório Oficial
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8 rounded-md border-border hover:bg-zinc-800/60 font-medium"
                onClick={() => setScheduleOpen(true)}
              >
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                Ver Escala Completa
              </Button>
              <ContextualHelpButton
                articleId="gerenciar-arbitragem"
                label="Como escalar árbitros"
              />
            </div>
          }
        />

        {/* Gestão de Estados Universais */}
        <StateContainer
          isLoading={loading}
          isError={isError}
          errorTitle="Não foi possível carregar o quadro de arbitragem"
          errorDescription={errorMessage}
          onRetry={refresh}
          isEmpty={referees.length === 0}
          emptyTitle="Nenhum oficial cadastrado"
          emptyDescription="Cadastre árbitros e oficiais de mesa para designá-los às partidas dos campeonatos."
          emptyAction={
            <Button
              size="sm"
              className="gap-1.5 text-xs font-semibold shadow-none"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              Cadastrar Primeiro Oficial
            </Button>
          }
        >
          <div className="space-y-3.5">
            {/* Resumo Operacional em KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SectionCard density="dense" className="bg-card/70 border-border/80">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-0.5">
                  <span>Total de Oficiais</span>
                  <Users2 className="w-3.5 h-3.5 text-primary" />
                </div>
                <p className="text-xl font-bold font-mono tabular-nums text-foreground">
                  {totalReferees}
                </p>
              </SectionCard>

              <SectionCard density="dense" className="bg-card/70 border-border/80">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-0.5">
                  <span>Disponíveis</span>
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <p className="text-xl font-bold font-mono tabular-nums text-foreground">
                  {availableReferees}
                </p>
              </SectionCard>

              <SectionCard density="dense" className="bg-card/70 border-border/80">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-0.5">
                  <span>Em Jogo / Atuação</span>
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <p className="text-xl font-bold font-mono tabular-nums text-foreground">
                  {busyReferees}
                </p>
              </SectionCard>

              <SectionCard density="dense" className="bg-card/70 border-border/80">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-0.5">
                  <span>Jogos Concluídos</span>
                  <Award className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <p className="text-xl font-bold font-mono tabular-nums text-foreground">
                  {totalMatchesRefereed}
                </p>
              </SectionCard>
            </div>

            {/* Grid Principal: Tabela de Oficiais + Escala Recente */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Tabela de Oficiais */}
              <div className="lg:col-span-2 space-y-4">
                <SectionCard
                  title="Quadro de Oficiais"
                  description="Árbitros cadastrados e histórico de designações."
                  divided
                >
                  {/* Filtros e Busca */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                      <Input
                        placeholder="Buscar por nome, certificação ou competição..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-8 text-xs pl-8 bg-zinc-900 border-zinc-800"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Select value={levelFilter} onValueChange={setLevelFilter}>
                        <SelectTrigger className="w-[140px] text-xs h-8 bg-zinc-900 border-zinc-800">
                          <SelectValue placeholder="Certificação" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                          <SelectItem value="all" className="text-xs">Todas</SelectItem>
                          <SelectItem value="regional" className="text-xs">Regional</SelectItem>
                          <SelectItem value="national" className="text-xs">Nacional</SelectItem>
                          <SelectItem value="international" className="text-xs">Internacional</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[130px] text-xs h-8 bg-zinc-900 border-zinc-800">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                          <SelectItem value="all" className="text-xs">Todos</SelectItem>
                          <SelectItem value="available" className="text-xs">Disponíveis</SelectItem>
                          <SelectItem value="busy" className="text-xs">Em Jogo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Tabela Oficial */}
                  <DataTable
                    data={filteredReferees}
                    columns={columns}
                    emptyTitle="Nenhum oficial encontrado"
                    emptyDescription="Tente ajustar a busca ou os filtros de certificação e status."
                  />
                </SectionCard>
              </div>

              {/* Escala Recente */}
              <div className="lg:col-span-1 space-y-4">
                <SectionCard
                  title="Próximas Escalas"
                  description="Jogos futuros com equipes de arbitragem atribuídas."
                  density="dense"
                >
                  <div className="space-y-2.5">
                    {schedule.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">
                        Nenhum jogo futuro com árbitros escalados.
                      </p>
                    ) : (
                      schedule.slice(0, 4).map((m) => (
                        <div
                          key={m.id}
                          className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span className="font-mono tabular-nums">
                              {new Date(m.scheduledTime).toLocaleDateString('pt-BR', {
                                weekday: 'short',
                                day: '2-digit',
                                month: 'short',
                              })}{' '}
                              ·{' '}
                              {new Date(m.scheduledTime).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <span className="text-primary font-medium">{compName(m.competitionId)}</span>
                          </div>
                          <p className="font-semibold text-xs text-foreground truncate">
                            {m.teamAName} vs {m.teamBName}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1 border-t border-zinc-800/60">
                            <Users2 className="w-3 h-3 text-zinc-500 shrink-0" />
                            <span className="truncate">
                              {m.referees.map((r) => `${r.role ? `${r.role}: ` : ''}${r.name}`).join(', ') ||
                                'Oficiais a definir'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}

                    {schedule.length > 4 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs h-8 rounded-md border-border hover:bg-zinc-800/60 font-medium"
                        onClick={() => setScheduleOpen(true)}
                      >
                        Ver Todas as {schedule.length} Escalas
                      </Button>
                    )}
                  </div>
                </SectionCard>
              </div>
            </div>
          </div>
        </StateContainer>
      </div>

      {/* Diálogos Originais Preservados */}
      <RefereeFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />

      <RefereeFormDialog
        open={editing !== null}
        onOpenChange={(v) => {
          if (!v) setEditing(null);
        }}
        initial={editing ?? undefined}
        onSubmit={(updates) => editing && handleUpdate(editing.id, updates)}
        isEdit
      />

      <RefereeProfileDialog
        referee={viewing}
        schedule={viewing ? scheduleByReferee(viewing.name) : []}
        compName={compName}
        onClose={() => setViewing(null)}
      />

      <ScheduleDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        schedule={schedule}
        compName={compName}
      />
    </MainLayout>
  );
}

interface RefereeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: Omit<RefereeRecord, 'id'>) => Promise<void>;
  initial?: RefereeRecord;
  isEdit?: boolean;
}

function RefereeFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initial,
  isEdit,
}: RefereeFormDialogProps) {
  const [name, setName] = useState('');
  const [level, setLevel] = useState<RefereeLevel>('regional');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setLevel((initial?.level as RefereeLevel | undefined) ?? 'regional');
    }
  }, [open, initial]);

  const canSubmit = name.trim().length >= 2;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), level });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-border p-5 rounded-xl shadow-none">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-foreground">
            {isEdit ? 'Editar Oficial' : 'Novo Oficial'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Cadastre os dados cadastrais e certificação oficial CBV/FIVB.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1">
            <Label
              htmlFor="referee-name"
              className="text-[10px] uppercase font-semibold text-muted-foreground"
            >
              Nome Completo *
            </Label>
            <Input
              id="referee-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Carlos Alberto dos Santos"
              className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
              Nível de Certificação
            </Label>
            <Select value={level} onValueChange={(v: RefereeLevel) => setLevel(v)}>
              <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="regional" className="text-xs">
                  Regional (Federação Estadual)
                </SelectItem>
                <SelectItem value="national" className="text-xs">
                  Nacional (CBV)
                </SelectItem>
                <SelectItem value="international" className="text-xs">
                  Internacional (FIVB)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
            className="h-8 text-xs rounded-md font-medium shadow-none"
          >
            {submitting ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Cadastrar Oficial'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RefereeProfileDialog({
  referee,
  schedule,
  compName,
  onClose,
}: {
  referee: RefereeView | null;
  schedule: MatchRecord[];
  compName: (id: string) => string;
  onClose: () => void;
}) {
  return (
    <Dialog open={referee !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-border p-5 rounded-xl shadow-none">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-foreground">
            Perfil do Oficial
          </DialogTitle>
        </DialogHeader>
        {referee && (
          <div className="space-y-3 py-1 text-xs">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800">
              <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 font-semibold font-mono flex items-center justify-center text-xs text-zinc-200">
                {referee.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{referee.name}</p>
                <p className="text-[11px] text-muted-foreground capitalize">
                  Certificação {referee.level}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 rounded-md bg-zinc-900 border border-zinc-800 space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Jogos Atuados
                </span>
                <p className="text-sm font-bold font-mono text-foreground">
                  {referee.matchesRefereed} partidas
                </p>
              </div>
              <div className="p-2.5 rounded-md bg-zinc-900 border border-zinc-800 space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Competições
                </span>
                <p className="text-sm font-bold font-mono text-foreground">
                  {referee.activeCompetitions.length} ativas
                </p>
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1.5">
                Próximas Escalas Atribuídas
              </p>
              {schedule.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">
                  Nenhum jogo futuro atribuído.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {schedule.map((m) => (
                    <div
                      key={m.id}
                      className="text-xs p-2 rounded-md bg-zinc-900 border border-zinc-800 space-y-0.5"
                    >
                      <p className="font-semibold text-foreground">
                        {m.teamAName} vs {m.teamBName}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {compName(m.competitionId)} ·{' '}
                        {new Date(m.scheduledTime).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                        })}{' '}
                        às{' '}
                        {new Date(m.scheduledTime).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        <DialogFooter className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScheduleDialog({
  open,
  onOpenChange,
  schedule,
  compName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: MatchRecord[];
  compName: (id: string) => string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-zinc-950 border-border p-5 rounded-xl shadow-none">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-foreground">
            Escala Geral de Arbitragem
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Visualização consolidada de todas as partidas futuras e equipes de arbitragem escaladas.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-96 overflow-y-auto space-y-2 py-1 text-xs">
          {schedule.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              Nenhuma escala futura registrada.
            </p>
          ) : (
            schedule.map((match) => (
              <div
                key={match.id}
                className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1.5"
              >
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="font-mono tabular-nums">
                    {new Date(match.scheduledTime).toLocaleDateString('pt-BR', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                    })}{' '}
                    ·{' '}
                    {new Date(match.scheduledTime).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="text-primary font-medium">{compName(match.competitionId)}</span>
                </div>
                <p className="font-semibold text-foreground text-xs">
                  {match.teamAName} vs {match.teamBName}
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1 border-t border-zinc-800/60">
                  <Building2 className="w-3 h-3 text-zinc-500 shrink-0" />
                  <span className="truncate">
                    {match.referees.map((ref) => `${ref.role ? `${ref.role}: ` : ''}${ref.name}`).join(', ') ||
                      'Oficiais a definir'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
        <DialogFooter className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RefereesPage;