# BASEOS — MASTER FRONTEND AUDIT
## 04. Auditoria Tela a Tela (Page-by-Page Audit)

---

Abaixo está a avaliação detalhada de cada uma das 22 páginas que compõem o frontend do BaseOS, cobrindo os 10 critérios padronizados de engenharia, UX e design.

---

### 1. `ActiveCompetitionsPage.tsx` (`/`, `/competicoes-ativas`)
- **Objetivo**: Painel público/operador com os campeonatos em andamento, barra de prontidão, estatísticas rápidas e atalhos para jogos/inscrições.
- **Hierarquia Visual (8/10)**: Excelente destaque dos cards de competição com badge de status pontual e linha de progresso inferior.
- **Clareza (8/10)**: Dados essenciais (equipes, jogos realizados, etapas concluídas) dispostos em linha de fácil escaneabilidade.
- **Densidade de Informação (8/10)**: Equilibrada, adequada para visão geral.
- **Consistência (7/10)**: Botões de filtro de modalidade com estilo inline manual em vez de `ToggleGroup`.
- **Navegação (7/10)**: Atalhos diretos para `/jogos?competitionId=...` e `/competicoes/:id/inscricoes`.
- **Feedback (7/10)**: Ações rápidas respondem prontamente.
- **Estados (5/10)**:
  - *Normal*: ✅ Presente.
  - *Loading*: ⚠️ Usa div `animate-pulse` em vez do primitivo `<Skeleton />`.
  - *Empty*: ✅ Card centralizado com CTA para criar campeonato.
  - *Error*: ❌ **Ausente**. Falhas no `Promise.all` apenas logam no console e desativam o loading.
- **Responsividade (8/10)**: Grid de 1 coluna em mobile e 2 colunas em desktop.
- **Acessibilidade (7/10)**: Ícones com textos auxiliares; inputs com labels implícitos por placeholder.
- **Performance Percebida (8/10)**: Carregamento ágil de dados locais/Supabase.

---

### 2. `Index.tsx` / `Dashboard.tsx` (`/dashboard`)
- **Objetivo**: Painel de visão geral de torneio único com busca global, KPIs de jogos do dia, súmulas pendentes e gráficos.
- **Hierarquia Visual (7/10)**: Topbar independente e cards de KPI densos com ícones monocromáticos.
- **Clareza (6/10)**: Textos e métricas hardcoded ("Superliga Nacional", "32 equipes") misturados a dados mock.
- **Densidade de Informação (7/10)**: Boa disposição de cartões de resumo.
- **Consistência (5/10)**: Utiliza `DashboardShell.tsx` em vez de `MainLayout`, isolando o usuário do restante do sistema.
- **Navegação (5/10)**: Falta menu lateral ou superior para acessar atletas, árbitros ou configurações.
- **Feedback (6/10)**: Botões de ação rápida levam a rotas com query params.
- **Estados (5/10)**: Sem tratamento de loading ou erro em nível de widget.
- **Responsividade (7/10)**: Grid responsivo de 1 a 3 colunas.
- **Acessibilidade (6/10)**: Botão de sino de notificações sem `aria-label` descritivo.
- **Performance Percebida (8/10)**: Renderização instantânea.

---

### 3. `MatchesPage.tsx` (`/jogos`, `/matches`)
- **Objetivo**: Módulo central de partidas, calendário, filtros por grupo/mata-mata, mesa do apontador ao vivo, placar e check-in.
- **Tamanho**: 1.278 linhas (Monolítico).
- **Hierarquia Visual (7/10)**: Cards de jogo com visualização clara de equipes A vs B e parciais de sets.
- **Clareza (7/10)**: Muitas abas secundárias (`todos`, `grupos`, `mata-mata`, `agenda`, `sumulas`, `resultados`).
- **Densidade de Informação (8/10)**: Alta densidade de recursos essenciais para a operação em ginásio.
- **Consistência (6/10)**: 5 modais gigantes declarados dentro do mesmo arquivo (`LiveScorerDeskModal`, `LiveScoreboardModal`, `MatchCheckinModal`, `RefereeAssignmentModal`, `ScheduleMatchDialog`).
- **Navegação (7/10)**: Filtro por campeonato funcional sincronizado com query params.
- **Feedback (8/10)**: Confirmação visual para homologação de partidas e sincronização de playoffs.
- **Estados (7/10)**: Skeletons e cards vazios presentes; falta tratamento de erro amigável em falha de persistência.
- **Responsividade (6/10)**: Em telas < 640px os placares de múltiplos sets podem sofrer compressão lateral.
- **Acessibilidade (6/10)**: Menus de contexto de ações por jogo (`DropdownMenu`) necessitam de melhor foco de teclado.
- **Performance Percebida (6/10)**: Re-renderização excessiva ao atualizar o estado de uma partida na lista completa.

