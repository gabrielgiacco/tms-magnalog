"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Topbar } from "@/components/layout/Topbar";
import {
  Button, Card, Loading, Empty, StatusBadge,
  Table, Th, Td, Tr, Input
} from "@/components/ui";
import { formatCurrency, formatDate, formatWeight, formatCNPJ } from "@/lib/utils";
import { Calendar, Search, Eye, RefreshCw, ChevronLeft, ChevronRight, Clock } from "lucide-react";

type FiltroData = "TODAS" | "HOJE" | "SEMANA" | "MES";

export default function AgendamentosPage() {
  const router = useRouter();
  const [entregas, setEntregas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filtroData, setFiltroData] = useState<FiltroData>("TODAS");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchEntregas = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: "50",
      apenasAgendadas: "true",
    });
    
    if (debouncedSearch) params.set("cliente", debouncedSearch);

    // Usar limites UTC para coincidir com datas armazenadas no banco (meia-noite UTC)
    const hoje = new Date();
    const y = hoje.getFullYear(), m = hoje.getMonth(), d = hoje.getDate();
    if (filtroData === "HOJE") {
      params.set("dataInicio", new Date(Date.UTC(y, m, d)).toISOString());
      params.set("dataFim", new Date(Date.UTC(y, m, d, 23, 59, 59, 999)).toISOString());
    } else if (filtroData === "SEMANA") {
      const seg = new Date(hoje);
      seg.setDate(d - ((hoje.getDay() + 6) % 7)); // segunda-feira
      const dom = new Date(seg);
      dom.setDate(seg.getDate() + 6); // domingo
      params.set("dataInicio", new Date(Date.UTC(seg.getFullYear(), seg.getMonth(), seg.getDate())).toISOString());
      params.set("dataFim", new Date(Date.UTC(dom.getFullYear(), dom.getMonth(), dom.getDate(), 23, 59, 59, 999)).toISOString());
    } else if (filtroData === "MES") {
      const ultimoDia = new Date(y, m + 1, 0).getDate();
      params.set("dataInicio", new Date(Date.UTC(y, m, 1)).toISOString());
      params.set("dataFim", new Date(Date.UTC(y, m, ultimoDia, 23, 59, 59, 999)).toISOString());
    }

    try {
      const res = await fetch(`/api/entregas?${params}`);
      const data = await res.json();
      setEntregas(data.entregas || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch (error) {
      toast.error("Erro ao puxar agendamentos");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filtroData]);

  useEffect(() => { fetchEntregas(); }, [fetchEntregas]);

  // Contagem exclusiva de atrasadas dentro do set atual filtrado
  const hojeStr = new Date().toISOString().split("T")[0];
  const atrasadas = entregas.filter((e) => {
    if (!e.dataAgendada || ["ENTREGUE", "FINALIZADO"].includes(e.status)) return false;
    const dataStr = new Date(e.dataAgendada).toISOString().split("T")[0];
    return dataStr < hojeStr;
  }).length;

  return (
    <>
      <Topbar
        title="Agendamentos"
        subtitle={`${total} entrega(s) com data marcada`}
        actions={
          <Button onClick={() => router.push("/entregas")}>
            Ir para Entregas gerais
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        
        {/* Aviso de Atrasadas na visão atual */}
        {atrasadas > 0 && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold animate-pulse"
            style={{ background: "rgba(239,68,68,.15)", border: "1px solid rgba(239,68,68,.3)", color: "#ef4444" }}>
            <Clock size={16} /> Temos {atrasadas} agendamento(s) com a data VENCIDA nesta lista!
          </div>
        )}

        {/* Filters Box */}
        <Card className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex flex-wrap gap-2">
            {(["TODAS", "HOJE", "SEMANA", "MES"] as FiltroData[]).map((f) => (
              <button
                key={f}
                onClick={() => { setFiltroData(f); setPage(1); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  filtroData === f
                    ? "border-orange-500/50 bg-orange-500/10 text-orange-500"
                    : "border-transparent text-[var(--text2)] hover:bg-[var(--surface2)]"
                }`}
              >
                {f === "TODAS" && "Todos"}
                {f === "HOJE" && "Hoje"}
                {f === "SEMANA" && "Esta Semana"}
                {f === "MES" && "Este Mês"}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
             <div className="relative w-[250px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text3)" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar cliente..."
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)]"
              />
            </div>
            <Button variant="ghost" onClick={fetchEntregas}>
              <RefreshCw size={14} />
            </Button>
          </div>
        </Card>

        {/* Table */}
        <Card className="p-0 overflow-hidden">
          {loading ? <Loading /> : entregas.length === 0 ? <Empty icon="📆" text="Nenhum agendamento para este período" /> : (
            <>
              <Table>
                <thead>
                  <tr>
                    <Th>Data Agendada</Th>
                    <Th>Status</Th>
                    <Th>NF / Cliente</Th>
                    <Th>Cidade / UF</Th>
                    <Th>Motorista</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody>
                  {entregas.map((e) => {
                    const dataStr = e.dataAgendada ? new Date(e.dataAgendada).toISOString().split("T")[0] : null;
                    const atrasada = dataStr && dataStr < hojeStr && !["ENTREGUE", "FINALIZADO"].includes(e.status);
                    return (
                      <Tr key={e.id} onClick={() => router.push(`/entregas/${e.id}`)}
                        className={atrasada ? "border-l-4" : ""}
                        style={atrasada ? { borderLeftColor: "#ef4444", background: "rgba(239,68,68,0.03)" } as any : {}}>
                        
                        {/* Agendado Spotlight */}
                        <Td>
                          <div className={`font-semibold text-sm ${atrasada ? "text-red-400" : "text-[var(--text)]"}`}>
                            {formatDate(e.dataAgendada)}
                          </div>
                          {atrasada && <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Atrasado</span>}
                        </Td>

                        {/* Status */}
                        <Td><StatusBadge status={e.status} /></Td>

                        {/* Customer & Code */}
                        <Td>
                          <div className="font-semibold text-sm leading-tight text-[var(--text)] mb-0.5">{e.razaoSocial}</div>
                          <div className="text-[10px] font-mono" style={{ color: "var(--text3)" }}>
                            {e.notas && e.notas.length > 0 ? e.notas.map((n: any) => n.numero).join(", ") : e.codigo} • {formatCNPJ(e.cnpj)}
                          </div>
                        </Td>

                        {/* Location */}
                        <Td><span className="text-xs text-[var(--text2)]">{e.cidade}{e.uf ? ` — ${e.uf}` : ""}</span></Td>

                        {/* Motorista */}
                        <Td><span className="text-xs text-[var(--text2)]">{e.motorista?.nome || <span style={{ color: "var(--text3)" }}>Não alocado</span>}</span></Td>

                        <Td className="text-right">
                          <button className="p-1.5 rounded-lg hover:opacity-70 transition-all bg-[var(--surface2)] text-[var(--text2)]"
                            onClick={(ev) => { ev.stopPropagation(); router.push(`/entregas/${e.id}`); }}>
                            <Eye size={13} />
                          </button>
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>

              {/* Pagination */}
              {pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--border)" }}>
                  <span className="text-xs font-mono text-[var(--text3)]">
                    Página {page} de {pages} · {total} agendamentos
                  </span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                      <ChevronLeft size={14} />
                    </Button>
                    <Button variant="ghost" size="sm" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>
                      <ChevronRight size={14} />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </>
  );
}
