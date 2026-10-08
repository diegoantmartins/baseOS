/**
 * OrganizationPortalPage — Fase 1
 *
 * Dashboard da organização para Admin/Organizer.
 * Rota: /org/:organizationId
 *
 * Exibe dados reais: campeonatos, equipes, membros.
 * Estado vazio orientado à ação.
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  Trophy,
  Users,
  UserCheck,
  Plus,
  ArrowRight,
  ChevronRight,
  AlertCircle,
  Settings,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { dataAccess } from '@/services/dataAccess';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/components/auth/useAuth';
import type { OrganizationRecord } from '@/types/identity';
import type { CompetitionRecord, TeamRecord } from '@/types/entities';
import { toast } from 'sonner';

export default function OrganizationPortalPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { setOrganizationId, currentOrganizationId, isPlatformAdmin } = useTenant();

  const [org, setOrg] = useState<OrganizationRecord | null>(null);
  const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!organizationId) return;
    try {
      setLoading(true);

      // Segurança: verificar se o usuário tem acesso a esta organização
      if (!isPlatformAdmin && session?.user?.organizationId !== organizationId) {
        // Verificar se tem membership ativo
        const memberships = session?.user?.id
          ? await dataAccess.listUserMemberships(session.user.id)
          : [];
        const hasMembership = memberships.some(
          (m) => m.organizationId === organizationId && m.status === 'active'
        );
        if (!hasMembership) {
          toast.error('Acesso negado a esta organização.');
          navigate('/dashboard');
          return;
        }
      }

      const [orgData, comps, teamsData, members] = await Promise.all([
        dataAccess.getOrganizationById(organizationId),
        dataAccess.listOrganizationCompetitions(organizationId),
        dataAccess.listOrganizationTeams(organizationId),
        dataAccess.listOrganizationMembers(organizationId),
      ]);

      if (!orgData) {
        toast.error('Organização não encontrada.');
        navigate('/dashboard');
        return;
      }

      setOrg(orgData);
      setCompetitions(comps);
      setTeams(teamsData);
      setMemberCount(members.length);

      // Sincronizar contexto de tenant se necessário
      if (currentOrganizationId !== organizationId) {
        setOrganizationId(organizationId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar organização.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [organizationId, session?.user, isPlatformAdmin, currentOrganizationId, setOrganizationId, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 w-64 bg-slate-200 dark:bg-zinc-800 rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-slate-100 dark:bg-zinc-900 rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-slate-100 dark:bg-zinc-900 rounded-xl" />
        </div>
      </MainLayout>
    );
  }

  if (!org) return null;

  const activeComps = competitions.filter(
    (c) => c.status === 'in-progress' || c.status === 'playoffs' || c.status === 'registration-open' || c.status === 'groups-defined' || c.status === 'registration-closed' || c.status === 'registration'
  );
  const upcomingComps = competitions.filter(
    (c) => c.status === 'planning' || c.status === 'draft' || c.status === 'draw-pending'
  );

  return (
    <MainLayout>
      <div className="space-y-6 pb-12">

        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
                {org.name.charAt(0).toUpperCase()}
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 text-[11px] font-semibold px-2 py-0.5">
                Ativa
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {org.name}
            </h1>
            {org.legalName && (
              <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">{org.legalName}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/organizacoes/${organizationId}`)}
              className="gap-1.5 text-xs h-9 border-slate-200 dark:border-zinc-800"
            >
              <Settings className="w-3.5 h-3.5" />
              Configurações
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/competicoes')}
              className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs h-9 px-4 rounded-full shadow-sm gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo campeonato
            </Button>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            icon={Trophy}
            label="Campeonatos"
            value={competitions.length}
            sub={activeComps.length > 0 ? `${activeComps.length} ativo(s)` : 'Nenhum ativo'}
            iconColor="text-amber-600"
            iconBg="bg-amber-50 dark:bg-amber-950/40"
          />
          <MetricCard
            icon={Users}
            label="Equipes"
            value={teams.length}
            sub={teams.length === 0 ? 'Nenhuma equipe cadastrada' : 'equipes cadastradas'}
            iconColor="text-blue-700"
            iconBg="bg-blue-50 dark:bg-blue-950/40"
          />
          <MetricCard
            icon={UserCheck}
            label="Membros"
            value={memberCount}
            sub={memberCount === 0 ? 'Nenhum membro vinculado' : 'membros ativos'}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50 dark:bg-emerald-950/40"
          />
        </div>

        {/* Campeonatos */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Campeonatos</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/competicoes')}
              className="text-xs text-amber-600 hover:text-amber-700 gap-1"
            >
              Ver todos
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {competitions.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="Nenhum campeonato criado ainda."
              description="Comece criando o primeiro campeonato da sua organização."
              actionLabel="Criar campeonato"
              onAction={() => navigate('/competicoes')}
            />
          ) : (
            <div className="space-y-2">
              {competitions.slice(0, 5).map((comp) => (
                <Link
                  key={comp.id}
                  to={`/competicoes/${comp.id}`}
                  className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl hover:border-amber-200 dark:hover:border-amber-800/50 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-600 flex items-center justify-center shrink-0">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                        {comp.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">
                        {comp.modality || 'Voleibol'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <CompetitionStatusBadge status={comp.status} />
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-amber-500 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Equipes */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Equipes</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/equipes')}
              className="text-xs text-amber-600 hover:text-amber-700 gap-1"
            >
              Ver todas
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {teams.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nenhuma equipe cadastrada."
              description="Cadastre as equipes que participarão dos campeonatos desta organização."
              actionLabel="Cadastrar equipe"
              onAction={() => navigate('/equipes')}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {teams.slice(0, 6).map((team) => (
                <div
                  key={team.id}
                  className="flex items-center gap-3 p-3.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl hover:border-slate-300 dark:hover:border-zinc-700 transition-all"
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                    {team.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">{team.name}</p>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">
                      {team.city || '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </MainLayout>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  sub: string;
  iconColor: string;
  iconBg: string;
}

function MetricCard({ icon: Icon, label, value, sub, iconColor, iconBg }: MetricCardProps) {
  return (
    <Card className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-sm">
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
            {label}
          </p>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{value}</p>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">{sub}</p>
        </div>
        <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
      </CardContent>
    </Card>
  );
}

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 bg-slate-50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 text-center gap-3">
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
        <Icon className="w-6 h-6 text-slate-400 dark:text-zinc-500" />
      </div>
      <div>
        <p className="font-semibold text-slate-700 dark:text-zinc-300 text-sm">{title}</p>
        <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1 max-w-xs mx-auto">{description}</p>
      </div>
      <Button
        size="sm"
        onClick={onAction}
        className="mt-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs h-8 px-4 rounded-full gap-1.5"
      >
        <Plus className="w-3.5 h-3.5" />
        {actionLabel}
      </Button>
    </div>
  );
}

function CompetitionStatusBadge({ status }: { status?: string }) {
  const map: Record<string, { label: string; className: string }> = {
    'in-progress': { label: 'Em andamento', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800' },
    'playoffs': { label: 'Eliminatórias', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800' },
    'registration-open': { label: 'Inscrições Abertas', className: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400 border-blue-300 dark:border-blue-800' },
    'groups-defined': { label: 'Grupos Definidos', className: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400 border-blue-300 dark:border-blue-800' },
    'planning': { label: 'Planejamento', className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border-amber-300 dark:border-amber-800' },
    'draft': { label: 'Rascunho', className: 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-400 border-slate-300 dark:border-zinc-700' },
    'completed': { label: 'Encerrado', className: 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-500 border-slate-200 dark:border-zinc-700' },
  };
  const config = map[status || ''] || map['draft'];
  return (
    <Badge className={`${config.className} border text-[11px] font-semibold`}>{config.label}</Badge>
  );
}
