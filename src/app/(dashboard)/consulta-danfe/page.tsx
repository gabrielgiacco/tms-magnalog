"use client";

import { useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Topbar } from "@/components/layout/Topbar";
import { Button, Card } from "@/components/ui";
import { DanfeViewer } from "@/components/danfe/DanfeViewer";
import { DanfeData, parseDanfeXML } from "@/lib/danfe-parser";
import {
  Upload,
  FileText,
  Printer,
  Download,
  RotateCcw,
  Search,
  FileX,
  Eye,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

export default function ConsultaDanfePage() {
  const [dragging, setDragging] = useState(false);
  const [danfeData, setDanfeData] = useState<DanfeData | null>(null);
  const [xmlContent, setXmlContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const danfeRef = useRef<HTMLDivElement>(null);

  const processFile = useCallback(async (file: File) => {
    setError(null);
    setDanfeData(null);

    if (!file.name.toLowerCase().endsWith(".xml")) {
      setError("Por favor, selecione um arquivo XML de NF-e.");
      return;
    }

    try {
      const content = await file.text();
      setXmlContent(content);
      setFileName(file.name);
      const parsed = parseDanfeXML(content);
      setDanfeData(parsed);
      toast.success("XML processado com sucesso!");
    } catch (e: any) {
      setError(e.message || "Erro ao processar o XML");
      toast.error("Erro ao processar XML");
    }
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  }

  function handlePrint() {
    window.print();
  }

  function handleDownloadXml() {
    if (!xmlContent || !fileName) return;
    const blob = new Blob([xmlContent], { type: "text/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleReset() {
    setDanfeData(null);
    setXmlContent(null);
    setFileName("");
    setError(null);
    setZoom(100);
  }

  return (
    <>
      <Topbar
        title="Consulta DANFE"
        subtitle="Visualize e imprima o DANFE a partir do XML da NF-e"
      />
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Upload area - shown when no data */}
        {!danfeData && (
          <div className="max-w-2xl mx-auto space-y-5">
            {/* Hero */}
            <div className="text-center py-4">
              <div
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                style={{ background: "rgba(249,115,22,.1)" }}
              >
                <Search size={32} style={{ color: "var(--accent)" }} />
              </div>
              <h2 className="font-head text-xl font-bold tracking-tight mb-2">
                Visualizador de DANFE
              </h2>
              <p className="text-sm" style={{ color: "var(--text2)" }}>
                Faça upload do XML da Nota Fiscal Eletronica para visualizar e
                imprimir o DANFE
              </p>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className="relative rounded-2xl transition-all cursor-pointer"
              style={{
                border: `2px dashed ${dragging ? "var(--accent)" : "var(--border2)"}`,
                background: dragging
                  ? "rgba(249,115,22,.05)"
                  : "var(--surface)",
                minHeight: "220px",
              }}
              onClick={() =>
                document.getElementById("danfe-xml-input")?.click()
              }
            >
              <input
                id="danfe-xml-input"
                type="file"
                accept=".xml,text/xml"
                className="hidden"
                onChange={handleFileSelect}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Upload size={48} className="text-gray-400 mb-2" />
                <p className="text-gray-600 font-head font-medium">
                  Arraste o arquivo XML aqui ou clique para selecionar
                </p>
                <p
                  className="text-sm font-mono"
                  style={{ color: "var(--text3)" }}
                >
                  Aceita XML de NF-e (procNFe ou NFe)
                </p>
                <span
                  className="text-[11px] px-3 py-1 rounded-full font-bold font-mono mt-2"
                  style={{ background: "var(--accent)", color: "white" }}
                >
                  XML NF-e
                </span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <Card className="flex items-start gap-3" style={{ borderColor: "rgba(239,68,68,.3)" }}>
                <FileX
                  size={20}
                  style={{ color: "#ef4444", flexShrink: 0, marginTop: 2 }}
                />
                <div>
                  <div className="text-sm font-bold text-red-400 mb-1">
                    Erro ao processar XML
                  </div>
                  <div className="text-xs" style={{ color: "var(--text2)" }}>
                    {error}
                  </div>
                </div>
              </Card>
            )}

            {/* Features */}
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  icon: Eye,
                  title: "Visualização",
                  desc: "Layout fiel ao DANFE oficial",
                },
                {
                  icon: Printer,
                  title: "Impressão",
                  desc: "Imprima direto do navegador",
                },
                {
                  icon: Download,
                  title: "Download",
                  desc: "Baixe o XML original",
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="rounded-xl p-4 text-center"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <f.icon
                    size={24}
                    className="mx-auto mb-2"
                    style={{ color: "var(--accent)" }}
                  />
                  <div className="text-xs font-bold font-head">{f.title}</div>
                  <div
                    className="text-[10px] mt-1"
                    style={{ color: "var(--text3)" }}
                  >
                    {f.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DANFE Viewer */}
        {danfeData && (
          <div className="space-y-4 animate-fadeIn">
            {/* Toolbar */}
            <Card className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <FileText size={18} style={{ color: "var(--accent)" }} />
                <div>
                  <div className="text-sm font-bold font-head">
                    NF-e {danfeData.numero} · Série {danfeData.serie}
                  </div>
                  <div
                    className="text-[10px] font-mono"
                    style={{ color: "var(--text3)" }}
                  >
                    {fileName}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Zoom controls */}
                <div
                  className="flex items-center gap-1 rounded-lg px-2 py-1"
                  style={{
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <button
                    onClick={() => setZoom((z) => Math.max(50, z - 10))}
                    className="p-1 rounded hover:opacity-70 transition-all"
                    style={{ color: "var(--text2)" }}
                  >
                    <ZoomOut size={14} />
                  </button>
                  <span
                    className="text-[10px] font-mono px-1 min-w-[36px] text-center"
                    style={{ color: "var(--text2)" }}
                  >
                    {zoom}%
                  </span>
                  <button
                    onClick={() => setZoom((z) => Math.min(150, z + 10))}
                    className="p-1 rounded hover:opacity-70 transition-all"
                    style={{ color: "var(--text2)" }}
                  >
                    <ZoomIn size={14} />
                  </button>
                </div>

                <Button variant="ghost" size="sm" onClick={handleDownloadXml}>
                  <Download size={14} /> XML
                </Button>
                <Button variant="ghost" size="sm" onClick={handlePrint}>
                  <Printer size={14} /> Imprimir
                </Button>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  <RotateCcw size={14} /> Novo
                </Button>
              </div>
            </Card>

            {/* DANFE Document */}
            <div className="flex justify-center">
              <div
                ref={danfeRef}
                className="danfe-page-wrapper"
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: "top center",
                }}
              >
                <DanfeViewer data={danfeData} />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
