# BaseOS — Livro Oficial de Incidentes do Torneio de Testes

**Torneio:** Ensaio Geral de Pré-Produção / Validação Operacional do VOLTZ  
**Regra de Ouro:** Qualquer anomalia, comportamento não esperado, falha de validação ou **necessidade de intervenção manual no banco ou no código** DEVE ser registrada neste livro. Nenhuma alteração silenciosa é permitida.

---

## 1. Critérios de Classificação de Incidentes

- **CRÍTICO:** Corrupção de dados, classificação incorreta, chaveamento quebrado, falha em registrar placar, alteração de regras congeladas ou bloqueio total da operação. **Bloqueia o VOLTZ.**
- **ALTO:** Falha operacional grave com necessidade de contorno complexo ou degradação sensível da experiência. **Normalmente bloqueia o VOLTZ.**
- **MÉDIO:** Problema funcional contornável, bug cosmético na interface ou inconsistência não impeditiva.
- **BAIXO:** Pequeno ajuste de texto, label ou layout.

---

## 2. Template Padrão de Registro de Incidente

```markdown
### INCIDENTE #000

- **Data / Hora:** AAAA-MM-DD HH:MM
- **Etapa:** (Cadastro | Inscrição | Sorteio | Partida | Classificação | Mata-Mata | Súmula | Relatórios)
- **Operação:** (Ex.: Registrar placar 3x2 da semifinal)
- **Operador / Perfil:** (Ex.: Administrador / Mesário / Organizador)
- **Comportamento Esperado:** (O que a regra de negócio determinava que ocorresse)
- **Comportamento Observado:** (O que efetivamente aconteceu na aplicação)
- **Impacto Esportivo / Operacional:** (Ex.: Tabela calculou 1 ponto a menos; Chave gerou confronto inválido)
- **Passos para Reprodução:**
  1. Passo 1...
  2. Passo 2...
- **Evidência / Screenshot / Log:** (Link para arquivo ou log de erro)
- **Classificação de Gravidade:** (CRÍTICO | ALTO | MÉDIO | BAIXO)
- **Correção Necessária:** (Descrição técnica da correção requerida)
- **Teste Automatizado de Regressão Criado:** (Caminho do arquivo `.test.ts`)
- **Status:** (ABERTO | EM INVESTIGAÇÃO | CORRIGIDO | VALIDADO)
```

---

## 3. Registro Histórico de Incidentes

*(Nenhum incidente registrado até o momento. A registrar durante a realização do torneio de testes).*

| ID | Data | Etapa | Descrição Sintética | Gravidade | Status |
| :--- | :--- | :--- | :--- | :---: | :---: |
| *#---* | *--/--* | *Aguardando início do torneio* | *Nenhum incidente ativo* | *--* | *--* |
