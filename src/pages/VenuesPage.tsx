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
        <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Locais e Quadras</h1>
            <p className="text-muted-foreground mt-1">
              Cadastre ginásios, arenas e suas quadras para usar nos jogos e súmulas
            </p>
          </div>
          <Button
            variant="accent"
            className="gap-2"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            Novo Local
          </Button>
        </motion.div>

        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <Card className="card-elevated md:col-span-2 lg:col-span-3">
              <CardContent className="p-10 text-center text-muted-foreground">Carregando locais...</CardContent>
            </Card>
          ) : (
            venues.map(venue => (
              <Card key={venue.id} className="card-elevated hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{venue.name}</h3>
                        {venue.address && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {venue.address}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Editar local"
                        onClick={() => {
                          setEditing(venue);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive"
                        aria-label="Excluir local"
                        onClick={() => setDeleting(venue)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Quadras ({venue.courts.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {venue.courts.length === 0 ? (
                        <span className="text-sm text-muted-foreground">Nenhuma quadra cadastrada.</span>
                      ) : (
                        venue.courts.map(court => (
                          <Badge key={court} variant="secondary">
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
            <Card className="card-elevated md:col-span-2 lg:col-span-3">
              <CardContent className="p-12 text-center text-muted-foreground">
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir local?</AlertDialogTitle>
            <AlertDialogDescription>
              O local <strong>{deleting?.name}</strong> será removido. Jogos já agendados nele mantêm o nome digitado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleting(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleting && handleDelete(deleting)}>
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar Local' : 'Novo Local'}</DialogTitle>
          <DialogDescription>
            Cadastre o ginásio/arena e as quadras disponíveis.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="venue-name">Nome do local</Label>
            <Input id="venue-name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Ginásio UNIPAR" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="venue-address">Endereço (opcional)</Label>
            <Input id="venue-address" value={address} onChange={e => setAddress(e.target.value)} placeholder="Ex.: Rua da Integração, s/n" />
          </div>
          <div className="space-y-2">
            <Label>Quadras</Label>
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
              />
              <Button type="button" variant="outline" onClick={addCourt} disabled={!courtInput.trim()}>
                <Plus className="w-4 h-4" />
                Adicionar
              </Button>
            </div>
            {courts.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {courts.map(court => (
                  <Badge key={court} variant="secondary" className="gap-1 pr-1">
                    <Check className="w-3 h-3" />
                    {court}
                    <button
                      type="button"
                      className="ml-0.5 text-muted-foreground hover:text-destructive"
                      aria-label={`Remover ${court}`}
                      onClick={() => setCourts(courts.filter(c => c !== court))}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="accent" disabled={!canSubmit || submitting} onClick={handleSubmit}>
            {submitting ? 'Salvando...' : initial ? 'Salvar Alterações' : 'Criar Local'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default VenuesPage;