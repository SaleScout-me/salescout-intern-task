import type { PriceResult, Product } from "../../src/types";

interface ApiError {
  error: string;
  details?: string[];
}

function isApiError(value: unknown): value is ApiError {
  return typeof value === "object" && value !== null && "error" in value;
}

export async function repriceProducts(products: Product[], signal?: AbortSignal): Promise<PriceResult[]> {
  const res = await fetch("/reprice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(products),
    signal,
  });

  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message = isApiError(body)
      ? [body.error, ...(body.details ?? [])].join("\n")
      : `HTTP ${res.status}`;
    throw new Error(message);
  }
  return body as PriceResult[];
}
