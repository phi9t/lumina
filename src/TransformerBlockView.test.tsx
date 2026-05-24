import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { TransformerBlockView } from './TransformerBlockView'

describe('TransformerBlockView', () => {
  test('left SVG contains no formulas, FLOP counts, byte counts, or detailed math copy', () => {
    const markup = renderToStaticMarkup(<TransformerBlockView selected={null} onSelect={() => {}} />)

    expect(markup).not.toMatch(/[GMT]?FLOPs?/i)
    expect(markup).not.toMatch(/[KMGT]iB\b/)
    expect(markup).not.toMatch(/\bbytes?\b/i)
    expect(markup).not.toMatch(/=\s*softmax|=\s*\(R_|KV cache/i)
  })
})
