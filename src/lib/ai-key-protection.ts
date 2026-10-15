import { randomUUID } from "node:crypto";

const failure = () => new Error("API-võtme turvaline salvestamine ebaõnnestus. Proovi programm taaskäivitada.");

// Only the Node child can use this channel. It is not exposed to the renderer
// or to an HTTP endpoint, and no secret is placed in command-line arguments.
export function protectKeys(operation: "encrypt" | "decrypt", values: string[]): Promise<(string | null)[]> {
  if (!values.length) return Promise.resolve([]);
  if (!process.send) {
    if (operation === "decrypt") return Promise.resolve(values.map(() => null));
    return Promise.reject(failure());
  }
  return new Promise((resolve, reject) => {
    const id = randomUUID();
    const finish = (result?: (string | null)[]) => {
      clearTimeout(timeout);
      process.off("message", onMessage);
      process.off("disconnect", onDisconnect);
      if (result) resolve(result);
      else reject(failure());
    };
    const onDisconnect = () => finish();
    const onMessage = (message: unknown) => {
      if (!message || typeof message !== "object") return;
      const response = message as { type?: string; id?: string; values?: unknown };
      if (response.type !== "ai-key-protection-result" || response.id !== id) return;
      if (!Array.isArray(response.values) || response.values.length !== values.length ||
          response.values.some(value => value !== null && typeof value !== "string")) {
        finish();
        return;
      }
      if (operation === "encrypt" && response.values.some(value => !value)) finish();
      else finish(response.values);
    };
    const timeout = setTimeout(() => finish(), 10000);
    process.on("message", onMessage);
    process.once("disconnect", onDisconnect);
    try {
      process.send!({ type: "ai-key-protection", id, operation, values }, error => {
        if (error) finish();
      });
    } catch { finish(); }
  });
}
