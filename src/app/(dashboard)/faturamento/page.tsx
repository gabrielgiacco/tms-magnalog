"use client";
import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { Topbar } from "@/components/layout/Topbar";
import { Button, Card, Loading, Empty, Modal, Input, Table, Th, Td, Tr } from "@/components/ui";
import { formatCurrency, formatDate, formatCNPJ } from "@/lib/utils";
import { RefreshCw, FilePlus, CheckCircle2, Eye, ChevronDown, ChevronUp } from "lucide-react";

export default function FaturamentoPage() {
  const [ctesAgrupados, setCtesAgrupados] = useState<any[]>([]);
  const [faturas, setFaturas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Seleção de CTes para faturar
  const [selectedCteIds, setSelectedCteIds] = useState<string[]>([]);
  const [faturandoClient, setFaturandoClient] = useState<any>(null);

  // Modal gerar fatura
  const [showGerarModal, setShowGerarModal] = useState(false);
  const [dataVencimento, setDataVencimento] = useState("");
  const [gerando, setGerando] = useState(false);

  // Modal detalhe fatura
  const [faturaDetalhe, setFaturaDetalhe] = useState<any>(null);

  // Expandir grupo
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resCtes, resFaturas] = await Promise.all([
        fetch("/api/financeiro/ctes-pendentes").then((r) => r.json()),
        fetch("/api/financeiro/faturas").then((r) => r.json()),
      ]);
      setCtesAgrupados(Array.isArray(resCtes) ? resCtes : []);
      setFaturas(Array.isArray(resFaturas) ? resFaturas : []);
    } catch {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function toggleGroup(cnpj: string) {
    setExpandedGroups((prev) =>
      prev.includes(cnpj) ? prev.filter((c) => c !== cnpj) : [...prev, cnpj]
    );
  }

  function toggleCte(cteId: string, grupo: any) {
    if (faturandoClient && faturandoClient.tomadorCnpj !== grupo.tomadorCnpj) {
      toast.error("Selecione CT-es do mesmo tomador");
      return;
    }
    setSelectedCteIds((prev) => {
      const next = prev.includes(cteId) ? prev.filter((id) => id !== cteId) : [...prev, cteId];
      if (next.length === 0) setFaturandoClient(null);
      else setFaturandoClient(grupo);
      return next;
    });
  }

  function selectAllFromGroup(grupo: any) {
    if (faturandoClient && faturandoClient.tomadorCnpj !== grupo.tomadorCnpj) {
      toast.error("Selecione CT-es do mesmo tomador");
      return;
    }
    const ids = grupo.ctes.map((c: any) => c.id);
    setSelectedCteIds(ids);
    setFaturandoClient(grupo);
  }

  function openGerarModal() {
    if (selectedCteIds.length === 0) return;
    // Default: 30 dias a partir de hoje
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setDataVencimento(d.toISOString().slice(0, 10));
    setShowGerarModal(true);
  }

  async function handleGerarFatura() {
    if (!faturandoClient || selectedCteIds.length === 0) return;
    setGerando(true);
    try {
      const res = await fetch("/api/financeiro/faturas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cnpj: faturandoClient.tomadorCnpj,
          nomeCliente: faturandoClient.tomadorNome,
          cteIds: selectedCteIds,
          dataVencimento: dataVencimento || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Fatura gerada com sucesso!");
      setSelectedCteIds([]);
      setFaturandoClient(null);
      setShowGerarModal(false);
      fetchData();
    } catch {
      toast.error("Erro ao gerar fatura");
    } finally {
      setGerando(false);
    }
  }

  async function handleDarBaixa(faturaId: string) {
    try {
      const res = await fetch("/api/financeiro/faturas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: faturaId, status: "PAGA" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Fatura marcada como PAGA");
      fetchData();
    } catch {
      toast.error("Erro ao dar baixa");
    }
  }

  // Totais
  const totalPendenteCtes = ctesAgrupados.reduce((s, g) => s + g.totalValor, 0);
  const totalFaturasAbertas = faturas.filter((f) => f.status === "ABERTA").reduce((s, f) => s + f.valorTotal, 0);
  const totalFaturasPagas = faturas.filter((f) => f.status === "PAGA").reduce((s, f) => s + f.valorTotal, 0);
  const selectedTotal = faturandoClient
    ? faturandoClient.ctes.filter((c: any) => selectedCteIds.includes(c.id)).reduce((s: number, c: any) => s + c.valorReceber, 0)
    : 0;

  if (loading) return <><Topbar title="Faturamento" /><Loading /></>;

  return (
    <>
      <Topbar
        title="Faturamento"
        subtitle="Controle de fretes a receber"
        actions={<Button variant="ghost" size="sm" onClick={fetchData}><RefreshCw size={14} /> Atualizar</Button>}
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color: "var(--text3)" }}>CT-es Pendentes</div>
            <div className="text-xl font-bold font-mono" style={{ color: "#f97316" }}>{formatCurrency(totalPendenteCtes)}</div>
            <div className="text-[10px]" style={{ color: "var(--text3)" }}>{ctesAgrupados.reduce((s, g) => s + g.ctes.length, 0)} CT-e(s) sem fatura</div>
          </Card>
          <Card className="p-4">
            <div className="text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color: "var(--text3)" }}>Faturas em Aberto</div>
            <div className="text-xl font-bold font-mono" style={{ color: "#eab308" }}>{formatCurrency(totalFaturasAbertas)}</div>
            <div className="text-[10px]" style={{ color: "var(--text3)" }}>{faturas.filter((f) => f.status === "ABERTA").length} fatura(s)</div>
          </Card>
          <Card className="p-4">
            <div className="text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color: "var(--text3)" }}>Faturas Pagas</div>
            <div className="text-xl font-bold font-mono" style={{ color: "#10b981" }}>{formatCurrency(totalFaturasPagas)}</div>
            <div className="text-[10px]" style={{ color: "var(--text3)" }}>{faturas.filter((f) => f.status === "PAGA").length} fatura(s)</div>
          </Card>
        </div>

        {/* Barra de ação quando CTes selecionados */}
        {selectedCteIds.length > 0 && (
          <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.25)" }}>
            <div>
              <span className="text-sm font-semibold" style={{ color: "#10b981" }}>
                {selectedCteIds.length} CT-e(s) selecionado(s) — {faturandoClient?.tomadorNome}
              </span>
              <span className="text-sm font-mono font-bold ml-3" style={{ color: "#10b981" }}>{formatCurrency(selectedTotal)}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setSelectedCteIds([]); setFaturandoClient(null); }}>Limpar</Button>
              <Button size="sm" onClick={openGerarModal}>
                <FilePlus size={14} /> Gerar Fatura
              </Button>
            </div>
          </div>
        )}

        {/* CT-es Pendentes agrupados por tomador */}
        <div>
          <h2 className="text-sm font-head font-bold mb-3" style={{ color: "var(--text2)" }}>CT-es Aguardando Faturamento</h2>
          {ctesAgrupados.length === 0 ? (
            <Card><Empty icon="🧾" text="Nenhum CT-e pendente de faturamento" /></Card>
          ) : (
            <div className="space-y-3">
              {ctesAgrupados.map((g) => {
                const expanded = expandedGroups.includes(g.tomadorCnpj);
                const allSelected = g.ctes.every((c: any) => selectedCteIds.includes(c.id));
                return (
                  <Card key={g.tomadorCnpj} className="p-0 overflow-hidden">
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--surface2)] transition-colors"
                      onClick={() => toggleGroup(g.tomadorCnpj)}
                    >
                      <div>
                        <div className="font-semibold text-sm">{g.tomadorNome}</div>
                        <div className="text-[10px] font-mono" style={{ color: "var(--text3)" }}>
                          {formatCNPJ(g.tomadorCnpj)} &bull; {g.ctes.length} CT-e(s) &bull; Total: {formatCurrency(g.totalValor)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost"
                          onClick={(e) => { e.stopPropagation(); allSelected ? (setSelectedCteIds([]), setFaturandoClient(null)) : selectAllFromGroup(g); }}>
                          {allSelected ? "Desmarcar" : "Selecionar Todos"}
                        </Button>
                        {expanded ? <ChevronUp size={16} style={{ color: "var(--text3)" }} /> : <ChevronDown size={16} style={{ color: "var(--text3)" }} />}
                      </div>
                    </div>
                    {expanded && (
                      <div style={{ borderTop: "1px solid var(--border)" }}>
                        <Table>
                          <thead>
                            <tr>
                              <Th style={{ width: 40 }}></Th>
                              <Th>CT-e</Th>
                              <Th>NFs Vinculadas</Th>
                              <Th>Emissão</Th>
                              <Th>Valor a Receber</Th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.ctes.map((cte: any) => (
                              <Tr key={cte.id}>
                                <Td>
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                                    checked={selectedCteIds.includes(cte.id)}
                                    onChange={() => toggleCte(cte.id, g)}
                                  />
                                </Td>
                                <Td><span className="font-mono text-xs font-bold">{cte.numero}</span></Td>
                                <Td>
                                  <span className="text-[10px] font-mono" style={{ color: "var(--text3)" }}>
                                    {cte.notas?.length > 0 ? cte.notas.map((n: any) => n.numero).join(", ") : "—"}
                                  </span>
                                </Td>
                                <Td><span className="font-mono text-xs">{formatDate(cte.dataEmissao)}</span></Td>
                                <Td><span className="font-mono text-sm font-bold" style={{ color: "#10b981" }}>{formatCurrency(cte.valorReceber)}</span></Td>
                              </Tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Faturas Geradas */}
        <div>
          <h2 className="text-sm font-head font-bold mb-3" style={{ color: "var(--text2)" }}>Faturas</h2>
          <Card className="p-0 overflow-hidden">
            {faturas.length === 0 ? (
              <Empty icon="💸" text="Nenhuma fatura gerada" />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Fatura</Th>
                    <Th>Cliente</Th>
                    <Th>CT-es</Th>
                    <Th>Vencimento</Th>
                    <Th>Valor Total</Th>
                    <Th>Status</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody>
                  {faturas.map((f) => (
                    <Tr key={f.id}>
                      <Td><span className="font-mono text-xs font-bold">{f.numero}</span></Td>
                      <Td>
                        <div className="text-sm font-semibold">{f.clienteNome}</div>
                        <div className="text-[10px] font-mono" style={{ color: "var(--text3)" }}>{formatCNPJ(f.clienteCnpj)}</div>
                      </Td>
                      <Td><span className="font-mono text-xs">{f._count?.ctes || 0}</span></Td>
                      <Td>
                        <span className={`font-mono text-xs ${f.status !== "PAGA" && new Date(f.dataVencimento) < new Date() ? "text-red-500 font-bold" : ""}`}>
                          {formatDate(f.dataVencimento)}
                        </span>
                      </Td>
                      <Td><span className="font-mono text-sm font-bold" style={{ color: "#10b981" }}>{formatCurrency(f.valorTotal)}</span></Td>
                      <Td>
                        <span className={`px-2 py-1 text-[10px] font-bold rounded-lg ${
                          f.status === "PAGA" ? "bg-emerald-400/10 text-emerald-500 border border-emerald-400/30"
                          : f.status === "CANCELADA" ? "bg-red-400/10 text-red-400 border border-red-400/30"
                          : "bg-yellow-400/10 text-yellow-600 border border-yellow-400/30"
                        }`}>
                          {f.status}
                        </span>
                      </Td>
                      <Td>
                        <div className="flex gap-1.5">
                          <button onClick={() => setFaturaDetalhe(f)}
                            className="p-1.5 rounded-lg hover:opacity-70 transition-all"
                            style={{ background: "var(--surface2)", color: "var(--text2)" }}>
                            <Eye size={12} />
                          </button>
                          {f.status === "ABERTA" && (
                            <Button size="sm" variant="ghost" onClick={() => handleDarBaixa(f.id)}>
                              <CheckCircle2 size={12} /> Baixa
                            </Button>
                          )}
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
      </div>

      {/* Modal Gerar Fatura */}
      <Modal open={showGerarModal} onClose={() => setShowGerarModal(false)} title="Gerar Fatura" size="sm">
        <div className="space-y-4">
          <div className="p-3 rounded-lg" style={{ background: "var(--surface2)" }}>
            <div className="text-sm font-semibold">{faturandoClient?.tomadorNome}</div>
            <div className="text-[10px] font-mono" style={{ color: "var(--text3)" }}>{formatCNPJ(faturandoClient?.tomadorCnpj || "")}</div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: "var(--text2)" }}>{selectedCteIds.length} CT-e(s) selecionado(s)</span>
            <span className="font-mono text-lg font-bold" style={{ color: "#10b981" }}>{formatCurrency(selectedTotal)}</span>
          </div>
          <Input label="Data de Vencimento" type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} />
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
          <Button variant="ghost" onClick={() => setShowGerarModal(false)}>Cancelar</Button>
          <Button onClick={handleGerarFatura} loading={gerando}>
            <FilePlus size={14} /> Gerar Fatura
          </Button>
        </div>
      </Modal>

      {/* Modal Detalhe Fatura */}
      <Modal open={!!faturaDetalhe} onClose={() => setFaturaDetalhe(null)} title={`Fatura ${faturaDetalhe?.numero || ""}`} size="md">
        {faturaDetalhe && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] font-mono uppercase text-slate-400">Cliente</div>
                <div className="text-sm font-semibold">{faturaDetalhe.clienteNome}</div>
                <div className="text-[10px] font-mono" style={{ color: "var(--text3)" }}>{formatCNPJ(faturaDetalhe.clienteCnpj)}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase text-slate-400">Vencimento</div>
                <div className="text-sm font-mono">{formatDate(faturaDetalhe.dataVencimento)}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase text-slate-400">Valor Total</div>
                <div className="text-lg font-mono font-bold" style={{ color: "#10b981" }}>{formatCurrency(faturaDetalhe.valorTotal)}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase text-slate-400">Status</div>
                <span className={`px-2 py-1 text-[10px] font-bold rounded-lg ${faturaDetalhe.status === "PAGA" ? "bg-emerald-400/10 text-emerald-500" : "bg-yellow-400/10 text-yellow-600"}`}>
                  {faturaDetalhe.status}
                </span>
              </div>
            </div>
            {faturaDetalhe.ctes?.length > 0 && (
              <div>
                <div className="text-[10px] font-mono uppercase text-slate-400 mb-2">CT-es Incluídos</div>
                <div className="space-y-1.5">
                  {faturaDetalhe.ctes.map((cte: any) => (
                    <div key={cte.id} className="flex justify-between items-center p-2 rounded-lg" style={{ background: "var(--surface2)" }}>
                      <span className="font-mono text-xs font-bold">CT-e {cte.numero}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono" style={{ color: "var(--text3)" }}>{formatDate(cte.dataEmissao)}</span>
                        <span className="font-mono text-xs font-bold" style={{ color: "#10b981" }}>{formatCurrency(cte.valorReceber)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