---

### 4. `MatchSheetPage.tsx` (`/sumulas`, `/sumulas/:matchId`)
- **Objetivo**: Súmula eletrônica interativa oficial, controle de pontos ao vivo, rotação tática de atletas e preview de PDF.
- **Hierarquia Visual (8/10)**: Divisão inteligente em 2/3 (súmula/tática/social) e 1/3 (preview do PDF em tempo real).
- **Clareza (8/10)**: Interface de pontuação limpa com botões grandes de incremento/decremento.
- **Densidade de Informação (9/10)**: Apresenta súmula, rodízio e visualização sem poluição visual.
- **Consistência (7/10)**: Valores de fallback hardcoded ("Vôlei Osasco" / "Minas Tênis Clube") caso a partida não tenha dados.
- **Navegação (6/10)**: Falta breadcrumb de volta para `/jogos` quando aberta diretamente por URL.
- **Feedback (9/10)**: Toasts de persistência e atualização visual imediata do placar e histórico de sets.
- **Estados (8/10)**: Contempla loading via Skeleton e estado "Partida não encontrada".
- **Responsividade (7/10)**: O preview de PDF na lateral é colapsado para baixo em resoluções menores que 1024px.
- **Acessibilidade (7/10)**: Botões táteis para operação em tablet.
- **Performance Percebida (7/10)**: Re-geração assíncrona do PDF pode causar leve latência se disparada a cada ponto.

---

### 5. `CompetitionsPage.tsx` (`/competicoes`)
- **Objetivo**: Gestão de campeonatos, regulamento, cálculo de classificação por grupos, playoffs e tarefas pendentes.
- **Tamanho**: 1.194 linhas (Monolítico).
- **Hierarquia Visual (8/10)**: Stepper de ciclo de vida e abas bem delimitadas (Visão Geral, Classificação, Mata-Mata, Equipes, Configurações).
- **Clareza (8/10)**: Critérios de desempate e estatísticas explicados em português.
- **Densidade de Informação (8/10)**: Tabelas completas com saldo de sets e saldo de pontos.
- **Consistência (6/10)**: Modais de criação de competição e edição de regulamento incorporados inline.
- **Navegação (7/10)**: Permite selecionar e alternar entre campeonatos via combobox ou URL.
- **Feedback (8/10)**: Diálogo de confirmação para avanços de status de ciclo de vida (`ConfirmActionDialog`).
- **Estados (7/10)**: Loading e vazio contemplados; falta erro explícito de falha de carregamento.
- **Responsividade (6/10)**: Tabelas de classificação sofrem corte lateral em smartphones sem scroll horizontal explícito.
- **Acessibilidade (7/10)**: Tabelas semânticas com `TableHeader` e `TableRow`.
- **Performance Percebida (7/10)**: Processamento de classificação com memoização eficiente (`useMemo`).

---

### 6. `CompetitionRegistrationsPage.tsx` (`/competicoes/:id/inscricoes`)
- **Objetivo**: Painel do organizador para homologar inscrições de equipes, gerar links de convite e monitorar elencos.
- **Hierarquia Visual (7/10)**: Lista de equipes inscritas com badges de status (Pendente, Aprovada, Rejeitada).
- **Clareza (8/10)**: Botão de cópia rápida do link exclusivo de auto-inscrição com feedback via toast.
- **Densidade de Informação (7/10)**: Exibe quantidade de atletas inscritos por equipe.
- **Consistência (8/10)**: Diálogo de compartilhamento padronizado (`TeamCreatedShareDialog`).
- **Navegação (6/10)**: Falta breadcrumb de retorno rápido para `/competicoes`.
- **Feedback (8/10)**: Feedback visual instantâneo ao alterar status de homologação.
- **Estados (6/10)**: Loading e vazio presentes; falta estado de erro.
- **Responsividade (7/10)**: Cards empilháveis em mobile.
- **Acessibilidade (7/10)**: Botões de ação claros.
- **Performance Percebida (8/10)**: Rápida atualização de estado.

---

