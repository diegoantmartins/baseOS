import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Eye, Printer, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { downloadMatchSheetPdf, previewMatchSheetPdf } from '@/lib/pdf/matchSheetPdf';
import { toast } from 'sonner';

interface MatchPdfPreviewProps {
  matchData?: {
    competition: string;
    category: string;
    modality: 'indoor' | 'beach';
    format: '3-sets' | '5-sets' | '1-set' | '2-sets';
    playerFormat: '6x6' | '4x4' | '2x2' | '3x3';
    date: string;
    time: string;
    venue: string;
    court?: string;
    round: number;
    matchNumber: number;
    teamA: {
      name: string;
      shortName: string;
      athletes: { jerseyNumber: number; name: string; captain?: boolean; libero?: boolean }[];
      coach?: string;
    };
    teamB: {
      name: string;
      shortName: string;
      athletes: { jerseyNumber: number; name: string; captain?: boolean; libero?: boolean }[];
      coach?: string;
    };
    sets: { setNumber: number; scoreA: number; scoreB: number }[];
    finalScoreA: number;
    finalScoreB: number;
    winner?: 'A' | 'B';
    referees: { role: string; name: string }[];
    timeouts: { team: 'A' | 'B'; set: number; score: string }[];
    substitutions: { team: 'A' | 'B'; set: number; playerIn: number; playerOut: number; score: string }[];
    sanctions: { team: 'A' | 'B'; player: string; type: string; set: number }[];
    observations?: string;
    startTime?: string;
    endTime?: string;
  };
}

// Demo data for preview
const demoMatchData = {
  competition: 'Superliga Feminina 2024/25',
  category: 'Feminino Adulto',
  modality: 'indoor' as const,
  format: '3-sets' as const,
  playerFormat: '6x6' as const,
  date: '22/01/2025',
  time: '19:00',
  venue: 'Ginásio José Liberatti',
  court: 'Quadra Principal',
  round: 12,
  matchNumber: 45,
  teamA: {
    name: 'Osasco Voleibol',
    shortName: 'OSA',
    athletes: [
      { jerseyNumber: 1, name: 'Fernanda Silva', captain: true },
      { jerseyNumber: 4, name: 'Amanda Costa' },
      { jerseyNumber: 7, name: 'Juliana Santos' },
      { jerseyNumber: 10, name: 'Patricia Lima' },
      { jerseyNumber: 12, name: 'Carla Oliveira' },
      { jerseyNumber: 15, name: 'Beatriz Mendes', libero: true },
    ],
    coach: 'José Roberto Guimarães',
  },
  teamB: {
    name: 'Minas Tênis Clube',
    shortName: 'MIN',
    athletes: [
      { jerseyNumber: 2, name: 'Gabriela Guimarães', captain: true },
      { jerseyNumber: 5, name: 'Natália Pereira' },
      { jerseyNumber: 8, name: 'Rosamaria Montibeller' },
      { jerseyNumber: 11, name: 'Carol Gattaz' },
      { jerseyNumber: 14, name: 'Thaisa Menezes' },
      { jerseyNumber: 17, name: 'Léia Silva', libero: true },
    ],
    coach: 'Nicola Negro',
  },
  sets: [
    { setNumber: 1, scoreA: 25, scoreB: 22 },
    { setNumber: 2, scoreA: 23, scoreB: 25 },
    { setNumber: 3, scoreA: 25, scoreB: 18 },
  ],
  finalScoreA: 2,
  finalScoreB: 1,
  winner: 'A' as const,
  referees: [
    { role: '1º Árbitro', name: 'Carlos Silva' },
    { role: '2º Árbitro', name: 'Ana Santos' },
    { role: 'Apontador', name: 'Pedro Oliveira' },
  ],
  timeouts: [
    { team: 'A' as const, set: 1, score: '15-18' },
    { team: 'B' as const, set: 2, score: '20-18' },
    { team: 'A' as const, set: 3, score: '10-12' },
  ],
  substitutions: [
    { team: 'A' as const, set: 1, playerIn: 16, playerOut: 7, score: '18-20' },
    { team: 'B' as const, set: 2, playerIn: 9, playerOut: 8, score: '22-20' },
  ],
  sanctions: [
    { team: 'B' as const, player: '#11 Carol', type: 'Advertência', set: 2 },
  ],
  observations: 'Partida realizada sem intercorrências. Público estimado: 8.500 pessoas.',
  startTime: '19:05',
  endTime: '21:32',
};

export function MatchPdfPreview({ matchData = demoMatchData }: MatchPdfPreviewProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      downloadMatchSheetPdf(matchData);
      toast.success('PDF gerado com sucesso!', {
        description: 'O download foi iniciado automaticamente.',
      });
    } catch (error) {
      toast.error('Erro ao gerar PDF', {
        description: 'Tente novamente mais tarde.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = () => {
    previewMatchSheetPdf(matchData);
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
              <CardTitle className="text-lg font-display">Súmula Oficial - PDF</CardTitle>
              <p className="text-sm text-muted-foreground">
                Gere o documento oficial da partida para impressão
              </p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1">
            <Check className="w-3 h-3" />
            A4 Otimizado
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Match Summary */}
        <div className="p-4 rounded-xl bg-muted/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Competição</span>
            <span className="font-medium">{matchData.competition}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Partida</span>
            <span className="font-medium">
              {matchData.teamA.shortName} {matchData.finalScoreA} x {matchData.finalScoreB} {matchData.teamB.shortName}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Data/Hora</span>
            <span className="font-medium">{matchData.date} às {matchData.time}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Formato</span>
            <span className="font-medium">
              {matchData.modality === 'indoor' ? 'Quadra' : 'Praia'} - {matchData.format.replace('-', ' ')}
            </span>
          </div>
        </div>

        {/* PDF Features */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-success/5 border border-success/20">
            <div className="flex items-center gap-2 mb-1">
              <Check className="w-4 h-4 text-success" />
              <span className="text-sm font-medium">Preto & Branco</span>
            </div>
            <p className="text-xs text-muted-foreground">Otimizado para impressão econômica</p>
          </div>
          <div className="p-3 rounded-lg bg-success/5 border border-success/20">
            <div className="flex items-center gap-2 mb-1">
              <Check className="w-4 h-4 text-success" />
              <span className="text-sm font-medium">Formato A4</span>
            </div>
            <p className="text-xs text-muted-foreground">Margens corretas para impressoras</p>
          </div>
          <div className="p-3 rounded-lg bg-success/5 border border-success/20">
            <div className="flex items-center gap-2 mb-1">
              <Check className="w-4 h-4 text-success" />
              <span className="text-sm font-medium">Campos Oficiais</span>
            </div>
            <p className="text-xs text-muted-foreground">Súmula conforme regulamento</p>
          </div>
          <div className="p-3 rounded-lg bg-success/5 border border-success/20">
            <div className="flex items-center gap-2 mb-1">
              <Check className="w-4 h-4 text-success" />
              <span className="text-sm font-medium">Espaço Assinaturas</span>
            </div>
            <p className="text-xs text-muted-foreground">Árbitros, técnicos e capitães</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={handlePreview}
          >
            <Eye className="w-4 h-4" />
            Visualizar
          </Button>
          <Button
            variant="accent"
            className="flex-1 gap-2"
            onClick={handleDownload}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <FileText className="w-4 h-4" />
                </motion.div>
                Gerando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Baixar PDF
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          O PDF será gerado localmente e baixado automaticamente no seu dispositivo.
        </p>
      </CardContent>
    </Card>
  );
}
