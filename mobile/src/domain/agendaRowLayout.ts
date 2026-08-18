/**
 * The row outline and semantic color rail are separate layers. Keeping these
 * dimensions together prevents a colored border from being painted under the
 * black outline on narrow React Native surfaces.
 */
export const AGENDA_ROW_LAYOUT = {
  borderWidth: 2,
  accentRailWidth: 8,
} as const;
