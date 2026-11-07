import { ClipboardList } from "lucide-react";

export default function AuditLogs() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
          Security & Compliance
        </p>
        <h1 className="mt-1 text-3xl font-extrabold text-slate-900">
          Audit Logs
        </h1>
        <p className="mt-1 text-slate-500">
          Immutable audit trails of reconciliation runs, manual overrides, and financial imports.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <ClipboardList size={28} />
        </div>
        <h2 className="text-lg font-bold text-slate-900">
          Audit Activity Trail
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          System audit events and user action histories are captured automatically across all batch runs and claim updates.
        </p>
      </div>
    </div>
  );
}
