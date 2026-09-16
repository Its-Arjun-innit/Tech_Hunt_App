import type { TrafficState } from "./traffic";

/**
 * Presentation constants for traffic states.
 *
 * Colour, word and glyph travel together on purpose. The brand colour is lime
 * and "available" is emerald, so colour alone is not a reliable signal; the
 * label and icon are what actually carry the meaning. See the colour rules at
 * the top of app/globals.css.
 */
export const TRAFFIC_LABEL: Record<TrafficState, string> = {
  GREEN: "Available",
  YELLOW: "Teams approaching",
  RED: "Congested",
  GRAY: "Disabled",
};

/** Lucide icon name per state, so the glyph differs as well as the fill. */
export const TRAFFIC_ICON: Record<TrafficState, "check" | "arrow" | "alert" | "off"> = {
  GREEN: "check",
  YELLOW: "arrow",
  RED: "alert",
  GRAY: "off",
};

export const TRAFFIC_CLASS: Record<TrafficState, string> = {
  GREEN: "bg-success-subtle text-success-strong border-success/30",
  YELLOW: "bg-warning-subtle text-warning-foreground border-warning/40 dark:text-warning",
  RED: "bg-danger-subtle text-danger border-danger/30",
  GRAY: "bg-muted text-muted-foreground border-border",
};

/** Solid fill for map markers and dots. */
export const TRAFFIC_FILL: Record<TrafficState, string> = {
  GREEN: "var(--success)",
  YELLOW: "var(--warning)",
  RED: "var(--danger)",
  GRAY: "var(--faint-foreground)",
};
