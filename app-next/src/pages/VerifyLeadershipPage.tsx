import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "../lib/supabaseClient";
import { KMKT_PUBLIC_PORTAL_URL, formatTawiBranchCredentialSerial } from "../lib/kmktExecutiveInstitution";
import type { NationalLeadershipRoleKey } from "../services/nationalLeadershipService";
import {
  OFFICIAL_CERT_STATUS_LABELS,
  fetchPublicOfficialCertificateVerifyOptional,
  type PublicOfficialCertificateVerify,
} from "../services/leadershipOfficialCertificateService";

const NATIONAL_KEYS = new Set<string>(["askofu_mkuu", "katibu_mkuu", "naibu_katibu_mkuu", "mhasibu_mkuu"]);

type NationalRow = {
  role_key: string;
  display_title_sw: string;
  full_name: string;
  phone: string;
  email: string;
  status: string;
  leadership_level?: string;
};

type ChurchRow = {
  id: string;
  jina: string;
  full_name: string;
  cheo: string;
  leadership_level: string;
  status: string;
  photo_url: string | null;
};

type TawiVerifyRow = {
  id: string;
  jina: string;
  branch_code: string | null;
  aina: string;
  status: string;
  verification_status: string | null;
  verified_at?: string | null;
  mkoa: string | null;
  wilaya: string | null;
  kata: string | null;
  mtaa: string | null;
  founded_date: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  kiongozi: string | null;
  simu: string | null;
  church_jimbo: { jina?: string; dayosisi?: { jina?: string } } | null;
};

function tawiRegistryVerificationUi(raw: string | null | undefined): {
  label: string;
  pillClass: string;
  footer: string;
} {
  const v = String(raw ?? "unverified").trim().toLowerCase();
  if (v === "verified") {
    return {
      label: "Imethibitishwa",
      pillClass: "bg-emerald-100 text-emerald-900 ring-emerald-300/60",
      footer: "Sajili ya tawi imethibitishwa na kanisa (KMK(T)) — data hii inalingana na mfumo rasmi.",
    };
  }
  if (v === "pending_review") {
    return {
      label: "Inasubiri uhakiki",
      pillClass: "bg-amber-100 text-amber-950 ring-amber-400/50",
      footer:
        "Sajili inasubiri uhakiki na viongozi wenye ruhusa ndani ya KMT Portal (Muundo → Matawi / Vituo au Dashibodi ya vibali).",
    };
  }
  return {
    label: "Haijathibitishwa",
    pillClass: "bg-slate-100 text-slate-800 ring-slate-300/60",
    footer: "Sajili ya tawi bado haijathibitishwa kwa kiwango cha kanisa — thibitisho la umma linaonyesha hali iliyosajiliwa.",
  };
}

function officialCertStatusUi(status: string | undefined): { label: string; pillClass: string; trusted: boolean } {
  const s = String(status ?? "").trim().toLowerCase();
  const meta = OFFICIAL_CERT_STATUS_LABELS[s as keyof typeof OFFICIAL_CERT_STATUS_LABELS];
  const label = meta?.sw ?? status ?? "—";
  if (s === "approved" || s === "verified") {
    return { label, pillClass: "bg-emerald-100 text-emerald-900 ring-emerald-300/60", trusted: true };
  }
  if (s === "pending") {
    return { label, pillClass: "bg-amber-100 text-amber-950 ring-amber-400/50", trusted: false };
  }
  if (s === "rejected" || s === "archived") {
    return { label, pillClass: "bg-red-100 text-red-900 ring-red-300/50", trusted: false };
  }
  return { label, pillClass: "bg-slate-100 text-slate-800 ring-slate-300/60", trusted: false };
}

