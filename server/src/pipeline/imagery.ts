import axios from "axios";
import fs from "node:fs";
import path from "node:path";
import { env } from "../env";

function assertConfigured() {
  if (!env.pexelsApiKey) {
    throw new Error(
      "PEXELS_API_KEY is not set. Get a free key at https://www.pexels.com/api and add it to server/.env"
    );
  }
}

/**
 * Searches Pexels stock photos for a scene's imageQuery and downloads the
 * top match to disk. This is the MVP visual source -- swap in an AI image
 * generation provider later by giving it the same signature.
 */
export async function fetchSceneImage(query: string, outPath: string): Promise<void> {
  assertConfigured();

  const search = async (q: string) =>
    axios.get("https://api.pexels.com/v1/search", {
      headers: { Authorization: env.pexelsApiKey! },
      params: { query: q, per_page: 5, orientation: "landscape" },
    });

  let res = await search(query);
  let photo = res.data.photos?.[0];

  if (!photo) {
    // Fall back to a broader query so a pipeline run never fails purely
    // because a very specific search phrase had no stock matches.
    res = await search(query.split(" ").slice(0, 2).join(" ") || "abstract background");
    photo = res.data.photos?.[0];
  }

  if (!photo) {
    throw new Error(`No stock image found for query "${query}" (even after fallback)`);
  }

  const imageUrl: string = photo.src.large2x || photo.src.large || photo.src.original;
  const writer = fs.createWriteStream(outPath);
  const response = await axios.get(imageUrl, { responseType: "stream" });
  await new Promise<void>((resolve, reject) => {
    response.data.pipe(writer);
    writer.on("finish", () => resolve());
    writer.on("error", reject);
  });
}

export function sceneImagePath(tmpDir: string, index: number): string {
  return path.join(tmpDir, `scene-${index}.jpg`);
}
