export type Lens = 'flow' | 'shapes' | 'compute' | 'memory' | 'parallelism'

export interface LayerConfig {
  batch: number
  seqLen: number
  dModel: number
  numHeads: number
  numKvHeads: number
  headDim: number
  ffnDim: number
  layers: number
  precisionBytes: 1 | 2 | 4
  mode: 'training' | 'prefill' | 'decode'
}

export interface ModuleAccounting {
  id: string
  inputShape: string
  outputShape: string
  params: number
  flops: number
  memoryBytes: number
  summary: string
  sourceCue: string
  parallelism: string[]
}

export interface LayerModel {
  config: LayerConfig
  modules: {
    attentionLn: ModuleAccounting
    qkv: ModuleAccounting
    rope: ModuleAccounting
    attention: ModuleAccounting
    oproj: ModuleAccounting
    ffnLn: ModuleAccounting
    ffnUp: ModuleAccounting
    ffnAct: ModuleAccounting
    ffnDown: ModuleAccounting
    residualAdd1: ModuleAccounting
    residualAdd2: ModuleAccounting
  }
  totals: {
    params: number
    flops: number
    attentionFlops: number
    ffnFlops: number
    attentionToFfnRatio: number
  }
  kvCache: {
    bytes: number
    formula: string
  }
  warnings: string[]
}

export const DEFAULT_LAYER_CONFIG: LayerConfig = {
  batch: 1,
  seqLen: 4096,
  dModel: 4096,
  numHeads: 32,
  numKvHeads: 8,
  headDim: 128,
  ffnDim: 14336,
  layers: 32,
  precisionBytes: 2,
  mode: 'decode',
}

export const LENS_EXPLANATIONS: Record<Lens, string> = {
  flow: 'Follow the residual stream: pre-norm branches read from it, compute corrections, then add back through + junctions.',
  shapes: 'Track exact matrix sizes with B,T,D,N,K,H,F so MHA, GQA, and FFN width stay concrete.',
  compute: 'Compare per-layer matmul cost: FFN dominates many normal contexts, while attention grows quadratically with T.',
  memory: 'Separate temporary activations from persistent decode state; KV cache scales with T, L, K, H, and precision.',
  parallelism: 'Map layer-local pressure points: TP splits matmuls, SP/CP touch sequence and attention, EP appears when FFN becomes MoE.',
}

function matmulFlops(batch: number, tokens: number, params: number) {
  return 2 * batch * tokens * params
}

function activationBytes(config: LayerConfig, width: number) {
  return config.batch * config.seqLen * width * config.precisionBytes
}

export function formatCount(value: number): string {
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`
  return value.toLocaleString()
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 4) return `${(bytes / 1024 ** 4).toFixed(2)} TiB`
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GiB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2)} MiB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KiB`
  return `${bytes.toLocaleString()} B`
}

