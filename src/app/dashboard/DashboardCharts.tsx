"use client";

import { AreaChart } from "@/components/charts/AreaChart";
import { DonutChart } from "@/components/charts/DonutChart";

interface DashboardChartsProps {
  weeklyData: Array<{ name: string; value: number; [key: string]: string | number }>;
  statusData: Array<{ name: string; value: number; color: string }>;
  chartType: "area" | "donut";
  total?: number;
}

export function DashboardCharts({ weeklyData, statusData, chartType, total }: DashboardChartsProps) {
  if (chartType === "area") {
    return <AreaChart data={weeklyData} height={220} color="#0d9488" />;
  }

  if (chartType === "donut") {
    return (
      <DonutChart
        data={statusData}
        height={180}
        innerRadius={50}
        outerRadius={70}
        centerValue={total}
        centerLabel="Total"
      />
    );
  }

  return null;
}
