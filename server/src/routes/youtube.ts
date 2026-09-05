import { Router } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { encrypt } from "../lib/crypto";
import { env } from "../env";
import { requireAuth, AuthedRequest } from "../lib/auth";
import { paramId } from "../lib/http";
import { getYoutubeAuthUrl, exchangeCodeForRefreshToken, fetchConnectedChannel } from "../pipeline/youtube";

export const youtubeRouter = Router();

interface OAuthStatePayload {
  purpose: "youtube-oauth";
  userId: string;
  channelId: string;
}

// Step 1 (app, authenticated): ask for the Google consent URL to open.
youtubeRouter.get("/connect/:channelId", requireAuth, async (req: AuthedRequest, res) => {
  const channel = await prisma.channel.findUnique({ where: { id: paramId(req, "channelId") } });
  if (!channel || channel.userId !== req.userId) {
    return res.status(404).json({ error: "Channel not found" });
  }

  const state = jwt.sign(
    { purpose: "youtube-oauth", userId: req.userId, channelId: channel.id } satisfies OAuthStatePayload,
    env.jwtSecret,
    { expiresIn: "15m" }
  );

  try {
    res.json({ authUrl: getYoutubeAuthUrl(state) });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to build auth URL" });
  }
});

// Step 2 (Google redirects the browser here directly -- no app auth header available).
youtubeRouter.get("/callback", async (req, res) => {
  const { code, state, error } = req.query as Record<string, string | undefined>;

  if (error) {
    return res.status(400).send(renderResult(false, `Google said: ${error}`));
  }
  if (!code || !state) {
    return res.status(400).send(renderResult(false, "Missing code/state from Google redirect"));
  }

  let payload: OAuthStatePayload;
  try {
    payload = jwt.verify(state, env.jwtSecret) as OAuthStatePayload;
  } catch {
    return res.status(400).send(renderResult(false, "This connection link expired. Please try again from the app."));
  }

  try {
    const refreshToken = await exchangeCodeForRefreshToken(code);
    const ytChannel = await fetchConnectedChannel(refreshToken);

    await prisma.channel.update({
      where: { id: payload.channelId },
      data: {
        youtubeRefreshTokenEnc: encrypt(refreshToken),
        youtubeChannelId: ytChannel.id,
        youtubeChannelTitle: ytChannel.title,
        youtubeConnectedAt: new Date(),
      },
    });

    res.send(renderResult(true, `Connected to "${ytChannel.title}". You can close this window and return to the app.`));
  } catch (err) {
    res.status(500).send(renderResult(false, err instanceof Error ? err.message : "Unknown error"));
  }
});

youtubeRouter.delete("/:channelId", requireAuth, async (req: AuthedRequest, res) => {
  const channel = await prisma.channel.findUnique({ where: { id: paramId(req, "channelId") } });
  if (!channel || channel.userId !== req.userId) {
    return res.status(404).json({ error: "Channel not found" });
  }
  await prisma.channel.update({
    where: { id: channel.id },
    data: {
      youtubeRefreshTokenEnc: null,
      youtubeChannelId: null,
      youtubeChannelTitle: null,
      youtubeConnectedAt: null,
    },
  });
  res.status(204).send();
});

function renderResult(success: boolean, message: string): string {
  return `<!doctype html><html><body style="font-family:system-ui;padding:2rem;text-align:center;">
    <h2>${success ? "✅ YouTube connected" : "❌ Connection failed"}</h2>
    <p>${message}</p>
  </body></html>`;
}
