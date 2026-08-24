// =====================================================================
// BaseOS Component - Modal de Emissão da Súmula Oficial da Partida
// =====================================================================

import { useEffect, useState } from 'react';
import { FileText, Eye, Printer, Download, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  loadBaseosScoresheetData,
  generateBaseosPdfBlob,
  generateBlankBaseosPdfBlob,
  downloadBaseosScoresheet,
  printBaseosScoresheet,
  type BaseosScoresheetData,
} from '@/document-engine/baseos';
import type { MatchRecord, CompetitionRecord } from '@/types/entities';

type Tab = 'prefilled' | 'blank';

interface Props {
  match: MatchRecord | null;
  competition: CompetitionRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MatchSheetEmitDialog({ match, open, onOpenChange }: Props) {
  const [tab, setTab] = useState<Tab>('prefilled');
  const [loading, setLoading] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [scoresheetData, setScoresheetData] = useState<BaseosScoresheetData | null>(null);

  useEffect(() => {
    if (!open || !match) {
      setPdfBlobUrl(null);
      return;
    }

    let isCancelled = false;
    setLoading(true);

    (async () => {
      try {
        const data = await loadBaseosScoresheetData(
          match.id,
          tab === 'blank' ? 'blank' : 'prefilled',
        );
        if (!data) throw new Error('Não foi possível carregar a partida');

        if (!isCancelled) {
          setScoresheetData(data);
          const blob =
            tab === 'blank'
              ? await generateBlankBaseosPdfBlob(data.document.format)
              : await generateBaseosPdfBlob(data);

          const url = URL.createObjectURL(blob);
          setPdfBlobUrl(prev => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        }
      } catch (err) {
        console.error(err);
        toast.error('Erro ao gerar documento oficial BaseOS.');
      } finally {
        if (!isCancelled) setLoading(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [open, match, tab]);

  const handlePreview = () => {
    if (!pdfBlobUrl) return;
    window.open(pdfBlobUrl, '_blank');
    toast.success('Visualizando Súmula Oficial BaseOS em nova aba.');
  };

  const handlePrint = async () => {
    if (!scoresheetData) return;
    try {
      await printBaseosScoresheet(scoresheetData);
      toast.success('Enviado para impressão!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao imprimir.');
    }
  };

  const handleDownload = async () => {
    if (!scoresheetData) return;
    try {
      if (tab === 'blank') {
        const blob = await generateBlankBaseosPdfBlob(scoresheetData.document.format);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Sumula_Oficial_BaseOS_${scoresheetData.document.format}_Em_Branco.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        await downloadBaseosScoresheet(scoresheetData);
      }
      toast.success('Download da Súmula Oficial BaseOS concluído!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao baixar documento.');
    }
  };

  const formatBadge = scoresheetData?.document.format === '5-sets' ? '5 Sets (A3)' : '3 Sets (A4)';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-6">
        <DialogHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-xl font-bold font-display">
                Súmula Oficial BaseOS ({formatBadge})
              </DialogTitle>
              <Badge variant="outline" className="gap-1 text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Vôlei Oficial
              </Badge>
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {match?.teamAName} vs {match?.teamBName} · Jogo Nº {match?.matchNumber || 1}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          <Tabs value={tab} onValueChange={v => setTab(v as Tab)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="prefilled" className="text-xs gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Súmula da Partida (Pré-Preenchida)
              </TabsTrigger>
              <TabsTrigger value="blank" className="text-xs gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Súmula em Branco (Impressão Limpa)
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex-1 min-h-[460px] rounded-xl border border-border overflow-hidden bg-slate-900 shadow-inner flex items-center justify-center">
            {loading ? (
              <div className="flex flex-col items-center gap-3 text-white">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-xs text-slate-300">Processando motor documental BaseOS...</span>
              </div>
            ) : pdfBlobUrl ? (
              <iframe
                src={`${pdfBlobUrl}#toolbar=0&navpanes=0`}
                className="w-full h-full border-0"
                title="Pré-visualização da Súmula"
              />
            ) : (
              <span className="text-xs text-slate-400">Nenhum documento disponível</span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border">
            <p className="text-[11px] text-muted-foreground">
              Documento vetorial de alta definição com troca de lado no tie-break.
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreview}
                disabled={loading || !pdfBlobUrl}
                className="text-xs gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                Nova Aba
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={loading || !pdfBlobUrl}
                className="text-xs gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir
              </Button>

              <Button
                size="sm"
                onClick={handleDownload}
                disabled={loading || !pdfBlobUrl}
                className="text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar PDF ({formatBadge})
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}