"use client";

import type React from "react";
import Link from "next/link";
import {
  Binary,
  BookOpenText,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type MobileNavItem = {
  key: "dashboard" | "classical" | "complex" | "documentation";
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const mobileNavItems: MobileNavItem[] = [
  { key: "dashboard", label: "Dashboard", href: "/", icon: LayoutDashboard },
  {
    key: "classical",
    label: "Classical Ciphers",
    href: "/classical-ciphers",
    icon: Binary,
  },
  {
    key: "complex",
    label: "Complex Ciphers",
    href: "/complex-ciphers",
    icon: ShieldCheck,
  },
  {
    key: "documentation",
    label: "Documentation",
    href: "/documentation",
    icon: BookOpenText,
  },
];

export function MobileNav({ active }: { active: MobileNavItem["key"] }) {
  const { t } = useTranslation();

  return (
    <header className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#111424] lg:hidden">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-cyan-200 bg-cyan-50 text-sm font-bold text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/15 dark:text-cyan-200">
            CL
          </div>
          <div className="min-w-0">
            <p className="truncate text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:tracking-[0.28em]">
              {t("Diploma App")}
            </p>
            <p className="truncate font-semibold text-slate-950 dark:text-slate-100">
              CryptoLab
            </p>
          </div>
        </Link>
        <LanguageSwitcher className="shrink-0" />
      </div>

      <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.key === active;

          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium transition",
                isActive
                  ? "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/15 dark:text-cyan-100"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:border-cyan-200 hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-slate-100",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="whitespace-nowrap">{t(item.label)}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
