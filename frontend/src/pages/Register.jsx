import { useState } from "react";
import { motion } from "framer-motion";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Loader2, Mail, Lock, User, Workflow, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { formatApiError } from "@/services/api";

export default function Register() {
  const { user, register, loading: authLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  if (!authLoading && user) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSubmitting(true);
    try {
      const u = await register(name.trim(), email.trim(), password);
      toast.success(`Welcome, ${u.name}`);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#0F172A] text-white p-10 xl:p-14">
        <div className="absolute inset-0 qf-grid-pattern opacity-30" />
        <motion.div
          className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-yellow-400/20 blur-3xl"
          animate={{ y: [0, 25, 0], opacity: [0.35, 0.6, 0.35] }}
          transition={{ duration: 9, repeat: Infinity }}
        />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-yellow-400 flex items-center justify-center">
            <Workflow className="w-6 h-6 text-slate-900" strokeWidth={2.5} />
          </div>
          <div className="font-display font-extrabold text-2xl tracking-tight">QueueFlow</div>
        </div>
        <div className="relative z-10 space-y-5 max-w-md">
          <h1 className="font-display text-4xl xl:text-5xl font-extrabold leading-tight tracking-tight">
            Ship background work,
            <br /> <span className="text-yellow-400">without the drama.</span>
          </h1>
          <p className="text-slate-400">
            Create an account and start scheduling image resizes, PDF generation, exports, and emails in seconds.
          </p>
          <ul className="space-y-2.5 pt-3">
            {["Real async worker pool", "Priority-aware scheduling", "Live status polling", "Full audit trail (admin)"].map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" /> {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative z-10 text-xs text-slate-500">
          © {new Date().getFullYear()} QueueFlow
        </div>
      </div>

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

          <h2 className="font-display text-3xl font-extrabold text-slate-900 tracking-tight">Create an account</h2>
          <p className="text-sm text-slate-500 mt-1.5">You'll start with a user role. It only takes 20 seconds.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4" data-testid="register-form">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="pl-9"
                  data-testid="register-name-input"
                />
              </div>
            </div>
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
                  placeholder="jane@example.com"
                  className="pl-9"
                  data-testid="register-email-input"
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
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="pl-9"
                  data-testid="register-password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-semibold btn-yellow-glow h-11 text-base"
              data-testid="register-submit-button"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating…</>
              ) : (
                <>Create account <ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </form>

          <div className="mt-6 text-sm text-slate-600 text-center">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-yellow-600 hover:text-yellow-700" data-testid="link-to-login">
              Sign in
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
