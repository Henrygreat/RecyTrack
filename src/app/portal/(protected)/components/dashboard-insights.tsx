"use client";

import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Package, ShieldCheck } from "lucide-react";

type StatusCount = { status: string; count: number };

const colors = ["#0f766e", "#2563eb", "#047857", "#b45309", "#7c3aed", "#be123c", "#475569"];

export function DashboardCounter({ value }: { value: number }) {
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || value === 0) {
      setShown(value);
      return;
    }
    let frame = 0;
    let start: number | undefined;
    const tick = (time: number) => {
      start ??= time;
      const progress = Math.min((time - start) / 700, 1);
      setShown(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <span aria-label={value.toLocaleString("en-GB")}>{shown.toLocaleString("en-GB")}</span>;
}

export function AssetLifecycle({ statuses }: { statuses: StatusCount[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const data = statuses.map((item, index) => ({
    name: item.status.replace(/_/g, " "),
    value: item.count,
    color: colors[index % colors.length],
  }));
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const selectedItem = data.find((item) => item.name === selected);

  return (
    <section className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-bento">
      <div className="flex items-center gap-3">
        <span className="rounded-lg bg-teal-50 p-2 text-teal-700"><Package className="h-5 w-5" /></span>
        <div><h2 className="font-semibold text-slate-900">Asset lifecycle</h2><p className="text-sm text-slate-600">Current recorded statuses</p></div>
      </div>
      {total === 0 ? (
        <p className="py-12 text-center text-sm text-slate-600">No assets have been recorded yet.</p>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
          <div className="relative h-48 w-48 shrink-0" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" innerRadius={58} outerRadius={84} isAnimationActive={false} stroke="#fff">
                  {data.map((item) => <Cell key={item.name} fill={item.color} opacity={!selected || selected === item.name ? 1 : 0.3} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-slate-900">{selectedItem?.value ?? total}</span>
              <span className="text-xs text-slate-600">{selectedItem ? "selected" : "total assets"}</span>
            </div>
          </div>
          <div className="grid w-full grid-cols-1 gap-1">
            {data.map((item) => (
              <button key={item.name} type="button" aria-pressed={selected === item.name} onClick={() => setSelected(selected === item.name ? null : item.name)} className="flex items-center gap-2 rounded-md px-2 py-1 text-left text-sm text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-700">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="flex-1 capitalize">{item.name.toLowerCase()}</span>
                <span className="font-semibold">{item.value}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export function MediaProgress({ completed, total }: { completed: number; total: number }) {
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const circumference = 2 * Math.PI * 42;
  return (
    <section className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-bento">
      <div className="flex items-center gap-3">
        <span className="rounded-lg bg-blue-50 p-2 text-blue-700"><ShieldCheck className="h-5 w-5" /></span>
        <div><h2 className="font-semibold text-slate-900">Data security</h2><p className="text-sm text-slate-600">Recorded media sanitisation statuses</p></div>
      </div>
      {total === 0 ? <p className="py-12 text-center text-sm text-slate-600">No storage media records available.</p> : (
        <div className="mt-5 flex items-center justify-center gap-6">
          <div className="relative h-32 w-32 shrink-0">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="9" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="#0f766e" strokeWidth="9" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - completed / total)} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-slate-900">{percent}%</span>
          </div>
          <p className="text-sm text-slate-600"><strong className="block text-xl text-slate-900">{completed} / {total}</strong>media marked verified, destroyed or erasure passed</p>
        </div>
      )}
    </section>
  );
}
