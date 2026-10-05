import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Search, Users, Trophy, ShieldCheck, AlertCircle } from 'lucide-react';
import { dataAccess } from '@/services/dataAccess';
import type { OrganizationRecord } from '@/types/identity';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/auth/useAuth';
import { TenantSecurityService } from '@/services/tenantSecurityService';
import { toast } from 'sonner';

export default function OrganizationsPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked' | 'archived'>('all');

  // Modal de Criação
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Contadores por organização
  const [metaCounts, setMetaCounts] = useState<Record<string, { members: number; teams: number; comps: number }>>({});

  const loadData = async () => {
    try {
      setLoading(true);
      const orgs = await dataAccess.listOrganizations();
      setOrganizations(orgs);

      // Carrega métricas para cada organização
      const counts: Record<string, { members: number; teams: number; comps: number }> = {};
      for (const org of orgs) {
        const [members, teams, comps] = await Promise.all([
          dataAccess.listOrganizationMembers(org.id).catch(() => []),
          dataAccess.listOrganizationTeams(org.id).catch(() => []),
          dataAccess.listOrganizationCompetitions(org.id).catch(() => []),
        ]);
        counts[org.id] = {
          members: members.length,
          teams: teams.length,
          comps: comps.length,
        };
      }
      setMetaCounts(counts);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar organizações.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Informe o nome da organização.');
      return;
    }

    try {
      setSubmitting(true);
      const created = await dataAccess.createOrganization({
        name: name.trim(),
        legalName: legalName.trim() || undefined,
        documentNumber: documentNumber.trim() || undefined,
        status: 'active',
      });
      toast.success('Organização criada com sucesso.');
      setIsCreateOpen(false);
      setName('');
      setLegalName('');
      setDocumentNumber('');
      await loadData();
      navigate(`/organizacoes/${created.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar organização.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredOrganizations = useMemo(() => {
    return organizations.filter((org) => {
      const matchesSearch =
        org.name.toLowerCase().includes(search.toLowerCase()) ||
        (org.legalName && org.legalName.toLowerCase().includes(search.toLowerCase())) ||
        (org.documentNumber && org.documentNumber.includes(search));
      const matchesStatus = statusFilter === 'all' || org.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [organizations, search, statusFilter]);

  const canCreate = session?.user.role === 'admin' || session?.user.role === 'organizer';

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-in fade-in duration-300">
      <PageHeader
        title="Organizações"
        description="Gestão de entidades esportivas, federações, clubes e participantes institucionais do BaseOS."
      >
        {canCreate && (
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Organização
          </Button>
        )}
      </PageHeader>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/80 backdrop-blur-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, razão social ou documento..."
            className="pl-9 bg-zinc-950/70 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-amber-500"
          />
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          <Button
            size="sm"
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('all')}
            className={statusFilter === 'all' ? 'bg-zinc-100 text-zinc-900' : 'border-zinc-800 text-zinc-300 hover:bg-zinc-800'}
          >
            Todas ({organizations.length})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'active' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('active')}
            className={statusFilter === 'active' ? 'bg-emerald-600 text-white' : 'border-zinc-800 text-zinc-300 hover:bg-zinc-800'}
          >
            Ativas ({organizations.filter((o) => o.status === 'active').length})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'blocked' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('blocked')}
            className={statusFilter === 'blocked' ? 'bg-rose-600 text-white' : 'border-zinc-800 text-zinc-300 hover:bg-zinc-800'}
          >
            Bloqueadas ({organizations.filter((o) => o.status === 'blocked').length})
          </Button>
        </div>
      </div>

      {/* Lista de Organizações */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-zinc-900/40 border border-zinc-800/50 animate-pulse" />
          ))}
        </div>
      ) : filteredOrganizations.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/30 space-y-3">
          <Building2 className="w-12 h-12 mx-auto text-zinc-600" />
          <h3 className="text-lg font-medium text-zinc-300">Nenhuma organização encontrada</h3>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto">
            Não há organizações correspondentes aos filtros selecionados no momento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrganizations.map((org) => {
            const counts = metaCounts[org.id] || { members: 0, teams: 0, comps: 0 };
            return (
              <Card
                key={org.id}
                onClick={() => navigate(`/organizacoes/${org.id}`)}
                className="bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700/80 hover:bg-zinc-900/70 transition-all cursor-pointer group rounded-xl overflow-hidden shadow-sm"
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-zinc-100 text-lg group-hover:text-amber-400 transition-colors">
                        {org.name}
                      </h3>
                      {org.legalName && (
                        <p className="text-xs text-zinc-400 line-clamp-1">{org.legalName}</p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        org.status === 'active'
                          ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                          : org.status === 'blocked'
                          ? 'border-rose-500/30 text-rose-400 bg-rose-500/10'
                          : 'border-zinc-600 text-zinc-400 bg-zinc-800/50'
                      }
                    >
                      {org.status === 'active' ? 'Ativa' : org.status === 'blocked' ? 'Bloqueada' : 'Arquivada'}
                    </Badge>
                  </div>

                  {org.documentNumber && (
                    <div className="text-xs text-zinc-400 font-mono">
                      Doc: {org.documentNumber}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/60 text-xs">
                    <div className="flex flex-col items-center p-2 rounded-lg bg-zinc-950/40 border border-zinc-800/40">
                      <span className="text-zinc-500 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> Membros
                      </span>
                      <span className="font-semibold text-zinc-200 mt-0.5">{counts.members}</span>
                    </div>

                    <div className="flex flex-col items-center p-2 rounded-lg bg-zinc-950/40 border border-zinc-800/40">
                      <span className="text-zinc-500 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Equipes
                      </span>
                      <span className="font-semibold text-zinc-200 mt-0.5">{counts.teams}</span>
                    </div>

                    <div className="flex flex-col items-center p-2 rounded-lg bg-zinc-950/40 border border-zinc-800/40">
                      <span className="text-zinc-500 flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5" /> Torneios
                      </span>
                      <span className="font-semibold text-zinc-200 mt-0.5">{counts.comps}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Criação */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-zinc-950 border border-zinc-800 text-zinc-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-500" />
              Cadastrar Organização
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="org-name" className="text-xs font-semibold text-zinc-300">
                Nome de Exibição *
              </Label>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Associação Esportiva Vôlei Brasil"
                className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-amber-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="org-legal-name" className="text-xs font-semibold text-zinc-300">
                Razão Social
              </Label>
              <Input
                id="org-legal-name"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="Ex: Associação Esportiva Vôlei Brasil Ltda"
                className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="org-doc" className="text-xs font-semibold text-zinc-300">
                CNPJ ou Registro Institucional
              </Label>
              <Input
                id="org-doc"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="00.000.000/0000-00"
                className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-amber-500 font-mono"
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="border-zinc-800 text-zinc-300 hover:bg-zinc-900"
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold"
              >
                {submitting ? 'Salvando...' : 'Salvar Organização'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
