"use client";
import { useEffect, useState, useCallback } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Card, Loading, Button } from "@/components/ui";
import { formatCurrency, formatWeight } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, PieChart, Pie, Cell,
} from "recharts";
import { TrendingUp, Package, DollarSign, Weight, Users, Download } from "lucide-react";

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const STATUS_COLORS: Record<string,string> = {
  PROGRAMADO:"#f59e0b",EM_SEPARACAO:"#3b82f6",CARREGADO:"#8b5cf6",
  EM_ROTA:"#6366f1",ENTREGUE:"#10b981",FINALIZADO:"#64748b",OCORRENCIA:"#ef4444",
};
const STATUS_LABELS: Record<string,string> = {
  PROGRAMADO:"Programado",EM_SEPARACAO:"Em Separação",CARREGADO:"Carregado",
  EM_ROTA:"Em Rota",ENTREGUE:"Entregue",FINALIZADO:"Finalizado",OCORRENCIA:"Ocorrência",
};

const TOOLTIP_STYLE = {
  contentStyle: { background:"#162030", border:"1px solid #273d58", borderRadius:8, color:"#f1f5f9", fontSize:12 },
  cursor: { fill:"rgba(249,115,22,0.05)" },
};

export default function RelatoriosPage() {
  const now = new Date();
  const [tab, setTab] = useState<"mensal"|"anual"|"motoristas">("mensal");
  const [ano, setAno] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ tipo: tab, ano: String(ano), mes: String(mes) });
    const res = await fetch(`/api/relatorios?${params}`);
    setData(await res.json());
    setLoading(false);
  }, [tab, ano, mes]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const anos = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i);

  return (
    <>
      <Topbar
        title="Relatórios"
        subtitle="Análise operacional e financeira"
        actions={
          <Button variant="ghost" size="sm">
            <Download size={14} /> Exportar
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Tabs */}
          <div className="flex rounded-xl overflow-hidden" style={{ border:"1px solid var(--border)" }}>
            {(["mensal","anual","motoristas"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className="px-4 py-2 text-sm font-semibold transition-all capitalize"
                style={{
                  background: tab === t ? "var(--accent)" : "var(--surface)",
                  color: tab === t ? "white" : "var(--text2)",
                  borderRight: t !== "motoristas" ? "1px solid var(--border)" : "none",
                }}>
                {t === "mensal" ? "📅 Mensal" : t === "anual" ? "📊 Anual" : "👤 Motoristas"}
              </button>
            ))}
          </div>

          {/* Year */}
          <select value={ano} onChange={(e) => setAno(Number(e.target.value))}
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background:"var(--surface2)", border:"1px solid var(--border)", color:"var(--text)" }}>
            {anos.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>

          {/* Month (only for mensal/motoristas) */}
          {tab !== "anual" && (
            <select value={mes} onChange={(e) => setMes(Number(e.target.value))}
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background:"var(--surface2)", border:"1px solid var(--border)", color:"var(--text)" }}>
              {MESES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          )}
        </div>

        {loading ? <Loading /> : (
          <>
            {/* ─── MENSAL ─────────────────────────────────────────────────── */}
            {tab === "mensal" && data && (
              <div className="space-y-5">
                {/* KPIs */}
                <div className="grid grid-cols-5 gap-4">
                  {[
                    { label:"Entregas", value: data.entregas, icon:"📦", color:"#f97316" },
                    { label:"Notas Fiscais", value: data.notas, icon:"📄", color:"#3b82f6" },
                    { label:"Receita Frete", value: formatCurrency(data.financeiro?._sum?.valorFrete??0), icon:"💰", color:"#10b981" },
                    { label:"Ticket Médio", value: formatCurrency(data.financeiro?._avg?.valorFrete??0), icon:"📈", color:"#8b5cf6" },
                    { label:"Saldo Pend.", value: formatCurrency(data.financeiro?._sum?.saldoPendente??0), icon:"⏳", color:"#f59e0b" },
                  ].map((k) => (
                    <Card key={k.label} className="relative overflow-hidden py-4 px-5">
                      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background:k.color }} />
                      <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color:"var(--text3)" }}>{k.label}</div>
                      <div className="font-head text-2xl font-black" style={{ color:k.color }}>{k.value}</div>
                      <div className="absolute right-3 top-3 text-2xl opacity-10">{k.icon}</div>
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-5">
                  {/* Status chart */}
                  <Card>
                    <div className="font-head text-sm font-bold mb-4">Entregas por Status</div>
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width={160} height={160}>
                        <PieChart>
                          <Pie data={data.porStatus} dataKey="_count" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                            {data.porStatus?.map((s: any, i: number) => (
                              <Cell key={i} fill={STATUS_COLORS[s.status] || "#64748b"} />
                            ))}
                          </Pie>
                          <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => [v, "Entregas"]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-2">
                        {data.porStatus?.map((s: any) => (
                          <div key={s.status} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[s.status]||"#64748b" }} />
                              <span className="text-xs" style={{ color:"var(--text2)" }}>{STATUS_LABELS[s.status]||s.status}</span>
                            </div>
                            <span className="font-mono text-xs font-bold">{s._count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>

                  {/* Top cidades */}
                  <Card>
                    <div className="font-head text-sm font-bold mb-4">Top 10 Cidades</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={data.porCidade?.map((c: any) => ({ cidade: c.cidade.split(",")[0], entregas: c._count }))}
                        layout="vertical" barSize={10}>
                        <XAxis type="number" tick={{ fontSize:10, fill:"var(--text3)" }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="cidade" tick={{ fontSize:10, fill:"var(--text2)" }} width={90} axisLine={false} tickLine={false} />
                        <Tooltip {...TOOLTIP_STYLE} />
                        <Bar dataKey="entregas" fill="var(--accent)" radius={[0,4,4,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

                {/* Financeiro breakdown */}
                <Card>
                  <div className="font-head text-sm font-bold mb-4">Resumo Financeiro do Mês</div>
                  <div className="grid grid-cols-5 gap-4">
                    {[
                      { l:"Frete Total", v: data.financeiro?._sum?.valorFrete??0, c:"#10b981" },
                      { l:"Descarga", v: data.financeiro?._sum?.valorDescarga??0, c:"#3b82f6" },
                      { l:"Armazenagem", v: data.financeiro?._sum?.valorArmazenagem??0, c:"#8b5cf6" },
                      { l:"Adiantamentos", v: data.financeiro?._sum?.adiantamento??0, c:"#f59e0b" },
                      { l:"Saldo Pendente", v: data.financeiro?._sum?.saldoPendente??0, c:((data.financeiro?._sum?.saldoPendente??0)>0)?"#ef4444":"#10b981" },
                    ].map((item) => (
                      <div key={item.l} className="text-center p-4 rounded-xl" style={{ background:"var(--surface2)" }}>
                        <div className="font-head text-xl font-black" style={{ color:item.c }}>{formatCurrency(item.v)}</div>
                        <div className="text-[10px] font-mono mt-1" style={{ color:"var(--text3)" }}>{item.l.toUpperCase()}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* ─── ANUAL ──────────────────────────────────────────────────── */}
            {tab === "anual" && data && (
              <div className="space-y-5">
                {/* Totais */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { l:"Total Entregas", v: data.totalAnual?._count??0, c:"#f97316", suffix:"" },
                    { l:"Receita Anual", v: formatCurrency(data.totalAnual?._sum?.valorFrete??0), c:"#10b981", suffix:"" },
                    { l:"Peso Transportado", v: formatWeight(data.totalAnual?._sum?.pesoTotal??0), c:"#3b82f6", suffix:"" },
                  ].map((k) => (
                    <Card key={k.l} className="text-center py-6">
                      <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color:"var(--text3)" }}>{k.l}</div>
                      <div className="font-head text-4xl font-black" style={{ color:k.c }}>{k.v}</div>
                    </Card>
                  ))}
                </div>

                {/* Entregas por mês */}
                <Card>
                  <div className="font-head text-sm font-bold mb-4">Entregas por Mês — {ano}</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.dadosMensais?.map((d: any) => ({ ...d, mes: MESES[d.mes-1] }))}>
                      <XAxis dataKey="mes" tick={{ fontSize:11, fill:"var(--text3)", fontFamily:"IBM Plex Mono" }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip {...TOOLTIP_STYLE} />
                      <Bar dataKey="entregas" fill="var(--accent)" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                {/* Receita mensal */}
                <Card>
                  <div className="font-head text-sm font-bold mb-4">Receita de Frete por Mês — {ano}</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={data.dadosMensais?.map((d: any) => ({ ...d, mes: MESES[d.mes-1] }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e2d42" />
                      <XAxis dataKey="mes" tick={{ fontSize:11, fill:"var(--text3)", fontFamily:"IBM Plex Mono" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize:10, fill:"var(--text3)" }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                      <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => [formatCurrency(v), "Receita"]} />
                      <Line type="monotone" dataKey="frete" stroke="#10b981" strokeWidth={2.5} dot={{ fill:"#10b981", r:4 }} activeDot={{ r:6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            )}

            {/* ─── MOTORISTAS ─────────────────────────────────────────────── */}
            {tab === "motoristas" && data && (
              <div className="space-y-5">
                <Card>
                  <div className="font-head text-sm font-bold mb-5">Ranking de Motoristas — {MESES[mes-1]}/{ano}</div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          {["#","Motorista","Entregas","Entregues","Ocorrências","Peso","Frete","Taxa"].map((h) => (
                            <th key={h} className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider font-normal font-mono"
                              style={{ color:"var(--text3)", borderBottom:"1px solid var(--border)" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.ranking?.map((m: any, i: number) => {
                          const taxa = m.totalEntregas > 0 ? Math.round((m.entregues/m.totalEntregas)*100) : 0;
                          return (
                            <tr key={m.id} className="hover:bg-[#162030] transition-colors" style={{ borderBottom:"1px solid var(--border)" }}>
                              <td className="px-4 py-3">
                                <span className="font-head font-black text-lg" style={{ color: i<3 ? ["#f59e0b","#94a3b8","#cd7c3a"][i] : "var(--text3)" }}>
                                  {i+1}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-semibold text-sm">{m.nome}</td>
                              <td className="px-4 py-3 font-mono text-sm">{m.totalEntregas}</td>
                              <td className="px-4 py-3 font-mono text-sm" style={{ color:"#10b981" }}>{m.entregues}</td>
                              <td className="px-4 py-3 font-mono text-sm" style={{ color: m.ocorrencias>0?"#ef4444":"var(--text3)" }}>{m.ocorrencias}</td>
                              <td className="px-4 py-3 font-mono text-xs" style={{ color:"var(--text2)" }}>{formatWeight(m.peso)}</td>
                              <td className="px-4 py-3 font-mono text-sm" style={{ color:"#10b981" }}>{formatCurrency(m.frete)}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 rounded-full" style={{ background:"var(--surface2)" }}>
                                    <div className="h-full rounded-full" style={{ width:`${taxa}%`, background: taxa>=90?"#10b981":taxa>=70?"#f59e0b":"#ef4444" }} />
                                  </div>
                                  <span className="text-[10px] font-mono w-8" style={{ color:"var(--text2)" }}>{taxa}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {(!data.ranking || data.ranking.length === 0) && (
                          <tr><td colSpan={8} className="px-4 py-10 text-center text-sm" style={{ color:"var(--text3)" }}>
                            Nenhum dado para o período selecionado
                          </td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Comparativo bar */}
                {data.ranking?.length > 0 && (
                  <Card>
                    <div className="font-head text-sm font-bold mb-4">Comparativo de Entregas</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={data.ranking.slice(0,8)} layout="vertical" barSize={12}>
                        <XAxis type="number" tick={{ fontSize:10, fill:"var(--text3)" }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="nome" tick={{ fontSize:11, fill:"var(--text2)" }} width={120} axisLine={false} tickLine={false} />
                        <Tooltip {...TOOLTIP_STYLE} />
                        <Bar dataKey="totalEntregas" name="Total" fill="#f97316" radius={[0,4,4,0]} />
                        <Bar dataKey="entregues" name="Entregues" fill="#10b981" radius={[0,4,4,0]} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:11 }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
