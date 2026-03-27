"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Topbar,
} from "@/components/layout/Topbar";
import {
  Button, Card, Loading, Empty, StatusBadge,
  Table, Th, Td, Tr, Modal, Input, Select, Textarea, ComboboxMotorista
} from "@/components/ui";
import { formatCurrency, formatDate, formatWeight, formatCNPJ } from "@/lib/utils";
import {
  Plus, Filter, RefreshCw, Search, Eye, ChevronLeft, ChevronRight,
  Package, MapPin, User, Truck, Trash2, ArrowUp, ArrowDown, ArrowUpDown,
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "PROGRAMADO", label: "Programado" },
  { value: "EM_SEPARACAO", label: "Em Separação" },
  { value: "CARREGADO", label: "Carregado" },
  { value: "EM_ROTA", label: "Em Rota" },
  { value: "ENTREGUE", label: "Entregue" },
  { value: "OCORRENCIA", label: "Ocorrência" },
  { value: "FINALIZADO", label: "Finalizado" },
];

const BLANK_FORM = {
  cnpj: "", razaoSocial: "", cidade: "", uf: "", endereco: "", bairro: "", cep: "",
  dataChegada: "", dataAgendada: "", motoristaId: "", veiculoId: "",
  valorFrete: "", valorDescarga: "", valorArmazenagem: "", adiantamento: "",
  observacoes: "", status: "PROGRAMADO",
};

function SortTh({ col, label, sortBy, sortOrder, onSort }: {
  col: string; label: string; sortBy: string | null; sortOrder: "asc" | "desc" | null; onSort: (c: string) => void;
}) {
  const active = sortBy === col;
  return (
    <th onClick={() => onSort(col)}
      className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest cursor-pointer select-none group transition-colors hover:bg-gray-50"
      style={{ color: active ? "#f97316" : "var(--text3)", whiteSpace: "nowrap" }}>
      <span className="inline-flex items-center gap-1">
        {label}
        {active && sortOrder === "asc" && <ArrowUp size={11} className="text-orange-500" />}
        {active && sortOrder === "desc" && <ArrowDown size={11} className="text-orange-500" />}
        {!active && <ArrowUpDown size={10} className="opacity-0 group-hover:opacity-40 transition-opacity" />}
      </span>
    </th>
  );
}

