export const moduleMeta = {
  dayosisi: {
    title: "Usimamizi wa Dayosisi",
    subtitle: "Ongeza, hariri, futa na simamia taarifa zote za Dayosisi za Kanisa la Mennonite la Kiinjili Tanzania - KMK(T).",
    tableTitle: "Orodha ya Dayosisi",
    kpis: ["Jumla ya Dayosisi", "Dayosisi Active", "Maaskofu wa Dayosisi", "Majimbo Yaliyosajiliwa"],
    columns: ["id", "jina", "code", "askofu", "mkoa", "ofisi", "simu", "email", "majimbo", "matawi", "status", "created"],
    labels: {
      id: "ID", jina: "Jina la Dayosisi", code: "Code", askofu: "Askofu wa Dayosisi", mkoa: "Mkoa Mkuu", ofisi: "Ofisi / Makao Makuu",
      simu: "Simu", email: "Email", majimbo: "Idadi ya Majimbo", matawi: "Idadi ya Matawi", status: "Status", created: "Created Date",
    },
    filters: ["search", "mkoa", "status", "askofu"],
    formFields: ["jina", "code", "askofu", "mkoa", "ofisi", "anwani", "simu", "email", "maelezo", "status", "logo", "gps", "notes"],
    requiredFields: ["jina", "code", "askofu", "mkoa", "status"],
  },
  majimbo: {
    title: "Usimamizi wa Majimbo",
    subtitle: "Simamia majimbo yote yaliyo chini ya Dayosisi mbalimbali.",
    tableTitle: "Orodha ya Majimbo",
    kpis: ["Jumla ya Majimbo", "Majimbo Active", "Viongozi wa Majimbo", "Matawi Chini ya Majimbo"],
    columns: ["id", "jina", "code", "dayosisi", "mkuu", "mkoa", "wilaya", "simu", "email", "matawi", "status"],
    labels: {
      id: "ID", jina: "Jina la Jimbo", code: "Code", dayosisi: "Dayosisi", mkuu: "Mkuu wa Jimbo / Mchungaji", mkoa: "Mkoa", wilaya: "Wilaya",
      simu: "Simu", email: "Email", matawi: "Idadi ya Matawi", status: "Status", dayosisi_id: "Dayosisi Ref ID",
    },
    filters: ["search", "dayosisi", "mkoa", "status"],
    formFields: ["jina", "code", "dayosisi_id", "dayosisi", "mkuu", "mkoa", "wilaya", "kata", "anwani", "simu", "email", "maelezo", "status", "gps", "notes"],
    requiredFields: ["jina", "code", "dayosisi_id", "mkuu", "mkoa", "status"],
  },
  matawi: {
    title: "Usimamizi wa Matawi",
    subtitle: "Simamia matawi yote ya Kanisa pamoja na viongozi, ratiba, eneo na taarifa za mawasiliano.",
    tableTitle: "Orodha ya Matawi",
    kpis: ["Jumla ya Matawi", "Matawi Active", "Wachungaji / Viongozi", "Ratiba za Ibada"],
    columns: ["id", "jina", "code", "dayosisi", "jimbo", "mchungaji", "mkoa", "wilaya", "kata", "mtaa", "simu", "email", "ratiba", "status"],
    labels: {
      id: "ID", jina: "Jina la Tawi", code: "Code", dayosisi: "Dayosisi", jimbo: "Jimbo", mchungaji: "Mchungaji / Kiongozi", mkoa: "Mkoa",
      wilaya: "Wilaya", kata: "Kata", mtaa: "Kijiji / Mtaa", simu: "Simu", email: "Email", ratiba: "Ratiba ya Ibada", status: "Status",
      unit_type: "Label ya Eneo",
      dayosisi_id: "Dayosisi Ref ID", jimbo_id: "Jimbo Ref ID",
    },
    filters: ["search", "dayosisi", "jimbo", "mkoa", "status"],
    formFields: ["jina", "unit_type", "code", "dayosisi_id", "dayosisi", "jimbo_id", "jimbo", "mchungaji", "mkoa", "wilaya", "kata", "mtaa", "anwani", "simu", "email", "ratiba", "picha", "gps", "notes", "status"],
    requiredFields: ["jina", "unit_type", "code", "dayosisi_id", "jimbo_id", "mchungaji", "mkoa", "status"],
  },
};

export function getDefaultModule() {
  return "dayosisi";
}
