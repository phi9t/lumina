import { renderToStaticMarkup } from 'react-dom/server'
import type { Dispatch, SetStateAction } from 'react'
import { describe, expect, test } from 'vitest'
import { DEFAULT_LAYER_CONFIG, deriveLayerModel, type LayerConfig } from '@/lib/layerModel'
import { LayerDashboard } from './LayerDashboard'

describe('LayerDashboard', () => {
  test('labels forward and training FLOP totals explicitly', () => {
    const layerModel = deriveLayerModel(DEFAULT_LAYER_CONFIG)
    const noop = () => {}
    const noopConfig = () => {}
    const markup = renderToStaticMarkup(
      <LayerDashboard
        posI={24}
        posJ={8}
        headDim={DEFAULT_LAYER_CONFIG.headDim}
        base={10000}
        setPosI={noop}
        setPosJ={noop}
        setBase={noop}
        lens="compute"
        setLens={noop}
        layerConfig={DEFAULT_LAYER_CONFIG}
        setLayerConfig={noopConfig as Dispatch<SetStateAction<LayerConfig>>}
        layerModel={layerModel}
      />,
    )

    expect(markup).toContain('Per-layer forward FLOPs')
    expect(markup).toContain('Per-layer training FLOPs')
    expect(markup).not.toContain('>Per-layer FLOPs<')
  })
})
