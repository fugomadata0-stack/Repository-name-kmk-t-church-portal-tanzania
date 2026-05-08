# Soft delete — mpango wa baadaye (haujatekelezwa bado)

Lengo: badala ya `DELETE` ya milele, andika `deleted_at = now()` na uondoe rekodi zilizo “futwa” kwenye maswali ya ziada.

## Hatua (mlolongo)

1. **Migrations (Postgres)**
   - Ongeza safu `deleted_at timestamptz` (default `NULL`) kwa jedwali: `church_members`, `church_families`, `church_jimbo`, `church_tawi`, `church_finance_entries`, `church_income_sources`, `church_income_lines`, na nyengine zinazofanana na biashara.
   - Fungua fahirisi inayopendekezwa: `(deleted_at) WHERE deleted_at IS NULL` kwa kila jedwali inayotumika sana.
2. **RLS**
   - Sasisha sera za `SELECT` / `UPDATE` / `INSERT` zisiruhusu kuona na kuandika makosa bila kuzingatia `deleted_at IS NULL` (au ruhusu “admin” kuona zilizofutwa kama inavyohitajika).
3. **Mfumo (app / services)**
   - **Select**: ongeza `.is("deleted_at", null)` (au ulinganifu sawa) kwenye `fetch*` zote.
   - **Delete (UI)**: badala ya `.delete()`, tumia `.update({ deleted_at: new Date().toISOString() })`.
   - **Restore** (hiari): endpoint ya kuweka `deleted_at` tena `NULL`.
4. **Kuthibitisha**
   - Majaribio ya RLS, orodha zisizo na rekodi zilizofutwa, na uwezekano wa “empty” foreign keys kama inavyo stahili.

Utekelezaji utafanywa katika patch tofauti baada ya CRUD kuwa thabiti kwa hard delete.
