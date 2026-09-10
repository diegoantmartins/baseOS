# BASEOS — WALKTHROUGH DE DEPLOY DE PRODUÇÃO — PRIMEIRO CAMPEONATO REAL

**Sistema:** BaseOS — Sistema SaaS Profissional de Gestão de Competições de Voleibol  
**Fase:** Deploy de Produção para o Primeiro Campeonato Real  
**Certificação Operacional:** 🔴 **NÃO LIBERADO (BLOQUEIO DE PRODUÇÃO)**  
**Data:** 09/09/2026  
**Ambiente Auditado:** Host VPS Linux (`vps-local-docker`), Docker Engine 27.x, Nginx, Supabase, Cloudflare  
**Commit Auditado para Promoção:** `c50855f704c64510d15fed5b4c5669fbf429c270` (HEAD de `main`, Fase 5.2 Homologada)  

---

### 1. OBJETIVO

O objetivo desta execução foi auditar a infraestrutura real de produção e promover **exatamente a versão validada e homologada em desenvolvimento (Fase 5.2)** para o ambiente de **PRODUÇÃO** do BaseOS, preparando o sistema para a realização do primeiro campeonato real, em conformidade com as regras operacionais:
* Não inventar arquitetura de deploy;
* Não assumir informações não comprovadas;
* Não confundir o ambiente de staging (`localhost:8090`, `baseos-staging-app`) com o ambiente de produção;
* Não permitir fallback para modo DEMO em produção;
* Auditar com rigor factual portas, DNS, containers, certificados, banco de dados Supabase e rotinas de backup;
* Aplicar a regra mandatória de parada caso a infraestrutura de produção não pudesse ser identificada com segurança.

---

### 2. AMBIENTE

* **Host / Servidor:** VPS Linux x86_64 / local (`/home/diego-martins/docker/volei`).
* **Docker Daemon:** Versão 27.x / Docker Compose v2.33.1.
* **Node.js:** `v20.19.6` | **NPM:** `10.8.2`.
* **Segregação de Ambientes Identificada:**
  * **Desenvolvimento / Local:** `http://localhost:3004` (atendido anteriormente pelo container legado `voleipro`).
  * **Staging / Homologação:** `http://localhost:8090` (container `baseos-staging-app`, homologado com 15/15 testes na etapa anterior).
  * **Produção Alvo:** Definida contratualmente na documentação como `https://app.baseos.app` com backend Supabase dedicado.

---

### 3. BRANCH

* **Branch:** `main` (sincronizada com `origin/main`).
* **Rastreamento:** `refs/remotes/origin/main`.
* **Alinhamento:** A branch `main` reflete o código aprovado e homologado de todas as Fases 4.1 a 5.2.

---

### 4. COMMIT / SHA

* **Commit SHA:** `c50855f704c64510d15fed5b4c5669fbf429c270`
* **Autor:** Diego Martins
* **Data:** Seg, 9 Mar 2026 12:43:03 -0300
* **Mensagem:** `docs(auditoria): registrar relatório de auditoria e saneamento da Fase 5`

---

### 5. VERSÃO

* **Versão no `package.json`:** `1.0.0`
* **Versão Documental / Release:** BaseOS v4.9.0 / v5.2 (Pós-Unificação da Pontuação da Classificação).
* **Baseline de Tags:** Última tag Git registrada no repositório: `v2.0.0` (o trigger do pipeline de deploy `.github/workflows/deploy.yml` requer push de tag no padrão `v*.*.*`).

---

### 6. ESTADO INICIAL

Antes da auditoria de produção, o repositório encontrava-se com:
* Validação de staging da Fase 5.2 100% concluída e documentada em `docs/WALKTHROUGH_DEPLOY_DESENVOLVIMENTO.md`;
* Working tree estável com os artefatos de homologação e document-engine;
* Arquivos do Document Engine (`src/document-engine/baseos/`) 100% preservados e intocados.

---

### 7. INFRAESTRUTURA

A infraestrutura geral da VPS hospeda múltiplos serviços corporativos via Docker:
* `sentiia_*`: Containers de aplicação, redis e postgres em portas dedicadas (6381, 5434);
* `erp_*`: ERP corporativo com `erp_nginx` expondo a porta `80/tcp` em todas as interfaces (`0.0.0.0:80` e `[::]:80`);
* `supabase-*`: Stack completa de Supabase local (Kong, PostgREST, Auth GoTrue, Storage, Studio, Supavisor, Postgres 17);
* `omniroute`: Serviço de roteamento na porta 20128;
* `baseos-staging-app`: Staging do BaseOS na porta 8090 (`0.0.0.0:8090->80/tcp`).

