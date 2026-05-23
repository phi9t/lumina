import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text, Line, Stars } from '@react-three/drei'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent } from '@/components/ui/card'

type Vec2 = [number, number]
type Vec3 = [number, number, number]

/** Horizontal KV rail overlaid on the disk row (left = old cache, right = current token). */
const RAIL_Y = 0
const RAIL_Z = 0.95
const OVERLAY_RENDER_ORDER = 20

const PALETTE = {
  query: '#38bdf8',
  key: '#fb7185',
  relative: '#a78bfa',
  edge: '#e879f9',
  edgeFaint: '#a855f7',
  cache: '#64748b',
  cacheFill: '#fda4af',
  disk: '#0f172a',
  ring: '#475569',
  grid: '#334155',
  label: '#e2e8f0',
  muted: '#94a3b8',
} as const

function railSpan(freqCount: number) {
  const half = ((freqCount - 1) / 2) * 3.1 + 1.55
  return { left: -half, right: half, width: half * 2 }
}

function xAtPosition(p: number, posI: number, railLeft: number, railRight: number): number {
  if (posI <= 0) return railRight
  return railLeft + (p / posI) * (railRight - railLeft)
}

function cachePoint(p: number, posI: number, railLeft: number, railRight: number, zOffset = RAIL_Z): Vec3 {
  return [xAtPosition(p, posI, railLeft, railRight), RAIL_Y, zOffset]
}

function rotate2D([x, y]: Vec2, theta: number): Vec2 {
  const c = Math.cos(theta)
  const s = Math.sin(theta)
  return [c * x - s * y, s * x + c * y]
}

function dot(a: Vec2, b: Vec2) {
  return a[0] * b[0] + a[1] * b[1]
}

function Arrow2D({
  start = [0, 0, 0] as Vec3,
  vec = [1, 0] as Vec2,
  color,
  label,
  z = 0,
  scale = 1,
}: {
  start?: Vec3
  vec?: Vec2
  color: string
  label?: string
  z?: number
  scale?: number
}) {
  const end: Vec3 = [start[0] + vec[0] * scale, start[1] + vec[1] * scale, z]
  const angle = Math.atan2(vec[1], vec[0])

  return (
    <group>
      <Line points={[[start[0], start[1], z], end]} color={color} lineWidth={3} />
      <mesh position={end} rotation={[0, 0, angle - Math.PI / 2]}>
        <coneGeometry args={[0.07, 0.2, 16]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.05} />
      </mesh>
      {label && (
        <Text
          position={[end[0] + 0.18, end[1] + 0.18, z]}
          fontSize={0.14}
          color={color}
          anchorX="left"
          outlineWidth={0.015}
          outlineColor="#020617"
        >
          {label}
        </Text>
      )}
    </group>
  )
}

function UnitCircle({ radius = 1.2, z = 0 }: { radius?: number; z?: number }) {
  const points = useMemo(() => {
    const out: Vec3[] = []
    for (let i = 0; i <= 160; i++) {
      const t = (i / 160) * Math.PI * 2
      out.push([Math.cos(t) * radius, Math.sin(t) * radius, z])
    }
    return out
  }, [radius, z])

  return (
    <group>
      <Line points={points} color={PALETTE.ring} lineWidth={1} transparent opacity={0.5} />
      {[0, Math.PI / 2].map((t, i) => (
        <Line
          key={i}
          points={[
            [0, 0, z],
            [Math.cos(t) * radius * 0.9, Math.sin(t) * radius * 0.9, z],
          ]}
          color={PALETTE.grid}
          lineWidth={0.5}
          transparent
          opacity={0.2}
        />
      ))}
    </group>
  )
}

function CirclePositionMarker({
  position,
  theta,
  color,
  radius = 1.22,
  z = 0.02,
}: {
  position: number
  theta: number
  color: string
  radius?: number
  z?: number
}) {
  const angle = position * theta
  const px = Math.cos(angle) * radius
  const py = Math.sin(angle) * radius
  return (
    <group position={[px, py, z]}>
      <mesh>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
    </group>
  )
}

