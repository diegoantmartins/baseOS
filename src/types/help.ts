export type HelpCategoryId =
  | 'comece-aqui'
  | 'configuracao-inicial'
  | 'equipes-atletas'
  | 'competicao'
  | 'partidas'
  | 'sumulas-documentos'
  | 'classificacao'
  | 'fases-finais'
  | 'portal-equipes'
  | 'administracao'
  | 'relatorios'
  | 'problemas-duvidas';

export interface HelpCategory {
  id: HelpCategoryId;
  number: string;
  title: string;
  description: string;
  iconName: string;
}

export interface HelpStep {
  stepNumber: number;
  instruction: string;
  highlight?: string;
  tip?: string;
}

export interface HelpArticle {
  id: string;
  slug: string;
  category: HelpCategoryId;
  categoryTitle: string;
  title: string;
  description: string;
  objective: string;
  prerequisites: string[];
  steps: HelpStep[];
  result: string;
  nextStep?: {
    articleId?: string;
    label: string;
    route?: string;
  };
  screenRoute?: string;
  screenLabel?: string;
  keywords: string[];
  relatedArticles?: string[];
  difficulty?: 'basic' | 'intermediate' | 'advanced';
}

export type JourneyStepStatus = 'completed' | 'in_progress' | 'pending' | 'attention';

export interface OrganizerJourneyStep {
  stepNumber: string;
  title: string;
  description: string;
  status: JourneyStepStatus;
  articleId: string;
  route: string;
  actionLabel: string;
  guideLabel: string;
}
