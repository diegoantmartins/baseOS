/**
 * AthletesPage — Gestão Profissional de Atletas e Elencos do BaseOS
 * Rota: /atletas
 *
 * Responsabilidades:
 * - Listagem tabular de atletas inscritos em todas as competições e equipes
 * - Resumo operacional com métricas consolidadas (Total, Quadra, Praia, Equipes)
 * - Filtros rápidos em tempo real: Busca (nome/documento/posição), Equipe, Modalidade, Gênero e Camisa
 * - Identificação visual refinada para Capitão e Líbero
 * - Exportação de Relação Nominal Geral em PDF (Relatórios de Delegação)
 * - Acesso direto ao formulário público de inscrição da equipe
 * - Transferência de atletas entre agremiações inscritas
 * - Cadastro de novos atletas com validação
 * - Tratamento dos 4 estados universais (Loading, Normal, Empty, Error com Retry) via StateContainer
 *
 * Design System:
 * - Enterprise Dark SaaS (Zinc-950/900, Âmbar-500)
 * - Tipografia tabular mono para camisas, idades e contagens esportivas
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Plus,
  Search,
  MoreVertical,
  FileDown,
  ArrowRightLeft,
  Users,
  Trophy,
  ShieldCheck,
  Award,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { dataAccess } from '@/services/dataAccess';
import { CompetitionRegistrationService } from '@/services/competitionRegistrationService';
import { generateTeamRosterReportPdf, downloadReportsPdf } from '@/lib/pdf/reportsPdf';
import { ContextualHelpButton } from '@/components/help/ContextualHelpButton';
import { useCapability } from '@/hooks/useCapability';
import type { CompetitionAthlete, CompetitionTeam } from '@/types/registration';

export interface AthleteView extends CompetitionAthlete {
  teamName: string;
  teamShortName: string;
  modality: 'indoor' | 'beach';
  competitionName: string;
  age?: number;
}

function ageFromBirthDate(birthDate?: string): number | undefined {
  if (!birthDate) return undefined;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return undefined;
  const diff = Date.now() - birth.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

export function AthletesPage() {
  const navigate = useNavigate();
  const { can } = useCapability();

  // Estados de dados
  const [athletes, setAthletes] = useState<AthleteView[]>([]);
  const [availableTeams, setAvailableTeams] = useState<
    (CompetitionTeam & { teamName: string; competitionName: string })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Estados de filtros
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [modalityFilter, setModalityFilter] = useState<'all' | 'indoor' | 'beach'>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');

  // Estados de modais
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [transferAthlete, setTransferAthlete] = useState<AthleteView | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setIsError(false);
      const [rows, competitionTeams, teams, competitions] = await Promise.all([
        dataAccess.listCompetitionAthletes(),
        dataAccess.listCompetitionTeams(),
        dataAccess.listTeams(),
        dataAccess.listCompetitions(),
      ]);

      const ctById = new Map(competitionTeams.map((ct) => [ct.id, ct]));
      const teamById = new Map(teams.map((t) => [t.id, t]));
      const compById = new Map(competitions.map((c) => [c.id, c]));

      const view: AthleteView[] = rows.map((a) => {
        const ct = ctById.get(a.competitionTeamId);
        const team = ct ? teamById.get(ct.teamId) : undefined;
        const comp = ct ? compById.get(ct.competitionId) : undefined;
        return {
          ...a,
          teamName: team?.name ?? 'Equipe não encontrada',
          teamShortName: team?.shortName ?? '—',
          modality: team?.modality ?? comp?.modality ?? 'indoor',
          competitionName: comp?.name ?? 'Competição',
          age: ageFromBirthDate(a.birthDate),
        };
      });

      setAvailableTeams(
        competitionTeams.map((ct) => ({
          ...ct,
          teamName: teamById.get(ct.teamId)?.name ?? 'Equipe Desconhecida',
          competitionName: compById.get(ct.competitionId)?.name ?? 'Competição',
        })),
      );
      setAthletes(view);
    } catch (err: unknown) {
      setIsError(true);
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao carregar a lista de atletas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Filtragem de atletas
  const filteredAthletes = useMemo(() => {
    return athletes.filter((athlete) => {
      if (modalityFilter !== 'all' && athlete.modality !== modalityFilter) return false;
      if (genderFilter !== 'all' && athlete.gender !== genderFilter) return false;
      if (teamFilter !== 'all' && athlete.competitionTeamId !== teamFilter) return false;
      if (search) {
        const term = search.toLowerCase();
        const matchesName = athlete.name.toLowerCase().includes(term);
        const matchesTeam = athlete.teamName.toLowerCase().includes(term);
        const matchesShort = athlete.teamShortName.toLowerCase().includes(term);
        const matchesPosition = athlete.position ? athlete.position.toLowerCase().includes(term) : false;
        const matchesDoc = athlete.documentNumber ? athlete.documentNumber.toLowerCase().includes(term) : false;
        const matchesJersey = athlete.jerseyNumber !== undefined ? String(athlete.jerseyNumber) === term : false;
        if (!matchesName && !matchesTeam && !matchesShort && !matchesPosition && !matchesDoc && !matchesJersey) {
          return false;
        }
      }
      return true;
    });
  }, [athletes, modalityFilter, genderFilter, teamFilter, search]);

  // Métricas do resumo operacional
  const indoorCount = useMemo(() => athletes.filter((a) => a.modality === 'indoor').length, [athletes]);
  const beachCount = useMemo(() => athletes.filter((a) => a.modality === 'beach').length, [athletes]);
  const registeredTeamsCount = useMemo(() => new Set(athletes.map((a) => a.competitionTeamId)).size, [athletes]);

  const openTeamRegistration = async (athlete: AthleteView) => {
    const ct = await dataAccess.getCompetitionTeamById(athlete.competitionTeamId);
    if (ct?.accessToken) {
      navigate(`/equipe/inscricao/${ct.accessToken}`);
    } else {
      toast.info('Link de inscrição não disponível para esta equipe.');
    }
  };

  const handleRegister = async (data: Omit<CompetitionAthlete, 'id' | 'createdAt' | 'updatedAt'>) => {
    const targetCt = availableTeams.find((t) => t.id === data.competitionTeamId);
    if (!targetCt) {
      toast.error('Equipe selecionada não encontrada.');
      return;
    }
    const comp = await dataAccess.getCompetition(targetCt.competitionId);
    if (!comp) {
      toast.error('Competição não encontrada.');
      return;
    }
    const [existingRoster, allAthletes] = await Promise.all([
      dataAccess.listCompetitionAthletes(data.competitionTeamId),
      dataAccess.listCompetitionAthletes(),
    ]);

    const check = CompetitionRegistrationService.validateAthleteRegistration(
      comp,
      targetCt,
      data,
      existingRoster,
      allAthletes,
    );
    if (!check.valid) {
      check.errors.forEach((e) => toast.error(e));
      return;
    }

    await dataAccess.createCompetitionAthlete(data);
    toast.success('Atleta cadastrado com sucesso!');
    setRegistrationOpen(false);
    refresh();
  };

  const handleTransfer = async (athleteId: string, newCompetitionTeamId: string) => {
    const athlete = athletes.find((a) => a.id === athleteId);
    if (!athlete) {
      toast.error('Atleta não encontrado.');
      return;
    }
    const [sourceCt, targetCt, targetRoster, allMatches] = await Promise.all([
      dataAccess.getCompetitionTeamById(athlete.competitionTeamId),
      dataAccess.getCompetitionTeamById(newCompetitionTeamId),
      dataAccess.listCompetitionAthletes(newCompetitionTeamId),
      dataAccess.listMatches(),
    ]);
    if (!sourceCt || !targetCt) {
      toast.error('Equipe de origem ou destino não encontrada.');
      return;
    }
    const comp = await dataAccess.getCompetition(targetCt.competitionId);
    if (!comp) {
      toast.error('Competição de destino não encontrada.');
      return;
    }

    const check = CompetitionRegistrationService.canTransferAthlete(
      athlete,
      sourceCt,
      targetCt,
      comp,
      targetRoster,
      allMatches,
    );
    if (!check.ok) {
      check.errors.forEach((e) => toast.error(e));
      return;
    }

    await dataAccess.updateCompetitionAthlete(athleteId, { competitionTeamId: newCompetitionTeamId });
    toast.success('Atleta transferido de equipe com sucesso!');
    setTransferAthlete(null);
    refresh();
  };

  const handleExportRoster = async () => {
    try {
      const [rows, competitionTeams, teams] = await Promise.all([
        dataAccess.listCompetitionAthletes(),
        dataAccess.listCompetitionTeams(),
        dataAccess.listTeams(),
      ]);
      const grouped = new Map<string, AthleteView[]>();
      for (const row of rows) {
        const ct = competitionTeams.find((c) => c.id === row.competitionTeamId);
        const team = ct ? teams.find((t) => t.id === ct.teamId) : undefined;
        const view: AthleteView = {
          ...row,
          teamName: team?.name ?? 'Equipe não encontrada',
          teamShortName: team?.shortName ?? '—',
          modality: team?.modality ?? 'indoor',
          competitionName: ct?.competitionId ?? 'Competição',
          age: ageFromBirthDate(row.birthDate),
        };
        const key = row.competitionTeamId;
        grouped.set(key, [...(grouped.get(key) ?? []), view]);
      }
      const doc = generateTeamRosterReportPdf(
        [...grouped.entries()].map(([ctId, list]) => {
          const ct = competitionTeams.find((c) => c.id === ctId);
          const team = ct ? teams.find((t) => t.id === ct.teamId) : undefined;
          return {
            name: list[0]?.teamName ?? 'Equipe',
            shortName: list[0]?.teamShortName ?? '—',
            coach: team?.coachName,
            logoUrl: team?.logoUrl,
            athletes: list.map((a) => ({
              jerseyNumber: a.jerseyNumber,
              name: a.name,
              position: a.position,
              documentNumber: a.documentNumber,
              isCaptain: a.isCaptain,
              isLibero: a.isLibero,
            })),
          };
        }),
        'Relatório Geral de Atletas',
      );
      downloadReportsPdf(doc, 'relacao_nominal_atletas.pdf');
      toast.success('Relação nominal gerada em PDF com sucesso!');
    } catch {
      toast.error('Erro ao gerar relatório em PDF.');
    }
  };

  // Colunas da DataTable Oficial de Atletas
  const columns: DataTableColumn<AthleteView>[] = [
    {
      id: 'jersey',
      header: 'Nº',
      isNumeric: true,
      cell: ({ row }) => (
        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 text-foreground font-mono font-bold text-xs flex items-center justify-center tabular-nums">
          {row.jerseyNumber ?? '—'}
        </div>
      ),
    },
    {
      id: 'name',
      header: 'Atleta',
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-foreground truncate">{row.name}</span>
            {row.isCaptain && (
              <Badge
                variant="outline"
                className="text-[9px] py-0 px-1 border-amber-500/40 text-amber-400 bg-amber-500/10 font-bold"
              >
                CAP
              </Badge>
            )}
            {row.isLibero && (
              <Badge
                variant="outline"
                className="text-[9px] py-0 px-1 border-emerald-500/40 text-emerald-400 bg-emerald-500/10 font-bold"
              >
                LÍBERO
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            {row.age !== undefined ? `${row.age} anos · ` : ''}
            {row.documentNumber ? `Doc: ${row.documentNumber}` : 'Documento não informado'}
          </p>
        </div>
      ),
    },
    {
      id: 'team',
      header: 'Equipe / Torneio',
      cell: ({ row }) => (
        <div className="min-w-0 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-foreground truncate">{row.teamName}</span>
            <Badge variant="outline" className="text-[9px] py-0 px-1 border-zinc-800 bg-zinc-900 text-zinc-400 font-mono">
              {row.teamShortName}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{row.competitionName}</p>
        </div>
      ),
    },
    {
      id: 'position',
      header: 'Posição',
      cell: ({ row }) => (
        <span className="text-xs font-medium text-muted-foreground">{row.position || 'Geral'}</span>
      ),
    },
    {
      id: 'modality',
      header: 'Modalidade',
      cell: ({ row }) => (
        <StatusBadge
          status={row.modality === 'indoor' ? 'in-progress' : 'registration-open'}
          customLabel={row.modality === 'indoor' ? 'Quadra' : 'Praia'}
          className="text-[10px] h-5"
        />
      ),
    },
    {
      id: 'gender',
      header: 'Gênero',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.gender === 'female' ? 'Feminino' : row.gender === 'male' ? 'Masculino' : '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Ações',
      align: 'right',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-zinc-800 rounded-md"
              aria-label={`Ações para o atleta ${row.name}`}
            >
              <MoreVertical className="w-3.5 h-3.5 text-zinc-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-xs">
            <DropdownMenuItem
              className="gap-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                openTeamRegistration(row);
              }}
            >
              <User className="w-3.5 h-3.5 text-zinc-400" /> Ver Inscrição da Equipe
            </DropdownMenuItem>
            {can('team:edit') && (
              <DropdownMenuItem
                className="gap-2 text-xs text-amber-400 hover:text-amber-300"
                onClick={(e) => {
                  e.stopPropagation();
                  setTransferAthlete(row);
                }}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" /> Transferir de Equipe
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-3.5">
        {/* ── PageHeader Oficial ── */}
        <PageHeader
          title="Gestão de Atletas"
          description="Controle nominal de atletas, numeração de camisas, designação de capitães e líberos e emissão de delegações."
          primaryAction={
            can('team:create') && (
              <Button
                size="sm"
                className="gap-1.5 text-xs font-semibold shadow-none"
                onClick={() => setRegistrationOpen(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Atleta
              </Button>
            )
          }
          secondaryActions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8 rounded-md border-border hover:bg-zinc-800/60"
                onClick={handleExportRoster}
                disabled={athletes.length === 0}
              >
                <FileDown className="w-3.5 h-3.5" />
                Relação Nominal (PDF)
              </Button>
              <ContextualHelpButton
                articles={[
                  { articleId: 'cadastrar-atleta', label: 'Como gerenciar o elenco' },
                  { articleId: 'definir-capitao-libero', label: 'Definir Capitão e Líberos' },
                  { articleId: 'cadastrar-equipe', label: 'Como cadastrar uma equipe' },
                ]}
                label="Ajuda em atletas"
              />
            </div>
          }
        />

        {/* ── Gestão de Estados Universais ── */}
        <StateContainer
          isLoading={loading}
          isError={isError}
          errorTitle="Não foi possível carregar os atletas"
          errorDescription={errorMessage}
          onRetry={refresh}
          isEmpty={athletes.length === 0}
          emptyTitle="Nenhum atleta cadastrado"
          emptyDescription="Cadastre o primeiro atleta ou envie o link de auto-inscrição para as agremiações esportivas preencherem seus elencos."
          emptyAction={
            can('team:create') ? (
              <Button
                size="sm"
                className="gap-1.5 text-xs font-semibold shadow-none"
                onClick={() => setRegistrationOpen(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                Cadastrar Primeiro Atleta
              </Button>
            ) : undefined
          }
        >
          <div className="space-y-3.5">
            {/* ── Resumo Operacional ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SectionCard density="dense" className="bg-card/70 border-border/80">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-0.5">
                  <span>Total de Atletas</span>
                  <Users className="w-3.5 h-3.5 text-primary" />
                </div>
                <p className="text-xl font-bold font-mono tabular-nums text-foreground">{athletes.length}</p>
              </SectionCard>

              <SectionCard density="dense" className="bg-card/70 border-border/80">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-0.5">
                  <span>Atletas de Quadra</span>
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <p className="text-xl font-bold font-mono tabular-nums text-foreground">{indoorCount}</p>
              </SectionCard>

              <SectionCard density="dense" className="bg-card/70 border-border/80">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-0.5">
                  <span>Atletas de Praia</span>
                  <Award className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <p className="text-xl font-bold font-mono tabular-nums text-foreground">{beachCount}</p>
              </SectionCard>

              <SectionCard density="dense" className="bg-card/70 border-border/80">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-0.5">
                  <span>Equipes Inscritas</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                </div>
                <p className="text-xl font-bold font-mono tabular-nums text-foreground">
                  {registeredTeamsCount}
                </p>
              </SectionCard>
            </div>

            {/* ── Controles & Tabela de Atletas ── */}
            <SectionCard
              title="Elenco Geral de Atletas"
              description="Relação consolidada de atletas inscritos, posições táticas e distribuição por equipe."
              divided
            >
              {/* Barra de Filtros Responsiva */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 pb-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                  <Input
                    placeholder="Buscar por nome, documento, posição ou camisa..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 text-xs pl-8 bg-zinc-900 border-zinc-800"
                  />
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                  {/* Filtro por Equipe */}
                  <Select value={teamFilter} onValueChange={setTeamFilter}>
                    <SelectTrigger className="w-full sm:w-44 h-8 text-xs bg-zinc-900 border-zinc-800">
                      <SelectValue placeholder="Todas as Equipes" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="all" className="text-xs">Todas as Equipes</SelectItem>
                      {availableTeams.map((t) => (
                        <SelectItem key={t.id} value={t.id} className="text-xs">
                          {t.teamName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Filtro por Gênero */}
                  <Select value={genderFilter} onValueChange={(v: typeof genderFilter) => setGenderFilter(v)}>
                    <SelectTrigger className="w-full sm:w-32 h-8 text-xs bg-zinc-900 border-zinc-800">
                      <SelectValue placeholder="Gênero" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="all" className="text-xs">Todos os Gêneros</SelectItem>
                      <SelectItem value="female" className="text-xs">Feminino</SelectItem>
                      <SelectItem value="male" className="text-xs">Masculino</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Botões de Modalidade */}
                  <div className="flex items-center gap-1 w-full sm:w-auto">
                    <Button
                      variant={modalityFilter === 'all' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-8 text-xs px-2.5 flex-1 sm:flex-initial"
                      onClick={() => setModalityFilter('all')}
                    >
                      Todas ({athletes.length})
                    </Button>
                    <Button
                      variant={modalityFilter === 'indoor' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-8 text-xs px-2.5 flex-1 sm:flex-initial"
                      onClick={() => setModalityFilter('indoor')}
                    >
                      Quadra
                    </Button>
                    <Button
                      variant={modalityFilter === 'beach' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-8 text-xs px-2.5 flex-1 sm:flex-initial"
                      onClick={() => setModalityFilter('beach')}
                    >
                      Praia
                    </Button>
                  </div>
                </div>
              </div>

              {/* DataTable Oficial */}
              <DataTable
                data={filteredAthletes}
                columns={columns}
                emptyTitle="Nenhum atleta encontrado para os filtros selecionados"
                emptyDescription="Tente buscar por outro termo, alterar a equipe ou remover os filtros aplicados."
              />
            </SectionCard>
          </div>
        </StateContainer>
      </div>

      {/* ── Modal de Cadastro de Atleta ── */}
      <AthleteRegistrationDialog
        open={registrationOpen}
        onOpenChange={setRegistrationOpen}
        teams={availableTeams}
        onSave={handleRegister}
      />

      {/* ── Modal de Transferência de Atleta ── */}
      <AthleteTransferDialog
        open={!!transferAthlete}
        onOpenChange={(op) => !op && setTransferAthlete(null)}
        athlete={transferAthlete}
        teams={availableTeams}
        onTransfer={handleTransfer}
      />
    </MainLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal de Cadastro de Atleta
// ─────────────────────────────────────────────────────────────────────────────

interface AthleteRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: (CompetitionTeam & { teamName: string; competitionName: string })[];
  onSave: (data: Omit<CompetitionAthlete, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

function AthleteRegistrationDialog({ open, onOpenChange, teams, onSave }: AthleteRegistrationDialogProps) {
  const [name, setName] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('female');
  const [competitionTeamId, setCompetitionTeamId] = useState('');
  const [position, setPosition] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!competitionTeamId || !name.trim() || !documentNumber.trim()) return;
    onSave({
      competitionTeamId,
      name: name.trim(),
      documentNumber: documentNumber.trim(),
      gender,
      position: position.trim() || undefined,
      jerseyNumber: jerseyNumber ? parseInt(jerseyNumber, 10) : undefined,
      isCaptain: false,
      isLibero: false,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-border p-5 rounded-xl shadow-none">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-foreground">Cadastrar Novo Atleta</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Insira os dados do atleta e vincule-o à equipe inscrita correspondente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3.5 py-1">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Equipe Destino *</Label>
            <Select value={competitionTeamId} onValueChange={setCompetitionTeamId} required>
              <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                <SelectValue placeholder="Selecione a equipe inscrita" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">
                    {t.teamName} — {t.competitionName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="athlete-name" className="text-[10px] uppercase font-semibold text-muted-foreground">
              Nome Completo *
            </Label>
            <Input
              id="athlete-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Lucas Saatkamp"
              required
              className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label htmlFor="athlete-doc" className="text-[10px] uppercase font-semibold text-muted-foreground">
                Documento (RG/CPF) *
              </Label>
              <Input
                id="athlete-doc"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="Ex.: 12.345.678-9"
                required
                className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Gênero</Label>
              <Select value={gender} onValueChange={(v: 'male' | 'female') => setGender(v)}>
                <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="female" className="text-xs">Feminino</SelectItem>
                  <SelectItem value="male" className="text-xs">Masculino</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label htmlFor="athlete-pos" className="text-[10px] uppercase font-semibold text-muted-foreground">
                Posição Principal
              </Label>
              <Input
                id="athlete-pos"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Ex.: Ponteiro, Central, Levantador"
                className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="athlete-jersey" className="text-[10px] uppercase font-semibold text-muted-foreground">
                Nº da Camisa (1-99)
              </Label>
              <Input
                id="athlete-jersey"
                value={jerseyNumber}
                onChange={(e) => setJerseyNumber(e.target.value)}
                type="number"
                min={1}
                max={99}
                placeholder="Opcional"
                className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md font-mono"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60"
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" className="h-8 text-xs rounded-md font-medium shadow-none">
              Cadastrar Atleta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal de Transferência de Atleta
// ─────────────────────────────────────────────────────────────────────────────

interface AthleteTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athlete: AthleteView | null;
  teams: (CompetitionTeam & { teamName: string; competitionName: string })[];
  onTransfer: (athleteId: string, newCompetitionTeamId: string) => Promise<void>;
}

function AthleteTransferDialog({ open, onOpenChange, athlete, teams, onTransfer }: AthleteTransferDialogProps) {
  const [newTeamId, setNewTeamId] = useState('');

  useEffect(() => {
    if (open) setNewTeamId('');
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!athlete || !newTeamId) return;
    onTransfer(athlete.id, newTeamId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-border p-5 rounded-xl shadow-none">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-foreground">Transferir Atleta</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Mover o atleta <strong>{athlete?.name}</strong> para outra equipe inscrita.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3.5 py-1">
          <div className="p-2.5 bg-zinc-900/60 border border-zinc-800 rounded-lg text-xs">
            <p className="text-muted-foreground text-[10px] uppercase font-semibold">Equipe Atual:</p>
            <p className="font-medium text-foreground mt-0.5">
              {athlete?.teamName} — {athlete?.competitionName}
            </p>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Nova Equipe Destino *</Label>
            <Select value={newTeamId} onValueChange={setNewTeamId} required>
              <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                <SelectValue placeholder="Selecione a nova agremiação" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {teams
                  .filter((t) => t.id !== athlete?.competitionTeamId)
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.teamName} — {t.competitionName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!newTeamId}
              className="h-8 text-xs rounded-md font-medium shadow-none"
            >
              Confirmar Transferência
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AthletesPage;