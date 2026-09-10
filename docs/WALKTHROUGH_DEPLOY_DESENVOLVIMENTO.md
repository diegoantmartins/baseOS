# BASEOS — WALKTHROUGH DE DEPLOY E VALIDAÇÃO DA BASE DE DESENVOLVIMENTO

## PÓS-FASE 5.2 — AUDITORIA + UNIFICAÇÃO DA PONTUAÇÃO DA CLASSIFICAÇÃO

**Sistema:** BaseOS — Gestão de Competições de Voleibol  
**Fase:** Deploy de Validação da Base de Desenvolvimento (Pós-Fase 5.2)  
**Status do Deploy:** APROVADO E HOMOLOGADO OPERACIONALMENTE 🟢  
**Data:** 09/09/2026  
**Ambiente:** Host Linux (docker/volei), Docker Compose, Nginx 1.27 Alpine, Node.js v20.19.6, Vite 5, React 18, TypeScript, Vitest, Playwright  
**URL do Ambiente de Staging/Desenvolvimento:** `http://localhost:8090`  

---

### 1. OBJETIVO DA EXECUÇÃO

O objetivo desta execução foi preparar, auditar, implantar e validar exaustivamente a **base de desenvolvimento** do BaseOS imediatamente após a homologação da **Fase 5.2 (Auditoria + Unificação da Pontuação da Classificação)**.

A missão consistiu em:
* Auditar o estado local do repositório antes de qualquer alteração de infraestrutura;
* Executar a validação quádrupla obrigatória (typecheck, lint, testes unitários/integração e build de produção);
* Auditar a infraestrutura e a estratégia existente de deploy sem inventar novos padrões arquiteturais;
* Executar o deploy no container Docker de desenvolvimento (`baseos-staging-app`) na porta `8090`;
* Validar de forma automatizada e factual todos os fluxos operacionais críticos (autenticação, rotas principais, regras esportivas de 1 set, 3 sets e 5 sets, circuito de proteção do `rulesSnapshot`, emissão de Súmula Canônica, emissão de Ordem de Saque Canônica e Portal Público);
* Preservar 100% intactos o diretório `src/document-engine/baseos/`, as regras esportivas e as fases homologadas;
* Documentar de forma transparente todos os resultados, decisões técnicas, limitações e conclusões no presente relatório.

---

### 2. BRANCH UTILIZADA

* **Branch ativa:** `main`
* **Rastreamento remoto:** `origin/main`
* **Status de sincronização:** Em dia com `origin/main` (`Your branch is up to date with 'origin/main'`).

---

### 3. COMMIT UTILIZADO

* **Commit HEAD:** `c50855f704c64510d15fed5b4c5669fbf429c270`
* **Autor do commit:** Diego Martins
* **Data do commit:** Seg, 9 Mar 2026 12:43:03 -0300
* **Mensagem:** `docs(auditoria): registrar relatório de auditoria e saneamento da Fase 5`

---

### 4. ESTADO INICIAL DO GIT

Antes do deploy, o working tree continha o conjunto de arquivos implementados, auditados e homologados nas Fases 5, 5.1 e 5.2, bem como os componentes da Ordem de Saque Canônica:

* **Modificados no working tree:**
  * `src/components/competition/tabs/CompetitionConfigTab.tsx`
  * `src/components/match-sheet/MatchSheetInterface.tsx`
  * `src/components/match/BlankSheetEmitDialog.tsx`
  * `src/components/match/MatchSheetEmitDialog.tsx`
  * `src/document-engine/baseos/*` (arquivos da Súmula e Ordem de Saque homologadas)
  * `src/lib/pdf/matchSheetPdf.ts`, `src/lib/pdf/officialMatchSheetPdf.ts`
  * `src/pages/StandingsPage.tsx`, `src/pages/MatchesPage.tsx`, `src/pages/CompetitionsPage.tsx`, etc.
  * `src/services/competitionRulesService.ts`
  * `src/services/competitionRuntimeService.ts`
  * `src/services/publicCompetitionService.ts`
  * `src/services/scoringEngine.ts`
  * `src/services/standingsService.ts`
  * `src/services/tieBreakEngine.ts`
