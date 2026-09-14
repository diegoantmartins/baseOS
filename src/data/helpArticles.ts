import { HelpArticle, HelpCategory, OrganizerJourneyStep } from '@/types/help';
export type { HelpArticle, HelpCategory, OrganizerJourneyStep };

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: 'comece-aqui',
    number: '01',
    title: 'Comece aqui',
    description: 'Visão geral, conceitos fundamentais e arquitetura de gestão esportiva do BaseOS.',
    iconName: 'Sparkles',
  },
  {
    id: 'configuracao-inicial',
    number: '02',
    title: 'Configuração inicial',
    description: 'Criação de competições, modalidades, ginásios, quadras, regras de sets e desempate.',
    iconName: 'Sliders',
  },
  {
    id: 'equipes-atletas',
    number: '03',
    title: 'Equipes e atletas',
    description: 'Cadastro e gestão de clubes, comissão técnica, jogadores, capitão, líberos e logotipos.',
    iconName: 'Users',
  },
  {
    id: 'competicao',
    number: '04',
    title: 'Competição',
    description: 'Estruturação de fases, grupos, melhores terceiros, geração de confrontos e tabela de jogos.',
    iconName: 'Trophy',
  },
  {
    id: 'partidas',
    number: '05',
    title: 'Partidas',
    description: 'Abertura de jogos, check-in, escalação, rotação, registro de placar ponto a ponto e finalização.',
    iconName: 'Volleyball',
  },
  {
    id: 'sumulas-documentos',
    number: '06',
    title: 'Súmulas e documentos',
    description: 'Geração oficial de súmulas vetoriais de 3 e 5 sets, folhas em branco, ordem de saque e impressão.',
    iconName: 'FileText',
  },
  {
    id: 'classificacao',
    number: '07',
    title: 'Classificação',
    description: 'Regras de pontuação FIVB/CBV, critérios de desempate, Set Average, Pontos Average e avanço.',
    iconName: 'BarChart3',
  },
  {
    id: 'fases-finais',
    number: '08',
    title: 'Fases finais',
    description: 'Configuração de mata-mata, quartas de final, semifinais, disputa de 3º lugar e grande final.',
    iconName: 'GitMerge',
  },
  {
    id: 'portal-equipes',
    number: '09',
    title: 'Portal de equipes e atletas',
    description: 'Inscrição externa via link público, preenchimento de elenco pelo representante e homologação.',
    iconName: 'Globe',
  },
  {
    id: 'administracao',
    number: '10',
    title: 'Administração',
    description: 'Gestão de usuários, perfis de acesso, políticas de segurança, timeout e logs de auditoria.',
    iconName: 'ShieldCheck',
  },
  {
    id: 'relatorios',
    number: '11',
    title: 'Relatórios',
    description: 'Emissão e exportação de Boletim de Jogos, Relação Nominal, Classificação por Grupos e Pódio.',
    iconName: 'FileSpreadsheet',
  },
  {
    id: 'problemas-duvidas',
    number: '12',
    title: 'Problemas e dúvidas frequentes',
    description: 'Guia de resolução rápida de inconsistências, correções de placar e dúvidas operacionais.',
    iconName: 'HelpCircle',
  },
];

export const ORGANIZER_JOURNEY_STEPS: OrganizerJourneyStep[] = [
  {
    stepNumber: '01',
    title: 'Criar Competição',
    description: 'Cadastre o torneio com nome, temporada, datas de início/fim e modalidade padrão.',
    status: 'completed',
    articleId: 'criar-competicao',
    route: '/competicoes',
    actionLabel: 'Ir para Competições',
    guideLabel: 'Ver como criar',
  },
  {
    stepNumber: '02',
    title: 'Configurar Modalidade',
    description: 'Defina as regras de pontuação, quantidade de sets (3 ou 5 sets) e pontuação de tiebreak.',
    status: 'completed',
    articleId: 'configurar-modalidade',
    route: '/modalidades',
    actionLabel: 'Gerenciar Modalidades',
    guideLabel: 'Ver regras de modalidade',
  },
  {
    stepNumber: '03',
    title: 'Configurar Locais e Quadras',
    description: 'Cadastre os ginásios, praças esportivas, pisos e a numeração das quadras de jogo.',
    status: 'completed',
    articleId: 'configurar-locais-quadras',
    route: '/locais',
    actionLabel: 'Gerenciar Locais',
    guideLabel: 'Ver cadastro de quadras',
  },
  {
    stepNumber: '04',
    title: 'Cadastrar Equipes',
    description: 'Cadastre os clubes participantes ou compartilhe o link de inscrição para os representantes.',
    status: 'completed',
    articleId: 'cadastrar-equipe',
    route: '/equipes',
    actionLabel: 'Gerenciar Equipes',
    guideLabel: 'Ver como cadastrar',
  },
  {
    stepNumber: '05',
    title: 'Cadastrar Atletas e Elenco',
    description: 'Vincule jogadores com camisa (1-99), posição, capitão único e até dois líberos.',
    status: 'completed',
    articleId: 'cadastrar-atleta',
    route: '/atletas',
    actionLabel: 'Gerenciar Atletas',
    guideLabel: 'Ver regras de elenco',
  },
  {
    stepNumber: '06',
    title: 'Configurar Grupos e Sorteio',
    description: 'Realize o sorteio dirigido com cabeças de chave ou distribua equipes manualmente nos grupos.',
    status: 'in_progress',
    articleId: 'sorteio-grupos',
    route: '/sorteio',
    actionLabel: 'Abrir Sorteio e Grupos',
    guideLabel: 'Ver como sortear',
  },
  {
    stepNumber: '07',
    title: 'Configurar Classificação',
    description: 'Revise a tabela de pontos (3-0/3-1 = 3 pts, 3-2 = 2x1 pts) e a ordem de desempate CBV.',
    status: 'in_progress',
    articleId: 'regras-classificacao',
    route: '/competicoes',
    actionLabel: 'Ver Classificação',
    guideLabel: 'Ver critérios de desempate',
  },
  {
    stepNumber: '08',
    title: 'Gerar Confrontos',
    description: 'Gere a grade de partidas de cada grupo no formato todos-contra-todos (Round Robin).',
    status: 'in_progress',
    articleId: 'gerar-confrontos',
    route: '/jogos',
    actionLabel: 'Ver Jogos Gerados',
    guideLabel: 'Ver geração de jogos',
  },
  {
    stepNumber: '09',
    title: 'Montar Tabela de Horários',
    description: 'Defina datas, horários de início e quadras específicas para cada confronto.',
    status: 'pending',
    articleId: 'montar-tabela-jogos',
    route: '/jogos',
    actionLabel: 'Escalar Partidas',
    guideLabel: 'Ver agendamento',
  },
  {
    stepNumber: '10',
    title: 'Realizar Partidas',
    description: 'Faça o check-in de atletas na quadra, escale a arbitragem e inicie a partida oficial.',
    status: 'pending',
    articleId: 'abrir-partida',
    route: '/jogos',
    actionLabel: 'Central de Jogos',
    guideLabel: 'Ver operação de jogo',
  },
  {
    stepNumber: '11',
    title: 'Registrar Súmulas e Resultados',
    description: 'Lance o placar dos sets, valide faltas/substituições e emita a súmula final assinada.',
    status: 'pending',
    articleId: 'gerar-sumula',
    route: '/sumulas',
    actionLabel: 'Visualizar Súmulas',
    guideLabel: 'Ver emissão de súmulas',
  },
  {
    stepNumber: '12',
    title: 'Executar Fases Finais',
    description: 'Avance as equipes classificadas para Quartas, Semifinal e Final e gere o mata-mata.',
    status: 'pending',
    articleId: 'fases-finais-mata-mata',
    route: '/competicoes',
    actionLabel: 'Fases da Competição',
    guideLabel: 'Ver mata-mata',
  },
  {
    stepNumber: '13',
    title: 'Homologar e Finalizar',
    description: 'Emita o Quadro de Honra / Boletim de Encerramento e altere o status para Homologada.',
    status: 'pending',
    articleId: 'relatorios-encerramento',
    route: '/relatorios',
    actionLabel: 'Emitir Boletins',
    guideLabel: 'Ver encerramento',
  },
];

