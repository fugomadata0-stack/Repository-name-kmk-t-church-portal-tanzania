import { getSafeSupabase, safeAsync } from "./phase-integration-core.js";

function ok(name, detail) {
  return { name, status: "Green", detail };
}
function warn(name, detail) {
  return { name, status: "Yellow", detail };
}
function err(name, detail) {
  return { name, status: "Red", detail };
}

async function countBy(table, column) {
  const s = getSafeSupabase();
  if (!s) return null;
  const res = await safeAsync(
    `integrity_count_${table}_${column}`,
    async () => s.from(table).select(column, { count: "exact" }),
    null
  );
  if (!res || res.error || !Array.isArray(res.data)) return null;
  return res.data;
}

export async function runRelationshipIntegrityChecks() {
  const s = getSafeSupabase();
  if (!s) {
    return [warn("Relationship checks", "Supabase haija-configurewa, integrity checks zime-skip.")];
  }

  const rows = [];

  const majimbo = await countBy("majimbo", "dayosisi_id");
  if (!majimbo) rows.push(warn("Dayosisi -> Majimbo", "Majimbo table/column check failed."));
  else {
    const orphans = majimbo.filter((x) => !x.dayosisi_id).length;
    rows.push(orphans ? err("Dayosisi -> Majimbo", `Orphan majimbo: ${orphans}`) : ok("Dayosisi -> Majimbo", "No orphan records."));
  }

  const matawi = await countBy("matawi", "jimbo_id");
  if (!matawi) rows.push(warn("Majimbo -> Matawi", "Matawi table/column check failed."));
  else {
    const orphans = matawi.filter((x) => !x.jimbo_id).length;
    rows.push(orphans ? err("Majimbo -> Matawi", `Orphan matawi: ${orphans}`) : ok("Majimbo -> Matawi", "No orphan records."));
  }

  const members = await countBy("members", "branch_id");
  if (!members) rows.push(warn("Matawi -> Waumini", "members.branch_id not available, fallback relation needed."));
  else {
    const missing = members.filter((x) => !x.branch_id).length;
    rows.push(missing ? warn("Matawi -> Waumini", `Members without branch link: ${missing}`) : ok("Matawi -> Waumini", "Branch links look healthy."));
  }

  const leaders = await countBy("leaders", "dayosisi_id");
  if (!leaders) rows.push(warn("Dayosisi -> Leaders", "leaders.dayosisi_id check failed."));
  else {
    const missing = leaders.filter((x) => !x.dayosisi_id).length;
    rows.push(missing ? warn("Dayosisi -> Leaders", `Leaders without dayosisi link: ${missing}`) : ok("Dayosisi -> Leaders", "Dayosisi relation healthy."));
  }

  const leadersJimbo = await countBy("leaders", "jimbo_id");
  if (!leadersJimbo) rows.push(warn("Jimbo -> Leaders", "leaders.jimbo_id check failed."));
  else {
    const missing = leadersJimbo.filter((x) => !x.jimbo_id).length;
    rows.push(missing ? warn("Jimbo -> Leaders", `Leaders without jimbo link: ${missing}`) : ok("Jimbo -> Leaders", "Jimbo relation healthy."));
  }

  const leadersTawi = await countBy("leaders", "tawi_id");
  if (!leadersTawi) rows.push(warn("Tawi -> Leaders", "leaders.tawi_id check failed."));
  else {
    const missing = leadersTawi.filter((x) => !x.tawi_id).length;
    rows.push(missing ? warn("Tawi -> Leaders", `Leaders without tawi link: ${missing}`) : ok("Tawi -> Leaders", "Tawi relation healthy."));
  }

  const docs = await countBy("documents", "module");
  if (!docs) rows.push(warn("Document -> Module owner", "documents.module check failed."));
  else {
    const missing = docs.filter((x) => !x.module).length;
    rows.push(missing ? warn("Document -> Module owner", `Documents without module: ${missing}`) : ok("Document -> Module owner", "Module links present."));
  }

  return rows;
}