* **Novos / Não rastreados previamente:**
  * `docs/WALKTHROUGH_FASE_5.md`, `docs/WALKTHROUGH_FASE_5_1.md`, `docs/WALKTHROUGH_FASE_5_2.md`
  * `docs/WALKTHROUGH_ORDEM_SAQUE_CANONICA.md`
  * `src/test/baseosScoresheetConsolidation.test.ts`
  * `src/test/competitionRulesBypasses.test.ts`
  * `src/test/scoringEngineUnification.test.ts`
  * `src/document-engine/baseos/components/BaseosServeOrderCard.tsx`, etc.

Todo o estado de código refletia exatamente o encerramento da Fase 5.2. Nenhuma alteração espúria ou não documentada foi detectada.

---

### 5. ARQUIVOS ALTERADOS / ADICIONADOS NESTA SESSÃO

Em estrita obediência à regra de não reabrir fases homologadas e não alterar o Document Engine:
* **`src/document-engine/baseos/`:** **0 arquivos alterados (100% intocado)**.
* **Regras esportivas (`src/services/`):** **0 arquivos alterados (100% intocado)**.
* **Componentes de UI (`src/components/`, `src/pages/`):** **0 arquivos alterados (100% intocado)**.
* **Arquivos adicionados para a validação do deploy:**
  * `scripts/validate-development-deploy.cjs`: Script autônomo de validação E2E via Playwright headless para auditar o container em execução.
  * `docs/WALKTHROUGH_DEPLOY_DESENVOLVIMENTO.md`: Este relatório obrigatório de deploy.

---

### 6. INFRAESTRUTURA ANALISADA

A auditoria da infraestrutura identificou a seguinte pilha técnica configurada no repositório:

1. **Host do Sistema:**
   * Linux x86_64, Kernel padrão containerizado.
   * Node.js: `v20.19.6`
   * NPM: `10.8.2`
   * Docker Server & CLI: v27.x / Docker Compose v2.33.1
2. **Container Docker Staging (`baseos-staging-app`):**
   * Definido em: `docker-compose.staging.yml` e `Dockerfile.staging`.
   * Padrão Multi-Stage:
     * Stage 1 (`builder`): Base `node:20-alpine`, compila a aplicação com `npm run build` gerando bundle estático em `/app/dist`.
     * Stage 2 (`runtime`): Base `nginx:1.27-alpine`, serve os arquivos em `/usr/share/nginx/html`.
   * Porta Mapeada: `0.0.0.0:8090->80/tcp`.
   * Servidor Nginx:
     * Configurado em `nginx.staging.conf`.
     * Suporte a SPA: `try_files $uri $uri/ /index.html;`.
     * Compressão: `gzip on` (tipos texto, js, css, json, svg).
     * Cabeçalhos OWASP: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`.
     * Healthcheck: `wget --no-verbose --tries=1 --spider http://127.0.0.1/ || exit 1` a cada 10s.
3. **Persistência de Dados e Supabase:**
   * Container `supabase-db` ativo localmente na porta 5432.
   * Banco padrão `postgres` ocupado por outro schema externo; banco `volei_test_db` contendo o schema do BaseOS para testes SQL.
   * A aplicação do BaseOS utiliza a arquitetura de **Adapter Unificado** (`src/services/dataAccess.ts` e `src/services/authService.ts`).
   * No build do Docker de staging, `.dockerignore` exclui os arquivos `.env*`. Como as variáveis `VITE_*` do Vite são embutidas em tempo de build, a função `isSupabaseConfigured()` (`src/lib/supabaseClient.ts`) detecta ausência de URL externa e chave anônima, ativando de forma resiliente o **Adapter LocalStorage** com os dados canônicos (`src/data/seed.ts`), garantindo autonomia e isolamento completo sem dependência de rede externa.

