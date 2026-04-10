// --- Interceptors & Helpers ---
function handleAuthError(status: number) {
  if (status === 401) {
    console.warn("Unauthorized → logout");
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
  }
}

function logApiError(url: string, err: any) {
  console.error("API ERROR:", {
    url,
    message: err.message,
    time: new Date().toISOString(),
  });
}
export type ApiOptions = RequestInit & {
  json?: any;
};



import { auth } from "./auth";


// Helper: wait for ms
function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class ApiClient {
  async request(url: string, options: ApiOptions = {}) {
    const { json, headers, ...rest } = options;
    const token = auth.getToken();
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(url, {
          ...rest,
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(headers || {}),
          },
          body: json ? JSON.stringify(json) : rest.body,
        });

        let data;
        try {
          data = await res.json();
        } catch {
          data = null;
        }

        if (!res.ok) {
          handleAuthError(res.status);
          // Retry only for 5xx errors
          if (res.status >= 500 && attempt < maxRetries) {
            console.warn(`Retry attempt ${attempt + 1} for ${url}`);
            await wait(500 * (attempt + 1));
            continue;
          }
          throw new Error(
            data?.error || `Request failed with status ${res.status}`
          );
        }

        return data;
      } catch (err: any) {
        logApiError(url, err);
        // Retry only for network errors
        if (attempt < maxRetries && (!err.response || err.name === "TypeError")) {
          console.warn(`Retry attempt ${attempt + 1} for ${url}`);
          await wait(500 * (attempt + 1));
          continue;
        }
        throw err;
      }
    }
  }

  get(url: string) {
    return this.request(url, { method: "GET" });
  }

  post(url: string, json?: any) {
    return this.request(url, { method: "POST", json });
  }

  put(url: string, json?: any) {
    return this.request(url, { method: "PUT", json });
  }

  delete(url: string, json?: any) {
    return this.request(url, { method: "DELETE", json });
  }
}

export const api = new ApiClient();
