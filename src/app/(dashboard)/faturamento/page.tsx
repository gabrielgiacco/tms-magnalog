"use client";
import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { Topbar } from "@/components/layout/Topbar";
import { Button, Card, Loading, Empty, Modal, Input, Table, Th, Td, Tr } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import { RefreshCw, Wallet, Search, CheckCircle, Download, FilePlus, Truck, DollarSign, Plus } from "lucide-react";

export default function FaturamentoPage() {
  const [activeTab, setActiveTab] = useState<"faturamento" | "motoristas" | "descargas">("faturamento");
  
  // Data States
  const [ctesAgrupados, setCtesAgrupados] = useState<any[]>([]);
  const [faturas, setFaturas] = useState<any[]>([]);
  const [pagarMotorista, setPagarMotorista] = useState<any[]>([]);
  const [pagarDescarga, setPagarDescarga] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Faturamento State
  const [selectedCteIds, setSelectedCteIds] = useState<string[]>([]);
  const [faturandoClient, setFaturandoClient] = useState<string | null>(null);

  // Forms
  const [showNovaConta, setShowNovaConta] = useState(false);
  const [novoContaForm, setNovoContaForm] = useState({ descricao: "", valor: "", vencimento: "", tipo: "MOTORISTA" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "faturamento") {
        const [resCtes, resFaturas] = await Promise.all([
          fetch("/api/financeiro/ctes-pendentes").then(res => res.json()),
          fetch("/api/financeiro/faturas").then(res => res.json())
        ]);
        setCtesAgrupados(Array.isArray(resCtes) ? resCtes : []);
        setFaturas(Array.isArray(resFaturas) ? resFaturas : []);
      } else {
        const tipoQuery = activeTab === "motoristas" ? "MOTORISTA" : "DESCARGA";
        const res = await fetch(`/api/financeiro/pagar?tipo=${tipoQuery}`).then(res => res.json());
        if (activeTab === "motoristas") setPagarMotorista(res);
        if (activeTab === "descargas") setPagarDescarga(res);
      }
    } catch (e) {
      toast.error("Erro ao carregar dados financeiros.");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Actions
  async function handleGerarFatura() {
    if (selectedCteIds.length === 0 || !faturandoClient) return;
    try {
      const g = ctesAgrupados.find(c => c.tomadorCNPJ === faturandoClient);
      const res = await fetch("/api/financeiro/faturas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cnpj: faturandoClient,
          razaoSocial: g?.tomadorNome,
          cteIds: selectedCteIds
        })
      });
      if (!res.ok) throw new Error();
      toast.success("Fatura Gerada com Sucesso!");
      setSelectedCteIds([]);
      setFaturandoClient(null);
      fetchData();
    } catch {
      toast.error("Erro ao gerar fatura");
    }
  }

  function toggleCteSelection(cteId: string, cnpj: string) {
    if (faturandoClient && faturandoClient !== cnpj) {
      toast.error("Apenas CT-es do mesmo Tomador podem entrar na Fatura conjunta.");
      return;
    }
    
    setSelectedCteIds(prev => {
      const next = prev.includes(cteId) ? prev.filter(id => id !== cteId) : [...prev, cteId];
      if (next.length === 0) setFaturandoClient(null);
      else setFaturandoClient(cnpj);
      return next;
    });
  }

  async function handleCreateConta() {
    try {
      const res = await fetch("/api/financeiro/pagar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...novoContaForm,
          valor: parseFloat(novoContaForm.valor)
        })
      });
      if (!res.ok) throw new Error();
      toast.success("Conta cadastrada.");
      setShowNovaConta(false);
      setNovoContaForm({ descricao: "", valor: "", vencimento: "", tipo: activeTab === "motoristas" ? "MOTORISTA" : "DESCARGA" });
      fetchData();
    } catch {
      toast.error("Erro ao salvar conta");
    }
  }

  async function markAsPaid(id: string, tableType: "fatura" | "conta") {
    try {
      const endpoint = tableType === "fatura" ? "/api/financeiro/faturas" : "/api/financeiro/pagar";
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "PAGO" })
      });
      if (!res.ok) throw new Error();
      toast.success("Baixa realizada!");
      fetchData();
    } catch {
      toast.error("Erro ao dar baixa");
    }
  }

  // UIs
  const renderFaturamento = () => {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-head font-bold text-gray-800 mb-3">1. CT-es Aguardando Faturamento</h2>
          {ctesAgrupados.length === 0 ? <Empty icon="🧾" text="Nenhum CT-e pendente" /> : (
            <div className="grid gap-4">
              {ctesAgrupados.map((g: any) => (
                <Card key={g.tomadorCNPJ} className="p-4 border-l-4 border-l-emerald-500">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h3 className="font-bold text-gray-800">{g.tomadorNome}</h3>
                      <p className="text-xs text-gray-500 font-mono">{g.tomadorCNPJ} · {g.ctes.length} fretes · Total Acumulado: {formatCurrency(g.totalValor)}</p>
                    </div>
                    {faturandoClient === g.tomadorCNPJ && selectedCteIds.length > 0 && (
                      <Button onClick={handleGerarFatura} className="bg-emerald-600 hover:bg-emerald-700 text-white border-0">
                        <FilePlus size={14} className="mr-1"/> Gerar Fatura ({selectedCteIds.length})
                      </Button>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <thead>
                        <tr>
                          <Th>Sel.</Th><Th>CT-e</Th><Th>NF (Entrega)</Th><Th>Emissão</Th><Th>Valor</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.ctes.map((cte: any) => (
                          <Tr key={cte.id}>
                            <Td>
                              <input 
                                type="checkbox" 
                                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                                checked={selectedCteIds.includes(cte.id)}
                                onChange={() => toggleCteSelection(cte.id, g.tomadorCNPJ)}
                              />
                            </Td>
                            <Td><span className="font-mono text-xs">{cte.numero}</span></Td>
                            <Td><span className="font-mono text-xs text-gray-500">{cte.entrega?.notas?.[0]?.numero || '-' /* Aqui usaríamos apenas o cte associado, mas CT-e já lida */}</span></Td>
                            <Td><span className="font-mono text-xs text-gray-500">{formatDate(cte.dataEmissao)}</span></Td>
                            <Td><span className="font-mono text-sm font-bold text-emerald-600">{formatCurrency(cte.valor)}</span></Td>
                          </Tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-head font-bold text-gray-800 mb-3">2. Títulos a Receber (Faturas Geradas)</h2>
          <Card className="p-0 overflow-hidden">
             {faturas.length === 0 ? <Empty icon="💸" text="Nenhuma fatura gerada" /> : (
               <Table>
                 <thead>
                   <tr>
                     <Th>Fatura</Th><Th>Cliente</Th><Th>Status</Th><Th>Qtd CTes</Th>
                     <Th>Vencimento</Th><Th>Valor Total</Th><Th>Ações</Th>
                   </tr>
                 </thead>
                 <tbody>
                   {faturas.map((f: any) => (
                     <Tr key={f.id}>
                       <Td><span className="font-mono text-sm font-bold">{f.numero}</span></Td>
                       <Td><span className="text-sm font-semibold">{f.cliente?.razaoSocial}</span></Td>
                       <Td>
                         <span className={`px-2 py-1 text-[10px] font-bold rounded-lg ${f.status === 'PAGA' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                           {f.status}
                         </span>
                       </Td>
                       <Td><span className="font-mono text-xs">{f._count?.ctes || 0}</span></Td>
                       <Td><span className="font-mono text-xs">{formatDate(f.vencimento)}</span></Td>
                       <Td><span className="font-mono text-sm font-bold text-emerald-600">{formatCurrency(f.valorTotal)}</span></Td>
                       <Td>
                         {f.status !== "PAGA" && (
                           <Button size="sm" variant="ghost" onClick={() => markAsPaid(f.id, "fatura")}>Dar Baixa</Button>
                         )}
                       </Td>
                     </Tr>
                   ))}
                 </tbody>
               </Table>
             )}
          </Card>
        </div>
      </div>
    );
  };

  const renderContasPagar = (lista: any[], tipoTitle: string) => {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-head font-bold text-gray-800">Pagamentos: {tipoTitle}</h2>
          <Button onClick={() => {
            setNovoContaForm({ ...novoContaForm, tipo: activeTab === "motoristas" ? "MOTORISTA" : "DESCARGA" });
            setShowNovaConta(true);
          }} className="bg-gray-800 hover:bg-gray-900 text-white border-0"><Plus size={14} className="mr-1"/> Nova Conta</Button>
        </div>
        
        <Card className="p-0 overflow-hidden">
             {lista.length === 0 ? <Empty icon="💳" text="Nenhuma conta" /> : (
               <Table>
                 <thead>
                   <tr>
                     <Th>Descrição</Th><Th>Ref (Entrega/Rota)</Th><Th>Status</Th>
                     <Th>Vencimento</Th><Th>Pgto.</Th><Th>Valor</Th><Th>Ações</Th>
                   </tr>
                 </thead>
                 <tbody>
                   {lista.map((c: any) => (
                     <Tr key={c.id}>
                       <Td><span className="text-sm font-medium">{c.descricao}</span></Td>
                       <Td>
                          <span className="font-mono text-xs text-gray-500">
                            {c.entrega ? `NF: ${c.entrega.notas && c.entrega.notas.length > 0 ? c.entrega.notas.map((n: any) => n.numero).join(", ") : c.entrega.codigo}` : c.rota ? `Rota: ${c.rota.codigo}` : '-'}
                          </span>
                       </Td>
                       <Td>
                         <span className={`px-2 py-1 text-[10px] font-bold rounded-lg ${c.status === 'PAGO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                           {c.status}
                         </span>
                       </Td>
                       <Td><span className="font-mono text-xs">{formatDate(c.vencimento) || "-"}</span></Td>
                       <Td><span className="font-mono text-xs">{formatDate(c.dataPagamento) || "-"}</span></Td>
                       <Td><span className="font-mono text-sm font-bold text-red-500">{formatCurrency(c.valor)}</span></Td>
                       <Td>
                         {c.status !== "PAGO" && (
                           <Button size="sm" variant="ghost" onClick={() => markAsPaid(c.id, "conta")}>Dar Baixa</Button>
                         )}
                       </Td>
                     </Tr>
                   ))}
                 </tbody>
               </Table>
             )}
          </Card>
      </div>
    );
  };

  return (
    <>
      <Topbar title="Faturamento e Contas" subtitle="Contas a Receber, Chapas e Motoristas" 
        actions={<Button variant="ghost" size="sm" onClick={fetchData}><RefreshCw size={14} /> Atualizar</Button>}
      />

      <div className="flex-1 overflow-y-auto bg-[var(--bg)] flex flex-col">
        {/* TABS HEADER */}
        <div className="flex px-6 pt-4 gap-2 border-b border-gray-200">
          <button 
            className={`px-4 py-3 font-head font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'faturamento' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            onClick={() => setActiveTab("faturamento")}
          >
            <Wallet size={16} /> Contas a Receber (Faturamento)
          </button>
          <button 
            className={`px-4 py-3 font-head font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'motoristas' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            onClick={() => setActiveTab("motoristas")}
          >
            <Truck size={16} /> Contas a Pagar (Motoristas)
          </button>
          <button 
            className={`px-4 py-3 font-head font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'descargas' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            onClick={() => setActiveTab("descargas")}
          >
            <DollarSign size={16} /> Pagto. de Descargas (Chapas)
          </button>
        </div>

        {/* TAB CONTENTS */}
        <div className="p-6">
          {loading ? <Loading /> : (
            <>
              {activeTab === "faturamento" && renderFaturamento()}
              {activeTab === "motoristas" && renderContasPagar(pagarMotorista, "Pagamentos de Motoristas")}
              {activeTab === "descargas" && renderContasPagar(pagarDescarga, "Descarga aguardando baixa")}
            </>
          )}
        </div>
      </div>

      <Modal open={showNovaConta} onClose={() => setShowNovaConta(false)} title="💸 Registrar Despesa" size="sm">
        <div className="space-y-4">
          <Input label="Descrição Curta" placeholder="Ex: Acerto João (viagem SP)" value={novoContaForm.descricao} onChange={(e) => setNovoContaForm({...novoContaForm, descricao: e.target.value})} />
          <Input label="Valor (R$)" type="number" step="0.01" value={novoContaForm.valor} onChange={(e) => setNovoContaForm({...novoContaForm, valor: e.target.value})} />
          <Input label="Data Vencimento" type="date" value={novoContaForm.vencimento} onChange={(e) => setNovoContaForm({...novoContaForm, vencimento: e.target.value})} />
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <Button variant="ghost" onClick={() => setShowNovaConta(false)}>Cancelar</Button>
          <Button onClick={handleCreateConta} className="bg-gray-800 text-white">Salvar Conta</Button>
        </div>
      </Modal>
    </>
  );
}
