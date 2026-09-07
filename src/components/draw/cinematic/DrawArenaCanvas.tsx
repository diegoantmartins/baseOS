/**
 * DrawArenaCanvas
 *
 * Cena 3D do Draw Arena — Transmissão Esportiva Oficial de Alto Nível (Gala FIVB / UEFA / CBV).
 *
 * Apresentação visual cinematográfica:
 *  - Urna de vidro cristalino ultra-transparente com transmissão real e refração;
 *  - Pedestal de campeonato escultural com anéis dourados e cromo escuro;
 *  - Esferas de sorteio no estilo voleibol (painéis bicolores branco/azul/dourado) DENTRO da urna;
 *  - Iluminação dramática de estúdio de televisão (spotlight zenital, rim lights azul safira e luz interna dourada);
 *  - Piso de palco reflexivo com anéis concêntricos dourados de demarcação;
 *  - Elevação cinematográfica da esfera sorteada com halo radiante e rotação solene.
 */

import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MAX_PIXEL_RATIO } from '@/config/drawArenaFeatures';
import { headSeedOrdinalOf } from './groupArena';
import type { DrawResult, DrawGroup } from '@/types/draw';
import type { CompetitionRecord, TeamRecord } from '@/types/entities';
import type { DrawArenaState } from '@/types/drawCinematic';

interface DrawArenaCanvasProps {
  state: DrawArenaState;
  currentTeam: TeamRecord | null;
  currentGroup: DrawGroup | null;
  drawResult: DrawResult;
  competition: CompetitionRecord;
  teams?: TeamRecord[];
  onContextLost?: () => void;
}

type CameraPreset =
  | 'ESTABLISHING'
  | 'APPROACH'
  | 'DRAW'
  | 'REVEAL'
  | 'GROUP'
  | 'FINAL';

function getReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

const COLORS = {
  stageBg: '#05070e',
  floor: '#090d16',
  floorRing: '#f59e0b',
  pedestalDark: '#0f172a',
  pedestalGold: '#d97706',
  goldBright: '#fbbf24',
  chrome: '#cbd5e1',
  glass: '#e0f2fe',
  ballWhite: '#f8fafc',
  ballBlue: '#1d4ed8',
  ballGold: '#f59e0b',
  spotlight: '#ffffff',
  rimBlue: '#38bdf8',
  rimGold: '#f59e0b',
};

function getCameraTarget(preset: CameraPreset): { x: number; y: number; z: number } {
  switch (preset) {
    case 'ESTABLISHING':
      return { x: 0, y: 1.8, z: 6.8 };
    case 'APPROACH':
      return { x: 0, y: 1.5, z: 5.4 };
    case 'DRAW':
      return { x: 0, y: 1.3, z: 4.8 };
    case 'REVEAL':
      return { x: 0, y: 1.5, z: 4.5 };
    case 'GROUP':
      return { x: 0, y: 1.5, z: 5.2 };
    case 'FINAL':
      return { x: 0, y: 2.2, z: 7.2 };
  }
}

/**
 * Câmera cinematográfica suave com interpolação contínua
 */
function CinematicCamera({
  state,
  reducedMotion,
}: {
  state: DrawArenaState;
  reducedMotion: boolean;
}) {
  const { camera, pointer } = useThree();

  const preset: CameraPreset = useMemo(() => {
    switch (state) {
      case 'IDLE':
      case 'INTRO':
        return 'ESTABLISHING';
      case 'READY':
        return 'APPROACH';
      case 'DRAWING':
        return 'DRAW';
      case 'REVEAL':
        return 'REVEAL';
      case 'GROUP_UPDATE':
        return 'GROUP';
      case 'COMPLETE':
      default:
        return 'FINAL';
    }
  }, [state]);

  const lookTarget = useMemo(() => new THREE.Vector3(0, 0.8, 0), []);
  const target = useMemo(() => getCameraTarget(preset), [preset]);

  useFrame((_, delta) => {
    const px = reducedMotion ? 0 : pointer.x * (preset === 'REVEAL' ? 0.08 : 0.14);
    const py = reducedMotion ? 0 : pointer.y * (preset === 'REVEAL' ? 0.06 : 0.1);

    camera.position.x = THREE.MathUtils.damp(camera.position.x, target.x + px, 3.2, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, target.y + py, 3.2, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, target.z, 3.2, delta);

    camera.lookAt(lookTarget);
  });

  return null;
}

