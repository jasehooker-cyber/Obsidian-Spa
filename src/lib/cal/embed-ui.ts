/**
 * Theming for the Cal.com booking popup.
 *
 * Cal renders inside an iframe we cannot style with our own CSS, but it exposes
 * design tokens as CSS variables. Mapping those to the site palette makes the
 * booking screen read as part of Obsidian rather than a third-party widget.
 *
 * Palette mirrors `globals.css`: #0a0a0a background, #c9a84c gold,
 * #1a1a1a/#2a2a2a charcoal. Radii are zeroed to match the site's square edges.
 */

const GOLD = "#c9a84c";
const GOLD_LIGHT = "#e2c97e";
const GOLD_DARK = "#a68a3e";
const BACKGROUND = "#0a0a0a";
const FOREGROUND = "#f5f5f5";
const CHARCOAL = "#1a1a1a";
const CHARCOAL_LIGHT = "#2a2a2a";
const MUTED = "#a3a3a3";

const SQUARE_RADII = {
  "cal-radius": "0px",
  "cal-radius-sm": "0px",
  "cal-radius-md": "0px",
  "cal-radius-lg": "0px",
  "cal-radius-xl": "0px",
} as const;

const DARK_VARS = {
  ...SQUARE_RADII,

  // Brand — gold accents, dark text on gold so buttons stay legible.
  "cal-brand": GOLD,
  "cal-brand-emphasis": GOLD_LIGHT,
  "cal-brand-text": BACKGROUND,
  "cal-bg-brand": GOLD,
  "cal-bg-brand-emphasis": GOLD_DARK,
  "cal-bg-brand-muted": "rgba(201, 168, 76, 0.15)",

  // Surfaces
  "cal-bg": "#101010",
  "cal-bg-muted": "#141414",
  "cal-bg-subtle": CHARCOAL,
  "cal-bg-emphasis": CHARCOAL_LIGHT,
  "cal-bg-inverted": FOREGROUND,

  // Primary action (booking confirm button)
  "cal-bg-primary": GOLD,
  "cal-bg-primary-emphasis": GOLD_DARK,
  "cal-bg-primary-muted": "rgba(201, 168, 76, 0.15)",

  // Borders — gold only on emphasis, matching the luxury-card hover treatment.
  "cal-border": CHARCOAL_LIGHT,
  "cal-border-subtle": "#1f1f1f",
  "cal-border-muted": "#161616",
  "cal-border-booker": CHARCOAL_LIGHT,
  "cal-border-emphasis": "rgba(201, 168, 76, 0.4)",

  // Text
  "cal-text": FOREGROUND,
  "cal-text-emphasis": "#ffffff",
  "cal-text-subtle": MUTED,
  "cal-text-muted": "#6b6b6b",
  "cal-text-inverted": BACKGROUND,
} as const;

/**
 * Light values exist only to satisfy Cal's per-theme shape — we pin the embed
 * to dark below, so these are a gold-accented fallback, not a real light theme.
 */
const LIGHT_VARS = {
  ...SQUARE_RADII,
  "cal-brand": GOLD_DARK,
  "cal-brand-emphasis": GOLD,
  "cal-brand-text": "#ffffff",
  "cal-bg-brand": GOLD_DARK,
  "cal-bg-brand-emphasis": GOLD,
  "cal-bg-primary": GOLD_DARK,
  "cal-bg-primary-emphasis": GOLD,
  "cal-border-emphasis": GOLD_DARK,
} as const;

/**
 * Passed to `cal("ui", ...)` for every namespace on the page.
 *
 * `hideEventTypeDetails` stays false so the service name, duration, and
 * description from Cal.com remain visible in the popup.
 */
export const CAL_UI_CONFIG = {
  theme: "dark",
  layout: "month_view",
  hideEventTypeDetails: false,
  cssVarsPerTheme: {
    dark: DARK_VARS,
    light: LIGHT_VARS,
  },
  styles: {
    branding: { brandColor: GOLD },
    body: { background: BACKGROUND },
  },
} as const;
