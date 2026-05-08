import { formatCaughtError } from "../../lib/supabaseErrors";
import { getSupabase } from "../../lib/supabaseClient";

export type AIFeatureKey =
  | "ai_search"
  | "report_summaries"
  | "analytics_insights"
  | "dashboard_assistant"
  | "sermon_summaries"
  | "document_search"
  | "recommendations";

export interface AIRequestPayload {
  feature: AIFeatureKey;
  prompt: string;
  context?: Record<string, unknown>;
}

export interface AIResult {
  ok: boolean;
  output?: string;
  citations?: string[];
  error?: string;
}

const AI_FUNCTION_NAME = (import.meta.env.VITE_AI_FUNCTION_NAME as string | undefined)?.trim() || "portal-ai-assistant";

/**
 * Mfumo wa AI huzimwa kwa default hadi backend iandaliwe.
 * Hii inahakikisha hakuna "fake AI" kwenye production bila configuration ya kweli.
 */
export function isAIAssistantEnabled(): boolean {
  return String(import.meta.env.VITE_AI_ASSISTANT_ENABLED ?? "").trim().toLowerCase() === "true";
}

export async function runAIFeature(input: AIRequestPayload): Promise<AIResult> {
  if (!isAIAssistantEnabled()) {
    return {
      ok: false,
      error:
        "AI Assistant bado haijawezeshwa kwenye mazingira haya. Weka VITE_AI_ASSISTANT_ENABLED=true na deploy Edge Function ya AI.",
    };
  }

  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase haijasanidiwa." };

  try {
    const { data, error } = await sb.functions.invoke<AIResult>(AI_FUNCTION_NAME, {
      body: {
        feature: input.feature,
        prompt: input.prompt,
        context: input.context ?? {},
      },
    });

    if (error) {
      return {
        ok: false,
        error: `AI invoke imeshindwa: ${error.message || "Edge Function haijapatikana."}`,
      };
    }

    if (!data?.ok) {
      return {
        ok: false,
        error: data?.error || "AI haikutoa majibu sahihi.",
      };
    }

    return {
      ok: true,
      output: String(data.output ?? "").trim(),
      citations: Array.isArray(data.citations) ? data.citations.map((x) => String(x)) : [],
    };
  } catch (err) {
    return { ok: false, error: formatCaughtError(err) };
  }
}
