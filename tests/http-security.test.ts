import { expect, it } from "vitest";
import { boundedBody, checkLocalRequest } from "../src/lib/http-security";
it("requires the private desktop session token when running as a Windows app", () => {
  process.env.ARVE_DESKTOP_TOKEN = "test-token";
  try {
    expect(() =>
      checkLocalRequest(
        new Request("http://127.0.0.1:1234/api/companies", {
          headers: { host: "127.0.0.1:1234" },
        }),
      ),
    ).toThrow();
    expect(() =>
      checkLocalRequest(
        new Request("http://127.0.0.1:1234/api/companies", {
          headers: { host: "127.0.0.1:1234", "X-Desktop-Token": "test-token" },
        }),
      ),
    ).not.toThrow();
  } finally {
    delete process.env.ARVE_DESKTOP_TOKEN;
  }
});
it("rejects nonlocal hosts and cross-origin mutations", () => {
  expect(() =>
    checkLocalRequest(
      new Request("http://127.0.0.1:3000/api/state", {
        headers: { host: "127.0.0.1:3000" },
      }),
    ),
  ).not.toThrow();
  expect(() =>
    checkLocalRequest(
      new Request("http://127.0.0.1:3000/api/settings", {
        headers: { host: "127.0.0.1:3000", origin: "https://evil.example" },
      }),
      true,
    ),
  ).toThrow();
  expect(() =>
    checkLocalRequest(
      new Request("http://evil.example/api/settings", {
        headers: { host: "evil.example", origin: "http://evil.example" },
      }),
      true,
    ),
  ).toThrow();
});
it("limits actual streamed bodies even without content-length", async () => {
  const request = new Request("http://localhost/api", {
    method: "POST",
    body: "123456",
  });
  await expect(boundedBody(request, 5)).rejects.toThrow();
});
it("uses the checked incoming Host when Next canonicalizes its internal URL", () => {
  expect(() =>
    checkLocalRequest(
      new Request("http://localhost:3000/api/settings", {
        headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
      }),
      true,
    ),
  ).not.toThrow();
});
