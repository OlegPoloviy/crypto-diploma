"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Binary,
  BookOpenText,
  Braces,
  CheckCircle2,
  Clipboard,
  Clock3,
  Database,
  Download,
  KeyRound,
  Layers3,
  LockKeyhole,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Shuffle,
  Trash2,
  UnlockKeyhole,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatNumber, formatTime } from "@/features/text-parser/lib/format";
import { TextFileType } from "@/features/text-parser/lib/api";
import { LanguageSwitcher } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

import { useAesWorkspace } from "../hooks/use-aes-workspace";
import {
  AesMode,
  AesOperation,
  BinaryEncoding,
  ComplexCipherJob,
  ComplexCipherJobStatus,
  CipherStep,
} from "../types/aes-cipher";

const encodingOptions: BinaryEncoding[] = ["utf8", "hex", "base64"];
const modeOptions: AesMode[] = ["cbc", "ecb"];
const fileTypeOptions: {
  value: TextFileType;
  label: string;
  accept: string;
}[] = [
  { value: "binary", label: "Binary", accept: "" },
  { value: "plain-text", label: "Plain text", accept: ".txt,.text,text/plain" },
  { value: "markdown", label: "Markdown", accept: ".md,.markdown,text/markdown" },
  { value: "csv", label: "CSV", accept: ".csv,text/csv" },
  { value: "json", label: "JSON", accept: ".json,application/json" },
];
const statusVariant: Record<
  ComplexCipherJobStatus,
  "outline" | "success" | "warning" | "destructive" | "teal"
> = {
  queued: "outline",
  processing: "warning",
  completed: "success",
  failed: "destructive",
};

export function ComplexCipherWorkspace() {
  const workspace = useAesWorkspace();

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-clip bg-slate-50 p-4 text-slate-950 dark:bg-[#070912] dark:text-slate-100 sm:p-6">
      <div className="grid w-full max-w-none min-w-0 grid-cols-1 gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <ComplexCipherSidebar />

        <div className="w-full min-w-0 max-w-full space-y-5 overflow-x-clip">
          <ComplexCipherHero onLoadVector={workspace.loadFipsVector} />

          <section className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
            <AesControlPanel workspace={workspace} />
            <AesIOPanel workspace={workspace} />
          </section>

          <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
            <AesCorpusJobPanel workspace={workspace} />
            <AesJobsPanel workspace={workspace} />
          </section>
        </div>
      </div>
    </main>
  );
}

