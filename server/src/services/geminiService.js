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
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Gemini API request timed out.")), 3000)
  );

  const response = await Promise.race([
    ai.models.generateContent({
      model,
      contents: prompt,
    }),
    timeoutPromise,
  ]);

  return response.text;
}
