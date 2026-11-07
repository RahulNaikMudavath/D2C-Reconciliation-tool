import { FileText, AlertCircle } from "lucide-react";

export default function Claims() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
          Dispute Management
        </p>
        <h1 className="mt-1 text-3xl font-extrabold text-slate-900">
          Claims & Disputes
        </h1>
        <p className="mt-1 text-slate-500">
          Track and resolve marketplace underpayment claims, COD shortages, and SLA penalties.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <FileText size={28} />
        </div>
        <h2 className="text-lg font-bold text-slate-900">
          Claims Center
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          Automated claim filing and dispute tracking for marketplace short-payments will be available here. You can review flagged orders in the Reconciliation view.
        </p>
      </div>
    </div>
  );
}