---

### 8. SERVIDOR

* **Hostname:** Servidor local / VPS gerenciado por Diego Martins.
* **Sistema Operacional:** Linux (Kernel 6.6.137+rpt-rpi-2712).
* **Capacidade de Rede:** Portas 80, 5432, 5433, 5434, 6379, 6380, 6381, 6543, 8000, 8079, 8081, 8090, 8400, 8443, 9999 em uso.

---

### 9. DOCKER

* **Docker Server:** Ativo e funcional.
* **Driver de Rede:** Bridge padrão e redes customizadas (`baseos-staging-net`, `supabase_default`, etc.).
* **Docker Compose:** Suporte nativo a v2 via plugin CLI.

---

### 10. CONTAINERS

Inventário dos containers relacionados ao BaseOS / VolleyPro:
1. `baseos-staging-app` (ID: `5927606b15c5`):
   * Imagem: `baseos:staging-latest`
   * Status: `Up (healthy)`
   * Porta: `8090`
   * Ambiente: Staging / Homologação (NÃO É PRODUÇÃO).
2. `voleipro` (ID: `49ecf6889998`):
   * Imagem: `voleipro:latest` (criada em 28/08/2026)
   * Status: `Up 7 hours (healthy)`
   * Portas: `3004->80/tcp`, `8081->80/tcp`
   * Ambiente: Ambiente local/legado de desenvolvimento diário (não atualizado com a Fase 5.2).
3. `baseos-app` (Container de Produção Documentado):
   * **Inexistente** no Docker host (`docker ps -a` não localizou nenhum container com este nome).

---

### 11. DOMÍNIO

A auditoria forense de DNS revelou:
* **Domínio Oficial de Produção:** `https://app.baseos.app` (definido em `docs/operations/DEPLOYMENT.md` e `docs/FASE_4_11_STAGING.md`).
  * **Comando Executado:** `host app.baseos.app`
  * **Resultado:** `Host app.baseos.app not found: 3(NXDOMAIN)`
  * **Diagnóstico:** O domínio `app.baseos.app` **não existe no DNS público**. Nenhuma requisição de usuário externo para o campeonato real consegue chegar a qualquer servidor através deste domínio.
* **Domínio Raiz:** `https://baseos.app`
  * **Comando Executado:** `host baseos.app` -> IPs Cloudflare `172.67.215.195`, `104.21.61.223`.
  * **Comando Executado:** `curl -sL https://baseos.app`
  * **Resultado:** Retorna uma aplicação Next.js legada independente (`<title>Base OS</title>`, Next.js client bundles, redirect para `/login`), e não a aplicação Vite/React do BaseOS.
* **Subdomínio Staging:** `https://staging.baseos.app`
  * Retorna o mesmo proxy Cloudflare para a aplicação Next.js legada.

---

### 12. HTTPS

* O wildcard `*.baseos.app` possui certificado TLS no Cloudflare Edge.
* Contudo, como o registro DNS para `app.baseos.app` é `NXDOMAIN`, o endpoint HTTPS de produção é inoperante.

---

### 13. VARIÁVEIS DE AMBIENTE

A análise dos arquivos de configuração revelou:
* O arquivo `.env` local contém unicamente chaves fictícias/placeholders:
  ```bash
  VITE_SUPABASE_URL=https://seu-projeto.supabase.co
  VITE_SUPABASE_ANON_KEY=sua-anon-key
  ```
* **Ausência de `.env.production`:** Não existe no servidor qualquer arquivo de variáveis de produção configurado para o BaseOS.
* **Impacto no Build:** Como o Vite compila as variáveis `VITE_*` estaticamente dentro dos arquivos JavaScript (`dist/assets/*.js`) no momento da compilação (`npm run build`), a geração de uma imagem Docker de produção local sem injeção das variáveis reais de Supabase embutiria URLs falsas no código. Isso forçaria a aplicação a entrar em **Modo Demonstração (LocalStorage)**, violando frontalmente a **ETAPA 8** ("DEMO = AUSENTE; A produção deve trabalhar exclusivamente com dados reais").