export const HELP_ARTICLES: HelpArticle[] = [
  // =========================================================================
  // 01 — COMECE AQUI
  // =========================================================================
  {
    id: 'o-que-e-baseos',
    slug: 'o-que-e-baseos',
    category: 'comece-aqui',
    categoryTitle: 'Comece aqui',
    title: 'O que é o BaseOS',
    description: 'Entenda a proposta, arquitetura e benefícios do sistema de gestão esportiva para voleibol.',
    objective: 'Apresentar a visão geral do BaseOS, seus recursos de ponta a ponta e o modelo de operação sem papel (Paperless).',
    prerequisites: ['Nenhum pré-requisito técnico é necessário para leitura deste artigo.'],
    steps: [
      {
        stepNumber: 1,
        instruction: 'O BaseOS é um Sistema Operacional SaaS Enterprise projetado especificamente para a gestão de campeonatos de Voleibol de Quadra e Vôlei de Praia.',
        highlight: 'Gestão Completa',
      },
      {
        stepNumber: 2,
        instruction: 'Ele integra desde o cadastro de clubes, atletas e quadras até o sorteio de grupos, geração de tabela, check-in eletrônico de atletas, geração vetorial de súmula oficial e cálculo de classificação em tempo real.',
      },
      {
        stepNumber: 3,
        instruction: 'O sistema opera com persistência adaptável (banco de dados Supabase em produção e modo local demo para homologação) e funciona como PWA instalável.',
      },
    ],
    result: 'Você terá clareza sobre todas as capacidades do sistema e como ele atende organizadores, árbitros e equipes.',
    nextStep: {
      articleId: 'fluxo-completo-competicao',
      label: 'Entender a Jornada Completa do Organizador',
      route: '/ajuda',
    },
    keywords: ['o que é', 'baseos', 'volleypro', 'sistema', 'visao geral', 'introducao'],
    relatedArticles: ['fluxo-completo-competicao', 'como-funciona-uma-competicao', 'criar-competicao'],
    difficulty: 'basic',
  },
  {
    id: 'como-funciona-uma-competicao',
    slug: 'como-funciona-uma-competicao',
    category: 'comece-aqui',
    categoryTitle: 'Comece aqui',
    title: 'Como funciona uma competição',
    description: 'Entenda a estrutura hierárquica entre competição, modalidades, fases, grupos e partidas.',
    objective: 'Explicar a hierarquia de dados e a dinâmica de avanço das equipes durante um torneio.',
    prerequisites: ['Compreender os fundamentos básicos de torneios esportivos.'],
    steps: [
      {
        stepNumber: 1,
        instruction: 'Uma Competição reúne equipes em torno de uma ou mais categorias/modalidades (ex: Adulto Masculino Quadra, Sub-19 Feminino Praia).',
      },
      {
        stepNumber: 2,
        instruction: 'A competição é dividida em Fases: Fase Classificatória (com grupos) e Fases Finais (Quartas, Semifinal, 3º Lugar e Final).',
      },
      {
        stepNumber: 3,
        instruction: 'Cada Grupo possui seus confrontos gerados em turno único ou ida e volta, gerando pontos que alimentam a tabela de classificação automática.',
      },
      {
        stepNumber: 4,
        instruction: 'As melhores equipes de cada grupo e os melhores terceiros colocados avançam para o chaveamento de mata-mata.',
      },
    ],
    result: 'Você conhecerá a arquitetura lógica utilizada pelo BaseOS para controlar qualquer formato de disputa.',
    nextStep: {
      articleId: 'fluxo-completo-competicao',
      label: 'Ver a Jornada do Organizador',
    },
    keywords: ['competicao', 'fases', 'grupos', 'chaveamento', 'estrutura'],
    relatedArticles: ['o-que-e-baseos', 'fluxo-completo-competicao', 'regras-classificacao'],
    difficulty: 'basic',
  },
  {
    id: 'fluxo-completo-competicao',
    slug: 'fluxo-completo-competicao',
    category: 'comece-aqui',
    categoryTitle: 'Comece aqui',
    title: 'Jornada completa do organizador',
    description: 'Guia do ciclo operacional passo a passo: da criação do campeonato à entrega dos troféus.',
    objective: 'Guiar o organizador pelo fluxo linear de 13 etapas necessárias para realizar um campeonato sem falhas.',
    prerequisites: ['Acesso de Organizador ou Administrador ao sistema.'],
    steps: [
      {
        stepNumber: 1,
        instruction: 'Etapa 1 a 3: Crie a competição, configure a modalidade de disputa e cadastre os ginásios e quadras.',
        highlight: 'Configuração Inicial',
      },
      {
        stepNumber: 2,
        instruction: 'Etapa 4 e 5: Cadastre as equipes e os elencos de atletas (ou compartilhe o link de auto-inscrição).',
        highlight: 'Equipes e Elencos',
      },
      {
        stepNumber: 3,
        instruction: 'Etapa 6 a 9: Realize o sorteio dos grupos, confirme as regras de classificação, gere os jogos e defina datas/horários.',
        highlight: 'Tabela e Sorteio',
      },
      {
        stepNumber: 4,
        instruction: 'Etapa 10 a 13: Execute os jogos com check-in e súmula eletrônica, acompanhe a classificação, rode as finais e emita os boletins.',
        highlight: 'Execução e Encerramento',
      },
    ],
    result: 'O organizador domina a sequência cronológica completa das operações.',
    nextStep: {
      articleId: 'criar-competicao',
      label: 'Criar sua Primeira Competição',
      route: '/competicoes',
    },
    screenRoute: '/competicoes-ativas',
    screenLabel: 'Ver Competições Ativas',
    keywords: ['jornada', 'passo a passo', 'fluxo', 'guia', 'organizador', 'ciclo'],
    relatedArticles: ['o-que-e-baseos', 'criar-competicao', 'sorteio-grupos'],
    difficulty: 'basic',
  },

  // =========================================================================
  // 02 — CONFIGURAÇÃO INICIAL
  // =========================================================================
  {
    id: 'criar-competicao',
    slug: 'criar-competicao',
    category: 'configuracao-inicial',
    categoryTitle: 'Configuração inicial',
    title: 'Como criar uma competição',
    description: 'Aprenda a cadastrar um novo campeonato no BaseOS definindo temporada, modalidade e datas.',
    objective: 'Criar uma nova competição no sistema para abrigar equipes, fases e jogos.',
    prerequisites: ['Estar autenticado com perfil de Organizador.'],
    steps: [
      {
        stepNumber: 1,
        instruction: 'No menu superior ou dropdown Cadastros, acesse "Competições" (/competicoes).',
      },
      {
        stepNumber: 2,
        instruction: 'Clique no botão primário "+ Nova Competição" no cabeçalho superior direito.',
        highlight: '+ Nova Competição',
      },
      {
        stepNumber: 3,
        instruction: 'Preencha o Nome da Competição (ex: Campeonato Municipal 2026), a Modalidade (Quadra ou Praia) e a Capacidade Máxima de Equipes (vagas disponíveis).',
        highlight: 'Capacidade Máxima',
      },
      {
        stepNumber: 4,
        instruction: 'Defina o período previsto com a Data de Início e a Data Prevista de Término.',
      },
      {
        stepNumber: 5,
        instruction: 'Clique em "Criar Competição". A competição é criada imediatamente pronta para receber inscrições, sem exigir etapas técnicas intermediárias.',
      },
    ],
    result: 'A competição fica imediatamente com inscrições abertas e o painel operacional orienta a próxima ação: convidar ou cadastrar equipes.',
    nextStep: {
      articleId: 'portal-equipes-auto-inscricao',
      label: 'Convidar Equipes via Link',
      route: '/competicoes',
    },
    screenRoute: '/competicoes',
    screenLabel: 'Ir para Competições',
    keywords: ['criar competicao', 'novo campeonato', 'cadastrar torneio', 'inscricoes abertas'],
    relatedArticles: ['capacidade-equipes-vagas', 'portal-equipes-auto-inscricao', 'cadastrar-equipe'],
    difficulty: 'basic',
  },
  {
    id: 'configurar-modalidade',
    slug: 'configurar-modalidade',
    category: 'configuracao-inicial',
    categoryTitle: 'Configuração inicial',
    title: 'Como configurar modalidades e regras de sets',
    description: 'Configure regras de 3 ou 5 sets, pontuação limite, diferença de 2 pontos e pontuação de tiebreak.',
    objective: 'Personalizar os formatos de disputa (Vôlei de Quadra 6x6, Vôlei de Praia 2x2 ou 4x4) e seus parâmetros de set.',
    prerequisites: ['Perfil de Organizador.'],
    steps: [
      {
        stepNumber: 1,
        instruction: 'Acesse o menu "Modalidades" (/modalidades).',
      },
      {
        stepNumber: 2,
        instruction: 'Selecione uma modalidade existente para editar ou clique em "+ Nova Modalidade".',
      },
      {
        stepNumber: 3,
        instruction: 'Configure o Tipo de Superfície (Quadra / Areia) e o Formato de Atletas (ex: 6x6, 2x2, 4x4).',
      },
      {
        stepNumber: 4,
        instruction: 'Defina a Quantidade Máxima de Sets da Partida (Melhor de 3 Sets ou Melhor de 5 Sets).',
        highlight: 'Sets e Tiebreak',
      },
      {
        stepNumber: 5,
        instruction: 'Configure a pontuação padrão dos sets normais (ex: 25 pontos na quadra, 21 na praia) e a pontuação do set decisivo (15 pontos).',
      },
      {
        stepNumber: 6,
        instruction: 'Clique em "Salvar Modalidade".',
      },
    ],
    result: 'As partidas vinculadas a essa modalidade aplicarão automaticamente essas regras no placar eletrônico e na súmula.',
    nextStep: {
      articleId: 'configurar-locais-quadras',
      label: 'Cadastrar Locais e Quadras de Jogo',
      route: '/locais',
    },
    screenRoute: '/modalidades',
    screenLabel: 'Ir para Modalidades',
    keywords: ['modalidade', 'sets', 'melhor de 3', 'melhor de 5', 'tiebreak', 'praia', 'quadra'],
    relatedArticles: ['criar-competicao', 'configurar-locais-quadras', 'abrir-partida'],
    difficulty: 'intermediate',
  },
  {
    id: 'configurar-locais-quadras',
    slug: 'configurar-locais-quadras',
    category: 'configuracao-inicial',
    categoryTitle: 'Configuração inicial',
    title: 'Como configurar locais e cadastrar quadras',
    description: 'Cadastre praças esportivas, ginásios, endereços e a quantidade de quadras ativas para os jogos.',
    objective: 'Registrar os locais de disputa para que o agendamento de partidas e súmulas aponte a quadra correta.',
    prerequisites: ['Perfil de Organizador.'],
    steps: [
      {
        stepNumber: 1,
        instruction: 'Acesse o menu "Locais" (/locais).',
      },
      {
        stepNumber: 2,
        instruction: 'Clique no botão "+ Novo Local".',
        highlight: '+ Novo Local',
      },
      {
        stepNumber: 3,
        instruction: 'Informe o Nome do Ginásio/Complexo (ex: Ginásio Poliesportivo Central), Cidade e Endereço.',
      },
      {
        stepNumber: 4,
        instruction: 'No campo "Quadras", adicione os nomes e identificadores das quadras disponíveis (ex: Quadra Principal, Quadra 1, Quadra 2).',
      },
      {
        stepNumber: 5,
        instruction: 'Clique em "Salvar Local".',
      },
    ],
    result: 'O local e suas quadras estarão disponíveis no seletor de agendamento de partidas e na impressão de súmulas.',
    nextStep: {
      articleId: 'cadastrar-equipe',
      label: 'Cadastrar Equipes Participantes',
      route: '/equipes',
    },
    screenRoute: '/locais',
    screenLabel: 'Ir para Locais',
    keywords: ['locais', 'ginasio', 'quadras', 'endereco', 'praca esportiva'],
    relatedArticles: ['criar-competicao', 'cadastrar-equipe', 'abrir-partida'],
    difficulty: 'basic',
  },

  // =========================================================================
  // 03 — EQUIPES E ATLETAS
  // =========================================================================
  {
    id: 'cadastrar-equipe',
    slug: 'cadastrar-equipe',
    category: 'equipes-atletas',
    categoryTitle: 'Equipes e atletas',
    title: 'Como cadastrar uma equipe',
    description: 'Ensina como cadastrar uma equipe, dados de contato, cores oficiais e responsáveis.',
    objective: 'Cadastrar um clube ou agremiação para participação em campeonatos.',
    prerequisites: ['Acesso de Organizador ou link de inscrição de equipe.'],
    steps: [
      {
        stepNumber: 1,
        instruction: 'Acesse o menu "Equipes" (/equipes).',
      },
      {
        stepNumber: 2,
        instruction: 'Clique no botão primário "+ Nova Equipe".',
        highlight: '+ Nova Equipe',
      },
      {
        stepNumber: 3,
        instruction: 'Informe o Nome Completo da Equipe e a Sigla/Abreviação (ex: Vôlei Futuro - VF).',
      },
      {
        stepNumber: 4,
        instruction: 'Informe a Cidade/Estado de origem, e-mail de contato e nome do responsável/técnico.',
      },
      {
        stepNumber: 5,
        instruction: 'Opcionalmente, defina as cores do uniforme (Cor Principal e Secundária).',
      },
      {
        stepNumber: 6,
        instruction: 'Clique em "Salvar Equipe".',
      },
    ],
    result: 'A equipe ficará disponível no cadastro geral e pronta para ser vinculada às competições e receber atletas no elenco.',
    nextStep: {
      articleId: 'cadastrar-atleta',
      label: 'Cadastrar Atletas no Elenco',
      route: '/atletas',
    },
    screenRoute: '/equipes',
    screenLabel: 'Ir para Equipes',
    keywords: ['cadastrar equipe', 'nova equipe', 'clube', 'agremiação', 'inscricao'],
    relatedArticles: ['cadastrar-atleta', 'definir-capitao-libero', 'portal-equipes-auto-inscricao'],
    difficulty: 'basic',
  },
  {
    id: 'cadastrar-atleta',
    slug: 'cadastrar-atleta',
    category: 'equipes-atletas',
    categoryTitle: 'Equipes e atletas',
    title: 'Como cadastrar atletas e gerenciar elenco',
    description: 'Cadastre atletas com dados pessoais, posição, número de camisa e vinculação à equipe.',
    objective: 'Adicionar atletas ao elenco de uma equipe respeitando os limites e regras de numeração.',
    prerequisites: ['A equipe deve estar cadastrada previamente.'],
    steps: [
      {
        stepNumber: 1,
        instruction: 'Acesse o menu "Atletas" (/atletas) ou abra a equipe em "Equipes" e clique na aba Elenco.',
      },
      {
        stepNumber: 2,
        instruction: 'Clique no botão "+ Novo Atleta".',
        highlight: '+ Novo Atleta',
      },
      {
        stepNumber: 3,
        instruction: 'Informe o Nome Completo, Data de Nascimento, Documento de Identidade (RG/CPF).',
      },
      {
        stepNumber: 4,
        instruction: 'Defina a Posição em quadra (Levantador, Ponteiro, Central, Oposto, Líbero).',
      },
      {
        stepNumber: 5,
        instruction: 'Informe o Número da Camisa (1 a 99). O número é opcional no cadastro prévio, mas se informado deve ser único na mesma equipe.',
        highlight: 'Camisa 1-99 Única',
      },
      {
        stepNumber: 6,
        instruction: 'Selecione a Equipe vinculada e clique em "Salvar Atleta".',
      },
    ],
    result: 'O atleta é inserido no elenco oficial da equipe e estará apto para o check-in de partidas.',
    nextStep: {
      articleId: 'definir-capitao-libero',
      label: 'Definir Capitão e Líberos da Equipe',
    },
    screenRoute: '/atletas',
    screenLabel: 'Ir para Atletas',
    keywords: ['cadastrar atleta', 'jogador', 'elenco', 'camisa', 'posicao', 'documento'],
    relatedArticles: ['cadastrar-equipe', 'definir-capitao-libero', 'portal-equipes-auto-inscricao'],
    difficulty: 'basic',
  },
  {
    id: 'definir-capitao-libero',
    slug: 'definir-capitao-libero',
    category: 'equipes-atletas',
    categoryTitle: 'Equipes e atletas',
    title: 'Como definir Capitão e cadastrar Líberos',
    description: 'Regras e procedimentos para marcar o capitão da equipe e até 2 líberos conforme normas CBV/FIVB.',
    objective: 'Designar os papéis especiais de Capitão e Líbero no elenco da equipe.',
    prerequisites: ['Atletas cadastrados na equipe.'],
    steps: [
      {
        stepNumber: 1,
        instruction: 'Abra a ficha da Equipe e acesse a listagem de Atletas do Elenco.',
      },
      {
        stepNumber: 2,
        instruction: 'Para definir o Capitão: clique no botão de edição do atleta desejado e marque a opção "Capitão da Equipe". Apenas 1 atleta por equipe pode ser capitão.',
        highlight: '1 Capitão Obrigatório',
      },
      {
        stepNumber: 3,
        instruction: 'Para definir o(s) Líbero(s): selecione a posição "Líbero" na ficha do atleta. O sistema permite até 2 líberos cadastrados por equipe.',
        highlight: 'Até 2 Líberos',
      },
      {
        stepNumber: 4,
        instruction: 'O capitão é identificado com o indicativo "(C)" ou faixa sublinhada no número, e os líberos com badge "L" na súmula oficial.',
      },
    ],
    result: 'A escalação e súmula oficial do jogo destacarão automaticamente o capitão e os líberos em conformidade com as regras da modalidade.',
    nextStep: {
      articleId: 'sorteio-grupos',
      label: 'Configurar Grupos e Sorteio',
      route: '/sorteio',
    },
    screenRoute: '/equipes',
    screenLabel: 'Ir para Equipes',
    keywords: ['capitao', 'libero', 'regras cbv', 'escalacao', 'posicoes especiais'],
    relatedArticles: ['cadastrar-atleta', 'abrir-partida', 'gerar-sumula'],
    difficulty: 'intermediate',
  },

  // =========================================================================
  // 04 — COMPETIÇÃO & SORTEIO
  // =========================================================================
  {
    id: 'sorteio-grupos',
    slug: 'sorteio-grupos',
    category: 'competicao',
    categoryTitle: 'Competição',
    title: 'Como funciona o Sorteio Oficial de Grupos',
    description: 'Entenda quando uma equipe fica apta para o sorteio, o quórum necessário e como compor as chaves.',
    objective: 'Distribuir as equipes participantes confirmadas nos grupos e habilitar a geração automática da tabela de jogos.',
    prerequisites: ['Inscrições formalmente encerradas e mínimo de 2 equipes confirmadas com elenco válido.'],
    steps: [
      {
        stepNumber: 1,
        instruction: 'Encerre formalmente as inscrições no painel de inscrições quando todas as vagas forem preenchidas ou o prazo expirar.',
      },
      {
        stepNumber: 2,
        instruction: 'Uma equipe só fica apta para o sorteio após ter sua inscrição confirmada pelo organizador e possuir o elenco mínimo completo (mínimo de 6 atletas na quadra).',
        highlight: 'Critério de Aptidão',
      },
      {
        stepNumber: 3,
        instruction: 'A competição exige quórum mínimo de 2 equipes aptas (e pelo menos 2 equipes por grupo configurado).',
      },
      {
        stepNumber: 4,
        instruction: 'Acesse o menu "Sorteio" ou clique no botão recomendado "Realizar Sorteio Oficial" no painel da competição.',
        highlight: 'Realizar Sorteio Oficial',
      },
      {
        stepNumber: 5,
        instruction: 'Defina as equipes que serão cabeças de chave e clique em "Realizar Sorteio Automático" ou distribua manualmente nos grupos.',
      },
      {
        stepNumber: 6,
        instruction: 'Clique em "Confirmar e Gerar Chaveamento" para salvar os grupos e gerar a grade de confrontos da fase classificatória.',
      },
    ],
    result: 'O sorteio é concluído, o status avança para "Grupos definidos" e o sistema orienta a próxima ação: Ir para a Central de Jogos.',
    nextStep: {
      articleId: 'abrir-partida',
      label: 'Como iniciar jogos e operar a súmula',
      route: '/jogos',
    },
    screenRoute: '/sorteio',
    screenLabel: 'Ir para Sorteio e Grupos',
    keywords: ['sorteio', 'grupos', 'chaves', 'aptidao', 'quorum', 'cabecas de chave'],
    relatedArticles: ['capacidade-equipes-vagas', 'portal-equipes-auto-inscricao', 'reabrir-encerrar-inscricoes'],
    difficulty: 'intermediate',
  },
  {
    id: 'gerar-confrontos',
    slug: 'gerar-confrontos',
    category: 'competicao',
    categoryTitle: 'Competição',
    title: 'Como gerar confrontos e montar a tabela de jogos',
    description: 'Crie as rodadas de jogos de cada grupo e defina datas, horários e locais para cada partida.',
    objective: 'Gerar a grade de partidas entre todas as equipes do grupo (Round Robin) e programar os jogos.',
    prerequisites: ['Grupos configurados no sorteio.'],
    steps: [
      {
        stepNumber: 1,
        instruction: 'No painel da Competição ou em "Sorteio", clique em "Gerar Tabela de Jogos".',
      },
      {
        stepNumber: 2,
        instruction: 'O sistema gerará automaticamente as rodadas de confrontos cruzando as equipes do mesmo grupo.',
      },
      {
        stepNumber: 3,
        instruction: 'Acesse a "Central de Jogos" (/jogos) para visualizar todos os jogos gerados com status "Agendado".',
      },
      {
        stepNumber: 4,
        instruction: 'Para definir ou alterar a data/horário/quadra: clique no menu de ações (...) do card da partida e selecione "Editar Partida".',
        highlight: 'Agendamento de Quadra',
      },
      {
        stepNumber: 5,
        instruction: 'Defina a Data, Horário e a Quadra/Ginásio correspondente e salve.',
      },
    ],
    result: 'A tabela oficial de jogos fica montada e pronta para publicação e início das partidas.',
    nextStep: {
      articleId: 'montar-tabela-jogos',
      label: 'Montar Tabela de Horários e Quadras',
      route: '/jogos',
    },
    screenRoute: '/jogos',
    screenLabel: 'Ir para Jogos',
    keywords: ['confrontos', 'rodadas', 'tabela de jogos', 'agendar partida', 'horarios', 'quadras'],
    relatedArticles: ['sorteio-grupos', 'montar-tabela-jogos', 'abrir-partida'],
    difficulty: 'intermediate',
  },
  {
    id: 'montar-tabela-jogos',
    slug: 'montar-tabela-jogos',
    category: 'competicao',
    categoryTitle: 'Competição',
    title: 'Como definir datas, horários e quadras na tabela de jogos',
    description: 'Ajuste a grade horária das partidas, defina intervalos de descanso e aloque ginásios e quadras sem conflito.',
    objective: 'Programar a ordem cronológica e a distribuição espacial de todas as partidas da competição.',
    prerequisites: ['Confrontos gerados a partir dos grupos.'],
    steps: [
      {
        stepNumber: 1,
        instruction: 'Acesse a Central de Jogos (/jogos) e selecione a sub-aba "Agenda e Horários".',
      },
      {
        stepNumber: 2,
        instruction: 'Localize a partida e clique no menu de opções (...) > "Editar Agendamento".',
        highlight: 'Editar Agendamento',
      },
      {
        stepNumber: 3,
        instruction: 'Selecione a Data do confronto, o Horário de Início e o Ginásio / Quadra de disputa.',
      },
      {
        stepNumber: 4,
        instruction: 'O sistema valida automaticamente conflitos de horário da mesma equipe ou da mesma quadra com aviso visual.',
        highlight: 'Prevenção de Conflitos',
      },
      {
        stepNumber: 5,
        instruction: 'Clique em "Salvar Programação".',
      },
    ],
    result: 'A partida terá horário e quadra definidos, alimentando o Boletim de Jogos e as súmulas oficiais.',
    nextStep: {
      articleId: 'abrir-partida',
      label: 'Iniciar e Operar Partidas',
      route: '/jogos',
    },
    screenRoute: '/jogos',
    screenLabel: 'Ir para Central de Jogos',
    keywords: ['montar tabela', 'agenda', 'horarios', 'quadras', 'conflito', 'escala'],
    relatedArticles: ['gerar-confrontos', 'abrir-partida', 'configurar-locais-quadras'],
    difficulty: 'intermediate',
  },

  // =========================================================================
  // 05 — PARTIDAS & SÚMULA ELETRÔNICA
  // =========================================================================
  {
    id: 'abrir-partida',
    slug: 'abrir-partida',
    category: 'partidas',
    categoryTitle: 'Partidas',
    title: 'Como abrir, realizar check-in e iniciar uma partida',
    description: 'Procedimento operacional no dia do jogo: confirmação de presença de atletas, arbitragem e início.',
    objective: 'Realizar o check-in dos elencos na quadra, conferir numeração e abrir o jogo.',
    prerequisites: ['Partida agendada e horário do jogo.'],
    steps: [
      {
        stepNumber: 1,
        instruction: 'Acesse a Central de "Jogos" (/jogos) e localize a partida na aba "Agendados" ou "Hoje".',
      },
      {
        stepNumber: 2,
        instruction: 'Clique no botão "Check-in" no card da partida para abrir a lista de atletas das duas equipes.',
        highlight: 'Check-in de Atletas',
      },
      {
        stepNumber: 3,
        instruction: 'Confirme a presença dos atletas que irão para o jogo e confirme os números de camisa informados na súmula.',
      },
      {
        stepNumber: 4,
        instruction: 'Clique no botão "Árbitros" no card do jogo para escalar o 1º Árbitro, 2º Árbitro e Apontador.',
      },
      {
        stepNumber: 5,
        instruction: 'Clique em "Iniciar Partida". O status mudará para "Em Andamento" (Ao Vivo).',
        highlight: 'Status Ao Vivo',
      },
    ],
    result: 'O jogo passa para o status ao vivo e fica habilitado para apontamento de pontos e controle de sets.',
    nextStep: {
      articleId: 'lancar-resultado-sets',
      label: 'Registrar Placar e Sets',
    },
    screenRoute: '/jogos',
    screenLabel: 'Ir para Central de Jogos',
    keywords: ['check-in', 'iniciar partida', 'abrir jogo', 'arbitros', 'escala', 'presenca'],
    relatedArticles: ['lancar-resultado-sets', 'gerar-sumula', 'regras-classificacao'],
    difficulty: 'intermediate',
  },
  {
    id: 'lancar-resultado-sets',
    slug: 'lancar-resultado-sets',
    category: 'partidas',
    categoryTitle: 'Partidas',
    title: 'Como registrar resultado de sets e finalizar a partida',
    description: 'Aprenda a lançar parciais de sets, registrar o placar final e encerrar a partida homologando os pontos.',
    objective: 'Lançar a pontuação de cada set concluído e finalizar o confronto.',
    prerequisites: ['Partida em andamento.'],
    steps: [
      {
        stepNumber: 1,
        instruction: 'Na Central de Jogos (/jogos), clique em "Lançar Placar" ou no menu (...) > "Resultado" da partida.',
      },
      {
        stepNumber: 2,
        instruction: 'Informe os pontos de cada set (ex: Set 1: 25 x 22, Set 2: 20 x 25, Set 3: 25 x 18, Set 4: 25 x 21).',
        highlight: 'Parciais de Sets',
      },
      {
        stepNumber: 3,
        instruction: 'O sistema calcula automaticamente o placar em sets (ex: 3 x 1) e valida se os sets atingiram o mínimo de pontos com 2 de vantagem.',
      },
      {
        stepNumber: 4,
        instruction: 'Verifique se há observações da arbitragem ou ocorrências disciplinares e adicione ao campo de notas.',
      },
      {
        stepNumber: 5,
        instruction: 'Clique no botão "Finalizar e Homologar Partida".',
        highlight: 'Homologação',
      },
    ],
    result: 'A partida é concluída, a súmula final é consolidada e a tabela de classificação dos grupos é recalculada instantaneamente.',
    nextStep: {
      articleId: 'regras-classificacao',
      label: 'Ver Atualização da Classificação',
      route: '/competicoes',
    },
    screenRoute: '/jogos',
    screenLabel: 'Ir para Jogos',
    keywords: ['placar', 'sets', 'resultado', 'finalizar jogo', 'parciais', 'pontuacao'],
    relatedArticles: ['abrir-partida', 'gerar-sumula', 'regras-classificacao'],
    difficulty: 'intermediate',
  },

  // =========================================================================
  // 06 — SÚMULAS E DOCUMENTOS
  // =========================================================================
  {
    id: 'gerar-sumula',
    slug: 'gerar-sumula',
    category: 'sumulas-documentos',
    categoryTitle: 'Súmulas e documentos',
    title: 'Como gerar, visualizar e imprimir a súmula oficial',
    description: 'Gere súmulas em formato vetorial oficial CBV/FIVB para partidas de 3 ou 5 sets e folhas em branco.',
    objective: 'Emitir o PDF da súmula oficial preenchida com dados do jogo ou em branco para preenchimento manual.',
    prerequisites: ['Partida cadastrada ou necessidade de folha avulsa.'],
    steps: [
      {
        stepNumber: 1,
        instruction: 'Para uma partida específica: acesse Jogos (/jogos), clique no menu (...) do card e selecione "Ver Súmula". Você também pode acessar diretamente /sumulas/:matchId.',
      },
      {
        stepNumber: 2,
        instruction: 'O sistema abrirá o visualizador vetorial da súmula em alta resolução, com cabeçalho oficial, escalação de equipes com capitão/líberos e quadrículas de sets.',
        highlight: 'Visualizador Vetorial',
      },
      {
        stepNumber: 3,
        instruction: 'Para emitir Folha de Súmula em Branco: no menu superior clique em "Súmula em Branco", escolha a quantidade de sets (3 Sets ou 5 Sets) e clique em "Gerar PDF".',
        highlight: 'Súmula em Branco',
      },
      {
        stepNumber: 4,
        instruction: 'Clique no botão "Imprimir / Salvar PDF" no topo da tela para enviar diretamente para a impressora em formato A4 monocromático.',
      },
    ],
    result: 'O documento PDF oficial é gerado em alta definição, pronto para impressão ou arquivamento digital.',
    nextStep: {
      articleId: 'lancar-resultado-sets',
      label: 'Registrar Resultados da Partida',
      route: '/jogos',
    },
    screenRoute: '/sumulas',
    screenLabel: 'Ir para Súmulas',
    keywords: ['sumula', 'pdf', 'imprimir', 'ordem de saque', 'folha em branco', 'cbv', 'fivb'],
    relatedArticles: ['abrir-partida', 'lancar-resultado-sets', 'relatorios-gerais'],
    difficulty: 'basic',
  },
  {
    id: 'ordem-de-saque-folhas',
    slug: 'ordem-de-saque-folhas',
    category: 'sumulas-documentos',
    categoryTitle: 'Súmulas e documentos',
    title: 'Como emitir e preencher folhas de Ordem de Saque',
    description: 'Gere os cartões e formulários de posição inicial (I a VI) entregues pelos técnicos antes de cada set.',
    objective: 'Imprimir a folha oficial de entrega de posições de rotação para os técnicos e mesários.',
    prerequisites: ['Competição ativa.'],
    steps: [
      {
        stepNumber: 1,
        instruction: 'Acesse o menu "Súmulas" (/sumulas) ou abra o diálogo "Súmula em Branco" no cabeçalho.',
      },
      {
        stepNumber: 2,
        instruction: 'Selecione o documento "Ordem de Saque / Posição Inicial".',
      },
      {
        stepNumber: 3,
        instruction: 'O documento conterá as quadrículas das posições I, II, III, IV, V e VI para os sets da partida, além de campo de assinatura do técnico e indicação do capitão e líbero.',
        highlight: 'Posições I a VI',
      },
      {
        stepNumber: 4,
        instruction: 'Clique em "Baixar PDF" para imprimir os blocos de ordem de saque para a comissão técnica.',
      },
    ],
    result: 'As folhas de ordem de saque são impressas no padrão oficial para preenchimento pelos técnicos de cada equipe.',
    nextStep: {
      articleId: 'gerar-sumula',
      label: 'Ver Emissão da Súmula Principal',
      route: '/sumulas',
    },
    screenRoute: '/sumulas',
    screenLabel: 'Ir para Súmulas',
    keywords: ['ordem de saque', 'rotacao', 'posicao inicial', 'quadricula', 'tecnico'],
    relatedArticles: ['gerar-sumula', 'abrir-partida'],
    difficulty: 'basic',
  },

  // =========================================================================
  // 07 — CLASSIFICAÇÃO & DESEMPATES
  // =========================================================================
  {
    id: 'regras-classificacao',
    slug: 'regras-classificacao',
    category: 'classificacao',
    categoryTitle: 'Classificação',
    title: 'Como funciona a classificação e critérios de desempate',
    description: 'Entenda os critérios de pontuação FIVB/CBV, Set Average, Pontos Average e regras de desempate.',
    objective: 'Explicar com precisão o algoritmo de cálculo de classificação e resolução de empates do BaseOS.',
    prerequisites: ['Jogos finalizados na fase de grupos.'],
    steps: [
      {
        stepNumber: 1,
        instruction: 'Pontuação por Partida: Vitória por 3x0 ou 3x1 concede 3 pontos ao vencedor e 0 ao perdedor. Vitória por 3x2 concede 2 pontos ao vencedor e 1 ponto ao perdedor.',
        highlight: 'Sistema 3-1 / 3-2 Pontos',
      },
      {
        stepNumber: 2,
        instruction: 'Critério 1 — Número de Vitórias: A equipe com maior número de vitórias fica à frente na tabela.',
      },
      {
        stepNumber: 3,
        instruction: 'Critério 2 — Pontos Ganhos: Em caso de empate em vitórias, prevalece a soma de pontos na tabela.',
      },
      {
        stepNumber: 4,
        instruction: 'Critério 3 — Set Average (Sets Pró / Sets Contra): Divisão do total de sets vencidos pelo total de sets perdidos.',
        highlight: 'Set Average',
      },
      {
        stepNumber: 5,
        instruction: 'Critério 4 — Pontos Average (Pontos Pró / Pontos Contra): Divisão da soma de todos os pontos marcados pelos pontos sofridos.',
        highlight: 'Pontos Average',
      },
      {
        stepNumber: 6,
        instruction: 'Critério 5 — Confronto Direto: Se o empate persistir entre duas equipes, o resultado do jogo entre elas define a posição.',
      },
      {
        stepNumber: 7,
        instruction: 'Critério 6 — Sorteio Determinístico: Se todos os critérios anteriores forem idênticos, aplica-se o sorteio oficial.',
      },
    ],
    result: 'A classificação dos grupos é recalculada e ordenada de forma 100% determinística e automática pelo sistema.',
    nextStep: {
      articleId: 'melhores-terceiros-classificacao',
      label: 'Entender Classificação de Melhores Terceiros',
    },
    screenRoute: '/competicoes',
    screenLabel: 'Ver Tabela de Classificação',
    keywords: ['classificacao', 'pontuacao', 'desempate', 'set average', 'pontos average', 'confronto direto', 'cbv', 'fivb'],
    relatedArticles: ['melhores-terceiros-classificacao', 'fases-finais-mata-mata', 'relatorios-gerais'],
    difficulty: 'advanced',
  },
  {
    id: 'melhores-terceiros-classificacao',
    slug: 'melhores-terceiros-classificacao',
    category: 'classificacao',
    categoryTitle: 'Classificação',
    title: 'Classificação geral e comparação de Melhores Terceiros',
    description: 'Como o sistema calcula e ranqueia as equipes terceiras colocadas entre diferentes grupos para vaga nas finais.',
    objective: 'Compreender o cálculo de índice técnico para preenchimento de vagas remanescentes no mata-mata.',
    prerequisites: ['Torneios com 3 ou mais grupos na fase classificatória.'],
    steps: [
      {
        stepNumber: 1,
        instruction: 'Quando o regulamento prevê avanço dos "Melhores 3º Colocados", o sistema isola o terceiro colocado de cada grupo.',
      },
      {
        stepNumber: 2,
        instruction: 'O ranking dos terceiros aplica os mesmos critérios oficiais: Maior número de vitórias > Pontos ganhos > Set Average > Pontos Average.',
      },
      {
        stepNumber: 3,
        instruction: 'Caso os grupos tenham quantidades diferentes de equipes, o sistema calcula a média por partida (índice percentual ponderado).',
      },
      {
        stepNumber: 4,
        instruction: 'As equipes que alcançarem a melhor colocação nesse ranking recebem a vaga automática no chaveamento de mata-mata.',
      },
    ],
    result: 'O chaveamento final é preenchido com clareza e transparência sem necessidade de contas manuais.',
    nextStep: {
      articleId: 'fases-finais-mata-mata',
      label: 'Montar as Fases Finais',
      route: '/competicoes',
    },
    screenRoute: '/competicoes',
    screenLabel: 'Ir para Competições',
    keywords: ['melhores terceiros', 'indice tecnico', 'vagas mata-mata', 'classificados'],
    relatedArticles: ['regras-classificacao', 'fases-finais-mata-mata'],
    difficulty: 'intermediate',
  },

  // =========================================================================
  // 08 — FASES FINAIS & MATA-MATA
  // =========================================================================
  {
    id: 'fases-finais-mata-mata',
    slug: 'fases-finais-mata-mata',
    category: 'fases-finais',
    categoryTitle: 'Fases finais',
    title: 'Como configurar e executar Fases Finais (Mata-Mata)',
    description: 'Configure Quartas de Final, Semifinais, Disputa de 3º Lugar e Grande Final com progressão automática.',
    objective: 'Criar e executar a fase eliminatória do torneio alimentada pelos classificados dos grupos.',
    prerequisites: ['Fase de grupos concluída.'],
    steps: [
      {
        stepNumber: 1,
        instruction: 'Abra a Competição em "Competições" (/competicoes) e clique na aba "Fases / Mata-Mata".',
      },
      {
        stepNumber: 2,
        instruction: 'Clique em "+ Nova Fase Eliminatória" e selecione o tipo (Quartas, Semifinal ou Final).',
        highlight: '+ Nova Fase Eliminatória',
      },
      {
        stepNumber: 3,
        instruction: 'Defina o cruzamento dos confrontos (ex: 1º Grupo A x 2º Grupo B, 1º Grupo B x 2º Grupo A).',
      },
      {
        stepNumber: 4,
        instruction: 'Ative a opção "Disputa de 3º Lugar" se houver partida entre os perdedores das semifinais.',
      },
      {
        stepNumber: 5,
        instruction: 'Conforme as partidas das semifinais são finalizadas na Central de Jogos, o sistema move os vencedores para a Final e os perdedores para o 3º Lugar automaticamente.',
        highlight: 'Progressão Automática',
      },
    ],
    result: 'O chaveamento de mata-mata é atualizado em tempo real até a definição do campeão.',
    nextStep: {
      articleId: 'relatorios-encerramento',
      label: 'Emitir Pódio e Relatórios Finais',
      route: '/relatorios',
    },
    screenRoute: '/competicoes',
    screenLabel: 'Ir para Competições',
    keywords: ['mata-mata', 'quartas de final', 'semifinal', 'final', 'terceiro lugar', 'eliminatoria', 'chaveamento'],
    relatedArticles: ['regras-classificacao', 'relatorios-encerramento', 'abrir-partida'],
    difficulty: 'intermediate',
  },

  // =========================================================================
  // 09 — PORTAL DE EQUIPES E AUTO-INSCRIÇÃO
  // =========================================================================
  {
    id: 'portal-equipes-auto-inscricao',
    slug: 'portal-equipes-auto-inscricao',
    category: 'portal-equipes',
    categoryTitle: 'Portal de equipes e atletas',
    title: 'Como convidar equipes e revisar inscrições online',
    description: 'Envie um link exclusivo e seguro para o responsável da equipe cadastrar o elenco online sem necessidade de criar senha.',
    objective: 'Permitir que os responsáveis preencham seus elencos e que o organizador revise e confirme cada inscrição.',
    prerequisites: ['Competição com inscrições abertas.'],
    steps: [
      {
        stepNumber: 1,
        instruction: 'Acesse "Competições" > selecione a competição > clique em "Inscrições" (/competicoes/:id/inscricoes).',
      },
      {
        stepNumber: 2,
        instruction: 'Clique em "Convidar Equipe" para gerar o link individual de auto-inscrição com prazo regulamentar.',
        highlight: 'Convidar Equipe',
      },
      {
        stepNumber: 3,
        instruction: 'Copie o link seguro gerado ou envie diretamente pelo atalho de WhatsApp para o técnico ou dirigente da equipe.',
      },
      {
        stepNumber: 4,
        instruction: 'O dirigente acessa o link pelo celular ou computador, preenche os atletas (mínimo de 6), números de camisa e define o capitão e líberos.',
      },
      {
        stepNumber: 5,
        instruction: 'Ao enviar o elenco, a inscrição surge no painel como "Aguardando análise". O organizador clica em "Ver Elenco" para conferir os dados e em "Confirmar" para aprovar a equipe.',
        highlight: 'Confirmar Inscrição',
      },
      {
        stepNumber: 6,
        instruction: 'Caso o elenco esteja irregular ou o prazo tenha expirado sem envio, o organizador pode "Recusar" a inscrição ou "Prorrogar" o prazo.',
      },
    ],
    result: 'A equipe confirmada passa a ocupar oficialmente uma das vagas da competição. Quando todas as vagas forem preenchidas, o sistema sugere encerrar as inscrições.',
    nextStep: {
      articleId: 'sorteio-grupos',
      label: 'Como realizar o Sorteio Oficial de Grupos',
      route: '/sorteio',
    },
    screenRoute: '/competicoes',
    screenLabel: 'Ir para Competições',
    keywords: ['link de inscricao', 'auto-inscricao', 'revisar inscricoes', 'confirmar equipe', 'whatsapp', 'vagas'],
    relatedArticles: ['capacidade-equipes-vagas', 'sorteio-grupos', 'reabrir-encerrar-inscricoes'],
    difficulty: 'basic',
  },

  // =========================================================================
  // 10 — ADMINISTRAÇÃO E SEGURANÇA
  // =========================================================================
  {
    id: 'gestao-usuarios-seguranca',
    slug: 'gestao-usuarios-seguranca',
    category: 'administracao',
    categoryTitle: 'Administração',
    title: 'Gestão de usuários, perfis de acesso e auditoria',
    description: 'Cadastre operadores, defina papéis (Organizador, Árbitro, Equipe), políticas de senha e logs de auditoria.',
    objective: 'Gerenciar o controle de acesso ao sistema e monitorar as atividades executadas.',
    prerequisites: ['Acesso de Administrador.'],
    steps: [
      {
        stepNumber: 1,
        instruction: 'Acesse o menu "Configurações" (/settings) e abra a aba "Usuários e Acessos".',
      },
      {
        stepNumber: 2,
        instruction: 'Para criar um operador: clique em "+ Novo Usuário", informe Nome, E-mail e selecione o Perfil (Administrador, Organizador, Árbitro ou Representante de Equipe).',
        highlight: 'Perfis de Acesso',
      },
      {
        stepNumber: 3,
        instruction: 'Na aba "Segurança e Sessão", configure o tempo de expiração de inatividade (ex: 15 minutos, 30 minutos) e a política de força de senhas.',
      },
      {
        stepNumber: 4,
        instruction: 'Na aba "Auditoria e Logs", visualize a trilha de auditoria completa com registro de data/hora, operador e ações executadas (ex: alteração de placar, exclusão de equipe).',
        highlight: 'Trilha de Auditoria',
      },
    ],
    result: 'O sistema permanece protegido contra acessos não autorizados e todas as operações críticas ficam registradas.',
    nextStep: {
      articleId: 'relatorios-gerais',
      label: 'Acessar Relatórios do Sistema',
      route: '/relatorios',
    },
    screenRoute: '/settings',
    screenLabel: 'Ir para Configurações',
    keywords: ['usuarios', 'permissoes', 'seguranca', 'auditoria', 'logs', 'perfis', 'senha', 'timeout'],
    relatedArticles: ['o-que-e-baseos', 'relatorios-gerais'],
    difficulty: 'advanced',
  },

  // =========================================================================
  // 11 — RELATÓRIOS E EXPORTAÇÃO
  // =========================================================================
  {
    id: 'relatorios-gerais',
    slug: 'relatorios-gerais',
    category: 'relatorios',
    categoryTitle: 'Relatórios',
    title: 'Como emitir Boletins de Jogos, Relação Nominal e Pódio',
    description: 'Emita relatórios oficiais em PDF e planilhas CSV com filtros por competição, grupo e fase.',
    objective: 'Gerar documentação oficial para divulgação aos clubes, imprensa e arquivo da federação/liga.',
    prerequisites: ['Competição criada e dados cadastrados.'],
    steps: [
      {
        stepNumber: 1,
        instruction: 'Acesse o menu "Relatórios" (/relatorios).',
      },
      {
        stepNumber: 2,
        instruction: 'Na barra lateral de filtros, selecione a Competição desejada e, opcionalmente, o Grupo ou Categoria.',
      },
      {
        stepNumber: 3,
        instruction: 'Escolha o tipo de documento desejado:',
        highlight: 'Documentos Oficiais',
      },
      {
        stepNumber: 4,
        instruction: '• Boletim de Jogos: Tabela de confrontos, datas, horários, ginásios e resultados parciais/finais.',
      },
      {
        stepNumber: 5,
        instruction: '• Classificação por Grupos: Tabela detalhada de pontos, vitórias, set average e saldo de pontos.',
      },
      {
        stepNumber: 6,
        instruction: '• Relação Nominal: Lista oficial de atletas inscritos por equipe com RG, camisa e comissão técnica.',
      },
      {
        stepNumber: 7,
        instruction: '• Quadro de Honra / Pódio: Campeão, Vice-campeão, 3º e 4º colocados, além de premiações individuais.',
      },
      {
        stepNumber: 8,
        instruction: 'Clique em "Visualizar Documento" para abrir o preview formatado ou em "Exportar CSV" para download em planilha.',
      },
    ],
    result: 'O documento é renderizado em layout executivo pronto para impressão ou exportação digital.',
    nextStep: {
      articleId: 'relatorios-encerramento',
      label: 'Ver Procedimento de Encerramento',
    },
    screenRoute: '/relatorios',
    screenLabel: 'Ir para Relatórios',
    keywords: ['relatorios', 'boletim de jogos', 'relacao nominal', 'podio', 'quadro de honra', 'csv', 'pdf'],
    relatedArticles: ['regras-classificacao', 'gerar-sumula', 'relatorios-encerramento'],
    difficulty: 'basic',
  },
  {
    id: 'relatorios-encerramento',
    slug: 'relatorios-encerramento',
    category: 'relatorios',
    categoryTitle: 'Relatórios',
    title: 'Como homologar e emitir o Boletim de Encerramento do campeonato',
    description: 'Etapa final do campeonato: validação dos resultados finais, emissão do Quadro de Honra e arquivamento.',
    objective: 'Finalizar formalmente a competição com a emissão do boletim oficial de encerramento.',
    prerequisites: ['Final e Disputa de 3º Lugar concluídas.'],
    steps: [
      {
        stepNumber: 1,
        instruction: 'Acesse "Relatórios" (/relatorios) e selecione a competição concluída.',
      },
      {
        stepNumber: 2,
        instruction: 'Selecione o documento "Quadro de Honra / Pódio Oficial" e clique em "Visualizar Documento".',
      },
      {
        stepNumber: 3,
        instruction: 'Confirme os nomes do Campeão, Vice-Campeão e 3º Colocado.',
      },
      {
        stepNumber: 4,
        instruction: 'Acesse "Competições" (/competicoes), clique em editar a competição e altere o status para "Homologada / Finalizada".',
        highlight: 'Status Homologada',
      },
    ],
    result: 'A competição é arquivada como concluída com histórico completo de jogos, súmulas e estatísticas preservados.',
    nextStep: {
      articleId: 'fluxo-completo-competicao',
      label: 'Voltar à Jornada do Organizador',
      route: '/ajuda',
    },
    screenRoute: '/relatorios',
    screenLabel: 'Ir para Relatórios',
    keywords: ['encerramento', 'homologacao', 'campeao', 'finalizacao', 'arquivamento', 'podio'],
    relatedArticles: ['relatorios-gerais', 'fases-finais-mata-mata'],
    difficulty: 'basic',
  },

  // =========================================================================
  // 12 — PROBLEMAS E DÚVIDAS FREQUENTES
  // =========================================================================
  {
    id: 'faq-correcao-placar',
    slug: 'faq-correcao-placar',
    category: 'problemas-duvidas',
    categoryTitle: 'Problemas e dúvidas frequentes',
    title: 'Como corrigir um resultado ou placar lançado errado',
    description: 'Passo a passo para reabrir uma partida ou ajustar pontuações de sets após lançamento incorreto.',
    objective: 'Permitir que o organizador corrija erros de digitação de parciais sem corromper a tabela.',
    prerequisites: ['Perfil de Organizador ou Administrador.'],
    steps: [
      {
        stepNumber: 1,
        instruction: 'Acesse a Central de Jogos (/jogos).',
      },
      {
        stepNumber: 2,
        instruction: 'Localize a partida na aba "Encerrados" ou utilize o filtro de busca.',
      },
      {
        stepNumber: 3,
        instruction: 'Clique no menu de opções (...) do card e selecione "Editar Resultado / Reabrir Jogo".',
        highlight: 'Editar Resultado',
      },
      {
        stepNumber: 4,
        instruction: 'Altere as parciais dos sets incorretas e insira uma justificativa no campo de observações.',
      },
      {
        stepNumber: 5,
        instruction: 'Clique em "Salvar e Recalcular Classificação". O sistema atualizará a súmula e reprocessará a tabela de pontos dos grupos.',
      },
    ],
    result: 'O placar é retificado e a classificação geral é recalculada com os novos valores.',
    nextStep: {
      articleId: 'regras-classificacao',
      label: 'Conferir Classificação Atualizada',
      route: '/competicoes',
    },
    screenRoute: '/jogos',
    screenLabel: 'Ir para Jogos',
    keywords: ['correcao placar', 'resultado errado', 'reabrir jogo', 'editar resultado', 'alterar sets'],
    relatedArticles: ['lancar-resultado-sets', 'regras-classificacao', 'abrir-partida'],
    difficulty: 'intermediate',
  },
  {
    id: 'faq-atleta-sem-camisa',
    slug: 'faq-atleta-sem-camisa',
    category: 'problemas-duvidas',
    categoryTitle: 'Problemas e dúvidas frequentes',
    title: 'Atleta não aparece na lista de check-in ou está sem número',
    description: 'O que fazer quando o atleta foi cadastrado mas não consta na escalação da partida ou está com número conflitante.',
    objective: 'Solucionar pendências de elenco e numeração no momento do jogo.',
    prerequisites: ['Acesso ao cadastro da equipe ou modal de check-in.'],
    steps: [
      {
        stepNumber: 1,
        instruction: 'Verifique se o atleta está devidamente vinculado à equipe em "Atletas" (/atletas).',
      },
      {
        stepNumber: 2,
        instruction: 'No momento do Check-in do jogo (/jogos), o sistema permite adicionar ou alterar o número da camisa do atleta diretamente no campo numérico (1 a 99).',
        highlight: 'Ajuste no Check-in',
      },
      {
        stepNumber: 3,
        instruction: 'Certifique-se de que não haja dois atletas na mesma equipe com o mesmo número de camisa (duplicidade é bloqueada pelas regras CBV).',
      },
      {
        stepNumber: 4,
        instruction: 'Confirme a presença do atleta marcando a caixa de seleção ao lado do nome.',
      },
    ],
    result: 'O atleta passa a constar na escalação ativa e no PDF da súmula oficial.',
    nextStep: {
      articleId: 'abrir-partida',
      label: 'Voltar ao Check-in da Partida',
      route: '/jogos',
    },
    screenRoute: '/jogos',
    screenLabel: 'Ir para Jogos',
    keywords: ['atleta nao aparece', 'sem camisa', 'duplicidade', 'numero camisa', 'check-in erro'],
    relatedArticles: ['cadastrar-atleta', 'abrir-partida', 'definir-capitao-libero'],
    difficulty: 'basic',
  },
  {
    id: 'faq-sumula-impressao',
    slug: 'faq-sumula-impressao',
    category: 'problemas-duvidas',
    categoryTitle: 'Problemas e dúvidas frequentes',
    title: 'Dificuldades na impressão ou visualização de Súmulas em PDF',
    description: 'Recomendações para configuração de impressora, margens A4 e visualização sem cortes.',
    objective: 'Garantir que as súmulas e folhas de ordem de saque sejam impressas com enquadramento perfeito.',
    prerequisites: ['Navegador moderno com suporte a PDF.'],
    steps: [
      {
        stepNumber: 1,
        instruction: 'Ao abrir o documento na tela (/sumulas), certifique-se de clicar no botão "Imprimir" próprio do sistema ou usar Ctrl + P.',
      },
      {
        stepNumber: 2,
        instruction: 'Na janela de impressão do navegador, selecione Tamanho do Papel: "A4" e Orientação: "Paisagem" (para Súmula 3/5 Sets) ou "Retrato" (para Ordem de Saque).',
        highlight: 'Orientação A4 Paisagem',
      },
      {
        stepNumber: 3,
        instruction: 'Nas opções de margem, selecione "Nenhuma" ou "Padrão" e certifique-se de que a escala esteja em "100%" ou "Ajustar à área imprimível".',
      },
      {
        stepNumber: 4,
        instruction: 'As súmulas do BaseOS utilizam desenho vetorial de alta precisão em preto e branco para economizar tinta e garantir legibilidade total.',
      },
    ],
    result: 'A súmula é impressa com todas as quadrículas, assinaturas e cabeçalhos legíveis e centralizados.',
    nextStep: {
      articleId: 'gerar-sumula',
      label: 'Acessar Emissão de Súmulas',
      route: '/sumulas',
    },
    screenRoute: '/sumulas',
    screenLabel: 'Ir para Súmulas',
    keywords: ['problema impressao', 'pdf cortado', 'margem a4', 'paisagem', 'sumula travada'],
    relatedArticles: ['gerar-sumula', 'ordem-de-saque-folhas'],
    difficulty: 'basic',
  },
  {
    id: 'capacidade-equipes-vagas',
    slug: 'capacidade-equipes-vagas',
    category: 'configuracao-inicial',
    categoryTitle: 'Configuração inicial',
    title: 'Como definir a capacidade de equipes (vagas)',
    description: 'Configure o número exato de vagas da competição e entenda como as confirmações ocupam a capacidade sem risco de sobreinscrição.',
    objective: 'Garantir que a competição opere com limite explícito de equipes, permitindo o encerramento no momento certo.',
    prerequisites: ['Competição criada ou em fase de inscrições.'],
    steps: [
      {
        stepNumber: 1,
        instruction: 'Na criação ou edição da competição, defina o campo "Capacidade Máxima de Equipes (maxTeams)" nas Regras da Competição.',
        highlight: 'Capacidade Máxima de Equipes',
      },
      {
        stepNumber: 2,
        instruction: 'A capacidade máxima é explícita e obrigatória: o BaseOS nunca infere silenciosamente quantas equipes participarão.',
      },
      {
        stepNumber: 3,
        instruction: 'Conforme as equipes enviam seus elencos, o organizador analisa e clica em "Confirmar". Apenas equipes confirmadas ocupam vagas.',
      },
      {
        stepNumber: 4,
        instruction: 'Quando todas as vagas são preenchidas (ex: 12 de 12), o sistema alerta que a competição está lotada e sugere a próxima ação: Encerrar Inscrições.',
      },
      {
        stepNumber: 5,
        instruction: 'Caso a capacidade não tenha sido configurada, o painel exibe um aviso claro solicitando a configuração antes de aprovar inscrições.',
      },
    ],
    result: 'O torneio mantém controle estrito de vagas, evitando excesso de equipes e preparando o quórum exato para o sorteio de grupos.',
    nextStep: {
      articleId: 'portal-equipes-auto-inscricao',
      label: 'Como convidar equipes e revisar inscrições',
      route: '/competicoes',
    },
    screenRoute: '/competicoes',
    screenLabel: 'Ir para Competições',
    keywords: ['capacidade', 'vagas', 'maxTeams', 'limite de equipes', 'lotado', 'encerramento'],
    relatedArticles: ['criar-competicao', 'portal-equipes-auto-inscricao', 'sorteio-grupos'],
    difficulty: 'basic',
  },
  {
    id: 'reabrir-encerrar-inscricoes',
    slug: 'reabrir-encerrar-inscricoes',
    category: 'competicao',
    categoryTitle: 'Competição',
    title: 'Como encerrar e reabrir inscrições',
    description: 'Entenda o momento correto de encerrar as inscrições para o sorteio e como reabrir em casos excepcionais.',
    objective: 'Gerenciar o fluxo de inscrições de forma contextual e sem complicações.',
    prerequisites: ['Competição com inscrições abertas ou encerradas.'],
    steps: [
      {
        stepNumber: 1,
        instruction: 'Quando o prazo expirar ou todas as vagas forem preenchidas, clique em "Encerrar Inscrições" no painel de inscrições.',
        highlight: 'Encerrar Inscrições',
      },
      {
        stepNumber: 2,
        instruction: 'Com as inscrições encerradas, o sistema avalia o quórum de equipes aptas e recomenda o próximo passo: Realizar Sorteio Oficial.',
      },
      {
        stepNumber: 3,
        instruction: 'Se for necessário substituir uma equipe desistente ou permitir que uma agremiação regularize atletas de última hora, utilize o botão "Reabrir Inscrições".',
        highlight: 'Reabrir Inscrições',
      },
      {
        stepNumber: 4,
        instruction: 'A reabertura é uma ação de exceção administrativa: utilize-a apenas quando houver necessidade real antes do início das partidas.',
      },
    ],
    result: 'O organizador mantém flexibilidade para lidar com imprevistos sem quebrar o regulamento nem o chaveamento.',
    nextStep: {
      articleId: 'sorteio-grupos',
      label: 'Realizar Sorteio Oficial',
      route: '/sorteio',
    },
    screenRoute: '/competicoes',
    screenLabel: 'Ir para Competições',
    keywords: ['encerrar inscricoes', 'reabrir inscricoes', 'vagas', 'sorteio', 'excecao'],
    relatedArticles: ['capacidade-equipes-vagas', 'portal-equipes-auto-inscricao', 'sorteio-grupos'],
    difficulty: 'basic',
  },
];

// Helper to get article by id
export function getHelpArticleById(id: string): HelpArticle | undefined {
  return HELP_ARTICLES.find(article => article.id === id || article.slug === id);
}

// Helper to search articles
export function searchHelpArticles(query: string): HelpArticle[] {
  if (!query || !query.trim()) return HELP_ARTICLES;

  const normalized = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  const words = normalized.split(/\s+/).filter(Boolean);

  return HELP_ARTICLES.filter(article => {
    const textToMatch = [
      article.title,
      article.description,
      article.objective,
      article.categoryTitle,
      ...article.keywords,
      ...article.prerequisites,
      ...article.steps.map(s => s.instruction + ' ' + (s.highlight || '')),
      article.result,
    ]
      .join(' ')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    return words.every(word => textToMatch.includes(word));
  });
}
