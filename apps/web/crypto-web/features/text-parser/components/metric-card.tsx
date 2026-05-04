import { Card, CardContent } from "@/components/ui/card";

import { formatNumber } from "../lib/format";

export function MetricCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: number;
  caption: string;
}) {
  return (
    <Card className="min-w-0 border-slate-200 bg-white dark:border-white/10 dark:bg-[#111424]">
      <CardContent className="p-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
          {label}
        </p>
        <p className="mt-3 text-2xl font-semibold text-slate-950 tabular-nums dark:text-slate-50">
          {formatNumber(value)}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{caption}</p>
      </CardContent>
    </Card>
  );
}
