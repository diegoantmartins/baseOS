# WALKTHROUGH — BASEOS FASE 3

## NAVEGAÇÃO CONTEXTUAL DA COMPETIÇÃO, PERSISTÊNCIA DE CONTEXTO E FLUXO DE GESTÃO

**Projeto:** BaseOS — Sistema SaaS Profissional de Gestão de Competições de Voleibol  
**Ambiente:** Desenvolvimento / Local  
**Repositório:** `/home/diego-martins/docker/volei`  
**Data:** 10 de Setembro de 2026  
**Status do Ciclo:** IMPLEMENTADO E VALIDADO EM DEV/TESTE  
**Homologação de Produção:** PENDENTE  

---

## 1. Sumário Executivo

A **Fase 3 do BaseOS** resolveu a fragmentação da navegação operacional e a perda de contexto da competição ativa durante o trânsito entre telas de gestão.

### O Que Foi Identificado na Auditoria
- Telas como `/competicoes`, `/jogos`, `/relatorios`, `/classificacao` e links no `Dashboard` e `ActiveCompetitionsPage` navegavam frequentemente para rotas genéricas sem query parameters (ex: `navigate('/jogos')`, `navigate('/competicoes')`).
- Ao recarregar a página ou navegar pelo histórico do navegador (Back/Forward), o sistema perdia o campeonato selecionado ou caía silenciosamente no primeiro registro cadastrado.
- Chamadas a `setSearchParams({ competitionId })` em componentes sobrescreviam query parameters existentes (como `tab=config`), gerando perda de estado.
- A rota canônica de inscrições `/competicoes/:id/inscricoes` possuía breadcrumbs genéricos que não devolviam o usuário à central da competição ativa.
- Rotas recomendadas pelo `competitionReadinessService` continham strings estáticas soltas sem o parâmetro da competição.

### O Que Foi Entregue
1. **Helper Puro de Navegação (`src/services/competitionNavigationHelper.ts`)**:
   - Zero dependência de banco de dados, regras esportivas, RBAC ou duplicação de entidades.
   - Resolução hierárquica estrita com `routeParamId` e `searchParamId`.
   - Persistência local transparente via `localStorage` exclusivamente como conveniência de UX para acessos diretos à rota raiz `/competicoes`.
   - Builders canônicos tipados: `buildCompetitionUrl`, `buildMatchesUrl`, `buildReportsUrl`, `buildStandingsUrl`, `buildDrawUrl`, `buildRegistrationsUrl`.
2. **Proteção Contra Seleção Silenciosa em IDs Inválidos**:
   - Se um `competitionId` for explicitamente informado na URL e não existir no sistema (ou tiver sido excluído), o sistema **NUNCA seleciona silenciosamente outra competição**.
   - A interface renderiza o estado universal/alerta de *"Competição não encontrada"* com ação para retornar com segurança.
3. **Preservação de Abas e Parâmetros com `setSearchParams` Funcional**:
   - Todas as transições de abas e competições utilizam atualizadores funcionais `prev => ...` preservando parâmetros de consulta adicionais (`foo=bar`, filtros, etc.).
4. **Contextualização Completa das Telas de Gestão**:
   - `CompetitionsPage`: sincronizada bidirecionalmente com `?competitionId=...&tab=...`.
   - `MatchesPage`: filtro de competição sincronizado com `?competitionId=...`.
   - `ReportsPage`: seletor de competição sincronizado com `?competitionId=...` e builder de relatórios.
   - `StandingsPage`: seletor de classificação contextualizado e sem destruição de query params.
   - `ActiveCompetitionsPage` e `Dashboard`: cards e atalhos operacionais direcionam diretamente para a competição ativa.
   - `CompetitionRegistrationsPage`: rota funcional `/competicoes/:id/inscricoes` preservada, com breadcrumbs e rodapé contextualizados.
   - `competitionReadinessService`: todas as 13 etapas e tarefas pendentes constroem rotas canônicas tipadas com `comp.id`.
5. **Zero Regressão e Não-Violação de Fases Anteriores**:
   - Não foram criadas novas entidades redundantes ("Meu Campeonato" foi rejeitado como determinado).
   - Nenhuma regra da Fase 2 (identidade visual, apoiadores, `canEditRules`, migrations) foi alterada ou reaberta.
   - 931 testes globais aprovados (100% de sucesso).

---

## 2. Decisões Arquiteturais e Ajustes Normativos

### 2.1. Hierarquia Canônica de Precedência (URL como Single Source of Truth)

**URL como Fonte Canônica da Verdade (SSOT):** o contexto explícito da competição é determinado pela URL, seja por `routeParamId` ou `searchParamId`. Em rotas com parâmetro de caminho, o `routeParamId` possui precedência sobre `competitionId` na query string.

