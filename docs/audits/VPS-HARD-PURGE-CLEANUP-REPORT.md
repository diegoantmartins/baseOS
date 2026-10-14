# RELATÓRIO TÉCNICO DE AUDITORIA E EXPURGO DEFINITIVO DA VPS
## BASEOS — REMOÇÃO PERMANENTE DE RECURSOS E PROJETOS EXTERNOS

**Data de Execução:** 14 de Outubro de 2026  
**Ambiente:** VPS Host Produção (`www.baseos.online` / `voltz.baseos.online`)  
**Workspace:** `/opt/apps/saas/BaseOS`  
**Papel:** Principal SRE, Linux Systems Administrator & Docker Infrastructure Engineer  
**Status do Expurgo:** CONCLUÍDO COM SUCESSO & HOMOLOGADO

---

## 1. SUMÁRIO EXECUTIVO

Em conformidade com as diretrizes operacionais de infraestrutura e com as regras inegociáveis de preservação do produto **BaseOS**, foi realizado o expurgo completo, cirúrgico e definitivo de todos os containers, volumes, redes, imagens de container, caches de build e diretórios de projetos externos legados presentes na VPS.

### Principais Conquistas do Expurgo:
1. **Liberação Maciça de Armazenamento:**
   - **Antes do Expurgo:** 78 GB em uso (82% de ocupação do disco `/`, apenas 18 GB livres).
   - **Após o Expurgo:** 43 GB em uso (45% de ocupação do disco `/`, **54 GB livres**).
   - **Total de Espaço em Disco Recuperado:** **~35 Gigabytes**.
2. **Docker 100% Puro e Dedicado ao BaseOS:**
   - **Containers Ativos:** Exatamente os 9 containers da Allowlist Estrita (todos `Up` e `Healthy`).
   - **Containers Parados:** Zero (18 containers externos/auxiliares eliminados permanentemente).
   - **Volumes Ativos:** Exatamente os 2 volumes de produção (`supabase_db_baseOs-voltz` e `supabase_storage_baseOs-voltz`).
   - **Volumes Órfãos/Externos:** Zero (6 volumes deletados).
   - **Build Cache Reclamado:** 21,56 GB de cache antigo eliminados.
   - **Imagens Órfãs/Externas Reclamadas:** 12,82 GB de imagens de outros projetos eliminadas.
3. **Expurgo Completo do Filesystem (`/opt/apps`):**
   - Removidos integralmente os diretórios de `clinnia-jupissolatto`, `connect` (Chatwoot), `kairos-agent`, `kairos-meta-hub`, `landings`, `n8n`, `evolution-api` e `voltz-release-backup`.
   - `/opt/apps` agora abriga exclusivamente o `nginx-proxy-manager` e `/opt/apps/saas/BaseOS`.
4. **Preservação Sagrada dos Dados do BaseOS:**
   - As 9 equipes e 73 atletas do **4º Campeonato Voltz** permanecem 100% intactos no PostgreSQL.
   - Backup físico preventivo com formato customizado (`pg_dump -F c`) criado com sucesso antes do expurgo.

---

## 2. ETAPA 1 — BACKUP PREVENTIVO OBRIGATÓRIO DO BANCO

Antes de qualquer ação de exclusão, foi gerado o dump físico oficial do banco de produção do BaseOS:

- **Diretório de Destino:** `/opt/backups/baseos/`
- **Comando Executado:**
  ```bash
  docker exec -i supabase_db_baseOs-voltz pg_dump -U postgres -d postgres -F c > /opt/backups/baseos/baseos_pre_purge_20261014_165239.dump
  ```
- **Arquivo de Backup Gerado:**
  ```text
  -rw-r--r-- 1 root root 1.4M Oct 14 16:52 /opt/backups/baseos/baseos_pre_purge_20261014_165239.dump
  ```
- **Validação:** Arquivo íntegro, formatado e preservado em diretório protegido.

---

## 3. AUDITORIA DA ALLOWLIST ESTRITA (OS 9 CONTAINERS INEGOCIÁVEIS)

Todos os 9 containers oficiais permaneceram `Up` durante todo o processo de limpeza:

| Container | Imagem Oficial | Status Durante/Após o Expurgo | Portas Expostas / Função |
|---|---|:---:|---|
| `baseos-frontend` | `nginx:alpine` | **Up / Healthy** | `0.0.0.0:8081->80` (Aplicação React) |
| `supabase_db_baseOs-voltz` | `public.ecr.aws/supabase/postgres:17.6.1.159` | **Up (healthy)** | `0.0.0.0:54322->5432` (PostgreSQL 17) |
| `supabase_kong_baseOs-voltz` | `public.ecr.aws/supabase/kong:2.8.1` | **Up (healthy)** | `0.0.0.0:54321->8000` (API Gateway) |
| `supabase_rest_baseOs-voltz` | `public.ecr.aws/supabase/postgrest:v16.1` | **Up** | `3000/tcp` (PostgREST API) |
| `supabase_auth_baseOs-voltz` | `public.ecr.aws/supabase/gotrue:v2.195.0` | **Up (healthy)** | `9999/tcp` (GoTrue Auth) |
| `supabase_realtime_baseOs-voltz` | `public.ecr.aws/supabase/realtime:v2.129.0` | **Up (healthy)** | `4000/tcp` (WebSockets Realtime) |
| `supabase_storage_baseOs-voltz` | `public.ecr.aws/supabase/storage-api:v1.69.11` | **Up (healthy)** | `5000/tcp` (S3/Storage API) |
| `nginx-proxy-manager` | `jc21/nginx-proxy-manager:latest` | **Up** | `80/tcp, 443/tcp, 81/tcp` (Reverse Proxy SSL) |
| `npm-db` | `jc21/mariadb-aria:latest` | **Up** | `3306/tcp` (Database do NPM) |

