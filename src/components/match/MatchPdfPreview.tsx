import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, ListOrdered, Download, Eye, Printer, Check, ShieldCheck, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  downloadOfficialPdf,
  generateOfficialMatchSheetPdf,
  generatePositionOrderSheetPdf,
  printOfficialPdf,
  previewOfficialPdf,
} from '@/lib/pdf/officialMatchSheetPdf';
import type { MatchSheetData } from '@/lib/pdf/matchSheetPdf';
import { toast } from 'sonner';

type SheetMode = 'pre' | 'post';
type DocType = 'sumula' | 'ficha';

interface MatchPdfPreviewProps {
  matchData?: MatchSheetData;
  matchId?: string;
}

// Demo data for preview
const demoMatchData: MatchSheetData = {
  orgName: 'VolleyPro',
  competition: 'Copa Toledo 2026 - Masculino',
  category: 'Masculino Adulto',
  genderCategory: 'male',
  modality: 'indoor' as const,
  format: '3-sets' as const,
  playerFormat: '6x6' as const,
  date: '22/08/2026',
  time: '19:00',
  venue: 'Ginásio Municipal',
  court: 'Quadra 1',
  city: 'Toledo - PR',
  phase: 'Classificatória',
  groupName: 'Grupo A',
  round: 1,
  matchNumber: 7,
  teamA: {
    name: 'Osasco Voleibol',
    shortName: 'OSA',
    athletes: [
      { jerseyNumber: 1, name: 'Fernanda Silva', position: 'Levantadora', captain: true },
      { jerseyNumber: 4, name: 'Amanda Costa', position: 'Ponteira' },
      { jerseyNumber: 7, name: 'Juliana Santos', position: 'Oposta' },
      { jerseyNumber: 10, name: 'Patricia Lima', position: 'Central' },
      { jerseyNumber: 12, name: 'Carla Oliveira', position: 'Ponteira' },
      { jerseyNumber: 15, name: 'Beatriz Mendes', position: 'Líbero', libero: true },
    ],
    coach: 'Luizomar de Moura',
  },
  teamB: {
    name: 'Minas Tênis Clube',
    shortName: 'MIN',
    athletes: [
      { jerseyNumber: 3, name: 'Ana Cristina Souza', position: 'Ponteira', captain: true },
      { jerseyNumber: 6, name: 'Marina Souza', position: 'Central' },
      { jerseyNumber: 9, name: 'Letícia Hage', position: 'Oposta' },
      { jerseyNumber: 16, name: 'Kasiely Clemente', position: 'Líbero', libero: true },
      { jerseyNumber: 18, name: 'Fernanda Silva', position: 'Levantadora' },
      { jerseyNumber: 19, name: 'Amanda Costa', position: 'Ponteira' },
    ],
    coach: 'Nicola Negro',
  },
  sets: [],
  finalScoreA: 0,
  finalScoreB: 0,
  referees: [
    { role: '1º Árbitro', name: 'Carlos Silva' },
    { role: '2º Árbitro', name: 'Ana Santos' },
    { role: 'Apontador', name: 'Pedro Oliveira' },
  ],
  timeouts: [],
  substitutions: [],
  sanctions: [],
  observations: 'Jogo válido pela fase classificatória - Grupo A.',
};

function withMode(
  data: typeof demoMatchData,
  mode: SheetMode,
): typeof demoMatchData {
  const isPost = mode === 'post';
  return {
    ...data,
    sheetMode: mode,
    sets: isPost
      ? [
          { setNumber: 1, scoreA: 25, scoreB: 22 },
          { setNumber: 2, scoreA: 23, scoreB: 25 },
          { setNumber: 3, scoreA: 25, scoreB: 18 },
        ]
      : [],
    finalScoreA: isPost ? 2 : 0,
    finalScoreB: isPost ? 1 : 0,
    winner: isPost ? ('A' as const) : undefined,
  };
}

