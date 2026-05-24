---
name: ui-designer
description: Use when the user asks to design, mockup, or ideate a UI component, or when asked to build up UI design skills. This skill leverages image generation to align visually before writing CSS/React code.
---

# UI Designer Skill

## Overview

This skill defines the workflow for creating or upgrading UI components with an **industrial technical design** aesthetic. It prioritizes visual ideation using the `generate_image` tool before touching code, ensuring alignment with the user's strict visual preferences.

## Operating Modes

1. **Ideate**: Use `generate_image` to create a mockup of the requested UI.
2. **Iterate**: Refine the mockup based on user feedback.
3. **Implement**: Translate the approved mockup into CSS/React code.

## The Aesthetic: Industrial Technical Design

When generating image prompts or writing CSS, adhere strictly to these principles:

- **Colors**: Deep carbon and slate tones (`#090a0f`, `#111827`, `#1e293b`). No blurry pastels.
- **Backgrounds**: Matte, flat, or subtle grid patterns. Avoid heavy glassmorphism (`backdrop-filter: blur`).
- **Borders & Shadows**: Sharp, 1px solid borders (`#334155`). Tight drop shadows. Subtle inset rim highlights are OK.
- **Typography**: `FiraCode Nerd Font` (or generic monospace) for technical data, math formulas, and labels.
- **Data Display**: Use strict pill badges for tensor shapes (e.g., `[B, T, d_model]`). Code blocks should look like a dense, high-contrast IDE.
- **Animations**: Snappy spring physics. No slow fades or floaty tweens.
- **Accents**: Low-intensity glows on focus/selection are fine; avoid flashy bloom or loud multi-hue gradients.
- **RoPE / transformer vis**: 2D-first SVG in the center drawer; the left block map stays a compact navigation diagram.

## Workflow: Mockup First

When asked to design a UI:

1. **Prompt Engineering**: Craft a prompt for `generate_image` that explicitly includes the aesthetic rules.
   *Example Prompt*: "A strict industrial technical web application interface for a [component]. Dark mode, deep carbon and slate tones (#090a0f). Matte grid background. Sharp 1px solid borders, tight drop shadows. Monospace font data tables displayed in strict technical pill badges. Professional, technical, engineering-grade UI. Generate only the interface itself without surrounding device frames."
2. **Generate**: Call `generate_image` and present the output to the user.
3. **Wait for Approval**: Ask the user for feedback. Do not proceed to coding until the visual direction is approved.
4. **Translate to Code**: Once approved, write the React/CSS. Ensure tokens map correctly (e.g., `#090a0f` for `--color-void`, `#111827` for `--module-fill`).

## Common Pitfalls

| Mistake | Fix |
|---|---|
| Adding heavy `backdrop-filter: blur` | Use solid matte panel fills. |
| Using soft, wide glowing drop shadows | Use sharp, tight shadows or very low-opacity accent halos. |
| Writing long string shapes `[B, T] -> [B, d]` | Break them into structural `.shape-pill` spans. |
| Putting formulas on the left SVG map | Keep the block diagram compact; teach in `DetailDrawer`. |
| Loud rainbow slider gradients | Use single-hue muted gradients within one accent family. |
