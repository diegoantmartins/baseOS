# BASEOS — AUDITORIA PRÉ-RELEASE OFICIAL

**Sistema:** BaseOS — Sistema SaaS Profissional de Gestão de Competições de Voleibol  
**Ambiente Auditado:** Desenvolvimento / Local (`/home/diego-martins/docker/volei`)  
**Data da Auditoria:** 10/09/2026  
**Classificação Final:** 🟡 **READY WITH WARNING (AUDITORIA CONCLUÍDA — AGUARDANDO AUTORIZAÇÃO)**  

---

## 1. RESUMO EXECUTIVO

Esta auditoria pré-release foi executada em caráter **estritamente analítico e não-invasivo**, em conformidade com as regras absolutas de governança do BaseOS:
* ❌ Nenhuma tag foi criada;
* ❌ Nenhum push foi realizado;
* ❌ Nenhuma GitHub Release foi gerada;
* ❌ Nenhuma imagem Docker foi publicada em registry;
* ❌ Nenhum deploy foi realizado em qualquer VPS ou ambiente produtivo;
* ❌ Nenhuma alteração foi realizada em banco de dados ou migrations;
* ❌ Nenhum arquivo de código-fonte, configuração ou workflow de CI/CD foi alterado.

O objetivo foi auditar com precisão cirúrgica o estado atual do repositório, verificar o processo de release já existente, auditar a qualidade técnica das alterações desenvolvidas recentemente (Súmula Canônica BaseOS, Ordem de Saque Canônica BaseOS, Fase 5.1 e Fase 5.2), identificar riscos de publicação e determinar o procedimento exato para a publicação oficial posterior.

---

## 2. ESTADO ATUAL DO PROJETO

### 2.1. Git & Branches
* **Branch Atual:** `main`
* **Rastreamento Remoto:** `origin/main` (em sincronia com o remoto: `Your branch is up to date with 'origin/main'`).
* **Commit HEAD Atual:** `c50855f704c64510d15fed5b4c5669fbf429c270`
  * Autor: Diego Martins
  * Data: 08/09/2026 11:47:45 -0300
  * Mensagem: `feat(release): freeze test tournament release`
* **Demais Branches Identificadas:**
  * `develop`: Localizada no commit `a9e42ac` (correspondente à tag `v2.0.0`). Encontra-se defasada em relação à `main` por 2 commits mais as alterações recentes da working tree.
  * `origin/codex/analise-requisitos-de-seguranca-e-ui`: Branch remota congelada no commit `6fca8a8` (implementação preliminar de geometria de súmula de 25/08/2026).

### 2.2. Estado da Working Tree (Ponto Crítico)
A auditoria forense do Git revelou que **as alterações recentes homologadas ainda não foram commitadas**:
* **38 arquivos modificados:** Componentes do Document Engine (`src/document-engine/baseos/`), serviços de regras esportivas (`competitionRulesService.ts`, `scoringEngine.ts`, `standingsService.ts`), páginas administrativas (`StandingsPage.tsx`, `MatchesPage.tsx`, `CompetitionsPage.tsx`, `ReportsPage.tsx`) e diálogos de emissão de súmula (`MatchSheetEmitDialog.tsx`, `BlankSheetEmitDialog.tsx`).
* **3 arquivos excluídos:** Templates legados rasterizados/pesados (`officialScoresheetPdf.tsx`, `officialScoresheetPdfGenerator.ts`, `officialScoresheetPdfReact.test.tsx`).
* **29 arquivos não monitorados (untracked):** Novos componentes e serviços da Ordem de Saque Canônica (`BaseosServeOrderDocument.tsx`, `BaseosServeOrderCard.tsx`, `serveOrderService.ts`, `types/serveOrder.ts`), novas suítes de teste de consolidação e unificação (`scoringEngineUnification.test.ts`, `competitionRulesBypasses.test.ts`, `baseosScoresheetConsolidation.test.ts`, `serveOrder.test.ts`) e documentações de walkthrough das Fases 5, 5.1 e 5.2.

