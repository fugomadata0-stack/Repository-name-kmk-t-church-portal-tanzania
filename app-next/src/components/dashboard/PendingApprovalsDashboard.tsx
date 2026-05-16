import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, ClipboardList, Loader2, Eye } from "lucide-react";
import { usePortal } from "../../context/PortalContext";
import { getSupabase } from "../../lib/supabaseClient";
import { dispatchPortalReloadMetrics } from "../../lib/portalEvents";
import { entryIsoInSameCalendarMonth } from "../../lib/tzDates";
import { formatMoneyTz } from "../../lib/money";
import { fetchAidRequestsJoined, normalizeAidRequestRow, upsertAidRequest } from "../../services/aidManagementService";
import { upsertIncomeLine } from "../../services/incomeModuleService";
import { upsertFinanceEntry } from "../../services/financeEntriesService";
import type { AidRequestJoinedRow, FedhaRecord, IncomeManagementRecord, JimboRecord, TawiRecord } from "../../types";
import { safeLower } from "../../lib/safe";
import { SupabaseListFeedback } from "../common/SupabaseListFeedback";
import { ModalScrollLayer } from "../common/ModalScrollLayer";
import { SUPABASE_QUERY_ERROR_SW, HAIJAPATIKANA_DATA_SW } from "../../lib/supabaseUiMessages";
import { GradientKpiCard } from "../common/GradientKpiCard";
import type { ScopeHierarchy } from "../../utils/scopeAccess";
import { SCOPE_TOOLTIP_SW } from "../../utils/scopeAccess";

function badgeIncome(status: string) {
  const s = safeLower(status);
  if (s.includes("approved") || s.includes("posted") || s.includes("locked")) return "bg-emerald-100 text-emerald-900 ring-emerald-300";
  if (s.includes("reverse") || s.includes("cancel")) return "bg-red-100 text-red-900 ring-red-300";
  if (s.includes("submit") || s.includes("verified") || s.includes("draft")) return "bg-orange-100 text-orange-900 ring-orange-300";
  return "bg-slate-100 text-slate-800 ring-slate-200";
}

function badgeAid(status: string) {
  if (status === "approved" || status === "completed") return "bg-emerald-100 text-emerald-900 ring-emerald-300";
  if (status === "rejected") return "bg-red-100 text-red-900 ring-red-300";
  if (status === "review") return "bg-sky-100 text-sky-900 ring-sky-300";
  if (status === "submitted" || status === "draft") return "bg-orange-100 text-orange-900 ring-orange-300";
  return "bg-slate-100 text-slate-800 ring-slate-200";
}

function badgeFedha(status: string) {
  const s = safeLower(status);
  if (s.includes("active") || s.includes("approved")) return "bg-emerald-100 text-emerald-900 ring-emerald-300";
  if (s.includes("pending")) return "bg-orange-100 text-orange-900 ring-orange-300";
  return "bg-slate-100 text-slate-800 ring-slate-200";
}

interface Props {
  incomeManagement: IncomeManagementRecord[];
  fedha: FedhaRecord[];
  majimbo: JimboRecord[];
  matawi: TawiRecord[];
  /** Hesabu ya KPI (RLS); jumla foleni na kadi ya sajili zinapendelea thamani hii. */
  tawiRegistryPendingReviewKpi?: number | null;
  /** KPI ya pending_review imeshindikana — tumia hesabu ya orodha ya matawi kwa jumla. */
  tawiRegistryPendingReviewKpiFailed?: boolean;
}

function incomeScopeTriple(row: IncomeManagementRecord) {
  return {
    dayosisi_id: row.dayosisi_id ?? null,
    jimbo_id: row.jimbo_id ?? null,
    tawi_id: row.tawi_id ?? null,
  };
}

function fedhaScopeTriple(row: FedhaRecord) {
  return {
    dayosisi_id: row.dayosisi_id ?? null,
    jimbo_id: row.jimbo_id ?? null,
    tawi_id: row.tawi_id ?? null,
  };
}

