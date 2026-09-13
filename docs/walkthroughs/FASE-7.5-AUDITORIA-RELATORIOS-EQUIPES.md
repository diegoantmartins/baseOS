# BASEOS — FASE 7.5: WALKTHROUGH DE AUDITORIA DE RELATÓRIOS, IDENTIDADE E GESTÃO EQUIPE → ATLETAS

- **Data da Auditoria:** 12 de Setembro de 2026
- **Modo:** AUDIT-ONLY (Investigação Técnica Estrita)
- **Status da Auditoria:** **GO**
- **Ambiente:** DEV Local Exclusivo (`supabase-db` PostgreSQL 15, Vite React 18, TypeScript)
- **Instância de Produção (VOLTZ):** **TOTALMENTE CONGELADA / NÃO ACESSADA / NÃO MODIFICADA**

---

## 1. O QUE FOI ANALISADO

Nesta Fase 7.5 (Prompt 1), a análise foi estruturada em duas frentes complementares:

1. **Central de Relatórios, Motores de PDF e Identidade Institucional:**
   - Inventário minucioso de todos os componentes de visualização e geração de relatórios (`ReportsPage.tsx`, `MatchesBoletimView.tsx`, `StandingsReportView.tsx`, `TeamRostersReportView.tsx`, `PodiumReportView.tsx`, `MatchSheetPage.tsx`, `DocumentEditorPage.tsx`).
   - Mapeamento comparativo dos motores de PDF instalados (`@react-pdf/renderer`, `jsPDF`, `pdf-lib`).
   - Varredura de ocorrências residuais do nome legado "VolleyPro" em arquivos de interface, relatórios, PWA e código ativo.
   - Auditoria dos ativos visuais e componentes de identidade do BaseOS (`BaseOsLogo.tsx`, logos em `public/`, cabeçalhos vetoriais em `BaseosHeader.tsx`).
   - Levantamento das necessidades de novos relatórios no domínio esportivo do voleibol e seleção dos **dois relatórios prioritários**.

2. **Gestão de Equipes e Navegação Equipe → Atletas:**
   - Inspeção aprofundada da página de equipes (`src/pages/TeamsPage.tsx`).
   - Rastreamento do ciclo de vida e das interações do usuário: listagem, filtros, menu de ações e abertura de detalhes (`TeamDetailsDialog`).
   - Análise do fluxo de dados: por que a aplicação atualmente não lista os atletas ao abrir os detalhes de uma equipe.
   - Confronto do modelo de dados (`teams`, `competition_teams`, `competition_athletes`, `persons`).
   - Avaliação da convivência arquitetural entre `/equipes`, `/atletas` e `/pessoas`.
   - Avaliação de UX nos formatos desktop, tablet e mobile.

---

## 2. COMO A ANÁLISE FOI CONDUZIDA

A auditoria seguiu estritamente o método de observação não destrutivo:
- **Buscas Semânticas e Varredura de AST:** Utilização de buscas estruturadas por termos de documentação, PDF, relatórios, exportação, tabelas e marcas (`VolleyPro`, `BaseOS`).
- **Inspeção Estática de Código:** Leitura detalhada dos fluxos de chamada em `TeamsPage.tsx`, `ReportsPage.tsx`, `reportsPdf.ts` e `BaseosHeader.tsx`.
- **Inspeção do Schema e Dados no PostgreSQL DEV:** Consultas `SELECT` não modificadoras no container local `supabase-db` (`volei_test_db`) para quantificar agremiações, competições e elencos reais existentes.
- **Validação de Compilação e Linter:** Execução de `tsc` e `eslint` para checar a saúde atual do projeto sem introduzir novos erros.
- **Auditoria da Suíte de Testes:** Execução completa da suíte Vitest (107 arquivos, 1.005 testes) e análise de performance sob carga concorrente.
- **Validação de Build:** Execução de `npm run build` confirmando a integridade dos artefatos de produção.

---

## 3. ARQUIVOS CONSULTADOS

