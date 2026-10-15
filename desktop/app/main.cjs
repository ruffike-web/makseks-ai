const {
  app,
  BrowserWindow,
  Menu,
  dialog,
  shell,
  session,
  safeStorage,
} = require("electron");
const { spawn } = require("node:child_process");
const { randomBytes } = require("node:crypto");
const path = require("node:path");
const net = require("node:net");
const fs = require("node:fs");
const { dataDirectory } = require("./paths.cjs");
const { attachKeyProtection } = require("./key-protection.cjs");

app.setName("Makseks AI");
app.setAppUserModelId("ee.arvemakseks.desktop");
const dataDir = dataDirectory({
  override: process.env.ARVE_DATA_DIR,
  selfExtractingDirectory: process.env.PORTABLE_EXECUTABLE_DIR,
  executable: process.execPath,
  packaged: app.isPackaged,
  exists: fs.existsSync,
  userData: app.getPath("userData"),
});
app.setPath("userData", dataDir);
function readLanguage() {
  try {
    const preferences = JSON.parse(
      fs.readFileSync(path.join(dataDir, "ui-preferences.json"), "utf8"),
    );
    return preferences.language === "en" ? "en" : "et";
  } catch {
    return "et";
  }
}
let language = readLanguage();
const text = (et, en) => (language === "en" ? en : et);
function updateMenu() {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: text("Fail", "File"),
        submenu: [
          {
            label: text("Impordi olemasolev andmebaas…", "Import existing database…"),
            click: () =>
              importData().catch((e) =>
                dialog.showErrorBox("Import", e.message),
              ),
          },
          {
            label: text("Ava andmekaust", "Open data folder"),
            click: () => shell.openPath(dataDir),
          },
          { type: "separator" },
          { label: text("Välju", "Quit"), role: "quit" },
        ],
      },
      {
        label: text("Vaade", "View"),
        submenu: [
          { label: text("Värskenda", "Reload"), role: "reload" },
          { label: text("Suurenda", "Zoom in"), role: "zoomIn" },
          { label: text("Vähenda", "Zoom out"), role: "zoomOut" },
          { label: text("Tavasuurus", "Actual size"), role: "resetZoom" },
        ],
      },
    ]),
  );
}
const resources = app.isPackaged
  ? process.resourcesPath
  : path.resolve(__dirname, "../../.desktop");
const runtime = path.join(resources, "runtime/node.exe");
const serverRoot = path.join(resources, "server");
let child,
  window,
  origin,
  quitting = false;
