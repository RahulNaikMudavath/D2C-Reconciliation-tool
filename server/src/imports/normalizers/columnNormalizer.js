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
      "order id",
      "order number",
      "order_number",
      "ordernumber",
      "order no",
      "order_no",
      "reference id",
      "reference_id",
      "order item id",
      "order reference",
    ],
    channel: [
      "channel",
      "sales channel",
      "sales_channel",
      "platform",
      "store",
      "selling partner",
      "source",
    ],
    partnerName: [
      "partner",
      "partner name",
      "partner_name",
      "partnername",
      "marketplace",
      "platform name",
      "portal",
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
      "date",
    ],
    paymentMode: [
      "payment mode",
      "payment_mode",
      "payment method",
      "payment_method",
      "payment type",
      "mode of payment",
      "payment",
    ],
    deliveryStatus: [
      "delivery status",
      "delivery_status",
      "deliverystatus",
      "fulfilment status",
      "fulfillment status",
      "shipment status",
      "order status",
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
      "amount",
      "value",
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
    ],
  },

  SETTLEMENTS: {
    orderNumber: [
      "order id",
      "order_id",
      "order number",
      "order_number",
      "order reference",
      "order ref",
      "marketplace order id",
      "reference id",
    ],
    settlementReference: [
      "settlement id",
      "settlement reference",
      "settlement reference id",
      "transaction id",
      "transaction reference",
      "reference number",
      "ref no",
      "utr",
      "utr number",
      "payment reference",
      "payout id",
      "deposit id",
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
    ],
    grossAmount: [
      "gross amount",
      "gross settlement",
      "reported amount",
      "total sales",
      "sale amount",
      "invoice amount",
      "item price",
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
    ],
    tcsAmount: [
      "tcs",
      "tcs amount",
      "tax collected at source",
      "tcs deducted",
      "gst tcs",
      "igst tcs",
    ],
    tdsAmount: [
      "tds",
      "tds amount",
      "tax deducted at source",
      "tds deducted",
      "income tax tds",
      "section 194o",
    ],
    partnerName: [
      "partner",
      "partner name",
      "marketplace",
      "channel",
      "source",
    ],
  },

  COD: {
    orderNumber: [
      "order id",
      "order_id",
      "order number",
      "order_number",
      "awb number",
      "awb",
      "waybill",
      "consignment number",
      "reference id",
    ],
    amount: [
      "cod amount",
      "cod value",
      "collected amount",
      "cash amount",
      "invoice amount",
      "order value",
      "amount",
    ],
    remittedAmount: [
      "remitted amount",
      "settled amount",
      "transferred amount",
      "net remittance",
      "amount remitted",
      "payout amount",
      "received amount",
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
    ],
    referenceNumber: [
      "reference number",
      "remittance reference",
      "utr number",
      "utr",
      "transaction id",
      "remittance id",
      "cheque no",
    ],
  },

  FREIGHT: {
    orderNumber: [
      "order id",
      "order_id",
      "order number",
      "order_number",
      "shipment id",
      "awb number",
      "awb",
      "waybill",
      "tracking number",
      "consignment no",
    ],
    courierName: [
      "courier",
      "courier name",
      "logistics partner",
      "carrier",
      "shipping partner",
      "delivery partner",
      "transporter",
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
    ],
    invoiceNumber: [
      "invoice number",
      "invoice no",
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
      "order number",
      "order_number",
      "return order id",
      "original order id",
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
      "status",
      "disposition",
    ],
    receiptReference: [
      "receipt reference",
      "return reference",
      "return id",
      "rto awb",
      "return awb",
      "tracking id",
      "return tracking no",
    ],
  },

  WAREHOUSE_RECEIPTS: {
    orderNumber: [
      "order id",
      "order_id",
      "order number",
      "order_number",
      "reference number",
      "po number",
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
 * Normalizes a header string for fuzzy/alias comparison:
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
 * Normalizes input records based on deterministic alias matching.
 * Scoped by importType to avoid cross-domain collisions.
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

  // Pick category-specific alias dictionary, fallback to ORDERS if unknown
  const aliasDictionary =
    COLUMN_ALIASES_BY_TYPE[importType] || COLUMN_ALIASES_BY_TYPE.ORDERS;

  for (const [standardField, aliases] of Object.entries(aliasDictionary)) {
    // Find candidate header in source file that matches an alias
    const matchedHeader = headers.find((header) => {
      if (mappedSourceHeaders.has(header)) return false; // Prevent mapping one source header twice

      const normalizedHeader = normalizeHeader(header);

      return aliases.some(
        (alias) => normalizeHeader(alias) === normalizedHeader
      );
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

    // Copy mapped fields
    for (const [standardField, originalHeader] of Object.entries(columnMapping)) {
      normalizedRecord[standardField] = record[originalHeader];
    }

    // Preserve unknown source columns in _unmapped so no information is silently lost
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
