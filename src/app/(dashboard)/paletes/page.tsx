"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Button, Card, Loading, Empty, Table, Th, Td, Tr, Modal, Input, Select } from "@/components/ui";
import { formatCNPJ, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import {
  Package, Plus, RefreshCw, Search, X, Trash2, Edit2, Upload, Download, Settings,
  ArrowUp, ArrowDown, Calendar, FileText,
} from "lucide-react";

type StatusPalete = "PENDENTE" | "ACEITO" | "CANCELADO" | "RETORNOU";
type TipoMovimento = "SAIDA" | "ENTRADA";

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PENDENTE: { bg: "rgba(148,163,184,0.15)", color: "#64748b" },
  ACEITO: { bg: "rgba(16,185,129,0.12)", color: "#059669" },
  CANCELADO: { bg: "rgba(249,115,22,0.15)", color: "#ea580c" },
  RETORNOU: { bg: "rgba(234,179,8,0.18)", color: "#a16207" },
};

const BLANK_FORM = {
  nf: "",
  tipoPallet: "CHEP",
  dataEmissao: new Date().toISOString().slice(0, 10),
  quantidade: "",
  cnpjCliente: "",
  razaoCliente: "",
  glnCliente: "",
  tipoMovimento: "SAIDA" as TipoMovimento,
  status: "PENDENTE" as StatusPalete,
  observacoes: "",
  ticketBaixa: "",
};

