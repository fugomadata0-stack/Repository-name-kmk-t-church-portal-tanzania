/** Muda wa juu kwa ombi za boot — epuka UI iliyokwama. */
export const PORTAL_LOAD_TIMEOUTS = {
  authBootstrapMs: 12_000,
  authSessionMs: 8_000,
  rbacMs: 12_000,
  rbacUiCapMs: 9_000,
  bootKpiMs: 10_000,
  fullKpiMs: 40_000,
  structureListsMs: 14_000,
  iframeEngineMs: 18_000,
  siteAboutMs: 8_000,
} as const;
