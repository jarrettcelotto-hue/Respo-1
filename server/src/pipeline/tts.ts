import axios from "axios";
import fs from "node:fs";
import { env } from "../env";
import ffmpeg from "./ffmpegSetup";

function assertConfigured() {
  if (!env.elevenLabsApiKey) {
    throw new Error(
      "ELEVENLABS_API_KEY is not set. Get a key at https://elevenlabs.io and add it to server/.env " +
        "(swap this provider out in src/pipeline/tts.ts if you'd rather use a different TTS API)."
    );
  }
}

/** Renders narration audio for the given text and writes it to outPath (mp3). */
export async function synthesizeNarration(text: string, outPath: string): Promise<void> {
  assertConfigured();

  const response = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${env.elevenLabsVoiceId}`,
    {
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.4, similarity_boost: 0.75 },
    },
    {
      headers: {
        "xi-api-key": env.elevenLabsApiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      responseType: "stream",
    }
  );

  const writer = fs.createWriteStream(outPath);
  await new Promise<void>((resolve, reject) => {
    response.data.pipe(writer);
    writer.on("finish", () => resolve());
    writer.on("error", reject);
  });
}

/** Returns the duration (seconds) of an audio/video file via ffprobe. */
export function getMediaDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);
      resolve(data.format.duration ?? 0);
    });
  });
}
