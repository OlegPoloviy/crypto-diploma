import Link from "next/link";
import type React from "react";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Binary,
  BookOpenText,
  CheckCircle2,
  Database,
  FileText,
  Gauge,
  Layers3,
  LockKeyhole,
  Upload,
  Workflow,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const metricDocs = [
  {
    title: "Hurst exponent",
    value: "0.0 - 1.0",
    icon: Activity,
    tone: "cyan",
    body:
      "Shows long-range dependence in a numeric sequence. Around 0.5 usually means noise-like behavior. Values above 0.5 suggest persistence; values below 0.5 suggest anti-persistence.",
    use:
      "For text, the sequence is built from letters. For binary payloads, it is built from byte values 0-255.",
  },
  {
    title: "DFA alpha",
    value: "trend scale",
    icon: Gauge,
    tone: "slate",
    body:
      "Detrended fluctuation analysis estimates how fluctuations change across scales after local trends are removed.",
    use:
      "Use it to compare structure before and after encryption. Strong ciphers should reduce visible structure in byte-level data.",
  },
  {
    title: "Entropy",
    value: "0 - 8 bits",
    icon: BarChart3,
    tone: "emerald",
    body:
      "Entropy measures uncertainty. Text jobs use word/letter distribution; binary jobs use byte distribution.",
    use:
      "For binary files, random-looking encrypted output should often land near 6-8 depending on file size and source data.",
  },
];

const workflowDocs = [
  {
    title: "Create corpus",
    icon: FileText,
    body:
      "Upload one or many files from the dashboard, choose the file type, and let the app create reusable corpus records.",
    details:
      "Text formats are parsed as UTF-8. Binary files are stored as hex payloads with metrics calculated directly from bytes.",
  },
  {
    title: "Queue classical jobs",
    icon: Binary,
    body:
      "Run Caesar or Vigenere jobs from an existing corpus, or upload a batch of files directly in the classical workspace.",
    details:
      "For binary input, classical ciphers operate byte-by-byte modulo 256 and return hex output.",
  },
  {
    title: "Queue AES jobs",
    icon: LockKeyhole,
    body:
      "Use the AES controls for key, mode, IV, and encoding, then queue one corpus or a batch of uploaded files.",
    details:
      "Binary files are encrypted as bytes. AES output can be rendered as hex, base64, or UTF-8 when valid.",
  },
  {
    title: "Read charts",
    icon: Layers3,
    body:
      "Step charts show how Hurst, DFA, and entropy evolve through intermediate states.",
    details:
      "When a job has one stored step, the UI switches to compact bars because a line chart with one point has no progression.",
  },
];

const fileTypeDocs = [
  ["Plain text", "UTF-8 text files such as .txt or .text."],
  ["Markdown", "Markdown is treated as UTF-8 text and parsed into words."],
  ["CSV", "CSV is accepted as text so tables can be analyzed or encrypted."],
  ["JSON", "JSON is accepted as text; structure is preserved in the payload."],
  ["Binary", "Any file type. The app stores bytes as hex and uses byte metrics."],
];

