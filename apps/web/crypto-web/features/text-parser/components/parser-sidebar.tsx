import {
  BarChart3,
  Binary,
  BookOpenText,
  Database,
  FileText,
  History,
  LayoutDashboard,
  Plus,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "New Corpus", icon: Plus, active: true },
  { label: "Classical Ciphers", icon: Binary, href: "/classical-ciphers" },
  { label: "Complex Ciphers", icon: ShieldCheck, href: "/complex-ciphers" },
  { label: "History", icon: History },
  { label: "Compare Runs", icon: BarChart3 },
  { label: "Datasets", icon: Database },
  { label: "Documentation", icon: BookOpenText, href: "/documentation" },
];

export function ParserSidebar() {
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
          <p className="font-semibold text-slate-950 dark:text-slate-100">CryptoLab</p>
        </div>
      </div>

      <nav className="mt-8 space-y-2">
        {navItems.map((item) => (
          <NavItem
            key={item.label}
            item={item}
          />
        ))}
      </nav>

      <div className="mt-auto rounded-lg border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-400/20 dark:bg-cyan-400/10">
        <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-cyan-700 dark:text-cyan-300">
          <FileText className="size-3.5" />
          Research Mode
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Prepare reusable corpora for encryption experiments without returning
          full word arrays to the browser.
        </p>
      </div>
    </aside>
  );
}

function NavItem({ item }: { item: (typeof navItems)[number] }) {
  const className = `flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm transition ${
    item.active
      ? "border border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/15 dark:text-cyan-100"
      : "text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100"
  }`;
  const content = (
    <>
      <item.icon className="size-4" />
      {item.label}
    </>
  );

  if (item.href) {
    return (
      <Link href={item.href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={className}>
      {content}
    </button>
  );
}
