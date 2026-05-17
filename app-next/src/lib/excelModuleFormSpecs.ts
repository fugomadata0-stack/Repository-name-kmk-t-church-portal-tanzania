/** Vichwa na funguo zinalingana na fomu za RecordModal / FedhaRecordModal katika ModulePage. */

export type PortalExcelColumn = { key: string; label: string };

const ID: PortalExcelColumn = {
  key: "id",
  label: "Rekodi ID (acha tupu kwa mpya)",
};

const BASE_INSTRUCTIONS: (string | number)[][] = [
  ["Mfumo: KMT Church Tanzania Portal"],
  [],
  ["Hatua:"],
  ["1) Bonyeza «Pakua blanki» au tumie «Excel orodha» kupata faili yenye jalada «Maelekezo» na «Data»."],
  ["2) Jaza safu kwenye jalada «Data» tu — usibadilishe majina ya safu ya kwanza (vichwa)."],
  ["3) Hifadhi kama .xlsx kisha «Pakia Excel»."],
  ["4) Usiongeze safu mbele ya vichwa; usifute jalada «Maelekezo» ikiwa unapakia tena blanki ya mfumo."],
  ["5) Namba na tarehe: tumia muundo unaofaa (mf. yyyy-mm-dd)."],
  ["6) Kumbuka: bila Supabase, baadhi ya moduli zinahifadhi ndani ya kivinjari pekee."],
  [],
];

/** Maandishi mfupi chini ya vitufe vya jedwali (PremiumTable). */
export const PORTAL_EXCEL_TABLE_HINT_SW =
  "Vitendo: «Pakua blanki» (maelezo + safu tupu), «Excel orodha» (data iliyochujwa hapa), «Pakia Excel». Lazima jalada «Data»; vichwa vya safu ya 1 visigeuke; faili .xlsx pekee.";

export type PortalExcelFormBundle = {
  templateBasename: string;
  specTitle: string;
  specSubtitle: string;
  columns: PortalExcelColumn[];
  instructionRows: (string | number)[][];
};

function bundle(
  basename: string,
  title: string,
  subtitle: string,
  columns: PortalExcelColumn[],
  extraLines: (string | number)[][] = []
): PortalExcelFormBundle {
  return {
    templateBasename: basename,
    specTitle: title,
    specSubtitle: subtitle,
    columns,
    instructionRows: [...BASE_INSTRUCTIONS, ...extraLines],
  };
}

