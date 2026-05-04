import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";

export function DashboardHero({
  isRefreshing,
  onRefresh,
}: {
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#12192b] dark:shadow-2xl dark:shadow-black/20">
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="min-w-0 max-w-2xl">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.34em] text-cyan-700 dark:text-cyan-300">
            Corpus Builder
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight text-slate-950 dark:text-slate-50">
            Prepare texts for encryption analysis
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Upload Gutenberg files or paste raw text, queue parsing in the API,
            and reuse completed corpora in later cipher experiments.
          </p>
        </div>

        <div className="grid min-w-0 gap-3 sm:grid-cols-3 xl:flex">
          <Button
            type="button"
            className="w-full rounded-md border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 dark:border-cyan-400/30 dark:bg-cyan-400/15 dark:text-cyan-100 dark:hover:bg-cyan-400/20 xl:w-auto"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={isRefreshing ? "animate-spin" : ""} />
            Refresh
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-md border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 xl:w-auto"
          >
            View history
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </section>
  );
}
