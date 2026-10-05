import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  Users,
  Trophy,
  ShieldCheck,
  Mail,
  UserPlus,
  ArrowLeft,
  Search,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';
import { dataAccess } from '@/services/dataAccess';
import type {
  OrganizationRecord,
  OrganizationMemberDetail,
  OrganizationInvitation,
  MembershipRole,
  MembershipStatus,
} from '@/types/identity';
import type { TeamRecord, CompetitionRecord } from '@/types/entities';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/components/auth/useAuth';
import { TenantSecurityService } from '@/services/tenantSecurityService';
import { toast } from 'sonner';

interface OrganizationDetailPageProps {
  defaultTab?: string;
}

const ROLE_LABELS: Record<MembershipRole, string> = {
  admin: 'Administrador da Organização',
  organizer: 'Organizador',
  team_manager: 'Gestor de Equipe',
  coach: 'Técnico / Comissão',
  athlete: 'Atleta',
  referee: 'Árbitro',
  scorer: 'Apontador',
  viewer: 'Visualizador',
};

export default function OrganizationDetailPage({ defaultTab = 'members' }: OrganizationDetailPageProps) {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();

  const [org, setOrg] = useState<OrganizationRecord | null>(null);
  const [members, setMembers] = useState<OrganizationMemberDetail[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros de Membros
  const [memberSearch, setMemberSearch] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState<string>('all');
  const [memberStatusFilter, setMemberStatusFilter] = useState<string>('all');

  // Modal Convidar Membro
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MembershipRole>('team_manager');
  const [inviteTeamId, setInviteTeamId] = useState<string>('none');
  const [inviting, setInviting] = useState(false);

  // Modal Alterar Papel
  const [roleChangeMember, setRoleChangeMember] = useState<OrganizationMemberDetail | null>(null);
  const [newRole, setNewRole] = useState<MembershipRole>('viewer');
  const [updatingRole, setUpdatingRole] = useState(false);

  const loadOrgData = useCallback(async () => {
    if (!organizationId) return;
    try {
      setLoading(true);
      const [orgData, membersData, teamsData, compsData, invsData] = await Promise.all([
        dataAccess.getOrganizationById(organizationId),
        dataAccess.listOrganizationMembers(organizationId),
        dataAccess.listOrganizationTeams(organizationId),
        dataAccess.listOrganizationCompetitions(organizationId),
        dataAccess.listOrganizationInvitations(organizationId).catch(() => []),
      ]);

      if (!orgData) {
        toast.error('Organização não encontrada.');
        navigate('/organizacoes');
        return;
      }

      setOrg(orgData);
      setMembers(membersData);
      setTeams(teamsData);
      setCompetitions(compsData);
      setInvitations(invsData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar detalhes da organização.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [organizationId, navigate]);

  useEffect(() => {
    loadOrgData();
  }, [loadOrgData]);

  // Permissões
  const canManageMembers = useMemo(() => {
    return TenantSecurityService.canManageOrganizationMembers(session?.user, organizationId || '', members);
  }, [session?.user, organizationId, members]);

  // Ações de Membros
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId || !session?.user) return;

    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      toast.error('Informe um e-mail válido.');
      return;
    }

    const teamIdValue = inviteTeamId === 'none' ? undefined : inviteTeamId;

    // Validação de segurança prévia
    const isAllowed = TenantSecurityService.canInviteMember(
      session.user,
      organizationId,
      inviteRole,
      members,
      teamIdValue,
      teams,
    );

    if (!isAllowed) {
      toast.error('Você não possui autorização para enviar este convite.');
      return;
    }

    try {
      setInviting(true);
      await dataAccess.createOrganizationInvitation({
        organizationId,
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        teamId: teamIdValue,
        invitedBy: session.user.id,
      });

      toast.success(`Convite gerado para ${inviteEmail}.`);
      setIsInviteOpen(false);
      setInviteEmail('');
      setInviteRole('team_manager');
      setInviteTeamId('none');
      await loadOrgData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao emitir convite.';
      toast.error(msg);
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!roleChangeMember || !organizationId || !session?.user) return;

    if (roleChangeMember.userId === session.user.id) {
      toast.error('Não é permitido alterar o próprio papel.');
      return;
    }

    try {
      setUpdatingRole(true);
      await dataAccess.updateUserMembership(roleChangeMember.id, {
        role: newRole,
      });
      toast.success('Papel atualizado com sucesso.');
      setRoleChangeMember(null);
      await loadOrgData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar papel.';
      toast.error(msg);
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleChangeMemberStatus = async (member: OrganizationMemberDetail, nextStatus: MembershipStatus) => {
    if (!session?.user) return;

    if (member.userId === session.user.id) {
      toast.error('Não é permitido alterar o status da sua própria conta.');
      return;
    }

    try {
      await dataAccess.updateUserMembership(member.id, {
        status: nextStatus,
      });
      toast.success(`Membro atualizado para ${nextStatus === 'active' ? 'ativo' : 'suspenso'}.`);
      await loadOrgData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao alterar status.';
      toast.error(msg);
    }
  };

  const handleRemoveMember = async (member: OrganizationMemberDetail) => {
    if (!session?.user) return;

    if (member.userId === session.user.id) {
      toast.error('Não é permitido remover o seu próprio vínculo.');
      return;
    }

    if (!confirm(`Deseja realmente remover o membro ${member.userName || member.userId}?`)) {
      return;
    }

    try {
      await dataAccess.deleteUserMembership(member.id);
      toast.success('Membro removido da organização.');
      await loadOrgData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao remover membro.';
      toast.error(msg);
    }
  };

  const handleCancelInvitation = async (invId: string) => {
    try {
      await dataAccess.cancelOrganizationInvitation(invId);
      toast.success('Convite cancelado.');
      await loadOrgData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cancelar convite.';
      toast.error(msg);
    }
  };

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const term = memberSearch.toLowerCase();
      const matchesSearch =
        (m.userName && m.userName.toLowerCase().includes(term)) ||
        (m.userEmail && m.userEmail.toLowerCase().includes(term)) ||
        (m.teamName && m.teamName.toLowerCase().includes(term)) ||
        m.userId.toLowerCase().includes(term);

      const matchesRole = memberRoleFilter === 'all' || m.role === memberRoleFilter;
      const matchesStatus = memberStatusFilter === 'all' || m.status === memberStatusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [members, memberSearch, memberRoleFilter, memberStatusFilter]);

  if (loading) {
    return (
      <div className="container max-w-7xl mx-auto py-12 px-4 space-y-6">
        <div className="h-8 w-48 bg-zinc-900 animate-pulse rounded" />
        <div className="h-32 bg-zinc-900 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!org) return null;

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-in fade-in duration-300">
      {/* Navegação de Trilha (Breadcrumb) */}
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Link to="/organizacoes" className="hover:text-zinc-200 transition-colors">
          Organizações
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
        <span className="text-zinc-200 font-medium truncate">{org.name}</span>
      </div>

      {/* Cabeçalho da Organização */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center bg-zinc-900/60 p-6 rounded-xl border border-zinc-800/80 backdrop-blur-sm shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-2xl shadow-inner">
            <Building2 className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-zinc-100">{org.name}</h1>
              <Badge
                variant="outline"
                className={
                  org.status === 'active'
                    ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                    : 'border-rose-500/30 text-rose-400 bg-rose-500/10'
                }
              >
                {org.status === 'active' ? 'Ativa' : 'Bloqueada'}
              </Badge>
            </div>
            {org.legalName && <p className="text-xs text-zinc-400">{org.legalName}</p>}
            {org.documentNumber && (
              <p className="text-xs text-zinc-500 font-mono">Registro / CNPJ: {org.documentNumber}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <Button
            variant="outline"
            onClick={() => navigate('/organizacoes')}
            className="border-zinc-800 text-zinc-300 hover:bg-zinc-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          {canManageMembers && (
            <Button
              onClick={() => setIsInviteOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold shadow-sm"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Convidar Membro
            </Button>
          )}
        </div>
      </div>

      {/* Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-zinc-900/40 border-zinc-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500 font-medium">Total de Membros</p>
              <p className="text-2xl font-bold text-zinc-100 mt-1">{members.length}</p>
            </div>
            <Users className="w-8 h-8 text-zinc-700" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/40 border-zinc-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500 font-medium">Equipes Vinculadas</p>
              <p className="text-2xl font-bold text-zinc-100 mt-1">{teams.length}</p>
            </div>
            <ShieldCheck className="w-8 h-8 text-zinc-700" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/40 border-zinc-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500 font-medium">Torneios e Competições</p>
              <p className="text-2xl font-bold text-zinc-100 mt-1">{competitions.length}</p>
            </div>
            <Trophy className="w-8 h-8 text-zinc-700" />
          </CardContent>
        </Card>
      </div>

      {/* Abas Principais */}
      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="bg-zinc-900/80 border border-zinc-800 p-1 rounded-xl">
          <TabsTrigger value="members" className="data-[state=active]:bg-zinc-800 text-xs">
            Membros ({members.length})
          </TabsTrigger>
          <TabsTrigger value="teams" className="data-[state=active]:bg-zinc-800 text-xs">
            Equipes ({teams.length})
          </TabsTrigger>
          <TabsTrigger value="competitions" className="data-[state=active]:bg-zinc-800 text-xs">
            Competições ({competitions.length})
          </TabsTrigger>
          <TabsTrigger value="invitations" className="data-[state=active]:bg-zinc-800 text-xs">
            Convites Pendentes ({invitations.filter((i) => i.status === 'pending').length})
          </TabsTrigger>
        </TabsList>

        {/* ABA: MEMBROS */}
        <TabsContent value="members" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/80">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Buscar membro por nome, e-mail ou equipe..."
                className="pl-9 bg-zinc-950/70 border-zinc-800 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Select value={memberRoleFilter} onValueChange={setMemberRoleFilter}>
                <SelectTrigger className="w-[180px] bg-zinc-950/70 border-zinc-800 text-xs text-zinc-200">
                  <SelectValue placeholder="Papel" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                  <SelectItem value="all">Todos os Papéis</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="organizer">Organizador</SelectItem>
                  <SelectItem value="team_manager">Gestor de Equipe</SelectItem>
                  <SelectItem value="referee">Árbitro</SelectItem>
                  <SelectItem value="scorer">Apontador</SelectItem>
                  <SelectItem value="viewer">Visualizador</SelectItem>
                </SelectContent>
              </Select>

              <Select value={memberStatusFilter} onValueChange={setMemberStatusFilter}>
                <SelectTrigger className="w-[150px] bg-zinc-950/70 border-zinc-800 text-xs text-zinc-200">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="blocked">Suspenso</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-950/70 text-zinc-400 font-semibold text-xs border-b border-zinc-800 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Membro</th>
                  <th className="py-3 px-4">Papel</th>
                  <th className="py-3 px-4">Equipe Vinculada</th>
                  <th className="py-3 px-4">Status</th>
                  {canManageMembers && <th className="py-3 px-4 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50 text-zinc-200">
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-zinc-500">
                      Nenhum membro encontrado com os critérios informados.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((m) => {
                    const isSelf = session?.user?.id === m.userId;
                    return (
                      <tr key={m.id} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-zinc-100 flex items-center gap-2">
                            {m.userName || 'Usuário ' + m.userId.slice(0, 8)}
                            {isSelf && (
                              <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[10px]">
                                Você
                              </Badge>
                            )}
                          </div>
                          {m.userEmail && <div className="text-xs text-zinc-400">{m.userEmail}</div>}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="border-zinc-700 bg-zinc-800/60 text-zinc-300 font-normal">
                            {ROLE_LABELS[m.role] || m.role}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-zinc-400 text-xs">
                          {m.teamName ? (
                            <span className="font-medium text-zinc-200">{m.teamName}</span>
                          ) : (
                            <span className="text-zinc-500 italic">Nível Organizacional</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant="outline"
                            className={
                              m.status === 'active'
                                ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                                : m.status === 'blocked'
                                ? 'border-rose-500/30 text-rose-400 bg-rose-500/10'
                                : 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                            }
                          >
                            {m.status === 'active' ? 'Ativo' : m.status === 'blocked' ? 'Suspenso' : 'Pendente'}
                          </Badge>
                        </td>
                        {canManageMembers && (
                          <td className="py-3 px-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-100">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 text-zinc-200">
                                <DropdownMenuItem
                                  disabled={isSelf}
                                  onClick={() => {
                                    setRoleChangeMember(m);
                                    setNewRole(m.role);
                                  }}
                                  className="cursor-pointer focus:bg-zinc-800 text-xs"
                                >
                                  Alterar Papel
                                </DropdownMenuItem>

                                {m.status === 'active' ? (
                                  <DropdownMenuItem
                                    disabled={isSelf}
                                    onClick={() => handleChangeMemberStatus(m, 'blocked')}
                                    className="cursor-pointer focus:bg-zinc-800 text-amber-400 text-xs"
                                  >
                                    Suspender Acesso
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    disabled={isSelf}
                                    onClick={() => handleChangeMemberStatus(m, 'active')}
                                    className="cursor-pointer focus:bg-zinc-800 text-emerald-400 text-xs"
                                  >
                                    Reativar Acesso
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuItem
                                  disabled={isSelf}
                                  onClick={() => handleRemoveMember(m)}
                                  className="cursor-pointer focus:bg-zinc-800 text-rose-400 text-xs"
                                >
                                  Remover Membro
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ABA: EQUIPES */}
        <TabsContent value="teams" className="space-y-4">
          {teams.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl text-zinc-500">
              Nenhuma equipe vinculada diretamente a esta organização.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team) => (
                <Card key={team.id} className="bg-zinc-900/40 border-zinc-800">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-zinc-100">{team.name}</h4>
                      <Badge variant="outline" className="border-zinc-700 text-xs">
                        {team.shortName}
                      </Badge>
                    </div>
                    <div className="text-xs text-zinc-400 space-y-1">
                      <p>Modalidade: {team.modality}</p>
                      {team.genderCategory && <p>Gênero: {team.genderCategory}</p>}
                      {team.coachName && <p>Técnico: {team.coachName}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ABA: COMPETIÇÕES */}
        <TabsContent value="competitions" className="space-y-4">
          {competitions.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl text-zinc-500">
              Nenhuma competição associada a esta organização.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {competitions.map((comp) => (
                <Card key={comp.id} className="bg-zinc-900/40 border-zinc-800">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-zinc-100">{comp.name}</h4>
                      <Badge variant="outline" className="border-zinc-700 text-xs">
                        {comp.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-zinc-400 space-y-1">
                      <p>Modalidade: {comp.modality}</p>
                      <p>Formato: {comp.format}</p>
                      {comp.startDate && <p>Início: {comp.startDate}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ABA: CONVITES */}
        <TabsContent value="invitations" className="space-y-4">
          {invitations.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl text-zinc-500">
              Nenhum convite emitido no momento.
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-950/70 text-zinc-400 font-semibold text-xs border-b border-zinc-800 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">E-mail Convidado</th>
                    <th className="py-3 px-4">Papel Proposto</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Expiração</th>
                    {canManageMembers && <th className="py-3 px-4 text-right">Ação</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50 text-zinc-200">
                  {invitations.map((inv) => (
                    <tr key={inv.id} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="py-3 px-4 font-medium text-zinc-100">{inv.email}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="border-zinc-700 text-xs">
                          {ROLE_LABELS[inv.role] || inv.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={
                            inv.status === 'pending'
                              ? 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                              : inv.status === 'accepted'
                              ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                              : 'border-zinc-700 text-zinc-400'
                          }
                        >
                          {inv.status === 'pending'
                            ? 'Pendente'
                            : inv.status === 'accepted'
                            ? 'Aceito'
                            : inv.status === 'expired'
                            ? 'Expirado'
                            : 'Cancelado'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-xs text-zinc-400 font-mono">
                        {new Date(inv.expiresAt).toLocaleDateString()}
                      </td>
                      {canManageMembers && (
                        <td className="py-3 px-4 text-right">
                          {inv.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCancelInvitation(inv.id)}
                              className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                            >
                              Cancelar
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal Convidar Membro */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="bg-zinc-950 border border-zinc-800 text-zinc-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-amber-500" />
              Convidar Novo Membro
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleInviteSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="inv-email" className="text-xs font-semibold text-zinc-300">
                E-mail do Convidado *
              </Label>
              <Input
                id="inv-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colaborador@exemplo.com"
                className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-amber-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-300">Papel / Função *</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as MembershipRole)}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  <SelectValue placeholder="Selecione o papel" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                  <SelectItem value="admin">Administrador da Organização</SelectItem>
                  <SelectItem value="organizer">Organizador</SelectItem>
                  <SelectItem value="team_manager">Gestor de Equipe</SelectItem>
                  <SelectItem value="referee">Árbitro</SelectItem>
                  <SelectItem value="scorer">Apontador</SelectItem>
                  <SelectItem value="viewer">Visualizador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-300">Equipe Vinculada (Opcional)</Label>
              <Select value={inviteTeamId} onValueChange={setInviteTeamId}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  <SelectValue placeholder="Nenhuma equipe (Membro Institucional)" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                  <SelectItem value="none">Nenhuma equipe (Membro Institucional)</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.shortName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-zinc-500">
                Se não vincular equipe, o membro terá acesso em nível organizacional sem equipe associada.
              </p>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsInviteOpen(false)}
                className="border-zinc-800 text-zinc-300 hover:bg-zinc-900"
                disabled={inviting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={inviting}
                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold"
              >
                {inviting ? 'Enviando...' : 'Enviar Convite'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Alterar Papel */}
      <Dialog open={!!roleChangeMember} onOpenChange={(open) => !open && setRoleChangeMember(null)}>
        <DialogContent className="bg-zinc-950 border border-zinc-800 text-zinc-100 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              Alterar Papel de Membro
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs text-zinc-400">
              Selecione a nova função para{' '}
              <strong className="text-zinc-200">{roleChangeMember?.userName || roleChangeMember?.userId}</strong>:
            </p>

            <Select value={newRole} onValueChange={(v) => setNewRole(v as MembershipRole)}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100">
                <SelectValue placeholder="Selecione o novo papel" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                <SelectItem value="admin">Administrador da Organização</SelectItem>
                <SelectItem value="organizer">Organizador</SelectItem>
                <SelectItem value="team_manager">Gestor de Equipe</SelectItem>
                <SelectItem value="referee">Árbitro</SelectItem>
                <SelectItem value="scorer">Apontador</SelectItem>
                <SelectItem value="viewer">Visualizador</SelectItem>
              </SelectContent>
            </Select>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRoleChangeMember(null)}
                className="border-zinc-800 text-zinc-300 hover:bg-zinc-900"
                disabled={updatingRole}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpdateRole}
                disabled={updatingRole}
                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold"
              >
                {updatingRole ? 'Salvando...' : 'Salvar Alteração'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
