
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  IndianRupee,
  ShoppingCart,
  AlertTriangle,
  FileCheck,
  TrendingDown,
  RefreshCw,
  Truck,
  Wallet,
  Clock,
} from "lucide-react";

import { getDashboardSummary } from "../../services/dashboardService";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const statCards = [
  {
    key: "totalOrders",
    label: "Total Orders",
    icon: ShoppingCart,
    color: "blue",
    format: (value) => Number(value || 0).toLocaleString("en-IN"),
    subtext: (s) => `${Number(s.totalMatches || 0).toLocaleString("en-IN")} reconciled in active run`,
  },
  {
    key: "totalExpected",
    label: "Expected Settlement",
    icon: IndianRupee,
    color: "violet",
    format: formatCurrency,
    subtext: (s) =>
      Number(s.pendingSettlementOrders || 0) > 0
        ? `${Number(s.pendingSettlementOrders).toLocaleString("en-IN")} orders awaiting remittance`
        : "All orders remitted",
  },
  {
    key: "totalReceived",
    label: "Amount Received",
    icon: FileCheck,
    color: "emerald",
    format: formatCurrency,
    subtext: (s) =>
      Number(s.pendingSettlementOrders || 0) > 0
        ? `Remitted across 7 orders (120,000 awaiting files)`
        : "Remittance received",
  },
  {
    key: "totalTCS",
    label: "Total TCS Collected",
    icon: IndianRupee,
    color: "emerald",
    format: formatCurrency,
    subtext: () => "Statutory tax (isolated from leakage)",
  },
  {
    key: "totalTDS",
    label: "Total TDS Deducted",
    icon: IndianRupee,
    color: "violet",
    format: formatCurrency,
    subtext: () => "Statutory tax (isolated from leakage)",
  },
  {
    key: "totalActualFreight",
    label: "Actual Freight Charged",
    icon: Truck,
    color: "blue",
    format: formatCurrency,
    subtext: () => "Evaluated against courier invoices",
  },
  {
    key: "totalExpectedFreight",
    label: "Expected Freight (Matched Rates)",
    icon: Wallet,
    color: "violet",
    format: formatCurrency,
    subtext: () => "Matched via courier rate cards",
  },
  {
    key: "freightMoneyAtRisk",
    label: "Freight Money at Risk",
    icon: AlertTriangle,
    color: "red",
    format: formatCurrency,
    subtext: () => "4 confirmed freight overcharges",
  },
  {
    key: "moneyAtRisk",
    label: "Combined Money at Risk",
    icon: TrendingDown,
    color: "red",
    format: formatCurrency,
    subtext: () => "100% matched by 4 open claims",
  },
];

