import { EventEmitter } from "node:events";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { attachKeyProtection } = require("../desktop/app/key-protection.cjs") as {
  attachKeyProtection: (child: EventEmitter, safeStorage: FakeStorage) => void;
};

type FakeStorage = {
  isEncryptionAvailable: () => boolean;
  encryptString: (value: string) => Buffer;
  decryptString: (value: Buffer) => string;
};
const reversible = (overrides: Partial<FakeStorage> = {}): FakeStorage => ({
  isEncryptionAvailable: () => true,
  encryptString: (value) => Buffer.from(`enc:${value}`),
  decryptString: (value) => {
    const text = value.toString();
    if (!text.startsWith("enc:")) throw new Error("not ciphertext");
    return text.slice(4);
  },
  ...overrides,
});
function exchange(storage: FakeStorage, message: unknown) {
  const child = Object.assign(new EventEmitter(), {
    connected: true,
    sent: [] as unknown[],
    send(payload: unknown, callback: () => void) {
      this.sent.push(payload);
      callback();
    },
  });
  attachKeyProtection(child, storage);
  child.emit("message", message);
  return child.sent as { type: string; id: string; values: (string | null)[] }[];
}
const request = (operation: string, values: unknown) => ({ type: "ai-key-protection", id: "req-1", operation, values });

describe("desktop key protection parent", () => {
  it("encrypts with a verified round trip and decrypts the result", () => {
    const [encrypted] = exchange(reversible(), request("encrypt", ["secret-key"]));
    expect(encrypted).toMatchObject({ type: "ai-key-protection-result", id: "req-1" });
    const ciphertext = encrypted.values[0]!;
    expect(Buffer.from(ciphertext, "base64").toString()).toBe("enc:secret-key");
    expect(exchange(reversible(), request("decrypt", [ciphertext]))[0].values).toEqual(["secret-key"]);
  });
  it("refuses ciphertext that does not decrypt back to the original key", () => {
    const broken = reversible({ decryptString: () => "something else" });
    expect(exchange(broken, request("encrypt", ["secret-key"]))[0].values).toEqual([null]);
  });
  it("refuses keys over 512 characters and unavailable encryption", () => {
    expect(exchange(reversible(), request("encrypt", ["x".repeat(513)]))[0].values).toEqual([null]);
    expect(exchange(reversible(), request("encrypt", ["x".repeat(512)]))[0].values[0]).toEqual(expect.any(String));
    const unavailable = reversible({ isEncryptionAvailable: () => false });
    expect(exchange(unavailable, request("encrypt", ["secret-key"]))[0].values).toEqual([null]);
  });
  it("returns null for undecryptable values instead of throwing", () => {
    expect(exchange(reversible(), request("decrypt", [Buffer.from("plain").toString("base64")]))[0].values).toEqual([null]);
  });
  it("ignores malformed or oversized requests", () => {
    for (const message of [
      null,
      { type: "other" },
      request("delete", ["x"]),
      request("encrypt", "not-an-array"),
      request("encrypt", ["a", "b", "c", "d", "e", "f"]),
      request("encrypt", [42]),
      { ...request("encrypt", ["x"]), id: "i".repeat(65) },
    ])
      expect(exchange(reversible(), message)).toEqual([]);
  });
});