> [!IMPORTANT]
> **Definição do Commit da Release:**
> O commit atual `HEAD` (`c50855f`) **NÃO** contém ainda as implementações da Súmula Canônica, Ordem de Saque Canônica, Fase 5.1 e Fase 5.2. A versão a ser publicada é representada pelo **HEAD atual acrescido do commit formal de todas as alterações presentes na working tree**.

### 2.3. Versão Declarada no `package.json`
* Versão no `package.json`: `"version": "1.0.0"`
* **Diagnóstico de Inconsistência:** Embora a release `v2.0.0` tenha sido tagueada em 27/08/2026, o campo `version` do `package.json` permaneceu inalterado em `1.0.0`. Recomenda-se alinhar este campo para a nova versão da release.

---

## 3. PROCESSO DE RELEASE EXISTENTE

A análise dos workflows de CI/CD, Dockerfiles, scripts e documentações do projeto revelou o padrão de release adotado:

### 3.1. Workflows GitHub Actions
1. **`.github/workflows/ci.yml` (Integração Contínua):**
   * Disparo: `push` e `pull_request` nas branches `main` e `develop`.
   * Executor: Runner `self-hosted` (container local `github-runner-local` gerenciado por `docker-compose.runner.yml`).
   * Etapas: `npm ci` → Typecheck (`npx tsc -p tsconfig.app.json --noEmit`) → Lint (`npm run lint`) → Testes (`npm test`) → Build (`npm run build`).