### 7. `TeamRosterRegistrationPage.tsx` (`/equipe/inscricao/:token`)
- **Objetivo**: Portal público e seguro do dirigente da equipe para cadastrar atletas, números de camisa e comissão técnica.
- **Hierarquia Visual (8/10)**: Utiliza `PublicShell` com destaque para prazos e limites de elenco.
- **Clareza (9/10)**: Validações de negócio claras (1 capitão, até 2 líberos, camisas 1-99 sem duplicidade).
- **Densidade de Informação (8/10)**: Abas para Elenco, Partidas da Equipe e Tabela do Grupo.
- **Consistência (6/10)**: Usa classes legadas de cores (`bg-indoor`) no cabeçalho do `PublicShell`.
- **Navegação (8/10)**: Auto-contida por token, sem expor menus administrativos indevidos.
- **Feedback (9/10)**: Alertas informativos de bloqueio de inscrição após expiração do prazo.
- **Estados (8/10)**: Contempla token inválido, carregamento, bloqueio por prazo e envio com sucesso.
- **Responsividade (8/10)**: Formulário adaptado para uso em smartphones por dirigentes.
- **Acessibilidade (7/10)**: Campos obrigatórios destacados.
- **Performance Percebida (8/10)**: Ágil.

---

### 8. `TeamsPage.tsx` (`/equipes`)
- **Objetivo**: Cadastro de equipes, agremiações, upload de escudos/logos, contatos de dirigentes e geração de tokens.
- **Hierarquia Visual (7/10)**: Cards com avatar da equipe, histórico de vitórias/jogos e botão de compartilhamento.
- **Clareza (8/10)**: Ações diretas de edição, visualização e exclusão.
- **Densidade de Informação (7/10)**: Confortável para gestão de clubes.
- **Consistência (7/10)**: Usa modal de confirmação `AlertDialog` nativo misturado a `Dialog`.
- **Navegação (7/10)**: Filtro por modalidade (Quadra/Praia) e busca textual por nome.
- **Feedback (8/10)**: Notificação de sucesso ao cadastrar e comprimir imagem do escudo.
- **Estados (6/10)**: Erro silencioso em caso de falha de conexão.
- **Responsividade (7/10)**: Grid adaptativo.
- **Acessibilidade (7/10)**: Dropdown de ações com atalhos de teclado.
- **Performance Percebida (8/10)**: Compressão local de imagens antes do salvamento (`compressImageToDataUrl`).

---

### 9. `AthletesPage.tsx` (`/atletas`)
- **Objetivo**: Listagem global de atletas inscritos, números de camisa, categoria por idade, documentos e transferências entre equipes.
- **Hierarquia Visual (7/10)**: Alternância entre visualização em Grid e Tabela (`viewMode`).
- **Clareza (8/10)**: Cálculo automático de idade a partir da data de nascimento e identificação de capitão/líbero.
- **Densidade de Informação (8/10)**: Tabela densa e rica em dados cadastrais.
- **Consistência (7/10)**: Modal de transferência de equipe com validações de regras.
- **Navegação (7/10)**: Filtros por gênero e busca em tempo real.
- **Feedback (8/10)**: Geração e download do relatório PDF nominal de atletas.
- **Estados (6/10)**: Loading e vazio presentes; falta tratamento de erro.
- **Responsividade (6/10)**: Em modo tabela, colunas de documentos exigem rolagem em telas pequenas.
- **Acessibilidade (7/10)**: Avatares com fallback de iniciais (`AvatarFallback`).
- **Performance Percebida (7/10)**: Boa velocidade de filtragem.

---

### 10. `PeoplePage.tsx` (`/pessoas`)
- **Objetivo**: Gestão do quadro de recursos humanos (árbitros, apontadores, delegados, técnicos, gestores).
- **Hierarquia Visual (6/10)**: Quebra de identidade visual por uso de cores pastel claras (`bg-purple-500/10 text-purple-600 border-purple-200`).
- **Clareza (7/10)**: Cadastro completo de funções múltiplas (um usuário pode ser técnico e atleta).
- **Densidade de Informação (7/10)**: Cards com contatos de telefone e e-mail.
- **Consistência (5/10)**: Sobreposição funcional com `RefereesPage.tsx`.
- **Navegação (6/10)**: Apontada no Header como "Árbitros e Oficiais" e na Sidebar como "Pessoas" com ícone de prédio.
- **Feedback (7/10)**: Toasts de confirmação.
- **Estados (6/10)**: Tratamento de erro silencioso.
- **Responsividade (7/10)**: Grid de 1 a 3 colunas.
- **Acessibilidade (6/10)**: Contraste fraco nos badges com classes pastel claras.
- **Performance Percebida (8/10)**: Rápida.

