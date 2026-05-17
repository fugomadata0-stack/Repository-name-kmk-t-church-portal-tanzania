import type { ReactElement } from "react";
import { ResponsiveContainer } from "recharts";
import { HAKUNA_DATA_BADO_SW } from "../../lib/supabaseUiMessages";

type Props = {
  title: string;
  height?: number;
  isEmpty: boolean;
  emptyMessage?: string;
  children: ReactElement;
  className?: string;
};

const DEFAULT_CHART_PX = 224;

/** Chati salama — min-height thabiti, hakuna onyo la width/height 0. */
export function SafeChartBox({
  title,
  height = DEFAULT_CHART_PX,
  isEmpty,
  emptyMessage = HAKUNA_DATA_BADO_SW,
  children,
  className = "",
}: Props) {
  return (
    <article className={`rounded-2xl border border-slate-200 bg-white p-3 shadow ${className}`.trim()}>
      <h4 className="text-sm font-bold text-[#0B1F3A]">{title}</h4>
      {isEmpty ? (
        <p className="mt-3 min-h-[8rem] flex items-center justify-center text-center text-xs text-slate-600" role="status">
          {emptyMessage}
        </p>
      ) : (
        <div className="chart-safe-box mt-2 w-full min-w-0" style={{ minHeight: height, height }}>
          <ResponsiveContainer width="100%" height={height} debounce={40}>
            {children}
          </ResponsiveContainer>
        </div>
      )}
    </article>
  );
}
