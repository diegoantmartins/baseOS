import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ListOrdered, Eye, Printer, Download, Loader2, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  buildMatchDocument,
  loadDocumentEdits,
  loadMatchContext,
} from '@/services/documentEditorService';
import {
  buildOrdemSaqueData,
  buildSumulaData,
  generateFiveSetScoresheet,
  generateServeOrderSheet,
  generateThreeSetScoresheet,
} from '@/document-engine/generators';
import type { MatchRecord, CompetitionRecord } from '@/types/entities';

type Tab = 'sumula' | 'ficha';

interface Props {
  match: MatchRecord | null;
  competition: CompetitionRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MatchSheetEmitDialog({ match, competition, open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('sumula');
  const [loading, setLoading] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !match) {
      setPdfBlobUrl(null);
      return;
    }

    let isCancelled = false;
    setLoading(true);

    (async () => {
      try {
        const ctx = await loadMatchContext(match.id);
        if (!ctx) throw new Error('Não foi possível carregar a partida');

        const doc = buildMatchDocument(ctx);
        const format = doc.format;
        const docType = format === '5-sets' ? 'SUMMULA_5' : 'SUMMULA_3';
        const templateKind = format === '5-sets' ? 'sumula5' : 'sumula3';

        const { edit, layout } = await loadDocumentEdits(match.id, docType, templateKind);
        const options = {
          layoutOverrides: layout?.fields,
          valueOverrides: edit?.values,
        };

        let bytes: Uint8Array;
        if (tab === 'ficha') {
          bytes = await generateServeOrderSheet(buildOrdemSaqueData(doc), options);
        } else if (format === '5-sets') {
          bytes = await generateFiveSetScoresheet(buildSumulaData(doc), options);
        } else {
          bytes = await generateThreeSetScoresheet(buildSumulaData(doc), options);
        }

        if (!isCancelled) {
          const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          setPdfBlobUrl(prev => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        }
      } catch (err) {
        console.error(err);
        toast.error('Erro ao gerar documento oficial.');
      } finally {
        if (!isCancelled) setLoading(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [open, match, competition, tab]);

  const handlePreview = () => {
    if (!pdfBlobUrl) return;
    window.open(pdfBlobUrl, '_blank');
    toast.success('Visualizando súmula oficial homologada em nova aba.');
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
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 60000);
    };
    toast.success('Enviado para impressão!');
  };

  const handleDownload = () => {
    if (!pdfBlobUrl || !match) return;
    const a = document.createElement('a');
    a.href = pdfBlobUrl;
    const safeA = match.teamAShortName || match.teamAName;
    const safeB = match.teamBShortName || match.teamBName;
    const filename = tab === 'ficha'
      ? `ordem_saque_jogo_${match.matchNumber}_${safeA}_x_${safeB}.pdf`
      : `sumula_oficial_cbv_jogo_${match.matchNumber}_${safeA}_x_${safeB}.pdf`;
    a.download = filename.replace(/[^\w.-]/g, '_');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Súmula oficial homologada baixada!');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground font-bold">
            <FileText className="w-5 h-5 text-primary" />
            Emissão de Súmula Oficial CBV / FPV
          </DialogTitle>
          <DialogDescription className="text-xs">
            {match
              ? `Jogo #${match.matchNumber}: ${match.teamAName} vs ${match.teamBName} · ${match.phase ?? 'Fase de Grupos'}`
              : 'Selecione uma partida para gerar o documento oficial'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Tabs value={tab} onValueChange={v => setTab(v as Tab)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sumula" className="gap-2 text-xs">
                <FileText className="w-3.5 h-3.5" />
                Súmula Oficial ({competition?.setFormat === '5-sets' ? '5 Sets / A3' : '3 Sets / A4'})
              </TabsTrigger>
              <TabsTrigger value="ficha" className="gap-2 text-xs">
                <ListOrdered className="w-3.5 h-3.5" />
                Ordem de Saque / Posição
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="p-3 bg-muted/40 rounded-xl border border-border/60 text-xs space-y-1.5">
            <p className="font-semibold text-foreground flex items-center justify-between">
              <span>Padrão Oficial CBV / FPV Homologado</span>
              <span className="text-[10px] text-primary font-mono uppercase bg-primary/10 px-2 py-0.5 rounded">
                Document Engine
              </span>
            </p>
            <p className="text-muted-foreground text-[11px]">
              O documento inclui cabeçalho oficial, escalação I a VI, quadrículas de pontos de 1 a 32, quadro de sanções, comissão técnica e assinaturas.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePreview}
              disabled={loading || !pdfBlobUrl}
              className="text-xs gap-1.5"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
              Visualizar
            </Button>

            <Button
              type="button"
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
              type="button"
              variant="accent"
              size="sm"
              onClick={handleDownload}
              disabled={loading || !pdfBlobUrl}
              className="text-xs gap-1.5 font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar PDF Oficial
            </Button>
          </div>
      </DialogContent>
    </Dialog>
  );
}