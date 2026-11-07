
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  GitCompareArrows,
  Upload,
  FileText,
  ClipboardList,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const navigation = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Reconciliation", path: "/reconciliation", icon: GitCompareArrows },
  { name: "Imports", path: "/imports", icon: Upload },
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
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-slate-950 text-white">
      <div className="flex h-20 items-center gap-3 border-b border-slate-800 px-6">
        <div className="rounded-xl bg-blue-600 p-2">
          <ShieldCheck size={25} />
        </div>

        <div>
          <h1 className="text-xl font-bold">
            Reconcile<span className="text-blue-400">X</span>
          </h1>
          <p className="text-xs text-slate-400">Finance Workspace</p>
        </div>
      </div>

      <div className="px-4 pt-7">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Workspace
        </p>

        <nav className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`
                }
              >
                <Icon size={19} />
                {item.name}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto border-t border-slate-800 p-4">
        <div className="mb-4 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-semibold">
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {user?.name || "User"}
            </p>
            <p className="text-xs text-slate-400">
              {user?.role === "CO_FOUNDER"
                ? "Co-founder"
                : "Finance Executive"}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut size={19} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
