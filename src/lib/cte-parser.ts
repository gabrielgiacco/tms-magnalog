import { XMLParser } from "fast-xml-parser";

export interface CTeData {
  chaveCte: string;
  numero: string;
  serie: string;
  dataEmissao: Date | null;
  valorReceber: number;
  valorPedagio: number;
  emitenteCnpj: string;
  emitenteNome: string;
  tomadorCnpj: string;
  tomadorNome: string;
  chavesNFe: string[];
}

export function parseCTeXML(xmlContent: string): CTeData {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseAttributeValue: false,
    numberParseOptions: { hex: false, leadingZeros: false, skipLike: /.*/ },
  });

  const parsed = parser.parse(xmlContent);

  const cte = parsed?.cteProc?.CTe || parsed?.CTe;
  if (!cte) throw new Error("XML inválido: estrutura CTe não encontrada");

  const infCte = cte.infCte;
  if (!infCte) throw new Error("XML inválido: infCte não encontrado");

  // Chave do CT-e
  const chaveCte =
    (infCte["@_Id"] as string)?.replace("CTe", "") ||
    parsed?.cteProc?.protCTe?.infProt?.chCTe?.toString() ||
    "";

  if (!chaveCte || chaveCte.length !== 44) {
    throw new Error(`Chave de acesso inválida: ${chaveCte}`);
  }

  const ide = infCte.ide || {};
  const emit = infCte.emit || {};
  const rem = infCte.rem || {};
  const dest = infCte.dest || {};
  const vPrest = infCte.vPrest || {};

  // Valor da Prestação (Frete total)
  const valorReceber = parseFloat(String(vPrest.vTPrest || "0")) || 0;
  
  // Encontrar valor de Pedágio (Se existir nos componentes)
  let valorPedagio = 0;
  if (vPrest.Comp) {
    const comps = Array.isArray(vPrest.Comp) ? vPrest.Comp : [vPrest.Comp];
    const pedagioComp = comps.find((c: any) => String(c.xNome).toLowerCase().includes("pedagio"));
    if (pedagioComp) {
      valorPedagio = parseFloat(String(pedagioComp.vComp || "0")) || 0;
    }
  }

  // Identificar o Tomador (Quem paga o frete)
  const tomaIndicador = infCte.toma3?.toma || infCte.toma4?.toma;
  let tomadorCnpj = "";
  let tomadorNome = "";

  // 0-Remetente, 1-Expedidor, 2-Recebedor, 3-Destinatário, 4-Outros
  if (tomaIndicador === 0 || tomaIndicador === "0") {
    tomadorCnpj = rem.CNPJ || rem.CPF || "";
    tomadorNome = rem.xNome || "";
  } else if (tomaIndicador === 3 || tomaIndicador === "3") {
    tomadorCnpj = dest.CNPJ || dest.CPF || "";
    tomadorNome = dest.xNome || "";
  } else if (infCte.toma4 && infCte.toma4.CNPJ) {
    tomadorCnpj = infCte.toma4.CNPJ || infCte.toma4.CPF || "";
    tomadorNome = infCte.toma4.xNome || "TOMADOR OUTROS";
  } else {
    // Fallback: assume Destinatário
    tomadorCnpj = dest.CNPJ || dest.CPF || "";
    tomadorNome = dest.xNome || "";
  }

  tomadorCnpj = String(tomadorCnpj).replace(/\D/g, "");

  // Extrair as Chaves de NFe vinculadas
  const infDoc = infCte.infCTeNorm?.infDoc;
  let chavesNFe: string[] = [];

  if (infDoc && infDoc.infNFe) {
    const nfes = Array.isArray(infDoc.infNFe) ? infDoc.infNFe : [infDoc.infNFe];
    chavesNFe = nfes.map((n: any) => String(n.chave)).filter(Boolean);
  }

  return {
    chaveCte,
    numero: String(ide.nCT || ""),
    serie: String(ide.serie || "1"),
    dataEmissao: ide.dhEmi ? new Date(ide.dhEmi) : null,
    valorReceber,
    valorPedagio,
    emitenteCnpj: String(emit.CNPJ || emit.CPF || "").replace(/\D/g, ""),
    emitenteNome: String(emit.xNome || ""),
    tomadorCnpj,
    tomadorNome,
    chavesNFe,
  };
}
