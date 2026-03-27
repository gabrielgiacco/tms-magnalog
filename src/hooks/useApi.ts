import { useState, useEffect, useCallback, useRef } from "react";

interface UseApiOptions<T> {
  immediate?: boolean;
  initialData?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
}

export function useApi<T = any>(
  url: string | null,
  options: UseApiOptions<T> = {}
) {
  const { immediate = true, initialData, onSuccess, onError } = options;
  const [data, setData] = useState<T | undefined>(initialData);
  const [loading, setLoading] = useState(immediate && !!url);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetch_ = useCallback(
    async (overrideUrl?: string) => {
      const targetUrl = overrideUrl || url;
      if (!targetUrl) return;

      // Cancel previous request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(targetUrl, { signal: abortRef.current.signal });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const json: T = await res.json();
        setData(json);
        onSuccess?.(json);
        return json;
      } catch (err: any) {
        if (err.name === "AbortError") return;
        const msg = err.message || "Erro desconhecido";
        setError(msg);
        onError?.(msg);
      } finally {
        setLoading(false);
      }
    },
    [url, onSuccess, onError]
  );

  useEffect(() => {
    if (immediate && url) fetch_();
    return () => abortRef.current?.abort();
  }, [url, immediate, fetch_]);

  async function mutate(
    mutateUrl: string,
    method: "POST" | "PUT" | "PATCH" | "DELETE" = "POST",
    body?: unknown
  ) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(mutateUrl, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      return json;
    } catch (err: any) {
      const msg = err.message || "Erro desconhecido";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return {
    data,
    loading,
    error,
    refetch: fetch_,
    mutate,
    setData,
  };
}
