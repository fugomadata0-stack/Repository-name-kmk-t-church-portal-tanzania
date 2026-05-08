import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
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
  }
  return {
    plugins: [react()],
    resolve: {
      dedupe: ["react", "react-dom"],
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
      sourcemap: false,
      chunkSizeWarningLimit: 900,
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
            if (id.includes("react") || id.includes("react-dom") || id.includes("scheduler")) return "react-vendor";
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
