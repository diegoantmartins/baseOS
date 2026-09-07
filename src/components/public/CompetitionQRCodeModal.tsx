/**
 * BaseOS — Competition QR Code Modal
 * 
 * Exibe e exporta o QR Code oficial da competição para acesso instantâneo ao Portal Público.
 * 
 * Funcionalidades:
 * - URL canônica baseada no window.location.origin oficial (/c/:slug)
 * - Renderização de QR Code nítido com zona silenciosa (quiet zone)
 * - Download em alta resolução PNG 1024x1024 para impressão de banners e cartazes de ginásio
 * - Cópia rápida de link para clipboard
 * - Integração com Web Share API (quando suportado pelo navegador)
 */

import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Download, Share2, Check, QrCode as QrCodeIcon } from 'lucide-react';
import { toast } from 'sonner';

export interface CompetitionQRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competitionName: string;
  slug: string;
  customUrl?: string;
}

export function CompetitionQRCodeModal({
  open,
  onOpenChange,
  competitionName,
  slug,
  customUrl,
}: CompetitionQRCodeModalProps) {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Determina URL pública oficial sem hardcode de domínio
  const officialUrl =
    customUrl ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}/c/${slug}`
      : `/c/${slug}`);

  useEffect(() => {
    if (!open || !slug) return;

    let isMounted = true;
    setIsGenerating(true);

    // Gera o preview em Canvas e DataURL com resolução excelente
    QRCode.toDataURL(
      officialUrl,
      {
        width: 320,
        margin: 2,
        color: {
          dark: '#09090b',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      },
      (err, url) => {
        if (!isMounted) return;
        setIsGenerating(false);
        if (err) {
          console.error('Erro ao gerar QR Code:', err);
          toast.error('Erro ao gerar imagem do QR Code.');
          return;
        }
        setDataUrl(url);
      }
    );

    return () => {
      isMounted = false;
    };
  }, [open, slug, officialUrl]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(officialUrl);
      setCopied(true);
      toast.success('Link do portal público copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar o link.');
    }
  };

  const handleDownloadPng1024 = async () => {
    try {
      toast.info('Gerando imagem em alta resolução (1024x1024)...');
      // Renderiza especificamente na dimensão exigida de 1024x1024 para impressão de alta qualidade
      const highResDataUrl = await QRCode.toDataURL(officialUrl, {
        width: 1024,
        margin: 4,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      });

      const link = document.createElement('a');
      link.href = highResDataUrl;
      link.download = `qrcode-${slug}-1024x1024.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('QR Code 1024x1024 baixado com sucesso!');
    } catch (err) {
      console.error('Erro ao exportar PNG 1024x1024:', err);
      toast.error('Falha ao baixar imagem em alta definição.');
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: competitionName,
          text: `Acompanhe a tabela, jogos e classificação de ${competitionName} no BaseOS!`,
          url: officialUrl,
        });
      } catch {
        // Usuário cancelou o compartilhamento
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-500 mb-1">
            <QrCodeIcon className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Acesso Público</span>
          </div>
          <DialogTitle className="text-lg font-bold text-white leading-tight">
            QR Code do Portal
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-sm">
            Escaneie com a câmera do celular para acessar a página pública oficial de{' '}
            <span className="text-zinc-200 font-medium">{competitionName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center my-4">
          <div className="p-4 bg-white rounded-2xl shadow-xl border border-zinc-200 flex items-center justify-center min-h-[260px] min-w-[260px]">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-2 text-zinc-500 text-sm">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                <span>Gerando QR Code...</span>
              </div>
            ) : dataUrl ? (
              <img
                src={dataUrl}
                alt={`QR Code para ${competitionName}`}
                className="w-56 h-56 rounded-lg object-contain"
              />
            ) : (
              <div className="text-sm text-red-400">Falha ao carregar QR Code</div>
            )}
          </div>

          <div className="mt-4 w-full text-center">
            <p className="text-xs text-zinc-500 mb-1 font-mono uppercase tracking-wide">URL Pública Oficial</p>
            <div className="px-3 py-2 bg-zinc-900/90 border border-zinc-800 rounded-lg text-xs font-mono text-amber-400 truncate select-all">
              {officialUrl}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white"
          >
            {copied ? <Check className="h-4 w-4 mr-1.5 text-emerald-500" /> : <Copy className="h-4 w-4 mr-1.5" />}
            {copied ? 'Copiado!' : 'Copiar Link'}
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleDownloadPng1024}
            className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Baixar PNG 1024px
          </Button>
        </div>

        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            className="w-full text-zinc-400 hover:text-white hover:bg-zinc-900 mt-1"
          >
            <Share2 className="h-4 w-4 mr-1.5" />
            Compartilhar via Celular
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
