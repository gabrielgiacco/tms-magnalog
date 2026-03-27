"use client";
import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface QualityScoringProps {
  entregaId?: string;
  rotaId?: string;
  onSave?: () => void;
}

export function QualityScoring({ entregaId, rotaId, onSave }: QualityScoringProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [data, setData] = useState({
    conferenciaCorreta: true,
    carregamentoCorreto: true,
    houveAvaria: false,
    organizacaoGeral: true,
    observacoes: "",
  });

  useEffect(() => {
    async function load() {
      try {
        const idParam = entregaId ? `entregaId=${entregaId}` : `rotaId=${rotaId}`;
        const res = await fetch(`/api/qualidade?${idParam}`);
        if (res.ok) {
          const json = await res.json();
          if (json) {
            setData({
              conferenciaCorreta: json.conferenciaCorreta,
              carregamentoCorreto: json.carregamentoCorreto,
              houveAvaria: json.houveAvaria,
              organizacaoGeral: json.organizacaoGeral,
              observacoes: json.observacoes || "",
            });
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setFetching(false);
      }
    }
    load();
  }, [entregaId, rotaId]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/qualidade", {
        method: "POST",
        body: JSON.stringify({ ...data, entregaId, rotaId }),
      });
      if (res.ok) {
        toast.success("Qualidade operacional registrada!");
        onSave?.();
      } else {
        toast.error("Erro ao salvar registro.");
      }
    } catch (e) {
      toast.error("Erro na conexão.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  const score = (data.conferenciaCorreta ? 10 : 0) + 
                (data.carregamentoCorreto ? 10 : 0) + 
                (!data.houveAvaria ? 10 : 0) + 
                (data.organizacaoGeral ? 10 : 0);

  const getStatusColor = () => {
    if (score >= 36) return "#22c55e"; // Excelente
    if (score >= 32) return "#eab308"; // Bom
    return "#ef4444"; // Crítico
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <QualityToggle 
          label="Conferência correta?" 
          value={data.conferenciaCorreta} 
          onChange={(v) => setData(d => ({ ...d, conferenciaCorreta: v }))} 
        />
        <QualityToggle 
          label="Carregamento correto?" 
          value={data.carregamentoCorreto} 
          onChange={(v) => setData(d => ({ ...d, carregamentoCorreto: v }))} 
        />
        <QualityToggle 
          label="Houve avaria?" 
          inverted
          value={data.houveAvaria} 
          onChange={(v) => setData(d => ({ ...d, houveAvaria: v }))} 
        />
        <QualityToggle 
          label="Organização do galpão adequada?" 
          value={data.organizacaoGeral} 
          onChange={(v) => setData(d => ({ ...d, organizacaoGeral: v }))} 
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Observações (Opcional)</label>
        <textarea
          className="w-full h-24 p-3 rounded-xl border text-sm transition-all focus:ring-2 focus:ring-accent"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          placeholder="Ex: Motorista ajudou na conferência..."
          value={data.observacoes}
          onChange={(e) => setData(d => ({ ...d, observacoes: e.target.value }))}
        />
      </div>

      <div className="flex items-center justify-between p-4 rounded-xl border" style={{ background: "var(--surface2)", borderColor: "var(--border)" }}>
        <div>
          <div className="text-xs font-bold uppercase text-slate-500">Score de Performance</div>
          <div className="text-2xl font-black mt-1" style={{ color: getStatusColor() }}>{score} / 40 pts</div>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2.5 bg-accent text-white rounded-lg font-bold hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
          Salvar Avaliação
        </button>
      </div>
    </div>
  );
}

function QualityToggle({ label, value, onChange, inverted = false }: { label: string, value: boolean, onChange: (v: boolean) => void, inverted?: boolean }) {
  const isCorrect = inverted ? !value : value;

  return (
    <div className="p-4 rounded-xl border flex items-center justify-between group transition-all"
      style={{ background: "var(--surface)", borderColor: isCorrect ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)" }}>
      <span className="text-sm font-semibold">{label}</span>
      <div className="flex bg-slate-100 p-1 rounded-lg">
        <button
          onClick={() => onChange(true)}
          className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${value ? (inverted ? "bg-red-500 text-white" : "bg-green-500 text-white") : "text-slate-400 hover:text-slate-600"}`}
        >
          Sim
        </button>
        <button
          onClick={() => onChange(false)}
          className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${!value ? (inverted ? "bg-green-500 text-white" : "bg-red-500 text-white") : "text-slate-400 hover:text-slate-600"}`}
        >
          Não
        </button>
      </div>
    </div>
  );
}