export default function EntregasPage() {
  const router = useRouter();
  const [entregas, setEntregas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCidade, setFilterCidade] = useState("");
  const [mostrarFinalizados, setMostrarFinalizados] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [showFiltros, setShowFiltros] = useState(false);
  const [filterDataInicio, setFilterDataInicio] = useState("");
  const [filterDataFim, setFilterDataFim] = useState("");
  const [filterFornecedor, setFilterFornecedor] = useState("");
  const [filterVolume, setFilterVolume] = useState("");

  // Tri-state sort: null → "asc" → "desc" → null
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);

  function toggleSort(col: string) {
    if (sortBy !== col) { setSortBy(col); setSortOrder("asc"); }
    else if (sortOrder === "asc") { setSortOrder("desc"); }
    else { setSortBy(null); setSortOrder(null); }
    setPage(1);
  }

  // Modal nova entrega
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [saving, setSaving] = useState(false);
  const [motoristas, setMotoristas] = useState<any[]>([]);
  const [veiculos, setVeiculos] = useState<any[]>([]);

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
      mostrarFinalizados: String(mostrarFinalizados),
    });
    if (filterStatus) params.set("status", filterStatus);
    if (filterCidade) params.set("cidade", filterCidade);
    if (debouncedSearch) params.set("cliente", debouncedSearch);
    if (filterDataInicio) params.set("dataInicio", filterDataInicio + "T00:00:00");
    if (filterDataFim) params.set("dataFim", filterDataFim + "T23:59:59");
    if (filterFornecedor) params.set("fornecedor", filterFornecedor);
    if (filterVolume) params.set("volume", filterVolume);
    if (sortBy && sortOrder) { params.set("sortBy", sortBy); params.set("sortOrder", sortOrder); }

    const res = await fetch(`/api/entregas?${params}`);
    const data = await res.json();
    setEntregas(data.entregas || []);
    setTotal(data.total || 0);
    setPages(data.pages || 1);
    setLoading(false);
  }, [page, filterStatus, filterCidade, debouncedSearch, mostrarFinalizados, filterDataInicio, filterDataFim, filterFornecedor, filterVolume, sortBy, sortOrder]);

  useEffect(() => { fetchEntregas(); }, [fetchEntregas]);

  useEffect(() => {
    fetch("/api/motoristas?ativo=true").then((r) => r.json()).then(setMotoristas);
    fetch("/api/veiculos").then((r) => r.json()).then(setVeiculos);
  }, []);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.cnpj || !form.razaoSocial || !form.cidade) {
      toast.error("Preencha CNPJ, Razão Social e Cidade");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/entregas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          cnpj: form.cnpj.replace(/\D/g, ""),
          valorFrete: parseFloat(form.valorFrete) || 0,
          valorDescarga: parseFloat(form.valorDescarga) || 0,
          valorArmazenagem: parseFloat(form.valorArmazenagem) || 0,
          adiantamento: parseFloat(form.adiantamento) || 0,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Entrega criada!");
      setShowModal(false);
      setForm({ ...BLANK_FORM });
      fetchEntregas();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntrega(id: string) {
    if (!window.confirm("Tem certeza que deseja excluir esta entrega? Esta ação não pode ser desfeita e apenas Admins têm permissão.")) return;
    try {
      const res = await fetch(`/api/entregas/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Entrega excluída!");
      fetchEntregas();
    } catch (e: any) {
      let msg = e.message;
      try {
        const parsed = JSON.parse(e.message);
        if (parsed.error) msg = parsed.error;
      } catch {}
      toast.error(msg || "Erro ao excluir entrega. Verifique se você é Administrador.");
    }
  }

  const hojeStr = new Date().toISOString().split("T")[0];
  const atrasadas = entregas.filter((e) => {
    if (!e.dataAgendada || ["ENTREGUE", "FINALIZADO"].includes(e.status)) return false;
    const dataStr = new Date(e.dataAgendada).toISOString().split("T")[0];
    return dataStr < hojeStr;
  }).length;

  return (
    <>
      <Topbar
        title="Entregas"
        subtitle={`${total} registro${total !== 1 ? "s" : ""} encontrado${total !== 1 ? "s" : ""}`}
        actions={
          <Button onClick={() => setShowModal(true)}>
            <Plus size={15} /> Nova Entrega
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Alert atrasadas */}
        {atrasadas > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
            style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)", color: "#ef4444" }}>
            ⚠️ <strong>{atrasadas}</strong> entrega(s) com prazo vencido nesta página
          </div>
        )}

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text3)" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar NF, cidade, cliente..."
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input
              value={filterCidade}
              onChange={(e) => { setFilterCidade(e.target.value); setPage(1); }}
              placeholder="Filtrar por cidade..."
              className="px-3 py-2 rounded-lg text-sm outline-none w-44"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            <label className="flex items-center gap-2 text-xs cursor-pointer select-none" style={{ color: "var(--text2)" }}>
              <input type="checkbox" checked={mostrarFinalizados} onChange={(e) => setMostrarFinalizados(e.target.checked)}
                className="accent-orange-500 w-3.5 h-3.5" />
              Mostrar finalizados
            </label>
            <Button variant="ghost" size="sm" onClick={() => setShowFiltros(!showFiltros)} className={showFiltros ? "bg-orange-50 text-orange-600" : ""}>
              <Filter size={13} /> + Filtros
            </Button>
            <Button variant="ghost" size="sm" onClick={fetchEntregas}>
              <RefreshCw size={13} /> Atualizar
            </Button>
          </div>

          {/* Filtros Avançados Dropdown */}
          {showFiltros && (
            <div className="flex flex-wrap gap-3 mt-4 pt-4 items-end border-t border-gray-100">
               <div>
                 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Data Início</span>
                 <Input type="date" value={filterDataInicio} onChange={(e) => { setFilterDataInicio(e.target.value); setPage(1); }} className="h-9 min-w-[130px]" />
               </div>
               <div>
                 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Data Fim</span>
                 <Input type="date" value={filterDataFim} onChange={(e) => { setFilterDataFim(e.target.value); setPage(1); }} className="h-9 min-w-[130px]" />
               </div>
               <div>
                 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Fornecedor</span>
                 <Input placeholder="Buscar por remetente" value={filterFornecedor} onChange={(e) => { setFilterFornecedor(e.target.value); setPage(1); }} className="h-9 min-w-[200px]" />
               </div>
               <div>
                 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Volume Específico</span>
                 <Input type="number" placeholder="Ex: 5" value={filterVolume} onChange={(e) => { setFilterVolume(e.target.value); setPage(1); }} className="h-9 w-32" />
               </div>
               <Button variant="ghost" size="sm" className="h-9 text-xs text-gray-400" onClick={() => { setFilterDataInicio(""); setFilterDataFim(""); setFilterFornecedor(""); setFilterVolume(""); setPage(1); }}>
                 Limpar Filtros
               </Button>
            </div>
          )}
        </Card>

        {/* Table */}
        <Card className="p-0 overflow-hidden">
          {loading ? <Loading /> : entregas.length === 0 ? <Empty icon="📦" text="Nenhuma entrega encontrada" /> : (
            <>
              <Table>
                <thead>
                  <tr>
                    <SortTh col="codigo" label="Número da NF" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                    <Th>Fornecedor</Th>
                    <SortTh col="razaoSocial" label="Cliente" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                    <SortTh col="cidade" label="Cidade / UF" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                    <SortTh col="volumeTotal" label="Volumes" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                    <SortTh col="pesoTotal" label="Peso" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                    <SortTh col="motorista" label="Motorista" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                    <SortTh col="dataAgendada" label="Agendado" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                    <SortTh col="status" label="Status" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                    <SortTh col="valorFrete" label="Frete" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                    <Th></Th>
                  </tr>
                </thead>
                <tbody>
                  {entregas.map((e) => {
                    const dataStr = e.dataAgendada ? new Date(e.dataAgendada).toISOString().split("T")[0] : null;
                    const atrasada = dataStr && dataStr < hojeStr && !["ENTREGUE", "FINALIZADO"].includes(e.status);
                    return (
                      <Tr key={e.id} onClick={() => router.push(`/entregas/${e.id}`)}
                        className={atrasada ? "border-l-2" : ""}
                        style={atrasada ? { borderLeftColor: "#ef4444" } as any : {}}>
                        <Td>
                          {e.notas && e.notas.length > 0 ? (
                            <div className="space-y-1.5 py-1">
                              {e.notas.map((n: any) => (
                                <div key={n.id} className="group/nf">
                                  <div className="font-mono text-[11px] font-bold leading-tight" style={{ color: "var(--accent)" }}>
                                    NF {n.numero}
                                  </div>
                                  {n.chaveAcesso && (
                                    <div className="text-[9px] font-mono mt-0.5 max-w-[150px] truncate opacity-50 group-hover/nf:opacity-100 transition-opacity" title={n.chaveAcesso}>
                                      {n.chaveAcesso}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <>
                              <div className="font-mono text-sm leading-tight" style={{ color: "#3b82f6" }}>
                                {e.codigo}
                              </div>
                              {e.chaveAcesso && (
                                <div className="text-[10px] font-mono mt-0.5 max-w-[150px] truncate" title={e.chaveAcesso} style={{ color: "var(--text3)" }}>
                                  {e.chaveAcesso}
                                </div>
                              )}
                            </>
                          )}
                        </Td>
                        <Td>
                          <span className="text-xs" style={{ color: "var(--text2)" }}>
                            {e.notas && e.notas.length > 0 
                              ? Array.from(new Set(e.notas.filter((n: any) => n.emitenteRazao).map((n: any) => n.emitenteRazao))).join(", ") || "—"
                              : "—"}
                          </span>
                        </Td>
                        <Td>
                          <div className="font-semibold text-sm leading-tight">{e.razaoSocial}</div>
                          <div className="text-[10px] font-mono mt-0.5" style={{ color: "var(--text3)" }}>{formatCNPJ(e.cnpj)}</div>
                        </Td>
                        <Td><span className="text-xs" style={{ color: "var(--text2)" }}>{e.cidade}{e.uf ? ` — ${e.uf}` : ""}</span></Td>
                        <Td><span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: "var(--surface2)", color: "var(--text2)" }}>{e.volumeTotal || 0}</span></Td>
                        <Td><span className="text-xs font-mono" style={{ color: "var(--text2)" }}>{formatWeight(e.pesoTotal)}</span></Td>
                        <Td><span className="text-xs" style={{ color: "var(--text2)" }}>{e.motorista?.nome || <span style={{ color: "var(--text3)" }}>—</span>}</span></Td>
                        <Td>
                          <span className={`text-xs font-mono ${atrasada ? "text-red-400" : ""}`} style={!atrasada ? { color: "var(--text3)" } : {}}>
                            {formatDate(e.dataAgendada)}{atrasada ? " ⚠" : ""}
                          </span>
                        </Td>
                        <Td><StatusBadge status={e.status} /></Td>
                        <Td><span className="text-xs font-mono" style={{ color: "#10b981" }}>{formatCurrency(e.valorFrete)}</span></Td>
                        <Td>
                          <div className="flex items-center gap-1">
                            <button className="p-1.5 rounded-lg hover:opacity-70 transition-all"
                              style={{ background: "var(--surface2)", color: "#ef4444" }}
                              onClick={(ev) => { ev.stopPropagation(); deleteEntrega(e.id); }}
                              title="Excluir (Somente Admin)">
                              <Trash2 size={13} />
                            </button>
                            <button className="p-1.5 rounded-lg hover:opacity-70 transition-all"
                              style={{ background: "var(--surface2)", color: "var(--text2)" }}
                              onClick={(ev) => { ev.stopPropagation(); router.push(`/entregas/${e.id}`); }}
                              title="Visualizar">
                              <Eye size={13} />
                            </button>
                          </div>
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>

              {/* Pagination */}
              {pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--border)" }}>
                  <span className="text-xs font-mono" style={{ color: "var(--text3)" }}>
                    Página {page} de {pages} · {total} registros
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

      {/* Modal Nova Entrega */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setForm({ ...BLANK_FORM }); }} title="📦 Nova Entrega" size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Input label="CNPJ *" value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)} placeholder="00.000.000/0000-00" />
          <Input label="Razão Social *" value={form.razaoSocial} onChange={(e) => set("razaoSocial", e.target.value)} />
          <Input label="Cidade *" value={form.cidade} onChange={(e) => set("cidade", e.target.value)} />
          <Input label="UF" value={form.uf} onChange={(e) => set("uf", e.target.value)} maxLength={2} />
          <Input label="Endereço" value={form.endereco} onChange={(e) => set("endereco", e.target.value)} className="col-span-2" />
          <Input label="Bairro" value={form.bairro} onChange={(e) => set("bairro", e.target.value)} />
          <Input label="CEP" value={form.cep} onChange={(e) => set("cep", e.target.value)} />
          <Input label="Data Chegada" type="date" value={form.dataChegada} onChange={(e) => set("dataChegada", e.target.value)} />
          <Input label="Data Agendada" type="date" value={form.dataAgendada} onChange={(e) => set("dataAgendada", e.target.value)} />

          <ComboboxMotorista motoristas={motoristas} veiculos={veiculos} value={form.motoristaId} onChange={(id) => set("motoristaId", id)} onAutoFillVeiculo={(vid) => set("veiculoId", vid)} />
          <Select label="Veículo (Auto-completo)" value={form.veiculoId} onChange={(e) => set("veiculoId", e.target.value)}>
            <option value="">Selecionar...</option>
            {veiculos.map((v) => <option key={v.id} value={v.id}>{v.placa} — {v.tipo}</option>)}
          </Select>

          <div className="col-span-2">
            <div className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: "var(--text3)", borderTop: "1px solid var(--border)", paddingTop: "12px" }}>Financeiro</div>
            <div className="grid grid-cols-4 gap-3">
              <Input label="Valor Frete" type="number" step="0.01" value={form.valorFrete} onChange={(e) => set("valorFrete", e.target.value)} placeholder="0,00" />
              <Input label="Descarga" type="number" step="0.01" value={form.valorDescarga} onChange={(e) => set("valorDescarga", e.target.value)} placeholder="0,00" />
              <Input label="Armazenagem" type="number" step="0.01" value={form.valorArmazenagem} onChange={(e) => set("valorArmazenagem", e.target.value)} placeholder="0,00" />
              <Input label="Adiantamento" type="number" step="0.01" value={form.adiantamento} onChange={(e) => set("adiantamento", e.target.value)} placeholder="0,00" />
            </div>
          </div>

          <Textarea label="Observações" value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} className="col-span-2" />
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
          <Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>Criar Entrega</Button>
        </div>
      </Modal>
    </>
  );
}
