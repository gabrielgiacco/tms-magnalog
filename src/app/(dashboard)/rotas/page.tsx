"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Topbar } from "@/components/layout/Topbar";
import { Button, Card, Loading, Empty, StatusBadge, Modal, Input, Select, ComboboxMotorista } from "@/components/ui";
import { formatWeight, formatDate, formatCurrency } from "@/lib/utils";
import { Plus, RefreshCw, ChevronDown, ChevronUp, Truck, User, Package, Calendar, Route, Search, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";

export default function RotasPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  
  const [rotas, setRotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [motoristas, setMotoristas] = useState<any[]>([]);
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [entregasDisp, setEntregasDisp] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ data: "", motoristaId: "", veiculoId: "", valorMotorista: "", observacoes: "", entregaIds: [] as string[] });
  const [searchEntrega, setSearchEntrega] = useState("");

  const fetchRotas = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/rotas");
    setRotas(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchRotas(); }, [fetchRotas]);

  useEffect(() => {
    fetch("/api/motoristas?ativo=true").then((r) => r.json()).then(setMotoristas);
    fetch("/api/veiculos").then((r) => r.json()).then(setVeiculos);
    fetch("/api/entregas?limit=200").then((r) => r.json()).then((d) =>
      setEntregasDisp((d.entregas || []).filter((e: any) => !e.rotaId && !["ENTREGUE", "FINALIZADO"].includes(e.status)))
    );
  }, []);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  function toggleEntrega(id: string) {
    setForm((f) => ({
      ...f,
      entregaIds: f.entregaIds.includes(id) ? f.entregaIds.filter((x) => x !== id) : [...f.entregaIds, id],
    }));
  }

  async function handleSave() {
    if (!form.data) { toast.error("Data é obrigatória"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/rotas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success("Rota criada!");
      setShowModal(false);
      setForm({ data: "", motoristaId: "", veiculoId: "", valorMotorista: "", observacoes: "", entregaIds: [] });
      fetchRotas();
    } catch { toast.error("Erro ao criar rota"); }
    finally { setSaving(false); }
  }

  async function handleStatusChange(rotaId: string, status: string) {
    await fetch(`/api/rotas/${rotaId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchRotas();
    toast.success("Status atualizado");
  }

  async function handleDeleteRota(id: string) {
    if (!window.confirm("Tem certeza que deseja EXCLUIR esta rota? As notas vinculadas voltarão para a lista de disponíveis.")) return;
    
    try {
      const res = await fetch(`/api/rotas/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao excluir");
      }
      toast.success("Rota excluída com sucesso");
      fetchRotas();
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  const filteredEntregas = entregasDisp.filter(e => {
    if (!searchEntrega) return true;
    const q = searchEntrega.toLowerCase();
    return (
      e.codigo?.toLowerCase().includes(q) ||
      e.razaoSocial?.toLowerCase().includes(q) ||
      e.cidade?.toLowerCase().includes(q) ||
      (e.notas && e.notas.some((n: any) => n.numero.toLowerCase().includes(q)))
    );
  });

  const allFilteredSelected = filteredEntregas.length > 0 && filteredEntregas.every(e => form.entregaIds.includes(e.id));

  function toggleAll() {
    const ids = filteredEntregas.map(e => e.id);
    if (allFilteredSelected) {
      setForm(f => ({ ...f, entregaIds: f.entregaIds.filter(x => !ids.includes(x)) }));
    } else {
      setForm(f => ({ ...f, entregaIds: Array.from(new Set([...f.entregaIds, ...ids])) }));
    }
  }

  const selectedEntregas = entregasDisp.filter((e) => form.entregaIds.includes(e.id));
  const totalPeso = selectedEntregas.reduce((s, e) => s + e.pesoTotal, 0);
  const totalVol = selectedEntregas.reduce((s, e) => s + e.volumeTotal, 0);

  return (
    <>
      <Topbar
        title="Rotas"
        subtitle={`${rotas.length} rota(s) registradas`}
        actions={
          <Button onClick={() => setShowModal(true)}>
            <Plus size={15} /> Nova Rota
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {loading ? <Loading /> : rotas.length === 0 ? <Empty icon="🗺️" text="Nenhuma rota criada" /> : (
          rotas.map((rota) => (
            <Card key={rota.id} className="p-0 overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px]" style={{ color: "var(--text3)" }}>{rota.codigo}</span>
                    <StatusBadge status={rota.status} />
                    {rota.status === "PLANEJADA" && (
                      <Button size="sm" variant="ghost" onClick={() => handleStatusChange(rota.id, "EM_ANDAMENTO")}>→ Iniciar</Button>
                    )}
                    {rota.status === "EM_ANDAMENTO" && (
                      <Button size="sm" variant="success" onClick={() => handleStatusChange(rota.id, "CONCLUIDA")}>✓ Concluir</Button>
                    )}
                    <Button size="sm" variant="ghost" className="ml-auto" onClick={() => router.push(`/rotas/${rota.id}`)}>
                      Detalhes →
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs mt-1" style={{ color: "var(--text2)" }}>
                    <div className="flex items-center gap-1.5">
                      <User size={13} style={{ color: "var(--text3)" }} />
                      {rota.motorista?.nome || <span className="italic opacity-50">Sem motorista</span>}
                    </div>
                    {rota.veiculo && (
                      <div className="flex items-center gap-1.5 border-l pl-4" style={{ borderColor: "var(--border)" }}>
                        <Truck size={13} style={{ color: "var(--text3)" }} />
                        {rota.veiculo.placa}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 border-l pl-4" style={{ borderColor: "var(--border)" }}>
                      <span className="text-[10px] font-mono text-gray-400 uppercase">Combinado:</span>
                      <span className="font-bold" style={{ color: rota.valorMotorista > 0 ? "#10b981" : "var(--text3)" }}>
                        {formatCurrency(rota.valorMotorista || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Package size={13} style={{ color: "var(--text3)" }} />
                        {rota.entregas?.length || 0} notas
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} style={{ color: "var(--text3)" }} />
                        {formatDate(rota.data)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-l pl-3 ml-2" style={{ borderColor: "var(--border)" }}>
                    {isAdmin && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteRota(rota.id); }}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-500 transition-colors"
                        title="Excluir Rota"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <button onClick={() => setExpanded(expanded === rota.id ? null : rota.id)}
                      className="p-2 rounded-lg transition-all hover:opacity-70"
                      style={{ background: "var(--surface2)", color: "var(--text3)" }}>
                      {expanded === rota.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded entregas */}
              {expanded === rota.id && rota.entregas?.length > 0 && (
                <div style={{ borderTop: "1px solid var(--border)" }}>
                  <div className="px-5 py-2.5 text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--text3)", background: "var(--surface2)" }}>
                    Entregas nesta rota
                  </div>
                  {rota.entregas.map((e: any) => (
                    <div key={e.id} className="flex items-center gap-4 px-5 py-3" style={{ borderTop: "1px solid var(--border)" }}>
                      <span className="font-mono text-[11px] w-24 flex-shrink-0" style={{ color: "var(--accent)" }}>
                        {e.notas && e.notas.length > 0 ? e.notas.map((n: any) => n.numero).join(", ") : e.codigo}
                      </span>
                      <span className="text-sm font-medium flex-1">{e.razaoSocial}</span>
                      <span className="text-xs" style={{ color: "var(--text2)" }}>{e.cidade}</span>
                      <span className="text-xs font-mono" style={{ color: "var(--text3)" }}>{formatWeight(e.pesoTotal)}</span>
                      <StatusBadge status={e.status} />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Modal Nova Rota */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="🗺️ Nova Rota" size="xl">
        <div className="grid grid-cols-2 gap-4 mb-5">
          <Input label="Data *" type="date" value={form.data} onChange={(e) => set("data", e.target.value)} />
          <ComboboxMotorista motoristas={motoristas} veiculos={veiculos} value={form.motoristaId} onChange={(id) => set("motoristaId", id)} onAutoFillVeiculo={(vid) => set("veiculoId", vid)} />
          <Select label="Veículo" value={form.veiculoId} onChange={(e) => set("veiculoId", e.target.value)}>
            <option value="">Selecionar...</option>
            {veiculos.map((v) => <option key={v.id} value={v.id}>{v.placa} — {v.tipo}</option>)}
          </Select>
          <Input label="Valor Combinado (Terceiro)" type="number" step="0.01" value={form.valorMotorista} onChange={(e) => set("valorMotorista", e.target.value)} />
          <Input label="Observações" value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
        </div>

        {/* Seleção de entregas */}
        <div className="pt-4" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text)" }}>Selecionar Notas Fiscais</h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Total Disponível:</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-gray-100">{entregasDisp.length}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text3)" }} />
              <input type="text" placeholder="🔍 Buscar por NF, Cliente ou CIDADE..."
                value={searchEntrega} onChange={e => setSearchEntrega(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none font-medium"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }} />
            </div>
            
            <button onClick={toggleAll}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
              style={{
                background: allFilteredSelected ? "rgba(249,115,22,.12)" : "var(--surface2)",
                border: `1px solid ${allFilteredSelected ? "rgba(249,115,22,.3)" : "var(--border)"}`,
                color: allFilteredSelected ? "#f97316" : "var(--text2)",
              }}>
              <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                style={{ background: allFilteredSelected ? "var(--accent)" : "transparent", border: `1.5px solid ${allFilteredSelected ? "var(--accent)" : "var(--border)"}` }}>
                {allFilteredSelected && <span className="text-white text-[9px]">✓</span>}
              </div>
              {allFilteredSelected ? "Desmarcar Todos" : "Selecionar Resultados"}
            </button>
          </div>

          {form.entregaIds.length > 0 && (
            <div className="flex items-center gap-4 px-3 py-2 rounded-lg mb-2"
              style={{ background: "rgba(249,115,22,.06)", border: "1px solid rgba(249,115,22,.15)" }}>
              <span className="text-xs font-bold" style={{ color: "#f97316" }}>{form.entregaIds.length} selecionada(s)</span>
              <span className="text-[10px] font-mono" style={{ color: "var(--text3)" }}>{formatWeight(totalPeso)} · {totalVol} vol.</span>
            </div>
          )}

          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", maxHeight: "320px", overflowY: "auto" }}>
            {filteredEntregas.length === 0 ? (
              <div className="p-8 text-center text-xs" style={{ color: "var(--text3)" }}>
                {entregasDisp.length === 0 ? "Nenhuma entrega disponível" : "Nenhum resultado para o filtro"}
              </div>
            ) : (
              filteredEntregas.map((e) => {
                const sel = form.entregaIds.includes(e.id);
                return (
                  <div key={e.id} onClick={() => toggleEntrega(e.id)}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-all hover:opacity-90"
                    style={{ borderBottom: "1px solid var(--border)", background: sel ? "rgba(249,115,22,.06)" : "transparent" }}>
                    <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                      style={{ background: sel ? "var(--accent)" : "transparent", border: `1.5px solid ${sel ? "var(--accent)" : "var(--border)"}` }}>
                      {sel && <span className="text-white text-[9px]">✓</span>}
                    </div>
                    <span className="font-mono text-[11px] w-20 flex-shrink-0" style={{ color: "var(--accent)" }}>
                      {e.notas && e.notas.length > 0 ? e.notas.map((n: any) => n.numero).join(", ") : e.codigo}
                    </span>
                    <span className="text-sm font-medium flex-1 truncate">{e.razaoSocial}</span>
                    <span className="text-xs flex-shrink-0" style={{ color: "var(--text2)" }}>{e.cidade}</span>
                    <span className="text-xs font-mono flex-shrink-0" style={{ color: "var(--text3)" }}>{formatWeight(e.weightTotal || e.pesoTotal || 0)}</span>
                    <span className="text-xs font-mono flex-shrink-0" style={{ color: "var(--text3)" }}>{e.volumeTotal} vol</span>
                    <StatusBadge status={e.status} />
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
          <Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>Criar Rota</Button>
        </div>
      </Modal>
    </>
  );
}
