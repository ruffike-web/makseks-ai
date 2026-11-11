export async function api<T = unknown>(
  path: string,
  method = "GET",
  body?: unknown,
  companyId?: string,
): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method,
    headers: {
      ...(companyId ? { "X-Company-Id": companyId } : {}),
      ...(body && !(body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body:
      body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = null;
  }
  if (!response.ok) {
    const error =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : `Päring ebaõnnestus (${response.status}).`;
    throw new Error(error);
  }
  if (data === null)
    throw new Error("Rakendus saatis vigase vastuse. Värskenda lehte ja proovi uuesti.");
  return data as T;
}
export function euro(value: string) {
  return `${value.replace(".", ",")} €`;
}