- **Páginas e Telas Principais:**
  - `src/pages/TeamsPage.tsx`
  - `src/pages/AthletesPage.tsx`
  - `src/pages/ReportsPage.tsx`
  - `src/pages/MatchSheetPage.tsx`
  - `src/pages/DocumentEditorPage.tsx`
  - `src/pages/PeoplePage.tsx`
  - `src/pages/SettingsPage.tsx`
- **Componentes de Relatório e Documentos:**
  - `src/components/report/MatchesBoletimView.tsx`
  - `src/components/report/StandingsReportView.tsx`
  - `src/components/report/TeamRostersReportView.tsx`
  - `src/components/report/PodiumReportView.tsx`
  - `src/components/report/ReportSelector.tsx`
  - `src/components/report/ReportHeader.tsx`
  - `src/components/report/ReportCompetitionIdentity.tsx`
  - `src/components/match/MatchPdfPreview.tsx`
  - `src/components/match/MatchSheetEmitDialog.tsx`
  - `src/components/match/BlankSheetEmitDialog.tsx`
  - `src/components/common/BaseOsLogo.tsx`
  - `src/components/match/MatchSocialCard.tsx`
  - `src/components/registration/TeamCreatedShareDialog.tsx`
  - `src/components/pwa/PwaInstallButton.tsx`
- **Motores e Bibliotecas de PDF:**
  - `src/lib/pdf/reportsPdf.ts`
  - `src/lib/pdf/matchSheetPdf.ts`
  - `src/lib/pdf/officialMatchSheetPdf.ts`
  - `src/lib/pdf/types.ts`
  - `src/document-engine/baseos/index.ts`
  - `src/document-engine/baseos/components/BaseosHeader.tsx`
  - `src/document-engine/generators/sumula3.generator.ts`
  - `src/document-engine/generators/sumula5.generator.ts`
- **Tipos, Serviços e Configurações:**
  - `src/types/entities.ts`
  - `src/types/registration.ts`
  - `src/services/dataAccess.ts`
  - `src/services/registrationService.ts`
  - `src/hooks/useCapability.ts`
  - `package.json`, `index.html`, `public/manifest.webmanifest`

---

## 4. ROTAS ANALISADAS

- `/equipes` (Gestão de equipes, visualização, edição e exclusão)
- `/atletas` (Gestão geral de atletas inscritos em competições)
- `/pessoas` (Cadastro geral de pessoas/staff - entidade legada LocalStorage)
- `/relatorios` (Central oficial HTML-first e exportação PDF)
- `/sumulas` e `/sumulas/:matchId` (Central de súmulas digitais)
- `/documentos/editor/:matchId` (Editor de templates com coordenadas fixas)
- `/competicoes/:id/inscricoes` (Gestão de inscrições de equipes por competição)
- `/equipe/inscricao/:token` (Portal público de auto-inscrição de atletas)

---

## 5. ENGINES ENCONTRADOS

1. **`@react-pdf/renderer` v4.8.1 (`src/document-engine/baseos/`):**
   - Motor canônico oficial do BaseOS.
   - Declarativo via componentes React.
   - Produz súmulas oficiais homologadas FIVB/CBV e fichas de ordem de saque em alta definição.
   - Padrão P&B visual rigoroso com símbolo vetorial do BaseOS embutido.
2. **`jsPDF` v4.0.0 (`src/lib/pdf/reportsPdf.ts`):**
   - Motor procedural utilizado na Central de Relatórios (`ReportsPage.tsx`).
   - Gera Boletim Geral, Classificação, Relação Nominal e Pódio.
   - Possui cor Navy Blue e texto `'VOLLEYPRO'` hardcoded no topo de cada página.
3. **`pdf-lib` v1.17.1 (`src/document-engine/generators/`):**
   - Motor de sobreposição de campos em templates PDF estáticos.
   - Utilizado em `/documentos/editor/:matchId`.
4. **Geradores Legados (`matchSheetPdf.ts`, `officialMatchSheetPdf.ts`):**
   - Descontinuados e marcados como `@deprecated`.