/**
 * Iluminação de estúdio televisivo de gala
 */
function LightingRig({
  state,
  reducedMotion,
}: {
  state: DrawArenaState;
  reducedMotion: boolean;
}) {
  const active = state === 'REVEAL' || state === 'GROUP_UPDATE';
  const drawing = state === 'DRAWING';

  return (
    <>
      {/* Luz ambiente fria balanceada para manter sombras profundas porém legíveis */}
      <ambientLight intensity={reducedMotion ? 0.6 : 0.75} color="#94a3b8" />

      {/* Spotlight principal zenital sobre a Urna */}
      <spotLight
        position={[0, 8.5, 1.5]}
        target-position={[0, 0.5, 0]}
        intensity={active ? 4.5 : drawing ? 3.8 : 3.0}
        color={COLORS.spotlight}
        angle={Math.PI / 4}
        penumbra={0.65}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0001}
      />

      {/* Rim light frontal/lateral quente (Dourado de gala) */}
      <directionalLight
        position={[5, 4, 4]}
        intensity={active ? 2.2 : 1.4}
        color={COLORS.rimGold}
      />

      {/* Rim light traseiro frio (Azul safira para recorte de silhueta no vidro) */}
      <directionalLight
        position={[-5, 5, -4]}
        intensity={active ? 2.4 : 1.6}
        color={COLORS.rimBlue}
      />

      {/* Luz inferior de palco para destacar o piso reflexivo */}
      <pointLight position={[0, -1.8, 2]} intensity={0.9} color="#38bdf8" distance={7} />
    </>
  );
}

/**
 * Estrutura cenográfica do palco de transmissão
 */