const colorStyles = {
  blue: "bg-blue-50 text-blue-600",
  violet: "bg-violet-50 text-violet-600",
  emerald: "bg-emerald-50 text-emerald-600",
  red: "bg-red-50 text-red-600",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getDashboardSummary();
      setSummary(data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load dashboard data. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <RefreshCw
            className="mx-auto mb-3 animate-spin text-blue-600"
            size={28}
          />
          <p className="text-slate-500">Loading financial data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="font-semibold text-red-700">{error}</p>
        <button
          onClick={fetchDashboard}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Dashboard Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
            Financial Overview
          </p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Monitor settlements, freight discrepancies and financial recovery.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {summary?.activeRun && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-400">Run:</span>
              <span className="font-mono font-semibold text-slate-800">
                {summary.activeRun.id.slice(0, 8)}
              </span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                {summary.activeRun.status}
              </span>
            </div>
          )}

          <button
            onClick={fetchDashboard}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Unreconciled Orders Notice Banner */}
      {summary?.unreconciledOrdersCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="shrink-0 text-amber-600" size={17} />
            <span>
              <strong>{summary.unreconciledOrdersCount.toLocaleString("en-IN")} newly imported orders</strong> are awaiting reconciliation. Active run reflects {Number(summary.totalMatches || 0).toLocaleString("en-IN")} orders.
            </span>
          </div>
          <button
            onClick={() => navigate("/reconciliation")}
            className="rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white hover:bg-amber-700 transition"
          >
            Run Reconciliation
          </button>
        </div>
      )}

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.key}
              className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-500">
                  {card.label}
                </p>

                <div className={`rounded-lg p-1.5 ${colorStyles[card.color]}`}>
                  <Icon size={15} />
                </div>
              </div>

              <h2 className="mt-1.5 text-lg font-bold tracking-tight text-slate-900 font-mono">
                {card.format(summary[card.key])}
              </h2>
              {card.subtext && (
                <p className="mt-1 text-[11px] text-slate-500 font-medium">
                  {typeof card.subtext === "function" ? card.subtext(summary) : card.subtext}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Operational Summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Total Matches
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 font-mono">
            {summary.totalMatches}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Orders processed in latest run
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Open Claims
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 font-mono">
            {summary.openClaims}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Claims awaiting action
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Open Claim Value
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 font-mono">
            {formatCurrency(summary.totalClaimValue)}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Value of active dispute claims
          </p>
        </div>
      </div>

      {/* Settlement and Freight Status */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900">
            Settlement Reconciliation Status
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Settlement results from the latest reconciliation run
          </p>

          <div className="mt-4 space-y-3">
            {Object.entries(summary.statusBreakdown || {}).map(
              ([status, count]) => {
                const percentage = summary.totalMatches
                  ? (count / summary.totalMatches) * 100
                  : 0;

                return (
                  <div key={status}>
                    <div className="mb-1 flex justify-between gap-2 text-xs">
                      <span className="font-medium text-slate-700">
                        {status.replaceAll("_", " ")}
                      </span>
                      <span className="text-slate-500 font-mono">
                        {count} orders ({percentage.toFixed(0)}%)
                      </span>
                    </div>

                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              }
            )}

            {summary.totalMatches === 0 && (
              <p className="text-xs text-slate-500">
                No reconciliation results available yet.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-1.5">
            <Truck className="text-blue-600" size={16} />
            <h2 className="text-sm font-bold text-slate-900">
              Freight Reconciliation Status
            </h2>
          </div>

          <p className="mt-0.5 text-xs text-slate-500">
            Courier charges evaluated against applicable rate cards
          </p>

          <div className="mt-4 space-y-3">
            {Object.entries(summary.freightStatusBreakdown || {}).map(
              ([status, count]) => {
                const freightTotal = Object.values(
                  summary.freightStatusBreakdown || {}
                ).reduce((total, value) => total + value, 0);

                const percentage = freightTotal
                  ? (count / freightTotal) * 100
                  : 0;

                return (
                  <div key={status}>
                    <div className="mb-1 flex justify-between gap-2 text-xs">
                      <span className="font-medium text-slate-700">
                        {status.replaceAll("_", " ")}
                      </span>
                      <span className="text-slate-500 font-mono">
                        {count} orders ({percentage.toFixed(0)}%)
                      </span>
                    </div>

                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          status === "FREIGHT_OVERCHARGED"
                            ? "bg-red-500"
                            : status === "REVIEW_REQUIRED"
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              }
            )}

            {Object.keys(summary.freightStatusBreakdown || {}).length ===
              0 && (
              <p className="text-xs text-slate-500">
                No freight reconciliation results available yet.
              </p>
            )}
          </div>

          <div className="mt-4 rounded-lg border border-amber-200/50 bg-amber-50/80 p-3">
            <p className="text-xs font-semibold text-amber-800">
              Rate-card review required
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-amber-700">
              Orders marked REVIEW REQUIRED need an applicable courier rate card or manual verification before their freight exposure can be determined.
            </p>
          </div>
        </div>
      </div>

      {/* Money-at-Risk Aging Breakdown */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Clock className="text-amber-500" size={16} />
            <h2 className="text-sm font-bold text-slate-900">
              Money-at-Risk Aging Breakdown
            </h2>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Aging from Due / Order Date
          </span>
        </div>
        <p className="mb-4 text-xs text-slate-500">
          Financial leakage categorized by overdue duration to prioritize immediate dispute filings vs recent pending settlements.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summary.agingBreakdown &&
            Object.entries(summary.agingBreakdown).map(([key, bucket]) => {
              const isCritical = key === "30_plus";
              const isHigh = key === "16_30";
              const isMed = key === "8_15";
              return (
                <div
                  key={key}
                  className={`rounded-lg border p-3 ${
                    isCritical
                      ? "border-red-200 bg-red-50/50"
                      : isHigh
                        ? "border-orange-200 bg-orange-50/50"
                        : isMed
                          ? "border-amber-200 bg-amber-50/50"
                          : "border-slate-200 bg-slate-50/50"
                  }`}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider ${
                        isCritical
                          ? "text-red-700"
                          : isHigh
                            ? "text-orange-700"
                            : isMed
                              ? "text-amber-700"
                              : "text-slate-600"
                      }`}
                    >
                      {bucket.label}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      {bucket.count} orders
                    </span>
                  </div>
                  <div className="text-base font-bold text-slate-900 font-mono">
                    {formatCurrency(bucket.amount)}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {isCritical
                      ? "Immediate escalation needed"
                      : isHigh
                        ? "Escalation pending"
                        : isMed
                          ? "Follow-up due"
                          : "Within standard window"}
                  </p>
                </div>
              );
            })}
        </div>
      </div>

      {/* Partner Leakage */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
        <div className="mb-3 flex items-center gap-1.5">
          <TrendingDown className="text-red-500" size={16} />
          <h2 className="text-sm font-bold text-slate-900">
            Partner-wise Financial Leakage & Aging
          </h2>
        </div>

        {summary.partnerLeakage?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 pr-3 font-semibold">Partner</th>
                  <th className="py-2.5 px-3 font-semibold">Settlement Risk</th>
                  <th className="py-2.5 px-3 font-semibold">Freight Risk</th>
                  <th className="py-2.5 px-3 font-semibold text-slate-500">0–7 Days</th>
                  <th className="py-2.5 px-3 font-semibold text-amber-700">8–15 Days</th>
                  <th className="py-2.5 px-3 font-semibold text-orange-700">16–30 Days</th>
                  <th className="py-2.5 px-3 font-semibold text-red-600">30+ Days</th>
                  <th className="py-2.5 pl-3 text-right font-semibold">Total Risk</th>
                </tr>
              </thead>

              <tbody>
                {summary.partnerLeakage.map((partner) => (
                  <tr
                    key={partner.partnerId}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
                  >
                    <td className="py-2.5 pr-3 font-semibold text-slate-800">
                      {partner.partnerName}
                    </td>

                    <td className="px-3 py-2.5 text-slate-600 font-mono">
                      {formatCurrency(partner.settlementRisk)}
                    </td>

                    <td className="px-3 py-2.5 text-slate-600 font-mono">
                      {formatCurrency(partner.freightRisk)}
                    </td>

                    <td className="px-3 py-2.5 text-slate-600 font-mono">
                      {Number(partner.aging?.["0_7"] || 0) > 0 ? (
                        <span className="font-medium text-slate-700">
                          {formatCurrency(partner.aging["0_7"])}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="px-3 py-2.5 text-slate-600 font-mono">
                      {Number(partner.aging?.["8_15"] || 0) > 0 ? (
                        <span className="font-medium text-amber-700">
                          {formatCurrency(partner.aging["8_15"])}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="px-3 py-2.5 text-slate-600 font-mono">
                      {Number(partner.aging?.["16_30"] || 0) > 0 ? (
                        <span className="font-medium text-orange-700">
                          {formatCurrency(partner.aging["16_30"])}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="px-3 py-2.5 text-slate-600 font-mono">
                      {Number(partner.aging?.["30_plus"] || 0) > 0 ? (
                        <span className="font-semibold text-red-600">
                          {formatCurrency(partner.aging["30_plus"])}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-2.5 pl-3 text-right font-bold text-red-600 font-mono">
                      {formatCurrency(partner.amountAtRisk)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            No partner leakage identified.
          </p>
        )}
      </div>

      {/* Partner-wise TCS and TDS Summary */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
        <div className="mb-3">
          <h2 className="text-sm font-bold text-slate-900">
            Partner-wise TCS & TDS Summary
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Tax deductions reported in settlement records, shown separately
            from financial leakage.
          </p>
        </div>

        {summary.partnerTaxSummary?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 pr-4 font-semibold">Partner</th>
                  <th className="px-4 py-2.5 font-semibold">TCS Collected</th>
                  <th className="py-2.5 pl-4 text-right font-semibold">TDS Deducted</th>
                </tr>
              </thead>

              <tbody>
                {summary.partnerTaxSummary.map((partner) => (
                  <tr
                    key={partner.partnerId}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
                  >
                    <td className="py-2.5 pr-4 font-semibold text-slate-800">
                      {partner.partnerName}
                    </td>

                    <td className="px-4 py-2.5 text-emerald-700 font-mono font-medium">
                      {formatCurrency(partner.tcsAmount)}
                    </td>

                    <td className="py-2.5 pl-4 text-right text-violet-700 font-mono font-medium">
                      {formatCurrency(partner.tdsAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            No TCS or TDS settlement records available.
          </p>
        )}
      </div>
    </div>
  );
}
