import { handleError } from "./error-handler";

export async function safeFetch(url: string, options?: RequestInit) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "Request failed");
    }

    return { ok: true, data };
  } catch (error) {
    return handleError(error, "safeFetch");
  }
}