export default function PaletesPage() {
  const [movimentos, setMovimentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totais, setTotais] = useState({ totalSaida: 0, totalEntrada: 0, totalRetornou: 0, saldo: 0 });

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [saving, setSaving] = useState(false);

  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<any>({ cnpjPool: "", razaoPool: "", glnPool: "", tipoPallet: "CHEP" });
  const [savingConfig, setSavingConfig] = useState(false);

  const [importingXML, setImportingXML] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounce search
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchMovimentos = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (dataInicio) params.set("dataInicio", dataInicio);
    if (dataFim) params.set("dataFim", dataFim);
    if (filterTipo) params.set("tipoMovimento", filterTipo);
    if (filterStatus) params.set("status", filterStatus);

    const res = await fetch(`/api/paletes?${params}`, { cache: "no-store" });
    const data = await res.json();
    setMovimentos(data.movimentos || []);
    setTotais({
      totalSaida: data.totalSaida || 0,
      totalEntrada: data.totalEntrada || 0,
      totalRetornou: data.totalRetornou || 0,
      saldo: data.saldo || 0,
    });
    setLoading(false);
  }, [debouncedSearch, dataInicio, dataFim, filterTipo, filterStatus]);

  useEffect(() => { fetchMovimentos(); }, [fetchMovimentos]);

  useEffect(() => {
    fetch("/api/paletes/config").then(r => r.json()).then(setConfig);
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  function openAdd() {
    setEditingId(null);
    setForm({ ...BLANK_FORM });
    setShowModal(true);
  }

  function openEdit(m: any) {
    setEditingId(m.id);
    setForm({
      nf: m.nf || "",
      tipoPallet: m.tipoPallet || "CHEP",
      dataEmissao: m.dataEmissao ? m.dataEmissao.slice(0, 10) : "",
      quantidade: String(m.quantidade || ""),
      cnpjCliente: m.cnpjCliente || "",
      razaoCliente: m.razaoCliente || "",
      glnCliente: m.glnCliente || "",
      tipoMovimento: m.tipoMovimento || "SAIDA",
      status: m.status || "PENDENTE",
      observacoes: m.observacoes || "",
      ticketBaixa: m.ticketBaixa || "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.nf || !form.cnpjCliente || !form.razaoCliente || !form.quantidade || !form.dataEmissao) {
      toast.error("Preencha NF, Data, Quantidade, CNPJ e Cliente");
      return;
    }
    setSaving(true);
    try {
      const url = editingId ? `/api/paletes/${editingId}` : "/api/paletes";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(editingId ? "Movimento atualizado" : "Movimento criado");
      setShowModal(false);
      fetchMovimentos();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este movimento?")) return;
    try {
      const res = await fetch(`/api/paletes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Movimento excluído");
      fetchMovimentos();
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir");
    }
  }

  async function handleXMLUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setImportingXML(true);
    try {
      const xmls: { filename: string; content: string }[] = [];
      for (const f of Array.from(files)) {
        const content = await f.text();
        xmls.push({ filename: f.name, content });
      }
      const res = await fetch("/api/paletes/import-xml", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xmls }),
      });
      const data = await res.json();
      if (data.criados > 0) toast.success(`${data.criados} NF(s) importada(s)`);
      if (data.ignorados?.length > 0) {
        toast(`${data.ignorados.length} ignorada(s): ${data.ignorados.map((i: any) => i.motivo).join(", ")}`, { icon: "⚠️" });
      }
      fetchMovimentos();
    } catch (err: any) {
      toast.error(err.message || "Erro ao importar XML");
    } finally {
      setImportingXML(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleExport() {
    const params = new URLSearchParams();
    if (dataInicio) params.set("dataInicio", dataInicio);
    if (dataFim) params.set("dataFim", dataFim);
    const url = `/api/paletes/export?${params}`;
    // Trigger download
    window.open(url, "_blank");
  }

  async function handleSaveConfig() {
    setSavingConfig(true);
    try {
      const res = await fetch("/api/paletes/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Configuração salva");
      setShowConfig(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally { setSavingConfig(false); }
  }

  function clearFilters() {
    setSearch("");
    setDebouncedSearch("");
    setDataInicio("");
    setDataFim("");
    setFilterTipo("");
    setFilterStatus("");
  }

  const hasAnyFilter = debouncedSearch || dataInicio || dataFim || filterTipo || filterStatus;

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Controle de Paletes"
        subtitle="Movimentação CHEP"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowConfig(true)}>
              <Settings size={14} /> Pool
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml"
              multiple
              className="hidden"
              onChange={(e) => handleXMLUpload(e.target.files)}
            />
            <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} loading={importingXML}>
              <Upload size={14} /> Importar XML
            </Button>
            <Button variant="ghost" size="sm" onClick={handleExport}>
              <Download size={14} /> Exportar
            </Button>
            <Button size="sm" onClick={openAdd}>
              <Plus size={14} /> Novo
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--text3)" }}>Total movs</div>
            <div className="text-2xl font-bold mt-1">{movimentos.length}</div>
          </Card>
          <Card className="p-3">
            <div className="text-[9px] font-bold uppercase tracking-widest text-red-600">Saídas</div>
            <div className="text-2xl font-bold mt-1 text-red-600 flex items-center gap-1">
              <ArrowUp size={16} /> {totais.totalSaida}
            </div>
            {totais.totalRetornou > 0 && (
              <div className="text-[10px] text-yellow-600 mt-0.5">
                +{totais.totalRetornou} retornaram
              </div>
            )}
          </Card>
          <Card className="p-3">
            <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-600">Entradas</div>
            <div className="text-2xl font-bold mt-1 text-emerald-600 flex items-center gap-1">
              <ArrowDown size={16} /> {totais.totalEntrada}
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--text3)" }}>Saldo</div>
            <div className={`text-2xl font-bold mt-1 ${totais.saldo >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {totais.saldo >= 0 ? "+" : ""}{totais.saldo}
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-3 sm:p-4">
          <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
            <div className="relative flex-1 min-w-0 w-full sm:w-auto sm:min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text3)" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar NF, cliente, CNPJ, ticket..."
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            </div>
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="px-3 py-2 rounded-lg text-xs outline-none cursor-pointer"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <option value="">Todos movimentos</option>
              <option value="SAIDA">Saída</option>
              <option value="ENTRADA">Entrada</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-lg text-xs outline-none cursor-pointer"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <option value="">Todos status</option>
              <option value="PENDENTE">Pendente</option>
              <option value="ACEITO">Aceito</option>
              <option value="CANCELADO">Cancelado</option>
              <option value="RETORNOU">Retornou</option>
            </select>
            <Button variant="ghost" size="sm" onClick={fetchMovimentos}>
              <RefreshCw size={13} /> Atualizar
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text3)" }}>
              <Calendar size={11} /> Período (data emissão)
            </div>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            <span className="text-xs" style={{ color: "var(--text3)" }}>até</span>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            {hasAnyFilter && (
              <button
                onClick={clearFilters}
                className="text-[11px] font-medium px-2 py-1 rounded-lg transition-all hover:bg-red-50"
                style={{ color: "#ef4444" }}
              >
                <X size={11} className="inline -mt-px mr-0.5" /> Limpar filtros
              </button>
            )}
          </div>
        </Card>

        {/* Table */}
        <Card className="p-0 overflow-hidden">
          {loading ? <Loading /> : movimentos.length === 0 ? <Empty icon="📦" text="Nenhum movimento encontrado" /> : (
            <>
              {/* Mobile: card list */}
              <div className="block md:hidden divide-y" style={{ borderColor: "var(--border)" }}>
                {movimentos.map((m) => {
                  const stc = STATUS_COLORS[m.status] || STATUS_COLORS.PENDENTE;
                  return (
                    <div key={m.id} onClick={() => openEdit(m)} className="p-3 cursor-pointer active:bg-slate-50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[11px] font-bold" style={{ color: "var(--accent)" }}>NF {m.nf}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${m.tipoMovimento === "SAIDA" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                            {m.tipoMovimento}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: stc.bg, color: stc.color }}>
                            {m.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm font-semibold truncate">{m.razaoCliente}</div>
                      <div className="text-[11px] font-mono" style={{ color: "var(--text3)" }}>{formatCNPJ(m.cnpjCliente)}</div>
                      <div className="flex items-center justify-between mt-1.5">
                        <div className="text-[11px]" style={{ color: "var(--text3)" }}>
                          {formatDate(m.dataEmissao)} · {m.quantidade} paletes ({m.tipoPallet})
                        </div>
                        {m.ticketBaixa && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-700">
                            {m.ticketBaixa}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop: table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <thead>
                    <Tr>
                      <Th>NF</Th>
                      <Th>Tipo</Th>
                      <Th>Data</Th>
                      <Th>Qtd</Th>
                      <Th>CNPJ</Th>
                      <Th>Cliente</Th>
                      <Th>GLN</Th>
                      <Th>Status</Th>
                      <Th>Movimento</Th>
                      <Th>Observações</Th>
                      <Th></Th>
                    </Tr>
                  </thead>
                  <tbody>
                    {movimentos.map((m) => {
                      const stc = STATUS_COLORS[m.status] || STATUS_COLORS.PENDENTE;
                      return (
                        <Tr key={m.id}>
                          <Td>{m.nf}</Td>
                          <Td>{m.tipoPallet}</Td>
                          <Td>{formatDate(m.dataEmissao)}</Td>
                          <Td>{m.quantidade}</Td>
                          <Td>{formatCNPJ(m.cnpjCliente)}</Td>
                          <Td>{m.razaoCliente}</Td>
                          <Td>{m.glnCliente || "—"}</Td>
                          <Td>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: stc.bg, color: stc.color }}>
                              {m.status}
                            </span>
                          </Td>
                          <Td>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${m.tipoMovimento === "SAIDA" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                              {m.tipoMovimento}
                            </span>
                          </Td>
                          <Td>
                            <div className="flex flex-col gap-0.5 max-w-[200px]">
                              {m.observacoes && <span className="text-[10px] truncate">{m.observacoes}</span>}
                              {m.ticketBaixa && <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-yellow-50 text-yellow-700 w-fit">{m.ticketBaixa}</span>}
                            </div>
                          </Td>
                          <Td>
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEdit(m)} className="p-1 rounded hover:bg-slate-100" title="Editar">
                                <Edit2 size={13} className="text-slate-500" />
                              </button>
                              <button onClick={() => handleDelete(m.id)} className="p-1 rounded hover:bg-red-50" title="Excluir">
                                <Trash2 size={13} className="text-red-500" />
                              </button>
                            </div>
                          </Td>
                        </Tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? "Editar Movimento" : "Novo Movimento"} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="NF *" value={form.nf} onChange={(e) => set("nf", e.target.value)} />
          <Input label="Data Emissão *" type="date" value={form.dataEmissao} onChange={(e) => set("dataEmissao", e.target.value)} />
          <Input label="Tipo Pallet" value={form.tipoPallet} onChange={(e) => set("tipoPallet", e.target.value)} />
          <Input label="Quantidade *" type="number" value={form.quantidade} onChange={(e) => set("quantidade", e.target.value)} />
          <Input label="CNPJ Cliente *" value={form.cnpjCliente} onChange={(e) => set("cnpjCliente", e.target.value)} />
          <Input label="Razão Social *" value={form.razaoCliente} onChange={(e) => set("razaoCliente", e.target.value)} />
          <Input label="GLN Cliente" value={form.glnCliente} onChange={(e) => set("glnCliente", e.target.value)} />
          <Select label="Movimento *" value={form.tipoMovimento} onChange={(e) => set("tipoMovimento", e.target.value)}>
            <option value="SAIDA">Saída</option>
            <option value="ENTRADA">Entrada</option>
          </Select>
          <Select label="Status" value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="PENDENTE">Pendente</option>
            <option value="ACEITO">Aceito</option>
            <option value="CANCELADO">Cancelado</option>
            <option value="RETORNOU">Retornou</option>
          </Select>
          <Input label="Ticket de Baixa" value={form.ticketBaixa} onChange={(e) => set("ticketBaixa", e.target.value)} placeholder="Ex: B2026006395003" />
          <div className="sm:col-span-2">
            <Input label="Observações" value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
          <Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>{editingId ? "Atualizar" : "Criar"}</Button>
        </div>
      </Modal>

      {/* Config Modal */}
      <Modal open={showConfig} onClose={() => setShowConfig(false)} title="Configuração Pool Paletes (Origem no Export)" size="md">
        <div className="space-y-3">
          <p className="text-xs" style={{ color: "var(--text3)" }}>
            Estes dados serão usados como <strong>ORIGEM</strong> no relatório exportado (empresa dona da conta CHEP, ex: Heinz).
          </p>
          <Input label="CNPJ Pool" value={config.cnpjPool || ""} onChange={(e) => setConfig({ ...config, cnpjPool: e.target.value })} />
          <Input label="Razão Social Pool" value={config.razaoPool || ""} onChange={(e) => setConfig({ ...config, razaoPool: e.target.value })} />
          <Input label="GLN Pool" value={config.glnPool || ""} onChange={(e) => setConfig({ ...config, glnPool: e.target.value })} />
          <Input label="Tipo Pallet padrão" value={config.tipoPallet || "CHEP"} onChange={(e) => setConfig({ ...config, tipoPallet: e.target.value })} />
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
          <Button variant="ghost" onClick={() => setShowConfig(false)}>Cancelar</Button>
          <Button onClick={handleSaveConfig} loading={savingConfig}>Salvar</Button>
        </div>
      </Modal>
    </div>
  );
}
