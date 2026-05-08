import { useEffect, useState } from "react";
import type { SiteSettingsState } from "../../types";
import { safeStorage } from "../../lib/security";

const STORAGE_KEY = "kmt_portal_cookie_consent_v1";

export function CookieConsentBanner({ site }: { site: SiteSettingsState }) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const val = safeStorage.get(STORAGE_KEY);
    if (val === "1") setHidden(true);
    else setHidden(false);
  }, []);

  if (hidden) return null;

  function acknowledge() {
    safeStorage.set(STORAGE_KEY, "1");
    setHidden(true);
  }

  const detail = site.cookies_notice_url?.trim();

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] border-t border-amber-400/40 bg-[#0f1e46]/98 px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.35)] backdrop-blur-md"
      role="dialog"
      aria-label="Taarifa za kuki"
    >
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-3 text-center text-sm text-blue-50">
        <p className="max-w-2xl">
          Tunatumia kuki na hifadhi ya ndani kuboresha huduma na usalama wa kuingia. Endelea ukikubali matumizi haya.
          {detail ? (
            <>
              {" "}
              <a href={detail} target="_blank" rel="noopener noreferrer" className="font-semibold text-amber-300 underline">
                Soma zaidi
              </a>
            </>
          ) : null}
        </p>
        <button
          type="button"
          onClick={acknowledge}
          className="shrink-0 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2 text-sm font-bold text-slate-900 shadow-md"
        >
          Nimeelewa
        </button>
      </div>
    </div>
  );
}
