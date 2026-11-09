import Decimal from "decimal.js";

/**
 * Parses and cleans monetary/decimal values safely.
 * Strips currency symbols (₹, $, €), commas, and whitespace.
 *
 * @param {any} value - Raw input.
 * @returns {Decimal | null} Decimal instance or null if empty/invalid.
 */
export function parseDecimalSafe(value) {
  if (value === null || value === undefined) return null;
  const str = String(value).replace(/[₹$,\s]/g, "").trim();
  if (str === "" || str.toLowerCase() === "null" || str.toLowerCase() === "nan") {
    return null;
  }
  try {
    const d = new Decimal(str);
    return d.isFinite() ? d : null;
  } catch {
    return null;
  }
}

/**
 * Parses date values safely across ISO, DD-MM-YYYY, DD/MM/YYYY, Excel serial, and textual dates.
 * Enforces strict DD-MM-YYYY precedence over generic parsing to prevent US/UK day-month transposition.
 *
 * @param {any} value - Raw input date.
 * @returns {Date | null} Parsed JavaScript Date in UTC or null if invalid/impossible.
 */
export function parseDateSafe(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  // Handle Excel serial date numbers
  if (
    typeof value === "number" ||
    (typeof value === "string" && /^\d{5}(\.\d+)?$/.test(value.trim()))
  ) {
    const num = Number(value);
    if (!Number.isNaN(num) && num >= 25569 && num <= 2958465) {
      const ms = Math.round((num - 25569) * 86400 * 1000);
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }

  const str = String(value).trim();
  if (!str) return null;

  // 1. Detect explicitly formatted ISO dates: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss...
  const isoMatch = str.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(?:Z|([+-]\d{2}:?\d{2}))?)?$/
  );
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);

    if (
      year < 1900 ||
      year > 2100 ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      return null;
    }

    const d = new Date(Date.UTC(year, month - 1, day));
    if (
      d.getUTCFullYear() !== year ||
      d.getUTCMonth() !== month - 1 ||
      d.getUTCDate() !== day
    ) {
      return null;
    }

    if (isoMatch[4] !== undefined) {
      const fullDate = new Date(str);
      return Number.isNaN(fullDate.getTime()) ? d : fullDate;
    }

    return d;
  }

  // 2. Detect DD-MM-YYYY or DD/MM/YYYY BEFORE any generic Date constructor call
  const ddmmyyyyMatch = str.match(
    /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[T\s](\d{2}):(\d{2}):(\d{2}))?$/
  );
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1], 10);
    const month = parseInt(ddmmyyyyMatch[2], 10);
    const year = parseInt(ddmmyyyyMatch[3], 10);

    if (
      year < 1900 ||
      year > 2100 ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      return null;
    }

    const d = new Date(Date.UTC(year, month - 1, day));
    // Validate calendar overflow to reject impossible dates like 31-02-2026
    if (
      d.getUTCFullYear() !== year ||
      d.getUTCMonth() !== month - 1 ||
      d.getUTCDate() !== day
    ) {
      return null;
    }

    return d;
  }

  // 3. Fallback: only for textual month representations (e.g. "03-Nov-2026", "Nov 3, 2026")
  if (/[a-zA-Z]/.test(str)) {
    const textDate = new Date(str);
    if (!Number.isNaN(textDate.getTime())) {
      return textDate;
    }
  }

  return null;
}

/**
 * Universal validator for all ReconcileX import categories.
 *
 * @param {Array<Record<string, any>>} records - Array of normalized row objects.
 * @param {object} [options]
 * @param {string} [options.importType="ORDERS"] - Category: ORDERS, SETTLEMENTS, COD, FREIGHT, RETURNS, WAREHOUSE_RECEIPTS.
 * @param {string} [options.duplicateKey="orderNumber"] - Unique key for intra-file duplicate detection.
 * @returns {object} Validation result with detailed counts and error breakdown.
 */