/** Misaada bado hayajaunganishwa na IDs za muundo kwenye UI — triple tupu mpaka DB iongeze */
function aidScopeTriple(_row: AidRequestJoinedRow) {
  return { dayosisi_id: null as string | null, jimbo_id: null as string | null, tawi_id: null as string | null };
}

export function PendingApprovalsDashboard(props: Props) {
  const {
    reportError,
    pushToast,
    authUser,
    canPortalEditModule,
    canPortalApproveModule,
    canPortalRejectModule,
    canScopeMutateRecord,
    notifyScopeDenied,
    canPortalViewModule,
  } = usePortal();

  const scopeHierarchy: ScopeHierarchy = useMemo(
    () => ({
      majimbo: props.majimbo.map((j) => ({ id: j.id, dayosisi_id: j.dayosisi_id ?? null })),
      matawi: props.matawi.map((t) => ({ id: t.id, jimbo_id: t.jimbo_id ?? null })),
    }),
    [props.majimbo, props.matawi]
  );
  const canIncomeApprove = canPortalApproveModule("mapato_income") || canPortalEditModule("mapato_income");
  const canIncomeReject = canPortalRejectModule("mapato_income") || canPortalEditModule("mapato_income");
  const canFedhaApprove = canPortalApproveModule("fedha") || canPortalEditModule("fedha");
  const canFedhaReject = canPortalRejectModule("fedha") || canPortalEditModule("fedha");
  const canAidApprove = canPortalApproveModule("aid_management") || canPortalEditModule("aid_management");
  const canAidReject = canPortalRejectModule("aid_management") || canPortalEditModule("aid_management");

  const [aidRows, setAidRows] = useState<AidRequestJoinedRow[]>([]);
  const [aidLoading, setAidLoading] = useState(true);
  const [aidLoadError, setAidLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [noteModal, setNoteModal] = useState<{ kind: "income" | "aid" | "fedha"; id: string; action: "approve" | "reject" } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [detailRow, setDetailRow] = useState<{ title: string; body: string } | null>(null);

  const loadAid = useCallback(async () => {
    if (!getSupabase()) {
      setAidRows([]);
      setAidLoadError(null);
      setAidLoading(false);
      return;
    }
    setAidLoading(true);
    setAidLoadError(null);
    try {
      const raw = await fetchAidRequestsJoined();
      setAidRows(raw.map((x) => normalizeAidRequestRow(x)));
    } catch (e) {
      reportError(e, "Vibali — misaada");
      setAidRows([]);
      setAidLoadError(SUPABASE_QUERY_ERROR_SW);
    } finally {
      setAidLoading(false);
    }
  }, [reportError]);

  useEffect(() => {
    void loadAid();
  }, [loadAid]);

  const approverLabel = useMemo(() => {
    const em = authUser?.email?.trim();
    return em || authUser?.id?.slice(0, 8) || "—";
  }, [authUser]);

  const incomePending = useMemo(
    () => props.incomeManagement.filter((r) => ["Submitted", "Verified", "Draft"].includes(r.status)),
    [props.incomeManagement]
  );
  const incomeApprovedMonth = useMemo(
    () =>
      props.incomeManagement.filter(
        (r) => r.status === "Approved" && r.collectionDate && entryIsoInSameCalendarMonth(r.collectionDate.slice(0, 10))
      ).length,
    [props.incomeManagement]
  );
  const incomeRejectedMonth = useMemo(
    () =>
      props.incomeManagement.filter(
        (r) =>
          r.status === "Reversed / Cancelled" &&
          r.collectionDate &&
          entryIsoInSameCalendarMonth(r.collectionDate.slice(0, 10))
      ).length,
    [props.incomeManagement]
  );

  const fedhaPending = useMemo(() => props.fedha.filter((r) => r.status === "Pending"), [props.fedha]);

  const aidPending = useMemo(
    () => aidRows.filter((r) => ["draft", "submitted", "review"].includes(r.status)),
    [aidRows]
  );
  const aidApprovedMonth = useMemo(
    () =>
      aidRows.filter(
        (r) =>
          r.status === "approved" &&
          r.approved_at &&
          entryIsoInSameCalendarMonth(String(r.approved_at).slice(0, 10))
      ).length,
    [aidRows]
  );
  const aidRejectedMonth = useMemo(
    () =>
      aidRows.filter(
        (r) =>
          r.status === "rejected" &&
          r.updated_at &&
          entryIsoInSameCalendarMonth(String(r.updated_at).slice(0, 10))
      ).length,
    [aidRows]
  );

  const canMuundo = canPortalViewModule("muundo");
  const tawiRegistryPending = useMemo(
    () =>
      [...props.matawi]
        .filter((t) => String(t.verification_status ?? "").trim() === "pending_review")
        .sort((a, b) => a.jina.localeCompare(b.jina, "sw")),
    [props.matawi]
  );

  const tawiPendingForTotals = useMemo(() => {
    if (!canMuundo) return 0;
    if (props.tawiRegistryPendingReviewKpiFailed) return tawiRegistryPending.length;
    if (typeof props.tawiRegistryPendingReviewKpi === "number") return props.tawiRegistryPendingReviewKpi;
    return tawiRegistryPending.length;
  }, [canMuundo, props.tawiRegistryPendingReviewKpi, props.tawiRegistryPendingReviewKpiFailed, tawiRegistryPending.length]);

  const tawiPendingKpiDisplay = useMemo((): string | number => {
    if (!canMuundo) return 0;
    if (props.tawiRegistryPendingReviewKpiFailed) return HAIJAPATIKANA_DATA_SW;
    if (typeof props.tawiRegistryPendingReviewKpi === "number") return props.tawiRegistryPendingReviewKpi;
    return tawiRegistryPending.length;
  }, [canMuundo, props.tawiRegistryPendingReviewKpi, props.tawiRegistryPendingReviewKpiFailed, tawiRegistryPending.length]);

  const totalPending = useMemo(
    () => incomePending.length + fedhaPending.length + aidPending.length + tawiPendingForTotals,
    [incomePending.length, fedhaPending.length, aidPending.length, tawiPendingForTotals]
  );

  const reloadParent = () => {
    dispatchPortalReloadMetrics();
  };

  const incomeMutationAllowed = useCallback(
    (row: IncomeManagementRecord) => canScopeMutateRecord("edit", incomeScopeTriple(row), scopeHierarchy),
    [canScopeMutateRecord, scopeHierarchy]
  );
  const fedhaMutationAllowed = useCallback(
    (row: FedhaRecord) => canScopeMutateRecord("edit", fedhaScopeTriple(row), scopeHierarchy),
    [canScopeMutateRecord, scopeHierarchy]
  );
  const aidMutationAllowed = useCallback(
    (row: AidRequestJoinedRow) => canScopeMutateRecord("edit", aidScopeTriple(row), scopeHierarchy),
    [canScopeMutateRecord, scopeHierarchy]
  );

  const runIncomeAction = async (row: IncomeManagementRecord, action: "approve" | "reject", notes: string) => {
    if (action === "approve" ? !canIncomeApprove : !canIncomeReject) {
      pushToast("Huna ruhusa ya kuidhinisha mapato.", "error");
      return;
    }
    if (!canScopeMutateRecord("edit", incomeScopeTriple(row), scopeHierarchy)) {
      notifyScopeDenied("mapato_income", "income_line_approval", { income_line_id: row.id });
      return;
    }
    setBusyId(`inc-${row.id}`);
    try {
      const next =
        action === "approve"
          ? {
              ...row,
              status: "Approved" as const,
              approvedBy: approverLabel,
              remarks: notes.trim() ? `${row.remarks || ""}\n[Idhini] ${notes}`.trim() : row.remarks,
            }
          : {
              ...row,
              status: "Reversed / Cancelled" as const,
              remarks: `Kataliwa: ${notes.trim() || "—"}`.slice(0, 4000),
            };
      await upsertIncomeLine(next);
      pushToast(action === "approve" ? "Mstari wa mapato umeidhinishwa." : "Mstari wa mapato umekataliwa.", "success");
      reloadParent();
    } catch (e) {
      reportError(e, "Mapato — idhini");
      pushToast("Hatua imeshindikana.", "error");
    } finally {
      setBusyId(null);
      setNoteModal(null);
      setNoteText("");
    }
  };

  const runFedhaAction = async (row: FedhaRecord, action: "approve" | "reject", _notes: string) => {
    if (action === "approve" ? !canFedhaApprove : !canFedhaReject) {
      pushToast("Huna ruhusa ya kuidhinisha fedha.", "error");
      return;
    }
    if (!canScopeMutateRecord("edit", fedhaScopeTriple(row), scopeHierarchy)) {
      notifyScopeDenied("fedha", "finance_entry_approval", { fedha_id: row.id });
      return;
    }
    setBusyId(`fed-${row.id}`);
    try {
      await upsertFinanceEntry({
        ...row,
        status: action === "approve" ? "Active" : "Archived",
      });
      pushToast(action === "approve" ? "Miamala imeidhinishwa." : "Miamala imekataliwa/kuundwa isiyo hai.", "success");
      reloadParent();
    } catch (e) {
      reportError(e, "Fedha — idhini");
      pushToast("Hatua imeshindikana.", "error");
    } finally {
      setBusyId(null);
      setNoteModal(null);
      setNoteText("");
    }
  };

  const runAidAction = async (row: AidRequestJoinedRow, action: "approve" | "reject", notes: string) => {
    if (action === "approve" ? !canAidApprove : !canAidReject) {
      pushToast("Huna ruhusa ya msaada.", "error");
      return;
    }
    if (!canScopeMutateRecord("edit", aidScopeTriple(row), scopeHierarchy)) {
      notifyScopeDenied("aid_management", "aid_request_approval", { aid_request_id: row.id });
      return;
    }
    setBusyId(`aid-${row.id}`);
    try {
      const today = new Date().toISOString();
      await upsertAidRequest({
        id: row.id,
        beneficiary_id: row.beneficiary_id,
        aid_type: row.aid_type,
        description: row.description,
        amount: row.amount,
        items: row.items,
        urgency_level: row.urgency_level,
        request_date: row.request_date,
        request_month: row.request_month,
        status: action === "approve" ? "approved" : "rejected",
        reviewed_by: row.reviewed_by,
        review_notes: row.review_notes,
        review_date: row.review_date,
        approved_by: action === "approve" ? approverLabel : row.approved_by,
        approved_signature: row.approved_signature,
        approval_notes: notes.trim() ? `${row.approval_notes ? `${row.approval_notes}\n` : ""}${notes}`.trim() : row.approval_notes,
        approved_at: action === "approve" ? today : row.approved_at,
        approval_status: action === "approve" ? "approved" : "rejected",
        completed_at: row.completed_at,
      });
      pushToast(action === "approve" ? "Ombi la msaada limeidhinishwa." : "Ombi la msaada limekataliwa.", "success");
      await loadAid();
      reloadParent();
    } catch (e) {
      reportError(e, "Misaada — idhini");
      pushToast("Hatua imeshindikana.", "error");
    } finally {
      setBusyId(null);
      setNoteModal(null);
      setNoteText("");
    }
  };

  const submitNote = async () => {
    if (!noteModal) return;
    const notes = noteText.trim();
    if (noteModal.action === "reject" && notes.length < 2) {
      pushToast("Andika sababu fupi ya kukataa.", "error");
      return;
    }
    if (noteModal.kind === "income") {
      const row = props.incomeManagement.find((r) => r.id === noteModal.id);
      if (row) await runIncomeAction(row, noteModal.action, notes);
      return;
    }
    if (noteModal.kind === "fedha") {
      const row = props.fedha.find((r) => r.id === noteModal.id);
      if (row) await runFedhaAction(row, noteModal.action, notes);
      return;
    }
    const row = aidRows.find((r) => r.id === noteModal.id);
    if (row) await runAidAction(row, noteModal.action, notes);
  };

  const kpis = useMemo(() => {
    const rows: Array<[string, string | number, string]> = [];
    rows.push(["Jumla foleni", totalPending, "from-rose-600 to-rose-800"]);
    rows.push(["Mapato yanayosubiri", incomePending.length, "from-amber-500 to-orange-700"]);
    rows.push(["Misaada yanayosubiri", aidPending.length, "from-teal-600 to-emerald-800"]);
    rows.push(["Fedha inayosubiri", fedhaPending.length, "from-green-600 to-emerald-700"]);
    if (canMuundo) {
      rows.push(["Sajili za tawi (pending_review)", tawiPendingKpiDisplay, "from-indigo-600 to-violet-800"]);
    }
    rows.push(
      ["Idhinishwa mwezi huu (mapato)", incomeApprovedMonth, "from-emerald-600 to-teal-800"],
      ["Kataliwa mwezi huu (mapato)", incomeRejectedMonth, "from-red-600 to-rose-800"],
      ["Idhinishwa mwezi huu (misaada)", aidApprovedMonth, "from-cyan-600 to-blue-800"],
      ["Kataliwa mwezi huu (misaada)", aidRejectedMonth, "from-orange-600 to-red-800"]
    );
    return rows;
  }, [
    totalPending,
    incomePending.length,
    aidPending.length,
    fedhaPending.length,
    canMuundo,
    tawiPendingKpiDisplay,
    incomeApprovedMonth,
    incomeRejectedMonth,
    aidApprovedMonth,
    aidRejectedMonth,
  ]);

  return (
    <div className="space-y-6" role="region" aria-label="Dashibodi ya idhini">
      <header className="rounded-2xl border border-amber-300/50 bg-gradient-to-r from-[#071426] via-[#0B1F3A] to-[#1e3a6e] p-5 text-white shadow-xl ring-1 ring-white/10">
        <h1 className="text-xl font-extrabold tracking-tight text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
          Vibali vinavyosubiri
        </h1>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-100">
          Mapato, misaada, na miamala ya fedha
          {canMuundo ? ", pamoja na sajili za tawi (muundo) zinazosubiri uhakiki" : ""} — idhini kwa kiwango cha ruhusa yako
          (RBAC). Data halisi kutoka Supabase.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Vipimo vya idhini">
        {kpis.map(([title, value, g]) => (
          <GradientKpiCard key={title} title={title} value={value} gradient={g} />
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <ClipboardList className="h-4 w-4" aria-hidden />
            Mapato — yanayosubiri idhini
          </h2>
        </div>
        <div className="mt-3 overflow-auto rounded-lg border border-slate-200 bg-slate-50/40 shadow-inner">
          <table className="w-full min-w-[720px] text-left text-[13px] text-slate-900">
            <thead className="sticky top-0 z-10 border-b-2 border-slate-300 bg-slate-200 text-slate-950">
              <tr>
                <th className="px-3 py-2.5 font-bold">Code</th>
                <th className="px-3 py-2.5 font-bold">Chanzo</th>
                <th className="px-3 py-2.5 font-bold">Kiasi</th>
                <th className="px-3 py-2.5 font-bold">Hali</th>
                <th className="px-3 py-2.5 font-bold">Idhinishwa na</th>
                <th className="px-3 py-2.5 w-40 font-bold">Vitendo</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {incomePending.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-600">
                    Hakuna mistari ya mapato yanayosubiri.
                  </td>
                </tr>
              ) : (
                incomePending.map((r) => (
                  <tr key={r.id} className="border-t border-slate-200 odd:bg-slate-50/90">
                    <td className="px-3 py-2.5 font-mono text-slate-900">{r.incomeCode}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-800">{r.sourceName}</td>
                    <td className="px-3 py-2.5 font-bold tabular-nums text-[#0B1F3A]">TZS {r.amount.toLocaleString()}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${badgeIncome(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">{r.approvedBy || "—"}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          disabled={!canIncomeApprove || !!busyId || !incomeMutationAllowed(r)}
                          title={
                            !canIncomeApprove
                              ? "Huna ruhusa ya kuidhinisha mapato."
                              : !incomeMutationAllowed(r)
                                ? SCOPE_TOOLTIP_SW
                                : "Idhinisha mstari huu"
                          }
                          className="rounded-lg bg-emerald-700 px-2 py-1 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => setNoteModal({ kind: "income", id: r.id, action: "approve" })}
                        >
                          {busyId === `inc-${r.id}` ? (
                            <Loader2 className="inline h-3 w-3 animate-spin" aria-hidden />
                          ) : (
                            <CheckCircle2 className="inline h-3 w-3" aria-hidden />
                          )}{" "}
                          Idhinisha
                        </button>
                        <button
                          type="button"
                          disabled={!canIncomeReject || busyId === `inc-${r.id}` || !incomeMutationAllowed(r)}
                          title={
                            !canIncomeReject
                              ? "Huna ruhusa ya kukataa mapato."
                              : !incomeMutationAllowed(r)
                                ? SCOPE_TOOLTIP_SW
                                : "Kataa mstari huu"
                          }
                          className="rounded-lg bg-red-700 px-2 py-1 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => setNoteModal({ kind: "income", id: r.id, action: "reject" })}
                        >
                          Kataa
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 px-2 py-1 text-[10px]"
                          onClick={() =>
                            setDetailRow({
                              title: `Mapato ${r.incomeCode}`,
                              body: JSON.stringify(r, null, 2),
                            })
                          }
                        >
                          <Eye className="inline h-3 w-3" /> Maelezo
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-md">
        <h2 className="text-sm font-bold text-slate-900">Misaada — maombi yanayosubiri</h2>
        <SupabaseListFeedback loading={aidLoading} loadError={aidLoadError} isEmpty={false} />
        {aidLoading ? (
          <div className="flex min-h-[120px] items-center justify-center gap-2 text-slate-500" role="status" aria-live="polite">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
            Inapakia misaada…
          </div>
        ) : aidLoadError ? null : (
          <div className="mt-3 overflow-auto rounded-lg border border-slate-200 bg-slate-50/40 shadow-inner">
            <table className="w-full min-w-[720px] text-left text-[13px] text-slate-900">
              <thead className="sticky top-0 z-10 border-b-2 border-slate-300 bg-slate-200 text-slate-950">
                <tr>
                  <th className="px-3 py-2.5 font-bold">Tarehe</th>
                  <th className="px-3 py-2.5 font-bold">Maelezo</th>
                  <th className="px-3 py-2.5 font-bold">Kiasi</th>
                  <th className="px-3 py-2.5 font-bold">Hali</th>
                  <th className="px-3 py-2.5 font-bold">Idhinishwa na</th>
                  <th className="px-3 py-2.5 w-40 font-bold">Vitendo</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {aidPending.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-600">
                      Hakuna maombi yanayosubiri.
                    </td>
                  </tr>
                ) : (
                  aidPending.map((r) => (
                    <tr key={r.id} className="border-t border-slate-200 odd:bg-slate-50/90">
                      <td className="px-3 py-2.5 tabular-nums font-medium text-slate-900">{String(r.request_date).slice(0, 10)}</td>
                      <td className="max-w-[200px] truncate px-3 py-2.5 text-slate-800">{r.description}</td>
                      <td className="px-3 py-2.5 font-bold text-[#0B1F3A]">{formatMoneyTz(r.amount)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${badgeAid(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">{r.approved_by || "—"}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            disabled={!canAidApprove || busyId === `aid-${r.id}` || !aidMutationAllowed(r)}
                            title={
                              !canAidApprove
                                ? "Huna ruhusa ya kuidhinisha misaada."
                                : !aidMutationAllowed(r)
                                  ? SCOPE_TOOLTIP_SW
                                  : "Idhinisha ombi hili"
                            }
                            className="rounded-lg bg-emerald-700 px-2 py-1 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => setNoteModal({ kind: "aid", id: r.id, action: "approve" })}
                          >
                            Idhinisha
                          </button>
                          <button
                            type="button"
                            disabled={!canAidReject || busyId === `aid-${r.id}` || !aidMutationAllowed(r)}
                            title={
                              !canAidReject
                                ? "Huna ruhusa ya kukataa misaada."
                                : !aidMutationAllowed(r)
                                  ? SCOPE_TOOLTIP_SW
                                  : "Kataa ombi hili"
                            }
                            className="rounded-lg bg-red-700 px-2 py-1 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => setNoteModal({ kind: "aid", id: r.id, action: "reject" })}
                          >
                            Kataa
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border px-2 py-1 text-[10px]"
                            onClick={() =>
                              setDetailRow({
                                title: `Msaada ${r.id.slice(0, 8)}`,
                                body: JSON.stringify(r, null, 2),
                              })
                            }
                          >
                            Maelezo
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-md">
        <h2 className="text-sm font-bold text-slate-900">Fedha — miamala inayosubiri</h2>
        <div className="mt-3 overflow-auto rounded-lg border border-slate-200 bg-slate-50/40 shadow-inner">
          <table className="w-full min-w-[680px] text-left text-[13px] text-slate-900">
            <thead className="sticky top-0 z-10 border-b-2 border-slate-300 bg-slate-200 text-slate-950">
              <tr>
                <th className="px-3 py-2.5 font-bold">Tarehe</th>
                <th className="px-3 py-2.5 font-bold">Kategoria</th>
                <th className="px-3 py-2.5 font-bold">Kiasi</th>
                <th className="px-3 py-2.5 font-bold">Hali</th>
                <th className="px-3 py-2.5 w-36 font-bold">Vitendo</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {fedhaPending.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-600">
                    Hakuna miamala ya fedha yenye hali Pending.
                  </td>
                </tr>
              ) : (
                fedhaPending.map((r) => (
                  <tr key={r.id} className="border-t border-slate-200 odd:bg-slate-50/90">
                    <td className="px-3 py-2.5 tabular-nums font-medium text-slate-900">{String(r.tarehe).slice(0, 10)}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-800">{r.kategoria}</td>
                    <td className="px-3 py-2.5 font-bold tabular-nums text-[#0B1F3A]">TZS {formatMoneyTz(r.kiasi)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${badgeFedha(String(r.status))}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          disabled={!canFedhaApprove || busyId === `fed-${r.id}` || !fedhaMutationAllowed(r)}
                          title={
                            !canFedhaApprove
                              ? "Huna ruhusa ya kuidhinisha fedha."
                              : !fedhaMutationAllowed(r)
                                ? SCOPE_TOOLTIP_SW
                                : "Idhinisha muamala huu"
                          }
                          className="rounded-lg bg-emerald-700 px-2 py-1 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => setNoteModal({ kind: "fedha", id: r.id, action: "approve" })}
                        >
                          Idhinisha
                        </button>
                        <button
                          type="button"
                          disabled={!canFedhaReject || busyId === `fed-${r.id}` || !fedhaMutationAllowed(r)}
                          title={
                            !canFedhaReject
                              ? "Huna ruhusa ya kukataa fedha."
                              : !fedhaMutationAllowed(r)
                                ? SCOPE_TOOLTIP_SW
                                : "Kataa muamala huu"
                          }
                          className="rounded-lg bg-red-700 px-2 py-1 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => setNoteModal({ kind: "fedha", id: r.id, action: "reject" })}
                        >
                          Kataa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {canMuundo ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-md" aria-label="Sajili za tawi zinazosubiri uhakiki">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Building2 className="h-4 w-4" aria-hidden />
              Muundo — sajili za tawi zinazosubiri uhakiki
            </h2>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-[#0B1F3A] shadow-sm hover:bg-slate-50"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("kmt-portal-navigate", {
                    detail: { moduleKey: "muundo", submodule: "Injini ya Ngazi — Executive" },
                  })
                )
              }
            >
              Fungua Matawi / Vituo
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Matawi katika hali <code className="rounded bg-slate-100 px-1 text-[11px]">pending_review</code> — thibitisha au
            badilisha kwenye jedwali la Muundo.
            {typeof props.tawiRegistryPendingReviewKpi === "number" &&
            !props.tawiRegistryPendingReviewKpiFailed &&
            props.tawiRegistryPendingReviewKpi > tawiRegistryPending.length ? (
              <span className="mt-1 block text-[11px] text-amber-800">
                KPI ina hesabu ya jumla ({props.tawiRegistryPendingReviewKpi}); jedwali hapa lina matawi yaliyopakiwa kwenye
                dashibodi pekee — fungua Muundo kwa orodha kamili.
              </span>
            ) : null}
          </p>
          <div className="mt-3 overflow-auto rounded-lg border border-slate-200 bg-slate-50/40 shadow-inner">
            <table className="w-full min-w-[560px] text-left text-[13px] text-slate-900">
              <thead className="sticky top-0 z-10 border-b-2 border-slate-300 bg-slate-200 text-slate-950">
                <tr>
                  <th className="px-3 py-2.5 font-bold">Tawi</th>
                  <th className="px-3 py-2.5 font-bold">Msimbo</th>
                  <th className="px-3 py-2.5 font-bold">Jimbo</th>
                  <th className="px-3 py-2.5 w-44 font-bold">Vitendo</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {tawiRegistryPending.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-slate-600">
                      {typeof props.tawiRegistryPendingReviewKpi === "number" &&
                      !props.tawiRegistryPendingReviewKpiFailed &&
                      props.tawiRegistryPendingReviewKpi > 0 ? (
                        <>
                          Hakuna mistari ya matawi yaliyoalikwa hapa, lakini KPI ina{" "}
                          <strong className="tabular-nums text-slate-900">{props.tawiRegistryPendingReviewKpi}</strong>{" "}
                          yanayosubiri uhakiki wa sajili. Tumia &quot;Fungua Matawi / Vituo&quot; au tafuta kwenye Muundo.
                        </>
                      ) : (
                        "Hakuna matawi yanayosubiri uhakiki wa sajili."
                      )}
                    </td>
                  </tr>
                ) : (
                  tawiRegistryPending.map((r) => (
                    <tr key={r.id} className="border-t border-slate-200 odd:bg-slate-50/90">
                      <td className="px-3 py-2.5 font-semibold text-slate-900">{r.jina}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-700">{r.branch_code?.trim() || "—"}</td>
                      <td className="px-3 py-2.5 text-slate-800">{r.jimbo?.trim() || "—"}</td>
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-[#0B1F3A] shadow-sm hover:bg-slate-50"
                          onClick={() =>
                            window.dispatchEvent(
                              new CustomEvent("kmt-portal-navigate", {
                                detail: { moduleKey: "muundo", submodule: "Orodha ya Matawi / Vituo", recordId: r.id },
                              })
                            )
                          }
                        >
                          Fungua kwenye jedwali
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {noteModal ? (
        <ModalScrollLayer onBackdropClick={() => !busyId && setNoteModal(null)}>
          <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-5 shadow-2xl" role="dialog" aria-modal="true">
            <h3 className="text-lg font-bold text-slate-900">
              {noteModal.action === "approve" ? "Idhinisha" : "Kataa"} — maelezo
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              {noteModal.action === "reject" ? "Andika sababu (inahitajika)." : "Maelezo ya ziada (si lazima)."}
            </p>
            <textarea
              className="mt-3 w-full rounded-xl border px-3 py-2 text-sm"
              rows={4}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" disabled={!!busyId} className="rounded-lg border px-3 py-2 text-sm" onClick={() => setNoteModal(null)}>
                Ghairi
              </button>
              <button
                type="button"
                disabled={!!busyId}
                className="rounded-lg bg-[#0B3C5D] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                onClick={() => void submitNote()}
              >
                {busyId ? "Inachakata…" : "Thibitisha"}
              </button>
            </div>
          </div>
        </ModalScrollLayer>
      ) : null}

      {detailRow ? (
        <ModalScrollLayer onBackdropClick={() => setDetailRow(null)}>
          <div className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-2xl border bg-white p-4 shadow-2xl">
            <h3 className="font-bold text-slate-900">{detailRow.title}</h3>
            <pre className="mt-2 whitespace-pre-wrap text-[11px] text-slate-700">{detailRow.body}</pre>
            <button type="button" className="mt-4 rounded-lg border px-3 py-2 text-sm" onClick={() => setDetailRow(null)}>
              Funga
            </button>
          </div>
        </ModalScrollLayer>
      ) : null}
    </div>
  );
}
