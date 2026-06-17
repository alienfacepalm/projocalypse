import { Moon, Palette, Sun } from 'lucide-react'
import {
  THEME_MODE_LABELS,
  THEME_PALETTE_LABELS,
  THEME_MODES,
  THEME_PRESET_PALETTES,
  getResolvedAccentPair,
  type AppearanceSettings,
  type ThemePalette,
} from '@/lib/theme'
import { useAppearance } from '@/hooks/use-appearance'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'

function PaletteSwatch({ accent, accent2 }: { accent: string; accent2: string }) {
  return (
    <span className="flex shrink-0 gap-0.5">
      <span className="h-3 w-3 border border-border" style={{ backgroundColor: accent }} />
      <span className="h-3 w-3 border border-border" style={{ backgroundColor: accent2 }} />
    </span>
  )
}

function PaletteButton({
  palette,
  selected,
  onSelect,
  settings,
}: {
  palette: ThemePalette
  selected: boolean
  onSelect: () => void
  settings: AppearanceSettings
}) {
  const { accent, accent2 } = getResolvedAccentPair(palette, {
    accent: settings.customAccent,
    accent2: settings.customAccent2,
  })
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-2 border px-2 py-1.5 text-left font-display text-[10px] font-bold uppercase tracking-wide transition-colors',
        selected
          ? 'border-primary bg-accent text-accent-foreground shadow-hud-sm'
          : 'border-border bg-transparent text-foreground hover:border-primary hover:bg-accent/50',
      )}
    >
      <PaletteSwatch accent={accent} accent2={accent2} />
      <span className="truncate">{THEME_PALETTE_LABELS[palette]}</span>
    </button>
  )
}

export function AppearanceSettingsItems() {
  const [settings, update] = useAppearance()

  function selectPalette(palette: ThemePalette) {
    update({ palette })
  }

  function onCustomAccentChange(value: string) {
    update({ palette: 'custom', customAccent: value })
  }

  function onCustomAccent2Change(value: string) {
    update({ palette: 'custom', customAccent2: value })
  }

  const resolved = getResolvedAccentPair(settings.palette, {
    accent: settings.customAccent,
    accent2: settings.customAccent2,
  })

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Palette className="mr-2 h-4 w-4" />
        Appearance
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-72 p-2">
        <p className="mb-2 px-1 font-display text-[10px] font-bold uppercase tracking-widest text-accent2">
          Base mode
        </p>
        <div className="mb-3 flex gap-1">
          {THEME_MODES.map((mode) => (
            <Button
              key={mode}
              type="button"
              variant={settings.mode === mode ? 'default' : 'secondary'}
              size="sm"
              className="flex-1"
              onClick={() => update({ mode })}
            >
              {mode === 'dark' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
              {THEME_MODE_LABELS[mode]}
            </Button>
          ))}
        </div>

        <p className="mb-2 px-1 font-display text-[10px] font-bold uppercase tracking-widest text-accent2">
          Accent palette
        </p>
        <div className="hud-scrollbar mb-3 grid max-h-48 grid-cols-1 gap-1 overflow-y-auto">
          {THEME_PRESET_PALETTES.map((palette) => (
            <PaletteButton
              key={palette}
              palette={palette}
              selected={settings.palette === palette}
              onSelect={() => selectPalette(palette)}
              settings={settings}
            />
          ))}
          <PaletteButton
            palette="custom"
            selected={settings.palette === 'custom'}
            onSelect={() => selectPalette('custom')}
            settings={settings}
          />
        </div>

        <p className="mb-2 px-1 font-display text-[10px] font-bold uppercase tracking-widest text-accent2">
          Custom accents
        </p>
        <p className="mb-2 px-1 font-mono text-[10px] leading-snug text-muted-foreground">
          Changing a swatch switches to the custom palette.
        </p>
        <div className="space-y-2 px-1">
          <label className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Primary
            <input
              type="color"
              value={resolved.accent}
              onChange={(e) => onCustomAccentChange(e.target.value)}
              className="h-8 w-12 cursor-pointer border border-border bg-transparent p-0"
              aria-label="Primary accent color"
            />
          </label>
          <label className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Secondary
            <input
              type="color"
              value={resolved.accent2}
              onChange={(e) => onCustomAccent2Change(e.target.value)}
              className="h-8 w-12 cursor-pointer border border-border bg-transparent p-0"
              aria-label="Secondary accent color"
            />
          </label>
        </div>

        <p className="px-1 py-1 font-mono text-[10px] text-muted-foreground">
          Palette: {THEME_PALETTE_LABELS[settings.palette]} · {THEME_MODE_LABELS[settings.mode]}
        </p>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