export function validateImportRecords(records, options = {}) {
  const {
    importType = "ORDERS",
    duplicateKey = importType === "SETTLEMENTS" ? "settlementReference" : "orderNumber",
  } = options;

  const validRecords = [];
  const rejectedRecords = [];
  const seenIdentifiers = new Set();
  const errorSummary = {};

  let duplicateCount = 0;
  let skippedCount = 0;

  const addError = (errors, reason) => {
    errors.push(reason);
    errorSummary[reason] = (errorSummary[reason] || 0) + 1;
  };

  records.forEach((record, index) => {
    const rowNumber = index + 2; // 1-based, assuming row 1 is header
    const errors = [];

    // Check for empty row
    const nonNullValues = Object.entries(record).filter(
      ([k, v]) => k !== "_unmapped" && v !== null && v !== undefined && String(v).trim() !== ""
    );
    if (nonNullValues.length === 0) {
      skippedCount++;
      return; // Skip completely blank row
    }

    const orderNumber = String(record.orderNumber ?? "").trim();
    if (!orderNumber) {
      addError(errors, "Missing order number.");
    }

    let normalized = {
      ...record,
      orderNumber,
    };

    // =========================================================================
    // 1. ORDERS VALIDATION
    // =========================================================================
    if (importType === "ORDERS") {
      // Order Date
      const parsedOrderDate = parseDateSafe(record.orderDate);
      if (!parsedOrderDate) {
        addError(errors, "Invalid or missing order date.");
      } else {
        normalized.orderDate = parsedOrderDate;
      }

      // Order Value
      const rawValue = record.orderValue ?? record.amount;
      const parsedValue = parseDecimalSafe(rawValue);
      if (parsedValue === null) {
        addError(errors, "Missing or invalid order value.");
      } else if (parsedValue.isNegative()) {
        addError(errors, "Order value must be a non-negative amount.");
      } else {
        normalized.orderValue = parsedValue.toFixed(2);
      }

      // Channels & Partners
      normalized.channel = String(record.channel || "Website").trim();
      normalized.partnerName = String(
        record.partnerName || record.channel || "Website"
      ).trim();
      normalized.paymentMode = String(record.paymentMode || "COD").trim();
      normalized.deliveryStatus = String(
        record.deliveryStatus || "Delivered"
      ).trim();

      // Expected Settlement Amount (optional)
      if (record.expectedSettlementAmount !== undefined && record.expectedSettlementAmount !== null) {
        const parsedExpected = parseDecimalSafe(record.expectedSettlementAmount);
        if (parsedExpected !== null && !parsedExpected.isNegative()) {
          normalized.expectedSettlementAmount = parsedExpected.toFixed(2);
        }
      }

      // Settlement Due Date (optional)
      if (record.settlementDueAt) {
        const parsedDue = parseDateSafe(record.settlementDueAt);
        if (parsedDue) {
          normalized.settlementDueAt = parsedDue;
        }
      }

      // Weight in KG (optional)
      if (record.weightKg !== undefined && record.weightKg !== null) {
        const parsedWeight = parseDecimalSafe(record.weightKg);
        if (parsedWeight !== null && parsedWeight.isPositive()) {
          normalized.weightKg = parsedWeight.toFixed(3);
        }
      }
    }

    // =========================================================================
    // 2. SETTLEMENTS VALIDATION
    // =========================================================================
    else if (importType === "SETTLEMENTS") {
      // Net Amount Received
      const parsedAmount = parseDecimalSafe(record.amount);
      if (parsedAmount === null) {
        addError(errors, "Missing or invalid settlement amount.");
      } else if (parsedAmount.isNegative()) {
        addError(errors, "Settlement amount must be non-negative.");
      } else {
        normalized.amount = parsedAmount.toFixed(2);
      }

      // Settlement Date
      const parsedDate = parseDateSafe(record.settlementDate || record.transactionDate);
      normalized.settlementDate = parsedDate || new Date();

      // Settlement Reference (UTR / Tx ID)
      if (record.settlementReference) {
        normalized.settlementReference = String(record.settlementReference).trim();
      }

      // Gross Amount (optional)
      const parsedGross = parseDecimalSafe(record.grossAmount);
      if (parsedGross !== null) {
        normalized.grossAmount = parsedGross.toFixed(2);
      }

      // Commission & Fees (default 0)
      const parsedCommission = parseDecimalSafe(record.commissionAmount) || new Decimal(0);
      normalized.commissionAmount = parsedCommission.toFixed(2);

      const parsedOtherFee = parseDecimalSafe(record.otherFeeAmount) || new Decimal(0);
      normalized.otherFeeAmount = parsedOtherFee.toFixed(2);

      // TCS & TDS (Tax deductions: never classify as leakage)
      const parsedTCS = parseDecimalSafe(record.tcsAmount) || new Decimal(0);
      normalized.tcsAmount = Decimal.max(parsedTCS, 0).toFixed(2);

      const parsedTDS = parseDecimalSafe(record.tdsAmount) || new Decimal(0);
      normalized.tdsAmount = Decimal.max(parsedTDS, 0).toFixed(2);

      if (record.partnerName) {
        normalized.partnerName = String(record.partnerName).trim();
      }
    }

    // =========================================================================
    // 3. COD VALIDATION
    // =========================================================================
    else if (importType === "COD") {
      const rawRemitted = record.remittedAmount ?? record.amount;
      const parsedRemitted = parseDecimalSafe(rawRemitted);
      if (parsedRemitted === null) {
        addError(errors, "Missing or invalid remitted COD amount.");
      } else if (parsedRemitted.isNegative()) {
        addError(errors, "Remitted amount must be non-negative.");
      } else {
        normalized.remittedAmount = parsedRemitted.toFixed(2);
        normalized.amount = parsedRemitted.toFixed(2);
      }

      const parsedRemitDate = parseDateSafe(record.remittanceDate || record.transactionDate);
      if (parsedRemitDate) {
        normalized.remittanceDate = parsedRemitDate;
      }

      if (record.courierName) {
        normalized.courierName = String(record.courierName).trim();
      }
      if (record.referenceNumber) {
        normalized.referenceNumber = String(record.referenceNumber).trim();
      }
    }

    // =========================================================================
    // 4. FREIGHT VALIDATION
    // =========================================================================
    else if (importType === "FREIGHT") {
      const courierName = String(record.courierName ?? "").trim();
      if (!courierName) {
        addError(errors, "Missing courier name.");
      }
      normalized.courierName = courierName;

      // Charged Amount
      const parsedAmount = parseDecimalSafe(record.chargedAmount);
      if (parsedAmount === null) {
        addError(errors, "Missing or invalid charged freight amount.");
      } else if (parsedAmount.isNegative()) {
        addError(errors, "Charged freight amount must be non-negative.");
      } else {
        normalized.chargedAmount = parsedAmount.toFixed(2);
      }

      // Actual Weight
      const parsedWeight = parseDecimalSafe(record.actualWeight ?? record.weightKg);
      if (parsedWeight === null) {
        addError(errors, "Missing or invalid actual weight.");
      } else if (!parsedWeight.isPositive()) {
        addError(errors, "Actual weight must be a positive number.");
      } else {
        normalized.actualWeight = parsedWeight.toFixed(3);
      }

      // Invoice Number & Charged Date
      if (record.invoiceNumber) {
        normalized.invoiceNumber = String(record.invoiceNumber).trim();
      }
      const parsedChargedAt = parseDateSafe(record.chargedAt);
      if (parsedChargedAt) {
        normalized.chargedAt = parsedChargedAt;
      }
    }

    // =========================================================================
    // 5. RETURNS VALIDATION
    // =========================================================================
    else if (importType === "RETURNS") {
      const parsedReturnDate = parseDateSafe(record.returnDate);
      if (!parsedReturnDate) {
        addError(errors, "Missing or invalid return initiation date.");
      } else {
        normalized.returnDate = parsedReturnDate;
      }

      normalized.returnStatus = String(record.returnStatus || "RETURN_INITIATED")
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, "_");

      if (record.receiptReference) {
        normalized.receiptReference = String(record.receiptReference).trim();
      }
    }

    // =========================================================================
    // 6. WAREHOUSE RECEIPTS VALIDATION
    // =========================================================================
    else if (importType === "WAREHOUSE_RECEIPTS") {
      const parsedReceivedAt = parseDateSafe(record.warehouseReceivedAt);
      if (!parsedReceivedAt) {
        addError(errors, "Missing or invalid warehouse received date.");
      } else {
        normalized.warehouseReceivedAt = parsedReceivedAt;
      }

      if (record.receiptReference) {
        normalized.receiptReference = String(record.receiptReference).trim();
      }
      if (record.receivedQuantity) {
        const qty = parseInt(record.receivedQuantity, 10);
        normalized.receivedQuantity = Number.isNaN(qty) ? 1 : qty;
      }
      normalized.status = String(record.status || "RECEIVED")
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, "_");
    }

    // =========================================================================
    // DUPLICATE IDENTIFIER DETECTION
    // =========================================================================
    if (duplicateKey && record[duplicateKey]) {
      const identifier = String(record[duplicateKey]).trim();
      if (identifier) {
        if (seenIdentifiers.has(identifier)) {
          duplicateCount++;
          addError(errors, `Duplicate ${duplicateKey} "${identifier}" found in file.`);
        } else {
          seenIdentifiers.add(identifier);
        }
      }
    }

    // Store rejected or valid record
    if (errors.length > 0) {
      rejectedRecords.push({
        rowNumber,
        record,
        errors,
      });
    } else {
      validRecords.push(normalized);
    }
  });

  return {
    totalRows: records.length,
    validCount: validRecords.length,
    rejectedCount: rejectedRecords.length,
    duplicateCount,
    skippedCount,
    validRecords,
    rejectedRecords,
    errorSummary,
  };
}
