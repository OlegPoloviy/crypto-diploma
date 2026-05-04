"use client";

import { Activity, FileText, Hash, Type } from "lucide-react";

import { useParsedTexts } from "../hooks/use-parsed-texts";
import { DashboardHero } from "./dashboard-hero";
import { MetricCard } from "./metric-card";
import { ParsedTextDetails } from "./parsed-text-details";
import { ParsedTextTable } from "./parsed-text-table";
import { ParserFormCard } from "./parser-form-card";
import { ParserSidebar } from "./parser-sidebar";

export function TextParserDashboard() {
  const {
    items,
    selected,
    selectedId,
    isRefreshing,
    isSubmitting,
    message,
    setSelectedId,
    refresh,
    createFromFile,
    createFromText,
  } = useParsedTexts();

  const completed = items.filter((item) => item.status === "completed").length;
  const queued = items.filter(
    (item) => item.status === "queued" || item.status === "processing",
  ).length;
  const totalWords = items.reduce((sum, item) => sum + item.totalWords, 0);
  const uniqueWords = selected?.uniqueWords ?? 0;

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-clip bg-slate-50 p-4 text-slate-950 dark:bg-[#070912] dark:text-slate-100 sm:p-6">
      <div className="mx-auto grid w-full max-w-[min(1440px,100%)] min-w-0 grid-cols-1 gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <ParserSidebar />

        <div className="w-full min-w-0 max-w-full space-y-5 overflow-x-clip">
          <DashboardHero
            isRefreshing={isRefreshing}
            onRefresh={() => void refresh(true)}
          />

          <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-12">
            <div className="min-w-0 xl:col-span-4">
              <ParserFormCard
                isSubmitting={isSubmitting}
                message={message}
                onCreateFromFile={createFromFile}
                onCreateFromText={createFromText}
              />
            </div>

            <div className="min-w-0 space-y-5 xl:col-span-8">
              <ParsedTextTable
                items={items}
                selectedId={selectedId ?? undefined}
                onSelect={setSelectedId}
              />
              <ParsedTextDetails selected={selected} />
            </div>
          </section>

          <section className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Completed"
              value={completed}
              caption="Ready for encryption"
            />
            <MetricCard
              label="Queued"
              value={queued}
              caption="Worker backlog"
            />
            <MetricCard
              label="Total words"
              value={totalWords}
              caption="Stored across corpora"
            />
            <MetricCard
              label="Unique"
              value={uniqueWords}
              caption="Selected corpus vocabulary"
            />
          </section>

          <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
            <PlaceholderPanel
              icon={<Activity className="size-4" />}
              label="Visualization"
              title="Parser throughput"
              footer="Live preview"
            />
            <PlaceholderPanel
              icon={<FileText className="size-4" />}
              label="Comparison"
              title="Corpus preparation"
              footer="Side-by-side"
            />
          </section>
        </div>
      </div>
    </main>
  );
}

function PlaceholderPanel({
  icon,
  label,
  title,
  footer,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  footer: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#111424]">
      <div className="flex items-center justify-between">
        <div>
          <p className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
            {icon}
            {label}
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-950 dark:text-slate-50">
            {title}
          </h2>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
          {footer}
        </span>
      </div>
      <div className="mt-5 grid min-h-56 place-items-center rounded-lg border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-[#080b16]">
        <div className="flex items-center gap-8 text-slate-300 dark:text-slate-600">
          <Hash className="size-8" />
          <Type className="size-8" />
        </div>
      </div>
    </div>
  );
}
