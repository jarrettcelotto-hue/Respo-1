// ffmpeg-static and ffprobe-static ship no type declarations; they each
// just default-export a filesystem path to the platform binary.
declare module "ffmpeg-static" {
  const path: string;
  export default path;
}

declare module "ffprobe-static" {
  const paths: { path: string };
  export default paths;
}
