import { useState } from 'react';
import { FileSpreadsheet, Download, Printer, Eye, Loader2, Sparkles, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { loadTemplateBytes } from '@/document-engine/utils/pdfUtils';
import type { TemplateKind } from '@/document-engine/schemas/sumula.schema';

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

  const getTemplateKind = (type: BlankDocumentType): TemplateKind => {
    if (type === 'sumula-3') return 'sumula3';
    if (type === 'sumula-5') return 'sumula5';
    return 'ordem-saque';
  };

  const getFilename = () => {
    if (docType === 'sumula-3') return 'sumula_oficial_cbv_fpv_3sets_em_branco.pdf';
    if (docType === 'sumula-5') return 'sumula_oficial_cbv_fpv_5sets_em_branco.pdf';
    return 'fichas_ordem_de_saque_em_branco.pdf';
  };

  const getPdfBlobUrl = async (): Promise<string> => {
    const kind = getTemplateKind(docType);
    const bytes = await loadTemplateBytes(kind);
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  };

  const handlePreview = async () => {
    setLoading(true);
    try {
      const url = await getPdfBlobUrl();
      window.open(url, '_blank');
      toast.success('Visualizando súmula oficial homologada em nova aba.');
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
      const url = await getPdfBlobUrl();
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
      toast.success('Enviado para a impressora!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao imprimir documento em branco.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    try {
      const url = await getPdfBlobUrl();
      const a = document.createElement('a');
      a.href = url;
      a.download = getFilename();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Súmula oficial homologada baixada com sucesso!');
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao baixar documento em branco.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground font-bold">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Emissão de Súmula Oficial em Branco
          </DialogTitle>
          <DialogDescription className="text-xs">
            Modelos oficiais homologados padrão CBV/FPV em formato vetorial de alta definição para impressão.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <RadioGroup value={docType} onValueChange={v => setDocType(v as BlankDocumentType)} className="space-y-2.5">
            <div
              onClick={() => setDocType('sumula-3')}
              className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                docType === 'sumula-3' ? 'border-primary bg-primary/5 shadow-xs' : 'border-border/60 hover:bg-muted/40'
              }`}
            >
              <RadioGroupItem value="sumula-3" id="blank-3" className="mt-0.5" />
              <div className="space-y-0.5">
                <Label htmlFor="blank-3" className="font-semibold text-sm cursor-pointer text-foreground">
                  Súmula Oficial 3 Sets (Padrão A4)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Modelo oficial CBV/FPV com 3 sets, pontuação 1-32, rotação I-VI, sanções e assinaturas.
                </p>
              </div>
            </div>

            <div
              onClick={() => setDocType('sumula-5')}
              className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                docType === 'sumula-5' ? 'border-primary bg-primary/5 shadow-xs' : 'border-border/60 hover:bg-muted/40'
              }`}
            >
              <RadioGroupItem value="sumula-5" id="blank-5" className="mt-0.5" />
              <div className="space-y-0.5">
                <Label htmlFor="blank-5" className="font-semibold text-sm cursor-pointer text-foreground">
                  Súmula Oficial 5 Sets (Padrão A3)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Modelo oficial completo para partidas de até 5 sets com tiebreak e controle de parciais.
                </p>
              </div>
            </div>

            <div
              onClick={() => setDocType('fichas')}
              className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                docType === 'fichas' ? 'border-primary bg-primary/5 shadow-xs' : 'border-border/60 hover:bg-muted/40'
              }`}
            >
              <RadioGroupItem value="fichas" id="blank-fichas" className="mt-0.5" />
              <div className="space-y-0.5">
                <Label htmlFor="blank-fichas" className="font-semibold text-sm cursor-pointer text-foreground">
                  Fichas de Posição / Ordem de Saque
                </Label>
                <p className="text-xs text-muted-foreground">
                  8 filipetas oficiais em folha A4 com quadrículas de rotação para entrega dos técnicos à mesa.
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        <div className="flex items-center justify-between gap-2 pt-3 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePreview}
            disabled={loading}
            className="text-xs gap-1.5"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
            Visualizar
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
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
              type="button"
              variant="accent"
              size="sm"
              onClick={handleDownload}
              disabled={loading}
              className="text-xs gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar PDF Oficial
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
