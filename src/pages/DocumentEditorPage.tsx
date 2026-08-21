// =====================================================================
// Editor de Documentos (admin/organizador)
//
// Permite editar MANUALMENTE o conteúdo e o layout dos documentos
// oficiais gerados sobre os templates fixos:
//   - Aba Conteúdo: valores por campo (nomes, placares, escalações,
//     árbitros, observações, vencedor) — persistidos por partida
//     (DocumentEdit).
//   - Aba Layout: posição/tamanho/fonte de cada campo sobre o template
//     (TemplateLayout) — ajustes globais persistidos por template.
//
// Pré-visualização em iframe (renderização nativa do PDF no navegador)
// e exportação do PDF final com as edições aplicadas.
// =====================================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, ChevronRight, Clock, FileDown, LayoutTemplate, MapPin, PenLine, RotateCcw, Save, Volleyball } from 'lucide-react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { dataAccess } from '@/services/dataAccess';
import {
  buildMatchDocument,
  dataUriToBytes,
  loadDocumentEdits,
  loadMatchContext,
  saveDocumentEdit,
  saveTemplateLayout,
} from '@/services/documentEditorService';
import { buildSumulaData, generateFiveSetScoresheet, generateThreeSetScoresheet } from '@/document-engine/generators';
import { SUMULA3_GEOMETRY } from '@/document-engine/coordinates/sumula3.coordinates';
import { SUMULA5_GEOMETRY } from '@/document-engine/coordinates/sumula5.coordinates';
import type { DocumentType } from '@/document-engine/schemas/match.schema';
import type { FieldCoords } from '@/document-engine/schemas/sumula.schema';
import type { FieldLayoutOverride } from '@/types/documentEdit';
import type { MatchRecord } from '@/types/entities';

const FIELD_LABELS: Record<string, string> = {
  orgName: 'Organização',
  competitionName: 'Competição',
  categoryName: 'Categoria',
  gender: 'Gênero',
  matchNumber: 'Nº da partida',
  round: 'Rodada',
  phase: 'Fase',
  format: 'Formato',
  date: 'Data',
  time: 'Horário',
  venue: 'Local',
  court: 'Quadra',
  teamAName: 'Equipe A',
  teamBName: 'Equipe B',
  observations: 'Observações',
  referee1: '1º árbitro',
  referee2: '2º árbitro',
  scorer: 'Apontador',
  winner: 'Vencedor',
};

function fieldLabel(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  const match = key.match(/^lineup(A|B)(\d)([IV]+)$/);
  if (match) return `Ordem de saque ${match[1] === 'A' ? 'A' : 'B'} · set ${match[2]} · posição ${match[3]}`;
  const points = key.match(/^points(A|B)(\d?)$/);
  if (points) return `Placar set ${points[2] || 1} (${points[1] === 'A' ? 'A' : 'B'})`;
  const setNo = key.match(/^setNumber(\d?)$/);
  if (setNo) return `Número do set ${setNo[1] || 1}`;
  return key;
}