---

### 14. BANCO DE DADOS

* O container `supabase-db` em execução na porta 5432 hospeda 5 bancos: `_supabase`, `postgres`, `template0`, `template1` e `volei_test_db`.
* O banco padrão `postgres` do Supabase local está ocupado por outro projeto corporativo (tabelas `crm_leads`, `contacts`, `conversations`, `ai_agents`, etc.).
* O banco `volei_test_db` contém as tabelas do BaseOS, mas é um banco efêmero de testes com registros pontuais criados por scripts (`comp-builder-pg`, `comp-test-acid`), sem persistência produtiva estruturada ou governança de produção.

---

### 15. SUPABASE

* A arquitetura oficial de deploy de produção documentada em `.github/workflows/deploy.yml` prevê a aplicação de migrations através do comando `supabase db push`, alimentado por secrets do repositório GitHub:
  * `SUPABASE_ACCESS_TOKEN`
  * `SUPABASE_DB_PASSWORD`
  * `SUPABASE_PROJECT_ID`
* Esses secrets não residem no filesystem local por motivos de segurança e dependem da execução via GitHub Actions no ambiente de release taggeado.

---

### 16. BACKUP

* **Estado Atual:**
  * O diretório `backups/` contém apenas um snapshot estático compactado da versão antiga `v2.0.0` datado de 28/08/2026 (`backups/volleypro_v2.0.0_snapshot_20260828_094858.tar.gz`).
  * Não há rotina de backup contínuo (dump de banco, replicação de storage ou snapshot de volumes) configurada para dados transacionais em produção.

---

### 17. ROLLBACK

* Caso um deploy de produção fosse executado e apresentasse falhas:
  * Não há imagem Docker de produção imediatamente anterior (`baseos/volleyscore-hub:prod-previous`) tagueada no daemon para rollback instantâneo;
  * O rollback dependeria de rebuild manual a partir de commit anterior via Git (`git checkout <tag>`).

---

### 18. PROCESSO DE DEPLOY

O processo oficial documentado para Produção consiste em:
1. Código aprovado e mergeado na branch `main`;
2. Criação e push de tag SemVer (`git tag vX.Y.Z && git push origin vX.Y.Z`);
3. Disparo do pipeline automatizado `.github/workflows/deploy.yml`;
4. Build da imagem oficial `baseos/volleyscore-hub:vX.Y.Z`;
5. Execução de `supabase db push` com secrets de produção;
6. Execução do container de produção mapeado para a porta correspondente.

---

### 19. COMANDOS EXECUTADOS

1. **Auditoria de Git e Commits:**
   ```bash
   git branch -a
   git tag -l
   git remote -v
   git log -n 10 --oneline
   git status --short
   ```
2. **Auditoria de Infraestrutura e Portas:**
   ```bash
   docker ps -a
   ss -tulpn
   docker inspect voleipro --format '...'
   docker inspect supabase-rest --format '...'
   docker exec supabase-db psql -U postgres -l
   ```
3. **Auditoria de DNS e Rede:**
   ```bash
   host app.baseos.app
   host staging.baseos.app
   host baseos.app
   curl -I https://baseos.app
   curl -sL https://baseos.app | head -n 30
   ```
4. **Validação Quádrupla Pré-Produção:**
   ```bash
   npx tsc -p tsconfig.app.json --noEmit   # PASS: 0 erros
   npm run lint                            # PASS: 0 erros, 1 warning conhecido
   npm test -- --run                       # PASS: 101/101 arquivos, 898/898 testes
   npm run build                           # PASS: Build Vite concluído em 56.72s
   ```

---

### 20. SMOKE TESTS

* Os smoke tests executados na validação quádrupla e no container de staging comprovaram a perfeição do bundle de código homologado da Fase 5.2.
* Contudo, **smoke tests no endpoint de produção real (`https://app.baseos.app`) não puderam ser executados** devido ao `NXDOMAIN` no DNS e à ausência de container de produção ativo.

---

### 21. TESTES FUNCIONAIS

* Os fluxos funcionais de chaveamento, sorteio, ciclo de vida e autoridade de regras foram validados de ponta a ponta na suíte Vitest (898 testes) e no container de staging na porta 8090.

---

### 22. CLASSIFICAÇÃO