export function DocumentationWorkspace() {
  return (
    <main className="min-h-screen w-full max-w-full overflow-x-clip bg-slate-50 p-4 text-slate-950 dark:bg-[#070912] dark:text-slate-100 sm:p-6">
      <div className="grid w-full max-w-none min-w-0 grid-cols-1 gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <DocumentationSidebar />

        <div className="w-full min-w-0 max-w-full space-y-5 overflow-x-clip">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#111424]">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-cyan-700 dark:text-cyan-300">
                  <BookOpenText className="size-4" />
                  Documentation
                </p>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 sm:text-3xl">
                  CryptoLab guide
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Use this page to understand what each metric means, how file
                  uploads become queued jobs, and how to interpret text and
                  binary encryption runs.
                </p>
              </div>
              <Badge variant="teal">User guide</Badge>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            {metricDocs.map((metric) => (
              <MetricDocCard key={metric.title} metric={metric} />
            ))}
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-[#111424]">
              <CardHeader className="border-b border-slate-200 dark:border-white/10">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
                  Workflow
                </p>
                <CardTitle className="mt-1 text-lg text-slate-950 dark:text-slate-50">
                  How to work with the app
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 p-4 md:grid-cols-2">
                {workflowDocs.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#080b16]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200">
                        <item.icon className="size-4" />
                      </div>
                      <h2 className="font-semibold text-slate-950 dark:text-slate-50">
                        {item.title}
                      </h2>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {item.body}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {item.details}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-[#111424]">
              <CardHeader className="border-b border-slate-200 dark:border-white/10">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
                  File types
                </p>
                <CardTitle className="mt-1 text-lg text-slate-950 dark:text-slate-50">
                  Upload modes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                {fileTypeDocs.map(([title, body]) => (
                  <div
                    key={title}
                    className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-[#080b16]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-950 dark:text-slate-100">
                        {title}
                      </p>
                      {title === "Binary" ? <Badge variant="teal">bytes</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
                      {body}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <UsageCard
              title="Batch queues"
              icon={<Upload className="size-4" />}
              body="Batch upload creates one queued job per file. Jobs reuse the same worker queues as regular corpus jobs, so the status table remains the source of truth."
              items={[
                "Use the dashboard for reusable corpora.",
                "Use cipher workspaces to upload and encrypt files immediately.",
                "A failed job does not delete completed jobs from other files.",
              ]}
            />
            <UsageCard
              title="What to compare"
              icon={<Workflow className="size-4" />}
              body="Compare the final metric values, the step progression, and the output encoding. Binary entropy is most meaningful when read as byte entropy."
              items={[
                "Low entropy can mean structured input or too little data.",
                "AES output should generally increase byte entropy.",
                "Classical ciphers preserve more visible structure than AES.",
              ]}
            />
          </section>
        </div>
      </div>
    </main>
  );
}

function MetricDocCard({
  metric,
}: {
  metric: (typeof metricDocs)[number];
}) {
  const colorClass =
    metric.tone === "cyan"
      ? "text-cyan-700 dark:text-cyan-200 border-cyan-200 bg-cyan-50 dark:border-cyan-400/20 dark:bg-cyan-400/10"
      : metric.tone === "emerald"
        ? "text-emerald-700 dark:text-emerald-200 border-emerald-200 bg-emerald-50 dark:border-emerald-400/20 dark:bg-emerald-400/10"
        : "text-slate-700 dark:text-slate-200 border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5";

  return (
    <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-[#111424]">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className={`flex size-10 items-center justify-center rounded-md border ${colorClass}`}>
            <metric.icon className="size-4" />
          </div>
          <Badge variant="outline">{metric.value}</Badge>
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-950 dark:text-slate-50">
          {metric.title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {metric.body}
        </p>
        <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500 dark:border-white/10 dark:bg-[#080b16] dark:text-slate-400">
          {metric.use}
        </p>
      </CardContent>
    </Card>
  );
}

function UsageCard({
  title,
  icon,
  body,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  body: string;
  items: string[];
}) {
  return (
    <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-[#111424]">
      <CardHeader className="border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md border border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200">
            {icon}
          </div>
          <CardTitle className="text-lg text-slate-950 dark:text-slate-50">
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          {body}
        </p>
        <div className="mt-4 space-y-2">
          {items.map((item) => (
            <div key={item} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentationSidebar() {
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
        <SidebarLink href="/" icon={<ArrowLeft className="size-4" />} label="Dashboard" />
        <SidebarLink
          href="/classical-ciphers"
          icon={<Binary className="size-4" />}
          label="Classical Ciphers"
        />
        <SidebarLink
          href="/complex-ciphers"
          icon={<LockKeyhole className="size-4" />}
          label="Complex Ciphers"
        />
        <div className="flex h-10 w-full items-center gap-3 rounded-md border border-cyan-200 bg-cyan-50 px-3 text-sm text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/15 dark:text-cyan-100">
          <BookOpenText className="size-4" />
          Documentation
        </div>
      </nav>

      <div className="mt-auto rounded-lg border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-400/20 dark:bg-cyan-400/10">
        <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-cyan-700 dark:text-cyan-300">
          <Database className="size-3.5" />
          Reference
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Metric notes and workflow rules for text, binary, classical cipher,
          and AES experiments.
        </p>
      </div>
    </aside>
  );
}

function SidebarLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Button
      asChild
      variant="ghost"
      className="h-10 w-full justify-start rounded-md text-slate-500 dark:text-slate-400"
    >
      <Link href={href}>
        {icon}
        {label}
      </Link>
    </Button>
  );
}
