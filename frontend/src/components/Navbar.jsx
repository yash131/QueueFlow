import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { MobileMenuButton } from "@/components/Sidebar";

export default function Navbar({ title, subtitle, onOpenMobile, healthy = true }) {
  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-200">
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <MobileMenuButton onClick={onOpenMobile} />
          <div className="min-w-0">
            <h1
              className="font-display font-extrabold text-lg sm:text-xl text-slate-900 truncate tracking-tight"
              data-testid="page-title"
            >
              {title}
            </h1>
            {subtitle && <p className="text-sm text-slate-500 truncate hidden sm:block">{subtitle}</p>}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2.5 pl-3 pr-3.5 py-1.5 rounded-full border border-emerald-200 bg-emerald-50"
          data-testid="live-indicator"
        >
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              healthy ? "bg-emerald-500 qf-pulse-ring" : "bg-slate-400"
            }`}
          />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 hidden sm:inline">
            Live
          </span>
          <Activity className="w-3.5 h-3.5 text-emerald-600 sm:hidden" />
        </motion.div>
      </div>
    </header>
  );
}
