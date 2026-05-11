# KMK(T) Internal Portal — Frontend (`app-next`)

Single-page app (**Vite + React + TypeScript**) kwa portal ya ndani ya KMK(T): dashibodi, moduli (waumini, fedha, nyaraka, nk.), mipangilio, na data kupitia Supabase.

## Stack (kutoka `package.json`)
- **Tooling**: Vite, TypeScript, ESLint, Tailwind CSS, Sass (`src/styles/global.scss`)
- **UI**: React 18, Framer Motion, Lucide React
- **Data & ripoti**: `@supabase/supabase-js`, Recharts, jsPDF / jspdf-autotable, SheetJS (`xlsx`)

## Njia za URL (umma / kuingia)
Hakuna `react-router`; `RootShell` huangalia `window.location.pathname` (angalia `src/hooks/usePublicPath.ts`):
- **`/auth/signup-request`** — ombi la akaunti
- **`/auth/accept-invite`** — kukubali mwaliko
- **`/verify/member/:uuid`** — uhakiki wa mwanachama (umma)
- **Nyengineyo** (mfano `/`) — **Login** ikiwa hujajiunga; baada ya kuingia huonyesha **`AppLayout`** na moduli zinachaguliwa **ndani ya programu** (sidebar), si kwa segment moja kwa moja ya URL

## Start command
```bash
npm install
npm run dev
# uzalishaji wa uzalishi + uchunguzi
npm run validate
npm run build
npm run preview   # hakiki dist lokali
```

## Deploy (Vercel / Netlify)

### Vercel
**Njia A (inapendekezwa):** kwenye mipangilio ya mradi weka **Root Directory** = `app-next` → build ni `npm run build`, output `dist`, na `app-next/vercel.json` (rewrites za SPA).

**Njia B (mzizi wa monorepo):** acha Root Directory kuwa `.` (mzizi wa repo) → tumia `vercel.json` kwenye mzizi: `npm ci` → `npm run build` (kutekeleza `build:ci` + `build:next`) → output **`app-next/dist`**. Rewrites za SPA ziko katika faili hiyo.

Kwa njia zote mbili, **Environment Variables** (Production na Preview): lazima `VITE_SUPABASE_URL` na `VITE_SUPABASE_ANON_KEY` — angalia `.env.example` kwa hiari (`VITE_SUPABASE_REALTIME_ENABLED`, `VITE_SENTRY_DSN`, nk.). Vite huunganisha `VITE_*` wakati wa build—lazima ziwekwe kwenye Vercel kabla ya deploy.

### Netlify
- **Base directory**: `app-next` → **Build command**: `npm run build` → **Publish directory**: `dist`
- SPA fallback: `public/_redirects` (`/* /index.html 200`) huhamishiwa kwenye `dist` wakati wa build

## One-click bootstrap (Windows PowerShell)
```powershell
.\bootstrap-enterprise.ps1
```

If npm is missing, script will stop and show install command.

## Muundo wa portal (ndani ya akaunti)
- Sidebar kamili kutoka **`lg` (≥1024px)**; chini ya hapo **drawer** (kitufe ☰ kwenye topbar)
- Topbar: kichwa cha submodule, arifa, maelezo ya scope/wadhifa, **Rudi**, **Toka**
- Dashibodi: KPI na vipimo kutoka **Supabase** inapoanzishwa (`AppLayout`, `dashboardKpiAggregatesService`)
- **`PremiumTable`**: Ongeza / Hariri / Futa / Tazama / safisha vichujio / Excel · PDF · Chapisha (linapotumika)
- Orodha kamili ya moduli na submodules: `src/data/portalModules.ts` — kiini cha jedwali **`ModulePage.tsx`** na panel za **`moduleLazyPanels.tsx`**

## Notes
- Mradi wa mzizi una/schema za Supabase na migrations kwenye folda ya mradi — tumia `npm run db:push:safe` kwa uangalifu (angalia `package.json`).

---

## Ubora wa utendaji na ukubaji (Performance & scale)

Sehemu hii **inaelezea utekelezaji halisi** wa `app-next` (si lengo la UX tu): mgawanyo wa bundle, ucheleweshaji wa utafutaji/ripoti, na mahali ambapo maktaba kubwa hupakiwa.

### Mtiririko wa upakiaji (uhakika)
1. **Baada ya kuingia**: `RootShell` hupakia **`AppLayout`** kwa njia ya `React.lazy` (si pamoja na ukurasa wa kuingia).
2. **Dashibodi**: `Dashboard` pia ni lazy kutoka `AppLayout`.
3. **Moduli za portal**: `ModulePage` ni lazy; panel nyingi zinatoka **`moduleLazyPanels.tsx`**. Kwa kawaida **chunk moja kwa panel** inapofunguliwa mara ya kwanza; Rollup inawezaunganisha au kugawa tena—thibitisha kwa `npm run build`.
4. **`ModulePage.tsx` bado ni kubwa** kwa sababu inabeba njia nyingi za CRUD zilizoandikwa moja kwa moja (`PremiumTable`, fomu za Muundo, nk.). Mgawanyo wa panel **hupunguza** mzigo, lakini **si kuondoa** kabisa kiini cha moduli.

