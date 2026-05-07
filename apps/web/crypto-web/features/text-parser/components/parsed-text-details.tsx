import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { formatNumber, formatTime } from "../lib/format";
import { ParsedText } from "../types/parsed-text";
import { StatusBadge } from "./status-badge";

export function ParsedTextDetails({ selected }: { selected?: ParsedText }) {
  return (
    <Card className="min-w-0 border-slate-200 bg-white dark:border-white/10 dark:bg-[#111424]">
      <CardHeader>
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
          Auto Summary
        </p>
        <CardTitle className="mt-1 text-lg text-slate-950 dark:text-slate-50">
          Corpus details
        </CardTitle>
      </CardHeader>
      <CardContent>
        {selected ? (
          <div className="space-y-5">
            <div>
              <p className="text-sm text-slate-500">Selected corpus</p>
              <p className="mt-1 font-medium text-slate-950 dark:text-slate-100">
                {selected.title}
              </p>
            </div>
            <StatusBadge status={selected.status} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailMetric label="Words" value={formatNumber(selected.totalWords)} />
              <DetailMetric label="Chars" value={formatNumber(selected.totalChars)} />
              <DetailMetric label="Unique" value={formatNumber(selected.uniqueWords)} />
              <DetailMetric label="Updated" value={formatTime(selected.updatedAt)} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <DetailMetric
                label="Hurst"
                value={formatMetric(selected.hurstExponent)}
              />
              <DetailMetric
                label="DFA alpha"
                value={formatMetric(selected.dfaAlpha)}
              />
              <DetailMetric
                label="Entropy"
                value={formatMetric(selected.wordFrequencyEntropy)}
              />
            </div>
            <div className="rounded-md border border-cyan-200 bg-cyan-50 p-3 dark:border-cyan-400/20 dark:bg-cyan-400/10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
                Parsed text id
              </p>
              <p className="mt-2 break-all font-mono text-xs text-slate-600 dark:text-slate-300">
                {selected.id}
              </p>
            </div>
            {selected.errorMessage ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
                {selected.errorMessage}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm leading-6 text-slate-500">
            Select a corpus to inspect parser status and metadata.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#080b16]">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950 tabular-nums dark:text-slate-100">{value}</p>
    </div>
  );
}

function formatMetric(value?: number | null) {
  return typeof value === "number" ? value.toFixed(4) : "Pending";
}
