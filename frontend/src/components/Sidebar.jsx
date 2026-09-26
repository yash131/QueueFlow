import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, Users, Settings, LogOut, Workflow, ShieldCheck, Menu, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

const USER_LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard" },
];

const ADMIN_LINKS = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, testId: "nav-admin-overview" },
  { to: "/admin/users", label: "Users", icon: Users, testId: "nav-admin-users" },
  { to: "/admin/settings", label: "Settings", icon: Settings, testId: "nav-admin-settings" },
];

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const links = isAdmin ? ADMIN_LINKS : USER_LINKS;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const content = (
    <div className="h-full flex flex-col bg-[#0F172A] text-slate-200 w-64 shrink-0">
      {/* Brand */}
      <div className="px-6 pt-6 pb-8 border-b border-slate-800/70 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-yellow-400 flex items-center justify-center shadow-md shadow-yellow-500/20">
            <Workflow className="w-5 h-5 text-slate-900" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display font-extrabold text-lg tracking-tight text-white">QueueFlow</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
              {isAdmin ? "Admin Console" : "Job Console"}
            </div>
          </div>
        </div>
        {setMobileOpen && (
          <button
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setMobileOpen(false)}
            data-testid="sidebar-close-btn"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end
            data-testid={link.testId}
            onClick={() => setMobileOpen && setMobileOpen(false)}
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                isActive
                  ? "bg-yellow-400/10 text-yellow-300"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
              }`
            }
            style={{ transition: "background-color 180ms ease, color 180ms ease" }}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="active-nav-bar"
                    className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-yellow-400"
                  />
                )}
                <link.icon className="w-4 h-4" />
                <span>{link.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      <div className="px-3 pb-4 pt-4 border-t border-slate-800/70">
        <div className="px-3 py-2 mb-2 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-yellow-400 font-semibold">
            {user?.name?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate" data-testid="sidebar-user-name">
              {user?.name}
            </div>
            <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
              {isAdmin && <ShieldCheck className="w-3 h-3 text-yellow-400" />}
              {user?.email}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          data-testid="logout-btn"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800/70 hover:text-white"
          style={{ transition: "background-color 180ms ease, color 180ms ease" }}
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40" data-testid="sidebar-desktop">
        {content}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40"
            onClick={() => setMobileOpen(false)}
          />
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ duration: 0.22 }}
            className="lg:hidden fixed inset-y-0 left-0 z-50"
          >
            {content}
          </motion.aside>
        </>
      )}
    </>
  );
}

export function MobileMenuButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      style={{ transition: "background-color 180ms ease" }}
      data-testid="sidebar-open-btn"
    >
      <Menu className="w-5 h-5" />
    </button>
  );
}
