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
        <motion.div variants={item}>
          <h1 className="text-3xl font-display font-bold text-foreground">Configurações do Sistema</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie usuários com acesso ao sistema, políticas de segurança, regras e preferências gerais.
          </p>
        </motion.div>

        <motion.div variants={item}>
          <Tabs defaultValue="users" className="space-y-6">
            <TabsList className="bg-muted/50 flex-wrap h-auto p-1 border border-border/60">
              <TabsTrigger value="users" className="gap-2 text-xs">
                <Users className="w-4 h-4 text-primary" />
                Usuários do Sistema
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Segurança & Auditoria
              </TabsTrigger>
              <TabsTrigger value="organization" className="gap-2 text-xs">
                <Building className="w-4 h-4" />
                Organização & Regras
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-2 text-xs">
                <User className="w-4 h-4" />
                Meu Perfil & Senha
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2 text-xs">
                <Bell className="w-4 h-4" />
                Notificações
              </TabsTrigger>
              <TabsTrigger value="appearance" className="gap-2 text-xs">
                <Palette className="w-4 h-4" />
                Aparência
              </TabsTrigger>
              <TabsTrigger value="database" className="gap-2 text-xs text-destructive">
                <Database className="w-4 h-4" />
                Base de Dados
              </TabsTrigger>
            </TabsList>

            {/* 1. ABA: USUÁRIOS DO SISTEMA */}
            <TabsContent value="users" className="space-y-4">
              <Card className="card-elevated">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      Gestão de Usuários do Sistema
                    </CardTitle>
                    <CardDescription>
                      Cadastre administradores, organizadores, árbitros e mesários com controle granular de acesso e senhas.
                    </CardDescription>
                  </div>
                  <Button variant="accent" className="gap-2 text-xs font-semibold shrink-0" onClick={openCreateUserModal}>
                    <UserPlus className="w-4 h-4" />
                    Cadastrar Usuário
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Filtros de Usuários */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nome ou e-mail..."
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                        className="pl-9 text-xs h-9"
                      />
                    </div>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-48 text-xs h-9">
                        <SelectValue placeholder="Filtrar por perfil" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Perfis</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="organizer">Organizador</SelectItem>
                        <SelectItem value="referee">Árbitro</SelectItem>
                        <SelectItem value="scorer">Apontador / Mesário</SelectItem>
                        <SelectItem value="team">Representante Equipe</SelectItem>
                        <SelectItem value="viewer">Visualizador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tabela de Usuários */}
                  <div className="border rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="text-xs font-bold">Usuário</TableHead>
                          <TableHead className="text-xs font-bold">Perfil de Acesso</TableHead>
                          <TableHead className="text-xs font-bold">Status</TableHead>
                          <TableHead className="text-xs font-bold">Último Acesso</TableHead>
                          <TableHead className="text-xs font-bold text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
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
                               <TableRow key={u.id} className="hover:bg-muted/30">
                                 <TableCell>
                                   <div className="flex items-center gap-3">
                                     <Avatar className="w-8 h-8">
                                       <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                         {u.name.charAt(0).toUpperCase()}
                                       </AvatarFallback>
                                     </Avatar>
                                     <div>
                                       <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                         {u.name}
                                         {isMe && <Badge variant="outline" className="text-[9px] py-0 px-1">Você</Badge>}
                                       </div>
                                       <div className="text-[11px] text-muted-foreground">{u.email}</div>
                                     </div>
                                   </div>
                                 </TableCell>
                                 <TableCell>
                                   <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border border-muted/20 text-muted-foreground">
                                     {ROLE_LABELS[u.role] || u.role}
                                   </span>
                                 </TableCell>
                                <TableCell>
