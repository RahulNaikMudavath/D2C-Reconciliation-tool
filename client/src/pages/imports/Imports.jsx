
import { useRef, useState } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

import { uploadImportFile } from "../../services/importService";

const importTypes = [
  { value: "ORDERS", label: "Orders" },
  { value: "SETTLEMENTS", label: "Settlements" },
  { value: "COD", label: "COD Payments" },
  { value: "FREIGHT", label: "Freight Charges" },
  { value: "RETURNS", label: "Returns" },
  { value: "WAREHOUSE_RECEIPTS", label: "Warehouse Receipts" },
];

export default function Imports() {
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [importType, setImportType] = useState("SETTLEMENTS");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const selectFile = (selectedFile) => {
    setError("");
    setResult(null);

    if (!selectedFile) return;

    const extension = selectedFile.name.split(".").pop().toLowerCase();

    if (!["csv", "xlsx"].includes(extension)) {
      setError("Only CSV and XLSX files are supported.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File size must not exceed 10 MB.");
      return;
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

    try {
      const data = await uploadImportFile(file, importType);
      setResult(data);
      setFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "File upload failed. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <div>
        <p className="text-sm font-semibold text-blue-600">
          DATA MANAGEMENT
        </p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">
          Import Files
        </h1>
        <p className="mt-2 text-slate-500">
          Upload partner statements and financial records for reconciliation.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-bold text-slate-900">
          Upload financial data
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Select the type of data and upload your CSV or Excel file.
        </p>

        <div className="mt-7">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Import category
          </label>

          <select
            value={importType}
            onChange={(e) => {
              setImportType(e.target.value);
              setResult(null);
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                Supported formats: CSV, XLSX · Maximum size: 10 MB
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

      {result && (
        <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-emerald-600" size={25} />
            <div>
              <h2 className="font-bold text-slate-900">
                File uploaded successfully
              </h2>
              <p className="text-sm text-slate-500">
                Your import validation has completed.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              ["Total rows", result.totalRows],
              ["Valid rows", result.validCount],
              ["Rejected rows", result.rejectedCount],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {value ?? "—"}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-5 break-all text-xs text-slate-500">
            Import batch: {result.importBatchId || result.id || "Created"}
          </p>
        </div>
      )}
    </div>
  );
}
