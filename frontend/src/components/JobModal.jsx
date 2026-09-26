import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import StatusBadge, { PriorityBadge } from "@/components/StatusBadge";
import { TYPE_META } from "@/components/JobCard";
import { Copy, User, Clock, PlayCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

function fmtDate(v) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}

function duration(startedAt, completedAt) {
  if (!startedAt || !completedAt) return "—";
  const s = new Date(startedAt).getTime();
  const c = new Date(completedAt).getTime();
  if (isNaN(s) || isNaN(c)) return "—";
  return `${Math.max(0, Math.round((c - s) / 1000))}s`;
}

function Row({ label, children, mono = false }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <dt className="text-xs uppercase tracking-wider font-semibold text-slate-500 self-center">{label}</dt>
      <dd className={`col-span-2 text-sm text-slate-800 ${mono ? "font-mono text-xs break-all" : ""}`}>{children}</dd>
    </div>
  );
}

export default function JobModal({ job, open, onOpenChange }) {
  if (!job) return null;
  const meta = TYPE_META[job.type] || { label: job.type };

  const copyId = () => {
    navigator.clipboard.writeText(job.id);
    toast.success("Job ID copied");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="job-detail-modal">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-tight flex items-center gap-3">
            {meta.label}
            <StatusBadge status={job.status} />
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Full job details, timing and result.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          <dl>
            <Row label="Job ID" mono>
              <button
                onClick={copyId}
                className="inline-flex items-center gap-1.5 hover:text-yellow-600"
                data-testid="copy-job-id"
              >
                {job.id}
                <Copy className="w-3 h-3" />
              </button>
            </Row>
            <Row label="Owner">
              <span className="inline-flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" /> {job.owner_name}
              </span>
            </Row>
            <Row label="Type">{meta.label}</Row>
            <Row label="Description">{job.description}</Row>
            <Row label="Priority"><PriorityBadge priority={job.priority} /></Row>
            <Row label="Created">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> {fmtDate(job.created_at)}
              </span>
            </Row>
            <Row label="Started">
              <span className="inline-flex items-center gap-1.5">
                <PlayCircle className="w-3.5 h-3.5 text-slate-400" /> {fmtDate(job.started_at)}
              </span>
            </Row>
            <Row label="Completed">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" /> {fmtDate(job.completed_at)}
              </span>
            </Row>
            <Row label="Duration">{duration(job.started_at, job.completed_at)}</Row>
            {job.result && (
              <Row label="Result">
                <span className="text-emerald-700">{job.result}</span>
              </Row>
            )}
            {job.error_message && (
              <Row label="Error">
                <span className="inline-flex items-center gap-1.5 text-rose-700">
                  <AlertTriangle className="w-3.5 h-3.5" /> {job.error_message}
                </span>
              </Row>
            )}
          </dl>
        </div>
      </DialogContent>
    </Dialog>
  );
}
