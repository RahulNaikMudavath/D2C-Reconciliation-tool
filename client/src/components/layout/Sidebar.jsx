
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  GitCompareArrows,
  Upload,
  FileText,
  ClipboardList,
  LogOut,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const navigation = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Reconciliation", path: "/reconciliation", icon: GitCompareArrows },
  { name: "Imports", path: "/imports", icon: Upload },
  { name: "Column Mappings", path: "/column-mappings", icon: Sparkles },
  { name: "Claims", path: "/claims", icon: FileText },
  { name: "Audit Logs", path: "/audit-logs", icon: ClipboardList },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col bg-slate-950 text-white z-30">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-800/80 px-5">
        <div className="rounded-lg bg-blue-600 p-1.5">
          <ShieldCheck size={20} />
        </div>

        <div>
          <h1 className="text-base font-bold tracking-tight">
            Reconcile<span className="text-blue-400">X</span>
          </h1>
          <p className="text-[11px] text-slate-400 leading-none">Finance Workspace</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3.5 pt-5">
        <p className="mb-2 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Workspace
        </p>

        <nav className="space-y-0.5">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition ${
                    isActive
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                  }`
                }
              >
                <Icon size={16} />
                {item.name}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="shrink-0 border-t border-slate-800/80 p-3.5">
        <div className="mb-3 flex items-center gap-2.5 px-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold">
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>

          <div className="min-w-0">
            <p className="truncate text-xs font-semibold leading-tight">
              {user?.name || "User"}
            </p>
            <p className="text-[11px] text-slate-400 leading-tight">
              {user?.role === "CO_FOUNDER"
                ? "Co-founder"
                : "Finance Executive"}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
