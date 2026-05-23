import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text, Line } from '@react-three/drei'
import { motion } from 'framer-motion'
import type { Group } from 'three'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Vec2 = [number, number]
type Vec3 = [number, number, number]

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
  color = 'white',
  label,
  z = 0,
  scale = 1,
}: {
  start?: Vec3
  vec?: Vec2
  color?: string
  label?: string
  z?: number
  scale?: number
}) {
  const end: Vec3 = [start[0] + vec[0] * scale, start[1] + vec[1] * scale, z]
  const angle = Math.atan2(vec[1], vec[0])
  return (
    <group>
      <Line points={[[start[0], start[1], z], end]} color={color} lineWidth={4} />
      <mesh position={end} rotation={[0, 0, angle - Math.PI / 2]}>
        <coneGeometry args={[0.08, 0.22, 24]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {label && (
        <Text position={[end[0] + 0.18, end[1] + 0.18, z]} fontSize={0.18} color={color} anchorX="left">
          {label}
        </Text>
      )}
    </group>
  )
}

function UnitCircle({ radius = 1.2, z = 0, color = '#64748b' }: { radius?: number; z?: number; color?: string }) {
  const points = useMemo(() => {
    const out: Vec3[] = []
    for (let i = 0; i <= 160; i++) {
      const t = (i / 160) * Math.PI * 2
      out.push([Math.cos(t) * radius, Math.sin(t) * radius, z])
    }
    return out
  }, [radius, z])
  return <Line points={points} color={color} lineWidth={1} />
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

  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0, -0.03]}>
        <circleGeometry args={[1.45, 80]} />
        <meshStandardMaterial color="#0f172a" transparent opacity={0.6} />
      </mesh>
      <UnitCircle />
      <Arrow2D vec={qi} color="#38bdf8" label={`q@${posI}`} />
      <Arrow2D vec={kj} color="#fb7185" label={`k@${posJ}`} />
      <Arrow2D vec={relK} color="#a78bfa" label={`rel k Δ=${posJ - posI}`} z={0.05} scale={0.78} />
      <Text position={[0, -1.75, 0]} fontSize={0.16} color="#e2e8f0" anchorX="center">
        {`freq ${idx}: θ=${theta.toFixed(4)}, dot=${score.toFixed(3)}`}
      </Text>
      <Text position={[0, 1.72, 0]} fontSize={0.15} color="#94a3b8" anchorX="center">
        {`phase gap: ${(Math.abs(posJ - posI) * theta).toFixed(2)} rad`}
      </Text>
    </group>
  )
}

function HelixTrace({ theta, posI, posJ, x }: { theta: number; posI: number; posJ: number; x: number }) {
  const points = useMemo(() => {
    const out: Vec3[] = []
    for (let p = 0; p <= 96; p++) {
      const a = p * theta
      out.push([x + Math.cos(a) * 0.55, -2.8 + p * 0.035, Math.sin(a) * 0.55])
    }
    return out
  }, [theta, x])

  const pi: Vec3 = [x + Math.cos(posI * theta) * 0.55, -2.8 + posI * 0.035, Math.sin(posI * theta) * 0.55]
  const pj: Vec3 = [x + Math.cos(posJ * theta) * 0.55, -2.8 + posJ * 0.035, Math.sin(posJ * theta) * 0.55]

  return (
    <group>
      <Line points={points} color="#475569" lineWidth={2} />
      <mesh position={pi}>
        <sphereGeometry args={[0.075, 24, 24]} />
        <meshStandardMaterial color="#38bdf8" />
      </mesh>
      <mesh position={pj}>
        <sphereGeometry args={[0.075, 24, 24]} />
        <meshStandardMaterial color="#fb7185" />
      </mesh>
    </group>
  )
}

