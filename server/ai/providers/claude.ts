import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, buildPlanPrompt } from "../prompt";
import { planResponseSchema, type PlanInput, type PlanResponse } from "../types";

export async function generateWithClaude(input: PlanInput): Promise<PlanResponse> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    temperature: 0.4,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildPlanPrompt(input) }],
  });

  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type from Claude");

  // Claude may wrap JSON in markdown fences — strip them if present
  const text = block.text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  const parsed = JSON.parse(text);
  return planResponseSchema.parse(parsed);
}