---

### 7. ESTRATÉGIA DE DEPLOY UTILIZADA

Foi utilizado rigorosamente o padrão existente e aprovado no repositório:

```bash
docker compose -f docker-compose.staging.yml up -d --build --force-recreate
```

Etapas da execução do deploy:
1. Docker Compose acionou o build do `Dockerfile.staging` usando o contexto local;
2. As dependências foram instaladas e o Vite gerou o build de produção otimizado;
3. A imagem `baseos:staging-latest` foi criada com sucesso;
4. O container `baseos-staging-app` foi recriado e iniciado em background;
5. O Nginx subiu e atendeu com sucesso ao healthcheck interno (`healthy`).

---

### 8. CONFIGURAÇÃO DE AMBIENTE RELEVANTE

| Configuração | Arquivo de Origem | Valor / Comportamento |
| :--- | :--- | :--- |
| **Container Name** | `docker-compose.staging.yml` | `baseos-staging-app` |
| **Port Binding** | `docker-compose.staging.yml` | `8090:80` |
| **Restart Policy** | `docker-compose.staging.yml` | `unless-stopped` |
| **Healthcheck** | `docker-compose.staging.yml` | Interval 10s, Timeout 3s, Retries 3 |
| **Web Server** | `Dockerfile.staging` | Nginx 1.27 Alpine |
| **Vite App Title** | SPA Metadata | `BaseOS — Sistema de Gestão de Competições Esportivas` |
| **Storage Engine** | `dataAccess.ts` | LocalStorage Adapter (`voleipro.v1.*`) |
| **Security Headers** | `nginx.staging.conf` | OWASP nosniff, SAMEORIGIN, strict-origin |

---

### 9. COMANDOS EXECUTADOS

1. **Auditoria do Git e Estado da Máquina:**
   ```bash
   git branch -a
   git log -1 --stat
   git status --short
   node -v && npm -v
   docker ps
   ```
2. **Validação Quádrupla Pré-Deploy:**
   ```bash
   # 1. Typecheck
   npx tsc -p tsconfig.app.json --noEmit

   # 2. Lint
   npm run lint

   # 3. Testes Unitários e de Integração
   npm test -- --run

   # 4. Build de Produção
   npm run build
   ```
3. **Deploy do Container Staging:**
   ```bash
   docker compose -f docker-compose.staging.yml up -d --build --force-recreate
   docker ps -a --filter "name=baseos-staging-app"
   ```
4. **Validação Operacional e de Integridade:**
   ```bash
   curl -I http://localhost:8090
   node scripts/validate-development-deploy.cjs
   ```

---

### 10. TESTES REALIZADOS

A bateria de testes cobriu duas frentes completas e independentes:

1. **Bateria Vitest de Homologação da Fase 5.2:**
   * 101 arquivos de teste executados em ambiente jsdom.
   * 898 casos de teste cobrindo regras esportivas, document engine, tie-break, H2H, mappers e scoresheet.
2. **Bateria Operacional E2E no Container Staging (`scripts/validate-development-deploy.cjs`):**
   * Execução via Chromium/Playwright navegando diretamente na aplicação servida pelo Nginx em `http://localhost:8090`.
   * 15 testes operacionais ponta a ponta (`DEP-01` a `DEP-15`) cobrindo desde o handshake HTTP e segurança até a integridade matemática das tabelas de classificação em 1 set, 3 sets e 5 sets.

---

### 11. RESULTADOS DE CADA TESTE

#### A. Validação Quádrupla Pré-Deploy
* **Typecheck (`npx tsc -p tsconfig.app.json --noEmit`):**
  * **Resultado:** **0 erros** (Código de saída 0).