### Vitu vilivyoboreshwa (na vipimo vya msimbo)
| Kiini | Kiasi (ms) / mahali | Maana fupi |
|--------|---------------------|------------|
| Utafutaji wa `PremiumTable` | **220** katika `useDebouncedValue` | Hesabu ya kuchuja orodha inategemea thamani iliyocheleweshwa, si kila keystroke. |
| Utafutaji wa Nyaraka | **220** | Vivyo hivyo kwa `filteredRows`. |
| `kmt-portal-reload-metrics` (`src/lib/portalEvents.ts`) | **380ms** debounce katika `AppLayout.tsx` | Matukio mengi ya pamoja hayafanyi mara **nne** za reload (`loadDashboardMetrics`, `loadIncomeModuleData`, `loadFinanceEntries`, `loadViongoziList`) mfululizo—zungushwa mara moja baada ya kimya. Tumia `dispatchPortalReloadMetrics()`. |

### Maktaba kubwa na lini hupakiwa (Recharts, PDF, Excel)
- **Recharts** (`charts-*` katika build): Rollup hugawa maktaba hii kwenye chunk ya pamoja. Chunk hiyo **hupakiwa mara ya kwanza** skrini inayotumia Recharts inapofunguliwa (si lazima Mapato). Mitumizi ya sasa inajumuisha angalau **Mapato Income** (`MapatoIncomeCharts.tsx`, lazy), **Nyaraka** (`ChurchDocumentsPanel`), na **Analytics**. **Vite/Rollup** inawezaunganisha chunk ndogo—angalia `dist/assets/` baada ya build.
- **PDF / Excel**: Maktaba za **jspdf**, **jspdf-autotable**, na **xlsx** huingizwa katika **`export-pdf-*`** na **`export-excel-*`** kwa `manualChunks`. Ndani ya msimbo, vitendo vya pakua hutumia `import()` ili kuanzisha maktaba hizo **wakati wa kubofya** pakua/Excel/PDF. **Kumbuka**: faili `exportHelpers.ts` mwenyewe hufuatwa na module inayoitumia (mf. `PremiumTable`), kwa hiyo **si** “sifuri malipo” kabla ya kufungua jedwali—malipo ya maktaba kubwa hufanyika wakati wa kitendo cha pakua.

### `manualChunks` (angalia `vite.config.ts`)
Majina ya chunk hutoka kwa njia ya **functions / maktaba**, si kwa moduli ya biashara moja moja: `supabase`, `charts`, `motion`, `icons`, `export-pdf`, `export-excel`, `react-vendor`, `vendor`. Hii **kusaidia** caching ya kivinjari; si dhamana ya ukubwa maalum kwa kila release.

### Faili muhimu (msimbo)
| Jambo | Mahali |
|--------|--------|
| Sahihi ya lazy panels | `src/pages/moduleLazyPanels.tsx` — panel mpya lazima iongezwe hapa na kutumiwa kutoka `ModulePage.tsx`. |
| Kiini cha moduli + Suspense | `src/pages/ModulePage.tsx` |
| Chati za Mapato (lazy) | `src/components/fedha/MapatoIncomeCharts.tsx` |
| Debounce | `src/hooks/useDebouncedValue.ts` |
| Jedwali + utafutaji | `src/components/common/PremiumTable.tsx` |
| Nyaraka + Recharts + utafutaji | `src/components/portal/ChurchDocumentsPanel.tsx` |
| Ripoti za vipimo + debounce | `src/components/layout/AppLayout.tsx` |
| PDF/Excel | `src/lib/exportHelpers.ts` |
| Shell ya ndani lazy | `src/components/auth/RootShell.tsx` → `AppLayout` lazy |
| Mgawanyo wa vendor | `vite.config.ts` → `build.rollupOptions.output.manualChunks` |

### Vitendo vya uthabiti (stability)
```bash
npm run validate   # TypeScript + ESLint
npm run build      # Ujenzi wa uzalishaji (Vite)
```
- **`chunkSizeWarningLimit`** (sasa **900** KiB katika `vite.config.ts`) ni kizingiti cha onyo la Rollup—**si kuzuia** build. Onyo linaweza kurudi ikiwa mradi utaongeza maktaba kubwa.
- **Ulinganishaji wa matoleo**: tumia faili za `dist/assets/*.js` na ukubwa wa gzip kutoka kwa output ya `npm run build` (si namba thabiti za kiutaalamu kwenye README).

### Simu na tablet (responsive)
Haya **ni muundo wa msimbo**, si ahadi ya kila kivinjari:
- **Sidebar kamili**: `lg` na juu (**≥1024px** kwa Tailwind chaguomsingi); chini ya hapo menyu ni **drawer** (`Sidebar.tsx`, kitufe ☰ kwenye `Topbar`).
- **Skrini fupi / landscape**: `100dvh`, safe-area (`env(safe-area-inset-*)`) kwenye topbar, drawer, na modals (`ModalScrollLayer`).
- **Jedwali**: `PremiumTable` na jedwali la Nyaraka — `overflow-x-auto` + jedwali lenye `min-width` ili kusogeza **mlalo** bila kufoleni muundo mzima.
- **Panel za lazy**: bado zinaweza kuonyesha loader fupi mara ya kwanza — si hitilafu.

### Kumbuka kwa timu ya maendeleo
- **Suspense / code splitting**: ufunguzi wa kwanza wa panel fulani unaweza kuonyesha loader — tabia ya kawaida.
- **Core Web Vitals**: picha za juu ya fold—epuka `loading="lazy"` bila kuyauliza kwa Lighthouse halisi.

### Performance philosophy (EN)
Optimizations target **frontend delivery**: smaller graphs for the module shell, **lazy-loaded panels** (one chunk per panel in typical builds), shared vendor splits, **debounced** search and metrics reloads, and **dynamic imports inside export actions** for PDF/XLSX libraries. This README is **descriptive of the codebase**, not a performance guarantee or benchmark report.
