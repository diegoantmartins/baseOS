import { motion } from 'framer-motion';
import { 
  Settings, 
  User, 
  Building,
  Bell,
  Shield,
  Palette,
  FileText,
  Upload,
  Save,
  Globe
} from 'lucide-react';
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

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const SettingsPage = () => {
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
                        AD
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Button variant="outline" className="gap-2">
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
                      <Input id="name" defaultValue="Administrador Sistema" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" defaultValue="admin@volleypro.com.br" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input id="phone" defaultValue="(11) 99999-9999" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Função</Label>
                      <Select defaultValue="admin">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="organizer">Organizador</SelectItem>
                          <SelectItem value="referee">Árbitro</SelectItem>
                          <SelectItem value="coach">Técnico</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button variant="accent" className="gap-2">
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
                      <Input id="org-name" defaultValue="Federação Paulista de Volleyball" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-code">Código/Sigla</Label>
                      <Input id="org-code" defaultValue="FPV" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-cnpj">CNPJ</Label>
                      <Input id="org-cnpj" defaultValue="00.000.000/0001-00" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-website">Website</Label>
                      <Input id="org-website" defaultValue="https://fpv.com.br" />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-semibold">Regras Padrão</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Pontos para vencer set</Label>
                        <Select defaultValue="25">
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
                        <Select defaultValue="15">
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
                        <Select defaultValue="2">
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
                    <Button variant="accent" className="gap-2">
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
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Novos jogos agendados</p>
                        <p className="text-sm text-muted-foreground">Receber notificação quando um jogo for agendado</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Jogos ao vivo</p>
                        <p className="text-sm text-muted-foreground">Notificar quando um jogo começar</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Resultados finais</p>
                        <p className="text-sm text-muted-foreground">Receber resultado ao final de cada jogo</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Súmulas pendentes</p>
                        <p className="text-sm text-muted-foreground">Alertar sobre súmulas não finalizadas</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Email diário</p>
                        <p className="text-sm text-muted-foreground">Resumo diário por email</p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Templates Tab */}
            <TabsContent value="templates">
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle>Templates de Súmula</CardTitle>
                  <CardDescription>Gerencie os modelos de súmula para impressão</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { name: 'Súmula 3 Sets - Quadra', type: 'indoor-3-sets', uploaded: true },
                      { name: 'Súmula 5 Sets - Quadra', type: 'indoor-5-sets', uploaded: true },
                      { name: 'Súmula 1 Set - Praia', type: 'beach-1-set', uploaded: true },
                      { name: 'Súmula 2/3 Sets - Praia', type: 'beach-3-sets', uploaded: true },
                      { name: 'Ordem de Saque', type: 'serve-order', uploaded: true },
                    ].map((template, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{template.name}</p>
                            <p className="text-xs text-muted-foreground">PDF Template</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          {template.uploaded ? 'Atualizar' : 'Upload'}
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold mb-4">Upload de Novo Template</h4>
                    <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                      <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Arraste um arquivo PDF ou clique para selecionar
                      </p>
                      <Button variant="outline">Selecionar Arquivo</Button>
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
                      <div className="p-4 rounded-xl border-2 border-accent bg-muted/30 cursor-pointer text-center">
                        <div className="w-full h-16 rounded-lg bg-background border mb-2" />
                        <p className="text-sm font-medium">Claro</p>
                      </div>
                      <div className="p-4 rounded-xl border-2 border-border bg-muted/30 cursor-pointer text-center">
                        <div className="w-full h-16 rounded-lg bg-foreground mb-2" />
                        <p className="text-sm font-medium">Escuro</p>
                      </div>
                      <div className="p-4 rounded-xl border-2 border-border bg-muted/30 cursor-pointer text-center">
                        <div className="w-full h-16 rounded-lg bg-gradient-to-b from-background to-foreground mb-2" />
                        <p className="text-sm font-medium">Sistema</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <Label>Idioma</Label>
                    <Select defaultValue="pt-BR">
                      <SelectTrigger className="w-[200px]">
                        <Globe className="w-4 h-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt-BR">Português (BR)</SelectItem>
                        <SelectItem value="en-US">English (US)</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                      </SelectContent>
                    </Select>
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
