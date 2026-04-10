import { useState, useEffect, useCallback } from "react";
import { api } from "./api";

export type UseApiResult<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => Promise<void>;
};

export function useApi<T = any>(url: string, options?: Parameters<typeof api.request>[1]) : UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.request(url, options);
      setData(result);
    } catch (err: any) {
      setError(err?.message || "Unknown error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [url, JSON.stringify(options)]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData]);

  return { data, error, loading, refetch: fetchData };
}
