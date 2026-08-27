/**
 * ModalitiesPage — Central Oficial de Modalidades Esportivas e Regras Operacionais (BaseOS)
 * Rota: /modalidades
 *
 * Responsabilidades:
 * - Gestão das modalidades oficiais de voleibol (Quadra e Praia)
 * - Parametrização dos formatos padrão (6x6, 4x4, 2x2, 3x3)
 * - Configuração de regras padrão de sets (Melhor de 3, Melhor de 5, Set Único) e pontuações (Set / Tiebreak)
 * - Mapeamento de competições ativas vinculadas
 * - Gestão universal de estados via StateContainer
 * - Exclusão com confirmação segura via AlertDialog
 *
 * Design System:
 * - Enterprise Dark SaaS (Zinc-950/900, Âmbar-500)
 * - Tipografia tabular mono para contadores e números de pontuação
 * - Componentes universais: MainLayout, PageHeader, SectionCard, DataTable, StateContainer
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Volleyball,
  Waves,
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  Trophy,
  Layers,
  Settings2,
  FileText,
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import type { CompetitionRecord, ModalityRecord } from '@/types/entities';

export interface ModalityView extends ModalityRecord {
  competitionsCount: number;
}

export function ModalitiesPage() {
  const [modalities, setModalities] = useState<ModalityRecord[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Filtros operacionais
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');

  // Modais
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ModalityRecord | null>(null);
  const [viewing, setViewing] = useState<ModalityView | null>(null);
  const [deleting, setDeleting] = useState<ModalityRecord | null>(null);

  const [form, setForm] = useState<{
    name: string;
    type: 'indoor' | 'beach';
    defaultPlayerFormat: string;
    defaultSetFormat: string;
    defaultSetPoints: number;
    defaultTiebreakPoints: number;
    description: string;
  }>({
    name: '',
    type: 'indoor',
    defaultPlayerFormat: '6x6',
    defaultSetFormat: '3-sets',
    defaultSetPoints: 25,
    defaultTiebreakPoints: 15,
    description: '',
  });

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setIsError(false);
      const [list, comps] = await Promise.all([
        dataAccess.listModalities(),
        dataAccess.listCompetitions(),
      ]);
      setModalities(list);
      setCompetitions(comps);
    } catch (err: unknown) {
      setIsError(true);
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao carregar modalidades.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Lista enriquecida com contagem de competições
  const modalityViews = useMemo<ModalityView[]>(() => {
    return modalities.map((mod) => {
      const matchComps = competitions.filter(
        (c) => c.modalityId === mod.id || c.modality === mod.type,
      );
      return {
        ...mod,
        competitionsCount: matchComps.length,
      };
    });
  }, [modalities, competitions]);

  // Filtragem da lista
  const filteredModalities = useMemo(() => {
    return modalityViews.filter((mod) => {
      if (typeFilter !== 'all' && mod.type !== typeFilter) return false;
      if (formatFilter !== 'all' && mod.defaultPlayerFormat !== formatFilter) return false;

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesName = mod.name.toLowerCase().includes(q);
        const matchesDesc = (mod.description || '').toLowerCase().includes(q);
        const matchesFormat = mod.defaultPlayerFormat.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesFormat) return false;
      }
      return true;
    });
  }, [modalityViews, search, typeFilter, formatFilter]);

  // Resumo Operacional em KPIs
  const totalModalities = modalities.length;
  const indoorModalities = useMemo(
    () => modalities.filter((m) => m.type === 'indoor').length,
    [modalities],
  );
  const beachModalities = useMemo(
    () => modalities.filter((m) => m.type === 'beach').length,
    [modalities],
  );
  const linkedCompetitions = useMemo(
    () => modalityViews.reduce((acc, m) => acc + m.competitionsCount, 0),
    [modalityViews],
  );

  // Ações de criação/edição
  const handleOpenCreate = () => {
    setEditing(null);
    setForm({
      name: '',
      type: 'indoor',
      defaultPlayerFormat: '6x6',
      defaultSetFormat: '3-sets',
      defaultSetPoints: 25,
      defaultTiebreakPoints: 15,
      description: '',
    });
    setFormOpen(true);
  };

  const handleOpenEdit = (mod: ModalityRecord) => {
    setEditing(mod);
    setForm({
      name: mod.name,
      type: mod.type,
      defaultPlayerFormat: mod.defaultPlayerFormat,
      defaultSetFormat: mod.defaultSetFormat,
      defaultSetPoints: mod.defaultSetPoints,
      defaultTiebreakPoints: mod.defaultTiebreakPoints,
      description: mod.description || '',
    });
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Informe o nome da modalidade.');
      return;
    }

    try {
      if (editing) {
        await dataAccess.updateModality(editing.id, form);
        toast.success(`Modalidade "${form.name}" atualizada com sucesso!`);
      } else {
        await dataAccess.createModality(form);
        toast.success(`Modalidade "${form.name}" cadastrada com sucesso!`);
      }

      setFormOpen(false);
      await refresh();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar modalidade.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleting) return;
    try {
      await dataAccess.deleteModality(deleting.id);
      toast.success(`Modalidade "${deleting.name}" removida.`);
      setDeleting(null);
      await refresh();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao remover modalidade.');
    }
  };

  // Colunas da DataTable de Modalidades
  const columns: DataTableColumn<ModalityView>[] = [
    {
      id: 'name',
      header: 'Modalidade',
      cell: ({ row }) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-center shrink-0">
            {row.type === 'beach' ? (
              <Waves className="w-4 h-4 text-amber-400" />
            ) : (
              <Volleyball className="w-4 h-4 text-primary" />
            )}
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="font-semibold text-xs text-foreground truncate">{row.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {row.description || 'Regras oficiais padronizadas'}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'type',
      header: 'Ambiente',
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className="text-[10px] py-0 px-2 h-5 border-zinc-800 bg-zinc-900 text-zinc-300 font-mono uppercase"
        >
          {row.type === 'beach' ? 'Praia' : 'Quadra'}
        </Badge>
      ),
    },
    {
      id: 'format',
      header: 'Formato de Atletas',
      align: 'center',
      cell: ({ row }) => (
        <Badge
          variant="secondary"
          className="text-[10px] py-0 px-2 h-5 bg-zinc-800 text-zinc-200 font-mono font-semibold"
        >
          {row.defaultPlayerFormat}
        </Badge>
      ),
    },
    {
      id: 'rules',
      header: 'Sets & Pontuação',
      cell: ({ row }) => {
        const setLabels: Record<string, string> = {
          '3-sets': 'Melhor de 3',
          '5-sets': 'Melhor de 5',
          '1-set': 'Set Único',
        };
        return (
          <div className="text-xs space-y-0.5 font-mono">
            <p className="font-medium text-foreground text-[11px]">
              {setLabels[row.defaultSetFormat] || row.defaultSetFormat}
            </p>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              {row.defaultSetPoints} pts · Tiebreak {row.defaultTiebreakPoints} pts
            </p>
          </div>
        );
      },
    },
    {
      id: 'competitions',
      header: 'Competições',
      isNumeric: true,
      align: 'center',
      cell: ({ row }) => (
        <span className="font-mono tabular-nums text-xs font-semibold text-foreground">
          {row.competitionsCount}
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
            aria-label="Ver detalhes e regulamento"
            onClick={(e) => {
              e.stopPropagation();
              setViewing(row);
            }}
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-zinc-800 rounded-md"
            aria-label="Editar modalidade"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEdit(row);
            }}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400 hover:bg-zinc-800 rounded-md"
            aria-label="Excluir modalidade"
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
        {/* PageHeader Oficial */}
        <PageHeader
          title="Modalidades Esportivas"
          description="Gerencie modalidades, formatos e regras operacionais utilizadas nas competições."
          primaryAction={
            <Button
              size="sm"
              className="gap-1.5 text-xs font-semibold shadow-none"
              onClick={handleOpenCreate}
            >
              <Plus className="w-3.5 h-3.5" />
              Nova Modalidade
            </Button>
          }
          secondaryActions={
            <ContextualHelpButton
              articleId="configurar-modalidade"
              label="Regras de sets e modalidades"
            />
          }
        />

        {/* Gestão de Estados Universais */}
        <StateContainer
          isLoading={loading}
          isError={isError}
          errorTitle="Não foi possível carregar as modalidades"
          errorDescription={errorMessage}
          onRetry={refresh}
          isEmpty={modalities.length === 0}
          emptyTitle="Nenhuma modalidade cadastrada"
          emptyDescription="Cadastre modalidades como Vôlei de Quadra ou Vôlei de Praia para configurar suas competições."
          emptyAction={
            <Button
              size="sm"
              className="gap-1.5 text-xs font-semibold shadow-none"
              onClick={handleOpenCreate}
            >
              <Plus className="w-3.5 h-3.5" />
              Cadastrar Primeira Modalidade
            </Button>
          }
        >
          <div className="space-y-3.5">
            {/* Resumo Operacional em KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SectionCard density="dense" className="bg-card/70 border-border/80">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-0.5">
                  <span>Total de Modalidades</span>
                  <Settings2 className="w-3.5 h-3.5 text-primary" />
                </div>
                <p className="text-xl font-bold font-mono tabular-nums text-foreground">
                  {totalModalities}
                </p>
              </SectionCard>

              <SectionCard density="dense" className="bg-card/70 border-border/80">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-0.5">
                  <span>Vôlei de Quadra</span>
                  <Volleyball className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <p className="text-xl font-bold font-mono tabular-nums text-foreground">
                  {indoorModalities}
                </p>
              </SectionCard>

              <SectionCard density="dense" className="bg-card/70 border-border/80">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-0.5">
                  <span>Vôlei de Praia</span>
                  <Waves className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <p className="text-xl font-bold font-mono tabular-nums text-foreground">
                  {beachModalities}
                </p>
              </SectionCard>

              <SectionCard density="dense" className="bg-card/70 border-border/80">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-0.5">
                  <span>Competições Vinculadas</span>
                  <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <p className="text-xl font-bold font-mono tabular-nums text-foreground">
                  {linkedCompetitions}
                </p>
              </SectionCard>
            </div>

            {/* Listagem de Modalidades com DataTable */}
            <SectionCard
              title="Modalidades Configuradas"
              description="Formatos esportivos e parametrizações operacionais padrão."
              divided
            >
              {/* Barra de Busca e Filtros */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                  <Input
                    placeholder="Buscar por nome, formato ou regulamento..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 text-xs pl-8 bg-zinc-900 border-zinc-800"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[140px] text-xs h-8 bg-zinc-900 border-zinc-800">
                      <SelectValue placeholder="Ambiente" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="all" className="text-xs">Todos Ambientes</SelectItem>
                      <SelectItem value="indoor" className="text-xs">Quadra (Indoor)</SelectItem>
                      <SelectItem value="beach" className="text-xs">Praia (Beach)</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={formatFilter} onValueChange={setFormatFilter}>
                    <SelectTrigger className="w-[130px] text-xs h-8 bg-zinc-900 border-zinc-800">
                      <SelectValue placeholder="Formato" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="all" className="text-xs">Todos Formatos</SelectItem>
                      <SelectItem value="6x6" className="text-xs">6x6 Oficial</SelectItem>
                      <SelectItem value="4x4" className="text-xs">4x4 Misto</SelectItem>
                      <SelectItem value="2x2" className="text-xs">2x2 Dupla</SelectItem>
                      <SelectItem value="3x3" className="text-xs">3x3 Trio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tabela de Modalidades */}
              <DataTable
                data={filteredModalities}
                columns={columns}
                emptyTitle="Nenhuma modalidade encontrada"
                emptyDescription="Tente ajustar os filtros ou a busca textual."
              />
            </SectionCard>
          </div>
        </StateContainer>
      </div>

      {/* Modal Criar/Editar Modalidade */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg bg-zinc-950 border-border p-5 rounded-xl shadow-none">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-foreground">
              {editing ? 'Editar Modalidade' : 'Nova Modalidade'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Defina as regras e formatos padrão aplicados nas competições desta modalidade.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-3.5 pt-1">
            <div className="space-y-1">
              <Label
                htmlFor="name"
                className="text-[10px] uppercase font-semibold text-muted-foreground"
              >
                Nome da Modalidade *
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex.: Vôlei de Quadra Adulto, Vôlei Master, Dupla de Praia..."
                required
                className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Tipo Base
                </Label>
                <Select
                  value={form.type}
                  onValueChange={(val: 'indoor' | 'beach') => setForm({ ...form, type: val })}
                >
                  <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="indoor" className="text-xs">
                      Vôlei de Quadra
                    </SelectItem>
                    <SelectItem value="beach" className="text-xs">
                      Vôlei de Praia
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Formato de Atletas
                </Label>
                <Select
                  value={form.defaultPlayerFormat}
                  onValueChange={(val) => setForm({ ...form, defaultPlayerFormat: val })}
                >
                  <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="6x6" className="text-xs">
                      6x6 (Oficial Quadra)
                    </SelectItem>
                    <SelectItem value="4x4" className="text-xs">
                      4x4 (Misto / Areia)
                    </SelectItem>
                    <SelectItem value="2x2" className="text-xs">
                      2x2 (Dupla Praia)
                    </SelectItem>
                    <SelectItem value="3x3" className="text-xs">
                      3x3 (Trio)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Formato Sets
                </Label>
                <Select
                  value={form.defaultSetFormat}
                  onValueChange={(val) => setForm({ ...form, defaultSetFormat: val })}
                >
                  <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="3-sets" className="text-xs">
                      Melhor de 3
                    </SelectItem>
                    <SelectItem value="5-sets" className="text-xs">
                      Melhor de 5
                    </SelectItem>
                    <SelectItem value="1-set" className="text-xs">
                      Set Único
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Pontos Set
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={form.defaultSetPoints}
                  onChange={(e) =>
                    setForm({ ...form, defaultSetPoints: Number(e.target.value) })
                  }
                  className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Pontos TB
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={form.defaultTiebreakPoints}
                  onChange={(e) =>
                    setForm({ ...form, defaultTiebreakPoints: Number(e.target.value) })
                  }
                  className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label
                htmlFor="desc"
                className="text-[10px] uppercase font-semibold text-muted-foreground"
              >
                Descrição / Regulamento
              </Label>
              <Textarea
                id="desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Observações e particularidades técnicas da modalidade..."
                rows={2}
                className="text-xs bg-zinc-900 border-zinc-800 rounded-md"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFormOpen(false)}
                className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60"
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="h-8 text-xs rounded-md font-medium shadow-none">
                {editing ? 'Salvar Alterações' : 'Cadastrar Modalidade'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhes da Modalidade */}
      <Dialog open={viewing !== null} onOpenChange={(open) => { if (!open) setViewing(null); }}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-border p-5 rounded-xl shadow-none">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Detalhes da Modalidade
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Regulamento técnico e parametrizações operacionais padrão.
            </DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-3 py-1 text-xs">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 font-semibold flex items-center justify-center shrink-0">
                  {viewing.type === 'beach' ? (
                    <Waves className="w-5 h-5 text-amber-400" />
                  ) : (
                    <Volleyball className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{viewing.name}</p>
                  <p className="text-[11px] text-muted-foreground uppercase font-mono">
                    {viewing.type === 'beach' ? 'Vôlei de Praia' : 'Vôlei de Quadra'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-md bg-zinc-900 border border-zinc-800 space-y-0.5">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Formato de Atletas
                  </span>
                  <p className="text-xs font-bold font-mono text-foreground">
                    {viewing.defaultPlayerFormat}
                  </p>
                </div>
                <div className="p-2.5 rounded-md bg-zinc-900 border border-zinc-800 space-y-0.5">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Competições Vinculadas
                  </span>
                  <p className="text-xs font-bold font-mono text-foreground">
                    {viewing.competitionsCount}
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-md bg-zinc-900 border border-zinc-800 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                  Regras Padrão de Sets
                </span>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Formato:</span>
                  <span className="font-medium text-foreground">{viewing.defaultSetFormat}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Pontos por Set:</span>
                  <span className="font-medium text-foreground">{viewing.defaultSetPoints}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Pontos Tiebreak:</span>
                  <span className="font-medium text-foreground">{viewing.defaultTiebreakPoints}</span>
                </div>
              </div>

              {viewing.description && (
                <div className="p-2.5 rounded-md bg-zinc-900/60 border border-zinc-800 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                    Regulamento & Observações
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {viewing.description}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewing(null)}
              className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <AlertDialog open={deleting !== null} onOpenChange={(open) => { if (!open) setDeleting(null); }}>
        <AlertDialogContent className="bg-zinc-950 border-border p-5 rounded-xl shadow-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold text-foreground">
              Remover Modalidade
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Deseja realmente remover a modalidade{' '}
              <strong className="text-foreground">{deleting?.name}</strong>? As competições
              já cadastradas manterão suas regras configuradas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2">
            <AlertDialogCancel className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="h-8 text-xs rounded-md bg-red-600 hover:bg-red-700 text-white font-medium shadow-none"
            >
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}

export default ModalitiesPage;
