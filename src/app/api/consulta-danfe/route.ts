import { NextRequest, NextResponse } from "next/server";

const API_BASE = "https://api.meudanfe.com.br/v2";
const MAX_POLLS = 15;
const POLL_INTERVAL_MS = 1500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
        { error: "API Key não configurada. Adicione DANFE_API_KEY nas variáveis de ambiente." },
        { status: 500 }
      );
    }

    // Step 1: Request search via PUT /fd/add/{chave}
    const addRes = await fetch(`${API_BASE}/fd/add/${chave}`, {
      method: "PUT",
      headers: { "Api-Key": apiKey, "Content-Length": "0" },
    });

    if (addRes.status === 401) {
      return NextResponse.json({ error: "API Key inválida." }, { status: 401 });
    }
    if (addRes.status === 402) {
      return NextResponse.json({ error: "Saldo insuficiente na conta Meu Danfe." }, { status: 402 });
    }
    if (addRes.status === 403) {
      return NextResponse.json({ error: "API Key foi substituída. Gere uma nova na Área do Cliente." }, { status: 403 });
    }
    if (addRes.status === 400) {
      return NextResponse.json({ error: "Chave de acesso inválida." }, { status: 400 });
    }
    if (!addRes.ok) {
      return NextResponse.json({ error: "Erro ao consultar NF-e. Tente novamente." }, { status: 502 });
    }

    let addData = await addRes.json();

    // Step 2: Poll until status is OK (or fail)
    let polls = 0;
    while (
      (addData.status === "WAITING" || addData.status === "SEARCHING") &&
      polls < MAX_POLLS
    ) {
      await sleep(POLL_INTERVAL_MS);
      const pollRes = await fetch(`${API_BASE}/fd/add/${chave}`, {
        method: "PUT",
        headers: { "Api-Key": apiKey, "Content-Length": "0" },
      });
      if (!pollRes.ok) break;
      addData = await pollRes.json();
      polls++;
    }

    if (addData.status === "NOT_FOUND") {
      return NextResponse.json(
        { error: "NF-e não encontrada. Verifique a chave de acesso." },
        { status: 404 }
      );
    }

    if (addData.status === "ERROR") {
      return NextResponse.json(
        { error: addData.statusMessage || "Erro ao consultar NF-e na Receita Federal." },
        { status: 422 }
      );
    }

    if (addData.status !== "OK") {
      return NextResponse.json(
        { error: "Consulta expirou. Tente novamente em alguns instantes." },
        { status: 504 }
      );
    }

    // Step 3: Download XML via GET /fd/get/xml/{chave}
    const xmlRes = await fetch(`${API_BASE}/fd/get/xml/${chave}`, {
      method: "GET",
      headers: { "Api-Key": apiKey },
    });

    if (!xmlRes.ok) {
      return NextResponse.json(
        { error: "Erro ao baixar o XML da NF-e." },
        { status: 502 }
      );
    }

    const xmlData = await xmlRes.json();

    if (!xmlData.data) {
      return NextResponse.json(
        { error: "XML não disponível para esta NF-e." },
        { status: 422 }
      );
    }

    return NextResponse.json({ xml: xmlData.data });
  } catch (e: any) {
    console.error("Erro consulta DANFE:", e);
    return NextResponse.json(
      { error: "Erro interno ao consultar NF-e." },
      { status: 500 }
    );
  }
}
