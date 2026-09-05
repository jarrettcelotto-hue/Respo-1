import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "../env";
import type { Channel } from "@prisma/client";

const ScriptSchema = z.object({
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  scenes: z
    .array(
      z.object({
        narration: z.string(),
        // A short phrase used to search stock imagery for this scene.
        imageQuery: z.string(),
      })
    )
    .min(1),
});

export type GeneratedScript = z.infer<typeof ScriptSchema>;

const EMIT_SCRIPT_TOOL = {
  name: "emit_script",
  description: "Emit the finished video script as structured data.",
  input_schema: {
    type: "object" as const,
    properties: {
      title: { type: "string", description: "Catchy, click-worthy YouTube title (under 100 chars)." },
      description: { type: "string", description: "YouTube video description, 2-4 sentences plus relevant hashtags." },
      tags: { type: "array", items: { type: "string" }, description: "5-15 relevant YouTube search tags." },
      scenes: {
        type: "array",
        description: "Ordered scenes that make up the video's narration.",
        items: {
          type: "object",
          properties: {
            narration: { type: "string", description: "What the narrator says during this scene." },
            imageQuery: { type: "string", description: "A short, concrete phrase to search stock photo/video sites for a fitting visual." },
          },
          required: ["narration", "imageQuery"],
        },
      },
    },
    required: ["title", "description", "tags", "scenes"],
  },
};

function assertConfigured() {
  if (!env.anthropicApiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Get one at https://console.anthropic.com and add it to server/.env"
    );
  }
}

/**
 * Uses Claude to write a full video script (title/description/tags + a
 * scene-by-scene narration) sized to the channel's configured length, niche,
 * and style. Forces structured output via tool use so we don't have to
 * hand-parse free text.
 */
export async function generateScript(channel: Channel): Promise<GeneratedScript> {
  assertConfigured();
  const client = new Anthropic({ apiKey: env.anthropicApiKey });

  // Rough pacing: ~2.3 spoken words/sec, ~12s of screen time per scene.
  const targetWords = Math.round(channel.videoLengthSec * 2.3);
  const targetScenes = Math.max(3, Math.round(channel.videoLengthSec / 12));

  const prompt = `You are writing the script for a short-form YouTube video for an automated channel.

Channel niche / content brief: ${channel.niche}
Tone/style: ${channel.style}
Target length: about ${channel.videoLengthSec} seconds of narration (~${targetWords} words total)
Structure the narration into about ${targetScenes} scenes, each a self-contained beat that a single still image can illustrate.

Write the full script now.`;

  const response = await client.messages.create({
    model: env.anthropicModel,
    max_tokens: 2000,
    tools: [EMIT_SCRIPT_TOOL],
    tool_choice: { type: "tool", name: "emit_script" },
    messages: [{ role: "user", content: prompt }],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return a structured script (no tool_use block)");
  }

  return ScriptSchema.parse(toolUse.input);
}
