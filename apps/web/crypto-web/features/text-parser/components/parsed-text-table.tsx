import { Database } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { formatNumber } from "../lib/format";
import { ParsedText } from "../types/parsed-text";
import { StatusBadge } from "./status-badge";

export function ParsedTextTable({
  items,
  selectedId,
  onSelect,
}: {
  items: ParsedText[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <Card className="overflow-hidden border-slate-200 bg-white dark:border-white/10 dark:bg-[#111424]">
      <CardHeader className="border-b border-slate-200 dark:border-white/10">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
          {t("Job Queue")}
        </p>
        <CardTitle className="mt-1 text-lg text-slate-950 dark:text-slate-50">
          {t("Parsed corpora")}
        </CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 p-0">
        <div className="min-w-0 overflow-hidden">
          <table className="w-full table-fixed text-left text-sm">
            <colgroup>
              <col className="w-[34%]" />
              <col className="w-[18%]" />
              <col className="w-[17%]" />
              <col className="w-[17%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500 dark:border-white/10 dark:bg-[#0b0f1d]">
              <tr>
                <th className="px-4 py-3 font-medium">{t("Title")}</th>
                <th className="px-4 py-3 font-medium">{t("Status")}</th>
                <th className="px-4 py-3 font-medium">{t("Words")}</th>
                <th className="px-4 py-3 font-medium">{t("Unique")}</th>
                <th className="px-4 py-3 font-medium">{t("Source")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {items.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className={cn(
                    "cursor-pointer transition hover:bg-slate-50 dark:hover:bg-white/5",
                    selectedId === item.id && "bg-cyan-50 dark:bg-cyan-400/10",
                  )}
                >
                  <td className="min-w-0 px-4 py-4">
                    <div className="truncate font-medium text-slate-950 dark:text-slate-100">
                      {item.title}
                    </div>
                    <div className="mt-1 truncate text-xs text-slate-500">
                      {item.originalFileName ?? item.id}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-4 text-slate-700 tabular-nums dark:text-slate-300">
                    {formatNumber(item.totalWords)}
                  </td>
                  <td className="px-4 py-4 text-slate-700 tabular-nums dark:text-slate-300">
                    {formatNumber(item.uniqueWords)}
                  </td>
                  <td className="px-4 py-4 capitalize text-slate-500 dark:text-slate-400">
                    {t(item.source)}
                  </td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-14 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-slate-500">
                      <Database className="size-8" />
                      <p>{t("No parsed corpora yet.")}</p>
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
