"use client";

import { Leaf, Recycle, Shield, Trash2, Scale } from "lucide-react";

interface SustainabilityMetricsProps {
  totalAssets: number;
  recycled: number;
  reused: number;
  sanitised: number;
}

export function SustainabilityMetrics({
  totalAssets,
  recycled,
  reused,
  sanitised,
}: SustainabilityMetricsProps) {
  const diverted = recycled + reused;
  const diversionRate = totalAssets > 0 ? Math.round((diverted / totalAssets) * 100) : 0;

  const metrics = [
    {
      label: "Equipment Recycled",
      value: recycled,
      icon: Recycle,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      label: "Equipment Reused",
      value: reused,
      icon: Leaf,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "Media Sanitised",
      value: sanitised,
      icon: Shield,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-bento p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-eco-green/10">
          <Leaf className="w-5 h-5 text-eco-green" />
        </div>
        <div>
          <h3 className="font-semibold text-midnight-navy">Sustainability Impact</h3>
          <p className="text-xs text-muted-text">Your environmental contribution</p>
        </div>
      </div>

      {/* Diversion Rate */}
      {totalAssets > 0 && (
        <div className="mb-4 p-4 rounded-lg bg-gradient-to-br from-eco-green/10 to-emerald-50 border border-eco-green/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Landfill Diversion Rate</span>
            <span className="text-2xl font-bold text-eco-green">{diversionRate}%</span>
          </div>
          <div className="h-2 bg-white/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-eco-green to-emerald-400 rounded-full transition-all duration-700"
              style={{ width: `${diversionRate}%` }}
            />
          </div>
          <p className="text-xs text-muted-text mt-2 flex items-center gap-1">
            <Trash2 className="w-3 h-3" />
            {diverted.toLocaleString()} of {totalAssets.toLocaleString()} items diverted
          </p>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-3">
        {metrics.map((metric) => (
          <div key={metric.label} className={`p-3 rounded-lg ${metric.bgColor} text-center`}>
            <metric.icon className={`w-5 h-5 ${metric.color} mx-auto mb-1`} />
            <p className={`text-lg font-bold ${metric.color}`}>
              {metric.value.toLocaleString()}
            </p>
            <p className="text-2xs text-slate-600 leading-tight">{metric.label}</p>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <p className="text-2xs text-slate-400 mt-4 text-center">
        Based on verified processing records
      </p>
    </div>
  );
}
