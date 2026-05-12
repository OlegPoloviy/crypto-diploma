"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Binary,
  BookOpenText,
  Braces,
  CheckCircle2,
  Clock3,
  Database,
  Download,
  KeyRound,
  Loader2,
  Play,
  RefreshCw,
  ShieldCheck,
  Sigma,
  Trash2,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { LanguageSwitcher } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { formatNumber, formatTime } from "@/features/text-parser/lib/format";
import { TextFileType } from "@/features/text-parser/lib/api";
import { useTranslation } from "react-i18next";

import { useCipherWorkspace } from "../hooks/use-cipher-workspace";
import {
  CipherMetricKey,
  CipherMetricStat,
  CipherMode,
  CipherStep,
  ClassicalCipherAlgorithm,
  ClassicalCipherJob,
} from "../types/classical-cipher";
import { CipherStatusBadge } from "./cipher-status-badge";

const algorithmLabel: Record<ClassicalCipherAlgorithm, string> = {
  caesar: "Caesar",
  vigenere_key_symbols: "Vigenere symbols",
  vigenere_key_lengths: "Vigenere lengths",
};

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

interface MetricDescriptor {
  key: CipherMetricKey;
  label: string;
  shortLabel: string;
  stroke: string;
  swatch: string;
  textClass: string;
}

const metricDescriptors: MetricDescriptor[] = [
  {
    key: "hurstExponent",
    label: "Hurst exponent",
    shortLabel: "Hurst",
    stroke: "#22d3ee",
    swatch: "bg-cyan-400",
    textClass: "text-cyan-700 dark:text-cyan-200",
  },
  {
    key: "dfaAlpha",
    label: "DFA alpha",
    shortLabel: "DFA",
    stroke: "#cbd5e1",
    swatch: "bg-slate-300",
    textClass: "text-slate-700 dark:text-slate-300",
  },
  {
    key: "wordFrequencyEntropy",
    label: "Word entropy",
    shortLabel: "Entropy",
    stroke: "#34d399",
    swatch: "bg-emerald-400",
    textClass: "text-emerald-700 dark:text-emerald-200",
  },
];