export function VerifyLeadershipPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [national, setNational] = useState<NationalRow | null>(null);
  const [church, setChurch] = useState<ChurchRow | null>(null);
  const [tawi, setTawi] = useState<TawiVerifyRow | null>(null);
  const [officialCert, setOfficialCert] = useState<PublicOfficialCertificateVerify | null>(null);

  const params = useMemo(() => new URLSearchParams(typeof window !== "undefined" ? window.location.search : ""), []);

  const nid = (params.get("nid") || "").trim().toLowerCase();
  const vid = (params.get("vid") || "").trim();
  const tid = (params.get("tid") || "").trim();
  const vrf = (params.get("vrf") || "").trim();

  useEffect(() => {
    let stop = false;
    void (async () => {
      setNational(null);
      setChurch(null);
      setTawi(null);
      setOfficialCert(null);
      setErr("");
      setLoading(true);
      const c = getSupabase();
      if (!c) {
        setErr("Mazingira ya Supabase hayajasanidiwa.");
        setLoading(false);
        return;
      }
      if (vrf) {
        const row = await fetchPublicOfficialCertificateVerifyOptional(vrf);
        if (stop) return;
        if (!row.found) {
          setErr("Hakuna cheti rasmi kinacholingana na nambari hii ya uhakiki.");
        } else {
          setOfficialCert(row);
        }
        setLoading(false);
        return;
      }
      if (nid && NATIONAL_KEYS.has(nid)) {
        const { data, error } = await c
          .from("national_leadership_profiles")
          .select("role_key, display_title_sw, full_name, phone, email, status")
          .eq("role_key", nid as NationalLeadershipRoleKey)
          .maybeSingle();
        if (stop) return;
        if (error) setErr("Imeshindikana kusoma rekodi ya kitaifa.");
        else setNational((data as NationalRow) ?? null);
        setLoading(false);
        return;
      }
      if (vid && /^[0-9a-f-]{36}$/i.test(vid)) {
        const { data, error } = await c
          .from("church_viongozi")
          .select("id, jina, full_name, cheo, leadership_level, status, photo_url")
          .eq("id", vid)
          .maybeSingle();
        if (stop) return;
        if (error) setErr("Imeshindikana kusoma rekodi ya kiongozi.");
        else setChurch((data as ChurchRow) ?? null);
        setLoading(false);
        return;
      }
      if (tid && /^[0-9a-f-]{36}$/i.test(tid)) {
        const { data: snap, error: snapErr } = await c.rpc("portal_public_church_tawi_snapshot", { p_id: tid });
        if (stop) return;
        const snapObj = snap as Record<string, unknown> | null;
        if (!snapErr && snapObj && typeof snapObj.id === "string") {
          setTawi(snapObj as unknown as TawiVerifyRow);
          setLoading(false);
          return;
        }
        const { data, error } = await c
          .from("church_tawi")
          .select(
            "id, jina, branch_code, aina, status, verification_status, verified_at, mkoa, wilaya, kata, mtaa, founded_date, gps_lat, gps_lng, kiongozi, simu, church_jimbo ( jina, dayosisi ( jina ) )",
          )
          .eq("id", tid)
          .maybeSingle();
        if (stop) return;
        if (error) setErr("Imeshindikana kusoma rekodi ya tawi.");
        else setTawi((data as TawiVerifyRow) ?? null);
        setLoading(false);
        return;
      }
      setErr("Ombi si sahihi. Tumia ?vrf=KMK-VRF-…, ?nid=…, ?vid=UUID ya kiongozi, au ?tid=UUID ya tawi.");
      setLoading(false);
    })();
    return () => {
      stop = true;
    };
  }, [nid, vid, tid, vrf]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071832] via-[#0B1F4D] to-[#123C69] p-4 sm:p-8">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 rounded-2xl border border-amber-400/40 bg-white/10 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200/95 shadow-lg backdrop-blur">
          KMK(T) · Uhakiki wa umma (uongozi na tawi)
        </div>
        <div className="overflow-hidden rounded-3xl border border-white/15 bg-white/95 shadow-2xl ring-1 ring-amber-300/30 backdrop-blur-md">
          <div className="bg-gradient-to-r from-[#0B1F4D] to-[#123C69] px-6 py-5 text-white">
            <h1 className="font-kmkt-display text-xl font-bold tracking-tight sm:text-2xl">Uhakiki wa uongozi na tawi</h1>
            <p className="mt-1 text-sm text-blue-100/90">Thibitisho la umma — data kutoka mfumo rasmi (KMK(T) Portal)</p>
          </div>
          <div className="space-y-4 px-6 py-6 text-slate-800">
            {loading ? <p className="text-sm text-slate-600">Inapakia…</p> : null}
            {!loading && err ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{err}</p>
            ) : null}
            {!loading && !err && officialCert?.found ? (
              <div className="space-y-2 text-sm">
                {(() => {
                  const reg = officialCertStatusUi(officialCert.status);
                  return (
                    <>
                      <p className="text-xs font-semibold uppercase text-slate-500">Cheti rasmi cha uongozi</p>
                      <p>
                        <span className="font-semibold text-[#0B1F4D]">Mwenye cheti:</span>{" "}
                        {officialCert.holderFullName || "—"}
                      </p>
                      <p>
                        <span className="font-semibold text-[#0B1F4D]">Cheo:</span> {officialCert.positionTitle || "—"}
                      </p>
                      <p>
                        <span className="font-semibold text-[#0B1F4D]">Ngazi / eneo:</span>{" "}
                        {officialCert.hierarchyLabel || "—"}
                      </p>
                      <p>
                        <span className="font-semibold text-[#0B1F4D]">Nambari ya cheti:</span>{" "}
                        <code className="rounded bg-slate-100 px-1 text-xs">{officialCert.certificateNumber || "—"}</code>
                      </p>
                      <p>
                        <span className="font-semibold text-[#0B1F4D]">Nambari ya uhakiki:</span>{" "}
                        <code className="rounded bg-slate-100 px-1 text-[10px]">{officialCert.verificationId || "—"}</code>
                      </p>
                      {officialCert.issuedAt ? (
                        <p>
                          <span className="font-semibold text-[#0B1F4D]">Imetolewa:</span>{" "}
                          {new Date(officialCert.issuedAt).toLocaleString("sw-TZ")}
                        </p>
                      ) : null}
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-[#0B1F4D]">Hali:</span>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${reg.pillClass}`}>
                          {reg.label}
                        </span>
                      </p>
                      <p
                        className={`mt-3 flex flex-col gap-1 rounded-xl border border-white/60 px-3 py-2 text-xs font-medium ring-1 ${reg.pillClass}`}
                      >
                        <span className="font-bold">{reg.trusted ? "Cheti kinathibitishwa na KMK(T)" : "Angalia hali ya cheti"}</span>
                        <span className="text-[11px] font-normal leading-snug opacity-95">
                          {reg.trusted
                            ? "Rekodi hii ipo katika sajili rasmi ya vyeti vya uongozi."
                            : "Cheti bado kinaweza kuwa kinasubiri idhini au halijaidhinishwa."}
                        </span>
                      </p>
                    </>
                  );
                })()}
              </div>
            ) : null}
            {!loading && !err && national ? (
              <div className="space-y-2 text-sm">
                <p className="text-xs font-semibold uppercase text-slate-500">Uongozi wa kitaifa</p>
                <p>
                  <span className="font-semibold text-[#0B1F4D]">Jina:</span> {national.full_name || "—"}
                </p>
                <p>
                  <span className="font-semibold text-[#0B1F4D]">Cheo:</span> {national.display_title_sw || "—"}
                </p>
                <p>
                  <span className="font-semibold text-[#0B1F4D]">Hali:</span> {national.status || "—"}
                </p>
                <p>
                  <span className="font-semibold text-[#0B1F4D]">Simu:</span> {national.phone || "—"}
                </p>
                <p>
                  <span className="font-semibold text-[#0B1F4D]">Barua pepe:</span> {national.email || "—"}
                </p>
                <p className="mt-4 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
                  Rekodi iliyothibitishwa — KMK(T)
                </p>
              </div>
            ) : null}
            {!loading && !err && church ? (
              <div className="space-y-2 text-sm">
                <p className="text-xs font-semibold uppercase text-slate-500">Kiongozi wa kanisa</p>
                <p>
                  <span className="font-semibold text-[#0B1F4D]">Jina:</span> {church.full_name || church.jina || "—"}
                </p>
                <p>
                  <span className="font-semibold text-[#0B1F4D]">Cheo:</span> {church.cheo || "—"}
                </p>
                <p>
                  <span className="font-semibold text-[#0B1F4D]">Ngazi:</span> {church.leadership_level || "—"}
                </p>
                <p>
                  <span className="font-semibold text-[#0B1F4D]">Hali:</span> {church.status || "—"}
                </p>
                <p className="mt-4 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
                  Rekodi iliyothibitishwa — KMK(T)
                </p>
              </div>
            ) : null}
            {!loading && !err && tawi ? (
              <div className="space-y-2 text-sm">
                {(() => {
                  const reg = tawiRegistryVerificationUi(tawi.verification_status);
                  return (
                    <>
                      <p className="text-xs font-semibold uppercase text-slate-500">Tawi / kituo</p>
                      <p>
                        <span className="font-semibold text-[#0B1F4D]">Jina:</span> {tawi.jina || "—"}
                      </p>
                      <p>
                        <span className="font-semibold text-[#0B1F4D]">Msimbo wa tawi:</span> {tawi.branch_code?.trim() || "—"}
                      </p>
                      <p>
                        <span className="font-semibold text-[#0B1F4D]">Aina:</span> {tawi.aina || "—"}
                      </p>
                      <p>
                        <span className="font-semibold text-[#0B1F4D]">Dayosisi:</span>{" "}
                        {tawi.church_jimbo?.dayosisi?.jina?.trim() || "—"}
                      </p>
                      <p>
                        <span className="font-semibold text-[#0B1F4D]">Jimbo:</span> {tawi.church_jimbo?.jina?.trim() || "—"}
                      </p>
                      <p>
                        <span className="font-semibold text-[#0B1F4D]">Mkoa / Wilaya:</span>{" "}
                        {[tawi.mkoa, tawi.wilaya].filter(Boolean).join(" · ") || "—"}
                      </p>
                      <p>
                        <span className="font-semibold text-[#0B1F4D]">Hali ya operesheni:</span> {tawi.status || "—"}
                      </p>
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-[#0B1F4D]">Uhakiki wa sajili:</span>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${reg.pillClass}`}>
                          {reg.label}
                        </span>
                        <span className="text-[11px] text-slate-500">({String(tawi.verification_status ?? "unverified").trim() || "—"})</span>
                      </p>
                      {tawi.verified_at ? (
                        <p>
                          <span className="font-semibold text-[#0B1F4D]">Imethibitishwa tarehe:</span>{" "}
                          {new Date(tawi.verified_at).toLocaleString("sw-TZ")}
                        </p>
                      ) : null}
                      <p>
                        <span className="font-semibold text-[#0B1F4D]">Nambari ya cheti:</span>{" "}
                        <code className="rounded bg-slate-100 px-1 text-xs">{formatTawiBranchCredentialSerial(tawi.id)}</code>
                      </p>
                      <p className={`mt-3 flex flex-col gap-1 rounded-xl border border-white/60 px-3 py-2 text-xs font-medium ring-1 ${reg.pillClass}`}>
                        <span className="font-bold">{reg.label}</span>
                        <span className="text-[11px] font-normal leading-snug opacity-95">{reg.footer}</span>
                      </p>
                    </>
                  );
                })()}
              </div>
            ) : null}
            {!loading && !err && !national && !church && !tawi && !officialCert?.found ? (
              <p className="text-sm text-slate-600">Hakuna rekodi inayolingana na kiungo hiki.</p>
            ) : null}
            <div className="border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
              <a className="font-semibold text-blue-800 underline" href={KMKT_PUBLIC_PORTAL_URL}>
                Fungua tovuti rasmi ya portal
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
