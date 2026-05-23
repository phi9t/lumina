import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { RopeDashboard } from '@/RopeThreeJSVisualizer'
import { DetailDrawer } from '@/components/block/DetailDrawer'
import { TransformerBlockView } from '@/TransformerBlockView'
import type { SelectedModule } from '@/types/blockSelection'

export default function App() {
  const [selected, setSelected] = useState<SelectedModule>(null)
  const [posI, setPosI] = useState(24)
  const [posJ, setPosJ] = useState(8)
  const [headDim, setHeadDim] = useState(64)
  const [base, setBase] = useState(10000)

  useEffect(() => {
    if (!selected) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selected])

  const setPosIClamped = useCallback((i: number) => {
    setPosI(i)
    setPosJ((j) => Math.min(j, i))
  }, [])

  const effectiveJ = Math.min(posJ, posI)

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="observatory-bg" aria-hidden>
        <div className="observatory-orb observatory-orb--cyan" />
        <div className="observatory-orb observatory-orb--violet" />
      </div>

      <div className="relative z-10 w-full p-4 md:p-6 lg:p-8">
        <div className="max-w-[110rem] mx-auto flex flex-col xl:flex-row gap-5 lg:gap-6 items-start">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full xl:w-[440px] shrink-0"
          >
            <TransformerBlockView selected={selected} onSelect={setSelected} />
          </motion.div>

          <div className="flex-1 min-w-[320px] flex flex-col gap-5 lg:gap-6">
            <DetailDrawer
              selected={selected}
              ropeState={{ posI, posJ: effectiveJ, headDim, base }}
              onClose={() => setSelected(null)}
            />
          </div>

          <div className="w-full xl:w-[380px] shrink-0">
            <RopeDashboard
              posI={posI}
              setPosI={setPosIClamped}
              posJ={effectiveJ}
              setPosJ={setPosJ}
              headDim={headDim}
              setHeadDim={setHeadDim}
              base={base}
              setBase={setBase}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