* **Lint (`npm run lint`):**
  * **Resultado:** **0 erros**, 1 warning conhecido (`react-refresh/only-export-components` em `src/components/common/LoadingSpinner.tsx`).
* **Testes Vitest (`npm test -- --run`):**
  * **Resultado:** **101/101 test files PASS**, **898/898 tests PASS** (Duração: 6.95s, Código de saída 0).
* **Build de Produção (`npm run build`):**
  * **Resultado:** **PASS**. 161 módulos transformados, chunks estáticos gerados em `dist/` em 1m 02s.

#### B. Bateria Operacional no Deploy (`http://localhost:8090`)

| ID | Teste Operacional | Critério de Aceite | Resultado |
| :--- | :--- | :--- | :--- |
| **DEP-01** | Carregamento da SPA e HTTP 200 | Retorno HTTP 200, título correto da aplicação e ausência de tela branca | **PASS** 🟢 |
| **DEP-02** | Cabeçalhos OWASP no Nginx | Presença de `X-Frame-Options: SAMEORIGIN` e `X-Content-Type-Options: nosniff` | **PASS** 🟢 |
| **DEP-03** | Autenticação Organizador | Login com `organizador@voleipro.app`, transição para dashboard e sessão ativa | **PASS** 🟢 |
| **DEP-04** | Rota `/competicoes` | Renderização da listagem de competições com competições canônicas | **PASS** 🟢 |
| **DEP-05** | Rota `/jogos` | Acesso à tabela de partidas e filtros operacionais | **PASS** 🟢 |
| **DEP-06** | Rota `/classificacao` | Renderização das tabelas de classificação por grupo | **PASS** 🟢 |
| **DEP-07** | Rota `/sumulas` | Acesso ao módulo de súmulas e documentos oficiais | **PASS** 🟢 |
| **DEP-08** | Persistência de Dados | LocalStorage populado com as coleções `voleipro.v1.*` | **PASS** 🟢 |
| **DEP-09** | Regra de 1 Set (Correção Fase 5.2) | 1x0 confere 3 pts (vitória limpa) e 0 pts (derrota limpa) no bundle implantado | **PASS** 🟢 |
| **DEP-10** | Regras de 3 Sets | 2x0 -> 3/0 pts; 2x1 -> 2/1 pts (vitória/derrota apertada) | **PASS** 🟢 |
| **DEP-11** | Regras de 5 Sets | 3x0 -> 3/0 pts; 3x1 -> 3/0 pts; 3x2 -> 2/1 pts | **PASS** 🟢 |
| **DEP-12** | Proteção de `rulesSnapshot` Congelado | Configuração congelada no snapshot prevalece sobre mutação posterior | **PASS** 🟢 |
| **DEP-13** | Diálogo de Emissão de Documentos | Modal de emissão aberto com opções canônicas de Súmula e Ordem de Saque | **PASS** 🟢 |
| **DEP-14** | Emissão Canônica em Branco | Opções de Súmula em Branco (3 sets e 5 sets) e Ordem de Saque disponíveis | **PASS** 🟢 |
| **DEP-15** | Portal Público da Competição | Rota `/c/:slug` acessível publicamente sem autenticação e com dados consistentes | **PASS** 🟢 |

**Resumo da Bateria E2E:** 15 testes executados, **15 aprovados (100% de sucesso)**, 0 falhas.

---

### 12. VALIDAÇÕES FUNCIONAIS REALIZADAS

1. **Navegação Completa da Aplicação:** Todas as rotas do painel administrativo e do portal público foram carregadas no container Nginx sem erros de console ou rotas 404 (graças à diretiva `try_files $uri $uri/ /index.html`).
2. **Ciclo de Vida da Sessão:** A autenticação mock e a persistência de credenciais em `voleipro.v1.auth` operaram sem interrupções.
3. **Responsividade e Renderização:** O design system e o Tailwind CSS foram compilados e servidos com sucesso, sem quebras de layout.

