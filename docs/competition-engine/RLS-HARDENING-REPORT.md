# RELATÓRIO DE HARDENING DE ROW LEVEL SECURITY (RLS)

**Projeto:** BaseOS  
**Fase:** 4.7  
**Tabelas Auditadas:** `public.competition_stages`, `public.competition_rounds`, `public.competition_match_slots`  
**Status:** BLINDADO E HOMOLOGADO  

---

## 1. POLÍTICAS DE ROW LEVEL SECURITY ATIVAS

Todas as três tabelas centrais do runtime de competição possuem `ENABLE ROW LEVEL SECURITY`.

### 1.1. Políticas de Leitura Pública (`SELECT`)
O chaveamento, fases e partidas de uma competição esportiva são dados públicos para consumo de atletas, torcedores e tabelas de classificação pública:

```sql
CREATE POLICY "competition_stages_public_read" ON public.competition_stages
  FOR SELECT USING (true);

CREATE POLICY "competition_rounds_public_read" ON public.competition_rounds
  FOR SELECT USING (true);

CREATE POLICY "competition_match_slots_public_read" ON public.competition_match_slots
  FOR SELECT USING (true);
```

### 1.2. Políticas de Mutação Restrita (`INSERT`, `UPDATE`, `DELETE`)
Mutações diretas via REST API são bloqueadas para o público geral, equipes e árbitros, sendo permitidas apenas para organizadores e administradores:

```sql
CREATE POLICY "competition_stages_organizer_all" ON public.competition_stages
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('organizer', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('organizer', 'admin'))
  );

CREATE POLICY "competition_rounds_organizer_all" ON public.competition_rounds
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('organizer', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('organizer', 'admin'))
  );

CREATE POLICY "competition_match_slots_organizer_all" ON public.competition_match_slots
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('organizer', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('organizer', 'admin'))
  );
```

---

## 2. INTERAÇÃO ENTRE RLS E `SECURITY DEFINER`

### 2.1. O Risco de Bypass Indevido
Funções declaradas como `SECURITY DEFINER` executam com as permissões do usuário definidor (`postgres`), ignorando temporariamente as regras de RLS das tabelas acessadas internamente.

Se uma função `SECURITY DEFINER` aceitasse argumentos sem validar quem é o chamador, ela atuaria como um "túnel de bypass de RLS", permitindo que qualquer usuário autenticado (ou até anônimo) realizasse alterações arbitrárias.

### 2.2. A Solução Implementada: Defesa em Profundidade
No BaseOS, a função `SECURITY DEFINER` **não delega a segurança ao RLS**:
1. **Verificação de Identidade Prévia:**
   A primeira instrução da função obtém o `auth.uid()` e o `role` do chamador. Se não for `service_role` de infraestrutura nem `organizer`/`admin` em `public.profiles`, a função aborta com exceção `42501` antes de tocar qualquer tabela.
2. **Checagem de Ownership de Competição:**
   A função verifica se o organizador autenticado é proprietário da competição alvo (`c.organizer_id = v_caller_uid`), algo que uma regra de RLS simples não conseguiria impor de forma atômica com locks pessimistas.
3. **Restrição do `search_path`:**
   `SET search_path = public, pg_temp;` impede injeção de schemas maliciosos.

---

## 3. COMPARAÇÃO DOS VETORES DE ACESSO

| Vetor de Acesso | Mecanismo de Controle | Resultado para Não-Autorizado |
| :--- | :--- | :--- |
| **REST API Direta (`/rest/v1/competition_match_slots`)** | PostgreSQL RLS (`competition_match_slots_organizer_all`) | Bloqueado pelo RLS (0 linhas afetadas ou erro) |
| **RPC Transacional (`rpc/save_stage_draw_and_slots`)** | `REVOKE EXECUTE` + Checagem Interna de Roles e Ownership | Bloqueado pelo `REVOKE` (anônimo) ou `RAISE EXCEPTION 42501` (não dono) |
| **RPC de Propagação (`rpc/rpc_propagate_slot_outcome`)** | `REVOKE EXECUTE` + Checagem Interna de Roles e Anti-Fake Team | Bloqueado pelo `REVOKE` (anônimo) ou `RAISE EXCEPTION 42501` (não dono) |
