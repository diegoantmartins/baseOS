/**
 * VenuesPage — Central de Locais e Quadras de Competição (BaseOS)
 * Rotas: /locais e /venues
 *
 * Responsabilidades:
 * - Cadastro e gerenciamento de ginásios, arenas, praias e complexos esportivos
 * - Configuração dinâmica de quadras disponíveis por local
 * - Resumo operacional com métricas de locais e quadras
 * - Busca em tempo real por nome, endereço e quadras
 * - Gestão de estados universais via StateContainer
 * - Diálogos operacionais de criação, edição e exclusão segura com confirmação
 *
 * Design System:
 * - Enterprise Dark SaaS (Zinc-950/900, Âmbar-500)
 * - Tipografia tabular mono para contadores e métricas
 * - Componentes universais: MainLayout, PageHeader, SectionCard, DataTable, StateContainer
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  X,
  Check,
  Search,
  Layers,
  Map,
  Compass,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/Section';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { StateContainer } from '@/components/ui/StateContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ContextualHelpButton } from '@/components/help/ContextualHelpButton';
import { dataAccess } from '@/services/dataAccess';
import type { VenueRecord } from '@/types/entities';

export function VenuesPage() {
  const [venues, setVenues] = useState<VenueRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VenueRecord | null>(null);
  const [deleting, setDeleting] = useState<VenueRecord | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setIsError(false);
      const data = await dataAccess.listVenues();
      setVenues(data);
    } catch (err: unknown) {
      setIsError(true);
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao carregar a lista de locais.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSave = async (input: Omit<VenueRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editing) {
        await dataAccess.updateVenue(editing.id, input);
        toast.success(`Local "${input.name}" atualizado com sucesso!`);
      } else {
        await dataAccess.createVenue(input);
        toast.success(`Local "${input.name}" cadastrado com sucesso!`);
      }
      setFormOpen(false);
      setEditing(null);
      await refresh();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar local.');
    }
  };

  const handleDelete = async (venue: VenueRecord) => {
    try {
      await dataAccess.deleteVenue(venue.id);
      toast.success(`"${venue.name}" excluído.`);
      setDeleting(null);
      await refresh();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir local.');
    }
  };

  // Métricas reais do resumo operacional
  const totalVenues = venues.length;
  const totalCourts = useMemo(
    () => venues.reduce((acc, v) => acc + (v.courts?.length || 0), 0),
    [venues],
  );
  const venuesWithAddress = useMemo(
    () => venues.filter((v) => Boolean(v.address?.trim())).length,
    [venues],
  );
  const avgCourts = totalVenues > 0 ? (totalCourts / totalVenues).toFixed(1) : '0.0';

  // Filtro de busca em tempo real
  const filteredVenues = useMemo(() => {
    if (!searchQuery.trim()) return venues;
    const q = searchQuery.trim().toLowerCase();
    return venues.filter((v) => {
      const nameMatch = v.name.toLowerCase().includes(q);
      const addressMatch = v.address?.toLowerCase().includes(q) || false;
      const courtsMatch = v.courts.some((c) => c.toLowerCase().includes(q));
      return nameMatch || addressMatch || courtsMatch;
    });
  }, [venues, searchQuery]);

  // Colunas da DataTable de Locais
  const columns: DataTableColumn<VenueRecord>[] = [
    {
      id: 'name',
      header: 'Local / Ginásio',
      cell: ({ row }) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="font-semibold text-xs text-foreground truncate">{row.name}</p>
            {row.address ? (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
                {row.address}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground/60 italic">Endereço não informado</p>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'courts',
      header: 'Quadras Cadastradas',
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center gap-1.5 py-1">
          {row.courts.length === 0 ? (
            <span className="text-xs text-muted-foreground italic">Nenhuma quadra</span>
          ) : (
            row.courts.map((court) => (
              <Badge
                key={court}
                variant="outline"
                className="text-[10px] py-0 px-1.5 h-5 border-zinc-800 bg-zinc-900 text-zinc-300 font-mono"
              >
                {court}
              </Badge>
            ))
          )}
        </div>
      ),
    },
    {
      id: 'courtsCount',
      header: 'Total Quadras',
      isNumeric: true,
      align: 'center',
      cell: ({ row }) => (
        <span className="font-mono tabular-nums text-xs font-semibold text-foreground">
          {row.courts.length}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Ações',
      align: 'right',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-zinc-800 rounded-md"
            aria-label="Editar local"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(row);
              setFormOpen(true);
            }}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-400 hover:bg-zinc-800 rounded-md"
            aria-label="Excluir local"
            onClick={(e) => {
              e.stopPropagation();
              setDeleting(row);
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-3.5">
        <PageHeader
          title="Locais e Quadras"
          description="Cadastre e gerencie ginásios, arenas, praias, complexos esportivos e quadras utilizadas pelas competições."
          primaryAction={
            <Button
              size="sm"
              className="gap-1.5 text-xs font-semibold shadow-none"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Local
            </Button>
          }
          secondaryActions={
            <ContextualHelpButton
              articleId="configurar-locais-quadras"
              label="Como cadastrar quadras"
            />
          }
        />

        <StateContainer
          isLoading={loading}
          isError={isError}
          errorTitle="Não foi possível carregar os locais"
          errorDescription={errorMessage}
          onRetry={refresh}
          isEmpty={venues.length === 0}
          emptyTitle="Nenhum local cadastrado"
          emptyDescription="Cadastre o primeiro ginásio ou arena para disponibilizar quadras para o agendamento de confrontos."
          emptyAction={
            <Button
              size="sm"
              className="gap-1.5 text-xs font-semibold shadow-none"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              Cadastrar Primeiro Local
            </Button>
          }
        >
          <div className="space-y-3.5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SectionCard density="dense" className="bg-card/70 border-border/80">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-0.5">
                  <span>Total de Locais</span>
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                </div>
                <p className="text-xl font-bold font-mono tabular-nums text-foreground">
                  {totalVenues}
                </p>
              </SectionCard>

              <SectionCard density="dense" className="bg-card/70 border-border/80">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-0.5">
                  <span>Total de Quadras</span>
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <p className="text-xl font-bold font-mono tabular-nums text-foreground">
                  {totalCourts}
                </p>
              </SectionCard>

              <SectionCard density="dense" className="bg-card/70 border-border/80">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-0.5">
                  <span>Média Quadras/Local</span>
                  <Compass className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <p className="text-xl font-bold font-mono tabular-nums text-foreground">
                  {avgCourts}
                </p>
              </SectionCard>

              <SectionCard density="dense" className="bg-card/70 border-border/80">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-0.5">
                  <span>Endereços Mapeados</span>
                  <Map className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <p className="text-xl font-bold font-mono tabular-nums text-foreground">
                  {venuesWithAddress}
                </p>
              </SectionCard>
            </div>

            <SectionCard
              title="Locais Cadastrados"
              description="Gerencie os complexos esportivos e suas quadras vinculadas."
              divided
            >
              {/* Barra de Filtros */}
              <div className="flex items-center justify-between gap-3 pb-2">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                  <Input
                    placeholder="Buscar por nome do ginásio, endereço ou quadra..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 text-xs pl-8 bg-zinc-900 border-zinc-800"
                  />
                </div>
              </div>

              {/* Tabela Oficial */}
              <DataTable
                data={filteredVenues}
                columns={columns}
                emptyTitle="Nenhum local encontrado"
                emptyDescription="Tente ajustar os termos de busca."
              />
            </SectionCard>
          </div>
        </StateContainer>
      </div>

      {/* Modal Formulário de Criação/Edição */}
      <VenueFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing ?? undefined}
        onSubmit={handleSave}
      />

      {/* Modal Confirmação de Exclusão */}
      <AlertDialog
        open={deleting !== null}
        onOpenChange={(v) => {
          if (!v) setDeleting(null);
        }}
      >
        <AlertDialogContent className="bg-zinc-950 border-border p-5 rounded-xl shadow-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold text-foreground">
              Excluir local?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              O local <strong>{deleting?.name}</strong> será removido do cadastro. Jogos já agendados
              nele mantêm o histórico registrado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2">
            <AlertDialogCancel
              onClick={() => setDeleting(null)}
              className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-8 text-xs rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium"
              onClick={() => deleting && handleDelete(deleting)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}

function VenueFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: VenueRecord;
  onSubmit: (input: Omit<VenueRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [courts, setCourts] = useState<string[]>([]);
  const [courtInput, setCourtInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setAddress(initial?.address ?? '');
      setCourts(initial?.courts ?? []);
      setCourtInput('');
    }
  }, [open, initial]);

  const canSubmit = name.trim().length >= 2;

  const addCourt = () => {
    const court = courtInput.trim();
    if (!court) return;
    if (courts.some((c) => c.toLowerCase() === court.toLowerCase())) {
      setCourtInput('');
      return;
    }
    setCourts([...courts, court]);
    setCourtInput('');
  };

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        address: address.trim() || undefined,
        courts: courts.map((c) => c.trim()).filter(Boolean),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-border p-5 rounded-xl shadow-none">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-foreground">
            {initial ? 'Editar Local' : 'Novo Local'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Cadastre o ginásio/arena e as quadras disponíveis para partidas.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1">
            <Label
              htmlFor="venue-name"
              className="text-[10px] uppercase font-semibold text-muted-foreground"
            >
              Nome do local *
            </Label>
            <Input
              id="venue-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Ginásio Poliesportivo do Riacho"
              className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
            />
          </div>
          <div className="space-y-1">
            <Label
              htmlFor="venue-address"
              className="text-[10px] uppercase font-semibold text-muted-foreground"
            >
              Endereço (opcional)
            </Label>
            <Input
              id="venue-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex.: Rua Rio Negro, 405 - Contagem/MG"
              className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
              Quadras Disponíveis
            </Label>
            <div className="flex gap-2">
              <Input
                value={courtInput}
                onChange={(e) => setCourtInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCourt();
                  }
                }}
                placeholder="Ex.: Quadra Principal, Quadra 1..."
                className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCourt}
                disabled={!courtInput.trim()}
                className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60 gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </Button>
            </div>
            {courts.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1.5">
                {courts.map((court) => (
                  <Badge
                    key={court}
                    variant="outline"
                    className="gap-1 pr-1 text-[10px] h-5 border-zinc-800 bg-zinc-900 text-zinc-300 font-mono"
                  >
                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                    {court}
                    <button
                      type="button"
                      className="ml-0.5 text-zinc-500 hover:text-rose-400 p-0.5"
                      aria-label={`Remover ${court}`}
                      onClick={() => setCourts(courts.filter((c) => c !== court))}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
            className="h-8 text-xs rounded-md font-medium shadow-none"
          >
            {submitting ? 'Salvando...' : initial ? 'Salvar Alterações' : 'Criar Local'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default VenuesPage;