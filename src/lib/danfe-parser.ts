import { XMLParser } from "fast-xml-parser";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DanfeData {
  // Identificação
  chaveAcesso: string;
  numero: string;
  serie: string;
  naturezaOperacao: string;
  tipoOperacao: "0" | "1"; // 0=Entrada, 1=Saída
  dataEmissao: string;
  dataSaidaEntrada: string;
  horaSaidaEntrada: string;
  protocolo: string;
  dataProtocolo: string;

  // Emitente
  emitente: {
    cnpj: string;
    razaoSocial: string;
    nomeFantasia: string;
    endereco: string;
    bairro: string;
    cep: string;
    municipio: string;
    uf: string;
    telefone: string;
    ie: string;
    iest: string;
    im: string;
    cnae: string;
    crt: string;
  };

  // Destinatário
  destinatario: {
    cnpj: string;
    razaoSocial: string;
    endereco: string;
    bairro: string;
    cep: string;
    municipio: string;
    uf: string;
    telefone: string;
    ie: string;
    email: string;
  };

  // Produtos
  produtos: DanfeProduto[];

  // Totais
  totais: {
    bcIcms: number;
    vIcms: number;
    bcIcmsSt: number;
    vIcmsSt: number;
    vProd: number;
    vFrete: number;
    vSeg: number;
    vDesc: number;
    vOutro: number;
    vIpi: number;
    vIpiDevol: number;
    vNf: number;
    vTotTrib: number;
    vFcp: number;
    vFcpSt: number;
    vPis: number;
    vCofins: number;
  };

  // Transporte
  transporte: {
    modalidade: string;
    transportadorCnpj: string;
    transportadorNome: string;
    transportadorIe: string;
    transportadorEndereco: string;
    transportadorMunicipio: string;
    transportadorUf: string;
    veiculoPlaca: string;
    veiculoUf: string;
    veiculoRntc: string;
    volumes: DanfeVolume[];
  };

  // Cobrança / Pagamento
  fatura: {
    numero: string;
    valorOriginal: number;
    valorDesconto: number;
    valorLiquido: number;
  } | null;
  duplicatas: DanfeDuplicata[];
  pagamentos: DanfePagamento[];

  // Informações adicionais
  infAdicionais: string;
  infFisco: string;
}

export interface DanfeProduto {
  item: number;
  codigo: string;
  ean: string;
  descricao: string;
  ncm: string;
  cest: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  bcIcms: number;
  vIcms: number;
  pIcms: number;
  vIpi: number;
  pIpi: number;
  aliqIcms: number;
  origem: string;
  cst: string;
}

export interface DanfeVolume {
  quantidade: number;
  especie: string;
  marca: string;
  numeracao: string;
  pesoLiquido: number;
  pesoBruto: number;
}

export interface DanfeDuplicata {
  numero: string;
  vencimento: string;
  valor: number;
}

export interface DanfePagamento {
  forma: string;
  valor: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function str(val: any): string {
  if (val === undefined || val === null) return "";
  return String(val);
}

function num(val: any): number {
  if (val === undefined || val === null) return 0;
  return parseFloat(String(val)) || 0;
}

function toArray<T>(val: T | T[] | undefined | null): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  // Handle ISO format: 2024-01-15T14:30:00-03:00
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("pt-BR");
}

