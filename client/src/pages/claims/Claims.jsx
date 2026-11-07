
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileText,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  IndianRupee,
  Plus,
} from "lucide-react";
import api from "../../services/api";

const STATUS_OPTIONS = ["OPEN", "IN_REVIEW", "RESOLVED"];

const statusStyles = {
  OPEN: "bg-red-50 text-red-700",
  IN_REVIEW: "bg-amber-50 text-amber-700",
  RESOLVED: "bg-green-50 text-green-700",
};

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const getClaimAge = (createdAt) => {
  const createdDate = new Date(createdAt);
  const today = new Date();

  const difference = today.getTime() - createdDate.getTime();

  return Math.max(0, Math.floor(difference / (1000 * 60 * 60 * 24)));
};

const getClaimPriority = (age, status) => {
  if (status === "RESOLVED") {
    return {
      label: "Resolved",
      styles: "bg-green-50 text-green-700",
    };
  }

  if (age > 7) {
    return {
      label: "Critical",
      styles: "bg-red-100 text-red-700",
    };
  }

  if (age >= 4) {
    return {
      label: "Attention",
      styles: "bg-amber-100 text-amber-700",
    };
  }

  return {
    label: "Normal",
    styles: "bg-blue-50 text-blue-700",
  };
};

export default function Claims() {
  const [claims, setClaims] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [financeTeam, setFinanceTeam] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState("");

  const fetchClaims = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/claims");
      const loadedClaims = response.data.data || [];
      setClaims(loadedClaims);
      return loadedClaims;
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load claims."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFinanceTeam = useCallback(async () => {
    try {
      const response = await api.get("/claims/finance-team");
      setFinanceTeam(response.data.data || []);
    } catch (err) {
      console.error("Unable to load finance team:", err);
    }
  }, []);

  useEffect(() => {
    fetchClaims();
    fetchFinanceTeam();
  }, [fetchClaims, fetchFinanceTeam]);

  const generateClaims = async () => {
    try {
      setGenerating(true);
      setError("");
      setMessage("");

      const response = await api.post("/claims/generate");

      const created = response.data.data?.totalCreated ?? 0;

      setMessage(
        created > 0
          ? `${created} new claim(s) generated successfully.`
          : "No new claims found. Existing claims were not duplicated."
      );

      await fetchClaims();
    } catch (err) {
      setError(
        err.response?.data?.message || "Claim generation failed."
      );
    } finally {
      setGenerating(false);
    }
  };

  const updateStatus = async (claimId, status) => {
    try {
      setUpdatingId(claimId);
      setError("");
      setMessage("");

      await api.patch(`/claims/${claimId}/status`, { status });

      setMessage("Claim status updated successfully.");
      await fetchClaims();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to update claim status."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const assignClaim = async () => {
    if (!selectedClaim || !selectedOwnerId) {
      setError("Please select a Finance Executive.");
      return;
    }

    try {
      setAssigning(true);
      setError("");
      setMessage("");

      await api.patch(`/claims/${selectedClaim.id}/assign`, {
        ownerId: selectedOwnerId,
      });

      const updatedClaims = await fetchClaims();

      const updatedClaim = updatedClaims.find(
        (claim) => claim.id === selectedClaim.id
      );

      if (updatedClaim) {
        setSelectedClaim(updatedClaim);
      }

      setMessage("Claim assigned successfully.");
      setSelectedClaim(null);
      setSelectedOwnerId("");
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to assign claim."
      );
    } finally {
      setAssigning(false);
    }
  };

  const filteredClaims = useMemo(() => {
    if (filter === "ALL") return claims;
    return claims.filter((claim) => claim.status === filter);
  }, [claims, filter]);

  const openClaims = claims.filter(
    (claim) => claim.status === "OPEN" || claim.status === "IN_REVIEW"
  );

  const totalValue = openClaims.reduce(
    (total, claim) => total + Number(claim.amount || 0),
    0
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Dispute Management
          </p>
          <h1 className="mt-1 text-3xl font-extrabold text-slate-900">
            Claims & Disputes
          </h1>
          <p className="mt-1 text-slate-500">
            Track and resolve marketplace underpayments and settlement disputes.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={fetchClaims}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            onClick={generateClaims}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus size={17} />
            {generating ? "Generating..." : "Generate Claims"}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {message && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 size={18} />
          {message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Claims"
          value={claims.length}
          icon={<FileText size={21} />}
        />
        <StatCard
          title="Open Claims"
          value={openClaims.length}
          icon={<Clock size={21} />}
        />
        <StatCard
          title="Open Claim Value"
          value={formatMoney(totalValue)}
          icon={<IndianRupee size={21} />}
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Claims Register
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Review claims generated from reconciliation discrepancies.
            </p>
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="ALL">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="mx-auto mb-3 animate-spin" size={25} />
            Loading claims...
          </div>
        ) : filteredClaims.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto mb-3 text-slate-300" size={36} />
            <h3 className="font-semibold text-slate-800">
              No claims found
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Generate claims from your latest reconciliation run.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4">Claim</th>
                  <th className="px-5 py-4">Order</th>
                  <th className="px-5 py-4">Partner</th>
                  <th className="px-5 py-4">Amount</th>
                  <th className="px-5 py-4">Owner</th>
                  <th className="px-5 py-4">Age</th>
                  <th className="px-5 py-4">Priority</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Update</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredClaims.map((claim) => {
                  const orderNumber =
                    claim.match?.order?.orderNumber ||
                    claim.evidence?.orderNumber ||
                    "—";

                  return (
                    <tr key={claim.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <button
  type="button"
  onClick={() => setSelectedClaim(claim)}
  className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
>
  {claim.claimNumber}
</button>
                        <p className="mt-1 text-xs text-slate-500">
                          {claim.description}
                        </p>
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-700">
                        {orderNumber}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {claim.partner?.name || "—"}
                      </td>

                      <td className="px-5 py-4 font-bold text-slate-900">
                        {formatMoney(claim.amount)}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {claim.owner?.name || "Unassigned"}
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-semibold text-slate-700">
                          {getClaimAge(claim.createdAt)} days
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {(() => {
                          const age = getClaimAge(claim.createdAt);
                          const priority = getClaimPriority(age, claim.status);

                          return (
                            <span
                              className={`rounded-full px-3 py-1.5 text-xs font-bold ${priority.styles}`}
                            >
                              {priority.label}
                            </span>
                          );
                        })()}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                            statusStyles[claim.status] ||
                            "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {claim.status?.replace("_", " ")}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <select
                          value={claim.status}
                          disabled={updatingId === claim.id}
                          onChange={(e) =>
                            updateStatus(claim.id, e.target.value)
                          }
                          className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs outline-none focus:border-blue-500 disabled:opacity-50"
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
          Showing {filteredClaims.length} of {claims.length} claims
        </div>
            </section>

      {/* Claim Details Modal */}
      {selectedClaim && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onClick={() => setSelectedClaim(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Claim Details
                </p>
                <h2 className="mt-1 text-xl font-extrabold text-slate-900">
                  {selectedClaim.claimNumber}
                </h2>
              </div>

              <button
                onClick={() => setSelectedClaim(null)}
                className="rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <DetailItem
                label="Order Number"
                value={
                  selectedClaim.match?.order?.orderNumber ||
                  selectedClaim.evidence?.orderNumber ||
                  "—"
                }
              />
              <DetailItem
                label="Partner"
                value={selectedClaim.partner?.name || "—"}
              />
              <DetailItem
                label="Claim Amount"
                value={formatMoney(selectedClaim.amount)}
              />
              <DetailItem
                label="Status"
                value={selectedClaim.status?.replace("_", " ")}
              />
              <DetailItem
                label="Assigned Owner"
                value={selectedClaim.owner?.name || "Unassigned"}
              />
              <div className="sm:col-span-2">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Assign to Finance Executive
                </label>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <select
                    value={selectedOwnerId}
                    onChange={(e) => setSelectedOwnerId(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="">Select Finance Executive</option>

                    {financeTeam.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={assignClaim}
                    disabled={assigning || !selectedOwnerId}
                    className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {assigning ? "Assigning..." : "Assign Claim"}
                  </button>
                </div>
              </div>
              <DetailItem
                label="Created"
                value={new Date(selectedClaim.createdAt).toLocaleString("en-IN")}
              />
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 p-4">
              <h3 className="font-bold text-slate-900">
                Reconciliation Evidence
              </h3>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <DetailItem
                  label="Expected Amount"
                  value={
                    selectedClaim.evidence?.expectedAmount != null
                      ? formatMoney(selectedClaim.evidence.expectedAmount)
                      : "Not available"
                  }
                />
                <DetailItem
                  label="Actual Received"
                  value={
                    selectedClaim.evidence?.actualAmount != null
                      ? formatMoney(selectedClaim.evidence.actualAmount)
                      : "Not available"
                  }
                />
                <DetailItem
                  label="Difference"
                  value={
                    selectedClaim.evidence?.difference != null
                      ? formatMoney(selectedClaim.evidence.difference)
                      : formatMoney(selectedClaim.amount)
                  }
                />
                <DetailItem
                  label="Reconciliation Status"
                  value={
                    selectedClaim.evidence?.status?.replaceAll("_", " ") ||
                    "—"
                  }
                />
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Description
              </p>
              <p className="mt-2 text-sm text-slate-700">
                {selectedClaim.description || "No description available."}
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedClaim(null)}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
          {icon}
        </div>
      </div>
      <p className="mt-4 text-2xl font-extrabold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}