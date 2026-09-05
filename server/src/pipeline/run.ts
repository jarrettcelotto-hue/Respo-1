import path from "node:path";
import fs from "node:fs/promises";
import { prisma } from "../lib/prisma";
import { decrypt } from "../lib/crypto";
import { generateScript } from "./script";
import { fetchSceneImage, sceneImagePath } from "./imagery";
import { synthesizeNarration, getMediaDuration } from "./tts";
import { assembleVideo } from "./assemble";
import { uploadVideo } from "./youtube";

const MIN_SCENE_SEC = 1.5;

/**
 * Runs the full script -> images -> narration -> assemble -> upload pipeline
 * for one VideoJob, updating its status as it goes so the mobile app can
 * show live progress. Called by the BullMQ worker (see src/worker.ts).
 */
export async function runVideoPipeline(videoJobId: string): Promise<void> {
  const videoJob = await prisma.videoJob.findUniqueOrThrow({
    where: { id: videoJobId },
    include: { channel: true },
  });

  if (videoJob.status === "POSTED") return; // already succeeded, nothing to retry

  const { channel } = videoJob;
  if (!channel.isActive) {
    await prisma.videoJob.update({
      where: { id: videoJobId },
      data: { status: "FAILED", errorMessage: "Channel is paused" },
    });
    return;
  }
  if (!channel.youtubeRefreshTokenEnc) {
    await prisma.videoJob.update({
      where: { id: videoJobId },
      data: { status: "FAILED", errorMessage: "YouTube is not connected for this channel" },
    });
    return;
  }

  const tmpDir = path.join(process.cwd(), "tmp", videoJobId);
  await fs.mkdir(tmpDir, { recursive: true });

  try {
    await prisma.videoJob.update({ where: { id: videoJobId }, data: { status: "SCRIPTING" } });
    const script = await generateScript(channel);
    await prisma.videoJob.update({
      where: { id: videoJobId },
      data: {
        status: "SOURCING_IMAGES",
        title: script.title,
        description: script.description,
        script,
      },
    });

    const imagePaths: string[] = [];
    for (let i = 0; i < script.scenes.length; i++) {
      const imgPath = sceneImagePath(tmpDir, i);
      await fetchSceneImage(script.scenes[i].imageQuery, imgPath);
      imagePaths.push(imgPath);
    }

    await prisma.videoJob.update({ where: { id: videoJobId }, data: { status: "NARRATING" } });
    const narrationPath = path.join(tmpDir, "narration.mp3");
    const fullNarration = script.scenes.map((s) => s.narration).join(" ");
    await synthesizeNarration(fullNarration, narrationPath);
    const totalDuration = await getMediaDuration(narrationPath);

    // Split screen time across scenes proportional to how many words of
    // narration each one carries, so images change roughly in step with speech.
    const wordCounts = script.scenes.map((s) => s.narration.split(/\s+/).filter(Boolean).length || 1);
    const totalWords = wordCounts.reduce((a, b) => a + b, 0);
    let durations = wordCounts.map((w) => Math.max(MIN_SCENE_SEC, (w / totalWords) * totalDuration));
    const scale = totalDuration / durations.reduce((a, b) => a + b, 0);
    durations = durations.map((d) => d * scale);

    await prisma.videoJob.update({ where: { id: videoJobId }, data: { status: "ASSEMBLING" } });
    const scenes = imagePaths.map((imagePath, i) => ({ imagePath, durationSec: durations[i] }));
    const videoPath = path.join(tmpDir, "output.mp4");
    await assembleVideo(scenes, narrationPath, videoPath);

    await prisma.videoJob.update({ where: { id: videoJobId }, data: { status: "UPLOADING" } });
    const refreshToken = decrypt(channel.youtubeRefreshTokenEnc);
    const upload = await uploadVideo(refreshToken, videoPath, {
      title: script.title,
      description: script.description,
      tags: script.tags,
    });

    await prisma.videoJob.update({
      where: { id: videoJobId },
      data: {
        status: "POSTED",
        youtubeVideoId: upload.videoId,
        youtubeUrl: upload.url,
        thumbnailUrl: `https://i.ytimg.com/vi/${upload.videoId}/hqdefault.jpg`,
      },
    });
  } catch (err) {
    await prisma.videoJob.update({
      where: { id: videoJobId },
      data: { status: "FAILED", errorMessage: err instanceof Error ? err.message : String(err) },
    });
    throw err; // let BullMQ record/retry the failed attempt
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}
