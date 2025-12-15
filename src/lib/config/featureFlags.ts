export const featureFlags = {
  show30d: true,
  showAll: true,
  showPoS: true,
  chartClampToSignup: true,
  chartStitchLatest: true,
  perfChartMemo: true,
  enableVirtualScroll: true,
  enableProps: true,
  enableNotifications: true,
} as const;

export type FeatureFlagKey = keyof typeof featureFlags;
