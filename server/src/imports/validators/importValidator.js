
import Decimal from "decimal.js";

export function validateImportRecords(records, options = {}) {
  const {
    importType = "SETTLEMENTS",
    duplicateKey = "orderNumber",
  } = options;

  const validRecords = [];
  const rejectedRecords = [];
  const seenIdentifiers = new Set();

  records.forEach((record, index) => {
    const errors = [];

    const orderNumber = String(record.orderNumber ?? "").trim();
    const amount = record.amount;
    const transactionDate = record.transactionDate;

    // Validate order number.
    if (!orderNumber) {
      errors.push("Missing order number.");
    }

    // Validate amount.
    if (
      amount === null ||
      amount === undefined ||
      String(amount).trim() === ""
    ) {
      errors.push("Missing amount.");
    } else {
      try {
        const parsedAmount = new Decimal(amount);

        if (!parsedAmount.isFinite() || parsedAmount.isNegative()) {
          errors.push("Amount must be a valid non-negative number.");
        }
      } catch {
        errors.push("Invalid amount.");
      }
    }

    // Validate transaction date when provided.
    if (transactionDate) {
      const parsedDate = new Date(transactionDate);

      if (Number.isNaN(parsedDate.getTime())) {
        errors.push("Invalid transaction date.");
      }
    }

    // Detect duplicates using the configured identifier.
    const identifier = String(record[duplicateKey] ?? "").trim();

    if (identifier && seenIdentifiers.has(identifier)) {
      errors.push(`Duplicate ${duplicateKey}.`);
    }

    if (identifier) {
      seenIdentifiers.add(identifier);
    }

    if (errors.length > 0) {
      rejectedRecords.push({
        rowNumber: index + 2,
        record,
        errors,
      });
    } else {
      validRecords.push({
        ...record,
        orderNumber,
        amount: new Decimal(amount).toFixed(2),
      });
    }
  });

  return {
    totalRows: records.length,
    validCount: validRecords.length,
    rejectedCount: rejectedRecords.length,
    validRecords,
    rejectedRecords,
  };
}
