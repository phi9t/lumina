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
  forwardFlops: number
  trainingFlops: number
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
    forwardFlops: number
    trainingFlops: number
    attentionFlops: number
    attentionDotFlops: number
    ffnFlops: number
    attentionToFfnRatio: number
  }
  kvCache: {
    bytes: number
    perTokenBytes: number
    perSequenceBytes: number
    formula: string
  }
  activationMemory: {
    bytes: number
    formula: string
    note: string
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
  memory: 'Separate temporary activations from persistent decode state; KV cache scales with B, T, L, K, H, and precision.',
  parallelism: 'Map layer-local pressure points: TP splits matmuls, SP/CP touch sequence and attention, EP appears when FFN becomes MoE.',
}

const TRAINING_MATMUL_FACTOR = 6
const FORWARD_MATMUL_FACTOR = 2

function forwardMatmulFlops(config: LayerConfig, params: number) {
  return FORWARD_MATMUL_FACTOR * config.batch * config.seqLen * params
}

function trainingMatmulFlops(config: LayerConfig, params: number) {
  return TRAINING_MATMUL_FACTOR * config.batch * config.seqLen * params
}

function activationBytes(config: LayerConfig, width: number) {
  return config.batch * config.seqLen * width * config.precisionBytes
}

function makeAccounting(input: Omit<ModuleAccounting, 'flops'>): ModuleAccounting {
  return {
    ...input,
    flops: input.forwardFlops,
  }
}