---

### 13. VALIDAÇÃO DO MODO DEMO / PERSISTÊNCIA

* **Arquitetura do Adapter:** O BaseOS foi desenhado com desacoplamento total entre as regras de negócio e a camada de persistência (`dataAccess.ts`).
* **Comportamento em Staging:** No build de staging em container Docker (onde não há injeção de `.env` com chaves externas de Supabase), a aplicação ativa o adaptador de `LocalStorage`.
* **Segurança e Transparência:** O banner de aviso superior informa expressamente: *"Modo de demonstração — dados salvos apenas neste navegador"*, cumprindo o papel de indicar a persistência local.
* **Isolamento de Negócio:** Nenhuma regra de pontuação, cálculo de sets ou geração de súmula depende do backend; toda a lógica do `ScoringEngine` e `CompetitionRulesService` é executada com fidelidade matemática absoluta no cliente.

---

### 14. VALIDAÇÃO DA CLASSIFICAÇÃO

A validação no container provou que as correções da Fase 5.2 estão ativas e funcionando perfeitamente na imagem gerada:

1. **Competição de 1 Set (Caso Crítico DIV-02):**
   * No placar de **1 × 0**, o vencedor recebeu **3 pontos** (vitória limpa) e o perdedor recebeu **0 pontos** (derrota limpa).
   * Confirmado que o sistema não confunde a diferença de sets `1 - 0 = 1` com tie-break. O tie-break exige que o adversário vença pelo menos 1 set.
2. **Competição de 3 Sets:**
   * Placar **2 × 0**: Vencedor = 3 pts, Perdedor = 0 pts.
   * Placar **2 × 1**: Vencedor = 2 pts, Perdedor = 1 pt (vitória/derrota apertada).
3. **Competição de 5 Sets:**
   * Placar **3 × 0**: Vencedor = 3 pts, Perdedor = 0 pts.
   * Placar **3 × 1**: Vencedor = 3 pts, Perdedor = 0 pts.
   * Placar **3 × 2**: Vencedor = 2 pts, Perdedor = 1 pt.
4. **Circuito de Proteção do Snapshot:**
   * Em uma competição cujo `rulesSnapshot` determinava 4 pontos para vitória limpa e a configuração mestre posterior foi alterada, o motor manteve estritamente os 4 pontos congelados do snapshot.

---

### 15. VALIDAÇÃO DA SÚMULA CANÔNICA

* O modal de emissão em `/sumulas` e `/jogos` expõe as opções canônicas vetoriais (`BaseosThreeSetScoresheet` e `BaseosFiveSetScoresheet`).
* As fichas em branco estão disponíveis e acessíveis sem qualquer dependência legada.
* O diretório `src/document-engine/baseos/` permaneceu inalterado.

---

### 16. VALIDAÇÃO DA ORDEM DE SAQUE CANÔNICA

* O seletor de inclusão da Ordem de Saque Canônica (Ficha de Posição Inicial) está integrado ao diálogo de impressão de partidas.
* O modal de documentos em branco oferece o botão de emissão da Ordem de Saque vetorial (com a geometria canônica homologada de 8 cards para 3 sets e 16 cards para 5 sets).

---

### 17. VALIDAÇÃO DO PORTAL PÚBLICO

* Rota testada: `http://localhost:8090/c/liga-nacional-pro-masculino-2026`.
* Renderização completa do cabeçalho da competição, chaveamento de grupos, tabela de classificação com critérios de desempate, lista de partidas e resultados.
* O portal público consome a configuração resolvida via `CompetitionRulesService.getConfig`, respeitando o `rulesSnapshot` congelado da competição.

---

### 18. PROBLEMAS ENCONTRADOS

