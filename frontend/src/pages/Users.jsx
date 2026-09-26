import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, User as UserIcon } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { TableRowSkeleton } from "@/components/LoadingSkeleton";
import api, { formatApiError } from "@/services/api";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await api.get("/admin/users");
        if (!cancelled) setUsers(data);
      } catch (e) {
        toast.error(formatApiError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return (
    <DashboardLayout title="Users" subtitle="All registered accounts and their job activity">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm"
        data-testid="users-table"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Name</th>
                <th className="text-left px-4 py-3 font-semibold">Email</th>
                <th className="text-left px-4 py-3 font-semibold">Role</th>
                <th className="text-left px-4 py-3 font-semibold">Joined</th>
                <th className="text-right px-4 py-3 font-semibold">Total</th>
                <th className="text-right px-4 py-3 font-semibold">Completed</th>
                <th className="text-right px-4 py-3 font-semibold">Failed</th>
              </tr>
            </thead>
            <tbody>
              {loading && users.length === 0 ? (
                Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50/70" data-testid={`user-row-${u.id}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center font-semibold text-sm">
                          {u.name?.[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-900">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{u.email}</td>
                    <td className="px-4 py-3">
                      {u.role === "admin" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                          <ShieldCheck className="w-3 h-3" /> Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          <UserIcon className="w-3 h-3" /> User
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {u.created_at ? formatDistanceToNow(new Date(u.created_at), { addSuffix: true }) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 font-mono">{u.total_jobs ?? 0}</td>
                    <td className="px-4 py-3 text-right text-emerald-700 font-mono">{u.completed_jobs ?? 0}</td>
                    <td className="px-4 py-3 text-right text-rose-700 font-mono">{u.failed_jobs ?? 0}</td>
                  </tr>
                ))
              )}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500">No users yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
