import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Download, Share2, Trophy, Volleyball, Sparkles, Calendar, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export interface MatchSocialCardProps {
  competitionName: string;
  categoryName: string;
  genderCategory?: 'male' | 'female' | 'mixed';
  teamAName: string;
  teamAShortName: string;
  teamALogoUrl?: string;
  teamBName: string;
  teamBShortName: string;
  teamBLogoUrl?: string;
  sets: { number: number; scoreA: number; scoreB: number }[];
  finalScoreA: number;
  finalScoreB: number;
  winner?: 'A' | 'B';
  mvpName?: string;
  mvpNumber?: number;
  mvpTeam?: string;
  date?: string;
  venue?: string;
}

export function MatchSocialCard(props: MatchSocialCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [format, setFormat] = useState<'story' | 'post'>('post');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      // Pequeno delay para garantir que fontes e layouts estejam renderizados
      await new Promise(r => setTimeout(r, 100));

      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2, // Alta resolução (Retina / 2x)
        quality: 0.95,
      });

      const a = document.createElement('a');
      a.href = dataUrl;
      const safeName = `${props.teamAShortName}_vs_${props.teamBShortName}_${format}`;
      a.download = `card_jogo_${safeName.toLowerCase()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success('Imagem exportada com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar imagem para redes sociais.');
    } finally {
      setIsGenerating(false);
    }
  };

  const isPost = format === 'post';

  return (
    <Card className="border-border/60 shadow-lg bg-card/95 backdrop-blur overflow-hidden">
      <CardHeader className="border-b border-border/40 pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl font-display font-bold flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary" />
                Card para Redes Sociais
              </CardTitle>
              <Badge variant="outline" className="text-[11px] gap-1 border-primary/40 text-primary">
                <Sparkles className="w-3 h-3" />
                PNG Alta Resolução
              </Badge>
            </div>
            <CardDescription>
              Gere artes automáticas do resultado do jogo e MVP para postar no Instagram e WhatsApp.
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            <Tabs value={format} onValueChange={v => setFormat(v as 'story' | 'post')}>
              <TabsList className="bg-muted/60">
                <TabsTrigger value="post" className="text-xs">Post (1:1)</TabsTrigger>
                <TabsTrigger value="story" className="text-xs">Story (9:16)</TabsTrigger>
              </TabsList>
            </Tabs>

            <Button
              variant="default"
              size="sm"
              onClick={handleDownload}
              disabled={isGenerating}
              className="text-xs gap-1.5 font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              {isGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Baixar PNG
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 flex justify-center bg-slate-950/40">
        {/* Contêiner de Renderização do Card Visual */}
        <div
          ref={cardRef}
          className={`relative overflow-hidden flex flex-col justify-between text-white select-none ${
            isPost ? 'w-[480px] h-[480px] p-6' : 'w-[360px] h-[640px] p-8'
          } bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 rounded-2xl shadow-2xl border border-white/10`}
          style={{
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {/* Efeitos de Fundo Esportivos */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/20 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />
          <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />

          {/* Topo: Competição & Categoria */}
          <div className="relative z-10 text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[11px] font-bold tracking-wider text-amber-300 uppercase">
              <Volleyball className="w-3.5 h-3.5" />
              {props.competitionName}
            </div>
            <p className="text-xs text-slate-300 font-medium tracking-wide">
              {props.categoryName} {props.genderCategory ? `• ${props.genderCategory.toUpperCase()}` : ''}
            </p>
          </div>

          {/* Centro: Duelo de Equipes e Placar */}
          <div className="relative z-10 my-auto space-y-6">
            <div className="text-center">
              <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">
                {props.winner ? 'RESULTADO FINAL' : 'CONFRONTO'}
              </span>
            </div>

            <div className="grid grid-cols-7 items-center gap-2">
              {/* Equipe A */}
              <div className="col-span-3 flex flex-col items-center text-center space-y-2">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg border-2 ${
                  props.winner === 'A'
                    ? 'bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 border-amber-300 shadow-amber-500/30'
                    : 'bg-white/10 border-white/20 text-white'
                }`}>
                  {props.teamALogoUrl ? (
                    <img src={props.teamALogoUrl} alt={props.teamAName} className="w-12 h-12 object-contain" />
                  ) : (
                    props.teamAShortName.substring(0, 3)
                  )}
                </div>
                <div>
                  <h3 className={`font-black text-sm uppercase leading-tight ${
                    props.winner === 'A' ? 'text-amber-300' : 'text-white'
                  }`}>
                    {props.teamAName}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-semibold">{props.teamAShortName}</span>
                </div>
              </div>

              {/* Placar Central em Sets */}
              <div className="col-span-1 flex flex-col items-center justify-center">
                <div className="flex items-center gap-1.5 font-black text-3xl tracking-tighter text-white drop-shadow-md">
                  <span className={props.winner === 'A' ? 'text-amber-400 text-4xl' : ''}>{props.finalScoreA}</span>
                  <span className="text-slate-500 text-xl font-light">×</span>
                  <span className={props.winner === 'B' ? 'text-amber-400 text-4xl' : ''}>{props.finalScoreB}</span>
                </div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">SETS</span>
              </div>

              {/* Equipe B */}
              <div className="col-span-3 flex flex-col items-center text-center space-y-2">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg border-2 ${
                  props.winner === 'B'
                    ? 'bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 border-amber-300 shadow-amber-500/30'
                    : 'bg-white/10 border-white/20 text-white'
                }`}>
                  {props.teamBLogoUrl ? (
                    <img src={props.teamBLogoUrl} alt={props.teamBName} className="w-12 h-12 object-contain" />
                  ) : (
                    props.teamBShortName.substring(0, 3)
                  )}
                </div>
                <div>
                  <h3 className={`font-black text-sm uppercase leading-tight ${
                    props.winner === 'B' ? 'text-amber-300' : 'text-white'
                  }`}>
                    {props.teamBName}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-semibold">{props.teamBShortName}</span>
                </div>
              </div>
            </div>

            {/* Parciais dos Sets */}
            {props.sets.length > 0 && (
              <div className="flex justify-center items-center gap-2">
                {props.sets.map((set) => (
                  <div
                    key={set.number}
                    className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-center"
                  >
                    <span className="block text-[8px] text-slate-400 font-bold uppercase">
                      SET {set.number}
                    </span>
                    <span className="text-xs font-black text-slate-200">
                      {set.scoreA}-{set.scoreB}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Destaque do Jogo (MVP) */}
            {props.mvpName && (
              <div className="mx-auto max-w-[280px] bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 border border-amber-400/40 rounded-xl p-2.5 flex items-center justify-center gap-3 backdrop-blur-md">
                <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm shadow-md shrink-0">
                  <Trophy className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0">
                  <span className="text-[9px] font-black text-amber-300 uppercase tracking-widest block">
                    DESTAQUE DA PARTIDA (MVP)
                  </span>
                  <p className="text-xs font-bold text-white truncate">
                    {props.mvpNumber !== undefined ? `#${props.mvpNumber} ` : ''}{props.mvpName}
                  </p>
                  {props.mvpTeam && <p className="text-[9px] text-slate-300 truncate">{props.mvpTeam}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Rodapé: Local, Data e Marca VolleyPro */}
          <div className="relative z-10 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400 font-medium">
            <div className="flex items-center gap-3">
              {props.date && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {props.date}
                </span>
              )}
              {props.venue && (
                <span className="inline-flex items-center gap-1 truncate max-w-[160px]">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {props.venue}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 font-bold text-white/80">
              <span>VolleyPro</span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
