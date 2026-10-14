/**
 * DrawArenaCanvas
 *
 * Palco 3D do Draw Arena — Estúdio de Transmissão Televisiva (Gala FIVB / UEFA / CBV).
 *
 * Características da Transmissão Broadcast Studio:
 *  - Fundo limpo de estúdio com gradiente escuro nobre (#070b14 -> #0f172a);
 *  - Linhas sutis de quadra e telemetria de transmissão;
 *  - Urna de cristal cilíndrica com pedestal escultural no centro do palco;
 *  - Esferas de sorteio com movimento harmônico e controlado DENTRO da urna;
 *  - Câmera em enquadramento nobre que preserva a visibilidade total da grade de grupos.
 */

import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MAX_PIXEL_RATIO } from '@/config/drawArenaFeatures';
import { DrawArenaStage } from './DrawArenaStage';
import { ARENA_COLORS as COLORS } from './arenaColors';
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

function getCameraTarget(preset: CameraPreset): { x: number; y: number; z: number } {
  switch (preset) {
    case 'ESTABLISHING':
      return { x: 0, y: 1.8, z: 7.2 };
    case 'APPROACH':
      return { x: 0, y: 1.6, z: 6.8 };
    case 'DRAW':
      return { x: 0, y: 1.45, z: 6.4 };
    case 'REVEAL':
      return { x: 0, y: 1.5, z: 6.6 };
    case 'GROUP':
      return { x: 0, y: 1.6, z: 6.8 };
    case 'FINAL':
      return { x: 0, y: 1.9, z: 7.4 };
  }
}

/**
 * Câmera com interpolação suave em plano médio de estúdio
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

  const lookTarget = useMemo(() => new THREE.Vector3(0, 0.7, 0), []);
  const target = useMemo(() => getCameraTarget(preset), [preset]);

  useFrame((_, delta) => {
    const px = reducedMotion ? 0 : pointer.x * 0.08;
    const py = reducedMotion ? 0 : pointer.y * 0.05;

    camera.position.x = THREE.MathUtils.damp(camera.position.x, target.x + px, 2.5, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, target.y + py, 2.5, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, target.z, 2.5, delta);

    camera.lookAt(lookTarget);
  });

  return null;
}

/**
 * Esfera de Sorteio Esportiva (Mantém-se contida de forma elegante dentro da urna)
 */