export function CipherWorkspace() {
  const { t } = useTranslation();
  const workspace = useCipherWorkspace();
  const selectedSteps = workspace.selectedJob?.steps ?? [];
  const completedJobs = workspace.jobs.filter(
    (job) => job.status === "completed",
  ).length;
  const activeJobs = workspace.jobs.filter(
    (job) => job.status === "queued" || job.status === "processing",
  ).length;
  const latestAlpha = selectedSteps.at(-1)?.dfaAlpha ?? 0;
  const latestHurst = selectedSteps.at(-1)?.hurstExponent ?? 0;

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-clip bg-slate-50 p-4 text-slate-950 dark:bg-[#070912] dark:text-slate-100 sm:p-6">
      <div className="grid w-full max-w-none min-w-0 grid-cols-1 gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <CipherSidebar />

        <div className="w-full min-w-0 max-w-full space-y-5 overflow-x-clip">
          <CipherHero
            isRefreshing={workspace.isRefreshing}
            onRefresh={() => void workspace.refresh(true)}
          />

          <section className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              icon={<Database className="size-4" />}
              label={t("Ready corpora")}
              value={workspace.completedParsedTexts.length}
              caption={t("Parsed texts in DB")}
            />
            <MetricTile
              icon={<Clock3 className="size-4" />}
              label={t("Active jobs")}
              value={activeJobs}
              caption={t("Queued or processing")}
            />
            <MetricTile
              icon={<CheckCircle2 className="size-4" />}
              label={t("Completed")}
              value={completedJobs}
              caption={t("Stored cipher runs")}
            />
            <MetricTile
              icon={<Sigma className="size-4" />}
              label={t("Latest DFA")}
              value={latestAlpha ? latestAlpha.toFixed(3) : "0.000"}
              caption={t("Hurst {{value}}", {
                value: latestHurst ? latestHurst.toFixed(3) : "0.000",
              })}
            />
          </section>

          <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
            <div className="min-w-0 self-stretch">
              <CipherJobForm
                completedParsedTexts={workspace.completedParsedTexts}
                selectedParsedTextId={
                  workspace.selectedParsedTextId ??
                  workspace.selectedParsedText?.id ??
                  ""
                }
                mode={workspace.mode}
                shift={workspace.shift}
                vigenereKey={workspace.key}
                keyLengthsText={workspace.keyLengthsText}
                isSubmitting={workspace.isSubmitting}
                message={workspace.message}
                onParsedTextChange={workspace.setSelectedParsedTextId}
                onModeChange={workspace.setMode}
                onShiftChange={workspace.setShift}
                onKeyChange={workspace.setKey}
                onKeyLengthsChange={workspace.setKeyLengthsText}
                onSubmit={() => void workspace.submitJob()}
                onSubmitFiles={workspace.submitFileJobs}
              />
            </div>

            <div className="min-w-0">
              <CipherJobsTable
                jobs={workspace.jobs}
                selectedJobId={workspace.selectedJobId ?? undefined}
                onSelect={workspace.setSelectedJobId}
                onDelete={workspace.deleteJob}
              />
            </div>

            <div className="min-w-0 xl:col-span-2">
              <CipherJobDetails
                job={workspace.selectedJob}
                onDelete={workspace.deleteJob}
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function CipherSidebar() {
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
        <div className="flex h-10 w-full items-center gap-3 rounded-md border border-cyan-200 bg-cyan-50 px-3 text-sm text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/15 dark:text-cyan-100">
          <Binary className="size-4" />
          {t("Classical Ciphers")}
        </div>
        <Button
          asChild
          variant="ghost"
          className="h-10 w-full justify-start rounded-md text-slate-500 dark:text-slate-400"
        >
          <Link href="/complex-ciphers">
            <ShieldCheck className="size-4" />
            {t("Complex Ciphers")}
          </Link>
        </Button>
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
          {t("Worker Mode")}
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {t(
            "Run cipher experiments from stored corpora while the API keeps heavy metric calculations off the request thread.",
          )}
        </p>
      </div>
    </aside>
  );
}

function CipherHero({
  isRefreshing,
  onRefresh,
}: {
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  const { t } = useTranslation();

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#111424]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-cyan-700 dark:text-cyan-300">
            <Braces className="size-4" />
            {t("Classical cipher lab")}
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 sm:text-3xl">
            {t("Worker-backed Caesar and Vigenere runs")}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            {t(
              "Select a parsed corpus from the database, queue a cipher job, and inspect how Hurst, DFA alpha, and word entropy move step by step.",
            )}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="rounded-md border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={cn("size-4", isRefreshing && "animate-spin")}
          />
          {t("Refresh")}
        </Button>
      </div>
    </section>
  );
}

function MetricTile({
  icon,
  label,
  value,
  caption,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  caption: string;
}) {
  return (
    <Card className="flex h-full flex-col border-slate-200 bg-white dark:border-white/10 dark:bg-[#111424]">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          <div className="flex size-9 items-center justify-center rounded-md border border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200">
            {icon}
          </div>
        </div>
        <div className="mt-4 text-2xl font-semibold tabular-nums text-slate-950 dark:text-slate-50">
          {typeof value === "number" ? formatNumber(value) : value}
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {caption}
        </p>
      </CardContent>
    </Card>
  );
}

function CipherJobForm({
  completedParsedTexts,
  selectedParsedTextId,
  mode,
  shift,
  vigenereKey,
  keyLengthsText,
  isSubmitting,
  message,
  onParsedTextChange,
  onModeChange,
  onShiftChange,
  onKeyChange,
  onKeyLengthsChange,
  onSubmit,
  onSubmitFiles,
}: {
  completedParsedTexts: { id: string; title: string; totalWords: number }[];
  selectedParsedTextId: string;
  mode: CipherMode;
  shift: number;
  vigenereKey: string;
  keyLengthsText: string;
  isSubmitting: boolean;
  message: string | null;
  onParsedTextChange: (id: string) => void;
  onModeChange: (mode: CipherMode) => void;
  onShiftChange: (shift: number) => void;
  onKeyChange: (key: string) => void;
  onKeyLengthsChange: (value: string) => void;
  onSubmit: () => void;
  onSubmitFiles: (input: {
    title: string;
    files: File[];
    fileType: TextFileType;
  }) => Promise<unknown>;
}) {
  const { t } = useTranslation();
  const [fileBatchTitle, setFileBatchTitle] = useState("Cipher file batch");
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
    const result = await onSubmitFiles({
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
          {t("New run")}
        </p>
        <CardTitle className="mt-1 text-lg text-slate-950 dark:text-slate-50">
          {t("Queue cipher job")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5 p-5">
        <div className="space-y-2">
          <Label htmlFor="parsedTextId">{t("Parsed corpus")}</Label>
          <select
            id="parsedTextId"
            value={selectedParsedTextId}
            onChange={(event) => onParsedTextChange(event.target.value)}
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-cyan-400 focus:ring-3 focus:ring-cyan-400/20 dark:border-white/10 dark:bg-[#080b16] dark:text-slate-100"
          >
            {completedParsedTexts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} · {t("{{count}} words", { count: formatNumber(item.totalWords) })}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#080b16]">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="cipherFileBatchTitle">{t("File batch title")}</Label>
              <Input
                id="cipherFileBatchTitle"
                value={fileBatchTitle}
                maxLength={150}
                onChange={(event) => setFileBatchTitle(event.target.value)}
                className="dark:bg-[#080b16]"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="space-y-2">
                <Label htmlFor="cipherFileType">{t("File type")}</Label>
                <select
                  id="cipherFileType"
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
              className="min-h-10 h-auto w-full whitespace-normal rounded-md border-slate-200 bg-white px-3 py-2 text-center leading-5 dark:border-white/10 dark:bg-white/5"
              onClick={() => void submitFiles()}
              disabled={isSubmitting || files.length === 0 || !fileBatchTitle}
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {t("Queue selected files")}
            </Button>
          </div>
        </div>

        <Tabs
          value={mode}
          onValueChange={(value) => onModeChange(value as CipherMode)}
        >
          <TabsList className="h-auto min-h-10 grid-cols-3">
            <TabsTrigger value="caesar" className="min-h-8 px-2 text-xs sm:text-sm">
              Caesar
            </TabsTrigger>
            <TabsTrigger
              value="vigenere-key-symbols"
              className="min-h-8 px-2 text-xs sm:text-sm"
            >
              {t("Symbols")}
            </TabsTrigger>
            <TabsTrigger
              value="vigenere-key-lengths"
              className="min-h-8 px-2 text-xs sm:text-sm"
            >
              {t("Lengths")}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {mode === "caesar" ? (
          <div className="space-y-2">
            <Label htmlFor="shift">{t("Shift")}</Label>
            <Input
              id="shift"
              type="number"
              value={shift}
              min={-1000}
              max={1000}
              onChange={(event) =>
                onShiftChange(Number.parseInt(event.target.value || "0", 10))
              }
              className="dark:bg-[#080b16]"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="key">{t("Vigenere key")}</Label>
            <Textarea
              id="key"
              value={vigenereKey}
              onChange={(event) => onKeyChange(event.target.value)}
              className="min-h-24 resize-y font-mono dark:bg-[#080b16]"
            />
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              {t(
                "Long alphabetic keys are supported; non-letter characters are ignored by the cipher engine.",
              )}
            </p>
          </div>
        )}

        {mode === "vigenere-key-lengths" ? (
          <div className="space-y-2">
            <Label htmlFor="keyLengths">{t("Key lengths")}</Label>
            <Input
              id="keyLengths"
              value={keyLengthsText}
              onChange={(event) => onKeyLengthsChange(event.target.value)}
              className="font-mono dark:bg-[#080b16]"
            />
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              {t(
                "Use comma-separated lengths, including multi-digit values such as 10, 100, or 1000.",
              )}
            </p>
          </div>
        ) : null}

        {message ? (
          <div className="rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-100">
            {message}
          </div>
        ) : null}

        <Button
          type="button"
          className="mt-auto min-h-10 h-auto w-full whitespace-normal rounded-md bg-cyan-600 px-3 py-2 text-center leading-5 text-white hover:bg-cyan-500"
          onClick={onSubmit}
          disabled={isSubmitting || completedParsedTexts.length === 0}
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Play className="size-4" />
          )}
          {t("Queue worker run")}
        </Button>
      </CardContent>
    </Card>
  );
}

function CipherJobsTable({
  jobs,
  selectedJobId,
  onSelect,
  onDelete,
}: {
  jobs: ClassicalCipherJob[];
  selectedJobId?: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <Card className="overflow-hidden border-slate-200 bg-white dark:border-white/10 dark:bg-[#111424]">
      <CardHeader className="border-b border-slate-200 dark:border-white/10">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
          {t("Worker queue")}
        </p>
        <CardTitle className="mt-1 text-lg text-slate-950 dark:text-slate-50">
          {t("Cipher jobs")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500 dark:border-white/10 dark:bg-[#0b0f1d]">
              <tr>
                <th className="px-4 py-3 font-medium">{t("Algorithm")}</th>
                <th className="px-4 py-3 font-medium">{t("Status")}</th>
                <th className="px-4 py-3 font-medium">{t("Parameters")}</th>
                <th className="px-4 py-3 font-medium">{t("Steps")}</th>
                <th className="px-4 py-3 font-medium">{t("Updated")}</th>
                <th className="px-4 py-3 font-medium">{t("Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  onClick={() => onSelect(job.id)}
                  className={cn(
                    "cursor-pointer transition hover:bg-slate-50 dark:hover:bg-white/5",
                    selectedJobId === job.id && "bg-cyan-50 dark:bg-cyan-400/10",
                  )}
                >
                  <td className="px-4 py-4">
                    <div className="font-medium text-slate-950 dark:text-slate-100">
                      {t(algorithmLabel[job.algorithm])}
                    </div>
                    <div className="mt-1 max-w-[180px] truncate text-xs text-slate-500">
                      {job.id}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <CipherStatusBadge status={job.status} />
                  </td>
                  <td className="px-4 py-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                    {formatParameters(job.parameters)}
                  </td>
                  <td className="px-4 py-4 tabular-nums text-slate-700 dark:text-slate-300">
                    {job.steps?.length ?? 0}
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
                        void onDelete(job.id);
                      }}
                    >
                      <Trash2 className="size-4" />
                      {t("Delete")}
                    </Button>
                  </td>
                </tr>
              ))}
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-slate-500">
                      <Binary className="size-8" />
                      <p>{t("No cipher jobs yet.")}</p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function CipherJobDetails({
  job,
  onDelete,
}: {
  job: ClassicalCipherJob | null;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();

  if (!job) {
    return (
      <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-[#111424]">
        <CardContent className="grid min-h-72 place-items-center p-8 text-center text-slate-500">
          <div>
            <BarChart3 className="mx-auto size-9" />
            <p className="mt-3">{t("Select or queue a cipher job.")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const steps = job.steps ?? [];
  const lastStep = steps.at(-1);
  const stepStats = job.metricStats ?? calculateStepMetricStats(steps);

  return (
    <div className="grid min-w-0 grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.42fr)]">
      <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-[#111424]">
        <CardHeader className="border-b border-slate-200 py-4 dark:border-white/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
                {t("Metrics")}
              </p>
              <CardTitle className="mt-1 text-lg text-slate-950 dark:text-slate-50">
                {t("Step progression")}
              </CardTitle>
            </div>
            <CipherStatusBadge status={job.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-[minmax(300px,0.72fr)_minmax(360px,1.28fr)]">
            <div className="grid grid-cols-3 gap-2">
              <MiniMetric
                label={t("Hurst")}
                value={lastStep?.hurstExponent ?? 0}
                accent="cyan"
              />
              <MiniMetric label={t("DFA alpha")} value={lastStep?.dfaAlpha ?? 0} />
              <MiniMetric
                label={t("Entropy")}
                value={lastStep?.wordFrequencyEntropy ?? 0}
                accent="emerald"
              />
            </div>
            <StepStatistics stats={stepStats} />
          </div>
          <MetricsChart job={job} />
          <MetricSmallMultiples job={job} stats={stepStats} />
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-[#111424]">
        <CardHeader className="border-b border-slate-200 py-4 dark:border-white/10">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
            {t("Output")}
          </p>
          <CardTitle className="mt-1 text-lg text-slate-950 dark:text-slate-50">
            {t("Final state")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 p-4">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="teal">{t(algorithmLabel[job.algorithm])}</Badge>
              <Badge variant="outline">{formatParameters(job.parameters)}</Badge>
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-md border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200"
                onClick={() => void onDelete(job.id)}
              >
                <Trash2 className="size-4" />
                {t("Delete")}
              </Button>
            </div>
            {job.errorMessage ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
                {job.errorMessage}
              </div>
            ) : null}
            <pre className="max-h-60 min-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-5 text-slate-700 dark:border-white/10 dark:bg-[#080b16] dark:text-slate-300">
              {job.finalText ?? t("Waiting for worker result...")}
            </pre>
          </div>
          <div className="flex min-w-0 flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full rounded-md border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
              disabled={!job.finalText}
              onClick={() => downloadEncryptedText(job)}
            >
              <Download className="size-4" />
              {t("Download encrypted text")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full rounded-md border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
              disabled={!job.finalText}
              onClick={() => downloadEncryptedBinary(job)}
            >
              <Binary className="size-4" />
              {t("Download binary")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-[#111424] 2xl:col-span-2">
        <CardHeader className="border-b border-slate-200 py-4 dark:border-white/10">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
            {t("Step log")}
          </p>
          <CardTitle className="mt-1 text-lg text-slate-950 dark:text-slate-50">
            {t("Intermediate states")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <StepTable steps={steps} />
        </CardContent>
      </Card>
    </div>
  );
}

function StepStatistics({ stats }: { stats: CipherMetricStat[] }) {
  const { t } = useTranslation();

  if (stats.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500 dark:border-white/10 dark:bg-[#080b16] dark:text-slate-400">
        {t("Step statistics will appear after the worker records metric values.")}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#080b16]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            {t("Step statistics")}
          </p>
        </div>
        <Badge variant="outline">{t("mean +/- SD")}</Badge>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
        {stats.map((metric) => (
          <div
            key={metric.key}
            className="grid min-w-0 grid-cols-[64px_minmax(0,1fr)] items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5"
          >
            <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
              {t(metric.label)}
            </p>
            <p className="truncate text-sm font-semibold tabular-nums text-slate-950 dark:text-slate-50">
              {metric.mean.toFixed(4)} +/- {metric.standardDeviation.toFixed(4)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  accent = "slate",
}: {
  label: string;
  value: number;
  accent?: "slate" | "cyan" | "emerald";
}) {
  const color =
    accent === "cyan"
      ? "text-cyan-700 dark:text-cyan-200"
      : accent === "emerald"
        ? "text-emerald-700 dark:text-emerald-200"
        : "text-slate-950 dark:text-slate-50";

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#080b16]">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={cn("mt-1 text-xl font-semibold tabular-nums", color)}>
        {value.toFixed(4)}
      </p>
    </div>
  );
}

function MetricSmallMultiples({
  job,
  stats,
}: {
  job: ClassicalCipherJob;
  stats: CipherMetricStat[];
}) {
  const steps = job.steps ?? [];

  if (steps.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      {metricDescriptors.map((metric) => (
        <SingleMetricChart
          key={metric.key}
          job={job}
          metric={metric}
          stats={stats.find((item) => item.key === metric.key)}
        />
      ))}
    </div>
  );
}

function SingleMetricChart({
  job,
  metric,
  stats,
}: {
  job: ClassicalCipherJob;
  metric: MetricDescriptor;
  stats?: CipherMetricStat;
}) {
  const { t } = useTranslation();
  const steps = job.steps ?? [];
  if (steps.length === 1) {
    const value = steps[0][metric.key];
    const max = metric.key === "wordFrequencyEntropy" ? 8 : 1;
    const percent = Math.min(100, Math.max(0, (value / max) * 100));

    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#080b16]">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t(metric.label)}
            </p>
            <p
              className={cn(
                "mt-1 text-base font-semibold tabular-nums",
                metric.textClass,
              )}
            >
              {value.toFixed(4)}
            </p>
          </div>
          <Badge variant="outline">
            {t("SD {{value}}", {
              value: stats?.standardDeviation.toFixed(4) ?? "0.0000",
            })}
          </Badge>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
          <div
            className="h-full rounded-full"
            style={{ width: `${percent}%`, backgroundColor: metric.stroke }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
          <span>0</span>
          <span>{max}</span>
        </div>
      </div>
    );
  }

  const width = 520;
  const height = 145;
  const padding = 24;
  const isKeyLengthChart = job.algorithm === "vigenere_key_lengths";
  const xValues = steps.map((step) =>
    isKeyLengthChart ? (step.keyLength ?? step.step) : step.step,
  );
  const minX = Math.min(...xValues, 0);
  const maxX = Math.max(...xValues, 1);
  const xSpan = Math.max(1, maxX - minX);
  const values = steps.map((step) => step[metric.key]);
  const minValue = Math.min(...values, stats?.mean ?? 0);
  const maxValue = Math.max(...values, stats?.mean ?? 1);
  const valuePadding = Math.max((maxValue - minValue) * 0.12, 0.02);
  const chartMin = minValue - valuePadding;
  const chartMax = maxValue + valuePadding;
  const span = Math.max(0.001, chartMax - chartMin);

  const pointFor = (step: CipherStep, index: number) => {
    const xValue = xValues[index] ?? step.step;
    const x =
      padding +
      (isKeyLengthChart
        ? ((xValue - minX) / xSpan) * (width - padding * 2)
        : steps.length <= 1
          ? 0
          : (index / (steps.length - 1)) * (width - padding * 2));
    const y =
      height -
      padding -
      ((step[metric.key] - chartMin) / span) * (height - padding * 2);

    return { x, y, xValue };
  };

  const path = steps
    .map((step, index) => {
      const point = pointFor(step, index);
      return `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(" ");
  const meanY =
    stats === undefined
      ? null
      : height -
        padding -
        ((stats.mean - chartMin) / span) * (height - padding * 2);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#080b16]">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t(metric.label)}
          </p>
          <p className={cn("mt-1 text-base font-semibold tabular-nums", metric.textClass)}>
            {stats ? stats.final.toFixed(4) : "0.0000"}
          </p>
        </div>
        <Badge variant="outline">
          {t("SD {{value}}", {
            value: stats?.standardDeviation.toFixed(4) ?? "0.0000",
          })}
        </Badge>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={t("{{metric}} by {{axis}}", {
          metric: t(metric.label),
          axis: t(isKeyLengthChart ? "key length" : "step"),
        })}
        className="h-36 w-full overflow-visible"
      >
        {[0, 0.5, 1].map((ratio) => {
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
        {meanY === null ? null : (
          <line
            x1={padding}
            x2={width - padding}
            y1={meanY}
            y2={meanY}
            stroke="currentColor"
            strokeDasharray="5 5"
            className="text-slate-400 dark:text-slate-500"
          />
        )}
        <path
          d={path}
          fill="none"
          stroke={metric.stroke}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {steps.map((step, index) => {
          const point = pointFor(step, index);

          return (
            <g key={`${metric.key}-${step.step}-${point.xValue}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r="3.5"
                fill="#0f172a"
                stroke={metric.stroke}
                strokeWidth="2"
                className="dark:fill-[#080b16]"
              />
              <text
                x={point.x}
                y={height - 7}
                textAnchor="middle"
                className="fill-slate-500 text-[10px] dark:fill-slate-400"
              >
                {point.xValue}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function MetricsChart({ job }: { job: ClassicalCipherJob }) {
  const { t } = useTranslation();
  const steps = job.steps ?? [];
  const width = 980;
  const height = 230;
  const padding = 30;
  const isKeyLengthChart = job.algorithm === "vigenere_key_lengths";
  const xValues = steps.map((step) =>
    isKeyLengthChart ? (step.keyLength ?? step.step) : step.step,
  );
  const minX = Math.min(...xValues, 0);
  const maxX = Math.max(...xValues, 1);
  const xSpan = Math.max(1, maxX - minX);
  const allValues = steps.flatMap((step) => [
    step.hurstExponent,
    step.dfaAlpha,
    step.wordFrequencyEntropy,
  ]);
  const maxValue = Math.max(1, ...allValues);
  const minValue = Math.min(0, ...allValues);
  const span = Math.max(1, maxValue - minValue);

  const pathFor = (selector: (step: CipherStep) => number) =>
    steps
      .map((step, index) => {
        const xValue = xValues[index] ?? step.step;
        const x =
          padding +
          (isKeyLengthChart
            ? ((xValue - minX) / xSpan) * (width - padding * 2)
            : steps.length <= 1
              ? 0
              : (index / (steps.length - 1)) * (width - padding * 2));
        const y =
          height -
          padding -
          ((selector(step) - minValue) / span) * (height - padding * 2);
        return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");

  if (steps.length === 0) {
    return (
      <div className="grid min-h-56 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-[#080b16]">
        <div className="text-center">
          <Activity className="mx-auto size-8" />
          <p className="mt-3 text-sm">{t("Metrics will appear after completion.")}</p>
        </div>
      </div>
    );
  }

  if (steps.length === 1) {
    return <SingleStepMetricBars step={steps[0]} />;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#080b16]">
      <div className="mb-2 flex flex-wrap items-center gap-3 text-sm">
        <Legend swatch="bg-cyan-400" label={t("Hurst")} />
        <Legend swatch="bg-slate-300" label={t("DFA alpha")} />
        <Legend swatch="bg-emerald-400" label={t("Entropy")} />
        <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          {t("X: {{axis}}", { axis: t(isKeyLengthChart ? "key length" : "step") })}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={t("Cipher metrics chart")}
        className="h-64 w-full overflow-visible"
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
        <line
          x1={padding}
          x2={width - padding}
          y1={height - padding}
          y2={height - padding}
          stroke="currentColor"
          className="text-slate-300 dark:text-white/20"
        />
        <path
          d={pathFor((step) => step.hurstExponent)}
          fill="none"
          stroke="#22d3ee"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={pathFor((step) => step.dfaAlpha)}
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={pathFor((step) => step.wordFrequencyEntropy)}
          fill="none"
          stroke="#34d399"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {steps.map((step, index) => {
          const xValue = xValues[index] ?? step.step;
          const x =
            padding +
            (isKeyLengthChart
              ? ((xValue - minX) / xSpan) * (width - padding * 2)
              : steps.length <= 1
                ? 0
                : (index / (steps.length - 1)) * (width - padding * 2));
          const y =
            height -
            padding -
            ((step.dfaAlpha - minValue) / span) * (height - padding * 2);

          return (
            <g key={`${step.step}-${xValue}`}>
              <circle
                cx={x}
                cy={y}
                r="4"
                fill="#0f172a"
                stroke="#cbd5e1"
                strokeWidth="2"
                className="dark:fill-[#080b16]"
              />
              <text
                x={x}
                y={height - 10}
                textAnchor="middle"
                className="fill-slate-500 text-[11px] dark:fill-slate-400"
              >
                {xValue}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function SingleStepMetricBars({ step }: { step: CipherStep }) {
  const { t } = useTranslation();
  const values = metricDescriptors.map((metric) => {
    const value = step[metric.key];
    const max = metric.key === "wordFrequencyEntropy" ? 8 : 1;

    return {
      ...metric,
      value,
      max,
      percent: Math.min(100, Math.max(0, (value / max) * 100)),
    };
  });

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#080b16]">
      <div className="grid gap-3 md:grid-cols-3">
        {values.map((metric) => (
          <div key={metric.key} className="min-w-0">
            <div className="mb-2 flex items-center justify-between gap-3">
              <Legend swatch={metric.swatch} label={t(metric.shortLabel)} />
              <span className="font-mono text-sm tabular-nums text-slate-700 dark:text-slate-200">
                {metric.value.toFixed(4)}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
              <div
                className={cn("h-full rounded-full", metric.swatch)}
                style={{ width: `${metric.percent}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
              <span>0</span>
              <span>{metric.max}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function calculateStepMetricStats(steps: CipherStep[]): CipherMetricStat[] {
  if (steps.length === 0) {
    return [];
  }

  return metricDescriptors.map((metric) => {
    const values = steps.map((step) => step[metric.key]);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance =
      values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
      values.length;

    return {
      key: metric.key,
      label: metric.shortLabel,
      final: values.at(-1) ?? 0,
      mean,
      standardDeviation: Math.sqrt(variance),
      min: Math.min(...values),
      max: Math.max(...values),
    };
  });
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
      <span className={cn("size-3 rounded-full", swatch)} />
      {label}
    </span>
  );
}

function StepTable({ steps }: { steps: CipherStep[] }) {
  const { t } = useTranslation();

  return (
    <div className="max-h-[460px] overflow-auto">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500 dark:border-white/10 dark:bg-[#0b0f1d]">
          <tr>
            <th className="px-4 py-3 font-medium">{t("Step")}</th>
            <th className="px-4 py-3 font-medium">{t("Key length")}</th>
            <th className="px-4 py-3 font-medium">{t("Description")}</th>
            <th className="px-4 py-3 font-medium">{t("Hurst")}</th>
            <th className="px-4 py-3 font-medium">{t("DFA")}</th>
            <th className="px-4 py-3 font-medium">{t("Entropy")}</th>
            <th className="px-4 py-3 font-medium">{t("Text preview")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {steps.map((step) => (
            <tr key={step.step}>
              <td className="px-4 py-4 tabular-nums text-slate-500">
                {step.step}
              </td>
              <td className="px-4 py-4 tabular-nums text-slate-500">
                {step.keyLength ?? "-"}
              </td>
              <td className="px-4 py-4 text-slate-800 dark:text-slate-200">
                {step.description}
              </td>
              <td className="px-4 py-4 tabular-nums text-cyan-700 dark:text-cyan-200">
                {step.hurstExponent.toFixed(4)}
              </td>
              <td className="px-4 py-4 tabular-nums text-slate-700 dark:text-slate-300">
                {step.dfaAlpha.toFixed(4)}
              </td>
              <td className="px-4 py-4 tabular-nums text-emerald-700 dark:text-emerald-200">
                {step.wordFrequencyEntropy.toFixed(4)}
              </td>
              <td className="max-w-[320px] truncate px-4 py-4 font-mono text-xs text-slate-500">
                {step.text}
              </td>
            </tr>
          ))}
          {steps.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                {t("Waiting for worker steps.")}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function formatParameters(parameters: Record<string, unknown>) {
  if ("shift" in parameters) {
    return `k=${parameters.shift}`;
  }
  if ("keyLengths" in parameters && Array.isArray(parameters.keyLengths)) {
    return `key=${parameters.key}; lengths=${parameters.keyLengths.join(",")}`;
  }
  if ("key" in parameters) {
    return `key=${parameters.key}`;
  }

  return "parameters";
}

function downloadEncryptedText(job: ClassicalCipherJob) {
  if (!job.finalText) {
    return;
  }

  const blob = new Blob([job.finalText], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${job.algorithm}-${job.id.slice(0, 8)}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadEncryptedBinary(job: ClassicalCipherJob) {
  if (!job.finalText) {
    return;
  }

  const inputEncoding = String(job.parameters.inputEncoding ?? "utf8");
  const bytes =
    inputEncoding === "hex"
      ? decodeHexBytes(job.finalText)
      : new TextEncoder().encode(job.finalText);
  const bits = bytesToBitString(bytes);

  downloadTextFile(bits, `${job.algorithm}-${job.id.slice(0, 8)}-binary.txt`);
}

function decodeHexBytes(value: string) {
  const normalized = value.replace(/\s/g, "");
  const bytes = new Uint8Array(Math.floor(normalized.length / 2));

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16);
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
