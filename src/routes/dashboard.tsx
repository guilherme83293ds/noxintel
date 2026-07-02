import { createFileRoute, Link } from "@tanstack/react-router";
import { NoxLogo } from "@/components/NoxLogo";
import {
  Eye, Search, Mail, User, Phone, FileText, Settings, LogOut, Bell,
  ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Activity, TrendingUp, Shield, Clock, Filter, Download,
  Menu, X, Database, Sparkles, Zap, ArrowUpRight, Globe2,
  AlertTriangle, CheckCircle2, Loader2, Lock, EyeOff,
  CreditCard, Wallet, Link2, Share2, ShieldAlert, Network, Cloud, MapPin,
  UserSearch, Fingerprint, ArrowRight, LayoutGrid, Key, Copy,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyAccount, redeemLicenseKey } from "@/lib/billing.functions";
import { useEmailBreach } from "@/hooks/useEmailBreach";
import { usePwnedPassword } from "@/hooks/usePwnedPassword";
import { useTilt } from "@/hooks/use-tilt";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel — NoxIntel" },
      { name: "description", content: "Painel de controle NoxIntel: ferramentas OSINT, histórico e estatísticas." },
      { property: "og:title", content: "Painel — NoxIntel" },
      { property: "og:description", content: "Painel de controle NoxIntel." },
    ],
  }),
  component: Dashboard,
});

const TOOLS: { id: string; icon: typeof Mail; label: string; desc: string; sample: string; soon?: boolean; tag?: string }[] = [
  { id: "email", icon: Mail, label: "E-mail", desc: "Encontre perfis, contas e vazamentos associados a um endereço.", sample: "analista@exemplo.com" },
  { id: "phone", icon: Phone, label: "Telefone", desc: "Identifique titular, operadora e contas vinculadas ao número.", sample: "+55 11 98765-4321" },
  { id: "username", icon: User, label: "Usuário", desc: "Rastreie presença em 500+ plataformas com um único identificador.", sample: "@cyber_analista" },
  { id: "name", icon: UserSearch, label: "Nome", desc: "Investigação por nome. Rastreie a presença online em múltiplas plataformas.", sample: "João da Silva" },
  { id: "cpf", icon: CreditCard, label: "CPF / CNPJ", desc: "Dados cadastrais, quadro societário e registros públicos (BR).", sample: "123.456.789-00" },
  { id: "domain", icon: Globe2, label: "Domínio", desc: "Whois, DNS, tecnologias utilizadas e subdomínios expostos.", sample: "exemplo.com.br" },
  { id: "ip", icon: Network, label: "IP", desc: "Geolocalização, ISP, reputação e portas abertas do endereço.", sample: "200.150.10.42" },
  { id: "blockchain", icon: Wallet, label: "Blockchain", desc: "Rastreie carteiras de criptomoedas e transações.", sample: "0x742d35Cc6634C0532925a3b8" },
  { id: "link", icon: Link2, label: "Link / URL", desc: "Análise de links e URLs. Identifique conexões e relações online.", sample: "https://loja-suspeita.shop/promo" },
  { id: "social", icon: Share2, label: "Redes sociais", desc: "Cross-reference entre plataformas e análise de conexões.", sample: "@perfil_alvo" },
  { id: "breach", icon: ShieldAlert, label: "Vazamentos", desc: "Credenciais expostas em vazamentos e dumps conhecidos.", sample: "alvo@exemplo.com" },
  { id: "password", icon: Lock, label: "Senha", desc: "Descubra em quais vazamentos uma senha apareceu.", sample: "" },
  { id: "meta", icon: FileText, label: "Metadados", desc: "Extraia metadados de arquivos (EXIF, autor, GPS).", sample: "documento.pdf" },
];



const ACTIVITY = [
  { icon: Mail, t: "Busca por e-mail", v: "joao.silva@empresa.com", h: "há 4 min", status: "ok" },
  { icon: User, t: "Busca por usuário", v: "@reporter_xyz", h: "há 22 min", status: "alert" },
  { icon: Phone, t: "Busca por telefone", v: "+55 11 9••••-••99", h: "há 1 h", status: "ok" },
  { icon: Globe2, t: "Análise web", v: "loja-suspeita.shop", h: "há 3 h", status: "alert" },
  { icon: FileText, t: "Metadados", v: "relatorio_q2.pdf", h: "ontem", status: "ok" },
];

