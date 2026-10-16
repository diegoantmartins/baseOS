/**
 * DrawArenaStage
 *
 * Palco Cenográfico 3D da Draw Arena (Padrão Transmissão Esportiva Televisiva FIVB / CBV / UEFA Gala).
 *
 * Estrutura:
 *  - LightingRig: Iluminação cenográfica multicamadas (Spotlight zenital, Rim Lights ouro e safira, luz de palco);
 *  - SceneStructure: Piso circular reflexivo, anéis dourados concêntricos e halo de auditório;
 *  - DrawChamber: Pedestal nobre esculpido em camadas e Urna cilíndrica de cristal ultratransparente;
 *  - Atmosphere: Partículas em suspensão e poeira dourada (Sparkles do @react-three/drei);
 *  - DrawArenaStage: Componente mestre que agrupa toda a cenografia do estúdio de transmissão.
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import type { DrawArenaState } from '@/types/drawCinematic';

import { ARENA_COLORS } from './arenaColors';

export interface DrawArenaStageProps {
  state: DrawArenaState;
  reducedMotion: boolean;
}

/**
 * Iluminação de estúdio televisivo de gala
 */
export function LightingRig({
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
        intensity={active ? 4.5 : drawing ? 3.8 : 3.0}
        color={ARENA_COLORS.spotlight}
        angle={Math.PI / 4}
        penumbra={0.65}
        castShadow
        shadow-bias={-0.0001}
      />

      {/* Rim light frontal/lateral quente (Dourado de gala) */}
      <directionalLight
        position={[5, 4, 4]}
        intensity={active ? 2.2 : 1.4}
        color={ARENA_COLORS.rimGold}
      />

      {/* Rim light traseiro frio (Azul safira para recorte de silhueta no vidro) */}
      <directionalLight
        position={[-5, 5, -4]}
        intensity={active ? 2.4 : 1.6}
        color={ARENA_COLORS.rimBlue}
      />

      {/* Luz inferior de palco para destacar o piso reflexivo */}
      <pointLight position={[0, -1.8, 2]} intensity={0.9} color="#38bdf8" distance={7} />
    </>
  );
}

/**
 * Estrutura cenográfica do palco de transmissão
 */
export function SceneStructure() {
  return (
    <group position={[0, 0, 0]}>
      {/* Piso do palco circular reflexivo */}
      <mesh position={[0, -1.8, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[14, 64]} />
        <meshStandardMaterial
          color={ARENA_COLORS.floor}
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
            color={ARENA_COLORS.floorRing}
            transparent
            opacity={0.35 - i * 0.08}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * A Urna de Vidro (Chamber de Cristal e Pedestal de Campeonato)
 */
export function DrawChamber({
  state,
  reducedMotion: _reducedMotion,
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
          color={ARENA_COLORS.pedestalDark}
          metalness={0.8}
          roughness={0.25}
        />
      </mesh>

      {/* Anel intermediário dourado polido (horizontal) */}
      <mesh position={[0, -1.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.92, 0.06, 16, 64]} />
        <meshStandardMaterial
          color={ARENA_COLORS.goldBright}
          metalness={0.9}
          roughness={0.2}
          emissive={ARENA_COLORS.pedestalGold}
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
          color={ARENA_COLORS.goldBright}
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

      {/* Aro superior de ouro polido da câmara (horizontal) */}
      <mesh position={[0, 1.56, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.51, 0.06, 16, 64]} />
        <meshStandardMaterial
          color={ARENA_COLORS.goldBright}
          metalness={0.92}
          roughness={0.18}
          emissive={ARENA_COLORS.pedestalGold}
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
 * Poeira dourada e partículas luminosas no estúdio com Sparkles (@react-three/drei)
 */
export function Atmosphere({
  state: _state,
  reducedMotion,
}: {
  state: DrawArenaState;
  reducedMotion: boolean;
}) {
  if (reducedMotion) return null;

  return (
    <group position={[0, 1.5, 0]}>
      {/* Brilho etéreo dourado de estúdio */}
      <Sparkles
        count={50}
        scale={[10, 6, 8]}
        size={2.8}
        speed={0.45}
        color="#fbbf24"
        opacity={0.5}
      />
      {/* Faíscas secundárias azuladas para profundidade visual */}
      <Sparkles
        count={25}
        scale={[12, 8, 10]}
        size={1.8}
        speed={0.3}
        color="#38bdf8"
        opacity={0.35}
      />
    </group>
  );
}

/**
 * Componente Master: Palco Completo da Arena 3D
 */
export function DrawArenaStage({ state, reducedMotion }: DrawArenaStageProps) {
  return (
    <group>
      <LightingRig state={state} reducedMotion={reducedMotion} />
      <Atmosphere state={state} reducedMotion={reducedMotion} />
      <SceneStructure />
      <DrawChamber state={state} reducedMotion={reducedMotion} />
    </group>
  );
}
