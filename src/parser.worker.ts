import { parseBlob } from "music-metadata";
self.onmessage = async ({ data }: MessageEvent<{ file: File }>) => {
  try {
    const metadata = await parseBlob(data.file, {
      duration: true,
      includeChapters: true,
    });
    self.postMessage({ metadata });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
