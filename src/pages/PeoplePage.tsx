import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users2, Search, Pencil, Trash2, Shield, User, Award, Briefcase, Phone, Mail, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
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
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-2.5">
              <Users2 className="w-7 h-7 text-primary" />
              Pessoas & Papéis
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestão integrada de gestores, técnicos, atletas e árbitros com suporte a múltiplos papéis simultâneos.
            </p>
          </div>
          <Button variant="accent" onClick={handleOpenCreate} className="gap-2 self-start sm:self-auto">
            <Plus className="w-4 h-4" />
            Nova Pessoa
          </Button>
        </motion.div>

        {/* Filtros e Busca */}
        <motion.div variants={item} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, apelido, documento ou e-mail..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['all', 'manager', 'coach', 'athlete', 'referee'].map(r => (
              <Button
                key={r}
                variant={roleFilter === r ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-9"
                onClick={() => setRoleFilter(r)}
              >
                {r === 'all' ? 'Todos os Papéis' : ROLE_CONFIG[r as PersonRole]?.label}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Lista de Pessoas */}
        {loading ? (
          <Card className="p-8 text-center text-muted-foreground animate-pulse">Carregando pessoas...</Card>
        ) : filteredPersons.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">Nenhuma pessoa encontrada com os filtros selecionados.</Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPersons.map(person => (
              <motion.div key={person.id} variants={item}>
                <Card className="card-elevated hover:border-primary/40 transition-all flex flex-col justify-between h-full">
                  <CardHeader className="pb-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0 border border-primary/20">
                          {person.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <CardTitle className="text-base font-display leading-tight">{person.fullName}</CardTitle>
                          {person.nickname && (
                            <span className="text-xs text-muted-foreground">"{person.nickname}"</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(person)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(person.id, person.fullName)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Roles Badges */}
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {person.roles.map(r => {
                        const cfg = ROLE_CONFIG[r];
                        if (!cfg) return null;
                        const Icon = cfg.icon;
                        return (
                          <Badge key={r} variant="outline" className={`text-[11px] gap-1 px-2 py-0.5 font-medium ${cfg.color}`}>
                            <Icon className="w-3 h-3" />
                            {cfg.label}
                          </Badge>
                        );
                      })}
                    </div>
                  </CardHeader>

                  <CardContent className="pt-2 text-xs space-y-2 text-muted-foreground border-t border-border/50">
                    {person.documentId && (
                      <p><span className="font-semibold text-foreground">Doc:</span> {person.documentId}</p>
                    )}
                    {person.email && (
                      <p className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        {person.email}
                      </p>
                    )}
                    {person.phone && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        {person.phone}
                      </p>
                    )}
                    {person.teamIds && person.teamIds.length > 0 && (
                      <div className="pt-1">
                        <span className="font-semibold text-foreground block mb-1">Equipes vinculadas:</span>
                        <div className="flex flex-wrap gap-1">
                          {person.teamIds.map(tid => {
                            const t = teams.find(team => team.id === tid);
                            return (
                              <Badge key={tid} variant="secondary" className="text-[10px]">
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
          </div>
        )}
      </motion.div>

      {/* Modal Criar/Editar Pessoa */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Cadastro de Pessoa' : 'Novo Cadastro de Pessoa'}</DialogTitle>
            <DialogDescription>
              Cadastre ou atualize a pessoa e selecione múltiplos papéis conforme aplicável.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  value={form.fullName}
                  onChange={e => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Nome completo..."
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nickname">Nome Esportivo / Apelido</Label>
                <Input
                  id="nickname"
                  value={form.nickname}
                  onChange={e => setForm({ ...form, nickname: e.target.value })}
                  placeholder="Como é conhecido..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="documentId">Documento (CPF / RG)</Label>
                <Input
                  id="documentId"
                  value={form.documentId}
                  onChange={e => setForm({ ...form, documentId: e.target.value })}
                  placeholder="000.000.000-00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="birthDate">Data de Nascimento</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={form.birthDate}
                  onChange={e => setForm({ ...form, birthDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefone / WhatsApp</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            {/* Seleção de Múltiplos Papéis */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <Label className="font-semibold text-foreground block">Papéis / Vínculos Ativos (Permite múltiplos)</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['manager', 'coach', 'athlete', 'referee'] as PersonRole[]).map(r => {
                  const cfg = ROLE_CONFIG[r];
                  const checked = form.roles.includes(r);
                  return (
                    <label
                      key={r}
                      onClick={() => handleToggleRole(r)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${checked ? 'border-primary bg-primary/5 text-foreground font-semibold shadow-xs' : 'border-border/60 bg-muted/20 text-muted-foreground'}`}
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
              <div className="space-y-2 pt-2 border-t border-border/60">
                <Label className="font-semibold text-foreground block">Equipes Vinculadas</Label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1">
                  {teams.map(t => {
                    const checked = form.teamIds.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        onClick={() => handleToggleTeam(t.id)}
                        className={`flex items-center gap-2 p-2 rounded border cursor-pointer text-xs ${checked ? 'border-primary bg-primary/5 font-semibold' : 'border-border/60 bg-muted/20 text-muted-foreground'}`}
                      >
                        <Checkbox checked={checked} onCheckedChange={() => handleToggleTeam(t.id)} />
                        <span className="truncate">{t.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Anotações gerais..."
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="accent">
                Salvar Pessoa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
