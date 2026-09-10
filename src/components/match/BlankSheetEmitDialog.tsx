// =====================================================================
// BaseOS Component - Modal de Emissão de Súmulas em Branco Padrão
// =====================================================================

import { useState } from 'react';
import { FileSpreadsheet, Download, Printer, Eye, Loader2, Sparkles, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { generateBlankBaseosPdfBlob, generateBlankServeOrderPdfBlob } from '@/document-engine/baseos';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultFormat?: '3-sets' | '5-sets';
}

type BlankDocumentType = 'sumula-3' | 'sumula-5' | 'fichas';

export function BlankSheetEmitDialog({ open, onOpenChange, defaultFormat = '3-sets' }: Props) {
  const [docType, setDocType] = useState<BlankDocumentType>(
    defaultFormat === '5-sets' ? 'sumula-5' : 'sumula-3',
  );
  const [loading, setLoading] = useState(false);

  const getFilename = () => {
    if (docType === 'sumula-3') return 'sumula_oficial_baseos_3sets_em_branco.pdf';
    if (docType === 'sumula-5') return 'sumula_oficial_baseos_5sets_em_branco.pdf';
    return 'fichas_ordem_de_saque_em_branco.pdf';
  };

  const getPdfBlob = async (): Promise<Blob> => {
    if (docType === 'sumula-3') {
      return generateBlankBaseosPdfBlob('3-sets');
    } else if (docType === 'sumula-5') {
      return generateBlankBaseosPdfBlob('5-sets');
    } else {
      return generateBlankServeOrderPdfBlob(defaultFormat);
    }
  };

  const handlePreview = async () => {
    setLoading(true);
    try {
      const blob = await getPdfBlob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      toast.success('Visualizando súmula oficial BaseOS em nova aba.');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar modelo oficial.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    setLoading(true);
    try {
      const blob = await getPdfBlob();
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 60000);
      };
      toast.success('Enviado para impressão!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao imprimir modelo.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    try {
      const blob = await getPdfBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getFilename();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Download do modelo oficial BaseOS concluído!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao baixar documento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-zinc-950 border-border p-5 rounded-xl shadow-none">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-foreground">
                Emissão de Súmula Oficial em Branco
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Gere o modelo oficial vetorial limpo para impressão e anotação manual na quadra.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <RadioGroup value={docType} onValueChange={v => setDocType(v as BlankDocumentType)}>
            <div className="space-y-2">
              <Label
                htmlFor="opt-3"
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors duration-150 ${
                  docType === 'sumula-3'
                    ? 'border-zinc-700 bg-zinc-800/70'
                    : 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900'
                }`}
              >
                <RadioGroupItem value="sumula-3" id="opt-3" className="mt-0.5" />
                <div className="flex-1 space-y-0.5 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-xs text-foreground">
                      Súmula Oficial 3 Sets (A4 Paisagem)
                    </span>
                    <span className="text-[9px] uppercase font-semibold tracking-wider text-zinc-400 bg-zinc-800 border border-zinc-700/50 px-1.5 py-0.2 rounded">
                      Padrão
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Documento oficial com 3 sets, troca de quadra no tie-break e tabela para 16 atletas.
                  </p>
                </div>
              </Label>

              <Label
                htmlFor="opt-5"
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors duration-150 ${
                  docType === 'sumula-5'
                    ? 'border-zinc-700 bg-zinc-800/70'
                    : 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900'
                }`}
              >
                <RadioGroupItem value="sumula-5" id="opt-5" className="mt-0.5" />
                <div className="flex-1 space-y-0.5 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-xs text-foreground">
                      Súmula Oficial 5 Sets (A4 Paisagem)
                    </span>
                    <span className="text-[9px] uppercase font-semibold tracking-wider text-zinc-400 bg-zinc-800 border border-zinc-700/50 px-1.5 py-0.2 rounded">
                      Completa
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Estrutura integral para partidas longas de até 5 sets com tie-break oficial.
                  </p>
                </div>
              </Label>

              <Label
                htmlFor="opt-fichas"
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors duration-150 ${
                  docType === 'fichas'
                    ? 'border-zinc-700 bg-zinc-800/70'
                    : 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900'
                }`}
              >
                <RadioGroupItem value="fichas" id="opt-fichas" className="mt-0.5" />
                <div className="flex-1 space-y-0.5 min-w-0">
                  <span className="font-medium text-xs text-foreground">
                    Ficha de Posição / Ordem de Saque
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Fichas regulamentares para entrega da formação inicial pelos técnicos.
                  </p>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60">
            Cancelar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePreview}
            disabled={loading}
            className="h-8 text-xs rounded-md gap-1.5 border-border hover:bg-zinc-800/60 font-medium text-zinc-300 hover:text-foreground"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5 text-zinc-400" />}
            Visualizar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            disabled={loading}
            className="h-8 text-xs rounded-md gap-1.5 border-border hover:bg-zinc-800/60 font-medium text-zinc-300 hover:text-foreground"
          >
            <Printer className="w-3.5 h-3.5 text-zinc-400" />
            Imprimir
          </Button>

          <Button
            size="sm"
            onClick={handleDownload}
            disabled={loading}
            className="h-8 text-xs rounded-md gap-1.5 font-medium shadow-none"
          >
            <Download className="w-3.5 h-3.5" />
            Baixar PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
