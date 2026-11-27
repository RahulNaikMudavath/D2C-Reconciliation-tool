/**
 * Type-scoped standard column aliases for ReconcileX.
 * Strictly isolates candidate fields by import category to prevent cross-type
 * collisions (e.g. order value vs. settlement amount, weightKg vs. actualWeight).
 */
export const COLUMN_ALIASES_BY_TYPE = {
  ORDERS: {
    orderNumber: [
      "order id",
      "order_id",
      "order no",
      "order_no",
      "order #",
      "order number",
      "order_number",
      "ordernumber",
      "reference id",
      "reference_id",
      "order item id",
      "suborder id",
      "sub order id",
      "po number",
      "po #",
      "invoice id",
      "invoice number",
      "invoice no",
      "invoice #",
      "order reference",
      "booking id",
      "order",
    ],
    channel: [
      "channel",
      "sales channel",
      "sales_channel",
      "platform",
      "store",
      "selling partner",
      "source",
      "portal",
      "marketplace",
    ],
    partnerName: [
      "partner",
      "partner name",
      "partner_name",
      "partnername",
      "marketplace",
      "platform name",
      "portal",
      "vendor",
      "seller",
    ],
    orderDate: [
      "order date",
      "order_date",
      "orderdate",
      "purchase date",
      "purchase_date",
      "ordered at",
      "ordered_at",
      "creation date",
      "created at",
      "created date",
      "booking date",
      "booking_date",
      "txn date",
      "transaction date",
      "date",
    ],
    paymentMode: [
      "payment mode",
      "payment_mode",
      "payment method",
      "payment_method",
      "payment type",
      "mode of payment",
      "pay mode",
      "payment",
      "type",
    ],
    deliveryStatus: [
      "delivery status",
      "delivery_status",
      "deliverystatus",
      "fulfilment status",
      "fulfillment status",
      "shipment status",
      "order status",
      "current status",
      "status",
    ],
    orderValue: [
      "order value",
      "order_value",
      "ordervalue",
      "order amount",
      "order_amount",
      "total amount",
      "total_amount",
      "total value",
      "order total",
      "invoice value",
      "grand total",
      "item total",
      "selling price",
      "sale amount",
      "amount",
      "value",
      "price",
      "total",
    ],
    expectedSettlementAmount: [
      "expected settlement amount",
      "expected settlement",
      "expected_settlement",
      "expected_settlement_amount",
      "expected net settlement",
      "expected_net_settlement",
      "expectednetsettlement",
      "expected net settlement amount",
      "net settlement",
      "net_settlement",
      "expected payout",
      "net payable",
      "expected amount",
      "expected net",
    ],
    settlementDueAt: [
      "settlement due at",
      "settlement due date",
      "settlement_due_at",
      "settlement_due_date",
      "due date",
      "due_date",
      "payment due date",
      "payout due date",
      "expected settlement date",
      "due at",
    ],
    weightKg: [
      "weight kg",
      "weight_kg",
      "weightkg",
      "weight",
      "order weight",
      "shipment weight",
      "shipment weight kg",
      "shipment_weight_kg",
      "shipment weight (kg)",
      "weight (kg)",
      "package weight",
      "package weight kg",
      "gross weight",
      "gross weight kg",
      "dead weight",
      "actual weight",
    ],
  },

  SETTLEMENTS: {
    orderNumber: [
      "order id",
      "order_id",
      "order no",
      "order_no",
      "order #",
      "order number",
      "order_number",
      "order reference",
      "order ref",
      "marketplace order id",
      "merchant order id",
      "suborder id",
      "reference id",
      "order",
    ],
    settlementReference: [
      "settlement id",
      "settlement reference",
      "settlement reference id",
      "transaction id",
      "transaction reference",
      "reference number",
      "ref no",
      "ref number",
      "utr",
      "utr number",
      "payment reference",
      "payout id",
      "deposit id",
      "neft ref",
      "bank ref",
      "txn id",
      "txn reference",
    ],
    amount: [
      "amount",
      "settlement amount",
      "net amount",
      "net settlement",
      "paid amount",
      "amount received",
      "credited amount",
      "payout amount",
      "transaction amount",
      "net payout",
      "payout",
      "net paid",
      "bank credit",
      "remitted amount",
    ],
    grossAmount: [
      "gross amount",
      "gross settlement",
      "reported amount",
      "total sales",
      "sale amount",
      "invoice amount",
      "item price",
      "gross value",
      "product charges",
      "order value",
      "item total",
    ],
    settlementDate: [
      "settlement date",
      "settlement_date",
      "transaction date",
      "transaction_date",
      "payment date",
      "remittance date",
      "value date",
      "payout date",
      "credit date",
      "deposit date",
      "date",
    ],
    commissionAmount: [
      "commission",
      "commission amount",
      "marketplace fee",
      "marketplace commission",
      "platform fee",
      "selling fee",
      "referral fee",
      "closing fee",
      "channel fee",
    ],
    otherFeeAmount: [
      "other fee",
      "other fees",
      "fixed fee",
      "closing fee",
      "payment gateway fee",
      "pg fee",
      "technology fee",
      "handling fee",
      "pick and pack fee",
      "pick and pack",
      "shipping fee",
      "deductions",
      "logistics charge",
    ],
    tcsAmount: [
      "tcs",
      "tcs amount",
      "tax collected at source",
      "tcs deducted",
      "gst tcs",
      "igst tcs",
      "tcs tax",
    ],
    tdsAmount: [
      "tds",
      "tds amount",
      "tax deducted at source",
      "tds deducted",
      "income tax tds",
      "section 194o",
      "194o tds",
      "tds tax",
    ],
    partnerName: [
      "partner",
      "partner name",
      "marketplace",
      "channel",
      "source",
      "portal",
    ],
  },

  COD: {
    orderNumber: [
      "order id",
      "order_id",
      "order no",
      "order_no",
      "order #",
      "order number",
      "order_number",
      "awb number",
      "awb",
      "waybill",
      "consignment number",
      "reference id",
      "order",
    ],
    amount: [
      "cod amount",
      "cod value",
      "collected amount",
      "cash amount",
      "invoice amount",
      "order value",
      "amount",
      "total amount",
    ],
    remittedAmount: [
      "remitted amount",
      "settled amount",
      "transferred amount",
      "net remittance",
      "amount remitted",
      "payout amount",
      "received amount",
      "net paid",
    ],
    remittanceDate: [
      "remittance date",
      "settlement date",
      "deposit date",
      "payment date",
      "transfer date",
      "credit date",
      "date",
    ],
    courierName: [
      "courier",
      "courier name",
      "logistics partner",
      "aggregator",
      "carrier",
      "shipping partner",
      "transporter",
      "delivery partner",
    ],
    referenceNumber: [
      "reference number",
      "remittance reference",
      "utr number",
      "utr",
      "transaction id",
      "remittance id",
      "cheque no",
      "ref no",
    ],
  },

  FREIGHT: {
    orderNumber: [
      "order id",
      "order_id",
      "order no",
      "order_no",
      "order #",
      "order number",
      "order_number",
      "shipment id",
      "awb number",
      "awb",
      "waybill",
      "tracking number",
      "tracking id",
      "consignment no",
      "consignment number",
      "order",
    ],
    courierName: [
      "courier",
      "courier name",
      "logistics partner",
      "carrier",
      "shipping partner",
      "delivery partner",
      "transporter",
      "aggregator",
    ],
    chargedAmount: [
      "charged amount",
      "freight amount",
      "freight charge",
      "shipping charge",
      "shipping fee",
      "delivery charge",
      "logistics charge",
      "freight cost",
      "billed amount",
      "amount",
      "cost",
    ],
    actualWeight: [
      "actual weight",
      "actual weight (kg)",
      "actual weight kg",
      "billed weight",
      "billed weight (kg)",
      "billed weight kg",
      "chargeable weight",
      "chargeable weight (kg)",
      "charged weight",
      "charged weight (kg)",
      "dead weight",
      "volumetric weight",
      "weight kg",
      "weight (kg)",
      "weight",
      "shipment weight",
      "shipment weight (kg)",
      "package weight",
    ],
    invoiceNumber: [
      "invoice number",
      "invoice no",
      "invoice #",
      "freight invoice",
      "awb invoice",
      "bill no",
      "billing invoice",
    ],
    chargedAt: [
      "charge date",
      "charged at",
      "invoice date",
      "freight date",
      "billing date",
      "shipment date",
      "date",
    ],
  },

  RETURNS: {
    orderNumber: [
      "order id",
      "order_id",
      "order no",
      "order_no",
      "order #",
      "order number",
      "order_number",
      "return order id",
      "original order id",
      "order",
    ],
    returnDate: [
      "return date",
      "return initiated date",
      "pickup date",
      "date of return",
      "return request date",
      "created at",
      "date",
    ],
    returnStatus: [
      "return status",
      "refund status",
      "return stage",
      "disposition",
      "status",
    ],
    receiptReference: [
      "receipt reference",
      "return reference",
      "return id",
      "rto awb",
      "return awb",
      "tracking id",
      "return tracking no",
      "awb",
    ],
  },

  WAREHOUSE_RECEIPTS: {
    orderNumber: [
      "order id",
      "order_id",
      "order no",
      "order_no",
      "order #",
      "order number",
      "order_number",
      "reference number",
      "po number",
      "order",
    ],
    receiptReference: [
      "receipt reference",
      "receipt id",
      "warehouse receipt id",
      "grn number",
      "grn id",
      "inward id",
      "scan id",
      "barcode",
    ],
    warehouseReceivedAt: [
      "warehouse received at",
      "warehouse received date",
      "received date",
      "inward date",
      "receipt date",
      "scan date",
      "date",
    ],
    receivedQuantity: [
      "received quantity",
      "quantity",
      "units received",
      "qty received",
      "item count",
      "received units",
      "count",
    ],
    status: [
      "receipt status",
      "condition",
      "item condition",
      "qc status",
      "verification status",
      "status",
    ],
  },
};

