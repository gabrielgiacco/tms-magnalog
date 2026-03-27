import { XMLParser } from "fast-xml-parser";

export interface NotaFiscalData {
  chaveAcesso: string;
  numero: string;
  serie: string;
  emitenteCnpj: string;
  emitenteRazao: string;
  destinatarioCnpj: string;
  destinatarioRazao: string;
  cidade: string;
  uf: string;
  endereco: string;
  bairro: string;
  cep: string;
  volumes: number;
  pesoBruto: number;
  valorNota: number;
  dataEmissao: Date | null;
  xmlOriginal: string;
}

export function parseNotaFiscalXML(xmlContent: string): NotaFiscalData {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseAttributeValue: false,
    numberParseOptions: { hex: false, leadingZeros: false, skipLike: /.*/ },
  });

  const parsed = parser.parse(xmlContent);

  // Navigate to the NFe node (handles both with and without nfeProc wrapper)
  const nfe = parsed?.nfeProc?.NFe || parsed?.NFe;
  if (!nfe) throw new Error("XML inválido: estrutura NFe não encontrada");

  const infNFe = nfe.infNFe;
  if (!infNFe) throw new Error("XML inválido: infNFe não encontrado");

  // Chave de acesso from Id attribute or infProt
  const chaveAcesso =
    (infNFe["@_Id"] as string)?.replace("NFe", "") ||
    parsed?.nfeProc?.protNFe?.infProt?.chNFe?.toString() ||
    "";

  if (!chaveAcesso || chaveAcesso.length !== 44) {
    throw new Error(`Chave de acesso inválida: ${chaveAcesso}`);
  }

  const emit = infNFe.emit || {};
  const dest = infNFe.dest || {};
  const ide = infNFe.ide || {};
  const transp = infNFe.transp || {};
  const total = infNFe.total?.ICMSTot || {};

  // Destinatário address
  const enderDest = dest.enderDest || {};

  // Volumes/peso from transport
  const vol = transp?.vol;
  const volumes = Array.isArray(vol)
    ? vol.reduce((s: number, v: any) => s + (parseInt(v.qVol) || 0), 0)
    : parseInt(vol?.qVol) || 0;
  const pesoBruto = Array.isArray(vol)
    ? vol.reduce((s: number, v: any) => s + (parseFloat(v.pesoB) || 0), 0)
    : parseFloat(vol?.pesoB) || 0;

  const dataEmissao = ide.dhEmi
    ? new Date(ide.dhEmi)
    : ide.dEmi
    ? new Date(ide.dEmi)
    : null;

  return {
    chaveAcesso,
    numero: String(ide.nNF || ""),
    serie: String(ide.serie || "1"),
    emitenteCnpj: String(emit.CNPJ || emit.CPF || "").replace(/\D/g, ""),
    emitenteRazao: String(emit.xNome || ""),
    destinatarioCnpj: String(dest.CNPJ || dest.CPF || "").replace(/\D/g, ""),
    destinatarioRazao: String(dest.xNome || ""),
    cidade: String(enderDest.xMun || ""),
    uf: String(enderDest.UF || ""),
    endereco: `${enderDest.xTipoLogradouro || ""} ${enderDest.xLgr || ""}`.trim(),
    bairro: String(enderDest.xBairro || ""),
    cep: String(enderDest.CEP || "").replace(/\D/g, ""),
    volumes,
    pesoBruto,
    valorNota: parseFloat(String(total.vNF || "0")) || 0,
    dataEmissao,
    xmlOriginal: xmlContent,
  };
}
