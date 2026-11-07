
import { useEffect, useState } from "react";
import {
  IndianRupee,
  ShoppingCart,
  AlertTriangle,
  FileCheck,
  TrendingDown,
  RefreshCw,
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
    key: "moneyAtRisk",
    label: "Money at Risk",
    icon: AlertTriangle,
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
          <RefreshCw className="mx-auto mb-3 animate-spin text-blue-600" size={28} />
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-blue-600">
            FINANCIAL OVERVIEW
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Dashboard
          </h1>
          <p className="mt-2 text-slate-500">
            Monitor settlements, discrepancies and financial recovery.
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

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.key}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-500">Total Matches</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            {summary.totalMatches}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Orders processed in the latest reconciliation run
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-500">Open Claims</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            {summary.openClaims}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Claims awaiting action in the latest reconciliation run
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-500">Open Claim Value</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            {formatCurrency(summary.totalClaimValue)}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Value of currently eligible open claims
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900">
            Reconciliation Status
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Breakdown of the latest reconciliation run
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
            <TrendingDown className="text-red-500" size={20} />
            <h2 className="text-lg font-bold text-slate-900">
              Partner Leakage
            </h2>
          </div>

          {summary.partnerLeakage?.length > 0 ? (
            <div className="space-y-4">
              {summary.partnerLeakage.map((partner) => (
                <div
                  key={partner.partnerId}
                  className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4 last:border-0"
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      {partner.partnerName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Outstanding discrepancy
                    </p>
                  </div>

                  <p className="font-bold text-red-600">
                    {formatCurrency(partner.amountAtRisk)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              No partner leakage identified.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
