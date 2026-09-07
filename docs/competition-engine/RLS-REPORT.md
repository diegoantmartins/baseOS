# BASEOS — RELATÓRIO DE ROW LEVEL SECURITY (RLS) DO COMPETITION FORMAT ENGINE

**Documento:** RLS-REPORT.md  
**Fase:** 4.6  
**Status:** IMPLEMENTADO  
**Data:** 05/09/2026  

---

## 1. ESCOPO DO RLS NA FASE 4.6

O objetivo da Fase 4.6 é garantir que as **novas tabelas** introduzidas pela fundação de persistência do Competition Format Engine:
- `public.competition_stages`
- `public.competition_rounds`
- `public.competition_match_slots`

nasçam com RLS devidamente ativada (`ENABLE ROW LEVEL SECURITY`) e com políticas de acesso coerentes com o modelo de autorização do BaseOS, sem recorrer à política permissiva insegura (`using (true)`) para operações de escrita.

Nesta fase, **não** foi realizada uma reforma de segurança em tabelas legadas pré-existentes (como `matches` ou `competitions`), de modo a evitar desestabilização fora do escopo. Essa revisão global de segurança e autorização transacional pertence à Fase 4.7.

---

## 2. MATRIZ DE POLÍTICAS POR TABELA

### 2.1 Tabela: `public.competition_stages`

| Operação | Nome da Política | Papel / Condição (`USING` / `WITH CHECK`) | Justificativa |
| :--- | :--- | :--- | :--- |
| **SELECT** | `Allow public read access on stages` | `FOR SELECT USING (true)` | Estágios e formatos precisam ser consultáveis tanto no portal público quanto na área autenticada. |
| **INSERT** | `Allow organizer and admin insert on stages` | `FOR INSERT WITH CHECK ( (auth.jwt() -> 'app_metadata' ->> 'role') IN ('organizer', 'admin') OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('organizer', 'admin') OR (auth.jwt() ->> 'role') = 'service_role' )` | Apenas organizadores e administradores da competição (ou service role interna) podem criar fases. |
| **UPDATE** | `Allow organizer and admin update on stages` | `FOR UPDATE USING ( ... ) WITH CHECK ( ... )` (mesma restrição de papel) | Modificações em fases da competição exigem perfil privilegiado de gestão. |
| **DELETE** | `Allow organizer and admin delete on stages` | `FOR DELETE USING ( ... )` (mesma restrição de papel) | Apenas organizadores/administradores podem cancelar ou excluir estágios. |

---

### 2.2 Tabela: `public.competition_rounds`

| Operação | Nome da Política | Papel / Condição (`USING` / `WITH CHECK`) | Justificativa |
| :--- | :--- | :--- | :--- |
| **SELECT** | `Allow public read access on rounds` | `FOR SELECT USING (true)` | Rodadas e seus confrontos são visíveis publicamente para acompanhamento do torneio. |
| **INSERT** | `Allow organizer and admin insert on rounds` | `FOR INSERT WITH CHECK ( role IN ('organizer', 'admin') OR service_role )` | Apenas a organização esportiva cria rodadas no estágio. |
| **UPDATE** | `Allow organizer and admin update on rounds` | `FOR UPDATE USING/WITH CHECK ( role IN ('organizer', 'admin') OR service_role )` | Alteração de status e metadados de rodadas restrita à gestão. |
| **DELETE** | `Allow organizer and admin delete on rounds` | `FOR DELETE USING ( role IN ('organizer', 'admin') OR service_role )` | Exclusão de rodadas restrita à gestão. |

---

### 2.3 Tabela: `public.competition_match_slots`

| Operação | Nome da Política | Papel / Condição (`USING` / `WITH CHECK`) | Justificativa |
| :--- | :--- | :--- | :--- |
| **SELECT** | `Allow public read access on match slots` | `FOR SELECT USING (true)` | Chaveamento estrutural, confrontos e participantes resolvidos são de domínio público. |
| **INSERT** | `Allow organizer and admin insert on match slots` | `FOR INSERT WITH CHECK ( role IN ('organizer', 'admin') OR service_role )` | Inserção de slots na chave e definição de participantes reservada à organização. |
| **UPDATE** | `Allow organizer and admin update on match slots` | `FOR UPDATE USING/WITH CHECK ( role IN ('organizer', 'admin') OR service_role )` | Resolução de participantes, vinculação de partidas e atualização de slots reservada à gestão ou pipeline de progressão. |
| **DELETE** | `Allow organizer and admin delete on match slots` | `FOR DELETE USING ( role IN ('organizer', 'admin') OR service_role )` | Remoção de slots da chave permitida apenas à gestão esportiva. |

---

## 3. CRITÉRIO DE OWNERSHIP E PAPÉIS

O BaseOS opera com autenticação baseada no Supabase Auth + metadados de perfil JWT:
1. `app_metadata.role`: preenchido pelo backend / auth admin.
2. `user_metadata.role`: preenchido na criação/atualização de perfil de usuário.
3. `service_role`: chave de serviço interna utilizada por rotinas de background e seeds.

As políticas implementadas avaliam esses três vetores de forma defensiva, garantindo que usuários anônimos ou usuários comuns (ex.: perfil `team`) não possam injetar ou modificar estágios, rodadas ou slots de partida.

---

## 4. LIMITAÇÕES ATUAIS E DIRETRIZES PARA A FASE 4.7

1. **Ownership Fino por Organizador da Competição:**
   Atualmente, qualquer usuário com `role IN ('organizer', 'admin')` tem permissão de escrita em todas as competições. Na Fase 4.7 (Security & Transactions), será introduzida a validação de ownership refinada:
   ```sql
   EXISTS (
     SELECT 1 FROM public.competitions c
     WHERE c.id = competition_id
       AND c.owner_id = auth.uid()
   )
   ```
2. **Escrita via RPC PL/pgSQL:**
   Na Fase 4.7, as alterações mais críticas de slots (propagação de resultados e resolução de chaves) serão encapsuladas em funções RPC `SECURITY DEFINER` com validação de regras de negócio em nível de banco de dados, audit trail e lock transacional pessimista.
