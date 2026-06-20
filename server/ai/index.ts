import type { PlanInput, PlanResponse } from "./types";

export type AIProvider = "gemini" | "claude" | "openai";

const PROVIDER_KEY_MAP: Record<AIProvider, string> = {
  gemini: "GEMINI_API_KEY",
  claude: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
};

/**
 * Validates that AI_PROVIDER is set to a supported value and the
 * corresponding API key is present. Call this during server startup.
 * Throws a descriptive error if misconfigured.
 */
export function validateAIConfig(): void {
  const provider = (process.env.AI_PROVIDER ?? "gemini") as AIProvider;

  if (!Object.keys(PROVIDER_KEY_MAP).includes(provider)) {
    throw new Error(
      `Invalid AI_PROVIDER "${provider}". Must be one of: gemini, claude, openai.`
    );
  }

  const keyName = PROVIDER_KEY_MAP[provider];
  if (!process.env[keyName]) {
    throw new Error(
      `AI_PROVIDER is set to "${provider}" but ${keyName} is not set in the environment.`
    );
  }
}

/**
 * Generates a training plan using the configured AI provider.
 * Delegates to the appropriate provider adapter based on AI_PROVIDER env var.
 */
export async function generateTrainingPlan(input: PlanInput): Promise<PlanResponse> {
  const provider = (process.env.AI_PROVIDER ?? "gemini") as AIProvider;

  switch (provider) {
    case "gemini": {
      const { generateWithGemini } = await import("./providers/gemini");
      return generateWithGemini(input);
    }
    case "claude": {
      const { generateWithClaude } = await import("./providers/claude");
      return generateWithClaude(input);
    }
    case "openai": {
      const { generateWithOpenAI } = await import("./providers/openai");
      return generateWithOpenAI(input);
    }
  }
}

export type { PlanInput, PlanResponse } from "./types";
