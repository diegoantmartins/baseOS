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
        <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-2.5">
              <Volleyball className="w-7 h-7 text-primary" />
              Modalidades Esportivas
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure as modalidades e suas regras padrão de pontuação e formato.
            </p>
          </div>
          <Button variant="accent" onClick={handleOpenCreate} className="gap-2 self-start sm:self-auto">
            <Plus className="w-4 h-4" />
            Nova Modalidade
          </Button>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-8 text-center text-muted-foreground animate-pulse">Carregando modalidades...</Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {modalities.map(mod => (
              <motion.div key={mod.id} variants={item}>
                <Card className="card-elevated hover:border-primary/40 transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mod.type === 'beach' ? 'bg-amber-500/10 text-amber-600' : 'bg-primary/10 text-primary'}`}>
                          {mod.type === 'beach' ? <Waves className="w-5 h-5" /> : <Volleyball className="w-5 h-5" />}
                        </div>
                        <div>
                          <CardTitle className="text-lg font-display">{mod.name}</CardTitle>
                          <Badge variant="outline" className="mt-1 text-[11px] capitalize">
                            {mod.type === 'beach' ? 'Praia' : 'Quadra'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(mod)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(mod.id, mod.name)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0 text-sm">
                    {mod.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed">{mod.description}</p>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/60 text-xs">
                      <div className="p-2 rounded bg-muted/40 text-center">
                        <span className="text-[10px] uppercase text-muted-foreground block">Formato</span>
                        <span className="font-semibold">{mod.defaultPlayerFormat}</span>
                      </div>
                      <div className="p-2 rounded bg-muted/40 text-center">
                        <span className="text-[10px] uppercase text-muted-foreground block">Sets</span>
                        <span className="font-semibold">{mod.defaultSetFormat}</span>
                      </div>
                      <div className="p-2 rounded bg-muted/40 text-center">
                        <span className="text-[10px] uppercase text-muted-foreground block">Pts Set</span>
                        <span className="font-semibold">{mod.defaultSetPoints} pts</span>
                      </div>
                      <div className="p-2 rounded bg-muted/40 text-center">
                        <span className="text-[10px] uppercase text-muted-foreground block">Tiebreak</span>
                        <span className="font-semibold">{mod.defaultTiebreakPoints} pts</span>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Modalidade' : 'Nova Modalidade'}</DialogTitle>
            <DialogDescription>
              Defina as regras e formatos padrão aplicados nas competições desta modalidade.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome da Modalidade</Label>
              <Input
                id="name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Vôlei de Quadra, Vôlei Master..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo Base</Label>
                <Select value={form.type} onValueChange={(val: 'indoor' | 'beach') => setForm({ ...form, type: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indoor">Vôlei de Quadra</SelectItem>
                    <SelectItem value="beach">Vôlei de Praia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Formato de Jogadores</Label>
                <Select value={form.defaultPlayerFormat} onValueChange={val => setForm({ ...form, defaultPlayerFormat: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6x6">6x6 (Oficial Quadra)</SelectItem>
                    <SelectItem value="4x4">4x4 (Misto / Areia)</SelectItem>
                    <SelectItem value="2x2">2x2 (Dupla Praia)</SelectItem>
                    <SelectItem value="3x3">3x3 (Trio)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Formato Sets</Label>
                <Select value={form.defaultSetFormat} onValueChange={val => setForm({ ...form, defaultSetFormat: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3-sets">Melhor de 3</SelectItem>
                    <SelectItem value="5-sets">Melhor de 5</SelectItem>
                    <SelectItem value="1-set">Set Único</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Pontos Set</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.defaultSetPoints}
                  onChange={e => setForm({ ...form, defaultSetPoints: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Pontos TB</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.defaultTiebreakPoints}
                  onChange={e => setForm({ ...form, defaultTiebreakPoints: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc">Descrição / Regulamento</Label>
              <Textarea
                id="desc"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Observações e particularidades da modalidade..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="accent">
                Salvar Modalidade
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