function AttentionEdge2D({
  qTip,
  kTip,
  score,
  z = 0.04,
}: {
  qTip: Vec2
  kTip: Vec2
  score: number
  z?: number
}) {
  const mid: Vec3 = [(qTip[0] + kTip[0]) / 2, (qTip[1] + kTip[1]) / 2, z]
  return (
    <group>
      <Line
        points={[
          [qTip[0], qTip[1], z],
          [kTip[0], kTip[1], z],
        ]}
        color={PALETTE.edge}
        lineWidth={5}
        transparent
        opacity={0.2}
      />
      <Line
        points={[
          [qTip[0], qTip[1], z],
          [kTip[0], kTip[1], z],
        ]}
        color={PALETTE.edge}
        lineWidth={2}
      />
      <Text position={[mid[0], mid[1] + 0.12, z]} fontSize={0.11} color={PALETTE.edge} anchorX="center">
        {`edge ⟨q,k⟩=${score.toFixed(2)}`}
      </Text>
    </group>
  )
}

function FrequencyPlane({
  idx,
  theta,
  posI,
  posJ,
  qBase,
  kBase,
  x,
}: {
  idx: number
  theta: number
  posI: number
  posJ: number
  qBase: Vec2
  kBase: Vec2
  x: number
}) {
  const qi = rotate2D(qBase, posI * theta)
  const kj = rotate2D(kBase, posJ * theta)
  const relK = rotate2D(kBase, (posJ - posI) * theta)
  const score = dot(qi, kj)
  const qTip: Vec2 = [qi[0], qi[1]]
  const kTip: Vec2 = [kj[0], kj[1]]

  return (
    <group position={[x, 0, 0]} renderOrder={0}>
      <mesh position={[0, 0, -0.03]}>
        <circleGeometry args={[1.45, 80]} />
        <meshStandardMaterial color={PALETTE.disk} roughness={0.9} metalness={0} transparent opacity={0.72} />
      </mesh>
      <mesh position={[0, 0, -0.02]}>
        <ringGeometry args={[1.38, 1.48, 80]} />
        <meshBasicMaterial color={PALETTE.ring} transparent opacity={0.35} />
      </mesh>
      <UnitCircle />
      <CirclePositionMarker position={posI} theta={theta} color={PALETTE.query} />
      <CirclePositionMarker position={posJ} theta={theta} color={PALETTE.key} />
      <Arrow2D vec={qi} color={PALETTE.query} label={`q (current) i=${posI}`} />
      <Arrow2D vec={kj} color={PALETTE.key} label={`k (cache) j=${posJ}`} />
      <Arrow2D vec={relK} color={PALETTE.relative} label={`Δ ${posJ - posI}`} z={0.05} scale={0.78} />
      <AttentionEdge2D qTip={qTip} kTip={kTip} score={score} z={0.12} />
      <Text
        position={[0, -1.78, 0.02]}
        fontSize={0.14}
        color={PALETTE.label}
        anchorX="center"
        outlineWidth={0.015}
        outlineColor="#020617"
      >
        {`ω${idx}  θ=${theta.toFixed(4)}  ⟨q,k⟩=${score.toFixed(3)}`}
      </Text>
      <Text position={[0, 1.74, 0.02]} fontSize={0.13} color={PALETTE.muted} anchorX="center">
        {`phase gap ${(Math.abs(posJ - posI) * theta).toFixed(2)} rad`}
      </Text>
    </group>
  )
}

function PhaseWaveLane({
  theta,
  posI,
  railLeft,
  railRight,
  zLane,
}: {
  theta: number
  posI: number
  railLeft: number
  railRight: number
  zLane: number
}) {
  const points = useMemo(() => {
    const out: Vec3[] = []
    const steps = Math.max(posI, 1) * 3
    for (let s = 0; s <= steps; s++) {
      const p = (s / steps) * posI
      const pt = cachePoint(p, posI, railLeft, railRight, zLane)
      pt[1] += Math.sin(p * theta) * 0.1
      out.push(pt)
    }
    return out
  }, [theta, posI, railLeft, railRight, zLane])

  return <Line points={points} color={PALETTE.cache} lineWidth={0.8} transparent opacity={0.4} />
}

