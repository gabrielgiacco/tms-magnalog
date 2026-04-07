import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { XMLParser } from "fast-xml-parser";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const nf = await prisma.notaFiscal.findUnique({
      where: { id: params.id },
      select: { id: true, numero: true, emitenteRazao: true, xmlOriginal: true },
    });

    if (!nf) return NextResponse.json({ error: "NF não encontrada" }, { status: 404 });
    if (!nf.xmlOriginal) return NextResponse.json({ produtos: [] });

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      parseAttributeValue: false,
      numberParseOptions: { hex: false, leadingZeros: false, skipLike: /.*/ },
    });
    const parsed = parser.parse(nf.xmlOriginal);
    const nfe = parsed?.nfeProc?.NFe || parsed?.NFe;
    const infNFe = nfe?.infNFe;
    if (!infNFe) return NextResponse.json({ produtos: [] });

    const detArray = Array.isArray(infNFe.det) ? infNFe.det : infNFe.det ? [infNFe.det] : [];
    const produtos = detArray.map((d: any) => {
      const p = d.prod || {};
      return {
        codigoProduto: String(p.cProd || ""),
        descricao: String(p.xProd || ""),
        ncm: String(p.NCM || ""),
        unidade: String(p.uCom || ""),
        quantidade: parseFloat(String(p.qCom || "0")) || 0,
        valorUnitario: parseFloat(String(p.vUnCom || "0")) || 0,
        valorTotal: parseFloat(String(p.vProd || "0")) || 0,
      };
    });

    return NextResponse.json({ produtos, nfNumero: nf.numero, fornecedor: nf.emitenteRazao });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
