import { useCallback, useEffect, useMemo, useState } from "react";
import type { Column } from "../common/PremiumTable";
import { PremiumTable } from "../common/PremiumTable";
import { ConfirmModal } from "../common/ConfirmModal";
import { usePortal } from "../../context/PortalContext";
import type { PortalDirectoryProfile, UserRole } from "../../types";
import { fetchDirectoryProfiles } from "../../services/phase34PromotionService";
import {
  canAdminTargetLifecycle,
  fetchUnifiedRoleAndLifecycleTimeline,
  userLifecycleAction,
  type UnifiedAuditRow,
} from "../../services/phase36UserLifecycleService";

export function AccountLifecyclePanel() {
  const { role, session, pushToast, reportError, logAudit } = usePortal();
  const [profiles, setProfiles] = useState<PortalDirectoryProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [timeline, setTimeline] = useState<UnifiedAuditRow[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(true);
  const [pending, setPending] = useState<
    null | { action: "activate" | "suspend" | "reset_password"; profile: PortalDirectoryProfile }
  >(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const actorAuthId = session?.user?.id ?? null;

  const loadProfiles = useCallback(async () => {
    setLoadingProfiles(true);
    try {
      const rows = await fetchDirectoryProfiles();
      setProfiles(rows);
    } catch (e) {
      reportError(e, "phase36 profiles");
      setProfiles([]);
    } finally {
      setLoadingProfiles(false);
    }
  }, [reportError]);

  const loadTimeline = useCallback(async () => {
    setLoadingTimeline(true);
    try {
      const rows = await fetchUnifiedRoleAndLifecycleTimeline(150);
      setTimeline(rows);
    } catch (e) {
      reportError(e, "phase36 timeline");
      setTimeline([]);
    } finally {
      setLoadingTimeline(false);
    }
  }, [reportError]);

  useEffect(() => {
    void loadProfiles();
    void loadTimeline();
  }, [loadProfiles, loadTimeline]);

  async function runLifecycle() {
    if (!pending) return;
    setBusy(true);
    try {
      const res = await userLifecycleAction({
        action: pending.action,
        profile_id: pending.profile.id,
        reason: reason.trim() || undefined,
      });
      if (!res.ok) {
        pushToast(res.error ?? "Imeshindwa.", "error");
        return;
      }
      await logAudit(`phase36_${pending.action}`, "portal_directory_profiles", pending.profile.id, {
        email: pending.profile.email,
      });
      if (pending.action === "reset_password") {
        pushToast(
          res.email_sent
            ? "Barua ya kuweka upya nenosiri imetumwa."
            : "Barua haijatumwa — tumia kiungo cha urejeshaji kilicho hifadhiwa.",
          res.email_sent ? "success" : "info"
        );
        const link = res.recovery_link;
        if (link && (import.meta.env.DEV || res.mock_mode || res.email_error)) {
          try {
            await navigator.clipboard.writeText(link);
            pushToast("Kiungo cha urejeshaji kimenakiliwa.", "info");
          } catch {
            pushToast(link.slice(0, 120) + "…", "info");
          }
        }
      } else {
        pushToast(pending.action === "activate" ? "Akaunti imewashwa." : "Akaunti imesimamishwa.", "success");
      }
      setPending(null);
      setReason("");
      await loadProfiles();
      await loadTimeline();
    } catch (e) {
      reportError(e, "phase36 lifecycle");
    } finally {
      setBusy(false);
    }
  }

  const timelineColumns: Column<UnifiedAuditRow>[] = useMemo(
    () => [
      {
        key: "created_at",
        label: "Tarehe",
        sortable: true,
        render: (r) => new Date(r.created_at).toLocaleString(),
      },
      {
        key: "kind",
        label: "Aina",
        sortable: true,
        render: (r) =>
          r.kind === "lifecycle" ? (
            <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-900">Maisha ya akaunti</span>
          ) : (
            <span className="rounded bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-900">Jukumu</span>
          ),
      },
      {
        key: "_d",
        label: "Maelezo",
        render: (r) => {
          if (r.kind === "lifecycle") {
            const d = r.detail;
            const meta = d.metadata ?? {};
            return (
              <span className="text-sm">
                <strong>{d.action}</strong> · {d.target_email} ({d.target_role})
                {d.previous_status || d.new_status ? (
                  <span className="text-slate-600">
                    {" "}
                    · {d.previous_status ?? "—"} → {d.new_status ?? "—"}
                  </span>
                ) : null}
                {typeof meta.email_sent === "boolean" ? (
                  <span className="text-slate-600"> · barua: {meta.email_sent ? "ndiyo" : "hapana"}</span>
                ) : null}
              </span>
            );
          }
          const d = r.detail;
          return (
            <span className="text-sm">
              {d.previous_role_key} → {d.new_role_key} · <em>{d.action}</em> · {d.profile_id.slice(0, 8)}…
            </span>
          );
        },
      },
    ],
    []
  );

  const profileColumns: Column<PortalDirectoryProfile>[] = useMemo(
    () => [
      { key: "full_name", label: "Jina", sortable: true, render: (r) => r.full_name ?? "—" },
      { key: "email", label: "Barua pepe", sortable: true },
      { key: "role_key", label: "Jukumu", sortable: true },
      {
        key: "status",
        label: "Hali",
        sortable: true,
        filterValues: ["pending", "invited", "active", "suspended"],
      },
      {
        key: "_auth",
        label: "Auth",
        render: (r) => (r.auth_user_id ? "✓" : "—"),
      },
      {
        key: "_act",
        label: "Vitendo",
        render: (r) => {
          const ok = canAdminTargetLifecycle(role as UserRole, r);
          const isSelf = Boolean(actorAuthId && r.auth_user_id === actorAuthId);
          return (
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                disabled={!ok || r.status === "active" || isSelf}
                className="rounded border border-emerald-200 px-2 py-0.5 text-[10px] text-emerald-900 hover:bg-emerald-50 disabled:opacity-40"
                onClick={() => setPending({ action: "activate", profile: r })}
                title={!ok ? "Super Admin hawezi kudhibiti Chief Admin." : isSelf ? "Huwezi kwa akaunti yako." : ""}
              >
                Washa
              </button>
              <button
                type="button"
                disabled={!ok || r.status === "suspended" || isSelf}
                className="rounded border border-rose-200 px-2 py-0.5 text-[10px] text-rose-900 hover:bg-rose-50 disabled:opacity-40"
                onClick={() => setPending({ action: "suspend", profile: r })}
                title={!ok ? "Super Admin hawezi kudhibiti Chief Admin." : isSelf ? "Huwezi kwa akaunti yako." : ""}
              >
                Simamisha
              </button>
              <button
                type="button"
                disabled={!ok || !r.auth_user_id}
                className="rounded border border-blue-200 px-2 py-0.5 text-[10px] text-blue-900 hover:bg-blue-50 disabled:opacity-40"
                onClick={() => setPending({ action: "reset_password", profile: r })}
                title={!r.auth_user_id ? "Hakuna akaunti ya kuingia." : ""}
              >
                Nenosiri
              </button>
            </div>
          );
        },
      },
    ],
    [role, actorAuthId]
  );

  const confirmTitle =
    pending?.action === "activate"
      ? "Washa akaunti"
      : pending?.action === "suspend"
        ? "Simamisha akaunti"
        : "Weka upya nenosiri";

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-[#0f1e46]">Wasifu na vitendo (Phase 36)</h3>
        <p className="mt-1 text-xs text-slate-600">
          Washa / Simamisha hali ya directory na Auth (ban). Urejeshaji wa nenosiri: barua kupitia SendGrid ikiwa imesanidiwa; vinginevyo kiungo cha majaribio.
        </p>
        <PremiumTable<PortalDirectoryProfile>
          title="Watumishi"
          subtitle="portal_directory_profiles"
          rows={profiles}
          columns={profileColumns}
          canAdd={false}
          canEdit={false}
          canDelete={false}
          canExport
          exportBasename="portal_directory_lifecycle"
          isLoading={loadingProfiles}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-[#0f1e46]">Mfululizo wa historia — Jukumu + Maisha ya akaunti</h3>
        <p className="mt-1 text-xs text-slate-600">Muunganisho wa Phase 34 (mabadiliko ya jukumu) na Phase 36 (activate / suspend / reset).</p>
        <PremiumTable<UnifiedAuditRow>
          title="Timeline"
          subtitle="phase36 + phase34"
          rows={timeline.slice(0, 80)}
          columns={timelineColumns}
          canAdd={false}
          canEdit={false}
          canDelete={false}
          canExport={false}
          isLoading={loadingTimeline}
        />
      </div>

      <ConfirmModal
        open={!!pending}
        title={confirmTitle}
        message={
          pending
            ? `${pending.profile.email} · ${pending.profile.role_key} · sasa: ${pending.profile.status}`
            : ""
        }
        confirmLabel="Thibitisha"
        cancelLabel="Ghairi"
        confirmLoading={busy}
        onCancel={() => {
          setPending(null);
          setReason("");
        }}
        onConfirm={async () => {
          await runLifecycle();
        }}
        extra={
          <label className="grid gap-1 text-sm">
            Sababu (si lazima) / Reason (optional)
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
            />
          </label>
        }
      />
    </div>
  );
}
