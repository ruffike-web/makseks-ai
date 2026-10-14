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
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Päring ebaõnnestus.");
  return data as T;
}
export function euro(value: string) {
  return `${value.replace(".", ",")} €`;
}