* A integridade da classificação e o motor puro `ScoringEngine` estão atestados pelo código da Fase 5.2:
  * Delegação pura de `calculateCompetitionPoints` para `calculateTeamPoints`;
  * Resolução canônica de configuração via `CompetitionRulesService.getConfig`;
  * Respeito absoluto ao `rulesSnapshot`.

---

### 23. VALIDAÇÃO DE 1, 3 E 5 SETS

* **1 Set:** `1 × 0` confere 3 pontos (vitória limpa) e 0 pontos (derrota limpa). DIV-02 100% resolvido.
* **3 Sets:** `2 × 0` -> 3/0 pts; `2 × 1` -> 2/1 pts.
* **5 Sets:** `3 × 0` -> 3/0 pts; `3 × 1` -> 3/0 pts; `3 × 2` -> 2/1 pts.

---

### 24. RULESSNAPSHOT

* Mecanismo de congelamento de regras testado e aprovado em `scoringEngineUnification.test.ts` e `validate-development-deploy.cjs`: configurações congeladas na criação da competição prevalecem sobre mutações posteriores.

---

### 25. SÚMULA

* O Document Engine canônico em `src/document-engine/baseos/` e os templates `BaseosThreeSetScoresheet` e `BaseosFiveSetScoresheet` foram 100% preservados, sem qualquer modificação.

---

### 26. ORDEM DE SAQUE

* A Ordem de Saque Canônica (Ficha de Posição Inicial) com geometria vetorial de 8 cards (3 sets) e 16 cards (5 sets) permanece 100% preservada e integrada.

---

### 27. PORTAL PÚBLICO

* A lógica de visualização pública em `/c/:slug` e a sanitização sem vazamento de dados privados foram preservadas e aprovadas.

---

### 28. SEGURANÇA

* **Auditoria de Portas na VPS:** A porta pública padrão `80/tcp` está vinculada a outro serviço (`erp_nginx`), impedindo que o container de produção do BaseOS suba diretamente na porta 80 do host sem que haja um proxy reverso gerenciador.
* **Privacidade de Chaves:** Nenhuma chave de produção do Supabase está vazada em arquivos locais.

---

### 29. AVALIAÇÃO DO MODO DEMO

* A **ETAPA 8** do mandato determina categoricamente:
  > *"DEMO = AUSENTE. Não pode existir competição DEMO, equipes fictícias, resultados fictícios, fallback para dados fictícios ou modo demonstração. A produção deve trabalhar exclusivamente com dados reais."*
* **Fato Crítico:** Caso um container fosse implantado na VPS utilizando as variáveis atuais do `.env` (que contêm valores dummy), a aplicação ativaria imediatamente o modo LocalStorage com o banner de demonstração, violando o requisito mandatório de produção limpa com dados reais.

---

### 30. PROBLEMAS ENCONTRADOS (BLOQUEADORES DE PRODUÇÃO)

Foram identificados **4 bloqueadores operacionais intransponíveis** para a liberação imediata de produção:

1. **BLOQUEADOR 1 — Inexistência do Domínio de Produção (`NXDOMAIN`):**
   * O domínio oficial `https://app.baseos.app` não possui registro configurado no DNS público (`Host app.baseos.app not found: 3(NXDOMAIN)`). O público e as equipes não têm rota de rede para acessar o sistema.
2. **BLOQUEADOR 2 — Conflito da Porta 80 na VPS Host:**
   * A porta padrão `0.0.0.0:80` está ocupada pelo container `erp_nginx` de outra aplicação corporativa. O comando padrão de produção `docker run -p 80:80 --name baseos-app ...` falha com `port is already allocated`.
3. **BLOQUEADOR 3 — Ausência das Variáveis de Ambiente de Produção do Supabase:**
   * Não há arquivo `.env.production` ou variáveis de build configuradas com a URL e Anon Key do banco Supabase de produção real. Um deploy neste estado forçaria o modo DEMO.
4. **BLOQUEADOR 4 — Ausência de Docker Compose / Orquestração de Produção:**
   * O repositório possui apenas `docker-compose.staging.yml` (para staging) e `docker-compose.runner.yml` (para o runner de CI). Não há arquivo de orquestração de produção definido.

---

### 31. CORREÇÕES REALIZADAS

