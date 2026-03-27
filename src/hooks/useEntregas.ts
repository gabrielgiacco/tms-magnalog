import { useState, useEffect, useCallback } from "react";
import type { Entrega } from "@/types";

interface UseEntregasOptions {
  status?: string;
  cidade?: string;
  cliente?: string;
  rotaId?: string;
  mostrarFinalizados?: boolean;
  dataInicio?: string;
  dataFim?: string;
  limit?: number;
}

export function useEntregas(options: UseEntregasOptions = {}) {
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(options.limit || 50),
        mostrarFinalizados: String(options.mostrarFinalizados || false),
      });
      if (options.status) params.set("status", options.status);
      if (options.cidade) params.set("cidade", options.cidade);
      if (options.cliente) params.set("cliente", options.cliente);
      if (options.rotaId) params.set("rotaId", options.rotaId);
      if (options.dataInicio) params.set("dataInicio", options.dataInicio);
      if (options.dataFim) params.set("dataFim", options.dataFim);

      const res = await fetch(`/api/entregas?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEntregas(data.entregas || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, JSON.stringify(options)]);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  return { entregas, loading, error, total, page, pages, setPage, refetch: fetch_ };
}

export function useEntrega(id: string) {
  const [entrega, setEntrega] = useState<Entrega | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/entregas/${id}`);
      if (!res.ok) throw new Error("Entrega não encontrada");
      setEntrega(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetch_(); }, [fetch_]);

  async function updateStatus(status: string) {
    const data: any = { status };
    if (status === "ENTREGUE") data.dataEntrega = new Date().toISOString();
    const res = await fetch(`/api/entregas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const updated = await res.json();
    setEntrega(updated);
    return updated;
  }

  async function update(data: Partial<Entrega>) {
    const res = await fetch(`/api/entregas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const updated = await res.json();
    setEntrega(updated);
    return updated;
  }

  return { entrega, loading, error, refetch: fetch_, updateStatus, update };
}
