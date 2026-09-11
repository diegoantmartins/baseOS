import { useNavigate } from 'react-router-dom';
import {
  Printer,
  Share2,
  FileText,
  Download,
  Calendar,
  Layers,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  buildMatchesUrl,
  buildCompetitionUrl,
} from '@/services/competitionNavigationHelper';

interface ReportHeaderProps {
  title: string;
  subtitle?: string;
  competitionId: string;
  onPrint: () => void;
  onShare: () => void;
  onExportPdf: () => void;
  onExportCsv?: () => void;
  isPdfLoading?: boolean;
}

export function ReportHeader({
  title,
  subtitle,
  competitionId,
  onPrint,
  onShare,
  onExportPdf,
  onExportCsv,
  isPdfLoading = false,
}: ReportHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 pb-2">
      <div className="space-y-0.5">
        <h3 className="text-base font-bold text-foreground tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="no-print flex flex-wrap items-center gap-2">
        {/* Navegação Contextual Fase 3 */}
        {competitionId && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8 border-border hover:bg-zinc-800/60 font-medium"
              onClick={() => navigate(buildMatchesUrl(competitionId))}
              title="Acessar Central de Jogos desta competição"
            >
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Central de</span> Jogos
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8 border-border hover:bg-zinc-800/60 font-medium"
              onClick={() => navigate(buildCompetitionUrl(competitionId, 'reports'))}
              title="Voltar à Central da Competição na aba de relatórios"
            >
              <Layers className="w-3.5 h-3.5 text-zinc-400" />
              Competição
            </Button>
          </>
        )}

        {/* Exportar CSV (se disponível) */}
        {onExportCsv && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-8 border-border hover:bg-zinc-800/60 font-medium"
            onClick={onExportCsv}
            title="Exportar dados brutos em formato CSV"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            CSV
          </Button>
        )}

        {/* Compartilhar */}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs h-8 border-border hover:bg-zinc-800/60 font-medium"
          onClick={onShare}
          title="Compartilhar link contextual deste relatório"
        >
          <Share2 className="w-3.5 h-3.5 text-primary" />
          Compartilhar
        </Button>

        {/* Imprimir HTML */}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs h-8 border-border hover:bg-zinc-800/60 font-medium"
          onClick={onPrint}
          title="Imprimir relatório oficial formatado"
        >
          <Printer className="w-3.5 h-3.5 text-zinc-400" />
          Imprimir
        </Button>

        {/* Exportar PDF Sob Demanda */}
        <Button
          variant="default"
          size="sm"
          className="gap-1.5 text-xs h-8 font-semibold shadow-none"
          onClick={onExportPdf}
          disabled={isPdfLoading}
          title="Gerar e baixar PDF editorial homologado"
        >
          {isPdfLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FileText className="w-3.5 h-3.5" />
          )}
          Exportar PDF
        </Button>
      </div>
    </div>
  );
}