---

### 11. `RefereesPage.tsx` (`/arbitros`)
- **Objetivo**: Escalação especializada de árbitros por nível (regional, nacional, internacional) e status de disponibilidade.
- **Hierarquia Visual (7/10)**: Destaque de partidas apitadas e próximo jogo agendado.
- **Clareza (7/10)**: Boa organização de dados técnicos de arbitragem.
- **Densidade de Informação (7/10)**: Cards funcionais.
- **Consistência (5/10)**: Página duplicada em relação a `PeoplePage.tsx`.
- **Navegação (4/10)**: Oculta nos menus principais (Header aponta para `/pessoas`).
- **Feedback (7/10)**: Toasts normais.
- **Estados (6/10)**: Sem estado de erro amigável.
- **Responsividade (7/10)**: Boa.
- **Acessibilidade (7/10)**: Boa.
- **Performance Percebida (8/10)**: Boa.

---

### 12. `VenuesPage.tsx` (`/locais`, `/venues`)
- **Objetivo**: Gestão de praças esportivas, ginásios, arenas de praia, endereços e sub-quadras (ex: Quadra 1, Quadra Central).
- **Hierarquia Visual (8/10)**: Cards limpos com badges de quadras disponíveis e localização.
- **Clareza (9/10)**: Cadastro dinâmico de múltiplas quadras por local esportivo.
- **Densidade de Informação (8/10)**: Direta e objetiva.
- **Consistência (8/10)**: Diálogo de criação bem integrado com shadcn.
- **Navegação (7/10)**: Presente nos menus de Cadastros.
- **Feedback (8/10)**: Toasts ao salvar e excluir praça esportiva.
- **Estados (6/10)**: Falta estado de erro na listagem.
- **Responsividade (8/10)**: Excelente adaptação em mobile.
- **Acessibilidade (7/10)**: Boa semântica.
- **Performance Percebida (8/10)**: Instantânea.

---

### 13. `ModalitiesPage.tsx` (`/modalidades`)
- **Objetivo**: Configuração de modalidades esportivas (Vôlei de Quadra 6x6, Vôlei de Praia 2x2, 4x4) e pontuações padrão de sets.
- **Hierarquia Visual (8/10)**: Cards explicativos com parâmetros de formato (sets de 25 pontos, tiebreak de 15 pontos).
- **Clareza (8/10)**: Facilidade para personalizar regras específicas de campeonatos.
- **Densidade de Informação (8/10)**: Bem estruturada.
- **Consistência (8/10)**: Segue o padrão de cards e diálogos do BaseOS.
- **Navegação (3/10)**: **Órfã nos menus**. Não possui link no `Header.tsx` nem na `Sidebar.tsx`.
- **Feedback (8/10)**: Toasts de sucesso.
- **Estados (6/10)**: Sem tela de erro em falhas.
- **Responsividade (8/10)**: Boa.
- **Acessibilidade (7/10)**: Boa.
- **Performance Percebida (8/10)**: Rápida.

---

### 14. `DrawPage.tsx` (`/sorteio`, `/sorteio/:competitionId`)
- **Objetivo**: Sorteio ao vivo interativo com cabeças de chave, geração randômica determinística (seed) e drag and drop de grupos.
- **Hierarquia Visual (9/10)**: Uma das telas mais bem construídas visualmente, com animação de sorteio e feedback tátil.
- **Clareza (9/10)**: Visualização clara dos grupos gerados e cálculo automático da grade de confrontos round-robin.
- **Densidade de Informação (8/10)**: DND funcional com `@dnd-kit/core` com suporte a toque mobile.
- **Consistência (8/10)**: Modal dedicado para apresentação em telão (`LiveDrawModal`).
- **Navegação (6/10)**: Falta atalho no menu superior do Header.
- **Feedback (9/10)**: Atualização em tempo real das chaves ao arrastar equipes entre grupos.
- **Estados (7/10)**: Possui feedback de salvamento e pré-visualização.
- **Responsividade (7/10)**: Em telas estreitas, grupos múltiplos se organizam em coluna vertical mantendo o arrasto.
- **Acessibilidade (7/10)**: Sensores de ponteiro e toque configurados com tolerância.
- **Performance Percebida (8/10)**: Execução rápida dos algoritmos de permutação de chaves.

