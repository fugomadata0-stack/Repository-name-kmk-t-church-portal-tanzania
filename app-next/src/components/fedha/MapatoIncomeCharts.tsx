import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface MapatoIncomeChartsProps {
  monthlyTrendData: { month: string; amount: number }[];
  paymentMethodData: { name: string; value: number }[];
  incomeByCategoryData: { name: string; amount: number }[];
  incomeBySourceData: { name: string; amount: number }[];
}

/** Isolated so `recharts` loads only with the Mapato income dashboard chunk. */
export function MapatoIncomeCharts({
  monthlyTrendData,
  paymentMethodData,
  incomeByCategoryData,
  incomeBySourceData,
}: MapatoIncomeChartsProps) {
  return (
    <>
      <section className="grid gap-3 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow">
          <h4 className="text-sm font-bold text-[#0B1F3A]">Monthly Income Trend</h4>
          {monthlyTrendData.length === 0 ? (
            <p className="mt-2 text-xs text-slate-600">Hakuna data bado</p>
          ) : (
            <div className="mt-2 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="amount" stroke="#0B1F3A" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow">
          <h4 className="text-sm font-bold text-[#0B1F3A]">Payment Method Breakdown</h4>
          {paymentMethodData.every((x) => x.value === 0) ? (
            <p className="mt-2 text-xs text-slate-600">Hakuna data bado</p>
          ) : (
            <div className="mt-2 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentMethodData} dataKey="value" nameKey="name" outerRadius={72} label>
                    {paymentMethodData.map((_, i) => (
                      <Cell key={`pay-${i}`} fill={["#0B1F3A", "#123C69", "#D4AF37"][i % 3]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow">
          <h4 className="text-sm font-bold text-[#0B1F3A]">Income by Category</h4>
          {incomeByCategoryData.length === 0 ? (
            <p className="mt-2 text-xs text-slate-600">Hakuna data bado</p>
          ) : (
            <div className="mt-2 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeByCategoryData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" hide />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="amount" fill="#123C69" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow">
          <h4 className="text-sm font-bold text-[#0B1F3A]">Income by Source</h4>
          {incomeBySourceData.length === 0 ? (
            <p className="mt-2 text-xs text-slate-600">Hakuna data bado</p>
          ) : (
            <div className="mt-2 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeBySourceData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" hide />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="amount" fill="#0B1F3A" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
      </section>
    </>
  );
}
