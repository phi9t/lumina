import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { DEFAULT_LAYER_CONFIG, deriveLayerModel } from '@/lib/layerModel'
import { DetailDrawer } from './DetailDrawer'

describe('DetailDrawer', () => {
  test('shows GQA-aware QKV pseudocode for grouped KV heads', () => {
    const markup = renderToStaticMarkup(
      <DetailDrawer
        selected={{ branch: 'attention', submodule: 'qkv' }}
        ropeState={{ posI: 24, posJ: 8, headDim: DEFAULT_LAYER_CONFIG.headDim, base: 10000 }}
        lens="shapes"
        layerModel={deriveLayerModel(DEFAULT_LAYER_CONFIG)}
        onClose={() => {}}
      />,
    )

    expect(markup).toContain('num_kv_heads * d_head')
    expect(markup).toContain('k = k.view(B, T, num_kv_heads, d_head)')
    expect(markup).not.toContain('qkv.chunk(3')
  })
})
