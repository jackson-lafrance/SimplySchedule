/** SimplyLift-inspired semantic colors for the web surface. */
export const colors = {
  background: "#FFFFFF",
  ink: "#000000",
  muted: "#8E8E93",
  divider: "#D1D1D6",
  surfaceMuted: "#F2F2F7",
  success: "#34C759",
  accent: "#5856D6",
  destructive: "#FF3B30",
  inverse: "#FFFFFF",
} as const;

export type ColorToken = keyof typeof colors;
