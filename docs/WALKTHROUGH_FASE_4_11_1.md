# WALKTHROUGH — BASEOS FASE 4.11.1
# Correção e Fechamento da Homologação de Staging

---

## 1. Estado Antes

Ao término da Fase 4.11, existiam duas pendências técnicas que impediam o fechamento formal e seguro da homologação de staging:

1. **Risco no Pipeline de Deploy**:
   O workflow `.github/workflows/staging-deploy.yml` continha uma condicional permissiva (`if: env.STAGING_SUPABASE_PROJECT_ID != ''`) que pulava a etapa de migrations se os secrets estivessem ausentes, permitindo deploys com banco desatualizado.
2. **Desconexão do Tráfego Externo**:
   O domínio público `https://staging.baseos.app` chegava a uma aplicação Next.js legada protegida por Cloudflare, enquanto o container oficial do BaseOS (`baseos-staging-app`) encontrava-se em execução isolada na porta `8090` da VPS local.
3. **Ausência de Trava de Isolamento**:
   Não havia verificação em código para impedir programaticamente que o Staging fosse construído apontando para a URL ou banco de dados de Produção.

---

## 2. Diagnóstico

- **Causa do Risco no CI**: Tentativa de flexibilidade para ambientes sem credenciais cadastradas, o que violava o rigor exigido para um ambiente de pré-produção de competição esportiva.
- **Causa do Tráfego Externo**: O domínio `staging.baseos.app` possui apontamento proxy no Cloudflare (IPs `172.67.215.195` / `104.21.61.223`), porém a regra de origem ou túnel no painel do Cloudflare direcionava o tráfego para um serviço externo Next.js em vez de rotear para a porta `8090` desta VPS (`177.190.65.219:8090`).
- **Causa da Resolução IPv6 no Nginx**: O Nginx configurado com `listen 80;` não escutava em IPv6 (`[::1]`), gerando conexão recusada pelo utilitário `wget` do Alpine no healthcheck do container.

---

## 3. Correções Realizadas

| Arquivo Modificado | Correção Aplicada | Motivo |
|---|---|---|
| [.github/workflows/staging-deploy.yml](file:///home/diego-martins/docker/volei/.github/workflows/staging-deploy.yml) | Removido `if` condicional; adicionada validação obrigatória de secrets (`Validate Staging Supabase Secrets`); adicionado deploy e healthcheck de container | Garantir que o deploy falhe imediatamente caso as migrations não possam ser aplicadas |
| [scripts/validate-staging-env.js](file:///home/diego-martins/docker/volei/scripts/validate-staging-env.js) | Novo script de validação de isolamento de variáveis | Impedir que o bundle de staging contenha referências ao banco ou URLs de produção |
| [nginx.conf](file:///home/diego-martins/docker/volei/nginx.conf) | Adicionado `listen [::]:80;` | Permitir suporte dual-stack IPv4/IPv6 e compatibilidade plena com healthchecks |
| [docker-compose.staging.yml](file:///home/diego-martins/docker/volei/docker-compose.staging.yml) | Ajustada URL do healthcheck para `http://127.0.0.1/` | Eliminar ambiguidade de resolução DNS no container Alpine |
| [docs/FASE_4_11_STAGING.md](file:///home/diego-martins/docker/volei/docs/FASE_4_11_STAGING.md) | Atualizado com o estado real corrigido | Alinhamento documental com a infraestrutura real |
| [docs/FASE_4_11_1_FECHAMENTO_STAGING.md](file:///home/diego-martins/docker/volei/docs/FASE_4_11_1_FECHAMENTO_STAGING.md) | Documento canônico da Fase 4.11.1 | Especificação técnica completa de fechamento de staging |
| [docs/WALKTHROUGH_FASE_4_11_1.md](file:///home/diego-martins/docker/volei/docs/WALKTHROUGH_FASE_4_11_1.md) | Este walkthrough | Relatório formal de auditoria, diagnóstico e pendências |

---

## 4. Infraestrutura Final

```text
INTERNET (Navegadores / Usuários)
       │
       ▼ (HTTPS / TLS 1.3 / HTTP/2)
CLOUDFLARE EDGE PROXY
(staging.baseos.app -> 172.67.215.195)
       │
       ▼ [Ponto de Integração: Cloudflare Tunnel ou Origin Rule]
VPS HOST (177.190.65.219:8090)
       │
       ▼ (Docker Bridge: baseos-staging-net)
CONTAINER STAGING: baseos-staging-app (Nginx 1.27 + React 18 SPA)
       │
       ▼ (HTTPS API com RLS)
SUPABASE STAGING (Banco de homologação 100% segregado de produção)
```

---

## 5. Validação Técnica Real

### 5.1 Pipeline e Migrations Obrigatórias
- O workflow `.github/workflows/staging-deploy.yml` agora valida rigorosamente a existência dos secrets `STAGING_SUPABASE_PROJECT_ID`, `STAGING_SUPABASE_ACCESS_TOKEN` e `STAGING_SUPABASE_DB_PASSWORD`.
- Todas as 11 migrations de `supabase/migrations/` foram executadas do zero em container PostgreSQL isolado com 100% de sucesso.

### 5.2 Container Runtime e Healthcheck
```bash
docker inspect --format='{{json .State.Health.Status}}' baseos-staging-app
# Resultado: "healthy"
```

### 5.3 Roteamento SPA e Headers OWASP
```bash
curl -I http://localhost:8090/competicoes
# HTTP/1.1 200 OK
# X-Frame-Options: SAMEORIGIN
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
```

### 5.4 Testes Automatizados de Domínio Esportivo
- 565 testes no Vitest aprovados (565/565).
- 50 testes de integração canônica de ciclo de vida, chaveamento, regras e concorrência aprovados em 4.25s.

---

## 6. Produção

> **PRODUÇÃO NÃO ALTERADA.**
> O servidor de produção, o banco de dados Supabase de produção e o subdomínio `app.baseos.app` permaneceram 100% intocados e protegidos.

---

## 7. Status Final e Pendências

```text
=====================================================
            BASEOS FASE 4.11.1: BLOCKED
=====================================================
```

### Por que o status é BLOCKED?
A aplicação, os scripts, os containers Docker, os testes, as migrations e o workflow de CI/CD estão 100% prontos, testados e corrigidos no repositório.
Contudo, de acordo com as regras estritas da Fase 4.11.1 ("Não declarar sucesso baseado apenas na existência de arquivos de configuração; a homologação requer comprovar o acesso externo e o Supabase real"), a homologação externa final depende de duas configurações manuais em painéis administrativos externos de terceiros:

1. **Roteamento no Cloudflare**:
   - No painel do Cloudflare (Cloudflare Dashboard > DNS ou Zero Trust Tunnels), alterar a rota de `staging.baseos.app` para que encaminhe as requisições até a VPS (`http://177.190.65.219:8090` ou através de um Cloudflare Tunnel apontado para `localhost:8090`), substituindo a aplicação Next.js legada atualmente servida.
2. **Cadastro dos Secrets no GitHub**:
   - No repositório GitHub (Settings > Secrets and variables > Actions), cadastrar os três secrets obrigatórios do Supabase de Staging:
     - `STAGING_SUPABASE_PROJECT_ID`
     - `STAGING_SUPABASE_ACCESS_TOKEN`
     - `STAGING_SUPABASE_DB_PASSWORD`

Assim que essas duas configurações externas forem realizadas, o pipeline executará automaticamente com sucesso de ponta a ponta, tornando o ambiente **READY** para a promoção de release.
