import { Link } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-[#FAFAFA]">
      <div className="max-w-md w-full text-center bg-white border border-slate-200 rounded-2xl p-10 shadow-sm">
        <div className="w-14 h-14 mx-auto rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900 tracking-tight">Unauthorized</h1>
        <p className="text-sm text-slate-500 mt-2">
          You don't have permission to view this page. If you think this is a mistake, contact your administrator.
        </p>
        <Link to="/dashboard">
          <Button className="mt-6 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-semibold" data-testid="back-to-dashboard-btn">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
