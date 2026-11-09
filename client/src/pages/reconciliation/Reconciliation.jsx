import React, { useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  Truck,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  FileText,
  Package,
} from "lucide-react";

import {
  getReconciliationResults,
  runReconciliation,
} from "../../services/reconciliationService";

const filterOptions = [
  { id: "ALL", label: "All Match Statuses" },
  { id: "SETTLED", label: "Settled Payouts" },
  { id: "SHORT_PAID", label: "Short / Unpaid" },
  { id: "FREIGHT_OVERCHARGED", label: "Freight Overcharged" },
  { id: "RETURN_NOT_RECEIVED", label: "Return Not Received" },
  { id: "REVIEW_REQUIRED", label: "Needs Review" },
];

const auditTabs = [
  { id: "ALL", label: "3-Way Audit (All)" },
  { id: "SETTLEMENT", label: "Settlement Audit" },
  { id: "FREIGHT", label: "Freight Audit" },
  { id: "RETURNS", label: "Returns Tracker" },
];

const statusStyles = {
  SETTLED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  SHORT_PAID: "bg-rose-50 text-rose-700 border border-rose-200",
  UNPAID_PAST_DUE: "bg-amber-50 text-amber-700 border border-amber-200",
  FREIGHT_OVERCHARGED: "bg-purple-50 text-purple-700 border border-purple-200",
  RETURN_NOT_RECEIVED: "bg-red-100 text-red-800 border border-red-300 font-semibold",
  REVIEW_REQUIRED: "bg-yellow-50 text-yellow-800 border border-yellow-200",
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") return "—";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value));
};

const formatDate = (dateString) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

