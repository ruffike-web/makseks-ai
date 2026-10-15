// A private parent/child IPC service. Never register this on ipcMain or expose
// it through preload: the browser has no reason to receive stored API keys.
function attachKeyProtection(child, safeStorage) {
  child.on("message", (message) => {
    if (!message || message.type !== "ai-key-protection") return;
    const { id, operation, values } = message;
    if (typeof id !== "string" || id.length > 64 ||
        !["encrypt", "decrypt"].includes(operation) ||
        !Array.isArray(values) || values.length > 5 ||
        values.some(value => typeof value !== "string" || value.length > 8192)) return;
    const result = values.map(value => {
      try {
        if (!safeStorage.isEncryptionAvailable()) return null;
        if (operation === "decrypt")
          return safeStorage.decryptString(Buffer.from(value, "base64"));
        if (value.length > 512) return null;
        const encrypted = safeStorage.encryptString(value);
        // Verify before the child atomically replaces the plaintext config.
        if (safeStorage.decryptString(encrypted) !== value) return null;
        return encrypted.toString("base64");
      } catch { return null; }
    });
    if (child.connected)
      child.send({ type: "ai-key-protection-result", id, values: result }, () => {});
  });
}
module.exports = { attachKeyProtection };
