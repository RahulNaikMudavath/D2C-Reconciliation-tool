import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Play,
  RefreshCw,
  History,
  ArrowRight,
  Download,
} from "lucide-react";

import {
  uploadImportFile,
  getImportHistory,
  processSettlementImport,
} from "../../services/importService";

const importTypes = [
  { value: "SETTLEMENTS", label: "Marketplace Settlements (Amazon, Flipkart)" },
  { value: "ORDERS", label: "Order Records (Shopify, ERP)" },
  { value: "COD", label: "COD Payments & Remittances" },
  { value: "FREIGHT", label: "Freight & Shipping Invoices" },
  { value: "RETURNS", label: "Customer Returns & RTO" },
  { value: "WAREHOUSE_RECEIPTS", label: "Warehouse Inward Receipts" },
];

const categoryBadgeStyles = {
  SETTLEMENTS: "bg-blue-50 text-blue-700 border-blue-200",
  ORDERS: "bg-purple-50 text-purple-700 border-purple-200",
  COD: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FREIGHT: "bg-amber-50 text-amber-700 border-amber-200",
  RETURNS: "bg-rose-50 text-rose-700 border-rose-200",
  WAREHOUSE_RECEIPTS: "bg-slate-50 text-slate-700 border-slate-200",
};

export default function Imports() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Upload states
  const [file, setFile] = useState(null);
  const [importType, setImportType] = useState("SETTLEMENTS");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  // Settlement processing states
  const [processingBatchId, setProcessingBatchId] = useState(null);
  const [processResult, setProcessResult] = useState(null);
  const [processError, setProcessError] = useState("");

  // History states
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState("");

  const fetchHistory = async () => {
    setLoadingHistory(true);
    setHistoryError("");

    try {
      const data = await getImportHistory();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      setHistoryError(
        err.response?.data?.message || "Failed to load import history."
      );
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const selectFile = (selectedFile) => {
    setError("");
    setResult(null);
    setProcessResult(null);
    setProcessError("");

    if (!selectedFile) return;

    const extension = selectedFile.name.split(".").pop().toLowerCase();

    if (!["csv", "xlsx"].includes(extension)) {
      setError("Only CSV and XLSX files are supported.");
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      setError("File size must not exceed 50 MB.");
      return;
    }

    const lowerName = selectedFile.name.toLowerCase();
    if (lowerName.includes("order")) {
      setImportType("ORDERS");
    } else if (lowerName.includes("settle") || lowerName.includes("payout")) {
      setImportType("SETTLEMENTS");
    } else if (lowerName.includes("freight") || lowerName.includes("courier") || lowerName.includes("shipping")) {
      setImportType("FREIGHT");
    } else if (lowerName.includes("return") || lowerName.includes("rto")) {
      setImportType("RETURNS");
    } else if (lowerName.includes("cod")) {
      setImportType("COD");
    } else if (lowerName.includes("warehouse") || lowerName.includes("inward") || lowerName.includes("receipt")) {
      setImportType("WAREHOUSE_RECEIPTS");
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file before uploading.");
      return;
    }

    setUploading(true);
    setError("");
    setResult(null);
    setProcessResult(null);
    setProcessError("");

    try {
      const data = await uploadImportFile(file, importType);
      setResult(data);
      setFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Automatically refresh history to include the new batch
      await fetchHistory();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "File upload failed. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleProcessSettlements = async (batchId) => {
    if (!batchId) return;

    setProcessingBatchId(batchId);
    setProcessError("");
    setProcessResult(null);

    try {
      const data = await processSettlementImport(batchId);
      setProcessResult({ batchId, ...data });
      // Refresh history so settlement count and badges update
      await fetchHistory();
    } catch (err) {
      setProcessError(
        err.response?.data?.message ||
        "Settlement processing failed. Please check the logs."
      );
    } finally {
      setProcessingBatchId(null);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Page Header */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
          Data Pipeline
        </p>
        <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
          Import Files
        </h1>
        <p className="mt-0.5 text-xs text-slate-500">
          Upload partner statements and financial records for batch processing and automated reconciliation.
        </p>
      </div>

      {/* Upload Card */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs">
        <h2 className="text-sm font-bold text-slate-900">
          Upload Financial Data
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Select the import category and upload your CSV or Excel file.
        </p>

        <div className="mt-6">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Import Category
          </label>

          <select
            value={importType}
            onChange={(e) => {
              setImportType(e.target.value);
              setResult(null);
              setProcessResult(null);
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {importTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={(e) => selectFile(e.target.files?.[0])}
          />

          {!file ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                selectFile(e.dataTransfer.files?.[0]);
              }}
              className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center transition hover:border-blue-400 hover:bg-blue-50/50"
            >
              <div className="mb-4 rounded-2xl bg-blue-100 p-4 text-blue-600">
                <UploadCloud size={32} />
              </div>

              <p className="font-semibold text-slate-800">
                Click to browse or drop your file here
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Supported formats: CSV, XLSX · Maximum size: 50 MB
              </p>
            </button>
          ) : (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex min-w-0 items-center gap-3">
                {file.name.endsWith(".csv") ? (
                  <FileText className="shrink-0 text-blue-600" size={28} />
                ) : (
                  <FileSpreadsheet className="shrink-0 text-emerald-600" size={28} />
                )}

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatBytes(file.size)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFile(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-red-600"
                aria-label="Remove selected file"
              >
                <X size={19} />
              </button>
            </div>
          )}
        </div>

        {error && (
          <div role="alert" className="mt-5 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={19} className="shrink-0" />
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || uploading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 size={19} className="animate-spin" />
              Uploading and validating...
            </>
          ) : (
            <>
              <UploadCloud size={19} />
              Upload and validate file
            </>
          )}
        </button>
      </div>

      {/* Upload Success & Settlement Processing Action Card */}
      {result && (
        <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-emerald-600" size={26} />
            <div>
              <h2 className="font-bold text-slate-900">
                File Uploaded Successfully
              </h2>
              <p className="text-sm text-slate-500">
                Import validation completed and records staged.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ["Total rows", result.totalRows],
              ["Valid rows", result.validCount],
              ["Rejected rows", result.rejectedCount],
              ["Duplicates", result.duplicateCount ?? 0],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  {label}
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900 font-mono">
                  {value ?? "—"}
                </p>
              </div>
            ))}
          </div>

          {result.rejectedCount > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2 text-xs text-red-700">
                <AlertCircle size={16} />
                <span>{result.rejectedCount} row(s) were rejected during validation.</span>
              </div>
              <a
                href={`/api/imports/${result.importBatchId || result.id}/rejected-csv`}
                target="_blank"
                rel="noreferrer"
                download
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-red-700 transition"
              >
                <Download size={14} /> Download Rejected Rows (CSV)
              </a>
            </div>
          )}

          {result.columnMapping && Object.keys(result.columnMapping).length > 0 && (
            <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">
                Detected Column Mapping
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(result.columnMapping).map(([field, original]) => (
                  <span
                    key={field}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-mono text-slate-700 shadow-2xs"
                  >
                    <span className="font-semibold text-blue-600">{field}</span>
                    <span className="text-slate-400">←</span>
                    <span className="text-slate-600">{original}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <span className="font-mono">
              Batch ID: {result.importBatchId || result.id || "Created"}
            </span>

            {/* If the uploaded batch is SETTLEMENTS, offer immediate processing */}
            {(importType === "SETTLEMENTS" || result.importType === "SETTLEMENTS") && (
              <button
                type="button"
                onClick={() =>
                  handleProcessSettlements(result.importBatchId || result.id)
                }
                disabled={processingBatchId === (result.importBatchId || result.id)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {processingBatchId === (result.importBatchId || result.id) ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing settlements...
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    Process Settlements Pipeline
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Settlement Processing Outcome */}
      {processResult && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="text-blue-600" size={24} />
              <div>
                <h3 className="font-bold text-slate-900">
                  Settlements Pipeline Execution Completed
                </h3>
                <p className="text-xs text-slate-600">
                  Batch: {processResult.batchId}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/reconciliation")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
            >
              Go to Reconciliation <ArrowRight size={14} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl bg-white p-3.5 shadow-xs">
              <p className="text-xs font-medium text-slate-500">Total Records</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {processResult.totalRecords ?? 0}
              </p>
            </div>
            <div className="rounded-xl bg-white p-3.5 shadow-xs">
              <p className="text-xs font-medium text-emerald-600">Processed</p>
              <p className="mt-1 text-xl font-bold text-emerald-700">
                {processResult.processedCount ?? 0}
              </p>
            </div>
            <div className="rounded-xl bg-white p-3.5 shadow-xs">
              <p className="text-xs font-medium text-slate-500">Skipped (Invalid)</p>
              <p className="mt-1 text-xl font-bold text-slate-700">
                {processResult.skippedCount ?? 0}
              </p>
            </div>
            <div className="rounded-xl bg-white p-3.5 shadow-xs">
              <p className="text-xs font-medium text-rose-600">Rejected</p>
              <p className="mt-1 text-xl font-bold text-rose-700">
                {processResult.rejectedCount ?? 0}
              </p>
            </div>
          </div>

          {Array.isArray(processResult.errors) && processResult.errors.length > 0 && (
            <div className="mt-4 rounded-xl bg-white p-4">
              <p className="text-xs font-semibold text-rose-700">
                Validation & Duplicate Warnings:
              </p>
              <ul className="mt-2 space-y-1 text-xs text-slate-600">
                {processResult.errors.slice(0, 5).map((err, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="font-semibold text-slate-800">
                      Row {err.rowNumber}:
                    </span>
                    <span>{Array.isArray(err.errors) ? err.errors.join(", ") : String(err.errors)}</span>
                  </li>
                ))}
                {processResult.errors.length > 5 && (
                  <li className="text-slate-400">
                    ...and {processResult.errors.length - 5} more records
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {processError && (
        <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={19} className="shrink-0" />
          {processError}
        </div>
      )}

      {/* Import History Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <History size={20} className="text-slate-600" />
            <h2 className="text-lg font-bold text-slate-900">
              Import History
            </h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {history.length} batches
            </span>
          </div>

          <button
            type="button"
            onClick={fetchHistory}
            disabled={loadingHistory}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loadingHistory ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {historyError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {historyError}
          </div>
        )}

        {loadingHistory ? (
          <div className="flex min-h-[160px] items-center justify-center">
            <RefreshCw className="animate-spin text-blue-600" size={24} />
          </div>
        ) : history.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No files imported yet. Upload a file above to begin.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">File / Batch ID</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Uploaded</th>
                  <th className="px-4 py-3">Uploaded By</th>
                  <th className="px-4 py-3">Rows</th>
                  <th className="px-4 py-3">Settlements</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((batch) => {
                  const categoryStyle =
                    categoryBadgeStyles[batch.importType] ||
                    "bg-slate-50 text-slate-700 border-slate-200";
                  const settlementCount = batch._count?.settlements ?? 0;
                  const isSettlementBatch = batch.importType === "SETTLEMENTS";

                  return (
                    <tr key={batch.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-900 truncate max-w-[200px]">
                          {batch.fileName || "Uploaded File"}
                        </p>
                        <p className="font-mono text-[10px] text-slate-400 truncate max-w-[200px]">
                          {batch.id}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-semibold ${categoryStyle}`}
                        >
                          {batch.importType}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {formatDate(batch.uploadedAt)}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-slate-900 font-medium truncate max-w-[120px]">
                          {batch.uploadedBy?.name || "System"}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate max-w-[120px]">
                          {batch.uploadedBy?.email || ""}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800">
                        {batch.rowCount ?? batch.totalRows ?? "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        {isSettlementBatch ? (
                          settlementCount > 0 ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-0.5 text-[11px]">
                              <CheckCircle2 size={12} /> {settlementCount} created
                            </span>
                          ) : (
                            <span className="text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-0.5 text-[11px] font-medium">
                              Unprocessed
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {isSettlementBatch ? (
                          <button
                            type="button"
                            onClick={() => handleProcessSettlements(batch.id)}
                            disabled={processingBatchId === batch.id}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200 transition hover:bg-blue-600 hover:text-white disabled:opacity-50"
                          >
                            {processingBatchId === batch.id ? (
                              <>
                                <Loader2 size={12} className="animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Play size={12} />
                                {settlementCount > 0 ? "Reprocess" : "Process"}
                              </>
                            )}
                          </button>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={`/api/imports/${batch.id}/rejected-csv`}
                              target="_blank"
                              rel="noreferrer"
                              download
                              title="Download Rejected Rows if any"
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-red-600 transition"
                            >
                              <Download size={11} /> Rejections
                            </a>
                            <span className="text-xs text-slate-400">Processed</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
