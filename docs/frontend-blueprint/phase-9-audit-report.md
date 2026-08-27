# BASEOS — FASE 9
# AUDITORIA TRANSVERSAL & HARDENING

**Data da Auditoria:** 27/08/2026  
**Perfil da Auditoria:** Somente-Leitura (Non-destructive Audit)  
**Status do Sistema:** Auditado, Mapeado e Classificado  
**Versão do Sistema:** BaseOS v2.0 Enterprise SaaS  

---

## 1. Resumo Executivo

A **Fase 9.0** realizou uma auditoria técnica profunda e transversal em todo o ecossistema do **BaseOS**, cobrindo 100% da árvore de código (`src/`), camadas de arquitetura, motores esportivos, rotas, segurança/RBAC, geração de documentos (PDF), integridade de dados e a suíte de testes automatizados.

O BaseOS atingiu maturidade arquitetural e padronização visual após os ciclos 4.1 a 8.4. O Design System Dark SaaS (`MainLayout`, `PageHeader`, `SectionCard`, `DataTable`, `StatusBadge`, `StateContainer`, `BreadcrumbNav`) foi aplicado com sucesso em todas as páginas operacionais. A suíte de 54 arquivos de teste com 393 testes unitários e de integração valida a ausência de regressões críticas.

A presente auditoria identificou pontos de **hardening**, otimizações de concorrência em testes jsdom, consistência de rotas legadas e oportunidades de modularização em páginas com alta densidade operacional (`CompetitionsPage.tsx`, `MatchesPage.tsx`, `SettingsPage.tsx`).

---

## 2. Estado Atual do Sistema

| Métrica | Valor Auditado | Status |
| :--- | :--- | :--- |
| **Arquivos de Teste** | 54 arquivos (`src/test/*.test.ts`, `src/test/*.test.tsx`) | 100% Passing (393/393) |
| **TypeScript Typecheck** | `npx tsc -p tsconfig.app.json --noEmit` | **0 erros** |
| **ESLint** | `npm run lint` | **0 erros** (15 warnings `react-refresh` pré-existentes) |
| **Build de Produção** | `npm run build` | **Sucesso** (Vite bundle otimizado) |
| **Páginas Principais Padronizadas** | 12 centrais operacionais | 100% com `MainLayout` + Design System |
| **Persistência de Dados** | Adapter unificado (`dataAccess.ts`) | Suporte Demo (LocalStorage) e Supabase |
| **Regras Esportivas** | Motores dedicados (`src/services/`) | FIVB / CBV em conformidade estrita |

---

## 3. Arquitetura do Sistema

