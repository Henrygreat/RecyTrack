"use client";

import { Clock, Cog, CheckCircle, AlertTriangle, TrendingUp } from "lucide-react";

interface ProcessingStatusProps {
  inspection: number;
  processing: number;
  ready: number;
  attention: number;
}

export function ProcessingStatus({
  inspection,
  processing,
  ready,
  attention,
}: ProcessingStatusProps) {
  const statuses = [
    {
      label: "Awaiting Inspection",
      value: inspection,
      icon: Clock,
      bgColor: "bg-amber-50",
      iconColor: "text-amber-500",
      valueColor: "text-amber-600",
      barColor: "bg-amber-500",
    },
    {
      label: "In Processing",
      value: processing,
      icon: Cog,
      bgColor: "bg-blue-50",
      iconColor: "text-blue-500",
      valueColor: "text-blue-600",
      barColor: "bg-blue-500",
    },
    {
      label: "Ready / Completed",
      value: ready,
      icon: CheckCircle,
      bgColor: "bg-emerald-50",
      iconColor: "text-emerald-500",
      valueColor: "text-emerald-600",
      barColor: "bg-emerald-500",
    },
  ];

  const total = inspection + processing + ready;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-bento p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-muted-text" />
        <h3 className="font-semibold text-midnight-navy">Processing Status</h3>
      </div>

      <div className="space-y-3">
        {statuses.map((status) => {
          const percentage = total > 0 ? (status.value / total) * 100 : 0;
          return (
            <div key={status.label} className={`p-3 rounded-lg ${status.bgColor}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <status.icon className={`w-4 h-4 ${status.iconColor}`} />
                  <span className="text-sm text-slate-700">{status.label}</span>
                </div>
                <span className={`font-semibold ${status.valueColor}`}>
                  {status.value.toLocaleString()}
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
                <div
                  className={`h-full ${status.barColor} rounded-full transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}

        {/* Attention required - only show if there are items */}
        {attention > 0 && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-slate-700">Requires Attention</span>
              </div>
              <span className="font-semibold text-red-600">{attention}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