---

### 15. `StatisticsPage.tsx` (`/estatisticas`)
- **Objetivo**: Painel gráfico analítico de pontuações, melhores ataques, bloqueios e comparativos de equipes por temporada.
- **Hierarquia Visual (6/10)**: Quebrada devido à referência inválida ao token `--beach` em `CHART_COLORS`.
- **Clareza (7/10)**: Gráficos de barras e pizza com Recharts.
- **Densidade de Informação (7/10)**: Boa distribuição de gráficos.
- **Consistência (5/10)**: Cores dos gráficos não sincronizadas com a paleta Enterprise Dark.
- **Navegação (6/10)**: Presente na Sidebar, ausente no Header.
- **Feedback (6/10)**: Filtro de temporada sem indicador de recarregamento.
- **Estados (5/10)**: Sem estado vazio elegante caso não haja partidas suficientes para estatísticas.
- **Responsividade (6/10)**: Gráficos de largura fixa podem estourar em resoluções menores que 480px.
- **Acessibilidade (5/10)**: Gráficos do Recharts sem tabelas alternativas para leitores de tela.
- **Performance Percebida (7/10)**: Renderização suave.

---

### 16. `ReportsPage.tsx` (`/relatorios`, `/reports`)
- **Objetivo**: Central de emissão de documentos oficiais em PDF (boletins, tabelas de classificação, pódios e súmulas em branco).
- **Hierarquia Visual (8/10)**: Cards com ícones de documentos e botão de pré-visualização em modal (`ReportPreviewDialog`).
- **Clareza (9/10)**: Filtros claros por competição, fase e gênero antes da exportação.
- **Densidade de Informação (8/10)**: Organização limpa dos 4 relatórios oficiais.
- **Consistência (8/10)**: Padronização do diálogo de preview de PDF em iframe nativo.
- **Navegação (8/10)**: Acessível via Header e Sidebar.
- **Feedback (9/10)**: Indicador de progresso durante a geração dos bytes do PDF.
- **Estados (7/10)**: Tratamento adequado para competições sem jogos encerrados.
- **Responsividade (7/10)**: Modal de preview de PDF responsivo.
- **Acessibilidade (7/10)**: Botões de download com rótulos explícitos.
- **Performance Percebida (7/10)**: Geração client-side com `jspdf` e `@react-pdf/renderer`.

---

### 17. `SettingsPage.tsx` (`/configuracoes`, `/settings`)
- **Objetivo**: Painel administrativo de controle de usuários (RBAC), perfil institucional, backup, reset de dados e auditoria de segurança.
- **Tamanho**: 1.340 linhas (Monolítico).
- **Hierarquia Visual (7/10)**: Abas verticais/horizontais completas com formulários densos.
- **Clareza (8/10)**: Separação de ações de perigo (Reset seed, Limpar dados) com confirmação em duas etapas.
- **Densidade de Informação (8/10)**: Alta concentração de ferramentas administrativas.
- **Consistência (6/10)**: Múltiplos formulários com tipagem inline e handlers repetitivos.
- **Navegação (8/10)**: Presente nos menus principais.
- **Feedback (8/10)**: Toasts detalhados para criação de usuários e redefinição de senhas.
- **Estados (7/10)**: Tabela de logs de auditoria com paginação.
- **Responsividade (6/10)**: As tabelas de logs e permissões sofrem compressão em telas mobile.
- **Acessibilidade (7/10)**: Switches e inputs com labels associados via `htmlFor`.
- **Performance Percebida (7/10)**: Operações de banco locais e remotas instantâneas.

---

### 18. `CreateMatchPage.tsx` (`/jogos/novo`)
- **Objetivo**: Tela de agendamento de confronto avulso com seleção de equipes, árbitros e local.
- **Hierarquia Visual (6/10)**: Formulário básico centralizado em card único.
- **Clareza (5/10)**: Exige o parâmetro `?competition=xxx`. Se o usuário acessar a URL diretamente, é ejetado para `/competicoes` com mensagem de erro.
- **Densidade de Informação (6/10)**: Duplicação da lógica já existente no `ScheduleMatchDialog` dentro de `MatchesPage.tsx`.
- **Consistência (5/10)**: Funcionalidade redundante.
- **Navegação (5/10)**: Botão de cancelar redireciona para competições em vez de partidas.
- **Feedback (7/10)**: Toast de confirmação ao agendar.
- **Estados (5/10)**: Sem estado de carregamento de equipes.
- **Responsividade (7/10)**: Formulário simples de 1 coluna.
- **Acessibilidade (7/10)**: Labels presentes.
- **Performance Percebida (8/10)**: Rápida.

