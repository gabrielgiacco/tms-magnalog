"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Topbar } from "@/components/layout/Topbar";
import { Button, Card, Loading, StatusBadge, Modal, Input, Select, Textarea, ComboboxMotorista } from "@/components/ui";
import { formatCurrency, formatDate, formatWeight, formatCNPJ } from "@/lib/utils";
import { Copy, FileText, History, Package, MapPin, Truck, ChevronLeft, Calendar, User, Clock, CheckCircle2, AlertCircle, Trash2, ShieldCheck, DollarSign, Scissors } from "lucide-react";
import toast from "react-hot-toast";
import { QualityScoring } from "@/components/quality/QualityScoring";

const STATUS_FLOW = [
  { key: "PROGRAMADO", label: "Programado", icon: "📋" },
  { key: "EM_SEPARACAO", label: "Em Separação", icon: "📦" },
  { key: "CARREGADO", label: "Carregado", icon: "🔄" },
  { key: "EM_ROTA", label: "Em Rota", icon: "🚛" },
  { key: "ENTREGUE", label: "Entregue", icon: "✅" },
  { key: "FINALIZADO", label: "Finalizado", icon: "🏁" },
];

export default function EntregaDetailPage() {
  const params = useParams()!;
  const id = params!.id as string;
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  const [entrega, setEntrega] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showOcorrencia, setShowOcorrencia] = useState(false);
  const [motoristas, setMotoristas] = useState<any[]>([]);
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [editForm, setEditForm] = useState<any>({});
  const [ocorrForm, setOcorrForm] = useState({ tipo: "ATRASO", descricao: "" });
  const [tab, setTab] = useState("info");
  const [selectedNotas, setSelectedNotas] = useState<string[]>([]);
  const [separando, setSeparando] = useState(false);

  useEffect(() => {
    fetch(`/api/entregas/${id}`).then((r) => r.json()).then((d) => { 
      setEntrega(d); 
      setEditForm(formatForEdit(d)); 
    }).finally(() => setLoading(false));
    
    fetch("/api/motoristas?ativo=true").then((r) => r.json()).then(setMotoristas);
    fetch("/api/veiculos").then((r) => r.json()).then(setVeiculos);
  }, [id]);

  function formatForEdit(e: any) {
    return {
      razaoSocial: e.razaoSocial || "", cidade: e.cidade || "", uf: e.uf || "",
      endereco: e.endereco || "", bairro: e.bairro || "", cep: e.cep || "",
      dataChegada: e.dataChegada ? e.dataChegada.slice(0, 10) : "",
      dataAgendada: e.dataAgendada ? e.dataAgendada.slice(0, 10) : "",
      dataEntrega: e.dataEntrega ? e.dataEntrega.slice(0, 10) : "",
      motoristaId: e.motoristaId || "", veiculoId: e.veiculoId || "",
      valorFrete: String(e.valorFrete || 0), valorDescarga: String(e.valorDescarga || 0),
      valorArmazenagem: String(e.valorArmazenagem || 0),
      valorMotorista: String(e.valorMotorista || 0), valorSaida: String(e.valorSaida || 0),
      adiantamentoMotorista: String(e.adiantamentoMotorista || 0), descontosMotorista: String(e.descontosMotorista || 0),
      dataAdiantamento: e.dataAdiantamento ? e.dataAdiantamento.slice(0, 10) : "",
      dataPagamentoSaldo: e.dataPagamentoSaldo ? e.dataPagamentoSaldo.slice(0, 10) : "",
      statusCanhoto: e.statusCanhoto || "PENDENTE",
      observacoes: e.observacoes || "", status: e.status,
    };
  }

  async function handleStatusChange(newStatus: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/entregas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: newStatus, 
          ...(newStatus === "ENTREGUE" ? { dataEntrega: new Date().toISOString() } : {}) 
        }),
      });
      const updated = await res.json();
      setEntrega(updated);
      toast.success("Status atualizado");
    } catch { toast.error("Erro ao atualizar"); }
    finally { setSaving(false); }
  }

  async function handleSaveEdit() {
    setSaving(true);
    try {
      const res = await fetch(`/api/entregas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          valorFrete: parseFloat(editForm.valorFrete) || 0,
          valorDescarga: parseFloat(editForm.valorDescarga) || 0,
          valorArmazenagem: parseFloat(editForm.valorArmazenagem) || 0,
          valorMotorista: parseFloat(editForm.valorMotorista) || 0,
          valorSaida: parseFloat(editForm.valorSaida) || 0,
          adiantamentoMotorista: parseFloat(editForm.adiantamentoMotorista) || 0,
          descontosMotorista: parseFloat(editForm.descontosMotorista) || 0,
          dataAdiantamento: editForm.dataAdiantamento || null,
          dataPagamentoSaldo: editForm.dataPagamentoSaldo || null,
        }),
      });
      const updated = await res.json();
      setEntrega(updated);
      setShowEdit(false);
      toast.success("Entrega atualizada");
    } catch { toast.error("Erro ao salvar"); }
    finally { setSaving(false); }
  }

  async function handleOcorrencia() {
    if (!ocorrForm.descricao) { toast.error("Descreva a ocorrência"); return; }
    setSaving(true);
    try {
      await fetch(`/api/entregas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "OCORRENCIA" }),
      });
      await fetch("/api/entregas/" + id + "/ocorrencia", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ocorrForm),
      }).catch(() => {});
      const updated = await fetch(`/api/entregas/${id}`).then((r) => r.json());
      setEntrega(updated);
      setShowOcorrencia(false);
      setOcorrForm({ tipo: "ATRASO", descricao: "" });
      toast.success("Ocorrência registrada");
    } finally { setSaving(false); }
  }

  async function handleSeparar() {
    if (selectedNotas.length === 0) { toast.error("Selecione pelo menos uma nota"); return; }
    if (selectedNotas.length === entrega.notas.length) { toast.error("Selecione apenas parte das notas para separar"); return; }
    setSeparando(true);
    try {
      const res = await fetch(`/api/entregas/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "separar", notaIds: selectedNotas }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      const data = await res.json();
      toast.success(`${data.notasSeparadas} nota(s) separada(s) em nova entrega`);
      setSelectedNotas([]);
      // Reload entrega
      const updated = await fetch(`/api/entregas/${id}`).then((r) => r.json());
      setEntrega(updated);
      setEditForm(formatForEdit(updated));
    } catch (err: any) {
      toast.error(err.message || "Erro ao separar notas");
    } finally { setSeparando(false); }
  }

  function toggleNota(notaId: string) {
    setSelectedNotas((prev) => prev.includes(notaId) ? prev.filter((id) => id !== notaId) : [...prev, notaId]);
  }

  const set = (k: string, v: string) => setEditForm((f: any) => ({ ...f, [k]: v }));
  const currentIdx = STATUS_FLOW.findIndex((s) => s.key === entrega?.status);

  if (loading) return <><Topbar title="Entrega" /><Loading /></>;
  if (!entrega || entrega.error) return <><Topbar title="Não encontrada" /><div className="p-8 text-center" style={{ color: "var(--text3)" }}>Entrega não encontrada.</div></>;

  return (
    <>
      <Topbar
        title={entrega.notas && entrega.notas.length > 0 ? `NF ${entrega.notas.map((n: any) => n.numero).join(", ")}` : entrega.codigo}
        subtitle={entrega.razaoSocial}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ChevronLeft size={14} /> Voltar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setEditForm(formatForEdit(entrega)); setShowEdit(true); }}>
              <Copy size={14} /> Editar
            </Button>
            {entrega.status !== "OCORRENCIA" && entrega.status !== "FINALIZADO" && (
              <Button variant="danger" size="sm" onClick={() => setShowOcorrencia(true)}>
                <AlertCircle size={14} /> Ocorrência
              </Button>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Status flow card */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono uppercase tracking-widest text-slate-500">Fluxo Operacional</span>
            <StatusBadge status={entrega.status} />
          </div>
          {entrega.status === "OCORRENCIA" ? (
             <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
               <AlertCircle size={16} className="text-red-500" />
               <span className="text-sm text-red-600">Esta entrega possui ocorrência registrada. Resolva para continuar o fluxo.</span>
               <Button size="sm" className="ml-auto" onClick={() => handleStatusChange("EM_ROTA")}>Retomar como Em Rota</Button>
             </div>
          ) : (
            <div className="flex items-center gap-2">
              {STATUS_FLOW.map((s, i) => {
                const done = i < currentIdx;
                const current = i === currentIdx;
                const next = i === currentIdx + 1;
                return (
                  <div key={s.key} className="flex items-center gap-2 flex-1">
                    <div className="flex flex-col items-center gap-1 flex-1">
                      <button
                        onClick={() => next && handleStatusChange(s.key)}
                        disabled={saving || (!next && !current)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-lg transition-all
                          ${current ? "ring-2 ring-orange-400 scale-110" : ""}
                          ${next ? "cursor-pointer hover:scale-110" : done ? "" : "opacity-30 cursor-not-allowed"}
                        `}
                        style={{
                          background: done || current ? "var(--accent)" : "var(--surface2)",
                          border: current ? "2px solid var(--accent)" : "1px solid var(--border)",
                        }}
                        title={next ? `Avançar para ${s.label}` : ""}>
                        {done ? <CheckCircle2 size={18} color="#fff" /> : <span style={{ fontSize: "14px" }}>{s.icon}</span>}
                      </button>
                      <span className={`text-[9px] font-mono text-center leading-tight ${current ? "text-orange-600 font-bold" : done ? "text-slate-400" : "text-slate-300"}`}>
                        {s.label}
                      </span>
                    </div>
                    {i < STATUS_FLOW.length - 1 && (
                      <div className="h-px flex-none w-4" style={{ background: i < currentIdx ? "var(--accent)" : "var(--border)" }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Tabs */}
        <div className="flex gap-2 border-b" style={{ borderColor: "var(--border)" }}>
          <TabButton active={tab === "info"} onClick={() => setTab("info")} icon={FileText}>Informações</TabButton>
          <TabButton active={tab === "historico"} onClick={() => setTab("historico")} icon={History}>Histórico</TabButton>
          {isAdmin && (
            <TabButton active={tab === "qualidade"} onClick={() => setTab("qualidade")} icon={ShieldCheck}>Qualidade Operacional</TabButton>
          )}
        </div>

        {/* Tab Content */}
        {tab === "info" && (
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Destinatário */}
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <MapPin size={14} className="text-accent" />
                  <span className="text-xs font-mono uppercase tracking-widest text-slate-500">Destinatário</span>
                </div>
                <div className="space-y-3">
                  <Field label="Razão Social" value={entrega.razaoSocial} />
                  <Field label="CNPJ" value={formatCNPJ(entrega.cnpj)} mono />
                  {entrega.notas && entrega.notas.length > 0 ? (
                    entrega.notas.map((n: any) => (
                      <Field key={n.id} label={`Chave de Acesso (NF ${n.numero})`} value={n.chaveAcesso} mono color="#3b82f6" />
                    ))
                  ) : (
                    entrega.chaveAcesso && <Field label="Chave de Acesso (NF)" value={entrega.chaveAcesso} mono color="#3b82f6" />
                  )}
                  <Field label="Cidade / UF" value={`${entrega.cidade}${entrega.uf ? ` — ${entrega.uf}` : ""}`} />
                  {entrega.endereco && <Field label="Endereço" value={`${entrega.endereco}${entrega.bairro ? `, ${entrega.bairro}` : ""}`} />}
                </div>
              </Card>

              {/* Operação */}
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <Truck size={14} className="text-accent" />
                  <span className="text-xs font-mono uppercase tracking-widest text-slate-500">Operação</span>
                </div>
                <div className="space-y-3">
                  <Field label="Motorista" value={entrega.motorista?.nome} />
                  <Field label="Veículo" value={entrega.veiculo ? `${entrega.veiculo.placa} — ${entrega.veiculo.tipo}` : "—"} />
                  <Field label="Rota" value={entrega.rota?.codigo} mono />
                  <Field label="Data Chegada" value={formatDate(entrega.dataChegada)} mono />
                  <Field label="Data Agendada" value={formatDate(entrega.dataAgendada)} mono />
                  <Field label="Data Entrega" value={formatDate(entrega.dataEntrega)} mono />
                </div>
              </Card>

              {/* Financeiro */}
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign size={14} className="text-emerald-500" />
                  <span className="text-xs font-mono uppercase tracking-widest text-slate-500">Financeiro</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-100">
                    <span className="text-[10px] font-bold">RECEITA CLIENTE</span>
                    <span className="font-mono text-xs">{formatCurrency(entrega.valorFrete)}</span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase mt-2">Custo Motorista (Terceiro)</div>
                  <Field label="Valor Combinado" value={formatCurrency(entrega.valorMotorista)} color="#f97316" />
                  <Field label="Saldo a Pagar" value={formatCurrency(entrega.saldoMotorista)} color={entrega.saldoMotorista > 0 ? "#f97316" : "#10b981"} />
                  <StatusBadge status={entrega.statusCanhoto} />
                </div>
              </Card>
           </div>
        )}

        {tab === "historico" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Carga */}
             <Card>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Package size={14} className="text-accent" />
                    <span className="text-xs font-mono uppercase tracking-widest text-slate-500">Carga</span>
                    {entrega.notas?.length > 1 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--surface2)", color: "var(--text3)" }}>
                        {entrega.notas.length} NFs
                      </span>
                    )}
                  </div>
                  {selectedNotas.length > 0 && selectedNotas.length < (entrega.notas?.length || 0) && (
                    <Button size="sm" onClick={handleSeparar} loading={separando}>
                      <Scissors size={13} /> Separar {selectedNotas.length} NF(s)
                    </Button>
                  )}
                </div>
                {entrega.notas?.length > 1 && (
                  <p className="text-[10px] mb-3" style={{ color: "var(--text3)" }}>
                    Selecione notas para separar em uma nova entrega
                  </p>
                )}
                {entrega.notas?.length > 0 && (
                  <div className="space-y-2">
                    {entrega.notas.map((nf: any) => {
                      const selected = selectedNotas.includes(nf.id);
                      return (
                        <div key={nf.id}
                          onClick={() => entrega.notas.length > 1 && toggleNota(nf.id)}
                          className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                            selected
                              ? "bg-orange-50 border-orange-300 ring-1 ring-orange-200"
                              : "bg-slate-50 border-slate-100"
                          } ${entrega.notas.length > 1 ? "cursor-pointer hover:border-orange-200" : ""}`}>
                          {entrega.notas.length > 1 && (
                            <input type="checkbox" checked={selected} readOnly
                              className="accent-orange-500 w-4 h-4 flex-shrink-0 pointer-events-none" />
                          )}
                          <FileText size={13} className="text-slate-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold">NF {nf.numero}</div>
                            <div className="text-[10px] font-mono truncate text-slate-500">{nf.emitenteRazao}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-mono text-emerald-600 font-bold">{formatCurrency(nf.valorNota)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
             </Card>

             {/* Ocorrências */}
             <Card>
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle size={14} className="text-red-500" />
                  <span className="text-xs font-mono uppercase tracking-widest text-slate-500">Ocorrências</span>
                </div>
                {entrega.ocorrencias?.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <CheckCircle2 size={24} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Nenhuma ocorrência registrada</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {entrega.ocorrencias?.map((oc: any) => (
                      <div key={oc.id} className="p-3 rounded-lg bg-red-50 border border-red-100">
                         <div className="flex items-center justify-between mb-1">
                           <span className="text-xs font-bold text-red-600">{oc.tipo}</span>
                           <span className="text-[10px] text-slate-400">{formatDate(oc.createdAt)}</span>
                         </div>
                         <p className="text-xs text-slate-600">{oc.descricao}</p>
                      </div>
                    ))}
                  </div>
                )}
             </Card>
          </div>
        )}

        {tab === "qualidade" && isAdmin && (
          <Card>
            <div className="flex items-center gap-2 mb-6">
              <ShieldCheck className="text-accent" />
              <h2 className="text-lg font-bold">Avaliação de Qualidade Operacional</h2>
            </div>
            <QualityScoring entregaId={id} />
          </Card>
        )}
      </div>

      {/* Edit Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Editar Entrega" size="lg">
         <div className="grid grid-cols-2 gap-4">
            <Input label="Razão Social" value={editForm.razaoSocial} onChange={(e) => set("razaoSocial", e.target.value)} />
            <Input label="Cidade" value={editForm.cidade} onChange={(e) => set("cidade", e.target.value)} />
            <Input label="UF" value={editForm.uf} onChange={(e) => set("uf", e.target.value)} maxLength={2} />
            <Input label="Endereço" value={editForm.endereco} onChange={(e) => set("endereco", e.target.value)} />
            <Input label="Bairro" value={editForm.bairro} onChange={(e) => set("bairro", e.target.value)} />
            <Input label="CEP" value={editForm.cep} onChange={(e) => set("cep", e.target.value)} />
            <Input label="Data Chegada" type="date" value={editForm.dataChegada} onChange={(e) => set("dataChegada", e.target.value)} />
            <Input label="Data Agendada" type="date" value={editForm.dataAgendada} onChange={(e) => set("dataAgendada", e.target.value)} />
            <Input label="Data Entrega" type="date" value={editForm.dataEntrega} onChange={(e) => set("dataEntrega", e.target.value)} />
            
            <ComboboxMotorista motoristas={motoristas} veiculos={veiculos} value={editForm.motoristaId} onChange={(id) => set("motoristaId", id)} onAutoFillVeiculo={(vid) => set("veiculoId", vid)} />
            <Select label="Veículo" value={editForm.veiculoId} onChange={(e) => set("veiculoId", e.target.value)}>
              <option value="">Selecionar...</option>
              {veiculos.map((v) => <option key={v.id} value={v.id}>{v.placa} — {v.tipo}</option>)}
            </Select>
            <Select label="Status" value={editForm.status} onChange={(e) => set("status", e.target.value)}>
              {STATUS_FLOW.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              <option value="OCORRENCIA">Ocorrência</option>
            </Select>
            <Select label="Status do Canhoto" value={editForm.statusCanhoto} onChange={(e) => set("statusCanhoto", e.target.value)}>
              <option value="PENDENTE">Pendente</option>
              <option value="RECEBIDO">Recebido</option>
              <option value="COM_RESSALVA">Com Ressalva</option>
            </Select>
            
            <div className="col-span-2 py-2 border-b text-[10px] font-bold text-slate-400 uppercase">Valores</div>
            <Input label="Valor Frete Cliente" type="number" value={editForm.valorFrete} onChange={(e) => set("valorFrete", e.target.value)} />
            <Input label="Valor Combinado Motorista" type="number" value={editForm.valorMotorista} onChange={(e) => set("valorMotorista", e.target.value)} />
            <Textarea label="Observações" value={editForm.observacoes} onChange={(e) => set("observacoes", e.target.value)} className="col-span-2" />
         </div>
         <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Button variant="ghost" onClick={() => setShowEdit(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} loading={saving}>Salvar Alterações</Button>
         </div>
      </Modal>

      {/* Ocorrência Modal */}
      <Modal open={showOcorrencia} onClose={() => setShowOcorrencia(false)} title="Registrar Ocorrência" size="sm">
        <div className="space-y-4">
          <Select label="Tipo" value={ocorrForm.tipo} onChange={(e) => setOcorrForm((f) => ({ ...f, tipo: e.target.value }))}>
            {["ATRASO", "AVARIA", "RECUSA", "ENDERECO_NAO_ENCONTRADO", "CLIENTE_AUSENTE", "OUTROS"].map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
            ))}
          </Select>
          <Textarea label="Descrição *" value={ocorrForm.descricao} onChange={(e) => setOcorrForm((f) => ({ ...f, descricao: e.target.value }))} rows={4} />
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="ghost" onClick={() => setShowOcorrencia(false)}>Cancelar</Button>
          <Button variant="danger" onClick={handleOcorrencia} loading={saving}>Registrar</Button>
        </div>
      </Modal>
    </>
  );
}

function TabButton({ children, active, onClick, icon: Icon }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 
        ${active ? "border-accent text-accent" : "border-transparent text-slate-400 hover:text-slate-600"}`}
    >
      <Icon size={16} />
      {children}
    </button>
  );
}

function Field({ label, value, mono, color }: { label: string; value?: string | null; mono?: boolean; color?: string }) {
  return (
    <div>
      <div className="text-[9px] font-mono uppercase tracking-widest text-slate-400 mb-0.5">{label}</div>
      <div className={`text-sm font-medium ${mono ? "font-mono text-xs" : ""}`} style={{ color: value ? (color || "var(--text)") : "var(--text3)" }}>
        {value || "—"}
      </div>
    </div>
  );
}