function KvCacheTimeline({
  posI,
  posJ,
  railLeft,
  railRight,
}: {
  posI: number
  posJ: number
  railLeft: number
  railRight: number
}) {
  const j = Math.min(posJ, posI)
  const pi = cachePoint(posI, posI, railLeft, railRight)
  const pj = cachePoint(j, posI, railLeft, railRight)
  const railWidth = railRight - railLeft

  const railPoints = useMemo(() => {
    const out: Vec3[] = []
    const steps = Math.max(posI, 1) * 4
    for (let s = 0; s <= steps; s++) {
      out.push(cachePoint((s / steps) * posI, posI, railLeft, railRight))
    }
    return out
  }, [posI, railLeft, railRight])

  const cacheFillPoints = useMemo(() => {
    const out: Vec3[] = []
    for (let p = 0; p <= posI; p++) out.push(cachePoint(p, posI, railLeft, railRight))
    return out
  }, [posI, railLeft, railRight])

  const cacheTicks = useMemo(() => {
    const ticks: number[] = []
    const step = posI > 48 ? 4 : posI > 24 ? 2 : 1
    for (let p = 0; p <= posI; p += step) ticks.push(p)
    if (!ticks.includes(j)) ticks.push(j)
    return ticks.sort((a, b) => a - b)
  }, [posI, j])

  const attentionFanTargets = useMemo(() => {
    const targets: number[] = []
    const step = posI > 40 ? 2 : 1
    for (let p = 0; p <= posI; p += step) targets.push(p)
    if (!targets.includes(j)) targets.push(j)
    return targets
  }, [posI, j])

  return (
    <group renderOrder={OVERLAY_RENDER_ORDER}>
      <mesh position={[0, RAIL_Y, RAIL_Z - 0.08]} renderOrder={OVERLAY_RENDER_ORDER}>
        <planeGeometry args={[railWidth + 0.6, 3.4]} />
        <meshStandardMaterial
          color="#0f172a"
          roughness={1}
          metalness={0}
          transparent
          opacity={0.42}
          depthWrite={false}
        />
      </mesh>

      <Text position={[railLeft, RAIL_Y + 1.05, RAIL_Z + 0.05]} fontSize={0.1} color={PALETTE.muted} anchorX="left">
        KV cache →
      </Text>
      <Text position={[railRight, RAIL_Y + 1.05, RAIL_Z + 0.05]} fontSize={0.1} color={PALETTE.query} anchorX="right">
        current i →
      </Text>

      <Line
        points={[
          [railLeft, RAIL_Y, RAIL_Z - 0.02],
          [railRight, RAIL_Y, RAIL_Z - 0.02],
        ]}
        color={PALETTE.cache}
        lineWidth={1}
        transparent
        opacity={0.55}
      />
      <Line points={railPoints} color={PALETTE.cache} lineWidth={1.2} transparent opacity={0.5} />
      <Line points={cacheFillPoints} color={PALETTE.cacheFill} lineWidth={5} transparent opacity={0.28} />

      {attentionFanTargets.map((p) => {
        if (p === posI) return null
        const pt = cachePoint(p, posI, railLeft, railRight)
        const isSelected = p === j
        return (
          <Line
            key={`fan-${p}`}
            points={[pi, pt]}
            color={isSelected ? PALETTE.edge : PALETTE.edgeFaint}
            lineWidth={isSelected ? 3 : 1}
            transparent
            opacity={isSelected ? 0.95 : 0.18}
          />
        )
      })}

      {cacheTicks.map((p) => {
        if (p === posI || p === j) return null
        const pt = cachePoint(p, posI, railLeft, railRight)
        return (
          <mesh key={p} position={pt}>
            <sphereGeometry args={[0.04, 12, 12]} />
            <meshStandardMaterial color={PALETTE.cache} roughness={0.9} />
          </mesh>
        )
      })}

      <group position={pj}>
        <mesh>
          <sphereGeometry args={[0.1, 20, 20]} />
          <meshStandardMaterial color={PALETTE.key} roughness={0.5} />
        </mesh>
        <mesh>
          <ringGeometry args={[0.13, 0.18, 28]} />
          <meshBasicMaterial color={PALETTE.key} transparent opacity={0.6} />
        </mesh>
        <Text position={[0, 0.22, 0.05]} fontSize={0.1} color={PALETTE.key} anchorX="center">
          {`k @ j=${j}`}
        </Text>
      </group>

      <group position={pi}>
        <mesh>
          <sphereGeometry args={[0.14, 24, 24]} />
          <meshStandardMaterial color={PALETTE.query} roughness={0.45} />
        </mesh>
        <mesh>
          <ringGeometry args={[0.17, 0.24, 32]} />
          <meshBasicMaterial color={PALETTE.query} transparent opacity={0.65} />
        </mesh>
        <Text position={[0, 0.28, 0.05]} fontSize={0.11} color={PALETTE.query} anchorX="center">
          {`QKV / softmax @ i=${posI}`}
        </Text>
      </group>

      <Line points={[pj, pi]} color={PALETTE.edge} lineWidth={5} transparent opacity={0.15} />
      <Line points={[pj, pi]} color={PALETTE.edge} lineWidth={2.5} />
    </group>
  )
}

