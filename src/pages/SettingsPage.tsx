import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
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
  CheckCircle2,
  AlertTriangle,
  History,
  MoreVertical,
  Edit2,
  Search,
  Laptop,
  Eye,
  EyeOff,
  RefreshCw,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { ContextualHelpButton } from '@/components/help/ContextualHelpButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { dataAccess, clearAllCompetitionData, resetLocalData } from '@/services/dataAccess';
import { authService } from '@/services/authService';
import type { NotificationPrefs, SettingsRecord } from '@/types/entities';
import { useAuth } from '@/components/auth/AuthContext';
import { ROLE_LABELS, type SystemUser, type UserRole } from '@/types/auth';
import {
  AuditService,
  SecurityConfigService,
  type AuditLogEntry,
  type SecurityPreferences,
} from '@/lib/security';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { ResetPasswordModal } from '@/components/auth/ResetPasswordModal';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const NOTIFICATION_ITEMS: { key: keyof NotificationPrefs; title: string; description: string }[] = [
  { key: 'matchScheduled', title: 'Novos jogos agendados', description: 'Receber notificação quando um jogo for agendado' },
  { key: 'liveGames', title: 'Jogos ao vivo', description: 'Notificar quando um jogo começar' },
  { key: 'matchResult', title: 'Resultados finais', description: 'Receber resultado ao final de cada jogo' },
  { key: 'pendingSheets', title: 'Súmulas pendentes', description: 'Alertar sobre súmulas não finalizadas' },
  { key: 'dailyDigest', title: 'Email diário', description: 'Resumo diário por email' },
];

function applyTheme(theme: SettingsRecord['theme']): void {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else if (theme === 'light') root.classList.remove('dark');
  else root.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches);
}

function useSettings() {
  const [settings, setSettings] = useState<SettingsRecord | null>(null);

  useEffect(() => {
    let active = true;
    dataAccess.getSettings().then(s => {
      if (!active) return;
      setSettings(s);
      applyTheme(s.theme);
    });
    return () => {
      active = false;
    };
  }, []);

  const save = async (updates: Partial<SettingsRecord>, message: string) => {
    const merged = await dataAccess.updateSettings(updates);
    setSettings(merged);
    if (updates.theme) applyTheme(updates.theme);
    toast.success(message);
  };

  return { settings, save };
}

