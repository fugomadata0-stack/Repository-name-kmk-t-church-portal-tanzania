import { useState } from "react";
import {
  fetchFinanceDistributionSummary,
  fetchMembershipStatistics,
  listInstitutionProjectsForScope,
  type Phase1Scope,
} from "../../services/phase1FoundationService";
import {
  buildFinancePhase1Pdf,
  buildMembershipPhase1Pdf,
  buildProjectsPhase1Pdf,
  downloadPhase1Pdf,
} from "../../lib/kmktPhase1ReportPdf";
import { userFacingQueryError } from "../../lib/portalHardening/userFacingError";

const LEVELS: { scope: Phase1Scope; sw: string; en: string }[] = [
  { scope: "tawi", sw: "Ripoti ya Tawi", en: "Branch Report PDF" },
  { scope: "jimbo", sw: "Ripoti ya Jimbo", en: "Presbytery Report PDF" },
  { scope: "dayosisi", sw: "Ripoti ya Dayosisi", en: "Diocese Report PDF" },
  { scope: "kmkt", sw: "Ripoti ya KMK(T)", en: "National Report PDF" },
];

export function Phase1ReportsHubPanel() {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const run = async (kind: "membership" | "finance" | "projects", scope: Phase1Scope) => {
    const key = `${kind}-${scope}`;
    setBusy(key);
    setMessage(null);
    try {
      if (kind === "membership") {
        const stats = await fetchMembershipStatistics(scope);
        if (stats.error) throw new Error(stats.error);
        const doc = await buildMembershipPhase1Pdf(stats.categories, {
          titleSw: LEVELS.find((l) => l.scope === scope)?.sw ?? "Ripoti",
          titleEn: LEVELS.find((l) => l.scope === scope)?.en ?? "Report",
          aboutSw: "Takwimu za uanachama kwa ngazi — makundi yote.",
          aboutEn: "Membership statistics at hierarchy level.",
          level: scope,
          levelLabel: scope.toUpperCase(),
          hierarchyFlow: "Tawi → Jimbo → Dayosisi → KMK(T)",
        });
        downloadPhase1Pdf(doc, `kmkt-${scope}-membership.pdf`);
      } else if (kind === "finance") {
        const fin = await fetchFinanceDistributionSummary(scope);
        if (fin.error) throw new Error(fin.error);
        const doc = await buildFinancePhase1Pdf(fin, [], {
          titleSw: "Ripoti ya Fedha",
          titleEn: "Finance Report",
          aboutSw: "Mapato, matumizi, salio na uhamisho.",
          aboutEn: "Income, expenses, balance and transfers.",
          level: scope,
          levelLabel: scope.toUpperCase(),
          periodStart: fin.period_start,
          periodEnd: fin.period_end,
        });
        downloadPhase1Pdf(doc, `kmkt-${scope}-finance.pdf`);
      } else {
        const projects = await listInstitutionProjectsForScope(scope);
        const doc = await buildProjectsPhase1Pdf(projects, {
          titleSw: "Ripoti ya Miradi na Taasisi",
          titleEn: "Church Projects Report",
          aboutSw: "Miradi: Chuo, Shule, Hospitali, Admin, Mission, Training — mapato, matumizi, salio.",
          aboutEn: "Institution projects with finance summary.",
          level: scope,
          levelLabel: scope.toUpperCase(),
          hierarchyFlow: "Tawi → Jimbo → Dayosisi → KMK(T)",
          approvals: `${projects.length} miradi`,
        });
        downloadPhase1Pdf(doc, `kmkt-${scope}-projects.pdf`);
      }
      setMessage(`PDF imepakuliwa: ${key}`);
    } catch (e) {
      setMessage(userFacingQueryError(e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border-2 border-indigo-900/40 bg-gradient-to-br from-indigo-950 via-blue-900 to-slate-950 p-5 text-center text-white">
        <h2 className="text-lg font-bold">Kituo cha Ripoti Phase 1</h2>
        <p className="mt-1 text-sm text-indigo-100/90">PDF: Uanachama · Fedha · Miradi · Ngazi zote</p>
      </header>

      {message ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-center text-sm text-slate-700">{message}</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {LEVELS.map((l) => (
          <div key={l.scope} className="rounded-xl border-4 border-double border-slate-800 bg-white p-4 text-center shadow-md">
            <h3 className="font-bold text-slate-900">{l.sw}</h3>
            <p className="text-xs text-slate-500">{l.en}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void run("membership", l.scope)}
                className="rounded-lg bg-emerald-700 px-3 py-2 text-xs text-white disabled:opacity-50"
              >
                {busy === `membership-${l.scope}` ? "…" : "Uanachama"}
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void run("finance", l.scope)}
                className="rounded-lg bg-green-800 px-3 py-2 text-xs text-white disabled:opacity-50"
              >
                {busy === `finance-${l.scope}` ? "…" : "Fedha"}
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void run("projects", l.scope)}
                className="rounded-lg bg-orange-700 px-3 py-2 text-xs text-white disabled:opacity-50"
              >
                {busy === `projects-${l.scope}` ? "…" : "Miradi"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-slate-500">
        Ripoti zinaeleza: kichwa, maelezo, ngazi, kipindi, jumla, idhini, na mtiririko Tawi → Jimbo → Dayosisi → KMK(T).
      </p>
    </div>
  );
}
