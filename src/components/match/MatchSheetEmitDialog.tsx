import { useEffect, useState } from 'react';
import { FileText, ListOrdered, Eye, Printer, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { dataAccess } from '@/services/dataAccess';
import { getMatchRosters } from '@/services/registrationService';
import { buildMatchSheetData } from '@/lib/pdf/matchSheetDataBuilder';
import {
  downloadOfficialPdf,
  generateOfficialMatchSheetPdf,
  generatePositionOrderSheetPdf,
  printOfficialPdf,
  previewOfficialPdf,
} from '@/lib/pdf/officialMatchSheetPdf';
import type { MatchSheetData } from '@/lib/pdf/matchSheetPdf';
import type { CompetitionRecord, MatchRecord } from '@/types/entities';
import { cn } from '@/lib/utils';

type Tab = 'sumula' | 'ficha';

interface Props {
  match: MatchRecord | null;
  competition: CompetitionRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MatchSheetEmitDialog({ match, competition, open, onOpenChange }: Props) {
  const [tab, setTab] = useState<Tab>('sumula');
  const [mode, setMode] = useState<'pre' | 'post'>('pre');
  const [data, setData] = useState<MatchSheetData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !match) return;
    setLoading(true);
    setTab('sumula');
    const isPost = match.status === 'completed' && match.sets.length > 0;
    setMode(isPost ? 'post' : 'pre');
    (async () => {
      try {
        const rosters = await getMatchRosters(match.id);
        const built = await buildMatchSheetData(match, competition, rosters.teamA, rosters.teamB, {
          sheetMode: isPost ? 'post' : 'pre',
        });
        setData(built);
      } catch (error) {
        console.error(error);
        toast.error('Não foi possível carregar os dados da partida.');
      } finally {
        setLoading(false);
      }
    })();
  }, [open, match, competition]);

  const effectiveData = data ? { ...data, sheetMode: mode } : null;

  const handlePreview = () => {
    if (!effectiveData) return;
    try {
      const doc = tab === 'ficha' ? generatePositionOrderSheetPdf(effectiveData) : generateOfficialMatchSheetPdf(effectiveData);
      previewOfficialPdf(doc);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar o documento.');
    }
  };

  const handlePrint = () => {
    if (!effectiveData) return;
    try {
      const doc = tab === 'ficha' ? generatePositionOrderSheetPdf(effectiveData) : generateOfficialMatchSheetPdf(effectiveData);
      printOfficialPdf(doc);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar o documento.');
    }
  };

  const handleDownload = () => {
    if (!effectiveData) return;
    try {
      const safe = effectiveData.teamA.shortName + '_x_' + effectiveData.teamB.shortName;
      const doc = tab === 'ficha'
        ? generatePositionOrderSheetPdf(effectiveData)
        : generateOfficialMatchSheetPdf(effectiveData);
      downloadOfficialPdf(doc, `${tab === 'ficha' ? 'ordem_de_saque' : 'sumula'}_${safe}.pdf`);
      toast.success('Documento gerado!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar o documento.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Emissão de Súmula
          </DialogTitle>
          <DialogDescription>
            {match
              ? `${match.teamAName} x ${match.teamBName} · ${competition?.name ?? match.competitionId}`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Tabs value={tab} onValueChange={v => setTab(v as Tab)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sumula" className="gap-2">
                <FileText className="w-4 h-4" />
                Súmula ({competition?.setFormat === '5-sets' ? '5 Sets' : '3 Sets'})
              </TabsTrigger>
              <TabsTrigger value="ficha" className="gap-2">
                <ListOrdered className="w-4 h-4" />
                Ficha de Posição
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {tab === 'sumula' && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('pre')}
                className={cn(
                  'rounded-xl border p-3 text-left transition-colors',
                  mode === 'pre' ? 'border-accent bg-accent/5 ring-1 ring-accent' : 'border-border hover:bg-muted/40',
                )}
              >
                <p className="font-medium text-sm">Pré-Jogo</p>
                <p className="text-xs text-muted-foreground">Formulário em branco para os mesários preencherem na mesa.</p>
              </button>
              <button
                type="button"
                onClick={() => setMode('post')}
                className={cn(
                  'rounded-xl border p-3 text-left transition-colors',
                  mode === 'post' ? 'border-accent bg-accent/5 ring-1 ring-accent' : 'border-border hover:bg-muted/40',
                )}
              >
                <p className="font-medium text-sm">Pós-Jogo</p>
                <p className="text-xs text-muted-foreground">Consolida o resultado final e o vencedor da partida.</p>
              </button>
            </div>
          )}

          {tab === 'ficha' && (
            <p className="text-xs text-muted-foreground">
              8 fichas de posição (4 por equipe, sets 1-4) com a quadra e as 6 posições de rotação —
              entregue ao mesário antes de cada set, mesmo que o tiebreak não ocorra.
            </p>
          )}

          {loading && (
            <p className="text-sm text-muted-foreground py-4 text-center">Carregando elencos e dados da partida...</p>
          )}

          {!loading && effectiveData && (
            <div className="p-3 rounded-xl bg-muted/50 text-xs text-muted-foreground space-y-1">
              <p>
                <span className="font-medium text-foreground">{effectiveData.teamA.name}</span> vs{' '}
                <span className="font-medium text-foreground">{effectiveData.teamB.name}</span>
              </p>
              <p>
                {effectiveData.date} às {effectiveData.time} · {effectiveData.venue}
                {effectiveData.court ? ` - ${effectiveData.court}` : ''}
              </p>
              <p>
                Elenco: {effectiveData.teamA.athletes.length} x {effectiveData.teamB.athletes.length} atletas ·{' '}
                {effectiveData.category}
              </p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button variant="outline" className="flex-1 gap-2" disabled={!effectiveData || loading} onClick={handlePreview}>
              <Eye className="w-4 h-4" />
              Visualizar
            </Button>
            <Button variant="outline" className="flex-1 gap-2" disabled={!effectiveData || loading} onClick={handlePrint}>
              <Printer className="w-4 h-4" />
              Imprimir
            </Button>
            <Button variant="accent" className="flex-1 gap-2" disabled={!effectiveData || loading} onClick={handleDownload}>
              <Download className="w-4 h-4" />
              Baixar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}