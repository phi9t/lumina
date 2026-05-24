## Learned User Preferences

- Prefer a clean 2D-first layout with design clarity; keep the right-hand layer control dashboard (`LayerDashboard`).
- Default to a context-first single transformer block view; surface details on demand (click module, Esc to close).
- Emphasize the residual mainline prominently; treat Attention and FFN/MoE as secondary sideline branches that merge via `+`.
- Use orthogonal squared circuitry (right-angle wiring), not parabolic/Bezier branch arcs.
- Lay out the block with a vertical residual mainline and horizontal branch corridors so module plates do not overlap.
- Place pre-norm (LayerNorm) outside each Attention/FFN shell; show vertical action sequences inside each shell with visible internal wiring.
- KV cache timeline runs left→right (earliest left, current token right); highlight attention edges and cache positions clearly.
- RoPE per-pair visualization belongs as a drilldown from the Attention branch, not a separate top-level page.
- Use FiraCode Nerd Font across UI and SVG diagram labels (local install preferred, CDN fallback acceptable).
- **Aesthetics**: Prefer a strict industrial technical design. Use matte grid backgrounds, sharp 1px borders, tight drop shadows, and deep carbon/slate tones. Subtle motion and low-intensity accent glows are fine; avoid flashy bloom, heavy blur, or loud multi-hue gradients.
- **Layout Density**: Keep the left transformer block compact and proportional to the center/right panels. Pack branch circuits close to the vertical mainline, but avoid oversized plates that dominate the page.
- **Component Sizing**: Treat the left transformer block as a structural navigation diagram: simple module names, restrained typography, compact plates, and minimal inline text. Put formulas, tensor shapes, accounting, and pseudocode in the center detail drawer.
- **Design Workflow**: Prefer explicit visual constraints over vague polish prompts. When iterating UI, align against screenshots, concrete spacing/type targets, and existing component scale before inventing new visual language.
- **Information Architecture**: Utilize a widescreen 3-column layout on large screens: `Transformer Block (Left) | Mathematical Detail Drawer (Center) | Layer Dashboard (Right)`.
- **Technical Details**: Always include rigorous tensor shape annotations (e.g., `[B, T, d_model]`) and explicit implementation pseudocode (JAX/PyTorch style) inside module drill-downs.

## Learned Workspace Facts

- Interactive RoPE / transformer visualizer: React + Vite + TypeScript at `/Users/phi9t/rope-visualizer` (public repo `phi9t/rope-visualizer` on GitHub).
- Left canvas: SVG transformer block (`TransformerBlockView`, `BranchCircuit`) plus `DetailDrawer` for module drilldowns.
- RoPE is 2D-only in the center drawer (`RopeWorkbench`: Identity, Cache, Spectrum tabs); sliders/stats live in `LayerDashboard` on the right (`App.tsx` lifts shared state).
- Selecting Attention → RoPE (or softmax/qkv for cache views) opens the 2D RoPE workbench in the detail drawer.