function SceneStructure() {
  return (
    <group position={[0, 0, 0]}>
      {/* Piso do palco circular reflexivo */}
      <mesh position={[0, -1.8, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[14, 64]} />
        <meshStandardMaterial
          color={COLORS.floor}
          metalness={0.7}
          roughness={0.25}
          envMapIntensity={0.8}
        />
      </mesh>

      {/* Anéis dourados concêntricos gravados no piso do auditório */}
      {[2.6, 4.2, 6.5].map((radius, i) => (
        <mesh
          key={radius}
          position={[0, -1.79, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[radius, radius + 0.035, 64]} />
          <meshBasicMaterial
            color={COLORS.floorRing}
            transparent
            opacity={0.35 - i * 0.08}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Halo de luz no fundo do estúdio */}
      <mesh position={[0, 2.5, -9]}>
        <torusGeometry args={[7.5, 0.04, 16, 100]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0284c7"
          emissiveIntensity={0.6}
          transparent
          opacity={0.4}
        />
      </mesh>
    </group>
  );
}

/**
 * A Urna de Vidro (Chamber de Cristal e Pedestal de Campeonato)
 */
function DrawChamber({
  state,
  reducedMotion,
}: {
  state: DrawArenaState;
  reducedMotion: boolean;
}) {
  const glassRef = useRef<THREE.Mesh>(null);
  const innerLightRef = useRef<THREE.PointLight>(null);
  const active = state === 'REVEAL' || state === 'GROUP_UPDATE';
  const drawing = state === 'DRAWING';

  useFrame((_, delta) => {
    if (innerLightRef.current) {
      const targetIntensity = active ? 4.5 : drawing ? 3.0 : 1.8;
      innerLightRef.current.intensity = THREE.MathUtils.damp(
        innerLightRef.current.intensity,
        targetIntensity,
        3.0,
        delta
      );
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* ── PEDESTAL ESCULPIDO (Base metálica nobre em camadas) ── */}
      {/* Base inferior larga */}
      <mesh position={[0, -1.6, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.95, 2.2, 0.35, 64]} />
        <meshStandardMaterial
          color={COLORS.pedestalDark}
          metalness={0.8}
          roughness={0.25}
        />
      </mesh>

      {/* Anel intermediário dourado polido */}
      <mesh position={[0, -1.4, 0]}>
        <torusGeometry args={[1.92, 0.06, 16, 64]} />
        <meshStandardMaterial
          color={COLORS.goldBright}
          metalness={0.9}
          roughness={0.2}
          emissive={COLORS.pedestalGold}
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Coluna central do pedestal */}
      <mesh position={[0, -1.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.55, 1.8, 0.7, 64]} />
        <meshStandardMaterial
          color="#1e293b"
          metalness={0.75}
          roughness={0.3}
        />
      </mesh>

      {/* Berço de encaixe da urna */}
      <mesh position={[0, -0.68, 0]} castShadow>
        <cylinderGeometry args={[1.65, 1.55, 0.12, 64]} />
        <meshStandardMaterial
          color={COLORS.goldBright}
          metalness={0.9}
          roughness={0.25}
        />
      </mesh>

      {/* ── A URNA DE CRISTAL (Vidro 100% Transparente e Luminoso de Alta Performance) ── */}
      <mesh ref={glassRef} position={[0, 0.45, 0]}>
        <cylinderGeometry args={[1.5, 1.5, 2.2, 48, 1, true]} />
        <meshPhysicalMaterial
          color="#dbeafe"
          transparent
          opacity={0.32}
          roughness={0.04}
          metalness={0.1}
          clearcoat={1.0}
          clearcoatRoughness={0.05}
          reflectivity={0.9}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Fundo de vidro transparente arredondado */}
      <mesh position={[0, -0.65, 0]}>
        <cylinderGeometry args={[1.48, 1.48, 0.05, 48]} />
        <meshStandardMaterial
          color="#dbeafe"
          transparent
          opacity={0.4}
          roughness={0.1}
          metalness={0.1}
          depthWrite={false}
        />
      </mesh>

      {/* Aro superior de ouro polido da câmara */}
      <mesh position={[0, 1.56, 0]}>
        <torusGeometry args={[1.51, 0.06, 16, 64]} />
        <meshStandardMaterial
          color={COLORS.goldBright}
          metalness={0.92}
          roughness={0.18}
          emissive={COLORS.pedestalGold}
          emissiveIntensity={active ? 0.6 : 0.25}
        />
      </mesh>

      {/* Luz interna da câmara iluminando as esferas de baixo para cima */}
      <pointLight
        ref={innerLightRef}
        position={[0, -0.4, 0]}
        color={active ? '#fef08a' : '#fde047'}
        distance={4.5}
        decay={1.8}
        intensity={active ? 4.5 : drawing ? 3.0 : 1.8}
      />
    </group>
  );
}

/**
 * Hook para gerar e gerenciar a textura de alta definição da logo do time no medalhão 3D
 */
function useTeamTexture(team?: TeamRecord | null): THREE.CanvasTexture | null {
  return useMemo(() => {
    if (!team) return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const renderBadge = (img?: HTMLImageElement) => {
      ctx.clearRect(0, 0, 512, 512);

      // Fundo circular escuro com degradê radial refinado
      const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 245);
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(0.65, '#0f172a');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(256, 256, 240, 0, Math.PI * 2);
      ctx.fill();

      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(256, 256, 205, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, 51, 51, 410, 410);
        ctx.restore();
      } else {
        // Brasão tipográfico com as iniciais do clube
        const initials = (team.shortName || team.name.substring(0, 3)).toUpperCase();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 130px "Inter", "Arial Black", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 16;
        ctx.fillText(initials, 256, 230);
        ctx.shadowBlur = 0;

        // Subtítulo com o nome do clube
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 30px "Inter", sans-serif';
        const label = team.name.length > 18 ? team.name.substring(0, 16) + '..' : team.name;
        ctx.fillText(label.toUpperCase(), 256, 335);
      }

      // Moldura externa chanfrada em ouro de gala com bisel duplo
      ctx.lineWidth = 16;
      ctx.strokeStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(256, 256, 240, 0, Math.PI * 2);
      ctx.stroke();

      // Friso fino interno brilhante
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(256, 256, 222, 0, Math.PI * 2);
      ctx.stroke();

      texture.needsUpdate = true;
    };

    renderBadge();

    if (team.logoUrl) {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => renderBadge(image);
      image.src = team.logoUrl;
    }

    return texture;
  }, [team?.id, team?.logoUrl, team?.name, team?.shortName]);
}

/**
 * Esfera de Sorteio Bipartida com Abertura e Saída da Logo Oficial do Time
 */
function LotteryBall({
  initialPos,
  isActive,
  isHeadSeed,
  state,
  index,
  team,
}: {
  initialPos: [number, number, number];
  isActive: boolean;
  isHeadSeed: boolean;
  state: DrawArenaState;
  index: number;
  team?: TeamRecord | null;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const topShellRef = useRef<THREE.Group>(null);
  const bottomShellRef = useRef<THREE.Group>(null);
  const logoRef = useRef<THREE.Group>(null);
  const openProgressRef = useRef(0);
  const rotRef = useRef(index * 0.7);

  const logoTexture = useTeamTexture(team);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    rotRef.current += delta * (isActive ? 1.4 : state === 'DRAWING' ? 2.5 : 0.4);

    const shouldOpen = isActive && (state === 'REVEAL' || state === 'GROUP_UPDATE');
    const targetOpen = shouldOpen ? 1.0 : 0.0;
    openProgressRef.current = THREE.MathUtils.damp(openProgressRef.current, targetOpen, 4.5, delta);
    const open = openProgressRef.current;

    if (isActive && (state === 'REVEAL' || state === 'GROUP_UPDATE')) {
      // Elevação triunfal da esfera acima da câmara para apresentação central
      groupRef.current.position.x = THREE.MathUtils.damp(groupRef.current.position.x, 0, 3.5, delta);
      groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, 2.05, 3.5, delta);
      groupRef.current.position.z = THREE.MathUtils.damp(groupRef.current.position.z, 1.45, 3.5, delta);

      const targetScale = 1.35;
      groupRef.current.scale.setScalar(
        THREE.MathUtils.damp(groupRef.current.scale.x, targetScale, 3.5, delta)
      );

      groupRef.current.rotation.y = rotRef.current * 0.35;
      groupRef.current.rotation.x = Math.sin(rotRef.current * 0.5) * 0.08;
    } else {
      // Posição de repouso/turbilhonamento DENTRO da urna
      const swirl = state === 'DRAWING';
      const angleOffset = rotRef.current * (swirl ? 1.2 : 0.2);
      const r = Math.sqrt(initialPos[0] ** 2 + initialPos[2] ** 2);
      const baseAngle = Math.atan2(initialPos[2], initialPos[0]);

      const targetX = Math.cos(baseAngle + angleOffset * 0.3) * r;
      const targetZ = Math.sin(baseAngle + angleOffset * 0.3) * r;
      const bobbing = Math.sin(rotRef.current * 2 + index) * (swirl ? 0.14 : 0.04);
      const targetY = initialPos[1] + bobbing;

      groupRef.current.position.x = THREE.MathUtils.damp(groupRef.current.position.x, targetX, 2.8, delta);
      groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, targetY, 2.8, delta);
      groupRef.current.position.z = THREE.MathUtils.damp(groupRef.current.position.z, targetZ, 2.8, delta);

      groupRef.current.scale.setScalar(
        THREE.MathUtils.damp(groupRef.current.scale.x, 1.0, 3.0, delta)
      );

      groupRef.current.rotation.y = rotRef.current * 0.6;
    }

    // Animação de Abertura da Cápsula (Conchas Bipartidas)
    if (topShellRef.current) {
      topShellRef.current.position.y = open * 0.36;
      topShellRef.current.position.z = -open * 0.14;
      topShellRef.current.rotation.x = -open * 0.52;
    }

    if (bottomShellRef.current) {
      bottomShellRef.current.position.y = -open * 0.16;
    }

    // A Logo emerge de dentro da bola e sobe ao ponto mais alto
    if (logoRef.current) {
      logoRef.current.position.y = open * 0.52;
      logoRef.current.position.z = open * 0.12;
      const logoScale = open * 1.35;
      logoRef.current.scale.set(logoScale, logoScale, logoScale);
      // Movimento oscilante nobre de frente para a câmera
      logoRef.current.rotation.y = Math.sin(rotRef.current * 1.5) * 0.22;
      logoRef.current.rotation.x = -0.12;
    }
  });

  return (
    <group ref={groupRef} position={initialPos}>
      {/* ── CONCHA SUPERIOR DA ESFERA (TAMPA QUE ABRE) ── */}
      <group ref={topShellRef}>
        {/* Casca externa da metade superior */}
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.26, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color={COLORS.ballWhite}
            metalness={0.15}
            roughness={0.25}
            emissive={isActive ? '#ffffff' : '#000000'}
            emissiveIntensity={isActive ? 0.2 : 0}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Forro interno dourado polido da tampa */}
        <mesh>
          <sphereGeometry args={[0.257, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color={COLORS.goldBright}
            metalness={0.92}
            roughness={0.16}
            side={THREE.BackSide}
          />
        </mesh>
        {/* Friso dourado equatorial da borda superior */}
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.26, 0.015, 12, 36]} />
          <meshStandardMaterial color={COLORS.ballGold} metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Faixa decorativa azul superior estilo bola de vôlei */}
        <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.238, 0.02, 12, 32]} />
          <meshStandardMaterial color={COLORS.ballBlue} metalness={0.4} roughness={0.3} />
        </mesh>
      </group>

      {/* ── CONCHA INFERIOR DA ESFERA (BASE QUE DESCE) ── */}
      <group ref={bottomShellRef}>
        {/* Casca externa da metade inferior */}
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.26, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
          <meshStandardMaterial
            color={COLORS.ballWhite}
            metalness={0.15}
            roughness={0.25}
            emissive={isActive ? '#ffffff' : '#000000'}
            emissiveIntensity={isActive ? 0.2 : 0}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Forro interno dourado polido da base */}
        <mesh>
          <sphereGeometry args={[0.257, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
          <meshStandardMaterial
            color={COLORS.goldBright}
            metalness={0.92}
            roughness={0.16}
            side={THREE.BackSide}
          />
        </mesh>
        {/* Friso dourado equatorial da borda inferior */}
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.26, 0.015, 12, 36]} />
          <meshStandardMaterial color={COLORS.ballGold} metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Faixa decorativa azul inferior estilo bola de vôlei */}
        <mesh position={[0, -0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.238, 0.02, 12, 32]} />
          <meshStandardMaterial color={COLORS.ballBlue} metalness={0.4} roughness={0.3} />
        </mesh>
        {/* Luz interna da concha iluminando o medalhão de baixo para cima */}
        {isActive && (
          <pointLight position={[0, 0.04, 0]} intensity={3.5} color="#fef08a" distance={1.4} />
        )}
      </group>

      {/* ── MEDALHÃO COM A LOGO DO TIME QUE SAI DE DENTRO DA ESFERA ── */}
      <group ref={logoRef} position={[0, 0, 0]} scale={[0, 0, 0]}>
        {/* Face frontal com o Escudo/Logo Oficial da equipe */}
        <mesh position={[0, 0, 0.014]}>
          <circleGeometry args={[0.31, 36]} />
          <meshStandardMaterial
            map={logoTexture ?? undefined}
            roughness={0.2}
            metalness={0.1}
            emissive="#ffffff"
            emissiveIntensity={0.18}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Face traseira dourada com acabamento nobre */}
        <mesh position={[0, 0, -0.014]} rotation={[0, Math.PI, 0]}>
          <circleGeometry args={[0.31, 36]} />
          <meshStandardMaterial
            color={COLORS.goldBright}
            roughness={0.2}
            metalness={0.92}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Borda esculpida metálica dourada do medalhão */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.315, 0.315, 0.028, 40]} />
          <meshStandardMaterial
            color={COLORS.goldBright}
            metalness={0.95}
            roughness={0.15}
            emissive={COLORS.pedestalGold}
            emissiveIntensity={0.3}
          />
        </mesh>
        <mesh>
          <torusGeometry args={[0.315, 0.018, 16, 40]} />
          <meshStandardMaterial
            color="#fde047"
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>

        {/* Halo radiante de destaque ao redor da logo */}
        <mesh>
          <ringGeometry args={[0.33, 0.46, 36]} />
          <meshBasicMaterial
            color="#fde047"
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Luz cenográfica dedicada à logo */}
        <pointLight
          position={[0, 0, 0.25]}
          color="#fef08a"
          distance={2.5}
          intensity={3.5}
        />
      </group>

      {/* Halo de campeão quando for Cabeça de Chave */}
      {isHeadSeed && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.34, 0.022, 12, 40]} />
          <meshStandardMaterial
            color={COLORS.goldBright}
            metalness={0.9}
            roughness={0.2}
            emissive={COLORS.goldBright}
            emissiveIntensity={isActive ? 0.9 : 0.4}
          />
        </mesh>
      )}
    </group>
  );
}

