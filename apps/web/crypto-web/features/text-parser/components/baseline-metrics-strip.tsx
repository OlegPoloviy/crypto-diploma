"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { ParsedText } from "../types/parsed-text";

function formatMetric(value?: number | null): string {
  return typeof value === "number" ? value.toFixed(3) : "—";
}

export function BaselineMetricsStrip({
  parsedTexts,
  selectedParsedText,
}: {
  parsedTexts: ParsedText[];
  selectedParsedText?: ParsedText;
}) {
  const { t } = useTranslation();

  const { natural, random } = useMemo(() => {
    if (!selectedParsedText) {
      return { natural: undefined, random: undefined };
    }

    if (selectedParsedText.corpusKind === "natural_text") {
      const sibling = selectedParsedText.baselineSetId
        ? parsedTexts.find(
            (item) =>
              item.baselineSetId === selectedParsedText.baselineSetId &&
              item.corpusKind === "random_bytes",
          )
        : undefined;

      return { natural: selectedParsedText, random: sibling };
    }

    const naturalSibling = selectedParsedText.baselineSetId
      ? parsedTexts.find(
          (item) =>
            item.baselineSetId === selectedParsedText.baselineSetId &&
            item.corpusKind === "natural_text",
        )
      : undefined;

    return { natural: naturalSibling, random: selectedParsedText };
  }, [parsedTexts, selectedParsedText]);

  if (!natural && !random) {
    return null;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-white/10 dark:bg-[#080b16]">
      <p className="font-semibold uppercase tracking-[0.18em] text-slate-500">
        {t("Baseline metrics")}
      </p>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <BaselineColumn label={t("Natural text")} item={natural} />
        <BaselineColumn label={t("Random bytes")} item={random} />
      </div>
    </div>
  );
}

function BaselineColumn({
  label,
  item,
}: {
  label: string;
  item?: ParsedText;
}) {
  return (
    <div>
      <p className="text-slate-600 dark:text-slate-400">{label}</p>
      {item ? (
        <p className="mt-1 tabular-nums text-slate-800 dark:text-slate-200">
          H {formatMetric(item.hurstExponent)} · α {formatMetric(item.dfaAlpha)}{" "}
          · S {formatMetric(item.wordFrequencyEntropy)}
        </p>
      ) : (
        <p className="mt-1 text-slate-400">—</p>
      )}
    </div>
  );
}
