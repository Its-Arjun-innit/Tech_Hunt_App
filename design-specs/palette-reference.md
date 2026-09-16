# Campus Treasure Hunt — Color Palette Reference

## Hex Values (from OKLCH tokens)

### Dark Theme (Primary)

| Role | Hex | OKLCH | Usage |
|------|-----|-------|-------|
| Background | `#1a2119` | `oklch(0.155 0.012 150)` | Page background |
| Surface | `#242e22` | `oklch(0.196 0.013 150)` | Cards, panels |
| Surface Elevated | `#2d3a2b` | `oklch(0.235 0.015 150)` | Popovers, elevated cards |
| Brand Lime | `#80D917` | `oklch(0.8 0.21 128)` | CTAs, active nav, score emphasis |
| Brand Lime Dark | `#2d5a0a` | `oklch(0.19 0.03 140)` | Text on lime surfaces |
| Success Emerald | `#30B566` | `oklch(0.72 0.15 165)` | Available checkpoints, completed |
| Warning Amber | `#E5A820` | `oklch(0.79 0.16 75)` | Paused, approaching capacity |
| Danger Red | `#C44040` | `oklch(0.68 0.21 20)` | Errors, penalties |
| Info Blue | `#4D8FE5` | `oklch(0.7 0.15 250)` | Informational |
| Text Primary | `#F5F3F0` | `oklch(0.97 0.006 130)` | Headlines, scores |
| Text Muted | `#9BA396` | `oklch(0.72 0.014 140)` | Labels, descriptions |
| Text Faint | `#7A8275` | `oklch(0.58 0.012 140)` | Timestamps, hints |
| Border | `rgba(255,255,255,0.11)` | `oklch(1 0 0 / 11%)` | Card borders |
| Border Strong | `rgba(255,255,255,0.20)` | `oklch(1 0 0 / 20%)` | Emphasized borders |

### Light Theme (for reference)

| Role | Hex | OKLCH |
|------|-----|-------|
| Background | `#F9FAF7` | `oklch(0.985 0.004 120)` |
| Surface | `#FFFFFF` | `oklch(1 0 0)` |
| Brand Lime | `#5CB80A` | `oklch(0.72 0.19 128)` |
| Brand Lime Text | `#3D7A07` | `oklch(0.48 0.15 128)` |
| Success | `#22965A` | `oklch(0.6 0.14 165)` |
| Text Primary | `#1C261C` | `oklch(0.17 0.012 140)` |
| Text Muted | `#748070` | `oklch(0.52 0.014 140)` |

## Design Rules

1. **Hue separation**: Brand lime (hue 128) and success emerald (hue 165) are ~40 degrees apart for legibility
2. **Lime is never a status**: `--primary` is for interactive/brand only. Status uses dedicated tokens
3. **Status never relies on color alone**: Every traffic indicator carries a word and glyph

## Typography Scale

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| Hero | 4.25rem | 800 | Countdown, large displays |
| Display | 3rem | 700 | Score numbers, rank |
| H1 | 2rem | 600 | Screen titles |
| H2 | 1.25rem | 600 | Section headers |
| Body | 1rem | 400 | Default text |
| Small | 0.875rem | 400 | Supporting text |
| XS | 0.75rem | 400 | Labels, timestamps |
