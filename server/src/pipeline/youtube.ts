import fs from "node:fs";
import { google } from "googleapis";
import { env } from "../env";

export const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
];

function assertConfigured() {
  if (!env.googleClientId || !env.googleClientSecret || !env.googleRedirectUri) {
    throw new Error(
      "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI are not set. " +
        "Create an OAuth client (Web application type) in Google Cloud Console with the " +
        "YouTube Data API v3 enabled, and add the values to server/.env."
    );
  }
}

function newOAuthClient() {
  assertConfigured();
  return new google.auth.OAuth2(env.googleClientId, env.googleClientSecret, env.googleRedirectUri);
}

/** Builds the Google consent screen URL. `state` round-trips channelId+userId through the callback. */
export function getYoutubeAuthUrl(state: string): string {
  const client = newOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // forces a refresh_token even on repeat connects
    scope: YOUTUBE_SCOPES,
    state,
  });
}

export async function exchangeCodeForRefreshToken(code: string): Promise<string> {
  const client = newOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      "Google did not return a refresh token. Disconnect this app's access at " +
        "https://myaccount.google.com/permissions and reconnect so Google issues a fresh one."
    );
  }
  return tokens.refresh_token;
}

function clientWithRefreshToken(refreshToken: string) {
  const client = newOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

/** Fetches the connected channel's id/title so the app can display "Connected as ...". */
export async function fetchConnectedChannel(refreshToken: string) {
  const auth = clientWithRefreshToken(refreshToken);
  const youtube = google.youtube({ version: "v3", auth });
  const res = await youtube.channels.list({ part: ["snippet"], mine: true });
  const channel = res.data.items?.[0];
  if (!channel) throw new Error("No YouTube channel found for this Google account");
  return { id: channel.id!, title: channel.snippet?.title ?? "Untitled channel" };
}

export interface UploadMeta {
  title: string;
  description: string;
  tags: string[];
}

/** Uploads a finished video file to the connected YouTube channel. */
export async function uploadVideo(
  refreshToken: string,
  filePath: string,
  meta: UploadMeta
): Promise<{ videoId: string; url: string }> {
  const auth = clientWithRefreshToken(refreshToken);
  const youtube = google.youtube({ version: "v3", auth });

  const res = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: meta.title.slice(0, 100),
        description: meta.description,
        tags: meta.tags,
      },
      status: {
        privacyStatus: "public",
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: fs.createReadStream(filePath),
    },
  });

  const videoId = res.data.id;
  if (!videoId) throw new Error("YouTube upload succeeded but returned no video id");
  return { videoId, url: `https://www.youtube.com/watch?v=${videoId}` };
}
