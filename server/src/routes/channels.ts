import { Router } from "express";
import { z } from "zod";
import type { Channel } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../lib/auth";
import { paramId } from "../lib/http";
import { enqueueGenerateVideo } from "../queue/videoQueue";

export const channelsRouter = Router();
channelsRouter.use(requireAuth);

function serializeChannel(channel: Channel) {
  const { youtubeRefreshTokenEnc, ...rest } = channel;
  return { ...rest, youtubeConnected: Boolean(youtubeRefreshTokenEnc) };
}

async function loadOwnedChannel(channelId: string, userId: string) {
  const channel = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!channel || channel.userId !== userId) return null;
  return channel;
}

const ChannelInputSchema = z.object({
  label: z.string().min(1).max(100),
  niche: z.string().min(1).max(2000),
  videoLengthSec: z.number().int().min(15).max(1200),
  style: z.string().min(1).max(200),
  postingEveryDays: z.number().int().min(1).max(30),
  postingHourUtc: z.number().int().min(0).max(23),
});

channelsRouter.get("/", async (req: AuthedRequest, res) => {
  const channels = await prisma.channel.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: "asc" },
  });
  res.json({ channels: channels.map(serializeChannel) });
});

channelsRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = ChannelInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }
  const channel = await prisma.channel.create({ data: { ...parsed.data, userId: req.userId! } });
  res.status(201).json({ channel: serializeChannel(channel) });
});

channelsRouter.get("/:id", async (req: AuthedRequest, res) => {
  const channel = await loadOwnedChannel(paramId(req, "id"), req.userId!);
  if (!channel) return res.status(404).json({ error: "Channel not found" });
  res.json({ channel: serializeChannel(channel) });
});

channelsRouter.patch("/:id", async (req: AuthedRequest, res) => {
  const channel = await loadOwnedChannel(paramId(req, "id"), req.userId!);
  if (!channel) return res.status(404).json({ error: "Channel not found" });

  const parsed = ChannelInputSchema.partial().extend({ isActive: z.boolean().optional() }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }
  const updated = await prisma.channel.update({ where: { id: channel.id }, data: parsed.data });
  res.json({ channel: serializeChannel(updated) });
});

channelsRouter.delete("/:id", async (req: AuthedRequest, res) => {
  const channel = await loadOwnedChannel(paramId(req, "id"), req.userId!);
  if (!channel) return res.status(404).json({ error: "Channel not found" });
  await prisma.videoJob.deleteMany({ where: { channelId: channel.id } });
  await prisma.channel.delete({ where: { id: channel.id } });
  res.status(204).send();
});

channelsRouter.post("/:id/generate-now", async (req: AuthedRequest, res) => {
  const channel = await loadOwnedChannel(paramId(req, "id"), req.userId!);
  if (!channel) return res.status(404).json({ error: "Channel not found" });
  if (!channel.youtubeRefreshTokenEnc) {
    return res.status(400).json({ error: "Connect YouTube before generating a video" });
  }
  const videoJob = await enqueueGenerateVideo(channel.id);
  res.status(202).json({ videoJob });
});
