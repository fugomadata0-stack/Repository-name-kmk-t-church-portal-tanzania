# AGENTS.md

## Cursor Cloud specific instructions

### Project overview
KMK(T) National Portal — enterprise church management system. Monorepo with the active frontend in `app-next/` (Vite 8 + React 18 + TypeScript). Backend is **hosted Supabase** (no local DB). Legacy static HTML portal lives at repo root but is not the active development surface.

### Node version
Requires **Node.js 20** (per `.nvmrc`). Use `nvm use 20` before running any commands.

### Package manager
**npm** — lockfile is `app-next/package-lock.json`. Install with `npm ci --prefix app-next`.

### Key commands (all run from `app-next/`)
| Task | Command |
|------|---------|
| Dev server | `npm run dev` (Vite on `localhost:5173`) |
| Lint | `npm run lint` |
| TypeScript check | `npm run build:tsc` |
| Validate (tsc + lint) | `npm run validate` |
| Production build | `npm run build` |
| E2E tests | `npm run test:e2e` (requires `npm run test:e2e:install` first for Playwright) |

### Environment variables
The app requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `app-next/.env.local`. Without real Supabase credentials, the app loads the login page but cannot authenticate. CI synthetic values from `src/lib/supabaseEnvPolicy.ts` can be used for builds and dev server startup. See `app-next/.env.example` for all options.

### Gotchas
- The Vite dev server binds to `localhost:5173` with `strictPort: true` — if port 5173 is occupied, it will fail rather than pick another port.
- Sentry is optional; when `@sentry/react` is not installed, Vite aliases it to a shim (`src/lib/sentryPackageShim.ts`).
- ESLint allows up to 200 warnings (`--max-warnings 200`). The codebase currently has ~2 warnings; staying under 200 is required for lint to pass.
- The production build validates Supabase env vars strictly — placeholder values like `YOUR_PROJECT_REF` will cause the build to fail. Use CI synthetic values or real credentials.
- No unit test framework (Jest/Vitest) exists — only Playwright E2E tests in `app-next/e2e/`.
