# 13 — Auditoria de Integridade e Segurança

## Análise de Riscos

## 1. Duplicidade de Execução

### Cenário: Duplo clique no botão "Realizar Sorteio"

**Risco:** Médio

**Situação:**
```typescript
const handleRunDraw = () => {
  if (!selected || !canDraw) return;
  const result = runDraw(selected, registeredTeams, { ... });
  setPreview({ groups: result.groups, matches: result.matches });
};
```

**Análise:**
- `handleRunDraw` é chamado em `onClick` do botão
- Não há debounce ou disable state durante execução
- Se o usuário clicar rapidamente, `runDraw` pode ser chamado múltiplas vezes
- Cada chamada sobrescreve o `preview` anterior
- O último resultado "vence" — comportamento potencialmente confuso, mas não perigoso

**Mitigação atual:** Nenhuma
**Risco:** Confusão visual, mas sem dano ao sistema

---

## 2. Duplo Clique no Botão "Salvar"

### Cenário: Duplo clique ou tentativa de salvar duas vezes

**Risco:** Alto

**Situação:**
```typescript
const handleSaveDraw = async () => {
  if (!selected || !preview) return;
  setSaving(true);
  try {
    await dataAccess.saveDraw({ ... });
    // Cria jogos um por um
    await dataAccess.createMatch({ ... }); // loop
    await refresh();
  } catch (error) {
    // Trata erro
  } finally {
    setSaving(false);
  }
};
```

**Análise:**
- `saving` state bloqueia o botão via `disabled={!preview || saving}`
- MAS a função é `async` e o botão pode ser clicado entre `setSaving(true)` e `await dataAccess.saveDraw()`
- Se o `await` demorar, múltiplas chamadas podem passar pelo guard
- **Resultado:** Sorteio salvo múltiplas vezes + jogos duplicados

**Mitigação atual:** `saving` state (parcialmente eficaz)
**Risco:** Dados duplicados no banco

---

## 3. Concorrência

### Cenário: Dois organizadores acessando a mesma competição simultaneamente

**Risco:** Alto

**Situação:**
- Usuário A abre DrawPage para "Copa X"
- Usuário B abre DrawPage para "Copa X"
- Usuário A realiza sorteio e salva
- Usuário B já tinha preview, não atualizou, também salva

**Análise:**
- Não há optimistic locking
- Não há versão/timestamp de verificação
- `saveDraw` sobrescreve sem verificar se houve alteração desde o carregamento
- `updatedAt` é sobrescrito, mas não há verificação

**Mitigação atual:** Nenhuma
**Risco:** Último a salvar vence (race condition) — perda de dados

---

## 4. Estado Inconsistente (Sorteio Salvo + Jogos Não Salvos)

### Cenário: Falha durante criação de jogos

**Risco:** Crítico

**Situação:**
```typescript
await dataAccess.saveDraw({ ... }); // ✓ Salvo

// Falha aqui ↓
for (let i = 0; i < savedMatches.length; i++) {
  await dataAccess.createMatch({ ... }); // ✗ Falha
}
```

**Análise:**
- Draw já está salvo no banco
- Jogos não foram criados (ou parcialmente criados)
- `updatedAt` do draw foi atualizado, mas não há jogos correspondentes
- Sistema fica em estado inconsistente

**Mitigação atual:** Nenhuma (try/catch apenas no nível do fluxo completo)
**Risco:** Estado corrompido — draw sem jogos ou jogos parcialmente criados

---

## 5. Manipulação pelo Frontend

### Cenário: Usuário mal-intencionado modifica dados via DevTools

**Risco:** Médio

**Situação:**
- Usuário abre DevTools → Application → LocalStorage
- Modifica dados do draw ou de equipes
- Atualiza a página

**Análise:**
- **LocalStorage (demo):** Qualquer dado pode ser manipulado
- **Supabase:** Autenticação é verificada, mas não há validação server-side de lógica de sorteio
- Campo `seed` pode ser manipulado para forçar resultado específico
- Campo `headSeeds` pode ser manipulado
- Campo `groups` pode ser manipulado

**Mitigação atual:** Nenhuma validação server-side
**Risco:** Usuário pode manipular resultados de sorteio

