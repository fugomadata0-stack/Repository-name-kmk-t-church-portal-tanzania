import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import {
  evaluateSupabaseEnvForProductionBuild,
  normalizeSupabaseEnvUrl,
} from "./src/lib/supabaseEnvPolicy";

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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseOrigin = supabaseOriginFromEnv(env);

  if (mode === "production") {
    const check = evaluateSupabaseEnvForProductionBuild(env);
    if (!check.ok) {
      const parts = [
        ...check.missing.map((k) => `Missing: ${k}`),
        ...check.errors,
        "",
        "GitHub Actions: weka Secrets VITE_SUPABASE_URL na VITE_SUPABASE_ANON_KEY,",
        "au tumia fallback salama (tazama .github/workflows/frontend-ci.yml).",
        "Vercel: Project Settings → Environment Variables (Production + Preview).",
      ];
      throw new Error(parts.join("\n"));
    }
    if (process.env.CI === "true") {
      console.info(
        `[vite] Supabase env OK (${check.source}) → ${normalizeSupabaseEnvUrl(env.VITE_SUPABASE_URL ?? "")}`,
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