export function getPortalExcelFormSpec(moduleKey: string, submodule: string): PortalExcelFormBundle | null {
  const sub = submodule.trim();

  if (moduleKey === "muundo" && (sub === "Dayosisi" || sub === "Orodha ya Dayosisi")) {
    return bundle(
      "muundo_dayosisi",
      "Blanki la Dayosisi",
      "Safu zifuatazo zinalingana na fomu ya «Ongeza / Hariri».",
      [
        ID,
        { key: "jina", label: "Jina la Dayosisi" },
        { key: "code", label: "Code" },
        { key: "askofu", label: "Askofu wa Dayosisi" },
        { key: "makao", label: "Makao Makuu" },
        { key: "mkoa", label: "Mkoa" },
        { key: "simu", label: "Simu" },
        { key: "email", label: "Email" },
        { key: "maelezo", label: "Maelezo" },
        { key: "status", label: "Status" },
      ],
      [["Muhimu: Jina la Dayosisi na Code ni lazima kwa rekodi mpya."]]
    );
  }

  if (moduleKey === "muundo" && (sub === "Majimbo" || sub === "Orodha ya Majimbo")) {
    return bundle(
      "muundo_majimbo",
      "Blanki la Majimbo",
      "Dayosisi: andika jina, code, au UUID linaloonekana kwenye orodha ya Dayosisi.",
      [
        ID,
        { key: "jina", label: "Jina la Jimbo" },
        { key: "dayosisi", label: "Dayosisi (jina, code au UUID)" },
        { key: "mkuu", label: "Mkuu wa Jimbo" },
        { key: "mkoa", label: "Mkoa" },
        { key: "simu", label: "Simu" },
        { key: "status", label: "Status" },
      ],
      [["Muhimu: Jina la jimbo na dayosisi vinahitajika."]]
    );
  }

  if (moduleKey === "muundo" && sub.includes("Orodha ya Matawi")) {
    return bundle(
      "muundo_matawi",
      "Blanki la Matawi / Vituo",
      "Jimbo: jina lilio kwenye orodha; Dayosisi (hiari) kusaidia majimbo yenye majina sawa.",
      [
        ID,
        { key: "jina", label: "Jina la Tawi/Kituo" },
        { key: "branch_code", label: "Branch code" },
        { key: "aina", label: "Aina" },
        { key: "jimbo", label: "Jimbo (jina au UUID)" },
        { key: "dayosisi", label: "Dayosisi (hiari — jina au UUID)" },
        { key: "mkoa", label: "Mkoa" },
        { key: "wilaya", label: "Wilaya" },
        { key: "kata", label: "Kata" },
        { key: "mtaa", label: "Kijiji / Mtaa" },
        { key: "gps_lat", label: "GPS Lat" },
        { key: "gps_lng", label: "GPS Lng" },
        { key: "founded_date", label: "Tarehe ya kuanzishwa (yyyy-mm-dd)" },
        { key: "verification_status", label: "Uhakiki (unverified/pending_review/verified)" },
        { key: "kiongozi", label: "Kiongozi" },
        { key: "simu", label: "Simu" },
        { key: "status", label: "Status" },
      ],
      [["Muhimu: Jina la tawi na jimbo vinahitajika."]]
    );
  }

  if (moduleKey === "viongozi") {
    return bundle(
      "viongozi",
      "Blanki la KMK(T) VIONGOZI WA NGAZI KUU TANZANIA",
      "Leadership registry: level, assigned entity, term status, hierarchy.",
      [
        ID,
        { key: "jina", label: "Jina Kamili" },
        { key: "cheo", label: "Cheo" },
        { key: "leadership_level", label: "Leadership Level" },
        { key: "assigned_entity", label: "Assigned Entity" },
        { key: "ngazi", label: "Ngazi (legacy)" },
        { key: "dayosisi", label: "Dayosisi (jina au UUID)" },
        { key: "jimbo", label: "Jimbo (jina au UUID)" },
        { key: "tawi", label: "Tawi (jina au UUID)" },
        { key: "simu", label: "Simu" },
        { key: "email", label: "Email" },
        { key: "start_date", label: "Start date (yyyy-mm-dd)" },
        { key: "end_date", label: "End date (yyyy-mm-dd)" },
        { key: "term_status", label: "Term status (active/ended/suspended/pending)" },
        { key: "appointment_document_url", label: "Appointment document URL" },
        { key: "appointment_document_name", label: "Appointment document name" },
        { key: "appointment_document_path", label: "Appointment document path" },
        { key: "appointment_document_size", label: "Appointment document size (bytes)" },
        { key: "appointment_document_type", label: "Appointment document MIME type" },
        { key: "appointment_uploaded_at", label: "Appointment uploaded at (ISO datetime)" },
        { key: "status", label: "Status" },
      ],
      [["Muhimu: Jina, Cheo, Leadership level, na Assigned entity ni lazima."]]
    );
  }

  if (moduleKey === "fedha" && sub !== "Audit Trail") {
    return bundle(
      "fedha_miamala",
      "Blanki la Miamala ya Fedha",
      "Inalingana na fomu ya fedha: tarehe, aina, kategoria, kiasi, ngazi, dayosisi/jimbo/tawi, status.",
      [
        ID,
        { key: "tarehe", label: "Tarehe" },
        { key: "aina", label: "Aina" },
        { key: "kategoria", label: "Kategoria" },
        { key: "kiasi", label: "Kiasi (TZS)" },
        { key: "ngazi", label: "Ngazi" },
        { key: "dayosisi", label: "Dayosisi (jina, code au UUID)" },
        { key: "jimbo", label: "Jimbo (jina au UUID)" },
        { key: "tawi", label: "Tawi (jina au UUID)" },
        { key: "status", label: "Status" },
      ],
      [
        ["Aina: Mapato, Matumizi, Michango, au Nyingine."],
        ["Kiasi: unaweza kuandika 1,500,000 au 1500000."],
        ["Muhimu: Tarehe inahitajika."],
      ]
    );
  }

  if (moduleKey === "vyanzo_mapato") {
    return bundle(
      "vyanzo_mapato",
      "Blanki la Vyanzo vya Mapato",
      "Aina: «Mapato Halisi» au «Taarifa ya Msingi».",
      [
        ID,
        { key: "chanzo", label: "Chanzo" },
        { key: "category", label: "Category / Kundi" },
        { key: "subtitle", label: "Subtitle" },
        { key: "aina", label: "Aina" },
        { key: "maelezo", label: "Maelezo" },
        { key: "status", label: "Status" },
      ],
      [["Muhimu: Jina la chanzo linahitajika."]]
    );
  }

  if (moduleKey === "mapato_income") {
    return bundle(
      "mapato_income",
      "Blanki la Mapato / Income Management",
      "Safu hizi zinalingana na fomu kamili ya mstari wa mapato.",
      [
        ID,
        { key: "incomeCode", label: "Income Code" },
        { key: "sourceName", label: "Jina la Chanzo cha Mapato" },
        { key: "mainCategory", label: "Kundi Kuu" },
        { key: "subCategory", label: "Sub-Category" },
        { key: "churchLevel", label: "Ngazi ya Kanisa" },
        { key: "incomeType", label: "Aina ya Mapato" },
        { key: "frequency", label: "Frequency" },
        { key: "budgeted", label: "Budgeted?" },
        { key: "restrictedFund", label: "Restricted Fund?" },
        { key: "fundPurpose", label: "Fund Purpose" },
        { key: "collectionDate", label: "Collection Date" },
        { key: "serviceEventDate", label: "Service/Event Date" },
        { key: "collectorReceiver", label: "Collector / Receiver" },
        { key: "approvedBy", label: "Approved By" },
        { key: "receiptNo", label: "Receipt No" },
        { key: "transactionReference", label: "Transaction Reference" },
        { key: "amount", label: "Amount" },
        { key: "currency", label: "Currency" },
        { key: "status", label: "Status" },
        { key: "branchCenter", label: "Branch / Church Center" },
        { key: "dayosisi_id", label: "Dayosisi (UUID au jina)" },
        { key: "jimbo_id", label: "Jimbo (UUID au jina)" },
        { key: "tawi_id", label: "Tawi (UUID au jina)" },
        { key: "remarks", label: "Remarks / Maelezo" },
      ],
      [
        ["Income Code na Jina la Chanzo ni lazima."],
        ["Aina ya Mapato: Cash, Bank, Mobile Money, In-kind, Transfer."],
        ["Frequency: Daily, Weekly, Monthly, Quarterly, Annual, One-time."],
        ["Budgeted? / Restricted Fund?: Yes au No."],
        ["Dayosisi_id / Jimbo_id / Tawi_id: lazima kwa usambazaji sahihi wa remittance (Tawi → Jimbo → Dayosisi → KMK(T))."],
      ]
    );
  }

  return null;
}

