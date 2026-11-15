// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    plugins: [
      {
        name: "escape-nitro-polyfill-paths",
        enforce: "pre",
        transform(code: string, id: string) {
          if (id.includes("nitro") && id.includes("polyfills")) {
            return code.replaceAll(process.cwd(), process.cwd().replaceAll("'", "\\'"));
          }
          return null;
        },
      },
    ],
  },
  tanstackStart: {
    // The router splitter embeds absolute paths in single-quoted imports.
    // Keep this small app in one route bundle so folders with apostrophes build safely.
    router: { codeSplittingOptions: { defaultBehavior: [] } },
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