A resolução do campeonato ativo em qualquer tela obedece à seguinte precedência rigorosa:
```text
1. routeParamId explícito (ex: /sorteio/:competitionId, /competicoes/:id/inscricoes)
   ↓
2. searchParamId explícito (ex: /competicoes?competitionId=..., /jogos?competitionId=...)
   ↓
3. localStorage (contexto persistido localmente da última escolha)
   ↓
4. Fallback controlado (primeira competição válida da lista)
```

### 2.2. Semântica de Persistência: localStorage vs "Sessão"
- **Não chamamos `localStorage` de sessão**: `sessionStorage` dura apenas até o fechamento da aba; `localStorage` preserva a preferência do operador entre sessões futuras do navegador.
- O helper nomeia formalmente as funções de persistência como `getPersistedCompetitionId()` e `setPersistedCompetitionId()`.
- O storage local atua **exclusivamente como conveniência de UX** quando o usuário acessa `/competicoes` sem nenhum parâmetro na URL. Para qualquer rota com parâmetro explícito, a URL prevalece 100%.

### 2.3. Distinção Crucial entre ID Explícito Inválido vs Storage Inválido
| Cenário | Entrada | Comportamento Normativo |
| :--- | :--- | :--- |
| **A. ID Explícito Inválido** | `/competicoes?competitionId=XYZ` (XYZ não existe) | **Zero fallback silencioso.** Retorna `selectedId: null` e `isExplicitInvalid: true`. A UI exibe *"Competição não encontrada"* para não induzir o operador a erro. |
| **B. Storage Inválido** | `localStorage = XYZ` e URL sem ID (`/competicoes`) | Como o usuário **não manifestou intenção explícita**, o sistema descarta o storage obsoleto e aplica o fallback controlado para a primeira competição válida. |

### 2.4. Preservação de Abas Oficiais sem Nomes Ad-hoc
As abas permitidas em `CompetitionTab` derivam estritamente do union type existente no componente `CompetitionHeader`:
`'overview' | 'config' | 'teams' | 'athletes' | 'draw' | 'matches' | 'standings' | 'reports'`
Nenhum valor arbitrário foi introduzido. A alternância de abas preserva `competitionId` e a alternância de campeonatos preserva a aba ativa.

---

## 3. Matriz Normativa de Testes Automatizados

O arquivo de testes unitários `src/test/competitionContextNavigation.test.ts` implementa e valida os cenários da matriz de requisitos:

| # | Cenário | Validação Realizada | Status |
| :-: | :--- | :--- | :-: |
| 1 | **URL válida** | Seleciona competição indicada e atualiza storage de conveniência | ✅ Aprovado |
| 2 | **URL inválida** | NUNCA seleciona a primeira competição silenciosamente (`isExplicitInvalid: true`) | ✅ Aprovado |
| 3 | **localStorage válido** | Recupera a última competição quando URL não tem ID explícito | ✅ Aprovado |
| 4 | **localStorage inválido** | Descarta storage obsoleto e executa fallback controlado seguro | ✅ Aprovado |
| 5 | **URL + localStorage** | URL explícita tem prioridade absoluta e atualiza o storage | ✅ Aprovado |
| 6 | **routeParamId** | Rota direta do recurso tem precedência sobre searchParamId | ✅ Aprovado |
| 7 | **competitionId + tab** | Construtor canônico preserva competição e aba na query string | ✅ Aprovado |
| 8 | **Alteração de tab** | Mudar de aba mantém rigorosamente o `competitionId` ativo | ✅ Aprovado |
| 9 | **Alteração de competição** | Mudar de campeonato na central preserva a aba ativa selecionada | ✅ Aprovado |
| 10 | **Query adicional** | Preserva parâmetros extras (`foo=bar`, filtros) sem apagá-los | ✅ Aprovado |
| 11 | **Builders canônicos** | `buildCompetitionUrl`, `buildMatchesUrl`, `buildReportsUrl`, etc., geram URLs válidas | ✅ Aprovado |
| 12 | **Union type de Abas** | Valida todas as 8 abas oficiais de `CompetitionTab` | ✅ Aprovado |
| 13 | **Histórico Back/Forward** | Reavaliação imediata e determinística do estado com histórico | ✅ Aprovado |

---

## 4. Auditoria de Rotas Literais e Links Corrigidos

A busca global de padrões (`navigate(`, `<Link to=`, `route:`) identificou e corrigiu os seguintes desvios contextuais:

1. `src/components/dashboard/Dashboard.tsx`:
   - Linha 510: Card de competição clicado navegava para `/competicoes` sem ID ➔ Corrigido para `navigate(buildCompetitionUrl(comp.id))`.
   - Linha 541: Botão "Jogos" do card navegava para `/jogos` sem ID ➔ Corrigido para `navigate(buildMatchesUrl(comp.id))`.
   - Linha 552: Botão "Gerenciar" do card navegava para `/competicoes` sem ID ➔ Corrigido para `navigate(buildCompetitionUrl(comp.id))`.
   - Linha 217: Alerta de equipes sem elenco ➔ Corrigido para `buildCompetitionUrl(targetCompId, 'teams')`.
