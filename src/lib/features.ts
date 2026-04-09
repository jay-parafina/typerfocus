const enabledFlags = new Set(
  (process.env.NEXT_PUBLIC_FEATURE_FLAGS ?? '').split(',').filter(Boolean)
);

export function isFeatureEnabled(flag: string): boolean {
  return enabledFlags.has(flag);
}
