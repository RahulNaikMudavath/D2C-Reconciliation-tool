
import { useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpDown,
} from "lucide-react";

import {
  getReconciliationResults,
  runReconciliation,
} from "../../services/reconciliationService";

const statuses = [
  "ALL",
  "SETTLED",
  "SHORT_PAID",
  "UNPAID_PAST_DUE",
  "REVIEW_REQUIRED",
];

const statusStyles = {
  SETTLED: "bg-emerald-50 text-emerald-700",
  SHORT_PAID: "bg-red-50 text-red-700",
  UNPAID_PAST_DUE: "bg-orange-50 text-orange-700",
  REVIEW_REQUIRED: "bg-amber-50 text-amber-700",
};

const formatCurrency = (value) => {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value));
};

export default function Reconciliation() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchResults = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getReconciliationResults();
      setData(result);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load reconciliation results."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const handleRun = async () => {
    setRunning(true);
    setError("");

    try {
      await runReconciliation();
      await fetchResults();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Reconciliation could not be completed."
      );
    } finally {
      setRunning(false);
    }
  };

  const filteredResults = useMemo(() => {
    const results = data?.results || [];

    return results.filter((item) => {
      const matchesSearch = [
        item.orderNumber,
        item.partnerName,
        item.channel,
      ].some((value) =>
        String(value || "").toLowerCase().includes(search.toLowerCase())
      );

      const matchesStatus =
        statusFilter === "ALL" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [data, search, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts = {};

    (data?.results || []).forEach((item) => {
      counts[item.status] = (counts[item.status] || 0) + 1;
    });

    return counts;
  }, [data]);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-600">
            FINANCIAL OPERATIONS
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Reconciliation
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Compare expected settlements with actual partner payments.
          </p>
        </div>

        <button
          onClick={handleRun}
          disabled={running || loading}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={17}
            className={running ? "animate-spin" : ""}
          />
          {running ? "Running..." : "Run Reconciliation"}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
          <button
            onClick={fetchResults}
            className="font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: "Total Orders",
            value: data?.totalOrders ?? 0,
            icon: ArrowUpDown,
          },
          {
            label: "Settled",
            value: statusCounts.SETTLED || 0,
            icon: CheckCircle2,
          },
          {
            label: "Short Paid",
            value: statusCounts.SHORT_PAID || 0,
            icon: AlertTriangle,
          },
          {
            label: "Needs Review",
            value: statusCounts.REVIEW_REQUIRED || 0,
            icon: Clock,
          },
        ].map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{card.label}</p>
                <Icon size={19} className="text-slate-400" />
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900">
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="space-y-4 border-b border-slate-200 p-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Order-level reconciliation
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Latest completed reconciliation results
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search order, partner or channel..."
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status === "ALL"
                    ? "All statuses"
                    : status.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 p-12 text-slate-500">
            <RefreshCw size={19} className="animate-spin" />
            Loading reconciliation results...
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-semibold text-slate-700">
              No reconciliation records found
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Try changing your search or status filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">Order</th>
                  <th className="px-5 py-4">Partner</th>
                  <th className="px-5 py-4">Expected</th>
                  <th className="px-5 py-4">Received</th>
                  <th className="px-5 py-4">Difference</th>
                  <th className="px-5 py-4">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredResults.map((item) => (
                  <tr
                    key={item.orderNumber}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {item.orderNumber}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {item.channel}
                      </p>
                    </td>

                    <td className="px-5 py-4 font-medium text-slate-700">
                      {item.partnerName}
                    </td>

                    <td className="px-5 py-4 text-slate-700">
                      {formatCurrency(item.expectedAmount)}
                    </td>

                    <td className="px-5 py-4 text-slate-700">
                      {formatCurrency(item.actualAmount)}
                    </td>

                    <td
                      className={`px-5 py-4 font-semibold ${
                        Number(item.difference) > 10
                          ? "text-red-600"
                          : Number(item.difference) < -10
                            ? "text-amber-600"
                            : "text-emerald-600"
                      }`}
                    >
                      {formatCurrency(item.difference)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
                          statusStyles[item.status] ||
                          "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {item.status.replaceAll("_", " ")}
                      </span>

                      {item.reviewReason && (
                        <p className="mt-2 max-w-48 text-xs text-slate-500">
                          {item.reviewReason}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
          Showing {filteredResults.length} of {data?.totalOrders || 0} orders
        </div>
      </div>
    </div>
  );
}
