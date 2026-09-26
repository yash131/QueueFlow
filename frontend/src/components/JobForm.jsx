import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api, { formatApiError } from "@/services/api";
import { toast } from "sonner";

const JOB_TYPES = [
  { value: "image_resize", label: "Image Resize" },
  { value: "send_email", label: "Send Email" },
  { value: "data_export", label: "Data Export" },
  { value: "pdf_generation", label: "PDF Generation" },
];

export default function JobForm({ onCreated }) {
  const [type, setType] = useState("image_resize");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error("Please add a short description");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post("/jobs", { type, description: description.trim(), priority });
      toast.success("Job submitted");
      setDescription("");
      setPriority("medium");
      onCreated?.(data);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm"
      data-testid="job-form"
    >
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center">
          <Plus className="w-4 h-4 text-slate-900" strokeWidth={2.5} />
        </div>
        <div>
          <h3 className="font-display font-bold text-slate-900">Submit a new job</h3>
          <p className="text-xs text-slate-500">Pick a type, add context, choose priority.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="job-type">Job Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger id="job-type" data-testid="job-type-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JOB_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value} data-testid={`job-type-option-${t.value}`}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="job-priority">Priority</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger id="job-priority" data-testid="job-priority-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high" data-testid="priority-option-high">High</SelectItem>
              <SelectItem value="medium" data-testid="priority-option-medium">Medium</SelectItem>
              <SelectItem value="low" data-testid="priority-option-low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="job-desc">Description</Label>
          <Textarea
            id="job-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What should this job do? e.g. Resize 1200x800 avatars to 400px"
            data-testid="job-description-input"
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Button
          type="submit"
          disabled={submitting}
          className="bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-semibold btn-yellow-glow"
          data-testid="submit-job-button"
        >
          {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Submit Job
        </Button>
      </div>
    </motion.form>
  );
}

export { JOB_TYPES };