2. `src/pages/ActiveCompetitionsPage.tsx`:
   - Linha 243: Título do card agora navega para `buildCompetitionUrl(c.id)`.
   - Linha 301: Botão "Ver Jogos" agora navega para `buildMatchesUrl(c.id)`.
   - Linha 310: Botão "Relatórios" navegava para `/relatorios` sem ID ➔ Corrigido para `navigate(buildReportsUrl(c.id))`.
   - Linha 321: Botão "Inscrições" agora navega para `buildRegistrationsUrl(c.id)`.
3. `src/pages/CompetitionRegistrationsPage.tsx`:
   - Linha 474: Breadcrumb de retorno ➔ Corrigido para `href: buildCompetitionUrl(competition.id)`.
   - Linha 735: Link "Ir para a Central de Jogos" ➔ Corrigido para `to={buildMatchesUrl(competition.id)}`.
4. `src/pages/StandingsPage.tsx`:
   - Linha 209: `setSearchParams({ competitionId })` destruía parâmetros existentes ➔ Corrigido para atualização funcional preservando outros parâmetros.
   - Linha 433: Botão "Ir para Central de Jogos" ➔ Corrigido para `buildMatchesUrl(selectedCompId)`.
5. `src/pages/ReportsPage.tsx`:
   - Dropdown de competição agora conectado ao `searchParams` via `handleCompetitionChange` e `resolveActiveCompetition`.
   - Banner de alerta exibido quando o ID na URL for inválido.
6. `src/pages/CreateMatchPage.tsx`:
   - Suporte adicionado a `?competitionId=...` e redirecionamento de sucesso/cancelamento devolvendo o operador à `Central de Jogos` daquela competição (`buildMatchesUrl`).
7. `src/pages/DrawPage.tsx`:
   - Linha 764: Botão "Ir para Agenda" ➔ Corrigido para `navigate(buildMatchesUrl(selectedId))`.
8. `src/services/competitionReadinessService.ts`:
   - Todas as rotas de etapas e tarefas pendentes foram convertidas para invocação de helpers tipados (`buildCompetitionUrl`, `buildMatchesUrl`, `buildReportsUrl`, `buildDrawUrl`, `buildRegistrationsUrl`).

---

## 5. Resultados das Verificações Oficiais (Critérios AGENTS.md)

### 5.1. TypeScript Typecheck
```bash
npx tsc -p tsconfig.app.json --noEmit
```
**Resultado:** Código 0 (Zero erros).

### 5.2. ESLint
```bash
npm run lint
```
**Resultado:** Código 0 (Zero erros; apenas 1 aviso preexistente de hook no módulo cinemático do sorteio).

### 5.3. Vitest (Testes Unitários Globais)
```bash
npx vitest run
```
**Resultado:**
- **Arquivos de Teste:** 103 passed (103/103)
- **Testes Unitários:** 931 passed (931/931)
- **Tempo de Execução:** ~4 minutos
- **Regressões:** 0 detectadas.

### 5.4. Build de Produção
```bash
npm run build
```
**Resultado:**
- **Vite:** 4143 módulos transformados e empacotados com sucesso.
- **Chunk gerado:** `dist/assets/competitionNavigationHelper-Ct6JtaX7.js` (1.47 kB / gzip: 0.60 kB).

---

## 6. Governança e Status do Ciclo
 
| Dimensão | Situação |
| :--- | :--- |
| **Implementação de Código** | Concluída e aderente às regras arquiteturais do BaseOS |
| **Validação em Desenvolvimento / Testes** | 100% aprovada (931/931 testes passando, build de produção bem-sucedido) |
| **Homologação em Produção** | **PENDENTE** (aguarda janela de homologação operacional de deploy) |
| **Impacto nas Fases Anteriores** | **ZERO** (Fase 2 de Identidade e Apoiadores preservada na íntegra) |
| **Regras Esportivas e Domínio** | **Nenhuma alteração intencional** (regras esportivas, tiebreaks e pontuações intactos) |

```text
┌──────────────────────────────────────────────────────────────────┐
│ FASE 3: NAVEGAÇÃO CONTEXTUAL DA COMPETIÇÃO                       │
├──────────────────────────────────────────────────────────────────┤
│ Status do Ciclo: IMPLEMENTADO E VALIDADO EM DEV/TESTE            │
│ Homologação de Produção: PENDENTE                                │
│ Cobertura de Testes: 931/931 aprovados (19 testes adicionais)    │
│ Build de Produção: 100% aprovado (Vite v5.4)                     │
│ Regressões de Domínio / Regras Esportivas: Nenhuma detectada     │
│ Impacto na Fase 2 (Identidade / Apoiadores / Migrations): Zero  │
└──────────────────────────────────────────────────────────────────┘
```

A **Fase 3 está concluída, testada e validada em ambiente de desenvolvimento/teste**, pronta para a esteira:
**Fase 3 Dev/Teste ✅ → Deploy controlado → Smoke Test Produção → Homologação Produção → Próximo trabalho**.
