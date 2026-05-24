/**
 * Selection types for the transformer block map.
 *
 * LEARNING NOTE: Discriminated union — branch narrows which submodule IDs are valid.
 * selectionKey() builds stable string keys for DetailDrawer lookup.
 */
export type AttentionSub = 'ln' | 'qkv' | 'rope' | 'softmax' | 'oproj'
export type FfnSub = 'ln' | 'up' | 'act' | 'down'
export type MainlineSub = 'in' | 'out' | 'junction1' | 'junction2'

export type SelectedModule =
  | null
  | { branch: 'attention'; submodule: AttentionSub }
  | { branch: 'ffn'; submodule: FfnSub }
  | { branch: 'mainline'; submodule: MainlineSub }

export function selectionKey(sel: NonNullable<SelectedModule>): string {
  return `${sel.branch}:${sel.submodule}`
}