function AesCorpusJobPanel({
  workspace,
}: {
  workspace: ReturnType<typeof useAesWorkspace>;
}) {
  const { t } = useTranslation();
  const [fileBatchTitle, setFileBatchTitle] = useState("AES file batch");
  const [fileType, setFileType] = useState<TextFileType>("binary");
  const [files, setFiles] = useState<File[]>([]);
  const selectedFileType = fileTypeOptions.find(
    (option) => option.value === fileType,
  );
  const fileLabel =
    files.length === 0
      ? t("No files selected.")
      : files.length === 1
        ? files[0].name
        : t("{{count}} files selected", { count: files.length });

  async function submitFiles() {
    const result = await workspace.submitFileJobs({
      title: fileBatchTitle,
      files,
      fileType,
    });

    if (result) {
      setFiles([]);
    }
  }

  return (
    <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-[#111424]">
      <CardHeader className="border-b border-slate-200 dark:border-white/10">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
          {t("Corpus worker")}
        </p>
        <CardTitle className="mt-1 text-lg text-slate-950 dark:text-slate-50">
          {t("Queue AES job")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <MiniStat
            icon={<Database className="size-4" />}
            label={t("Ready corpora")}
            value={formatNumber(workspace.completedParsedTexts.length)}
          />
          <MiniStat
            icon={<Clock3 className="size-4" />}
            label={t("Active jobs")}
            value={formatNumber(
              workspace.jobs.filter(
                (job) => job.status === "queued" || job.status === "processing",
              ).length,
            )}
          />
          <MiniStat
            icon={<CheckCircle2 className="size-4" />}
            label={t("Completed")}
            value={formatNumber(
              workspace.jobs.filter((job) => job.status === "completed").length,
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="aes-parsed-text">{t("Parsed corpus")}</Label>
          <select
            id="aes-parsed-text"
            value={
              workspace.selectedParsedTextId ??
              workspace.selectedParsedText?.id ??
              ""
            }
            onChange={(event) =>
              workspace.setSelectedParsedTextId(event.target.value)
            }
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-cyan-400 focus:ring-3 focus:ring-cyan-400/20 dark:border-white/10 dark:bg-[#080b16] dark:text-slate-100"
          >
            {workspace.completedParsedTexts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} · {t("{{count}} words", { count: formatNumber(item.totalWords) })}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-5 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          {t(
            "The worker uses the AES key, mode, IV, and output encoding from the controls above. Binary files are sent as byte payloads and stored as encoded ciphertext.",
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#080b16]">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="aesFileBatchTitle">{t("File batch title")}</Label>
              <Input
                id="aesFileBatchTitle"
                value={fileBatchTitle}
                maxLength={150}
                onChange={(event) => setFileBatchTitle(event.target.value)}
                className="dark:bg-[#080b16]"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="space-y-2">
                <Label htmlFor="aesFileType">{t("File type")}</Label>
                <select
                  id="aesFileType"
                  value={fileType}
                  onChange={(event) =>
                    setFileType(event.target.value as TextFileType)
                  }
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-cyan-400 focus:ring-3 focus:ring-cyan-400/20 dark:border-white/10 dark:bg-[#080b16] dark:text-slate-100"
                >
                  {fileTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.label)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t("Input files")}</Label>
                <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm transition hover:border-cyan-300 dark:border-white/10 dark:bg-[#111424]">
                  <Upload className="size-4 text-cyan-700 dark:text-cyan-200" />
                  <span className="min-w-0 truncate text-slate-600 dark:text-slate-300">
                    {fileLabel}
                  </span>
                  <Input
                    type="file"
                    accept={selectedFileType?.accept}
                    multiple
                    onChange={(event) =>
                      setFiles(Array.from(event.target.files ?? []))
                    }
                    className="sr-only"
                  />
                </label>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full rounded-md border-slate-200 bg-white dark:border-white/10 dark:bg-white/5"
              onClick={() => void submitFiles()}
              disabled={
                workspace.isQueueingJob || files.length === 0 || !fileBatchTitle
              }
            >
              {workspace.isQueueingJob ? (
                <Shuffle className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {t("Queue selected files")}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <Button
            type="button"
            className="h-10 rounded-md bg-cyan-600 text-white hover:bg-cyan-500"
            onClick={() => void workspace.submitJob()}
            disabled={
              workspace.isQueueingJob ||
              workspace.completedParsedTexts.length === 0
            }
          >
            {workspace.isQueueingJob ? (
              <Shuffle className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            {t("Queue corpus job")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-md border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
            onClick={() => void workspace.refreshJobs(true)}
            disabled={workspace.isRefreshingJobs}
          >
            <RefreshCw
              className={cn(
                "size-4",
                workspace.isRefreshingJobs && "animate-spin",
              )}
            />
            {t("Refresh jobs")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AesJobsPanel({
  workspace,
}: {
  workspace: ReturnType<typeof useAesWorkspace>;
}) {
  const { t } = useTranslation();

  return (
    <div className="grid min-w-0 grid-cols-1 gap-5">
      <Card className="overflow-hidden border-slate-200 bg-white dark:border-white/10 dark:bg-[#111424]">
        <CardHeader className="border-b border-slate-200 dark:border-white/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
                {t("Worker queue")}
              </p>
              <CardTitle className="mt-1 text-lg text-slate-950 dark:text-slate-50">
                {t("AES corpus jobs")}
              </CardTitle>
            </div>
            {workspace.hasActiveJobs ? (
              <Badge variant="warning">{t("Polling")}</Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500 dark:border-white/10 dark:bg-[#0b0f1d]">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("Algorithm")}</th>
                  <th className="px-4 py-3 font-medium">{t("Status")}</th>
                  <th className="px-4 py-3 font-medium">{t("Parameters")}</th>
                  <th className="px-4 py-3 font-medium">{t("Output")}</th>
                  <th className="px-4 py-3 font-medium">{t("Updated")}</th>
                  <th className="px-4 py-3 font-medium">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {workspace.jobs.map((job) => (
                  <tr
                    key={job.id}
                    onClick={() => workspace.setSelectedJobId(job.id)}
                    className={cn(
                      "cursor-pointer transition hover:bg-slate-50 dark:hover:bg-white/5",
                      workspace.selectedJobId === job.id &&
                        "bg-cyan-50 dark:bg-cyan-400/10",
                    )}
                  >
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-950 dark:text-slate-100">
                        AES
                      </div>
                      <div className="mt-1 max-w-[180px] truncate text-xs text-slate-500">
                        {job.id}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <JobStatusBadge status={job.status} />
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                      {formatJobParameters(job)}
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500 dark:text-slate-400">
                      {formatJobOutput(job)}
                    </td>
                    <td className="px-4 py-4 text-slate-500 dark:text-slate-400">
                      {formatTime(job.updatedAt)}
                    </td>
                    <td className="px-4 py-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-md border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200"
                        onClick={(event) => {
                          event.stopPropagation();
                          void workspace.deleteJob(job.id);
                        }}
                      >
                        <Trash2 className="size-4" />
                        {t("Delete")}
                      </Button>
                    </td>
                  </tr>
                ))}
                {workspace.jobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-14 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-slate-500">
                        <ShieldCheck className="size-8" />
                        <p>{t("No AES corpus jobs yet.")}</p>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AesJobDetails workspace={workspace} job={workspace.selectedJob} />
    </div>
  );
}

function AesJobDetails({
  workspace,
  job,
}: {
  workspace: ReturnType<typeof useAesWorkspace>;
  job: ComplexCipherJob | null;
}) {
  const { t } = useTranslation();

  if (!job) {
    return (
      <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-[#111424]">
        <CardContent className="grid min-h-52 place-items-center p-8 text-center text-slate-500">
          <div>
            <ShieldCheck className="mx-auto size-9" />
            <p className="mt-3">{t("Select or queue an AES corpus job.")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-[#111424]">
      <CardHeader className="border-b border-slate-200 dark:border-white/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
              {t("Worker output")}
            </p>
            <CardTitle className="mt-1 text-lg text-slate-950 dark:text-slate-50">
              {t("Stored ciphertext")}
            </CardTitle>
          </div>
          <div className="flex flex-wrap gap-2">
            <JobStatusBadge status={job.status} />
            <Badge variant="outline">{formatJobParameters(job)}</Badge>
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-md border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200"
              onClick={() => void workspace.deleteJob(job.id)}
            >
              <Trash2 className="size-4" />
              {t("Delete")}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-3">
          <MetricStrip job={job} />
          <AesMetricCharts job={job} />
          <AesRoundSteps job={job} />
          {job.errorMessage ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
              {job.errorMessage}
            </div>
          ) : null}
          <pre className="max-h-72 min-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-5 text-slate-700 dark:border-white/10 dark:bg-[#080b16] dark:text-slate-300">
            {job.finalText ?? t("Waiting for worker result...")}
          </pre>
        </div>
        <div className="space-y-3">
          <StateTile
            icon={<Layers3 className="size-4" />}
            label={t("Mode")}
            value={String(job.metadata?.mode ?? job.parameters.mode ?? "-")}
          />
          <StateTile
            icon={<KeyRound className="size-4" />}
            label={t("Key size")}
            value={t("{{count}} bits", { count: String(job.metadata?.keySize ?? "-") })}
          />
          <StateTile
            icon={<Database className="size-4" />}
            label={t("Byte entropy")}
            value={formatMetricValue(job.metadata?.byteEntropy)}
          />
          <StateTile
            icon={<Database className="size-4" />}
            label={t("Cipher bytes")}
            value={String(job.metadata?.ciphertextLength ?? "-")}
          />
          <StateTile
            icon={<Clipboard className="size-4" />}
            label="IV"
            value={String(job.metadata?.iv ?? job.parameters.iv ?? "-")}
            mono
          />
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full rounded-md border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
            disabled={!job.finalText}
            onClick={() => downloadAesCiphertext(job)}
          >
            <Download className="size-4" />
            {t("Download ciphertext")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full rounded-md border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
            disabled={!job.finalText}
            onClick={() => downloadAesBinary(job)}
          >
            <Binary className="size-4" />
            {t("Download binary")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AesRoundSteps({ job }: { job: ComplexCipherJob }) {
  const { t } = useTranslation();
  const steps = job.steps ?? [];
  const isSampled = job.metadata?.stepSampled === true;
  const sampleSize =
    typeof job.metadata?.stepSampleSize === "number"
      ? job.metadata.stepSampleSize
      : null;

  if (steps.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500 dark:border-white/10 dark:bg-[#080b16] dark:text-slate-400">
        {t("AES round states will appear after the corpus worker completes.")}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      <AesRoundMetricChart steps={steps} />

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-[#080b16]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              {t("AES rounds")}
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {isSampled
                ? t(
                    "Sampled corpus state after whitening and each AES round ({{count}} bytes).",
                    {
                      count: formatNumber(
                        sampleSize ?? steps.at(-1)?.text.length ?? 0,
                      ),
                    },
                  )
                : t("Corpus state after whitening and each AES round.")}
            </p>
          </div>
          <Badge variant="outline">
            {t("{{count}} states", { count: steps.length })}
          </Badge>
        </div>

        <div className="max-h-96 overflow-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="sticky top-0 border-b border-slate-200 bg-slate-100 text-xs uppercase tracking-[0.14em] text-slate-500 dark:border-white/10 dark:bg-[#0b0f1d]">
              <tr>
                <th className="px-4 py-3 font-medium">{t("Step")}</th>
                <th className="px-4 py-3 font-medium">{t("State")}</th>
                <th className="px-4 py-3 font-medium">{t("Hurst")}</th>
                <th className="px-4 py-3 font-medium">{t("DFA")}</th>
                <th className="px-4 py-3 font-medium">{t("Entropy")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {steps.map((step) => (
                <tr key={step.step}>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-slate-950 dark:text-slate-100">
                      {step.step}
                    </div>
                    <div className="mt-1 max-w-56 text-xs text-slate-500 dark:text-slate-400">
                      {step.description}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <code className="block max-w-[420px] truncate font-mono text-xs text-slate-600 dark:text-slate-300">
                      {step.text}
                    </code>
                  </td>
                  <MetricCell value={step.hurstExponent} />
                  <MetricCell value={step.dfaAlpha} />
                  <MetricCell value={step.wordFrequencyEntropy} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AesRoundMetricChart({ steps }: { steps: CipherStep[] }) {
  const { t } = useTranslation();
  const width = 760;
  const height = 220;
  const padding = 36;
  const metrics = [
    { key: "hurstExponent", label: "Hurst", color: "#22d3ee" },
    { key: "dfaAlpha", label: "DFA", color: "#cbd5e1" },
    { key: "wordFrequencyEntropy", label: "Byte entropy", color: "#34d399" },
  ] as const;

  if (steps.length === 1) {
    return <AesSingleRoundMetricBars step={steps[0]} metrics={metrics} />;
  }

  const allValues = steps.flatMap((step) => [
    step.hurstExponent,
    step.dfaAlpha,
    step.wordFrequencyEntropy,
  ]);
  const maxValue = Math.max(1, ...allValues);
  const pointFor = (index: number, value: number) => {
    const x =
      padding +
      (steps.length <= 1
        ? 0
        : (index / (steps.length - 1)) * (width - padding * 2));
    const y =
      height - padding - (value / maxValue) * (height - padding * 2);

    return { x, y };
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#080b16]">
      <div className="mb-2 flex flex-wrap items-center gap-3 text-sm">
        {metrics.map((metric) => (
          <LegendDot key={metric.key} color={metric.color} label={t(metric.label)} />
        ))}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={t("AES round metrics chart")}
        className="h-56 w-full overflow-visible"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding + ratio * (height - padding * 2);
          return (
            <line
              key={ratio}
              x1={padding}
              x2={width - padding}
              y1={y}
              y2={y}
              stroke="currentColor"
              className="text-slate-200 dark:text-white/10"
            />
          );
        })}

        {metrics.map((metric) => {
          const path = steps
            .map((step, index) => {
              const point = pointFor(index, step[metric.key]);
              return `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
            })
            .join(" ");

          return (
            <path
              key={metric.key}
              d={path}
              fill="none"
              stroke={metric.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

        {steps.map((step, index) => {
          const x = pointFor(index, 0).x;

          return (
            <text
              key={step.step}
              x={x}
              y={height - 10}
              textAnchor="middle"
              className="fill-slate-500 text-[11px] dark:fill-slate-400"
            >
              {step.step}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function AesSingleRoundMetricBars({
  step,
  metrics,
}: {
  step: CipherStep;
  metrics: readonly {
    key: "hurstExponent" | "dfaAlpha" | "wordFrequencyEntropy";
    label: string;
    color: string;
  }[];
}) {
  const { t } = useTranslation();

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#080b16]">
      <div className="grid gap-3 md:grid-cols-3">
        {metrics.map((metric) => {
          const value = step[metric.key];
          const max = metric.key === "wordFrequencyEntropy" ? 8 : 1;
          const percent = Math.min(100, Math.max(0, (value / max) * 100));

          return (
            <div key={metric.key} className="min-w-0">
              <div className="mb-2 flex items-center justify-between gap-3">
                <LegendDot color={metric.color} label={t(metric.label)} />
                <span className="font-mono text-sm tabular-nums text-slate-700 dark:text-slate-200">
                  {value.toFixed(4)}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${percent}%`, backgroundColor: metric.color }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                <span>0</span>
                <span>{max}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetricCell({ value }: { value: number }) {
  return (
    <td className="px-4 py-3 align-top font-mono text-xs tabular-nums text-slate-700 dark:text-slate-300">
      {value.toFixed(4)}
    </td>
  );
}

function MetricStrip({ job }: { job: ComplexCipherJob }) {
  const { t } = useTranslation();
  const stats = job.metricStats ?? [];
  if (stats.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500 dark:border-white/10 dark:bg-[#080b16] dark:text-slate-400">
        {t("Hurst, DFA, and entropy metrics will appear after the worker completes.")}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {stats.map((metric) => (
        <div
          key={metric.key}
          className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#080b16]"
        >
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t(metric.label)}
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-slate-950 dark:text-slate-50">
            {metric.final.toFixed(4)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t("mean {{mean}} · SD {{sd}}", {
              mean: metric.mean.toFixed(4),
              sd: metric.standardDeviation.toFixed(4),
            })}
          </p>
        </div>
      ))}
    </div>
  );
}

function AesMetricCharts({ job }: { job: ComplexCipherJob }) {
  const { t } = useTranslation();
  const stats = job.metricStats ?? [];
  if (stats.length === 0) {
    return null;
  }

  const width = 760;
  const height = 210;
  const padding = 34;
  const chartValues = stats.map((metric) => ({
    label: t(metric.label),
    value: metric.final,
    color:
      metric.key === "hurstExponent"
        ? "#22d3ee"
        : metric.key === "wordFrequencyEntropy"
          ? "#34d399"
          : "#cbd5e1",
  }));
  const maxMetric = Math.max(1, ...chartValues.map((metric) => metric.value));
  const pointFor = (index: number, value: number) => {
    const x =
      padding +
      (chartValues.length <= 1
        ? 0
        : (index / (chartValues.length - 1)) * (width - padding * 2));
    const y =
      height - padding - (value / maxMetric) * (height - padding * 2);

    return { x, y };
  };
  const path = chartValues
    .map((metric, index) => {
      const point = pointFor(index, metric.value);
      return `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(" ");
  const byteEntropy =
    typeof job.metadata?.byteEntropy === "number"
      ? job.metadata.byteEntropy
      : null;
  const byteEntropyPercent =
    byteEntropy === null ? 0 : Math.min(100, (byteEntropy / 8) * 100);

  return (
    <div className="grid grid-cols-1 gap-3 2xl:grid-cols-[minmax(0,1fr)_240px]">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#080b16]">
        <div className="mb-2 flex flex-wrap items-center gap-3 text-sm">
          {chartValues.map((metric) => (
            <LegendDot
              key={metric.label}
              color={metric.color}
              label={metric.label}
            />
          ))}
        </div>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={t("AES metrics chart")}
          className="h-56 w-full overflow-visible"
        >
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding + ratio * (height - padding * 2);
            return (
              <line
                key={ratio}
                x1={padding}
                x2={width - padding}
                y1={y}
                y2={y}
                stroke="currentColor"
                className="text-slate-200 dark:text-white/10"
              />
            );
          })}
          <path
            d={path}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {chartValues.map((metric, index) => {
            const point = pointFor(index, metric.value);

            return (
              <g key={metric.label}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill="#0f172a"
                  stroke={metric.color}
                  strokeWidth="2"
                  className="dark:fill-[#080b16]"
                />
                <text
                  x={point.x}
                  y={height - 10}
                  textAnchor="middle"
                  className="fill-slate-500 text-[11px] dark:fill-slate-400"
                >
                  {metric.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#080b16]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          {t("Byte entropy")}
        </p>
        <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-950 dark:text-slate-50">
          {byteEntropy === null ? "-" : byteEntropy.toFixed(4)}
        </p>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-emerald-400"
            style={{ width: `${byteEntropyPercent}%` }}
          />
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {t("Normalized against 8 bits per byte.")}
        </p>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
      <span
        className="size-3 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#080b16]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <div className="flex size-8 items-center justify-center rounded-md border border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200">
          {icon}
        </div>
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums text-slate-950 dark:text-slate-50">
        {value}
      </p>
    </div>
  );
}

function JobStatusBadge({ status }: { status: ComplexCipherJobStatus }) {
  const { t } = useTranslation();

  return (
    <Badge variant={statusVariant[status]} className="capitalize">
      {t(status)}
    </Badge>
  );
}

function formatJobParameters(job: ComplexCipherJob) {
  const mode = String(job.parameters.mode ?? "cbc").toUpperCase();
  const output = String(job.parameters.outputEncoding ?? "hex").toUpperCase();
  return `${mode}; out=${output}`;
}

function formatJobOutput(job: ComplexCipherJob) {
  if (job.status !== "completed") {
    return "-";
  }

  const bytes = job.metadata?.ciphertextLength;
  const encoding = job.metadata?.outputEncoding ?? job.parameters.outputEncoding;

  return `${String(bytes ?? "-")} bytes · ${String(encoding ?? "hex").toUpperCase()}`;
}

function formatMetricValue(value: unknown) {
  return typeof value === "number" ? value.toFixed(4) : "-";
}

function downloadAesCiphertext(job: ComplexCipherJob) {
  if (!job.finalText) {
    return;
  }

  const outputEncoding = String(
    job.metadata?.outputEncoding ?? job.parameters.outputEncoding ?? "hex",
  );
  const blob = new Blob([job.finalText], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `aes-${job.id.slice(0, 8)}-${outputEncoding}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadAesBinary(job: ComplexCipherJob) {
  if (!job.finalText) {
    return;
  }

  const outputEncoding = String(
    job.metadata?.outputEncoding ?? job.parameters.outputEncoding ?? "hex",
  ) as BinaryEncoding;
  const bytes = decodeAesOutputBytes(job.finalText, outputEncoding);
  const bits = bytesToBitString(bytes);

  downloadTextFile(bits, `aes-${job.id.slice(0, 8)}-${outputEncoding}-binary.txt`);
}

function downloadAesResultBinary(value: string, outputEncoding: BinaryEncoding) {
  const bytes = decodeAesOutputBytes(value, outputEncoding);
  const bits = bytesToBitString(bytes);

  downloadTextFile(bits, `aes-result-${outputEncoding}-binary.txt`);
}

function decodeAesOutputBytes(value: string, encoding: BinaryEncoding) {
  if (encoding === "hex") {
    return decodeHexBytes(value);
  }

  if (encoding === "base64") {
    return decodeBase64Bytes(value);
  }

  return new TextEncoder().encode(value);
}

function decodeHexBytes(value: string) {
  const normalized = value.replace(/\s/g, "");
  const bytes = new Uint8Array(Math.floor(normalized.length / 2));

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

function decodeBase64Bytes(value: string) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function bytesToBitString(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(2).padStart(8, "0")).join("");
}

function downloadTextFile(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function ComplexCipherSidebar() {
  const { t } = useTranslation();

  return (
    <aside className="hidden w-full min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#111424] dark:shadow-2xl dark:shadow-black/30 lg:flex lg:flex-col">
      <div className="flex items-center gap-3 px-1 py-1">
        <div className="flex size-10 items-center justify-center rounded-md border border-cyan-200 bg-cyan-50 text-sm font-bold text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/15 dark:text-cyan-200">
          CL
        </div>
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
            {t("Diploma App")}
          </p>
          <p className="font-semibold text-slate-950 dark:text-slate-100">
            CryptoLab
          </p>
        </div>
      </div>

      <nav className="mt-8 space-y-2">
        <Button
          asChild
          variant="ghost"
          className="h-10 w-full justify-start rounded-md text-slate-500 dark:text-slate-400"
        >
          <Link href="/">
            <ArrowLeft className="size-4" />
            {t("Dashboard")}
          </Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          className="h-10 w-full justify-start rounded-md text-slate-500 dark:text-slate-400"
        >
          <Link href="/classical-ciphers">
            <Binary className="size-4" />
            {t("Classical Ciphers")}
          </Link>
        </Button>
        <div className="flex h-10 w-full items-center gap-3 rounded-md border border-cyan-200 bg-cyan-50 px-3 text-sm text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/15 dark:text-cyan-100">
          <ShieldCheck className="size-4" />
          {t("Complex Ciphers")}
        </div>
        <Button
          asChild
          variant="ghost"
          className="h-10 w-full justify-start rounded-md text-slate-500 dark:text-slate-400"
        >
          <Link href="/documentation">
            <BookOpenText className="size-4" />
            {t("Documentation")}
          </Link>
        </Button>
      </nav>

      <LanguageSwitcher className="mt-6" />

      <div className="mt-auto rounded-lg border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-400/20 dark:bg-cyan-400/10">
        <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-cyan-700 dark:text-cyan-300">
          <KeyRound className="size-3.5" />
          {t("AES Lab")}
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {t(
            "Run the backend AES implementation directly and inspect encoded input, key, IV, and output parameters in one place.",
          )}
        </p>
      </div>
    </aside>
  );
}

function ComplexCipherHero({ onLoadVector }: { onLoadVector: () => void }) {
  const { t } = useTranslation();

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#111424]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-cyan-700 dark:text-cyan-300">
            <Braces className="size-4" />
            {t("Complex cipher lab")}
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 sm:text-3xl">
            {t("AES encryption and decryption")}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            {t(
              "Work with AES-128, AES-192, and AES-256 keys through the API module, switching between CBC and ECB modes plus hex, base64, and UTF-8 data.",
            )}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="rounded-md border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
          onClick={onLoadVector}
        >
          <RotateCcw className="size-4" />
          {t("Load test vector")}
        </Button>
      </div>
    </section>
  );
}

function AesControlPanel({
  workspace,
}: {
  workspace: ReturnType<typeof useAesWorkspace>;
}) {
  const { t } = useTranslation();

  return (
    <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-[#111424]">
      <CardHeader className="border-b border-slate-200 dark:border-white/10">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
          {t("Parameters")}
        </p>
        <CardTitle className="mt-1 text-lg text-slate-950 dark:text-slate-50">
          {t("AES controls")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 p-5">
        <Tabs
          value={workspace.operation}
          onValueChange={(value) =>
            workspace.setOperation(value as AesOperation)
          }
        >
          <TabsList className="grid-cols-2">
            <TabsTrigger value="encrypt">
              <LockKeyhole className="size-4" />
              {t("Encrypt")}
            </TabsTrigger>
            <TabsTrigger value="decrypt">
              <UnlockKeyhole className="size-4" />
              {t("Decrypt")}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-2">
          <Label htmlFor="aes-mode">{t("Mode")}</Label>
          <select
            id="aes-mode"
            value={workspace.mode}
            onChange={(event) => workspace.setMode(event.target.value as AesMode)}
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-cyan-400 focus:ring-3 focus:ring-cyan-400/20 dark:border-white/10 dark:bg-[#080b16] dark:text-slate-100"
          >
            {modeOptions.map((item) => (
              <option key={item} value={item}>
                {item.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <EncodingSelect
            id="aes-input-encoding"
            label={
              workspace.operation === "encrypt"
                ? t("Plaintext encoding")
                : t("Ciphertext encoding")
            }
            value={workspace.activeInputEncoding}
            onChange={(value) =>
              workspace.operation === "encrypt"
                ? workspace.setInputEncoding(value)
                : workspace.setCipherInputEncoding(value)
            }
          />
          <EncodingSelect
            id="aes-output-encoding"
            label={t("Output encoding")}
            value={workspace.activeOutputEncoding}
            onChange={(value) =>
              workspace.operation === "encrypt"
                ? workspace.setOutputEncoding(value)
                : workspace.setPlainOutputEncoding(value)
            }
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="aes-key">{t("Key")}</Label>
            <Badge variant="outline">{workspace.keySizeHint}</Badge>
          </div>
          <Textarea
            id="aes-key"
            value={workspace.key}
            onChange={(event) => workspace.setKey(event.target.value)}
            className="min-h-20 resize-y font-mono dark:bg-[#080b16]"
          />
          <EncodingSelect
            id="aes-key-encoding"
            label={t("Key encoding")}
            value={workspace.keyEncoding}
            onChange={workspace.setKeyEncoding}
          />
        </div>

        {workspace.mode === "cbc" ? (
          <div className="space-y-2">
            <Label htmlFor="aes-iv">{t("IV")}</Label>
            <Input
              id="aes-iv"
              value={workspace.iv}
              onChange={(event) => workspace.setIv(event.target.value)}
              className="font-mono dark:bg-[#080b16]"
            />
            <EncodingSelect
              id="aes-iv-encoding"
              label={t("IV encoding")}
              value={workspace.ivEncoding}
              onChange={workspace.setIvEncoding}
            />
          </div>
        ) : (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
            {t("ECB mode does not use an IV.")}
          </div>
        )}

        {workspace.message ? (
          <div
            className={cn(
              "rounded-md border px-3 py-2 text-sm",
              workspace.result
                ? "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-100"
                : "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
            )}
          >
            {workspace.message}
          </div>
        ) : null}

        <Button
          type="button"
          className="h-10 w-full rounded-md bg-cyan-600 text-white hover:bg-cyan-500"
          onClick={() => void workspace.submit()}
          disabled={workspace.isSubmitting}
        >
          {workspace.isSubmitting ? (
            <Shuffle className="size-4 animate-spin" />
          ) : (
            <Play className="size-4" />
          )}
          {t("Run AES")}
        </Button>
      </CardContent>
    </Card>
  );
}

function AesIOPanel({
  workspace,
}: {
  workspace: ReturnType<typeof useAesWorkspace>;
}) {
  const { t } = useTranslation();
  const result = workspace.result;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-5">
      <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-[#111424]">
        <CardHeader className="border-b border-slate-200 dark:border-white/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
                {t("Input")}
              </p>
              <CardTitle className="mt-1 text-lg text-slate-950 dark:text-slate-50">
                {workspace.inputLabel}
              </CardTitle>
            </div>
            <Badge variant="teal">
              {workspace.mode.toUpperCase()} /{" "}
              {workspace.activeInputEncoding.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          <Textarea
            value={workspace.activeInput}
            onChange={(event) =>
              workspace.operation === "encrypt"
                ? workspace.setPlaintext(event.target.value)
                : workspace.setCiphertext(event.target.value)
            }
            className="min-h-48 resize-y font-mono dark:bg-[#080b16]"
          />
          {workspace.operation === "decrypt" && result?.operation === "encrypt" ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-md border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
              onClick={workspace.swapToDecrypt}
            >
              <Clipboard className="size-4" />
              {t("Use last ciphertext")}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-[#111424]">
        <CardHeader className="border-b border-slate-200 dark:border-white/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
                {t("Output")}
              </p>
              <CardTitle className="mt-1 text-lg text-slate-950 dark:text-slate-50">
                {t("AES result")}
              </CardTitle>
            </div>
            {result ? (
              <div className="flex flex-wrap gap-2">
                <Badge variant="teal">{t("{{count}}-bit key", { count: result.keySize })}</Badge>
                <Badge variant="outline">
                  {result.outputEncoding.toUpperCase()}
                </Badge>
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_260px]">
          <pre className="max-h-72 min-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-5 text-slate-700 dark:border-white/10 dark:bg-[#080b16] dark:text-slate-300">
            {result?.result ?? t("Run AES to see the encoded result.")}
          </pre>

          <div className="space-y-3">
            <StateTile
              icon={<Layers3 className="size-4" />}
              label={t("Mode")}
              value={result?.mode.toUpperCase() ?? workspace.mode.toUpperCase()}
            />
            <StateTile
              icon={<KeyRound className="size-4" />}
              label={t("Key size")}
              value={result ? t("{{count}} bits", { count: result.keySize }) : workspace.keySizeHint}
            />
            <StateTile
              icon={<ShieldCheck className="size-4" />}
              label={t("Operation")}
              value={result?.operation ?? workspace.operation}
            />
            <StateTile
              icon={<Clipboard className="size-4" />}
              label="IV"
              value={result?.iv ?? (workspace.mode === "cbc" ? workspace.iv : "-")}
              mono
            />
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full rounded-md border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
              disabled={!result}
              onClick={() => {
                if (result) {
                  downloadAesResultBinary(result.result, result.outputEncoding);
                }
              }}
            >
              <Binary className="size-4" />
              {t("Download binary")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EncodingSelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: BinaryEncoding;
  onChange: (value: BinaryEncoding) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as BinaryEncoding)}
        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-cyan-400 focus:ring-3 focus:ring-cyan-400/20 dark:border-white/10 dark:bg-[#080b16] dark:text-slate-100"
      >
        {encodingOptions.map((item) => (
          <option key={item} value={item}>
            {item.toUpperCase()}
          </option>
        ))}
      </select>
    </div>
  );
}

function StateTile({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#080b16]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <div className="flex size-8 items-center justify-center rounded-md border border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200">
          {icon}
        </div>
      </div>
      <p
        className={cn(
          "mt-2 break-words text-sm font-semibold text-slate-950 dark:text-slate-50",
          mono && "font-mono text-xs",
        )}
      >
        {value}
      </p>
    </div>
  );
}
