
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

    // Common validation
    if (!orderNumber) {
      errors.push("Missing order number.");
    }

    let normalizedRecord = {
      ...record,
      orderNumber,
    };

    if (importType === "FREIGHT") {
      const courierName = String(record.courierName ?? "").trim();
      const chargedAmount = record.chargedAmount;
      const actualWeight = record.actualWeight;
      const chargedAt = record.chargedAt;

      if (!courierName) {
        errors.push("Missing courier name.");
      }

      // Validate freight charge
      let parsedAmount;

      if (
        chargedAmount === null ||
        chargedAmount === undefined ||
        String(chargedAmount).trim() === ""
      ) {
        errors.push("Missing charged amount.");
      } else {
        try {
          parsedAmount = new Decimal(chargedAmount);

          if (!parsedAmount.isFinite() || parsedAmount.isNegative()) {
            errors.push("Charged amount must be a valid non-negative number.");
          }
        } catch {
          errors.push("Invalid charged amount.");
        }
      }

      // Validate actual shipment weight
      let parsedWeight;

      if (
        actualWeight === null ||
        actualWeight === undefined ||
        String(actualWeight).trim() === ""
      ) {
        errors.push("Missing actual weight.");
      } else {
        try {
          parsedWeight = new Decimal(actualWeight);

          if (!parsedWeight.isFinite() || !parsedWeight.isPositive()) {
            errors.push("Actual weight must be a valid positive number.");
          }
        } catch {
          errors.push("Invalid actual weight.");
        }
      }

      // Validate freight charge date when provided
      let parsedChargedAt;

      if (chargedAt) {
        parsedChargedAt = new Date(chargedAt);

        if (Number.isNaN(parsedChargedAt.getTime())) {
          errors.push("Invalid freight charge date.");
        }
      }

      normalizedRecord = {
        ...normalizedRecord,
        courierName,
        chargedAmount:
          parsedAmount?.isFinite() && !parsedAmount.isNegative()
            ? parsedAmount.toFixed(2)
            : chargedAmount,
        actualWeight:
          parsedWeight?.isFinite() && parsedWeight.isPositive()
            ? parsedWeight.toFixed(3)
            : actualWeight,
        chargedAt: parsedChargedAt || chargedAt,
      };
    } else if (importType === "RETURNS") {
      const returnDate = record.returnDate
        ? new Date(record.returnDate)
        : null;

      if (!returnDate) {
        errors.push("Missing return date.");
      } else if (Number.isNaN(returnDate.getTime())) {
        errors.push("Invalid return date.");
      } else {
        normalizedRecord.returnDate = returnDate;
      }

      normalizedRecord.returnStatus =
        String(record.returnStatus ?? "RETURN_INITIATED")
          .trim()
          .toUpperCase()
          .replace(/[\s-]+/g, "_");

    } else if (importType === "WAREHOUSE_RECEIPTS") {
      const receivedAt = record.warehouseReceivedAt
        ? new Date(record.warehouseReceivedAt)
        : null;

      if (!receivedAt) {
        errors.push("Missing warehouse receipt date.");
      } else if (Number.isNaN(receivedAt.getTime())) {
        errors.push("Invalid warehouse receipt date.");
      } else {
        normalizedRecord.warehouseReceivedAt = receivedAt;
      }

    } else {
      // Existing settlement-style validation
      const amount = record.amount;
      const transactionDate = record.transactionDate;

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
          } else {
            normalizedRecord.amount = parsedAmount.toFixed(2);
          }
        } catch {
          errors.push("Invalid amount.");
        }
      }

      if (transactionDate) {
        const parsedDate = new Date(transactionDate);

        if (Number.isNaN(parsedDate.getTime())) {
          errors.push("Invalid transaction date.");
        }
      }
    }

    // Detect duplicates using the configured identifier
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
      validRecords.push(normalizedRecord);
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
