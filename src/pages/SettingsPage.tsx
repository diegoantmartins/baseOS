import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Building,
  Bell,
  Palette,
  FileText,
  Upload,
  Save,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { dataAccess } from '@/services/dataAccess';
import type { NotificationPrefs, ScoringRules, SettingsRecord } from '@/types/entities';
import { useAuth } from '@/components/auth/AuthContext';
import { ROLE_LABELS } from '@/types/auth';

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

  const user = session?.user;

  /* Perfil */
  const [name, setName] = useState('');
  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

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
    if (result.ok) toast.success('Perfil atualizado com sucesso.');
    else toast.error(result.error ?? 'Erro ao atualizar o perfil.');
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
          <h1 className="text-3xl font-display font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground mt-1">Gerencie as configurações do sistema</p>
        </motion.div>

        <motion.div variants={item}>
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="bg-muted/50 flex-wrap h-auto p-1">
              <TabsTrigger value="profile" className="gap-2">
                <User className="w-4 h-4" />
                Perfil
              </TabsTrigger>
              <TabsTrigger value="organization" className="gap-2">
                <Building className="w-4 h-4" />
                Organização
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="w-4 h-4" />
                Notificações
              </TabsTrigger>
              <TabsTrigger value="templates" className="gap-2">
                <FileText className="w-4 h-4" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="appearance" className="gap-2">
                <Palette className="w-4 h-4" />
                Aparência
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle>Informações do Perfil</CardTitle>
                  <CardDescription>Atualize suas informações pessoais</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-6">
                    <Avatar className="w-24 h-24">
                      <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                        {(user?.name ?? 'U')
                          .split(' ')
                          .slice(0, 2)
                          .map(p => p[0])
                          .join('')
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => toast.info('Upload de foto disponível com Supabase Storage.')}
                      >
                        <Upload className="w-4 h-4" />
                        Alterar Foto
                      </Button>
                      <p className="text-sm text-muted-foreground mt-2">JPG, PNG. Máximo 2MB.</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome Completo</Label>
                      <Input id="name" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" value={user?.email ?? ''} readOnly disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Função</Label>
                      <Input value={user?.role ? ROLE_LABELS[user.role] : ''} readOnly disabled />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button variant="accent" className="gap-2" onClick={handleSaveProfile}>
                      <Save className="w-4 h-4" />
                      Salvar Alterações
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Organization Tab */}
            <TabsContent value="organization">
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle>Configurações da Organização</CardTitle>
                  <CardDescription>Informações da federação ou liga</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="org-name">Nome da Organização</Label>
                      <Input id="org-name" value={orgName} onChange={e => setOrgName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-code">Código/Sigla</Label>
                      <Input id="org-code" value={orgCode} onChange={e => setOrgCode(e.target.value)} maxLength={8} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-cnpj">CNPJ</Label>
                      <Input id="org-cnpj" value={cnpj} onChange={e => setCnpj(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-website">Website</Label>
                      <Input id="org-website" value={website} onChange={e => setWebsite(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-email">Email de Contato</Label>
                      <Input id="org-email" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-phone">Telefone</Label>
                      <Input id="org-phone" value={phone} onChange={e => setPhone(e.target.value)} />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-semibold">Regras Padrão</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Pontos para vencer set</Label>
                        <Select value={setPoints} onValueChange={setSetPoints}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="21">21 pontos</SelectItem>
                            <SelectItem value="25">25 pontos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Pontos tie-break</Label>
                        <Select value={tiebreakPoints} onValueChange={setTiebreakPoints}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 pontos</SelectItem>
                            <SelectItem value="21">21 pontos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Tempos por set</Label>
                        <Select value={timeoutsPerSet} onValueChange={setTimeoutsPerSet}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 tempo</SelectItem>
                            <SelectItem value="2">2 tempos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button variant="accent" className="gap-2" onClick={handleSaveOrganization}>
                      <Save className="w-4 h-4" />
                      Salvar Configurações
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle>Preferências de Notificação</CardTitle>
                  <CardDescription>Escolha como deseja receber notificações</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    {NOTIFICATION_ITEMS.map((n, idx) => (
                      <div key={n.key}>
                        {idx > 0 && <Separator className="mb-4" />}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{n.title}</p>
                            <p className="text-sm text-muted-foreground">{n.description}</p>
                          </div>
                          <Switch
                            checked={notifications[n.key]}
                            onCheckedChange={v => setNotifications(prev => ({ ...prev, [n.key]: v }))}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <Button variant="accent" className="gap-2" onClick={handleSaveNotifications}>
                      <Save className="w-4 h-4" />
                      Salvar Preferências
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Templates Tab */}
            <TabsContent value="templates">
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle>Templates de Súmula</CardTitle>
                  <CardDescription>As súmulas são geradas automaticamente pelo sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-muted/30">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Súmula oficial da competição</p>
                      <p className="text-sm text-muted-foreground">
                        O sistema gera a súmula oficial (A4 paisagem) com o cabeçalho da organização, escudo do sistema,
                        dados do jogo (data, horário, local, fase/grupo), equipes com escudo e técnico, árbitros e campos
                        em branco para o mesário preencher. A ordem de saque (ficha de posição) é gerada junto, com 8
                        fichas (4 por equipe).
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance">
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle>Aparência</CardTitle>
                  <CardDescription>Personalize a aparência do sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <Label>Tema</Label>
                    <div className="grid grid-cols-3 gap-4">
                      {(
                        [
                          { value: 'light', label: 'Claro' },
                          { value: 'dark', label: 'Escuro' },
                          { value: 'system', label: 'Sistema' },
                        ] as { value: SettingsRecord['theme']; label: string }[]
                      ).map(t => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setTheme(t.value)}
                          className={`p-4 rounded-xl border-2 bg-muted/30 cursor-pointer text-center transition-colors ${
                            theme === t.value ? 'border-accent' : 'border-border'
                          }`}
                        >
                          <div
                            className={`w-full h-16 rounded-lg border mb-2 ${
                              t.value === 'light'
                                ? 'bg-background'
                                : t.value === 'dark'
                                  ? 'bg-foreground'
                                  : 'bg-gradient-to-b from-background to-foreground'
                            }`}
                          />
                          <p className="text-sm font-medium">{t.label}</p>
                          {theme === t.value && (
                            <p className="text-xs text-accent mt-1">Selecionado</p>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <Label>Idioma</Label>
                    <div className="flex items-center gap-4">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <Select value={language} onValueChange={v => setLanguage(v as SettingsRecord['language'])}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pt-BR">Português (BR)</SelectItem>
                          <SelectItem value="en">English (US)</SelectItem>
                          <SelectItem value="es">Español</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button variant="accent" className="gap-2" onClick={handleSaveAppearance}>
                      <Save className="w-4 h-4" />
                      Salvar Aparência
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </MainLayout>
  );
};

export default SettingsPage;