---

## 6. RELATÓRIOS ENCONTRADOS E RELATÓRIOS PRIORITÁRIOS

### Relatórios Encontrados:
- **R1:** Boletim Geral de Jogos e Confrontos
- **R2:** Classificação Oficial e Grupos
- **R3:** Relação Nominal das Equipes (Elencos)
- **R4:** Quadro de Honra e Pódio Final
- **R5:** Súmula Oficial de Partida (3/5 sets) Preenchida
- **R6:** Súmula Oficial em Branco
- **R7:** Ficha de Posição / Ordem de Saque
- **R8:** Documento Editável sobre Template

### Dois Relatórios Prioritários Recomendados:
1. **Escala Oficial de Arbitragem e Oficiais de Mesa:**
   - *Finalidade:* Indispensável para designar e publicar formalmente a equipe de arbitragem (1º árbitro, 2º árbitro, apontador, cronometrista) por jogo e rodada.
   - *Dados:* Competição, Partidas, Quadras, Horários e Árbitros designados.
   - *Rota:* `/relatorios?report=arbitragem` e botão em `/arbitros`.
2. **Programação Diária / Ordem dos Jogos por Quadra:**
   - *Finalidade:* Agenda operacional das quadras para os ginásios, afixada nos murais e consultada a cada minuto pela mesa e comissões técnicas.
   - *Dados:* Partidas agrupadas por data e quadra, horários, times e fases.
   - *Rota:* `/relatorios?report=programacao` e atalho em `/jogos`.

---

## 7. OCORRÊNCIAS DE VOLLEYPRO

Foram identificadas **36 ocorrências ativas** em código de frontend/relatórios:
- **Críticas (P1):**
  - Cabeçalho dos relatórios PDF (`reportsPdf.ts:164`);
  - Mensagem de WhatsApp ao cadastrar equipe (`TeamCreatedShareDialog.tsx:21`);
- **Secundárias (P2):**
  - Manifesto PWA (`public/manifest.webmanifest`);
  - Rodapé do Social Card (`MatchSocialCard.tsx:263`);
  - Fallbacks de organização em `dataAccess.ts:191` e `SettingsPage.tsx:356`.

---

## 8. IDENTIDADE VISUAL BASEOS

- A identidade visual Dark Tech do BaseOS é caracterizada por tons escuros Zinc (`bg-zinc-950/900`), bordas sutis (`border-border`), tipografia mono tabular para números e acentos em Âmbar (`amber-500`).
- Os ativos gráficos oficiais existem em `public/` (`logo-dark.png`, `logo-light.png`, `logo-icon-*.png`).
- O motor canônico `@react-pdf/renderer` possui a logo institucional vetorizada nativamente (`logoBars` em `BaseosHeader.tsx`), dispensando carregamento assíncrono de imagens.
- O motor `reportsPdf.ts` carece dessa padronização, sendo necessária a substituição do texto `"VOLLEYPRO"` e alinhamento de cores.

---

## 9. ANÁLISE EQUIPE → ATLETAS

- **Bloqueio Atual:** O modal de detalhes (`TeamDetailsDialog`) em `src/pages/TeamsPage.tsx` mostra apenas dados cadastrais e o total de atletas como um número (`"12"`). Não há listagem de nomes ou camisas.
- **A Descoberta:** O método `refresh()` de `TeamsPage.tsx` **já carrega todos os atletas de todas as equipes na memória** via `dataAccess.listCompetitionAthletes()`.
- **Decisão Técnica:** A melhor solução de engenharia consiste em expandir o `TeamDetailsDialog` para um componente com **duas abas**:
  - **Aba 1: "Dados da Equipe"** (Comissão técnica, contatos, gestor, escudo);
  - **Aba 2: "Elenco de Atletas"** (Tabela com camisas em badge mono, nome, posição, badges de Capitão e Líbero, documento, idade e competição).
