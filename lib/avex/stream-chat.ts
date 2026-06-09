import OpenAI from "openai";

const DEFAULT_MODEL = "openai/gpt-4o-mini";
const STREAM_TIMEOUT_MS = 15_000;

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return null;

  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "TagMe AVEX",
    },
  });
}

/**
 * Streams chat completion tokens from OpenRouter (InsForge Model Gateway).
 */
export async function* streamAvexChat(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string,
): AsyncGenerator<string, void, unknown> {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error("OPENROUTER_NOT_CONFIGURED");
  }

  const model = process.env.OPENROUTER_CHAT_MODEL?.trim() || DEFAULT_MODEL;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);

  try {
    const stream = await client.chat.completions.create(
      {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...history.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: userMessage },
        ],
        max_tokens: 500,
        temperature: 0.4,
        stream: true,
      },
      { signal: controller.signal },
    );

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) {
        yield token;
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("AVEX_TIMEOUT");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function isOpenRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}