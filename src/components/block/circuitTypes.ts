export interface CircuitModuleDef {
  id: string
  label: string
  sub?: string
  /** Decorative sub-circuit labels (not separate selection targets) */
  micro?: string[]
}

export interface BranchDef {
  preNorm: CircuitModuleDef
  steps: CircuitModuleDef[]
}
