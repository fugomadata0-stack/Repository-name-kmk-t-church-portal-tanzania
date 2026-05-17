import { memo, type ReactElement } from "react";
import { ResponsiveContainer } from "recharts";
import { HAKUNA_DATA_BADO_SW } from "../../lib/supabaseUiMessages";
import { useInViewport } from "../../hooks/useInViewport";

type Props = {
  title: string;
  height?: number;
  isEmpty: boolean;
  emptyMessage?: string;
  children: ReactElement;
  className?: string;
};

const DEFAULT_CHART_PX = 224;

function SafeChartBoxInner({
  title,
  height = DEFAULT_CHART_PX,
  isEmpty,
  emptyMessage = HAKUNA_DATA_BADO_SW,
  children,
  className = "",
}: Props) {
  const { ref, inView } = useInViewport<HTMLDivElement>({ rootMargin: "160px 0px" });

  return (
    <div ref={ref} className={className}>
    <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow">
      <h4 className="text-sm font-bold text-[#0B1F3A]">{title}</h4>
      {isEmpty ? (
        <p className="mt-3 flex min-h-[8rem] items-center justify-center text-center text-xs text-slate-600" role="status">
          {emptyMessage}
        </p>
      ) : !inView ? (
        <div className="chart-safe-box mt-2 w-full min-w-0 rounded-xl bg-slate-100/90" style={{ minHeight: height, height }} aria-hidden />
      ) : (
        <div className="chart-safe-box mt-2 w-full min-w-0" style={{ minHeight: height, height }}>
          <ResponsiveContainer width="100%" height={height} debounce={80}>
            {children}
          </ResponsiveContainer>
        </div>
      )}
    </article>
    </div>
  );
}

export const SafeChartBox = memo(SafeChartBoxInner);
