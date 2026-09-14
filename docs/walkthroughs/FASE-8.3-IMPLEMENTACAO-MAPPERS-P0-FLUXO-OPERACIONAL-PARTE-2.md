# BASEOS — FASE 8.3 — IMPLEMENTAÇÃO DOS MAPPERS CANÔNICOS, CORREÇÃO DOS P0 E FLUXO OPERACIONAL
## PARTE 2 — CICLO OPERACIONAL, CAPACIDADE CANÔNICA, TESTES E IMPLEMENTAÇÃO COMPLETA

---

## 1. FLUXO OPERACIONAL DE INSCRIÇÃO E APROVAÇÃO

Na Fase 8.3, o painel do organizador (`CompetitionRegistrationsPage`) e os serviços de domínio foram consolidados para garantir o ciclo completo da competição:

```text
[Criar Competição] (status: 'registration-open', maxTeams explícito)
        ↓
[Cadastrar / Convidar Equipe] (competition_teams.status = 'invited')
        ↓
[Equipe Preenche Elenco via Link Seguro] (status = 'submitted')
        ↓
[Organizador Revisa Elenco na UI]
   ├── [Confirmar Inscrição] ──> (status = 'approved') [Vaga ocupada]
   └── [Recusar Inscrição]   ──> (status = 'rejected') [Vaga liberada]
        ↓
[Sorteio Oficial de Chaves] (Apenas status = 'approved' e elenco >= mínimo)
```

### 1.1 Ações de Gestão no Painel (`CompetitionRegistrationsPage.tsx`)

* **Ação "Confirmar" (`handleConfirmTeam`):**
  * Invoca `CompetitionRegistrationService.canApproveTeam`.
  * Valida se a equipe está com status `submitted`.
  * Valida se o elenco cumpre o mínimo regulamentar (ex: 6 atletas para quadra 6x6).
  * Valida se há vaga disponível na capacidade explícita da competição (`maxTeams`).
  * Atualiza o registro em `competition_teams` para `status = 'approved'`.
* **Ação "Recusar" (`handleRejectTeam`):**
  * Atualiza o registro em `competition_teams` para `status = 'rejected'`.
* **Trava de Elenco (`is_locked`):**
  * Mantida como trava de permissão de escrita da equipe no portal de auto-inscrição.
  * Não impede nem bloqueia a participação da equipe no sorteio se já estiver com status `approved`.

---

## 2. CAPACIDADE DETERMINÍSTICA SEM INFERÊNCIA SILENCIOSA

Conforme diretriz aprovada para a Fase 8.3, foi eliminada qualquer inferência automática ou silenciosa de vagas:

1. **Configuração Explícita:** A capacidade deve estar configurada em `config.registration.maxTeams` (configurado via aba de regras de inscrição no diálogo de criação/edição da competição).
2. **Bloqueio Operacional Claro:** Se `maxTeams` estiver ausente ou não configurado, a função `CompetitionRegistrationService.canApproveTeam` bloqueia a aprovação com a mensagem explícita:
   > *"A capacidade máxima de equipes (maxTeams) não foi configurada para esta competição. Defina a capacidade nas configurações antes de aprovar inscrições."*
3. **Banner Informativo na UI:** Exibe em tempo real o status de ocupação (`confirmadas / maxTeams`), avisando o organizador sobre inscrições pendentes de análise e alertando caso a capacidade ainda não tenha sido configurada.

---

## 3. ELEGIBILIDADE ESTRITA PARA O SORTEIO OFICIAL

O serviço `CompetitionDrawEligibilityService` foi alinhado ao contrato funcional:

* **Critério 1 (Status):** Apenas equipes com `status === 'approved'` são consideradas elegíveis para o sorteio de chaves.
* **Critério 2 (Elenco):** A equipe deve possuir o número mínimo de atletas cadastrados de acordo com a modalidade (`athleteCount >= limits.min`).
* **Critério 3 (Quórum):** O sorteio oficial exige no mínimo 2 equipes aprovadas e aptas.
* **Isolamento de `is_locked`:** O bloqueio de elenco (`is_locked = true`) não penaliza a equipe nem a impede de ser sorteada.

---

## 4. EVIDÊNCIAS TÉCNICAS E RESULTADOS DOS TESTES

Todas as verificações regulamentares foram executadas e aprovadas com sucesso no ambiente de desenvolvimento:

### 4.1 Verificação de Tipagem TypeScript
```bash
npx tsc -p tsconfig.app.json --noEmit
# Resultado: 0 erros encontrados.
```

### 4.2 Verificação de Lint (ESLint)
```bash
npm run lint
# Resultado: 0 erros. (Apenas 1 aviso preexistente de hook em cinematic canvas).
```

### 4.3 Suíte de Testes Vitest (Regras de Negócio e Mappers)
```bash
npm test
# Resultado:
# Test Files: 105 passed (105)
# Tests:      871 passed (871)
# Novas suítes incluídas:
#  - src/test/canonicalMappers.test.ts (5 testes)
#  - src/test/dataAccessErrorHandling.test.ts (5 testes)
#  - src/test/fase83OperationalFlow.test.ts (8 testes)
```

### 4.4 Build de Produção
```bash
npm run build
# Resultado:
# vite v5.4.14 building for production...
# 1902 modules transformed.
# dist/index.html                           1.96 kB
# dist/assets/index-DmsZc12q.css           61.76 kB
# dist/assets/jspdf.es.min-DXf4-g8W.js    342.34 kB
# dist/assets/index-D_c1P_n1.js         1,257.69 kB
# built in 1.48s
```

### 4.5 Persistência Real no PostgreSQL 17.6 (`supabase-db`)
* Executado teste de integração direto contra o container Docker do PostgreSQL:
  * Inserção em `competitions` com payload do mapper: **Sucesso**.
  * Inserção em `teams` com payload do mapper: **Sucesso**.
  * Inserção e atualização em `competition_teams`: **Sucesso**.
  * Rejeição de colunas inexistentes (`groups_count` e `manager_password`): **Confirmada pelo banco com erro 42703**.

---

## 5. CONCLUSÃO DA FASE

Com a eliminação da causa estrutural dos erros 400, a implementação dos mappers canônicos, a governança de capacidade sem inferência silenciosa e a aprovação de 871 testes automatizados:

```text
===================================================================
FASE 8.3 — STATUS: IMPLEMENTATION COMPLETE
===================================================================
```
*Nota de Governança:* A homologação formal de release, hardening final e homologação na instância VOLTZ serão executadas a partir da **Fase 8.5+**. A instância VOLTZ permanece intocada nesta etapa.

Pronto para avanço para a **Fase 8.4 — UX / Help Center ("O que eu preciso fazer agora?")**.