function Scene({
  posI,
  posJ,
  headDim,
  base,
}: {
  posI: number
  posJ: number
  headDim: number
  base: number
}) {
  const qBase = useMemo<Vec2>(() => [0.9, 0.35], [])
  const kBase = useMemo<Vec2>(() => [0.55, 0.85], [])

  const freqs = useMemo(() => {
    const pairs = Math.min(4, Math.floor(headDim / 2))
    return Array.from({ length: pairs }, (_, n) => 1 / Math.pow(base, (2 * n) / headDim))
  }, [headDim, base])

  const { left: railLeft, right: railRight } = railSpan(freqs.length)

  return (
    <>
      <color attach="background" args={['#020617']} />
      <fog attach="fog" args={['#020617', 14, 30]} />
      <Stars radius={100} depth={50} count={1200} factor={2} saturation={0} fade speed={0.2} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 6, 4]} intensity={0.75} color="#f1f5f9" />
      <directionalLight position={[-4, 2, -2]} intensity={0.2} color="#94a3b8" />
      <Text
        position={[0, 2.45, 0]}
        fontSize={0.21}
        color={PALETTE.label}
        anchorX="center"
        maxWidth={11}
        textAlign="center"
        outlineWidth={0.02}
        outlineColor="#020617"
      >
        Current token on the right attends to every KV slot on the left
      </Text>
      {freqs.map((theta, idx) => (
        <FrequencyPlane
          key={idx}
          idx={idx}
          theta={theta}
          posI={posI}
          posJ={posJ}
          qBase={qBase}
          kBase={kBase}
          x={(idx - (freqs.length - 1) / 2) * 3.1}
        />
      ))}
      <KvCacheTimeline posI={posI} posJ={posJ} railLeft={railLeft} railRight={railRight} />
      {freqs.map((theta, idx) => (
        <PhaseWaveLane
          key={`wave-${idx}`}
          theta={theta}
          posI={posI}
          railLeft={railLeft}
          railRight={railRight}
          zLane={RAIL_Z - 0.04 + idx * 0.015}
        />
      ))}
    </>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  )
}

function ControlRow({
  label,
  value,
  children,
}: {
  label: string
  value: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex justify-between items-baseline text-sm">
        <span className="text-slate-400 font-medium">{label}</span>
        <span className="stat-value text-slate-100 text-base">{value}</span>
      </div>
      {children}
    </div>
  )
}

export interface RopeStateProps {
  posI: number
  posJ: number
  headDim: number
  base: number
}

