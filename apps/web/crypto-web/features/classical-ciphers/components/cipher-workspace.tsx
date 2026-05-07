"use client";

import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Binary,
  Braces,
  CheckCircle2,
  Clock3,
  Database,
  Download,
  KeyRound,
  Loader2,
  Play,
  RefreshCw,
  Sigma,
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
import { cn } from "@/lib/utils";
import { formatNumber, formatTime } from "@/features/text-parser/lib/format";

import { useCipherWorkspace } from "../hooks/use-cipher-workspace";
import {
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

export function CipherWorkspace() {
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
      <div className="mx-auto grid w-full max-w-[min(1440px,100%)] min-w-0 grid-cols-1 gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <CipherSidebar />

        <div className="w-full min-w-0 max-w-full space-y-5 overflow-x-clip">
          <CipherHero
            isRefreshing={workspace.isRefreshing}
            onRefresh={() => void workspace.refresh(true)}
          />

          <section className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              icon={<Database className="size-4" />}
              label="Ready corpora"
              value={workspace.completedParsedTexts.length}
              caption="Parsed texts in DB"
            />
            <MetricTile
              icon={<Clock3 className="size-4" />}
              label="Active jobs"
              value={activeJobs}
              caption="Queued or processing"
            />
            <MetricTile
              icon={<CheckCircle2 className="size-4" />}
              label="Completed"
              value={completedJobs}
              caption="Stored cipher runs"
            />
            <MetricTile
              icon={<Sigma className="size-4" />}
              label="Latest DFA"
              value={latestAlpha ? latestAlpha.toFixed(3) : "0.000"}
              caption={`Hurst ${latestHurst ? latestHurst.toFixed(3) : "0.000"}`}
            />
          </section>

          <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-12">
            <div className="min-w-0 xl:col-span-4">
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
              />
            </div>

            <div className="min-w-0 space-y-5 xl:col-span-8">
              <CipherJobsTable
                jobs={workspace.jobs}
                selectedJobId={workspace.selectedJobId ?? undefined}
                onSelect={workspace.setSelectedJobId}
              />
              <CipherJobDetails job={workspace.selectedJob} />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function CipherSidebar() {
  return (
    <aside className="hidden w-full min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#111424] dark:shadow-2xl dark:shadow-black/30 lg:flex lg:flex-col">
      <div className="flex items-center gap-3 px-1 py-1">
        <div className="flex size-10 items-center justify-center rounded-md border border-cyan-200 bg-cyan-50 text-sm font-bold text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/15 dark:text-cyan-200">
          CL
        </div>
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
            Diploma App
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
            Dashboard
          </Link>
        </Button>
        <div className="flex h-10 w-full items-center gap-3 rounded-md border border-cyan-200 bg-cyan-50 px-3 text-sm text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/15 dark:text-cyan-100">
          <Binary className="size-4" />
          Classical Ciphers
        </div>
      </nav>

      <div className="mt-auto rounded-lg border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-400/20 dark:bg-cyan-400/10">
        <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-cyan-700 dark:text-cyan-300">
          <KeyRound className="size-3.5" />
          Worker Mode
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Run cipher experiments from stored corpora while the API keeps heavy
          metric calculations off the request thread.
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
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#111424]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-cyan-700 dark:text-cyan-300">
            <Braces className="size-4" />
            Classical cipher lab
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 sm:text-3xl">
            Worker-backed Caesar and Vigenere runs
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Select a parsed corpus from the database, queue a cipher job, and
            inspect how Hurst, DFA alpha, and word entropy move step by step.
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
          Refresh
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
    <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-[#111424]">
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
}) {
  return (
    <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-[#111424]">
      <CardHeader className="border-b border-slate-200 dark:border-white/10">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
          New run
        </p>
        <CardTitle className="mt-1 text-lg text-slate-950 dark:text-slate-50">
          Queue cipher job
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 p-5">
        <div className="space-y-2">
          <Label htmlFor="parsedTextId">Parsed corpus</Label>
          <select
            id="parsedTextId"
            value={selectedParsedTextId}
            onChange={(event) => onParsedTextChange(event.target.value)}
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-cyan-400 focus:ring-3 focus:ring-cyan-400/20 dark:border-white/10 dark:bg-[#080b16] dark:text-slate-100"
          >
            {completedParsedTexts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} · {formatNumber(item.totalWords)} words
              </option>
            ))}
          </select>
        </div>

        <Tabs
          value={mode}
          onValueChange={(value) => onModeChange(value as CipherMode)}
        >
          <TabsList className="grid-cols-3">
            <TabsTrigger value="caesar">Caesar</TabsTrigger>
            <TabsTrigger value="vigenere-key-symbols">Symbols</TabsTrigger>
            <TabsTrigger value="vigenere-key-lengths">Lengths</TabsTrigger>
          </TabsList>
        </Tabs>

        {mode === "caesar" ? (
          <div className="space-y-2">
            <Label htmlFor="shift">Shift</Label>
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
            <Label htmlFor="key">Vigenere key</Label>
            <Textarea
              id="key"
              value={vigenereKey}
              onChange={(event) => onKeyChange(event.target.value)}
              className="min-h-24 resize-y font-mono dark:bg-[#080b16]"
            />
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              Long alphabetic keys are supported; non-letter characters are
              ignored by the cipher engine.
            </p>
          </div>
        )}

        {mode === "vigenere-key-lengths" ? (
          <div className="space-y-2">
            <Label htmlFor="keyLengths">Key lengths</Label>
            <Input
              id="keyLengths"
              value={keyLengthsText}
              onChange={(event) => onKeyLengthsChange(event.target.value)}
              className="font-mono dark:bg-[#080b16]"
            />
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              Use comma-separated lengths, including multi-digit values such as
              10, 100, or 1000.
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
          className="h-10 w-full rounded-md bg-cyan-600 text-white hover:bg-cyan-500"
          onClick={onSubmit}
          disabled={isSubmitting || completedParsedTexts.length === 0}
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Play className="size-4" />
          )}
          Queue worker run
        </Button>
      </CardContent>
    </Card>
  );
}

function CipherJobsTable({
  jobs,
  selectedJobId,
  onSelect,
}: {
  jobs: ClassicalCipherJob[];
  selectedJobId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <Card className="overflow-hidden border-slate-200 bg-white dark:border-white/10 dark:bg-[#111424]">
      <CardHeader className="border-b border-slate-200 dark:border-white/10">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
          Worker queue
        </p>
        <CardTitle className="mt-1 text-lg text-slate-950 dark:text-slate-50">
          Cipher jobs
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500 dark:border-white/10 dark:bg-[#0b0f1d]">
              <tr>
                <th className="px-4 py-3 font-medium">Algorithm</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Parameters</th>
                <th className="px-4 py-3 font-medium">Steps</th>
                <th className="px-4 py-3 font-medium">Updated</th>
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
                      {algorithmLabel[job.algorithm]}
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
                </tr>
              ))}
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-14 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-slate-500">
                      <Binary className="size-8" />
                      <p>No cipher jobs yet.</p>
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

function CipherJobDetails({ job }: { job: ClassicalCipherJob | null }) {
  if (!job) {
    return (
      <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-[#111424]">
        <CardContent className="grid min-h-72 place-items-center p-8 text-center text-slate-500">
          <div>
            <BarChart3 className="mx-auto size-9" />
            <p className="mt-3">Select or queue a cipher job.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const steps = job.steps ?? [];
  const lastStep = steps.at(-1);

  return (
    <div className="grid min-w-0 grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
      <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-[#111424]">
        <CardHeader className="border-b border-slate-200 dark:border-white/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
                Metrics
              </p>
              <CardTitle className="mt-1 text-lg text-slate-950 dark:text-slate-50">
                Step progression
              </CardTitle>
            </div>
            <CipherStatusBadge status={job.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MiniMetric
              label="Hurst"
              value={lastStep?.hurstExponent ?? 0}
              accent="cyan"
            />
            <MiniMetric label="DFA alpha" value={lastStep?.dfaAlpha ?? 0} />
            <MiniMetric
              label="Entropy"
              value={lastStep?.wordFrequencyEntropy ?? 0}
              accent="emerald"
            />
          </div>
          <MetricsChart job={job} />
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-[#111424]">
        <CardHeader className="border-b border-slate-200 dark:border-white/10">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
            Output
          </p>
          <CardTitle className="mt-1 text-lg text-slate-950 dark:text-slate-50">
            Final state
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="teal">{algorithmLabel[job.algorithm]}</Badge>
            <Badge variant="outline">{formatParameters(job.parameters)}</Badge>
          </div>
          {job.errorMessage ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
              {job.errorMessage}
            </div>
          ) : null}
          <pre className="max-h-64 min-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-5 text-slate-700 dark:border-white/10 dark:bg-[#080b16] dark:text-slate-300">
            {job.finalText ?? "Waiting for worker result..."}
          </pre>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full rounded-md border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
            disabled={!job.finalText}
            onClick={() => downloadEncryptedText(job)}
          >
            <Download className="size-4" />
            Download encrypted text
          </Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-[#111424] 2xl:col-span-2">
        <CardHeader className="border-b border-slate-200 dark:border-white/10">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
            Step log
          </p>
          <CardTitle className="mt-1 text-lg text-slate-950 dark:text-slate-50">
            Intermediate states
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <StepTable steps={steps} />
        </CardContent>
      </Card>
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
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#080b16]">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={cn("mt-2 text-2xl font-semibold tabular-nums", color)}>
        {value.toFixed(4)}
      </p>
    </div>
  );
}

function MetricsChart({ job }: { job: ClassicalCipherJob }) {
  const steps = job.steps ?? [];
  const width = 760;
  const height = 260;
  const padding = 34;
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
      <div className="grid min-h-72 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-[#080b16]">
        <div className="text-center">
          <Activity className="mx-auto size-8" />
          <p className="mt-3 text-sm">Metrics will appear after completion.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#080b16]">
      <div className="mb-4 flex flex-wrap items-center gap-4 text-sm">
        <Legend swatch="bg-cyan-400" label="Hurst" />
        <Legend swatch="bg-slate-300" label="DFA alpha" />
        <Legend swatch="bg-emerald-400" label="Entropy" />
        <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          X: {isKeyLengthChart ? "key length" : "step"}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Cipher metrics chart"
        className="h-72 w-full overflow-visible"
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

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
      <span className={cn("size-3 rounded-full", swatch)} />
      {label}
    </span>
  );
}

function StepTable({ steps }: { steps: CipherStep[] }) {
  return (
    <div className="max-h-[460px] overflow-auto">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500 dark:border-white/10 dark:bg-[#0b0f1d]">
          <tr>
            <th className="px-4 py-3 font-medium">Step</th>
            <th className="px-4 py-3 font-medium">Key length</th>
            <th className="px-4 py-3 font-medium">Description</th>
            <th className="px-4 py-3 font-medium">Hurst</th>
            <th className="px-4 py-3 font-medium">DFA</th>
            <th className="px-4 py-3 font-medium">Entropy</th>
            <th className="px-4 py-3 font-medium">Text preview</th>
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
                Waiting for worker steps.
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
