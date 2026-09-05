import { prisma } from "../lib/prisma";

/**
 * Approximate scheduling: the worker's scheduler-tick job runs every 15
 * minutes (see queue/videoQueue.ts) and calls this to find channels whose
 * configured posting hour (UTC) is the current hour, and whose last video
 * is old enough that a new one is due. Good enough for "post roughly once a
 * day around 3pm UTC" -- not meant for minute-level precision.
 */
export async function findDueChannelIds(): Promise<string[]> {
  const now = new Date();
  const currentHourUtc = now.getUTCHours();

  const channels = await prisma.channel.findMany({
    where: {
      isActive: true,
      youtubeRefreshTokenEnc: { not: null },
      postingHourUtc: currentHourUtc,
    },
    include: {
      videos: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const due: string[] = [];
  for (const channel of channels) {
    const lastVideo = channel.videos[0];
    if (!lastVideo) {
      due.push(channel.id); // never posted yet -> due immediately
      continue;
    }
    const msSinceLast = now.getTime() - lastVideo.createdAt.getTime();
    const intervalMs = channel.postingEveryDays * 24 * 60 * 60 * 1000;
    if (msSinceLast >= intervalMs) {
      due.push(channel.id);
    }
  }
  return due;
}
