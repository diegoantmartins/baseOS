# BASEOS — AUDITORIA COMPLETA, PADRONIZAÇÃO E CONTROLE DE QUALIDADE

## IDENTIDADE DA SKILL

Nome:
BaseOS Audit & Quality Control

Versão:
1.0

Objetivo:
Auditar o BaseOS de ponta a ponta antes da implementação de novas funcionalidades, identificando problemas de linguagem, UX/UI, funcionalidade, arquitetura, dados, segurança, responsividade, acessibilidade, performance e consistência operacional.

Esta skill existe para garantir que o BaseOS evolua como um produto profissional de gestão de competições esportivas, confiável, consistente, previsível e preparado para operação real.

O BaseOS não deve parecer um conjunto de telas independentes produzidas por IA.

Ele deve funcionar como um produto único.

---

# 1. PRINCÍPIO FUNDAMENTAL

A primeira execução desta skill é exclusivamente de AUDITORIA.

NÃO ALTERAR O CÓDIGO DURANTE A AUDITORIA.

Fluxo obrigatório:

ANALISAR
↓
MAPEAR
↓
INVESTIGAR
↓
IDENTIFICAR
↓
COMPROVAR
↓
CLASSIFICAR
↓
PRIORIZAR
↓
RELATAR
↓
PROPOR CORREÇÕES
↓
AGUARDAR AUTORIZAÇÃO
↓
IMPLEMENTAR
↓
TESTAR
↓
AUDITAR NOVAMENTE

A IA possui autonomia para investigar.

A IA NÃO possui autonomia para alterar arquitetura, banco de dados ou regras de negócio durante a auditoria.

---

# 2. OBJETIVOS DA AUDITORIA

A auditoria deve responder:

1. O sistema funciona?
2. Os fluxos principais funcionam de ponta a ponta?
3. A interface está consistente?
4. Todos os textos estão em português do Brasil?
5. Existem termos em inglês desnecessários?
6. Existem títulos usando "&"?
7. Existem nomenclaturas diferentes para o mesmo conceito?
8. Existem funcionalidades quebradas?
9. Existem regras duplicadas?
10. Existem dados inconsistentes?
11. Existem problemas de segurança?
12. Existem problemas de responsividade?
13. Existem problemas de acessibilidade?
14. Existem problemas de performance?
15. Existem erros de TypeScript?
16. Existem problemas de testes?
17. Existem componentes duplicados?
18. Existem códigos mortos?
19. Existem estados de erro, carregamento e vazio ausentes?
20. As rotas estão corretas?
21. Os links estão corretos?
22. A Central de Ajuda aponta para as telas corretas?
23. Os contratos entre UI, hooks, serviços e dados estão corretos?
24. As regras de negócio estão centralizadas?
25. O fluxo completo da competição funciona?
26. As súmulas funcionam para 3 e 5 sets?
27. A classificação é consistente?
28. O mata-mata funciona?
29. A homologação funciona?
30. O sistema está preparado para a próxima fase?

---

# 3. NÃO REGRESSÃO

O BaseOS já possui funcionalidades implementadas.

Portanto:

NÃO reescrever funcionalidades que já funcionam sem necessidade.

NÃO substituir arquitetura existente apenas por preferência.

NÃO criar abstrações desnecessárias.

NÃO duplicar serviços.

NÃO duplicar regras de negócio.

NÃO alterar banco de dados sem necessidade explícita.

NÃO remover código funcional sem comprovar que está obsoleto.

NÃO substituir bibliotecas sem justificativa técnica.

NÃO modificar múltiplas áreas do sistema apenas para padronização estética sem avaliar impacto.

Toda alteração deve possuir justificativa.

---

# 4. MODOS DE EXECUÇÃO

A skill possui dois modos.

---

## MODO 1 — AUDITORIA

Modo padrão.

Durante este modo:

NÃO modificar arquivos.

NÃO corrigir código.

NÃO alterar banco.

NÃO refatorar arquitetura.

NÃO executar migrações.

NÃO substituir componentes.

Apenas:

- analisar;
- mapear;
- testar;
- investigar;
- documentar;
- classificar;
- recomendar.

Resultado:

RELATÓRIO DE AUDITORIA.

---

## MODO 2 — CORREÇÃO

Somente executar quando o usuário autorizar explicitamente.

Fluxo:

PROBLEMAS APROVADOS
↓
PLANEJAMENTO
↓
IMPLEMENTAÇÃO
↓
TESTE
↓
VALIDAÇÃO
↓
AUDITORIA DE REGRESSÃO

Corrigir problemas em pequenos lotes.

Nunca corrigir tudo simultaneamente.

---

# 5. INVENTÁRIO OBRIGATÓRIO

Antes de analisar problemas, mapear a arquitetura atual.

Identificar, quando existirem:

```text
src/
├── pages/
├── components/
├── services/
├── hooks/
├── types/
├── data/
├── lib/
├── utils/
├── test/
├── stores/
├── contexts/
└── ...