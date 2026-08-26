import { describe, it, expect } from 'vitest';
import {
  HELP_CATEGORIES,
  HELP_ARTICLES,
  ORGANIZER_JOURNEY_STEPS,
  getHelpArticleById,
  searchHelpArticles,
} from '@/data/helpArticles';

describe('Central de Ajuda e Base de Conhecimento BaseOS', () => {
  it('deve possuir exatamente as 12 categorias oficiais', () => {
    expect(HELP_CATEGORIES).toHaveLength(12);
    const categoryIds = HELP_CATEGORIES.map(c => c.id);
    expect(categoryIds).toContain('comece-aqui');
    expect(categoryIds).toContain('configuracao-inicial');
    expect(categoryIds).toContain('equipes-atletas');
    expect(categoryIds).toContain('competicao');
    expect(categoryIds).toContain('partidas');
    expect(categoryIds).toContain('sumulas-documentos');
    expect(categoryIds).toContain('classificacao');
    expect(categoryIds).toContain('fases-finais');
    expect(categoryIds).toContain('portal-equipes');
    expect(categoryIds).toContain('administracao');
    expect(categoryIds).toContain('relatorios');
    expect(categoryIds).toContain('problemas-duvidas');
  });

  it('todos os artigos devem seguir o padrão obrigatório de estrutura', () => {
    expect(HELP_ARTICLES.length).toBeGreaterThan(15);

    for (const article of HELP_ARTICLES) {
      expect(article.id, `Artigo ${article.id} deve ter id`).toBeTruthy();
      expect(article.title, `Artigo ${article.id} deve ter título`).toBeTruthy();
      expect(article.objective, `Artigo ${article.id} deve ter objetivo`).toBeTruthy();
      expect(article.prerequisites, `Artigo ${article.id} deve ter pré-requisitos`).toBeInstanceOf(Array);
      expect(article.steps.length, `Artigo ${article.id} deve ter pelo menos 1 passo`).toBeGreaterThan(0);
      expect(article.result, `Artigo ${article.id} deve ter resultado esperado`).toBeTruthy();
      expect(article.category, `Artigo ${article.id} deve ter categoria válida`).toBeTruthy();
      expect(article.keywords.length, `Artigo ${article.id} deve ter palavras-chave`).toBeGreaterThan(0);

      // Cada passo deve ter número e instrução
      article.steps.forEach((step, idx) => {
        expect(step.stepNumber).toBe(idx + 1);
        expect(step.instruction).toBeTruthy();
      });
    }
  });

  it('rotas referenciadas nos artigos devem ser rotas reais do sistema', () => {
    const validRoutes = new Set([
      '/',
      '/competicoes-ativas',
      '/competicoes',
      '/jogos',
      '/sumulas',
      '/equipes',
      '/atletas',
      '/pessoas',
      '/locais',
      '/modalidades',
      '/sorteio',
      '/estatisticas',
      '/relatorios',
      '/settings',
      '/configuracoes',
      '/ajuda',
    ]);

    for (const article of HELP_ARTICLES) {
      if (article.screenRoute) {
        expect(
          validRoutes.has(article.screenRoute),
          `Rota "${article.screenRoute}" no artigo "${article.id}" deve ser uma rota válida do sistema`
        ).toBe(true);
      }
    }
  });

  it('Jornada do Organizador deve ter 13 etapas sequenciais conectadas a artigos reais', () => {
    expect(ORGANIZER_JOURNEY_STEPS).toHaveLength(13);

    ORGANIZER_JOURNEY_STEPS.forEach((step, idx) => {
      const expectedNumber = String(idx + 1).padStart(2, '0');
      expect(step.stepNumber).toBe(expectedNumber);
      expect(step.title).toBeTruthy();
      expect(step.route).toBeTruthy();
      expect(step.articleId).toBeTruthy();

      const linkedArticle = getHelpArticleById(step.articleId);
      expect(linkedArticle, `Artigo "${step.articleId}" vinculado à etapa ${step.stepNumber} deve existir`).toBeDefined();
    });
  });

  it('função de busca deve encontrar artigos com tolerância a acentos e termos parciais', () => {
    // Busca exata
    const cadastrar = searchHelpArticles('cadastrar equipe');
    expect(cadastrar.some(a => a.id === 'cadastrar-equipe')).toBe(true);

    // Busca sem acento
    const sumula = searchHelpArticles('sumula 5 sets');
    expect(sumula.some(a => a.id === 'gerar-sumula' || a.id === 'configurar-modalidade')).toBe(true);

    // Busca por critério de desempate
    const desempate = searchHelpArticles('desempate');
    expect(desempate.some(a => a.id === 'regras-classificacao')).toBe(true);

    // Busca vazia retorna todos
    const todos = searchHelpArticles('');
    expect(todos).toHaveLength(HELP_ARTICLES.length);
  });
});
