import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Inbox, ListChecks, Loader2, CheckCircle2, XCircle, Ban } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import JobCard from "@/components/JobCard";
import JobForm from "@/components/JobForm";
import JobModal from "@/components/JobModal";
import { JobCardSkeleton, StatCardSkeleton } from "@/components/LoadingSkeleton";
import { useAuth } from "@/context/AuthContext";
import { usePolling } from "@/hooks/usePolling";
import api from "@/services/api";

const STATUS_COLUMNS = [
  { key: "pending", label: "Pending", accent: "yellow" },
  { key: "running", label: "Running", accent: "sky" },
  { key: "done", label: "Done", accent: "emerald" },
  { key: "failed", label: "Failed", accent: "rose" },
  { key: "cancelled", label: "Cancelled", accent: "slate" },
];

const greet = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

export default function UserDashboard() {
  const { user } = useAuth();
  const [selectedJob, setSelectedJob] = useState(null);

  const { data: jobs, loading, refetch: refetchJobs } = usePolling(
    async () => (await api.get("/jobs/my")).data,
    2500
  );
  const { data: stats } = usePolling(
    async () => (await api.get("/stats")).data,
    2500
  );

  const grouped = useMemo(() => {
    const g = { pending: [], running: [], done: [], failed: [], cancelled: [] };
    (jobs || []).forEach((j) => (g[j.status] ||= []).push(j));
    return g;
  }, [jobs]);

  const isEmpty = !loading && (jobs?.length ?? 0) === 0;

  return (
    <DashboardLayout
      title={`${greet()}, ${user?.name?.split(" ")[0] || "there"} 👋`}
      subtitle="Track and manage your background jobs"
    >
      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {loading && !stats ? (
          Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total" value={stats?.total_jobs} icon={ListChecks} accent="yellow" delay={0} testId="stat-total" />
            <StatCard label="Pending" value={stats?.pending_jobs} icon={Inbox} accent="yellow" delay={0.05} testId="stat-pending" />
            <StatCard label="Running" value={stats?.running_jobs} icon={Loader2} accent="sky" delay={0.1} testId="stat-running" />
            <StatCard label="Completed" value={stats?.completed_jobs} icon={CheckCircle2} accent="emerald" delay={0.15} testId="stat-completed" />
            <StatCard label="Failed" value={stats?.failed_jobs} icon={XCircle} accent="rose" delay={0.2} testId="stat-failed" />
          </>
        )}
      </section>

      {/* Job form + status snapshot */}
      <section className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <JobForm onCreated={refetchJobs} />
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400 qf-pulse-dot" />
            Quick snapshot
          </h3>
          <ul className="space-y-2.5">
            {STATUS_COLUMNS.map((c) => (
              <li key={c.key} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{c.label}</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {grouped[c.key]?.length ?? 0}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Job board */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-extrabold text-slate-900 tracking-tight">Your jobs</h2>
        </div>

        {loading && (jobs?.length ?? 0) === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <JobCardSkeleton key={i} />)}
          </div>
        ) : isEmpty ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            {STATUS_COLUMNS.map((col) => (
              <div key={col.key} className="bg-slate-100/70 rounded-2xl p-3 min-h-[240px] border border-slate-200/60" data-testid={`column-${col.key}`}>
                <div className="flex items-center justify-between px-2 pt-1 pb-3">
                  <div className="flex items-center gap-2">
                    <StatusHeaderDot status={col.key} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">{col.label}</span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-slate-500">{grouped[col.key]?.length ?? 0}</span>
                </div>
                <div className="space-y-3">
                  <AnimatePresence>
                    {grouped[col.key]?.map((job) => (
                      <JobCard key={job.id} job={job} onClick={() => setSelectedJob(job)} />
                    ))}
                  </AnimatePresence>
                  {(grouped[col.key]?.length ?? 0) === 0 && (
                    <div className="text-center text-xs text-slate-400 py-6 italic">Nothing here</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <JobModal
        job={selectedJob}
        open={!!selectedJob}
        onOpenChange={(o) => !o && setSelectedJob(null)}
      />
    </DashboardLayout>
  );
}

function StatusHeaderDot({ status }) {
  const map = {
    pending: "bg-amber-400",
    running: "bg-sky-500",
    done: "bg-emerald-500",
    failed: "bg-rose-500",
    cancelled: "bg-slate-400",
  };
  return <span className={`w-2 h-2 rounded-full ${map[status]}`} />;
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center"
      data-testid="empty-state"
    >
      <div className="w-14 h-14 mx-auto rounded-xl bg-yellow-100 flex items-center justify-center mb-3">
        <Inbox className="w-7 h-7 text-yellow-600" />
      </div>
      <h3 className="font-display text-lg font-bold text-slate-900">No jobs yet</h3>
      <p className="text-sm text-slate-500 mt-1">Submit your first background job using the form above.</p>
    </motion.div>
  );
}
