"use client";
import { signOut } from "next-auth/react";

export default function AguardandoAprovacaoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--bg)" }}>
      <div className="text-center max-w-md">
        <img src="/logo.png" alt="MAGNALOG" className="h-14 w-auto object-contain mx-auto mb-6" />
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6"
          style={{ background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.3)" }}>
          ⏳
        </div>
        <h1 className="font-head text-2xl font-bold mb-3">Acesso Pendente</h1>
        <p className="text-sm mb-8" style={{ color: "var(--text2)" }}>
          Seu acesso ao sistema está aguardando aprovação de um administrador.<br />
          Você será notificado assim que o acesso for liberado.
        </p>
        <button onClick={() => signOut({ callbackUrl: "/login" })}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
          style={{ background: "var(--surface)", border: "1px solid var(--border2)", color: "var(--text2)" }}>
          Voltar ao Login
        </button>
      </div>
    </div>
  );
}