/**
 * Normalizes a header string for comparison:
 * - Splits camelCase (e.g. orderNumber -> order number)
 * - Converts to lower case
 * - Replaces non-alphanumeric characters with spaces
 * - Trims redundant whitespace
 */
export function normalizeHeader(header) {
  return String(header ?? "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Strips parenthesized units, currencies, or date formats from a header string.
 * Example: "Total Amount (₹)" -> "Total Amount"
 * Example: "Transaction Date (DD/MM/YYYY)" -> "Transaction Date"
 */
export function stripHeaderParentheses(header) {
  return String(header ?? "")
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/\s*\[.*?\]\s*/g, " ")
    .trim();
}

/**
 * Automatically detects the best-fitting import category based on raw file headers and filename.
 * Used to ensure user mistakes in selecting category dropdown don't cause import failure.
 *
 * @param {string[]} headers - Raw column headers from uploaded file.
 * @param {string} [fileName=""] - Original filename.
 * @returns {string} One of ORDERS, SETTLEMENTS, COD, FREIGHT, RETURNS, WAREHOUSE_RECEIPTS.
 */
export function detectCategoryFromHeaders(headers, fileName = "") {
  if (!Array.isArray(headers) || headers.length === 0) {
    return "ORDERS";
  }

  const scores = {
    ORDERS: 0,
    SETTLEMENTS: 0,
    COD: 0,
    FREIGHT: 0,
    RETURNS: 0,
    WAREHOUSE_RECEIPTS: 0,
  };

  const lowerFileName = String(fileName || "").toLowerCase();
  if (lowerFileName.includes("settle") || lowerFileName.includes("payout")) scores.SETTLEMENTS += 5;
  if (lowerFileName.includes("freight") || lowerFileName.includes("courier") || lowerFileName.includes("shipping")) scores.FREIGHT += 5;
  if (lowerFileName.includes("return") || lowerFileName.includes("rto")) scores.RETURNS += 5;
  if (lowerFileName.includes("warehouse") || lowerFileName.includes("inward") || lowerFileName.includes("grn")) scores.WAREHOUSE_RECEIPTS += 5;
  if (lowerFileName.includes("cod") || lowerFileName.includes("remittance")) scores.COD += 5;
  if (lowerFileName.includes("order")) scores.ORDERS += 2;

  for (const rawHeader of headers) {
    const norm = normalizeHeader(rawHeader);
    const stripped = normalizeHeader(stripHeaderParentheses(rawHeader));

    for (const [category, aliasDict] of Object.entries(COLUMN_ALIASES_BY_TYPE)) {
      for (const [field, aliases] of Object.entries(aliasDict)) {
        for (const alias of aliases) {
          const normAlias = normalizeHeader(alias);
          if (norm === normAlias || stripped === normAlias) {
            // Highly specific category markers get higher weight
            if (category === "SETTLEMENTS" && (field === "settlementReference" || field === "tcsAmount" || field === "tdsAmount")) {
              scores.SETTLEMENTS += 3;
            } else if (category === "FREIGHT" && (field === "chargedAmount" || field === "actualWeight" || field === "courierName")) {
              scores.FREIGHT += 3;
            } else if (category === "RETURNS" && (field === "returnStatus" || field === "returnDate")) {
              scores.RETURNS += 3;
            } else if (category === "WAREHOUSE_RECEIPTS" && (field === "warehouseReceivedAt" || field === "receivedQuantity")) {
              scores.WAREHOUSE_RECEIPTS += 3;
            } else if (category === "COD" && (field === "remittedAmount" || field === "remittanceDate")) {
              scores.COD += 3;
            } else {
              scores[category] += 1;
            }
            break;
          }
        }
      }
    }
  }

  let bestCategory = "ORDERS";
  let maxScore = -1;
  for (const [cat, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = cat;
    }
  }

  return bestCategory;
}

/**
 * Normalizes input records based on multi-tiered deterministic alias matching.
 * Scoped by importType to avoid cross-domain collisions, with graceful fallbacks.
 *
 * @param {Array<Record<string, any>>} records - Raw parsed records.
 * @param {string} [importType] - One of ORDERS, SETTLEMENTS, COD, FREIGHT, RETURNS, WAREHOUSE_RECEIPTS.
 * @returns {{ columnMapping: Record<string, string>, normalizedRecords: Array<Record<string, any>>, unmappedHeaders: string[] }}
 */
export function normalizeColumns(records, importType = "ORDERS") {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("No records available for normalization.");
  }

  const headers = Object.keys(records[0]);
  const columnMapping = {};
  const mappedSourceHeaders = new Set();

  const aliasDictionary =
    COLUMN_ALIASES_BY_TYPE[importType] || COLUMN_ALIASES_BY_TYPE.ORDERS;

  // Tier 1 & 2: Exact and stripped parenthetical matching
  for (const [standardField, aliases] of Object.entries(aliasDictionary)) {
    const matchedHeader = headers.find((header) => {
      if (mappedSourceHeaders.has(header)) return false;

      const normHeader = normalizeHeader(header);
      const strippedHeader = normalizeHeader(stripHeaderParentheses(header));

      return aliases.some((alias) => {
        const normAlias = normalizeHeader(alias);
        return normAlias === normHeader || normAlias === strippedHeader;
      });
    });

    if (matchedHeader) {
      columnMapping[standardField] = matchedHeader;
      mappedSourceHeaders.add(matchedHeader);
    }
  }

  // Tier 3: Stemmed / Substring keyword fallback for critical required fields
  for (const [standardField, aliases] of Object.entries(aliasDictionary)) {
    if (columnMapping[standardField]) continue;

    const matchedHeader = headers.find((header) => {
      if (mappedSourceHeaders.has(header)) return false;

      const normHeader = normalizeHeader(header);

      return aliases.some((alias) => {
        const normAlias = normalizeHeader(alias);
        // Only allow containment when alias has at least 5 letters to avoid short noise
        if (normAlias.length >= 5) {
          return normHeader.includes(normAlias) || normAlias.includes(normHeader);
        }
        return false;
      });
    });

    if (matchedHeader) {
      columnMapping[standardField] = matchedHeader;
      mappedSourceHeaders.add(matchedHeader);
    }
  }

  const unmappedHeaders = headers.filter(
    (header) => !mappedSourceHeaders.has(header)
  );

  const normalizedRecords = records.map((record) => {
    const normalizedRecord = {};

    for (const [standardField, originalHeader] of Object.entries(columnMapping)) {
      normalizedRecord[standardField] = record[originalHeader];
    }

    normalizedRecord._unmapped = {};
    for (const header of unmappedHeaders) {
      normalizedRecord._unmapped[header] = record[header];
    }

    return normalizedRecord;
  });

  return {
    columnMapping,
    normalizedRecords,
    unmappedHeaders,
  };
}

