import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, ArrowLeft, Loader2, Crown, Zap, Sparkles, Shield, Rocket, Star, Gem } from "lucide-react";
import { useState } from "react";
import { NoxLogo } from "@/components/NoxLogo";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos — NoxIntel" },
      { name: "description", content: "Planos OSINT: Starter, Premium, VIP, Economic, Advanced, Ultra e Elite. Pagamento via Pix." },
      { property: "og:title", content: "Planos — NoxIntel" },
      { property: "og:description", content: "Acesso completo a ferramentas OSINT com pagamento via Pix." },
    ],
  }),
  component: PlansPage,
});

import type { LucideIcon } from "lucide-react";

const PLANS: { id: string; name: string; price: number; period: string; icon: LucideIcon; color: string; popular?: boolean; features: string[]; desc: string }[] = [
  { id: "economic", name: "Economic", price: 5.45, period: "1 dia", icon: Zap, color: "#5ab8e0", desc: "Para testes rápidos", features: ["1 dia de acesso", "50 buscas por dia", "Até 300 resultados", "Acesso a todas as fontes", "Suporte prioritário"] },
  { id: "starter", name: "Starter", price: 4.12, period: "7 dias", icon: Sparkles, color: "#5ab8e0", desc: "Comece suas investigações", features: ["7 dias de acesso", "15 buscas por dia", "Até 250 resultados", "Acesso a todas as fontes", "Suporte prioritário"] },
  { id: "premium", name: "Premium", price: 8.20, period: "15 dias", icon: Star, color: "#5ab8e0", desc: "O equilíbrio perfeito", features: ["15 dias de acesso", "50 buscas por dia", "Até 500 resultados", "Acesso a todas as fontes", "Suporte prioritário"] },
  { id: "advanced", name: "Advanced", price: 10.95, period: "7 dias", icon: Rocket, color: "#5ab8e0", desc: "Para uso intenso", features: ["7 dias de acesso", "100 buscas por dia", "Até 800 resultados", "Acesso a todas as fontes", "Suporte prioritário"] },
  { id: "vip", name: "VIP", price: 13.70, period: "30 dias", icon: Crown, color: "#fbbf24", popular: true, desc: "A escolha da maioria", features: ["30 dias de acesso", "200 buscas por dia", "Até 1.000 resultados", "Acesso a todas as fontes", "Suporte prioritário"] },
  { id: "ultra15", name: "Ultra 15D", price: 19.20, period: "15 dias", icon: Shield, color: "#5ab8e0", desc: "Alto volume de buscas", features: ["15 dias de acesso", "500 buscas por dia", "Até 5.000 resultados", "Acesso a todas as fontes", "Suporte VIP"] },
  { id: "ultra30", name: "Ultra 30D", price: 29.90, period: "30 dias", icon: Shield, color: "#5ab8e0", desc: "Alto volume de buscas", features: ["30 dias de acesso", "500 buscas por dia", "Até 5.000 resultados", "Acesso a todas as fontes", "Suporte VIP"] },
  { id: "elite15", name: "Elite 15D", price: 45.00, period: "15 dias", icon: Gem, color: "#5ab8e0", desc: "O máximo em performance", features: ["15 dias de acesso", "Buscas ilimitadas", "Até 50.000 resultados", "Acesso a todas as fontes", "Suporte VIP exclusivo"] },
  { id: "elite", name: "Elite", price: 82.50, period: "Vitalício", icon: Gem, color: "#5ab8e0", desc: "Para profissionais sérios", features: ["Acesso vitalício", "Buscas ilimitadas", "Até 50.000 resultados", "Acesso a todas as fontes", "Suporte VIP exclusivo"] },
];

const GROUPED = [
  { label: "Entrada", plans: PLANS.filter(p => ["economic","starter","premium","advanced"].includes(p.id)) },
  { label: "Destaque", plans: PLANS.filter(p => p.popular) },
  { label: "Avançado", plans: PLANS.filter(p => ["ultra15","ultra30","elite15","elite"].includes(p.id)) },
];