---

### 19. `LoginPage.tsx` (`/login`)
- **Objetivo**: Autenticação de organizadores, árbitros e dirigentes com preenchimento rápido de contas demo em modo de desenvolvimento.
- **Hierarquia Visual (8/10)**: Card centralizado elegante com logo do BaseOS e botões de atalho por perfil.
- **Clareza (9/10)**: Excelente usabilidade para troca rápida entre perfil de organizador e árbitro.
- **Densidade de Informação (8/10)**: Direta e focada na conversão.
- **Consistência (8/10)**: Segue fielmente a paleta Dark SaaS.
- **Navegação (8/10)**: Redireciona de volta para a rota original armazenada em `location.state.from`.
- **Feedback (8/10)**: Mensagens de erro de credenciais inválidas em banner destacado.
- **Estados (8/10)**: Loading no botão de submit durante autenticação.
- **Responsividade (9/10)**: Excelente adaptação em qualquer dispositivo.
- **Acessibilidade (8/10)**: Inputs com tipos adequados (`type="email"`, `type="password"`).
- **Performance Percebida (9/10)**: Instantânea.

---

### 20. `HelpCenterPage.tsx` (`/ajuda`, `/help`)
- **Objetivo**: Central de ajuda com categorias de artigos, jornada operacional do organizador e leitor de tutoriais em Markdown.
- **Hierarquia Visual (9/10)**: Interface rica com busca com debounce, visualização de categorias e leitor lateral/modal (`HelpArticleViewer`).
- **Clareza (9/10)**: Textos e manuais didáticos em português cobrindo desde o chaveamento até a emissão de súmulas.
- **Densidade de Informação (8/10)**: Equilibrada.
- **Consistência (9/10)**: Totalmente integrada ao design system.
- **Navegação (9/10)**: Suporte a deep-linking via query param `?artigo=fluxo-completo-competicao`.
- **Feedback (8/10)**: Filtragem instantânea ao digitar na barra de pesquisa.
- **Estados (8/10)**: Estado vazio com sugestão de termos quando a busca não retorna resultados.
- **Responsividade (8/10)**: Leitor de artigo se ajusta em modal em telas mobile.
- **Acessibilidade (8/10)**: Títulos estruturados hierarquicamente.
- **Performance Percebida (9/10)**: Artigos pré-carregados na memória.

---

### 21. `NotFound.tsx` (`*`)
- **Objetivo**: Página 404 para captura de rotas inexistentes.
- **Hierarquia Visual (7/10)**: Simples e direta com código 404 em destaque e botão de retorno ao início.
- **Clareza (8/10)**: Mensagem amigável informando que a página não foi encontrada.
- **Consistência (7/10)**: Não utiliza o `MainLayout`, exibindo uma tela isolada.
- **Navegação (7/10)**: Botão direto para a página inicial.
- **Estados (8/10)**: Estado estático direto.
- **Responsividade (8/10)**: Centralizada.
- **Acessibilidade (7/10)**: Boa.
- **Performance Percebida (9/10)**: Instantânea.

---

### 22. `DocumentEditorPage.tsx` (Não Roteada / Órfã)
- **Objetivo**: Editor visual de coordenadas para os templates PDF oficiais de súmula de 3 e 5 sets.
- **Hierarquia Visual (8/10)**: Dividido em abas de Conteúdo (valores dos campos) e Layout (coordenadas X/Y, fontes, tamanhos).
- **Clareza (8/10)**: Pré-visualização nativa do PDF gerado em iframe sincronizado.
- **Densidade de Informação (9/10)**: Painel completo de ajuste milimétrico de campos da súmula.
- **Consistência (8/10)**: Utiliza `MainLayout` e componentes shadcn.
- **Navegação (1/10)**: **Inacessível por falta de rota em `App.tsx`**.
- **Feedback (8/10)**: Botão de salvar alterações com persistência em `DocumentEdit`.
- **Estados (7/10)**: Carregamento do contexto da partida.
- **Responsividade (6/10)**: Requer tela desktop para ajuste confortável de coordenadas.
- **Acessibilidade (6/10)**: Formulários com muitos inputs numéricos de coordenadas.
- **Performance Percebida (7/10)**: Geração de PDF via motor do `document-engine`.
