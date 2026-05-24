import { describe, expect, test } from 'vitest'
import {
  dot2D,
  phaseGap,
  relativeDelta,
  relativeIdentity,
  ropeFrequencies,
  ropeTheta,
  rotate2D,
  selectedPairValues,
  wrapCount,
} from './ropeMath'

describe('ropeMath', () => {
  test('preserves the RoPE relative-position identity for one 2D pair', () => {
    const q: [number, number] = [0.9, 0.35]
    const k: [number, number] = [0.55, 0.85]
    const theta = ropeTheta(3, 64, 10_000)
    const values = relativeIdentity({ q, k, posI: 24, posJ: 8, theta })

    expect(values.delta).toBe(-16)
    expect(values.absoluteScore).toBeCloseTo(values.relativeScore, 12)
    expect(values.absoluteScore).toBeCloseTo(
      dot2D(rotate2D(q, 24 * theta), rotate2D(k, 8 * theta)),
      12,
    )
  })

  test('generates a fastest-to-slowest frequency schedule that responds to base and head dimension', () => {
    const baseSmall = ropeFrequencies({ headDim: 16, base: 1_000 })
    const baseLarge = ropeFrequencies({ headDim: 16, base: 50_000 })
    const widerHead = ropeFrequencies({ headDim: 128, base: 10_000 })

    expect(baseSmall).toHaveLength(8)
    expect(widerHead).toHaveLength(64)
    expect(baseSmall[0].theta).toBe(1)
    expect(baseSmall[7].theta).toBeGreaterThan(baseLarge[7].theta)
    expect(widerHead[63].theta).toBeGreaterThan(0)
    expect(widerHead[0].label).toBe('pair 0')
  })

  test('computes phase gaps and wrap counts from delta and theta', () => {
    const theta = Math.PI / 8

    expect(phaseGap(-20, theta)).toBeCloseTo(2.5 * Math.PI, 12)
    expect(wrapCount(-20, theta)).toBeCloseTo(1.25, 12)
  })

  test('clamps relative delta to visible decode keys', () => {
    expect(relativeDelta(24, 8)).toBe(-16)
    expect(relativeDelta(24, 24)).toBe(0)
    expect(relativeDelta(24, 48)).toBe(0)
  })

  test('derives selected-pair absolute and relative readouts', () => {
    const values = selectedPairValues({
      pairIndex: 2,
      posI: 32,
      posJ: 12,
      headDim: 64,
      base: 10_000,
      qBase: [0.9, 0.35],
      kBase: [0.55, 0.85],
    })

    expect(values.pair.index).toBe(2)
    expect(values.delta).toBe(-20)
    expect(values.phaseGap).toBeCloseTo(Math.abs(values.delta) * values.pair.theta, 12)
    expect(values.absoluteScore).toBeCloseTo(values.relativeScore, 12)
  })

  test('selected-pair values clamp future key positions to the query position', () => {
    const values = selectedPairValues({
      pairIndex: 2,
      posI: 32,
      posJ: 80,
      headDim: 64,
      base: 10_000,
      qBase: [0.9, 0.35],
      kBase: [0.55, 0.85],
    })

    expect(values.delta).toBe(0)
    expect(values.jAngle).toBeCloseTo(values.iAngle, 12)
    expect(values.absoluteScore).toBeCloseTo(values.relativeScore, 12)
  })
})