2. **`.github/workflows/deploy.yml` (Pipeline Oficial de Release & Deploy):**
   * Disparo: `push` de tags Git no formato SemVer: `v*.*.*`.
   * Executor: Runner `self-hosted`.
   * Ações executadas pelo workflow:
     1. Checkout do código na tag acionadora;
     2. Build da imagem Docker de produção: `docker/build-push-action@v5` com tag `baseos/volleyscore-hub:${{ github.ref_name }}` e **`push: false`**;
     3. Instalação do Supabase CLI e execução de `supabase db push` com credenciais de produção injetadas via GitHub Secrets (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`).
3. **`.github/workflows/staging-deploy.yml`:**
   * Disparo: `push` na branch `develop`.
   * Constrói a imagem `baseos/volleyscore-hub:staging-latest`, aplica migrations de staging e reinicia o container `baseos-staging-app` (porta 8090).

### 3.2. Containerização Docker
* **`Dockerfile` (Multi-stage build):**
  * Stage 1 (`build`): Base `node:20-alpine`, executa `npm ci` e `npm run build` gerando `/app/dist`.
  * Stage 2 (`runtime`): Base `nginx:1.27-alpine`, copia os arquivos compilados para `/usr/share/nginx/html` e aplica `nginx.conf` com compressão gzip, headers OWASP e SPA fallback.
* **`docker-compose.staging.yml`:**
  * Define o serviço de homologação local `staging-app` na porta `8090`.
* **`docker-compose.runner.yml`:**
  * Mantém o container do GitHub Actions Runner conectado ao repositório `https://github.com/diegoantmartins/volleyscore-hub`.

### 3.3. Publicação e Registries
* **Não existe publicação em registry remoto:** O workflow `deploy.yml` configura explicitamente `push: false`. As imagens são geradas unicamente no daemon Docker local do runner (`baseos/volleyscore-hub:<tag>`).
* Não há credenciais nem steps de push para Docker Hub (`docker.io`) ou GitHub Container Registry (`ghcr.io`).

---

## 4. HISTÓRICO DE RELEASES ANTERIORES

O repositório possui o seguinte histórico de tags:

| Tag | Commit | Data | Autor | Descrição da Release |
| :--- | :--- | :--- | :--- | :--- |
| **`v1.0.0`** | `6e9fc7b` | 25/08/2026 12:11 | Diego Martins | Release v1.0.0 - VolleyScore Hub |
| **`v1.1.0`** | `05aeed0` | 26/08/2026 16:18 | Diego Martins | Release v1.1.0 - Central de Ajuda, Readiness e UI/UX BaseOS |
| **`v2.0.0`** | `a9e42ac` | 27/08/2026 20:39 | Diego Martins | BaseOS / VolleyPro Release v2.0.0 - Homologação Final para Produção |

* **Última Release Oficial:** `v2.0.0` (commit `a9e42acc2b40d6fe1b7f82182c4b46c96ffcd495`).
* **Como uma instalação independente consome a release atualmente:**
  * Como não há registry externo, qualquer instalação independente (como a produção Voltz ou clientes futuros) obtém a versão através de:
    1. Clone do repositório Git com checkout da tag correspondente (`git checkout v2.0.0`);
    2. Build do bundle estático (`npm run build`) com as variáveis de ambiente (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) do ambiente de destino;
    3. Servimento dos arquivos estáticos via Nginx/OpenResty local ou container Docker.

---

## 5. CONTEÚDO DA NOVA RELEASE

A nova release agrega todas as evoluções desenvolvidas e homologadas desde o encerramento da `v2.0.0`, destacando-se quatro grandes pilares:

### 5.1. Súmula Canônica BaseOS
* **Engine Vetorial:** Migração completa para `@react-pdf/renderer` v4.8.1, eliminando dependências legadas e templates rasterizados pesados.
* **Formatos de Sets Suportados:** Templates para 1 set (`setsToWin = 1`), 3 sets (`BaseosThreeSetScoresheet.tsx`) e 5 sets (`BaseosFiveSetScoresheet.tsx`).
* **Geometria & Formatos Físicos:** Suporte a A4 e A3 Paisagem com validação geométrica rigorosa (`layouts.ts`, `layoutValidator.ts`).
* **Componentes Oficiais:** Grid técnico de pontos (25/15 pts com demarcação canônica de saque e ordem de rotação I–VI), blocos oficiais de sanções (advertência, penalidade, expulsão, desqualificação), quadro de resultados e áreas de assinaturas formais.

### 5.2. Ordem de Saque Canônica BaseOS
* **Ficha de Posição Inicial:** Módulo integrado para emissão das fichas de rotação dos técnicos (`BaseosServeOrderDocument.tsx`).
* **Grid I–VI:** Componentes de cards de rotação para os 6 jogadores titulares e indicação de líbero e capitão (`BaseosServeOrderCard.tsx`).
* **Formatos de Emissão:** 8 cards em 1 folha A4 Paisagem (para jogos em melhor de 3 sets) e 16 cards em 2 folhas A4 Paisagem (para jogos em melhor de 5 sets).
* **Modo Preenchido e Modo em Branco:** Permite emissão vinculada à partida (com nomes e números) ou fichas avulsas para preenchimento manual no ginásio.

### 5.3. Fase 5.1 — Unificação Normativa das Regras de Classificação
* **Autoridade Única:** `CompetitionRulesService` estabelecido como autoridade normativa central do sistema.
* **Eliminação de Bypasses:** Remoção de desvios ad-hoc nos critérios de desempate (H2H, set average, point average, saldo de sets/pontos).
* **Conformidade Regulatória:** Respeito absoluto às normas oficiais FIVB / CBV e aos regulamentos customizados definidos no cadastro da competição.

### 5.4. Fase 5.2 — Unificação Matemática da Pontuação e Classificação
* **Motor Matemático Puro:** `ScoringEngine` unificado e isolado como única autoridade de cálculo de pontos da classificação (`calculateMatchPoints`).
* **Correção do Formato 1 Set:** Vitória por 1×0 confere 3 pontos limpos ao vencedor e 0 ao perdedor.
* **Respeito ao `rulesSnapshot`:** Garantia de que competições iniciadas utilizam o snapshot imutável congelado, sem desvios mesmo em portais públicos e visualizações anônimas.

### 5.5. Migrations e Banco de Dados
* **0 migrations pendentes ou modificadas:** A nova release é 100% compatível com as 21 migrations já versionadas em `supabase/migrations/`. Nenhuma alteração de schema é necessária.

---

## 6. VERIFICAÇÃO DE QUALIDADE TÉCNICA (AUDITORIA FACTUAL)

Em conformidade com a seção 5 das diretrizes, foram executadas as quatro verificações seguras no código atual:

| Verificação | Comando Executado | Resultado | Duração | Detalhes / Evidência |
| :--- | :--- | :--- | :--- | :--- |
| **Typecheck** | `npx tsc -p tsconfig.app.json --noEmit` | 🟢 **PASS** | ~14s | **0 erros de tipagem**. |
| **Lint** | `npm run lint` | 🟢 **PASS** | ~11s | **0 erros**. Apenas 1 warning benigno e conhecido em `DrawArenaCanvas.tsx:438` (`react-hooks/exhaustive-deps`). |
| **Testes Unitários & Integração** | `npm test` | 🟢 **PASS** | 243.96s | **101 arquivos de teste aprovados (101/101)**<br>**898 testes aprovados (898/898 — 100%)**. |
| **Build de Produção** | `npm run build` | 🟢 **PASS** | 48.37s | Bundle estático gerado com sucesso em `dist/`. |

---

## 7. AUDITORIA DE RISCO DE PUBLICAÇÃO

| Item de Risco | Status | Diagnóstico Factual |
| :--- | :---: | :--- |
| **Arquivos Temporários** | 🟢 OK | Artefatos de teste em `docs/pdf_exemplos/` e `docs/marketing/` estão contidos e ignorados pelo `.gitignore`. |
| **Dados Locais / Scratch** | 🟢 OK | Nenhum arquivo de scratch ou log está incluído no build de produção. |
| **Arquivos `.env` Indevidos** | 🟢 OK | O arquivo `.env` local está presente na máquina mas está devidamente listado no `.gitignore` e no `.dockerignore`. Não foi comitado nem exposto no git. |
| **Exposição de Credenciais** | 🟢 OK | Nenhuma chave de produção, token sensível ou service_role está presente no código rastreado. |
| **Hardcodes Específicos da VOLTZ** | 🟢 OK | O código é 100% genérico e desacoplado. As menções a 'voltz' em `src/` ocorrem unicamente em testes unitários que garantem que o sistema NÃO possui hardcodes da Voltz. |
| **Modo DEMO / Variáveis de Ambiente** | 🟡 **ALERTA** | Como o Vite compila as variáveis `VITE_*` estaticamente no build do frontend, se uma imagem Docker for construída sem injeção das credenciais reais do Supabase do ambiente de destino, `isSupabaseConfigured()` retornará `false` e a aplicação entrará em Modo DEMO (LocalStorage). O build para ambientes reais requer a injeção dessas variáveis. |
| **Referências a `localhost`** | 🟢 OK | Zero ocorrências em código de produção. Encontradas apenas em dados mock de testes unitários (`src/test/whatsAppService.test.ts`). |
| **URLs Específicas de Staging** | 🟢 OK | Apenas referências documentais ou no arquivo segregado `docker-compose.staging.yml`. |
| **Alterações Não Commitadas** | 🔴 **PENDÊNCIA** | O working tree possui 38 arquivos modificados e 29 arquivos não monitorados. Todas as funcionalidades homologadas das Fases 5.1, 5.2, Súmula e Ordem de Saque residem na working tree e **precisam ser formalmente commitadas** antes de gerar a tag da release. |

---

## 8. DETERMINAÇÃO DO PROCESSO EXATO DE PUBLICAÇÃO

Para quando a publicação for formalmente autorizada, o processo técnico exato deverá seguir as etapas abaixo:

### 8.1. Origem e Commit
1. Revisar o status da working tree (`git status`).
2. Criar um commit formal na branch `main` consolidando as entregas homologadas:
   ```bash
   git add src/ docs/ scripts/
   git commit -m "feat(release): consolidar súmula canônica, ordem de saque e fase 5 (unificação de regras e classificação)"
   ```
3. Opcionalmente, atualizar a branch `develop` para manter a paridade com a `main`:
   ```bash
   git checkout develop
   git merge main --ff-only
   git checkout main
   ```

### 8.2. Versionamento e Tag Recomendada
* **Última Tag Existente:** `v2.0.0`
* **Versão no `package.json` Atual:** `1.0.0`
* **Recomendação de Versão:**
  * Atualizar o `package.json` para `"version": "2.1.0"` (ou `"version": "3.0.0"` caso se considere a remoção dos componentes legados como breaking change formal de contrato).
  * **Tag Oficial Recomendada:** **`v2.1.0`** (ou **`v3.0.0`**).
* Criação da Tag Anotada:
  ```bash
  git tag -a v2.1.0 -m "BaseOS Release v2.1.0 — Súmula Canônica, Ordem de Saque Canônica e Unificação Matemática da Classificação (Fase 5)"
  ```

### 8.3. Docker & Registry
* **Construção Local:**
  ```bash
  docker build -t baseos/volleyscore-hub:v2.1.0 -t baseos/volleyscore-hub:latest .
  ```
* **Recomendação de Registry:**
  Para disponibilizar a imagem para instalações externas e servidores sem necessidade de compilação local, recomenda-se configurar o GitHub Container Registry (`ghcr.io`):
  ```bash
  docker tag baseos/volleyscore-hub:v2.1.0 ghcr.io/diegoantmartins/volleyscore-hub:v2.1.0
  docker tag baseos/volleyscore-hub:v2.1.0 ghcr.io/diegoantmartins/volleyscore-hub:latest
  # docker push ghcr.io/diegoantmartins/volleyscore-hub:v2.1.0
  ```

### 8.4. Publicação no GitHub
* Realizar o push do commit e da tag para o repositório remoto:
  ```bash
  git push origin main
  git push origin v2.1.0
  ```
* O push da tag disparará automaticamente o workflow `.github/workflows/deploy.yml` no runner self-hosted.
* Criar a Release no GitHub vinculada à tag `v2.1.0` com o changelog factual gerado nesta auditoria.

### 8.5. Consumo por Instalações Independentes
Uma instalação externa (ou instância cliente) poderá consumir a release através de:
1. **Via Imagem Docker:** Baixar a imagem do registry e instanciar o container apontando suas variáveis de ambiente; OU
2. **Via Código-Fonte:**
   ```bash
   git clone https://github.com/diegoantmartins/volleyscore-hub.git
   cd volleyscore-hub
   git checkout v2.1.0
   # Configurar .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY da instância
   npm ci
   npm run build
   # Servir a pasta dist/ via Nginx/Caddy
   ```

---

## 9. QUADRO SÍNTESE DE ENCERRAMENTO

```text
================================================================================
BASEOS PRÉ-RELEASE AUDIT REPORT
================================================================================
STATUS GERAL:             🟡 READY WITH WARNING
BRANCH ATUAL:             main (em dia com origin/main)
COMMIT HEAD:              c50855f704c64510d15fed5b4c5669fbf429c270
ÚLTIMA TAG OFICIAL:       v2.0.0 (commit a9e42ac, de 27/08/2026)
TAG RECOMENDADA:          v2.1.0 (ou v3.0.0)
VERSÃO PACKAGE.JSON:      1.0.0 (defasada; recomendada atualização)
--------------------------------------------------------------------------------
VERIFICAÇÃO TÉCNICA:
  - TypeScript Typecheck: 🟢 PASS (0 erros)
  - ESLint:               🟢 PASS (0 erros, 1 warning conhecido)
  - Vitest Test Suite:    🟢 PASS (101/101 arquivos, 898/898 testes)
  - Production Build:     🟢 PASS (48.37s)
--------------------------------------------------------------------------------
RISCOS & PENDÊNCIAS:
  1. PENDÊNCIA:           Alterações homologadas estão na working tree sem commit.
  2. ALERTA:              Ausência de registry remoto público (push: false).
  3. ALERTA:              Build requer credenciais Supabase do destino para evitar DEMO mode.
================================================================================
```

> [!CAUTION]
> **FIM DA AUDITORIA — EXECUÇÃO PARADA:**
> Em conformidade com as instruções recebidas, **nenhuma ação de deploy, push ou tagging foi executada**. O sistema encontra-se auditado, validado tecnicamente e aguardando decisão/autorização superior para prosseguir com a publicação.
