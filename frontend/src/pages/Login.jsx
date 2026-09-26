import { useState } from "react";
import { motion } from "framer-motion";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Loader2, Mail, Lock, Workflow, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { formatApiError } from "@/services/api";

export default function Login() {
  const { user, login, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  if (!authLoading && user) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const u = await login(email.trim(), password);
      toast.success(`Welcome back, ${u.name}`);
      navigate(u.role === "admin" ? "/admin" : "/dashboard", { replace: true });
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* Left – Branding */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#0F172A] text-white p-10 xl:p-14">
        <div className="absolute inset-0 qf-grid-pattern opacity-30" />
        <motion.div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-yellow-400/20 blur-3xl"
          animate={{ y: [0, 30, 0], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-0 -left-24 w-96 h-96 rounded-full bg-yellow-500/15 blur-3xl"
          animate={{ y: [0, -20, 0], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 10, repeat: Infinity }}
        />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-yellow-400 flex items-center justify-center">
            <Workflow className="w-6 h-6 text-slate-900" strokeWidth={2.5} />
          </div>
          <div className="font-display font-extrabold text-2xl tracking-tight">QueueFlow</div>
        </div>

        <div className="relative z-10 space-y-6 max-w-md">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="font-display text-4xl xl:text-5xl font-extrabold leading-tight tracking-tight"
          >
            Smart job scheduling.
            <br />
            <span className="text-yellow-400">Simple task management.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="text-slate-400 text-base"
          >
            Submit background jobs, watch a real async worker pool crunch them in priority order, and keep an eye on
            everything through a crisp live dashboard.
          </motion.p>

          {/* Animated queue visualization */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-8 space-y-2.5"
          >
            {[
              { label: "Image Resize · high", color: "bg-yellow-400", delay: 0 },
              { label: "Send Email · medium", color: "bg-sky-400", delay: 0.3 },
              { label: "Data Export · medium", color: "bg-emerald-400", delay: 0.6 },
              { label: "PDF Generation · low", color: "bg-slate-500", delay: 0.9 },
            ].map((j, i) => (
              <motion.div
                key={i}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.12, duration: 0.4 }}
                className="flex items-center gap-3 bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-lg px-4 py-2.5"
              >
                <motion.span
                  className={`w-2 h-2 rounded-full ${j.color}`}
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, delay: j.delay }}
                />
                <span className="text-sm text-slate-200">{j.label}</span>
                <span className="ml-auto text-[10px] text-slate-500 font-mono">
                  {["running", "pending", "pending", "queued"][i]}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <div className="relative z-10 text-xs text-slate-500">
          © {new Date().getFullYear()} QueueFlow · Built with FastAPI, React & MongoDB
        </div>
      </div>

      {/* Right – Form */}
      <div className="flex items-center justify-center px-6 py-12 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden mb-8 flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-yellow-400 flex items-center justify-center">
              <Workflow className="w-5 h-5 text-slate-900" strokeWidth={2.5} />
            </div>
            <div className="font-display font-extrabold text-xl">QueueFlow</div>
          </div>

          <h2 className="font-display text-3xl font-extrabold text-slate-900 tracking-tight">Sign in</h2>
          <p className="text-sm text-slate-500 mt-1.5">Welcome back. Enter your credentials to continue.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4" data-testid="login-form">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-9"
                  data-testid="login-email-input"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9"
                  data-testid="login-password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-semibold btn-yellow-glow h-11 text-base"
              data-testid="login-submit-button"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in…</>
              ) : (
                <>Sign in <ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </form>

          <div className="mt-6 text-sm text-slate-600 text-center">
            No account?{" "}
            <Link to="/register" className="font-semibold text-yellow-600 hover:text-yellow-700" data-testid="link-to-register">
              Create one
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
