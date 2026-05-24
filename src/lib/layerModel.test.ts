import { describe, expect, test } from 'vitest'
import { DEFAULT_LAYER_CONFIG, deriveLayerModel } from './layerModel'

describe('deriveLayerModel', () => {
  test('derives GQA-aware params and batch-wise KV cache bytes', () => {
    const model = deriveLayerModel(DEFAULT_LAYER_CONFIG)

    expect(model.modules.qkv.inputShape).toBe('B,T,D')
    expect(model.modules.qkv.outputShape).toBe('Q: B,T,N,H · K,V: B,T,K,H')
    expect(model.modules.qkv.params).toBe(25_165_824)
    expect(model.modules.oproj.params).toBe(16_777_216)
    expect(model.modules.ffnUp.params + model.modules.ffnDown.params).toBe(176_160_768)
    expect(model.kvCache.bytes).toBe(536_870_912)
    expect(model.kvCache.perTokenBytes).toBe(131_072)
    expect(model.kvCache.perSequenceBytes).toBe(536_870_912)
    expect(model.kvCache.formula).toBe('B * 2 * T * L * K * H * bytes')
  })

  test('distinguishes forward FLOPs from training FLOPs', () => {
    const model = deriveLayerModel(DEFAULT_LAYER_CONFIG)
    const modules = Object.values(model.modules)
    const expectedForwardFlops = modules.reduce(
      (total, module) => total + module.forwardFlops,
      0,
    )
    const expectedTrainingFlops = modules.reduce(
      (total, module) => total + module.trainingFlops,
      0,
    )

    expect(model.modules.qkv.forwardFlops).toBe(206_158_430_208)
    expect(model.modules.qkv.trainingFlops).toBe(618_475_290_624)
    expect(model.modules.qkv.flops).toBe(model.modules.qkv.forwardFlops)
    expect(model.totals.forwardFlops).toBe(expectedForwardFlops)
    expect(model.totals.trainingFlops).toBe(expectedTrainingFlops)
    expect(model.totals.forwardFlops).toBe(model.totals.flops)
  })

  test('shows attention dot-product compute growing faster than FFN compute as context grows', () => {
    const shortContext = deriveLayerModel({ ...DEFAULT_LAYER_CONFIG, seqLen: 128 })
    const longContext = deriveLayerModel({ ...DEFAULT_LAYER_CONFIG, seqLen: 32768 })
    const expectedAttentionDotRatio = (32768 / 128) ** 2

    expect(shortContext.totals.attentionToFfnRatio).toBeLessThan(1)
    expect(longContext.totals.attentionToFfnRatio).toBeGreaterThan(1)
    expect(longContext.totals.attentionDotFlops / shortContext.totals.attentionDotFlops).toBe(
      expectedAttentionDotRatio,
    )
  })

  test('scales KV cache memory across batch size', () => {
    const oneRequest = deriveLayerModel({ ...DEFAULT_LAYER_CONFIG, batch: 1 })
    const threeRequests = deriveLayerModel({ ...DEFAULT_LAYER_CONFIG, batch: 3 })

    expect(threeRequests.kvCache.bytes).toBe(oneRequest.kvCache.bytes * 3)
    expect(threeRequests.kvCache.perSequenceBytes).toBe(oneRequest.kvCache.perSequenceBytes)
    expect(threeRequests.kvCache.perTokenBytes).toBe(oneRequest.kvCache.perTokenBytes)
  })

  test('estimates training activation memory with batch and sequence sensitivity', () => {
    const base = deriveLayerModel(DEFAULT_LAYER_CONFIG)
    const doubleBatch = deriveLayerModel({ ...DEFAULT_LAYER_CONFIG, batch: DEFAULT_LAYER_CONFIG.batch * 2 })
    const doubleSequence = deriveLayerModel({ ...DEFAULT_LAYER_CONFIG, seqLen: DEFAULT_LAYER_CONFIG.seqLen * 2 })

    expect(base.activationMemory.bytes).toBe(104_152_956_928)
    expect(doubleBatch.activationMemory.bytes).toBe(base.activationMemory.bytes * 2)
    expect(doubleSequence.activationMemory.bytes).toBeGreaterThan(base.activationMemory.bytes * 2)
    expect(base.activationMemory.formula).toBe('L * T * B * D * (34 + 5 * N * T / D)')
  })

  test('reports approximation warnings for invalid head geometry', () => {
    const mismatchedHeadDim = deriveLayerModel({ ...DEFAULT_LAYER_CONFIG, dModel: 4097 })
    const divisibleButWrongHeadDim = deriveLayerModel({ ...DEFAULT_LAYER_CONFIG, dModel: 4096, numHeads: 32, headDim: 64 })
    const nonDivisibleGroups = deriveLayerModel({
      ...DEFAULT_LAYER_CONFIG,
      dModel: 1024,
      numHeads: 8,
      numKvHeads: 3,
      headDim: 128,
    })
    const tooManyKvHeads = deriveLayerModel({
      ...DEFAULT_LAYER_CONFIG,
      dModel: 1024,
      numHeads: 8,
      numKvHeads: 12,
      headDim: 128,
    })

    expect(mismatchedHeadDim.warnings).toContain('D is not divisible by N; H and accounting are approximate.')
    expect(divisibleButWrongHeadDim.warnings).toContain('H does not equal D / N; head-dimension accounting is approximate.')
    expect(divisibleButWrongHeadDim.warnings).not.toContain('D is not divisible by N; H and accounting are approximate.')
    expect(nonDivisibleGroups.warnings).toContain('N is not divisible by K; GQA grouping is approximate.')
    expect(tooManyKvHeads.warnings).toContain('K exceeds N; KV-head accounting is outside standard GQA/MQA assumptions.')
  })
})
