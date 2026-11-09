
import { useEffect, useState } from "react";
import {
  IndianRupee,
  ShoppingCart,
  AlertTriangle,
  FileCheck,
  TrendingDown,
  RefreshCw,
  Truck,
  Wallet,
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
  },
  {
    key: "totalExpected",
    label: "Expected Settlement",
    icon: IndianRupee,
    color: "violet",
    format: formatCurrency,
  },
  {
    key: "totalReceived",
    label: "Amount Received",
    icon: FileCheck,
    color: "emerald",
    format: formatCurrency,
  },
  {
    key: "totalActualFreight",
    label: "Actual Freight Charged",
    icon: Truck,
    color: "blue",
    format: formatCurrency,
  },
  {
    key: "totalExpectedFreight",
    label: "Expected Freight (Matched Rates)",
    icon: Wallet,
    color: "violet",
    format: formatCurrency,
  },
  {
    key: "freightMoneyAtRisk",
    label: "Freight Money at Risk",
    icon: AlertTriangle,
    color: "red",
    format: formatCurrency,
  },
  {
    key: "moneyAtRisk",
    label: "Combined Money at Risk",
    icon: TrendingDown,
    color: "red",
    format: formatCurrency,
  },
];

const colorStyles = {
  blue: "bg-blue-50 text-blue-600",
  violet: "bg-violet-50 text-violet-600",
  emerald: "bg-emerald-50 text-emerald-600",
  red: "bg-red-50 text-red-600",
};

export default function Dashboard() {
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
    <div className="space-y-8">
      {/* Dashboard Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-blue-600">
            FINANCIAL OVERVIEW
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Dashboard
          </h1>
          <p className="mt-2 text-slate-500">
            Monitor settlements, freight discrepancies and financial recovery.
          </p>
        </div>

        <button
          onClick={fetchDashboard}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.key}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-500">
                  {card.label}
                </p>

                <div className={`rounded-xl p-3 ${colorStyles[card.color]}`}>
                  <Icon size={21} />
                </div>
              </div>

              <h2 className="mt-5 text-2xl font-bold text-slate-900">
                {card.format(summary[card.key])}
              </h2>
            </div>
          );
        })}
      </div>

      {/* Operational Summary */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-500">
            Total Matches
          </p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            {summary.totalMatches}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Orders processed in the latest reconciliation run
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-500">
            Open Claims
          </p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            {summary.openClaims}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Claims currently awaiting action across all runs
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-500">
            Open Claim Value
          </p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            {formatCurrency(summary.totalClaimValue)}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Total value of currently open and in-review claims
          </p>
        </div>
      </div>

      {/* Settlement and Freight Status */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900">
            Settlement Reconciliation Status
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Settlement results from the latest reconciliation run
          </p>

          <div className="mt-6 space-y-5">
            {Object.entries(summary.statusBreakdown || {}).map(
              ([status, count]) => {
                const percentage = summary.totalMatches
                  ? (count / summary.totalMatches) * 100
                  : 0;

                return (
                  <div key={status}>
                    <div className="mb-2 flex justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-700">
                        {status.replaceAll("_", " ")}
                      </span>
                      <span className="text-slate-500">
                        {count} orders
                      </span>
                    </div>

                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              }
            )}

            {summary.totalMatches === 0 && (
              <p className="text-sm text-slate-500">
                No reconciliation results available yet.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-5 flex items-center gap-2">
            <Truck className="text-blue-600" size={20} />
            <h2 className="text-lg font-bold text-slate-900">
              Freight Reconciliation Status
            </h2>
          </div>

          <p className="mb-5 text-sm text-slate-500">
            Courier charges evaluated against applicable rate cards
          </p>

          <div className="space-y-5">
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
                    <div className="mb-2 flex justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-700">
                        {status.replaceAll("_", " ")}
                      </span>
                      <span className="text-slate-500">
                        {count} orders
                      </span>
                    </div>

                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${
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
              <p className="text-sm text-slate-500">
                No freight reconciliation results available yet.
              </p>
            )}
          </div>

          <div className="mt-6 rounded-xl bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-800">
              Rate-card review required
            </p>
            <p className="mt-1 text-sm text-amber-700">
              Orders marked REVIEW REQUIRED need an applicable courier rate
              card or manual verification before their freight exposure can
              be determined.
            </p>
          </div>
        </div>
      </div>

      {/* Partner Leakage */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-5 flex items-center gap-2">
          <TrendingDown className="text-red-500" size={20} />
          <h2 className="text-lg font-bold text-slate-900">
            Partner-wise Financial Leakage
          </h2>
        </div>

        {summary.partnerLeakage?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
                  <th className="py-3 pr-4">Partner</th>
                  <th className="py-3 px-4">Settlement Risk</th>
                  <th className="py-3 px-4">Freight Risk</th>
                  <th className="py-3 pl-4 text-right">Total Risk</th>
                </tr>
              </thead>

              <tbody>
                {summary.partnerLeakage.map((partner) => (
                  <tr
                    key={partner.partnerId}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="py-4 pr-4 font-semibold text-slate-800">
                      {partner.partnerName}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {formatCurrency(partner.settlementRisk)}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {formatCurrency(partner.freightRisk)}
                    </td>

                    <td className="py-4 pl-4 text-right font-bold text-red-600">
                      {formatCurrency(partner.amountAtRisk)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            No partner leakage identified.
          </p>
        )}
      </div>
    </div>
  );
}
