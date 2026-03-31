"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loading, StatusBadge } from "@/components/ui";
import { formatDate, formatWeight } from "@/lib/utils";
import { Search, LogOut, FileText, ChevronLeft, ChevronRight, Package } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  PROGRAMADO: "Programado", EM_SEPARACAO: "Em Separação", CARREGADO: "Carregado",
  EM_ROTA: "Em Rota", ENTREGUE: "Entregue", FINALIZADO: "Finalizado", OCORRENCIA: "Ocorrência",
};

export default function PortalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notas, setNotas] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (debouncedSearch) params.set("numero", debouncedSearch);
    if (filterStatus) params.set("status", filterStatus);
    const res = await fetch(`/api/portal?${params}`, { cache: "no-store" });
    const data = await res.json();
    setNotas(data.notas || []);
    setTotal(data.total || 0);
    setPages(data.pages || 1);
    setLoading(false);
  }, [page, debouncedSearch, filterStatus]);

  useEffect(() => { if (session) fetchData(); }, [session, fetchData]);

  if (status === "loading") return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <Loading text="Carregando portal..." />
    </div>
  );

  const user = session?.user as any;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="MAGNALOG" className="h-8 w-auto object-contain" />
          <div className="h-5 w-px" style={{ background: "var(--border2)" }} />
          <div>
            <div className="text-sm font-semibold">Portal do Cliente</div>
            <div className="text-[10px] font-mono" style={{ color: "var(--text3)" }}>Acompanhamento de Cargas</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm font-medium">{user?.name}</div>
            <div className="text-[10px]" style={{ color: "var(--text3)" }}>{user?.email}</div>
          </div>
          {user?.image && <img src={user.image} alt="" className="w-9 h-9 rounded-full" />}
          <button onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all hover:opacity-70"
            style={{ background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}>
            <LogOut size={12} /> Sair
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: "var(--text3)" }}>Total de NFs</div>
            <div className="font-head text-3xl font-black" style={{ color: "var(--accent)" }}>{total}</div>
          </div>
          <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: "var(--text3)" }}>Em Trânsito</div>
            <div className="font-head text-3xl font-black" style={{ color: "#8b5cf6" }}>
              {notas.filter((n) => n.entrega?.status === "EM_ROTA").length}
            </div>
          </div>
          <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: "var(--text3)" }}>Entregues</div>
            <div className="font-head text-3xl font-black" style={{ color: "#10b981" }}>
              {notas.filter((n) => ["ENTREGUE", "FINALIZADO"].includes(n.entrega?.status)).length}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text3)" }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por NF, cliente, emitente, cidade, CNPJ..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
          </div>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
            <option value="">Todos os status</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {/* Notes table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {loading ? <Loading /> : notas.length === 0 ? (
            <div className="text-center py-16">
              <Package size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm" style={{ color: "var(--text3)" }}>Nenhuma nota fiscal encontrada</p>
            </div>
          ) : (
            <>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {["NF / Série", "Emitente", "Destinatário", "Cidade", "Volumes", "Peso", "Emissão", "Entrega", "Status"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-widest font-normal font-mono"
                        style={{ color: "var(--text3)", borderBottom: "1px solid var(--border)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {notas.map((n) => (
                    <tr key={n.id} style={{ borderBottom: "1px solid var(--border)" }}
                      className="transition-colors hover:bg-[#162030]">
                      <td className="px-4 py-3">
                        <div className="font-mono text-sm font-semibold" style={{ color: "var(--accent)" }}>NF {n.numero}</div>
                        {n.serie && <div className="text-[10px] font-mono" style={{ color: "var(--text3)" }}>Série {n.serie}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">{n.emitenteRazao}</div>
                        <div className="text-[10px] font-mono" style={{ color: "var(--text3)" }}>{n.emitenteCnpj}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">{n.destinatarioRazao}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--text2)" }}>{n.cidade}{n.uf ? ` — ${n.uf}` : ""}</td>
                      <td className="px-4 py-3 font-mono text-xs">{n.volumes}</td>
                      <td className="px-4 py-3 font-mono text-xs">{formatWeight(n.pesoBruto)}</td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text3)" }}>{formatDate(n.dataEmissao)}</td>
                      <td className="px-4 py-3">
                        {n.entrega ? (
                          <div>
                            <div className="font-mono text-[10px]" style={{ color: "var(--text3)" }}>
                              {n.entrega.notas && n.entrega.notas.length > 0 ? n.entrega.notas.map((nt: any) => nt.numero).join(", ") : n.entrega.codigo}
                            </div>
                            {n.entrega.dataAgendada && <div className="text-[10px]" style={{ color: "var(--text2)" }}>Ag.: {formatDate(n.entrega.dataAgendada)}</div>}
                            {n.entrega.dataEntrega && <div className="text-[10px]" style={{ color: "#10b981" }}>Entregue: {formatDate(n.entrega.dataEntrega)}</div>}
                            {n.entrega.motorista?.nome && <div className="text-[10px]" style={{ color: "var(--text2)" }}>🚛 {n.entrega.motorista.nome}</div>}
                          </div>
                        ) : <span className="text-[10px]" style={{ color: "var(--text3)" }}>Aguardando</span>}
                      </td>
                      <td className="px-4 py-3">
                        {n.entrega ? <StatusBadge status={n.entrega.status} /> : (
                          <span className="badge badge-PROGRAMADO">Programado</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--border)" }}>
                  <span className="text-xs font-mono" style={{ color: "var(--text3)" }}>Página {page} de {pages} · {total} registros</span>
                  <div className="flex gap-2">
                    <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}
                      className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-30 transition-all hover:opacity-70"
                      style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}>
                      <ChevronLeft size={14} />
                    </button>
                    <button onClick={() => setPage((p) => p + 1)} disabled={page === pages}
                      className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-30 transition-all hover:opacity-70"
                      style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
