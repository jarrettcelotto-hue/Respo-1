import { Queue } from "bullmq";
import { redisConnection } from "./connection";
import { prisma } from "../lib/prisma";

export const VIDEO_QUEUE_NAME = "video-pipeline";
export const videoQueue = new Queue(VIDEO_QUEUE_NAME, { connection: redisConnection });

export const SCHEDULER_TICK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Registers the recurring "scheduler-tick" job that decides, every 15
 * minutes, which channels are due for a new video. Safe to call on every
 * server/worker boot -- BullMQ dedupes a repeatable job with the same
 * jobId + repeat options.
 */
export async function initScheduler() {
  await videoQueue.upsertJobScheduler(
    "scheduler-tick",
    { every: SCHEDULER_TICK_INTERVAL_MS },
    {
      name: "scheduler-tick",
      opts: { removeOnComplete: true, removeOnFail: true },
    }
  );
}

/**
 * Creates a VideoJob row (status QUEUED) and enqueues the pipeline job for
 * it. Used both by the scheduler tick and by the mobile app's manual
 * "generate now" button.
 */
export async function enqueueGenerateVideo(channelId: string) {
  const videoJob = await prisma.videoJob.create({
    data: { channelId, status: "QUEUED" },
  });
  await videoQueue.add(
    "generate-video",
    { videoJobId: videoJob.id },
    {
      jobId: videoJob.id,
      attempts: 2,
      backoff: { type: "exponential", delay: 15_000 },
      removeOnComplete: true,
      removeOnFail: false,
    }
  );
  return videoJob;
}
