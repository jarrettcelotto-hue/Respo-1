import express from "express";
import cors from "cors";
import { env } from "./env";
import { authRouter } from "./routes/auth";
import { channelsRouter } from "./routes/channels";
import { youtubeRouter } from "./routes/youtube";
import { videosRouter } from "./routes/videos";

const app = express();
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/channels", channelsRouter);
app.use("/youtube", youtubeRouter);
app.use("/", videosRouter); // mounts /channels/:channelId/videos and /videos/:id

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
});

app.listen(env.port, () => {
  console.log(`[server] listening on http://localhost:${env.port}`);
});
