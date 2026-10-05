// =====================================================================
// BaseOS Component - Modal de Emissão da Súmula Oficial da Partida
// =====================================================================

import { useEffect, useState } from 'react';
import { FileText, Eye, Printer, Download, Loader2, Sparkles, ShieldCheck, ClipboardList, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  loadBaseosScoresheetData,
  generateBaseosPdfBlob,
  generateBlankBaseosPdfBlob,
  generateServeOrderPdfBlob,
  mapScoresheetToServeOrderData,
  type BaseosScoresheetData,
} from '@/document-engine/baseos';
import type { MatchRecord, CompetitionRecord } from '@/types/entities';

type Tab = 'sumula' | 'blank' | 'ordem';

interface Props {
  match: MatchRecord | null;
  competition: CompetitionRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MatchSheetEmitDialog({ match, open, onOpenChange }: Props) {
  const [tab, setTab] = useState<Tab>('sumula');
  const [loading, setLoading] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [currentBlob, setCurrentBlob] = useState<Blob | null>(null);
  const [scoresheetData, setScoresheetData] = useState<BaseosScoresheetData | null>(null);

  useEffect(() => {
    if (!open || !match) {
      setPdfBlobUrl(null);
      setCurrentBlob(null);
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
          let blob: Blob;

          if (tab === 'blank') {
            blob = await generateBlankBaseosPdfBlob(data.document.format);
          } else if (tab === 'ordem') {
            const serveOrderData = mapScoresheetToServeOrderData(data);
            blob = await generateServeOrderPdfBlob(serveOrderData);
          } else {
            blob = await generateBaseosPdfBlob(data);
          }

          setCurrentBlob(blob);
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

  const getDocumentTitle = () => {
    const formatBadge = scoresheetData?.document.format === '5-sets' ? '5 Sets' : '3 Sets';
    if (tab === 'ordem') return `Ordem de Saque BaseOS (${formatBadge})`;
    if (tab === 'blank') return `Súmula Oficial em Branco (${formatBadge})`;
    return `Súmula Oficial BaseOS (${formatBadge})`;
  };

  const getDownloadFileName = () => {
    const matchNum = match?.matchNumber || '1';
    if (tab === 'ordem') return `Ordem_de_Saque_BaseOS_Jogo_${matchNum}.pdf`;
    if (tab === 'blank') return `Sumula_Oficial_BaseOS_${scoresheetData?.document.format || '3-sets'}_Em_Branco.pdf`;
    return `Sumula_Oficial_BaseOS_Jogo_${matchNum}.pdf`;
  };

  const handlePreview = () => {
    if (!pdfBlobUrl) return;
    window.open(pdfBlobUrl, '_blank');
    toast.success('Visualizando documento em nova aba.');
  };

  const handlePrint = () => {
    if (!pdfBlobUrl) return;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = pdfBlobUrl;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    };
    toast.success('Enviado para impressão!');
  };

  const handleDownload = () => {
    if (!currentBlob) return;
    try {
      const url = URL.createObjectURL(currentBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getDownloadFileName();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Download do documento BaseOS concluído!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao baixar documento.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-[95vw] h-[92vh] flex flex-col p-5 bg-background">
        <DialogHeader className="space-y-1 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-xl font-bold font-display">
                {getDocumentTitle()}
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

        <div className="flex-1 flex flex-col min-h-0 gap-3">
          <Tabs value={tab} onValueChange={v => setTab(v as Tab)} className="w-full shrink-0">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sumula" className="text-xs gap-1.5 font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                Súmula Oficial
              </TabsTrigger>
              <TabsTrigger value="blank" className="text-xs gap-1.5 font-medium">
                <FileText className="w-3.5 h-3.5" />
                Súmula em Branco
              </TabsTrigger>
              <TabsTrigger value="ordem" className="text-xs gap-1.5 font-medium">
                <ClipboardList className="w-3.5 h-3.5" />
                Ordem de Saque
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex-1 w-full h-full min-h-0 rounded-lg border border-border overflow-hidden bg-slate-900/60 shadow-inner flex items-center justify-center">
            {loading ? (
              <div className="flex flex-col items-center gap-3 text-white">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-xs text-slate-300">Processando motor documental BaseOS...</span>
              </div>
            ) : pdfBlobUrl ? (
              <iframe
                src={`${pdfBlobUrl}#view=FitH&toolbar=0&navpanes=0`}
                className="w-full h-full border-0"
                title="Pré-visualização do Documento"
              />
            ) : (
              <span className="text-xs text-slate-400">Nenhum documento disponível</span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border shrink-0">
            <p className="text-[11px] text-muted-foreground">
              {tab === 'ordem'
                ? 'Ficha regulamentar independente para preenchimento da formação inicial pelos técnicos.'
                : tab === 'blank'
                  ? 'Súmula limpa oficial para anotação manual com os dados da partida.'
                  : 'Súmula Oficial regulamentar da partida (impressa de forma independente, sem ordem de saque agregada).'}
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
                disabled={loading || !currentBlob}
                className="text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar PDF
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}