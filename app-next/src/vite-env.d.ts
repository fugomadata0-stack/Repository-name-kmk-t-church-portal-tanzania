/// <reference types="vite/client" />

/** Chrome/Edge install prompt (si kiwango cha W3C bado). */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** `false` kuzima Realtime; ikiwa haijawekwa chaguomsingi ni kuwasha. */
  readonly VITE_SUPABASE_REALTIME_ENABLED?: string;
  /** Hiari: `https://example.com` — kwa og:url wakati wa build (bila slash ya mwisho). */
  readonly VITE_PUBLIC_SITE_ORIGIN?: string;
  readonly VITE_AI_ASSISTANT_ENABLED?: string;
  readonly VITE_AI_FUNCTION_NAME?: string;
  /** Hiari: DSN ya mradi wa browser kwenye Sentry (PROD). */
  readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