### 3.1 Camadas e Responsabilidades
```
┌─────────────────────────────────────────────────────────┐
│                      Camada de UI                       │
│  (src/pages/*, src/components/layout/MainLayout, etc.)  │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                 Camada de Apresentação                  │
│   (PageHeader, DataTable, SectionCard, StatusBadge)     │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                 Serviços e Regras de Negócio            │
│   (standingsService, playoffsService, matchValidation)  │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│             Adapter de Dados Único (dataAccess.ts)      │
│         (toSnake/toCamel, LocalStorage, Supabase)       │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Inventário de Componentes e Serviços

| Área | Arquivos Principais | Responsabilidade | Dependências | Risco |
| :--- | :--- | :--- | :--- | :--- |
| **Layout & Shell** | `MainLayout.tsx`, `Header.tsx`, `Sidebar.tsx` | Shell responsivo, navegação e banner de modo | React Router, Lucide, AuthContext | Baixo |
| **Design System** | `PageHeader`, `DataTable`, `Section`, `StatusBadge`, `StateContainer`, `BreadcrumbNav` | Primitivas universais de interface | Radix UI, Tailwind CSS | Baixo |
| **Competições** | `CompetitionsPage.tsx`, `ActiveCompetitionsPage.tsx` | Gestão de certames, fases e modalidades | dataAccess, StatusBadge, SectionCard | Médio (Densidade) |
| **Inscrições** | `CompetitionRegistrationsPage.tsx`, `TeamRosterRegistrationPage.tsx` | Inscrição por equipe e aprovação | registrationService, dataAccess | Médio |
| **Equipes & Atletas**| `TeamsPage.tsx`, `AthletesPage.tsx`, `PeoplePage.tsx` | Agremiações, elencos e pessoas | dataAccess, DataTable | Baixo |
| **Partidas** | `MatchesPage.tsx`, `CreateMatchPage.tsx` | Agendamento, súmulas ao vivo e homologação | matchValidationService, scheduleConflictService | Médio |
| **Classificação** | `StandingsPage.tsx`, `StatisticsPage.tsx` | Tabelas de pontos, sets/points average, desempates | standingsService.ts, dataAccess | Baixo |
| **Súmulas & Relatórios**| `MatchSheetPage.tsx`, `ReportsPage.tsx` | Visualização oficial e emissão de documentos | `reportsPdf.ts`, `matchSheetPdf.ts`, `officialScoresheetPdf.tsx` | Médio |
| **Cadastros de Apoio**| `VenuesPage.tsx`, `RefereesPage.tsx`, `ModalitiesPage.tsx` | Quadras, árbitros e configurações de modalidades | dataAccess, DataTable | Baixo |
| **Administração** | `SettingsPage.tsx`, `LoginPage.tsx`, `HelpCenterPage.tsx` | Usuários, auditoria, dados institucionais e segurança | `authService.ts`, `SecurityConfigService`, `AuditService` | Médio |

---

## 4. Segurança

* **Controle de Sessão e Inatividade**: Implementado através do `SecurityConfigService`, suportando timeouts de 15m, 30m, 60m e 120m com encerramento forçado de sessão.
* **Políticas de Senha**: Validação de força de senha (`PasswordStrengthIndicator`) com requisitos de 8 caracteres, maiúsculas, minúsculas, números e símbolos especiais.
* **Proteção contra Dupla Submissão**: Handlers assíncronos utilizam flags de `saving` / `submitting` com botões desabilitados durante mutations.
* **Confirmação Destrutiva**: Todas as exclusões e resets de dados utilizam `<AlertDialog>` modal com cancelamento explícito.
* **Sanitização**: Inputs com binding controlado e conversão via mappers do `dataAccess.ts`.

---

## 5. RBAC (Role-Based Access Control)

* **Perfis Definidos**: `admin`, `organizer`, `referee`, `scorer`, `team`, `viewer`.
* **Proteção de Rotas**: `src/App.tsx` utiliza o wrapper `<RequireAuth roles={['organizer']}>` nas rotas administrativas (`/competicoes`, `/equipes`, `/atletas`, `/jogos/novo`, `/configuracoes`, etc.).
* **Proteção de Operações**:
  - `admin`/`organizer`: controle total sobre certames, criação de jogos, edição de regras e usuários.
  - `referee`/`scorer`: acesso a preenchimento e homologação de súmulas digitais.
  - `team`: acesso à área pública de elenco e formulário de inscrição por token (`/equipe/inscricao/:token`).
  - `viewer`: consulta pública de competições ativas, tabela de jogos, classificação e relatórios homologados.

---

## 6. Integridade de Dados

* **Mappers Bidirecionais**: `dataAccess.ts` implementa conversão rigorosa entre o banco snake_case (Supabase) e os objetos tipados em camelCase da aplicação.
* **Chaves e Relacionamentos**:
  - `competitionId`, `teamId`, `athleteId`, `matchId`, `venueId`, `refereeId` possuem integridade referencial lógica.
  - Elencos (`competition_athletes`) são isolados por equipe e competição, impedindo conflitos de números de camisa (1 a 99 único por equipe).
* **Consistência Demo vs. Supabase**:
  - Modo Demo opera sobre `localStorage` isolado com fallback inicial do seed (`src/data/seed.ts`).
  - Modo Supabase consome o client configurado em `src/lib/supabaseClient.ts` com o mesmo contrato de tipos.

---

## 7. Regras Esportivas

* **Regras FIVB / CBV**:
  - Vitórias por 3x0 ou 3x1: 3 pontos para o vencedor, 0 para o perdedor.
  - Vitórias por 3x2: 2 pontos para o vencedor, 1 para o perdedor.
  - Desempates: 1º Pontos Ganhos; 2º Número de Vitórias; 3º Set Average (Quociente Sets); 4º Points Average (Quociente Pontos); 5º Confronto Direto; 6º Sorteio.
* **Pontuação de Sets e Validação**:
  - Sets regulares: mínimo de 25 pontos com vantagem de 2 pontos (sem teto).
  - Set decisivo (Tie-break): mínimo de 15 pontos com vantagem de 2 pontos.
  - Validação executada via `matchValidationService.ts` antes de permitir a homologação.
* **Playoffs e Chaves**:
  - `playoffsService.ts` calcula chaves de Quartas, Semifinais, Final e Disputa de 3º lugar com cruzamentos olímpicos automáticos.

---

## 8. Fluxos Operacionais

```
[ Criação de Competição ]
          │
          ▼
