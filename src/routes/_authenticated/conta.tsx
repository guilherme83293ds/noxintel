import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getMyAccount, listMyPayments } from "@/lib/billing.functions";
import { NoxLogo } from "@/components/NoxLogo";
import { ArrowLeft, Loader2, Shield, CreditCard, Key, Bell, Sparkles, ChevronRight, Copy, CheckCircle2, Eye, EyeOff, Search, Database, Clock, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/conta")({
  component: AccountPage,
});

function AccountPage() {
  const fetchAccount = useServerFn(getMyAccount);
  const fetchMine = useServerFn(listMyPayments);
  const { data: acc, isLoading } = useQuery({ queryKey: ["account"], queryFn: () => fetchAccount({}) });
  const { data: payments } = useQuery({ queryKey: ["my-payments"], queryFn: () => fetchMine({}) });
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);

  const plan = (acc?.subscription as any)?.plans;
  const isPremium = plan?.id && plan.id !== 'economic';
  const daysLeft = acc?.subscription
    ? Math.ceil((new Date(acc.subscription.expires_at).getTime() - Date.now()) / 86400000)
    : 0;

  return (
    <div className="min-h-screen bg-[#060a14] text-white">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-48 left-1/3 h-[600px] w-[600px] rounded-full blur-[200px]" style={{ background: "rgba(42,143,196,0.08)" }} />
        <div className="absolute -bottom-48 right-1/4 h-[500px] w-[500px] rounded-full blur-[180px]" style={{ background: "rgba(90,184,224,0.06)" }} />
      </div>

      <header className="relative border-b border-[#2a8fc4]/8 bg-[#060a14]/80 backdrop-blur-3xl" style={{ boxShadow: "0 1px 0 rgba(42,143,196,0.08)" }}>
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <Link to="/" className="group flex items-center gap-2.5">
            <div className="transition duration-300 group-hover:scale-105">
              <NoxLogo className="h-8 w-auto sm:h-12" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold tracking-[0.15em] text-white">NOXINTEL</span>
              <span className="text-[7px] font-medium uppercase tracking-[0.15em] text-[#5ab8e0]/40">OSINT Suite</span>
            </div>
          </Link>
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a8fc4]/10 px-3 py-1.5 text-[11px] font-medium text-white/40 transition-all hover:border-[#2a8fc4]/25 hover:text-white/70 hover:bg-[#2a8fc4]/5">
            <ArrowLeft className="h-3 w-3" /> Painel
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-10">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#5ab8e0" }} />
          </div>
        ) : (
          <div className="space-y-5 sm:space-y-6">
            {/* Profile header */}
            <div className="relative overflow-hidden rounded-2xl border border-[#2a8fc4]/10 bg-[#2a8fc4]/3 p-5 sm:p-6" style={{ boxShadow: "inset 0 1px 0 rgba(42,143,196,0.08)" }}>
              <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full blur-3xl" style={{ background: "rgba(42,143,196,0.08)" }} />
              <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-lg"
                    style={{ background: "linear-gradient(135deg, #2a8fc4, #5ab8e0)" }}
                  >
                    {(acc?.profile?.full_name || acc?.profile?.email || "U").split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white sm:text-2xl">{acc?.profile?.full_name || "Usuário"}</h1>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-white/40">{acc?.profile?.email}</span>
                      <span className="text-white/20">•</span>
                      <span className="inline-flex items-center gap-1 rounded-md border border-[#2a8fc4]/10 px-2 py-0.5 text-[9px] font-medium text-[#5ab8e0]/50">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: isPremium ? "#5ab8e0" : "#fbbf24" }} />
                        {isPremium ? "Premium" : "Gratuito"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link to="/planos" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-semibold text-white transition-all duration-300 active:scale-[0.97]"
                    style={{ background: "linear-gradient(135deg, #2a8fc4, #5ab8e0)" }}
                  >
                    <Sparkles className="h-3 w-3" /> Ver planos
                  </Link>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { icon: Shield, label: "Plano", value: plan?.name || (acc?.subscription ? acc.subscription.plan_id : "Sem plano") },
                { icon: Search, label: "Buscas hoje", value: acc?.subscription ? `${acc.today.searches} / ${plan?.daily_search_limit}` : "—" },
                { icon: Database, label: "Resultados/mês", value: acc?.subscription ? `${acc.monthResults} / ${plan?.monthly_result_limit}` : "—" },
                { icon: Clock, label: "Expira em", value: acc?.subscription ? `${daysLeft > 0 ? `${daysLeft}d` : "hoje"}` : "—" },
              ].map((stat) => (
                <div key={stat.label} className="relative overflow-hidden rounded-xl border border-[#2a8fc4]/10 bg-[#2a8fc4]/3 p-3 sm:p-4 transition-all duration-300 hover:border-[#2a8fc4]/20 hover:bg-[#2a8fc4]/6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: "rgba(90,184,224,0.1)" }}>
                      <stat.icon className="h-3 w-3" style={{ color: "#5ab8e0" }} />
                    </div>
                    <span className="text-[9px] font-medium uppercase tracking-wider text-white/30">{stat.label}</span>
                  </div>
                  <p className="text-sm font-semibold text-white/90 truncate">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Usage bar */}
            {acc?.subscription && (
              <div className="rounded-xl border border-[#2a8fc4]/10 bg-[#2a8fc4]/3 p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-medium text-white/40">Uso diário</span>
                  <span className="text-[10px] font-medium text-white/40">{acc.today.searches} / {plan?.daily_search_limit}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#2a8fc4]/8">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min((acc.today.searches / (plan?.daily_search_limit || 1)) * 100, 100)}%`,
                      background: "linear-gradient(90deg, #2a8fc4, #5ab8e0)",
                      boxShadow: "0 0 12px -2px rgba(42,143,196,0.3)",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Link to="/planos" className="group relative overflow-hidden rounded-xl border border-[#2a8fc4]/10 bg-[#2a8fc4]/3 p-4 transition-all duration-300 hover:border-[#2a8fc4]/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "rgba(90,184,224,0.1)" }}>
                      <CreditCard className="h-4 w-4" style={{ color: "#5ab8e0" }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/80">Planos & Preços</p>
                      <p className="text-[10px] text-[#5ab8e0]/40">Ver opções disponíveis</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#5ab8e0]/30 transition-transform duration-300 group-hover:translate-x-0.5" />
                </div>
              </Link>
              <div className="relative overflow-hidden rounded-xl border border-[#2a8fc4]/10 bg-[#2a8fc4]/3 p-4 transition-all duration-300 hover:border-[#2a8fc4]/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "rgba(90,184,224,0.1)" }}>
                      <Bell className="h-4 w-4" style={{ color: "#5ab8e0" }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/80">Notificações</p>
                      <p className="text-[10px] text-[#5ab8e0]/40">Alertas de vazamento</p>
                    </div>
                  </div>
                  <div className="relative flex h-5 w-9 cursor-pointer items-center rounded-full bg-[#2a8fc4]/30 transition-colors">
                    <div className="h-3.5 w-3.5 translate-x-1 rounded-full bg-white shadow transition-transform" />
                  </div>
                </div>
              </div>
            </div>

            {/* Token */}
            <div className="relative overflow-hidden rounded-xl border border-[#2a8fc4]/10 bg-[#2a8fc4]/3 p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: "rgba(90,184,224,0.15)" }}>
                  <Key className="h-3 w-3" style={{ color: "#5ab8e0" }} />
                </div>
                <span className="text-sm font-semibold text-white/80">Token de acesso</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-[#2a8fc4]/10 bg-[#2a8fc4]/5 p-3">
                <code className="flex-1 truncate font-mono text-xs text-white/60 select-none">
                  {showToken ? "nox_intel_sk_••••••••••••••••••••••••••••••••••••••••••" : "nox_intel_sk_••••••••••••••••••••••••••••••••••••••••••"}
                </code>
                <div className="flex gap-1">
                  <button onClick={() => setShowToken(!showToken)} className="rounded-lg p-1.5 text-white/30 transition hover:bg-[#2a8fc4]/8 hover:text-white/60">
                    {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => { navigator.clipboard.writeText("nox_intel_sk_example"); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="rounded-lg p-1.5 text-white/30 transition hover:bg-[#2a8fc4]/8 hover:text-white/60">
                    {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <p className="mt-2 text-[9px] text-[#5ab8e0]/30">Use este token para autenticar requisições à API.</p>
            </div>

            {/* Payments */}
            <div className="relative overflow-hidden rounded-xl border border-[#2a8fc4]/10 bg-[#2a8fc4]/3 p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: "rgba(90,184,224,0.15)" }}>
                  <CreditCard className="h-3 w-3" style={{ color: "#5ab8e0" }} />
                </div>
                <span className="text-sm font-semibold text-white/80">Histórico de pagamentos</span>
              </div>
              <div className="divide-y divide-[#2a8fc4]/8">
                {(payments ?? []).length === 0 && (
                  <p className="py-6 text-center text-sm text-white/30">Nenhum pagamento encontrado.</p>
                )}
                {(payments ?? []).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white/80 truncate">{p.plans?.name || p.plan_id}</span>
                        <span className="text-sm font-semibold text-white/90">R$ {Number(p.amount_brl).toFixed(2)}</span>
                      </div>
                      <p className="text-[10px] text-white/25 truncate mt-0.5">
                        {new Date(p.created_at).toLocaleString("pt-BR")} • txid: {p.pix_txid}
                      </p>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            </div>

            {/* Admin link */}
            {acc?.isAdmin ? (
              <div className="text-center pt-2">
                <Link to="/admin" className="group inline-flex items-center gap-2 rounded-lg border border-[#2a8fc4]/10 px-5 py-2.5 text-[11px] font-medium text-white/40 transition-all hover:border-[#2a8fc4]/25 hover:text-white/70 hover:bg-[#2a8fc4]/5">
                  Painel administrativo <ChevronRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </div>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { cls: string; label: string }> = {
    pending: { cls: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "Aguardando" },
    paid: { cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Aprovado" },
    rejected: { cls: "bg-red-500/10 text-red-400 border-red-500/20", label: "Rejeitado" },
    expired: { cls: "bg-[#2a8fc4]/8 text-[#5ab8e0]/40 border-[#2a8fc4]/10", label: "Expirado" },
  };
  const c = config[status] || { cls: "bg-[#2a8fc4]/8 text-[#5ab8e0]/40 border-[#2a8fc4]/10", label: status };
  return <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${c.cls}`}>{c.label}</span>;
}
