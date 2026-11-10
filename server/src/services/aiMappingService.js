import { generateAIResponse } from "./geminiService.js";
import { COLUMN_ALIASES_BY_TYPE } from "../imports/normalizers/columnNormalizer.js";

const ALLOWED_FIELDS_BY_TYPE = {
  ORDERS: [
    "orderNumber",
    "channel",
    "partnerName",
    "orderDate",
    "paymentMode",
    "deliveryStatus",
    "orderValue",
    "expectedSettlementAmount",
    "settlementDueAt",
    "weightKg",
  ],
  SETTLEMENTS: [
    "orderNumber",
    "settlementReference",
    "amount",
    "transactionDate",
    "paymentMode",
    "status",
    "tcsAmount",
    "tdsAmount",
  ],
  FREIGHT: [
    "orderNumber",
    "courierName",
    "chargedAmount",
    "actualWeight",
    "invoiceNumber",
    "chargedAt",
  ],
  RETURNS: [
    "orderNumber",
    "returnDate",
    "returnStatus",
  ],
  WAREHOUSE_RECEIPTS: [
    "orderNumber",
    "warehouseReceivedAt",
    "receiptReference",
  ],
};

const COLUMN_ALIASES = {
  orderNumber: [
    "order id",
    "order_id",
    "order number",
    "order_number",
    "order item id",
    "order reference",
  ],
  channel: [
    "channel",
    "sales channel",
    "platform",
    "store",
  ],
  partnerName: [
    "partner",
    "partner name",
    "partnername",
    "marketplace",
  ],
  orderDate: [
    "order date",
    "order_date",
    "orderdate",
    "ordered at",
    "creation date",
  ],
  deliveryStatus: [
    "delivery status",
    "delivery_status",
    "deliverystatus",
    "shipment status",
    "order status",
  ],
  orderValue: [
    "order value",
    "order_value",
    "ordervalue",
    "order amount",
    "total value",
    "total amount",
    "value",
  ],
  expectedSettlementAmount: [
    "expected settlement amount",
    "expected settlement",
    "expected amount",
    "expected_settlement_amount",
    "net payable",
  ],
  settlementDueAt: [
    "settlement due at",
    "settlement due date",
    "settlement_due_at",
    "due date",
    "payment due date",
  ],
  weightKg: [
    "weight kg",
    "weight_kg",
    "weightkg",
    "weight",
    "order weight",
  ],
  settlementReference: [
    "settlement reference",
    "settlement reference id",
    "transaction id",
    "transaction reference",
    "payment reference",
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
    "net payout",
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
};

function getHeuristicMappings(
  headers,
  importType,
  allowedFields = ALLOWED_FIELDS_BY_TYPE[importType] || []
) {
  const usedFields = new Set();
  const suggestions = [];
  const typeAliases = COLUMN_ALIASES_BY_TYPE[importType] || {};

  for (const header of headers) {
    const rawStr = String(header).trim();
    const normalized = rawStr
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

    // 1. Try exact match first against type-specific aliases or generic aliases
    let matchedField = null;
    let confidence = 0.98;

    for (const field of allowedFields) {
      if (usedFields.has(field)) continue;

      const aliases = typeAliases[field] || COLUMN_ALIASES[field] || [];
      const isAliasMatch = aliases.some((alias) => {
        const normAlias = alias.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
        return normalized === normAlias;
      });

      if (isAliasMatch || normalized.replace(/\s+/g, "") === field.toLowerCase()) {
        matchedField = field;
        break;
      }
    }

    // 2. If no exact match, try substring match
    if (!matchedField) {
      confidence = 0.85;
      for (const field of allowedFields) {
        if (usedFields.has(field)) continue;

        const aliases = typeAliases[field] || COLUMN_ALIASES[field] || [];
        const isSubMatch = aliases.some((alias) => {
          const normAlias = alias.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
          return normAlias.length >= 3 && (normalized.includes(normAlias) || normAlias.includes(normalized));
        });

        if (isSubMatch) {
          matchedField = field;
          break;
        }
      }
    }

    if (matchedField) {
      usedFields.add(matchedField);
      suggestions.push({
        originalHeader: header,
        suggestedField: matchedField,
        confidence,
        reason: `Matched standard ${matchedField} alias based on header pattern.`,
        approved: false,
      });
    }
  }

  return {
    importType,
    suggestions,
    requiresHumanApproval: true,
  };
}

export async function suggestColumnMappings(headers, importType) {
  if (!Array.isArray(headers) || headers.length === 0) {
    throw new Error("At least one column header is required.");
  }

  const uniqueHeaders = [...new Set(headers.map(String))];
  const allowedFields = ALLOWED_FIELDS_BY_TYPE[importType];

if (!allowedFields) {
  throw new Error(`Unsupported import type: ${importType}`);
}

  const prompt = `
You are a data-mapping assistant for ReconcileX, a financial reconciliation platform.

Your task is to suggest mappings between uploaded spreadsheet headers and standard fields.

Import type: ${importType}

Uploaded headers:
${JSON.stringify(uniqueHeaders)}

Allowed standard fields:
${JSON.stringify(allowedFields)}

Rules:
1. Only use the exact uploaded header names.
2. Only suggest fields from the allowed standard fields list.
3. Never invent a header or standard field.
4. Do not map multiple headers to the same standard field.
5. If a mapping is ambiguous, do not force a match.
6. Confidence must be a number between 0 and 1.
7. Include a short explanation for each suggestion.
8. Return suggestions only. Do not approve or save mappings.

Return ONLY valid JSON in this structure:

{
  "suggestions": [
    {
      "originalHeader": "Net Payout",
      "suggestedField": "amount",
      "confidence": 0.95,
      "reason": "Represents the net amount paid."
    }
  ]
}
`;

  let responseText;

  try {
    responseText = await generateAIResponse(prompt);
  } catch (aiError) {
    console.warn(
      `AI mapping unavailable (${aiError.message}). Falling back to pattern-matching engine.`
    );
    return getHeuristicMappings(uniqueHeaders, importType, allowedFields);
  }

  let parsed;

  try {
    const cleanedResponse = responseText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    parsed = JSON.parse(cleanedResponse);
  } catch {
    return getHeuristicMappings(uniqueHeaders, importType, allowedFields);
  }

  if (!Array.isArray(parsed?.suggestions)) {
    return getHeuristicMappings(uniqueHeaders, importType, allowedFields);
  }

  const usedFields = new Set();
  const validHeaders = new Set(uniqueHeaders);

  const suggestions = parsed.suggestions
    .filter((item) => {
      if (!item || typeof item !== "object") return false;

      if (!validHeaders.has(item.originalHeader)) return false;

      if (!allowedFields.includes(item.suggestedField)) return false;

      if (usedFields.has(item.suggestedField)) return false;

      if (
        typeof item.confidence !== "number" ||
        item.confidence < 0 ||
        item.confidence > 1
      ) {
        return false;
      }

      usedFields.add(item.suggestedField);
      return true;
    })
    .map((item) => ({
      originalHeader: item.originalHeader,
      suggestedField: item.suggestedField,
      confidence: item.confidence,
      reason:
        typeof item.reason === "string"
          ? item.reason.slice(0, 300)
          : "AI suggested this mapping based on the column header.",
      approved: false,
    }));

  // If AI produced no matches, fall back to heuristic matches
  if (suggestions.length === 0) {
    return getHeuristicMappings(uniqueHeaders, importType, allowedFields);
  }

  return {
    importType,
    suggestions,
    requiresHumanApproval: true,
  };
}