/**
 * Esferas de Equipes posicionadas DENTRO da urna
 */
function TeamCapsules({
  state,
  currentTeam,
  drawResult,
  teams,
}: {
  state: DrawArenaState;
  currentTeam: TeamRecord | null;
  drawResult: DrawResult;
  teams?: TeamRecord[];
}) {
  const isSeeded = drawResult.config.seedingMode === 'seeded';

  const balls = useMemo(() => {
    const list: {
      teamId: string;
      position: [number, number, number];
      isHeadSeed: boolean;
      index: number;
    }[] = [];

    let count = 0;
    const totalTeams = drawResult.groups.reduce((acc, g) => acc + g.teams.length, 0);

    drawResult.groups.forEach((group) => {
      group.teams.forEach((entry) => {
        // Distribuição física concêntrica DENTRO do raio de 1.2 da urna
        const angle = (count / Math.max(totalTeams, 1)) * Math.PI * 2;
        const layer = count % 2; // Duas camadas de profundidade
        const radius = 0.45 + (count % 3) * 0.28;
        const yBase = -0.4 + layer * 0.45 + ((count * 0.17) % 0.3);

        list.push({
          teamId: entry.teamId,
          position: [
            Math.cos(angle) * radius,
            yBase,
            Math.sin(angle) * radius,
          ],
          isHeadSeed:
            isSeeded &&
            headSeedOrdinalOf(
              entry.teamId,
              drawResult.config.seedingMode,
              drawResult.config.headSeeds
            ) !== undefined,
          index: count,
        });
        count++;
      });
    });

    return list;
  }, [drawResult.groups, isSeeded, drawResult.config.seedingMode, drawResult.config.headSeeds]);

  return (
    <>
      {balls.map(({ teamId, position, isHeadSeed, index }) => {
        const isActive =
          currentTeam?.id === teamId &&
          (state === 'REVEAL' || state === 'GROUP_UPDATE');

        const ballTeam =
          (isActive && currentTeam)
            ? currentTeam
            : teams?.find((t) => t.id === teamId) ?? null;

        return (
          <LotteryBall
            key={teamId}
            initialPos={position}
            isActive={isActive}
            isHeadSeed={isHeadSeed}
            state={state}
            index={index}
            team={ballTeam}
          />
        );
      })}
    </>
  );
}