---

## 6. Permissões e RBAC

### Cenário: Usuário não-organizador acessa página de sorteio

**Risco:** Baixo (mitigado)

**Situação:**
```typescript
<Route
  path="/sorteio"
  element={
    <RequireAuth roles={['organizer']}>
      <DrawPage />
    </RequireAuth>
  }
/>
```

**Análise:**
- `RequireAuth` verifica se usuário tem role `organizer`
- Rota `/sorteio/:competitionId` também protegida
- Proteção existe a nível de rota
- MAS não há verificação a nível de competição (organizador da competição vs organizador do sistema)

**Risco:** Baixo — autenticação básica funciona
**Gap:** Não valida se o organizador é o dono da competição específica

---

## 7. Integridade do Resultado

### Cenário: Alteração do sorteio após ser salvo e homologado

**Risco:** Médio

**Situação:**
- Sorteio salvo às 10h
- Partidas começam às 14h
- Organizador abre DrawPage novamente e refaz o sorteio às 12h
- Salva novamente, sobrescrevendo o sorteio original

**Análise:**
- Não há mecanismo de "congelar" ou versionar sorteios
- Pode sobrescrever sorteio de competição em andamento
- Não há log de alterações

**Mitigação atual:** Nenhuma
**Risco:** Sorteio pode ser alterado após início da competição

---

## 8. Falta de Validação de headSeeds

### Cenário: headSeeds contém IDs inválidos ou duplicados

**Risco:** Baixo (comportamento definido, mas não intuitivo)

**Análise:**
- IDs inválidos são silenciosamente ignorados
- IDs duplicados podem causar comportamento inesperado
- UI limita a `groupsCount` cabeças, mas o motor não valida

**Mitigação atual:** Limitação na UI
**Risco:** Divergência entre comportamento esperado e real

---

## 9. Injeção de Dados

### Cenário: Campos de texto com caracteres especiais

**Risco:** Baixo

**Análise:**
- Nomes de equipes são armazenados como strings
- Não há sanitização explícita no código de sorteio
- A renderização React escapa por padrão
- Risko de XSS é mitigado pelo framework

**Risco:** Baixo — React escapa por padrão

---

## 10. Falta de Rate Limiting

### Cenário: Usuário executa many requests

**Risco:** Baixo

**Análise:**
- Não há rate limiting implementado
- Usuário pode clicar "Realizar Sorteio" infinitamente
- Cada execução gera nova seed e atualiza preview

**Mitigação atual:** Nenhuma
**Risco:** Baixo — operações são leves e não afetam o servidor (LocalStorage)

---

## Resumo de Riscos

| ID | Risco | Severidade | Impacto | Mitigação |
|----|-------|------------|---------|-----------|
| 1 | Duplo clique em "Realizar Sorteio" | Baixo | Visual apenas | Nenhuma |
| 2 | Duplo clique em "Salvar" | Alto | Dados duplicados | Parcial (saving state) |
| 3 | Concorrência (2 usuários) | Alto | Perda de dados | Nenhuma |
| 4 | Falha parcial durante save | Crítico | Estado corrompido | Nenhuma |
| 5 | Manipulação via DevTools | Médio | Sorteio fraudado | Nenhuma |
| 6 | Acesso não-autorizado | Baixo | Acesso indevido | RequireAuth |
| 7 | Sorteio alterável após início | Médio | Competição prejudicada | Nenhuma |
| 8 | headSeeds inválidos | Baixo | Comportamento estranho | UI (parcial) |
| 9 | Injeção XSS | Baixo | XSS | React escape |
| 10 | Rate limiting | Baixo | DoS leve | Nenhuma |

---

## Recomendações para FASE 2

1. **Transacionalidade**: Agrupar saveDraw + createMatch em transação
2. **Optimistic Locking**: Adicionar campo `version` ou `updatedAt` para detectar conflitos
3. **Bloqueio de sorteio**: Adicionar flag `drawLocked` na competição após início
4. **Validação server-side**: Validar headSeeds no Supabase (constraints)
5. **Debounce**: Implementar debounce nos botões de ação
6. **Log de auditoria**: Registrar quem fez o que e quando
