"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity } from "lucide-react";
import { useTranslation } from "react-i18next";

import { listCipherJobs } from "@/features/classical-ciphers/lib/api";
import { ClassicalCipherJob } from "@/features/classical-ciphers/types/classical-cipher";
import { listComplexCipherJobs } from "@/features/complex-ciphers/lib/api";
import { ComplexCipherJob } from "@/features/complex-ciphers/types/aes-cipher";

import { ParsedText } from "../types/parsed-text";

interface MetricRow {
  label: string;
  hurst?: number | null;
  dfa?: number | null;
  dea?: number | null;
  entropy?: number | null;
  note?: string;
}

function formatMetric(value?: number | null): string {
  return typeof value === "number" ? value.toFixed(4) : "—";
}

function pickEncryptedMetrics(
  job: ComplexCipherJob | ClassicalCipherJob | undefined,
): Pick<MetricRow, "hurst" | "dfa" | "dea" | "entropy"> {
  if (!job?.metricStats?.length) {
    return {};
  }

  const byKey = Object.fromEntries(
    job.metricStats.map((stat) => [stat.key, stat.final]),
  );

  return {
    hurst: byKey.hurstExponent,
    dfa: byKey.dfaAlpha,
    dea: byKey.deaDelta,
    entropy: byKey.wordFrequencyEntropy,
  };
}

export function BaselineComparisonPanel({
  items,
  selected,
}: {
  items: ParsedText[];
  selected?: ParsedText;
}) {
  const { t } = useTranslation();
  const [complexJobs, setComplexJobs] = useState<ComplexCipherJob[]>([]);
  const [classicalJobs, setClassicalJobs] = useState<ClassicalCipherJob[]>([]);
  const [loadedForId, setLoadedForId] = useState<string | null>(null);

  const natural = useMemo(() => {
    if (!selected) {
      return undefined;
    }

    if (selected.corpusKind === "natural_text") {
      return selected;
    }

    if (selected.baselineSetId) {
      return items.find(
        (item) =>
          item.baselineSetId === selected.baselineSetId &&
          item.corpusKind === "natural_text",
      );
    }

    return undefined;
  }, [items, selected]);

  const random = useMemo(() => {
    if (!natural?.baselineSetId) {
      return items.find((item) => item.corpusKind === "random_bytes");
    }

    return items.find(
      (item) =>
        item.baselineSetId === natural.baselineSetId &&
        item.corpusKind === "random_bytes",
    );
  }, [items, natural]);

  const naturalId = natural?.id;
  const isLoading = Boolean(naturalId && loadedForId !== naturalId);

  useEffect(() => {
    if (!naturalId) {
      return;
    }

    let cancelled = false;

    void Promise.all([listComplexCipherJobs(), listCipherJobs()])
      .then(([complex, classical]) => {
        if (!cancelled) {
          setComplexJobs(complex);
          setClassicalJobs(classical);
          setLoadedForId(naturalId);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setComplexJobs([]);
          setClassicalJobs([]);
          setLoadedForId(naturalId);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [naturalId]);

  const encryptedJob = useMemo(() => {
    if (!naturalId) {
      return undefined;
    }

    const completedComplex = complexJobs
      .filter(
        (job) =>
          job.parsedTextId === naturalId && job.status === "completed",
      )
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );

    if (completedComplex[0]) {
      return completedComplex[0];
    }

    return classicalJobs
      .filter(
        (job) =>
          job.parsedTextId === naturalId && job.status === "completed",
      )
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )[0];
  }, [classicalJobs, complexJobs, naturalId]);

  const rows: MetricRow[] = [
    {
      label: t("Natural text"),
      hurst: natural?.hurstExponent,
      dfa: natural?.dfaAlpha,
      dea: natural?.deaDelta,
      entropy: natural?.wordFrequencyEntropy,
      note: natural?.status !== "completed" ? t("Pending") : undefined,
    },
    {
      label: t("Encrypted"),
      ...pickEncryptedMetrics(encryptedJob),
      note: encryptedJob
        ? undefined
        : isLoading
          ? t("Loading...")
          : t("No completed cipher job"),
    },
    {
      label: t("Random bytes"),
      hurst: random?.hurstExponent,
      dfa: random?.dfaAlpha,
      dea: random?.deaDelta,
      entropy: random?.wordFrequencyEntropy,
      note: random ? undefined : t("No random sibling"),
    },
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#111424]">
      <ComparisonHeader
        title={t("Baseline comparison")}
        subtitle={t("Side-by-side")}
      />
      <div className="mt-5">
        {!natural ? (
          <p className="text-sm text-slate-500">
            {t("Select a natural text corpus to compare baselines.")}
          </p>
        ) : (
          <ComparisonTable rows={rows} />
        )}
      </div>
    </div>
  );
}

function ComparisonHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <MotionlessHeaderWrap>
      <ComparisonTitle title={title} />
      <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
        {subtitle}
      </span>
    </MotionlessHeaderWrap>
  );
}

function MotionlessHeaderWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">{children}</div>
  );
}

function ComparisonTitle({ title }: { title: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Activity className="size-4 shrink-0 text-slate-500" />
      <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
        {title}
      </h2>
    </div>
  );
}

function ComparisonTable({ rows }: { rows: MetricRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500 dark:border-white/10 dark:bg-[#0b0f1d]">
          <tr>
            <th className="px-4 py-3 font-medium"> </th>
            <th className="px-4 py-3 font-medium">Hurst</th>
            <th className="px-4 py-3 font-medium">DFA α</th>
            <th className="px-4 py-3 font-medium">DEA</th>
            <th className="px-4 py-3 font-medium">Entropy</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="px-4 py-3 font-medium text-slate-950 dark:text-slate-100">
                {row.label}
                {row.note ? (
                  <p className="mt-1 text-xs font-normal text-slate-500">
                    {row.note}
                  </p>
                ) : null}
              </td>
              <td className="px-4 py-3 tabular-nums text-slate-700 dark:text-slate-300">
                {formatMetric(row.hurst)}
              </td>
              <td className="px-4 py-3 tabular-nums text-slate-700 dark:text-slate-300">
                {formatMetric(row.dfa)}
              </td>
              <td className="px-4 py-3 tabular-nums text-slate-700 dark:text-slate-300">
                {formatMetric(row.dea)}
              </td>
              <td className="px-4 py-3 tabular-nums text-slate-700 dark:text-slate-300">
                {formatMetric(row.entropy)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
