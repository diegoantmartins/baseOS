import { useEffect, useState } from 'react';
import { Download, Printer, ExternalLink, Loader2, FileSpreadsheet, X } from 'lucide-react';
import { toast } from 'sonner';
import type jsPDF from 'jspdf';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  filename: string;
  generatePdf: () => Promise<Blob | jsPDF | Uint8Array>;
}

export function ReportPreviewDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  filename,
  generatePdf,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    let activeUrl: string | null = null;
    let isMounted = true;

    if (open) {
      setLoading(true);
      generatePdf()
        .then(res => {
          if (!isMounted) return;
          let blob: Blob;
          if (res instanceof Blob) {
            blob = res;
          } else if (res instanceof Uint8Array) {
            blob = new Blob([res.buffer as ArrayBuffer], { type: 'application/pdf' });
          } else {
            blob = res.output('blob');
          }
          const url = URL.createObjectURL(blob);
          activeUrl = url;
          setPdfUrl(url);
        })
        .catch(err => {
          if (!isMounted) return;
          console.error(err);
          toast.error('Erro ao gerar visualização do relatório.');
          onOpenChange(false);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    } else {
      setPdfUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    }

    return () => {
      isMounted = false;
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
      }
    };
  }, [open, generatePdf, onOpenChange]);

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Download do PDF iniciado!');
  };

  const handlePrint = () => {
    if (!pdfUrl) return;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = pdfUrl;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 60000);
    };
    toast.success('Documento enviado para impressão.');
  };

  const handleOpenNewTab = () => {
    if (!pdfUrl) return;
    window.open(pdfUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[92vh] flex flex-col p-4 sm:p-6 bg-card border-border shadow-2xl">
        <DialogHeader className="pb-3 border-b flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-display font-bold text-foreground">
                  {title}
                </DialogTitle>
                {subtitle && (
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    {subtitle}
                  </DialogDescription>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-9"
                onClick={handleOpenNewTab}
                disabled={loading || !pdfUrl}
              >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">Nova Aba</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-9"
                onClick={handlePrint}
                disabled={loading || !pdfUrl}
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </Button>

              <Button
                variant="accent"
                size="sm"
                className="gap-1.5 text-xs h-9 font-semibold"
                onClick={handleDownload}
                disabled={loading || !pdfUrl}
              >
                <Download className="w-4 h-4" />
                Baixar PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 w-full h-full min-h-0 relative rounded-lg overflow-hidden bg-muted/30 border border-border mt-3">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Renderizando visualização do relatório...</p>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
              title={title}
              className="w-full h-full border-0 rounded-lg"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              Nenhum documento disponível para visualização.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
