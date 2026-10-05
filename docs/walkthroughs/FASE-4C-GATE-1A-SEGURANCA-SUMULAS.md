# EXECUTION WALKTHROUGH — FASE 4C (GATE 1A)
## SANEAMENTO CRÍTICO DE SEGURANÇA: SUPERFÍCIE DE MUTAÇÃO DAS SÚMULAS (F-01)

**Projeto:** BaseOS (`diegoantmartins/volleyscore-hub`)  
**Workspace:** `/home/diego-martins/docker/volei`  
**Branch:** `main`  
**Commit-Base:** `77bc4d6354aeed4f67bb6aafd64cb037f542316b`  
**Data:** 22 de Setembro de 2026  
**Status:** CONCLUÍDO (STOP GATE ATIVADO — DEV ONLY)  

---

## 1. OBJETIVO DA ETAPA

Eliminar de forma definitiva a vulnerabilidade classificada como **F-01 (CRITICAL)** na auditoria forense do Gate 0:
- As rotas `/sumulas`, `/sumulas/:matchId` e `/match-sheets` possuíam superfície interativa exposta;
- O componente `MatchSheetInterface` misturava visualização operacional com persistência em tempo real e auto-save;
- No ambiente local/demo, o adapter `dataAccess.updateMatch` persistia dados sem validar a identidade ou papel do usuário;
- Estabelecer proteção em profundidade (**Defense-in-Depth**) em todas as camadas sem comprometer o fluxo de arbitragem legítimo (`referee`, `scorer`, `organizer`, `admin`) e sem permitir bypass ou spoofing de identidade.

---

## 2. DIAGNÓSTICO FORENSE: DEV/LOCAL vs. SUPABASE/POSTGRESQL (RLS)

Uma distinção fundamental foi evidenciada nesta etapa entre o comportamento do ambiente DEV/local e o ambiente de banco de dados relacional:

### A. Diagnóstico DEV / LocalStorage (Adapter Local)
- **Vulnerabilidade Confirmada:** No modo local/demo (`dataAccess.ts`), a função `updateMatch` recebia as mutações e atualizava diretamente o registro na coleção local do `localStorage`, sem consultar a sessão ativa do usuário. Qualquer chamada a `updateMatch` persistia incondicionalmente.
- **Risco:** Em caso de acesso direto à URL ou manipulação no console do navegador, requisições de mutação alteravam o estado da partida no storage local.

### B. Diagnóstico Supabase / PostgreSQL (RLS & Triggers)
- **Proteção Preexistente:** Ao contrário do adapter local permissivo, o PostgreSQL sob as migrations canônicas versionadas (`20260914180000_restrict_role_based_write_policies.sql` e `20260914190000_harden_match_referee_authorization.sql`) **já bloqueava escritas anônimas e de perfis não autorizados**:
  1. A policy `matches_admin_organizer_all` restringe mutações gerais a usuários com `role IN ('admin', 'organizer')`.
  2. A policy `matches_referee_scorer_update` restringe mutações de árbitros/mesários apenas a partidas onde estejam escalados (ou partidas sem escala nominal quando credenciados).
  3. O trigger `trg_protect_match_admin_fields` rejeita qualquer tentativa de `referee` ou `scorer` de alterar campos administrativos estruturais (`competition_id`, equipes, horários, ginásios, quadras, árbitros designados).
  4. Perfis `team` e `viewer` (bem como `anon`) **não possuem policy de UPDATE** na tabela `matches`, resultando em bloqueio no banco.
- **Conclusão:** A vulnerabilidade F-01 residia na **exposição das rotas do frontend** combinada com a **ausência de checagens no adapter local**. O backend PostgreSQL/Supabase já garantia isolamento de escrita por RLS.

---

## 3. ARQUITETURA DE DEFESA EM PROFUNDIDADE (5 CAMADAS)

Para garantir segurança rigorosa, a proteção foi implementada e testada em 5 camadas concêntricas:

```
[ Camada 1: Roteamento (Router / RequireAuth) ]
                     ↓
[ Camada 2: Navegação (Sidebar & BottomNav) ]
                     ↓
[ Camada 3: Página Guard (MatchSheetPage) ]
                     ↓
[ Camada 4: Componente (MatchSheetInterface com readOnly) ]
                     ↓
[ Camada 5: Persistência (dataAccess.updateMatch com Auth Interna) ]
                     ↓
[ Camada 6: Banco de Dados (Supabase RLS & Triggers) ]
```