[ Abertura de Inscrições & Convites de Equipes ]
          │
          ▼
[ Envio e Homologação de Elencos dos Atletas ]
          │
          ▼
[ Sorteio de Grupos & Geração da Tabela de Jogos ]
          │
          ▼
[ Escalação de Arbitragem & Alocação de Quadras ]
          │
          ▼
[ Check-in, Assinatura e Súmula Digital ao Vivo ]
          │
          ▼
[ Homologação de Resultado & Atualização de Classificação ]
          │
          ▼
[ Chaveamento de Playoffs & Emissão de Relatórios / Boletins ]
```

*Todos os fluxos foram auditados de ponta a ponta e possuem cobertura de serviços dedicados.*

---

## 9. PDFs e Documentos Oficiais

* **Documentos Suportados**:
  1. `matchSheetPdf.ts`: Súmula oficial para impressão A4 P&B (otimizada para preenchimento manual).
  2. `officialScoresheetPdf.tsx`: Súmula digital oficial homologada com dados completos dos sets, pontuação ponto a ponto, substituições, tempos técnicos e assinaturas.
  3. `reportsPdf.ts`: Relatório Geral de Competição, Classificação Oficial, Boletim de Jogos e Relação Nominal de Atletas.
* **Alinhamento Tela vs. Documento**: Os dados impressos são extraídos exatamente dos registros homologados no `dataAccess.ts`.

---

## 10. UX / UI Transversal

* **Consistência Visual**: Paleta Dark SaaS Enterprise (`zinc-950`, `zinc-900`, `zinc-800`, `zinc-700`) com acentos temáticos:
  - Primário / Brand: `hsl(var(--primary))`
  - Sucesso: `emerald-500` / `emerald-400`
  - Alerta: `amber-500` / `amber-400`
  - Erro / Destrutivo: `red-500` / `red-400`
  - Informação: `sky-500` / `sky-400`
* **Tipografia**: Fontes monoespaçadas com `tabular-nums` para placares, sets, timestamps e métricas numéricas.

---

## 11. Responsividade

* **Desktop (≥ 1024px)**: Sidebar lateral expansível/colapsável (`w-60` / `w-16`), tabelas completas com múltiplas colunas e grids de 4 cards de KPIs.
* **Tablet (768px a 1023px)**: Grids adaptativos de 2 a 3 colunas e tabelas com scroll horizontal suave.
* **Mobile (< 768px)**: Sidebar ocultada com navegação via Header mobile / Drawer, DataTable com cards compactos ou scroll horizontal, e modais ocupando a largura total com safe-area.

---

## 12. Acessibilidade

* **Rótulos e ARIA**: Formulários possuem `<Label htmlFor="...">` associados aos inputs. Modais utilizam `<DialogTitle>` e `<DialogDescription>` do Radix UI.
* **Contraste**: Textos muted em `text-zinc-400` e títulos em `text-zinc-100` sobre fundos escuros `zinc-900`/`zinc-950`, atendendo ao critério WCAG AA.
* **Foco e Teclado**: Elementos interativos preservam `focus-visible:ring-2` e `focus-visible:ring-ring`.

---

## 13. Performance

* **Bundle Vite**: Otimizado com divisão de chunks (`purify`, `html2canvas`, `pdf-lib`).
* **Renderização Controlada**: Tabelas utilizam paginação e skeletons (`TableSkeleton`) durante o carregamento.
* **Persistência Eficiente**: Operações locais gravam atomicamente no `localStorage` sem re-renderizações em cascata desnecessárias.

---

## 14. Testes

* **Total de Arquivos**: 54 arquivos de teste.
* **Total de Testes Unitários/Integração**: 393 testes.
* **Taxa de Sucesso**: 100% (393/393).
* **Observação de Concorrência**: Em ambientes com restrição de memória/CPU ao rodar 54 arquivos jsdom simultâneos, a execução com `--maxWorkers=2` ou isolada por arquivo garante 100% de estabilidade e tempo de resposta determinístico.

---

## 15. Tipagem e Contratos

* **Modo Estrito TypeScript**: Habilitado em `tsconfig.json` e `tsconfig.app.json`.
* **Casts e Anys**:
  - `as any`: **0 ocorrências** em código de produção (apenas 1 referência em comentário de JSDoc).
  - `@ts-ignore` / `@ts-expect-error`: **0 ocorrências**.
  - `as unknown`: Utilizado apenas em pontos de mapeamento genérico de banco em `dataAccess.ts`.

---

## 16. Dependências

* **Dependências de Produção**: React 18, React DOM, React Router DOM v6, TanStack Query, Lucide React, Radix UI Primitives, Tailwind CSS, jsPDF, html2canvas, Supabase JS, Sonner, Class Variance Authority.
* **Dependências de Desenvolvimento**: Vite, TypeScript, Vitest, Testing Library, ESLint, PostCSS, Autoprefixer.
* **Status**: Todas as dependências estão ativas e compatíveis.

---

## 17. Código Morto e Deprecações

* **Rotas de Compatibilidade Legadas**: Rotas em inglês mantidas no `App.tsx` para redirecionamento transparente (`/matches`, `/teams`, `/athletes`, `/referees`, `/settings`, `/competitions`, `/reports`).
* **Recomendação**: Manter as rotas legadas para evitar quebras em links externos ou favoritos dos usuários.

---

## 18. Matriz de Riscos

| ID | Problema Identificado | Área | Severidade | Impacto | Probabilidade | Evidência | Recomendação / Mitigação |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **R-01** | Densidade de código em páginas grandes (`CompetitionsPage` > 60KB) | Arquitetura | **P2 (Médio)** | Manutenibilidade futura | Baixa | `CompetitionsPage.tsx` (69KB), `MatchesPage.tsx` (60KB) | Fatorar sub-modais auxiliares em subcomponentes dedicados |
| **R-02** | Warnings ESLint `react-refresh` em componentes shadcn exportando helpers | Tooling | **P3 (Baixo)** | Nenhum impacto em produção | Média | 15 warnings em `sonner.tsx`, `toggle.tsx`, `officialScoresheetPdf.tsx` | Separar tipos/constantes dos arquivos de componente |
| **R-03** | Concorrência de testes jsdom em máquinas com CPU restrita | QA / CI | **P3 (Baixo)** | Flakiness se executado com dezenas de workers simultâneos | Baixa | Vitest com 54 arquivos jsdom em paralelo | Adicionar flag `--maxWorkers=2` ou script `test:ci` no `package.json` |
| **R-04** | Rotas públicas versus privadas precisam de auditoria contínua | Segurança | **P2 (Médio)** | Exposição acidental de telas administrativas | Baixa | `App.tsx` possui rotas públicas (`/jogos`, `/classificacao`) e protegidas (`/competicoes`) | Manter validação nos testes de navegação |

---

## 19. Problemas P0 (Críticos)
* **Nenhum problema P0 identificado.**
* Não foram encontradas falhas de integridade esportiva, vazamento de credenciais, quebras de build ou inconsistências de dados.

---

## 20. Problemas P1 (Altos)
* **Nenhum problema P1 identificado.**
* Todos os fluxos operacionais críticos e regras de pontuação CBV/FIVB funcionam de forma determinística.

---

## 21. Problemas P2 (Médios)
* **P2-01**: Páginas com alta densidade de código (`CompetitionsPage.tsx`, `MatchesPage.tsx`, `SettingsPage.tsx`) agregam múltiplos formulários e modais em um único arquivo.
* **P2-02**: Script de teste contínuo (`npm test`) pode se beneficiar de limitação de threads em ambientes de CI.

---

## 22. Problemas P3 (Baixos)
* **P3-01**: 15 avisos do ESLint relacionados ao plugin `react-refresh/only-export-components` em componentes UI de terceiros / utilitários.
* **P3-02**: Rotas de alias em inglês (`/matches`, `/teams`, etc.) podem ser futuramente descontinuadas com `Navigate replace` em uma versão major 3.0.

---

## 23. Plano de Correção e Hardening (Fases 9.1 → 9.8)

A execução das correções deve seguir a ordem estrita de segurança e estabilização:

```
FASE 9.1 — Hardening de Segurança & Proteção de Rotas / Mutations
    ↓
