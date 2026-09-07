# BASEOS — FASE 3.1: Analise de Riscos

## 1. Matriz de Riscos

### RISK-01: WebGL Indisponivel
| Campo | Valor |
|-------|-------|
| Risco | Dispositivo do usuario nao suporta WebGL |
| Probabilidade | Media (5-10% de usuarios mobile antigos) |
| Impacto | Alto — impossibilita visualizacao 3D |
| Mitigacao | Deteccao antecipada via `useWebGLCapability()`, fallback automatico para `DrawPresentation2D` |

### RISK-02: Performance em Dispositivos Fracos
| Campo | Valor |
|-------|-------|
| Risco | Mobile antigo ou GPU integrada lenta |
| Probabilidade | Alta (20-30%) |
| Impacto | Alto — lag, stuttering, travamento |
| Mitigacao | `preferLowPower` → fallback 2D; DPR reduzido; sem sombras em mobile; limite de particulas; PerformanceMonitor |

### RISK-03: Bundle Inflation
| Campo | Valor |
|-------|-------|
| Risco | Adicionar ~650KB de libs 3D |
| Probabilidade | Media |
| Impacto | Medio — tempo de carregamento inicial maior |
| Mitigacao | Lazy loading via `React.lazy()`; chunks separados no Vite; tree-shaking ativo |

### RISK-04: SSR/Hydration Mismatch
| Campo | Valor |
|-------|-------|
| Risco | Se migrar para SSR, WebGL nao funciona no servidor |
| Probabilidade | Baixa (atualmente SPA) |
| Impacto | Critico |
| Mitigacao | Client-side only rendering; `Suspense` boundaries; verificacao `typeof window !== 'undefined'` |

### RISK-05: Memory Leaks no Canvas 3D
| Campo | Valor |
|-------|-------|
| Risco | Geometrias, materiais, texturas nao liberados |
| Probabilidade | Media |
| Impacto | Alto — travamento do navegador apos multiplos sorteios |
| Mitigacao | Cleanup no `useEffect` return; R3F disposes automaticamente; `useTexture` gerencia lifecycle |

### RISK-06: Event Listeners Residuais
| Campo | Valor |
|-------|-------|
| Risco | Keydown/resize listeners nao removidos |
| Probabilidade | Media |
| Impacto | Medio |
| Mitigacao | Cleanup no `useEffect` return; hooks customizados com cleanup |

### RISK-07: Canvas Resize
| Campo | Valor |
|-------|-------|
| Risco | Redimensionamento da janela nao ajusta renderer |
| Probabilidade | Media |
| Impacto | Baixo — distorcao visual |
| Mitigacao | Canvas com `width: 100%; height: 100%`; `gl.setSize()` no resize; NAO recriar renderer |

### RISK-08: Logos de Equipes — Falha de Carregamento
| Campo | Valor |
|-------|-------|
| Risco | Logo nao carrega (404, CORS, timeout) |
| Probabilidade | Media |
| Impacto | Medio — equipe sem identidade visual |
| Mitigacao | Fallback para inicial + cor do grupo; timeout de 5s; placeholder durante loading |

### RISK-09: Imagens Externas — CORS
| Campo | Valor |
|-------|-------|
| Risco | Carregar logo de dominio externo sem permissao |
| Probabilidade | Alta (URLs externas) |
| Impacto | Alto — textura nao carrega, erro WebGL |
| Mitigacao | Proxy server-side para imagens; `crossOrigin='anonymous'`; fallback para placeholder |

### RISK-10: Animacao Interrompida
| Campo | Valor |
|-------|-------|
| Risco | Usuario fecha modal durante revelacao |
| Probabilidade | Alta |
| Impacto | Medio — estado inconsistente |
| Mitigacao | Cancelamento via `cancel()`; estado persistente em localStorage; verificacao de integridade |

### RISK-11: Modal Desmontando
| Campo | Valor |
|-------|-------|
| Risco | Componente 3D desmonta abruptamente |
| Probabilidade | Baixa |
| Impacto | Alto — possivel memory leak |
| Mitigacao | `AnimatePresence` controla desmontagem; cleanup em `useEffect` return |

### RISK-12: Mudanca de Competicao Durante Sorteio
| Campo | Valor |
|-------|-------|
| Risco | Usuario navega para outra competicao durante revelacao |
| Probabilidade | Baixa |
| Impacto | Alto — dados em cache invalidos |
| Mitigacao | Bloqueio de navegacao durante `state !== 'idle'`; confirmacao antes de sair |

### RISK-13: Resultado Incompleto na Persistencia
| Campo | Valor |
|-------|-------|
| Risco | `saveDrawWithMatches` falha apos revelacao |
| Probabilidade | Baixa |
| Impacto | Alto — sorteio nao salvo |
| Mitigacao | Toast de erro; retry manual; validacao antes de fechar modal |

### RISK-14: Estado Inconsistente 2D vs 3D
| Campo | Valor |
|-------|-------|
| Risco | Ambos estados visiveis ao mesmo tempo |
| Probabilidade | Baixa |
| Impacto | Medio — confusao visual |
| Mitigacao | `DrawOrchestrator` garante apenas um ativo; selector exclusivo |

## 2. Riscos de Infraestrutura

### RISK-15: Three.js Breaking Changes
| Campo | Valor |
|-------|-------|
| Risco | Atualizacao de major version quebra API |
| Probabilidade | Media |
| Impacto | Alto |
| Mitigacao | Lock em `package.json` com versao exata; testes E2E; CHANGELOG review antes de upgrade |

### RISK-16: React 19 Migration
| Campo | Valor |
|-------|-------|
| Risco | Mudancas de reconciler afetam R3F |
| Probabilidade | Media (longo prazo) |
| Impacto | Medio |
| Mitigacao | Acompanhar issues do R3F; manter compatibilidade com React 18 LTS |

## 3. Risk Assessment Summary

| ID | Severidade | Acoes |
|----|-----------|-------|
| RISK-01 | Alta | Implementar fallback robusto |
| RISK-02 | Alta | PerformanceMonitor + fallback |
| RISK-03 | Media | Lazy loading + code splitting |
| RISK-05 | Alta | Testes de memoria; cleanup |
| RISK-09 | Alta | Proxy de imagens; CORS |
| RISK-10 | Media | Persistencia de estado |

## 4. Plano de Resposta

1. Implementar `useWebGLCapability` com deteccao antecipada
2. Implementar `useDrawReveal` com cancelamento
3. Proxy para imagens externas (se necessario na Fase 3.2+)
4. Testes automatizados de cleanup
5. Monitoramento de performance em producao