const token = randomBytes(32).toString("hex");
function environment() {
  return {
    ...process.env,
    NODE_OPTIONS: "",
    ARVE_DATA_DIR: dataDir,
    ARVE_PARENT_PID: String(process.pid),
    ARVE_DESKTOP_TOKEN: token,
    HOSTNAME: "127.0.0.1",
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1",
  };
}
async function stopServer() {
  const running = child;
  child = null;
  if (running && running.exitCode === null)
    await new Promise((resolve) => {
      running.once("exit", resolve);
      running.kill();
    });
}
async function launchServer() {
  const port = await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const port = probe.address().port;
      probe.close(() => resolve(port));
    });
  });
  origin = `http://127.0.0.1:${port}`;
  child = spawn(runtime, [path.join(serverRoot, "desktop-bootstrap.cjs")], {
    cwd: serverRoot,
    env: { ...environment(), PORT: String(port) },
    windowsHide: true,
    stdio: ["ignore", "ignore", "ignore", "ipc"],
  });
  attachKeyProtection(child, safeStorage);
  const running = child;
  let failed = false;
  running.on("error", () => {
    failed = true;
  });
  for (let i = 0; i < 200; i++) {
    if (failed || running.exitCode !== null)
      throw new Error(text("Kohaliku serveri käivitamine ebaõnnestus.", "The local server could not start."));
    try {
      const response = await fetch(`${origin}/api/companies`, {
        headers: { "X-Desktop-Token": token },
        signal: AbortSignal.timeout(500),
      });
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(text("Rakenduse käivitamine võttis liiga kaua aega.", "The application took too long to start."));
}
async function importData() {
  const result = await dialog.showOpenDialog(window, {
    title: text("Vali olemasolev Makseks AI andmebaas", "Select an existing Makseks AI database"),
    properties: ["openFile"],
    filters: [{ name: text("SQLite andmebaas", "SQLite database"), extensions: ["db"] }],
  });
  if (result.canceled) return;
  const confirmation = await dialog.showMessageBox(window, {
    type: "question",
    buttons: [text("Katkesta", "Cancel"), text("Impordi", "Import")],
    defaultId: 0,
    cancelId: 0,
    message: text("Asendan selle programmi andmed valitud andmebaasiga?", "Replace this application's data with the selected database?"),
    detail:
      text("Praegustest andmetest tehakse varukoopia. Algset valitud faili ei muudeta.", "Your current data will be backed up. The selected original file will not be changed."),
  });
  if (confirmation.response !== 1) return;
  window.hide();
  await stopServer();
  try {
    await new Promise((resolve, reject) => {
      const job = spawn(
        runtime,
        [
          path.join(serverRoot, "desktop-bootstrap.cjs"),
          "--import",
          result.filePaths[0],
        ],
        {
          cwd: serverRoot,
          env: environment(),
          windowsHide: true,
          stdio: "ignore",
        },
      );
      job.on("error", reject);
      job.on("exit", (code) =>
        code === 0
          ? resolve()
          : reject(
              new Error(
                text("Import ebaõnnestus. Kontrolli, et valitud fail on selle rakenduse andmebaas.", "Import failed. Check that the selected file is a database from this application."),
              ),
            ),
      );
    });
    await session.defaultSession.clearStorageData();
  } catch (e) {
    dialog.showErrorBox(text("Andmete import", "Data import"), e.message);
  } finally {
    await launchServer();
    await window.loadURL(origin);
    window.show();
  }
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => {
    if (window) {
      if (window.isMinimized()) window.restore();
      window.show();
      window.focus();
    }
  });
  app
    .whenReady()
    .then(async () => {
      fs.mkdirSync(dataDir, { recursive: true });
      Menu.setApplicationMenu(null);
      session.defaultSession.webRequest.onBeforeSendHeaders(
        (details, callback) => {
          if (details.url.startsWith(`${origin}/`))
            details.requestHeaders["X-Desktop-Token"] = token;
          callback({ requestHeaders: details.requestHeaders });
        },
      );
      session.defaultSession.webRequest.onCompleted((details) => {
        if (
          origin &&
          details.url === `${origin}/api/preferences` &&
          details.method === "PUT" &&
          details.statusCode >= 200 &&
          details.statusCode < 300
        ) {
          language = readLanguage();
          updateMenu();
        }
      });
      session.defaultSession.setPermissionRequestHandler(
        (_contents, _permission, callback) => callback(false),
      );
      window = new BrowserWindow({
        width: 1380,
        height: 940,
        minWidth: 780,
        minHeight: 600,
        title: "Makseks AI",
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
        },
      });
      await window.loadFile(path.join(__dirname, "loading.html"), {
        query: { language },
      });
      if (process.env.ARVE_SMOKE_TEST !== "1") window.show();
      await launchServer();
      window.webContents.on("will-navigate", (event, url) => {
        if (!url.startsWith(`${origin}/`) && url !== origin)
          event.preventDefault();
      });
      window.webContents.setWindowOpenHandler(({ url }) =>
        url.startsWith(`blob:${origin}/`)
          ? {
              action: "allow",
              overrideBrowserWindowOptions: {
                webPreferences: {
                  nodeIntegration: false,
                  contextIsolation: true,
                  sandbox: true,
                },
              },
            }
          : { action: "deny" },
      );
      updateMenu();
      await window.loadURL(origin);
      if (process.env.ARVE_SMOKE_TEST !== "1") window.show();
    })
    .catch((e) => {
      if (!quitting) dialog.showErrorBox("Makseks AI", e.message);
      app.quit();
    });
  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", (event) => {
    if (quitting) return;
    event.preventDefault();
    quitting = true;
    stopServer().finally(() => app.quit());
  });
}
