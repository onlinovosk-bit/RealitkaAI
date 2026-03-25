type FetchJsonInit = RequestInit & {
  headers?: HeadersInit;
};

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

function safeParseJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