/** Jedwali la familia — `church_families` / fomu ya ChurchFamiliesPanel. */
export function buildChurchFamilyExcelBundle(): PortalExcelFormBundle {
  return {
    templateBasename: "waumini_familia",
    specTitle: "Blanki la familia (church_families)",
    specSubtitle: "Familia zinaweza kuunganishwa na waumini baadaye.",
    columns: [
      ID,
      { key: "family_name", label: "Jina la familia" },
      { key: "dayosisi_id", label: "Dayosisi (jina, code au UUID)" },
      { key: "jimbo_name", label: "Jimbo (maandishi)" },
      { key: "tawi_name", label: "Tawi / kituo" },
      { key: "phone", label: "Simu" },
      { key: "email", label: "Barua pepe" },
      { key: "maelezo", label: "Maelezo" },
    ],
    instructionRows: [
      ...BASE_INSTRUCTIONS,
      ["Muhimu: Jina la familia ni lazima.", "Dayosisi: andika jina, code, au UUID kama kwenye Muundo."],
      ["Inahitaji Supabase kwa kuhifadhi na kupakia."],
    ],
  };
}

export function buildChurchMemberExcelBundle(mode: "list" | "baptism" | "status" | "profiles"): PortalExcelFormBundle {
  const modeHint: Record<typeof mode, string> = {
    list: "Orodha ya waumini — safu zote za fomu.",
    baptism: "Ubatizo — hakikisha tarehe ya ubatizo au Amebatizwa.",
    status: "Hali ya uanachama — tumia thamani za DB: active, visitor, transferred, deceased, suspended.",
    profiles: "Wasifu — barua pepe na tarehe ya kuzaliwa.",
  };
  return {
    templateBasename: `waumini_${mode}`,
    specTitle: "Blanki la waumini (church_members)",
    specSubtitle: modeHint[mode],
    columns: [
      ID,
      { key: "first_name", label: "Jina la kwanza" },
      { key: "last_name", label: "Jina la mwisho" },
      { key: "family_name", label: "Familia (jina au UUID)" },
      { key: "gender", label: "Jinsia (male / female / other)" },
      { key: "birth_date", label: "Tarehe ya kuzaliwa (yyyy-mm-dd)" },
      { key: "phone", label: "Simu" },
      { key: "email", label: "Barua pepe" },
      { key: "nida_number", label: "NIDA / Kitambulisho" },
      { key: "marital_status", label: "Hali ya ndoa" },
      { key: "occupation", label: "Kazi" },
      { key: "region_name", label: "Mkoa" },
      { key: "district_name", label: "Wilaya" },
      { key: "ward_street", label: "Kata / Mtaa" },
      {
        key: "membership_status",
        label: "Hali ya uanachama (active, visitor, …)",
      },
      { key: "baptism_date", label: "Tarehe ya ubatizo (yyyy-mm-dd)" },
      { key: "baptism_place", label: "Mahali pa ubatizo" },
      { key: "is_baptized", label: "Amebatizwa (Ndiyo / Hapana)" },
        { key: "member_number", label: "Nambari ya usajili" },
      { key: "ministry_segment", label: "Chama (none, ke, me, jvkmkt, jwkmkt)" },
      { key: "dayosisi_id", label: "Dayosisi (jina, code au UUID)" },
      { key: "jimbo_id", label: "Jimbo (jina au UUID)" },
      { key: "tawi_id", label: "Tawi (jina au UUID)" },
      { key: "jimbo_name", label: "Jimbo (maandishi — mbadala)" },
      { key: "tawi_name", label: "Tawi (maandishi — mbadala)" },
      { key: "jumuiya_name", label: "Jumuiya" },
      { key: "idara_name", label: "Idara" },
      { key: "huduma_name", label: "Huduma" },
      { key: "relation_to_head", label: "Uhusiano wa familia" },
      { key: "notes", label: "Maelezo" },
    ],
    instructionRows: [
      ...BASE_INSTRUCTIONS,
      ["Muhimu: Jina la kwanza na la mwisho ni lazima."],
      ["Familia: andika jina lililo kwenye orodha ya familia, au UUID wa familia.", "Dayosisi: jina, code, au UUID — kama ilivyo kwenye Muundo."],
      ["Hali ya uanachama: active, visitor, transferred, deceased, suspended (au maneno kama «Mgeni» kwa visitor)."],
      ["Amebatizwa: Ndiyo, Hapana, true, false, 1, 0."],
      ["Chama / ministry_segment: none, ke, me, jvkmkt, jwkmkt (au chama)."],
      ["Jimbo_id / Tawi_id: andika UUID au jina lililo kwenye Muundo — kwa usahihi wa takwimu."],
      ["Habarini za karibu (SMS) hazitumwi kiotomatiki wakati wa pakia wingi."],
    ],
  };
}