function LotteryBall({
  initialPos,
  isActive,
  isHeadSeed,
  state,
  index,
}: {
  initialPos: [number, number, number];
  isActive: boolean;
  isHeadSeed: boolean;
  state: DrawArenaState;
  index: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const rotRef = useRef(index * 0.7);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    rotRef.current += delta * (isActive ? 1.2 : state === 'DRAWING' ? 2.8 : 0.5);

    if (isActive && (state === 'REVEAL' || state === 'GROUP_UPDATE')) {
      // Elevação solene e controlada no topo da câmara (sem cobrir a tela)
      groupRef.current.position.x = THREE.MathUtils.damp(groupRef.current.position.x, 0, 3.0, delta);
      groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, 0.85, 3.0, delta);
      groupRef.current.position.z = THREE.MathUtils.damp(groupRef.current.position.z, 0.2, 3.0, delta);

      groupRef.current.rotation.y = rotRef.current * 0.5;
    } else {
      // Posição de repouso ou turbilhonamento interno DENTRO da câmara
      const swirl = state === 'DRAWING';
      const angleOffset = rotRef.current * (swirl ? 1.4 : 0.2);
      const r = Math.sqrt(initialPos[0] ** 2 + initialPos[2] ** 2);
      const baseAngle = Math.atan2(initialPos[2], initialPos[0]);

      const targetX = Math.cos(baseAngle + angleOffset * 0.35) * r;
      const targetZ = Math.sin(baseAngle + angleOffset * 0.35) * r;
      const bobbing = Math.sin(rotRef.current * 2.2 + index) * (swirl ? 0.12 : 0.03);
      const targetY = initialPos[1] + bobbing;

      groupRef.current.position.x = THREE.MathUtils.damp(groupRef.current.position.x, targetX, 2.5, delta);
      groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, targetY, 2.5, delta);
      groupRef.current.position.z = THREE.MathUtils.damp(groupRef.current.position.z, targetZ, 2.5, delta);

      groupRef.current.rotation.y = rotRef.current * 0.6;
    }
  });

  return (
    <group ref={groupRef} position={initialPos}>
      {/* Esfera estilo bola de vôlei com acabamento perolizado */}
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[0.22, 28, 20]} />
        <meshStandardMaterial
          color={isActive ? '#fef08a' : COLORS.ballWhite}
          metalness={0.2}
          roughness={0.25}
          emissive={isActive ? '#f59e0b' : '#000000'}
          emissiveIntensity={isActive ? 0.45 : 0}
        />
      </mesh>

      {/* Friso dourado equatorial nobre */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.22, 0.012, 12, 32]} />
        <meshStandardMaterial
          color={COLORS.ballGold}
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>

      {/* Faixas azul safira estilo voleibol oficial */}
      <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.20, 0.014, 12, 28]} />
        <meshStandardMaterial color={COLORS.ballBlue} metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.20, 0.014, 12, 28]} />
        <meshStandardMaterial color={COLORS.ballBlue} metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Brilho halo na esfera ativa */}
      {isActive && (
        <>
          <pointLight position={[0, 0, 0]} intensity={2.5} color="#fef08a" distance={1.8} />
          <mesh>
            <sphereGeometry args={[0.26, 16, 16]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.2} />
          </mesh>
        </>
      )}

      {/* Halo dourado para cabeças de chave */}
      {isHeadSeed && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.27, 0.012, 12, 32]} />
          <meshStandardMaterial
            color={COLORS.goldBright}
            metalness={0.9}
            roughness={0.2}
            emissive={COLORS.goldBright}
            emissiveIntensity={isActive ? 0.8 : 0.25}
          />
        </mesh>
      )}
    </group>
  );
}

/**
 * Esferas de Equipes distribuídas DENTRO da urna
 */
function TeamCapsules({
  state,
  currentTeam,
  drawResult,
}: {
  state: DrawArenaState;
  currentTeam: TeamRecord | null;
  drawResult: DrawResult;
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
        const angle = (count / Math.max(totalTeams, 1)) * Math.PI * 2;
        const layer = count % 2;
        const radius = 0.42 + (count % 3) * 0.24;
        const yBase = -0.35 + layer * 0.4 + ((count * 0.15) % 0.25);

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

        return (
          <LotteryBall
            key={teamId}
            initialPos={position}
            isActive={isActive}
            isHeadSeed={isHeadSeed}
            state={state}
            index={index}
          />
        );
      })}
    </>
  );
}

/**
 * Cena Raiz do Estúdio 3D
 */
function DrawArenaScene({
  state,
  currentTeam,
  drawResult,
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
      <DrawArenaStage state={state} reducedMotion={reducedMotion} />
      <TeamCapsules
        state={state}
        currentTeam={currentTeam}
        drawResult={drawResult}
      />
      <CinematicCamera state={state} reducedMotion={reducedMotion} />
    </>
  );
}

/**
 * Componente Exportado: Canvas 3D de Estúdio de Transmissão
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
    <div className="absolute inset-0 w-full h-full bg-[radial-gradient(ellipse_at_50%_35%,#0f172a_0%,#070b14_60%,#020617_100%)] overflow-hidden">
      {/* Linhas sutis de telemetria de estúdio esportivo */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4.5rem_4.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

      <Canvas
        camera={{ position: [0, 1.8, 7.2], fov: 40, near: 0.1, far: 50 }}
        dpr={[1, Math.min(MAX_PIXEL_RATIO, typeof window !== 'undefined' ? window.devicePixelRatio : 1)]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color(0x070b14), 0.7);

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
