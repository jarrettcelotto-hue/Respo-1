import { Worker, Job } from "bullmq";
import { redisConnection } from "./queue/connection";
import { VIDEO_QUEUE_NAME, enqueueGenerateVideo, initScheduler } from "./queue/videoQueue";
import { findDueChannelIds } from "./pipeline/dueChannels";
import { runVideoPipeline } from "./pipeline/run";

async function processJob(job: Job) {
  if (job.name === "scheduler-tick") {
    const dueChannelIds = await findDueChannelIds();
    for (const channelId of dueChannelIds) {
      await enqueueGenerateVideo(channelId);
    }
    return;
  }

  if (job.name === "generate-video") {
    const { videoJobId } = job.data as { videoJobId: string };
    await runVideoPipeline(videoJobId);
    return;
  }

  throw new Error(`Unknown job name: ${job.name}`);
}

async function main() {
  await initScheduler();

  const worker = new Worker(VIDEO_QUEUE_NAME, processJob, {
    connection: redisConnection,
    concurrency: 2, // video assembly is CPU/IO heavy; keep this modest
  });

  worker.on("completed", (job) => {
    console.log(`[worker] job ${job.id} (${job.name}) completed`);
  });
  worker.on("failed", (job, err) => {
    console.error(`[worker] job ${job?.id} (${job?.name}) failed:`, err.message);
  });

  console.log("[worker] listening for video-pipeline jobs");
}

main().catch((err) => {
  console.error("[worker] fatal error", err);
  process.exit(1);
});
