import { useEffect, useState } from "react";
import {
  getColumnMappings,
  approveColumnMapping,
  rejectColumnMapping,
} from "../../services/columnMappingService";
import {
  CheckCircle2,
  Clock,
  RefreshCw,
  Sparkles,
  FileSpreadsheet,
  AlertCircle,
  XCircle,
  X,
} from "lucide-react";

export default function ColumnMappings() {
  const [status, setStatus] = useState("PENDING");
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [success, setSuccess] = useState("");

  const [rejectModalMapping, setRejectModalMapping] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionError, setRejectionError] = useState("");

  async function loadMappings() {
    try {
      setLoading(true);
      setError("");

      const [filteredResponse, allResponse] = await Promise.all([
        getColumnMappings(status),
        getColumnMappings("ALL"),
      ]);

      const filteredMappings = filteredResponse.data || [];
      const allMappings = allResponse.data || [];

      setMappings(filteredMappings);

      setStats({
        total: allMappings.length,
        pending: allMappings.filter((item) => !item.approved && !item.rejected).length,
        approved: allMappings.filter((item) => item.approved).length,
        rejected: allMappings.filter((item) => item.rejected).length,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load column mappings."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMappings();
  }, [status]);

  async function handleApprove(mappingId) {
    try {
      setActionLoading(mappingId);
      setError("");
      setSuccess("");

      await approveColumnMapping(mappingId);

      setSuccess("Column mapping approved successfully!");
      await loadMappings();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to approve column mapping."
      );
    } finally {
      setActionLoading("");
    }
  }

  async function handleRejectSubmit(e) {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setRejectionError("Please provide a reason for rejecting this mapping.");
      return;
    }
    if (rejectionReason.trim().length > 1000) {
      setRejectionError("Rejection reason cannot exceed 1000 characters.");
      return;
    }

    try {
      setActionLoading(rejectModalMapping.id);
      setRejectionError("");
      setError("");
      setSuccess("");

      await rejectColumnMapping(rejectModalMapping.id, rejectionReason.trim());

      setSuccess("Column mapping rejected successfully.");
      setRejectModalMapping(null);
      setRejectionReason("");
      await loadMappings();
    } catch (err) {
      setRejectionError(
        err.response?.data?.message || "Failed to reject column mapping."
      );
    } finally {
      setActionLoading("");
    }
  }

  function openRejectModal(item) {
    setRejectModalMapping(item);
    setRejectionReason("");
    setRejectionError("");
  }

  function closeRejectModal() {
    if (actionLoading) return;
    setRejectModalMapping(null);
    setRejectionReason("");
    setRejectionError("");
  }

  function getConfidenceColor(confidence) {
    if (confidence >= 0.9) {
      return "text-emerald-700 bg-emerald-50";
    }

    if (confidence >= 0.7) {
      return "text-amber-700 bg-amber-50";
    }

    return "text-red-700 bg-red-50";
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900">
              AI Column Mapping
            </h1>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Review AI-generated column suggestions and manage approvals.
          </p>
        </div>

        <button
          onClick={loadMappings}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Mappings</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {stats.total}
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-amber-700">Pending Review</p>
          <p className="mt-2 text-3xl font-bold text-amber-900">
            {stats.pending}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-emerald-700">Approved</p>
          <p className="mt-2 text-3xl font-bold text-emerald-900">
            {stats.approved}
          </p>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-rose-700">Rejected</p>
          <p className="mt-2 text-3xl font-bold text-rose-900">
            {stats.rejected}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {["PENDING", "APPROVED", "REJECTED", "ALL"].map((filter) => (
          <button
            key={filter}
            onClick={() => setStatus(filter)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              status === filter
                ? "bg-indigo-600 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {filter === "PENDING"
              ? `Pending Review (${stats.pending})`
              : filter === "APPROVED"
                ? `Approved (${stats.approved})`
                : filter === "REJECTED"
                  ? `Rejected (${stats.rejected})`
                  : `All Mappings (${stats.total})`}
          </button>
        ))}
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">
          Loading column mappings...
        </div>
      ) : mappings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <FileSpreadsheet className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-3 font-semibold text-slate-800">
            No mappings found
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            AI-generated mappings will appear here after file uploads.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {mappings.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet
                      size={18}
                      className="text-indigo-600"
                    />
                    <h3 className="font-semibold text-slate-900">
                      {item.sourceName}
                    </h3>
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    {item.importBatch?.importType} · Version {item.version}
                  </p>
                </div>

                <span
                  className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                    item.rejected
                      ? "border border-rose-200 bg-rose-50 text-rose-700"
                      : item.approved
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  {item.rejected ? (
                    <XCircle size={14} />
                  ) : item.approved ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <Clock size={14} />
                  )}
                  {item.rejected
                    ? "Rejected"
                    : item.approved
                      ? "Approved"
                      : "Pending Review"}
                </span>
              </div>

              {item.rejected && item.rejectionReason && (
                <div className="mx-5 mt-4 rounded-lg border border-rose-200 bg-rose-50/60 p-3.5 text-sm text-rose-900">
                  <div className="flex items-start gap-2.5">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                    <div>
                      <p className="font-semibold text-rose-900">Rejection Reason</p>
                      <p className="mt-0.5 whitespace-pre-wrap text-xs text-rose-800">
                        {item.rejectionReason}
                      </p>
                      {item.rejectedAt && (
                        <p className="mt-1.5 text-[11px] text-rose-600">
                          Rejected on {new Date(item.rejectedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto p-5">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
                      <th className="px-3 py-3">Original Header</th>
                      <th className="px-3 py-3">Suggested Field</th>
                      <th className="px-3 py-3">Confidence</th>
                      <th className="px-3 py-3">Reason</th>
                    </tr>
                  </thead>

                  <tbody>
                    {(item.mapping?.suggestions || []).map(
                      (suggestion, index) => (
                        <tr
                          key={`${item.id}-${index}`}
                          className="border-b border-slate-50 last:border-0"
                        >
                          <td className="px-3 py-4 font-medium text-slate-800">
                            {suggestion.originalHeader}
                          </td>

                          <td className="px-3 py-4">
                            <span className="rounded-md bg-indigo-50 px-2 py-1 font-mono text-xs text-indigo-700">
                              {suggestion.suggestedField}
                            </span>
                          </td>

                          <td className="px-3 py-4">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${getConfidenceColor(
                                suggestion.confidence
                              )}`}
                            >
                              {(suggestion.confidence * 100).toFixed(0)}%
                            </span>
                          </td>

                          <td className="max-w-xs px-3 py-4 text-slate-500">
                            {suggestion.reason}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center">
                <p className="text-xs text-slate-500">
                  Created:{" "}
                  {new Date(item.createdAt).toLocaleString()}
                  {item.approved && item.approvedAt && ` · Approved on ${new Date(item.approvedAt).toLocaleString()}`}
                  {item.rejected && item.rejectedAt && ` · Rejected on ${new Date(item.rejectedAt).toLocaleString()}`}
                </p>

                {!item.approved && !item.rejected && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openRejectModal(item)}
                      disabled={Boolean(actionLoading)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3.5 py-2 text-sm font-semibold text-rose-700 hover:border-rose-400 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 transition"
                    >
                      <XCircle size={15} />
                      Reject
                    </button>

                    <button
                      onClick={() => handleApprove(item.id)}
                      disabled={Boolean(actionLoading)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 transition"
                    >
                      <CheckCircle2 size={16} />
                      {actionLoading === item.id
                        ? "Approving..."
                        : "Approve Mapping"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rejection Modal */}
      {rejectModalMapping && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Reject Column Mapping
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {rejectModalMapping.sourceName} (Version {rejectModalMapping.version})
                </p>
              </div>

              <button
                onClick={closeRejectModal}
                disabled={Boolean(actionLoading)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="rejectionReason"
                  className="block text-sm font-medium text-slate-700"
                >
                  Rejection Reason <span className="text-rose-500">*</span>
                </label>
                <p className="mt-0.5 text-xs text-slate-500">
                  Provide feedback on why this AI suggestion was rejected.
                </p>

                <textarea
                  id="rejectionReason"
                  rows={4}
                  maxLength={1000}
                  value={rejectionReason}
                  onChange={(e) => {
                    setRejectionReason(e.target.value);
                    if (rejectionError) setRejectionError("");
                  }}
                  placeholder="e.g. Columns misaligned; missing order reference mapping. Please request an updated template."
                  className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
                  autoFocus
                />
                <div className="mt-1 flex justify-between text-xs text-slate-400">
                  <span>{rejectionError && <span className="font-medium text-rose-600">{rejectionError}</span>}</span>
                  <span>{rejectionReason.length} / 1000</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={closeRejectModal}
                  disabled={Boolean(actionLoading)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={Boolean(actionLoading) || !rejectionReason.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <XCircle size={16} />
                  {actionLoading === rejectModalMapping.id
                    ? "Rejecting..."
                    : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
