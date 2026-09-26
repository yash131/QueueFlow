import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Cpu, Zap, Loader2, Save } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import api, { formatApiError } from "@/services/api";
import { toast } from "sonner";
import { usePolling } from "@/hooks/usePolling";

export default function Settings() {
  const { data: settings } = usePolling(
    async () => (await api.get("/admin/settings")).data,
    3000
  );
  const [maxWorkers, setMaxWorkers] = useState(2);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings && !dirty) {
      setMaxWorkers(settings.max_workers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.max_workers]);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put("/admin/settings", { max_workers: maxWorkers });
      toast.success(`Worker pool set to ${data.max_workers}`);
      setDirty(false);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="Settings" subtitle="Manage the worker pool and system configuration">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
          data-testid="worker-status-card"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Worker Status</div>
              <div className="font-display font-bold text-slate-900">Live</div>
            </div>
          </div>
          <div className="space-y-3">
            <Row label="Active workers" value={settings?.active_workers ?? 0} testId="active-workers" />
            <Row label="Max concurrent" value={settings?.max_workers ?? 0} testId="max-workers-current" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
          data-testid="worker-config-card"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 text-yellow-700 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Concurrency</div>
              <div className="font-display font-bold text-slate-900">Max concurrent workers</div>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            Choose how many jobs the worker pool processes in parallel. Changes take effect immediately without restarting the backend.
          </p>

          <div className="mt-6">
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-xs uppercase font-semibold tracking-wider text-slate-500">Workers</span>
              <span className="font-display text-4xl font-extrabold text-slate-900 tabular-nums" data-testid="workers-value">
                {maxWorkers}
              </span>
            </div>
            <Slider
              value={[maxWorkers]}
              min={1}
              max={20}
              step={1}
              onValueChange={(v) => { setMaxWorkers(v[0]); setDirty(true); }}
              data-testid="worker-concurrency-slider"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-2 font-mono">
              <span>1</span><span>20</span>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              onClick={save}
              disabled={saving || !dirty}
              className="bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-semibold btn-yellow-glow"
              data-testid="save-workers-button"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save changes
            </Button>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}

function Row({ label, value, testId }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="font-display text-lg font-bold text-slate-900 tabular-nums" data-testid={testId}>{value}</span>
    </div>
  );
}