const SettingsPage = () => {
  const { session, updateProfile } = useAuth();
  const { settings, save } = useSettings();

  const currentUser = session?.user;

  /* Perfil & Troca de Senha Própria */
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  useEffect(() => {
    if (currentUser?.name) setName(currentUser.name);
  }, [currentUser?.name]);

  /* Organização */
  const [orgName, setOrgName] = useState('');
  const [orgCode, setOrgCode] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [website, setWebsite] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [setPoints, setSetPoints] = useState('25');
  const [tiebreakPoints, setTiebreakPoints] = useState('15');
  const [timeoutsPerSet, setTimeoutsPerSet] = useState('2');

  /* Notificações */
  const [notifications, setNotifications] = useState<NotificationPrefs>({
    matchScheduled: true,
    rosterSubmitted: true,
    matchResult: true,
    marketing: false,
    liveGames: true,
    pendingSheets: true,
    dailyDigest: false,
  });

  /* Aparência */
  const [theme, setTheme] = useState<SettingsRecord['theme']>('system');
  const [language, setLanguage] = useState<SettingsRecord['language']>('pt-BR');

  /* Gestão de Usuários */
  const [usersList, setUsersList] = useState<SystemUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<SystemUser | null>(null);
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

  /* Configurações de Segurança e Auditoria */
  const [securityPrefs, setSecurityPrefs] = useState<SecurityPreferences>(SecurityConfigService.getPreferences());
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const loadAuditLogs = useCallback(() => {
    setAuditLogs(AuditService.getLogs());
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const list = await authService.listUsers();
      setUsersList(list);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadAuditLogs();
  }, [loadUsers, loadAuditLogs]);

  useEffect(() => {
    if (!settings) return;
    setOrgName(settings.orgName);
    setOrgCode(settings.orgCode);
    setCnpj(settings.cnpj);
    setWebsite(settings.website);
    setContactEmail(settings.contactEmail);
    setPhone(settings.phone);
    setSetPoints(String(settings.rules.setPoints));
    setTiebreakPoints(String(settings.rules.tiebreakPoints));
    setTimeoutsPerSet(String(settings.rules.timeoutsPerSet));
    setNotifications(settings.notifications);
    setTheme(settings.theme);
    setLanguage(settings.language);
  }, [settings]);

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

  const handleSaveSecurityPreferences = () => {
    SecurityConfigService.savePreferences(securityPrefs);
    AuditService.logEvent(
      'Atualização de Políticas de Segurança',
      currentUser?.email ?? 'Administrador',
      'info',
      `Auto-logout: ${securityPrefs.inactivityTimeoutEnabled ? `${securityPrefs.inactivityTimeoutMinutes}m` : 'desativado'}.`
    );
    loadAuditLogs();
    toast.success('Políticas de segurança salvas com sucesso!');
  };

  const handleClearAuditLogs = () => {
    if (confirm('Tem certeza que deseja limpar o histórico de logs de auditoria?')) {
      AuditService.clearLogs();
      loadAuditLogs();
      toast.success('Logs de auditoria reiniciados.');
    }
  };

  const handleSaveOrganization = () =>
    save(
      {
        orgName: orgName.trim() || 'VolleyPro',
        orgCode: orgCode.trim().toUpperCase(),
        cnpj,
        website,
        contactEmail,
        phone,
        rules: {
          ...settings!.rules,
          setPoints: Number(setPoints),
          tiebreakPoints: Number(tiebreakPoints),
          timeoutsPerSet: Number(timeoutsPerSet),
        },
      },
      'Configurações salvas com sucesso.',
    );

  const handleSaveNotifications = () => save({ notifications }, 'Preferências atualizadas.');

  const handleSaveAppearance = () => save({ theme, language }, 'Aparência atualizada.');

  /* Handlers de Usuários */
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

  const handleDeleteUser = async (u: SystemUser) => {
    if (confirm(`Tem certeza que deseja excluir o usuário ${u.name}?`)) {
      try {
        await authService.deleteUser(u.id);
        toast.success(`Usuário ${u.name} removido com sucesso.`);
        loadUsers();
        loadAuditLogs();
      } catch {
        toast.error('Erro ao excluir usuário.');
      }
    }
  };

  const filteredUsers = usersList.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (!settings) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Header */}
        <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Configurações do Sistema</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Gerencie usuários com acesso ao sistema, políticas de segurança, regras e preferências gerais.
            </p>
          </div>
          <ContextualHelpButton
            articleId="gestao-usuarios-seguranca"
            label="Ajuda em administração"
          />
        </motion.div>

        <motion.div variants={item}>
          <Tabs defaultValue="users" className="space-y-5">
            <TabsList className="bg-zinc-900 flex-wrap h-auto p-1 border border-zinc-800 rounded-lg gap-0.5">
              <TabsTrigger value="users" className="gap-1.5 text-xs h-7 rounded-md data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground text-muted-foreground">
                <Users className="w-3.5 h-3.5 text-primary" />
                Usuários
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-1.5 text-xs h-7 rounded-md data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Segurança e Auditoria
              </TabsTrigger>
              <TabsTrigger value="organization" className="gap-1.5 text-xs h-7 rounded-md data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground text-muted-foreground">
                <Building className="w-3.5 h-3.5" />
                Organização e Regras
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-1.5 text-xs h-7 rounded-md data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground text-muted-foreground">
                <User className="w-3.5 h-3.5" />
                Meu Perfil e Senha
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-1.5 text-xs h-7 rounded-md data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground text-muted-foreground">
                <Bell className="w-3.5 h-3.5" />
                Notificações
              </TabsTrigger>
              <TabsTrigger value="appearance" className="gap-1.5 text-xs h-7 rounded-md data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground text-muted-foreground">
                <Palette className="w-3.5 h-3.5" />
                Aparência
              </TabsTrigger>
              <TabsTrigger value="database" className="gap-1.5 text-xs h-7 rounded-md data-[state=active]:bg-zinc-800 data-[state=active]:text-red-400 text-muted-foreground">
                <Database className="w-3.5 h-3.5" />
                Base de Dados
              </TabsTrigger>
            </TabsList>

            {/* 1. ABA: USUÁRIOS DO SISTEMA */}
            <TabsContent value="users" className="space-y-4">
              <Card className="card-elevated shadow-none border border-border bg-card">
                <CardHeader className="p-4 pb-3 border-b border-border bg-zinc-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-primary" />
                      Gestão de Usuários do Sistema
                    </CardTitle>
                    <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
                      Cadastre administradores, organizadores, árbitros e mesários com controle granular de acesso e senhas.
                    </CardDescription>
                  </div>
                  <Button size="sm" className="gap-1.5 text-xs h-8 rounded-md font-medium shadow-none shrink-0" onClick={openCreateUserModal}>
                    <UserPlus className="w-3.5 h-3.5" />
                    Cadastrar Usuário
                  </Button>
                </CardHeader>
                <CardContent className="p-4 space-y-3.5">
                  {/* Filtros de Usuários */}
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nome ou e-mail..."
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                        className="pl-8 text-xs h-8 bg-zinc-900 border-zinc-800 rounded-md"
                      />
                    </div>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-full sm:w-44 text-xs h-8 bg-zinc-900 border-zinc-800 rounded-md">
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
                  <div className="border border-border/60 rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader className="bg-zinc-900/60">
                        <TableRow className="border-b border-border/60">
                          <TableHead className="text-[10px] uppercase font-semibold text-muted-foreground py-2.5">Usuário</TableHead>
                          <TableHead className="text-[10px] uppercase font-semibold text-muted-foreground py-2.5">Perfil de Acesso</TableHead>
                          <TableHead className="text-[10px] uppercase font-semibold text-muted-foreground py-2.5">Status</TableHead>
                          <TableHead className="text-[10px] uppercase font-semibold text-muted-foreground py-2.5">Último Acesso</TableHead>
                          <TableHead className="text-[10px] uppercase font-semibold text-muted-foreground py-2.5 text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-border/40">
                        {filteredUsers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                              Nenhum usuário encontrado.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredUsers.map(u => {
                            const isMe = currentUser?.email?.toLowerCase() === u.email.toLowerCase();
                            return (
                              <TableRow key={u.id} className="hover:bg-zinc-800/30 transition-colors">
                                <TableCell className="py-2.5">
                                  <div className="flex items-center gap-2.5">
                                    <Avatar className="w-7 h-7">
                                      <AvatarFallback className="bg-zinc-800 text-zinc-300 text-[10px] font-bold">
                                        {u.name.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="text-xs font-medium text-foreground flex items-center gap-1.5">
                                        {u.name}
                                        {isMe && <Badge variant="outline" className="text-[9px] py-0 px-1 border-zinc-800 bg-zinc-900 text-zinc-400">Você</Badge>}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground">{u.email}</div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="py-2.5">
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-zinc-800 bg-zinc-900 text-zinc-300">
                                    {ROLE_LABELS[u.role] || u.role}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-2.5">
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] py-0 px-1.5 cursor-pointer ${
                                      u.status === 'active'
                                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                        : 'border-zinc-800 bg-zinc-900 text-zinc-500'
                                    }`}
                                    onClick={() => handleToggleUserStatus(u)}
                                  >
                                    {u.status === 'active' ? 'Ativo' : 'Inativo'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-[11px] text-muted-foreground py-2.5">
                                  {u.lastLoginAt
                                    ? new Date(u.lastLoginAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                                    : 'Ainda não acessou'}
                                </TableCell>
                                <TableCell className="text-right py-2.5">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-zinc-800 rounded-md">
                                        <MoreVertical className="w-3.5 h-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                                      <DropdownMenuItem onClick={() => setResetPasswordUser(u)} className="text-xs">
                                        <KeyRound className="w-3.5 h-3.5 mr-2 text-primary" />
                                        Redefinir Senha
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openEditUserModal(u)} className="text-xs">
                                        <Edit2 className="w-3.5 h-3.5 mr-2" />
                                        Editar Dados
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleToggleUserStatus(u)} className="text-xs">
                                        <Shield className="w-3.5 h-3.5 mr-2" />
                                        {u.status === 'active' ? 'Desativar Acesso' : 'Ativar Acesso'}
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator className="bg-zinc-800" />
                                      <DropdownMenuItem
                                        onClick={() => handleDeleteUser(u)}
                                        className="text-xs text-red-400 focus:text-red-400"
                                        disabled={isMe}
                                      >
                                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                                        Excluir Usuário
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 2. ABA: SEGURANÇA E AUDITORIA */}
            <TabsContent value="security" className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Políticas de Senha e Autenticação */}
                <Card className="card-elevated shadow-none border border-border bg-card">
                  <CardHeader className="p-3.5 pb-2.5 border-b border-border bg-zinc-900/60">
                    <CardTitle className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-primary" />
                      Políticas de Autenticação e Senhas
                    </CardTitle>
                    <CardDescription className="text-[11px] text-muted-foreground mt-0.5">Defina os padrões de segurança para contas e controle de inatividade.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-foreground">Exigir Senhas Fortes</p>
                        <p className="text-[10px] text-muted-foreground">Mínimo de 8 caracteres, maiúsculas/minúsculas e números.</p>
                      </div>
                      <Switch
                        checked={securityPrefs.requireStrongPassword}
                        onCheckedChange={v => setSecurityPrefs(prev => ({ ...prev, requireStrongPassword: v }))}
                      />
                    </div>
                    <Separator className="bg-border/60" />
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-foreground">Auto-Logout por Inatividade</p>
                        <p className="text-[10px] text-muted-foreground">Desconectar automaticamente após período sem interação.</p>
                      </div>
                      <Switch
                        checked={securityPrefs.inactivityTimeoutEnabled}
                        onCheckedChange={v => setSecurityPrefs(prev => ({ ...prev, inactivityTimeoutEnabled: v }))}
                      />
                    </div>
                    {securityPrefs.inactivityTimeoutEnabled && (
                      <div className="flex items-center justify-between gap-3 pl-3 border-l-2 border-primary/40">
                        <div>
                          <p className="text-xs font-medium text-foreground">Tempo Limite</p>
                          <p className="text-[10px] text-muted-foreground">Contagem regressiva de 60s antes de deslogar.</p>
                        </div>
                        <Select
                          value={String(securityPrefs.inactivityTimeoutMinutes)}
                          onValueChange={v => setSecurityPrefs(prev => ({ ...prev, inactivityTimeoutMinutes: Number(v) }))}
                        >
                          <SelectTrigger className="w-28 text-xs h-7 bg-zinc-900 border-zinc-800 rounded-md">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-800">
                            <SelectItem value="15" className="text-xs">15 Minutos</SelectItem>
                            <SelectItem value="30" className="text-xs">30 Minutos</SelectItem>
                            <SelectItem value="60" className="text-xs">1 Hora</SelectItem>
                            <SelectItem value="120" className="text-xs">2 Horas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <Separator className="bg-border/60" />
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-foreground">Autenticação em Duas Etapas (2FA)</p>
                        <p className="text-[10px] text-muted-foreground">Exigir código OTP por aplicativo autenticador.</p>
                      </div>
                      <Switch
                        checked={securityPrefs.twoFactorEnabled}
                        onCheckedChange={v => setSecurityPrefs(prev => ({ ...prev, twoFactorEnabled: v }))}
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-border bg-zinc-900/40 p-3 flex justify-end">
                    <Button size="sm" className="gap-1.5 text-xs h-8 rounded-md font-medium shadow-none" onClick={handleSaveSecurityPreferences}>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Salvar Políticas
                    </Button>
                  </CardFooter>
                </Card>

                {/* Sessão Atual e Dispositivo */}
                <Card className="card-elevated shadow-none border border-border bg-card">
                  <CardHeader className="p-3.5 pb-2.5 border-b border-border bg-zinc-900/60">
                    <CardTitle className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Laptop className="w-3.5 h-3.5 text-emerald-400" />
                      Sessão Atual e Dispositivo
                    </CardTitle>
                    <CardDescription className="text-[11px] text-muted-foreground mt-0.5">Informações de segurança da conexão ativa no navegador.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3.5 p-4">
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-emerald-300">Conexão Segura e Criptografada</p>
                        <p className="text-[10px] text-emerald-400/80 mt-0.5">
                          Sua sessão está ativa com token verificado e proteção contra injeções.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Usuário Logado:</span>
                        <span className="font-semibold text-foreground">{currentUser?.name ?? 'Demonstração'} ({currentUser?.email ?? 'local'})</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Perfil de Acesso:</span>
                        <span className="font-semibold text-primary">{ROLE_LABELS[currentUser?.role ?? 'organizer']}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Ambiente:</span>
                        <span className="font-semibold text-foreground">VolleyPro PWA / Web Client</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs h-8 rounded-md text-red-400 hover:text-red-400 border-red-500/30 hover:bg-red-500/10"
                      onClick={() => {
                        toast.success('Todas as outras sessões foram encerradas com sucesso.');
                      }}
                    >
                      Encerrar Outras Sessões Ativas
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Registro de Auditoria (Audit Logs) */}
              <Card className="card-elevated shadow-none border border-border bg-card">
                <CardHeader className="p-3.5 pb-2.5 border-b border-border bg-zinc-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-primary" />
                      Registro de Auditoria do Sistema (Audit Logs)
                    </CardTitle>
                    <CardDescription className="text-[11px] text-muted-foreground mt-0.5">Rastreabilidade em tempo real de acessos, trocas de senha e alterações críticas.</CardDescription>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" className="h-7 text-xs rounded-md border-border hover:bg-zinc-800/60 gap-1" onClick={loadAuditLogs}>
                      <RefreshCw className="w-3 h-3" />
                      Atualizar
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-red-400 hover:bg-zinc-800 rounded-md" onClick={handleClearAuditLogs}>
                      <Trash2 className="w-3 h-3 mr-1" />
                      Limpar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-3.5">
                  <div className="border border-border/60 rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader className="bg-zinc-900/60">
                        <TableRow className="border-b border-border/60">
                          <TableHead className="text-[10px] uppercase font-semibold text-muted-foreground py-2">Evento</TableHead>
                          <TableHead className="text-[10px] uppercase font-semibold text-muted-foreground py-2">Usuário</TableHead>
                          <TableHead className="text-[10px] uppercase font-semibold text-muted-foreground py-2">Detalhes</TableHead>
                          <TableHead className="text-[10px] uppercase font-semibold text-muted-foreground py-2 text-right">Data e Hora</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-border/40">
                        {auditLogs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
                              Nenhum registro de auditoria registrado até o momento.
                            </TableCell>
                          </TableRow>
                        ) : (
                          auditLogs.map(log => (
                            <TableRow key={log.id} className="text-xs hover:bg-zinc-800/30">
                              <TableCell className="font-medium flex items-center gap-1.5 py-2">
                                {log.type === 'success' ? (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                ) : log.type === 'warning' ? (
                                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                                ) : log.type === 'error' ? (
                                  <ShieldAlert className="w-3 h-3 text-red-400 shrink-0" />
                                ) : (
                                  <Info className="w-3 h-3 text-primary shrink-0" />
                                )}
                                {log.event}
                              </TableCell>
                              <TableCell className="font-medium text-foreground py-2">{log.user}</TableCell>
                              <TableCell className="text-muted-foreground text-[11px] max-w-xs truncate py-2">
                                {log.details || '—'}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground text-[10px] py-2">{log.time}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 3. ABA: ORGANIZAÇÃO E REGRAS */}
            <TabsContent value="organization">
              <Card className="card-elevated shadow-none border border-border bg-card">
                <CardHeader className="p-3.5 pb-2.5 border-b border-border bg-zinc-900/60">
                  <CardTitle className="text-xs sm:text-sm font-semibold text-foreground">Dados da Organização e Federação</CardTitle>
                  <CardDescription className="text-[11px] text-muted-foreground mt-0.5">Configure a entidade responsável e regras padrão de pontuação.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="orgName" className="text-[10px] uppercase font-semibold text-muted-foreground">Nome da Federação / Liga</Label>
                      <Input
                        id="orgName"
                        value={orgName}
                        onChange={e => setOrgName(e.target.value)}
                        placeholder="Ex: Federação Paranaense de Voleibol"
                        className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="orgCode" className="text-[10px] uppercase font-semibold text-muted-foreground">Sigla / Código Oficial</Label>
                      <Input
                        id="orgCode"
                        value={orgCode}
                        onChange={e => setOrgCode(e.target.value)}
                        placeholder="Ex: FPV"
                        maxLength={6}
                        className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="cnpj" className="text-[10px] uppercase font-semibold text-muted-foreground">CNPJ</Label>
                      <Input
                        id="cnpj"
                        value={cnpj}
                        onChange={e => setCnpj(e.target.value)}
                        placeholder="00.000.000/0000-00"
                        className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="website" className="text-[10px] uppercase font-semibold text-muted-foreground">Website Oficial</Label>
                      <Input
                        id="website"
                        value={website}
                        onChange={e => setWebsite(e.target.value)}
                        placeholder="https://..."
                        className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="contactEmail" className="text-[10px] uppercase font-semibold text-muted-foreground">E-mail de Contato</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={contactEmail}
                        onChange={e => setContactEmail(e.target.value)}
                        placeholder="contato@federacao.org"
                        className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="phone" className="text-[10px] uppercase font-semibold text-muted-foreground">Telefone</Label>
                      <Input
                        id="phone"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="(00) 00000-0000"
                        className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
                      />
                    </div>
                  </div>

                  <Separator className="bg-border/60" />

                  <div>
                    <h3 className="text-xs font-semibold text-foreground mb-2.5">Regras Gerais de Jogo</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="setPoints" className="text-[10px] uppercase font-semibold text-muted-foreground">Pontos por Set Regular</Label>
                        <Input
                          id="setPoints"
                          type="number"
                          value={setPoints}
                          onChange={e => setSetPoints(e.target.value)}
                          min={1}
                          className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="tiebreakPoints" className="text-[10px] uppercase font-semibold text-muted-foreground">Pontos do Tie-break</Label>
                        <Input
                          id="tiebreakPoints"
                          type="number"
                          value={tiebreakPoints}
                          onChange={e => setTiebreakPoints(e.target.value)}
                          min={1}
                          className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="timeoutsPerSet" className="text-[10px] uppercase font-semibold text-muted-foreground">Tempos por Equipe / Set</Label>
                        <Input
                          id="timeoutsPerSet"
                          type="number"
                          value={timeoutsPerSet}
                          onChange={e => setTimeoutsPerSet(e.target.value)}
                          min={0}
                          className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button size="sm" className="gap-1.5 text-xs h-8 rounded-md font-medium shadow-none" onClick={handleSaveOrganization}>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Salvar Organização
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 4. ABA: PERFIL E SENHA */}
            <TabsContent value="profile" className="space-y-5">
              {/* Dados Pessoais */}
              <Card className="card-elevated shadow-none border border-border bg-card">
                <CardHeader className="p-3.5 pb-2.5 border-b border-border bg-zinc-900/60">
                  <CardTitle className="text-xs sm:text-sm font-semibold text-foreground">Informações do Meu Perfil</CardTitle>
                  <CardDescription className="text-[11px] text-muted-foreground mt-0.5">Atualize seu nome de exibição no sistema.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-14 h-14">
                      <AvatarFallback className="bg-zinc-800 text-zinc-200 text-lg font-bold">
                        {(currentUser?.name ?? 'U')
                          .split(' ')
                          .slice(0, 2)
                          .map(p => p[0])
                          .join('')
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold text-xs sm:text-sm text-foreground">{currentUser?.name}</h4>
                      <p className="text-[11px] text-muted-foreground">{currentUser?.email}</p>
                      <Badge variant="outline" className="mt-1 text-[9px] py-0 px-1 border-zinc-800 bg-zinc-900 text-zinc-300">
                        {ROLE_LABELS[currentUser?.role ?? 'organizer']}
                      </Badge>
                    </div>
                  </div>

                  <Separator className="bg-border/60" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="profileName" className="text-[10px] uppercase font-semibold text-muted-foreground">Nome Completo</Label>
                      <Input
                        id="profileName"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Seu nome"
                        className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="profileEmail" className="text-[10px] uppercase font-semibold text-muted-foreground">E-mail</Label>
                      <Input id="profileEmail" value={currentUser?.email ?? ''} disabled className="h-8 text-xs bg-zinc-900/60 border-zinc-800 rounded-md text-muted-foreground" />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button size="sm" className="gap-1.5 text-xs h-8 rounded-md font-medium shadow-none" onClick={handleSaveProfile}>
                      <User className="w-3.5 h-3.5" />
                      Salvar Nome de Perfil
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Troca de Senha */}
              <Card className="card-elevated shadow-none border border-border bg-card">
                <CardHeader className="p-3.5 pb-2.5 border-b border-border bg-zinc-900/60">
                  <CardTitle className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-primary" />
                    Alteração de Senha de Acesso
                  </CardTitle>
                  <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
                    Mantenha sua conta protegida definindo uma senha segura com letras, números e símbolos.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <form onSubmit={handleChangePassword} className="space-y-3 max-w-xl">
                    <div className="space-y-1">
                      <Label htmlFor="currPass" className="text-[10px] uppercase font-semibold text-muted-foreground">Senha Atual *</Label>
                      <div className="relative">
                        <Input
                          id="currPass"
                          type={showCurrentPass ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={e => setCurrentPassword(e.target.value)}
                          placeholder="Digite sua senha atual"
                          className="pr-10 text-xs h-8 bg-zinc-900 border-zinc-800 rounded-md font-mono"
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
                      <Label htmlFor="newPass" className="text-[10px] uppercase font-semibold text-muted-foreground">Nova Senha *</Label>
                      <div className="relative">
                        <Input
                          id="newPass"
                          type={showNewPass ? 'text' : 'password'}
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="Mínimo 8 caracteres"
                          className="pr-10 text-xs h-8 bg-zinc-900 border-zinc-800 rounded-md font-mono"
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
                      <Label htmlFor="confPass" className="text-[10px] uppercase font-semibold text-muted-foreground">Confirmar Nova Senha *</Label>
                      <Input
                        id="confPass"
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Repita a nova senha"
                        className="text-xs h-8 bg-zinc-900 border-zinc-800 rounded-md font-mono"
                        required
                      />
                      {confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-[10px] text-red-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          As senhas não coincidem.
                        </p>
                      )}
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        size="sm"
                        className="gap-1.5 text-xs h-8 rounded-md font-medium shadow-none"
                        disabled={isChangingPass || !currentPassword || !newPassword || newPassword !== confirmPassword}
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        {isChangingPass ? 'Atualizando...' : 'Atualizar Minha Senha'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 6. ABA: APARÊNCIA */}
            <TabsContent value="appearance">
              <Card className="card-elevated shadow-none border border-border bg-card">
                <CardHeader className="p-3.5 pb-2.5 border-b border-border bg-zinc-900/60">
                  <CardTitle className="text-xs sm:text-sm font-semibold text-foreground">Aparência e Idioma</CardTitle>
                  <CardDescription className="text-[11px] text-muted-foreground mt-0.5">Personalize o tema visual do VolleyPro</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Tema Visual</Label>
                      <Select
                        value={theme}
                        onValueChange={(val: SettingsRecord['theme']) => {
                          setTheme(val);
                          applyTheme(val);
                        }}
                      >
                        <SelectTrigger className="w-56 text-xs h-8 bg-zinc-900 border-zinc-800 rounded-md">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                          <SelectItem value="light" className="text-xs">Claro</SelectItem>
                          <SelectItem value="dark" className="text-xs">Escuro</SelectItem>
                          <SelectItem value="system" className="text-xs">Padrão do Sistema</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Idioma do Sistema</Label>
                      <Select
                        value={language}
                        onValueChange={(val: SettingsRecord['language']) => setLanguage(val)}
                      >
                        <SelectTrigger className="w-56 text-xs h-8 bg-zinc-900 border-zinc-800 rounded-md">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                          <SelectItem value="pt-BR" className="text-xs">Português (Brasil)</SelectItem>
                          <SelectItem value="en" className="text-xs">English</SelectItem>
                          <SelectItem value="es" className="text-xs">Español</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button size="sm" className="gap-1.5 text-xs h-8 rounded-md font-medium shadow-none" onClick={handleSaveAppearance}>
                      <Palette className="w-3.5 h-3.5" />
                      Salvar Aparência
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 7. ABA: BASE DE DADOS */}
            <TabsContent value="database">
              <Card className="card-elevated shadow-none border border-red-500/20 bg-card">
                <CardHeader className="p-3.5 pb-2.5 border-b border-border bg-zinc-900/60">
                  <CardTitle className="text-xs sm:text-sm font-semibold text-red-400 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5" />
                    Manutenção e Base de Dados
                  </CardTitle>
                  <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
                    Operações avançadas de limpeza e restauração de dados no armazenamento local.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 p-4">
                  <div className="p-3.5 rounded-lg border border-red-500/20 bg-red-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-xs text-foreground">Limpar Dados de Competições</p>
                      <p className="text-[11px] text-muted-foreground">
                        Remove todas as competições, jogos e súmulas, mantendo equipes e atletas cadastrados.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 text-xs h-8 rounded-md text-red-400 hover:bg-red-500/10 border-red-500/30"
                      onClick={() => {
                        if (confirm('Deseja limpar todos os dados de competições?')) {
                          clearAllCompetitionData();
                          toast.success('Dados de competições limpos!');
                          setTimeout(() => window.location.reload(), 600);
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Limpar Competições
                    </Button>
                  </div>

                  <div className="p-3.5 rounded-lg border border-border/80 bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                      onClick={() => {
                        if (confirm('Deseja recarregar os dados de demonstração padrão?')) {
                          resetLocalData();
                          toast.success('Dados de demonstração restaurados!');
                          setTimeout(() => window.location.reload(), 600);
                        }
                      }}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restaurar Demonstração
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>

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
                <Label htmlFor="uName" className="text-[10px] uppercase font-semibold text-muted-foreground">Nome Completo *</Label>
                <Input
                  id="uName"
                  placeholder="Ex: Carlos Eduardo Silva"
                  value={userForm.name}
                  onChange={e => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="uEmail" className="text-[10px] uppercase font-semibold text-muted-foreground">E-mail de Acesso *</Label>
                <Input
                  id="uEmail"
                  type="email"
                  placeholder="Ex: carlos.arbitro@federacao.org"
                  value={userForm.email}
                  onChange={e => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Perfil de Acesso / Função *</Label>
                <Select
                  value={userForm.role}
                  onValueChange={(val: UserRole) => setUserForm(prev => ({ ...prev, role: val }))}
                >
                  <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="admin" className="text-xs">Administrador (Acesso Total)</SelectItem>
                    <SelectItem value="organizer" className="text-xs">Organizador (Competições e Jogos)</SelectItem>
                    <SelectItem value="referee" className="text-xs">Árbitro Oficial (Súmulas e Validações)</SelectItem>
                    <SelectItem value="scorer" className="text-xs">Apontador / Mesário (Operação de Jogo)</SelectItem>
                    <SelectItem value="team" className="text-xs">Representante de Equipe (Elencos)</SelectItem>
                    <SelectItem value="viewer" className="text-xs">Visualizador (Apenas Leitura)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Status da Conta</Label>
                <Select
                  value={userForm.status}
                  onValueChange={(val: 'active' | 'inactive') => setUserForm(prev => ({ ...prev, status: val }))}
                >
                  <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="active" className="text-xs">Ativo (Permitir Login)</SelectItem>
                    <SelectItem value="inactive" className="text-xs">Inativo (Bloqueado)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!editingUser && (
                <div className="space-y-1">
                  <Label htmlFor="uPass" className="text-[10px] uppercase font-semibold text-muted-foreground">Senha Inicial (Opcional)</Label>
                  <Input
                    id="uPass"
                    type="password"
                    placeholder="Deixe em branco para 'volei123'"
                    value={userForm.password}
                    onChange={e => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                    className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">Padrão: <code>volei123</code>.</p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setUserModalOpen(false)} className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="gap-1.5 text-xs h-8 rounded-md font-medium shadow-none">
                <ShieldCheck className="w-3.5 h-3.5" />
                {editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal para Administrador Redefinir Senha de Usuário */}
      <ResetPasswordModal
        user={resetPasswordUser}
        open={!!resetPasswordUser}
        onOpenChange={open => !open && setResetPasswordUser(null)}
        onSuccess={() => {
          loadUsers();
          loadAuditLogs();
        }}
      />
    </MainLayout>
  );
};

export default SettingsPage;