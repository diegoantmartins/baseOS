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
import { generateBlankBaseosPdfBlob } from '@/document-engine/baseos';
import { generateBlankServeOrderSheet } from '@/document-engine/generators/ordemSaque.generator';

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
      const bytes = await generateBlankServeOrderSheet();
      return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold font-display">
                Emissão de Súmula Oficial em Branco
              </DialogTitle>
              <DialogDescription className="text-xs">
                Gere o modelo oficial vetorial limpo para impressão e anotação manual na quadra.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <RadioGroup value={docType} onValueChange={v => setDocType(v as BlankDocumentType)}>
            <div className="space-y-2.5">
              <Label
                htmlFor="opt-3"
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  docType === 'sumula-3'
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border/60 hover:bg-muted/40'
                }`}
              >
                <RadioGroupItem value="sumula-3" id="opt-3" className="mt-0.5" />
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground">
                      Súmula Oficial 3 Sets (A4 Paisagem)
                    </span>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      Padrão
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Documento oficial com 3 sets, troca de quadra no tie-break e tabela para 16 atletas.
                  </p>
                </div>
              </Label>

              <Label
                htmlFor="opt-5"
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  docType === 'sumula-5'
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border/60 hover:bg-muted/40'
                }`}
              >
                <RadioGroupItem value="sumula-5" id="opt-5" className="mt-0.5" />
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground">
                      Súmula Oficial 5 Sets (A4 Paisagem)
                    </span>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      Completa
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Estrutura integral para partidas longas de até 5 sets com tie-break oficial.
                  </p>
                </div>
              </Label>

              <Label
                htmlFor="opt-fichas"
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  docType === 'fichas'
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border/60 hover:bg-muted/40'
                }`}
              >
                <RadioGroupItem value="fichas" id="opt-fichas" className="mt-0.5" />
                <div className="flex-1 space-y-0.5">
                  <span className="font-semibold text-xs text-foreground">
                    Ficha de Posição / Ordem de Saque
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Fichas regulamentares para entrega da formação inicial pelos técnicos.
                  </p>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePreview}
            disabled={loading}
            className="text-xs gap-1.5"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
            Visualizar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            disabled={loading}
            className="text-xs gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir
          </Button>

          <Button
            size="sm"
            onClick={handleDownload}
            disabled={loading}
            className="text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            Baixar PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
