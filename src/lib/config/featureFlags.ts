export const featureFlags = {
  show30d: true,
  showAll: true,
  showPoS: true,
} as const;

export type FeatureFlagKey = keyof typeof featureFlags;