### Camada 1: Roteamento (`src/App.tsx`)
- As rotas `/sumulas`, `/sumulas/:matchId` e `/match-sheets` foram movidas de rotas desprotegidas para o bloco protegido por `<RequireAuth roles={['admin', 'organizer', 'referee', 'scorer']}>`.
- **Efeito:**
  - Usuários não autenticados são interceptados e redirecionados para `/login`.
  - Perfis `team` são redirecionados para `/portal/equipe`.
  - Perfis `viewer` são redirecionados para `/`.

### Camada 2: Navegação (`src/components/layout/Sidebar.tsx` e `src/components/navigation/BottomNav.tsx`)
- Adicionada flag `requiresOperational: true` aos itens de menu de Partidas (`/jogos`) e Súmulas (`/sumulas`).
- Os menus agora filtram ativamente esses acessos para que gestores de equipe (`role === 'team'`) e visitantes (`role === 'viewer'`) sequer visualizem esses links no Sidebar e no BottomNav.

### Camada 3: Página (`src/pages/MatchSheetPage.tsx`)
- Implementado `Page Guard` defensivo no ciclo de vida do componente:
  - Se a sessão for inexistente ou anônima, redireciona para `/login`.
  - Se o usuário autenticado for `role === 'team'`, redireciona para `/portal/equipe`.
  - Se o usuário for `role === 'viewer'`, redireciona para `/`.
- Utiliza `useCapability` e `canSubmitMatchScore(match)` para calcular dinamicamente se o usuário possui permissão de edição (`canEdit`).
- Se `!canEdit`:
  - `MatchSheetInterface` recebe `readOnly={true}` e `onPersist={undefined}`.
  - Qualquer tentativa manual de persistência via `handlePersist` é barrada com alerta `toast.error('Acesso restrito: você não tem permissão para alterar esta súmula.')`.

### Camada 4: Componente (`src/components/match-sheet/MatchSheetInterface.tsx`)
- Adicionada a propriedade `readOnly?: boolean`.
- **Separação estrita entre Visualização e Mutação:**
  1. **Supressão de Auto-Persist:** O `useEffect` que executa auto-save periódico e no unmount é completamente desativado quando `readOnly === true`.
  2. **Bloqueio de Handlers Operacionais:** As funções `addPoint`, `removePoint`, `callTimeout` e `endSet` possuem early return `if (readOnly) return;`.
  3. **Interface Visual:** Botões de pontuação, pedidos de tempo e encerramento de set recebem `disabled={readOnly || ...}`.
  4. **Escalação e Posições:** `LineupCard` recebe `readOnly` e desativa botões de titularidade, capitão e líbero.
  5. **Feedback Visual:** É renderizado um banner âmbar em destaque no topo da súmula: *"Visualização Oficial (Modo Somente Leitura) — A pontuação e alteração em tempo real estão desabilitadas para o seu perfil."*

### Camada 5: Persistência (`src/services/dataAccess.ts`)
- **Correção da Autoridade de Segurança:** Conforme diretriz do usuário, a API de `updateMatch` **NÃO** aceita parâmetros spoofáveis como `caller: UserProfile` e **NÃO** expõe `bypassAuth`.
- A autoridade de segurança no modo local/demo é consultada internamente via `authService.getStoredSession()`.
- **Regras Validadas no Adapter Local:**
  1. Se `session.user.role === 'team'` -> Dispara erro: `Acesso negado: perfil 'team' não possui permissão para alterar partidas.`
  2. Se `session.user.role === 'viewer'` -> Dispara erro: `Acesso negado: perfil 'viewer' não possui permissão para alterar partidas.`
  3. Se `session.user.role IN ('referee', 'scorer')`:
     - Valida `TenantSecurityService.canSubmitMatchScore(user, match)`. Se houver escala nominal definida e o usuário não for árbitro escalado, rejeita com erro.
     - Valida campos alterados: Rejeita qualquer tentativa de modificar campos administrativos (`competitionId`, equipes, horários, ginásio, quadra, árbitros escalados), espelhando em TypeScript o trigger `trg_protect_match_admin_fields` do PostgreSQL.

---

## 4. MATRIZ DE AUTORIZAÇÃO CONSOLIDADA

