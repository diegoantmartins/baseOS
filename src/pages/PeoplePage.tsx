import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users2, Search, Pencil, Trash2, Shield, User, Award, Briefcase, Phone, Mail, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { StateContainer } from '@/components/ui/StateContainer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { dataAccess } from '@/services/dataAccess';
import type { PersonRecord, PersonRole, TeamRecord } from '@/types/entities';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};

const ROLE_CONFIG: Record<PersonRole, { label: string; color: string; icon: React.ElementType }> = {
  manager: { label: 'Gestor', color: 'bg-purple-500/10 text-purple-600 border-purple-200', icon: Briefcase },
  coach: { label: 'Técnico', color: 'bg-blue-500/10 text-blue-600 border-blue-200', icon: Shield },
  athlete: { label: 'Atleta', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', icon: User },
  referee: { label: 'Árbitro', color: 'bg-amber-500/10 text-amber-600 border-amber-200', icon: Award },
};

export default function PeoplePage() {
  const [persons, setPersons] = useState<PersonRecord[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PersonRecord | null>(null);

  const [form, setForm] = useState<{
    fullName: string;
    nickname: string;
    documentId: string;
    birthDate: string;
    email: string;
    phone: string;
    roles: PersonRole[];
    teamIds: string[];
    notes: string;
  }>({
    fullName: '',
    nickname: '',
    documentId: '',
    birthDate: '',
    email: '',
    phone: '',
    roles: ['athlete'],
    teamIds: [],
    notes: '',
  });

  const refresh = useCallback(async () => {
    const [pList, tList] = await Promise.all([
      dataAccess.listPersons(),
      dataAccess.listTeams(),
    ]);
    setPersons(pList);
    setTeams(tList);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredPersons = useMemo(() => {
    return persons.filter(p => {
      if (roleFilter !== 'all' && !p.roles.includes(roleFilter as PersonRole)) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchesName = p.fullName.toLowerCase().includes(q) || (p.nickname?.toLowerCase().includes(q) ?? false);
        const matchesDoc = p.documentId?.toLowerCase().includes(q);
        const matchesEmail = p.email?.toLowerCase().includes(q);
        if (!matchesName && !matchesDoc && !matchesEmail) return false;
      }
      return true;
    });
  }, [persons, roleFilter, search]);

  const handleOpenCreate = () => {
    setEditing(null);
    setForm({
      fullName: '',
      nickname: '',
      documentId: '',
      birthDate: '',
      email: '',
      phone: '',
      roles: ['athlete'],
      teamIds: [],
      notes: '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (p: PersonRecord) => {
    setEditing(p);
    setForm({
      fullName: p.fullName,
      nickname: p.nickname || '',
      documentId: p.documentId || '',
      birthDate: p.birthDate || '',
      email: p.email || '',
      phone: p.phone || '',
      roles: [...p.roles],
      teamIds: p.teamIds ? [...p.teamIds] : [],
      notes: p.notes || '',
    });
    setModalOpen(true);
  };

  const handleToggleRole = (role: PersonRole) => {
    setForm(prev => {
      const exists = prev.roles.includes(role);
      const updated = exists ? prev.roles.filter(r => r !== role) : [...prev.roles, role];
      return { ...prev, roles: updated.length > 0 ? updated : [role] };
    });
  };

  const handleToggleTeam = (teamId: string) => {
    setForm(prev => {
      const exists = prev.teamIds.includes(teamId);
      const updated = exists ? prev.teamIds.filter(id => id !== teamId) : [...prev.teamIds, teamId];
      return { ...prev, teamIds: updated };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      toast.error('Informe o nome completo.');
      return;
    }

    if (editing) {
      await dataAccess.updatePerson(editing.id, form);
      toast.success('Pessoa atualizada com sucesso!');
    } else {
      await dataAccess.createPerson(form);
      toast.success('Pessoa cadastrada com sucesso!');
    }

    setModalOpen(false);
    await refresh();
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Deseja excluir o registro de "${name}"?`)) {
      await dataAccess.deletePerson(id);
      toast.success('Pessoa excluída.');
      await refresh();
    }
  };

  return (
    <MainLayout>
      <div className="space-y-3.5">
        <PageHeader
          title={
            <span className="flex items-center gap-2">
              <Users2 className="w-5 h-5 text-primary" />
              Pessoas e Papéis
            </span>
          }
          description="Gestão integrada de gestores, técnicos, atletas e árbitros com suporte a múltiplos papéis simultâneos."
          primaryAction={
            <Button size="sm" onClick={handleOpenCreate} className="gap-1.5 text-xs h-8 rounded-md font-medium shadow-none">
              <Plus className="w-3.5 h-3.5" />
              Nova Pessoa
            </Button>
          }
        />

        {/* Filtros e Busca */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, apelido, documento ou e-mail..."
              className="pl-8 text-xs h-8 bg-zinc-900 border-zinc-800 rounded-md"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {['all', 'manager', 'coach', 'athlete', 'referee'].map(r => (
              <Button
                key={r}
                variant={roleFilter === r ? 'secondary' : 'ghost'}
                size="sm"
                className={`text-xs h-8 rounded-md px-2.5 ${roleFilter === r ? 'bg-zinc-800 text-foreground' : 'text-muted-foreground hover:bg-zinc-800/60'}`}
                onClick={() => setRoleFilter(r)}
              >
                {r === 'all' ? 'Todos os Papéis' : ROLE_CONFIG[r as PersonRole]?.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Lista de Pessoas com StateContainer */}
        <StateContainer
          isLoading={loading}
          isEmpty={filteredPersons.length === 0}
          emptyTitle="Nenhuma pessoa cadastrada"
          emptyDescription="Cadastre gestores, técnicos, atletas ou árbitros para associá-los às equipes e competições."
          emptyAction={
            <Button size="sm" onClick={handleOpenCreate} className="gap-1.5 text-xs h-8 rounded-md font-medium">
              <Plus className="w-3.5 h-3.5" />
              Cadastrar Primeira Pessoa
            </Button>
          }
        >
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredPersons.map(person => (
              <motion.div key={person.id} variants={item}>
                <Card className="card-elevated hover-raise shadow-none border border-border bg-card flex flex-col justify-between h-full group">
                  <CardHeader className="p-4 pb-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-zinc-800 text-zinc-200 border border-zinc-700/60 font-semibold flex items-center justify-center text-xs shrink-0">
                          {person.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-xs sm:text-sm font-semibold truncate text-foreground">{person.fullName}</CardTitle>
                          {person.nickname && (
                            <span className="text-[11px] text-muted-foreground truncate block">"{person.nickname}"</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-zinc-800 rounded-md" onClick={() => handleOpenEdit(person)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400 hover:bg-zinc-800 rounded-md" onClick={() => handleDelete(person.id, person.fullName)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Roles Badges */}
                    <div className="flex flex-wrap gap-1 pt-2">
                      {person.roles.map(r => {
                        const cfg = ROLE_CONFIG[r];
                        if (!cfg) return null;
                        const Icon = cfg.icon;
                        return (
                          <Badge key={r} variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-4 border-zinc-800 bg-zinc-900 text-zinc-300 font-medium">
                            <Icon className="w-2.5 h-2.5 text-zinc-400" />
                            {cfg.label}
                          </Badge>
                        );
                      })}
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-2 text-xs space-y-1.5 text-muted-foreground border-t border-border/40">
                    {person.documentId && (
                      <p className="text-[11px]"><span className="font-semibold text-foreground">Doc:</span> {person.documentId}</p>
                    )}
                    {person.email && (
                      <p className="flex items-center gap-1.5 text-[11px] truncate">
                        <Mail className="w-3 h-3 shrink-0 text-zinc-500" />
                        {person.email}
                      </p>
                    )}
                    {person.phone && (
                      <p className="flex items-center gap-1.5 text-[11px]">
                        <Phone className="w-3 h-3 shrink-0 text-zinc-500" />
                        {person.phone}
                      </p>
                    )}
                    {person.teamIds && person.teamIds.length > 0 && (
                      <div className="pt-1">
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">Equipes:</span>
                        <div className="flex flex-wrap gap-1">
                          {person.teamIds.map(tid => {
                            const t = teams.find(team => team.id === tid);
                            return (
                              <Badge key={tid} variant="outline" className="text-[9px] py-0 px-1 border-zinc-800 bg-zinc-900 text-zinc-400">
                                {t?.shortName || t?.name || tid}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </StateContainer>
      </div>

      {/* Modal Criar/Editar Pessoa */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-zinc-950 border-border p-5 rounded-xl shadow-none">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-foreground">{editing ? 'Editar Cadastro de Pessoa' : 'Novo Cadastro de Pessoa'}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cadastre ou atualize a pessoa e selecione múltiplos papéis conforme aplicável.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3.5 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label htmlFor="fullName" className="text-[10px] uppercase font-semibold text-muted-foreground">Nome Completo</Label>
                <Input
                  id="fullName"
                  value={form.fullName}
                  onChange={e => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Nome completo..."
                  required
                  className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nickname" className="text-[10px] uppercase font-semibold text-muted-foreground">Nome Esportivo / Apelido</Label>
                <Input
                  id="nickname"
                  value={form.nickname}
                  onChange={e => setForm({ ...form, nickname: e.target.value })}
                  placeholder="Como é conhecido..."
                  className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label htmlFor="documentId" className="text-[10px] uppercase font-semibold text-muted-foreground">Documento (CPF / RG)</Label>
                <Input
                  id="documentId"
                  value={form.documentId}
                  onChange={e => setForm({ ...form, documentId: e.target.value })}
                  placeholder="000.000.000-00"
                  className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="birthDate" className="text-[10px] uppercase font-semibold text-muted-foreground">Data de Nascimento</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={form.birthDate}
                  onChange={e => setForm({ ...form, birthDate: e.target.value })}
                  className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label htmlFor="email" className="text-[10px] uppercase font-semibold text-muted-foreground">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone" className="text-[10px] uppercase font-semibold text-muted-foreground">Telefone / WhatsApp</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
                />
              </div>
            </div>

            {/* Seleção de Múltiplos Papéis */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              <Label className="text-[10px] uppercase font-semibold text-muted-foreground block">Papéis / Vínculos Ativos</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['manager', 'coach', 'athlete', 'referee'] as PersonRole[]).map(r => {
                  const cfg = ROLE_CONFIG[r];
                  const checked = form.roles.includes(r);
                  return (
                    <label
                      key={r}
                      onClick={() => handleToggleRole(r)}
                      className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${checked ? 'border-zinc-700 bg-zinc-800 text-foreground font-medium' : 'border-zinc-800 bg-zinc-900/60 text-muted-foreground'}`}
                    >
                      <Checkbox checked={checked} onCheckedChange={() => handleToggleRole(r)} />
                      <span className="text-xs">{cfg.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Vinculação de Equipes */}
            {teams.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/40">
                <Label className="text-[10px] uppercase font-semibold text-muted-foreground block">Equipes Vinculadas</Label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1">
                  {teams.map(t => {
                    const checked = form.teamIds.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        onClick={() => handleToggleTeam(t.id)}
                        className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer text-xs ${checked ? 'border-zinc-700 bg-zinc-800 text-foreground font-medium' : 'border-zinc-800 bg-zinc-900/60 text-muted-foreground'}`}
                      >
                        <Checkbox checked={checked} onCheckedChange={() => handleToggleTeam(t.id)} />
                        <span className="truncate">{t.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="notes" className="text-[10px] uppercase font-semibold text-muted-foreground">Observações</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Anotações gerais..."
                rows={2}
                className="text-xs bg-zinc-900 border-zinc-800 rounded-md"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)} className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="h-8 text-xs rounded-md font-medium shadow-none">
                Salvar Pessoa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
