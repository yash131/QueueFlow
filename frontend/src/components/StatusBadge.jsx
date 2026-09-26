import { motion } from "framer-motion";
import { Clock, Loader2, CheckCircle2, XCircle, Ban } from "lucide-react";

const CONFIG = {
  pending: {
    label: "Pending",
    dot: "bg-amber-400",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
    Icon: Clock,
  },
  running: {
    label: "Running",
    dot: "bg-sky-500",
    pill: "bg-sky-50 text-sky-700 border-sky-200",
    Icon: Loader2,
    spin: true,
  },
  done: {
    label: "Done",
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    dot: "bg-rose-500",
    pill: "bg-rose-50 text-rose-700 border-rose-200",
    Icon: XCircle,
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-slate-400",
    pill: "bg-slate-100 text-slate-600 border-slate-200",
    Icon: Ban,
  },
};

export default function StatusBadge({ status, size = "sm" }) {
  const cfg = CONFIG[status] || CONFIG.pending;
  const { Icon } = cfg;
  const isRunning = status === "running";
  const px = size === "lg" ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs";

  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${cfg.pill} ${px}`}
      data-testid={`status-badge-${status}`}
    >
      {isRunning ? (
        <Icon className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <span className={`w-2 h-2 rounded-full ${cfg.dot} ${status === "pending" ? "qf-pulse-dot" : ""}`} />
      )}
      <span>{cfg.label}</span>
    </motion.span>
  );
}

export function PriorityBadge({ priority }) {
  const map = {
    high: "bg-rose-50 text-rose-700 border-rose-200",
    medium: "bg-amber-50 text-amber-800 border-amber-200",
    low: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${map[priority] || map.medium}`}
      data-testid={`priority-badge-${priority}`}
    >
      {priority}
    </span>
  );
}
