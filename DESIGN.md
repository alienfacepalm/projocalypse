# Projocalypse design system

## Purpose & Tabocalypse alignment

Projocalypse shares the **Glitch-Core Terminal** aesthetic with [Tabocalypse](https://github.com/alienfacepalm/tabocalypse): void-dark surfaces, acid-neon accents, hard HUD shadows, monospace typography, and a subtle scanline texture. Tabocalypse is a browser-extension tab manager; Projocalypse is a project-management app — the tone is **command-center productivity** rather than judgmental tab hoarding, but the visual language (brutalist 0px corners, primary/secondary accent pairing, Space Mono labels) is intentionally aligned.

Implementation lives in:

| Area | Location |
|------|----------|
| Base tokens & utilities | `src/styles/globals.css` |
| Runtime theme / palette | `src/lib/theme.ts` |
| React hooks | `src/hooks/use-appearance.ts`, `src/hooks/use-theme.ts` |
| Settings UI | `src/components/layout/appearance-settings.tsx` (Settings → Appearance) |
| shadcn primitives | `src/components/ui/` |

Styling stack: Tailwind CSS v4 + shadcn/ui (Radix + `cva`). See `.cursor/rules/projocalypse-tailwind-shadcn.mdc`.

---

## Typography

Fonts load from Google Fonts in `index.html`: **Audiowide**, **JetBrains Mono**, **Space Mono**.

| Role | Font | CSS | Usage |
|------|------|-----|--------|
| Body / data | JetBrains Mono | `--font-sans`, default `body` | Task titles, descriptions, inputs, mono labels |
| Labels / nav / buttons | Space Mono | `--font-display`, `.font-display` | Sidebar nav, section headers, buttons, dialog titles |
| Product title | Audiowide | `--font-title`, `.font-title` | App name in sidebar (`Projocalypse`) |

**Conventions**

- **Display text** (nav, buttons, headers): `font-display`, **uppercase**, **bold**, wide tracking (`tracking-widest` or `tracking-[0.2em]`).
- **Body**: default sans stack (JetBrains Mono), 13px base in `globals.css`, `text-sm` / `text-xs` in components.
- **Accent-colored micro-labels**: `text-[10px] uppercase tracking-widest text-accent2` for section group titles (e.g. “Projects”, “Base mode”).

Tabocalypse uses Space Mono + JetBrains Mono only; Projocalypse adds **Audiowide** for the wordmark.

---

## Themes & palettes

Two independent axes:

| Axis | Values | What changes |
|------|--------|----------------|
| **Mode** | `light`, `dark` | Neutral surfaces, borders, foreground; scanline/gradient intensity |
| **Palette** | 10 presets + `custom` | Primary accent (`--color-primary`), secondary accent (`--color-accent2`), tertiary tint (`--color-accent3`), ring, scrollbars |

### Preset palettes

| ID | Label | Primary (`accent`) | Secondary (`accent2`) |
|----|-------|--------------------|------------------------|
| `glitch` | Acid & magenta | `#39ff14` | `#ff00ff` |
| `ocean` | Cyan & indigo | `#22d3ee` | `#6366f1` |
| `ember` | Amber & rose | `#fb923c` | `#f43f5e` |
| `slate` | Cool gray | `#94a3b8` | `#64748b` |
| `forest` | Lime & forest | `#84cc16` | `#15803d` |
| `plasma` | Violet & pink | `#c084fc` | `#ec4899` |
| `sunset` | Orange & violet | `#fb923c` | `#7c3aed` |
| `voltage` | Blue & gold | `#3b82f6` | `#eab308` |
| `blood` | Crimson & scarlet | `#f87171` | `#b91c1c` |
| `mint` | Mint & aqua | `#2dd4bf` | `#0ea5e9` |
| `custom` | Custom | User pick (default `#39ff14`) | User pick (default `#ff00ff`) |

Default appearance: **light** mode, **glitch** palette (`DEFAULT_APPEARANCE` in `src/lib/theme.ts`).

### Persistence

| Key | Content |
|-----|---------|
| `projocalypse-appearance` | JSON: `{ mode, palette, customAccent, customAccent2 }` |
| `theme` (legacy) | `"light"` \| `"dark"` — still written for backward compatibility |

Boot order:

1. Inline script in `index.html` — early `dark` class + `data-theme` / `data-palette` (reduces flash).
2. `main.tsx` — `applyDocumentTheme(loadAppearance())` sets full CSS variables on `<html>`.

Settings: **Sidebar → Settings → Appearance** (mode toggle, palette grid, custom color pickers).

---

## CSS variable reference

Variables are declared in `@theme` / `.dark` in `globals.css` and **overridden at runtime** by `applyDocumentTheme()` on `document.documentElement`.

### Semantic colors (Tailwind: `bg-background`, `text-primary`, etc.)

| Variable | Role |
|----------|------|
| `--color-background` | Page background |
| `--color-foreground` | Primary text |
| `--color-muted` | Subtle fills |
| `--color-muted-foreground` | Secondary text |
| `--color-border` | Default borders |
| `--color-input` | Input borders |
| `--color-ring` | Focus ring (secondary accent) |
| `--color-primary` | Primary accent / HUD shadow color |
| `--color-primary-foreground` | Text on primary (luminance-derived) |
| `--color-secondary` | Secondary surface |
| `--color-secondary-foreground` | Text on secondary |
| `--color-accent` | Hover / selected surface tint |
| `--color-accent-foreground` | Text on accent surface |
| `--color-accent2` | Secondary accent (magenta lane, labels, outline buttons) |
| `--color-accent3` | Tertiary tint (preset per palette; derived for custom) |
| `--color-destructive` | Error / delete |
| `--color-destructive-foreground` | Text on destructive |
| `--color-popover` | Dialog / dropdown surface |
| `--color-popover-foreground` | Popover text |
| `--color-card` | Card / panel surface |
| `--color-card-foreground` | Card text |
| `--color-sidebar` | Sidebar background |
| `--color-shadow-hard` | Neutral hard-shadow fallback |
| `--color-surface-weak` | Translucent overlay (e.g. scrims) |
| `--color-surface-strong` | Stronger translucent overlay |

### Layout / effects

| Variable | Value / notes |
|----------|----------------|
| `--radius-sm` … `--radius-xl` | All **0px** (brutalist) |
| `--font-sans` | JetBrains Mono stack |
| `--font-display` | Space Mono stack |
| `--font-title` | Audiowide stack |
| `--shadow-hud` | `4px 4px 0 0 var(--color-primary)` |
| `--shadow-hud-sm` | `2px 2px 0 0 var(--color-primary)` |
| `--shadow-hud-magenta` | `4px 4px 0 0 var(--color-accent2)` |
| `--scrollbar-track` | Mode-aware track color |
| `--scrollbar-thumb` | Mixed from accent / accent2 |
| `--scrollbar-thumb-hover` | Brighter thumb |

### Utility classes (`globals.css`)

| Class | Purpose |
|-------|---------|
| `.font-display` / `.font-title` | Font family shortcuts |
| `.shadow-hud` / `.shadow-hud-sm` / `.shadow-hud-magenta` | Hard offset shadows |
| `.hud-panel` | Bordered panel + primary shadow |
| `.hud-glass-panel` | Tabocalypse-style glass surface (blur, gradient, inset highlight, `shadow-hud`) |
| `.hud-scrollbar` | Themed thin scrollbars |

### Document attributes

`applyDocumentTheme` sets on `<html>`:

- Class: `dark` when mode is dark
- `data-theme`: `light` \| `dark`
- `data-palette`: palette id (for debugging / future CSS hooks; no palette-specific CSS selectors yet)

---

## Shape language

**Corners:** Global radius tokens are **0px**. Buttons, inputs, cards, dialogs, and nav items are square-edged.

**Exceptions (intentional):**

- **Project color dots** and **priority indicators** — `rounded-full` small circles (data markers, not structural UI).
- **Dialog/sheet close buttons** — shadcn default `rounded-sm` on the X control only.

**Shadows:** Hard, opaque, bottom-right offset — **4×4** primary (`shadow-hud`), **2×2** small (`shadow-hud-sm`), **4×4** secondary (`shadow-hud-magenta`). Buttons translate 1px on active press to simulate physical depression.

**Borders:** 1px default (`border-border`); structural chrome often **2px** `border-primary` (sidebar edge, headers, board columns).

**Depth:** `backdrop-blur-sm` on sticky headers and board columns; semi-transparent `bg-background/90` or `bg-card/80` — lighter glass than Tabocalypse’s 12px blur spec.

**Scanlines:** `body` background uses a repeating 1px horizontal line pattern plus a soft radial primary glow; dark mode uses stronger scanline contrast.

**Scrollbars:** `.hud-scrollbar` on main content and palette picker — thin, accent-tinted thumbs.

---

## Icons

| Rule | Detail |
|------|--------|
| Library | **lucide-react** only |
| Default sizes | `h-4 w-4` inline with text; `h-3.5 w-3.5` in compact UI; `h-5 w-5` mobile menu |
| Color | Inherit `currentColor` or Tailwind tokens (`text-primary`, `text-muted-foreground`) |
| Placement | Leading icon + label in nav/menu items (`mr-2` gap in dropdowns); icon-only uses `Button` `size="icon"` |
| Drag handles | `GripVertical` at row/link leading edge |

Do not add alternate icon packs without an explicit product decision.

---

## Light vs dark behavior

| Aspect | Light | Dark |
|--------|-------|------|
| Background | `#e8ede4` (terminal parchment) | `#050505` (void black) |
| Foreground | `#0c1609` | `#dae6d0` |
| Card / sidebar | `#f0f4ec` / `#dce8d4` | `#0c1609` / `#050505` |
| Borders | `#85967c` (ash green-gray) | `#27272a` (zinc) |
| Primary accent | Palette-driven (light defaults slightly desaturated in CSS file; runtime wins) | Palette-driven (Tabocalypse acid green for `glitch`) |
| Ring / focus | Secondary accent (`accent2`) | Secondary accent |
| Scanlines | Foreground-tinted, subtle | Black lines, stronger |
| Scrollbar thumb | Mixed from **primary** accent | Mixed from **secondary** accent |

Mode toggles only neutrals and scrollbar mixing — **palette choice is preserved** across light/dark. Custom palette recomputes `accent3` per mode via `deriveCustomAccent3()`.

Tailwind dark variant: `@custom-variant dark (&:where(.dark, .dark *));` — prefer semantic tokens (`bg-background`) over raw `dark:` where possible; runtime CSS vars already differ by mode.

---

## Adding a theme or palette

### New preset palette

1. Add id to `THEME_PRESET_PALETTES` in `src/lib/theme.ts`.
2. Add label in `THEME_PALETTE_LABELS`.
3. Add `{ accent, accent2, accent3 }` hex values to `PALETTE_ACCENTS`.
4. Extend tests in `src/lib/theme.test.ts` (resolve vars, persistence).
5. No `globals.css` change required — presets are runtime-only.

### Custom accents

Already supported: color inputs in Appearance settings set `palette: 'custom'` and persist `customAccent` / `customAccent2`. `coerceThemeHex()` normalizes input; `deriveOnAccent()` picks readable `--color-primary-foreground`.

### New base mode (e.g. high-contrast)

Would require extending `THEME_MODES`, neutral maps in `resolveProjocalypseTokens()`, Settings UI, tests, and `index.html` boot script. Not implemented today.

### New semantic token

1. Add to `@theme` in `globals.css` (light default + `.dark` override if static).
2. If palette/mode-dependent, set in `resolveProjocalypseTokens()` in `theme.ts`.
3. Expose via Tailwind `@theme` color name or utility class in `globals.css`.
4. Use in shadcn primitives via Tailwind class names — avoid hard-coded hex in feature components.

---

## Component patterns (quick reference)

| Component | Pattern |
|-----------|---------|
| **Button** | `font-display`, uppercase, hard shadow; primary inverts on hover |
| **Checkbox** | Square, `border-primary`, `shadow-hud-sm`, check icon (not Tabocalypse “X”) |
| **Input** | Square, `border-input`, focus `ring-ring` |
| **Dialog** | `border-2 border-primary`, `shadow-hud`, uppercase title |
| **Alert dialog** | Same HUD chrome as Dialog; used for confirm/alert via `useConfirm()` |
| **Sidebar nav link** | Uppercase display font; active = `border-primary bg-accent shadow-hud-sm` |
| **Headers** | `border-b-2 border-primary shadow-hud-sm backdrop-blur-sm` |
| **Task hover tooltip** | `TaskTooltip` + `TooltipContent` with `.hud-glass-panel`; 500ms hover delay; lazy-loaded details |

Project **colors** (user-assigned per project) are separate from the appearance palette — inline `style={{ backgroundColor: project.color }}` only.

### Developer assignee badges

Each developer has a **color** (from the project palette by default) and **initials** derived from their name (or an optional override). `DeveloperBadge` renders a small square HUD chip (`h-5 w-5`, uppercase initials, white text on the developer color) used in:

- Task rows and My Tasks (right of title, before due date)
- Task detail panel assignee picker
- Settings → Developers list

Tooltips and the task detail panel show the full name; rows stay compact with initials only.

### Developer permissions (local trust model)

There is **no server authentication** — the active developer is stored in `localStorage` (`projocalypse-active-developer-id`) and honored for permission checks in Dexie operations. Anyone with access to the browser profile can switch identity in **Settings → Active developer**.

| Permission | Master | Lead | Developer (default) | Gated actions |
|------------|--------|------|---------------------|---------------|
| `manageDevelopers` | yes | no | no | Remove developers; edit others; change roles |
| Add developers | yes (any role) | yes (Developer only) | no | Settings → Developers → Add |
| `assignTasks` | yes | yes | yes | Task detail assignee picker; `setTaskAssignee` |
| `manageProjects` | yes | no | no | Create project (sidebar); delete project (header menu) |

Master always receives all permissions via `effectivePermissions()`. At least one Master must remain; delete/demote of the last Master is blocked. First run with an empty `developers` table shows the bootstrap dialog (default name **You**).

---

## Dialogs & confirmations

**Rule:** Do not use `window.confirm`, `window.alert`, or `window.prompt` in app code. Use the themed confirmation system instead.

| API | Use for | Primitive |
|-----|---------|-----------|
| `useConfirm().confirm()` | Destructive or reversible actions (delete, archive, import overwrite) | `AlertDialog` — focus trap, Escape cancels, Enter confirms |
| `useConfirm().alert()` | One-button errors or notices (e.g. sync failure) | `AlertDialog` with single OK action |
| `useConfirm().prompt()` | Short text input (e.g. new section name) | `Dialog` + `Input` — Enter submits, Escape cancels |

Mount `ConfirmProvider` once at the app root (`App.tsx`). Options support `title`, `description`, `confirmLabel`, `cancelLabel`, `variant` (`default` \| `destructive` \| `error`), and optional Lucide `icon`.

Styling matches Dialog: `border-2 border-primary`, `shadow-hud`, `font-display` uppercase titles, `font-mono` descriptions, destructive actions use the destructive button variant.

### Task hover tooltip

Aligned with Tabocalypse’s `hud-glass-popover` / `HudTip` patterns:

| Aspect | Implementation |
|--------|----------------|
| Surface | `.hud-glass-panel` in `globals.css` — 18px blur, gradient fill, 2px primary border, inset highlight, `shadow-hud` |
| Content | Title, description snippet (120 chars), status, priority, due date, section/project when known, subtask progress when open |
| Trigger | Task row body (excludes drag handle); `TooltipProvider` in `app-shell.tsx` with 500ms delay |
| DnD | Tooltip disabled while dragging (`isDragging`) and on drag overlay clones (`showTooltip={false}`) |
| A11y | Radix `Tooltip` wires `aria-describedby`; keyboard focus on row controls opens via Radix trigger |
| Lazy load | Tooltip body mounts only while open so subtask queries do not run for every row |
