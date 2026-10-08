/**
 * BaseOS — MasterDashboard (/master)
 *
 * Painel Administrativo Global (Platform Admin Layer).
 * Acesso exclusivo para usuários com is_platform_admin = true.
 * Permite cadastrar novas empresas clientes (Organizations), visualizar todas as bases
 * cadastradas em tabela Zebra limpa e realizar a troca de contexto em tempo real.
 *
 * Design System: BaseOS 60/30/10
 * - 60% Neutro / Cards
 * - 30% Tipografia Azul Escuro (text-slate-900 / text-blue-950)
 * - 10% Laranja BaseOS (bg-orange-500 hover:bg-orange-600)
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Building2,
  Plus,
  Search,
  ArrowRightLeft,
  ExternalLink,
  Layers,
  Users,
  Trophy,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { dataAccess } from '@/services/dataAccess';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/components/auth/useAuth';
import { AdminSetupDialog } from '@/components/master/AdminSetupDialog';
import type { OrganizationRecord } from '@/types/identity';
import { toast } from 'sonner';

export default function MasterDashboard() {
  const navigate = useNavigate();
  const {
    currentOrganizationId,
    setOrganizationId,
    refreshOrganizations,
    isPlatformAdmin,
  } = useTenant();
  const { session } = useAuth();

  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked' | 'archived'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal: Configurar Admin de Organização
  const [adminSetupTarget, setAdminSetupTarget] = useState<OrganizationRecord | null>(null);

  // Modal: Nova Empresa / Base
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Carregamento de dados
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const orgs = await dataAccess.listOrganizations();
      setOrganizations(orgs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar organizações.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtros de busca e status
  const filteredOrgs = useMemo(() => {
    return organizations.filter((org) => {
      const matchesStatus = statusFilter === 'all' || org.status === statusFilter;
      const term = search.toLowerCase().trim();
      const matchesSearch =
        !term ||
        org.name.toLowerCase().includes(term) ||
        (org.legalName && org.legalName.toLowerCase().includes(term)) ||
        (org.documentNumber && org.documentNumber.includes(term)) ||
        org.id.toLowerCase().includes(term);

      return matchesStatus && matchesSearch;
    });
  }, [organizations, search, statusFilter]);

  // Submissão do Modal: Criação de Nova Empresa / Base
  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Informe o nome da nova empresa/base.');
      return;
    }

    try {
      setSubmitting(true);
      const newOrg = await dataAccess.createOrganization({
        name: name.trim(),
        legalName: legalName.trim() || undefined,
        documentNumber: documentNumber.trim() || undefined,
        status: 'active',
      });

      toast.success(`Base "${newOrg.name}" cadastrada com sucesso!`, {
        description: 'A nova empresa já está disponível para receber campeonatos e equipes.',
      });

      // Limpa formulário e fecha modal
      setName('');
      setLegalName('');
      setDocumentNumber('');
      setIsModalOpen(false);

      // Recarrega organizações localmente e no contexto global
      await loadData();
      await refreshOrganizations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar organização.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.info('ID da organização copiado para a área de transferência.');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSwitchAndNavigate = (org: OrganizationRecord) => {
    setOrganizationId(org.id);
    navigate('/dashboard');
  };

  const activeCount = useMemo(() => {
    return organizations.filter((o) => o.status === 'active').length;
  }, [organizations]);

  return (
    <MainLayout>
      <div className="space-y-6 pb-12">
        {/* Cabeçalho da Página */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 text-xs px-2.5 py-0.5 font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                Platform Admin
              </Badge>
              <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
                Master Control Layer
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-950 dark:text-slate-100 tracking-tight">
              Painel Master de Bases & Clientes
            </h1>
            <p className="text-sm text-slate-600 dark:text-zinc-400 mt-0.5">
              Gerencie todas as empresas clientes do BaseOS, cadastre novas bases e alterne o contexto de suporte em tempo real.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="gap-2 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs h-9"
              title="Recarregar bases"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>

            {/* Botão BaseOS Orange Pílula */}
            <Button
              onClick={() => setIsModalOpen(true)}
              className="rounded-full bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200 px-5 py-2 text-xs sm:text-sm gap-2"
              id="btn-nova-empresa-base"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Empresa/Base</span>
            </Button>
          </div>
        </div>

        {/* Métricas Resumidas (Cards 60/30) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Total de Bases Cadastradas
                </p>
                <p className="text-2xl font-black text-blue-950 dark:text-blue-100 mt-1">
                  {organizations.length}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-zinc-800 flex items-center justify-center text-blue-900 dark:text-blue-300">
                <Building2 className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Bases em Operação Ativa
                </p>
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                  {activeCount}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Check className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="truncate pr-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Contexto Selecionado
                </p>
                <p className="text-base font-bold text-orange-600 dark:text-orange-400 truncate mt-1">
                  {organizations.find((o) => o.id === currentOrganizationId)?.name || 'Nenhum selecionado'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-zinc-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, documento ou ID..."
              className="pl-9 h-10 text-xs sm:text-sm bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-blue-950 dark:text-slate-100 placeholder:text-slate-400 rounded-lg focus-visible:ring-1 focus-visible:ring-orange-500"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
            {(['all', 'active', 'blocked', 'archived'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-blue-950 text-white dark:bg-orange-500 dark:text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                }`}
              >
                {st === 'all' ? 'Todas' : st === 'active' ? 'Ativas' : st === 'blocked' ? 'Bloqueadas' : 'Arquivadas'}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela Zebra Limpa com Tipografia Azul Escuro */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-100/90 dark:bg-zinc-800/90 border-b border-slate-200 dark:border-zinc-700">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 text-center text-blue-950 dark:text-slate-200 font-bold text-xs uppercase tracking-wider">
                  #
                </TableHead>
                <TableHead className="text-blue-950 dark:text-slate-200 font-bold text-xs uppercase tracking-wider">
                  Empresa / Base
                </TableHead>
                <TableHead className="text-blue-950 dark:text-slate-200 font-bold text-xs uppercase tracking-wider">
                  Razão Social / CNPJ
                </TableHead>
                <TableHead className="text-blue-950 dark:text-slate-200 font-bold text-xs uppercase tracking-wider">
                  Status
                </TableHead>
                <TableHead className="text-blue-950 dark:text-slate-200 font-bold text-xs uppercase tracking-wider">
                  Data de Cadastro
                </TableHead>
                <TableHead className="text-center text-blue-950 dark:text-slate-200 font-bold text-xs uppercase tracking-wider">
                  Contexto Atual
                </TableHead>
                <TableHead className="text-right text-blue-950 dark:text-slate-200 font-bold text-xs uppercase tracking-wider pr-6">
                  Ações de Suporte
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500 dark:text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs">Carregando bases cadastradas...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredOrgs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500 dark:text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <AlertCircle className="w-6 h-6 text-slate-400" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
                        Nenhuma organização encontrada
                      </p>
                      <p className="text-xs text-slate-400">
                        Clique no botão &quot;Nova Empresa/Base&quot; para registrar um novo cliente.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrgs.map((org, index) => {
                  const isCurrent = org.id === currentOrganizationId;
                  // Efeito Zebra: linhas pares com fundo sutil
                  const isEven = index % 2 === 1;

                  return (
                    <TableRow
                      key={org.id}
                      className={`transition-colors border-b border-slate-100 dark:border-zinc-800/80 ${
                        isCurrent
                          ? 'bg-orange-500/10 dark:bg-orange-500/15 font-medium'
                          : isEven
                          ? 'bg-slate-50/70 dark:bg-zinc-800/40 hover:bg-blue-50/60 dark:hover:bg-zinc-800/70'
                          : 'bg-white dark:bg-zinc-900 hover:bg-blue-50/60 dark:hover:bg-zinc-800/70'
                      }`}
                    >
                      {/* Índice */}
                      <TableCell className="text-center font-mono text-xs text-slate-400 dark:text-zinc-500">
                        {index + 1}
                      </TableCell>

                      {/* Nome e ID */}
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              isCurrent
                                ? 'bg-orange-500 text-white shadow-sm'
                                : 'bg-blue-900 text-blue-100 dark:bg-zinc-800 dark:text-zinc-200'
                            }`}
                          >
                            {org.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-blue-950 dark:text-slate-100 leading-tight">
                              {org.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[10px] text-slate-400 dark:text-zinc-500 truncate max-w-[120px]">
                                {org.id}
                              </span>
                              <button
                                onClick={() => handleCopyId(org.id)}
                                className="text-slate-400 hover:text-blue-950 dark:hover:text-white transition-colors"
                                title="Copiar ID da Base"
                              >
                                {copiedId === org.id ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Razão Social e CNPJ */}
                      <TableCell>
                        <div className="text-xs text-blue-950 dark:text-slate-200">
                          {org.legalName || '—'}
                        </div>
                        {org.documentNumber && (
                          <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 mt-0.5">
                            CNPJ: {org.documentNumber}
                          </div>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {org.status === 'active' ? (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 text-[11px] font-semibold">
                            Ativa
                          </Badge>
                        ) : org.status === 'blocked' ? (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400 border border-red-300 dark:border-red-800 text-[11px] font-semibold">
                            Bloqueada
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-400 border border-slate-300 dark:border-zinc-700 text-[11px] font-semibold">
                            Arquivada
                          </Badge>
                        )}
                      </TableCell>

                      {/* Data de Cadastro */}
                      <TableCell className="text-xs text-slate-600 dark:text-zinc-400 font-mono">
                        {org.createdAt
                          ? new Date(org.createdAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })
                          : '—'}
                      </TableCell>

                      {/* Contexto Ativo */}
                      <TableCell className="text-center">
                        {isCurrent ? (
                          <Badge className="bg-orange-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                            Ativo Agora
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-zinc-600">—</span>
                        )}
                      </TableCell>

                      {/* Ações de Suporte */}
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAdminSetupTarget(org)}
                            className="text-xs h-8 px-3 rounded-lg border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                            title="Configurar administrador desta organização"
                          >
                            <Users className="w-3.5 h-3.5 mr-1" />
                            <span className="hidden sm:inline">Config. Admin</span>
                          </Button>

                          <Button
                            variant={isCurrent ? 'secondary' : 'default'}
                            size="sm"
                            onClick={() => handleSwitchAndNavigate(org)}
                            className={`text-xs h-8 px-3 rounded-lg gap-1.5 transition-all ${
                              isCurrent
                                ? 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-500/30 hover:bg-orange-500/30'
                                : 'bg-blue-950 hover:bg-blue-900 text-white dark:bg-zinc-800 dark:hover:bg-zinc-700 shadow-sm'
                            }`}
                            title="Alternar contexto e navegar para o Dashboard desta base"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>{isCurrent ? 'Navegar' : 'Alternar Base'}</span>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/organizacoes/${org.id}`)}
                            className="text-xs h-8 px-2.5 rounded-lg border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
                            title="Ver detalhes da organização"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Modal Dialog: Cadastrar Nova Empresa / Base */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[480px] bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-slate-100 rounded-xl shadow-2xl p-6">
            <DialogHeader className="space-y-1">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-1">
                <Building2 className="w-5 h-5" />
              </div>
              <DialogTitle className="text-xl font-bold text-blue-950 dark:text-slate-100">
                Cadastrar Nova Empresa / Base
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
                Cria uma nova organização cliente no BaseOS com total isolamento multi-tenant (RLS).
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateOrganization} className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="org-name" className="text-xs font-bold text-blue-950 dark:text-slate-200">
                  Nome da Empresa / Base *
                </Label>
                <Input
                  id="org-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Federação Paulista de Voleibol"
                  required
                  className="h-10 text-sm bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-blue-950 dark:text-slate-100 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-orange-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="org-legal-name" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Razão Social (Opcional)
                </Label>
                <Input
                  id="org-legal-name"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="Ex: FPV Promoções Esportivas LTDA"
                  className="h-10 text-sm bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-blue-950 dark:text-slate-100 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-orange-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="org-document" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  CNPJ ou Registro (Opcional)
                </Label>
                <Input
                  id="org-document"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="Ex: 00.000.000/0001-99"
                  className="h-10 text-sm bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-blue-950 dark:text-slate-100 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-orange-500"
                />
              </div>

              <DialogFooter className="pt-3 gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="rounded-full text-xs h-9 border-slate-200 dark:border-zinc-800"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !name.trim()}
                  className="rounded-full bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs h-9 px-6 shadow-md transition-all"
                  id="btn-confirmar-cadastro-base"
                >
                  {submitting ? 'Cadastrando...' : 'Cadastrar Empresa'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal: Configurar Admin de Organização */}
        {adminSetupTarget && session?.user && (
          <AdminSetupDialog
            open={!!adminSetupTarget}
            onOpenChange={(open) => { if (!open) setAdminSetupTarget(null); }}
            organizationId={adminSetupTarget.id}
            organizationName={adminSetupTarget.name}
            currentUserId={session.user.id}
            onSuccess={async () => {
              await loadData();
              await refreshOrganizations();
            }}
          />
        )}
      </div>
    </MainLayout>
  );
}
