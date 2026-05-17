export interface MapatoIncomeChartsProps {
  monthlyTrendData: { month: string; amount: number }[];
  paymentMethodData: { name: string; value: number }[];
  incomeByCategoryData: { name: string; amount: number }[];
  incomeBySourceData: { name: string; amount: number }[];
}
