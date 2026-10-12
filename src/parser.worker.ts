import { parseFromTokenizer } from "music-metadata";
import { fromBlob } from "strtok3";
self.onmessage = async ({ data }: MessageEvent<{ file: File }>) => {
  try {
    // Preserve the filename for formats browsers do not supply a MIME type for.
    const tokenizer = fromBlob(data.file, {
      fileInfo: { path: data.file.name },
    });
    try {
      const metadata = await parseFromTokenizer(tokenizer, {
        duration: true,
        includeChapters: true,
      });
      self.postMessage({ metadata });
    } finally {
      await tokenizer.close();
    }
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
