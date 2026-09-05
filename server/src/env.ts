import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env var ${name}. See .env.example.`);
  }
  return v;
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined;
}

/**
 * Core config needed just to boot the API/worker process.
 * Third-party provider keys (Anthropic, Pexels, ElevenLabs, Google OAuth) are
 * read lazily by the service that needs them, so the server can boot and the
 * app can be wired up before every provider key exists -- see each service's
 * `assertConfigured()`-style check for the exact error you'll get if a key
 * is missing when a pipeline step actually runs.
 */
export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),

  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get redisUrl() {
    return process.env.REDIS_URL || "redis://localhost:6379";
  },
  get jwtSecret() {
    return required("JWT_SECRET");
  },
  get encryptionKey() {
    return required("ENCRYPTION_KEY");
  },

  anthropicApiKey: optional("ANTHROPIC_API_KEY"),
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",

  pexelsApiKey: optional("PEXELS_API_KEY"),

  elevenLabsApiKey: optional("ELEVENLABS_API_KEY"),
  elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM",

  googleClientId: optional("GOOGLE_CLIENT_ID"),
  googleClientSecret: optional("GOOGLE_CLIENT_SECRET"),
  googleRedirectUri: optional("GOOGLE_REDIRECT_URI"),

  publicServerUrl: process.env.PUBLIC_SERVER_URL || "http://localhost:4000",
  corsOrigin: process.env.CORS_ORIGIN || "*",
};
