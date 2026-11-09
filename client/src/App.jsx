import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/auth/Login";
import Dashboard from "./pages/dashboard/Dashboard";
import Sidebar from "./components/layout/Sidebar";
import Reconciliation from "./pages/reconciliation/Reconciliation";
import Imports from "./pages/imports/Imports";
import Claims from "./pages/claims/Claims";
import AuditLogs from "./pages/audit/AuditLogs";
import ColumnMappings from "./pages/mappings/ColumnMappings";

function ProtectedLayout({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading ReconcileX...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <Login />}
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedLayout>
            <Dashboard />
          </ProtectedLayout>
        }
      />
      <Route
        path="/reconciliation"
        element={
          <ProtectedLayout>
            <Reconciliation />
          </ProtectedLayout>
        }
      />
      <Route
        path="/imports"
        element={
          <ProtectedLayout>
            <Imports />
          </ProtectedLayout>
        }
      />
      <Route
        path="/claims"
        element={
          <ProtectedLayout>
            <Claims />
          </ProtectedLayout>
        }
      />
      <Route
        path="/audit-logs"
        element={
          <ProtectedLayout>
            <AuditLogs />
          </ProtectedLayout>
        }
      />
      <Route
        path="/column-mappings"
        element={
          <ProtectedLayout>
            <ColumnMappings />
          </ProtectedLayout>
        }
      />

      {/* Aliases for nested /dashboard subpaths */}
      <Route
        path="/dashboard/imports"
        element={<Navigate to="/imports" replace />}
      />
      <Route
        path="/dashboard/reconciliation"
        element={<Navigate to="/reconciliation" replace />}
      />
      <Route
        path="/dashboard/claims"
        element={<Navigate to="/claims" replace />}
      />
      <Route
        path="/dashboard/audit-logs"
        element={<Navigate to="/audit-logs" replace />}
      />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
