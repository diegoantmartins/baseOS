# BaseOS — Checklist de Promoção de Release

**Documento:** `docs/releases/BASEOS-v2.4.1-PROMOTION-CHECKLIST.md`  
**Versão Alvo:** `v2.4.1`  
**Release Candidate:** `v2.4.1-rc.1`  
**Data de Emissão:** 2026-09-14  
**Ambiente Alvo:** Produção / Instância VOLTZ (`https://voltz.baseos.online`)  
**Versão Anterior (Base):** `v2.4.0` (Commit `756e56d`)

---

## 1. Fase de Pré-Deploy

- [ ] **Backup do Banco de Dados em Produção:**
  ```bash
  # Gerar dump consistente antes de qualquer intervenção
  pg_dump "$DATABASE_URL" --clean --if-exists -F c -b -v -f "backup_voltz_pre_v2.4.1_$(date +%Y%m%d%H%M%S).dump"
  ```
- [ ] **Confirmação de Versão e Tag:**
  - Confirmar que a tag `v2.4.1` aponta exatamente para o commit aprovado na Fase 9.7.
- [ ] **Verificação de Migrations Pendentes:**
  - Confirmar que a release `v2.4.1` **NÃO CONTÉM MIGRATIONS NOVAS**.
  - Garantir que a migration `20260914000001_provision_team_user.sql` já esteja aplicada em produção (se foi promovida na v2.4.0) ou aplicá-la se pendente.
- [ ] **Variáveis de Ambiente:**
  - Garantir que `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` continuem configuradas no runtime sem expor chaves `service_role`.

---

## 2. Fase de Deploy do Frontend

- [ ] **Obtenção do Código Oficial:**
  ```bash
  git fetch --tags origin
  git checkout tags/v2.4.1
  ```
- [ ] **Instalação Limpa de Dependências:**
  ```bash
  npm ci
  ```
- [ ] **Verificação Pré-Compilação:**
  ```bash
  npx tsc -p tsconfig.app.json --noEmit
  npm run lint
  ```
- [ ] **Compilação de Produção:**
  ```bash
  npm run build
  ```
  Confirmar geração do diretório `dist/` com saída código 0.
- [ ] **Atualização do Container / CDN:**
  - Substituir os estáticos servidos pelo Nginx / OpenResty na VPS da VOLTZ pelo conteúdo do novo `dist/`.
- [ ] **Health Check da Aplicação:**
  ```bash
  curl -I https://voltz.baseos.online
  # Confirmar HTTP 200 OK
  ```

---

## 3. Fase de Banco de Dados

- [ ] **Validação de Schema:**
  - Como a `v2.4.1` é uma release estritamente de código e tipagem, **nenhuma migration deve ser executada** para esta versão.
  - Verificar se a RPC de provisionamento está ativa:
    ```sql
    SELECT routine_name FROM information_schema.routines WHERE routine_name = 'provision_team_user';
    ```

---

## 4. Roteiro de Smoke Test (Homologação Pós-Deploy)

Executar na interface de produção da VOLTZ:

- [ ] **1. Acesso Administrativo:**
  - Login como operador/organizador em `/login`.
  - Acessar `/competicoes` e validar listagem de competições e status.
- [ ] **2. Central de Inscrições & Equipes:**
  - Acessar competição oficial e verificar agremiações vinculadas.
  - Testar abertura de diálogo de inscrição e verificação de prazos.
- [ ] **3. Portal Online da Equipe (Foco da v2.4.1):**
  - Acessar o portal `/equipe/inscricao/:token` usando link de equipe cadastrada.
  - Aba **Elenco**: Confirmar visualização de atletas com/sem número de camisa.
  - Testar modal de edição de atleta (garantir ausência de erros de renderização de props).
  - Testar botão **Relação Nominal em PDF**: Baixar e verificar renderização limpa do documento.
  - Aba **Jogos**: Testar botão **Baixar Boletim PDF** e confirmar que jogos agendados sem placar não quebram o gerador de PDF.
  - Testar botão **Súmula Oficial**: Abrir diálogo e verificar pré-visualização e download.
  - Aba **Classificação**: Verificar tabela por grupo com critérios FIVB/CBV.
- [ ] **4. Portal Público:**
  - Acessar `/public/competicoes` deslogado e verificar visualização pública de jogos e classificação.

---

## 5. Auditoria de Segurança Pós-Deploy

- [ ] Confirmar que usuários autenticados como dirigentes de uma equipe não visualizam nem alteram dados de outras agremiações (RLS ativo).
- [ ] Confirmar que senhas continuam nunca expostas em LocalStorage, logs ou respostas PostgREST.

---

## 6. Procedimento de Rollback

Caso ocorra qualquer anomalia crítica durante o smoke test:

1. **Reversão do Frontend:**
   ```bash
   # Voltar imediatamente para a tag estável v2.4.0
   git checkout tags/v2.4.0
   npm ci
   npm run build
   # Re-publicar o diretório dist/ anterior no Nginx
   ```
2. **Banco de Dados:**
   - Como nenhuma alteração de schema foi aplicada na `v2.4.1`, o banco de dados permanece 100% compatível com a `v2.4.0`.
   - **NÃO EXECUTAR DROP DE TABELAS OU RESET DO BANCO.**
3. **Notificação:**
   - Registrar incidente no canal de operações informando rollback do frontend para `v2.4.0`.