export function MatchPdfPreview({ matchData = demoMatchData, matchId }: MatchPdfPreviewProps) {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [mode, setMode] = useState<SheetMode>(matchData.sheetMode ?? (matchData.sets.length > 0 ? 'post' : 'pre'));
  const [docType, setDocType] = useState<DocType>('sumula');

  const effectiveData = withMode(matchData, mode);

  const buildDoc = () =>
    docType === 'ficha' ? generatePositionOrderSheetPdf(effectiveData) : generateOfficialMatchSheetPdf(effectiveData);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const doc = buildDoc();
      const safe = `${effectiveData.teamA.shortName}_x_${effectiveData.teamB.shortName}`;
      downloadOfficialPdf(doc, `${docType === 'ficha' ? 'ordem_de_saque' : 'sumula'}_${safe}.pdf`);
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
    previewOfficialPdf(buildDoc());
  };

  const handlePrint = () => {
    printOfficialPdf(buildDoc());
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
                Súmula de 3/5 sets e fichas de posição geradas pelo sistema
              </p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1">
            <Check className="w-3 h-3" />
            Sem marcas externas
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Tipo de documento */}
        <Tabs value={docType} onValueChange={v => setDocType(v as DocType)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted/50">
            <TabsTrigger value="sumula" className="gap-2">
              <FileText className="w-4 h-4" />
              Súmula ({effectiveData.format.replace('-', ' ')})
            </TabsTrigger>
            <TabsTrigger value="ficha" className="gap-2">
              <ListOrdered className="w-4 h-4" />
              Ficha de Posição
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {docType === 'sumula' && (
          <>
            {/* Alternador pré/pós-jogo */}
            <Tabs value={mode} onValueChange={v => setMode(v as SheetMode)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50">
                <TabsTrigger value="pre" className="gap-2">
                  Súmula Pré-Jogo
                </TabsTrigger>
                <TabsTrigger value="post" className="gap-2">
                  Súmula Final
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="text-xs text-muted-foreground -mt-2">
              {mode === 'pre'
                ? 'Formulário em branco com o elenco nominal para preenchimento manual pelos mesários e árbitros.'
                : 'Súmula consolidada com parciais dos sets e resultado final da partida.'}
            </p>
          </>
        )}

        {docType === 'ficha' && (
          <p className="text-xs text-muted-foreground -mt-2">
            8 fichas de posição (4 por equipe) com quadra e posições de rotação — entregue ao mesário antes de cada set,
            mesmo que o tiebreak não ocorra.
          </p>
        )}

        {/* Match Summary */}
        <div className="p-4 rounded-xl bg-muted/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Competição</span>
            <span className="font-medium">{effectiveData.competition}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Partida</span>
            <span className="font-medium">
              {effectiveData.teamA.shortName} {effectiveData.finalScoreA} x {effectiveData.finalScoreB} {effectiveData.teamB.shortName}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Data/Hora</span>
            <span className="font-medium">{effectiveData.date} às {effectiveData.time}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Local</span>
            <span className="font-medium">
              {effectiveData.venue}
              {effectiveData.court ? ` - ${effectiveData.court}` : ''}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Formato</span>
            <span className="font-medium">
              {effectiveData.modality === 'indoor' ? 'Quadra' : 'Praia'} - {effectiveData.format.replace('-', ' ')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Elenco</span>
            <span className="font-medium">
              {effectiveData.teamA.athletes.length} x {effectiveData.teamB.athletes.length} atletas
            </span>
          </div>
        </div>

        {/* PDF Features */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-success/5 border border-success/20">
            <div className="flex items-center gap-2 mb-1">
              <Check className="w-4 h-4 text-success" />
              <span className="text-sm font-medium">Sem marcas de terceiros</span>
            </div>
            <p className="text-xs text-muted-foreground">Gerado 100% pelo sistema com identidade da organização</p>
          </div>
          <div className="p-3 rounded-lg bg-success/5 border border-success/20">
            <div className="flex items-center gap-2 mb-1">
              <Check className="w-4 h-4 text-success" />
              <span className="text-sm font-medium">A4 / A3 paisagem</span>
            </div>
            <p className="text-xs text-muted-foreground">3 sets em A4; 5 sets em A3; fichas em A4</p>
          </div>
          <div className="p-3 rounded-lg bg-success/5 border border-success/20">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-success" />
              <span className="text-sm font-medium">Cabeçalho Oficial</span>
            </div>
            <p className="text-xs text-muted-foreground">Sistema/organização + competição + sexo/categoria</p>
          </div>
          <div className="p-3 rounded-lg bg-success/5 border border-success/20">
            <div className="flex items-center gap-2 mb-1">
              <Check className="w-4 h-4 text-success" />
              <span className="text-sm font-medium">Espaço Assinaturas</span>
            </div>
            <p className="text-xs text-muted-foreground">Árbitros, técnicos, capitães e comissão técnica</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Button variant="outline" className="flex-1 gap-2" onClick={handlePreview}>
              <Eye className="w-4 h-4" />
              Visualizar
            </Button>
            <Button variant="outline" className="flex-1 gap-2" onClick={handlePrint}>
              <Printer className="w-4 h-4" />
              Imprimir
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

          {matchId && (
            <Button
              variant="secondary"
              className="w-full gap-2 border border-primary/20 hover:border-primary/50"
              onClick={() => navigate(`/documentos/editar/${matchId}`)}
            >
              <PenLine className="w-4 h-4 text-primary" />
              Abrir no Editor de Documentos & Layout
            </Button>
          )}
        </div>

        <p className="text-xs text-center text-muted-foreground">
          O PDF é gerado localmente, sem marcas de terceiros, pronto para impressão na mesa do jogo.
        </p>
      </CardContent>
    </Card>
  );
}