function isNumericField(key: string): boolean {
  return /^(points|setNumber|matchNumber|round)/.test(key);
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const DocumentEditorPage = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();

  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [context, setContext] = useState<Awaited<ReturnType<typeof loadMatchContext>>>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [layout, setLayout] = useState<Record<string, FieldLayoutOverride>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [tab, setTab] = useState<'content' | 'layout'>('content');

  const documentType: DocumentType = useMemo(
    () => (context && context.match.sets.length > 3 ? 'SUMMULA_5' : 'SUMMULA_3'),
    [context],
  );
  const templateKind = useMemo(() => (documentType === 'SUMMULA_5' ? 'sumula5' : 'sumula3'), [documentType]);
  const geometry = templateKind === 'sumula5' ? SUMULA5_GEOMETRY : SUMULA3_GEOMETRY;

  useEffect(() => {
    if (!matchId) {
      dataAccess.listMatches().then(list => {
        setMatches(list);
        setLoading(false);
      });
      return;
    }
    (async () => {
      setLoading(true);
      const ctx = await loadMatchContext(matchId);
      if (!ctx) {
        toast.error('Partida não encontrada');
        navigate('/documentos/editar');
        return;
      }
      const { edit, layout: savedLayout } = await loadDocumentEdits(
        matchId,
        ctx.match.sets.length > 3 ? 'SUMMULA_5' : 'SUMMULA_3',
        ctx.match.sets.length > 3 ? 'sumula5' : 'sumula3',
      );
      setContext(ctx);
      setValues(edit?.values ?? {});
      setLayout(savedLayout?.fields ?? {});
      setLoading(false);
    })();
  }, [matchId, navigate]);

  /** Regenera o PDF com as edições atuais e atualiza a pré-visualização. */
  const regenerate = useCallback(async () => {
    if (!context) return;
    const doc = buildMatchDocument(context);
    const data = buildSumulaData(doc);
    const options = {
      valueOverrides: values,
      layoutOverrides: layout,
      logoBytes: dataUriToBytes(context.documentLogo ?? ''),
    };
    const bytes =
      documentType === 'SUMMULA_5'
        ? await generateFiveSetScoresheet(data, options)
        : await generateThreeSetScoresheet(data, options);
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
    setPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  }, [context, values, layout, documentType]);

  useEffect(() => {
    if (!loading && context) regenerate();
  }, [loading, context, regenerate]);

  const saveContent = async () => {
    if (!context) return;
    setSaving(true);
    try {
      await saveDocumentEdit(context.match.id, documentType, values);
      toast.success('Conteúdo do documento salvo');
    } catch (err) {
      toast.error(`Falha ao salvar: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const saveLayout = async () => {
    setSaving(true);
    try {
      await saveTemplateLayout(templateKind, layout);
      toast.success('Layout do template salvo');
    } catch (err) {
      toast.error(`Falha ao salvar: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const exportPdf = () => {
    if (!previewUrl || !context) return;
    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = `sumula_${context.match.teamAName}_x_${context.match.teamBName}_editada.pdf`.replace(/[^\w.\-áéíóúãõçÁÉÍÓÚÃÕÇ]/g, '_');
    link.click();
    toast.success('PDF exportado');
  };

  const defaultValues = useMemo(() => {
    if (!context) return {};
    const doc = buildMatchDocument(context);
    return {
      orgName: context.orgName,
      competitionName: doc.competitionName,
      categoryName: doc.categoryName,
      gender: doc.gender === 'female' ? 'FEMININO' : doc.gender === 'male' ? 'MASCULINO' : 'MISTO',
      matchNumber: String(doc.matchNumber),
      round: String(doc.round),
      phase: doc.phase ?? '',
      format: doc.format === '3-sets' ? 'MELHOR DE 3' : 'MELHOR DE 5',
      date: doc.date,
      time: doc.startTime,
      venue: doc.venue,
      court: doc.court ?? '',
      teamAName: doc.teamA.name,
      teamBName: doc.teamB.name,
      observations: doc.observations ?? '',
      referee1: doc.officials.referee1 ?? '',
      referee2: doc.officials.referee2 ?? '',
      scorer: doc.officials.scorer ?? '',
      winner: doc.result?.winnerTeamId ? (doc.result.winnerTeamId === doc.teamA.id ? doc.teamA.name : doc.teamB.name) : '',
    };
  }, [context]);

  const contentKeys = useMemo(() => {
    const keys = Object.keys(defaultValues);
    for (const set of context?.match.sets ?? []) {
      keys.push(`setNumber${set.setNumber}`, `pointsA${set.setNumber}`, `pointsB${set.setNumber}`);
      for (const pos of ['I', 'II', 'III', 'IV', 'V', 'VI']) {
        keys.push(`lineupA${set.setNumber}${pos}`, `lineupB${set.setNumber}${pos}`);
      }
    }
    return keys;
  }, [context, defaultValues]);

  if (loading) {
    return (
      <MainLayout>
        <div className="p-8 text-muted-foreground">Carregando editor de documentos…</div>
      </MainLayout>
    );
  }

  if (!context) {
    return (
      <MainLayout>
        <div className="space-y-6 max-w-4xl mx-auto">
          <div>
            <h1 className="text-3xl font-display font-bold">Editor de Súmulas e Documentos</h1>
            <p className="text-muted-foreground mt-1">
              Selecione uma partida para editar valores dos campos ou personalizar o posicionamento dos elementos no template oficial.
            </p>
          </div>

          <div className="grid gap-3">
            {matches.map(m => (
              <Card
                key={m.id}
                className="card-elevated cursor-pointer hover:shadow-lg transition-all"
                onClick={() => navigate(`/documentos/editar/${m.id}`)}
              >
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Volleyball className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {m.teamAName} <span className="text-muted-foreground">vs</span> {m.teamBName}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(m.scheduledTime).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(m.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {m.venue}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={m.status === 'completed' ? 'outline' : m.status === 'scheduled' ? 'secondary' : 'default'}>
                      {m.status === 'completed' ? 'Finalizado' : m.status === 'scheduled' ? 'Agendado' : 'Em andamento'}
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
            {matches.length === 0 && (
              <Card>
                <CardContent className="p-10 text-center text-muted-foreground">
                  Nenhuma partida encontrada para edição.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/jogos')} aria-label="Voltar">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">Editor de Documentos</h1>
              <p className="text-muted-foreground mt-1">
                {context.match.teamAName} × {context.match.teamBName} · {documentType.replace('_', ' ')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={regenerate} disabled={saving}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Regenerar
            </Button>
            <Button variant="accent" onClick={exportPdf} disabled={!previewUrl}>
              <FileDown className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </motion.div>

        <motion.div variants={item}>
          <Tabs value={tab} onValueChange={v => setTab(v as 'content' | 'layout')}>
            <TabsList>
              <TabsTrigger value="content">
                <PenLine className="w-4 h-4 mr-2" />
                Conteúdo
              </TabsTrigger>
              <TabsTrigger value="layout">
                <LayoutTemplate className="w-4 h-4 mr-2" />
                Layout dos campos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="text-base">Campos editáveis</CardTitle>
                    <CardDescription className="text-sm">
                      Os valores preenchidos manualmente têm precedência sobre os dados da partida.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[560px] pr-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {contentKeys.map(key => (
                          <div key={key} className="space-y-1.5">
                            <Label htmlFor={`f-${key}`} className="text-xs text-muted-foreground">
                              {fieldLabel(key)}
                            </Label>
                            <Input
                              id={`f-${key}`}
                              value={values[key] ?? defaultValues[key] ?? ''}
                              onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))}
                              placeholder={defaultValues[key] ?? ''}
                              type={isNumericField(key) ? 'number' : 'text'}
                            />
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <div className="mt-4 flex gap-2">
                      <Button onClick={saveContent} disabled={saving}>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar conteúdo
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setValues({});
                          toast.info('Valores restaurados para os dados da partida');
                        }}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Restaurar padrão
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="text-base">Pré-visualização</CardTitle>
                    <CardDescription className="text-sm">
                      Renderização do PDF gerado com as edições atuais.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <iframe
                      title="Pré-visualização do documento"
                      src={previewUrl}
                      className="w-full h-[560px] rounded-md border border-border bg-white"
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="layout" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="text-base">Posição e tamanho dos campos</CardTitle>
                    <CardDescription className="text-sm">
                      Ajustes de layout (TemplateLayout) aplicados a todos os documentos deste template. Os valores
                      vazios mantêm a geometria padrão do template.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[560px] pr-4">
                      <div className="space-y-4">
                        {Object.entries(geometry.fields).map(([key, coords]) => {
                          const ov = layout[key] ?? {};
                          const num = (field: keyof FieldCoords, def: number) => ({
                            value: ov[field] !== undefined ? String(ov[field]) : String(def),
                          });
                          const set = (field: keyof FieldCoords, raw: string) => {
                            const parsed = raw === '' ? undefined : Number(raw);
                            setLayout(l => ({
                              ...l,
                              [key]: { ...(l[key] ?? {}), [field]: parsed },
                            }));
                          };
                          return (
                            <div key={key} className="rounded-md border border-border p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-medium">{fieldLabel(key)}</Label>
                                <code className="text-[10px] text-muted-foreground">{key}</code>
                              </div>
                              <div className="grid grid-cols-4 gap-2">
                                {(
                                  [
                                    ['x', 'X (pts)'],
                                    ['y', 'Y (pts)'],
                                    ['width', 'Largura'],
                                    ['height', 'Altura'],
                                    ['fontSize', 'Fonte'],
                                  ] as const
                                ).map(([field, label]) => (
                                  <div key={field} className="space-y-1">
                                    <Label htmlFor={`l-${key}-${field}`} className="text-[10px] text-muted-foreground">
                                      {label}
                                    </Label>
                                    <Input
                                      id={`l-${key}-${field}`}
                                      type="number"
                                      value={num(field, coords[field] ?? 0).value}
                                      onChange={e => set(field, e.target.value)}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                    <div className="mt-4 flex gap-2">
                      <Button onClick={saveLayout} disabled={saving}>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar layout
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setLayout({});
                          toast.info('Layout restaurado para a geometria padrão');
                        }}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Restaurar padrão
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-elevated">
                  <CardHeader>
                    <CardTitle className="text-base">Pré-visualização do template</CardTitle>
                    <CardDescription className="text-sm">
                      PDF regenerado com os ajustes de posição/tamanho aplicados.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <iframe
                      title="Pré-visualização do layout"
                      src={previewUrl}
                      className="w-full h-[560px] rounded-md border border-border bg-white"
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </MainLayout>
  );
};

export default DocumentEditorPage;