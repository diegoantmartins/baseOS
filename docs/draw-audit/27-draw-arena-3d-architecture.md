# 27 — Draw Arena 3D Architecture

## Visão Geral

A arquitetura 3D define como os objetos são representados, iluminados e organizados no espaço tridimensional.

**Stack tecnológico:** Three.js + React Three Fiber + Drei

---

## 1. ESTRUTURA DE CENA (Scene Graph)

```
Three.js Scene
├── Canvas (React Three Fiber)
│
├── Lights
│   ├── AmbientLight (iluminação geral)
│   ├── DirectionalLight (urna)
│   ├── PointLight (grupos - dinâmico)
│   └── SpotLight (equipe selecionada - dinâmico)
│
├── Arena (Grupo 3D)
│   ├── Background (Skybox ou plane)
│   ├── Floor/Platform
│   ├── Urna Central
│   │   ├── OuterSphere
│   │   ├── InnerSphere
│   │   ├── Particles (internas)
│   │   └── Glow (post-processing)
│   │
│   ├── Teams (Grupo dinâmico)
│   │   ├── TeamToken[0]
│   │   ├── TeamToken[1]
│   │   ├── TeamToken[2]
│   │   └── ... (até 24-30 tokens)
│   │
│   ├── Groups (Grupo dinâmico)
│   │   ├── GroupStation[A]
│   │   │   ├── Platform
│   │   │   ├── Card
│   │   │   └── Light (dinâmico)
│   │   ├── GroupStation[B]
│   │   └── ... (até 6 grupos)
│   │
│   └── Particles (Camada de ambiente)
│       ├── Dust/Fog
│       ├── Flying particles
│       └── Light rays (opcional)
│
├── Camera (Perspectiva)
│
├── Post-Processing
│   ├── Bloom (glow)
│   ├── Depth of Field
│   └── Color Grading (opcional)
│
└── HUD (Renderizado via DOM/Canvas overlay)
    ├── CompetitionHeader
    ├── Progress
    ├── CurrentTeam
    ├── Controls
    └── GroupStatus
```

---

## 2. OBJETOS 3D PRINCIPAIS

### 2.1 Urna Central (DrawUrn)

**Propósito:** Representação visual do mecanismo do sorteio

**Geometrias:**
```typescript
// Opção A: Procedural (gerada em código)
const geometry = new THREE.IcosahedronGeometry(
  radius: 80,
  detail: 4  // resolução
);

// Opção B: Loaded (importada de modelo)
const gltf = await loader.loadAsync('urn.glb');
const geometry = gltf.scene;
```

**Materiais:**
```typescript
const material = new THREE.MeshStandardMaterial({
  color: 0xf6c76b,  // Ouro
  metalness: 0.8,
  roughness: 0.2,
  emissive: 0x8b6914,
  emissiveIntensity: 0.3
});
```

**Componentes:**

1. **Esfera externa (vidro)**
   - Transparência: 0.3
   - Refração: Simulada com normal map
   - Reflexo especular alto

2. **Esfera interna (núcleo)**
   - Cor dourada brilhante
   - Emissive para glow
   - Partes giram continuamente

3. **Partículas internas**
   - Pequenas esferas que giram
   - Representam bolas do sorteio
   - Efeito de movimento orgânico

4. **Glow (Post-processing)**
   - Bloom shader
   - Intensidade aumenta quando "respirando"
   - Cor: Dourada/azulada

**Animações:**
```typescript
// Rotação contínua
rotation.z += 0.01;  // ~1 RPM

// Pulsação (respiração)
scale.multiplyScalar(
  1 + 0.05 * Math.sin(time * 2)  // Pulsação suave
);

// Glow dinâmico
emissiveIntensity = 0.3 + 0.3 * Math.sin(time * 3);
```

### 2.2 Team Tokens (DrawTeamToken)

**Propósito:** Representar cada equipe visualmente

**Geometria:**
```typescript
// Esfera simples
const geometry = new THREE.SphereGeometry(
  radius: 20,
  widthSegments: 32,
  heightSegments: 32
);
```

**Materiais:**
```typescript
// Opção 1: Com logo (texture)
const material = new THREE.MeshStandardMaterial({
  map: textureLoader.load(team.logoUrl),
  metalness: 0.3,
  roughness: 0.4
});

// Opção 2: Cor sólida (fallback)
const material = new THREE.MeshStandardMaterial({
  color: team.primaryColor || 0x1e293b,
  metalness: 0.2,
  roughness: 0.6
});
```

**Posicionamento:**
```typescript
// Órbita ao redor da urna
const angle = (teamIndex / teamCount) * Math.PI * 2;
const radius = 150;  // Distância da urna

position.x = Math.cos(angle) * radius;
position.y = Math.sin(angle) * radius * 0.6;
position.z = 50 + Math.sin(angle * 2) * 30;  // Ligeira ondulação
```

**Estados:**

1. **Repouso (Em órbita)**
   - Scale: 1.0
   - Opacity: 0.85
   - Glow: 0 (sem destaque)

