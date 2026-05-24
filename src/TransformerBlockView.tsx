/**
 * TransformerBlockView — compact SVG navigation map for one decoder layer.
 */
import { BranchCircuit, type BranchDef } from '@/components/block/BranchCircuit'
import { JunctionNode } from '@/components/block/JunctionNode'
import { MainlineRailVertical } from '@/components/block/MainlineRail'
import { ModuleNode } from '@/components/block/ModuleNode'
import type { AttentionSub, FfnSub, MainlineSub, SelectedModule } from '@/types/blockSelection'

const VIEW_W = 430
const VIEW_H = 990

const MAINLINE_X = 72

const Y_IN = 64
const Y_ATTN_TEE = 100
const Y_J1 = 485
const Y_FFN_TEE = Y_J1 + 48
const Y_J2 = 845
const Y_OUT = 930

const ATTENTION_BRANCH: BranchDef = {
  preNorm: { id: 'ln', label: 'LayerNorm', sub: 'pre-norm' },
  steps: [
    { id: 'qkv', label: 'QKV proj', sub: 'd → 3·d', micro: ['Q', 'K', 'V'] },
    { id: 'rope', label: 'RoPE', sub: 'R(mθ)' },
    { id: 'softmax', label: 'Attention', sub: 'softmax', micro: ['QKᵀ', 'scale', 'softmax', '·V'] },
    { id: 'oproj', label: 'O proj', sub: 'd → d' },
  ],
}

const FFN_BRANCH: BranchDef = {
  preNorm: { id: 'ln', label: 'LayerNorm', sub: 'pre-norm' },
  steps: [
    { id: 'up', label: 'Up proj', sub: 'd → 4d' },
    { id: 'act', label: 'Activation', sub: 'SwiGLU', micro: ['gate', '⊙', 'value'] },
    { id: 'down', label: 'Down proj', sub: '4d → d' },
  ],
}

interface TransformerBlockViewProps {
  selected: SelectedModule
  onSelect: (sel: SelectedModule) => void
}

function mainlineEmphasis(focusBranch: 'attention' | 'ffn' | 'mainline' | null): 'boost' | 'normal' | 'dim' {
  if (focusBranch == null || focusBranch === 'mainline') return 'boost'
  return 'dim'
}

function junctionDimmed(which: 'junction1' | 'junction2', selected: SelectedModule | null): boolean {
  if (selected == null) return false
  if (selected.branch === 'mainline') {
    if (which === 'junction1') return selected.submodule === 'junction2' || selected.submodule === 'out'
    return selected.submodule === 'in' || selected.submodule === 'junction1'
  }
  if (which === 'junction1') return selected.branch === 'ffn'
  return selected.branch === 'attention'
}

export function TransformerBlockView({ selected, onSelect }: TransformerBlockViewProps) {
  const attnSub = selected?.branch === 'attention' ? selected.submodule : null
  const ffnSub = selected?.branch === 'ffn' ? selected.submodule : null
  const mainSub = selected?.branch === 'mainline' ? selected.submodule : null
  const hasSelection = selected != null
  const focusBranch = selected?.branch ?? null

  return (
    <div className="block-view-frame block-view-frame--vertical">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="block-view-svg"
        role="group"
        aria-label="Transformer block with vertical residual mainline, pre-norm on branch spine, and vertical action sequences inside module shells"
      >
        <g className="block-view">
          <text x={MAINLINE_X + 165} y={28} textAnchor="middle" className="block-title">
            Transformer block · residual mainline ↓
          </text>
          <text x={MAINLINE_X + 165} y={46} textAnchor="middle" className="block-subtitle">
            x → x + Attn(LN(x)) → that + FFN(LN(·))
          </text>

          <BranchCircuit
            branchKind="attention"
            title="Attention"
            mainlineX={MAINLINE_X}
            teeY={Y_ATTN_TEE}
            junctionY={Y_J1}
            branch={ATTENTION_BRANCH}
            selectedSub={attnSub}
            focusBranch={focusBranch}
            onSelect={(sub) => onSelect({ branch: 'attention', submodule: sub as AttentionSub })}
          />
          <BranchCircuit
            branchKind="ffn"
            title="FFN / SwiGLU"
            mainlineX={MAINLINE_X}
            teeY={Y_FFN_TEE}
            junctionY={Y_J2}
            branch={FFN_BRANCH}
            selectedSub={ffnSub}
            focusBranch={focusBranch}
            onSelect={(sub) => onSelect({ branch: 'ffn', submodule: sub as FfnSub })}
          />

          <MainlineRailVertical
            x={MAINLINE_X}
            y1={Y_IN + 18}
            y2={Y_OUT - 18}
            emphasis={mainlineEmphasis(focusBranch)}
          />

          <text
            x={MAINLINE_X - 48}
            y={(Y_IN + Y_OUT) / 2}
            textAnchor="middle"
            className="mainline-caption mainline-caption--vertical"
            transform={`rotate(-90, ${MAINLINE_X - 48}, ${(Y_IN + Y_OUT) / 2})`}
          >
            residual stream
          </text>

          <ModuleNode
            x={MAINLINE_X}
            y={Y_IN}
            width={68}
            height={30}
            variant="pill"
            label="x_in"
            active={mainSub === 'in'}
            dimmed={hasSelection && mainSub !== 'in'}
            showDetails={false}
            onSelect={() => onSelect({ branch: 'mainline', submodule: 'in' })}
          />
          <ModuleNode
            x={MAINLINE_X}
            y={Y_OUT}
            width={68}
            height={30}
            variant="pill"
            label="x_out"
            active={mainSub === 'out'}
            dimmed={hasSelection && mainSub !== 'out'}
            showDetails={false}
            onSelect={() => onSelect({ branch: 'mainline', submodule: 'out' })}
          />

          <JunctionNode
            x={MAINLINE_X}
            y={Y_J1}
            label="x ⊕ attn"
            active={mainSub === ('junction1' satisfies MainlineSub)}
            dimmed={junctionDimmed('junction1', selected)}
            mergeActive={focusBranch === 'attention' || mainSub === 'junction1'}
            onSelect={() => onSelect({ branch: 'mainline', submodule: 'junction1' })}
          />
          <JunctionNode
            x={MAINLINE_X}
            y={Y_J2}
            label="x ⊕ ffn"
            active={mainSub === ('junction2' satisfies MainlineSub)}
            dimmed={junctionDimmed('junction2', selected)}
            mergeActive={focusBranch === 'ffn' || mainSub === 'junction2'}
            onSelect={() => onSelect({ branch: 'mainline', submodule: 'junction2' })}
          />
        </g>
      </svg>

      <div className="block-view-hint">
        <span className="block-view-hint__chip">tap a module for details</span>
        <span className="block-view-hint__keys">Esc to close</span>
      </div>
    </div>
  )
}
