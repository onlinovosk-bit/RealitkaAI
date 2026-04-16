type FetchJsonInit = RequestInit & {
  headers?: HeadersInit;
};

type RetryOptions = {
  retries?: number;
  backoffMs?: number;
  retryOnStatuses?: number[];
};

class NonRetryableRequestError extends Error {}

export async function fetchJson(url: string, init: FetchJsonInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? safeParseJson(text) : null;

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : null) ||
      `Request failed (${response.status})`;

    throw new Error(message);
  }

  return data;
}

export async function fetchJsonWithRetry(
  url: string,
  init: FetchJsonInit = {},
  retryOptions: RetryOptions = {},
) {
  const retries = retryOptions.retries ?? 2;
  const backoffMs = retryOptions.backoffMs ?? 400;
  const retryOnStatuses = retryOptions.retryOnStatuses ?? [408, 425, 429, 500, 502, 503, 504];

  let attempt = 0;
  while (attempt <= retries) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(init.headers || {}),
        },
      });

      const text = await response.text();
      const data = text ? safeParseJson(text) : null;

      if (!response.ok) {
        const message =
          (data &&
          typeof data === "object" &&
          "error" in data &&
          typeof (data as { error?: unknown }).error === "string"
            ? (data as { error: string }).error
            : null) || `Request failed (${response.status})`;

        if (retryOnStatuses.includes(response.status) && attempt < retries) {
          attempt += 1;
          await sleep(backoffMs * Math.pow(2, attempt - 1));
          continue;
        }
        throw new NonRetryableRequestError(message);
      }

      return data;
    } catch (error) {
      if (error instanceof NonRetryableRequestError) {
        throw error;
      }
      if (attempt >= retries) {
        throw error instanceof Error ? error : new Error("Request failed after retries.");
      }
      attempt += 1;
      await sleep(backoffMs * Math.pow(2, attempt - 1));
    }
  }

  throw new Error("Request failed after retries.");
}

function safeParseJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
