"use client";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { Topbar } from "@/components/layout/Topbar";
import { Button, Card, Loading } from "@/components/ui";
import { formatWeight } from "@/lib/utils";
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, X, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface ResultItem {
  numero: string;
  destinatario: string;
  cidade: string;
  peso: number;
  volumes: number;
  entrega: string;
  agrupada: boolean;
}

interface ImportResult {
  importadas: number;
  duplicadas: number;
  agrupadas: number;
  ctesImportados: number;
  erros: { arquivo: string; erro: string }[];
  notas: ResultItem[];
  ctes: any[];
}

export default function ImportacaoPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const addFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const xmlFiles = Array.from(newFiles).filter((f) => f.name.toLowerCase().endsWith(".xml") || f.type === "text/xml");
    if (!xmlFiles.length) { toast.error("Selecione apenas arquivos XML"); return; }
    setFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      return [...prev, ...xmlFiles.filter((f) => !existingNames.has(f.name))];
    });
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  async function handleImport() {
    if (!files.length) return;
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      const res = await fetch("/api/importacao", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      setFiles([]);
      if (data.importadas > 0 || data.agrupadas > 0) {
        toast.success(`${data.importadas} criadas, ${data.agrupadas} agrupadas!`);
      } else if (data.duplicadas > 0 && !data.importadas) {
        toast("Todas as notas já estavam importadas", { icon: "ℹ️" });
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const fmtSize = (b: number) => b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`;

  return (
    <>
      <Topbar title="Importar XML de NF-e" subtitle="Upload em lote de notas fiscais eletrônicas" />
      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Drop zone */}
        {!result && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className="relative rounded-2xl transition-all cursor-pointer"
            style={{
              border: `2px dashed ${dragging ? "var(--accent)" : "var(--border2)"}`,
              background: dragging ? "rgba(249,115,22,.05)" : "var(--surface)",
              minHeight: "200px",
            }}
            onClick={() => document.getElementById("xml-input")?.click()}>
            <input id="xml-input" type="file" multiple accept=".xml,text/xml" className="hidden"
              onChange={(e) => addFiles(e.target.files)} />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Upload size={48} className="text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2 font-head">
                Arraste os arquivos XML aqui ou clique para selecionar
              </p>
              <p className="text-sm text-gray-500 font-mono">
                Suporta múltiplos arquivos simultâneos
              </p>
              <div className="flex gap-2 mt-4 justify-center">
                {["XML NF-e", "XML CT-e"].map((tag) => (
                  <span key={tag} className="text-[11px] px-3 py-1 rounded-full font-bold font-mono"
                    style={{ background: "var(--accent)", color: "white" }}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Files queue */}
        {files.length > 0 && (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <span className="font-head text-sm font-bold">{files.length} arquivo(s) na fila · {fmtSize(totalSize)}</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setFiles([])}>Limpar tudo</Button>
                <Button onClick={handleImport} loading={loading}>
                  <Upload size={15} /> Importar {files.length} arquivo(s)
                </Button>
              </div>
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  <FileText size={14} style={{ color: "var(--accent)" }} />
                  <span className="flex-1 text-xs font-mono truncate">{f.name}</span>
                  <span className="text-[10px]" style={{ color: "var(--text3)" }}>{fmtSize(f.size)}</span>
                  <button onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}
                    className="hover:opacity-60 transition-all" style={{ color: "var(--text3)" }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Loading */}
        {loading && (
          <Card className="flex flex-col items-center py-12 gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "var(--border2)", borderTopColor: "var(--accent)" }} />
            <p className="text-sm" style={{ color: "var(--text2)" }}>Processando {files.length} arquivo(s)...</p>
          </Card>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-4 animate-fadeIn">
            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="rounded-xl p-4 flex items-center gap-3"
                style={{ background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.25)" }}>
                <CheckCircle size={22} style={{ color: "#10b981" }} />
                <div>
                  <div className="font-head text-2xl font-black" style={{ color: "#10b981" }}>{result.importadas}</div>
                  <div className="text-[10px] font-mono uppercase" style={{ color: "#10b981" }}>Novas entregas</div>
                </div>
              </div>
              <div className="rounded-xl p-4 flex items-center gap-3"
                style={{ background: "rgba(59,130,246,.1)", border: "1px solid rgba(59,130,246,.25)" }}>
                <CheckCircle size={22} style={{ color: "#3b82f6" }} />
                <div>
                  <div className="font-head text-2xl font-black" style={{ color: "#3b82f6" }}>{result.agrupadas}</div>
                  <div className="text-[10px] font-mono uppercase" style={{ color: "#3b82f6" }}>Agrupadas</div>
                </div>
              </div>
              <div className="rounded-xl p-4 flex items-center gap-3"
                style={{ background: "rgba(100,116,139,.1)", border: "1px solid rgba(100,116,139,.25)" }}>
                <AlertTriangle size={22} style={{ color: "#64748b" }} />
                <div>
                  <div className="font-head text-2xl font-black" style={{ color: "#64748b" }}>{result.duplicadas}</div>
                  <div className="text-[10px] font-mono uppercase" style={{ color: "#64748b" }}>Duplicadas</div>
                </div>
              </div>
              <div className="rounded-xl p-4 flex items-center gap-3"
                style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)" }}>
                <XCircle size={22} style={{ color: "#ef4444" }} />
                <div>
                  <div className="font-head text-2xl font-black" style={{ color: "#ef4444" }}>{result.erros.length}</div>
                  <div className="text-[10px] font-mono uppercase" style={{ color: "#ef4444" }}>Erros</div>
                </div>
              </div>
            </div>

            {/* Errors */}
            {result.ctesImportados > 0 && (
            <Card>
              <h3 className="font-bold flex items-center gap-2 font-head text-sm mb-3">
                <CheckCircle size={18} style={{ color: "#f59e0b" }} />
                {result.ctesImportados} CT-e(s) processado(s)
              </h3>
              {result.ctes.map((cte: any, i: number) => (
                <div key={i} className="p-3 rounded-lg mb-2" style={{ background: "rgba(245,158,11,.06)", border: "1px solid rgba(245,158,11,.2)" }}>
                  <div className="flex items-center gap-4 mb-1">
                    <span className="font-mono text-xs font-bold">CT-e {cte.numero}</span>
                    <span className="text-xs" style={{ color: "var(--text2)" }}>{cte.tomador}</span>
                    <span className="font-mono text-xs font-bold" style={{ color: "#f59e0b" }}>R$ {cte.valor?.toFixed(2)}</span>
                    {cte.reprocessado && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 font-mono">Reprocessado</span>}
                  </div>
                  <div className="text-[11px] mt-1" style={{ color: "var(--text3)" }}>
                    <span className="font-mono">Notas vinculadas: {cte.vinculadas || 0}</span>
                    {cte.debug?.entregasAtualizadas > 0 && (
                      <span className="ml-3 text-emerald-500">✓ Frete atualizado em {cte.debug.entregasAtualizadas} entrega(s)</span>
                    )}
                    {cte.debug?.notasEncontradas === 0 && cte.debug?.entregasDiretas === 0 && (
                      <span className="ml-3 text-red-400">✗ Nenhuma NF correspondente encontrada no sistema</span>
                    )}
                    {cte.debug?.notasEncontradas === 0 && !cte.debug?.entregasDiretas && (
                      <span className="ml-3 text-red-400">✗ Nenhuma NF correspondente encontrada no sistema</span>
                    )}
                  </div>
                  {cte.debug?.chavesNFeDoCte?.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-[10px] font-mono cursor-pointer" style={{ color: "var(--text3)" }}>
                        Ver chaves de NF referenciadas ({cte.debug.chavesNFeDoCte.length})
                      </summary>
                      <div className="mt-1 space-y-0.5">
                        {cte.debug.chavesNFeDoCte.map((ch: string, j: number) => (
                          <div key={j} className="font-mono text-[10px] px-2 py-1 rounded" style={{ background: "var(--surface2)", color: "var(--text2)" }}>
                            {ch}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </Card>
          )}

          {result.erros.length > 0 && (
              <Card>
                <div className="font-head text-sm font-bold mb-3 text-red-400">Erros de processamento</div>
                {result.erros.map((e, i) => (
                  <div key={i} className="flex gap-3 p-2.5 rounded-lg mb-2"
                    style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)" }}>
                    <XCircle size={14} style={{ color: "#ef4444", flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <div className="text-xs font-mono" style={{ color: "#ef4444" }}>{e.arquivo}</div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--text2)" }}>{e.erro}</div>
                    </div>
                  </div>
                ))}
              </Card>
            )}

            {/* Notes imported */}
            {result.notas.length > 0 && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div className="font-head text-sm font-bold">Notas processadas</div>
                  <Button variant="ghost" size="sm" onClick={() => router.push("/entregas")}>
                    Ver entregas <ChevronRight size={14} />
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        {["NF", "Destinatário", "Cidade", "Peso", "Vol.", "Entrega", "Tipo"].map((h) => (
                          <th key={h} className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-normal font-mono"
                            style={{ color: "var(--text3)", borderBottom: "1px solid var(--border)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.notas.map((n, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td className="px-3 py-2.5 font-mono text-xs" style={{ color: "var(--text2)" }}>{n.numero}</td>
                          <td className="px-3 py-2.5 text-sm font-medium">{n.destinatario}</td>
                          <td className="px-3 py-2.5 text-xs" style={{ color: "var(--text2)" }}>{n.cidade}</td>
                          <td className="px-3 py-2.5 text-xs font-mono">{formatWeight(n.peso)}</td>
                          <td className="px-3 py-2.5 text-xs font-mono">{n.volumes}</td>
                          <td className="px-3 py-2.5 font-mono text-xs" style={{ color: "var(--accent)" }}>{n.entrega}</td>
                          <td className="px-3 py-2.5">
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${n.agrupada
                              ? "text-blue-400 bg-blue-400/10 border border-blue-400/30"
                              : "text-emerald-400 bg-emerald-400/10 border border-emerald-400/30"}`}>
                              {n.agrupada ? "Agrupada" : "Nova"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            <div className="flex justify-center">
              <Button variant="ghost" onClick={() => setResult(null)}>
                <Upload size={15} /> Importar mais arquivos
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