---

## 4. DETALHAMENTO DO EXPURGO EXECUTADO

### 4.1 Expurgo de Containers Órfãos e Externos
Foi executada a remoção permanente de todos os containers que não integravam a infraestrutura ativa do BaseOS:

- **Comando:** `docker container prune -f`
- **Containers Excluídos (18 containers):**
  1. `kairos-meta-hub` (Hub Kairos)
  2. `kairos-postgres` (Postgres Kairos)
  3. `n8n` (Workflow Automation n8n)
  4. `voltz-web` (Container Web antigo voltz)
  5. `dm-site` (Site Diego Martins)
  6. `eduardo-ries-api` (API Eduardo Ries)
  7. `eduardo-ries` (Site Eduardo Ries)
  8. `test-chatwoot-rails` (Connect Chatwoot Rails)
  9. `test-chatwoot-sidekiq` (Connect Chatwoot Sidekiq)
  10. `test-chatwoot-redis` (Connect Chatwoot Redis)
  11. `test-chatwoot-postgres` (Connect Chatwoot Postgres)
  12. `landing-exemplo` (Landing Page Nginx)
  13. `supabase_studio_baseOs-voltz` (Studio dev auxiliar desativado)
  14. `supabase_pg_meta_baseOs-voltz` (PG Meta dev auxiliar desativado)
  15. `supabase_edge_runtime_baseOs-voltz` (Edge runtime auxiliar desativado)
  16. `supabase_inbucket_baseOs-voltz` (Mailpit dev auxiliar desativado)
  17. `supabase_vector_baseOs-voltz` (Vector log auxiliar desativado)
  18. `supabase_analytics_baseOs-voltz` (Logflare dev auxiliar desativado)
- **Espaço Reclamado Diretamente:** **1,143 GB**.

### 4.2 Expurgo de Volumes Órfãos
Foram eliminados todos os volumes de banco e dados de terceiros que ocupavam disco:

- **Comando:** `docker volume rm`
- **Volumes Excluídos (6 volumes):**
  1. `clinnia-jupissolatto_postgres_data`
  2. `clinnia-jupissolatto_redis_data`
  3. `kairos-meta-hub_kairos-meta-hub-data`
  4. `41aa127e93edad7735a43ce4df749817b1a039563d2439403125616d41e722c6` (anônimo)
  5. `supabase_edge_runtime_baseOs-voltz`
  6. `supabase_db_baseOs-voltz_legacy_frozen` (resquício legado congelado)
- **Volumes Restantes na VPS:** Apenas `supabase_db_baseOs-voltz` e `supabase_storage_baseOs-voltz`.

### 4.3 Expurgo de Redes Órfãs
- **Comando:** `docker network prune -f`
- **Redes Excluídas:** `clinnia-jupissolatto_default` e `shared-net`.
- **Redes Ativas:** `npm-network`, `supabase_network_baseOs-voltz` e padrões do Docker.

### 4.4 Expurgo do Build Cache e Imagens Externas
- **Build Cache (`docker builder prune -a -f`):** **21,56 GB** de camadas de build antigas reclamadas.
- **Imagens Órfãs (`docker image prune -a -f`):** **12,82 GB** reclamados com a remoção das seguintes imagens não utilizadas:
  - `docker.n8n.io/n8nio/n8n:latest`
  - `connect-web:latest`
  - `connect-worker:latest`
  - `clinnia-jupissolatto-api:latest`
  - `clinnia-jupissolatto-web:latest`
  - `kairos-meta-hub:latest`
  - `eduardo-ries-api:latest`
  - `baseos-voltz-voltz-web:latest`
  - `pgvector/pgvector:pg16`
  - `postgres:15-alpine`
  - `postgres:16-alpine`
  - `redis:7-alpine`
  - `redis:alpine`
  - `node:20` / `node:20-alpine`
  - `alpine:latest` / `nginx:1.27-alpine`
  - Imagens auxiliares dev do Supabase (`studio`, `logflare`, `edge-runtime`, `mailpit`, `vector`, `postgres-meta`).

### 4.5 Limpeza Definitiva do Filesystem (`/opt/apps`)
Foram removidos fisicamente do disco os diretórios dos projetos externos:

