/**
 * SettingsPage — Central Oficial de Configurações Gerais do Sistema (BaseOS)
 * Rota: /configuracoes
 *
 * Responsabilidades:
 * - Preferências Pessoais: Perfil, alteração de senha própria, notificações, tema e idioma.
 * - Parâmetros Administrativos: Dados da organização, regras padrão de pontuação e timeouts.
 * - Segurança & Auditoria: Timeout de inatividade, trilha de auditoria e controle de integridade.
 * - Gestão de Usuários: Cadastro, edição, controle de roles (RBAC), ativação e redefinição de credenciais.
 * - Manutenção e Base de Dados: Limpeza seletiva de competições e restauração de dados de demonstração (seed).
 *
 * Design System:
 * - Enterprise Dark SaaS (Zinc-950/900, Âmbar-500)
 * - Componentes universais: MainLayout, PageHeader, SectionCard, StatusBadge, DataTable, StateContainer
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  User,
  Building,
  Bell,
  Palette,
  Database,
  Trash2,
  RotateCcw,
  Shield,
  ShieldCheck,
  KeyRound,
  Lock,
  UserPlus,
  Users,
  AlertTriangle,
  History,
  MoreVertical,
  Edit2,
  Search,
  Eye,
  EyeOff,
  Activity,
  FileSpreadsheet,
  Settings2,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/Section';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { StateContainer } from '@/components/ui/StateContainer';
import { ContextualHelpButton } from '@/components/help/ContextualHelpButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { dataAccess, clearAllCompetitionData, resetLocalData } from '@/services/dataAccess';
import { authService } from '@/services/authService';
import type { NotificationPrefs, SettingsRecord } from '@/types/entities';
import { useAuth } from '@/components/auth/useAuth';
import { ROLE_LABELS, type SystemUser, type UserRole } from '@/types/auth';
import {
  AuditService,
  SecurityConfigService,
  type AuditEventType,
  type AuditLogEntry,
  type SecurityPreferences,
} from '@/lib/security';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { ResetPasswordModal } from '@/components/auth/ResetPasswordModal';

const NOTIFICATION_ITEMS: { key: keyof NotificationPrefs; title: string; description: string }[] = [
  { key: 'matchScheduled', title: 'Novos jogos agendados', description: 'Receber notificação quando um jogo for agendado' },
  { key: 'liveGames', title: 'Jogos ao vivo', description: 'Notificar quando uma partida iniciar' },
  { key: 'matchResult', title: 'Resultados finais', description: 'Receber placar oficial ao término da partida' },
  { key: 'pendingSheets', title: 'Súmulas pendentes', description: 'Alertar sobre súmulas digitais não homologadas' },
  { key: 'dailyDigest', title: 'Resumo diário', description: 'Receber boletim informativo diário de confrontos' },
];

function applyTheme(theme?: SettingsRecord['theme']): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', isDark);
  }
}

export function SettingsPage() {
  const { session, updateProfile } = useAuth();
  const currentUser = session?.user;

  // Estado das configurações gerais
  const [activeTab, setActiveTab] = useState('users');
  const [settings, setSettings] = useState<SettingsRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Perfil & Troca de Senha Própria
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Organização
  const [orgName, setOrgName] = useState('');
  const [orgCode, setOrgCode] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [website, setWebsite] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [setPoints, setSetPoints] = useState('25');
  const [tiebreakPoints, setTiebreakPoints] = useState('15');
  const [timeoutsPerSet, setTimeoutsPerSet] = useState('2');

  // Notificações & Aparência
  const [notifications, setNotifications] = useState<NotificationPrefs>({
    matchScheduled: true,
    rosterSubmitted: true,
    matchResult: true,
    marketing: false,
    liveGames: true,
    pendingSheets: true,
    dailyDigest: false,
  });
  const [theme, setTheme] = useState<SettingsRecord['theme']>('system');
  const [language, setLanguage] = useState<SettingsRecord['language']>('pt-BR');

  // Gestão de Usuários
  const [usersList, setUsersList] = useState<SystemUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<SystemUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<SystemUser | null>(null);

  const [userForm, setUserForm] = useState<{
    name: string;
    email: string;
    role: UserRole;
    status: 'active' | 'inactive';
    password: string;
  }>({
    name: '',
    email: '',
    role: 'organizer',
    status: 'active',
    password: '',
  });

  // Segurança e Auditoria
  const [securityPrefs, setSecurityPrefs] = useState<SecurityPreferences>(
    SecurityConfigService.getPreferences(),
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditFilter, setAuditFilter] = useState('');
  const [clearAuditOpen, setClearAuditOpen] = useState(false);
  const [clearCompOpen, setClearCompOpen] = useState(false);
  const [restoreSeedOpen, setRestoreSeedOpen] = useState(false);

  const loadAuditLogs = useCallback(async () => {
    try {
      const persisted = await dataAccess.listAuditLogs();
      if (persisted && persisted.length > 0) {
        setAuditLogs(
          persisted.map((p) => ({
            id: p.id,
            event: p.action,
            user: p.user,
            ip: p.entityType ? `${p.entityType}:${p.entityId || ''}` : 'Local',
            time: new Date(p.timestamp).toLocaleString('pt-BR'),
            type: (p.action.includes('CANCEL') || p.action.includes('ERROR')
              ? 'error'
              : p.action.includes('HOMOLOGAT') || p.action.includes('CREATED')
              ? 'success'
              : 'info') as AuditEventType,
            details:
              p.details ||
              (p.note
                ? `${p.note} | De: ${p.previousValue || '—'} Para: ${p.newValue || '—'}`
                : `De: ${p.previousValue || '—'} Para: ${p.newValue || '—'}`),
          }))
        );
        return;
      }
    } catch {
      // fallback
    }
    setAuditLogs(AuditService.getLogs());
  }, []);

  const filteredAuditLogs = useMemo(() => {
    if (!auditFilter.trim()) return auditLogs;
    const q = auditFilter.toLowerCase();
    return auditLogs.filter(
      (l) =>
        l.event.toLowerCase().includes(q) ||
        l.user.toLowerCase().includes(q) ||
        (l.details && l.details.toLowerCase().includes(q)) ||
        l.ip.toLowerCase().includes(q)
    );
  }, [auditLogs, auditFilter]);

  const loadUsers = useCallback(async () => {
    try {
      const list = await authService.listUsers();
      setUsersList(list);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setIsError(false);
      const s = await dataAccess.getSettings();
      setSettings(s);
      applyTheme(s.theme);

      setOrgName(s.orgName || '');
      setOrgCode(s.orgCode || '');
      setCnpj(s.cnpj || '');
      setWebsite(s.website || '');
      setContactEmail(s.contactEmail || '');
      setPhone(s.phone || '');
      setSetPoints(String(s.rules.setPoints || 25));
      setTiebreakPoints(String(s.rules.tiebreakPoints || 15));
      setTimeoutsPerSet(String(s.rules.timeoutsPerSet || 2));
      setNotifications(s.notifications);
      setTheme(s.theme);
      setLanguage(s.language);

      await Promise.all([loadUsers(), loadAuditLogs()]);
    } catch (err: unknown) {
      setIsError(true);
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao carregar configurações.');
    } finally {
      setLoading(false);
    }
  }, [loadUsers, loadAuditLogs]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (currentUser?.name) setName(currentUser.name);
  }, [currentUser?.name]);

  const saveSettings = async (updates: Partial<SettingsRecord>, message: string) => {
    try {
      const merged = await dataAccess.updateSettings(updates);
      setSettings(merged);
      if (updates.theme) applyTheme(updates.theme);
      toast.success(message);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar configurações.');
    }
  };

  // Handlers de Perfil e Senha
  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error('Informe seu nome.');
      return;
    }
    const result = await updateProfile({ name: name.trim() });
    if (result.ok) {
      toast.success('Perfil atualizado com sucesso.');
      loadUsers();
    } else {
      toast.error(result.error ?? 'Erro ao atualizar o perfil.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Informe sua senha atual.');
      return;
    }
    if (!newPassword) {
      toast.error('Informe a nova senha desejada.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('A confirmação da senha não confere com a nova senha.');
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await authService.changePassword(currentPassword, newPassword);
      if (!res.ok) {
        toast.error(res.error ?? 'Falha ao alterar senha.');
        return;
      }
      toast.success('Senha alterada com sucesso!', {
        description: 'Sua credencial de acesso foi atualizada com proteção de ponta a ponta.',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      loadAuditLogs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao processar alteração.');
    } finally {
      setIsChangingPass(false);
    }
  };

  // Handlers de Organização
  const handleSaveOrganization = () => {
    if (!settings) return;
    saveSettings(
      {
        orgName: orgName.trim() || 'BaseOS',
        orgCode: orgCode.trim().toUpperCase(),
        cnpj,
        website,
        contactEmail,
        phone,
        rules: {
          ...settings.rules,
          setPoints: Number(setPoints),
          tiebreakPoints: Number(tiebreakPoints),
          timeoutsPerSet: Number(timeoutsPerSet),
        },
      },
      'Parâmetros da organização atualizados com sucesso.',
    );
  };

  // Handlers de Notificações e Aparência
  const handleSaveNotifications = () => {
    saveSettings({ notifications }, 'Preferências de notificação atualizadas.');
  };

  const handleSaveAppearance = () => {
    saveSettings({ theme, language }, 'Aparência e idioma salvos com sucesso.');
  };

  // Handlers de Usuários
  const openCreateUserModal = () => {
    setEditingUser(null);
    setUserForm({
      name: '',
      email: '',
      role: 'organizer',
      status: 'active',
      password: '',
    });
    setUserModalOpen(true);
  };

  const openEditUserModal = (u: SystemUser) => {
    setEditingUser(u);
    setUserForm({
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      password: '',
    });
    setUserModalOpen(true);
  };

  const handleSaveUserForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name.trim() || !userForm.email.trim()) {
      toast.error('Preencha o nome e o e-mail do usuário.');
      return;
    }

    try {
      if (editingUser) {
        await authService.updateUser(editingUser.id, {
          name: userForm.name.trim(),
          email: userForm.email.trim().toLowerCase(),
          role: userForm.role,
          status: userForm.status,
        });
        toast.success(`Usuário ${userForm.name} atualizado com sucesso!`);
      } else {
        await authService.createUser({
          name: userForm.name.trim(),
          email: userForm.email.trim().toLowerCase(),
          role: userForm.role,
          status: userForm.status,
          initialPassword: userForm.password.trim() || undefined,
        });
        toast.success(`Usuário ${userForm.name} cadastrado com sucesso!`);
      }
      setUserModalOpen(false);
      loadUsers();
      loadAuditLogs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar usuário.');
    }
  };

  const handleToggleUserStatus = async (u: SystemUser) => {
    const nextStatus = u.status === 'active' ? 'inactive' : 'active';
    try {
      await authService.updateUser(u.id, { status: nextStatus });
      toast.success(`Usuário ${u.name} ${nextStatus === 'active' ? 'ativado' : 'desativado'}.`);
      loadUsers();
      loadAuditLogs();
    } catch {
      toast.error('Erro ao alterar status do usuário.');
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await authService.deleteUser(userToDelete.id);
      toast.success(`Usuário ${userToDelete.name} removido com sucesso.`);
      setUserToDelete(null);
      loadUsers();
      loadAuditLogs();
    } catch {
      toast.error('Erro ao excluir usuário.');
    }
  };

  // Handlers de Segurança & Auditoria
  const handleSaveSecurityPreferences = () => {
    SecurityConfigService.savePreferences(securityPrefs);
    AuditService.logEvent(
      'Atualização de Políticas de Segurança',
      currentUser?.email ?? 'Administrador',
      'info',
      `Auto-logout: ${
        securityPrefs.inactivityTimeoutEnabled
          ? `${securityPrefs.inactivityTimeoutMinutes}m`
          : 'desativado'
      }.`,
    );
    loadAuditLogs();
    toast.success('Políticas de segurança salvas com sucesso!');
  };

  const handleConfirmClearAuditLogs = () => {
    AuditService.clearLogs();
    loadAuditLogs();
    setClearAuditOpen(false);
    toast.success('Logs de auditoria reiniciados.');
  };

  const handleConfirmClearCompetitions = () => {
    clearAllCompetitionData();
    toast.success('Dados de competições limpos com sucesso!');
    setClearCompOpen(false);
    setTimeout(() => window.location.reload(), 600);
  };

  const handleConfirmResetSeed = () => {
    resetLocalData();
    toast.success('Dados de demonstração restaurados!');
    setRestoreSeedOpen(false);
    setTimeout(() => window.location.reload(), 600);
  };

  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [usersList, userSearch, roleFilter]);

  // Colunas da DataTable de Usuários
  const userColumns: DataTableColumn<SystemUser>[] = [
    {
      id: 'name',
      header: 'Usuário',
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700">
            <AvatarFallback className="text-[11px] font-bold text-zinc-300 font-mono">
              {row.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-xs text-foreground truncate">{row.name}</span>
              {currentUser?.email?.toLowerCase() === row.email.toLowerCase() && (
                <Badge variant="outline" className="text-[9px] py-0 px-1 border-primary/40 text-primary">
                  Você
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate font-mono">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'role',
      header: 'Perfil de Acesso',
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className="text-[10px] py-0 px-2 h-5 border-zinc-800 bg-zinc-900 text-zinc-300 font-mono"
        >
          {ROLE_LABELS[row.role] || row.role}
        </Badge>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge status={row.status === 'active' ? 'active' : 'inactive'} />
      ),
    },
    {
      id: 'lastLogin',
      header: 'Último Acesso',
      cell: ({ row }) => (
        <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
          {row.lastLoginAt
            ? new Date(row.lastLoginAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Nunca acessou'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Ações',
      align: 'right',
      cell: ({ row }) => {
        const isMe = currentUser?.email?.toLowerCase() === row.email.toLowerCase();
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-zinc-800 rounded-md"
                aria-label="Ações do usuário"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-xs">
              <DropdownMenuItem
                className="gap-2 text-xs"
                onClick={() => openEditUserModal(row)}
              >
                <Edit2 className="w-3.5 h-3.5 text-zinc-400" />
                Editar Cadastro
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 text-xs"
                onClick={() => setResetPasswordUser(row)}
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                Redefinir Senha
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem
                className="gap-2 text-xs"
                onClick={() => handleToggleUserStatus(row)}
                disabled={isMe}
              >
                <Activity className="w-3.5 h-3.5 text-zinc-400" />
                {row.status === 'active' ? 'Desativar Acesso' : 'Ativar Acesso'}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 text-xs text-red-400 focus:text-red-400 focus:bg-red-500/10"
                onClick={() => setUserToDelete(row)}
                disabled={isMe}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir Usuário
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Colunas da DataTable de Logs de Auditoria
  const auditColumns: DataTableColumn<AuditLogEntry>[] = [
    {
      id: 'time',
      header: 'Data / Hora',
      cell: ({ row }) => (
        <span className="font-mono text-[11px] tabular-nums text-foreground">
          {row.time}
        </span>
      ),
    },
    {
      id: 'event',
      header: 'Ação / Evento',
      cell: ({ row }) => (
        <span className="text-xs font-semibold text-foreground truncate">{row.event}</span>
      ),
    },
    {
      id: 'user',
      header: 'Operador',
      cell: ({ row }) => (
        <span className="text-[11px] text-muted-foreground font-mono">{row.user}</span>
      ),
    },
    {
      id: 'details',
      header: 'Detalhes',
      cell: ({ row }) => (
        <span className="text-[11px] text-muted-foreground truncate">{row.details || '—'}</span>
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* PageHeader Oficial */}
        <PageHeader
          title="Configurações do Sistema"
          description="Gerencie preferências pessoais, gestão de usuários, políticas de segurança e parâmetros administrativos do BaseOS."
          secondaryActions={
            <ContextualHelpButton
              articleId="gestao-usuarios-seguranca"
              label="Ajuda em administração"
            />
          }
        />

        {/* Gestão de Estados Universais */}
        <StateContainer
          isLoading={loading}
          isError={isError}
          errorTitle="Não foi possível carregar as configurações"
          errorDescription={errorMessage}
          onRetry={refresh}
        >
          <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
              <TabsList className="bg-zinc-900 flex-wrap h-auto p-1 border border-zinc-800 rounded-lg gap-0.5">
                <TabsTrigger
                  value="users"
                  onClick={() => setActiveTab('users')}
                  className="gap-1.5 text-xs h-7 rounded-md data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground text-muted-foreground"
                >
                  <Users className="w-3.5 h-3.5 text-primary" />
                  Usuários
                </TabsTrigger>
                <TabsTrigger
                  value="security"
                  onClick={() => setActiveTab('security')}
                  className="gap-1.5 text-xs h-7 rounded-md data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground text-muted-foreground"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Segurança & Auditoria
                </TabsTrigger>
                <TabsTrigger
                  value="organization"
                  onClick={() => setActiveTab('organization')}
                  className="gap-1.5 text-xs h-7 rounded-md data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground text-muted-foreground"
                >
                  <Building className="w-3.5 h-3.5 text-sky-400" />
                  Organização & Regras
                </TabsTrigger>
                <TabsTrigger
                  value="profile"
                  onClick={() => setActiveTab('profile')}
                  className="gap-1.5 text-xs h-7 rounded-md data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground text-muted-foreground"
                >
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  Meu Perfil
                </TabsTrigger>
                <TabsTrigger
                  value="notifications"
                  onClick={() => setActiveTab('notifications')}
                  className="gap-1.5 text-xs h-7 rounded-md data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground text-muted-foreground"
                >
                  <Bell className="w-3.5 h-3.5" />
                  Notificações
                </TabsTrigger>
                <TabsTrigger
                  value="appearance"
                  onClick={() => setActiveTab('appearance')}
                  className="gap-1.5 text-xs h-7 rounded-md data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground text-muted-foreground"
                >
                  <Palette className="w-3.5 h-3.5" />
                  Aparência
                </TabsTrigger>
                <TabsTrigger
                  value="database"
                  onClick={() => setActiveTab('database')}
                  className="gap-1.5 text-xs h-7 rounded-md data-[state=active]:bg-zinc-800 data-[state=active]:text-red-400 text-muted-foreground"
                >
                  <Database className="w-3.5 h-3.5" />
                  Base de Dados
                </TabsTrigger>
              </TabsList>

              {/* 1. ABA: USUÁRIOS DO SISTEMA */}
              <TabsContent value="users" className="space-y-4">
                <SectionCard
                  title="Gestão de Usuários do Sistema"
                  description="Cadastre administradores, organizadores, árbitros e mesários com controle granular de acesso e senhas."
                  actions={
                    <Button
                      size="sm"
                      className="gap-1.5 text-xs h-8 rounded-md font-semibold shadow-none"
                      onClick={openCreateUserModal}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Cadastrar Usuário
                    </Button>
                  }
                  divided
                >
                  {/* Filtros de Usuários */}
                  <div className="flex flex-col sm:flex-row gap-2.5 pb-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nome ou e-mail..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="pl-8 text-xs h-8 bg-zinc-900 border-zinc-800 rounded-md"
                      />
                    </div>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-full sm:w-48 text-xs h-8 bg-zinc-900 border-zinc-800 rounded-md">
                        <SelectValue placeholder="Filtrar por perfil" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value="all" className="text-xs">Todos os Perfis</SelectItem>
                        <SelectItem value="admin" className="text-xs">Administrador</SelectItem>
                        <SelectItem value="organizer" className="text-xs">Organizador</SelectItem>
                        <SelectItem value="referee" className="text-xs">Árbitro</SelectItem>
                        <SelectItem value="scorer" className="text-xs">Apontador / Mesário</SelectItem>
                        <SelectItem value="team" className="text-xs">Representante Equipe</SelectItem>
                        <SelectItem value="viewer" className="text-xs">Visualizador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tabela de Usuários */}
                  <DataTable
                    data={filteredUsers}
                    columns={userColumns}
                    emptyTitle="Nenhum usuário encontrado"
                    emptyDescription="Tente ajustar a busca ou o filtro de perfil."
                  />
                </SectionCard>
              </TabsContent>

              {/* 2. ABA: SEGURANÇA E AUDITORIA */}
              <TabsContent value="security" className="space-y-5">
                <SectionCard
                  title="Políticas de Segurança e Sessão"
                  description="Definições de controle de acesso e tempo de expiração de credenciais."
                >
                  <div className="space-y-4 pt-1">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-xs text-foreground">
                          Encerramento Automático de Sessão por Inatividade
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Desconecta automaticamente o usuário após tempo sem atividade na tela.
                        </p>
                      </div>
                      <Switch
                        checked={securityPrefs.inactivityTimeoutEnabled}
                        onCheckedChange={(val) =>
                          setSecurityPrefs((p) => ({ ...p, inactivityTimeoutEnabled: val }))
                        }
                      />
                    </div>

                    {securityPrefs.inactivityTimeoutEnabled && (
                      <div className="space-y-1 pl-1">
                        <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
                          Tempo Limite de Inatividade (minutos)
                        </Label>
                        <Select
                          value={String(securityPrefs.inactivityTimeoutMinutes)}
                          onValueChange={(val) =>
                            setSecurityPrefs((p) => ({
                              ...p,
                              inactivityTimeoutMinutes: Number(val),
                            }))
                          }
                        >
                          <SelectTrigger className="w-56 text-xs h-8 bg-zinc-900 border-zinc-800">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-800">
                            <SelectItem value="15" className="text-xs">15 minutos</SelectItem>
                            <SelectItem value="30" className="text-xs">30 minutos (Recomendado)</SelectItem>
                            <SelectItem value="60" className="text-xs">1 hora</SelectItem>
                            <SelectItem value="120" className="text-xs">2 horas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <Button
                        size="sm"
                        className="gap-1.5 text-xs h-8 rounded-md font-medium shadow-none"
                        onClick={handleSaveSecurityPreferences}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Salvar Políticas de Segurança
                      </Button>
                    </div>
                  </div>
                </SectionCard>

                {/* Trilha de Auditoria */}
                <SectionCard
                  title="Trilha de Auditoria de Operações"
                  description="Registro detalhado de ações administrativas e alterações de segurança."
                  actions={
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 rounded-md text-red-400 hover:bg-red-500/10 border-red-500/30"
                      onClick={() => setClearAuditOpen(true)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Limpar Histórico
                    </Button>
                  }
                  divided
                >
                  <div className="flex items-center gap-2 pb-3">
                    <Input
                      placeholder="Filtrar por ação, operador ou partida..."
                      value={auditFilter}
                      onChange={(e) => setAuditFilter(e.target.value)}
                      className="max-w-sm h-8 text-xs bg-zinc-900 border-zinc-800"
                    />
                  </div>
                  <DataTable
                    data={filteredAuditLogs}
                    columns={auditColumns}
                    emptyTitle="Nenhum registro de auditoria"
                    emptyDescription="Os eventos operacionais registrados pelo sistema aparecerão aqui."
                  />
                </SectionCard>
              </TabsContent>

              {/* 3. ABA: ORGANIZAÇÃO & REGRAS */}
              <TabsContent value="organization" className="space-y-5">
                <SectionCard
                  title="Dados Institucionais da Entidade"
                  description="Informações cadastrais exibidas em súmulas e relatórios oficiais."
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1">
                      <Label htmlFor="orgName" className="text-[10px] uppercase font-semibold text-muted-foreground">
                        Razão Social / Entidade *
                      </Label>
                      <Input
                        id="orgName"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="Ex: Federação Mineira de Voleibol"
                        className="h-8 text-xs bg-zinc-900 border-zinc-800"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="orgCode" className="text-[10px] uppercase font-semibold text-muted-foreground">
                        Sigla / Código
                      </Label>
                      <Input
                        id="orgCode"
                        value={orgCode}
                        onChange={(e) => setOrgCode(e.target.value)}
                        placeholder="Ex: FMV"
                        className="h-8 text-xs bg-zinc-900 border-zinc-800 uppercase font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="cnpj" className="text-[10px] uppercase font-semibold text-muted-foreground">
                        CNPJ
                      </Label>
                      <Input
                        id="cnpj"
                        value={cnpj}
                        onChange={(e) => setCnpj(e.target.value)}
                        placeholder="00.000.000/0001-00"
                        className="h-8 text-xs bg-zinc-900 border-zinc-800 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="contactEmail" className="text-[10px] uppercase font-semibold text-muted-foreground">
                        E-mail de Contato
                      </Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="contato@federacao.org.br"
                        className="h-8 text-xs bg-zinc-900 border-zinc-800 font-mono"
                      />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  title="Regras Globais de Pontuação Padrão"
                  description="Valores base aplicados automaticamente na criação de novas competições."
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                    <div className="space-y-1">
                      <Label htmlFor="setPoints" className="text-[10px] uppercase font-semibold text-muted-foreground">
                        Pontos por Set Regular
                      </Label>
                      <Input
                        id="setPoints"
                        type="number"
                        min={1}
                        value={setPoints}
                        onChange={(e) => setSetPoints(e.target.value)}
                        className="h-8 text-xs bg-zinc-900 border-zinc-800 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="tiebreakPoints" className="text-[10px] uppercase font-semibold text-muted-foreground">
                        Pontos do Tiebreak (Set Desempate)
                      </Label>
                      <Input
                        id="tiebreakPoints"
                        type="number"
                        min={1}
                        value={tiebreakPoints}
                        onChange={(e) => setTiebreakPoints(e.target.value)}
                        className="h-8 text-xs bg-zinc-900 border-zinc-800 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="timeouts" className="text-[10px] uppercase font-semibold text-muted-foreground">
                        Tempos Técnicos por Set
                      </Label>
                      <Input
                        id="timeouts"
                        type="number"
                        min={0}
                        value={timeoutsPerSet}
                        onChange={(e) => setTimeoutsPerSet(e.target.value)}
                        className="h-8 text-xs bg-zinc-900 border-zinc-800 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      size="sm"
                      className="gap-1.5 text-xs h-8 rounded-md font-medium shadow-none"
                      onClick={handleSaveOrganization}
                    >
                      <Building className="w-3.5 h-3.5" />
                      Salvar Dados da Organização
                    </Button>
                  </div>
                </SectionCard>
              </TabsContent>

              {/* 4. ABA: MEU PERFIL E SENHA */}
              <TabsContent value="profile" className="space-y-5">
                <SectionCard
                  title="Identidade Operacional"
                  description="Informações da sua conta pessoal conectada ao BaseOS."
                >
                  <div className="space-y-4 pt-1 max-w-xl">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                      <Avatar className="w-11 h-11 rounded-lg bg-zinc-800 border border-zinc-700">
                        <AvatarFallback className="text-sm font-bold text-zinc-300 font-mono">
                          {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 space-y-0.5">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {currentUser?.name || 'Usuário'}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {currentUser?.email}
                        </p>
                        <Badge
                          variant="outline"
                          className="mt-1 text-[9px] py-0 px-1.5 border-primary/30 bg-primary/10 text-primary font-mono"
                        >
                          {currentUser?.role ? ROLE_LABELS[currentUser.role] : 'Operador'}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="profName" className="text-[10px] uppercase font-semibold text-muted-foreground">
                        Nome Completo
                      </Label>
                      <Input
                        id="profName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-8 text-xs bg-zinc-900 border-zinc-800"
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        size="sm"
                        className="gap-1.5 text-xs h-8 rounded-md font-medium shadow-none"
                        onClick={handleSaveProfile}
                      >
                        <User className="w-3.5 h-3.5" />
                        Salvar Nome
                      </Button>
                    </div>
                  </div>
                </SectionCard>

                {/* Alterar Senha */}
                <SectionCard
                  title="Alteração de Senha"
                  description="Atualize sua senha de acesso com verificação de segurança."
                >
                  <form onSubmit={handleChangePassword} className="space-y-4 pt-1 max-w-xl">
                    <div className="space-y-1">
                      <Label htmlFor="curPass" className="text-[10px] uppercase font-semibold text-muted-foreground">
                        Senha Atual *
                      </Label>
                      <div className="relative">
                        <Input
                          id="curPass"
                          type={showCurrentPass ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Informe sua senha atual"
                          className="pr-10 text-xs h-8 bg-zinc-900 border-zinc-800 font-mono"
                          required
                        />
                        <button
                          type="button"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-foreground"
                          onClick={() => setShowCurrentPass(!showCurrentPass)}
                          tabIndex={-1}
                        >
                          {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="newPass" className="text-[10px] uppercase font-semibold text-muted-foreground">
                        Nova Senha *
                      </Label>
                      <div className="relative">
                        <Input
                          id="newPass"
                          type={showNewPass ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Mínimo 8 caracteres"
                          className="pr-10 text-xs h-8 bg-zinc-900 border-zinc-800 font-mono"
                          required
                        />
                        <button
                          type="button"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-foreground"
                          onClick={() => setShowNewPass(!showNewPass)}
                          tabIndex={-1}
                        >
                          {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <PasswordStrengthIndicator password={newPassword} />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="confPass" className="text-[10px] uppercase font-semibold text-muted-foreground">
                        Confirmar Nova Senha *
                      </Label>
                      <Input
                        id="confPass"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repita a nova senha"
                        className="text-xs h-8 bg-zinc-900 border-zinc-800 font-mono"
                        required
                      />
                      {confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-[10px] text-red-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          As senhas não coincidem.
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        type="submit"
                        size="sm"
                        className="gap-1.5 text-xs h-8 rounded-md font-medium shadow-none"
                        disabled={
                          isChangingPass ||
                          !currentPassword ||
                          !newPassword ||
                          newPassword !== confirmPassword
                        }
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        {isChangingPass ? 'Atualizando...' : 'Atualizar Minha Senha'}
                      </Button>
                    </div>
                  </form>
                </SectionCard>
              </TabsContent>

              {/* 5. ABA: NOTIFICAÇÕES */}
              <TabsContent value="notifications" className="space-y-5">
                <SectionCard
                  title="Canais e Alertas Operacionais"
                  description="Defina quais alertas do sistema você deseja receber."
                >
                  <div className="space-y-3 pt-1">
                    {NOTIFICATION_ITEMS.map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800"
                      >
                        <div className="space-y-0.5">
                          <p className="font-semibold text-xs text-foreground">{item.title}</p>
                          <p className="text-[11px] text-muted-foreground">{item.description}</p>
                        </div>
                        <Switch
                          checked={Boolean(notifications[item.key])}
                          onCheckedChange={(val) =>
                            setNotifications((prev) => ({ ...prev, [item.key]: val }))
                          }
                        />
                      </div>
                    ))}

                    <div className="flex justify-end pt-2">
                      <Button
                        size="sm"
                        className="gap-1.5 text-xs h-8 rounded-md font-medium shadow-none"
                        onClick={handleSaveNotifications}
                      >
                        <Bell className="w-3.5 h-3.5" />
                        Salvar Notificações
                      </Button>
                    </div>
                  </div>
                </SectionCard>
              </TabsContent>

              {/* 6. ABA: APARÊNCIA E IDIOMA */}
              <TabsContent value="appearance" className="space-y-5">
                <SectionCard
                  title="Preferências Visuais e Idioma"
                  description="Personalize o tema e a linguagem do BaseOS."
                >
                  <div className="space-y-4 pt-1 max-w-xl">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
                        Tema Visual
                      </Label>
                      <Select
                        value={theme}
                        onValueChange={(val: SettingsRecord['theme']) => {
                          setTheme(val);
                          applyTheme(val);
                        }}
                      >
                        <SelectTrigger className="w-64 text-xs h-8 bg-zinc-900 border-zinc-800">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                          <SelectItem value="light" className="text-xs">Claro</SelectItem>
                          <SelectItem value="dark" className="text-xs">Escuro (Dark SaaS)</SelectItem>
                          <SelectItem value="system" className="text-xs">Padrão do Sistema</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
                        Idioma da Interface
                      </Label>
                      <Select
                        value={language}
                        onValueChange={(val: SettingsRecord['language']) => setLanguage(val)}
                      >
                        <SelectTrigger className="w-64 text-xs h-8 bg-zinc-900 border-zinc-800">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                          <SelectItem value="pt-BR" className="text-xs">Português (Brasil)</SelectItem>
                          <SelectItem value="en" className="text-xs">English (US)</SelectItem>
                          <SelectItem value="es" className="text-xs">Español</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        size="sm"
                        className="gap-1.5 text-xs h-8 rounded-md font-medium shadow-none"
                        onClick={handleSaveAppearance}
                      >
                        <Palette className="w-3.5 h-3.5" />
                        Salvar Aparência
                      </Button>
                    </div>
                  </div>
                </SectionCard>
              </TabsContent>

              {/* 7. ABA: BASE DE DADOS E MANUTENÇÃO */}
              <TabsContent value="database" className="space-y-5">
                <SectionCard
                  title="Manutenção e Armazenamento Local"
                  description="Operações críticas de limpeza e restauração de dados para testes operacionais."
                >
                  <div className="space-y-3 pt-1">
                    <div className="p-3.5 rounded-lg border border-red-500/20 bg-red-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-xs text-foreground">
                          Limpar Dados de Competições
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Remove todos os campeonatos, partidas e súmulas, mantendo equipes e atletas cadastrados.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 text-xs h-8 rounded-md text-red-400 hover:bg-red-500/10 border-red-500/30"
                        onClick={() => setClearCompOpen(true)}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Limpar Competições
                      </Button>
                    </div>

                    <div className="p-3.5 rounded-lg border border-border bg-zinc-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                          <RotateCcw className="w-3.5 h-3.5 text-primary" />
                          Restaurar Dados de Demonstração (Seed)
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Recarrega os dados padrão de teste com competições, equipes e súmulas homologadas.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 text-xs h-8 rounded-md border-border hover:bg-zinc-800/60 gap-1.5"
                        onClick={() => setRestoreSeedOpen(true)}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restaurar Demonstração
                      </Button>
                    </div>
                  </div>
                </SectionCard>
              </TabsContent>
            </Tabs>
          </div>
        </StateContainer>
      </div>

      {/* Modal de Cadastro / Edição de Usuário */}
      <Dialog open={userModalOpen} onOpenChange={setUserModalOpen}>
        <DialogContent className="sm:max-w-[460px] bg-zinc-950 border-border p-5 rounded-xl shadow-none">
          <form onSubmit={handleSaveUserForm}>
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-primary" />
                {editingUser ? 'Editar Usuário do Sistema' : 'Cadastrar Novo Usuário'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Informe os dados e defina o perfil de acesso para concessão de permissões.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3">
              <div className="space-y-1">
                <Label htmlFor="uName" className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Nome Completo *
                </Label>
                <Input
                  id="uName"
                  placeholder="Ex: Carlos Eduardo Silva"
                  value={userForm.name}
                  onChange={(e) => setUserForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="uEmail" className="text-[10px] uppercase font-semibold text-muted-foreground">
                  E-mail de Acesso *
                </Label>
                <Input
                  id="uEmail"
                  type="email"
                  placeholder="carlos@baseos.app"
                  value={userForm.email}
                  onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
                  required
                  className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Perfil de Acesso (Role)
                  </Label>
                  <Select
                    value={userForm.role}
                    onValueChange={(val: UserRole) =>
                      setUserForm((prev) => ({ ...prev, role: val }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="admin" className="text-xs">Administrador Geral</SelectItem>
                      <SelectItem value="organizer" className="text-xs">Organizador de Liga</SelectItem>
                      <SelectItem value="referee" className="text-xs">Árbitro Oficial</SelectItem>
                      <SelectItem value="scorer" className="text-xs">Apontador de Mesa</SelectItem>
                      <SelectItem value="team" className="text-xs">Representante de Equipe</SelectItem>
                      <SelectItem value="viewer" className="text-xs">Visualizador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Status do Acesso
                  </Label>
                  <Select
                    value={userForm.status}
                    onValueChange={(val: 'active' | 'inactive') =>
                      setUserForm((prev) => ({ ...prev, status: val }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="active" className="text-xs">Ativo</SelectItem>
                      <SelectItem value="inactive" className="text-xs">Inativo / Bloqueado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {!editingUser && (
                <div className="space-y-1">
                  <Label htmlFor="uPass" className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Senha Inicial (Opcional)
                  </Label>
                  <Input
                    id="uPass"
                    type="password"
                    placeholder="Deixe em branco para usar a senha padrão"
                    value={userForm.password}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
                    className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md font-mono"
                  />
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setUserModalOpen(false)}
                className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60"
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="h-8 text-xs rounded-md font-medium shadow-none">
                {editingUser ? 'Salvar Alterações' : 'Cadastrar Usuário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Redefinição de Senha de Usuário */}
      <ResetPasswordModal
        user={resetPasswordUser}
        open={resetPasswordUser !== null}
        onOpenChange={(open) => {
          if (!open) setResetPasswordUser(null);
        }}
        onSuccess={() => {
          loadUsers();
          loadAuditLogs();
        }}
      />

      {/* Confirmação de Exclusão de Usuário */}
      <AlertDialog open={userToDelete !== null} onOpenChange={(open) => { if (!open) setUserToDelete(null); }}>
        <AlertDialogContent className="bg-zinc-950 border-border p-5 rounded-xl shadow-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold text-foreground">
              Remover Usuário
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Tem certeza que deseja remover o usuário{' '}
              <strong className="text-foreground">{userToDelete?.name}</strong>? Esta ação
              revogará imediatamente todas as credenciais de acesso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2">
            <AlertDialogCancel className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteUser}
              className="h-8 text-xs rounded-md bg-red-600 hover:bg-red-700 text-white font-medium shadow-none"
            >
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de Limpeza de Auditoria */}
      <AlertDialog open={clearAuditOpen} onOpenChange={setClearAuditOpen}>
        <AlertDialogContent className="bg-zinc-950 border-border p-5 rounded-xl shadow-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold text-foreground">
              Limpar Registros de Auditoria
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Deseja realmente limpar toda a trilha de logs de auditoria? O histórico de
              operações anteriores será apagado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2">
            <AlertDialogCancel className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmClearAuditLogs}
              className="h-8 text-xs rounded-md bg-red-600 hover:bg-red-700 text-white font-medium shadow-none"
            >
              Limpar Logs
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de Limpeza de Competições */}
      <AlertDialog open={clearCompOpen} onOpenChange={setClearCompOpen}>
        <AlertDialogContent className="bg-zinc-950 border-border p-5 rounded-xl shadow-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Limpar Todas as Competições
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Esta ação removerá permanentemente todas as competições, tabelas, partidas e
              súmulas homologadas. Equipes e atletas cadastrados serão preservados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2">
            <AlertDialogCancel className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmClearCompetitions}
              className="h-8 text-xs rounded-md bg-red-600 hover:bg-red-700 text-white font-medium shadow-none"
            >
              Confirmar Limpeza
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de Restauração de Demonstração */}
      <AlertDialog open={restoreSeedOpen} onOpenChange={setRestoreSeedOpen}>
        <AlertDialogContent className="bg-zinc-950 border-border p-5 rounded-xl shadow-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-primary" />
              Restaurar Dados de Demonstração
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Deseja recarregar o banco de demonstração com os campeonatos oficiais, elencos e
              súmulas padrão do BaseOS? Dados customizados serão sobrescritos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2">
            <AlertDialogCancel className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmResetSeed}
              className="h-8 text-xs rounded-md font-medium shadow-none"
            >
              Restaurar Base
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}

export default SettingsPage;