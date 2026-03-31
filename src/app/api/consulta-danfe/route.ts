import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { chave } = await req.json();

    if (!chave || !/^\d{44}$/.test(chave)) {
      return NextResponse.json(
        { error: "Chave de acesso deve conter exatamente 44 dígitos numéricos." },
        { status: 400 }
      );
    }

    const apiKey = process.env.DANFE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key do serviço DANFE não configurada. Adicione DANFE_API_KEY nas variáveis de ambiente." },
        { status: 500 }
      );
    }

    // Call danfe.br.com API
    const apiUrl = `https://danfe.br.com/api/nfe/danfe.json?apikey=${apiKey}&chave=${chave}`;
    const apiRes = await fetch(apiUrl, { next: { revalidate: 0 } });
    const data = await apiRes.json();

    if (!data.status) {
      const errorMap: Record<string, string> = {
        ERRO_APIKEY_INVALIDA: "API Key inválida.",
        ERRO_APIKEY_INEXISTENTE: "API Key não encontrada.",
        ERRO_API_ACESSO: "Acesso à API não liberado na conta.",
        ERRO_CHAVE_INVALIDA: "Chave de acesso inválida.",
        ERRO_RECEITA: "Erro ao consultar o portal da NF-e.",
        ERRO_RECEITA_OBTER_DADOS: "Portal da NF-e temporariamente indisponível.",
      };
      const msg = errorMap[data.error] || data.error || "Erro ao consultar NF-e.";
      return NextResponse.json({ error: msg }, { status: 422 });
    }

    // Fetch the XML content from the returned URL
    if (!data.xml) {
      return NextResponse.json(
        { error: "XML não disponível para esta NF-e." },
        { status: 422 }
      );
    }

    const xmlRes = await fetch(data.xml);
    if (!xmlRes.ok) {
      return NextResponse.json(
        { error: "Erro ao baixar o XML da NF-e." },
        { status: 502 }
      );
    }

    const xmlContent = await xmlRes.text();

    return NextResponse.json({ xml: xmlContent });
  } catch (e: any) {
    console.error("Erro consulta DANFE:", e);
    return NextResponse.json(
      { error: "Erro interno ao consultar NF-e." },
      { status: 500 }
    );
  }
}