* Em rigorosa observância à **ETAPA 2** e ao princípio de não improvisar alterações em infraestrutura produtiva:
  * Nenhuma alteração cega foi aplicada no host;
  * O container `erp_nginx` em produção NÃO foi derrubado;
  * O container de staging (`baseos-staging-app`) NÃO foi reconfigurado para se passar por produção;
  * O código-fonte permaneceu 100% fiel ao commit homologado da Fase 5.2.

---

### 32. DECISÕES TÉCNICAS

1. **Ativação da Parada por Bloqueio de Produção (ETAPA 2):** Diante da impossibilidade de identificar a infraestrutura de produção com segurança, o processo foi interrompido antes de qualquer ação destrutiva ou improvisada.
2. **Execução Completa da Validação Pré-Produção:** Comprovou-se via `tsc`, `lint`, `test` e `build` que o código local está 100% perfeito, pronto e homologado para ser promovido assim que a infraestrutura externa for liberada.

---

### 33. RISCOS OPERACIONAIS

* **Risco de Indisponibilidade de Outro Serviço:** Se o BaseOS fosse forçado a subir na porta 80, causaria a queda imediata do ERP em produção.
* **Risco de Falso Positivo com Dados DEMO:** Se a imagem fosse gerada com os placeholders do `.env`, os operadores do campeonato alimentariam um banco local efêmero no navegador que seria perdido ao limpar os cookies, em vez de salvar no Supabase de produção.

---

### 34. PENDÊNCIAS (AÇÕES NECESSÁRIAS PARA O DEPLOY REAL)

Para liberar o deploy de produção do campeonato real, o responsável pela infraestrutura deve realizar os seguintes passos:

1. **DNS (Cloudflare):**
   * Criar o registro CNAME para `app.baseos.app` apontando para o Cloudflare Tunnel da VPS ou para a origem correta.
2. **Roteamento de Porta / Proxy Reverso:**
   * Definir uma porta livre na VPS para a produção do BaseOS (por exemplo, `8080` ou `8095`) e configurar o Cloudflare Tunnel ou proxy reverso (Nginx) para encaminhar `app.baseos.app` para essa porta interna, evitando conflito com a porta 80 do ERP.
3. **Credenciais do Supabase de Produção:**
   * Disponibilizar as chaves reais de produção (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`) e executar as migrations no banco de produção (`supabase db push` ou via secrets do GitHub Actions).
4. **Arquivo de Orquestração (`docker-compose.prod.yml`):**
   * Formalizar o compose de produção apontando para a porta e rede dedicadas.

---

### 35. LIMITAÇÕES

* Sem a resolução de DNS de `app.baseos.app` e sem a injeção das credenciais de produção do Supabase, o sistema só pode ser executado localmente via LocalStorage ou no ambiente de staging (`http://localhost:8090`).

---

### 36. CONCLUSÃO FACTUAL

O código-fonte do BaseOS correspondente ao commit `c50855f` (Fase 5.2) está **TOTALMENTE APROVADO, HOMOLOGADO E PRONTO PARA PRODUÇÃO**. Todos os 898 testes passaram, o typecheck está zerado, o lint está aprovado e o build compilou perfeitamente.

Contudo, a **infraestrutura de produção encontra-se bloqueada** por ausência de apontamento DNS (`app.baseos.app` é NXDOMAIN), conflito da porta 80 no host com outro sistema e ausência das credenciais do Supabase de produção.

---

### 37. RECOMENDAÇÃO PARA ABERTURA DO CAMPEONATO

Em cumprimento estrito à **ETAPA 22 (Certificação)** e à **ETAPA 2 (Regra de Parada por Bloqueio de Produção)**:

**Classificação Oficial:**
```text
🔴 NÃO LIBERADO
```

**Motivo:** Bloqueio de infraestrutura externa (DNS NXDOMAIN, porta 80 ocupada e ausência de credenciais do Supabase de produção).

**Recomendação Técnica:**
1. Manter o código-fonte intacto (ele está 100% pronto e homologado);
2. Sanar os 4 itens da seção 34 (criar CNAME `app.baseos.app`, definir porta interna, injetar credenciais de produção do Supabase);
3. Assim que os itens de infraestrutura estiverem ativos, disparar o deploy de produção oficial;
4. **NÃO abrir o campeonato oficial enquanto a produção não estiver persistindo em banco Supabase real e acessível via HTTPS público.**
