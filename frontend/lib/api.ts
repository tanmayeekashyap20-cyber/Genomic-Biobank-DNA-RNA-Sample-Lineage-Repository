export type RuntimeMode = "demo" | "api-configured";

export function getRuntimeMode(): RuntimeMode {
  return process.env.NEXT_PUBLIC_API_BASE_URL ? "api-configured" : "demo";
}

export async function requestApi<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) throw new Error("No API base URL is configured. Demo mode remains active.");
  const response = await fetch(new URL(path, baseUrl), {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) throw new Error(`API request failed (${response.status}).`);
  return response.json() as Promise<T>;
}