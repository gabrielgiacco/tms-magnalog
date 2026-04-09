"use client";
import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { Topbar } from "@/components/layout/Topbar";
import { Button, Card, Loading, Empty, StatusBadge, Modal, Input, Table, Th, Td, Tr, Select } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import { RefreshCw, Edit2, Search, DollarSign, Clock, CheckCircle, Download, FileSignature, AlertCircle, HandCoins } from "lucide-react";

export default function FinanceiroTerceirosPage() {
  const [entregas, setEntregas] = useState<any[]>([]);
  const [totais, setTotais] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [pendente, setPendente] = useState(true);
  
  const [showEdit, setShowEdit] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (search) params.set("cliente", search);
    if (pendente) params.set("pendente", "true");
    const res = await fetch(`/api/financeiro?${params}`);
    const data = await res.json();
    setEntregas(data.entregas || []);
    setTotais(data.totais || {});
    setTotal(data.total || 0);
    setPages(data.pages || 1);
    setLoading(false);
  }, [page, search, pendente]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openEdit(e: any) {
    setEditingId(e.id);
    setEditForm({
      valorMotorista: String(e.valorMotorista || 0),
      valorSaida: String(e.valorSaida || 0),
      adiantamentoMotorista: String(e.adiantamentoMotorista || 0),
      dataAdiantamento: e.dataAdiantamento ? e.dataAdiantamento.slice(0, 10) : "",
      descontosMotorista: String(e.descontosMotorista || 0),
      dataPagamentoSaldo: e.dataPagamentoSaldo ? e.dataPagamentoSaldo.slice(0, 10) : "",
      statusCanhoto: e.statusCanhoto || "PENDENTE"
    });
    setShowEdit(true);
  }

  async function handleSave() {
    if (!editingId) return;
    setSaving(true);
    try {
      const editingViagem = entregas.find(e => e.id === editingId);
      const res = await fetch("/api/financeiro", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          isRota: editingViagem?.isRota || false,
          valorMotorista: parseFloat(editForm.valorMotorista) || 0,
          valorSaida: parseFloat(editForm.valorSaida) || 0,
          adiantamentoMotorista: parseFloat(editForm.adiantamentoMotorista) || 0,
          dataAdiantamento: editForm.dataAdiantamento || null,
          descontosMotorista: parseFloat(editForm.descontosMotorista) || 0,
          dataPagamentoSaldo: editForm.dataPagamentoSaldo || null,
          statusCanhoto: editForm.statusCanhoto
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Acerto atualizado com sucesso");
      setShowEdit(false);
      fetchData();
    } catch { toast.error("Erro ao salvar acerto"); }
    finally { setSaving(false); }
  }

  const set = (k: string, v: string) => setEditForm((f: any) => ({ ...f, [k]: v }));

  const currentSaldoEdit = 
    (parseFloat(editForm.valorMotorista)||0) - 
    (parseFloat(editForm.adiantamentoMotorista)||0) - 
    (parseFloat(editForm.valorSaida)||0) - 
    (parseFloat(editForm.descontosMotorista)||0);

  return (
    <>
      <Topbar title="Acerto de Motoristas" subtitle={`${total} viagens · Controle de Pagamentos de Terceiros`}
        actions={
          <Button variant="ghost" size="sm" onClick={() => window.open("/api/export?tipo=financeiro-motoristas", "_blank")}>
            <Download size={14} /> Exportar CSV
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-5 gap-4">
          <Card className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(249,115,22,.1)", border: "1px solid rgba(249,115,22,.25)" }}>
              <HandCoins size={18} style={{ color: "#f97316" }} />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase" style={{ color: "var(--text3)" }}>Custo Combinado</div>
              <div className="font-head text-sm font-black" style={{ color: "#f97316" }}>{formatCurrency(totais.valorMotorista ?? 0)}</div>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(59,130,246,.1)", border: "1px solid rgba(59,130,246,.25)" }}>
              <DollarSign size={18} style={{ color: "#3b82f6" }} />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase" style={{ color: "var(--text3)" }}>Adiantado (Frota)</div>
              <div className="font-head text-sm font-black" style={{ color: "#3b82f6" }}>{formatCurrency(totais.adiantamentoMotorista ?? 0)}</div>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.25)" }}>
              <AlertCircle size={18} style={{ color: "#10b981" }} />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase" style={{ color: "var(--text3)" }}>Vales / Saídas</div>
              <div className="font-head text-sm font-black" style={{ color: "#10b981" }}>{formatCurrency(totais.valorSaida ?? 0)}</div>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)" }}>
              <FileSignature size={18} style={{ color: "#ef4444" }} />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase" style={{ color: "var(--text3)" }}>Descontos (Avarias)</div>
              <div className="font-head text-sm font-black" style={{ color: "#ef4444" }}>{formatCurrency(totais.descontosMotorista ?? 0)}</div>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4 border border-rose-200">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(244,63,94,.1)", border: "1px solid rgba(244,63,94,.25)" }}>
              <Clock size={18} style={{ color: "#f43f5e" }} />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase font-bold text-rose-500">Saldo Pendente</div>
              <div className="font-head text-lg font-black text-rose-600">{formatCurrency(totais.saldoMotorista ?? 0)}</div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex gap-3 items-center flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text3)" }} />
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Buscar por nome do motorista ou NF..."
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }} />
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none text-rose-600">
              <input type="checkbox" checked={pendente} onChange={(e) => { setPendente(e.target.checked); setPage(1); }}
                className="accent-rose-500 w-4 h-4 cursor-pointer" />
              Somente com saldo a pagar
            </label>
            <Button variant="ghost" size="sm" onClick={fetchData}><RefreshCw size={13} /> Atualizar</Button>
          </div>
        </Card>

        {/* Table */}
        <Card className="p-0 overflow-hidden shadow">
          {loading ? <Loading /> : entregas.length === 0 ? <Empty icon="🛣️" text="Nenhum acerto de viagem pendente." /> : (
            <Table>
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <Th>NF</Th><Th>Motorista</Th>
                  <Th>Canhoto</Th>
                  <Th className="text-right">Frete Combinado</Th>
                  <Th className="text-right">Vales / Saída</Th>
                  <Th className="text-right">Adiantamento</Th>
                  <Th className="text-right">Desconto</Th>
                  <Th className="text-right bg-rose-50 text-rose-700">Saldo a Pagar</Th>
                  <Th>Data Pgto</Th><Th></Th>
                </tr>
              </thead>
              <tbody>
                {entregas.map((e) => (
                  <Tr key={e.id} className="hover:bg-slate-50">
                    <Td>
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase ${e.isRota ? "bg-orange-100 text-orange-700 border border-orange-200" : "bg-blue-100 text-blue-700 border border-blue-200"}`}>
                          {e.isRota ? "🛣️ Rota" : "📄 Direta"}
                        </span>
                        <span className="font-mono text-xs font-bold text-gray-700">
                          {e.notas && e.notas.length > 0 ? e.notas.map((n: any) => n.numero).join(", ") : e.codigo}
                        </span>
                      </div>
                    </Td>
                    <Td>
                      <div className="font-bold text-sm text-gray-800 uppercase">{e.motorista?.nome || "Motorista não vinculado"}</div>
                      <div className="text-[10px] text-gray-400 font-mono">Rota para: {e.cidade}</div>
                    </Td>
                    <Td>
                      <StatusBadge status={e.statusCanhoto || "PENDENTE"} />
                    </Td>
                    <Td className="text-right"><span className="font-mono text-sm font-bold text-orange-500">{formatCurrency(e.valorMotorista)}</span></Td>
                    <Td className="text-right"><span className="font-mono text-xs text-gray-500">{formatCurrency(e.valorSaida)}</span></Td>
                    <Td className="text-right text-gray-500">
                        <div className="font-mono text-xs text-blue-500 font-bold">{formatCurrency(e.adiantamentoMotorista)}</div>
                        <div className="text-[9px] font-mono">{formatDate(e.dataAdiantamento)}</div>
                    </Td>
                    <Td className="text-right"><span className="font-mono text-xs text-red-500 font-bold">{formatCurrency(e.descontosMotorista)}</span></Td>
                    <Td className="text-right bg-rose-50/30">
                      <span className={`font-mono text-sm font-black ${e.saldoMotorista > 0 ? "text-rose-600" : "text-emerald-500"}`}>
                        {formatCurrency(e.saldoMotorista)}
                      </span>
                    </Td>
                    <Td><span className="font-mono text-[10px] font-bold" style={{ color: "var(--text3)" }}>{formatDate(e.dataPagamentoSaldo) || "-"}</span></Td>
                    <Td>
                      <button onClick={() => openEdit(e)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-gray-800 text-white hover:bg-gray-700">
                        Acerto
                      </button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="💸 Fechar Acerto do Terceiro" size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Valor Combinado (Frete)" type="number" step="0.01" value={editForm.valorMotorista} onChange={(e) => set("valorMotorista", e.target.value)} />
          <Input label="Vales / Saída (Pedágio)" type="number" step="0.01" value={editForm.valorSaida} onChange={(e) => set("valorSaida", e.target.value)} />
          
          <div className="border border-blue-100 bg-blue-50 p-3 rounded-xl space-y-3">
             <div className="text-xs font-bold text-blue-800 uppercase">Adiantamento</div>
             <Input label="R$ Adiantado" type="number" step="0.01" value={editForm.adiantamentoMotorista} onChange={(e) => set("adiantamentoMotorista", e.target.value)} />
             <Input label="Data de Liberação" type="date" value={editForm.dataAdiantamento} onChange={(e) => set("dataAdiantamento", e.target.value)} />
          </div>

          <div className="border border-red-100 bg-red-50 p-3 rounded-xl space-y-3">
             <div className="text-xs font-bold text-red-800 uppercase">Avarias / Controle</div>
             <Select label="Status do Canhoto NF" value={editForm.statusCanhoto} onChange={(e) => set("statusCanhoto", e.target.value)}>
                <option value="PENDENTE">Pendente</option>
                <option value="RECEBIDO">Recebido Assinado</option>
                <option value="COM_RESSALVA">Com Ressalva</option>
             </Select>
             <Input label="R$ Desconto Falta" type="number" step="0.01" value={editForm.descontosMotorista} onChange={(e) => set("descontosMotorista", e.target.value)} />
          </div>

          <div className="col-span-2 mt-2 p-4 rounded-xl flex justify-between items-center" style={{ background: "rgba(244,63,94,.08)", border: "1px solid rgba(244,63,94,.25)" }}>
            <div>
                <div className="text-xs uppercase font-bold text-rose-800">Saldo Restante Calculado:</div>
                <div className="font-head text-3xl font-black mt-1" style={{ color: currentSaldoEdit > 0 ? "#e11d48" : "#10b981" }}>
                {formatCurrency(currentSaldoEdit)}
                </div>
            </div>
            
            <div className="text-right">
                <Input label="Data Pgto Quitação" type="date" value={editForm.dataPagamentoSaldo} onChange={(e) => set("dataPagamentoSaldo", e.target.value)} />
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
           <div className="text-[10px] text-gray-500 font-mono">Saldo = Combinado - Saída - Adiantamento - Desconto</div>
           <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setShowEdit(false)}>Cancelar</Button>
            <Button className="bg-gray-800 text-white" onClick={handleSave} loading={saving}>Salvar Acerto</Button>
           </div>
        </div>
      </Modal>
    </>
  );
}