/**
 * Normalizes input records using an approved column mapping object.
 *
 * @param {Array<Record<string, any>>} records - Raw parsed records.
 * @param {Record<string, string>} approvedMapping - Mapping object: { [standardField]: originalHeader }.
 * @returns {{ columnMapping: Record<string, string>, normalizedRecords: Array<Record<string, any>>, unmappedHeaders: string[] }}
 */
export function normalizeColumnsWithApprovedMapping(records, approvedMapping) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("No records available for normalization.");
  }

  if (!approvedMapping || typeof approvedMapping !== "object") {
    throw new Error("A valid approved mapping is required.");
  }

  const headers = Object.keys(records[0]);
  const columnMapping = {};
  const mappedSourceHeaders = new Set();

  for (const [standardField, originalHeader] of Object.entries(approvedMapping)) {
    if (headers.includes(originalHeader)) {
      columnMapping[standardField] = originalHeader;
      mappedSourceHeaders.add(originalHeader);
    }
  }

  const unmappedHeaders = headers.filter(
    (header) => !mappedSourceHeaders.has(header)
  );

  const normalizedRecords = records.map((record) => {
    const normalizedRecord = {};

    for (const [standardField, originalHeader] of Object.entries(columnMapping)) {
      normalizedRecord[standardField] = record[originalHeader];
    }

    normalizedRecord._unmapped = {};
    for (const header of unmappedHeaders) {
      normalizedRecord._unmapped[header] = record[header];
    }

    return normalizedRecord;
  });

  return {
    columnMapping,
    normalizedRecords,
    unmappedHeaders,
  };
}
