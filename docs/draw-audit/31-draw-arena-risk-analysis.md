# 31 — Draw Arena Risk Analysis

## Matriz de Riscos

| Risco | Probabilidade | Impacto | Severidade | Mitigação |
|-------|---------------|---------|-----------|-----------|
| Memory leak em three.js | Média | Alto | 🔴 CRÍTICO | Profiling, testes de stress |
| Regressão no sorteio | Baixa | Crítico | 🔴 CRÍTICO | Testes mantidos, código isolado |
| Performance ruim em mobile | Alta | Médio | 🟡 IMPORTANTE | Degradação progressiva |
| Incompatibilidade WebGL | Baixa | Alto | 🟡 IMPORTANTE | Fallback CSS 3D |
| Bundle size explosion | Média | Médio | 🟡 IMPORTANTE | Code-splitting, monitoring |
| Quebra no IE11 | Baixa | Baixo | 🟢 MENOR | Documentação, aviso ao usuário |

---

## 1. RISCOS CRÍTICOS (🔴)

### 1.1 Regressão no Motor de Sorteio

**Cenário:** Alteração acidental em `drawService.ts` quebra o sorteio

**Probabilidade:** Baixa (altamente improvável)
- Código de sorteio está isolado
- Testes cobrem 80%+
- Code review mandatório

**Impacto:** Crítico
- Sorteio produz resultados inválidos
- Competição comprometida
- Reputação da plataforma afetada

**Mitigação:**

1. **Não tocar em drawService**
   ```typescript
   // ESLint rule:
   // "no-modify-export": "error"
   ```

2. **Testes aumentados**
   ```bash
   npm test src/services/drawService.test.ts -- --coverage=100
   ```

3. **Code review strict**
   - 2 aprovações para qualquer mudança em draw
   - Tests devem passar 100%

4. **Rollback plan**
   ```bash
   git revert --no-commit <commit-hash>
   npm test  # Validate antes de commit
   ```

**Resgate:**
- Manter branch em produção estável
- Feature flag para novo código
- A/B test antes de 100% rollout

---

### 1.2 Memory Leak em Three.js

**Cenário:** Múltiplas execuções de sorteio causam crescimento infinito de memória

**Probabilidade:** Média (comum em WebGL se não cuidado)
- Three.js pode manter referências antigas
- Particles podem não ser limpas
- Textures podem não ser liberadas

**Impacto:** Alto
- Após 10+ sorteios, browser trava
- Mobile é afetado mais rápido
- Presentation no evento falha

**Mitigação:**

1. **Cleanup explícito**
   ```typescript
   useEffect(() => {
     return () => {
       // Cleanup on unmount
       geometry.dispose();
       material.dispose();
       texture.dispose();
       scene.clear();
     };
   }, []);
   ```

2. **Profiling obrigatório**
   ```bash
   # Chrome DevTools > Memory
   # Heap snapshots antes/depois de sorteio
   # Validar: memória volta ao baseline
   ```

3. **Testes de stress**
   ```typescript
   test('10 consecutive draws should not leak memory', async () => {
     const initialMemory = performance.memory.usedJSHeapSize;
     
     for (let i = 0; i < 10; i++) {
       await runDraw();
       cleanupDraw();
     }
     
     gc();  // Force garbage collection
     const finalMemory = performance.memory.usedJSHeapSize;
     expect(finalMemory).toBeLessThan(initialMemory * 1.2);  // 20% margin
   });
   ```

4. **Monitoramento**
   ```typescript
   // Telemetry
   analytics.track('memory_usage', {
     heapUsed: performance.memory.usedJSHeapSize,
     drawCount: drawsPerformed
   });
   ```

---

## 2. RISCOS IMPORTANTES (🟡)

### 2.1 Performance Ruim em Mobile

**Cenário:** Draw Arena roda com 10 FPS em iPhone 12

**Probabilidade:** Alta
- Three.js é GPU-intensive
- Mobile GPU é limitada
- Network conexão pode ser lenta

**Impacto:** Médio
- Experiência degradada
- Alguns usuários excluídos
- Funcionalidade ainda existe (fallback)

**Mitigação:**

1. **Degradação Progressiva**
   ```javascript
   if (isMobile && isLowEndGPU) {
     return <DrawScene2DFallback />;  // Usar Framer Motion em 2D
   }
   ```

2. **GPU Detection**
   ```typescript
   function getGPUTier() {
     const canvas = document.createElement('canvas');
     const gl = canvas.getContext('webgl');
     const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
     const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
     
     if (renderer.includes('Apple A9')) return 'low';
     if (renderer.includes('Adreno 505')) return 'low';
     // ...
   }
   ```

3. **Settings per Tier**
   - Tier 1 (high): Bloom + DOF + Particles
   - Tier 2 (medium): Sem DOF, menos particles
   - Tier 3 (low): CSS 3D fallback

4. **Testing**
   - iPhone 12: Target 30+ FPS
   - iPhone 8: Target 20+ FPS
   - Pixel 3: Target 20+ FPS

---

### 2.2 Incompatibilidade WebGL

**Cenário:** Browser não suporta WebGL (Ex: IE 11, navegadores antigos)

**Probabilidade:** Baixa
- IE 11 é 5% do tráfego global
- Maioria dos usuários modernos

**Impacto:** Alto
- Usuário não consegue ver sorteio
- Funcionalidade bloqueada

**Mitigação:**

1. **Fallback Automático**
   ```typescript
   try {
     return <DrawArenaCinematic />;  // 3D
   } catch (error) {
     if (error.name === 'WebGLError') {
       return <DrawScene3D />;  // 2D com Framer Motion
     }
   }
   ```

