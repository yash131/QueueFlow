import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Eye, RotateCcw, Ban, Trash2, MoreHorizontal, Loader2 } from "lucide-react";
import StatusBadge, { PriorityBadge } from "@/components/StatusBadge";
import { TYPE_META } from "@/components/JobCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

function fmtRel(v) {
  if (!v) return "—";
  try {
    return formatDistanceToNow(new Date(v), { addSuffix: true });
  } catch {
    return "—";
  }
}

function processingTime(job) {
  if (!job.started_at || !job.completed_at) {
    if (job.status === "running") return "running…";
    return "—";
  }
  const s = new Date(job.started_at).getTime();
  const c = new Date(job.completed_at).getTime();
  return `${Math.max(0, Math.round((c - s) / 1000))}s`;
}

export default function JobTable({
  jobs,
  users = [],
  onView,
  onCancel,
  onRetry,
  onDelete,
  busyId,
}) {
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [userF, setUserF] = useState("all");
  const [typeF, setTypeF] = useState("all");
  const [priorityF, setPriorityF] = useState("all");

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim();
    return (jobs || []).filter((j) => {
      if (statusF !== "all" && j.status !== statusF) return false;
      if (userF !== "all" && j.owner_id !== userF) return false;
      if (typeF !== "all" && j.type !== typeF) return false;
      if (priorityF !== "all" && j.priority !== priorityF) return false;
      if (!query) return true;
      return (
        j.description?.toLowerCase().includes(query) ||
        j.owner_name?.toLowerCase().includes(query) ||
        j.id?.toLowerCase().includes(query)
      );
    });
  }, [jobs, q, statusF, userF, typeF, priorityF]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-200 grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search description, owner, id…"
            className="pl-9"
            data-testid="jobs-search-input"
          />
        </div>
        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger data-testid="filter-status"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="done">Done</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={userF} onValueChange={setUserF}>
          <SelectTrigger data-testid="filter-user"><SelectValue placeholder="User" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeF} onValueChange={setTypeF}>
          <SelectTrigger data-testid="filter-type"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="image_resize">Image Resize</SelectItem>
            <SelectItem value="send_email">Send Email</SelectItem>
            <SelectItem value="data_export">Data Export</SelectItem>
            <SelectItem value="pdf_generation">PDF Generation</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityF} onValueChange={setPriorityF}>
          <SelectTrigger data-testid="filter-priority"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Job</th>
              <th className="text-left px-4 py-3 font-semibold">Owner</th>
              <th className="text-left px-4 py-3 font-semibold">Priority</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="text-left px-4 py-3 font-semibold">Created</th>
              <th className="text-left px-4 py-3 font-semibold">Duration</th>
              <th className="text-right px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {filtered.map((job) => {
                const meta = TYPE_META[job.type] || { label: job.type };
                const canCancel = ["pending", "running"].includes(job.status);
                const canRetry = job.status === "failed";
                const isBusy = busyId === job.id;
                return (
                  <motion.tr
                    key={job.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-t border-slate-100 hover:bg-slate-50/70"
                    style={{ transition: "background-color 160ms ease" }}
                    data-testid={`job-row-${job.id}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{meta.label}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{job.id.slice(0, 10)}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{job.owner_name}</td>
                    <td className="px-4 py-3"><PriorityBadge priority={job.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
                    <td className="px-4 py-3 text-slate-600">{fmtRel(job.created_at)}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{processingTime(job)}</td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isBusy}
                            data-testid={`job-actions-${job.id}`}
                          >
                            {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreHorizontal className="w-4 h-4" />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onView?.(job)} data-testid={`action-view-${job.id}`}>
                            <Eye className="w-4 h-4 mr-2" /> View details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={!canRetry}
                            onClick={() => canRetry && onRetry?.(job)}
                            data-testid={`action-retry-${job.id}`}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" /> Retry
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={!canCancel}
                            onClick={() => canCancel && onCancel?.(job)}
                            data-testid={`action-cancel-${job.id}`}
                          >
                            <Ban className="w-4 h-4 mr-2" /> Cancel
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onDelete?.(job)}
                            className="text-rose-600 focus:text-rose-700"
                            data-testid={`action-delete-${job.id}`}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-500 text-sm">
                  No jobs match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