export function buildDomainEntityExcelBundle(
  moduleKey: string,
  submodule: string,
  contextKey?: string | null
): PortalExcelFormBundle {
  const sk = (contextKey ?? (submodule && submodule !== "Overview" && submodule !== "Muhtasari" ? submodule : "")).trim();
  const slug = `${moduleKey}_${sk || "all"}`.replace(/[^\w]+/g, "_").slice(0, 72);
  return {
    templateBasename: `kikoa_${slug}`,
    specTitle: `Blanki la rekodi za kikoa — ${moduleKey}`,
    specSubtitle:
      [sk ? `Submodule key: ${sk}` : "Submodule key: (tupu)", contextKey ? `Context: ${contextKey}` : ""]
        .filter(Boolean)
        .join(" · ") || "portal_domain_entities",
    columns: [
      ID,
      { key: "title", label: "Kichwa" },
      { key: "category", label: "Kundi" },
      { key: "reference_code", label: "Nambari / Ref" },
      { key: "event_date", label: "Tarehe" },
      { key: "details", label: "Maelezo" },
      { key: "status", label: "Status" },
    ],
    instructionRows: [
      ...BASE_INSTRUCTIONS,
      [`module_key itatumika: ${moduleKey}`, sk ? `submodule_key itatumika: ${sk}` : "submodule_key itatolewa kwa muktadha wa skrini."],
      ["Muhimu: Kichwa ni lazima.", "Tarehe: yyyy-mm-dd ikiwa ipo.", "Status: Active, Pending, Inactive, Archived, Needs Review."],
      ["Inahitaji Supabase kwa kuhifadhi na kupakia."],
    ],
  };
}

export const GENERIC_MODULE_EXCEL: PortalExcelFormBundle = {
  templateBasename: "moduli_jumla",
  specTitle: "Blanki la moduli (jumla)",
  specSubtitle: "Kichwa, kategoria, hali, maelezo — kama fomu ya moduli isiyojulikana.",
  columns: [
    ID,
    { key: "title", label: "Kichwa" },
    { key: "category", label: "Kategoria" },
    {
      key: "status",
      label: "Hali",
    },
    { key: "notes", label: "Maelezo" },
  ],
  instructionRows: [
    ...BASE_INSTRUCTIONS,
    ["Muhimu: Kichwa ni lazima; hakikisha hakuna kichwa kinachorudia katika moduli hii."],
  ],
};