FASE 9.2 — Estabilização de Concorrência & Pipeline de Testes (CI)
    ↓
FASE 9.3 — Modularização e Refinamento de Componentes Extensos
    ↓
FASE 9.4 — Limpeza de Warnings ESLint (react-refresh)
    ↓
FASE 9.5 — Otimização de Performance e Lazy Loading de Páginas
    ↓
FASE 9.6 — Auditoria e Refinamento de Acessibilidade (ARIA & Foco)
    ↓
FASE 9.7 — Validação e Consistência Transversal de UX/UI
    ↓
FASE 9.8 — Homologação Final para Produção & Release v2.0
```

### Detalhamento das Subfases:

* **FASE 9.1 — Hardening de Segurança & Proteção**:
  - Arquivos: `src/App.tsx`, `src/components/auth/RequireAuth.tsx`, `src/services/tenantSecurityService.ts`.
  - Escopo: Reforçar barreiras RBAC em todas as rotas e checagens explícitas antes de disparar mutations de gravação/exclusão.
* **FASE 9.2 — Estabilização de Concorrência & Testes**:
  - Arquivos: `package.json`, `vitest.config.ts`, `src/test/setup.ts`.
  - Escopo: Configurar pool e workers determinísticos para garantir execução de 100% dos testes em qualquer ambiente.
* **FASE 9.3 — Modularização de Componentes**:
  - Arquivos: `src/pages/CompetitionsPage.tsx`, `src/pages/MatchesPage.tsx`, `src/pages/SettingsPage.tsx`.
  - Escopo: Extrair sub-modais de criação e edição para componentes internos sem alterar contratos de dados.
* **FASE 9.4 — Limpeza de Warnings ESLint**:
  - Arquivos: `src/lib/pdf/officialScoresheetPdf.tsx`, `src/components/ui/sonner.tsx`, `src/components/ui/toggle.tsx`.
  - Escopo: Isolar funções utilitárias em arquivos `.ts` independentes, zerando todos os avisos do linter.
* **FASE 9.5 — Performance & Code-Splitting**:
  - Arquivos: `src/App.tsx`, `vite.config.ts`.
  - Escopo: Implementar `React.lazy()` com `<Suspense>` para as rotas administrativas pesadas, reduzindo o tamanho do bundle inicial.
* **FASE 9.6 — Refinamento de Acessibilidade**:
  - Arquivos: Formulários e dialogs do Design System.
  - Escopo: Validação de atributos `aria-describedby` e armadilhas de foco em leitores de tela.
* **FASE 9.7 — Consistência Transversal de UX/UI**:
  - Arquivos: `src/pages/*.tsx`.
  - Escopo: Revisão de micro-espaçamentos, badges de status padronizadas e densidade visual uniforme.
* **FASE 9.8 — Homologação Final & Documentação**:
  - Arquivos: `docs/frontend-blueprint/*`, `README.md`.
  - Escopo: Consolidação dos relatórios de entrega e preparação do release de produção.

---

## 24. Critérios de Aceite da Fase 9

1. Relatório de auditoria detalhado e com evidências concretas publicado em `docs/frontend-blueprint/phase-9-audit-report.md`.
2. Matriz de riscos catalogada com prioridades P0, P1, P2 e P3.
3. 100% dos testes unitários (393/393 em 54 arquivos) validados e passando.
4. TypeScript com 0 erros de compilação.
5. Build de produção gerado com sucesso.
6. Código fonte mantido intacto durante a auditoria (fase 9.0 estritamente somente-leitura).
7. Plano de hardening estruturado nas subfases 9.1 a 9.8 pronto para execução sequencial.

---

## 25. Resultado dos Testes

```
 ✓ src/test/liveMatchScorer.test.ts (9 tests)
 ✓ src/test/performanceBenchmark.test.ts (2 tests)
 ✓ src/test/playoffsService.test.ts (5 tests)
 ✓ src/test/matchValidationService.test.ts (11 tests)
 ✓ src/test/scheduleConflictService.test.ts (5 tests)
 ✓ src/test/dataAccessMappers.test.ts (5 tests)
 ✓ src/test/healthCheck.test.ts (1 test)
 ✓ src/test/example.test.ts (1 test)
 ✓ src/test/document-engine/baseos/geometry.test.ts (4 tests)
 ... [54 arquivos de teste]

 Test Files  54 passed (54)
      Tests  393 passed (393)
   Duration  280.63s
```

---

## 26. Conclusão

A auditoria transversal da **Fase 9.0** confirma que o **BaseOS** é uma plataforma sólida, com arquitetura em camadas bem definida, conformidade estrita com as regras oficiais de voleibol FIVB/CBV, integridade de dados assegurada pelo adapter `dataAccess.ts` e suíte de testes robusta.

O sistema está pronto para receber as etapas de hardening controlado (Fases 9.1 a 9.8) para sua consolidação definitiva em ambiente de produção.
