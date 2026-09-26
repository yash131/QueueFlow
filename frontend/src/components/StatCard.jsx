import { useEffect, useState } from "react";
import { motion } from "framer-motion";

function useAnimatedNumber(value, duration = 700) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const from = display;
    const to = Number(value) || 0;
    const step = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return display;
}

export default function StatCard({ label, value, icon: Icon, accent = "yellow", suffix, testId, delay = 0 }) {
  const num = useAnimatedNumber(value ?? 0);
  const accentMap = {
    yellow: { bg: "bg-yellow-100", text: "text-yellow-700", ring: "ring-yellow-200" },
    sky: { bg: "bg-sky-100", text: "text-sky-700", ring: "ring-sky-200" },
    emerald: { bg: "bg-emerald-100", text: "text-emerald-700", ring: "ring-emerald-200" },
    rose: { bg: "bg-rose-100", text: "text-rose-700", ring: "ring-rose-200" },
    slate: { bg: "bg-slate-100", text: "text-slate-700", ring: "ring-slate-200" },
  };
  const c = accentMap[accent] || accentMap.yellow;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      whileHover={{ y: -3 }}
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-yellow-300"
      style={{ transition: "box-shadow 220ms ease, border-color 220ms ease, transform 220ms ease" }}
      data-testid={testId}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-wider font-semibold text-slate-500">{label}</div>
        {Icon && (
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.bg} ${c.text} ring-4 ${c.ring} ring-opacity-40`}>
            <Icon className="w-4.5 h-4.5" strokeWidth={2.2} />
          </div>
        )}
      </div>
      <div className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
        {num}
        {suffix && <span className="text-lg text-slate-400 ml-1 font-semibold">{suffix}</span>}
      </div>
    </motion.div>
  );
}
