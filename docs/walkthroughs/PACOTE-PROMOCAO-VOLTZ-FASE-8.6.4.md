# BASEOS — PACOTE DE PROMOÇÃO PARA PRODUÇÃO / VOLTZ

## FASE 8.6.4: FECHAMENTO DE RELEASE INDOOR

**Data de Emissão**: 2026-09-14  
**Versão Alvo**: `v2.4.0-rc.1`  
**Escopo**: Modalidade Indoor (Quadra)  
**Ambiente Origem**: DEV (Supabase Local / PostgreSQL / React 18 + Vite)  
**Ambiente Destino**: Produção / VOLTZ  

---

## 1. Diretrizes Inegociáveis de Promoção

1. **PRESERVAÇÃO DA BASE EXISTENTE (SEM RESET)**:
   - **NÃO FAZER RESET DO BANCO NA VOLTZ**.
   - A base de dados existente contém agremiações, competições e históricos que devem ser rigorosamente preservados.
   - A migração é cumulativa e idempotente.
2. **ISOLAMENTO DE AMBIENTES**:
   - Nenhuma credencial do DEV (chaves locais, senhas de teste) deve ser transportada para a VOLTZ.
   - Nenhuma alteração direta em produção sem passar pelo pacote auditado.

---

## 2. Inventário do Pacote de Promoção

O pacote de promoção é composto pelos seguintes artefatos consolidados:

```text
Código da Release (Commit congelado na tag v2.4.0-rc.1)
      ↓
Migration: supabase/migrations/20260914000001_provision_team_user.sql
      ↓
Build de Produção (Vite / dist/)
      ↓
Smoke Test Pós-Deploy
      ↓
Procedimento de Rollback
```

---

## 3. Relatório de Segurança Pré-Deploy (Zero Plaintext Passwords)

Auditoria exaustiva executada no código-fonte confirmando:

| Vetor de Risco | Status | Comprovação no Código |
|---|:---:|---|
| **Gravação em LocalStorage** | **NÃO OCORRE** | No modo Supabase (`isSupabaseConfigured()`), o `supabaseAdapter.provisionTeamUser` despacha via RPC HTTPS diretamente ao PostgreSQL. `PASSWORDS_KEY` existe exclusivamente no `localStorageAdapter` (modo demo offline). |
| **Inclusão em Logs** | **NÃO OCORRE** | `OperationalAuditService.recordTeamRegistration` não recebe e não persiste campos de senha. `AuditService.logEvent` registra apenas tipo de evento sanitizado (`'Login com Sucesso'`, `'Falha de Login'`). |
| **Persistência em `public.teams`** | **NÃO OCORRE** | A tabela `teams` não possui colunas de credenciais. O mapper canônico `teamMapper.ts` descarta ativamente campos de senha. |
| **Persistência em `public.profiles`** | **NÃO OCORRE** | A tabela `profiles` possui apenas `id`, `name`, `email`, `role`, `competition_team_id`, sem colunas de senha. |
| **Envio para Analytics** | **NÃO OCORRE** | Nenhuma biblioteca externa de telemetria/analytics configurada para coletar inputs de formulários. |
| **Exposição em Payloads de Erro** | **NÃO OCORRE** | Respostas de erro retornam mensagens genéricas sanitizadas (`res?.error || 'Falha ao provisionar'`). |
| **Persistência Fora do Fluxo de Criação** | **NÃO OCORRE** | A senha gerada existe temporariamente em memória na interface para permitir a cópia única pelo operador e o envio via WhatsApp. |

---

## 4. Passo a Passo de Execução na VOLTZ

### Passo 1: Aplicação da Migration no PostgreSQL da VOLTZ

Aplicar o script SQL via pipeline ou CLI conectada ao PostgreSQL da VOLTZ:

```bash
# Execução da migration idempotente
psql "$VOLTZ_DATABASE_URL" -f supabase/migrations/20260914000001_provision_team_user.sql
```

**O que esta migration faz**:
1. Atualiza `public.handle_new_user()` para ler `role` e `competition_team_id` dos metadados.
2. Atualiza `public.trg_protect_profile_sensitive_fields()` permitindo atribuições legítimas por admins e pelo sistema.
3. Cria a RPC `public.provision_team_user(p_email, p_password, p_name, p_competition_team_id, p_phone)` com `SECURITY DEFINER SET search_path = public, extensions`.
4. Concede permissão de execução a usuários autenticados (`GRANT EXECUTE ... TO authenticated`).

**Validação da Migration**:
```sql
SELECT routine_name FROM information_schema.routines WHERE routine_name = 'provision_team_user';
```

---

### Passo 2: Build e Publicação do Frontend

```bash
# Instalação limpa
npm ci

# Typecheck e Lint de verificação
npx tsc -p tsconfig.app.json --noEmit
npm run lint

# Build de produção
npm run build
```

Publicar o diretório `dist/` no ambiente de hospedagem/CDN da VOLTZ.

---

### Passo 3: Smoke Test Pós-Deploy

Executar o seguinte roteiro de smoke test no ambiente VOLTZ:

1. **Acesso Administrativo**:
   - Efetuar login com a conta de organizador/admin.
   - Navegar até `/competicoes` e verificar carregamento íntegro das competições.
2. **Cadastro e Provisionamento de Equipe Piloto**:
   - Abrir o diálogo de inscrição de uma competição com status `registration-open`.
   - Cadastrar uma equipe de teste:
     - Nome: `Equipe Piloto Homologação`
     - Sigla: `EPH`
     - Responsável: `Gestor Piloto`
     - E-mail: `gestor.piloto@voltz.volei`
   - Confirmar geração de senha e submeter.
   - Validar se o modal exibe as credenciais e o link de WhatsApp.
3. **Login Real da Equipe**:
   - Fazer logout do administrador.
   - Acessar `/login` e entrar com `gestor.piloto@voltz.volei` e a senha gerada.
   - Confirmar autenticação com HTTP 200, JWT e perfil com `role = 'team'`.
   - Pressionar F5 e confirmar persistência da sessão.
4. **Cadastro de Atleta no Elenco**:
   - Cadastrar 1 atleta piloto e validar persistência.
5. **Limpeza do Teste**:
   - Remover a equipe piloto após a validação.

---

## 5. Plano de Rollback

Caso ocorra qualquer anomalia crítica durante o smoke test na VOLTZ:

### Rollback do Frontend
- Retornar a publicação do servidor web/CDN para o commit anterior (`d07bc39` / tag `v2.3.0`).

### Rollback da Migration
Como a migration apenas cria a RPC `provision_team_user` e ajusta os triggers para aceitarem metadados adicionais, ela não quebra a retrocompatibilidade com versões anteriores. Caso seja estritamente necessário revogá-la:

```sql
DROP FUNCTION IF EXISTS public.provision_team_user(text, text, text, text, text);
```

---

## 6. Identificadores de Rastreabilidade

- **Versão da Release**: `v2.4.0-rc.1`
- **Branch**: `main`
- **Testes Automatizados**: 120 arquivos de teste, 1.161 testes aprovados (100% PASS).
- **Veredito**: **APROVADO PARA PROMOÇÃO**.