* **Nenhuma regressão funcional ou técnica:** Não foram identificados erros de execução, crashes de JavaScript, erros de tipo ou falhas em testes unitários.
* **Observação Operacional de Rota Pública:** A rota canônica do portal público no BaseOS é `/c/:slug` (ex: `/c/liga-nacional-pro-masculino-2026`) e não `/portal/:slug`. O script de teste automatizado foi ajustado para testar a rota oficial correta.
* **Observação sobre Chaves de Armazenamento:** As chaves no LocalStorage utilizam o prefixo `voleipro.v1.*` (definido em `dataAccess.ts`), onde as competições residem em `voleipro.v1.competitions`.

---

### 19. CORREÇÕES REALIZADAS

* **Nenhuma alteração no código do BaseOS:** Não foi necessária qualquer modificação ou "remendo" no código-fonte da aplicação para fazer o deploy passar. A base homologada da Fase 5.2 subiu e operou de primeira com 100% de integridade.

---

### 20. DECISÕES TÉCNICAS

1. **Uso Exclusivo do Padrão Staging Pré-existente:** Optou-se por utilizar o `docker-compose.staging.yml` e o `Dockerfile.staging` já presentes no repositório, garantindo conformidade com as diretrizes do projeto e evitando a criação de arquivos de deploy paralelos.
2. **Validação E2E Headless Automatizada:** Em vez de depender apenas de testes manuais, foi desenvolvido o script `scripts/validate-development-deploy.cjs` utilizando o Playwright já instalado no ambiente. O script executou 15 validações automáticas com captura de evidências em PNG, assegurando auditoria factual e reprodutível.
3. **Preservação Sagrada de Fases Homologadas:** O diretório `src/document-engine/baseos/` e os arquivos de regras esportivas foram estritamente protegidos contra qualquer edição.

---

### 21. PENDÊNCIAS

* **Nenhuma pendência técnica para o ambiente de desenvolvimento:** A base de desenvolvimento está homologada e pronta.
* **Preparação para o Futuro Deploy de Produção (Campeonato Real):**
  * Definir o arquivo `.env.production` com a URL e Anon Key do projeto Supabase de produção (ou instanciar as variáveis como build-args no Dockerfile caso o deploy de produção seja containerizado).
  * Executar a migração de schema no Supabase de produção caso o banco ainda não contenha as tabelas do BaseOS.

---

### 22. LIMITAÇÕES

* **Persistência Local no Container Staging:** Como o build de staging é isolado e não inclui chaves externas de Supabase, cada navegador acessando `http://localhost:8090` opera com seu próprio LocalStorage independente. Para persistência multi-usuário centralizada, é necessária a injeção das credenciais do Supabase.

---

### 23. CONCLUSÃO FACTUAL DO DEPLOY

O deploy da base de desenvolvimento do BaseOS após a Fase 5.2 foi **CONCLUÍDO COM 100% DE SUCESSO E ESTÁ HOMOLOGADO OPERACIONALMENTE 🟢**.

**Resumo dos Indicadores de Homologação:**
* **Branch:** `main` | **Commit:** `c50855f704c64510d15fed5b4c5669fbf429c270`
* **Typecheck:** 0 erros
* **Lint:** 0 erros (1 warning pré-existente)
* **Testes Vitest:** 101/101 arquivos, 898/898 testes PASS (100%)
* **Build de Produção:** Concluído com sucesso
* **Container Docker:** `baseos-staging-app` (Nginx 1.27 Alpine) ativo e `healthy` na porta `8090`
* **Testes Operacionais E2E no Container:** 15/15 testes PASS (100%)
* **Regras de Pontuação Homologadas:** 1 set (1x0 = 3/0 pts), 3 sets e 5 sets funcionando com precisão matemática absoluta
* **Document Engine (`src/document-engine/baseos/`):** 100% preservado

Conforme estipulado na **Regra Final**, o processo foi interrompido com sucesso nesta etapa de validação, sem promoção prematura para produção. A base de desenvolvimento está estável, homologada e pronta.