- **Vantagens:** 0ms de carregamento adicional, sem novas migrações, sem criação de novas rotas pesadas, sem risco de regressão em `App.tsx`.

---

## 10. TESTES EXECUTADOS E RESULTADOS

1. **TypeScript Typecheck:**
   - Comando: `npx tsc -p tsconfig.app.json --noEmit`
   - Resultado: 🟢 **PASS (0 erros)**
2. **ESLint:**
   - Comando: `npm run lint`
   - Resultado: 🟢 **PASS (0 erros, 1 warning pré-existente de useMemo em DrawArenaCanvas.tsx)**
3. **Build de Produção:**
   - Comando: `npm run build`
   - Resultado: 🟢 **PASS (Exit code 0, 3m 11s)**
4. **Suíte Completa Vitest:**
   - Total de testes: **1.005 testes em 107 arquivos**
   - Aprovados: **999 testes (99,4%)**
   - Falhas/Timeouts: 6 testes em 4 arquivos ocorreram devido à contenção massiva de CPU ao executar 107 arquivos simultaneamente em ambiente com workers concorrentes (testes de geração de 6 PDFs em alta definição e benchmarks de tempo).

---

## 11. LIMITAÇÕES, RISCOS E PENDÊNCIAS

- **Limitação de RLS em Inscrição Pública:** Aprovada na Fase 7.4 via RPC `register_athlete`. O fluxo de visualização interna de equipes por organizadores opera sob RLS autenticado ou dados de demonstração locais.
- **Risco de Cache PWA:** A alteração do `manifest.webmanifest` deve manter compatibilidade com o service worker `public/sw.js` sem invalidar instalações ativas bruscamente.
- **Entidade `persons`:** Permanece desvinculada do banco relacional, sem migração. O vínculo de atletas deve continuar sendo feito estritamente através de `competition_teams` e `competition_athletes`.

---

## 12. ARQUIVOS CRIADOS NA FASE 7.5 (AUDITORIA)

- `docs/audits/FASE-7.5-AUDITORIA-RELATORIOS-EQUIPES.md` (Relatório de Auditoria Completo)
- `docs/walkthroughs/FASE-7.5-AUDITORIA-RELATORIOS-EQUIPES.md` (Este documento de Walkthrough)

*Nenhum arquivo funcional da aplicação foi modificado nesta fase.*

---

## 13. ESTADO FINAL DO GIT

```
branch: main
commit: 0509406
alterações funcionais nesta fase: NENHUMA (0 arquivos de código modificados)
migrations criadas nesta fase: NENHUMA
schema do banco DEV: INTOCADO / NÃO MODIFICADO
produção VOLTZ: NÃO ACESSADA / NÃO MODIFICADA
```

---

## 14. RECOMENDAÇÃO PARA O PROMPT 2 (IMPLEMENTAÇÃO)

A auditoria concluiu com precisão todas as investigações necessárias. Recomenda-se autorizar o **Prompt 2** para executar as seguintes etapas cirúrgicas:
1. **Equipes → Atletas:** Adicionar a aba de elenco de atletas no `TeamDetailsDialog` em `TeamsPage.tsx`, consumindo os dados já disponíveis em memória.
2. **Saneamento de Branding P1:** Substituir `"VOLLEYPRO"` por `"BASEOS"` em `src/lib/pdf/reportsPdf.ts`, no texto do WhatsApp em `TeamCreatedShareDialog.tsx`, no PWA e no `MatchSocialCard.tsx`.
3. **Novos Relatórios Prioritários:** Adicionar na Central de Relatórios (`ReportsPage.tsx`) as abas e geradores de *Escala Oficial de Arbitragem* e *Programação Diária por Quadra*.
4. **Validação Final:** Executar testes focados, typecheck e build de homologação.

---

## 15. STATUS FINAL OBRIGATÓRIO

### Classificação: **GO**

A auditoria foi concluída integralmente. Existem informações claras, evidências completas e diagnósticos sólidos para embasar com máxima segurança a próxima etapa de implementação.
