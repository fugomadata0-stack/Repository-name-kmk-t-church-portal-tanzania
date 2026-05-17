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
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SafeChartBox } from "../common/SafeChartBox";
import type { MapatoIncomeChartsProps } from "./MapatoIncomeCharts.types";

export type { MapatoIncomeChartsProps } from "./MapatoIncomeCharts.types";

export function MapatoIncomeCharts({
  monthlyTrendData,
  paymentMethodData,
  incomeByCategoryData,
  incomeBySourceData,
}: MapatoIncomeChartsProps) {
  const paymentEmpty = paymentMethodData.every((x) => !x.value || x.value === 0);

  return (
    <>
      <section className="grid gap-3 xl:grid-cols-2">
        <SafeChartBox title="Mwelekeo wa Mapato kwa Mwezi" isEmpty={monthlyTrendData.length === 0}>
          <LineChart data={monthlyTrendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="amount" stroke="#0B1F3A" strokeWidth={2} />
          </LineChart>
        </SafeChartBox>
        <SafeChartBox title="Njia za Malipo" isEmpty={paymentEmpty}>
          <PieChart>
            <Pie data={paymentMethodData} dataKey="value" nameKey="name" outerRadius={72} label>
              {paymentMethodData.map((_, i) => (
                <Cell key={`pay-${i}`} fill={["#0B1F3A", "#123C69", "#D4AF37"][i % 3]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </SafeChartBox>
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        <SafeChartBox title="Mapato kwa Kategoria" isEmpty={incomeByCategoryData.length === 0}>
          <BarChart data={incomeByCategoryData.slice(0, 10)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" hide />
            <YAxis />
            <Tooltip />
            <Bar dataKey="amount" fill="#123C69" />
          </BarChart>
        </SafeChartBox>
        <SafeChartBox title="Mapato kwa Chanzo" isEmpty={incomeBySourceData.length === 0}>
          <BarChart data={incomeBySourceData.slice(0, 10)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" hide />
            <YAxis />
            <Tooltip />
            <Bar dataKey="amount" fill="#0B1F3A" />
          </BarChart>
        </SafeChartBox>
      </section>
    </>
  );
}
