# 14 — Resultados de Performance

## Estratégia adotada
- movimento visual limitado a poucos elementos simultâneos
- animações por `framer-motion` com controle simples
- partículas e efeitos restritos para não prejudicar o rendering
- ausência de heavy physics ou custo exagerado

## Impacto esperado
- render leve e responsivo
- boa experiência em desktop e mobile
- compatibilidade com a arquitetura atual sem adicionar dependências pesadas

## Recomendação
Caso a experiência 3D seja ampliada, convém migrar para uma renderização mais especializada em WebGL ou instancing em uma etapa posterior.
