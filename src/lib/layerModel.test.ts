import { describe, expect, test } from 'vitest'
import { DEFAULT_LAYER_CONFIG, deriveLayerModel } from './layerModel'

describe('deriveLayerModel', () => {
  test('derives GQA-aware QKV tensor shapes and KV cache bytes', () => {
    const model = deriveLayerModel(DEFAULT_LAYER_CONFIG)

    expect(model.modules.qkv.inputShape).toBe('B,T,D')
    expect(model.modules.qkv.outputShape).toBe('Q: B,T,N,H · K,V: B,T,K,H')
    expect(model.modules.qkv.params).toBe(25_165_824)
    expect(model.kvCache.bytes).toBe(536_870_912)
    expect(model.kvCache.formula).toBe('2 * T * L * K * H * bytes')
  })

  test('shows attention compute growing faster than FFN compute as context grows', () => {
    const shortContext = deriveLayerModel({ ...DEFAULT_LAYER_CONFIG, seqLen: 128 })
    const longContext = deriveLayerModel({ ...DEFAULT_LAYER_CONFIG, seqLen: 32768 })

    expect(shortContext.totals.attentionToFfnRatio).toBeLessThan(1)
    expect(longContext.totals.attentionToFfnRatio).toBeGreaterThan(1)
  })

  test('reports an approximation warning when head dimension does not match D over N', () => {
    const model = deriveLayerModel({ ...DEFAULT_LAYER_CONFIG, dModel: 4097 })

    expect(model.warnings).toContain('D is not divisible by N; H and accounting are approximate.')
  })
})
