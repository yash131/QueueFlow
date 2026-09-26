import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Inbox, ListChecks, Loader2, CheckCircle2, XCircle, Ban, Clock, Percent, Activity } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import JobTable from "@/components/JobTable";
import JobModal from "@/components/JobModal";
import { StatCardSkeleton } from "@/components/LoadingSkeleton";
import { usePolling } from "@/hooks/usePolling";
import api, { formatApiError } from "@/services/api";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const AUDIT_ICONS = {
  update_workers: Activity,
  cancel_job: Ban,
  retry_job: Loader2,
  delete_job: XCircle,
};

const AUDIT_LABEL = {
  update_workers: "Worker count changed",
  cancel_job: "Cancelled a job",
  retry_job: "Retried a job",
  delete_job: "Deleted a job",
};

export default function AdminDashboard() {
  const [selectedJob, setSelectedJob] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [users, setUsers] = useState([]);
  const [audit, setAudit] = useState([]);

  const { data: stats } = usePolling(async () => (await api.get("/stats")).data, 2500);
  const { data: jobs, loading, refetch: refetchJobs } = usePolling(
    async () => (await api.get("/jobs")).data,
    2500
  );

  const fetchUsersAndAudit = async () => {
    try {
      const [u, a] = await Promise.all([api.get("/admin/users"), api.get("/admin/audit")]);
      setUsers(u.data);
      setAudit(a.data);
    } catch (e) {
      // silent
    }
  };

  useEffect(() => {
    fetchUsersAndAudit();
    const id = setInterval(fetchUsersAndAudit, 5000);
    return () => clearInterval(id);
  }, []);

  const runAction = async (job, action) => {
    setBusyId(job.id);
    try {
      if (action === "cancel") await api.post(`/jobs/${job.id}/cancel`);
      if (action === "retry") await api.post(`/jobs/${job.id}/retry`);
      if (action === "delete") await api.delete(`/jobs/${job.id}`);
      toast.success(`Job ${action}${action === "delete" ? "d" : "ed"} successfully`);
      await Promise.all([refetchJobs(), fetchUsersAndAudit()]);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashboardLayout title="Admin Overview" subtitle="System-wide jobs, workers, and activity">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {!stats ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total Jobs" value={stats.total_jobs} icon={ListChecks} accent="yellow" testId="admin-stat-total" />
            <StatCard label="Running" value={stats.running_jobs} icon={Loader2} accent="sky" delay={0.05} testId="admin-stat-running" />
            <StatCard label="Completed" value={stats.completed_jobs} icon={CheckCircle2} accent="emerald" delay={0.1} testId="admin-stat-completed" />
            <StatCard label="Failed" value={stats.failed_jobs} icon={XCircle} accent="rose" delay={0.15} testId="admin-stat-failed" />
          </>
        )}
      </section>

      <section className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats && (
          <>
            <StatCard label="Pending" value={stats.pending_jobs} icon={Inbox} accent="yellow" testId="admin-stat-pending" />
            <StatCard label="Cancelled" value={stats.cancelled_jobs} icon={Ban} accent="slate" delay={0.05} testId="admin-stat-cancelled" />
            <StatCard label="Avg Process (s)" value={stats.average_processing_time} icon={Clock} accent="sky" delay={0.1} testId="admin-stat-avg" />
            <StatCard label="Failure Rate" value={Math.round((stats.failure_rate || 0) * 100)} suffix="%" icon={Percent} accent="rose" delay={0.15} testId="admin-stat-failrate" />
          </>
        )}
      </section>

      <section className="mt-8 grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <h2 className="font-display text-2xl font-extrabold text-slate-900 tracking-tight mb-4">All jobs</h2>
          <JobTable
            jobs={jobs || []}
            users={users}
            onView={setSelectedJob}
            onCancel={(j) => runAction(j, "cancel")}
            onRetry={(j) => runAction(j, "retry")}
            onDelete={(j) => runAction(j, "delete")}
            busyId={busyId}
          />
        </div>
        <div>
          <h2 className="font-display text-2xl font-extrabold text-slate-900 tracking-tight mb-4">Recent activity</h2>
          <AuditPanel audit={audit} />
        </div>
      </section>

      <JobModal job={selectedJob} open={!!selectedJob} onOpenChange={(o) => !o && setSelectedJob(null)} />
    </DashboardLayout>
  );
}

function AuditPanel({ audit }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm max-h-[560px] overflow-y-auto" data-testid="audit-panel">
      {(!audit || audit.length === 0) && (
        <div className="text-center text-sm text-slate-500 py-8">
          <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          No recent admin activity yet.
        </div>
      )}
      <ol className="space-y-4">
        {audit.map((log) => {
          const Icon = AUDIT_ICONS[log.action] || Activity;
          return (
            <motion.li
              key={log.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-3"
              data-testid={`audit-item-${log.id}`}
            >
              <div className="w-9 h-9 rounded-lg bg-yellow-100 text-yellow-700 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-900">
                  {AUDIT_LABEL[log.action] || log.action}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  <span className="font-semibold text-slate-700">{log.admin_name}</span> ·{" "}
                  {log.timestamp ? formatDistanceToNow(new Date(log.timestamp), { addSuffix: true }) : "just now"}
                </div>
                {log.details && (
                  <div className="text-xs text-slate-600 mt-1.5 bg-slate-50 border border-slate-100 rounded-md px-2 py-1.5">
                    {log.details}
                  </div>
                )}
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
