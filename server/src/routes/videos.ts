import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../lib/auth";
import { paramId } from "../lib/http";

export const videosRouter = Router();
videosRouter.use(requireAuth);

videosRouter.get("/channels/:channelId/videos", async (req: AuthedRequest, res) => {
  const channel = await prisma.channel.findUnique({ where: { id: paramId(req, "channelId") } });
  if (!channel || channel.userId !== req.userId) {
    return res.status(404).json({ error: "Channel not found" });
  }
  const videos = await prisma.videoJob.findMany({
    where: { channelId: channel.id },
    orderBy: { createdAt: "desc" },
  });
  res.json({ videos });
});

videosRouter.get("/videos/:id", async (req: AuthedRequest, res) => {
  const video = await prisma.videoJob.findUnique({
    where: { id: paramId(req, "id") },
    include: { channel: true },
  });
  if (!video || video.channel.userId !== req.userId) {
    return res.status(404).json({ error: "Video not found" });
  }
  res.json({ video });
});
