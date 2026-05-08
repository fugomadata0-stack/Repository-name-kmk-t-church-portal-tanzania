// Future Supabase service names (prepared):
// useDayosisiService, useMajimboService, useMatawiService, useChurchUnitsService, useLocationsService, useActivityLogsService
// fetchDayosisi(), createDayosisi(), updateDayosisi(), deleteDayosisi()
// fetchMajimbo(), createJimbo(), updateJimbo(), deleteJimbo()
// fetchMatawi(), createTawi(), updateTawi(), deleteTawi()

export const structureData = {
  dayosisi: [
    { id: 1, jina: "Dayosisi ya Mara", code: "KMKT-MRA", askofu: "Askofu wa Dayosisi", mkoa: "Mara", ofisi: "Musoma", simu: "0711111001", email: "mara@kmkt.or.tz", majimbo: 11, matawi: 0, status: "active", created: "2026-01-05", anwani: "S.L.P 317 Musoma", maelezo: "-", logo: "placeholder", gps: "-1.50,33.80", notes: "-" },
    { id: 2, jina: "Dayosisi ya Mwanza", code: "KMKT-MWZ", askofu: "Askofu wa Dayosisi", mkoa: "Mwanza", ofisi: "Mwanza", simu: "0711111002", email: "mwanza@kmkt.or.tz", majimbo: 19, matawi: 0, status: "active", created: "2026-01-09", anwani: "Mwanza", maelezo: "-", logo: "placeholder", gps: "-2.51,32.90", notes: "-" },
    { id: 3, jina: "Dayosisi ya Bunda", code: "KMKT-BUN", askofu: "Askofu wa Dayosisi", mkoa: "Mara", ofisi: "Bunda", simu: "0711111003", email: "bunda@kmkt.or.tz", majimbo: 8, matawi: 0, status: "active", created: "2026-01-10", anwani: "Bunda", maelezo: "-", logo: "placeholder", gps: "-2.04,33.87", notes: "-" },
    { id: 4, jina: "Dayosisi ya Dodoma", code: "KMKT-DOD", askofu: "Askofu wa Dayosisi", mkoa: "Dodoma", ofisi: "Dodoma", simu: "0711111004", email: "dodoma@kmkt.or.tz", majimbo: 0, matawi: 0, status: "active", created: "2026-01-12", anwani: "Dodoma", maelezo: "-", logo: "placeholder", gps: "-6.17,35.74", notes: "-" },
    { id: 5, jina: "Dayosisi ya Dar es Salaam", code: "KMKT-DAR", askofu: "Askofu wa Dayosisi", mkoa: "Dar es Salaam", ofisi: "Dar es Salaam", simu: "0711111005", email: "dar@kmkt.or.tz", majimbo: 0, matawi: 0, status: "active", created: "2026-01-13", anwani: "Dar es Salaam", maelezo: "-", logo: "placeholder", gps: "-6.79,39.21", notes: "-" },
    { id: 6, jina: "Dayosisi ya Kigoma", code: "KMKT-KGM", askofu: "Askofu wa Dayosisi", mkoa: "Kigoma", ofisi: "Kigoma", simu: "0711111006", email: "kigoma@kmkt.or.tz", majimbo: 0, matawi: 0, status: "active", created: "2026-01-14", anwani: "Kigoma", maelezo: "-", logo: "placeholder", gps: "-4.88,29.62", notes: "-" },
  ],
  majimbo: [
    { id: 1, jina: "Saragana", code: "MRA-SRG", dayosisi_id: 1, dayosisi: "Dayosisi ya Mara", mkuu: "Mchungaji wa Jimbo", mkoa: "Mara", wilaya: "Musoma", simu: "0712222001", email: "saragana@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 2, jina: "Wanyere", code: "MRA-WAN", dayosisi_id: 1, dayosisi: "Dayosisi ya Mara", mkuu: "Mchungaji wa Jimbo", mkoa: "Mara", wilaya: "Musoma", simu: "0712222002", email: "wanyere@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 3, jina: "Murangi", code: "MRA-MUR", dayosisi_id: 1, dayosisi: "Dayosisi ya Mara", mkuu: "Mchungaji wa Jimbo", mkoa: "Mara", wilaya: "Musoma", simu: "0712222003", email: "murangi@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 4, jina: "Mgango", code: "MRA-MGA", dayosisi_id: 1, dayosisi: "Dayosisi ya Mara", mkuu: "Mchungaji wa Jimbo", mkoa: "Mara", wilaya: "Musoma", simu: "0712222004", email: "mgango@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 5, jina: "Kwikerege", code: "MRA-KWI", dayosisi_id: 1, dayosisi: "Dayosisi ya Mara", mkuu: "Mchungaji wa Jimbo", mkoa: "Mara", wilaya: "Musoma", simu: "0712222005", email: "kwikerege@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 6, jina: "Mtiro", code: "MRA-MTI", dayosisi_id: 1, dayosisi: "Dayosisi ya Mara", mkuu: "Mchungaji wa Jimbo", mkoa: "Mara", wilaya: "Musoma", simu: "0712222006", email: "mtiro@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 7, jina: "Kiabakari", code: "MRA-KIA", dayosisi_id: 1, dayosisi: "Dayosisi ya Mara", mkuu: "Mchungaji wa Jimbo", mkoa: "Mara", wilaya: "Musoma", simu: "0712222007", email: "kiabakari@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 8, jina: "Musoma Kusini", code: "MRA-MSK", dayosisi_id: 1, dayosisi: "Dayosisi ya Mara", mkuu: "Mchungaji wa Jimbo", mkoa: "Mara", wilaya: "Musoma", simu: "0712222008", email: "musomakusini@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 9, jina: "Musoma Kaskazini", code: "MRA-MKN", dayosisi_id: 1, dayosisi: "Dayosisi ya Mara", mkuu: "Mchungaji wa Jimbo", mkoa: "Mara", wilaya: "Musoma", simu: "0712222009", email: "musomakaskazini@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 10, jina: "Busumi", code: "MRA-BUS", dayosisi_id: 1, dayosisi: "Dayosisi ya Mara", mkuu: "Mchungaji wa Jimbo", mkoa: "Mara", wilaya: "Musoma", simu: "0712222010", email: "busumi@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 11, jina: "Nyakatende", code: "MRA-NYA", dayosisi_id: 1, dayosisi: "Dayosisi ya Mara", mkuu: "Mchungaji wa Jimbo", mkoa: "Mara", wilaya: "Musoma", simu: "0712222011", email: "nyakatende@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 12, jina: "Nkuyu", code: "MWZ-NKU", dayosisi_id: 2, dayosisi: "Dayosisi ya Mwanza", mkuu: "Mchungaji wa Jimbo", mkoa: "Mwanza", wilaya: "Mwanza", simu: "0712222101", email: "nkuyu@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 13, jina: "Mhunze", code: "MWZ-MHU", dayosisi_id: 2, dayosisi: "Dayosisi ya Mwanza", mkuu: "Mchungaji wa Jimbo", mkoa: "Mwanza", wilaya: "Mwanza", simu: "0712222102", email: "mhunze@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 14, jina: "Itilima", code: "MWZ-ITI", dayosisi_id: 2, dayosisi: "Dayosisi ya Mwanza", mkuu: "Mchungaji wa Jimbo", mkoa: "Mwanza", wilaya: "Mwanza", simu: "0712222103", email: "itilima@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 15, jina: "Budalabujiga", code: "MWZ-BUD", dayosisi_id: 2, dayosisi: "Dayosisi ya Mwanza", mkuu: "Mchungaji wa Jimbo", mkoa: "Mwanza", wilaya: "Mwanza", simu: "0712222104", email: "budalabujiga@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 16, jina: "Bariadi", code: "MWZ-BAR", dayosisi_id: 2, dayosisi: "Dayosisi ya Mwanza", mkuu: "Mchungaji wa Jimbo", mkoa: "Mwanza", wilaya: "Mwanza", simu: "0712222105", email: "bariadi@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 17, jina: "Lamadi", code: "MWZ-LAM", dayosisi_id: 2, dayosisi: "Dayosisi ya Mwanza", mkuu: "Mchungaji wa Jimbo", mkoa: "Mwanza", wilaya: "Mwanza", simu: "0712222106", email: "lamadi@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 18, jina: "Nassa", code: "MWZ-NAS", dayosisi_id: 2, dayosisi: "Dayosisi ya Mwanza", mkuu: "Mchungaji wa Jimbo", mkoa: "Mwanza", wilaya: "Mwanza", simu: "0712222107", email: "nassa@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 19, jina: "Busega", code: "MWZ-BUS", dayosisi_id: 2, dayosisi: "Dayosisi ya Mwanza", mkuu: "Mchungaji wa Jimbo", mkoa: "Mwanza", wilaya: "Mwanza", simu: "0712222108", email: "busega@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 20, jina: "Manara", code: "MWZ-MAN", dayosisi_id: 2, dayosisi: "Dayosisi ya Mwanza", mkuu: "Mchungaji wa Jimbo", mkoa: "Mwanza", wilaya: "Mwanza", simu: "0712222109", email: "manara@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 21, jina: "Igoma", code: "MWZ-IGO", dayosisi_id: 2, dayosisi: "Dayosisi ya Mwanza", mkuu: "Mchungaji wa Jimbo", mkoa: "Mwanza", wilaya: "Mwanza", simu: "0712222110", email: "igoma@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 22, jina: "Nyagezi", code: "MWZ-NYA", dayosisi_id: 2, dayosisi: "Dayosisi ya Mwanza", mkuu: "Mchungaji wa Jimbo", mkoa: "Mwanza", wilaya: "Mwanza", simu: "0712222111", email: "nyagezi@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 23, jina: "Igombe", code: "MWZ-IGB", dayosisi_id: 2, dayosisi: "Dayosisi ya Mwanza", mkuu: "Mchungaji wa Jimbo", mkoa: "Mwanza", wilaya: "Mwanza", simu: "0712222112", email: "igombe@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 24, jina: "Nyasaka", code: "MWZ-NYS", dayosisi_id: 2, dayosisi: "Dayosisi ya Mwanza", mkuu: "Mchungaji wa Jimbo", mkoa: "Mwanza", wilaya: "Mwanza", simu: "0712222113", email: "nyasaka@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 25, jina: "Geita", code: "MWZ-GEI", dayosisi_id: 2, dayosisi: "Dayosisi ya Mwanza", mkuu: "Mchungaji wa Jimbo", mkoa: "Mwanza", wilaya: "Mwanza", simu: "0712222114", email: "geita@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 26, jina: "Kayenze", code: "MWZ-KAY", dayosisi_id: 2, dayosisi: "Dayosisi ya Mwanza", mkuu: "Mchungaji wa Jimbo", mkoa: "Mwanza", wilaya: "Mwanza", simu: "0712222115", email: "kayenze@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 27, jina: "Kagu", code: "MWZ-KAG", dayosisi_id: 2, dayosisi: "Dayosisi ya Mwanza", mkuu: "Mchungaji wa Jimbo", mkoa: "Mwanza", wilaya: "Mwanza", simu: "0712222116", email: "kagu@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 28, jina: "Senga", code: "MWZ-SEN", dayosisi_id: 2, dayosisi: "Dayosisi ya Mwanza", mkuu: "Mchungaji wa Jimbo", mkoa: "Mwanza", wilaya: "Mwanza", simu: "0712222117", email: "senga@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 29, jina: "Misungwi", code: "MWZ-MIS", dayosisi_id: 2, dayosisi: "Dayosisi ya Mwanza", mkuu: "Mchungaji wa Jimbo", mkoa: "Mwanza", wilaya: "Mwanza", simu: "0712222118", email: "misungwi@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 30, jina: "Katoro", code: "MWZ-KAT", dayosisi_id: 2, dayosisi: "Dayosisi ya Mwanza", mkuu: "Mchungaji wa Jimbo", mkoa: "Mwanza", wilaya: "Mwanza", simu: "0712222119", email: "katoro@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 31, jina: "Ukerewe", code: "BUN-UKE", dayosisi_id: 3, dayosisi: "Dayosisi ya Bunda", mkuu: "Mchungaji wa Jimbo", mkoa: "Mara", wilaya: "Bunda", simu: "0712222201", email: "ukerewe@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 32, jina: "Kisorya", code: "BUN-KIS", dayosisi_id: 3, dayosisi: "Dayosisi ya Bunda", mkuu: "Mchungaji wa Jimbo", mkoa: "Mara", wilaya: "Bunda", simu: "0712222202", email: "kisorya@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 33, jina: "Kibara", code: "BUN-KIB", dayosisi_id: 3, dayosisi: "Dayosisi ya Bunda", mkuu: "Mchungaji wa Jimbo", mkoa: "Mara", wilaya: "Bunda", simu: "0712222203", email: "kibara@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 34, jina: "Butimba", code: "BUN-BUT", dayosisi_id: 3, dayosisi: "Dayosisi ya Bunda", mkuu: "Mchungaji wa Jimbo", mkoa: "Mara", wilaya: "Bunda", simu: "0712222204", email: "butimba@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 35, jina: "Kwiramba", code: "BUN-KWI", dayosisi_id: 3, dayosisi: "Dayosisi ya Bunda", mkuu: "Mchungaji wa Jimbo", mkoa: "Mara", wilaya: "Bunda", simu: "0712222205", email: "kwiramba@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 36, jina: "Bunda", code: "BUN-BUN", dayosisi_id: 3, dayosisi: "Dayosisi ya Bunda", mkuu: "Mchungaji wa Jimbo", mkoa: "Mara", wilaya: "Bunda", simu: "0712222206", email: "bunda@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 37, jina: "Kung’ombe", code: "BUN-KNG", dayosisi_id: 3, dayosisi: "Dayosisi ya Bunda", mkuu: "Mchungaji wa Jimbo", mkoa: "Mara", wilaya: "Bunda", simu: "0712222207", email: "kungombe@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
    { id: 38, jina: "Mugumu", code: "BUN-MUG", dayosisi_id: 3, dayosisi: "Dayosisi ya Bunda", mkuu: "Mchungaji wa Jimbo", mkoa: "Mara", wilaya: "Bunda", simu: "0712222208", email: "mugumu@kmkt.or.tz", matawi: 0, status: "active", kata: "-", anwani: "-", maelezo: "-", gps: "-", notes: "-" },
  ],
  matawi: [],
};

export function getStructureRows(moduleKey) {
  return [...(structureData[moduleKey] || [])];
}

export function setStructureRows(moduleKey, rows) {
  structureData[moduleKey] = rows;
}

export function getDayosisiOptions() {
  return structureData.dayosisi.map((d) => ({ id: d.id, jina: d.jina }));
}

export function getJimboOptions(dayosisiName = "", dayosisiId = "") {
  const rows = structureData.majimbo;
  if (!dayosisiName && !dayosisiId) return rows.map((j) => ({ id: j.id, jina: j.jina }));
  return rows
    .filter((j) => j.dayosisi === dayosisiName || String(j.dayosisi_id) === String(dayosisiId))
    .map((j) => ({ id: j.id, jina: j.jina }));
}

export function logStructureActivity(action, moduleKey, description) {
  const item = {
    id: Date.now(),
    action,
    module: moduleKey,
    description,
    created_at: new Date().toISOString(),
  };
  const raw = localStorage.getItem("kmt_structure_activity_logs");
  const logs = raw ? JSON.parse(raw) : [];
  logs.unshift(item);
  localStorage.setItem("kmt_structure_activity_logs", JSON.stringify(logs.slice(0, 500)));
}
