"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber, formatTime } from "../lib/format";
import { downloadParsedTextCorpus } from "../lib/download";
import { ParsedText } from "../types/parsed-text";
import { StatusBadge } from "./status-badge";

export function ParsedTextDetails({ selected }: { selected?: ParsedText }) {
  const { t } = useTranslation();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);

  async function handleDownload() {
    if (!selected || selected.status !== "completed") {
      return;
    }

    setDownloadMessage(null);
    setIsDownloading(true);

    try {
      await downloadParsedTextCorpus({
        id: selected.id,
        title: selected.title,
      });
    } catch (error) {
      setDownloadMessage(
        error instanceof Error ? error.message : t("Failed to download text"),
      );
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <Card className="min-w-0 border-slate-200 bg-white dark:border-white/10 dark:bg-[#111424]">
      <CardHeader>
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
          {t("Auto Summary")}
        </p>
        <CardTitle className="mt-1 text-lg text-slate-950 dark:text-slate-50">
          {t("Corpus details")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {selected ? (
          <CorpusDetailsBody
            selected={selected}
            isDownloading={isDownloading}
            downloadMessage={downloadMessage}
            onDownload={() => void handleDownload()}
            t={t}
          />
        ) : (
          <p className="text-sm leading-6 text-slate-500">
            {t("Select a corpus to inspect parser status and metadata.")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function CorpusDetailsBody({
  selected,
  isDownloading,
  downloadMessage,
  onDownload,
  t,
}: {
  selected: ParsedText;
  isDownloading: boolean;
  downloadMessage: string | null;
  onDownload: () => void;
  t: (key: string) => string;
}) {
  const canDownload = selected.status === "completed";

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-slate-500">{t("Selected corpus")}</p>
        <p className="mt-1 font-medium text-slate-950 dark:text-slate-100">
          {selected.title}
        </p>
      </div>
      <StatusBadge status={selected.status} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DetailMetric label={t("Words")} value={formatNumber(selected.totalWords)} />
        <DetailMetric label={t("Chars")} value={formatNumber(selected.totalChars)} />
        <DetailMetric label={t("Unique")} value={formatNumber(selected.uniqueWords)} />
        <DetailMetric label={t("Updated")} value={formatTime(selected.updatedAt)} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <DetailMetric
          label={t("Hurst")}
          value={
            typeof selected.hurstExponent === "number"
              ? selected.hurstExponent.toFixed(4)
              : t("Pending")
          }
        />
        <DetailMetric
          label={t("DFA alpha")}
          value={
            typeof selected.dfaAlpha === "number"
              ? selected.dfaAlpha.toFixed(4)
              : t("Pending")
          }
        />
        <DetailMetric
          label={t("Entropy")}
          value={
            typeof selected.wordFrequencyEntropy === "number"
              ? selected.wordFrequencyEntropy.toFixed(4)
              : t("Pending")
          }
        />
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={!canDownload || isDownloading}
        onClick={onDownload}
        className="w-full border-slate-200 bg-white dark:border-white/10 dark:bg-white/5"
      >
        <Download className="size-4" />
        {isDownloading ? t("Downloading...") : t("Download corpus text")}
      </Button>
      {downloadMessage ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
          {downloadMessage}
        </p>
      ) : null}
      <div className="rounded-md border border-cyan-200 bg-cyan-50 p-3 dark:border-cyan-400/20 dark:bg-cyan-400/10">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
          {t("Parsed text id")}
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
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#080b16]">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950 tabular-nums dark:text-slate-100">
        {value}
      </p>
    </div>
  );
}