/**
 * Poeira dourada em suspensão no estúdio
 */
function Atmosphere({
  state,
  reducedMotion,
}: {
  state: DrawArenaState;
  reducedMotion: boolean;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const count = 36;
    const data = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      data[i3] = (Math.random() - 0.5) * 8;
      data[i3 + 1] = Math.random() * 5 + 0.2;
      data[i3 + 2] = (Math.random() - 0.5) * 6;
    }
    return data;
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const active = state === 'REVEAL' || state === 'GROUP_UPDATE';
    pointsRef.current.rotation.y += delta * (active ? 0.08 : 0.03);
  });

  if (reducedMotion) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#fef08a"
        size={0.035}
        transparent
        opacity={0.3}
        depthWrite={false}
      />
    </points>
  );
}

/**
 * Cena Raiz do Draw Arena
 */
function DrawArenaScene({
  state,
  currentTeam,
  drawResult,
  teams,
  reducedMotion,
}: {
  state: DrawArenaState;
  currentTeam: TeamRecord | null;
  drawResult: DrawResult;
  teams?: TeamRecord[];
  reducedMotion: boolean;
}) {
  return (
    <>
      <LightingRig state={state} reducedMotion={reducedMotion} />
      <Atmosphere state={state} reducedMotion={reducedMotion} />
      <SceneStructure />
      <DrawChamber state={state} reducedMotion={reducedMotion} />
      <TeamCapsules
        state={state}
        currentTeam={currentTeam}
        drawResult={drawResult}
        teams={teams}
      />
      <CinematicCamera state={state} reducedMotion={reducedMotion} />
    </>
  );
}

/**
 * Componente Exportado: Canvas 3D Oficial
 */
export function DrawArenaCanvas({
  state,
  currentTeam,
  drawResult,
  teams,
  onContextLost,
}: DrawArenaCanvasProps) {
  const reducedMotion = getReducedMotion();

  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas
        camera={{ position: [0, 1.8, 6.2], fov: 42, near: 0.1, far: 50 }}
        dpr={[1, Math.min(MAX_PIXEL_RATIO, typeof window !== 'undefined' ? window.devicePixelRatio : 1)]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color(COLORS.stageBg), 1);

          const canvasEl = gl.domElement;
          const handleContextLost = (event: Event) => {
            event.preventDefault();
            onContextLost?.();
          };
          canvasEl.addEventListener('webglcontextlost', handleContextLost, false);
        }}
      >
        <DrawArenaScene
          state={state}
          currentTeam={currentTeam}
          drawResult={drawResult}
          teams={teams}
          reducedMotion={reducedMotion}
        />
      </Canvas>
    </div>
  );
}
