module.exports = {
  appId: "ee.arvemakseks.desktop",
  productName: "Makseks AI",
  directories: { app: "desktop/app", output: "release" },
  files: ["package.json", "main.cjs", "paths.cjs", "loading.html", "!node_modules/**/*"],
  extraResources: [
    { from: ".desktop/server", to: "server" },
    { from: ".desktop/runtime", to: "runtime" },
    { from: "desktop/bootstrap.cjs", to: "server/desktop-bootstrap.cjs" },
    { from: "prisma/migrations", to: "server/migrations" },
  ],
  npmRebuild: false,
  asar: true,
  electronLanguages: ["en-US", "et"],
  compression: "maximum",
  // Copy the standalone server's dependencies explicitly: electron-builder's
  // dependency filter may omit nested node_modules from extraResources.
  afterPack: async ({ appOutDir }) => {
    const { cp, access } = require("node:fs/promises");
    const { resolve, join } = require("node:path");
    const destination = join(appOutDir, "resources/server/node_modules");
    await cp(resolve(".desktop/server/node_modules"), destination, {
      recursive: true,
      dereference: true,
    });
    for (const file of [
      "next/package.json",
      "better-sqlite3/build/Release/better_sqlite3.node",
      "pdf-parse/package.json",
      "pdfjs-dist/legacy/build/pdf.worker.mjs",
      "@napi-rs/canvas-win32-x64-msvc/skia.win32-x64-msvc.node",
      "libxml2-wasm/package.json",
    ])
      await access(join(destination, file));
  },
  win: {
    target: ["nsis", "portable"],
    icon: "desktop/icon.ico",
    signExecutable: false,
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: false,
    artifactName: "Makseks-AI-${version}-setup.${ext}",
  },
  portable: { artifactName: "Makseks-AI-${version}-portable.${ext}" },
};