function formatTime(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const MODALIDADE_FRETE: Record<string, string> = {
  "0": "0 - Contratação do Frete por conta do Remetente (CIF)",
  "1": "1 - Contratação do Frete por conta do Destinatário (FOB)",
  "2": "2 - Contratação do Frete por conta de Terceiros",
  "3": "3 - Transporte Próprio por conta do Remetente",
  "4": "4 - Transporte Próprio por conta do Destinatário",
  "9": "9 - Sem Ocorrência de Transporte",
};

const FORMA_PAGAMENTO: Record<string, string> = {
  "01": "Dinheiro",
  "02": "Cheque",
  "03": "Cartão de Crédito",
  "04": "Cartão de Débito",
  "05": "Crédito Loja",
  "10": "Vale Alimentação",
  "11": "Vale Refeição",
  "12": "Vale Presente",
  "13": "Vale Combustível",
  "14": "Duplicata Mercantil",
  "15": "Boleto Bancário",
  "16": "Depósito Bancário",
  "17": "Pagamento Instantâneo (PIX)",
  "18": "Transferência bancária, Carteira Digital",
  "19": "Programa de fidelidade, Cashback, Crédito Virtual",
  "90": "Sem pagamento",
  "99": "Outros",
};

// ─── Parser ─────────────────────────────────────────────────────────────────

export function parseDanfeXML(xmlContent: string): DanfeData {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseAttributeValue: false,
    numberParseOptions: { hex: false, leadingZeros: false, skipLike: /.*/ },
  });

  const parsed = parser.parse(xmlContent);

  const nfe = parsed?.nfeProc?.NFe || parsed?.NFe;
  if (!nfe) throw new Error("XML inválido: estrutura NFe não encontrada");

  const infNFe = nfe.infNFe;
  if (!infNFe) throw new Error("XML inválido: infNFe não encontrado");

  // Protocolo de autorização
  const protNFe = parsed?.nfeProc?.protNFe?.infProt;

  // Chave de acesso
  const chaveAcesso =
    str(infNFe["@_Id"]).replace("NFe", "") ||
    str(protNFe?.chNFe) ||
    "";

  const ide = infNFe.ide || {};
  const emit = infNFe.emit || {};
  const dest = infNFe.dest || {};
  const total = infNFe.total?.ICMSTot || {};
  const transp = infNFe.transp || {};
  const cobr = infNFe.cobr || {};
  const pag = infNFe.pag || {};
  const infAdFisco = infNFe.infAdic?.infAdFisco || "";
  const infCpl = infNFe.infAdic?.infCpl || "";

  // Emitente
  const enderEmit = emit.enderEmit || {};
  const emitente = {
    cnpj: str(emit.CNPJ || emit.CPF),
    razaoSocial: str(emit.xNome),
    nomeFantasia: str(emit.xFant),
    endereco: `${str(enderEmit.xLgr)}${enderEmit.nro ? `, ${str(enderEmit.nro)}` : ""}${enderEmit.xCpl ? ` - ${str(enderEmit.xCpl)}` : ""}`,
    bairro: str(enderEmit.xBairro),
    cep: str(enderEmit.CEP),
    municipio: str(enderEmit.xMun),
    uf: str(enderEmit.UF),
    telefone: str(enderEmit.fone),
    ie: str(emit.IE),
    iest: str(emit.IEST),
    im: str(emit.IM),
    cnae: str(emit.CNAE),
    crt: str(emit.CRT),
  };

  // Destinatário
  const enderDest = dest.enderDest || {};
  const destinatario = {
    cnpj: str(dest.CNPJ || dest.CPF),
    razaoSocial: str(dest.xNome),
    endereco: `${str(enderDest.xLgr)}${enderDest.nro ? `, ${str(enderDest.nro)}` : ""}${enderDest.xCpl ? ` - ${str(enderDest.xCpl)}` : ""}`,
    bairro: str(enderDest.xBairro),
    cep: str(enderDest.CEP),
    municipio: str(enderDest.xMun),
    uf: str(enderDest.UF),
    telefone: str(enderDest.fone),
    ie: str(dest.IE),
    email: str(dest.email),
  };

  // Produtos
  const dets = toArray(infNFe.det);
  const produtos: DanfeProduto[] = dets.map((det: any, idx: number) => {
    const prod = det.prod || {};
    const imposto = det.imposto || {};
    const icms = imposto.ICMS || {};
    const icmsGrupo = icms.ICMS00 || icms.ICMS10 || icms.ICMS20 || icms.ICMS30 ||
      icms.ICMS40 || icms.ICMS51 || icms.ICMS60 || icms.ICMS70 || icms.ICMS90 ||
      icms.ICMSSN101 || icms.ICMSSN102 || icms.ICMSSN201 || icms.ICMSSN202 ||
      icms.ICMSSN500 || icms.ICMSSN900 || {};
    const ipi = imposto.IPI?.IPITrib || imposto.IPI?.IPINT || {};

    return {
      item: parseInt(str(det["@_nItem"])) || idx + 1,
      codigo: str(prod.cProd),
      ean: str(prod.cEAN),
      descricao: str(prod.xProd),
      ncm: str(prod.NCM),
      cest: str(prod.CEST),
      cfop: str(prod.CFOP),
      unidade: str(prod.uCom),
      quantidade: num(prod.qCom),
      valorUnitario: num(prod.vUnCom),
      valorTotal: num(prod.vProd),
      bcIcms: num(icmsGrupo.vBC),
      vIcms: num(icmsGrupo.vICMS),
      pIcms: num(icmsGrupo.pICMS),
      vIpi: num(ipi.vIPI),
      pIpi: num(ipi.pIPI),
      aliqIcms: num(icmsGrupo.pICMS),
      origem: str(icmsGrupo.orig),
      cst: str(icmsGrupo.CST || icmsGrupo.CSOSN),
    };
  });

  // Totais
  const totais = {
    bcIcms: num(total.vBC),
    vIcms: num(total.vICMS),
    bcIcmsSt: num(total.vBCST),
    vIcmsSt: num(total.vST),
    vProd: num(total.vProd),
    vFrete: num(total.vFrete),
    vSeg: num(total.vSeg),
    vDesc: num(total.vDesc),
    vOutro: num(total.vOutro),
    vIpi: num(total.vIPI),
    vIpiDevol: num(total.vIPIDevol),
    vNf: num(total.vNF),
    vTotTrib: num(total.vTotTrib),
    vFcp: num(total.vFCP),
    vFcpSt: num(total.vFCPST),
    vPis: num(total.vPIS),
    vCofins: num(total.vCOFINS),
  };

  // Transporte
  const transporta = transp.transporta || {};
  const veicTransp = transp.veicTransp || {};
  const vols = toArray(transp.vol);
  const volumes: DanfeVolume[] = vols.map((v: any) => ({
    quantidade: parseInt(str(v.qVol)) || 0,
    especie: str(v.esp),
    marca: str(v.marca),
    numeracao: str(v.nVol),
    pesoLiquido: num(v.pesoL),
    pesoBruto: num(v.pesoB),
  }));

  const transporte = {
    modalidade: MODALIDADE_FRETE[str(transp.modFrete)] || str(transp.modFrete),
    transportadorCnpj: str(transporta.CNPJ || transporta.CPF),
    transportadorNome: str(transporta.xNome),
    transportadorIe: str(transporta.IE),
    transportadorEndereco: str(transporta.xEnder),
    transportadorMunicipio: str(transporta.xMun),
    transportadorUf: str(transporta.UF),
    veiculoPlaca: str(veicTransp.placa),
    veiculoUf: str(veicTransp.UF),
    veiculoRntc: str(veicTransp.RNTC),
    volumes,
  };

  // Cobrança
  const fat = cobr.fat;
  const fatura = fat
    ? {
        numero: str(fat.nFat),
        valorOriginal: num(fat.vOrig),
        valorDesconto: num(fat.vDesc),
        valorLiquido: num(fat.vLiq),
      }
    : null;

  const dups = toArray(cobr.dup);
  const duplicatas: DanfeDuplicata[] = dups.map((d: any) => ({
    numero: str(d.nDup),
    vencimento: formatDate(str(d.dVenc)),
    valor: num(d.vDup),
  }));

  // Pagamento
  const detPags = toArray(pag.detPag);
  const pagamentos: DanfePagamento[] = detPags.map((p: any) => ({
    forma: FORMA_PAGAMENTO[str(p.tPag)] || str(p.tPag),
    valor: num(p.vPag),
  }));

  // Data emissão/saída
  const dhEmi = str(ide.dhEmi || ide.dEmi);
  const dhSaiEnt = str(ide.dhSaiEnt || ide.dSaiEnt);

  return {
    chaveAcesso,
    numero: str(ide.nNF),
    serie: str(ide.serie || "1"),
    naturezaOperacao: str(ide.natOp),
    tipoOperacao: str(ide.tpNF) as "0" | "1",
    dataEmissao: formatDate(dhEmi),
    dataSaidaEntrada: formatDate(dhSaiEnt),
    horaSaidaEntrada: formatTime(dhSaiEnt),
    protocolo: str(protNFe?.nProt),
    dataProtocolo: protNFe?.dhRecbto ? `${formatDate(str(protNFe.dhRecbto))} ${formatTime(str(protNFe.dhRecbto))}` : "",
    emitente,
    destinatario,
    produtos,
    totais,
    transporte,
    fatura,
    duplicatas,
    pagamentos,
    infAdicionais: str(infCpl),
    infFisco: str(infAdFisco),
  };
}
