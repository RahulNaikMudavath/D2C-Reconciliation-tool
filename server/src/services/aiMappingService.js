import { generateAIResponse } from "./geminiService.js";

const ALLOWED_FIELDS = [
  "orderNumber",
  "settlementReference",
  "amount",
  "transactionDate",
  "paymentMode",
  "status",
];

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
};

function getHeuristicMappings(headers, importType) {
  const usedFields = new Set();
  const suggestions = [];

  for (const header of headers) {
    const normalized = String(header)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (usedFields.has(field)) continue;

      const isMatch = aliases.some(
        (alias) =>
          normalized === alias ||
          normalized.includes(alias) ||
          alias.includes(normalized)
      );

      if (isMatch) {
        usedFields.add(field);
        suggestions.push({
          originalHeader: header,
          suggestedField: field,
          confidence: 0.95,
          reason: `Matched standard ${field} alias based on header pattern.`,
          approved: false,
        });
        break;
      }
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

  const prompt = `
You are a data-mapping assistant for ReconcileX, a financial reconciliation platform.

Your task is to suggest mappings between uploaded spreadsheet headers and standard fields.

Import type: ${importType}

Uploaded headers:
${JSON.stringify(uniqueHeaders)}

Allowed standard fields:
${JSON.stringify(ALLOWED_FIELDS)}

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
    return getHeuristicMappings(uniqueHeaders, importType);
  }

  let parsed;

  try {
    const cleanedResponse = responseText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    parsed = JSON.parse(cleanedResponse);
  } catch {
    return getHeuristicMappings(uniqueHeaders, importType);
  }

  if (!Array.isArray(parsed?.suggestions)) {
    return getHeuristicMappings(uniqueHeaders, importType);
  }

  const usedFields = new Set();
  const validHeaders = new Set(uniqueHeaders);

  const suggestions = parsed.suggestions
    .filter((item) => {
      if (!item || typeof item !== "object") return false;

      if (!validHeaders.has(item.originalHeader)) return false;

      if (!ALLOWED_FIELDS.includes(item.suggestedField)) return false;

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
    return getHeuristicMappings(uniqueHeaders, importType);
  }

  return {
    importType,
    suggestions,
    requiresHumanApproval: true,
  };
}