function PlansPage() {
  const navigate = useNavigate();
  const [going, setGoing] = useState<string | null>(null);

  function choose(planId: string) {
    setGoing(planId);
    navigate({ to: "/comprar/$planId", params: { planId } });
  }

  return (
    <div className="min-h-screen bg-[#080b0f] text-white">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-48 left-1/3 h-[800px] w-[800px] rounded-full blur-[250px]" style={{ background: "rgba(42,143,196,0.06)" }} />
        <div className="absolute -bottom-48 right-1/4 h-[600px] w-[600px] rounded-full blur-[200px]" style={{ background: "rgba(90,184,224,0.04)" }} />
      </div>

      <header className="relative border-b border-white/[0.06] bg-[#0a0e12]/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <Link to="/" className="group flex items-center gap-2.5">
            <div className="transition duration-300 group-hover:scale-105">
              <NoxLogo className="h-8 w-auto sm:h-12" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold tracking-[0.15em] text-white">NOXINTEL</span>
              <span className="text-[7px] font-medium uppercase tracking-[0.15em] text-white/30">OSINT Suite</span>
            </div>
          </Link>
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-white/40 transition-all hover:border-white/[0.12] hover:text-white/70">
            <ArrowLeft className="h-3 w-3" /> Painel
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-12 sm:pt-20 pb-8 sm:pb-12 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-white/40 mb-5">
            <Sparkles className="h-3 w-3" style={{ color: "#5ab8e0" }} /> Preços transparentes
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.1]">
            Invista no seu<br />
            <span className="bg-gradient-to-r from-[#2a8fc4] to-[#5ab8e0] bg-clip-text text-transparent">crescimento profissional</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm sm:text-base text-white/40 leading-relaxed">
            Acesso completo a todas as ferramentas OSINT. Pagamento via Pix.
          </p>
        </div>
      </section>

      <main className="relative mx-auto max-w-6xl px-4 sm:px-6 pb-16 sm:pb-24">
        {GROUPED.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? "mt-10 sm:mt-16" : ""}>
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1 bg-white/[0.04]" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">{group.label}</span>
              <div className="h-px flex-1 bg-white/[0.04]" />
            </div>

            <div className={`grid gap-4 ${group.label === "Destaque" ? "sm:grid-cols-1 lg:grid-cols-1 max-w-lg mx-auto" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
              {group.plans.map((p) => {
                const Icon = p.icon;
                return (
                  <div
                    key={p.id}
                    className={`group relative flex flex-col rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 ${
                      p.popular
                        ? "border-[#fbbf24]/30 bg-gradient-to-b from-[#fbbf24]/[0.06] to-transparent"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
                    }`}
                  >
                    <div className={`absolute inset-x-0 top-0 h-1 rounded-t-2xl transition-opacity duration-300 ${p.popular ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                      style={{ background: p.popular ? "linear-gradient(90deg, #f59e0b, #fbbf24)" : "linear-gradient(90deg, #2a8fc4, #5ab8e0)" }}
                    />

                    {p.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-[0.15em] text-white shadow-lg"
                        style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)" }}
                      >
                        <Crown className="h-2.5 w-2.5" /> Mais escolhido
                      </span>
                    )}

                    <div className="flex flex-col p-5 sm:p-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${p.color}15` }}>
                          <Icon className="h-5 w-5" style={{ color: p.color }} />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-white">{p.name}</h3>
                          <p className="text-[10px] text-white/30">{p.desc}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-baseline gap-1">
                        <span className="text-3xl font-bold tracking-tight text-white">R$ {p.price.toFixed(2).replace(".", ",")}</span>
                        {p.period !== "Vitalício" && <span className="text-xs text-white/30">/{p.period.toLowerCase()}</span>}
                      </div>

                      <ul className="mt-4 flex-1 space-y-2">
                        {p.features.map((f) => (
                          <li key={f} className="flex items-start gap-2">
                            <Check className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: p.popular ? "#fbbf24" : "#5ab8e0" }} />
                            <span className="text-sm text-white/60">{f}</span>
                          </li>
                        ))}
                      </ul>

                      <button
                        onClick={() => choose(p.id)}
                        disabled={going === p.id}
                        className="relative mt-5 inline-flex items-center justify-center gap-2 rounded-xl h-11 px-5 text-xs font-bold uppercase tracking-wider text-white transition-all duration-300 active:scale-[0.97] disabled:opacity-50 overflow-hidden group/btn"
                        style={{
                          background: p.popular
                            ? "linear-gradient(135deg, #f59e0b, #fbbf24)"
                            : "linear-gradient(135deg, #2a8fc4, #5ab8e0)",
                          boxShadow: p.popular
                            ? "0 4px 16px -4px rgba(251,191,36,0.3)"
                            : "0 4px 16px -4px rgba(42,143,196,0.3)",
                        }}
                      >
                        <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full" />
                        <span className="relative flex items-center gap-2">
                          {going === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Quero este plano"}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mt-12 sm:mt-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
            <Shield className="h-4 w-4" style={{ color: "#5ab8e0" }} />
            <p className="text-xs text-white/40">
              Pagamento seguro via <span className="font-semibold text-white/70">Pix</span>
              <span className="mx-2 text-white/20">|</span>
              Ativação automática após confirmação
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
