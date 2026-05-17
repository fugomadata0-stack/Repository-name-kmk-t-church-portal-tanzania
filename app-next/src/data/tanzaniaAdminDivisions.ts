/**
 * Mikoa, wilaya, na sampuli za kata — Tanzania (bara + visiwa).
 * Ikiwa kata haipo kwenye orodha, tumia "Ingiza manually".
 */

export const TANZANIA_MIKOA = [
  "Arusha",
  "Dar es Salaam",
  "Dodoma",
  "Geita",
  "Iringa",
  "Kagera",
  "Katavi",
  "Kigoma",
  "Kilimanjaro",
  "Lindi",
  "Manyara",
  "Mara",
  "Mbeya",
  "Morogoro",
  "Mtwara",
  "Mwanza",
  "Njombe",
  "Pemba Kaskazini",
  "Pemba Kusini",
  "Pwani",
  "Rukwa",
  "Ruvuma",
  "Shinyanga",
  "Simiyu",
  "Singida",
  "Songwe",
  "Tabora",
  "Tanga",
  "Unguja Kaskazini",
  "Unguja Kusini",
  "Unguja Mjini Magharibi",
] as const;

export type TanzaniaMkoa = (typeof TANZANIA_MIKOA)[number];

/** Wilaya kwa kila mkoa (orodha ya utawala — kamili kwa matumizi ya fomu). */
export const TANZANIA_DISTRICTS_BY_MKOA: Record<string, readonly string[]> = {
  Arusha: ["Arusha", "Arumeru", "Karatu", "Longido", "Meru", "Monduli", "Ngorongoro"],
  "Dar es Salaam": ["Ilala", "Kinondoni", "Temeke", "Ubungo", "Kigamboni"],
  Dodoma: ["Bahi", "Chamwino", "Chemba", "Dodoma", "Kondoa", "Kongwa", "Mpwapwa"],
  Geita: ["Bukombe", "Chato", "Geita", "Mbogwe", "Nyang'hwale"],
  Iringa: ["Iringa", "Kilolo", "Mafinga", "Mufindi"],
  Kagera: ["Biharamulo", "Bukoba", "Karagwe", "Kyerwa", "Missenyi", "Muleba", "Ngara"],
  Katavi: ["Mlele", "Mpanda", "Nsimbo"],
  Kigoma: ["Buhigwe", "Kakonko", "Kasulu", "Kibondo", "Kigoma", "Uvinza"],
  Kilimanjaro: ["Hai", "Moshi", "Mwanga", "Rombo", "Same", "Siha"],
  Lindi: ["Kilwa", "Lindi", "Liwale", "Nachingwea", "Ruangwa"],
  Manyara: ["Babati", "Hanang", "Kiteto", "Mbulu", "Simanjiro"],
  Mara: ["Bunda", "Butiama", "Musoma", "Rorya", "Serengeti", "Tarime"],
  Mbeya: ["Chunya", "Kyela", "Mbarali", "Mbeya", "Rungwe"],
  Morogoro: ["Gairo", "Kilombero", "Kilosa", "Morogoro", "Mvomero", "Ulanga"],
  Mtwara: ["Masanani", "Mtwara", "Nanyumbu", "Newala", "Tandahimba"],
  Mwanza: ["Ilemela", "Kwimba", "Magu", "Misungwi", "Nyamagana", "Sengerema", "Ukerewe"],
  Njombe: ["Ludewa", "Makete", "Njombe", "Wanging'ombe"],
  "Pemba Kaskazini": ["Micheweni", "Wete"],
  "Pemba Kusini": ["Chake Chake", "Mkoani"],
  Pwani: ["Bagamoyo", "Kibaha", "Kisarawe", "Mafia", "Mkuranga", "Rufiji"],
  Rukwa: ["Kalambo", "Nkasi", "Sumbawanga"],
  Ruvuma: ["Mbinga", "Namtumbo", "Nyasa", "Songea", "Tunduru"],
  Shinyanga: ["Kahama", "Kishapu", "Shinyanga"],
  Simiyu: ["Bariadi", "Busega", "Itilima", "Maswa", "Meatu"],
  Singida: ["Ikungi", "Iramba", "Manyoni", "Mkalama", "Singida"],
  Songwe: ["Ileje", "Mbozi", "Momba", "Songwe"],
  Tabora: ["Igunga", "Kaliua", "Nzega", "Sikonge", "Tabora", "Urambo", "Uyui"],
  Tanga: ["Handeni", "Kilindi", "Korogwe", "Lushoto", "Mkinga", "Muheza", "Pangani", "Tanga"],
  "Unguja Kaskazini": ["Kaskazini A", "Kaskazini B"],
  "Unguja Kusini": ["Kusini", "Unguja Kati"],
  "Unguja Mjini Magharibi": ["Magharibi A", "Magharibi B", "Mjini"],
};

/** Sampuli za kata kwa wilaya zinazotumika mara kwa mara (kamili zaidi zinaweza ongezwa). */
export const TANZANIA_KATA_BY_MKOA_WILAYA: Record<string, readonly string[]> = {
  "Mara|Musoma": ["Kamunyonge", "Mwigobero", "Makoko", "Bweri", "Kitaji"],
  "Mara|Tarime": ["Tarime Mjini", "Nyansincha", "Nyamwaga"],
  "Dar es Salaam|Kinondoni": ["Kinondoni", "Msasani", "Mikocheni", "Oyster Bay"],
  "Dar es Salaam|Ilala": ["Kivukoni", "Gerezani", "Buguruni", "Ilala"],
  "Dar es Salaam|Temeke": ["Temeke", "Mbagala", "Tandika"],
  "Dodoma|Dodoma": ["Majengo", "Kikuyu", "Chamwino", "Ipagala"],
  "Arusha|Arusha": ["Sekei", "Elerai", "Themi", "Kaloleni"],
  "Kilimanjaro|Moshi": ["Moshi Mjini", "Rau", "Mawenzi"],
  "Mwanza|Nyamagana": ["Pamba", "Mirongo", "Igoma"],
};

export function getDistrictsForMkoa(mkoa: string): string[] {
  const key = mkoa.trim();
  if (!key) return [];
  const list = TANZANIA_DISTRICTS_BY_MKOA[key];
  if (list) return [...list];
  const hit = Object.keys(TANZANIA_DISTRICTS_BY_MKOA).find((k) => k.toLowerCase() === key.toLowerCase());
  return hit ? [...TANZANIA_DISTRICTS_BY_MKOA[hit]] : [];
}

export function getKataForWilaya(mkoa: string, wilaya: string): string[] {
  const key = `${mkoa.trim()}|${wilaya.trim()}`;
  const list = TANZANIA_KATA_BY_MKOA_WILAYA[key];
  if (list) return [...list];
  const alt = Object.keys(TANZANIA_KATA_BY_MKOA_WILAYA).find(
    (k) => k.toLowerCase() === key.toLowerCase(),
  );
  return alt ? [...TANZANIA_KATA_BY_MKOA_WILAYA[alt]] : [];
}

export function matchMkoaFromText(text: string): string | null {
  const hay = text.trim().toLowerCase();
  if (!hay) return null;
  return TANZANIA_MIKOA.find((m) => m.toLowerCase() === hay) ?? null;
}
