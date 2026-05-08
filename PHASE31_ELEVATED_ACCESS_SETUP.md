# Phase 31 — Omba Ruhusa ya Juu / Elevated Access (Setup)

Mwongozo mfupi wa kuweka module ya **Request Elevated Access** pamoja na database na Storage.

## 1. Nini hii module inafanya

- Watumiaji **waliopo na wameidhinishwa** (si `member` wa kawaida) wanaweza kuomba ruhusa za juu, permission layers, au muda mfupi.
- **Draft**, **submit**, **approval queue** (kwa admin), **audit** na **notifications** (in-app + optional Supabase).
- **Barua ya kuunga mkono**: ndani ya kivinjari (localref) au **Supabase Storage** bucket `elevated-access-letters`.

## 2. Faili muhimu za msimbo

| Faili | Maana |
|--------|--------|
| `request-elevated-access.html` | Ukurasa wa module |
| `phase31-elevated-access-main.js` | UI, preview modal, scheduler |
| `phase31-elevated-access-services.js` | Hifadhi, Supabase, barua |
| `phase31-elevated-access-hooks.js` | Aina za maombi na statuses |
| `phase31-elevated-access.css` | Muonekano |

## 3. SQL (mpangilio wa utekelezaji)

Endesha kwa mpangilio uliopo katika `MASTER_DEPLOYMENT_ORDER.md`, hasa:

1. `phase31-supabase-elevated-access.sql` — jedwali la maombi, assignments, routing  
2. `phase31-elevated-access-rls.sql` — RLS (inategemea `current_app_role()` kutoka phase 16)  
3. `phase31-storage-elevated-letters.sql` — bucket na sera za Storage  

Baada ya hapo: weka `supabase-config.js` (`enabled: true`, `url`, `anonKey`).

## 4. Auth na Storage

- **Upakiaji wa Storage** unategemea **Supabase Auth** (`auth.getUser()` → `letters/<uid>/...`).  
- Login ya mock (bila Supabase Auth) bado inatumia **hifadhi ya ndani** ya kivinjari kwa barua ndogo.

## 5. Viunganishi vya tovuti

- `index.html` — hero, modules center, footer  
- `dashboard.html` — dropdown ya profile  
- `portal.html` — topbar  
- `phase3-data.js` + `phase3-main.js` — kitabu cha **Omba Ruhusa ya Juu**

## 6. Ukaguzi wa haraka

1. Ingia kama mtumiaji sio `member` (`auth-login.html`).  
2. Fungua `request-elevated-access.html`.  
3. Jaribu **Preview**, **Save Draft**, **Submit** (na faili dogo ikiwa unataka).  
4. Ingia kama **admin / super_admin** uhakikishe **queue** inaonekana na vitendo vya uthibitisho.

---

*Serving the Church Through Digital Excellence — KMK(T) National Church Portal.*
