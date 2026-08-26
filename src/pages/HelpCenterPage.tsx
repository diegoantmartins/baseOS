import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  BookOpen,
  Sparkles,
  Sliders,
  Users,
  Trophy,
  Volleyball,
  FileText,
  BarChart3,
  GitMerge,
  Globe,
  ShieldCheck,
  FileSpreadsheet,
  HelpCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  X,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  HELP_CATEGORIES,
  HELP_ARTICLES,
  ORGANIZER_JOURNEY_STEPS,
  searchHelpArticles,
  getHelpArticleById,
} from '@/data/helpArticles';
import { HelpCategoryId, HelpArticle } from '@/types/help';
import { HelpArticleViewer } from '@/components/help/HelpArticleViewer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS: Record<HelpCategoryId, typeof Sparkles> = {
  'comece-aqui': Sparkles,
  'configuracao-inicial': Sliders,
  'equipes-atletas': Users,
  'competicao': Trophy,
  'partidas': Volleyball,
  'sumulas-documentos': FileText,
  'classificacao': BarChart3,
  'fases-finais': GitMerge,
  'portal-equipes': Globe,
  'administracao': ShieldCheck,
  'relatorios': FileSpreadsheet,
  'problemas-duvidas': HelpCircle,
};

export default function HelpCenterPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<HelpCategoryId | 'todas'>('todas');
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(searchParams.get('artigo'));
  const [journeyExpanded, setJourneyExpanded] = useState(true);

  // Sync URL search param
  useEffect(() => {
    const articleFromUrl = searchParams.get('artigo');
    if (articleFromUrl !== selectedArticleId) {
      setSelectedArticleId(articleFromUrl);
    }
  }, [searchParams, selectedArticleId]);

  const handleSelectArticle = (articleId: string | null) => {
    setSelectedArticleId(articleId);
    if (articleId) {
      setSearchParams({ artigo: articleId });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setSearchParams({});
    }
  };

  // Filtered articles
  const filteredArticles = useMemo(() => {
    let list = HELP_ARTICLES;
    if (searchQuery.trim()) {
      list = searchHelpArticles(searchQuery);
    }
    if (selectedCategory !== 'todas') {
      list = list.filter((a) => a.category === selectedCategory);
    }
    return list;
  }, [searchQuery, selectedCategory]);

  const activeArticle = useMemo(() => {
    if (!selectedArticleId) return null;
    return getHelpArticleById(selectedArticleId);
  }, [selectedArticleId]);

  return (
    <MainLayout>
      <div className="space-y-8 pb-12 max-w-7xl mx-auto">
        {/* Header Hero Section */}
        <section className="relative overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800/80 p-6 sm:p-8">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-medium text-primary">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Base de Conhecimento e Guia Operacional</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Central de Ajuda BaseOS
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Encontre orientações passo a passo, manuais de operação e regras reais para conduzir competições de ponta a ponta sem complicação.
            </p>

            {/* Live Search Input */}
            <div className="relative pt-2">
              <Search className="absolute left-3.5 top-5 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="O que você precisa fazer? (ex: cadastrar equipe, súmula 5 sets, critérios de desempate...)"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (selectedArticleId) handleSelectArticle(null);
                }}
                className="pl-10 pr-10 h-11 text-sm bg-zinc-900/90 border-zinc-700 text-foreground placeholder:text-muted-foreground rounded-lg focus-visible:ring-primary shadow-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-5 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Article Reader View (When an article is active) */}
        {activeArticle ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1 space-y-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 h-8 text-xs border-zinc-800 bg-zinc-900 hover:bg-zinc-800"
                onClick={() => handleSelectArticle(null)}
              >
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                <span>Voltar para todos os artigos</span>
              </Button>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider px-1">
                  Artigos desta categoria
                </div>
                <div className="space-y-1">
                  {HELP_ARTICLES.filter((a) => a.category === activeArticle.category).map((art) => (
                    <button
                      key={art.id}
                      type="button"
                      onClick={() => handleSelectArticle(art.id)}
                      className={cn(
                        'w-full text-left p-2 rounded-md text-xs transition-colors flex items-center gap-2',
                        art.id === activeArticle.id
                          ? 'bg-zinc-800 text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-zinc-900'
                      )}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                      <span className="truncate">{art.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Article Content */}
            <div className="lg:col-span-3 rounded-2xl bg-zinc-950 border border-zinc-800 p-6 sm:p-8">
              <HelpArticleViewer
                article={activeArticle}
                onSelectArticle={(id) => handleSelectArticle(id)}
              />
            </div>
          </div>
        ) : (
          /* Normal Directory / Browse Mode */
          <div className="space-y-10">
            {/* 1. Jornada do Organizador (Visual Workflow) */}
            {!searchQuery && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h2 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-primary" />
                      <span>Jornada do Organizador</span>
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Ciclo operacional completo de uma competição, do planejamento ao encerramento.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setJourneyExpanded(!journeyExpanded)}
                  >
                    {journeyExpanded ? 'Recolher jornada' : 'Expandir jornada'}
                  </Button>
                </div>

                {journeyExpanded && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {ORGANIZER_JOURNEY_STEPS.map((step) => (
                      <Card
                        key={step.stepNumber}
                        className="card-elevated bg-zinc-950 border-zinc-800/90 hover:border-zinc-700/80 transition-all flex flex-col justify-between p-3.5 space-y-3"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center justify-center w-6 h-6 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-mono font-bold text-foreground">
                              {step.stepNumber}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[9px] uppercase font-semibold border-zinc-800',
                                step.status === 'completed' && 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40',
                                step.status === 'in_progress' && 'bg-amber-950/40 text-amber-400 border-amber-900/40',
                                step.status === 'pending' && 'bg-zinc-900 text-zinc-400'
                              )}
                            >
                              {step.status === 'completed' && 'Concluído'}
                              {step.status === 'in_progress' && 'Em andamento'}
                              {step.status === 'pending' && 'Pendente'}
                            </Badge>
                          </div>

                          <h3 className="text-xs font-semibold text-foreground leading-tight">
                            {step.title}
                          </h3>
                          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                            {step.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelectArticle(step.articleId)}
                            className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
                          >
                            <span>{step.guideLabel}</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1"
                            onClick={() => navigate(step.route)}
                          >
                            <span>Ir à tela</span>
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* 2. Categorias (Filter Chips) */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  size="sm"
                  variant={selectedCategory === 'todas' ? 'default' : 'outline'}
                  className={cn(
                    'h-7 px-3 text-xs rounded-full shadow-none font-medium',
                    selectedCategory !== 'todas' && 'border-zinc-800 bg-zinc-950 text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => setSelectedCategory('todas')}
                >
                  Todas ({HELP_ARTICLES.length})
                </Button>
                {HELP_CATEGORIES.map((cat) => {
                  const count = HELP_ARTICLES.filter((a) => a.category === cat.id).length;
                  const Icon = CATEGORY_ICONS[cat.id];
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <Button
                      key={cat.id}
                      size="sm"
                      variant={isSelected ? 'default' : 'outline'}
                      className={cn(
                        'h-7 px-3 text-xs rounded-full gap-1.5 shadow-none font-medium',
                        !isSelected && 'border-zinc-800 bg-zinc-950 text-muted-foreground hover:text-foreground'
                      )}
                      onClick={() => setSelectedCategory(cat.id)}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{cat.title}</span>
                      <span className="opacity-60 text-[10px]">({count})</span>
                    </Button>
                  );
                })}
              </div>

              {/* 3. Articles Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {filteredArticles.length === 0 ? (
                  <div className="col-span-full py-12 text-center space-y-2 rounded-xl bg-zinc-950 border border-zinc-800">
                    <HelpCircle className="w-8 h-8 text-muted-foreground mx-auto" />
                    <p className="text-sm font-medium text-foreground">Nenhum artigo encontrado para sua busca</p>
                    <p className="text-xs text-muted-foreground">Tente pesquisar por outros termos como "equipe", "súmula", "sets" ou "classificação".</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 text-xs border-zinc-800"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('todas');
                      }}
                    >
                      Limpar filtros
                    </Button>
                  </div>
                ) : (
                  filteredArticles.map((article) => {
                    const CategoryIcon = CATEGORY_ICONS[article.category] || HelpCircle;
                    return (
                      <Card
                        key={article.id}
                        onClick={() => handleSelectArticle(article.id)}
                        className="card-elevated bg-zinc-950 border-zinc-800/90 hover:border-zinc-700 transition-all p-4 space-y-3 cursor-pointer group flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary uppercase tracking-wider">
                              <CategoryIcon className="w-3.5 h-3.5 shrink-0" />
                              <span>{article.categoryTitle}</span>
                            </div>
                            {article.difficulty && (
                              <span className="text-[10px] text-muted-foreground uppercase font-medium">
                                {article.difficulty === 'basic' && 'Iniciante'}
                                {article.difficulty === 'intermediate' && 'Intermediário'}
                                {article.difficulty === 'advanced' && 'Avançado'}
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                            {article.title}
                          </h3>

                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                            {article.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs text-muted-foreground group-hover:text-foreground">
                          <span className="text-[11px]">
                            {article.steps.length} {article.steps.length === 1 ? 'passo' : 'passos'}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] font-medium text-primary">
                            <span>Ver guia</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