<Badge
          variant={u.status === 'active' ? 'default' : 'secondary'}
          className={`text-[10px] cursor-pointer ${
            u.status === 'active'
              ? 'bg-muted/20 text-muted-foreground hover:bg-muted/30'
              : 'bg-muted/10 text-muted-foreground hover:bg-muted/20'
          }`}
          onClick={() => handleToggleUserStatus(u)}
        >
          {u.status === 'active' ? 'Ativo' : 'Inativo'}
        </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {u.lastLoginAt
                                    ? new Date(u.lastLoginAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                                    : 'Ainda não acessou'}
                                </TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => setResetPasswordUser(u)}>
                                        <KeyRound className="w-3.5 h-3.5 mr-2 text-primary" />
                                        Redefinir Senha
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openEditUserModal(u)}>
                                        <Edit2 className="w-3.5 h-3.5 mr-2" />
                                        Editar Dados
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleToggleUserStatus(u)}>
                                        <Shield className="w-3.5 h-3.5 mr-2" />
                                        {u.status === 'active' ? 'Desativar Acesso' : 'Ativar Acesso'}
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => handleDeleteUser(u)}
                                        className="text-destructive focus:text-destructive"
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

            {/* 2. ABA: SEGURANÇA & AUDITORIA */}
            <TabsContent value="security" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Políticas de Senha e Autenticação */}
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lock className="w-4 h-4 text-primary" />
                      Políticas de Autenticação & Senhas
                    </CardTitle>
                    <CardDescription>Defina os padrões de segurança para contas e controle de inatividade.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold text-foreground">Exigir Senhas Fortes</p>
                        <p className="text-[11px] text-muted-foreground">Mínimo de 8 caracteres, letras maiúsculas/minúsculas e números.</p>
                      </div>
                      <Switch
                        checked={securityPrefs.requireStrongPassword}
                        onCheckedChange={v => setSecurityPrefs(prev => ({ ...prev, requireStrongPassword: v }))}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold text-foreground">Auto-Logout por Inatividade</p>
                        <p className="text-[11px] text-muted-foreground">Desconectar automaticamente após período sem interação.</p>
                      </div>
                      <Switch
                        checked={securityPrefs.inactivityTimeoutEnabled}
                        onCheckedChange={v => setSecurityPrefs(prev => ({ ...prev, inactivityTimeoutEnabled: v }))}
                      />
                    </div>
                    {securityPrefs.inactivityTimeoutEnabled && (
                      <div className="flex items-center justify-between gap-4 pl-3 border-l-2 border-primary/40">
                        <div>
                          <p className="text-xs font-medium text-foreground">Tempo Limite de Inatividade</p>
                          <p className="text-[11px] text-muted-foreground">Aviso com contagem regressiva de 60 segundos antes de deslogar.</p>
                        </div>
                        <Select
                          value={String(securityPrefs.inactivityTimeoutMinutes)}
                          onValueChange={v => setSecurityPrefs(prev => ({ ...prev, inactivityTimeoutMinutes: Number(v) }))}
                        >
                          <SelectTrigger className="w-32 text-xs h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 Minutos</SelectItem>
                            <SelectItem value="30">30 Minutos</SelectItem>
                            <SelectItem value="60">1 Hora</SelectItem>
                            <SelectItem value="120">2 Horas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <Separator />
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold text-foreground">Autenticação em Duas Etapas (2FA)</p>
                        <p className="text-[11px] text-muted-foreground">Exigir código OTP por aplicativo autenticador.</p>
                      </div>
                      <Switch
                        checked={securityPrefs.twoFactorEnabled}
                        onCheckedChange={v => setSecurityPrefs(prev => ({ ...prev, twoFactorEnabled: v }))}
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="border-t bg-muted/20 py-3">
                    <Button variant="accent" size="sm" className="gap-2 text-xs" onClick={handleSaveSecurityPreferences}>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Salvar Políticas de Segurança
                    </Button>
                  </CardFooter>
                </Card>

                {/* Sessão Ativa & Dispositivo */}
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Laptop className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Sessão Atual & Dispositivo Conectado
                    </CardTitle>
                    <CardDescription>Informações de segurança da conexão ativa no navegador.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Conexão Segura & Criptografada</p>
                        <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                          Sua sessão está ativa com token verificado, proteção contra injeções e rate limit de 5 tentativas.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1.5 border-b">
                        <span className="text-muted-foreground">Usuário Logado:</span>
                        <span className="font-semibold">{currentUser?.name ?? 'Demonstração'} ({currentUser?.email ?? 'local'})</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b">
                        <span className="text-muted-foreground">Perfil de Acesso:</span>
                        <span className="font-semibold text-primary">{ROLE_LABELS[currentUser?.role ?? 'organizer']}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b">
                        <span className="text-muted-foreground">Ambiente:</span>
                        <span className="font-semibold">VolleyPro PWA / Web Client</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
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
              <Card className="card-elevated">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <History className="w-4 h-4 text-primary" />
                      Registro de Auditoria do Sistema (Audit Logs)
                    </CardTitle>
                    <CardDescription>Rastreabilidade em tempo real de acessos, trocas de senha e alterações críticas.</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={loadAuditLogs}>
                      <RefreshCw className="w-3.5 h-3.5" />
                      Atualizar
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:bg-destructive/10" onClick={handleClearAuditLogs}>
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Limpar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="text-xs font-bold">Evento</TableHead>
                          <TableHead className="text-xs font-bold">Usuário Responsável</TableHead>
                          <TableHead className="text-xs font-bold">Detalhes</TableHead>
                          <TableHead className="text-xs font-bold text-right">Data & Hora</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
                              Nenhum registro de auditoria registrado até o momento.
                            </TableCell>
                          </TableRow>
                        ) : (
                          auditLogs.map(log => (
                            <TableRow key={log.id} className="text-xs">
                              <TableCell className="font-medium flex items-center gap-2">
                                {log.type === 'success' ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                ) : log.type === 'warning' ? (
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                ) : log.type === 'error' ? (
                                  <ShieldAlert className="w-3.5 h-3.5 text-destructive shrink-0" />
                                ) : (
                                  <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                                )}
                                {log.event}
                              </TableCell>
                              <TableCell className="font-medium">{log.user}</TableCell>
                              <TableCell className="text-muted-foreground text-[11px] max-w-xs truncate">
                                {log.details || '—'}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground text-[11px]">{log.time}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 3. ABA: ORGANIZAÇÃO & REGRAS */}
            <TabsContent value="organization">
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle>Dados da Organização & Federação</CardTitle>
                  <CardDescription>Configure a entidade responsável e regras padrão de pontuação.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="orgName">Nome da Federação / Liga</Label>
                      <Input
                        id="orgName"
                        value={orgName}
                        onChange={e => setOrgName(e.target.value)}
                        placeholder="Ex: Federação Paranaense de Voleibol"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="orgCode">Sigla / Código Oficial</Label>
                      <Input
                        id="orgCode"
                        value={orgCode}
                        onChange={e => setOrgCode(e.target.value)}
                        placeholder="Ex: FPV"
                        maxLength={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input
                        id="cnpj"
                        value={cnpj}
                        onChange={e => setCnpj(e.target.value)}
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website Oficial</Label>
                      <Input
                        id="website"
                        value={website}
                        onChange={e => setWebsite(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactEmail">E-mail de Contato</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={contactEmail}
                        onChange={e => setContactEmail(e.target.value)}
                        placeholder="contato@federacao.org"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-sm font-semibold mb-3">Regras Gerais de Jogo</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="setPoints">Pontos por Set Regular</Label>
                        <Input
                          id="setPoints"
                          type="number"
                          value={setPoints}
                          onChange={e => setSetPoints(e.target.value)}
                          min={1}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tiebreakPoints">Pontos do Tie-break</Label>
                        <Input
                          id="tiebreakPoints"
                          type="number"
                          value={tiebreakPoints}
                          onChange={e => setTiebreakPoints(e.target.value)}
                          min={1}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="timeoutsPerSet">Tempos por Equipe / Set</Label>
                        <Input
                          id="timeoutsPerSet"
                          type="number"
                          value={timeoutsPerSet}
                          onChange={e => setTimeoutsPerSet(e.target.value)}
                          min={0}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button variant="accent" className="gap-2" onClick={handleSaveOrganization}>
                      <ShieldCheck className="w-4 h-4" />
                      Salvar Organização
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 4. ABA: PERFIL & SENHA */}
            <TabsContent value="profile" className="space-y-6">
              {/* Dados Pessoais */}
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle>Informações do Meu Perfil</CardTitle>
                  <CardDescription>Atualize seu nome de exibição no sistema.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-6">
                    <Avatar className="w-20 h-20">
                      <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                        {(currentUser?.name ?? 'U')
                          .split(' ')
                          .slice(0, 2)
                          .map(p => p[0])
                          .join('')
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold text-base">{currentUser?.name}</h4>
                      <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
                      <Badge variant="outline" className="mt-1 text-[10px] text-primary">
                        {ROLE_LABELS[currentUser?.role ?? 'organizer']}
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="profileName">Nome Completo</Label>
                      <Input
                        id="profileName"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Seu nome"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profileEmail">E-mail</Label>
                      <Input id="profileEmail" value={currentUser?.email ?? ''} disabled />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button variant="accent" className="gap-2 text-xs" onClick={handleSaveProfile}>
                      <User className="w-4 h-4" />
                      Salvar Nome de Perfil
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Troca de Senha */}
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <KeyRound className="w-4 h-4 text-primary" />
                    Alteração de Senha de Acesso
                  </CardTitle>
                  <CardDescription>
                    Mantenha sua conta protegida definindo uma senha segura com letras, números e símbolos.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
                    <div className="space-y-2">
                      <Label htmlFor="currPass" className="text-xs font-semibold">Senha Atual *</Label>
                      <div className="relative">
                        <Input
                          id="currPass"
                          type={showCurrentPass ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={e => setCurrentPassword(e.target.value)}
                          placeholder="Digite sua senha atual"
                          className="pr-10 text-xs"
                          required
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowCurrentPass(!showCurrentPass)}
                          tabIndex={-1}
                        >
                          {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPass" className="text-xs font-semibold">Nova Senha *</Label>
                      <div className="relative">
                        <Input
                          id="newPass"
                          type={showNewPass ? 'text' : 'password'}
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="Mínimo 8 caracteres (letras, números, símbolos)"
                          className="pr-10 text-xs font-mono"
                          required
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowNewPass(!showNewPass)}
                          tabIndex={-1}
                        >
                          {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <PasswordStrengthIndicator password={newPassword} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confPass" className="text-xs font-semibold">Confirmar Nova Senha *</Label>
                      <Input
                        id="confPass"
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Repita exatamente a nova senha"
                        className="text-xs font-mono"
                        required
                      />
                      {confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-[11px] text-destructive flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          As senhas não coincidem.
                        </p>
                      )}
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        variant="accent"
                        className="gap-2 text-xs font-semibold"
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

            {/* 5. ABA: NOTIFICAÇÕES */}
            <TabsContent value="notifications">
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle>Preferências de Notificações</CardTitle>
                  <CardDescription>Controle quando e como deseja ser avisado pelo sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    {NOTIFICATION_ITEMS.map(n => (
                      <div key={n.key} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm text-foreground">{n.title}</p>
                          <p className="text-xs text-muted-foreground">{n.description}</p>
                        </div>
                        <Switch
                          checked={notifications[n.key]}
                          onCheckedChange={checked =>
                            setNotifications(prev => ({ ...prev, [n.key]: checked }))
                          }
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <Button variant="accent" className="gap-2" onClick={handleSaveNotifications}>
                      <Bell className="w-4 h-4" />
                      Salvar Preferências
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 6. ABA: APARÊNCIA */}
            <TabsContent value="appearance">
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle>Aparência & Idioma</CardTitle>
                  <CardDescription>Personalize o tema visual do VolleyPro</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Tema Visual</Label>
                      <Select
                        value={theme}
                        onValueChange={(val: SettingsRecord['theme']) => {
                          setTheme(val);
                          applyTheme(val);
                        }}
                      >
                        <SelectTrigger className="w-64 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Claro</SelectItem>
                          <SelectItem value="dark">Escuro</SelectItem>
                          <SelectItem value="system">Padrão do Sistema</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Idioma do Sistema</Label>
                      <Select
                        value={language}
                        onValueChange={(val: SettingsRecord['language']) => setLanguage(val)}
                      >
                        <SelectTrigger className="w-64 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Español</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button variant="accent" className="gap-2" onClick={handleSaveAppearance}>
                      <Palette className="w-4 h-4" />
                      Salvar Aparência
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 7. ABA: BASE DE DADOS */}
            <TabsContent value="database">
              <Card className="card-elevated border-destructive/30">
                <CardHeader>
                  <CardTitle className="text-destructive flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Manutenção & Base de Dados
                  </CardTitle>
                  <CardDescription>
                    Operações avançadas de limpeza e restauração de dados no armazenamento local.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-semibold text-sm text-foreground">Limpar Dados de Competições</p>
                      <p className="text-xs text-muted-foreground">
                        Remove todas as competições, jogos e súmulas, mantendo equipes e atletas cadastrados.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="shrink-0 text-destructive hover:bg-destructive/10 border-destructive/40"
                      onClick={() => {
                        if (confirm('Deseja limpar todos os dados de competições?')) {
                          clearAllCompetitionData();
                          toast.success('Dados de competições limpos!');
                          setTimeout(() => window.location.reload(), 600);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Limpar Competições
                    </Button>
                  </div>

                  <div className="p-4 rounded-xl border border-border/80 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-semibold text-sm text-foreground flex items-center gap-2">
                        <RotateCcw className="w-4 h-4 text-primary" />
                        Restaurar Dados de Demonstração (Seed)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Recarrega os dados padrão de teste com competições, equipes e súmulas homologadas.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="shrink-0 gap-1.5"
                      onClick={() => {
                        if (confirm('Deseja recarregar os dados de demonstração padrão?')) {
                          resetLocalData();
                          toast.success('Dados de demonstração restaurados!');
                          setTimeout(() => window.location.reload(), 600);
                        }
                      }}
                    >
                      <RotateCcw className="w-4 h-4" />
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
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleSaveUserForm}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                {editingUser ? 'Editar Usuário do Sistema' : 'Cadastrar Novo Usuário'}
              </DialogTitle>
              <DialogDescription>
                Informe os dados e defina o perfil de acesso para concessão de permissões.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="uName" className="text-xs font-semibold">Nome Completo *</Label>
                <Input
                  id="uName"
                  placeholder="Ex: Carlos Eduardo Silva"
                  value={userForm.name}
                  onChange={e => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="uEmail" className="text-xs font-semibold">E-mail de Acesso *</Label>
                <Input
                  id="uEmail"
                  type="email"
                  placeholder="Ex: carlos.arbitro@federacao.org"
                  value={userForm.email}
                  onChange={e => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Perfil de Acesso / Função *</Label>
                <Select
                  value={userForm.role}
                  onValueChange={(val: UserRole) => setUserForm(prev => ({ ...prev, role: val }))}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador (Acesso Total)</SelectItem>
                    <SelectItem value="organizer">Organizador (Competições e Jogos)</SelectItem>
                    <SelectItem value="referee">Árbitro Oficial (Súmulas e Validações)</SelectItem>
                    <SelectItem value="scorer">Apontador / Mesário (Operação de Jogo)</SelectItem>
                    <SelectItem value="team">Representante de Equipe (Elencos)</SelectItem>
                    <SelectItem value="viewer">Visualizador (Apenas Leitura)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status da Conta</Label>
                <Select
                  value={userForm.status}
                  onValueChange={(val: 'active' | 'inactive') => setUserForm(prev => ({ ...prev, status: val }))}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo (Permitir Login)</SelectItem>
                    <SelectItem value="inactive">Inativo (Bloqueado)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!editingUser && (
                <div className="space-y-1.5">
                  <Label htmlFor="uPass" className="text-xs font-semibold">Senha Inicial (Opcional)</Label>
                  <Input
                    id="uPass"
                    type="password"
                    placeholder="Deixe em branco para 'volei123'"
                    value={userForm.password}
                    onChange={e => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                    className="text-xs font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">Se não informada, a senha inicial padrão será <code>volei123</code>.</p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setUserModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="accent" size="sm" className="gap-1.5 font-semibold">
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