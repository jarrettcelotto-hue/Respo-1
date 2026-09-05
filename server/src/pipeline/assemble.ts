import ffmpeg from "./ffmpegSetup";

export interface SceneAsset {
  imagePath: string;
  durationSec: number;
}

const FPS = 30;
const WIDTH = 1280;
const HEIGHT = 720;

/**
 * Assembles a slideshow-style video: each scene image gets a slow Ken Burns
 * zoom for its computed duration, the scenes are concatenated in order, and
 * the narration track is muxed in as the single audio stream.
 *
 * Extension points for later: mix in a background music bed at low volume,
 * burn in captions from the script, add crossfade transitions between scenes.
 */
export async function assembleVideo(
  scenes: SceneAsset[],
  narrationPath: string,
  outPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg();

    for (const scene of scenes) {
      cmd.input(scene.imagePath).inputOptions([
        "-loop 1",
        `-t ${scene.durationSec.toFixed(2)}`,
        `-framerate ${FPS}`,
      ]);
    }
    const narrationInputIndex = scenes.length;
    cmd.input(narrationPath);

    const filterParts: string[] = [];
    scenes.forEach((scene, i) => {
      const frames = Math.max(1, Math.round(scene.durationSec * FPS));
      filterParts.push(
        `[${i}:v]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,` +
          `crop=${WIDTH}:${HEIGHT},` +
          `zoompan=z='min(zoom+0.0012,1.15)':d=${frames}:s=${WIDTH}x${HEIGHT}:fps=${FPS},` +
          `setsar=1[v${i}]`
      );
    });
    const concatInputs = scenes.map((_, i) => `[v${i}]`).join("");
    filterParts.push(`${concatInputs}concat=n=${scenes.length}:v=1:a=0[vout]`);

    cmd
      .complexFilter(filterParts, "vout")
      .outputOptions([`-map ${narrationInputIndex}:a`, "-c:v libx264", "-pix_fmt yuv420p", "-c:a aac", "-shortest"])
      .output(outPath)
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .run();
  });
}
