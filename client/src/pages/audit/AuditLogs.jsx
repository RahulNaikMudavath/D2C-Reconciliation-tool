import { useEffect, useState } from "react";
import {
  ClipboardList,
  RefreshCw,
  AlertCircle,
  Search,
} from "lucide-react";
import { getAuditLogs } from "../../services/auditService";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getAuditLogs();
      setLogs(response.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load audit logs."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const searchText = search.toLowerCase();

    return (
      log.action?.toLowerCase().includes(searchText) ||
      log.entity?.toLowerCase().includes(searchText) ||
      log.user?.name?.toLowerCase().includes(searchText) ||
      log.user?.email?.toLowerCase().includes(searchText)
    );
  });

  const formatDate = (date) =>
    new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const getActionStyle = (action) => {
    if (action?.includes("APPROVED")) {
      return "bg-green-100 text-green-700";
    }
    if (action?.includes("REJECTED")) {
      return "bg-red-100 text-red-700";
    }
    if (action?.includes("ASSIGNED")) {
      return "bg-blue-100 text-blue-700";
    }
    if (action?.includes("STATUS")) {
      return "bg-purple-100 text-purple-700";
    }
    return "bg-gray-100 text-gray-700";
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-indigo-600">
            Security & Compliance
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            Audit Logs
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Track user actions and important system activities.
          </p>
        </div>

        <button
          onClick={loadLogs}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Total Activities</p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            {logs.length}
          </h2>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Mapping Activities</p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            {logs.filter((log) =>
              log.entity?.toLowerCase().includes("mapping")
            ).length}
          </h2>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Claim Activities</p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            {logs.filter((log) =>
              log.entity?.toLowerCase().includes("claim")
            ).length}
          </h2>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">
              Activity Trail
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Latest {logs.length} recorded activities
            </p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search activity, user..."
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500">
            Loading audit activities...
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 p-8 text-sm text-red-600">
            <AlertCircle size={18} />
            {error}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="mx-auto mb-3 text-gray-400" size={36} />
            <p className="font-medium text-gray-700">
              No audit activities found
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Activities will appear here when users perform system actions.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3">Activity</th>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Entity</th>
                  <th className="px-5 py-3">Details</th>
                  <th className="px-5 py-3">Date & Time</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getActionStyle(log.action)}`}
                      >
                        {log.action?.replaceAll("_", " ")}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-800">
                        {log.user?.name || "Unknown user"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {log.user?.role?.replaceAll("_", " ")}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-800">
                        {log.entity}
                      </p>
                      <p className="max-w-36 truncate text-xs text-gray-500">
                        {log.entityId}
                      </p>
                    </td>

                    <td className="max-w-xs px-5 py-4 text-xs text-gray-600">
                      <pre className="whitespace-pre-wrap break-words font-sans">
                        {log.details
                          ? JSON.stringify(log.details, null, 2)
                          : "—"}
                      </pre>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-xs text-gray-500">
                      {formatDate(log.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
