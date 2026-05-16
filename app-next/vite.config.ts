import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sentryPkg = path.join(__dirname, "node_modules", "@sentry", "react", "package.json");
const sentryInstalled = fs.existsSync(sentryPkg);

function supabaseOriginFromEnv(env: Record<string, string>): string {
  const raw = String(env.VITE_SUPABASE_URL ?? "").trim();
  if (!raw) return "";
  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
}

function looksLikePlaceholderSupabaseUrl(u: string): boolean {
  const low = u.trim().toLowerCase();
  if (!low) return false;
  return (
    low.includes("your_project_ref") ||
    low.includes("placeholder") ||
    /\/your[-_]/.test(low) ||
    low.includes("example.supabase.co")
  );
}

function looksLikePlaceholderSupabaseKey(k: string): boolean {
  const low = k.trim().toLowerCase();
  if (!low) return false;
  return (
    low.includes("your_publishable") ||
    low.includes("your_anon") ||
    low.includes("your_") ||
    low.includes("changeme") ||
    low.includes("placeholder") ||
    low.includes("dummy") ||
    low === "your_publishable_or_anon_key"
  );
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseOrigin = supabaseOriginFromEnv(env);
  if (mode === "production") {
    const required = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"] as const;
    const missing = required.filter((k) => !String(env[k] ?? "").trim());
    if (missing.length) {
      throw new Error(`Missing production env variables: ${missing.join(", ")}`);
    }
    const supabaseUrl = String(env.VITE_SUPABASE_URL ?? "").trim();
    if (/localhost|127\.0\.0\.1/i.test(supabaseUrl)) {
      throw new Error("VITE_SUPABASE_URL haiwezi kuwa localhost kwenye production.");
    }
    const anon = String(env.VITE_SUPABASE_ANON_KEY ?? "").trim().toLowerCase();
    if (anon.includes("service_role")) {
      throw new Error("Service role key hairuhusiwi kwenye frontend production build.");
    }
    if (looksLikePlaceholderSupabaseUrl(supabaseUrl)) {
      throw new Error(
        "VITE_SUPABASE_URL inaonekana ni mfano (mfano YOUR_PROJECT_REF) — weka URL halisi ya Supabase kwenye Vercel / .env."
      );
    }
    const anonRaw = String(env.VITE_SUPABASE_ANON_KEY ?? "").trim();
    if (looksLikePlaceholderSupabaseKey(anonRaw)) {
      throw new Error(
        "VITE_SUPABASE_ANON_KEY inaonekana ni mfano — weka funguo halisi ya anon/publishable kutoka Supabase Dashboard."
      );
    }
  }
  return {
    plugins: [
      react(),
      {
        name: "html-preconnect-supabase-and-seo",
        transformIndexHtml(html) {
          let out = html;
          if (supabaseOrigin) {
            const inject = `    <link rel="preconnect" href="${supabaseOrigin}" crossorigin />\n    <link rel="dns-prefetch" href="${supabaseOrigin}" />\n`;
            out = out.replace(/<head>/i, `<head>\n${inject}`);
          }
          const siteOrigin = String(env.VITE_PUBLIC_SITE_ORIGIN ?? "").trim().replace(/\/+$/, "");
          if (siteOrigin) {
            const seo = `    <meta property="og:url" content="${siteOrigin}/" />\n    <link rel="canonical" href="${siteOrigin}/" />\n`;
            out = out.replace(/<title>/i, `${seo}<title>`);
          }
          return out;
        },
      },
    ],
    resolve: {
      dedupe: ["react", "react-dom"],
      alias: {
        "@": path.resolve(__dirname, "src"),
        ...(sentryInstalled
          ? {}
          : { "@sentry/react": path.resolve(__dirname, "src/lib/sentryPackageShim.ts") }),
      },
    },
    server: {
      host: "localhost",
      port: 5173,
      strictPort: true,
      headers: {
        "Cache-Control": "no-store",
      },
      hmr: {
        host: "localhost",
        protocol: "ws",
        port: 5173,
        clientPort: 5173,
      },
    },
    build: {
      target: "es2020",
      minify: "esbuild",
      sourcemap: false,
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (id.includes("@supabase")) return "supabase";
            if (id.includes("recharts")) return "charts";
            if (id.includes("framer-motion")) return "motion";
            if (id.includes("lucide-react")) return "icons";
            if (id.includes("jspdf") || id.includes("jspdf-autotable") || id.includes("html2canvas") || id.includes("canvg")) {
              return "export-pdf";
            }
            if (id.includes("xlsx")) return "export-excel";
            if (id.includes("@sentry")) return "sentry";
            if (id.includes("react") || id.includes("react-dom") || id.includes("scheduler")) return "react";
            return "vendor";
          },
        },
      },
    },
    css: {
      preprocessorOptions: {
        scss: {},
      },
    },
  };
});
