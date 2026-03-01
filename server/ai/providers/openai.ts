import OpenAI from "openai";
import { SYSTEM_PROMPT, buildPlanPrompt } from "../prompt";
import { planResponseSchema, type PlanInput, type PlanResponse } from "../types";

export async function generateWithOpenAI(input: PlanInput): Promise<PlanResponse> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildPlanPrompt(input) },
    ],
  });

  const text = completion.choices[0]?.message?.content;
  if (!text) throw new Error("Empty response from OpenAI");

  const parsed = JSON.parse(text);
  return planResponseSchema.parse(parsed);
}
