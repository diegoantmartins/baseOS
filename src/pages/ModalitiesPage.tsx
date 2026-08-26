import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Volleyball, Pencil, Trash2, Waves, ShieldCheck, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { dataAccess } from '@/services/dataAccess';
import { ContextualHelpButton } from '@/components/help/ContextualHelpButton';
import type { ModalityRecord } from '@/types/entities';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};

export default function ModalitiesPage() {
  const [modalities, setModalities] = useState<ModalityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ModalityRecord | null>(null);

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
    const list = await dataAccess.listModalities();
    setModalities(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
    setModalOpen(true);
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
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Informe o nome da modalidade.');
      return;
    }

    if (editing) {
      await dataAccess.updateModality(editing.id, form);
      toast.success('Modalidade atualizada com sucesso!');
    } else {
      await dataAccess.createModality(form);
      toast.success('Modalidade cadastrada com sucesso!');
    }

    setModalOpen(false);
    await refresh();
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Deseja realmente remover a modalidade "${name}"?`)) {
      await dataAccess.deleteModality(id);
      toast.success('Modalidade excluída.');
      await refresh();
    }
  };

  return (
    <MainLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
              <Volleyball className="w-5 h-5 text-primary" />
              Modalidades Esportivas
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Configure as modalidades e suas regras padrão de pontuação e formato.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <ContextualHelpButton
              articleId="configurar-modalidade"
              label="Regras de sets e modalidades"
            />
            <Button size="sm" onClick={handleOpenCreate} className="gap-1.5 text-xs h-8 rounded-md font-medium shadow-none">
              <Plus className="w-3.5 h-3.5" />
              Nova Modalidade
            </Button>
          </div>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {[1, 2].map(i => (
              <div key={i} className="h-44 rounded-xl border border-zinc-800 bg-zinc-900/60 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {modalities.map(mod => (
              <motion.div key={mod.id} variants={item}>
                <Card className="card-elevated hover-raise shadow-none border border-border bg-card">
                  <CardHeader className="p-4 pb-2.5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700/60 flex items-center justify-center shrink-0">
                          {mod.type === 'beach' ? <Waves className="w-4 h-4 text-zinc-400" /> : <Volleyball className="w-4 h-4 text-zinc-400" />}
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-xs sm:text-sm font-semibold truncate text-foreground">{mod.name}</CardTitle>
                          <Badge variant="outline" className="mt-0.5 text-[9px] py-0 px-1.5 h-4 border-zinc-800 bg-zinc-900 text-zinc-400 uppercase">
                            {mod.type === 'beach' ? 'Praia' : 'Quadra'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-zinc-800 rounded-md" onClick={() => handleOpenEdit(mod)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400 hover:bg-zinc-800 rounded-md" onClick={() => handleDelete(mod.id, mod.name)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-2.5 text-xs">
                    {mod.description && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{mod.description}</p>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2 border-t border-border/40 text-xs">
                      <div className="p-2 rounded-md bg-zinc-900/60 border border-zinc-800 text-center">
                        <span className="text-[9px] uppercase font-semibold text-muted-foreground block">Formato</span>
                        <span className="font-semibold text-foreground text-xs">{mod.defaultPlayerFormat}</span>
                      </div>
                      <div className="p-2 rounded-md bg-zinc-900/60 border border-zinc-800 text-center">
                        <span className="text-[9px] uppercase font-semibold text-muted-foreground block">Sets</span>
                        <span className="font-semibold text-foreground text-xs">{mod.defaultSetFormat}</span>
                      </div>
                      <div className="p-2 rounded-md bg-zinc-900/60 border border-zinc-800 text-center">
                        <span className="text-[9px] uppercase font-semibold text-muted-foreground block">Pts Set</span>
                        <span className="font-semibold text-foreground text-xs tabular-nums">{mod.defaultSetPoints}</span>
                      </div>
                      <div className="p-2 rounded-md bg-zinc-900/60 border border-zinc-800 text-center">
                        <span className="text-[9px] uppercase font-semibold text-muted-foreground block">Tiebreak</span>
                        <span className="font-semibold text-foreground text-xs tabular-nums">{mod.defaultTiebreakPoints}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Modal Criar/Editar Modalidade */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg bg-zinc-950 border-border p-5 rounded-xl shadow-none">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-foreground">{editing ? 'Editar Modalidade' : 'Nova Modalidade'}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Defina as regras e formatos padrão aplicados nas competições desta modalidade.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3.5 pt-1">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-[10px] uppercase font-semibold text-muted-foreground">Nome da Modalidade</Label>
              <Input
                id="name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Vôlei de Quadra, Vôlei Master..."
                required
                className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Tipo Base</Label>
                <Select value={form.type} onValueChange={(val: 'indoor' | 'beach') => setForm({ ...form, type: val })}>
                  <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="indoor" className="text-xs">Vôlei de Quadra</SelectItem>
                    <SelectItem value="beach" className="text-xs">Vôlei de Praia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Formato de Jogadores</Label>
                <Select value={form.defaultPlayerFormat} onValueChange={val => setForm({ ...form, defaultPlayerFormat: val })}>
                  <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="6x6" className="text-xs">6x6 (Oficial Quadra)</SelectItem>
                    <SelectItem value="4x4" className="text-xs">4x4 (Misto / Areia)</SelectItem>
                    <SelectItem value="2x2" className="text-xs">2x2 (Dupla Praia)</SelectItem>
                    <SelectItem value="3x3" className="text-xs">3x3 (Trio)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Formato Sets</Label>
                <Select value={form.defaultSetFormat} onValueChange={val => setForm({ ...form, defaultSetFormat: val })}>
                  <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="3-sets" className="text-xs">Melhor de 3</SelectItem>
                    <SelectItem value="5-sets" className="text-xs">Melhor de 5</SelectItem>
                    <SelectItem value="1-set" className="text-xs">Set Único</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Pontos Set</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.defaultSetPoints}
                  onChange={e => setForm({ ...form, defaultSetPoints: Number(e.target.value) })}
                  className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Pontos TB</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.defaultTiebreakPoints}
                  onChange={e => setForm({ ...form, defaultTiebreakPoints: Number(e.target.value) })}
                  className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="desc" className="text-[10px] uppercase font-semibold text-muted-foreground">Descrição / Regulamento</Label>
              <Textarea
                id="desc"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Observações e particularidades da modalidade..."
                rows={2}
                className="text-xs bg-zinc-900 border-zinc-800 rounded-md"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)} className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="h-8 text-xs rounded-md font-medium shadow-none">
                Salvar Modalidade
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