export function deriveLayerModel(config: LayerConfig): LayerModel {
  const warnings: string[] = []
  if (config.dModel % config.numHeads !== 0 || config.dModel / config.numHeads !== config.headDim) {
    warnings.push('D is not divisible by N; H and accounting are approximate.')
  }

  const qWidth = config.numHeads * config.headDim
  const kvWidth = config.numKvHeads * config.headDim
  const qParams = config.dModel * qWidth
  const kParams = config.dModel * kvWidth
  const vParams = config.dModel * kvWidth
  const qkvParams = qParams + kParams + vParams
  const oprojParams = qWidth * config.dModel
  const ffnUpParams = config.dModel * config.ffnDim * 2
  const ffnDownParams = config.ffnDim * config.dModel
  const attentionScoreFlops = 2 * config.batch * config.numHeads * config.seqLen * config.seqLen * config.headDim
  const attentionValueFlops = attentionScoreFlops
  const attentionFlops = attentionScoreFlops + attentionValueFlops
  const qkvFlops = matmulFlops(config.batch, config.seqLen, qkvParams)
  const oprojFlops = matmulFlops(config.batch, config.seqLen, oprojParams)
  const ffnUpFlops = matmulFlops(config.batch, config.seqLen, ffnUpParams)
  const ffnDownFlops = matmulFlops(config.batch, config.seqLen, ffnDownParams)
  const ffnFlops = ffnUpFlops + ffnDownFlops
  const kvCacheBytes =
    2 * config.seqLen * config.layers * config.numKvHeads * config.headDim * config.precisionBytes

  const modules = {
    attentionLn: {
      id: 'attention:ln',
      inputShape: 'B,T,D',
      outputShape: 'B,T,D',
      params: 2 * config.dModel,
      flops: 5 * config.batch * config.seqLen * config.dModel,
      memoryBytes: activationBytes(config, config.dModel),
      summary: 'Pre-normalizes the residual stream before attention reads it.',
      sourceCue: 'pre-norm residual block',
      parallelism: ['SP'],
    },
    qkv: {
      id: 'attention:qkv',
      inputShape: 'B,T,D',
      outputShape: 'Q: B,T,N,H · K,V: B,T,K,H',
      params: qkvParams,
      flops: qkvFlops,
      memoryBytes: activationBytes(config, qWidth + 2 * kvWidth),
      summary: 'Projects residual features into query heads and grouped key/value heads.',
      sourceCue: 'MHA/GQA/MQA projections',
      parallelism: ['TP'],
    },
    rope: {
      id: 'attention:rope',
      inputShape: 'Q: B,T,N,H · K: B,T,K,H',
      outputShape: 'rotated Q,K with unchanged shape',
      params: 0,
      flops: 4 * config.batch * config.seqLen * (qWidth + kvWidth),
      memoryBytes: activationBytes(config, qWidth + kvWidth),
      summary: 'Applies position-dependent rotations to 2D pairs inside Q and K.',
      sourceCue: 'relative position through rotary embeddings',
      parallelism: ['SP'],
    },
    attention: {
      id: 'attention:softmax',
      inputShape: 'Q: B,T,N,H · K,V: B,T,K,H',
      outputShape: 'B,T,N,H',
      params: 0,
      flops: attentionFlops,
      memoryBytes: config.batch * config.numHeads * config.seqLen * config.seqLen * config.precisionBytes,
      summary: 'Scores every query against visible keys, softmaxes over positions, then mixes values.',
      sourceCue: 'quadratic attention in sequence length',
      parallelism: ['TP', 'CP'],
    },
    oproj: {
      id: 'attention:oproj',
      inputShape: 'B,T,N,H',
      outputShape: 'B,T,D',
      params: oprojParams,
      flops: oprojFlops,
      memoryBytes: activationBytes(config, config.dModel),
      summary: 'Mixes attention heads back into the residual width.',
      sourceCue: 'attention output projection',
      parallelism: ['TP'],
    },
    ffnLn: {
      id: 'ffn:ln',
      inputShape: 'B,T,D',
      outputShape: 'B,T,D',
      params: 2 * config.dModel,
      flops: 5 * config.batch * config.seqLen * config.dModel,
      memoryBytes: activationBytes(config, config.dModel),
      summary: 'Pre-normalizes the post-attention residual before the dense FFN.',
      sourceCue: 'pre-norm residual block',
      parallelism: ['SP'],
    },
    ffnUp: {
      id: 'ffn:up',
      inputShape: 'B,T,D',
      outputShape: 'gate/up: B,T,F',
      params: ffnUpParams,
      flops: ffnUpFlops,
      memoryBytes: activationBytes(config, config.ffnDim * 2),
      summary: 'Expands residual features into SwiGLU gate and value streams.',
      sourceCue: 'MLP/FFN expansion',
      parallelism: ['TP'],
    },
    ffnAct: {
      id: 'ffn:act',
      inputShape: 'gate/up: B,T,F',
      outputShape: 'B,T,F',
      params: 0,
      flops: 8 * config.batch * config.seqLen * config.ffnDim,
      memoryBytes: activationBytes(config, config.ffnDim),
      summary: 'Applies the SwiGLU non-linearity before projecting back down.',
      sourceCue: 'SwiGLU activation',
      parallelism: ['SP'],
    },
    ffnDown: {
      id: 'ffn:down',
      inputShape: 'B,T,F',
      outputShape: 'B,T,D',
      params: ffnDownParams,
      flops: ffnDownFlops,
      memoryBytes: activationBytes(config, config.dModel),
      summary: 'Projects the expanded FFN representation back to the residual width.',
      sourceCue: 'MLP/FFN down projection',
      parallelism: ['TP'],
    },
    residualAdd1: {
      id: 'mainline:junction1',
      inputShape: 'B,T,D + B,T,D',
      outputShape: 'B,T,D',
      params: 0,
      flops: config.batch * config.seqLen * config.dModel,
      memoryBytes: activationBytes(config, config.dModel),
      summary: 'Adds the attention branch correction into the residual stream.',
      sourceCue: 'residual addition',
      parallelism: ['SP'],
    },
    residualAdd2: {
      id: 'mainline:junction2',
      inputShape: 'B,T,D + B,T,D',
      outputShape: 'B,T,D',
      params: 0,
      flops: config.batch * config.seqLen * config.dModel,
      memoryBytes: activationBytes(config, config.dModel),
      summary: 'Adds the FFN branch correction into the residual stream.',
      sourceCue: 'residual addition',
      parallelism: ['SP'],
    },
  }

  const params = Object.values(modules).reduce((sum, module) => sum + module.params, 0)
  const flops = Object.values(modules).reduce((sum, module) => sum + module.flops, 0)

  return {
    config,
    modules,
    totals: {
      params,
      flops,
      attentionFlops,
      ffnFlops,
      attentionToFfnRatio: attentionFlops / ffnFlops,
    },
    kvCache: {
      bytes: kvCacheBytes,
      formula: '2 * T * L * K * H * bytes',
    },
    warnings,
  }
}
