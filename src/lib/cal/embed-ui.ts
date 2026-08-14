/**
 * Theming for the Cal.com booking popup.
 *
 * Cal renders inside an iframe we cannot style with our own CSS, but it exposes
 * design tokens as CSS variables. Mapping those to the site palette makes the
 * booking screen read as part of Obsidian rather than a third-party widget.
 *
 * Palette mirrors `globals.css`: #131009 background, #bb9159 bronze,
 * #1d1710/#2e261a charcoal. Radii are zeroed to match the site's square edges.
 */

const GOLD = "#bb9159";
const GOLD_LIGHT = "#dcbc8a";
const GOLD_DARK = "#936f40";
const BACKGROUND = "#131009";
const FOREGROUND = "#f2ede3";
const CHARCOAL = "#1d1710";
const CHARCOAL_LIGHT = "#2e261a";
const MUTED = "#a89c8a";

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
  "cal-bg-brand-muted": "rgba(187, 145, 89, 0.15)",

  // Surfaces
  "cal-bg": "#16110a",
  "cal-bg-muted": "#17120c",
  "cal-bg-subtle": CHARCOAL,
  "cal-bg-emphasis": CHARCOAL_LIGHT,
  "cal-bg-inverted": FOREGROUND,

  // Primary action (booking confirm button)
  "cal-bg-primary": GOLD,
  "cal-bg-primary-emphasis": GOLD_DARK,
  "cal-bg-primary-muted": "rgba(187, 145, 89, 0.15)",

  // Borders — gold only on emphasis, matching the luxury-card hover treatment.
  "cal-border": CHARCOAL_LIGHT,
  "cal-border-subtle": "#241d14",
  "cal-border-muted": "#1a150e",
  "cal-border-booker": CHARCOAL_LIGHT,
  "cal-border-emphasis": "rgba(187, 145, 89, 0.4)",

  // Text
  "cal-text": FOREGROUND,
  "cal-text-emphasis": "#ffffff",
  "cal-text-subtle": MUTED,
  "cal-text-muted": "#7a7060",
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
