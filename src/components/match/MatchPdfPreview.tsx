// =====================================================================
// BaseOS Component - Visualizador e Exportador de Documentos Oficiais
// =====================================================================

import { useEffect, useState } from 'react';
import { FileText, ListOrdered, Download, Eye, Printer, ShieldCheck, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  loadBaseosScoresheetData,
  generateBaseosPdfBlob,
  generateBlankBaseosPdfBlob,
  downloadBaseosScoresheet,
  printBaseosScoresheet,
  type BaseosScoresheetData,
} from '@/document-engine/baseos';
import { toast } from 'sonner';

type DocTab = 'prefilled' | 'blank';

interface MatchPdfPreviewProps {
  matchId?: string;
}

export function MatchPdfPreview({ matchId }: MatchPdfPreviewProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<DocTab>('prefilled');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [scoresheetData, setScoresheetData] = useState<BaseosScoresheetData | null>(null);

  useEffect(() => {
    if (!matchId) return;
    let isCancelled = false;
    setIsGenerating(true);

    (async () => {
      try {
        const data = await loadBaseosScoresheetData(
          matchId,
          activeTab === 'blank' ? 'blank' : 'prefilled',
        );
        if (!data) throw new Error('Não foi possível carregar a partida.');

        if (!isCancelled) {
          setScoresheetData(data);
          const blob =
            activeTab === 'blank'
              ? await generateBlankBaseosPdfBlob(data.document.format)
              : await generateBaseosPdfBlob(data);

          const url = URL.createObjectURL(blob);
          setPdfBlobUrl(prev => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        }
      } catch (err) {
        console.error('Erro ao gerar documento BaseOS:', err);
        toast.error('Erro ao processar a Súmula BaseOS.');
      } finally {
        if (!isCancelled) setIsGenerating(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [matchId, activeTab]);

  const handleDownload = async () => {
    if (!scoresheetData) return;
    try {
      if (activeTab === 'blank') {
        const blob = await generateBlankBaseosPdfBlob(scoresheetData.document.format);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Sumula_BaseOS_Em_Branco_${scoresheetData.document.format}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        await downloadBaseosScoresheet(scoresheetData);
      }
      toast.success('Download da Súmula Oficial BaseOS iniciado!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao baixar documento.');
    }
  };

  const handlePreview = () => {
    if (!pdfBlobUrl) return;
    window.open(pdfBlobUrl, '_blank');
  };

  const handlePrint = async () => {
    if (!scoresheetData) return;
    try {
      await printBaseosScoresheet(scoresheetData);
      toast.success('Enviado para a impressora!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao imprimir.');
    }
  };

  const formatLabel = scoresheetData?.document.format === '5-sets' ? '5 Sets (A4)' : '3 Sets (A4)';

  return (
    <Card className="card-elevated">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-display">
                Súmula Oficial BaseOS ({formatLabel})
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Documento vetorial de alta definição regulamentar (100% nativo)
              </p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1 text-xs">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Padrão Oficial BaseOS
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as DocTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted/50">
            <TabsTrigger value="prefilled" className="gap-1.5 text-xs">
              <Sparkles className="w-3.5 h-3.5" />
              Súmula da Partida (Pré-Preenchida)
            </TabsTrigger>
            <TabsTrigger value="blank" className="gap-1.5 text-xs">
              <FileText className="w-3.5 h-3.5" />
              Súmula em Branco (Impressão Limpa)
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Visualizador do PDF */}
        {pdfBlobUrl && !isGenerating ? (
          <div className="w-full h-[680px] rounded-xl border border-border overflow-hidden bg-slate-900 shadow-inner">
            <iframe
              src={`${pdfBlobUrl}#view=FitH&toolbar=0&navpanes=0`}
              title="Pré-visualização da Súmula BaseOS"
              className="w-full h-full border-0"
            />
          </div>
        ) : (
          <div className="w-full h-[400px] rounded-xl border border-border flex flex-col items-center justify-center bg-muted/20 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground">Renderizando motor documental BaseOS...</p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
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
            Imprimir Súmula
          </Button>

          <Button
            size="sm"
            onClick={handleDownload}
            disabled={isGenerating || !pdfBlobUrl}
            className="text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            Baixar PDF Oficial ({formatLabel})
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}