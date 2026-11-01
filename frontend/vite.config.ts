import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

const versionFilePath = path.resolve(__dirname, "../VERSION");
const appVersion = fs.readFileSync(versionFilePath, "utf8").trim();
if (
  !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(appVersion)
) {
  throw new Error(`Invalid VERSION: ${JSON.stringify(appVersion)}`);
}
// Package exports may hide package.json, so read the installed manifest from disk.
const editorManifestPath = path.resolve(
  __dirname,
  "node_modules/@excalidraw/excalidraw/package.json",
);
const editorVersion = JSON.parse(
  fs.readFileSync(editorManifestPath, "utf8"),
).version;
if (typeof editorVersion !== "string" || editorVersion === "") {
  throw new Error(`Invalid Excalidraw version in ${editorManifestPath}`);
}
const buildLabel =
  process.env.VITE_APP_BUILD_LABEL?.trim() || "local development build";

export default defineConfig(({ command }) => {
  const nodeEnv =
    process.env.NODE_ENV ||
    (command === "build" ? "production" : "development");
  const devBackendTarget =
    process.env.VITE_DEV_BACKEND_URL?.trim() || "http://localhost:8000";
  const processEnvDefines = {
    "process.env.IS_PREACT": JSON.stringify("false"),
    "process.env.NODE_ENV": JSON.stringify(nodeEnv),
  };

  let hasSubsetHelpers = false;

  return {
    plugins: [
      react(),
      {
        name: "excalidraw-subset-helper-guard",
        apply: "build",
        generateBundle() {
          if (!hasSubsetHelpers) {
            throw new Error(
              "Excalidraw subset helper not found; recheck the font-subsetting worker import graph.",
            );
          }
        },
      },
    ],
    define: {
      ...processEnvDefines,
      "import.meta.env.VITE_APP_VERSION": JSON.stringify(appVersion),
      "import.meta.env.VITE_APP_BUILD_LABEL": JSON.stringify(buildLabel),
      "import.meta.env.VITE_EXCALIDRAW_VERSION": JSON.stringify(editorVersion),
    },
    optimizeDeps: {
      esbuildOptions: {
        define: processEnvDefines,
        target: "es2022",
      },
    },
    build: {
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks(id, { getModuleInfo }) {
            if (!id.includes("/@excalidraw/excalidraw/dist/prod/")) return;
            const code = getModuleInfo(id)?.code;
            if (!code?.includes("Dynamic require of")) return;
            if (/\b(?:document|window)\b/.test(code)) {
              throw new Error(
                `Excalidraw subset helper is no longer worker-safe: ${id}`,
              );
            }
            // Avoid "Failed to use workers for subsetting / document is not defined":
            // the shared helper must not make the worker import the SPA entry.
            hasSubsetHelpers = true;
            return "excalidraw-subset-helpers";
          },
        },
      },
    },
    server: {
      proxy: {
        "/api": {
          target: devBackendTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
        "/socket.io": {
          target: devBackendTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
});