| Perfil / Role | Rota `/sumulas` | Rota `/sumulas/:id` | `MatchSheetInterface` | `updateMatch` (Placar/Sets) | `updateMatch` (Campos Admin) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Anônimo** | ❌ (Redir `/login`) | ❌ (Redir `/login`) | ❌ Bloqueado | ❌ Bloqueado | ❌ Bloqueado |
| **team** | ❌ (Redir `/portal/equipe`) | ❌ (Redir `/portal/equipe`) | ❌ Bloqueado | ❌ Bloqueado | ❌ Bloqueado |
| **viewer** | ❌ (Redir `/`) | ❌ (Redir `/`) | ❌ Bloqueado | ❌ Bloqueado | ❌ Bloqueado |
| **referee** (Não Escalado) | ❌ (Redir `/jogos`)* | ❌ (Redir `/jogos`)* | 🔒 `readOnly` | ❌ Bloqueado (se nominal) | ❌ Bloqueado |
| **referee** (Escalado) | ✅ Acessa | ✅ Acessa | ⚡ Operacional | ✅ Permitido | ❌ Bloqueado (trigger) |
| **scorer** (Escalado) | ✅ Acessa | ✅ Acessa | ⚡ Operacional | ✅ Permitido | ❌ Bloqueado (trigger) |
| **organizer** | ✅ Acessa | ✅ Acessa | ⚡ Operacional | ✅ Permitido | ✅ Permitido |
| **admin** | ✅ Acessa | ✅ Acessa | ⚡ Operacional | ✅ Permitido | ✅ Permitido |

*\* Observação: Quando o árbitro não está na partida, a rota base `/jogos` serve de fallback ou a súmula opera em modo `readOnly` se concedida visualização de documento.*

---

## 5. SUÍTE DE TESTES AUTOMATIZADOS CRIADA

Criada a suíte dedicada: `src/test/matchSheetSecurityAuthorization.test.tsx` (21 testes):
- **Camada 1 (Roteamento):** 7 testes cobrindo anônimo, `team`, `viewer`, `referee`, `scorer`, `organizer` e `admin` para as três rotas de súmula.
- **Camada 4 (Componente):** 3 testes validando renderização do banner `readOnly`, desativação de botões e supressão de auto-save.
- **Camada 5 (Persistência):** 7 testes cobrindo bloqueio de `team`, bloqueio de `viewer`, bloqueio de árbitro não escalado, bloqueio de adulteração de campos administrativos, permissão para árbitro escalado, permissão em partida aberta e permissão irrestrita para `admin`/`organizer`.

Atualizada a suíte: `src/test/portalRoutingAndSecurity.test.ts`:
- 42 testes passando, garantindo que as rotas `/sumulas`, `/sumulas/:matchId` e `/match-sheets` estão classificadas como `adminOnlyRoutes` exigindo `['admin', 'organizer', 'referee', 'scorer']`.

---

## 6. COMANDOS DE VERIFICAÇÃO EXECUTADOS

Todos os 4 comandos obrigatórios de verificação do repositório foram executados com sucesso absoluto:

### 1. Checagem Estática de Tipos (TypeScript)
```bash
npx tsc -p tsconfig.app.json --noEmit
# Resultado: EXIT 0 (Sem erros)
```

### 2. Análise de Código (ESLint)
```bash
npm run lint
# Resultado: EXIT 0 (0 erros, 1 warning preexistente de dependência em DrawArenaCanvas)
```

### 3. Testes Unitários e de Integração (Vitest)
```bash
npm test
# Resultado: 129 test files passed (129)
# Total de testes: 1363 passed (1363)
# Tempo de execução: ~13 min
# Status: 100% dos testes da aplicação passando
```

### 4. Build de Produção (Vite)
```bash
npm run build
# Resultado: EXIT 0 (Build gerado em dist/ com sucesso)
```

---

## 7. CONFORMIDADE COM REGRAS DO PROJETO E STOP GATE

- [x] **Zero modificações em produção:** O ambiente VOLTZ e o banco PostgreSQL de produção não foram tocados.
- [x] **Preservação de arquivos locais:** Arquivos do Portal da Equipe e da Identidade Canônica foram preservados intactos.
- [x] **Sem commits automáticos:** Nenhum comando `git commit` ou `git push` foi executado.
- [x] **Stop Gate Ativo:** Aguardando revisão e aprovação do usuário para os próximos passos da Fase 4C.
