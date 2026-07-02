import { createFileRoute, Link } from "@tanstack/react-router";
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

const PLANS: { id: string; name: string; price: number; period: string; icon: LucideIcon; color: string; popular?: boolean; features: string[] }[] = [
  {
    id: "starter",
    name: "Starter",
    price: 4.12,
    period: "7 dias",
    icon: Sparkles,
    color: "#2a8fc4",
    features: [
      "7 dias de acesso",
      "15 buscas por dia",
      "Até 250 resultados",
      "Acesso a todas as fontes",
      "Suporte prioritário",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: 8.20,
    period: "15 dias",
    icon: Star,
    color: "#2a8fc4",
    features: [
      "15 dias de acesso",
      "50 buscas por dia",
      "Até 500 resultados",
      "Acesso a todas as fontes",
      "Suporte prioritário",
    ],
  },
  {
    id: "vip",
    name: "VIP",
    price: 13.70,
    period: "30 dias",
    icon: Crown,
    color: "#2a8fc4",
    popular: true,
    features: [
      "30 dias de acesso",
      "200 buscas por dia",
      "Até 1.000 resultados",
      "Acesso a todas as fontes",
      "Suporte prioritário",
    ],
  },
  {
    id: "economic",
    name: "Economic",
    price: 5.45,
    period: "1 dia",
    icon: Zap,
    color: "#2a8fc4",
    features: [
      "1 dia de acesso",
      "50 buscas por dia",
      "Até 300 resultados",
      "Acesso a todas as fontes",
      "Suporte prioritário",
    ],
  },
  {
    id: "advanced",
    name: "Advanced",
    price: 10.95,
    period: "7 dias",
    icon: Rocket,
    color: "#2a8fc4",
    features: [
      "7 dias de acesso",
      "100 buscas por dia",
      "Até 800 resultados",
      "Acesso a todas as fontes",
      "Suporte prioritário",
    ],
  },
  {
    id: "ultra15",
    name: "Ultra 15D",
    price: 19.20,
    period: "15 dias",
    icon: Shield,
    color: "#2a8fc4",
    features: [
      "15 dias de acesso",
      "500 buscas por dia",
      "Até 5.000 resultados",
      "Acesso a todas as fontes",
      "Suporte VIP",
    ],
  },
  {
    id: "ultra30",
    name: "Ultra 30D",
    price: 19.20,
    period: "30 dias",
    icon: Shield,
    color: "#2a8fc4",
    features: [
      "30 dias de acesso",
      "500 buscas por dia",
      "Até 5.000 resultados",
      "Acesso a todas as fontes",
      "Suporte VIP",
    ],
  },
  {
    id: "elite15",
    name: "Elite 15D",
    price: 45.00,
    period: "15 dias",
    icon: Gem,
    color: "#2a8fc4",
    features: [
      "15 dias de acesso",
      "Buscas ilimitadas",
      "Até 50.000 resultados",
      "Acesso a todas as fontes",
      "Suporte VIP exclusivo",
    ],
  },
  {
    id: "elite",
    name: "Elite",
    price: 82.50,
    period: "Vitalício",
    icon: Gem,
    color: "#2a8fc4",
    features: [
      "Acesso vitalício",
      "Buscas ilimitadas",
      "Até 50.000 resultados",
      "Acesso a todas as fontes",
      "Suporte VIP exclusivo",
    ],
  },
];

function PlansPage() {
  const [going, setGoing] = useState<string | null>(null);

  async function choose(planId: string) {
    setGoing(planId);
    window.open("https://t.me/controletotal", "_blank", "noopener,noreferrer");
    setGoing(null);
  }

  return (
    <div className="min-h-screen bg-transparent text-foreground">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/3 h-[420px] w-[420px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-1/3 -right-32 h-[380px] w-[380px] rounded-full bg-primary-glow/15 blur-[120px]" />
      </div>
      <header className="border-b border-border bg-card/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <NoxLogo className="h-14 w-auto" />
            <span className="text-lg font-semibold">NoxIntel</span>
          </Link>
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Painel
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Escolha seu plano</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Acesso completo a todas as ferramentas OSINT. Pagamento via <span className="font-semibold text-foreground">Pix</span>.
            Após a confirmação, chame no Telegram para ativar.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.id}
                className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 ${
                  p.popular
                    ? "border-primary bg-card/80 shadow-[0_0_30px_-8px_rgba(42,143,196,0.3)]"
                    : "border-border bg-card/40 hover:border-primary/30"
                }`}
              >
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-primary px-4 py-1 text-xs font-semibold text-primary-foreground shadow-glow">
                    Mais popular
                  </span>
                )}

                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{
                      background: `${p.color}20`,
                      color: p.color,
                    }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold">{p.name}</h3>
                </div>

                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-3xl font-bold">R$ {p.price.toFixed(2).replace(".", ",")}</span>
                  <span className="text-sm text-muted-foreground">/{p.period.toLowerCase()}</span>
                </div>

                <ul className="mt-5 flex-1 space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => choose(p.id)}
                  disabled={going === p.id}
                  className={`mt-6 inline-flex items-center justify-center gap-2 rounded-full h-10 px-6 text-sm font-semibold transition-all duration-200 disabled:opacity-50 ${
                    p.popular
                      ? "text-white border-0 hover:opacity-90"
                      : "border border-border bg-card/60 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5"
                  }`}
                  style={p.popular ? {
                    background: "linear-gradient(180deg, #2a8fc4 49.18%, #5ab8e0 113.93%)",
                    boxShadow: "0 0 4px 0 rgba(255, 255, 255, 0.07), 0 -2px 0 0 rgba(0, 0, 0, 0.20) inset, 0 1px 0 0 rgba(255, 255, 255, 0.40) inset",
                  } : undefined}
                >
                  {going === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Falar no Telegram"}
                </button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
