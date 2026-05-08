import { Sparkles, Bot, Search, FileText, ChartNoAxesCombined, Lightbulb, BookText } from "lucide-react";
import { useMemo, useState } from "react";
import { usePortal } from "../../context/PortalContext";
import { stage2GradHeader } from "../../lib/stage2Theme";
import { type AIFeatureKey, isAIAssistantEnabled, runAIFeature } from "../../services/ai/aiAssistantService";
import { GlassPanel, MotionCard } from "../stage2/Stage2Motion";

type FeatureDef = {
  key: AIFeatureKey;
  label: string;
  desc: string;
  icon: typeof Sparkles;
};

const FEATURES: FeatureDef[] = [
  { key: "ai_search", label: "AI Search", desc: "Tafuta taarifa kwa lugha asilia kwenye moduli mbalimbali.", icon: Search },
  { key: "report_summaries", label: "AI Report Summaries", desc: "Fupisha ripoti ndefu kwa pointi muhimu.", icon: FileText },
  { key: "analytics_insights", label: "AI Analytics Insights", desc: "Toa insight za data ya mwenendo na hatari.", icon: ChartNoAxesCombined },
  { key: "dashboard_assistant", label: "AI Dashboard Assistant", desc: "Msaidizi wa maswali ya haraka juu ya KPI na hali ya mfumo.", icon: Bot },
  { key: "sermon_summaries", label: "AI Sermon Summaries", desc: "Fupisha mahubiri na toa mada kuu.", icon: BookText },
  { key: "document_search", label: "AI Document Search", desc: "Tafuta ndani ya nyaraka kwa semantic search.", icon: Search },
  { key: "recommendations", label: "AI Recommendations", desc: "Pendekeza hatua bora kulingana na data ya portal.", icon: Lightbulb },
];

export function AIAssistantPanel(props: { submodule?: string }) {
  const { pushToast, reportError } = usePortal();
  const enabled = isAIAssistantEnabled();

  const initialFeature = useMemo(() => {
    const sub = String(props.submodule ?? "").trim().toLowerCase();
    const found = FEATURES.find((f) => sub && f.label.toLowerCase() === sub);
    return found?.key ?? "dashboard_assistant";
  }, [props.submodule]);

  const [feature, setFeature] = useState<AIFeatureKey>(initialFeature);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState("");
  const [citations, setCitations] = useState<string[]>([]);

  async function onRun() {
    const q = prompt.trim();
    if (!q) {
      pushToast("Andika swali au maelekezo kwanza.", "error");
      return;
    }

    setBusy(true);
    setOutput("");
    setCitations([]);
    try {
      const res = await runAIFeature({
        feature,
        prompt: q,
        context: {
          module_hint: "ai_assistant",
          submodule_hint: props.submodule ?? "",
        },
      });
      if (!res.ok) {
        pushToast(res.error || "AI request imeshindwa.", "error");
        return;
      }
      setOutput(res.output || "(Hakuna majibu)");
      setCitations(res.citations ?? []);
      pushToast("AI response imepokelewa.", "success");
    } catch (err) {
      reportError(err, "AI Assistant");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className={`rounded-2xl border border-violet-200/70 p-6 text-white shadow-xl ${stage2GradHeader}`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">Future-ready AI Layer</p>
        <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold">
          <Sparkles className="h-7 w-7 text-amber-300" />
          AI Features & Smart Assistant
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-blue-100">
          Muundo huu ni wa modular kwa integration ya baadaye (Edge Function / model provider) bila kuweka siri kwenye frontend.
        </p>
      </header>

      <GlassPanel className="p-4">
        <p className={`text-sm font-medium ${enabled ? "text-emerald-700" : "text-amber-800"}`}>
          {enabled
            ? "AI imewezeshwa: request zitapitia Supabase Edge Function."
            : "AI imezimwa kwa sasa: hakuna mock/demo output itaoneshwa bila backend halisi."}
        </p>
      </GlassPanel>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {FEATURES.map((f) => {
          const ActiveIcon = f.icon;
          const active = f.key === feature;
          return (
            <MotionCard key={f.key} className="h-full">
              <button
                type="button"
                onClick={() => setFeature(f.key)}
                className={`h-full w-full rounded-2xl border p-4 text-left transition ${
                  active ? "border-violet-300 bg-violet-50" : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <ActiveIcon className="h-4 w-4 text-violet-700" />
                  <p className="text-sm font-semibold text-slate-900">{f.label}</p>
                </div>
                <p className="mt-2 text-xs text-slate-600">{f.desc}</p>
              </button>
            </MotionCard>
          );
        })}
      </section>

      <GlassPanel className="p-4">
        <label className="grid gap-2 text-sm font-semibold text-slate-800">
          Swali / Prompt
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            placeholder="Mfano: Nipe summary ya hali ya mapato wiki hii na mapendekezo 3 ya kuboresha..."
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void onRun()}
            className="rounded-xl bg-violet-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Inachakata..." : "Run AI"}
          </button>
          <span className="text-xs text-slate-500">Feature: {FEATURES.find((x) => x.key === feature)?.label ?? feature}</span>
        </div>
      </GlassPanel>

      {output ? (
        <GlassPanel className="p-4">
          <h3 className="text-sm font-semibold text-slate-900">Majibu ya AI</h3>
          <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-800">{output}</pre>
          {citations.length > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-semibold text-slate-700">Citations / vyanzo:</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-slate-600">
                {citations.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </GlassPanel>
      ) : null}
    </div>
  );
}
