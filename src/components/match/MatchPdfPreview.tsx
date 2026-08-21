import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, ListOrdered, Download, Eye, Printer, Check, ShieldCheck, PenLine, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import type { MatchSheetData } from '@/lib/pdf/matchSheetPdf';
import { toast } from 'sonner';

type DocType = 'sumula' | 'ficha';

interface MatchPdfPreviewProps {
  matchData?: MatchSheetData;
  matchId?: string;
}

export function MatchPdfPreview({ matchData, matchId }: MatchPdfPreviewProps) {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [docType, setDocType] = useState<DocType>('sumula');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!matchId) return;
    let isCancelled = false;
    setIsGenerating(true);

    (async () => {
      try {
        const ctx = await loadMatchContext(matchId);
        if (!ctx) throw new Error('Não foi possível carregar o jogo.');

        const doc = buildMatchDocument(ctx);
        const format = doc.format;
        const documentType = format === '5-sets' ? 'SUMMULA_5' : 'SUMMULA_3';
        const templateKind = format === '5-sets' ? 'sumula5' : 'sumula3';

        const { edit, layout } = await loadDocumentEdits(matchId, documentType, templateKind);
        const options = {
          layoutOverrides: layout?.fields,
          valueOverrides: edit?.values,
        };

        let bytes: Uint8Array;
        if (docType === 'ficha') {
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
      } finally {
        if (!isCancelled) setIsGenerating(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [matchId, docType]);

  const handleDownload = async () => {
    if (!pdfBlobUrl) return;
    const a = document.createElement('a');
    a.href = pdfBlobUrl;
    a.download = `${docType === 'ficha' ? 'ordem_de_saque' : 'sumula_oficial_cbv'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Download da Súmula Oficial iniciado!');
  };

  const handlePreview = () => {
    if (!pdfBlobUrl) return;
    window.open(pdfBlobUrl, '_blank');
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
    toast.success('Enviado para a impressora!');
  };

  return (
    <Card className="card-elevated">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-display">Súmula Oficial CBV / FPV</CardTitle>
              <p className="text-xs text-muted-foreground">
                Documento oficial homologado vetorial padrão federação
              </p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1 text-xs">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Homologado Oficial
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        <Tabs value={docType} onValueChange={v => setDocType(v as DocType)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted/50">
            <TabsTrigger value="sumula" className="gap-2 text-xs">
              <FileText className="w-4 h-4" />
              Súmula Oficial
            </TabsTrigger>
            <TabsTrigger value="ficha" className="gap-2 text-xs">
              <ListOrdered className="w-4 h-4" />
              Ficha de Posição (Ordem de Saque)
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Live PDF Viewer */}
        {pdfBlobUrl ? (
          <div className="w-full h-[520px] rounded-xl border border-border overflow-hidden bg-slate-900 shadow-inner">
            <iframe
              src={`${pdfBlobUrl}#toolbar=0&navpanes=0`}
              title="Pré-visualização da Súmula Oficial"
              className="w-full h-full border-0"
            />
          </div>
        ) : (
          <div className="w-full h-[320px] rounded-xl border border-border flex flex-col items-center justify-center bg-muted/20 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground">Renderizando modelo oficial homologado...</p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreview}
              disabled={isGenerating || !pdfBlobUrl}
              className="text-xs gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              Abrir em Nova Aba
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={isGenerating || !pdfBlobUrl}
              className="text-xs gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
            </Button>

            <Button
              variant="accent"
              size="sm"
              onClick={handleDownload}
              disabled={isGenerating || !pdfBlobUrl}
              className="text-xs gap-1.5 font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar Súmula Oficial
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}