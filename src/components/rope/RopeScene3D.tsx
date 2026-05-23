import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Line, OrbitControls, Text } from '@react-three/drei'
import { cycleProgress, ropeFrequencies, selectedPairValues, type Vec2 } from '@/lib/ropeMath'
import type { RopeStateProps } from './ropeTypes'

type Vec3 = [number, number, number]

const Q_BASE: Vec2 = [0.9, 0.35]
const K_BASE: Vec2 = [0.55, 0.85]
const QUERY = '#38bdf8'
const KEY = '#fb7185'
const RELATIVE = '#a78bfa'
const EDGE = '#e879f9'
const MUTED = '#94a3b8'

function vectorTip([x, y]: Vec2, scale = 1): Vec3 {
  return [x * scale, y * scale, 0.05]
}

function Vector({
  vector,
  color,
  label,
  scale = 1,
}: {
  vector: Vec2
  color: string
  label: string
  scale?: number
}) {
  const tip = vectorTip(vector, scale)
  return (
    <group>
      <Line points={[[0, 0, 0.05], tip]} color={color} lineWidth={3} />
      <mesh position={tip}>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <Text position={[tip[0] + 0.12, tip[1] + 0.12, 0.08]} fontSize={0.12} color={color} anchorX="left">
        {label}
      </Text>
    </group>
  )
}

function UnitDisk() {
  const circle = useMemo<Vec3[]>(() => {
    const points: Vec3[] = []
    for (let i = 0; i <= 96; i++) {
      const t = (i / 96) * Math.PI * 2
      points.push([Math.cos(t), Math.sin(t), 0])
    }
    return points
  }, [])

  return (
    <group>
      <mesh position={[0, 0, -0.03]}>
        <circleGeometry args={[1.32, 80]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} transparent opacity={0.76} />
      </mesh>
      <Line points={circle} color="#64748b" lineWidth={1} transparent opacity={0.6} />
      <Line points={[[-1.05, 0, 0], [1.05, 0, 0]]} color="#475569" lineWidth={0.5} transparent opacity={0.5} />
      <Line points={[[0, -1.05, 0], [0, 1.05, 0]]} color="#475569" lineWidth={0.5} transparent opacity={0.5} />
    </group>
  )
}

function PairDisk({
  pairIndex,
  x,
  posI,
  posJ,
  headDim,
  base,
}: RopeStateProps & { pairIndex: number; x: number }) {
  const values = selectedPairValues({
    pairIndex,
    posI,
    posJ,
    headDim,
    base,
    qBase: Q_BASE,
    kBase: K_BASE,
  })
  const progress = cycleProgress(values.delta, values.theta)

  return (
    <group position={[x, 0, 0]}>
      <UnitDisk />
      <Vector vector={values.qAbsolute} color={QUERY} label="R_i q" />
      <Vector vector={values.kAbsolute} color={KEY} label="R_j k" />
      <Vector vector={values.kRelative} color={RELATIVE} label="R_delta k" scale={0.72} />
      <Line points={[vectorTip(values.qAbsolute), vectorTip(values.kAbsolute)]} color={EDGE} lineWidth={2} />
      <Text position={[0, -1.58, 0.08]} fontSize={0.12} color="#e2e8f0" anchorX="center">
        {`pair ${pairIndex} · score ${values.absoluteScore.toFixed(3)}`}
      </Text>
      <Text position={[0, 1.54, 0.08]} fontSize={0.1} color={MUTED} anchorX="center">
        {`θ=${values.theta.toFixed(4)} · wraps=${wrapLabel(progress, values.wraps)}`}
      </Text>
    </group>
  )
}

function wrapLabel(progress: number, wraps: number) {
  return `${wraps.toFixed(2)} (${Math.round(progress * 100)}%)`
}

function KvRail({ posI, posJ }: Pick<RopeStateProps, 'posI' | 'posJ'>) {
  const count = Math.max(1, posI)
  const selected = Math.min(posJ, posI)
  const ticks = Array.from({ length: count + 1 }, (_, p) => p)
  const xFor = (p: number) => -4.8 + (p / count) * 9.6
  return (
    <group position={[0, -2.15, 0.55]}>
      <Line points={[[-4.8, 0, 0], [4.8, 0, 0]]} color="#64748b" lineWidth={1.2} />
      {ticks.map((p) => {
        const current = p === posI
        const chosen = p === selected
        return (
          <mesh key={p} position={[xFor(p), 0, 0]}>
            <sphereGeometry args={[current ? 0.09 : chosen ? 0.075 : 0.035, 12, 12]} />
            <meshStandardMaterial color={current ? QUERY : chosen ? KEY : '#64748b'} roughness={0.7} />
          </mesh>
        )
      })}
      <Line points={[[xFor(selected), 0, 0], [xFor(posI), 0, 0]]} color={EDGE} lineWidth={2.5} />
      <Text position={[-4.8, 0.28, 0]} fontSize={0.1} color={MUTED} anchorX="left">
        KV cache 0...i
      </Text>
      <Text position={[4.8, 0.28, 0]} fontSize={0.1} color={QUERY} anchorX="right">
        current Q
      </Text>
    </group>
  )
}

function Scene({ posI, posJ, headDim, base }: RopeStateProps) {
  const pairs = ropeFrequencies({ headDim, base, maxPairs: 3 })
  return (
    <>
      <color attach="background" args={['#020617']} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[4, 5, 5]} intensity={0.8} />
      <Text position={[0, 2.1, 0]} fontSize={0.18} color="#e2e8f0" anchorX="center" maxWidth={10}>
        Absolute rotations, relative rotation, and selected cache edge
      </Text>
      {pairs.map((pair, idx) => (
        <PairDisk
          key={pair.index}
          pairIndex={pair.index}
          x={(idx - (pairs.length - 1) / 2) * 3.2}
          posI={posI}
          posJ={posJ}
          headDim={headDim}
          base={base}
        />
      ))}
      <KvRail posI={posI} posJ={posJ} />
    </>
  )
}

export function RopeDetailPanel({ posI, posJ, headDim, base }: RopeStateProps) {
  return (
    <div className="canvas-frame rope-scene-frame">
      <Canvas camera={{ position: [0, 0.2, 8.4], fov: 42 }} style={{ height: 'min(48vh, 460px)' }} dpr={[1, 2]}>
        <Scene posI={posI} posJ={Math.min(posJ, posI)} headDim={headDim} base={base} />
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={5}
          maxDistance={14}
          maxPolarAngle={Math.PI / 1.9}
          dampingFactor={0.08}
          enableDamping
        />
      </Canvas>
    </div>
  )
}
