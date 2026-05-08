import { useEffect, useState } from "react";
import { getSupabase } from "../lib/supabaseClient";

type VerifyPayload = {
  member_id: string;
  full_name: string;
  member_number: string;
  membership_status: string;
  branch_name: string;
  valid_member: boolean;
};

export function VerifyMemberPage({ memberId }: { memberId: string }) {
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<VerifyPayload | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let stop = false;
    void (async () => {
      const c = getSupabase();
      if (!c) {
        setErr("Imeshindikana kuunganisha uhakiki.");
        setLoading(false);
        return;
      }
      const { data, error } = await c.rpc("verify_member_public", { p_member_id: memberId });
      if (stop) return;
      if (error) {
        setErr("Imeshindikana kuunganisha uhakiki.");
      } else {
        const row = (data as VerifyPayload[] | null)?.[0] ?? null;
        setPayload(row);
      }
      setLoading(false);
    })();
    return () => {
      stop = true;
    };
  }, [memberId]);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow">
        <h1 className="text-xl font-bold text-[#0B1F3A]">Uhakiki wa Muumini</h1>
        {loading ? <p className="mt-3 text-sm text-slate-600">Inahakiki...</p> : null}
        {!loading && err ? <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{err}</p> : null}
        {!loading && !err && !payload ? <p className="mt-3 text-sm text-slate-600">Not found</p> : null}
        {!loading && payload ? (
          <div className="mt-4 space-y-2 text-sm">
            <p><span className="font-semibold">Jina:</span> {payload.full_name || "—"}</p>
            <p><span className="font-semibold">Namba:</span> {payload.member_number || "—"}</p>
            <p><span className="font-semibold">Status:</span> {payload.membership_status || "—"}</p>
            <p><span className="font-semibold">Tawi:</span> {payload.branch_name || "—"}</p>
            <p className="mt-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Valid member</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
