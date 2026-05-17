import { useMemo, useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import {
  AUTO_FILL_SECTIONS,
  AUTO_FILL_SOURCE_LABELS,
  type LeadershipCredentialAutoFill,
} from "../../lib/certificateEngine/autoFill";

const FIELD_LABELS: Record<string, { sw: string; en: string }> = {
  fullName: { sw: "Jina kamili", en: "Full name" },
  gender: { sw: "Jinsia", en: "Gender" },
  age: { sw: "Umri", en: "Age" },
  phone: { sw: "Simu", en: "Phone" },
  whatsapp: { sw: "WhatsApp", en: "WhatsApp" },
  email: { sw: "Barua pepe", en: "Email" },
  physicalAddress: { sw: "Anwani", en: "Address" },
  mkoa: { sw: "Mkoa", en: "Region" },
  wilaya: { sw: "Wilaya", en: "District" },
  nationality: { sw: "Uraia", en: "Nationality" },
  churchIdNumber: { sw: "Nambari ya Kanisa", en: "Church ID" },
  leadershipIdNumber: { sw: "Nambari ya Uongozi", en: "Leadership ID" },
  positionTitle: { sw: "Cheo", en: "Position" },
  roleCatalogTitle: { sw: "Cheo (Catalog)", en: "Catalog role" },
  hierarchyLabel: { sw: "Ngazi / muundo", en: "Hierarchy" },
  dayosisi: { sw: "Dayosisi", en: "Diocese" },
  jimbo: { sw: "Jimbo", en: "Conference" },
  tawi: { sw: "Tawi", en: "Branch" },
  yearsInMinistry: { sw: "Miaka ya huduma", en: "Years in ministry" },
  yearsInPosition: { sw: "Miaka katika cheo", en: "Years in position" },
  dateStarted: { sw: "Tarehe ya kuanza", en: "Date started" },
  dateEnded: { sw: "Tarehe ya mwisho", en: "Date ended" },
  serviceStatus: { sw: "Hali ya huduma", en: "Service status" },
  baptized: { sw: "Amebatizwa?", en: "Baptized?" },
  baptismDate: { sw: "Tarehe ya ubatizo", en: "Baptism date" },
  baptismPlace: { sw: "Mahali pa ubatizo", en: "Baptism place" },
  baptizedBy: { sw: "Alibatizwa na", en: "Baptized by" },
  maritalStatus: { sw: "Hali ya ndoa", en: "Marital status" },
  educationSummary: { sw: "Elimu", en: "Education" },
  theologyTraining: { sw: "Theologia / Seminary", en: "Theology" },
  professionalCourses: { sw: "Kozi za kitaalamu", en: "Professional" },
  approvedAt: { sw: "Uidhinishaji — tarehe", en: "Approved at" },
  approvedByName: { sw: "Aliidhinisha", en: "Approved by" },
  approvedByTitle: { sw: "Cheo cha mhakiki", en: "Approver title" },
};

type Props = {
  autoFill: LeadershipCredentialAutoFill | null;
  loading?: boolean;
  onOpenCvEngine?: () => void;
};

export function LeadershipCredentialAutoFillPanel({ autoFill, loading, onOpenCvEngine }: Props) {
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set(["personal", "position"]));

  const pct = autoFill?.fillPercent ?? 0;

  const toggle = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sections = useMemo(() => {
    if (!autoFill) return [];
    return AUTO_FILL_SECTIONS.map((sec) => ({
      ...sec,
      rows: sec.keys
        .map((key) => {
          const f = autoFill.fields[key];
          if (!f) return null;
          const labels = FIELD_LABELS[key] ?? { sw: key, en: key };
          return { key, labels, field: f };
        })
        .filter(Boolean) as { key: string; labels: { sw: string; en: string }; field: (typeof autoFill.fields)[string] }[],
    }));
  }, [autoFill]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
        <span className="inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4 animate-pulse text-amber-500" aria-hidden />
          Inajaza kiotomatiki kutoka database & CV Engine…
        </span>
      </div>
    );
  }

  if (!autoFill) return null;

  return (
    <section className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-white to-emerald-50/40 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-[#0B1F3A]">
            <Sparkles className="h-4 w-4 text-emerald-600" aria-hidden />
            Auto-Fill — Maeneo yamejazwa kiotomatiki
          </p>
          <p className="mt-0.5 text-xs text-slate-600">
            {autoFill.fillCount} / {autoFill.totalFields} sehemu · chanzo: Viongozi, Wasifu, CV Engine, Muundo, Catalog
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-bold text-emerald-800">{pct}%</span>
        </div>
      </div>

      {onOpenCvEngine && autoFill.sourceType === "church_viongozi" ? (
        <button
          type="button"
          onClick={onOpenCvEngine}
          className="mt-3 text-xs font-semibold text-[#123C69] underline"
        >
          Fungua CV Engine kuhariri sehemu zilizobaki →
        </button>
      ) : null}

      <div className="mt-4 space-y-2">
        {sections.map((sec) => {
          const open = openSections.has(sec.id);
          const filledInSec = sec.rows.filter((r) => r.field.filled).length;
          return (
            <div key={sec.id} className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
              <button
                type="button"
                onClick={() => toggle(sec.id)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-xs font-bold text-[#0B1F3A] hover:bg-slate-50"
              >
                <span>
                  {sec.titleSw}
                  <span className="ml-1 font-normal text-slate-500">({sec.titleEn})</span>
                  <span className="ml-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-800">
                    {filledInSec}/{sec.rows.length}
                  </span>
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 transition ${open ? "rotate-180" : ""}`} aria-hidden />
              </button>
              {open ? (
                <dl className="grid gap-1.5 border-t border-slate-100 px-3 py-2 sm:grid-cols-2">
                  {sec.rows.map(({ key, labels, field: f }) => (
                    <div
                      key={key}
                      className={`rounded-lg px-2 py-1.5 text-[11px] ${
                        f.filled ? "bg-emerald-50/80 ring-1 ring-emerald-100" : "bg-slate-50 text-slate-500"
                      }`}
                    >
                      <dt className="font-semibold text-slate-700">
                        <span
                          className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${
                            f.filled ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                          aria-hidden
                        />
                        {labels.sw}
                        <span className="font-normal text-slate-400"> · {labels.en}</span>
                      </dt>
                      <dd className="mt-0.5 break-words font-medium text-[#0B1F3A]">{f.display}</dd>
                      {f.filled ? (
                        <dd className="mt-0.5 text-[9px] uppercase tracking-wide text-emerald-700/80">
                          {AUTO_FILL_SOURCE_LABELS[f.source]}
                        </dd>
                      ) : null}
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