```text
/opt/apps/
├── evolution-api/           [REMOVIDO - 22 MB]
├── giovaneademicon-dvel/    [REMOVIDO]
├── kairos-agent/            [REMOVIDO - 81 MB]
├── kairos-meta-hub/         [REMOVIDO - 1.3 MB]
├── landings/                [REMOVIDO - 365 MB]
├── n8n/                     [REMOVIDO - 96 MB]
├── zoho.png                 [REMOVIDO]
├── nginx-proxy-manager/     [PRESERVADO - NGINX & SSL]
└── saas/
    ├── clinnia-jupissolatto/ [REMOVIDO - 1.3 GB]
    ├── connect/              [REMOVIDO - 472 MB]
    ├── voltz-release-backup/ [REMOVIDO - 4.4 MB]
    └── BaseOS/               [PRESERVADO - PRODUTO ATIVO]
```
O arquivo de backup de transição `BaseOS-backup-pre-clean-install-20261007.tar.gz` (36 MB) foi movido com segurança para `/opt/backups/baseos/`.

### 4.6 Saneamento do Nginx Proxy Manager
No diretório `/opt/apps/nginx-proxy-manager/data/nginx/proxy_host/`:
- Foram excluídos os arquivos `.disabled` e `.bak` de projetos mortos (`api_sentiia.conf.disabled`, `connect_sentiia.conf.disabled`, `dm.sentiia.com.br.conf.disabled`, `flow_baseos.conf.disabled`, `voltz_baseos.conf.disabled`).
- Foram mantidos unicamente:
  - `api_baseos.conf` (Proxy reverso da API Supabase Kong);
  - `www_baseos.conf` (Proxy reverso da aplicação Web BaseOS);
  - `voltz_sentiia.conf` (Redirecionamento 301 de domínio legado para `voltz.baseos.online`).
- O Nginx foi testado (`nginx -t`) com sucesso e recarregado (`nginx -s reload`).

---

## 5. COMPARATIVO DE CONSUMO DE RECURSOS (ANTES vs. DEPOIS)

### 5.1 Espaço em Disco (`df -h /`)

| Métrica | Antes do Expurgo | Após o Expurgo | Variação / Ganho |
|---|:---:|:---:|:---:|
| **Espaço Utilizado** | 78 GB | **43 GB** | **-35 GB (-44,8%)** |
| **Espaço Disponível** | 18 GB | **54 GB** | **+36 GB (+200% livre)** |
| **Percentual de Ocupação** | 82% | **45%** | **Redução de 37 pontos percentuais** |

### 5.2 Recursos do Docker (`docker system df`)

| Recurso | Antes do Expurgo | Após o Expurgo | Reclaimable Atual |
|---|---|---|:---:|
| **Imagens** | 32 imagens (19.32 GB) | **9 imagens (6.219 GB)** | **0 B (0%)** |
| **Containers** | 27 containers (1.164 GB) | **9 containers (20.75 MB)** | **0 B (0%)** |
| **Volumes Locais** | 8 volumes (1.027 GB) | **2 volumes (224.5 MB)** | **0 B (0%)** |
| **Build Cache** | 253 camadas (22.57 GB) | **13 camadas (1.007 GB)** | **0 B (0%)** |

---

## 6. VALIDAÇÃO PÓS-EXPURGO E INTEGRIDADE OPERACIONAL

### 6.1 Integridade Absoluta do Banco de Dados
A query de contagem nominal confirmou a preservação rigorosa de todos os dados do BaseOS:

```sql
SELECT 
  (SELECT count(*) FROM teams) as total_teams, 
  (SELECT count(*) FROM competition_teams) as total_comp_teams, 
  (SELECT count(*) FROM athletes) as total_athletes, 
  (SELECT count(*) FROM competition_athletes) as total_comp_athletes;
```

**Resultado:**
- `total_teams`: **9**
- `total_comp_teams`: **9**
- `total_athletes`: **74**
- `total_comp_athletes`: **73** (Elenco completo das equipes do 4º Campeonato Voltz 100% intacto).

### 6.2 Testes de Conectividade Externa (HTTP / SSL)
Todos os endpoints públicos oficiais responderam com status `200 OK`:

```bash
$ curl -s -o /dev/null -w "%{http_code}\n" https://www.baseos.online
200

$ curl -s -o /dev/null -w "%{http_code}\n" https://www.baseos.online/sorteio
200

$ curl -s -o /dev/null -w "%{http_code}\n" https://www.baseos.online/equipe/inscricao/855898889545820f4b17a2b861d68194d000
200

$ curl -s -o /dev/null -w "%{http_code}\n" https://api.baseos.online/rest/v1/
200
```

---

## 7. CONCLUSÃO & RECOMENDAÇÕES

1. **VPS Pronta e Desafogada:** A VPS agora possui **54 GB de espaço livre**, operando a apenas **45% de uso** do disco. Não há risco de esgotamento de inodes ou espaço em disco decorrentes de builds ou logs de projetos terceiros.
2. **Ambiente Isolado e Dedicado:** O servidor está exclusivamente dedicado ao ecossistema do BaseOS (`baseos-frontend`, `supabase_*` e `nginx-proxy-manager`).
3. **Segurança de Dados:** O dump de segurança gerado na Etapa 1 está resguardado no caminho `/opt/backups/baseos/baseos_pre_purge_20261014_165239.dump`.
