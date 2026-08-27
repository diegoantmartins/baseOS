# BASEOS — MASTER FRONTEND AUDIT
## 00. Relatório Executivo & Diagnóstico Global (Executive Summary)

---

## 1. VISÃO GERAL DO PROJETO

O **BaseOS** (VolleyPro) é um sistema web para gestão operacional de competições esportivas de voleibol (quadra e praia). O sistema possui uma camada madura de lógica de negócio e regras esportivas (FIVB/CBV, geração de súmulas oficiais para 3 e 5 sets em PDF A4 P&B, chaveamentos com eliminação direta, inscrições online via token e cálculos de classificação com até 8 critérios de desempate).

A presente auditoria master foi realizada de forma estritamente investigativa (Modo 1 da skill `baseos-audit`), sem qualquer mutação no código de produção (`src/`), com o objetivo de mapear a dívida técnica visual, falhas de navegação, lacunas de acessibilidade, problemas de responsividade e inconsistências de design system.

---

## 2. SCORECARD DE MATURIDADE FRONTEND (0 A 10)

| Dimensão Avaliada | Nota | Diagnóstico Sintético |
| :--- | :---: | :--- |
| **Identidade Visual & UI** | **7.2** | Tema Enterprise Dark consistente na maioria das telas, mas com uso de cores hardcoded e tokens legados. |
| **Experiência do Usuário (UX)** | **6.8** | Fluxos esportivos ricos, porém prejudicados por falta de breadcrumbs e modais com excesso de informação. |
| **Navegação & Arquitetura** | **6.0** | Conflito entre Sidebar (13 itens planos), Header (dropdown Cadastros) e telas órfãs (`/modalidades`, DocumentEditor). |
| **Design System & Tokens** | **6.5** | Base sólida com shadcn/ui e Tailwind 3.4, mas com variantes legadas (`--beach`, `--indoor`) e raios de borda mistos. |
| **Responsividade & Mobile** | **6.5** | Telas desktop funcionais; em mobile ocorrem sobreposições em tabelas densas e ausência de Bottom Navigation. |
| **Acessibilidade (WCAG AA)** | **6.2** | Foco visível configurado, mas faltam `aria-label` em botões de ícone e há baixo contraste em textos muted. |
| **Performance Frontend** | **7.8** | Renderização ágil com Vite, mas bundle inicial de 4.0MB por ausência de code-splitting (`React.lazy`). |
| **Consistência Sistêmica** | **6.4** | Nomenclaturas mistas (VolleyPro vs BaseOS), componentes de tabela e modais de confirmação duplicados. |
| **Operação Esportiva** | **8.5** | Alto valor de negócio: súmulas digitais, mesa do apontador ao vivo, verificação de conflitos e relatórios PDF. |
| **NOTA GERAL PONDERADA** | **6.88 / 10** | **Base sólida e altamente funcional, necessitando de unificação arquitetural e refinamento visual.** |

---

## 3. PRINCIPAIS PROBLEMAS IDENTIFICADOS (PAIN POINTS)

1. **Dualidade e Fragmentação da Navegação Principal**:
   - `Sidebar.tsx` e `Header.tsx` possuem itens diferentes e agrupamentos divergentes. O `DashboardShell.tsx` possui seu próprio cabeçalho independente.
   - A página de **Modalidades** (`/modalidades`) e o **Editor Avançado de Documentos** (`DocumentEditorPage.tsx`) estão inacessíveis ou órfãos na navegação.
2. **Componentes de Páginas Monolíticos**:
   - `SettingsPage.tsx` (1.340 linhas), `MatchesPage.tsx` (1.278 linhas) e `CompetitionsPage.tsx` (1.194 linhas) concentram estado, múltiplos modais, lógica de agendamento e renderização em arquivos gigantescos, dificultando manutenção.
3. **Tratamento Silencioso de Falhas (Error State)**:
   - Em diversas telas (ex: `ActiveCompetitionsPage.tsx`, `TeamsPage.tsx`), quando o carregamento assíncrono via `dataAccess` falha no `catch`, a aplicação apenas faz `console.error(err)` e desativa o loading, deixando o usuário diante de um estado vazio ou travado sem mensagem acionável de erro.
4. **Resíduos de Tokens Legados no Design System**:
   - A página `StatisticsPage.tsx` tenta ler `hsl(var(--beach))` que não existe no CSS atual. O `PublicShell.tsx` ainda estiliza classes `bg-indoor text-indoor-foreground` herdadas de versões anteriores.
5. **Falta de Code-Splitting no Roteamento**:
   - `App.tsx` importa todas as 22 páginas de forma estática no topo, gerando um bundle principal de 4.041 kB que carrega bibliotecas pesadas de PDF e gráficos logo no primeiro acesso.

---

## 4. TOP 10 MAIORES OPORTUNIDADES DE IMPACTO

| # | Oportunidade | Impacto | Esforço |
| :-: | :--- | :---: | :---: |
| **1** | **Unificar Navegação Global**: Padronizar `MainLayout` como container único, integrando Sidebar contextual e Bottom Nav mobile. | P1 | Médio |
| **2** | **Decompor Páginas Monolíticas**: Extrair modais de `MatchesPage`, `CompetitionsPage` e `SettingsPage` para componentes isolados. | P1 | Médio |
| **3** | **Padronizar Cobertura dos 4 Estados (Universal State Pattern)**: Implementar componente padrão para Loading (Skeleton), Vazio e Erro acionável. | P1 | Baixo |
| **4** | **Implementar Code-Splitting com `React.lazy`**: Reduzir o bundle inicial de 4MB para menos de 300kB dividindo rotas em chunks assíncronos. | P1 | Baixo |
| **5** | **Integrar o Editor de Documentos (`DocumentEditorPage`)**: Expor a funcionalidade WYSIWYG de ajuste de coordenadas de súmulas no menu de Relatórios. | P2 | Baixo |
| **6** | **Unificar Identidade Visual e Naming**: Substituir menções residuais a "VolleyPro" pelo padrão institucional `BaseOS` em todos os shells e rodapés. | P2 | Baixo |
| **7** | **Padronizar Tipografia Numérica Esportiva (`tabular-nums`)**: Aplicar `tabular-nums` em todas as tabelas de classificação, estatísticas e súmulas ao vivo. | P2 | Baixo |
| **8** | **Adicionar Breadcrumbs de Navegação Contextual**: Inserir trilha de navegação em páginas filhas (`/sumulas/:id`, `/sorteio/:id`, `/competicoes/:id/inscricoes`). | P2 | Baixo |
| **9** | **Limpar Tokens Legados do Tailwind & CSS**: Eliminar variáveis CSS fantasmas (`--beach`, `--indoor`) e padronizar variantes CVA no `Button`. | P2 | Baixo |
| **10** | **Adequação de Acessibilidade (WCAG 2.1 AA)**: Garantir `aria-label` em 100% dos botões de ação e contraste mínimo de 4.5:1 em textos secundários. | P3 | Médio |

---

## 5. DIRETRIZES DE NÃO-REGRESSÃO E SEGURANÇA

Para as futuras etapas de implementação:
- **Preservar a Central de Acesso a Dados**: Todo acesso ao banco e storage deve continuar estritamente encapsulado em `src/services/dataAccess.ts`.
- **Preservar Regras de Negócio e Testes**: Nenhuma alteração de layout poderá quebrar os 248 testes unitários existentes em `src/test/`.
- **Execução em Lotes Controlados**: As correções devem seguir o roadmap de 5 fases detalhado no arquivo `10-priority-roadmap.md`.