2. **Selecionado (Destacado)**
   - Scale: 1.4
   - Opacity: 1.0
   - Glow: Intenso (bloom)
   - Rotação: Aumenta velocidade

3. **Voando (Trajetória)**
   - Position: Interpolada
   - Rotation: Acompanha trajetória
   - Glow: Constante
   - Trail: Partículas seguem

4. **Acomodado (No grupo)**
   - Position: Dentro do grupo
   - Scale: 0.8
   - Opacity: Reduzida
   - Glow: 0

### 2.3 Group Stations (DrawGroupStation)

**Propósito:** Plataforma visual onde equipes se acomodam

**Componentes:**

1. **Plataforma 3D**
   ```typescript
   const geometry = new THREE.BoxGeometry(200, 150, 40);
   const material = new THREE.MeshStandardMaterial({
     color: 0x060f1a,
     metalness: 0.4,
     roughness: 0.6,
     emissive: 0x1e293b
   });
   ```

2. **Card informativo**
   - Nome do grupo (texto renderizado como canvas)
   - Contador de equipes
   - Última equipe adicionada

3. **Rim light dinâmico**
   - Point light que emite quando equipe chega
   - Cor: Roxo (#8b5cf6)
   - Intensidade: Crescente na chegada

**Posicionamento:**
```typescript
// Para 4 grupos
const positions = [
  { x: -280, y: -200 },  // Grupo A
  { x:  280, y: -200 },  // Grupo B
  { x: -280, y:  200 },  // Grupo C
  { x:  280, y:  200 }   // Grupo D
];

// Distância Z pode variar levemente
group.position.z = Math.random() * 20;
```

**Animações:**

1. **Repouso**
   ```typescript
   scale.multiplyScalar(1 + 0.02 * Math.sin(time));
   emissive.intensity = 0.1;
   ```

2. **Recepção (GROUP_IMPACT)**
   ```typescript
   scale.multiplyScalar(1.1);  // Expandir
   shake with noise for 0.4s;  // Vibrar
   emissiveIntensity = 0.5;    // Brilhar
   ```

### 2.4 Ambiente (Background + Platform)

**Skybox (Background):**
```typescript
// Opção A: Cor sólida com degradê
const geometry = new THREE.SphereGeometry(1000, 32, 32);
const material = new THREE.MeshBasicMaterial({
  color: 0x020816,
  side: THREE.BackSide
});

// Opção B: Texture (HDR)
const loader = new RGBELoader();
const texture = await loader.loadAsync('arena.hdr');
scene.background = texture;
scene.environment = texture;
```

**Floor/Platform:**
```typescript
const geometry = new THREE.PlaneGeometry(2000, 2000);
const material = new THREE.MeshStandardMaterial({
  color: 0x050c1d,
  metalness: 0.3,
  roughness: 0.7,
  
  // Grid texture (subtle)
  map: gridTexture
});
platform.rotation.x = -Math.PI / 2;
platform.position.y = -100;
```

---

## 3. SISTEMA DE ILUMINAÇÃO

### 3.1 Ambient Light (Iluminação Geral)

```typescript
const ambientLight = new THREE.AmbientLight(
  color: 0xffffff,
  intensity: 0.3  // Suave
);
scene.add(ambientLight);
```

**Propósito:** Garantir que tudo seja minimamente iluminado

### 3.2 Directional Light (Urna Principal)

```typescript
const directionalLight = new THREE.DirectionalLight(
  color: 0xffffff,
  intensity: 0.8
);
directionalLight.position.set(200, 300, 200);
directionalLight.castShadow = true;

// Configurar shadow map
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.far = 2000;

scene.add(directionalLight);
```

**Propósito:** Iluminar urna e criar sombras

### 3.3 Point Light Dinâmico (Equipe Selecionada)

```typescript
const spotlightTeam = new THREE.PointLight(
  color: 0xffffff,
  intensity: 1.2
);

// Segue a equipe selecionada
spotlightTeam.position.copy(selectedTeam.position);
spotlightTeam.position.z += 100;

scene.add(spotlightTeam);
```

**Ativa quando:** TEAM_SELECTED até GROUP_IMPACT

### 3.4 Point Lights nos Grupos (Dinâmicos)

```typescript
// Um por grupo
const groupLights = groups.map(group => {
  const light = new THREE.PointLight(
    color: 0x8b5cf6,  // Roxo
    intensity: 0      // Começa desligado
  );
  light.position.copy(group.position);
  light.position.z += 50;
  return light;
});
```

**Ativa quando:** Equipe chega no grupo (GROUP_IMPACT)
**Atenuação:** Decresce após impacto

---

## 4. POST-PROCESSING

### 4.1 Bloom (Glow)

```typescript
const bloomPass = new UnrealBloomPass(
  resolution: new THREE.Vector2(width, height),
  strength: 1.5,
  radius: 0.8,
  threshold: 0.2
);

composer.addPass(bloomPass);
```

**Aplicado a:**
- Urna (sempre)
- Equipe selecionada (quando destacada)
- Grupos (quando recebendo)
- Partículas (leve)

### 4.2 Depth of Field (Foco seletivo)

```typescript
const depthOfFieldPass = new DepthOfFieldPass(
  camera,
  {
    focusDistance: 300,
    bokehScale: 15,
    height: 480
  }
);

composer.addPass(depthOfFieldPass);
```

**Uso:**
- Foca na urna durante sorteio
- Foca na equipe durante voo
- Foca no grupo durante impacto

### 4.3 Color Grading (Opcional)

```typescript
// LUT (Look-Up Table) para cor cinematográfica
const lutPass = new LUTPass(
  texture3D: cinemaLUT
);

composer.addPass(lutPass);
```

**Efeito:** Cores mais quentes/saturas, estilo cinema

---

## 5. SISTEMA DE PARTÍCULAS

### 5.1 Partículas Internas (Urna)

```typescript
const particles = [];
for (let i = 0; i < 50; i++) {
  const geometry = new THREE.SphereGeometry(5, 8, 8);
  const material = new THREE.MeshStandardMaterial({
    color: 0xf4d590,
    emissive: 0xf6c76b,
    emissiveIntensity: 0.5
  });
  const sphere = new THREE.Mesh(geometry, material);
  
  // Posição aleatória dentro da urna
  sphere.position.randomDirection().multiplyScalar(70);
  urn.add(sphere);
  particles.push(sphere);
}

// Animação
particles.forEach(p => {
  p.position.applyAxisAngle(yAxis, 0.005);
});
```

### 5.2 Partículas de Voo (Trail)

```typescript
// Ao longo da trajetória da equipe
const trail = new Trail(selectedTeam, {
  length: 20,
  particleSize: 3,
  color: 0xf6c76b,
  opacity: 0.8
});

trail.update(deltaTime);  // Cada frame
```

### 5.3 Partículas de Impacto

```typescript
// Quando equipe atinge grupo
const impactParticles = new Particles({
  position: groupPosition,
  count: 30,
  velocity: randomDirection * 200,
  color: 0x8b5cf6,
  lifetime: 0.8,
  gravityScale: 0.5
});
```

---

## 6. PERFORMANC OTIMIZATIONS

### 6.1 Instancing

```typescript
// Ao invés de 24 meshes individuais, usar instanced geometry
const geometry = new THREE.SphereGeometry(20, 16, 16);
const material = new THREE.MeshStandardMaterial();
const instances = new THREE.InstancedMesh(
  geometry, 
  material, 
  teamCount
);

teams.forEach((team, i) => {
  const matrix = new THREE.Matrix4();
  matrix.setPosition(team.position);
  instances.setMatrixAt(i, matrix);
});
```

**Benefício:** 1 drawcall ao invés de 24

### 6.2 LOD (Level of Detail)

```typescript
const lod = new THREE.LOD();

// Alta resolução (próximo)
lod.addLevel(urnaHighPoly, 0);

// Média resolução (médio)
lod.addLevel(urnaMediumPoly, 400);

// Baixa resolução (distante)
lod.addLevel(urnaLowPoly, 800);

scene.add(lod);
```

### 6.3 Frustum Culling

Automático no Three.js. Objetos fora da câmera não são renderizados.

### 6.4 Texture Optimization

```typescript
// Comprimir texturas
const loader = new THREE.TextureLoader();
const texture = await loader.loadAsync('team.jpg');

// Mipmap automático
texture.generateMipmaps = true;
texture.minFilter = THREE.LinearMipmapLinearFilter;

// Anisotropic filtering
texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
```

---

## 7. COMPATIBILIDADE COM REDUCED MOTION

**Com reduced-motion ativo:**
- Desabilitar animação de partículas
- Congelar rotação (urna estática)
- Reduzir bloom
- Sem depth of field (tudo focado)
- Sem camera shake

**Mantém:**
- Iluminação estática
- Cores e materiais
- Geometrias e estrutura
- Informação visual

---

## 8. MOBILE FALLBACK

**Em dispositivos com GPU fraca:**

1. Reduzir quantidade de partículas (50% → 25%)
2. Desabilitar bloom
3. Usar texturas de menor resolução
4. Simplificar geometrias (menos segments)
5. Reduzir shadow map resolution
6. Desabilitar depth of field

**Resultado:** Ainda funciona, mas mais simples visualmente

---

## 9. TESTES E DEBUGGING

### 9.1 Wireframe Mode

```typescript
// Visualizar estrutura poligonal
material.wireframe = true;
```

### 9.2 Shadow Map Visualization

```typescript
// Ver o que câmera de shadow enxerga
scene.add(new THREE.CameraHelper(
  directionalLight.shadow.camera
));
```

### 9.3 Bounding Box

```typescript
const box = new THREE.BoxHelper(object, 0xff0000);
scene.add(box);
```

---

## 10. CONCLUSÃO

A arquitetura 3D:
- ✅ Utiliza Three.js eficientemente
- ✅ Balanceia qualidade visual × performance
- ✅ Escalável para diferentes dispositivos
- ✅ Suporta acessibilidade com fallbacks

**Próximo:** Plano de Performance e Acessibilidade
