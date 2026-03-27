"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { Topbar } from "@/components/layout/Topbar";
import { Card, Button, Input, Select } from "@/components/ui";
import toast from "react-hot-toast";
import { Settings, User, Shield, Bell, Globe, Palette, Save } from "lucide-react";

export default function ConfiguracoesPage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [senhaForm, setSenhaForm] = useState({ atual: "", nova: "", confirmar: "" });
  const [saving, setSaving] = useState(false);

  async function handleSenha() {
    if (!senhaForm.nova || senhaForm.nova.length < 6) {
      toast.error("Nova senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (senhaForm.nova !== senhaForm.confirmar) {
      toast.error("As senhas não coincidem");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/usuarios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user?.id, password: senhaForm.nova }),
      });
      if (!res.ok) throw new Error();
      toast.success("Senha alterada com sucesso");
      setSenhaForm({ atual: "", nova: "", confirmar: "" });
    } catch {
      toast.error("Erro ao alterar senha");
    } finally {
      setSaving(false);
    }
  }

  const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
    <Card>
      <div className="flex items-center gap-3 mb-5" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "14px" }}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(249,115,22,.1)", border: "1px solid rgba(249,115,22,.2)" }}
        >
          <Icon size={15} style={{ color: "var(--accent)" }} />
        </div>
        <h2 className="font-head text-sm font-bold">{title}</h2>
      </div>
      {children}
    </Card>
  );

  return (
    <>
      <Topbar title="Configurações" subtitle="Preferências do sistema" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl space-y-5">
          {/* Perfil */}
          <Section icon={User} title="Perfil do Usuário">
            <div className="flex items-center gap-4 mb-5">
              {user?.image ? (
                <img src={user.image} alt="" className="w-14 h-14 rounded-full" />
              ) : (
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black text-white"
                  style={{ background: "linear-gradient(135deg, var(--accent), #8b5cf6)" }}
                >
                  {(user?.name || "?")[0].toUpperCase()}
                </div>
              )}
              <div>
                <div className="font-semibold text-sm">{user?.name}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                  {user?.email}
                </div>
                <div className="mt-1">
                  <span className={`badge badge-${user?.role}`}>{user?.role}</span>
                </div>
              </div>
            </div>
            <p className="text-xs" style={{ color: "var(--text3)" }}>
              Para alterar nome ou email, contate o administrador do sistema.
            </p>
          </Section>

          {/* Segurança */}
          <Section icon={Shield} title="Segurança">
            <div className="space-y-4">
              <Input
                label="Senha Atual"
                type="password"
                value={senhaForm.atual}
                onChange={(e) => setSenhaForm((f) => ({ ...f, atual: e.target.value }))}
                placeholder="••••••••"
              />
              <Input
                label="Nova Senha"
                type="password"
                value={senhaForm.nova}
                onChange={(e) => setSenhaForm((f) => ({ ...f, nova: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
              />
              <Input
                label="Confirmar Nova Senha"
                type="password"
                value={senhaForm.confirmar}
                onChange={(e) => setSenhaForm((f) => ({ ...f, confirmar: e.target.value }))}
                placeholder="Repita a nova senha"
              />
              <Button onClick={handleSenha} loading={saving} size="sm">
                <Save size={14} /> Alterar Senha
              </Button>
            </div>
          </Section>

          {/* Notificações */}
          <Section icon={Bell} title="Notificações">
            <div className="space-y-3">
              {[
                { label: "Alertar sobre entregas atrasadas", desc: "Notificação quando prazo vencer", checked: true },
                { label: "Alertar sobre ocorrências abertas", desc: "Notificação de novas ocorrências", checked: true },
                { label: "Resumo diário", desc: "Email com resumo das entregas do dia", checked: false },
              ].map((item) => (
                <label
                  key={item.label}
                  className="flex items-start gap-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    defaultChecked={item.checked}
                    className="mt-0.5 accent-orange-500 w-4 h-4"
                  />
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>
                      {item.desc}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </Section>

          {/* Sistema */}
          <Section icon={Settings} title="Sistema">
            <div className="grid grid-cols-2 gap-4">
              <Select label="Itens por página padrão">
                <option value="25">25 itens</option>
                <option value="50" selected>50 itens</option>
                <option value="100">100 itens</option>
              </Select>
              <Select label="Fuso horário">
                <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                <option value="America/Manaus">Manaus (GMT-4)</option>
                <option value="America/Belem">Belém (GMT-3)</option>
              </Select>
              <Select label="Formato de data">
                <option value="dd/MM/yyyy">DD/MM/AAAA</option>
                <option value="MM/dd/yyyy">MM/DD/AAAA</option>
              </Select>
              <Select label="Moeda">
                <option value="BRL">Real Brasileiro (R$)</option>
              </Select>
            </div>
            <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
              <p className="text-[10px] font-mono" style={{ color: "var(--text3)" }}>
                MagnaLog TMS v1.0 · Next.js 14 · PostgreSQL · Prisma ORM
              </p>
            </div>
          </Section>

          {/* Info do sistema */}
          <Section icon={Globe} title="Rastreamento Público">
            <div className="p-3 rounded-xl" style={{ background: "var(--surface2)" }}>
              <p className="text-sm mb-2" style={{ color: "var(--text2)" }}>
                Compartilhe o link abaixo com clientes para rastrear entregas sem login:
              </p>
              <div className="flex items-center gap-2">
                <code
                  className="flex-1 text-xs font-mono px-3 py-2 rounded-lg"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--accent)" }}
                >
                  {typeof window !== "undefined" ? window.location.origin : "https://seu-dominio.com"}/entrega/[ID_DA_ENTREGA]
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const base = window.location.origin;
                    navigator.clipboard.writeText(`${base}/entrega/`);
                    toast.success("Base URL copiada!");
                  }}
                >
                  Copiar
                </Button>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}
