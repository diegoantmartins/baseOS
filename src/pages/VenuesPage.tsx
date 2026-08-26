import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  X,
  Check,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { dataAccess } from '@/services/dataAccess';
import { ContextualHelpButton } from '@/components/help/ContextualHelpButton';
import type { VenueRecord } from '@/types/entities';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const VenuesPage = () => {
  const [venues, setVenues] = useState<VenueRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VenueRecord | null>(null);
  const [deleting, setDeleting] = useState<VenueRecord | null>(null);

  const refresh = useCallback(async () => {
    setVenues(await dataAccess.listVenues());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSave = async (input: Omit<VenueRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editing) {
      await dataAccess.updateVenue(editing.id, input);
      toast.success('Local atualizado!');
    } else {
      await dataAccess.createVenue(input);
      toast.success('Local cadastrado!');
    }
    setFormOpen(false);
    setEditing(null);
    await refresh();
  };

  const handleDelete = async (venue: VenueRecord) => {
    await dataAccess.deleteVenue(venue.id);
    toast.success(`"${venue.name}" excluído.`);
    setDeleting(null);
    await refresh();
  };

  return (
    <MainLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Locais e Quadras</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Cadastre ginásios, arenas e suas quadras para uso em jogos e súmulas
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <ContextualHelpButton
              articleId="configurar-locais-quadras"
              label="Como cadastrar quadras"
            />
            <Button
              size="sm"
              className="gap-1.5 text-xs h-8 rounded-md font-medium shadow-none"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Local
            </Button>
          </div>
        </motion.div>

        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {loading ? (
            <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-36 rounded-xl border border-zinc-800 bg-zinc-900/60 animate-pulse" />
              ))}
            </div>
          ) : (
            venues.map(venue => (
              <Card key={venue.id} className="card-elevated hover-raise shadow-none border border-border bg-card group">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700/60 text-zinc-300 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-zinc-400" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-xs sm:text-sm text-foreground truncate">{venue.name}</h3>
                        {venue.address && (
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                            <MapPin className="w-3 h-3 text-zinc-500" />
                            {venue.address}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-zinc-800 rounded-md"
                        aria-label="Editar local"
                        onClick={() => {
                          setEditing(venue);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400 hover:bg-zinc-800 rounded-md"
                        aria-label="Excluir local"
                        onClick={() => setDeleting(venue)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border/40">
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1.5">Quadras ({venue.courts.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {venue.courts.length === 0 ? (
                        <span className="text-xs text-muted-foreground">Nenhuma quadra cadastrada.</span>
                      ) : (
                        venue.courts.map(court => (
                          <Badge key={court} variant="outline" className="text-[10px] py-0 px-1.5 h-4 border-zinc-800 bg-zinc-900 text-zinc-300">
                            {court}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          {!loading && venues.length === 0 && (
            <Card className="card-elevated shadow-none md:col-span-2 lg:col-span-3">
              <CardContent className="p-10 text-center text-xs text-muted-foreground">
                Nenhum local cadastrado. Crie o primeiro para agendar jogos com quadras definidas.
              </CardContent>
            </Card>
          )}
        </motion.div>
      </motion.div>

      <VenueFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing ?? undefined}
        onSubmit={handleSave}
      />
      <AlertDialog open={deleting !== null} onOpenChange={v => { if (!v) setDeleting(null); }}>
        <AlertDialogContent className="bg-zinc-950 border-border p-5 rounded-xl shadow-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold text-foreground">Excluir local?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              O local <strong>{deleting?.name}</strong> será removido. Jogos já agendados nele mantêm o nome digitado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2">
            <AlertDialogCancel onClick={() => setDeleting(null)} className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="h-8 text-xs rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium" onClick={() => deleting && handleDelete(deleting)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

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
    if (courts.some(c => c.toLowerCase() === court.toLowerCase())) {
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
        courts: courts.map(c => c.trim()).filter(Boolean),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-border p-5 rounded-xl shadow-none">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-foreground">{initial ? 'Editar Local' : 'Novo Local'}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Cadastre o ginásio/arena e as quadras disponíveis.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1">
            <Label htmlFor="venue-name" className="text-[10px] uppercase font-semibold text-muted-foreground">Nome do local</Label>
            <Input id="venue-name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Ginásio UNIPAR" className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="venue-address" className="text-[10px] uppercase font-semibold text-muted-foreground">Endereço (opcional)</Label>
            <Input id="venue-address" value={address} onChange={e => setAddress(e.target.value)} placeholder="Ex.: Rua da Integração, s/n" className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Quadras</Label>
            <div className="flex gap-2">
              <Input
                value={courtInput}
                onChange={e => setCourtInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCourt();
                  }
                }}
                placeholder="Ex.: Quadra 1"
                className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
              />
              <Button type="button" variant="outline" size="sm" onClick={addCourt} disabled={!courtInput.trim()} className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60 gap-1 shrink-0">
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </Button>
            </div>
            {courts.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {courts.map(court => (
                  <Badge key={court} variant="outline" className="gap-1 pr-1 text-[10px] h-5 border-zinc-800 bg-zinc-900 text-zinc-300">
                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                    {court}
                    <button
                      type="button"
                      className="ml-0.5 text-zinc-500 hover:text-red-400"
                      aria-label={`Remover ${court}`}
                      onClick={() => setCourts(courts.filter(c => c !== court))}
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
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60">Cancelar</Button>
          <Button size="sm" disabled={!canSubmit || submitting} onClick={handleSubmit} className="h-8 text-xs rounded-md font-medium shadow-none">
            {submitting ? 'Salvando...' : initial ? 'Salvar Alterações' : 'Criar Local'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default VenuesPage;