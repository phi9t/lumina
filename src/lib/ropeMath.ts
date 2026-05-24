export type Vec2 = [number, number]

export const Q_DEMO_BASE: Vec2 = [0.9, 0.35]
export const K_DEMO_BASE: Vec2 = [0.55, 0.85]

export interface RopePair {
  index: number
  theta: number
  label: string
}

export interface RelativeIdentityInput {
  q: Vec2
  k: Vec2
  posI: number
  posJ: number
  theta: number
}

export interface RelativeIdentityValues {
  delta: number
  theta: number
  qAbsolute: Vec2
  kAbsolute: Vec2
  kRelative: Vec2
  absoluteScore: number
  relativeScore: number
  iAngle: number
  jAngle: number
  deltaAngle: number
}

export interface SelectedPairInput {
  pairIndex: number
  posI: number
  posJ: number
  headDim: number
  base: number
  qBase: Vec2
  kBase: Vec2
}

export interface SelectedPairValues extends RelativeIdentityValues {
  pair: RopePair
  phaseGap: number
  wraps: number
  cycleProgress: number
}

export function rotate2D([x, y]: Vec2, theta: number): Vec2 {
  const c = Math.cos(theta)
  const s = Math.sin(theta)
  return [c * x - s * y, s * x + c * y]
}

export function dot2D(a: Vec2, b: Vec2): number {
  return a[0] * b[0] + a[1] * b[1]
}

export function ropeTheta(pairIndex: number, headDim: number, base: number): number {
  return 1 / Math.pow(base, (2 * pairIndex) / headDim)
}

export function ropeFrequencies({
  headDim,
  base,
  maxPairs,
}: {
  headDim: number
  base: number
  maxPairs?: number
}): RopePair[] {
  const pairCount = Math.floor(headDim / 2)
  const count = maxPairs == null ? pairCount : Math.min(maxPairs, pairCount)
  return Array.from({ length: count }, (_, index) => ({
    index,
    theta: ropeTheta(index, headDim, base),
    label: `pair ${index}`,
  }))
}

export function phaseGap(delta: number, theta: number): number {
  return Math.abs(delta) * theta
}

export function wrapCount(delta: number, theta: number): number {
  return phaseGap(delta, theta) / (Math.PI * 2)
}

export function cycleProgress(delta: number, theta: number): number {
  return wrapCount(delta, theta) % 1
}

export function relativeDelta(posI: number, posJ: number): number {
  return Math.min(posJ, posI) - posI
}

export function relativeIdentity({
  q,
  k,
  posI,
  posJ,
  theta,
}: RelativeIdentityInput): RelativeIdentityValues {
  const effectiveJ = Math.min(posJ, posI)
  const delta = relativeDelta(posI, posJ)
  const qAbsolute = rotate2D(q, posI * theta)
  const kAbsolute = rotate2D(k, effectiveJ * theta)
  const kRelative = rotate2D(k, delta * theta)

  return {
    delta,
    theta,
    qAbsolute,
    kAbsolute,
    kRelative,
    absoluteScore: dot2D(qAbsolute, kAbsolute),
    relativeScore: dot2D(q, kRelative),
    iAngle: posI * theta,
    jAngle: effectiveJ * theta,
    deltaAngle: delta * theta,
  }
}

export function selectedPairValues({
  pairIndex,
  posI,
  posJ,
  headDim,
  base,
  qBase,
  kBase,
}: SelectedPairInput): SelectedPairValues {
  const pair = {
    index: pairIndex,
    theta: ropeTheta(pairIndex, headDim, base),
    label: `pair ${pairIndex}`,
  }
  const identity = relativeIdentity({
    q: qBase,
    k: kBase,
    posI,
    posJ,
    theta: pair.theta,
  })

  return {
    ...identity,
    pair,
    phaseGap: phaseGap(identity.delta, pair.theta),
    wraps: wrapCount(identity.delta, pair.theta),
    cycleProgress: cycleProgress(identity.delta, pair.theta),
  }
}