export default function Reconciliation() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState("ALL");
  const [expandedRows, setExpandedRows] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const toggleRow = (orderNumber) => {
    setExpandedRows((prev) => ({
      ...prev,
      [orderNumber]: !prev[orderNumber],
    }));
  };

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

  // Status Counts for KPI cards
  const statusCounts = useMemo(() => {
    const counts = {
      TOTAL: (data?.results || []).length,
      SETTLED: 0,
      SHORT_PAID: 0,
      UNPAID_PAST_DUE: 0,
      FREIGHT_OVERCHARGED: 0,
      RETURN_NOT_RECEIVED: 0,
      REVIEW_REQUIRED: 0,
    };

    (data?.results || []).forEach((item) => {
      // Settlement counts
      if (item.status === "SETTLED") counts.SETTLED++;
      if (item.status === "SHORT_PAID") counts.SHORT_PAID++;
      if (item.status === "UNPAID_PAST_DUE") counts.UNPAID_PAST_DUE++;
      if (
        item.status === "REVIEW_REQUIRED" ||
        item.freightStatus === "REVIEW_REQUIRED" ||
        item.returnStatus === "REVIEW_REQUIRED"
      ) {
        counts.REVIEW_REQUIRED++;
      }

      // Freight counts
      if (item.freightStatus === "FREIGHT_OVERCHARGED") {
        counts.FREIGHT_OVERCHARGED++;
      }

      // Return counts
      if (item.returnStatus === "RETURN_NOT_RECEIVED") {
        counts.RETURN_NOT_RECEIVED++;
      }
    });

    return counts;
  }, [data]);

  // Filtering across search, tab scope, and status
  const filteredResults = useMemo(() => {
    const results = data?.results || [];

    return results.filter((item) => {
      // 1. Text Search
      const matchesSearch = [
        item.orderNumber,
        item.partnerName,
        item.channel,
      ].some((value) =>
        String(value || "").toLowerCase().includes(search.toLowerCase())
      );

      // 2. Tab Scope Filter
      let matchesTab = true;
      if (activeTab === "SETTLEMENT") {
        matchesTab = ["SHORT_PAID", "UNPAID_PAST_DUE", "SETTLED", "REVIEW_REQUIRED"].includes(
          item.status
        );
      } else if (activeTab === "FREIGHT") {
        matchesTab = Boolean(item.freightStatus);
      } else if (activeTab === "RETURNS") {
        matchesTab = Boolean(item.returnStatus);
      }

      // 3. Status Filter
      let matchesStatus = true;
      if (statusFilter !== "ALL") {
        if (statusFilter === "SETTLED") {
          // If viewing returns tab, filter by settled returns
          if (activeTab === "RETURNS") {
            matchesStatus = item.returnStatus === "SETTLED";
          } else if (activeTab === "FREIGHT") {
            matchesStatus = item.freightStatus === "SETTLED";
          } else {
            // In 3-Way Audit or Settlement: ONLY match settled settlement payouts!
            // Never show orders where settlement is REVIEW_REQUIRED or SHORT_PAID!
            matchesStatus = item.status === "SETTLED";
          }
        } else if (statusFilter === "SHORT_PAID") {
          matchesStatus =
            item.status === "SHORT_PAID" || item.status === "UNPAID_PAST_DUE";
        } else if (statusFilter === "UNPAID_PAST_DUE") {
          matchesStatus = item.status === "UNPAID_PAST_DUE";
        } else if (statusFilter === "FREIGHT_OVERCHARGED") {
          matchesStatus = item.freightStatus === "FREIGHT_OVERCHARGED";
        } else if (statusFilter === "RETURN_NOT_RECEIVED") {
          matchesStatus = item.returnStatus === "RETURN_NOT_RECEIVED";
        } else if (statusFilter === "REVIEW_REQUIRED") {
          if (activeTab === "RETURNS") {
            matchesStatus = item.returnStatus === "REVIEW_REQUIRED";
          } else if (activeTab === "FREIGHT") {
            matchesStatus = item.freightStatus === "REVIEW_REQUIRED";
          } else if (activeTab === "SETTLEMENT") {
            matchesStatus = item.status === "REVIEW_REQUIRED";
          } else {
            matchesStatus =
              item.status === "REVIEW_REQUIRED" ||
              item.freightStatus === "REVIEW_REQUIRED" ||
              item.returnStatus === "REVIEW_REQUIRED";
          }
        }
      }

      return matchesSearch && matchesTab && matchesStatus;
    });
  }, [data, search, activeTab, statusFilter]);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, activeTab, pageSize]);

  const totalFiltered = filteredResults.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredResults.slice(startIndex, startIndex + pageSize);
  }, [filteredResults, currentPage, pageSize]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
            Financial Operations & Matching
          </p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
            Order-Level Reconciliation
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            3-way matching across channel payouts, courier freight rate cards, and warehouse return receipts.
          </p>
        </div>

        <button
          onClick={handleRun}
          disabled={running || loading}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={14}
            className={running ? "animate-spin" : ""}
          />
          {running ? "Running Matching Engine..." : "Run Reconciliation"}
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700"
        >
          <span>{error}</span>
          <button
            onClick={fetchResults}
            className="font-semibold underline hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* 5 Core Status KPI Metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          {
            id: "ALL",
            label: "Total Orders",
            value: data?.totalOrders ?? 0,
            icon: ArrowUpDown,
            border: "border-slate-200/80",
            textColor: "text-slate-900",
            iconColor: "text-slate-400",
          },
          {
            id: "SETTLED",
            label: "Settled Payouts",
            value: statusCounts.SETTLED,
            icon: CheckCircle2,
            border: "border-emerald-200/80",
            textColor: "text-emerald-700",
            iconColor: "text-emerald-500",
          },
          {
            id: "SHORT_PAID",
            label: "Short / Unpaid",
            value: (statusCounts.SHORT_PAID || 0) + (statusCounts.UNPAID_PAST_DUE || 0),
            icon: AlertTriangle,
            border: "border-rose-200/80",
            textColor: "text-rose-700",
            iconColor: "text-rose-500",
          },
          {
            id: "FREIGHT_OVERCHARGED",
            label: "Freight Overcharged",
            value: statusCounts.FREIGHT_OVERCHARGED,
            icon: Truck,
            border: "border-purple-200/80",
            textColor: "text-purple-700",
            iconColor: "text-purple-500",
          },
          {
            id: "RETURN_NOT_RECEIVED",
            label: "Return Not Received",
            value: statusCounts.RETURN_NOT_RECEIVED,
            icon: RotateCcw,
            border: "border-red-200/80",
            textColor: "text-red-700",
            iconColor: "text-red-500",
          },
        ].map((card) => {
          const Icon = card.icon;
          const isSelected = statusFilter === card.id;

          return (
            <button
              key={card.label}
              onClick={() => setStatusFilter(card.id)}
              className={`rounded-xl border ${card.border} bg-white p-3.5 shadow-2xs text-left transition hover:shadow-xs cursor-pointer ${
                isSelected ? "ring-2 ring-blue-500 ring-offset-1" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {card.label}
                </p>
                <Icon size={15} className={card.iconColor} />
              </div>
              <p className={`mt-1.5 text-xl font-bold font-mono ${card.textColor}`}>
                {card.value}
              </p>
            </button>
          );
        })}
      </div>

      {/* Main Reconciliation Table Container */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
        {/* Scope Tabs & Search Controls */}
        <div className="border-b border-slate-200/80 p-3.5">
          {/* Audit Scope Tabs */}
          <div className="mb-3 flex flex-wrap gap-1.5 border-b border-slate-100 pb-3">
            {auditTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2.5 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search order number, channel or partner..."
                className="w-full rounded-lg border border-slate-200/80 py-1.5 pl-9 pr-3 text-xs outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 shadow-2xs"
            >
              {filterOptions.map((opt) => {
                const count =
                  opt.id === "ALL"
                    ? statusCounts.TOTAL
                    : opt.id === "SHORT_PAID"
                      ? (statusCounts.SHORT_PAID || 0) + (statusCounts.UNPAID_PAST_DUE || 0)
                      : statusCounts[opt.id] ?? 0;

                return (
                  <option key={opt.id} value={opt.id}>
                    {opt.label} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="flex items-center justify-center gap-3 p-16 text-slate-500">
            <RefreshCw size={20} className="animate-spin text-blue-600" />
            <span className="text-sm font-medium">Loading reconciliation audit records...</span>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="p-16 text-center">
            <Package size={40} className="mx-auto text-slate-300" />
            <p className="mt-3 text-base font-semibold text-slate-700">
              No matching orders found
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Try adjusting your search criteria, scope tab, or status filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-xs">
              <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2.5">Order & Channel</th>
                  <th className="px-3.5 py-2.5">Partner</th>
                  <th className="px-3.5 py-2.5">Settlement (Exp / Rec)</th>
                  <th className="px-3.5 py-2.5">Settlement Diff</th>
                  <th className="px-3.5 py-2.5">Settlement Status</th>
                  <th className="px-3.5 py-2.5">Freight Audit</th>
                  <th className="px-3.5 py-2.5">Returns Tracker</th>
                  <th className="px-3.5 py-2.5 text-right">Drilldown</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {paginatedResults.map((item) => {
                  const isExpanded = Boolean(expandedRows[item.orderNumber]);
                  const diffNumber = Number(item.difference || 0);
                  const freightDiffNumber = Number(item.freightDifference || 0);

                  return (
                    <React.Fragment key={item.orderNumber}>
                      <tr className={`transition hover:bg-slate-50/80 ${isExpanded ? "bg-blue-50/20" : ""}`}>
                        {/* Order & Channel */}
                        <td className="px-3.5 py-2.5">
                          <p className="font-semibold text-slate-900">
                            {item.orderNumber}
                          </p>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                            <span className="font-medium text-slate-600">{item.channel}</span>
                            <span>•</span>
                            <span>{formatDate(item.orderDate)}</span>
                          </div>
                        </td>

                        {/* Partner */}
                        <td className="px-4 py-3.5 font-medium text-slate-700">
                          {item.partnerName}
                          {item.orderValue && (
                            <p className="text-xs text-slate-400">
                              Val: {formatCurrency(item.orderValue)}
                            </p>
                          )}
                        </td>

                        {/* Settlement Expected / Actual */}
                        <td className="px-4 py-3.5 text-slate-700">
                          <p className="font-medium text-slate-900">
                            {formatCurrency(item.actualAmount)}
                          </p>
                          <p className="text-xs text-slate-400">
                            Exp: {formatCurrency(item.expectedAmount)}
                          </p>
                        </td>

                        {/* Settlement Difference */}
                        <td className="px-4 py-3.5">
                          <span
                            className={`font-bold ${
                              diffNumber > 10
                                ? "text-rose-600"
                                : diffNumber < -10
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                            }`}
                          >
                            {diffNumber > 0 ? "+" : ""}
                            {formatCurrency(item.difference)}
                          </span>
                        </td>

                        {/* Settlement Status */}
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold ${
                              statusStyles[item.status] || "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {item.status?.replaceAll("_", " ") ?? "PENDING"}
                          </span>
                        </td>

                        {/* Freight Status & Difference */}
                        <td className="px-4 py-3.5">
                          {item.freightStatus ? (
                            <div>
                              <span
                                className={`inline-flex whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold ${
                                  statusStyles[item.freightStatus] || "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {item.freightStatus.replaceAll("_", " ")}
                              </span>
                              {freightDiffNumber > 10 && (
                                <p className="mt-0.5 text-xs font-semibold text-rose-600">
                                  +₹{freightDiffNumber.toFixed(2)} overcharged
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>

                        {/* Return Status */}
                        <td className="px-4 py-3.5">
                          {item.returnStatus ? (
                            <span
                              className={`inline-flex whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold ${
                                statusStyles[item.returnStatus] || "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {item.returnStatus.replaceAll("_", " ")}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>

                        {/* Drilldown Toggle */}
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => toggleRow(item.orderNumber)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-blue-600"
                          >
                            <span>{isExpanded ? "Close" : "Inspect"}</span>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Drilldown Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={8} className="p-4 sm:p-6 border-b border-slate-200">
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                              {/* 1. Settlement Breakdown */}
                              <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Settlement Audit
                                  </h4>
                                  <span
                                    className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                                      statusStyles[item.status] || "bg-slate-100 text-slate-700"
                                    }`}
                                  >
                                    {item.status}
                                  </span>
                                </div>
                                <div className="mt-3 space-y-2 text-xs">
                                  <div className="flex justify-between text-slate-600">
                                    <span>Order Value:</span>
                                    <span className="font-semibold text-slate-900">{formatCurrency(item.orderValue)}</span>
                                  </div>
                                  <div className="flex justify-between text-slate-600">
                                    <span>Expected Payout:</span>
                                    <span className="font-semibold text-slate-900">{formatCurrency(item.expectedAmount)}</span>
                                  </div>
                                  <div className="flex justify-between text-slate-600">
                                    <span>Actual Received:</span>
                                    <span className="font-semibold text-slate-900">{formatCurrency(item.actualAmount)}</span>
                                  </div>
                                  <div className="flex justify-between border-t border-slate-100 pt-2 font-bold">
                                    <span className="text-slate-700">Settlement Variance:</span>
                                    <span className={diffNumber > 10 ? "text-rose-600" : "text-emerald-600"}>
                                      {formatCurrency(item.difference)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* 2. Courier Freight Breakdown */}
                              <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Courier Freight Audit
                                  </h4>
                                  <span
                                    className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                                      item.freightStatus
                                        ? statusStyles[item.freightStatus] || "bg-slate-100 text-slate-700"
                                        : "bg-slate-100 text-slate-500"
                                    }`}
                                  >
                                    {item.freightStatus ?? "NO CHARGES"}
                                  </span>
                                </div>
                                <div className="mt-3 space-y-2 text-xs">
                                  <div className="flex justify-between text-slate-600">
                                    <span>Billed Weight:</span>
                                    <span className="font-semibold text-slate-900">
                                      {item.weightKg ? `${item.weightKg} kg` : "—"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-slate-600">
                                    <span>Expected Rate Card:</span>
                                    <span className="font-semibold text-slate-900">{formatCurrency(item.expectedFreightAmount)}</span>
                                  </div>
                                  <div className="flex justify-between text-slate-600">
                                    <span>Courier Invoiced:</span>
                                    <span className="font-semibold text-slate-900">{formatCurrency(item.actualFreightAmount)}</span>
                                  </div>
                                  <div className="flex justify-between border-t border-slate-100 pt-2 font-bold">
                                    <span className="text-slate-700">Overcharge Variance:</span>
                                    <span className={freightDiffNumber > 10 ? "text-purple-700" : "text-slate-700"}>
                                      {formatCurrency(item.freightDifference)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* 3. Returns & Receipt Status */}
                              <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Returns & Receipts
                                  </h4>
                                  <span
                                    className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                                      item.returnStatus
                                        ? statusStyles[item.returnStatus] || "bg-slate-100 text-slate-700"
                                        : "bg-slate-100 text-slate-500"
                                    }`}
                                  >
                                    {item.returnStatus ?? "NO RETURN"}
                                  </span>
                                </div>
                                <div className="mt-3 space-y-2 text-xs">
                                  <div className="flex justify-between text-slate-600">
                                    <span>Return Record:</span>
                                    <span className="font-semibold text-slate-900">
                                      {item.returnRecordId ? item.returnRecordId.slice(0, 13) + "..." : "None"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-slate-600">
                                    <span>Warehouse Scan:</span>
                                    <span className={`font-semibold ${item.returnStatus === "SETTLED" ? "text-emerald-700" : "text-amber-700"}`}>
                                      {item.returnStatus === "SETTLED" ? "Verified" : item.returnStatus ? "Pending / Missing" : "N/A"}
                                    </span>
                                  </div>
                                  {item.reviewReason && (
                                    <div className="border-t border-slate-100 pt-2 text-[11px] text-slate-600 italic">
                                      <span className="font-bold text-slate-700 not-italic">Audit Note: </span>
                                      {item.reviewReason}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Pagination & Counts */}
        <div className="border-t border-slate-200 px-5 py-3.5 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Showing{" "}
              <strong className="text-slate-800">
                {totalFiltered === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </strong>{" "}
              to{" "}
              <strong className="text-slate-800">
                {Math.min(currentPage * pageSize, totalFiltered)}
              </strong>{" "}
              of <strong className="text-slate-800">{totalFiltered}</strong> orders
              {totalFiltered < (data?.totalOrders || 0) && (
                <span className="text-slate-400"> (filtered from {data?.totalOrders})</span>
              )}
            </span>

            <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="mr-2">
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
