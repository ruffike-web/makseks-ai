export function checkLocalRequest(request: Request, mutation = false) {
  if (
    process.env.ARVE_DESKTOP_TOKEN &&
    request.headers.get("X-Desktop-Token") !== process.env.ARVE_DESKTOP_TOKEN
  )
    throw new Error("Ava rakendus Windowsi programmi aknas.");
  const url = new URL(request.url),
    host = request.headers.get("host")?.split(":")[0];
  if (
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    !host ||
    !["localhost", "127.0.0.1"].includes(host)
  )
    throw new Error("Rakendus on mõeldud kasutamiseks ainult selles arvutis.");
  // Next can canonicalize request.url to localhost internally. The validated
  // incoming Host is the origin the user's browser actually opened.
  if (mutation) {
    const origin = request.headers.get("origin");
    if (origin !== `${url.protocol}//${request.headers.get("host")}`)
      throw new Error(
        "Päringu päritolu ei ole lubatud. Ava rakendus kohalikul aadressil.",
      );
  }
}
export async function boundedBody(
  request: Request,
  limit: number,
): Promise<Uint8Array> {
  if (Number(request.headers.get("content-length") ?? 0) > limit)
    throw new Error("Päring on liiga suur.");
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw new Error("Päring on liiga suur.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    result.set(c, offset);
    offset += c.length;
  }
  return result;
}
