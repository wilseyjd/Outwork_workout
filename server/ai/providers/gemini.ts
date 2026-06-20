import { GoogleGenerativeAI } from "@google/generative-ai";
import { SYSTEM_PROMPT, buildPlanPrompt } from "../prompt";
import { planResponseSchema, type PlanInput, type PlanResponse } from "../types";

export async function generateWithGemini(input: PlanInput): Promise<PlanResponse> {
  const apiKey = process.env.GEMINI_API_KEY!;
  const client = new GoogleGenerativeAI(apiKey);

  const model = client.getGenerativeModel({
    model: "gemini-3.1-pro-preview",
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.4,
    },
  });

  const result = await model.generateContent(buildPlanPrompt(input));
  const text = result.response.text();

  const parsed = JSON.parse(text);
  return planResponseSchema.parse(parsed);
}
