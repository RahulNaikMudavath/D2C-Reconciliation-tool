import { useState, useEffect, useCallback } from "react";
import {
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  Search,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import {
  getColumnMappings,
  approveColumnMapping,
} from "../../services/columnMappingService";

export default function ColumnMappings() {
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedMappingId, setExpandedMappingId] = useState(null);
  const [approvingId, setApprovingId] = useState(null);

  const fetchMappings = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getColumnMappings(statusFilter);
      const data = response?.data || [];
      setMappings(data);
    } catch (err) {
      console.error("Failed to load column mappings:", err);
      setError(
        err.response?.data?.message ||
          "Failed to load column mappings. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  const handleApprove = async (mappingId) => {
    setApprovingId(mappingId);
    setError("");
    setSuccessMessage("");

    try {
      await approveColumnMapping(mappingId);
      setSuccessMessage("Column mapping approved successfully!");

      // Update state locally
      setMappings((prev) =>
        prev.map((item) =>
          item.id === mappingId
            ? {
                ...item,
                approved: true,
                approvedAt: new Date().toISOString(),
              }
            : item
        )
      );

      setTimeout(() => {
        setSuccessMessage("");
      }, 4000);
    } catch (err) {
      console.error("Failed to approve mapping:", err);
      setError(
        err.response?.data?.message ||
          "Failed to approve column mapping. Please try again."
      );
    } finally {
      setApprovingId(null);
    }
  };

  const toggleExpand = (id) => {
    setExpandedMappingId((prev) => (prev === id ? null : id));
  };

  // Filter mappings by search term
  const filteredMappings = mappings.filter((m) => {
    const matchesSearch =
      m.sourceName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.importBatch?.importType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.mapping?.importType?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  // Calculate stats
  const totalCount = mappings.length;
  const pendingCount = mappings.filter((m) => !m.approved).length;
  const approvedCount = mappings.filter((m) => m.approved).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Column Mappings
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review, verify, and approve AI-generated column mappings for ingested files.
          </p>
        </div>

        <button
          onClick={fetchMappings}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          {successMessage}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
          <AlertCircle size={18} className="shrink-0 text-rose-600" />
          {error}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">
              Total Mappings
            </span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Layers size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {totalCount}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            All configured source schemas
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-amber-800">
              Pending Review
            </span>
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <Clock size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-amber-900">
            {pendingCount}
          </p>
          <p className="mt-1 text-xs text-amber-700/80">
            Awaiting finance executive sign-off
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-emerald-800">
              Approved Mappings
            </span>
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
              <ShieldCheck size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-emerald-900">
            {approvedCount}
          </p>
          <p className="mt-1 text-xs text-emerald-700/80">
            Active and verified in production pipelines
          </p>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Status Tabs */}
        <div className="flex rounded-xl bg-slate-100 p-1">
          {[
            { label: "All Mappings", value: "ALL" },
            { label: "Pending Approval", value: "PENDING" },
            { label: "Approved", value: "APPROVED" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                statusFilter === tab.value
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[240px]">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search by file or import type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Mappings List Section */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <RefreshCw size={28} className="animate-spin text-blue-600" />
            <p className="mt-3 text-sm font-medium">Loading column mappings...</p>
          </div>
        ) : filteredMappings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-slate-100 p-4 text-slate-400">
              <FileSpreadsheet size={32} />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-800">
              No column mappings found
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              {searchTerm
                ? "No column mappings match your search criteria."
                : statusFilter === "PENDING"
                ? "No mappings are currently pending approval."
                : statusFilter === "APPROVED"
                ? "No approved mappings found yet."
                : "Upload and map a file to generate intelligent column suggestions."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredMappings.map((mapping) => {
              const isExpanded = expandedMappingId === mapping.id;
              const suggestions = mapping.mapping?.suggestions || [];
              const importType =
                mapping.mapping?.importType ||
                mapping.importBatch?.importType ||
                "UNKNOWN";

              return (
                <div
                  key={mapping.id}
                  className="transition hover:bg-slate-50/60"
                >
                  {/* Card Header Row */}
                  <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3.5">
                      <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                        <FileSpreadsheet size={20} />
                      </div>

                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="font-semibold text-slate-900">
                            {mapping.sourceName}
                          </h3>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                            v{mapping.version}
                          </span>
                          <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                            {importType}
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                          <span>
                            Created:{" "}
                            {new Date(mapping.createdAt).toLocaleString()}
                          </span>
                          {mapping.approvedAt && (
                            <span className="text-emerald-700 font-medium">
                              Approved:{" "}
                              {new Date(mapping.approvedAt).toLocaleDateString()}
                            </span>
                          )}
                          <span>
                            {suggestions.length} column{suggestions.length === 1 ? "" : "s"} mapped
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge & Actions */}
                    <div className="flex items-center gap-3 self-end sm:self-center">
                      {mapping.approved ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 size={13} />
                          Approved
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                            <Clock size={13} />
                            Pending Review
                          </span>

                          <button
                            onClick={() => handleApprove(mapping.id)}
                            disabled={approvingId === mapping.id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {approvingId === mapping.id ? (
                              <RefreshCw size={13} className="animate-spin" />
                            ) : (
                              <Check size={13} />
                            )}
                            Approve
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => toggleExpand(mapping.id)}
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                        title={isExpanded ? "Collapse" : "Expand details"}
                      >
                        {isExpanded ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Mapping Table */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/70 p-5">
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                          <Sparkles size={14} className="text-amber-500" />
                          Mapping Specification ({suggestions.length} fields)
                        </h4>
                        <span className="text-xs text-slate-400">
                          Batch ID: {mapping.importBatchId}
                        </span>
                      </div>

                      {suggestions.length === 0 ? (
                        <p className="text-xs text-slate-500">
                          No suggestions registered in this mapping record.
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
                          <table className="w-full text-left text-xs">
                            <thead className="border-b border-slate-100 bg-slate-50 font-semibold text-slate-600">
                              <tr>
                                <th className="px-4 py-2.5">Original File Header</th>
                                <th className="px-4 py-2.5"></th>
                                <th className="px-4 py-2.5">Standard Field</th>
                                <th className="px-4 py-2.5">Confidence</th>
                                <th className="px-4 py-2.5">Reason / Logic</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {suggestions.map((sug, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50">
                                  <td className="px-4 py-2.5 font-medium text-slate-800">
                                    {sug.originalHeader}
                                  </td>
                                  <td className="px-2 py-2.5 text-slate-400">
                                    <ArrowRight size={13} />
                                  </td>
                                  <td className="px-4 py-2.5 font-semibold text-blue-600">
                                    {sug.suggestedField}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span
                                      className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                        sug.confidence >= 0.9
                                          ? "bg-emerald-50 text-emerald-700"
                                          : sug.confidence >= 0.7
                                          ? "bg-amber-50 text-amber-700"
                                          : "bg-slate-100 text-slate-600"
                                      }`}
                                    >
                                      {Math.round((sug.confidence || 0) * 100)}%
                                    </span>
                                  </td>
                                  <td className="max-w-xs truncate px-4 py-2.5 text-slate-500">
                                    {sug.reason || "Matched standard field schema."}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
