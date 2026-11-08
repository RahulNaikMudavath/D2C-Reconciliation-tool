import { useEffect, useState } from "react";
import {
  getColumnMappings,
  approveColumnMapping,
} from "../../services/columnMappingService";
import {
  CheckCircle2,
  Clock,
  RefreshCw,
  Sparkles,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";

export default function ColumnMappings() {
  const [status, setStatus] = useState("PENDING");
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [success, setSuccess] = useState("");

  async function loadMappings() {
    try {
      setLoading(true);
      setError("");

      const response = await getColumnMappings(status);
      setMappings(response.data || []);
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

  const pendingCount = mappings.filter(
    (item) => !item.approved
  ).length;

  const approvedCount = mappings.filter(
    (item) => item.approved
  ).length;

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Total Mappings</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {mappings.length}
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm text-amber-700">Pending Review</p>
          <p className="mt-2 text-3xl font-bold text-amber-900">
            {pendingCount}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm text-emerald-700">Approved</p>
          <p className="mt-2 text-3xl font-bold text-emerald-900">
            {approvedCount}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {["PENDING", "APPROVED", "ALL"].map((filter) => (
          <button
            key={filter}
            onClick={() => setStatus(filter)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              status === filter
                ? "bg-indigo-600 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {filter === "PENDING"
              ? "Pending Review"
              : filter === "APPROVED"
                ? "Approved"
                : "All Mappings"}
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
                    item.approved
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {item.approved ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <Clock size={14} />
                  )}
                  {item.approved ? "Approved" : "Pending Review"}
                </span>
              </div>

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
                </p>

                {!item.approved && (
                  <button
                    onClick={() => handleApprove(item.id)}
                    disabled={actionLoading === item.id}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} />
                    {actionLoading === item.id
                      ? "Approving..."
                      : "Approve Mapping"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
