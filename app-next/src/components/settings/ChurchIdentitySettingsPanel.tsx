import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePortal } from "../../context/PortalContext";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import { uploadSitePublicAsset } from "../../lib/siteAssetsUpload";
import { notifyOfficialPortalSave } from "../../lib/portalDraftRecovery";
import type { ChurchIdentityRow } from "../../services/settingsTablesService";
import {
  DEFAULT_CHURCH_WEBSITE_URL,
  emptyChurchIdentity,
  fetchChurchIdentity,
  saveChurchIdentity,
} from "../../services/settingsTablesService";
import {
  emptyMasterSettings,
  fetchMasterSettingsOptional,
  saveMasterSettings,
  validateEmail,
  validateHexColor,
} from "../../services/masterSettingsService";
import { fetchNationalLeadershipProfilesOptional, nationalLeadershipDisplayTitle } from "../../services/nationalLeadershipService";
import { ResponsiveLazyImage } from "../common/ResponsiveLazyImage";
import { SettingsSupabaseBanner } from "./SettingsSupabaseBanner";

const empty = emptyChurchIdentity();
const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon";
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

function sanitizeEmail(value: string): string {
  return value.trim().replace(/^mailt:/i, "mailto:").replace(/^mailto:/i, "");
}

function mailtoHref(value: string): string {
  const email = sanitizeEmail(value);
  return email ? `mailto:${email}` : "";
}

function normalizeUrl(value: string, fallback = ""): string {
  const v = value.trim();
  if (!v) return fallback;
  if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
  if (v.includes("@")) return `mailto:${v}`;
  return `https://${v}`;
}

function richLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function imageDataUrl(url: string): Promise<string | null> {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const res = await fetch(trimmed, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("image"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function ChurchIdentitySettingsPanel() {
  const { pushToast, reportError, role, saveSite, saveAbout } = usePortal();
  const canEdit = role === "super_admin" || role === "chief_admin";
  const [form, setForm] = useState<Omit<ChurchIdentityRow, "id">>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const contactSummary = useMemo(
    () => [
      form.main_phone.trim(),
      sanitizeEmail(form.main_email),
      normalizeUrl(form.website_url, DEFAULT_CHURCH_WEBSITE_URL),
      form.headquarters.trim(),
    ].filter(Boolean),
    [form.headquarters, form.main_email, form.main_phone, form.website_url]
  );

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const row = await fetchChurchIdentity();
      if (row) setForm({ ...empty, ...row, main_email: sanitizeEmail(row.main_email) });
      else setForm(empty);
    } catch (e) {
      reportError(e, "Utambulisho wa kanisa — pakua");
      setForm(empty);
    } finally {
      setLoading(false);
    }
  }, [reportError]);

  useEffect(() => {
    void load();
  }, [load]);

  function update<K extends keyof Omit<ChurchIdentityRow, "id">>(key: K, value: Omit<ChurchIdentityRow, "id">[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): string | null {
    if (!form.official_church_name.trim()) return "Jina rasmi la kanisa linahitajika.";
    if (!validateEmail(sanitizeEmail(form.main_email))) return "Barua pepe si sahihi.";
    if (![form.primary_color, form.secondary_color, form.accent_color].every(validateHexColor)) {
      return "Rangi za branding lazima ziwe HEX (#RRGGBB).";
    }
    return null;
  }

  async function syncGlobalIdentity(saved: ChurchIdentityRow) {
    const website = normalizeUrl(saved.website_url, DEFAULT_CHURCH_WEBSITE_URL);
    const email = sanitizeEmail(saved.main_email);
    await Promise.allSettled([
      saveSite({
        meta_title: saved.official_church_name,
        meta_description: [saved.vision, saved.mission].filter(Boolean).join(" "),
        canonical_base_url: website,
        favicon_url: saved.favicon_url,
        hero_image_url: saved.cover_image_url,
        social_links: {
          whatsapp: normalizeUrl(saved.whatsapp_url),
          facebook: normalizeUrl(saved.facebook_url),
          youtube: normalizeUrl(saved.youtube_url),
          instagram: normalizeUrl(saved.instagram_url),
          twitter_x: "",
          email_public: email,
        },
      }),
      saveAbout({
        church_name: saved.official_church_name,
        abbreviation: "KMK(T)",
        motto: saved.vision,
        mission: saved.mission,
        vision: saved.vision,
        core_values: saved.core_values,
        headquarters: saved.headquarters,
        contacts: [saved.main_phone, email, website].filter(Boolean).join(" · "),
        logo_url: saved.logo_url,
        hero_image_url: saved.cover_image_url,
        status: "active",
        published: true,
      }),
      (async () => {
        const current = (await fetchMasterSettingsOptional()) ?? emptyMasterSettings();
        await saveMasterSettings({
          ...current,
          identity: {
            ...current.identity,
            official_name: saved.official_church_name,
            short_name: "KMK(T)",
            address: [saved.postal_address, saved.region, saved.district].filter(Boolean).join(", "),
            phone: saved.main_phone,
            email,
            website,
            country: saved.country,
          },
          theme: {
            ...current.theme,
            logo_url: saved.logo_url,
            favicon_url: saved.favicon_url,
            primary_color: saved.primary_color,
            secondary_color: saved.secondary_color,
            accent_color: saved.accent_color,
          },
        });
      })(),
    ]);
  }

  async function onUpload(key: keyof Omit<ChurchIdentityRow, "id">, path: string, file: File | null) {
    if (!file || !canEdit) return;
    if (!file.type.startsWith("image/")) {
      pushToast("Tumia faili ya picha pekee.", "error");
      return;
    }
    if (file.size > MAX_UPLOAD_SIZE) {
      pushToast("Faili ni kubwa sana. Kikomo ni 5MB.", "error");
      return;
    }
    setUploadingKey(String(key));
    try {
      const url = await uploadSitePublicAsset(path, file);
      setForm((prev) => ({ ...prev, [key]: url }));
      pushToast("Picha imepakiwa.", "success");
    } catch (err) {
      reportError(err, "Church Identity — upload");
    } finally {
      setUploadingKey(null);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) {
      pushToast("Ni chief_admin au super_admin pekee wanaoweza kuhariri Church Identity.", "error");
      return;
    }
    const error = validate();
    if (error) {
      pushToast(error, "error");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveChurchIdentity({
        ...form,
        main_email: sanitizeEmail(form.main_email),
        website_url: normalizeUrl(form.website_url, DEFAULT_CHURCH_WEBSITE_URL),
        facebook_url: normalizeUrl(form.facebook_url),
        youtube_url: normalizeUrl(form.youtube_url),
        instagram_url: normalizeUrl(form.instagram_url),
        whatsapp_url: normalizeUrl(form.whatsapp_url),
      });
      setForm({ ...empty, ...saved });
      await syncGlobalIdentity(saved);
      notifyOfficialPortalSave();
      pushToast("Utambulisho wa kanisa umehifadhiwa na kusawazishwa portal-wide.", "success");
    } catch (err) {
      reportError(err, "Utambulisho wa kanisa — hifadhi");
    } finally {
      setSaving(false);
    }
  }

  async function exportIdentityPdf() {
    const [{ jsPDF }] = await Promise.all([import("jspdf")]);
    const nationalRows = await fetchNationalLeadershipProfilesOptional();
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const navy = form.primary_color || "#0B1F3A";
    const blue = form.secondary_color || "#123C69";
    const gold = form.accent_color || "#D4AF37";
    const publicUrl =
      typeof window !== "undefined" && window.location?.origin?.trim()
        ? window.location.origin.trim()
        : (() => {
            const u = normalizeUrl(form.website_url, DEFAULT_CHURCH_WEBSITE_URL).replace(/^mailto:/i, "").replace(/\/$/, "");
            return u && !u.includes("@") ? u : DEFAULT_CHURCH_WEBSITE_URL;
          })();
    const margin = 15;
    let y = 14;

    const hexToRgb = (hex: string, fallback: [number, number, number]): [number, number, number] => {
      const v = hex.trim();
      if (!/^#[0-9A-Fa-f]{6}$/.test(v)) return fallback;
      return [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16)];
    };
    const navyRgb = hexToRgb(navy, [11, 31, 58]);
    const blueRgb = hexToRgb(blue, [18, 60, 105]);
    const goldRgb = hexToRgb(gold, [212, 175, 55]);
    const emeraldRgb: [number, number, number] = [16, 129, 96];

    const addFooter = () => {
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i += 1) {
        doc.setPage(i);
        doc.setFillColor(...navyRgb);
        doc.rect(0, pageHeight - 15, pageWidth, 15, "F");
        doc.setFillColor(...goldRgb);
        doc.rect(0, pageHeight - 15, pageWidth, 1.2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.text(`Generated by KMT Portal · ${new Date().toLocaleString("sw-TZ")}`, margin, pageHeight - 5.5);
        doc.text(`Ukurasa ${i} / ${pages}`, pageWidth / 2, pageHeight - 5.5, { align: "center" });
        doc.text("© KMK(T) Tanzania", pageWidth - margin, pageHeight - 5.5, { align: "right" });
      }
    };

    const ensurePage = (needed = 28) => {
      if (y + needed <= pageHeight - 22) return;
      doc.addPage();
      y = 18;
    };

    const sectionTitle = (title: string) => {
      ensurePage(18);
      doc.setFillColor(...navyRgb);
      doc.roundedRect(margin, y, pageWidth - margin * 2, 9, 2, 2, "F");
      doc.setFillColor(...goldRgb);
      doc.rect(margin, y + 8.2, pageWidth - margin * 2, 0.8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(title.toUpperCase(), pageWidth / 2, y + 6, { align: "center" });
      y += 14;
    };

    const addParagraph = (text: string, x: number, maxWidth: number, lineHeight = 4.4) => {
      const lines = doc.splitTextToSize(text || "-", maxWidth) as string[];
      doc.text(lines, x, y);
      y += Math.max(1, lines.length) * lineHeight;
    };

    doc.setFillColor(...navyRgb);
    doc.rect(0, 0, pageWidth, 48, "F");
    doc.setFillColor(...blueRgb);
    doc.rect(0, 36, pageWidth, 11, "F");
    doc.setFillColor(...goldRgb);
    doc.rect(0, 47, pageWidth, 1.4, "F");
    const logo = await imageDataUrl(form.logo_url);
    if (logo) {
      try {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin, y - 2, 24, 24, 3, 3, "F");
        doc.addImage(logo, logo.includes("image/jpeg") ? "JPEG" : "PNG", margin + 2, y, 20, 20);
      } catch {
        // Logo is optional for export resilience.
      }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text((form.official_church_name || "KANISA LA MENNONITE LA KIINJILI TANZANIA KMK(T)").toUpperCase(), pageWidth / 2, 17, {
      align: "center",
      maxWidth: pageWidth - 76,
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.2);
    doc.text(form.vision || "Utambulisho, uongozi na taarifa rasmi za taasisi.", pageWidth / 2, 24, {
      align: "center",
      maxWidth: pageWidth - 76,
    });
    doc.text(
      [form.postal_address, form.headquarters, form.main_phone, sanitizeEmail(form.main_email), normalizeUrl(form.website_url, DEFAULT_CHURCH_WEBSITE_URL)]
        .filter(Boolean)
        .join("  |  "),
      pageWidth / 2,
      31,
      { align: "center", maxWidth: pageWidth - 76 }
    );

    const qr = await imageDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=${encodeURIComponent(publicUrl)}`);
    if (qr) {
      try {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(pageWidth - margin - 22, 12, 22, 22, 2, 2, "F");
        doc.addImage(qr, "PNG", pageWidth - margin - 20.5, 13.5, 19, 19);
      } catch {
        // QR is optional.
      }
    }

    y = 58;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y - 5, pageWidth - margin * 2, 28, 4, 4, "F");
    doc.setDrawColor(...goldRgb);
    doc.roundedRect(margin, y - 5, pageWidth - margin * 2, 28, 4, 4, "S");
    doc.setTextColor(...navyRgb);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("TAARIFA RASMI YA KANISA LA MENNONITE LA KIINJILI TANZANIA KMK(T)", pageWidth / 2, y + 2, {
      align: "center",
      maxWidth: pageWidth - 40,
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Wasifu wa taasisi, utambulisho wa kitaifa, mawasiliano, dira/lengo na muhtasari wa uongozi wa ngazi kuu.", pageWidth / 2, y + 15, {
      align: "center",
      maxWidth: pageWidth - 42,
    });
    y += 34;

    sectionTitle("Muhtasari wa Utambulisho");
    const rows = [
      ["Nchi", form.country],
      ["Makao makuu", form.headquarters],
      ["Anwani", form.postal_address],
      ["Simu", form.main_phone],
      ["Email", sanitizeEmail(form.main_email)],
      ["Website", normalizeUrl(form.website_url, DEFAULT_CHURCH_WEBSITE_URL)],
      ["Mkoa/Wilaya", [form.region, form.district].filter(Boolean).join(" / ")],
      ["GPS", form.gps_coordinates],
      ["Ramani", normalizeUrl(form.google_maps_url)],
      ["Mitandao", [form.facebook_url, form.youtube_url, form.instagram_url, form.whatsapp_url].filter(Boolean).join(" | ")],
    ];
    const colGap = 8;
    const cardW = (pageWidth - margin * 2 - colGap) / 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.2);
    rows.forEach(([label, value], index) => {
      const x = margin + (index % 2) * (cardW + colGap);
      if (index % 2 === 0) ensurePage(18);
      const cardY = y;
      doc.setFillColor(index % 2 === 0 ? 255 : 248, 250, 252);
      doc.roundedRect(x, cardY, cardW, 15, 2.5, 2.5, "F");
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, cardY, cardW, 15, 2.5, 2.5, "S");
      doc.setTextColor(...emeraldRgb);
      doc.setFont("helvetica", "bold");
      doc.text(label, x + 4, cardY + 5);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "normal");
      doc.text(String(value || "-"), x + 4, cardY + 10, { maxWidth: cardW - 8 });
      if (index % 2 === 1 || index === rows.length - 1) y += 18;
    });

    sectionTitle("Dira, Lengo na Thamani Kuu");
    for (const [title, value] of [["Dira", form.vision], ["Lengo", form.mission], ["Thamani Kuu", form.core_values]] as const) {
      ensurePage(24);
      doc.setFillColor(236, 253, 245);
      doc.roundedRect(margin, y, pageWidth - margin * 2, 8, 2, 2, "F");
      doc.setTextColor(...emeraldRgb);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(title.toUpperCase(), margin + 4, y + 5.5);
      y += 12;
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      for (const line of richLines(value)) {
        ensurePage(12);
        addParagraph(line, margin + 4, pageWidth - margin * 2 - 8);
      }
      if (!richLines(value).length) addParagraph("-", margin + 4, pageWidth - margin * 2 - 8);
      y += 3;
    }

    sectionTitle("Uongozi wa Kitaifa — National Leadership");
    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    addParagraph(
      "Nafasi nne rasmi za KMK(T): Askofu Mkuu, Katibu Mkuu, Naibu Katibu Mkuu, Mhasibu Mkuu. Data husomwa kwa hai kutoka jedwali la national_leadership_profiles (injini ya mipangilio mikuu).",
      margin + 2,
      pageWidth - margin * 2 - 4
    );
    y += 3;

    const leadersPdf = nationalRows
      .filter((p) => p.is_visible !== false)
      .sort((a, b) => a.sort_order - b.sort_order || a.role_key.localeCompare(b.role_key))
      .map((p) => ({
        role: nationalLeadershipDisplayTitle(p, "sw"),
        name: p.full_name,
        phone: p.phone.trim(),
        email: sanitizeEmail(p.email),
        photo: p.profile_photo_url,
        signature: p.signature_url,
        purpose:
          [p.leadership_quote.trim(), p.biography.trim()].filter(Boolean).join(" — ").slice(0, 320) ||
          "Taasisi ya KMK(T) — taarifa kamili ziko katika Portal.",
      }));

    if (!leadersPdf.length) {
      ensurePage(14);
      addParagraph(
        "Hakuna rekodi za uongozi wa kitaifa zilizoonekana (au zote zimefichwa). Sanidi katika Mipangilio mikuu → Uongozi wa Kitaifa — Engine.",
        margin + 2,
        pageWidth - margin * 2 - 4
      );
      y += 4;
    }

    const cardH = 48;
    for (const [index, leader] of leadersPdf.entries()) {
      ensurePage(cardH + 8);
      const x = margin + (index % 2) * (cardW + colGap);
      if (index % 2 === 0 && index > 0) y += 4;
      const cardY = y;
      doc.setFillColor(index % 2 === 0 ? 248 : 255, 250, 252);
      doc.roundedRect(x, cardY, cardW, cardH, 3, 3, "F");
      doc.setDrawColor(...goldRgb);
      doc.roundedRect(x, cardY, cardW, cardH, 3, 3, "S");
      const photo = await imageDataUrl(leader.photo);
      if (photo) {
        try {
          doc.addImage(photo, photo.includes("image/jpeg") ? "JPEG" : "PNG", x + 4, cardY + 5, 18, 18);
        } catch {
          doc.setFillColor(226, 232, 240);
          doc.roundedRect(x + 4, cardY + 5, 18, 18, 2, 2, "F");
        }
      } else {
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(x + 4, cardY + 5, 18, 18, 2, 2, "F");
        doc.setFont("helvetica", "italic");
        doc.setFontSize(5.5);
        doc.setTextColor(100, 116, 139);
        doc.text("Picha", x + 13, cardY + 14, { align: "center" });
      }
      doc.setTextColor(...navyRgb);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text(leader.role.toUpperCase(), x + 26, cardY + 7);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9.5);
      doc.text(leader.name || "—", x + 26, cardY + 13, { maxWidth: cardW - 30 });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(30, 64, 175);
      const contactLine = [leader.phone ? `Simu: ${leader.phone}` : "", leader.email ? `Barua: ${leader.email}` : ""]
        .filter(Boolean)
        .join("  ·  ");
      if (contactLine) {
        doc.text(contactLine, x + 26, cardY + 19, { maxWidth: cardW - 30 });
      }
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(leader.purpose, x + 26, cardY + (contactLine ? 24 : 19), { maxWidth: cardW - 30 });
      doc.setTextColor(...emeraldRgb);
      doc.text("Muhula: Kama ilivyoidhinishwa na chombo husika", x + 4, cardY + 38, { maxWidth: cardW - 32 });
      const signature = await imageDataUrl(leader.signature);
      if (signature) {
        try {
          doc.addImage(signature, signature.includes("image/jpeg") ? "JPEG" : "PNG", x + cardW - 27, cardY + 32, 22, 8);
        } catch {
          // Signature is optional.
        }
      }
      if (index % 2 === 1 || index === leadersPdf.length - 1) y += cardH + 6;
    }

    addFooter();
    doc.save("KMKT-Church-Identity-Profile.pdf");
  }

  return (
    <section className="space-y-4">
      <SettingsSupabaseBanner />
      <header className="overflow-hidden rounded-3xl border border-[#D4AF37]/40 bg-gradient-to-r from-[#0B1F3A] via-[#123C69] to-[#0B1F3A] p-6 text-center text-white shadow-xl">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-3">
          {form.logo_url ? (
            <div className="relative mx-auto h-16 w-[min(100%,180px)] max-w-[180px]">
              <ResponsiveLazyImage
                src={form.logo_url}
                alt=""

                className="absolute inset-0 h-full w-full object-cover"
                width={180}
                height={64}

                loading="lazy"
              />
            </div>
          ) : null}
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200">Enterprise Master Organization Profile</p>
          <h2 className="text-2xl font-bold">{form.official_church_name || "Utambulisho wa Kanisa"}</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-blue-100">
            Chanzo kikuu cha taarifa za taasisi, branding, mawasiliano, PDF/export na public display. Uongozi wa kitaifa wa nafasi nne husimamiwa katika Mipangilio mikuu → Uongozi wa Kitaifa — Engine.
          </p>
          {contactSummary.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-2 text-xs">
              {contactSummary.map((item) => (
                <span key={item} className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
                  {item}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </header>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={() => void load()} disabled={loading} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-50">
          Pakia upya
        </button>
        <button type="button" onClick={() => void exportIdentityPdf()} className="rounded-xl border border-[#D4AF37]/60 bg-[#D4AF37]/10 px-4 py-2 text-sm font-semibold text-[#0B1F3A]">
          Export PDF
        </button>
        {!canEdit ? <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">Read-only: chief_admin / super_admin pekee</span> : null}
      </div>
      {loading ? (
        <p className="text-slate-600">Inapakia kutoka Supabase…</p>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-md sm:p-6">
          <Section title="Taarifa Kuu">
            <TextField label="Jina rasmi la kanisa *" value={form.official_church_name} onChange={(v) => update("official_church_name", v)} disabled={!canEdit} />
            <TextField label="Nchi" value={form.country} onChange={(v) => update("country", v)} disabled={!canEdit} />
            <TextField label="Makao makuu" value={form.headquarters} onChange={(v) => update("headquarters", v)} disabled={!canEdit} />
            <TextField label="Simu kuu" value={form.main_phone} onChange={(v) => update("main_phone", v)} disabled={!canEdit} />
            <label className="grid gap-1 text-sm font-medium text-slate-800">
              Barua pepe kuu
              <input className="rounded-xl border border-slate-200 px-3 py-2" value={form.main_email} onChange={(e) => update("main_email", sanitizeEmail(e.target.value))} disabled={!canEdit} />
              {validateEmail(sanitizeEmail(form.main_email)) && sanitizeEmail(form.main_email) ? (
                <a className="text-xs font-semibold text-blue-800 underline" href={mailtoHref(form.main_email)}>Fungua mailto link</a>
              ) : null}
            </label>
            <TextField label="Tovuti" value={form.website_url || DEFAULT_CHURCH_WEBSITE_URL} onChange={(v) => update("website_url", normalizeUrl(v, DEFAULT_CHURCH_WEBSITE_URL))} disabled={!canEdit} />
            <TextField label="Anwani ya posta" value={form.postal_address} onChange={(v) => update("postal_address", v)} disabled={!canEdit} />
          </Section>

          <Section title="Logo, Favicon & Branding">
            <UploadField label="Logo URL / Upload" value={form.logo_url} busy={uploadingKey === "logo_url"} onChange={(v) => update("logo_url", v)} onUpload={(f) => void onUpload("logo_url", "identity/logo", f)} disabled={!canEdit} />
            <UploadField label="Favicon URL / Upload" value={form.favicon_url} busy={uploadingKey === "favicon_url"} onChange={(v) => update("favicon_url", v)} onUpload={(f) => void onUpload("favicon_url", "identity/favicon", f)} disabled={!canEdit} />
            <UploadField label="Cover Image URL / Upload" value={form.cover_image_url} busy={uploadingKey === "cover_image_url"} onChange={(v) => update("cover_image_url", v)} onUpload={(f) => void onUpload("cover_image_url", "identity/cover", f)} disabled={!canEdit} />
            <ColorField label="Primary" value={form.primary_color} onChange={(v) => update("primary_color", v)} disabled={!canEdit} />
            <ColorField label="Secondary" value={form.secondary_color} onChange={(v) => update("secondary_color", v)} disabled={!canEdit} />
            <ColorField label="Accent" value={form.accent_color} onChange={(v) => update("accent_color", v)} disabled={!canEdit} />
          </Section>

          <Section title="Uongozi wa Kitaifa (sasa: Mipangilio mikuu)" full>
            <p className="text-sm leading-relaxed text-slate-700 md:col-span-2 xl:col-span-3">
              Viongozi wanne wa kitaifa (Askofu Mkuu, Katibu Mkuu, Naibu Katibu Mkuu, Mhasibu Mkuu) sasa wanaandikishwa katika moduli ya{" "}
              <strong className="text-[#0B1F3A]">Mipangilio mikuu</strong> chini ya kichupo{" "}
              <strong className="text-[#0B1F3A]">Uongozi wa Kitaifa — Engine</strong>. Hapana tena ubao wa viongozi hapa; data inasawazishwa kwa PDF, dashibodi na mifumo mingine kupitia Supabase.
            </p>
          </Section>

          <Section title="Social Media & Geo">
            <TextField label="Facebook" value={form.facebook_url} onChange={(v) => update("facebook_url", normalizeUrl(v))} disabled={!canEdit} />
            <TextField label="YouTube" value={form.youtube_url} onChange={(v) => update("youtube_url", normalizeUrl(v))} disabled={!canEdit} />
            <TextField label="Instagram" value={form.instagram_url} onChange={(v) => update("instagram_url", normalizeUrl(v))} disabled={!canEdit} />
            <TextField label="WhatsApp" value={form.whatsapp_url} onChange={(v) => update("whatsapp_url", normalizeUrl(v))} disabled={!canEdit} />
            <TextField label="Mkoa" value={form.region} onChange={(v) => update("region", v)} disabled={!canEdit} />
            <TextField label="Wilaya" value={form.district} onChange={(v) => update("district", v)} disabled={!canEdit} />
            <TextField label="GPS Coordinates" value={form.gps_coordinates} onChange={(v) => update("gps_coordinates", v)} disabled={!canEdit} />
            <TextField label="Google Maps URL" value={form.google_maps_url} onChange={(v) => update("google_maps_url", normalizeUrl(v))} disabled={!canEdit} />
          </Section>

          <Section title="Dira, Lengo & Thamani Kuu" full>
            <RichTextField label="Dira" value={form.vision} onChange={(v) => update("vision", v)} disabled={!canEdit} />
            <RichTextField label="Lengo" value={form.mission} onChange={(v) => update("mission", v)} disabled={!canEdit} />
            <RichTextField label="Thamani Kuu" value={form.core_values} onChange={(v) => update("core_values", v)} disabled={!canEdit} />
          </Section>

          <div className="flex flex-wrap justify-center gap-3 border-t border-slate-200 pt-4">
            <button type="button" onClick={() => void exportIdentityPdf()} className="rounded-xl border border-[#D4AF37]/60 bg-[#D4AF37]/10 px-5 py-2.5 text-sm font-semibold text-[#0B1F3A]">
              Preview / Export PDF
            </button>
            <button type="submit" disabled={saving || !canEdit} className="rounded-xl bg-blue-900 px-6 py-2.5 font-semibold text-white disabled:opacity-50">
              {saving ? "Inahifadhi…" : "Hifadhi na Sync Portal-Wide"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function Section({ title, children, full = false }: { title: string; children: ReactNode; full?: boolean }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <h3 className="mb-3 text-center text-sm font-bold uppercase tracking-wide text-[#0B1F3A]">{title}</h3>
      <div className={`grid gap-3 ${full ? "grid-cols-1" : "md:grid-cols-2 xl:grid-cols-3"}`}>{children}</div>
    </section>
  );
}

function TextField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled: boolean }) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-800">
      {label}
      <input className="rounded-xl border border-slate-200 px-3 py-2" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
    </label>
  );
}

function ColorField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled: boolean }) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-800">
      {label}
      <div className="flex gap-2">
        <input type="color" className="h-10 w-12 rounded border border-slate-200" value={validateHexColor(value) ? value : "#0B1F3A"} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
        <input className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
      </div>
    </label>
  );
}

function UploadField({
  label,
  value,
  busy,
  onChange,
  onUpload,
  disabled,
}: {
  label: string;
  value: string;
  busy: boolean;
  onChange: (v: string) => void;
  onUpload: (f: File | null) => void;
  disabled: boolean;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-800">
      {label}
      <input className="rounded-xl border border-slate-200 px-3 py-2" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} placeholder="https://..." />
      <input type="file" accept={IMAGE_ACCEPT} disabled={disabled || busy} onChange={(e) => onUpload(e.target.files?.[0] ?? null)} className="text-xs" />
      {busy ? <span className="text-xs text-blue-700">Inapakia...</span> : null}
    </label>
  );
}

function RichTextField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled: boolean }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-800">
      {label}
      <textarea rows={6} className="rounded-xl border border-slate-200 px-3 py-2 leading-relaxed" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} placeholder={"Andika kwa mistari mingi. Mfano:\n1. Imani\n2. Uadilifu\n3. Huduma"} />
      {richLines(value).length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-700">
          {richLines(value).map((line) => (
            <p key={line} className="mb-1 last:mb-0">
              {line}
            </p>
          ))}
        </div>
      ) : null}
    </label>
  );
}
