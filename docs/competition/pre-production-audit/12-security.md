# BaseOS — Auditoria de Segurança, Credenciais e RLS (Fase 4.PRE)

**Arquivo Auditado:** `src/lib/supabaseClient.ts`, `scripts/validate-staging-env.js`, `supabase/migrations/20260905000003_rls_portal_security.sql`  
**Classificação:** HOMOLOGADO  
**Risco:** BAIXO  

---

## 1. Gestão de Segredos e Variáveis de Ambiente

A auditoria em todo o repositório confirmou:
- **Ausência de Segredos no Bundle:** Nenhuma credencial administrativa (`service_role_key`, senhas de banco ou tokens mestres) está versionada no código ou embutida no frontend.
- **Variáveis Públicas do Cliente:** O frontend consome exclusivamente:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY` (Chave pública anônima sujeita a RLS).
- **Proteção do Git:** O `.gitignore` bloqueia explicitamente `.env`, `.env.*`, arquivos de certificado (`.pem`, `.key`, `.cert`), backups e credenciais.

---

## 2. Validador de Ambiente de Staging (`validate-staging-env.js`)

O script de proteção de staging (`scripts/validate-staging-env.js`) bloqueia o pipeline de deploy caso:
- `VITE_SUPABASE_URL` aponte acidentalmente para o banco de produção;
- O ID do projeto de produção esteja presente nas variáveis de homologação;
- Evita qualquer vazamento de dados ou contaminação entre torneios de teste e produção.

---

## 3. Segurança no Banco de Dados e Row Level Security (RLS)

A migration `20260905000003_rls_portal_security.sql` implementa políticas de RLS no PostgreSQL:
- **Leitura Pública:** Visualização anônima autorizada apenas para competições com status aberto (`registration-open`, `in-progress`, `completed`).
- **Modificações Administrativas:** Inserções e alterações de regras, tabelas e partidas restritas a usuários autenticados com papéis de organizador ou administrador.
- **Inscrição de Atletas:** O procedimento armazenado `rpc_register_athlete_v2` valida prazos e limites de elenco diretamente no banco com transações ACID.
