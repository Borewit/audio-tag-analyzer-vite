import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import musicMetadataPackage from "./node_modules/music-metadata/package.json" with { type: "json" };
export default defineConfig({
  plugins: [react()],
  worker: { format: "es" },
  define: {
    __MUSIC_METADATA_VERSION__: JSON.stringify(musicMetadataPackage.version),
  },
});
