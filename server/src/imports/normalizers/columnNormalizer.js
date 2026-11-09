
const COLUMN_ALIASES = {
  orderNumber: [
    "order id",
    "order_id",
    "order number",
    "order_number",
    "order item id",
    "order reference",
  ],
  settlementReference: [
  "settlement reference",
  "settlement reference id",
  "transaction id",
  "transaction reference",
  "transaction reference id",
  "payment reference",
  "payment reference id",
  "utr number",
  "utr",
  "reference number",
],

  amount: [
    "amount",
    "settlement amount",
    "paid amount",
    "net amount",
    "transaction amount",
  ],

  tcsAmount: [
    "tcs",
    "tcs amount",
    "tax collected at source",
    "tax collected",
    "tcs deducted",
  ],

  tdsAmount: [
    "tds",
    "tds amount",
    "tax deducted at source",
    "tax deduction",
    "tds deducted",
  ],

  transactionDate: [
    "transaction date",
    "payment date",
    "settlement date",
    "date",
  ],

  paymentMode: [
    "payment mode",
    "payment method",
    "mode of payment",
  ],

  status: [
    "status",
    "payment status",
    "transaction status",
  ],

  courierName: [
    "courier",
    "courier name",
    "logistics partner",
    "shipping partner",
    "delivery partner",
    "carrier",
  ],

  chargedAmount: [
    "charged amount",
    "freight charge",
    "shipping charge",
    "delivery charge",
    "logistics charge",
  ],

  actualWeight: [
    "actual weight",
    "weight",
    "shipment weight",
    "chargeable weight",
    "weight kg",
  ],

  invoiceNumber: [
    "invoice number",
    "invoice no",
    "freight invoice",
    "awb invoice",
  ],

  chargedAt: [
    "charged at",
    "charge date",
    "freight date",
    "invoice date",
  ],

  returnDate: [
    "return date",
    "date of return",
    "return initiated date",
    "pickup date",
  ],

  returnStatus: [
    "return status",
    "status",
    "refund status",
  ],

  warehouseReceivedAt: [
    "warehouse received at",
    "warehouse received date",
    "received date",
    "return received date",
    "receipt date",
  ],

  receiptReference: [
    "receipt reference",
    "receipt id",
    "warehouse receipt id",
    "scan id",
  ],
};

function normalizeHeader(header) {
  return String(header)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeColumns(records) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("No records available for normalization.");
  }

  const headers = Object.keys(records[0]);

  const columnMapping = {};

  for (const [standardField, aliases] of Object.entries(COLUMN_ALIASES)) {
    const matchedHeader = headers.find((header) => {
      const normalizedHeader = normalizeHeader(header);

      return aliases.some(
        (alias) => normalizeHeader(alias) === normalizedHeader
      );
    });

    if (matchedHeader) {
      columnMapping[standardField] = matchedHeader;
    }
  }

  const normalizedRecords = records.map((record) => {
    const normalizedRecord = {};

    for (const [standardField, originalHeader] of Object.entries(
      columnMapping
    )) {
      normalizedRecord[standardField] = record[originalHeader];
    }

    return normalizedRecord;
  });

  return {
    columnMapping,
    normalizedRecords,
    unmappedHeaders: headers.filter(
      (header) =>
        !Object.values(columnMapping).includes(header)
    ),
  };
}

export function normalizeColumnsWithApprovedMapping(
  records,
  approvedMapping
) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("No records available for normalization.");
  }

  if (!approvedMapping || typeof approvedMapping !== "object") {
    throw new Error("A valid approved mapping is required.");
  }

  const headers = Object.keys(records[0]);
  const columnMapping = {};

  for (const [standardField, originalHeader] of Object.entries(
    approvedMapping
  )) {
    if (!headers.includes(originalHeader)) {
      throw new Error(
        `Approved mapping header "${originalHeader}" was not found in the uploaded file.`
      );
    }

    columnMapping[standardField] = originalHeader;
  }

  const normalizedRecords = records.map((record) => {
    const normalizedRecord = {};

    for (const [standardField, originalHeader] of Object.entries(
      columnMapping
    )) {
      normalizedRecord[standardField] = record[originalHeader];
    }

    return normalizedRecord;
  });

  return {
    columnMapping,
    normalizedRecords,
    unmappedHeaders: headers.filter(
      (header) => !Object.values(columnMapping).includes(header)
    ),
  };
}