function Scene({
  posI,
  posJ,
  headDim,
  base,
  animate,
}: {
  posI: number
  posJ: number
  headDim: number
  base: number
  animate: boolean
}) {
  const group = useRef<Group>(null)
  const qBase = useMemo<Vec2>(() => [0.9, 0.35], [])
  const kBase = useMemo<Vec2>(() => [0.55, 0.85], [])

  const freqs = useMemo(() => {
    const pairs = Math.min(4, Math.floor(headDim / 2))
    return Array.from({ length: pairs }, (_, n) => 1 / Math.pow(base, (2 * n) / headDim))
  }, [headDim, base])

  useFrame((_, delta) => {
    if (animate && group.current) group.current.rotation.y += delta * 0.08
  })

  return (
    <group ref={group}>
      <ambientLight intensity={0.65} />
      <directionalLight position={[4, 5, 6]} intensity={1.2} />
      <Text position={[0, 2.35, 0]} fontSize={0.25} color="#f8fafc" anchorX="center">
        RoPE: position is phase rotation; attention sees relative phase
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
      {freqs.map((theta, idx) => (
        <HelixTrace
          key={`h-${idx}`}
          theta={theta}
          posI={posI}
          posJ={posJ}
          x={(idx - (freqs.length - 1) / 2) * 3.1}
        />
      ))}
    </group>
  )
}

export default function RopeThreeJSVisualizer() {
  const [posI, setPosI] = useState(8)
  const [posJ, setPosJ] = useState(24)
  const [headDim, setHeadDim] = useState(64)
  const [base, setBase] = useState(10000)
  const [animate, setAnimate] = useState(true)

  const delta = posJ - posI
  const firstTheta = 1 / Math.pow(base, 0 / headDim)
  const relativePhase = delta * firstTheta

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900"
        >
          <Canvas camera={{ position: [0, 0.4, 8.8], fov: 48 }} style={{ height: '720px' }}>
            <Scene posI={posI} posJ={posJ} headDim={headDim} base={base} animate={animate} />
            <OrbitControls enablePan enableZoom enableRotate />
          </Canvas>
        </motion.div>

        <Card className="bg-slate-900 border-slate-800 text-slate-100 rounded-2xl shadow-2xl">
          <CardContent className="p-5 space-y-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">RoPE visualizer</h1>
              <p className="text-sm text-slate-400 mt-2 leading-6">
                Each disk is one 2D pair inside an attention head. RoPE rotates q and k by their token positions. The
                purple vector shows the equivalent relative-position rotation.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>query position i</span>
                <span>{posI}</span>
              </div>
              <Slider value={[posI]} min={0} max={96} step={1} onValueChange={(v) => setPosI(v[0])} />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>key position j</span>
                <span>{posJ}</span>
              </div>
              <Slider value={[posJ]} min={0} max={96} step={1} onValueChange={(v) => setPosJ(v[0])} />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>head dimension</span>
                <span>{headDim}</span>
              </div>
              <Slider value={[headDim]} min={16} max={128} step={16} onValueChange={(v) => setHeadDim(v[0])} />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>RoPE base</span>
                <span>{base}</span>
              </div>
              <Slider value={[base]} min={1000} max={50000} step={1000} onValueChange={(v) => setBase(v[0])} />
            </div>

            <Button className="w-full rounded-2xl" variant="secondary" onClick={() => setAnimate(!animate)}>
              {animate ? 'Pause slow orbit' : 'Resume slow orbit'}
            </Button>

            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">relative offset Δ = j − i</span>
                <span>{delta}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">fastest phase gap</span>
                <span>{relativePhase.toFixed(2)} rad</span>
              </div>
              <div className="text-slate-400 leading-6 pt-2">
                Identity shown visually: rotating q by i and k by j gives the same score as keeping q fixed and rotating k
                by j−i.
              </div>
            </div>

            <div className="text-xs text-slate-500 leading-5">
              Blue = rotated query. Pink = rotated key. Purple = relative key. Gray helices show how each frequency
              accumulates phase across positions.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
