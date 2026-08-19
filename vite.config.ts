import { defineConfig } from "vite";

export default defineConfig({
  base: "/manos/",
  server: { port: 3004, strictPort: true },
  build: {
    assetsInlineLimit(filePath) {
      // Small assets are normally inlined as data: URLs, but an AudioWorklet
      // has to be fetched from a real URL — and the production CSP only allows
      // scripts from this origin, so a data: URL would be blocked outright.
      // Returning false keeps this one as a file; undefined leaves the rest
      // to Vite's usual rule.
      if (filePath.endsWith("recorder-processor.js")) return false;
      return undefined;
    },
  },
});
