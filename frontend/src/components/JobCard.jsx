import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import StatusBadge, { PriorityBadge } from "@/components/StatusBadge";
import { Image, Mail, FileText, Database, Clock3 } from "lucide-react";

const TYPE_META = {
  image_resize: { label: "Image Resize", icon: Image },
  send_email: { label: "Send Email", icon: Mail },
  data_export: { label: "Data Export", icon: Database },
  pdf_generation: { label: "PDF Generation", icon: FileText },
};

function safeDate(v) {
  if (!v) return null;
  const d = typeof v === "string" ? new Date(v) : v;
  return isNaN(d?.getTime?.()) ? null : d;
}

function fmtRelative(v) {
  const d = safeDate(v);
  return d ? formatDistanceToNow(d, { addSuffix: true }) : "—";
}

function durationSecs(startedAt, completedAt) {
  const s = safeDate(startedAt);
  const c = safeDate(completedAt);
  if (!s || !c) return null;
  return Math.max(0, Math.round((c - s) / 1000));
}

export default function JobCard({ job, onClick }) {
  const meta = TYPE_META[job.type] || { label: job.type, icon: FileText };
  const Icon = meta.icon;
  const dur = durationSecs(job.started_at, job.completed_at);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      className="w-full text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-yellow-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
      style={{ transition: "border-color 200ms ease, box-shadow 200ms ease, transform 200ms ease" }}
      data-testid={`job-card-${job.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm text-slate-900 truncate">{meta.label}</div>
            <div className="text-[11px] text-slate-500 font-mono truncate">{job.id.slice(0, 8)}</div>
          </div>
        </div>
        <StatusBadge status={job.status} />
      </div>

      <p className="mt-3 text-sm text-slate-600 line-clamp-2">{job.description}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2 justify-between">
        <PriorityBadge priority={job.priority} />
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Clock3 className="w-3.5 h-3.5" />
          {job.status === "running" ? (
            <span className="text-sky-600 font-semibold">Processing…</span>
          ) : dur != null ? (
            <span>{dur}s · {fmtRelative(job.created_at)}</span>
          ) : (
            <span>{fmtRelative(job.created_at)}</span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

export { TYPE_META };