function safeRatio(numerator: number, denominator: number) {
  if (denominator === 0) return 0
  return numerator / denominator
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
  if (config.numHeads % config.numKvHeads !== 0) {
    warnings.push('N is not divisible by K; GQA grouping is approximate.')
  }
  if (config.numKvHeads > config.numHeads) {
    warnings.push('K exceeds N; KV-head accounting is outside standard GQA/MQA assumptions.')
  }

  const qWidth = config.numHeads * config.headDim
  const kvWidth = config.numKvHeads * config.headDim
  const qParams = config.dModel * qWidth
  const kParams = config.dModel * kvWidth
  const vParams = config.dModel * kvWidth
  const qkvParams = qParams + kParams + vParams
  const oprojParams = config.dModel * config.numHeads * config.headDim
  const ffnUpParams = 2 * config.dModel * config.ffnDim
  const ffnDownParams = config.dModel * config.ffnDim

  const attentionDotForwardFlops =
    4 * config.batch * config.seqLen * config.seqLen * config.numHeads * config.headDim
  const attentionDotTrainingFlops =
    12 * config.batch * config.seqLen * config.seqLen * config.numHeads * config.headDim
  const qkvForwardFlops = forwardMatmulFlops(config, qkvParams)
  const qkvTrainingFlops = trainingMatmulFlops(config, qkvParams)
  const oprojForwardFlops = forwardMatmulFlops(config, oprojParams)
  const oprojTrainingFlops = trainingMatmulFlops(config, oprojParams)
  const ffnUpForwardFlops = forwardMatmulFlops(config, ffnUpParams)
  const ffnUpTrainingFlops = trainingMatmulFlops(config, ffnUpParams)
  const ffnDownForwardFlops = forwardMatmulFlops(config, ffnDownParams)
  const ffnDownTrainingFlops = trainingMatmulFlops(config, ffnDownParams)
  const kvCachePerTokenBytes = 2 * config.layers * config.numKvHeads * config.headDim * config.precisionBytes
  const kvCachePerSequenceBytes = config.seqLen * kvCachePerTokenBytes
  const kvCacheBytes = config.batch * kvCachePerSequenceBytes
  const activationMemoryBytes =
    config.layers *
    config.seqLen *
    config.batch *
    config.dModel *
    (34 + (5 * config.numHeads * config.seqLen) / config.dModel)

  const modules = {
    attentionLn: makeAccounting({
      id: 'attention:ln',
      inputShape: 'B,T,D',
      outputShape: 'B,T,D',
      params: 2 * config.dModel,
      forwardFlops: 5 * config.batch * config.seqLen * config.dModel,
      trainingFlops: 15 * config.batch * config.seqLen * config.dModel,
      memoryBytes: activationBytes(config, config.dModel),
      summary: 'Pre-normalizes the residual stream before attention reads it.',
      sourceCue: 'pre-norm residual block',
      parallelism: ['SP'],
    }),
    qkv: makeAccounting({
      id: 'attention:qkv',
      inputShape: 'B,T,D',
      outputShape: 'Q: B,T,N,H · K,V: B,T,K,H',
      params: qkvParams,
      forwardFlops: qkvForwardFlops,
      trainingFlops: qkvTrainingFlops,
      memoryBytes: activationBytes(config, qWidth + 2 * kvWidth),
      summary: 'Projects residual features into query heads and grouped key/value heads.',
      sourceCue: 'GQA projections: D*(N+2K)*H params',
      parallelism: ['TP'],
    }),
    rope: makeAccounting({
      id: 'attention:rope',
      inputShape: 'Q: B,T,N,H · K: B,T,K,H',
      outputShape: 'rotated Q,K with unchanged shape',
      params: 0,
      forwardFlops: 4 * config.batch * config.seqLen * (qWidth + kvWidth),
      trainingFlops: 8 * config.batch * config.seqLen * (qWidth + kvWidth),
      memoryBytes: activationBytes(config, qWidth + kvWidth),
      summary: 'Applies position-dependent rotations to 2D pairs inside Q and K.',
      sourceCue: 'relative position through rotary embeddings',
      parallelism: ['SP'],
    }),
    attention: makeAccounting({
      id: 'attention:softmax',
      inputShape: 'Q: B,T,N,H · K,V: B,T,K,H',
      outputShape: 'B,T,N,H',
      params: 0,
      forwardFlops: attentionDotForwardFlops,
      trainingFlops: attentionDotTrainingFlops,
      memoryBytes: config.batch * config.numHeads * config.seqLen * config.seqLen * config.precisionBytes,
      summary: 'Scores every query against visible keys, softmaxes over positions, then mixes values.',
      sourceCue: 'dot attention: forward 4*B*T^2*N*H, train 12*B*T^2*N*H',
      parallelism: ['TP', 'CP'],
    }),
    oproj: makeAccounting({
      id: 'attention:oproj',
      inputShape: 'B,T,N,H',
      outputShape: 'B,T,D',
      params: oprojParams,
      forwardFlops: oprojForwardFlops,
      trainingFlops: oprojTrainingFlops,
      memoryBytes: activationBytes(config, config.dModel),
      summary: 'Mixes attention heads back into the residual width.',
      sourceCue: 'attention output projection',
      parallelism: ['TP'],
    }),
    ffnLn: makeAccounting({
      id: 'ffn:ln',
      inputShape: 'B,T,D',
      outputShape: 'B,T,D',
      params: 2 * config.dModel,
      forwardFlops: 5 * config.batch * config.seqLen * config.dModel,
      trainingFlops: 15 * config.batch * config.seqLen * config.dModel,
      memoryBytes: activationBytes(config, config.dModel),
      summary: 'Pre-normalizes the post-attention residual before the dense FFN.',
      sourceCue: 'pre-norm residual block',
      parallelism: ['SP'],
    }),
    ffnUp: makeAccounting({
      id: 'ffn:up',
      inputShape: 'B,T,D',
      outputShape: 'gate/up: B,T,F',
      params: ffnUpParams,
      forwardFlops: ffnUpForwardFlops,
      trainingFlops: ffnUpTrainingFlops,
      memoryBytes: activationBytes(config, config.ffnDim * 2),
      summary: 'Expands residual features into SwiGLU gate and value streams.',
      sourceCue: 'SwiGLU input projections: 2*D*F params',
      parallelism: ['TP'],
    }),
    ffnAct: makeAccounting({
      id: 'ffn:act',
      inputShape: 'gate/up: B,T,F',
      outputShape: 'B,T,F',
      params: 0,
      forwardFlops: 8 * config.batch * config.seqLen * config.ffnDim,
      trainingFlops: 16 * config.batch * config.seqLen * config.ffnDim,
      memoryBytes: activationBytes(config, config.ffnDim),
      summary: 'Applies the SwiGLU non-linearity before projecting back down.',
      sourceCue: 'elementwise activation cost is lower order than matmuls',
      parallelism: ['SP'],
    }),
    ffnDown: makeAccounting({
      id: 'ffn:down',
      inputShape: 'B,T,F',
      outputShape: 'B,T,D',
      params: ffnDownParams,
      forwardFlops: ffnDownForwardFlops,
      trainingFlops: ffnDownTrainingFlops,
      memoryBytes: activationBytes(config, config.dModel),
      summary: 'Projects the expanded FFN representation back to the residual width.',
      sourceCue: 'SwiGLU output projection: D*F params',
      parallelism: ['TP'],
    }),
    residualAdd1: makeAccounting({
      id: 'mainline:junction1',
      inputShape: 'B,T,D + B,T,D',
      outputShape: 'B,T,D',
      params: 0,
      forwardFlops: config.batch * config.seqLen * config.dModel,
      trainingFlops: 2 * config.batch * config.seqLen * config.dModel,
      memoryBytes: activationBytes(config, config.dModel),
      summary: 'Adds the attention branch correction into the residual stream.',
      sourceCue: 'residual addition',
      parallelism: ['SP'],
    }),
    residualAdd2: makeAccounting({
      id: 'mainline:junction2',
      inputShape: 'B,T,D + B,T,D',
      outputShape: 'B,T,D',
      params: 0,
      forwardFlops: config.batch * config.seqLen * config.dModel,
      trainingFlops: 2 * config.batch * config.seqLen * config.dModel,
      memoryBytes: activationBytes(config, config.dModel),
      summary: 'Adds the FFN branch correction into the residual stream.',
      sourceCue: 'residual addition',
      parallelism: ['SP'],
    }),
  }

  const moduleList = Object.values(modules)
  const params = moduleList.reduce((sum, module) => sum + module.params, 0)
  const forwardFlops = moduleList.reduce((sum, module) => sum + module.forwardFlops, 0)
  const trainingFlops = moduleList.reduce((sum, module) => sum + module.trainingFlops, 0)
  const ffnForwardFlops = modules.ffnUp.forwardFlops + modules.ffnAct.forwardFlops + modules.ffnDown.forwardFlops

  return {
    config,
    modules,
    totals: {
      params,
      flops: forwardFlops,
      forwardFlops,
      trainingFlops,
      attentionFlops: attentionDotForwardFlops,
      attentionDotFlops: attentionDotForwardFlops,
      ffnFlops: ffnForwardFlops,
      attentionToFfnRatio: safeRatio(attentionDotForwardFlops, ffnForwardFlops),
    },
    kvCache: {
      bytes: kvCacheBytes,
      perTokenBytes: kvCachePerTokenBytes,
      perSequenceBytes: kvCachePerSequenceBytes,
      formula: 'B * 2 * T * L * K * H * bytes',
    },
    activationMemory: {
      bytes: activationMemoryBytes,
      formula: 'L * T * B * D * (34 + 5 * N * T / D)',
      note: 'Training activation memory estimate; runtime peak depends on kernels, allocator behavior, sharding, and recomputation policy.',
    },
    warnings,
  }
}