export function RopeDetailPanel({ posI, posJ, headDim, base }: RopeStateProps) {
  const effectiveJ = Math.min(posJ, posI)
  return (
    <div className="canvas-frame rounded-3xl overflow-hidden border border-slate-800/80">
      <Canvas
        camera={{ position: [0, 0.4, 8.8], fov: 44 }}
        style={{ height: 'min(56vh, 560px)' }}
        dpr={[1, 2]}
      >
        <Scene posI={posI} posJ={effectiveJ} headDim={headDim} base={base} />
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={5}
          maxDistance={16}
          maxPolarAngle={Math.PI / 1.85}
          dampingFactor={0.08}
          enableDamping
        />
      </Canvas>
    </div>
  )
}

export interface RopeDashboardProps extends RopeStateProps {
  setPosI: (v: number) => void
  setPosJ: (v: number) => void
  setHeadDim: (v: number) => void
  setBase: (v: number) => void
}

export function RopeDashboard({
  posI,
  posJ,
  headDim,
  base,
  setPosI,
  setPosJ,
  setHeadDim,
  setBase,
}: RopeDashboardProps) {
  const effectiveJ = Math.min(posJ, posI)
  const delta = effectiveJ - posI
  const firstTheta = 1 / Math.pow(base, 0 / headDim)
  const relativePhase = delta * firstTheta

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.08 }}
    >
      <Card className="glass-panel rounded-3xl border-0 text-slate-100">
        <CardContent className="p-6 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-500">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">Attention geometry</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-100 leading-tight">RoPE visualizer</h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Each disk is one 2D pair inside a head. The overlay on the disks is the KV cache:{' '}
              <span className="text-rose-300">older keys on the left</span>,{' '}
              <span className="text-sky-300">current token on the right</span> running QKV and softmax over all slots to
              its left. The bright magenta edge highlights one pair (i, j); faint lines are the other cache keys.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 py-1">
            <LegendItem color={PALETTE.query} label="Current token (right)" />
            <LegendItem color={PALETTE.key} label="Cached key j (left)" />
            <LegendItem color={PALETTE.edge} label="Selected edge i→j" />
            <LegendItem color={PALETTE.edgeFaint} label="Other softmax keys" />
            <LegendItem color={PALETTE.cacheFill} label="Full KV cache 0…i" />
            <LegendItem color={PALETTE.relative} label="Relative rotation" />
          </div>

          <div className="space-y-5 pt-1">
            <ControlRow label="Current token position i (right)" value={posI}>
              <Slider accent="cyan" value={[posI]} min={0} max={96} step={1} onValueChange={(v) => setPosI(v[0])} />
            </ControlRow>
            <ControlRow label="Highlight cache key j (left)" value={effectiveJ}>
              <Slider
                accent="rose"
                value={[effectiveJ]}
                min={0}
                max={Math.max(posI, 1)}
                step={1}
                onValueChange={(v) => setPosJ(v[0])}
              />
            </ControlRow>
            <ControlRow label="Head dimension" value={headDim}>
              <Slider
                accent="amber"
                value={[headDim]}
                min={16}
                max={128}
                step={16}
                onValueChange={(v) => setHeadDim(v[0])}
              />
            </ControlRow>
            <ControlRow label="RoPE base" value={base.toLocaleString()}>
              <Slider
                accent="violet"
                value={[base]}
                min={1000}
                max={50000}
                step={1000}
                onValueChange={(v) => setBase(v[0])}
              />
            </ControlRow>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Δ = j − i</span>
              <span className="stat-value text-lg text-slate-200">{delta}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Fastest phase gap</span>
              <span className="stat-value text-lg text-slate-200">{relativePhase.toFixed(2)} rad</span>
            </div>
            <p className="text-slate-500 leading-relaxed text-xs border-t border-slate-800 pt-3">
              At decode step i, softmax uses query at the rightmost slot against every key in positions 0…i on the rail.
              RoPE depends only on j−i for each pair.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
