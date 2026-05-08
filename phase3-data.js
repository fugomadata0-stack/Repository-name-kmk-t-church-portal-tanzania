export const modules = [
  "Dashibodi Kuu",
  "Muundo wa Kanisa / Church Structure",
  "Usimamizi wa Dayosisi",
  "Usimamizi wa Majimbo",
  "Usimamizi wa Matawi",
  "Viongozi wa Kanisa",
  "Waumini",
  "Idara & Huduma",
  "Huduma ya Kichungaji",
  "Wageni & Follow-up",
  "Ratiba za Huduma & Volunteers",
  "Mali za Kanisa / Assets Register",
  "Miradi & Maendeleo",
  "Elimu & Mafunzo",
  "National Calendar / Kalenda Kuu",
  "AI Smart Assistant / Msaidizi Mwerevu",
  "PHASE 30 Unified Platform",
  "Matukio & Makambi",
  "Payments & Donation Gateway",
  "Mahudhurio",
  "Fedha & Michango",
  "Vyanzo vya Mapato",
  "Mahubiri & Media",
  "Mawasiliano",
  "Ripoti",
  "Mipangilio",
  "Usalama",
  "Omba Ruhusa ya Juu",
  "Usajili wa Mialiko na Upandishaji (Admin)",
  "Maombi ya Usajili (Approval)",
  "Usimamizi wa Watumiaji wa Mfumo",
  "Nyaraka Rasmi",
  "Afya ya Mfumo",
  "Logs",
];

export const kpis = [
  ["Jumla ya Dayosisi", "26"],
  ["Jumla ya Majimbo", "128"],
  ["Jumla ya Matawi", "642"],
  ["Jumla ya Waumini", "98,450"],
  ["Jumla ya Viongozi", "1,845"],
  ["Jumla Vyanzo vya Mapato", "0"],
  ["Makambi Hai", "14"],
  ["Michango ya Mwezi", "TZS 184M"],
  ["Mahudhurio Leo", "12,904"],
  ["Media Files", "3,221"],
  ["Watumiaji Hai", "846"],
];

export const quickActions = [
  "Ongeza Dayosisi",
  "Ongeza Jimbo",
  "Ongeza Tawi",
  "Ongeza Muumini",
  "Ongeza Kiongozi",
  "Ongeza Chanzo cha Mapato",
  "Unda Kambi",
  "Rekodi Mchango",
  "Rekodi Mahudhurio",
  "Pakia Media",
  "Tuma Taarifa",
  "Add Category",
  "Add Type",
  "Add Custom Field",
  "Add Custom Section",
];

export const verses = [
  "“The Lord is my shepherd; I shall not want.” — Psalm 23:1",
  "“I can do all things through Christ.” — Philippians 4:13",
  "“Be strong and courageous.” — Joshua 1:9",
];

export const activitySeed = [
  { tarehe: "26 Apr 2026", mtumiaji: "Admin Mkuu", module: "Dayosisi", action: "Add", desc: "Ameongeza Dayosisi ya Kigoma", status: "ok" },
  { tarehe: "26 Apr 2026", mtumiaji: "Finance Officer", module: "Michango", action: "Edit", desc: "Amesasisha rekodi ya mchango", status: "warn" },
  { tarehe: "25 Apr 2026", mtumiaji: "Media Admin", module: "Mahubiri & Media", action: "Upload", desc: "Video mpya imepakiwa", status: "ok" },
  { tarehe: "25 Apr 2026", mtumiaji: "Mchungaji", module: "Mahudhurio", action: "Record", desc: "Mahudhurio ya ibada ya Jumapili", status: "ok" },
];

export const notificationsSeed = [
  { title: "Kambi ya Vijana Taifa", type: "Event", priority: "High", target: "admin", date: "26 Apr 2026", status: "Unread" },
  { title: "Report ya Michango", type: "Finance", priority: "Medium", target: "finance_officer", date: "26 Apr 2026", status: "Unread" },
  { title: "Uthibitisho wa Viongozi", type: "Leadership", priority: "Low", target: "askofu_dayosisi", date: "25 Apr 2026", status: "Read" },
];
