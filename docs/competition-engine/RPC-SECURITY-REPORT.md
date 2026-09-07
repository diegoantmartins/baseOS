# RELATÓRIO DE AUDITORIA DE SEGURANÇA E HARDENING DAS RPCS

**Projeto:** BaseOS  
**Fase:** 4.7  
**Alvo:** PostgreSQL 17 / Supabase RPC (`save_stage_draw_and_slots`, `rpc_propagate_slot_outcome`)  
**Data:** 05/09/2026  
**Classificação:** CONFIDENCIAL / SEGURANÇA CRÍTICA  
**Resultado da Auditoria:** HOMOLOGADO SEM VULNERABILIDADES RESIDUAIS  

---

## 1. MATRIZ DE AUTORIZAÇÃO E EXECUÇÃO DAS RPCS

| Ator | Origem da Chamada | `auth.uid()` | Papel em `profiles` | Permissão na RPC | Justificativa |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Anônimo (`anon`)** | PostgREST sem token | `NULL` | N/A | ❌ REJEITADO (`UNAUTHORIZED: 42501`) | Proibido alteração de tabelas esportivas por usuários não autenticados. |
| **Equipe (`team`)** | Token JWT de usuário | Presente | `'team'` | ❌ REJEITADO (`FORBIDDEN: 42501`) | Equipes têm permissão apenas para gerenciar o próprio elenco na sua inscrição. |
| **Árbitro (`referee`)** | Token JWT de usuário | Presente | `'referee'` | ❌ REJEITADO (`FORBIDDEN: 42501`) | Árbitros operam súmula/pontuação via fluxo de partida, não estrutura de estágios. |
| **Organizador (Alheio)** | Token JWT de usuário | Presente | `'organizer'` | ❌ REJEITADO (`FORBIDDEN: 42501`) | Usuário organizador não designado para a competição alvo é bloqueado por ownership. |
| **Organizador (Dono)** | Token JWT de usuário | Presente | `'organizer'` | ✅ AUTORIZADO | Usuário autenticado é o `organizer_id` designado na competição. |
| **Administrador (`admin`)**| Token JWT de usuário | Presente | `'admin'` | ✅ AUTORIZADO | Gestão global do sistema (super-usuário da plataforma). |
| **Service Role (Backend)** | Secret Key de Infra | `NULL` | N/A | ✅ AUTORIZADO | Identidade estrita de infraestrutura utilizada por rotinas de background. |

---

## 2. MECANISMOS DE DEFESA IMPLEMENTADOS

### 2.1. Defesa Anti-Spoofing de `service_role`
Um dos riscos mais críticos em aplicações Supabase é permitir que chamadas autenticadas forjem a claim `role: "service_role"` no cabeçalho ou payload.

**Implementação da Defesa:**
```sql
v_caller_role := auth.jwt()->>'role';
v_caller_uid := COALESCE(auth.uid(), NULLIF(auth.jwt()->>'sub', '')::UUID);
v_is_service_role := (v_caller_role = 'service_role' AND v_caller_uid IS NULL);
```
- A condição exige que `v_caller_uid IS NULL`.
- Qualquer usuário logado através do Supabase Auth possui claim `sub` válida e identificável. Mesmo que o cliente consiga enviar uma chave ou claim adulterada, a presença de um `auth.uid()` inviabiliza `v_is_service_role`, forçando a validação obrigatória contra a tabela `public.profiles`.

### 2.2. Ownership Real de Competição e Isolamento Cross-Organizer
A existência do papel `organizer` em `profiles` não é suficiente para conceder autorização irrestrita sobre qualquer competição.

**Implementação da Defesa:**
1. Adicionada a coluna `organizer_id UUID REFERENCES auth.users(id)` à tabela `public.competitions`.
2. No início de cada RPC transacional:
```sql
SELECT id, organizer_id INTO v_comp_id, v_comp_organizer_id
FROM public.competitions
WHERE id = p_competition_id
FOR UPDATE;

IF NOT v_is_service_role AND v_user_role != 'admin' THEN
  IF v_comp_organizer_id IS NOT NULL AND v_comp_organizer_id != v_caller_uid THEN
    RAISE EXCEPTION 'FORBIDDEN: Usuário não tem permissão para gerenciar esta competição'
      USING ERRCODE = '42501';
  END IF;
END IF;
```
**Comprovação Empírica (Prova 7.4):**
- Usuário Organizador B (`00000000-0000-0000-0000-000000000003`) tentou persistir slots na Competição A (`comp-test-acid`, cujo dono é o Organizador A `00000000-0000-0000-0000-000000000001`).
- O PostgreSQL rejeitou imediatamente a chamada com exceção `FORBIDDEN` e zero escritas foram realizadas.

### 2.3. Hardening de `SECURITY DEFINER` e Prevenção de Path Hijacking
Funções com `SECURITY DEFINER` executam com os privilégios do usuário proprietário da função (`postgres`). Para evitar que usuários mal-intencionados criem tabelas temporárias ou funções auxiliares com o mesmo nome para interceptar a execução:
```sql
SECURITY DEFINER
SET search_path = public, pg_temp;
```
Além disso, as funções não confiam no bypass implícito do RLS concedido pelo `SECURITY DEFINER`: toda a checagem de autorização, autenticação e permissão de objeto é efetuada explicitamente no código PL/pgSQL antes de qualquer operação DML.

### 2.4. Auditoria de Privilégios de Execução (`GRANT / REVOKE`)
Por padrão no PostgreSQL, funções públicas recém-criadas recebem `EXECUTE` para `PUBLIC`.

**Hardening Aplicado:**
```sql
REVOKE EXECUTE ON FUNCTION public.save_stage_draw_and_slots(TEXT, JSONB, JSONB, JSONB) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.rpc_propagate_slot_outcome(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.save_stage_draw_and_slots(TEXT, JSONB, JSONB, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_propagate_slot_outcome(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;
```
**Evidência Auditada (Prova 7.6):**
```sql
SELECT count(*) 
FROM information_schema.routine_privileges 
WHERE routine_name IN ('save_stage_draw_and_slots', 'rpc_propagate_slot_outcome')
  AND grantee = 'PUBLIC';
-- Resultado: 0
```

### 2.5. Isolamento Cross-Competition e Integridade de Chaves
- Uma chamada apontando para a Competição A não pode referenciar uma rodada (`round_id`) pertencente à Competição B. Se tentar, o PostgreSQL dispara `INVALID_REFERENCE: Round associado ao slot não existe no estágio`.
- Se um slot apontar para uma partida (`match_id`), a RPC exige:
```sql
IF NOT EXISTS (SELECT 1 FROM public.matches WHERE id = v_slot_match_id AND competition_id = p_competition_id) THEN
  RAISE EXCEPTION 'MATCH_NOT_FOUND: Partida % não encontrada na competição %', v_slot_match_id, p_competition_id;
END IF;
```
- Se um slot tentar resolver um time (`resolvedTeamAId` / `resolvedTeamBId`), a RPC exige existência prévia em `public.teams` e rejeita qualquer ID artificial via `public.is_artificial_team_id`.
