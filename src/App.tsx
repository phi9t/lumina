import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { LayerDashboard } from '@/components/dashboard/LayerDashboard'
import { DetailDrawer } from '@/components/block/DetailDrawer'
import { DEFAULT_LAYER_CONFIG, deriveLayerModel, type LayerConfig, type Lens } from '@/lib/layerModel'
import { TransformerBlockView } from '@/TransformerBlockView'
import type { SelectedModule } from '@/types/blockSelection'

export default function App() {
  const [selected, setSelected] = useState<SelectedModule>(null)
  const [lens, setLens] = useState<Lens>('flow')
  const [layerConfig, setLayerConfig] = useState<LayerConfig>(DEFAULT_LAYER_CONFIG)
  const [posI, setPosI] = useState(24)
  const [posJ, setPosJ] = useState(8)
  const [base, setBase] = useState(10000)
  const layerModel = useMemo(() => deriveLayerModel(layerConfig), [layerConfig])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const effectiveJ = Math.min(posJ, posI)

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="observatory-bg" aria-hidden />

      <div className="relative z-10 w-full p-4 md:p-6 lg:p-8">
        <div className="max-w-[118rem] mx-auto flex flex-col xl:flex-row gap-5 lg:gap-6 items-start">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full xl:w-[420px] 2xl:w-[460px] shrink-0"
          >
            <TransformerBlockView selected={selected} onSelect={setSelected} />
          </motion.div>

          <div className="flex-1 min-w-[320px] flex flex-col gap-5 lg:gap-6">
            <DetailDrawer
              selected={selected}
              ropeState={{ posI, posJ: effectiveJ, headDim: layerConfig.headDim, base }}
              lens={lens}
              layerModel={layerModel}
              onClose={() => setSelected(null)}
            />
          </div>

          <div className="w-full xl:w-[380px] shrink-0">
            <LayerDashboard
              posI={posI}
              setPosI={setPosI}
              posJ={effectiveJ}
              setPosJ={setPosJ}
              headDim={layerConfig.headDim}
              base={base}
              setBase={setBase}
              lens={lens}
              setLens={setLens}
              layerConfig={layerConfig}
              setLayerConfig={setLayerConfig}
              layerModel={layerModel}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