function Sparkline({ data, accent = false }: { data: number[]; accent?: boolean }) {
  if (data.length === 0) data = [0];
  const max = Math.max(...data);
  const min = Math.min(...data);
  const w = 100, h = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / Math.max(1, max - min)) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const area = `0,${h} ${pts} ${w},${h}`;
  const id = `sg-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-7 w-full">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity={accent ? 0.5 : 0.3} />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} className="text-primary" />
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary" />
    </svg>
  );
}

function StatCard({ s }: { s: { icon: any; label: string; value: string; limit?: number; trend: string; spark: number[]; accent?: boolean } }) {
  const tilt = useTilt(8);
  return (
    <div className="group relative w-[65vw] shrink-0 snap-center sm:w-auto">
      <div
        ref={tilt.ref}
        onMouseMove={tilt.onMouseMove}
        onMouseLeave={tilt.onMouseLeave}
        className="relative overflow-hidden rounded-xl border border-primary/30 p-4 text-white transition-all duration-200 sm:p-5"
        style={{
          background: "linear-gradient(#2a8fc4 49.18%, #5ab8e0 113.93%)",
          boxShadow: "0 8px 32px -8px rgba(0,0,0,0.6), 0 0 4px 0 rgba(255,255,255,0.07), 0 -2px 0 0 rgba(0,0,0,0.20) inset, 0 1px 0 0 rgba(255,255,255,0.40) inset",
        }}
      >
        <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        <div className="relative flex items-center justify-between">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-105"
            style={{ background: "rgba(255,255,255,0.1)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)" }}
          >
            <s.icon className="h-4.5 w-4.5 text-white" />
          </div>
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide"
            style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)" }}
          >
            <TrendingUp className="h-3 w-3" /> {s.trend}
          </span>
        </div>
        <p className="relative mt-3 text-2xl font-extrabold tracking-tight tabular-nums sm:mt-4 sm:text-3xl text-white">
          {s.value}{s.limit !== undefined ? <span className="text-sm font-medium text-white/60"> / {s.limit}</span> : null}
        </p>
        <p className="relative mt-0.5 text-[11px] font-medium text-white/60 sm:text-xs">{s.label}</p>
        {s.limit !== undefined ? (
          <div className="relative mt-3 h-1 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-white/40 transition-all duration-500"
              style={{ width: `${Math.min((Number(s.value) / s.limit) * 100, 100)}%` }}
            />
          </div>
        ) : null}
        <div className="relative mt-3 sm:mt-4">
          <Sparkline data={s.spark} accent={true} />
        </div>
        <div
          className="absolute bottom-0 left-0 h-[2px] w-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), rgba(255,255,255,0.2), transparent)",
          }}
        />
      </div>
    </div>
  );
}

function Dashboard() {
  const [activeTool, setActiveTool] = useState("email");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const tool = TOOLS.find(t => t.id === activeTool)!;
  const [query, setQuery] = useState(tool.sample);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const emailToCheck = activeTool === "email" ? query : "";
  const breach = useEmailBreach(emailToCheck);
  const pwn = usePwnedPassword(activeTool === "email" ? password : "");

  type Field = { label: string; value: string; mono?: boolean; warn?: boolean; ok?: boolean };
  type CredentialCard = { id: string; url: string; email: string; password: string; telefone?: string; source: string; stolenDate?: string; discoveredDate?: string };
  type Section = { title: string; icon?: string; collapsible?: boolean; fields?: Field[]; list?: string[]; links?: { label: string; url: string }[]; credentials?: CredentialCard[] };
  type OsintResult = { ok: boolean; tool: string; query: string; summary?: string; sections: Section[]; sources: string[]; error?: string };
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OsintResult | null>(null);
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [recentSearches, setRecentSearches] = useState<{ query: string; tool: string; date: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem("recentSearches") || "[]"); } catch { return []; }
  });
  const [showActivate, setShowActivate] = useState(false);
  const [licenseKey, setLicenseKey] = useState("");
  const [activating, setActivating] = useState(false);
  const [credPage, setCredPage] = useState(1);
  const [credPageSize, setCredPageSize] = useState(10);
  const [credFilter, setCredFilter] = useState<string | null>(null);
  const [activateError, setActivateError] = useState("");
  const [activateOk, setActivateOk] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchAccount = useServerFn(getMyAccount);
  const doRedeem = useServerFn(redeemLicenseKey);
  const { data: acc } = useQuery({ queryKey: ["account"], queryFn: () => fetchAccount({}), refetchInterval: 5000 });
  const qc = useQueryClient();

  const plan = (acc?.subscription as any)?.plans;
  const limits = { daily: plan?.daily_search_limit ?? 50, monthly: plan?.monthly_result_limit ?? 300 };
  const stats = [
    { icon: Search, label: "Buscas hoje", value: String(acc?.today?.searches ?? 0), limit: limits.daily, trend: "+0%", spark: acc?.sparklineSearches?.slice(-11) ?? [0], accent: true },
    { icon: Database, label: "Vazamentos encontrados", value: String(acc?.today?.results ?? 0), limit: undefined, trend: "+0%", spark: acc?.sparklineResults?.slice(-11) ?? [0] },
    { icon: Activity, label: "Consultas no mês", value: String(acc?.monthSearches ?? 0), limit: limits.monthly, trend: "+0%", spark: acc?.sparklineSearches ?? [0] },
    { icon: Shield, label: "Alertas ativos", value: "0", limit: undefined, trend: "—", spark: [0] },
  ];

  function cancelSearch() {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
  }

  useEffect(() => {
    return () => cancelSearch();
  }, []);

  async function runSearch() {
    if (!query.trim() || tool.soon) return;
    cancelSearch();
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setResult(null);
    setCredPage(1);
    setCredFilter(null);
    try {
      const { getAuthHeaders } = await import("@/lib/session");
      const headers = getAuthHeaders();
      if (!headers.authorization) {
        setResult({ ok: false, tool: activeTool, query, error: "Faça login para usar as ferramentas.", sections: [], sources: [] });
        setBusy(false);
        return;
      }
      const r = await fetch("/api/osint", {
        signal: controller.signal,
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify({ tool: activeTool, query: activeTool === "password" ? password || query : query }),
      });
      const data = await r.json() as OsintResult;
      if (!controller.signal.aborted) {
        setResult(data);
        const entry = { query: query.trim(), tool: activeTool, date: new Date().toISOString() };
        const updated = [entry, ...recentSearches.filter(s => s.query !== entry.query || s.tool !== entry.tool)].slice(0, 10);
        setRecentSearches(updated);
        localStorage.setItem("recentSearches", JSON.stringify(updated));
        qc.invalidateQueries({ queryKey: ["account"] });
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      if (!controller.signal.aborted) setResult({ ok: false, tool: activeTool, query, error: e instanceof Error ? e.message : "Erro de rede", sections: [], sources: [] });
    } finally {
      if (!controller.signal.aborted) setBusy(false);
      if (abortRef.current === controller) abortRef.current = null;
    }
  }


  function exportJson() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `osint-${activeTool}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="relative flex min-h-screen bg-transparent text-foreground dashboard-root">
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px #000 inset !important;
          box-shadow: 0 0 0 1000px #000 inset !important;
          -webkit-text-fill-color: oklch(0.708 0 0) !important;
          background-color: #000 !important;
          background: #000 !important;
          transition: background-color 5000s ease-in-out 0s;
        }

        @keyframes bubble-rise {
          0% { transform: translate3d(0, 100vh, var(--z)) scale(0.4); opacity: 0; }
          10% { opacity: var(--o); }
          90% { opacity: var(--o); }
          100% { transform: translate3d(var(--drift), -10vh, var(--z)) scale(1.1); opacity: 0; }
        }
        @keyframes bubble-wobble {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(15px) rotate(3deg); }
          75% { transform: translateX(-15px) rotate(-3deg); }
        }
        @keyframes bubble-pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        .bubble-3d {
          position: absolute;
          border-radius: 50%;
          bottom: -10vh;
          animation: bubble-rise var(--rise) ease-in-out infinite;
          animation-delay: var(--delay);
          width: var(--size);
          height: var(--size);
          background: radial-gradient(circle at 35% 25%, var(--highlight), var(--color) 60%, transparent 80%);
          box-shadow: inset 0 -4px 8px rgba(0,0,0,0.2), inset 0 4px 8px rgba(255,255,255,0.15), 0 0 var(--glow) var(--color), 0 0 calc(var(--glow) * 2) var(--color2);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .bubble-3d::after {
          content: '';
          position: absolute;
          top: 12%;
          left: 20%;
          width: 30%;
          height: 20%;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(255,255,255,0.35) 0%, transparent 70%);
          transform: rotate(-20deg);
        }
      `}</style>
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-black" style={{ perspective: "1200px", transformStyle: "preserve-3d" }}>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(42,143,196,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(42,143,196,0.06)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />
        {Array.from({ length: 20 }).map((_, i) => {
          const size = 30 + Math.random() * 80;
          const o1 = 0.1 + Math.random() * 0.2;
          const o2 = 0.05 + Math.random() * 0.1;
          return (
            <div
              key={i}
              className="bubble-3d"
              style={{
                left: `${Math.random() * 100}%`,
                "--rise": `${12 + Math.random() * 20}s`,
                "--delay": `-${Math.random() * 25}s`,
                "--size": `${size}px`,
                "--glow": `${8 + Math.random() * 20}px`,
                "--z": `${(Math.random() - 0.5) * 400}px`,
                "--o": `${0.15 + Math.random() * 0.35}`,
                "--drift": `${(Math.random() - 0.5) * 80}px`,
                "--color": `rgba(42,143,196,${o1})`,
                "--color2": `rgba(42,143,196,${o2})`,
                "--highlight": `rgba(255,255,255,${0.08 + Math.random() * 0.12})`,
              } as React.CSSProperties}
            />
          );
        })}
      </div>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card/60 backdrop-blur-xl transition-transform lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <Link to="/" className="group flex items-center gap-2.5">
            <div className="relative transition group-hover:scale-105">
              <NoxLogo className="h-14 w-auto" />
              <span className="absolute -right-1.5 -top-0.5 h-2 w-2 rounded-full bg-primary-glow shadow-glow" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold tracking-[0.2em]">NOXINTEL</span>
              <span className="mt-0.5 text-[9px] uppercase tracking-widest text-muted-foreground">OSINT Suite</span>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden" aria-label="Fechar menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Ferramentas OSINT</p>
          <div className="space-y-0.5">
            {TOOLS.map(t => {
              return (
                <button
                  key={t.id}
                  onClick={() => { if (t.soon) return; cancelSearch(); setActiveTool(t.id); setQuery(t.sample); setResult(null); setSidebarOpen(false); }}
                  className={`inline-flex w-full items-center gap-1.5 whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary hover:opacity-90 px-3 py-2 rounded-full text-white border-0 text-sm font-medium transition-all ${t.soon ? "opacity-50" : ""}`}
                  style={{ background: "linear-gradient(180deg, #2a8fc4 49.18%, #5ab8e0 113.93%)", boxShadow: "0 0 4px 0 rgba(255, 255, 255, 0.07), 0 -2px 0 0 rgba(0, 0, 0, 0.20) inset, 0 1px 0 0 rgba(255, 255, 255, 0.40) inset" }}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                    <t.icon className="h-4.5 w-4.5" />
                  </span>
                  <span className="flex-1 truncate font-medium text-center">{t.label}</span>
                  {t.tag && !t.soon && (
                    <span className="rounded-full bg-primary/15 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">{t.tag}</span>
                  )}
                  {t.soon && (
                    <span className="rounded-full border border-secondary/40 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-secondary">Em breve</span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="mt-6 px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Geral</p>
          <div className="space-y-0.5">
            <Link to="/planos" className="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-primary/5 hover:text-foreground">
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/50 transition-all duration-200 group-hover:bg-primary/10 group-hover:text-primary">
                <CreditCard className="h-4.5 w-4.5" />
              </span>
              <span className="flex-1 truncate text-center">Planos & Pix</span>
            </Link>
            <Link to="/conta" className="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-primary/5 hover:text-foreground">
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/50 transition-all duration-200 group-hover:bg-primary/10 group-hover:text-primary">
                <Settings className="h-4.5 w-4.5" />
              </span>
              <span className="flex-1 truncate text-center">Minha conta</span>
            </Link>
            <button
              onClick={async () => {
                const { clearToken } = await import("@/lib/session");
                clearToken();
                window.location.href = "/";
              }}
              className="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-primary/5 hover:text-foreground"
            >
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/50 transition-all duration-200 group-hover:bg-primary/10 group-hover:text-primary">
                <LogOut className="h-4.5 w-4.5" />
              </span>
              <span className="flex-1 truncate text-center">Sair</span>
            </button>
          </div>
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-b from-gray-900/80 via-gray-950/90 to-gray-900/80 p-4">
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/20 blur-2xl" />
            <div className="relative">
              {acc?.subscription ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <p className="text-xs font-semibold tracking-wide text-white">{(acc.subscription as any).plans?.name || "Plano"}</p>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">Buscas: <span className="font-medium text-white">{acc.today.searches}</span> / {(acc.subscription as any).plans?.daily_search_limit || "—"}</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary/50 to-primary/70"
                      style={{ width: `${Math.min((acc.today.searches / ((acc.subscription as any).plans?.daily_search_limit || 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <button className="mt-3 w-full rounded-full bg-gradient-to-b from-primary to-primary/80 py-2 text-xs font-semibold text-white shadow-[0_4px_16px_rgba(99,102,241,0.35),inset_0_1px_0_rgba(255,255,255,0.15),inset_0_-2px_0_rgba(0,0,0,0.2)] transition-all duration-200 hover:opacity-90 hover:shadow-[0_8px_24px_rgba(99,102,241,0.5),inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-2px_0_rgba(0,0,0,0.2)] active:scale-[0.98]">
                    Fazer upgrade
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <p className="text-xs font-semibold tracking-wide text-white">Sem plano</p>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">Ative seu plano para começar</p>
                  <button onClick={() => setShowActivate(true)} className="mt-3 w-full rounded-full bg-gradient-to-b from-primary to-primary/80 py-2 text-xs font-semibold text-white shadow-[0_4px_16px_rgba(99,102,241,0.35),inset_0_1px_0_rgba(255,255,255,0.15),inset_0_-2px_0_rgba(0,0,0,0.2)] transition-all duration-200 hover:opacity-90 hover:shadow-[0_8px_24px_rgba(99,102,241,0.5),inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-2px_0_rgba(0,0,0,0.2)] active:scale-[0.98]">
                    Ativar plano
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm lg:hidden" />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/70 px-5 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden" aria-label="Abrir menu">
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Painel</p>
              <h1 className="text-base font-semibold">Bem-vindo de volta, <span className="text-gradient-primary">{acc?.profile?.full_name || acc?.profile?.email?.split("@")[0] || "Analista"}</span></h1>
            </div>
          </div>
          <div className="flex items-center gap-2">

            <button className="relative rounded-full border border-border bg-card/60 p-2 transition hover:bg-secondary" aria-label="Notificações">
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
            </button>
            <button className="flex items-center gap-2 rounded-full border border-border bg-card/60 px-2 py-1.5 transition hover:bg-secondary">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground shadow-glow">
                {(acc?.profile?.full_name || acc?.profile?.email || "N")
                  .split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <span className="hidden text-sm font-medium sm:inline">{acc?.profile?.full_name || acc?.profile?.email?.split("@")[0] || "Analista"}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </header>

        <main className="flex-1 space-y-6 p-5 lg:p-8">
          {/* Stats */}
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:snap-none sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <StatCard key={s.label} s={s} />
            ))}
          </div>

          {/* Tool chips */}
          <div className="flex flex-wrap justify-center gap-2.5">
            {TOOLS.map(t => {
              const active = activeTool === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => { if (t.soon) return; cancelSearch(); setActiveTool(t.id); setQuery(t.sample); setResult(null); }}
                  className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full h-9 px-4 text-xs font-medium transition-all duration-200 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0 ${
                    active
                      ? "text-white border-0"
                      : "border border-border/60 bg-card/40 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5"
                  } ${t.soon ? "opacity-50 cursor-not-allowed" : ""}`}
                  style={active ? {
                    background: "linear-gradient(180deg, #2a8fc4 49.18%, #5ab8e0 113.93%)",
                    boxShadow: "0 0 4px 0 rgba(255, 255, 255, 0.07), 0 -2px 0 0 rgba(0, 0, 0, 0.20) inset, 0 1px 0 0 rgba(255, 255, 255, 0.40) inset",
                  } : undefined}
                  disabled={t.soon}
                >
                  <t.icon className="h-3.5 w-3.5" /> {t.label}
                  {t.soon && <span className="text-[9px] uppercase tracking-wider opacity-70">soon</span>}
                </button>
              );
            })}
          </div>

          {/* Search console */}
          <div className="relative mx-auto w-full max-w-[1200px]">
            <form className="space-y-3 sm:space-y-4" onSubmit={e => { e.preventDefault(); runSearch(); }}>
              <div className="group relative mx-auto w-full">
                <div
                  className="relative flex min-h-[66px] items-center overflow-hidden rounded-2xl border border-primary/20 bg-gradient-card shadow-elevated transition-all duration-300 sm:min-h-[74px] group-focus-within:border-primary/40 group-focus-within:shadow-[0_0_0_1px_rgba(42,143,196,0.2)_inset,0_14px_32px_rgba(0,0,0,0.25)]"
                  style={{ backdropFilter: "blur(24px)" }}
                >
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-primary/[0.06] via-primary-glow/[0.03] to-transparent" />
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-36 bg-gradient-to-l from-primary/[0.05] via-primary-glow/[0.02] to-transparent" />
                  <div className="pointer-events-none absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

                  <div className="relative z-10 ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-card/60 text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors duration-300 group-focus-within:text-primary sm:ml-4 sm:h-12 sm:w-12">
                    <Fingerprint className="h-5 w-5 transition-colors duration-200 group-focus-within:text-primary" />
                  </div>

                  <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") runSearch(); }}
                    className="h-[66px] min-w-0 flex-1 border-0 bg-transparent px-4 pr-[8rem] text-sm font-medium text-muted-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0 focus-visible:ring-0 sm:h-[74px] sm:px-5 sm:pr-[12.25rem] sm:text-base"
                    placeholder={`Digite para buscar em ${tool.label}...`}
                    autoComplete="off"
                  />

                  <div className="absolute right-3 z-10 flex items-center gap-2 sm:right-4">
                    <button
                      type="button"
                      onClick={() => setShowSettings(true)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-card/40 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                      aria-label="Configure Modules"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                    <button
                      type="submit"
                      disabled={busy || tool.soon}
                      className="group/btn relative inline-flex h-10 items-center justify-center gap-2 overflow-hidden rounded-full px-6 text-sm font-bold uppercase tracking-wider text-white transition-all duration-200 active:scale-95 disabled:opacity-50"
                      style={{
                        background: "linear-gradient(180deg, #2a8fc4 49.18%, #5ab8e0 113.93%)",
                        boxShadow: "0 0 4px 0 rgba(255, 255, 255, 0.07), 0 -2px 0 0 rgba(0, 0, 0, 0.20) inset, 0 1px 0 0 rgba(255, 255, 255, 0.40) inset",
                      }}
                    >
                      <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full" />
                      <div className="relative flex items-center gap-2">
                        <span>{busy ? "Buscando" : "Buscar"}</span>
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom bar */}
              <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-card shadow-elevated">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                <div className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
                <div className="pointer-events-none absolute inset-y-4 left-0 w-px bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
                <div className="pointer-events-none absolute inset-y-4 right-0 w-px bg-gradient-to-b from-transparent via-primary-glow/15 to-transparent" />

                <div className="relative z-10 space-y-3 px-4 py-3.5 sm:px-5 sm:py-4">
 

                  {/* Email breach status */}
                  {activeTool === "email" && breach.state !== "idle" && (
                    <div className="pt-2">
                      {breach.state === "checking" && (
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Verificando vazamentos...
                        </p>
                      )}
                      {breach.state === "safe" && (
                        <p className="flex items-center gap-1.5 text-xs text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Nenhum vazamento conhecido para este email.
                        </p>
                      )}
                      {breach.state === "breached" && (
                        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
                          <p className="flex items-center gap-1.5 font-semibold">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Este email apareceu em {breach.breaches.length} vazamento(s)
                          </p>
                          <p className="mt-1 text-destructive/80">
                            {breach.breaches.slice(0, 4).join(", ")}
                            {breach.breaches.length > 4 ? "..." : ""}
                          </p>
                          <p className="mt-1.5 text-destructive/70">
                            Recomendamos trocar a senha e ativar 2FA.
                          </p>
                        </div>
                      )}
                      {breach.state === "error" && (
                        <p className="text-xs text-muted-foreground/70">
                          Não foi possível verificar vazamentos no momento.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Sensitive credential audit */}
                  {activeTool === "email" && (
                    <div className="relative overflow-hidden rounded-xl border border-primary/15 bg-primary/[0.04] p-4">
                      <div aria-hidden className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/15 blur-3xl" />
                      <div className="relative mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(42,143,196,0.6)]" />
                          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/90">Auditoria de credencial sensível</span>
                        </div>
                        <div className="flex gap-1.5">
                          <span className="rounded border border-primary/20 bg-background/60 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">HIBP/v3</span>
                          <span className="rounded border border-primary/20 bg-background/60 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-tighter text-muted-foreground">k-anonymity</span>
                        </div>
                      </div>

                      <div className="relative group/pwd flex items-center gap-2 rounded-xl border border-primary/20 bg-background/60 p-1.5 transition focus-within:border-primary/50">
                        <Lock className="ml-2 h-4 w-4 text-muted-foreground" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-transparent py-2 font-mono text-sm tracking-tight outline-none placeholder:text-muted-foreground/60"
                          placeholder="Verificar se uma senha vazou (opcional)"
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="mr-1 rounded-md p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                          aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>

                      <div className="relative mt-3 min-h-[1.25rem]">
                        {pwn.state === "checking" && (
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Verificando senha...
                          </p>
                        )}
                        {pwn.state === "safe" && (
                          <p className="flex items-center gap-1.5 text-xs text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            Senha não encontrada em vazamentos conhecidos.
                          </p>
                        )}
                        {pwn.state === "pwned" && (
                          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
                            <p className="flex items-center gap-1.5 font-semibold">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Senha vazada {pwn.count.toLocaleString("pt-BR")} vez(es)
                            </p>
                            <p className="mt-1 text-destructive/80">
                              Esta senha aparece em bases públicas de vazamento. Troque imediatamente.
                            </p>
                          </div>
                        )}
                        {pwn.state === "error" && (
                          <p className="text-xs text-muted-foreground/70">
                            Não foi possível verificar a senha agora.
                          </p>
                        )}
                      </div>

                      <p className="relative mt-3 font-mono text-[10px] text-muted-foreground/60">
                        <span className="text-primary/70">•</span> A senha nunca é enviada — SHA-1 (5 chars) via HIBP.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Recent searches */}
          {recentSearches.length > 0 && !result && (
            <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-black/40 backdrop-blur-sm">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
              <div className="px-4 py-3 sm:px-5 sm:py-4">
                <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">Buscas recentes</p>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((s, i) => (
                    <div key={`${s.query}-${s.tool}-${i}`} className="group/pill relative">
                      <button
                        onClick={() => { setQuery(s.query); setActiveTool(s.tool as typeof activeTool); }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/30 hover:bg-primary/[0.06] hover:text-foreground"
                      >
                        <span className="text-[9px] font-bold text-primary">{TOOLS.find(t => t.id === s.tool)?.label.slice(0, 2).toUpperCase() || "?"}</span>
                        <span className="max-w-[140px] truncate">{s.query}</span>
                        <span className="text-[9px] text-muted-foreground/50">• {new Date(s.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                      </button>
                      <button
                        onClick={() => {
                          const updated = recentSearches.filter((_, idx) => idx !== i);
                          setRecentSearches(updated);
                          localStorage.setItem("recentSearches", JSON.stringify(updated));
                        }}
                        className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-border/60 bg-background text-[9px] text-muted-foreground opacity-0 transition hover:bg-destructive hover:text-destructive-foreground group-hover/pill:opacity-100"
                        aria-label="Remover"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Activate license modal */}
          {showActivate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { setShowActivate(false); setActivateError(""); setActivateOk(false); }}>
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
              <div
                className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-border/60 bg-gradient-card shadow-elevated"
                onClick={e => e.stopPropagation()}
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">Ativar plano</h3>
                      <p className="text-[10px] text-muted-foreground/70">Insira sua chave de licença</p>
                    </div>
                  </div>
                  <button onClick={() => { setShowActivate(false); setActivateError(""); setActivateOk(false); }} className="flex h-7 w-7 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition hover:bg-secondary hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="p-5">
                  {activateOk ? (
                    <div className="flex flex-col items-center gap-3 py-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-emerald-400">Plano ativado com sucesso!</p>
                      <button onClick={() => { setShowActivate(false); setActivateOk(false); window.location.reload(); }} className="rounded-full bg-primary px-6 py-2 text-xs font-bold text-white">
                        Fechar
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={licenseKey}
                        onChange={e => setLicenseKey(e.target.value)}
                        placeholder="Cole sua chave aqui..."
                        className="w-full rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-sm font-mono text-foreground outline-none transition focus:border-primary/50 focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground/60"
                        autoFocus
                      />
                      {activateError && <p className="mt-2 text-xs text-destructive">{activateError}</p>}
                      <button
                        onClick={async () => {
                          if (!licenseKey.trim()) return;
                          setActivating(true);
                          setActivateError("");
                          try {
                            const res = await doRedeem({ data: { key: licenseKey.trim() } }) as any;
                            if (res?.ok) {
                              setActivateOk(true);
                            } else {
                              setActivateError(res?.error || "Chave inválida");
                            }
                          } catch (e) {
                            setActivateError(e instanceof Error ? e.message : "Erro ao ativar");
                          } finally {
                            setActivating(false);
                          }
                        }}
                        disabled={activating || !licenseKey.trim()}
                        className="mt-3 w-full rounded-full bg-gradient-to-b from-primary to-primary/80 py-2.5 text-xs font-bold text-white shadow-[0_4px_16px_rgba(99,102,241,0.35),inset_0_1px_0_rgba(255,255,255,0.15),inset_0_-2px_0_rgba(0,0,0,0.2)] transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                      >
                        {activating ? "Ativando..." : "Ativar"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Settings modal */}
          {showSettings && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
              <div
                className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border/60 bg-gradient-card shadow-elevated"
                onClick={e => e.stopPropagation()}
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Settings className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">Configurações</h3>
                      <p className="text-[10px] text-muted-foreground/70">Módulos e preferências</p>
                    </div>
                  </div>
                  <button onClick={() => setShowSettings(false)} className="flex h-7 w-7 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition hover:bg-secondary hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="space-y-4 p-5">
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Preferências de busca</p>
                    <div className="space-y-1.5">
                      <label className="flex items-center justify-between rounded-lg border border-border/40 bg-background/30 px-4 py-3 transition hover:bg-primary/5 cursor-pointer">
                        <div className="flex items-center gap-2.5">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-medium">Salvar histórico</span>
                        </div>
                        <div className="relative flex h-5 w-9 cursor-pointer items-center rounded-full bg-primary/30 transition-colors">
                          <div className="h-3.5 w-3.5 translate-x-1 rounded-full bg-white shadow transition-transform" />
                        </div>
                      </label>
                      <label className="flex items-center justify-between rounded-lg border border-border/40 bg-background/30 px-4 py-3 transition hover:bg-primary/5 cursor-pointer">
                        <div className="flex items-center gap-2.5">
                          <Zap className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-medium">Busca automática</span>
                        </div>
                        <div className="relative flex h-5 w-9 cursor-pointer items-center rounded-full bg-primary/30 transition-colors">
                          <div className="h-3.5 w-3.5 translate-x-1 rounded-full bg-white shadow transition-transform" />
                        </div>
                      </label>
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Exibição</p>
                    <div className="space-y-1.5">
                      <label className="flex items-center justify-between rounded-lg border border-border/40 bg-background/30 px-4 py-3 transition hover:bg-primary/5 cursor-pointer">
                        <div className="flex items-center gap-2.5">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-medium">Modo compacto</span>
                        </div>
                        <div className="relative flex h-5 w-9 cursor-pointer items-center rounded-full bg-muted transition-colors">
                          <div className="h-3.5 w-3.5 translate-x-1 rounded-full bg-white shadow transition-transform" />
                        </div>
                      </label>
                      <div className="flex items-center justify-between rounded-lg border border-border/40 bg-background/30 px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Download className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-medium">Formato de exportação</span>
                        </div>
                        <select className="rounded-lg border border-border/60 bg-background/60 px-2 py-1 text-xs text-foreground outline-none">
                          <option>JSON</option>
                          <option>CSV</option>
                          <option>PDF</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Notificações</p>
                    <div className="space-y-1.5">
                      <label className="flex items-center justify-between rounded-lg border border-border/40 bg-background/30 px-4 py-3 transition hover:bg-primary/5 cursor-pointer">
                        <div className="flex items-center gap-2.5">
                          <Bell className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-medium">Alertas de vazamento</span>
                        </div>
                        <div className="relative flex h-5 w-9 cursor-pointer items-center rounded-full bg-primary/30 transition-colors">
                          <div className="h-3.5 w-3.5 translate-x-1 rounded-full bg-white shadow transition-transform" />
                        </div>
                      </label>
                      <label className="flex items-center justify-between rounded-lg border border-border/40 bg-background/30 px-4 py-3 transition hover:bg-primary/5 cursor-pointer">
                        <div className="flex items-center gap-2.5">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-medium">Relatório semanal</span>
                        </div>
                        <div className="relative flex h-5 w-9 cursor-pointer items-center rounded-full bg-muted transition-colors">
                          <div className="h-3.5 w-3.5 translate-x-1 rounded-full bg-white shadow transition-transform" />
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="border-t border-border/60 bg-background/30 px-5 py-3">
                  <p className="text-center text-[10px] text-muted-foreground/60">As configurações são salvas automaticamente.</p>
                </div>
              </div>
            </div>
          )}

          {/* Results panel */}
          <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-card shadow-elevated">
            <div className="relative p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Resultados</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${busy ? "bg-primary/20 text-primary" : result ? (result.ok ? "bg-emerald-500/15 text-emerald-400" : "bg-destructive/15 text-destructive") : "bg-secondary text-muted-foreground"}`}>
                    {busy ? "buscando" : result ? (result.ok ? "concluído" : "erro") : "aguardando"}
                  </span>
                </div>
                <button
                  onClick={exportJson}
                  disabled={!result}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border/60 bg-card/40 h-8 px-4 text-xs font-medium text-muted-foreground transition-all duration-200 hover:text-foreground hover:border-primary/30 hover:bg-primary/5 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Download className="h-3 w-3" /> Exportar
                </button>
              </div>

              {!result && !busy && (
                    <div className="mt-3 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/20 bg-background/30 px-6 py-10 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Search className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-medium">Nenhuma busca realizada</p>
                  <p className="text-xs text-muted-foreground">Digite um termo acima e clique em Buscar para começar.</p>
                </div>
              )}

              {busy && (
                <div className="mt-3 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/20 bg-background/30 px-6 py-10 text-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Consultando fontes públicas...</p>
                </div>
              )}

              {result && !result.ok && (
                <div className="mt-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                  <p className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4" /> Falha na busca
                  </p>
                  <p className="mt-1 text-destructive/80">{result.error}</p>
                </div>
              )}

              {result && result.ok && (
                <div className="mt-3 space-y-4">
                  {result.summary && (
                    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                      <p className="text-[10px] uppercase tracking-wider text-primary">Resumo</p>
                      <p className="mt-1 text-sm font-medium">{result.summary}</p>
                    </div>
                  )}
                  {(() => {
                    const collapsibles = result.sections.map((s, i) => ({ s, i })).filter(x => x.s.collapsible && x.s.icon);
                    const regular = result.sections.map((s, i) => ({ s, i })).filter(x => !(x.s.collapsible && x.s.icon));
                    return (
                      <>
                        {regular.map(({ s: sec, i }) => (
                          <div key={i} className="rounded-2xl border border-primary/15 bg-background/40 p-4">
                            <h4 className="mb-3 text-sm font-semibold">{sec.title}</h4>
                            {sec.fields && sec.fields.length > 0 && (
                              <dl className="grid gap-2 sm:grid-cols-2">
                                {sec.fields.map((f, j) => (
                                  <div key={j} className="flex flex-col rounded-lg border border-primary/15 bg-card/40 p-2.5">
                                    <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.label}</dt>
                                    <dd className={`mt-0.5 break-all text-sm ${f.mono ? "font-mono" : ""} ${f.warn ? "text-destructive" : ""} ${f.ok ? "text-emerald-400" : ""}`}>{f.value}</dd>
                                  </div>
                                ))}
                              </dl>
                            )}
                            {sec.list && sec.list.length > 0 && (
                              <ul className="space-y-1.5 text-sm">
                                {sec.list.map((it, j) => (
                                  <li key={j} className="flex gap-2 break-all rounded-md bg-card/30 px-2.5 py-1.5 font-mono text-xs">
                                    <span className="text-muted-foreground">•</span>{it}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {sec.credentials && sec.credentials.length > 0 && (
                              (() => {
                                const rootHost = (u: string) => { try { const h = new URL(u).hostname; const p = h.split('.'); const m = ['com.br','org.br','net.br','gov.br','edu.br','mil.br','co.uk','co.jp','com.au','com.cn']; return p.length >= 3 && m.includes(p.slice(-2).join('.')) ? p.slice(-3).join('.') : p.slice(-2).join('.'); } catch { return u; } };
                                const domains = [...new Set(sec.credentials.map(c => rootHost(c.url)))].sort();
                                const filtered = credFilter ? sec.credentials.filter(c => rootHost(c.url) === credFilter) : sec.credentials;
                                const total = filtered.length;
                                const totalPages = Math.ceil(total / credPageSize);
                                const safePage = Math.min(credPage, Math.max(1, totalPages));
                                const start = (safePage - 1) * credPageSize;
                                const end = Math.min(start + credPageSize, total);
                                const pageItems = filtered.slice(start, end);
                                return (
                                  <>
                                    {domains.length > 1 && (
                                      <div className="mt-6 flex flex-wrap items-center gap-1.5">
                                        <button onClick={() => { setCredFilter(null); setCredPage(1); }} className={`rounded-lg border px-2 py-1 text-[10px] font-medium transition ${credFilter === null ? 'bg-primary/15 border-primary/30 text-primary' : 'border-border/60 text-muted-foreground hover:border-primary/30 hover:text-foreground'}`}>Todos</button>
                                        {domains.map(d => (
                                          <button key={d} onClick={() => { setCredFilter(d); setCredPage(1); }} className={`rounded-lg border p-1.5 transition ${credFilter === d ? 'bg-primary/15 border-primary/30 text-primary' : 'border-border/60 text-muted-foreground hover:border-primary/30 hover:text-foreground'}`} title={d}>
                                            <img src={`https://www.google.com/s2/favicons?domain=${d}&sz=16`} alt="" className="h-4 w-4 rounded-sm" loading="lazy" />
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                      {pageItems.map((cred, j) => {
                                        const hostname = (() => { try { return new URL(cred.url).hostname; } catch { return cred.url; } })();
                                        const rootDomain = rootHost(cred.url);
                                        return (
                                          <div key={j} className="group relative overflow-hidden rounded-xl border border-primary/30 text-white backdrop-blur-xl transition-all duration-200"
                                            style={{background: "linear-gradient(rgba(42,143,196,0.15) 49.18%, rgba(90,184,224,0.1) 113.93%)", boxShadow: "0 0 4px 0 rgba(255,255,255,0.07), 0 -2px 0 0 rgba(0,0,0,0.20) inset, 0 1px 0 0 rgba(255,255,255,0.40) inset"}}
                                          >
                                            <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                                            <div className="relative flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-2.5">
                                              <span className="rounded bg-[#0a0a0f]/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-xl">STEALER LOG</span>
                                              <img src={`https://www.google.com/s2/favicons?domain=${rootDomain}&sz=16`} alt="" className="h-4 w-4 rounded-sm" loading="lazy" />
                                              <div className="ml-auto flex items-center gap-1.5">
                                                <span className="font-mono text-[10px] text-white/60">#{cred.id.slice(0, 8)}</span>
                                                <button onClick={() => navigator.clipboard.writeText(cred.id)} className="rounded p-1 text-white/60 transition hover:text-white" title="Copy ID">
                                                  <Copy className="h-3 w-3" />
                                                </button>
                                              </div>
                                            </div>
                                            {cred.stolenDate || cred.discoveredDate ? (
                                              <div className="relative flex flex-wrap gap-2 px-4 py-2">
                                                {cred.stolenDate && (
                                                  <span className="inline-flex items-center gap-1 rounded-full border border-white/20 px-2.5 py-0.5 text-[10px] text-white/70">
                                                    <Clock className="h-3 w-3" /> Stolen {cred.stolenDate}
                                                  </span>
                                                )}
                                                {cred.discoveredDate && (
                                                  <span className="inline-flex items-center gap-1 rounded-full border border-white/20 px-2.5 py-0.5 text-[10px] text-white/70">
                                                    <Shield className="h-3 w-3" /> Discovered {cred.discoveredDate}
                                                  </span>
                                                )}
                                              </div>
                                            ) : null}
                                            <div className="relative flex items-center gap-2 px-4 py-1.5 normal-case">
                                              <ArrowUpRight className="h-3 w-3 shrink-0 text-white/70" />
                                              <a href={cred.url} target="_blank" rel="noopener noreferrer" className="truncate font-mono text-xs text-white/90 underline underline-offset-2 decoration-white/30 hover:decoration-white/60">{cred.url}</a>
                                            </div>
                                            <div className="relative grid gap-2 px-4 pb-3 pt-1 sm:grid-cols-3">
                                              <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 p-2.5 backdrop-blur-xl">
                                                <div className="flex items-center gap-1.5 text-[10px] tracking-wider text-white/60 normal-case">
                                                  <User className="h-3 w-3" /> email / login
                                                </div>
                                                <div className="mt-1 flex items-center justify-between gap-2">
                                                  <span className="break-all font-mono text-xs text-white/90">{cred.email}</span>
                                                  <button onClick={() => navigator.clipboard.writeText(cred.email)} className="shrink-0 rounded p-1 text-white/60 transition hover:text-white" title="Copy">
                                                    <Copy className="h-3 w-3" />
                                                  </button>
                                                </div>
                                              </div>
                                              <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 p-2.5 backdrop-blur-xl">
                                                <div className="flex items-center gap-1.5 text-[10px] tracking-wider text-white/60 normal-case">
                                                  <Key className="h-3 w-3" /> password
                                                </div>
                                                <div className="mt-1 flex items-center justify-between gap-2">
                                                  <span className="break-all font-mono text-xs text-white/90">{cred.password}</span>
                                                  <button onClick={() => navigator.clipboard.writeText(cred.password)} className="shrink-0 rounded p-1 text-white/60 transition hover:text-white" title="Copy">
                                                    <Copy className="h-3 w-3" />
                                                  </button>
                                                </div>
                                              </div>
                                              <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/80 p-2.5 backdrop-blur-xl">
                                                <div className="flex items-center gap-1.5 text-[10px] tracking-wider text-white/60 normal-case">
                                                  <Globe2 className="h-3 w-3" /> {cred.telefone ? "telefone" : "subdomain"}
                                                </div>
                                                <div className="mt-1 flex items-center justify-between gap-2">
                                                  <span className="break-all font-mono text-xs text-white/90">{cred.telefone || hostname}</span>
                                                  <button onClick={() => navigator.clipboard.writeText(cred.telefone || hostname)} className="shrink-0 rounded p-1 text-white/60 transition hover:text-white" title="Copy">
                                                    <Copy className="h-3 w-3" />
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                     {total > credPageSize && (
                                      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-primary/30 px-3 py-3 text-white sm:flex-row sm:items-center sm:justify-between"
                                        style={{background: "linear-gradient(#2a8fc4 49.18%, #5ab8e0 113.93%)", boxShadow: "0 0 4px 0 rgba(255,255,255,0.07), 0 -2px 0 0 rgba(0,0,0,0.20) inset, 0 1px 0 0 rgba(255,255,255,0.40) inset"}}>
                                        <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[12px] text-white/60 sm:justify-start sm:text-[13px]">
                                          <span className="font-medium text-white/90 tabular-nums">{start + 1}-{end}</span>
                                          <span>de</span>
                                          <span className="font-medium text-white/90 tabular-nums">{total}</span>
                                          <span>mostrados</span>
                                        </div>
                                        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
                                          <div className="flex h-9 items-center overflow-hidden rounded-xl border border-white/15 bg-white/10 text-[12px] text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] sm:text-[13px]">
                                            <span className="px-2">Mostrar</span>
                                            <select value={credPageSize} onChange={e => { setCredPageSize(Number(e.target.value)); setCredPage(1); }} className="h-full w-[4.75rem] border-l border-white/15 bg-white/5 px-2 text-[12px] text-white outline-none transition-colors sm:text-sm focus:border-white/50" aria-label="Linhas por página">
                                              <option value={5} className="bg-black text-white">5</option>
                                              <option value={10} className="bg-black text-white">10</option>
                                              <option value={25} className="bg-black text-white">25</option>
                                              <option value={50} className="bg-black text-white">50</option>
                                              <option value={100} className="bg-black text-white">100</option>
                                            </select>
                                          </div>
                                          {totalPages > 1 && (
                                            <div className="flex h-9 items-center gap-1 rounded-xl border border-white/15 bg-white/10 px-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                                              <button disabled={safePage === 1} onClick={() => setCredPage(1)} className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-35 disabled:cursor-not-allowed" aria-label="Primeira página">
                                                <ChevronsLeft className="h-3.5 w-3.5" />
                                              </button>
                                              <button disabled={safePage === 1} onClick={() => setCredPage(x => Math.max(1, x - 1))} className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-35 disabled:cursor-not-allowed" aria-label="Página anterior">
                                                <ChevronLeft className="h-3.5 w-3.5" />
                                              </button>
                                              <div className="hidden sm:flex items-center gap-1">
                                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                                                  <button key={n} onClick={() => setCredPage(n)} className={`inline-flex items-center justify-center h-7 min-w-7 rounded-lg border-0 px-2 text-xs font-semibold tabular-nums ${n === safePage ? 'text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] bg-white/20' : 'text-white/60 hover:bg-white/10 hover:text-white'}`} aria-label={`Página ${n}`} aria-current={n === safePage ? 'page' : undefined}>
                                                    {n}
                                                  </button>
                                                ))}
                                              </div>
                                              <div className="flex min-w-[4.5rem] items-center justify-center px-2 text-[12px] text-white/60 tabular-nums sm:hidden">
                                                {safePage} / {totalPages}
                                              </div>
                                              <button disabled={safePage === totalPages} onClick={() => setCredPage(x => Math.min(totalPages, x + 1))} className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-35 disabled:cursor-not-allowed" aria-label="Próxima página">
                                                <ChevronRight className="h-3.5 w-3.5" />
                                              </button>
                                              <button disabled={safePage === totalPages} onClick={() => setCredPage(totalPages)} className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-35 disabled:cursor-not-allowed" aria-label="Última página">
                                                <ChevronsRight className="h-3.5 w-3.5" />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </>
                                );
                              })()
                            )}
                            {sec.links && sec.links.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {sec.links.map((l, j) => (
                                  <a key={j} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border/60 bg-card/40 h-8 px-4 text-xs font-medium text-muted-foreground transition-all duration-200 hover:text-foreground hover:border-primary/30 hover:bg-primary/5">
                                    {l.label} <ArrowUpRight className="h-3 w-3" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        {collapsibles.length > 0 && (
                          <div className="rounded-2xl border border-border bg-background/40 p-4">
                            <h4 className="mb-3 text-sm font-semibold">Plataformas verificadas <span className="text-xs font-normal text-muted-foreground">({collapsibles.length})</span></h4>
                            <div className="flex flex-wrap gap-2">
                              {collapsibles.map(({ s: sec, i }) => {
                                const open = !!openSections[i];
                                const name = sec.title.split(" — ")[0];
                                const found = sec.fields?.[0]?.ok;
                                return (
                                  <div key={i} className="w-full sm:w-auto">
                                    <button
                                      onClick={() => setOpenSections(o => ({ ...o, [i]: !o[i] }))}
                                      className={`inline-flex items-center justify-center gap-2 rounded-full h-9 px-4 text-xs font-medium transition-all duration-200 ${found ? "ring-1 ring-destructive/40" : ""} ${open ? "text-white border-0" : "border border-border/60 bg-card/40 text-foreground hover:border-primary/30 hover:bg-primary/5"}`}
                                      style={open ? {
                                        background: "linear-gradient(180deg, #2a8fc4 49.18%, #5ab8e0 113.93%)",
                                        boxShadow: "0 0 4px 0 rgba(255, 255, 255, 0.07), 0 -2px 0 0 rgba(0, 0, 0, 0.20) inset, 0 1px 0 0 rgba(255, 255, 255, 0.40) inset",
                                      } : undefined}
                                      title={sec.title}
                                    >
                                      <img src={sec.icon} alt="" className="h-4 w-4 rounded-sm" loading="lazy" />
                                      <span>{name}</span>
                                      {found && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-destructive" />}
                                    </button>
                                    {open && sec.fields && (
                                      <div className="mt-2 rounded-xl border border-border/60 bg-card/40 p-3">
                                        <div className="mb-2 flex items-center gap-2">
                                          <img src={sec.icon} alt="" className="h-4 w-4 rounded-sm" />
                                          <span className="text-xs font-semibold">{sec.title}</span>
                                        </div>
                                        <dl className="grid gap-1.5">
                                          {sec.fields.map((f, j) => (
                                            <div key={j} className="flex flex-col rounded-md border border-border/40 bg-background/40 p-2">
                                              <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.label}</dt>
                                              <dd className={`mt-0.5 break-all text-xs ${f.mono ? "font-mono" : ""} ${f.warn ? "text-destructive" : ""} ${f.ok ? "text-emerald-400" : ""}`}>{f.value}</dd>
                                            </div>
                                          ))}
                                        </dl>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                  {result.sources.length > 0 && (
                    <p className="text-[10px] text-muted-foreground/70">
                      Fontes: {result.sources.join(" • ")}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