2. **Detection**
   ```typescript
   function supportsWebGL() {
     try {
       const canvas = document.createElement('canvas');
       return !!(
         window.WebGLRenderingContext && 
         (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
       );
     } catch(e) {
       return false;
     }
   }
   ```

3. **User Notification**
   ```
   "Seu navegador não suporta a experiência 3D completa.
    Usando versão alternativa. Atualizar o navegador para melhor experiência."
   ```

---

### 2.3 Bundle Size Explosion

**Cenário:** Three.js + dependencies = 1.5MB gzipped (muito grande)

**Probabilidade:** Média
- Three.js é grande (~600KB)
- Dependências se acumulam
- Fácil adicionar mais coisas

**Impacto:** Médio
- Page load lento
- Mobile download lento
- Bounce rate pode aumentar

**Mitigação:**

1. **Code Splitting**
   ```typescript
   const DrawArenaCinematic = lazy(() => 
     import('./cinematic/DrawArenaCinematic')
   );
   
   // Carrega apenas quando necessário
   {isOpen && <Suspense><DrawArenaCinematic /></Suspense>}
   ```

2. **Dependency Audit**
   ```bash
   npm install -g webpack-bundle-analyzer
   webpack-bundle-analyzer dist/index.js
   
   # Identificar offenders
   # Remover se não crítico
   ```

3. **Target Size**
   - Add: ~100-150KB gzipped (Three.js overhead)
   - Total app: < 400KB gzipped
   - Mobile-friendly

4. **Monitoring**
   ```typescript
   // Track bundle size em CI
   if (bundleSize > 400 * 1024) {
     throw new Error('Bundle size exceeded!');
   }
   ```

---

## 3. RISCOS MENORES (🟢)

### 3.1 Compatibilidade com Browsers Antigos

**Cenário:** Firefox 70, Safari 12 não renderizam corretamente

**Probabilidade:** Baixa
- Suporte é para versões recentes
- Documentação deixa claro

**Impacto:** Baixo
- Fallback funciona mesmo assim
- Experiência degradada apenas

**Mitigação:**
- Documentar browser requirements
- Mensagem amigável se incompatível

---

## 4. RISCOS DE NEGÓCIO

### 4.1 Tempo de Implementação (Slip)

**Risco:** 15 semanas podem virar 20+

**Mitigação:**
- Buffer de 2 semanas na timeline
- MilestoneReviews a cada fase
- Escalação se atrasado

### 4.2 Complexidade não prevista

**Risco:** Three.js learning curve maior que esperado

**Mitigação:**
- Especialista em Three.js desde início
- Proof of concept antes de fase 2
- Budget extra de horas

---

## 5. CONTINGENCY PLAN

### Se Performance for Ruim

```
Option 1: Reduzir escopo visual
  - Remover bloom
  - Reduzir particles
  - Simplificar geometrias

Option 2: Usar CSS 3D ao invés de WebGL
  - Backport de DrawScene3D existente
  - Menos impressionante, mas funciona

Option 3: Atrasar release
  - Passar por mais otimizações
  - Buscar especialista externo
```

### Se Memory Leak Ocorrer

```
Option 1: Reduzir quantidade de sorteios por sessão
  - Forçar refresh a cada 5 sorteios
  - Limpar cache entre

Option 2: Usar Pool pattern
  - Reutilizar geometrias/materiais
  - Não criar/destruir continuamente

Option 3: Voltar ao DrawScene3D
  - Feature flag desativa cinematografia
  - Mantém funcionalidade
```

### Se WebGL não funcionar em device

```
Option 1: Auto-detect e fallback
  - Browser vê incompatibilidade
  - Mostra versão CSS 3D automaticamente

Option 2: Força user a atualizar
  - Mostrar mensagem com links
  - Risco: perder usuário
```

---

## 6. TESTES DE RISCO

### 6.1 Teste de Compatibilidade

```bash
# Testar em múltiplos browsers
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
npx playwright test --project=mobile
```

### 6.2 Teste de Stress

```typescript
// 50 sorteios consecutivos
// Memory não deve crescer > 30%
// FPS não deve cair < 20
test('stress: 50 consecutive draws', async () => {
  for (let i = 0; i < 50; i++) {
    await runDraw();
    if (i % 10 === 0) gc();  // Occasional GC
  }
  // Validate performance metrics
});
```

### 6.3 Teste de Bundle

```bash
# Validar size em CI
npm run build
ls -lh dist/
# Erro se > 500KB gzipped
```

---

## 7. COMUNICAÇÃO DE RISCOS

### Antes de Launch

```
"Draw Arena Cinematográfica é uma experiência premium que requer:
 - Navegador moderno (Chrome 90+, Firefox 88+, Safari 14+)
 - GPU dedicada ou integrada recente
 - Para melhor experiência: desktop ou tablet

 Em dispositivos não suportados, a experiência alternativa será usada."
```

### Se Problema Ocorrer

```
"Estamos cientes do problema em [device/browser].
 Solução esperada: [data]
 Alternativa disponível: Use [fallback]"
```

---

## Conclusão

Riscos identificados e mitigados:

| Risco | Status |
|-------|--------|
| Regressão sorteio | 🟢 Mitigado |
| Memory leak | 🟢 Mitigado |
| Performance mobile | 🟢 Mitigado |
| WebGL incompatible | 🟢 Mitigado |
| Bundle size | 🟢 Mitigado |

**Confiança:** Alta (80%+) que implementação terá sucesso

Próximo: **Relatório Final da Fase 3.3**
