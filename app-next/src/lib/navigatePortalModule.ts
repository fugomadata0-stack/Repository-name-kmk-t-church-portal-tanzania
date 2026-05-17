/** Fungua moduli ndani ya portal (sidebar, menubar, viungo vya fedha). */
export function navigatePortalModule(moduleKey: string, submodule?: string): void {
  const sub = submodule?.trim();
  window.dispatchEvent(
    new CustomEvent("kmt-portal-navigate", {
      detail: {
        moduleKey,
        ...(sub ? { submodule: sub } : {}),
      },
    }),
  );
}
