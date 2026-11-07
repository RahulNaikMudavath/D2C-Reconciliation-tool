
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
