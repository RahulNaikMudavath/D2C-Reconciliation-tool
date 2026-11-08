import { GoogleGenAI } from "@google/genai";

let aiClient;

function getAIClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing from environment variables.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export async function generateAIResponse(prompt) {
  const ai = getAIClient();
  const models = [
    process.env.GEMINI_MODEL,
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
  ].filter(Boolean);

  let lastError;

  for (const model of models) {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Gemini API request timed out.")), 10000)
      );

      const response = await Promise.race([
        ai.models.generateContent({
          model,
          contents: prompt,
        }),
        timeoutPromise,
      ]);

      if (response && response.text) {
        return response.text;
      }
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error("Failed to generate AI response.");
}
