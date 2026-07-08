import { createFileRoute, Link } from "@tanstack/react-router";
import { NoxLogo } from "@/components/NoxLogo";
import {
  Eye, Search, Mail, User, Phone, FileText, Settings, LogOut, Bell,
  ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Activity, TrendingUp, Shield, Clock, Filter, Download,
  Menu, X, Database, Sparkles, Zap, ArrowUpRight, Globe2,
  AlertTriangle, CheckCircle2, Loader2, Lock, EyeOff,
  CreditCard, Wallet, Link2, ShieldAlert, Network, Cloud, MapPin,
  UserSearch, Fingerprint, ArrowRight, LayoutGrid, Key, Copy, QrCode, Wifi, Image,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyAccount, redeemLicenseKey } from "@/lib/billing.functions";
import { useEmailBreach } from "@/hooks/useEmailBreach";
import { usePwnedPassword } from "@/hooks/usePwnedPassword";
import { useTilt } from "@/hooks/use-tilt";
import { decodePix } from "@/lib/pix-decoder";
import { QRCodeSVG } from "qrcode.react";

export const Route = createFileRoute("/_authenticated/dashboard")({
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
  { id: "urllogins", icon: Key, label: "URL Logins", desc: "Busque logins e senhas vazados associados a um domínio ou URL.", sample: "loja-suspeita.shop", tag: "CRED" },
  { id: "wifi", icon: Wifi, label: "Localizar Wi-Fi", desc: "Identifique a geolocalização de redes sem fio via BSSID/SSID nas bases públicas.", sample: "00:11:22:33:44:55" },
  { id: "photolocation", icon: Image, label: "Ver Localização por Foto", desc: "Identifique coordenadas de fotos usando a inteligência do WhereIsThisPlace.", sample: "Foto ou cidade a localizar" },
  { id: "password", icon: Lock, label: "Senha", desc: "Descubra em quais vazamentos uma senha apareceu.", sample: "" },
  { id: "meta", icon: FileText, label: "Metadados", desc: "Extraia metadados de arquivos (EXIF, autor, GPS).", sample: "documento.pdf" },
  { id: "pix", icon: QrCode, label: "Decodificador Pix", desc: "Decodifique códigos Pix (copia e cola) e visualize QR Code e dados EMV.", sample: "00020126580014br.gov.bcb.pix0136" },
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
  const color = accent ? "#5ab8e0" : "rgba(255,255,255,0.25)";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-7 w-full">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={accent ? 0.35 : 0.15} />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatCard({ s }: { s: { icon: any; label: string; value: string; limit?: number; trend: string; spark: number[]; accent?: boolean } }) {
  const tilt = useTilt(6);
  const exceeded = s.limit !== undefined && Number(s.value) >= s.limit;
  const pct = s.limit ? Math.min((Number(s.value) / s.limit) * 100, 100) : 0;
  return (
    <div className="group relative w-[65vw] shrink-0 snap-center sm:w-auto">
      <div
        ref={tilt.ref}
        onMouseMove={tilt.onMouseMove}
        onMouseLeave={tilt.onMouseLeave}
        className="relative overflow-hidden rounded-2xl border border-[#2a8fc4]/10 p-[1px] transition-all duration-500 hover:border-[#2a8fc4]/25 hover:shadow-[0_24px_48px_-12px_rgba(42,143,196,0.2)]"
        style={{ boxShadow: "0 0 0 1px rgba(42,143,196,0.05), 0 8px 32px -12px rgba(0,0,0,0.5)" }}
      >
        <div className="relative h-full rounded-2xl bg-[#0a0f18] p-4 sm:p-5"
          style={{ boxShadow: "inset 0 1px 0 rgba(42,143,196,0.08), inset 0 -1px 0 rgba(0,0,0,0.3)" }}
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[#2a8fc4]/5 to-transparent pointer-events-none" />
          <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[#2a8fc4]/5 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
          <div className="relative flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10"
                style={{ background: "linear-gradient(135deg, rgba(42,143,196,0.3), rgba(90,184,224,0.1))", boxShadow: "0 0 16px rgba(42,143,196,0.15)" }}
              >
                <div className="absolute inset-0 rounded-xl ring-1 ring-[#2a8fc4]/15 inset-ring inset-ring-[#2a8fc4]/10" />
                <s.icon className="h-4 w-4 text-[#5ab8e0] sm:h-[18px] sm:w-[18px]" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#5ab8e0]/50 sm:text-xs">{s.label}</p>
                <p className="text-xl font-bold tracking-tight tabular-nums text-white sm:text-3xl">
                  {s.value}{s.limit !== undefined ? <span className="text-sm font-normal text-white/30 sm:text-lg">/{s.limit}</span> : null}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-md border border-[#2a8fc4]/15 bg-[#2a8fc4]/8 px-2 py-0.5 text-[9px] font-medium text-[#5ab8e0]/60 sm:gap-1 sm:px-2.5 sm:text-[10px]">
              <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> {s.trend}
            </span>
          </div>
          {s.limit !== undefined && (
            <div className="relative mt-3.5 space-y-1 sm:mt-4">
              <div className="h-1.5 overflow-hidden rounded-full bg-[#2a8fc4]/8">
                <div className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${pct}%`, background: exceeded ? "linear-gradient(90deg, #f87171, #ef4444)" : "linear-gradient(90deg, #2a8fc4, #5ab8e0)", boxShadow: "0 0 8px rgba(42,143,196,0.4)" }}
                />
              </div>
              {exceeded && (
                <p className="flex items-center gap-1 text-[9px] font-semibold text-[#f87171] sm:text-[10px]">
                  <AlertTriangle className="h-2.5 w-2.5" /> Limite excedido · reseta em {23 - new Date().getHours()}h
                </p>
              )}
            </div>
          )}
          <div className="relative mt-3.5 sm:mt-4">
            <Sparkline data={s.spark} accent={true} />
          </div>
        </div>
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
  type IpCard = {
    ip: string;
    country: string;
    countryCode: string;
    region: string;
    city: string;
    lat: number;
    lon: number;
    timezone: string;
    isp: string;
    org: string;
    asn: string;
    reverse: string;
    isProxy: boolean;
    isDatacenter: boolean;
    isMobile: boolean;
  };
  type Section = { title: string; icon?: string; collapsible?: boolean; fields?: Field[]; list?: string[]; links?: { label: string; url: string }[]; credentials?: CredentialCard[]; ipCards?: IpCard[] };
  type OsintResult = { ok: boolean; tool: string; query: string; summary?: string; sections: Section[]; sources: string[]; error?: string };
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OsintResult | null>(null);
  const [pixResult, setPixResult] = useState<ReturnType<typeof decodePix> | null>(null);
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [recentSearches, setRecentSearches] = useState<{ query: string; tool: string; date: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem("recentSearches") || "[]"); } catch { return []; }
  });
  const [showActivate, setShowActivate] = useState(false);
  const [licenseKey, setLicenseKey] = useState("");
  const [activating, setActivating] = useState(false);
  const [credPage, setCredPage] = useState(1);
  const [credPageSize, setCredPageSize] = useState(12);
  const [credFilter, setCredFilter] = useState<string | null>(null);
  const [activateError, setActivateError] = useState("");
  const [activateOk, setActivateOk] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchAccount = useServerFn(getMyAccount);
  const doRedeem = useServerFn(redeemLicenseKey);
  const { data: acc } = useQuery({ queryKey: ["account"], queryFn: () => fetchAccount({}), refetchInterval: 5000 });
  const qc = useQueryClient();

  const plan = (acc?.subscription as any)?.plans;
  const isPremium = plan?.id && plan.id !== 'economic';
  const limits = { daily: plan?.daily_search_limit ?? 5, monthly: plan?.monthly_result_limit ?? 300 };
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

  useEffect(() => {
    setPixResult(null);
  }, [activeTool]);

  async function runSearch() {
    if (!query.trim() || tool.soon) return;
    if (activeTool === "pix") {
      setPixResult(decodePix(query));
      return;
    }
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
    const exportData = {
      ...result,
      sections: result.sections.map(s => ({
        ...s,
        credentials: !isPremium && s.credentials
          ? s.credentials.slice(0, credPageSize)
          : s.credentials,
        ipCards: !isPremium && s.ipCards
          ? s.ipCards.slice(0, 3)
          : s.ipCards,
      })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `osint-${activeTool}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="relative flex min-h-screen text-foreground dashboard-root"
      style={{ background: "linear-gradient(180deg, #0a0e1a 0%, #0d1225 50%, #0a0e1a 100%)", minHeight: "100vh" }}
    >
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
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#060a14]" style={{ perspective: "1200px", transformStyle: "preserve-3d" }}>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(42,143,196,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(42,143,196,0.08)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />
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
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[#2a8fc4]/10 bg-[#060a14]/95 backdrop-blur-3xl transition-transform lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ boxShadow: "inset -1px 0 0 rgba(42,143,196,0.08), 4px 0 24px -8px rgba(0,0,0,0.5)" }}
      >
        <div className="flex items-center justify-between border-b border-[#2a8fc4]/8 px-5 py-4">
          <Link to="/" className="group flex items-center gap-3">
            <div className="relative transition duration-300 group-hover:scale-105">
              <NoxLogo className="h-12 w-auto" />
              <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full shadow-[0_0_8px_rgba(90,184,224,0.8)]" style={{ background: "#5ab8e0" }} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold tracking-[0.15em] text-white">NOXINTEL</span>
              <span className="mt-0.5 text-[8px] font-medium uppercase tracking-[0.15em] text-[#5ab8e0]/40">OSINT Suite</span>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#2a8fc4]/10 text-white/40 transition-colors hover:border-[#2a8fc4]/25 hover:text-white/70 lg:hidden" aria-label="Fechar menu">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <p className="px-3 pb-1.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-[#5ab8e0]/30">Ferramentas</p>
          <div className="space-y-0.5">
            {TOOLS.map(t => {
              const active = activeTool === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => { if (t.soon) return; cancelSearch(); setActiveTool(t.id); setQuery(t.sample); setResult(null); setSidebarOpen(false); }}
                  disabled={t.soon}
                  className={`tool-icon tool-icon-fill group relative flex w-full items-center gap-2.5 overflow-hidden rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-300 ${
                    active
                      ? "text-white"
                      : "text-white/40"
                  } ${t.soon ? "opacity-30 cursor-not-allowed" : ""}`}
                  style={active ? {
                    background: "linear-gradient(135deg, rgba(42,143,196,0.25), rgba(90,184,224,0.08))",
                    boxShadow: "inset 0 0 0 1px rgba(90,184,224,0.2), 0 0 20px -8px rgba(42,143,196,0.3)",
                  } : {}}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full" style={{ background: "#5ab8e0", boxShadow: "0 0 12px rgba(90,184,224,0.6)" }} />
                  )}
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-300 relative z-10 icon-ring ${
                    active
                      ? "text-[#5ab8e0]"
                      : "text-white/30 group-hover:text-white/50"
                  }`} style={active ? { background: "rgba(42,143,196,0.15)", boxShadow: "0 0 12px rgba(42,143,196,0.15)" } : {}}>
                    <t.icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 truncate text-left font-medium">{t.label}</span>
                  {t.tag && !t.soon && (
                    <span className="rounded-md bg-[#2a8fc4]/10 border border-[#2a8fc4]/15 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-[#5ab8e0]/60">{t.tag}</span>
                  )}
                  {t.soon && (
                    <span className="rounded-md border border-[#2a8fc4]/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-white/30">Em breve</span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="mt-6 px-3 pb-1.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-[#5ab8e0]/30">Geral</p>
          <div className="space-y-0.5">
            <Link to="/planos" className="group relative flex w-full items-center gap-2.5 overflow-hidden rounded-lg px-2.5 py-2 text-sm font-medium text-white/40 transition-all duration-300 hover:text-white/70 hover:bg-[#2a8fc4]/5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/30 transition-all duration-300 group-hover:text-white/50">
                <CreditCard className="h-4 w-4" />
              </span>
              <span className="flex-1 truncate text-left font-medium">Planos & Pagamento</span>
            </Link>
            <Link to="/conta" className="group relative flex w-full items-center gap-2.5 overflow-hidden rounded-lg px-2.5 py-2 text-sm font-medium text-white/40 transition-all duration-300 hover:text-white/70 hover:bg-[#2a8fc4]/5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/30 transition-all duration-300 group-hover:text-white/50">
                <Settings className="h-4 w-4" />
              </span>
              <span className="flex-1 truncate text-left font-medium">Minha conta</span>
            </Link>
            <button
              onClick={async () => {
                const { clearToken } = await import("@/lib/session");
                clearToken();
                window.location.href = "/";
              }}
              className="group relative flex w-full items-center gap-2.5 overflow-hidden rounded-lg px-2.5 py-2 text-sm font-medium text-white/40 transition-all duration-300 hover:text-[#f87171] hover:bg-[#f87171]/5"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/30 transition-all duration-300 group-hover:text-[#f87171]">
                <LogOut className="h-4 w-4" />
              </span>
              <span className="flex-1 truncate text-left font-medium">Sair</span>
            </button>
          </div>
        </nav>

        {acc?.subscription ? (
          <div className="border-t border-[#2a8fc4]/8 p-3">
            <div className="relative overflow-hidden rounded-xl p-3" style={{ background: "linear-gradient(135deg, rgba(42,143,196,0.15), rgba(90,184,224,0.06))", boxShadow: "inset 0 0 0 1px rgba(90,184,224,0.12), 0 0 20px -8px rgba(42,143,196,0.15)" }}>
              <div className="absolute -right-8 -top-8 h-16 w-16 rounded-full blur-2xl" style={{ background: "rgba(90,184,224,0.2)" }} />
              <div className="relative">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" style={{ color: "#5ab8e0" }} />
                  <p className="text-xs font-semibold text-white">{(acc.subscription as any).plans?.name || "Plano"}</p>
                </div>
                <p className="mt-1 text-[10px] text-white/40">Buscas: <span className="font-medium text-white/80">{acc.today.searches}</span> / {(acc.subscription as any).plans?.daily_search_limit || "—"}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((acc.today.searches / ((acc.subscription as any).plans?.daily_search_limit || 1)) * 100, 100)}%`, background: "linear-gradient(90deg, #2a8fc4, #5ab8e0)" }}
                  />
                </div>
                <button className="mt-2.5 w-full rounded-lg py-1.5 text-[10px] font-semibold text-white transition-all duration-200 active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #2a8fc4, #5ab8e0)", boxShadow: "0 4px 12px -4px rgba(42,143,196,0.3), inset 0 1px 0 rgba(255,255,255,0.15)" }}
                >
                  Fazer upgrade
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-t border-[#2a8fc4]/8 p-3">
            <div className="relative overflow-hidden rounded-xl p-3" style={{ background: "linear-gradient(135deg, rgba(42,143,196,0.15), rgba(90,184,224,0.06))", boxShadow: "inset 0 0 0 1px rgba(90,184,224,0.12), 0 0 20px -8px rgba(42,143,196,0.15)" }}>
              <div className="absolute -right-8 -top-8 h-16 w-16 rounded-full blur-2xl" style={{ background: "rgba(90,184,224,0.2)" }} />
              <div className="relative">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" style={{ color: "#5ab8e0" }} />
                  <p className="text-xs font-semibold text-white">Sem plano</p>
                </div>
                <p className="mt-1 text-[10px] text-white/40">Ative seu plano para começar</p>
                <button onClick={() => setShowActivate(true)}
                  className="mt-2.5 w-full rounded-lg py-1.5 text-[10px] font-semibold text-white transition-all duration-200 active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #2a8fc4, #5ab8e0)", boxShadow: "0 4px 12px -4px rgba(42,143,196,0.3), inset 0 1px 0 rgba(255,255,255,0.15)" }}
                >
                  Ativar plano
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>

      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#2a8fc4]/8 bg-[#060a14]/80 px-3 py-2 sm:px-6 sm:py-3 backdrop-blur-3xl"
          style={{ boxShadow: "0 1px 0 rgba(42,143,196,0.08), 0 4px 24px -8px rgba(0,0,0,0.4)" }}
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <button onClick={() => setSidebarOpen(true)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2a8fc4]/10 text-white/50 transition-colors hover:border-[#2a8fc4]/25 hover:text-white/80 lg:hidden" aria-label="Abrir menu">
              <Menu className="h-4 w-4" />
            </button>
            <div className="hidden sm:block">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#5ab8e0]/40">Painel</p>
              <h1 className="text-base font-semibold text-white">Bem-vindo de volta, <span className="text-gradient-primary">{acc?.profile?.full_name || acc?.profile?.email?.split("@")[0] || "Analista"}</span></h1>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-[#2a8fc4]/10 text-white/40 transition-all hover:border-[#2a8fc4]/25 hover:text-white/70 hover:bg-[#2a8fc4]/5" aria-label="Notificações">
              <Bell className="h-3.5 w-3.5" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#5ab8e0] shadow-[0_0_8px_rgba(90,184,224,0.8)]" />
            </button>
            <div className="relative">
              <button onClick={() => setShowSettings(s => !s)} className="flex items-center gap-2.5 rounded-lg border border-[#2a8fc4]/10 bg-[#2a8fc4]/5 px-2.5 py-1.5 transition-all hover:border-[#2a8fc4]/25 hover:bg-[#2a8fc4]/10 sm:px-3"
                style={{ boxShadow: "inset 0 1px 0 rgba(42,143,196,0.1)" }}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #2a8fc4, #5ab8e0)", boxShadow: "0 0 12px rgba(42,143,196,0.3)" }}
                >
                  {(acc?.profile?.full_name || acc?.profile?.email || "N")
                    .split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-[13px] font-medium leading-tight text-white">{acc?.profile?.full_name || acc?.profile?.email?.split("@")[0] || "Analista"}</p>
                  <p className="text-[9px] text-white/30 leading-tight">{isPremium ? "Premium" : "Gratuito"}</p>
                </div>
                <ChevronDown className="h-3 w-3 text-white/30" />
              </button>
              {showSettings && (
                <div className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border border-[#2a8fc4]/15 bg-[#0d111c] shadow-xl shadow-black/40">
                  <Link to="/conta" className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-white/70 transition-colors hover:bg-[#2a8fc4]/10 hover:text-white" onClick={() => setShowSettings(false)}>
                    <Settings className="h-4 w-4" /> Minha conta
                  </Link>
                  <button
                    onClick={async () => {
                      const { clearToken } = await import("@/lib/session");
                      clearToken();
                      window.location.href = "/";
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-white/70 transition-colors hover:bg-red-500/10 hover:text-red-400"
                  >
                    <LogOut className="h-4 w-4" /> Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 space-y-3 p-3 sm:space-y-6 sm:p-5 lg:p-8">
          {/* Stats */}
          <div className="-mx-2 flex snap-x snap-mandatory gap-2 overflow-x-auto px-2 pb-1 sm:mx-0 sm:grid sm:snap-none sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <StatCard key={s.label} s={s} />
            ))}
          </div>

          {/* Tool chips */}
          <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2.5">
            {TOOLS.map(t => {
              const active = activeTool === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => { if (t.soon) return; cancelSearch(); setActiveTool(t.id); setQuery(t.sample); setResult(null); }}
                  className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg h-8 px-3 text-[10px] font-medium transition-all duration-300 sm:gap-2 sm:h-9 sm:px-4 sm:text-xs ${
                    active
                      ? "text-white border-0"
                      : "border border-[#2a8fc4]/10 text-white/50 hover:text-white/80 hover:border-[#2a8fc4]/20 hover:bg-[#2a8fc4]/5"
                  } ${t.soon ? "opacity-40 cursor-not-allowed" : ""}`}
                  style={active ? {
                    background: "linear-gradient(135deg, #2a8fc4, #5ab8e0)",
                    boxShadow: "0 4px 20px -4px rgba(42,143,196,0.45), 0 0 0 1px rgba(255,255,255,0.08) inset",
                  } : { background: "rgba(10,15,24,0.6)" }}
                  disabled={t.soon}
                >
                  <t.icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {t.label}
                  {t.soon && <span className="text-[9px] uppercase tracking-wider opacity-70">soon</span>}
                </button>
              );
            })}
          </div>

          {/* Search console */}
          <div className="relative mx-auto w-full max-w-[1200px]">
            <form className="space-y-1.5 sm:space-y-4" onSubmit={e => { e.preventDefault(); runSearch(); }}>
              <div className="group relative mx-auto w-full">
                <div
                  className="relative flex min-h-[50px] items-center overflow-hidden rounded-xl border border-[#2a8fc4]/15 bg-[#0a0f18]/80 shadow-elevated transition-all duration-300 sm:min-h-[74px] group-focus-within:border-[#2a8fc4]/40 group-focus-within:shadow-[0_0_0_1px_rgba(42,143,196,0.25)_inset,0_0_40px_-12px_rgba(42,143,196,0.25),0_14px_32px_rgba(0,0,0,0.3)]"
                  style={{ backdropFilter: "blur(24px)" }}
                >
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#2a8fc4]/8 via-[#5ab8e0]/3 to-transparent" />
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-36 bg-gradient-to-l from-[#2a8fc4]/6 via-[#5ab8e0]/2 to-transparent" />
                  <div className="pointer-events-none absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-[#2a8fc4]/20 to-transparent" />

                  <div className="relative z-10 ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#2a8fc4]/15 bg-[#0a0f18]/60 text-muted-foreground shadow-[inset_0_1px_0_rgba(42,143,196,0.1)] transition-colors duration-300 group-focus-within:text-[#5ab8e0] sm:ml-4 sm:h-12 sm:w-12"
                    style={{ boxShadow: "0 0 12px rgba(42,143,196,0.1)" }}
                  >
                    <Fingerprint className="h-4 w-4 transition-colors duration-200 sm:h-5 sm:w-5 group-focus-within:text-[#5ab8e0]" />
                  </div>

                  <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") runSearch(); }}
                    className="h-[50px] min-w-0 flex-1 border-0 bg-transparent px-3 pr-[7rem] text-sm font-medium text-muted-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0 focus-visible:ring-0 sm:h-[74px] sm:px-5 sm:pr-[12.25rem] sm:text-base"
                    placeholder={
                      activeTool === "pix" 
                        ? "Cole o código Pix (copia e cola)..." 
                        : activeTool === "wifi"
                        ? "Digite o endereço MAC (BSSID) ou o Nome da Rede (SSID)..."
                        : activeTool === "photolocation"
                        ? "Digite uma localidade/ponto de referência ou use o link para enviar a foto..."
                        : `Digite para buscar em ${tool.label}...`
                    }
                    autoComplete="off"
                  />

                  <div className="absolute right-3 z-10 flex items-center gap-2 sm:right-4">
                    <button
                      type="button"
                      onClick={() => setShowSettings(true)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#2a8fc4]/15 bg-[#0a0f18]/40 text-muted-foreground transition-colors hover:bg-[#2a8fc4]/10 hover:text-[#5ab8e0] sm:h-9 sm:w-9 sm:rounded-xl"
                      aria-label="Configure Modules"
                    >
                      <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                    </button>
                    <button
                      type="submit"
                      disabled={busy || tool.soon}
                      className="group/btn relative inline-flex h-9 items-center justify-center gap-1.5 overflow-hidden rounded-full px-4 text-xs font-bold uppercase tracking-wider text-white transition-all duration-200 active:scale-95 disabled:opacity-50 sm:h-10 sm:gap-2 sm:px-6 sm:text-sm"
                      style={{
                        background: "linear-gradient(180deg, #2a8fc4 49.18%, #5ab8e0 113.93%)",
                        boxShadow: "0 0 6px 0 rgba(42,143,196,0.3), 0 -2px 0 0 rgba(0, 0, 0, 0.20) inset, 0 1px 0 0 rgba(255, 255, 255, 0.40) inset, 0 0 24px -4px rgba(42,143,196,0.4)",
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
              <div className="relative overflow-hidden rounded-xl border border-[#2a8fc4]/8">
                <div className="relative rounded-xl bg-[#060a14]/80 px-4 py-3 sm:px-5 sm:py-4" style={{ boxShadow: "inset 0 0 0 1px rgba(90,184,224,0.06), 0 2px 12px -4px rgba(0,0,0,0.3)" }}>
                  <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-b from-[#2a8fc4]/5 to-transparent" />
 

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
                    <div className="relative overflow-hidden rounded-xl border border-[#2a8fc4]/8 bg-[#2a8fc4]/3 p-3.5 sm:p-4"
                      style={{ boxShadow: "0 2px 12px -4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(42,143,196,0.06)" }}
                    >
                      <div aria-hidden className="absolute -right-12 -top-12 h-32 w-32 rounded-full blur-3xl" style={{ background: "rgba(42,143,196,0.12)" }} />
                      <div className="relative mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full shadow-[0_0_8px_rgba(42,143,196,0.6)]" style={{ background: "#5ab8e0" }} />
                          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/50">Auditoria de credencial sensível</span>
                        </div>
                        <div className="flex gap-1.5">
                          <span className="rounded border border-[#2a8fc4]/10 bg-[#2a8fc4]/5 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-[#5ab8e0]/50">HIBP/v3</span>
                          <span className="rounded border border-[#2a8fc4]/10 bg-[#2a8fc4]/5 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-tighter text-[#5ab8e0]/50">k-anonymity</span>
                        </div>
                      </div>

                      <div className="relative group/pwd flex items-center gap-2 rounded-xl border border-[#2a8fc4]/10 bg-[#2a8fc4]/3 p-1.5 transition focus-within:border-[#2a8fc4]/25">
                        <Lock className="ml-2 h-4 w-4 text-white/30" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-transparent py-2 font-mono text-sm tracking-tight outline-none placeholder:text-white/30 text-white/70"
                          placeholder="Verificar se uma senha vazou (opcional)"
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="mr-1 rounded-md p-1.5 text-white/30 transition hover:bg-[#2a8fc4]/8 hover:text-white/60"
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

                      <p className="relative mt-3 font-mono text-[9px] text-white/30">
                        <span className="text-[#5ab8e0]">•</span> A senha nunca é enviada — SHA-1 (5 chars) via HIBP.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Pix decoder panel */}
          {activeTool === "pix" && (
            <section className="relative overflow-hidden rounded-2xl border border-[#2a8fc4]/8">
              <div style={{ boxShadow: "inset 0 0 0 1px rgba(42,143,196,0.06), 0 2px 12px -4px rgba(0,0,0,0.3)" }} className="relative rounded-2xl bg-[#060a14]/80 p-4 sm:p-5">
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-[#2a8fc4]/5 to-transparent" />
                <div className="relative flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">Decodificador Pix</span>
                    <span className="rounded-md bg-[#2a8fc4]/8 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#5ab8e0]/40">EMV / BR Code</span>
                  </div>
                  {pixResult && (
                    <span className={`rounded-md px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${pixResult.ok ? (pixResult.crcValid ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400") : "bg-red-500/15 text-red-400"}`}>
                      {pixResult.ok ? (pixResult.crcValid ? "CRC válido" : "CRC inválido") : "erro"}
                    </span>
                  )}
                </div>

                {!pixResult && (
                  <div className="relative mt-3 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#2a8fc4]/10 bg-[#2a8fc4]/3 px-6 py-10 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2a8fc4]/15 text-[#5ab8e0]">
                      <QrCode className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-medium text-white/70">Nenhum código decodificado</p>
                    <p className="text-xs text-[#5ab8e0]/40">Cole um código Pix (copia e cola) acima e clique em Buscar.</p>
                  </div>
                )}

                {pixResult && !pixResult.ok && (
                  <div className="relative mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                    <p className="flex items-center gap-2 font-semibold">
                      <AlertTriangle className="h-4 w-4" /> Falha ao decodificar
                    </p>
                    <p className="mt-1 text-red-400/80">{pixResult.error}</p>
                  </div>
                )}

                {pixResult && pixResult.ok && (
                  <div className="relative mt-3 grid gap-4 lg:grid-cols-[280px_1fr]">
                    {/* QR Code */}
                    <div className="flex flex-col items-center gap-3 rounded-xl border border-[#2a8fc4]/8 bg-[#2a8fc4]/3 p-4">
                      <div className="rounded-xl bg-white p-3 shadow-lg">
                        <QRCodeSVG value={query.trim()} size={200} level="M" />
                      </div>
                      <p className="text-[10px] text-[#5ab8e0]/40">QR Code gerado a partir do código informado</p>
                    </div>

                    {/* Info + structure */}
                    <div className="space-y-4">
                      <div className="rounded-xl border border-[#2a8fc4]/8 bg-[#2a8fc4]/3 p-3.5">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#5ab8e0]/40">Informações do Pix</p>
                        <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                          {pixResult.info.tipo !== "Desconhecido" && (
                            <div className="flex flex-col rounded-lg border border-[#2a8fc4]/6 bg-[#2a8fc4]/3 p-2.5">
                              <dt className="text-[9px] font-medium uppercase tracking-wider text-[#5ab8e0]/40">Tipo</dt>
                              <dd className="mt-0.5 text-sm text-white/80">{pixResult.info.tipo}</dd>
                            </div>
                          )}
                          {pixResult.info.chavePix && (
                            <div className="flex flex-col rounded-lg border border-[#2a8fc4]/6 bg-[#2a8fc4]/3 p-2.5">
                              <dt className="text-[9px] font-medium uppercase tracking-wider text-[#5ab8e0]/40">Chave Pix</dt>
                              <dd className="mt-0.5 break-all font-mono text-sm text-white/80">{pixResult.info.chavePix}</dd>
                            </div>
                          )}
                          {pixResult.info.nome && (
                            <div className="flex flex-col rounded-lg border border-[#2a8fc4]/6 bg-[#2a8fc4]/3 p-2.5">
                              <dt className="text-[9px] font-medium uppercase tracking-wider text-[#5ab8e0]/40">Nome do recebedor</dt>
                              <dd className="mt-0.5 break-all text-sm text-white/80">{pixResult.info.nome}</dd>
                            </div>
                          )}
                          {pixResult.info.cidade && (
                            <div className="flex flex-col rounded-lg border border-[#2a8fc4]/6 bg-[#2a8fc4]/3 p-2.5">
                              <dt className="text-[9px] font-medium uppercase tracking-wider text-[#5ab8e0]/40">Cidade</dt>
                              <dd className="mt-0.5 text-sm text-white/80">{pixResult.info.cidade}</dd>
                            </div>
                          )}
                          {pixResult.info.valor && (
                            <div className="flex flex-col rounded-lg border border-[#2a8fc4]/6 bg-[#2a8fc4]/3 p-2.5">
                              <dt className="text-[9px] font-medium uppercase tracking-wider text-[#5ab8e0]/40">Valor</dt>
                              <dd className="mt-0.5 text-sm text-emerald-400">{pixResult.info.valor}</dd>
                            </div>
                          )}
                          {pixResult.info.moeda && (
                            <div className="flex flex-col rounded-lg border border-[#2a8fc4]/6 bg-[#2a8fc4]/3 p-2.5">
                              <dt className="text-[9px] font-medium uppercase tracking-wider text-[#5ab8e0]/40">Moeda</dt>
                              <dd className="mt-0.5 text-sm text-white/80">{pixResult.info.moeda}</dd>
                            </div>
                          )}
                          {pixResult.info.descricao && (
                            <div className="flex flex-col rounded-lg border border-[#2a8fc4]/6 bg-[#2a8fc4]/3 p-2.5">
                              <dt className="text-[9px] font-medium uppercase tracking-wider text-[#5ab8e0]/40">Descrição / txid</dt>
                              <dd className="mt-0.5 break-all text-sm text-white/80">{pixResult.info.descricao}</dd>
                            </div>
                          )}
                          {pixResult.info.url && (
                            <div className="flex flex-col rounded-lg border border-[#2a8fc4]/6 bg-[#2a8fc4]/3 p-2.5">
                              <dt className="text-[9px] font-medium uppercase tracking-wider text-[#5ab8e0]/40">URL</dt>
                              <dd className="mt-0.5 break-all font-mono text-sm text-white/80">{pixResult.info.url}</dd>
                            </div>
                          )}
                        </dl>
                      </div>

                      {/* Estrutura decodificada */}
                      <div className="rounded-xl border border-[#2a8fc4]/8 bg-[#2a8fc4]/3 p-3.5">
                        <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.15em] text-[#5ab8e0]/40">Estrutura decodificada (EMV)</p>
                        <div className="space-y-1.5">
                          {pixResult.fields.map((f, i) => (
                            <div key={i} className="rounded-lg border border-[#2a8fc4]/6 bg-[#2a8fc4]/3 p-2.5">
                              <div className="flex items-center gap-2">
                                <span className="rounded bg-[#0a0a0f]/80 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#5ab8e0]/70">{f.id}</span>
                                <span className="text-[11px] font-medium text-white/70">{f.label}</span>
                              </div>
                              <p className="mt-1 break-all font-mono text-xs text-white/80">{f.value}</p>
                              {f.subfields && f.subfields.length > 0 && (
                                <div className="mt-2 space-y-1 border-l border-[#2a8fc4]/15 pl-3">
                                  {f.subfields.map((s, j) => (
                                    <div key={j}>
                                      <div className="flex items-center gap-2">
                                        <span className="rounded bg-[#0a0a0f]/80 px-1.5 py-0.5 font-mono text-[8px] font-bold text-[#5ab8e0]/50">{s.id}</span>
                                        <span className="text-[10px] text-white/50">{s.label}</span>
                                      </div>
                                      <p className="mt-0.5 break-all font-mono text-[11px] text-white/70">{s.value}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Recent searches */}
          {recentSearches.length > 0 && !result && (
            <div className="relative overflow-hidden rounded-xl border border-[#2a8fc4]/8 bg-[#060a14]/80">
              <div className="relative px-4 py-3 sm:px-5 sm:py-4">
                <p className="mb-2.5 text-[9px] font-bold uppercase tracking-[0.15em] text-[#5ab8e0]/40">Buscas recentes</p>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((s, i) => (
                    <div key={`${s.query}-${s.tool}-${i}`} className="group/pill relative">
                      <button
                        onClick={() => { setQuery(s.query); setActiveTool(s.tool as typeof activeTool); }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a8fc4]/10 bg-[#2a8fc4]/5 px-2.5 py-1.5 text-[10px] font-medium text-white/50 transition hover:border-[#2a8fc4]/20 hover:text-white/80 hover:bg-[#2a8fc4]/10"
                      >
                        <span className="text-[8px] font-bold text-[#5ab8e0]">{TOOLS.find(t => t.id === s.tool)?.label.slice(0, 2).toUpperCase() || "?"}</span>
                        <span className="max-w-[140px] truncate">{s.query}</span>
                        <span className="text-[8px] text-white/30">• {new Date(s.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                      </button>
                      <button
                        onClick={() => {
                          const updated = recentSearches.filter((_, idx) => idx !== i);
                          setRecentSearches(updated);
                          localStorage.setItem("recentSearches", JSON.stringify(updated));
                        }}
                        className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-[#2a8fc4]/15 bg-[#060a14] text-[9px] text-white/30 opacity-0 transition hover:text-red-400 group-hover/pill:opacity-100"
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
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
              <div
                className="relative w-full max-w-sm overflow-hidden rounded-xl border border-[#2a8fc4]/10 bg-[#060a14]"
                style={{ boxShadow: "0 24px 48px -12px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(42,143,196,0.08), 0 0 60px -20px rgba(42,143,196,0.2)" }}
                onClick={e => e.stopPropagation()}
              >
                <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-b from-[#2a8fc4]/5 to-transparent" />
                <div className="relative flex items-center justify-between border-b border-[#2a8fc4]/8 px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2a8fc4]/15 text-[#5ab8e0]">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Ativar plano</h3>
                      <p className="text-[9px] text-[#5ab8e0]/50">Insira sua chave de licença</p>
                    </div>
                  </div>
                  <button onClick={() => { setShowActivate(false); setActivateError(""); setActivateOk(false); }} className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#2a8fc4]/10 text-white/40 transition hover:border-[#2a8fc4]/25 hover:text-white/70">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="relative p-4">
                  {activateOk ? (
                    <div className="flex flex-col items-center gap-3 py-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-emerald-400">Plano ativado com sucesso!</p>
                      <button onClick={() => { setShowActivate(false); setActivateOk(false); window.location.reload(); }} className="rounded-lg px-6 py-2 text-[10px] font-bold text-white"
                        style={{ background: "linear-gradient(135deg, #2a8fc4, #5ab8e0)" }}>
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
                        className="w-full rounded-xl border border-[#2a8fc4]/10 bg-[#2a8fc4]/3 px-4 py-3 text-sm font-mono text-white/70 outline-none transition focus:border-[#2a8fc4]/30 focus:shadow-[0_0_20px_-8px_rgba(42,143,196,0.3)] placeholder:text-white/30"
                        autoFocus
                      />
                      {activateError && <p className="mt-2 text-xs text-red-400">{activateError}</p>}
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
                        className="mt-3 w-full rounded-lg py-2.5 text-[10px] font-bold text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg, #2a8fc4, #5ab8e0)", boxShadow: "0 4px 14px -2px rgba(42,143,196,0.35), inset 0 1px 0 rgba(255,255,255,0.15)" }}
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
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
              <div
                className="relative w-full max-w-md overflow-hidden rounded-xl border border-[#2a8fc4]/10 bg-[#060a14]"
                style={{ boxShadow: "0 24px 48px -12px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(42,143,196,0.08), 0 0 60px -20px rgba(42,143,196,0.2)" }}
                onClick={e => e.stopPropagation()}
              >
                <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-b from-[#2a8fc4]/5 to-transparent" />
                <div className="relative flex items-center justify-between border-b border-[#2a8fc4]/8 px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2a8fc4]/15 text-[#5ab8e0]">
                      <Settings className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Configurações</h3>
                      <p className="text-[9px] text-[#5ab8e0]/50">Módulos e preferências</p>
                    </div>
                  </div>
                  <button onClick={() => setShowSettings(false)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#2a8fc4]/10 text-white/40 transition hover:border-[#2a8fc4]/25 hover:text-white/70">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="relative space-y-4 p-4">
                  <div>
                    <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-[#5ab8e0]/40">Preferências de busca</p>
                    <div className="space-y-1.5">
                      <label className="flex items-center justify-between rounded-lg border border-[#2a8fc4]/8 bg-[#2a8fc4]/3 px-4 py-3 transition hover:bg-[#2a8fc4]/6 cursor-pointer">
                        <div className="flex items-center gap-2.5">
                          <Clock className="h-4 w-4 text-[#5ab8e0]/50" />
                          <span className="text-xs font-medium text-white/60">Salvar histórico</span>
                        </div>
                        <div className="relative flex h-5 w-9 cursor-pointer items-center rounded-full bg-[#2a8fc4]/40 transition-colors">
                          <div className="h-3.5 w-3.5 translate-x-1 rounded-full bg-white shadow transition-transform" />
                        </div>
                      </label>
                      <label className="flex items-center justify-between rounded-lg border border-[#2a8fc4]/8 bg-[#2a8fc4]/3 px-4 py-3 transition hover:bg-[#2a8fc4]/6 cursor-pointer">
                        <div className="flex items-center gap-2.5">
                          <Zap className="h-4 w-4 text-[#5ab8e0]/50" />
                          <span className="text-xs font-medium text-white/60">Busca automática</span>
                        </div>
                        <div className="relative flex h-5 w-9 cursor-pointer items-center rounded-full bg-[#2a8fc4]/30 transition-colors">
                          <div className="h-3.5 w-3.5 translate-x-1 rounded-full bg-white shadow transition-transform" />
                        </div>
                      </label>
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-[#5ab8e0]/40">Exibição</p>
                    <div className="space-y-1.5">
                      <label className="flex items-center justify-between rounded-lg border border-[#2a8fc4]/8 bg-[#2a8fc4]/3 px-4 py-3 transition hover:bg-[#2a8fc4]/6 cursor-pointer">
                        <div className="flex items-center gap-2.5">
                          <Eye className="h-4 w-4 text-[#5ab8e0]/50" />
                          <span className="text-xs font-medium text-white/60">Modo compacto</span>
                        </div>
                        <div className="relative flex h-5 w-9 cursor-pointer items-center rounded-full bg-[#2a8fc4]/20 transition-colors">
                          <div className="h-3.5 w-3.5 translate-x-1 rounded-full bg-white shadow transition-transform" />
                        </div>
                      </label>
                      <div className="flex items-center justify-between rounded-lg border border-[#2a8fc4]/8 bg-[#2a8fc4]/3 px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Download className="h-4 w-4 text-[#5ab8e0]/50" />
                          <span className="text-xs font-medium text-white/60">Formato de exportação</span>
                        </div>
                        <select className="rounded-lg border border-[#2a8fc4]/10 bg-[#2a8fc4]/5 px-2 py-1 text-xs text-white/70 outline-none">
                          <option className="bg-[#060a14] text-white">JSON</option>
                          <option className="bg-[#060a14] text-white">CSV</option>
                          <option className="bg-[#060a14] text-white">PDF</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-[#5ab8e0]/40">Notificações</p>
                    <div className="space-y-1.5">
                      <label className="flex items-center justify-between rounded-lg border border-[#2a8fc4]/8 bg-[#2a8fc4]/3 px-4 py-3 transition hover:bg-[#2a8fc4]/6 cursor-pointer">
                        <div className="flex items-center gap-2.5">
                          <Bell className="h-4 w-4 text-[#5ab8e0]/50" />
                          <span className="text-xs font-medium text-white/60">Alertas de vazamento</span>
                        </div>
                        <div className="relative flex h-5 w-9 cursor-pointer items-center rounded-full bg-[#2a8fc4]/40 transition-colors">
                          <div className="h-3.5 w-3.5 translate-x-1 rounded-full bg-white shadow transition-transform" />
                        </div>
                      </label>
                      <label className="flex items-center justify-between rounded-lg border border-[#2a8fc4]/8 bg-[#2a8fc4]/3 px-4 py-3 transition hover:bg-[#2a8fc4]/6 cursor-pointer">
                        <div className="flex items-center gap-2.5">
                          <Mail className="h-4 w-4 text-[#5ab8e0]/50" />
                          <span className="text-xs font-medium text-white/60">Relatório semanal</span>
                        </div>
                        <div className="relative flex h-5 w-9 cursor-pointer items-center rounded-full bg-[#2a8fc4]/20 transition-colors">
                          <div className="h-3.5 w-3.5 translate-x-1 rounded-full bg-white shadow transition-transform" />
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="relative border-t border-[#2a8fc4]/8 bg-[#2a8fc4]/3 px-4 py-3">
                  <p className="text-center text-[9px] text-[#5ab8e0]/40">As configurações são salvas automaticamente.</p>
                </div>
              </div>
            </div>
          )}

          {/* Results panel */}
          <section className="relative overflow-hidden rounded-2xl border border-[#2a8fc4]/8">
            <div style={{ boxShadow: "inset 0 0 0 1px rgba(42,143,196,0.06), 0 2px 12px -4px rgba(0,0,0,0.3)" }} className="relative rounded-2xl bg-[#060a14]/80 p-4 sm:p-5">
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-[#2a8fc4]/5 to-transparent" />
              <div className="relative flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">Resultados</span>
                  <span className={`rounded-md px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${busy ? "bg-[#2a8fc4]/20 text-[#5ab8e0]" : result ? (result.ok ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400") : "bg-[#2a8fc4]/8 text-[#5ab8e0]/40"}`}>
                    {busy ? "buscando" : result ? (result.ok ? "concluído" : "erro") : "aguardando"}
                  </span>
                </div>
                <button
                  onClick={exportJson}
                  disabled={!result}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#2a8fc4]/10 h-8 px-3 text-[10px] font-medium text-white/40 transition-all duration-300 hover:text-white/70 hover:border-[#2a8fc4]/25 hover:bg-[#2a8fc4]/5 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Download className="h-3 w-3" /> Exportar
                </button>
              </div>

              {!result && !busy && (
                    <div className="relative mt-3 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#2a8fc4]/10 bg-[#2a8fc4]/3 px-6 py-10 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2a8fc4]/15 text-[#5ab8e0]">
                    <Search className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-medium text-white/70">Nenhuma busca realizada</p>
                  <p className="text-xs text-[#5ab8e0]/40">Digite um termo acima e clique em Buscar para começar.</p>
                </div>
              )}

              {busy && (
                <div className="relative mt-3 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#2a8fc4]/10 bg-[#2a8fc4]/3 px-6 py-10 text-center">
                  <Loader2 className="h-5 w-5 animate-spin text-[#5ab8e0]" />
                  <p className="text-sm text-white/50">Consultando fontes públicas...</p>
                </div>
              )}

              {result && !result.ok && (
                <div className="relative mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                  <p className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4" /> Falha na busca
                  </p>
                  <p className="mt-1 text-red-400/80">{result.error}</p>
                </div>
              )}

              {result && result.ok && (
                <div className="relative mt-3 space-y-4">
                  {result.summary && (
                    <div className="rounded-xl border border-[#2a8fc4]/8 bg-[#2a8fc4]/3 p-3.5">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#5ab8e0]/40">Resumo</p>
                      <p className="mt-1 truncate text-sm font-medium text-white/80">{result.summary}</p>
                    </div>
                  )}
                  {(() => {
                    const collapsibles = result.sections.map((s, i) => ({ s, i })).filter(x => x.s.collapsible && x.s.icon);
                    const regular = result.sections.map((s, i) => ({ s, i })).filter(x => !(x.s.collapsible && x.s.icon));
                    return (
                      <>
                        {regular.map(({ s: sec, i }) => (
                          <div key={i} className="rounded-xl border border-[#2a8fc4]/8 bg-[#2a8fc4]/3 p-3.5 sm:p-4">
                            <h4 className="mb-3 text-sm font-semibold text-white/80">{sec.title}</h4>
                            {sec.fields && sec.fields.length > 0 && (
                              <dl className="grid gap-2 sm:grid-cols-2">
                                {sec.fields.map((f, j) => {
                                  const isSensitive = !isPremium && (f.label === "CPF" || f.label.startsWith("Nome"));
                                  return (
                                  <div key={j} className={`flex flex-col rounded-lg border border-[#2a8fc4]/6 bg-[#2a8fc4]/3 p-2.5 ${isSensitive ? "relative overflow-hidden" : ""}`}>
                                    <dt className="text-[9px] font-medium uppercase tracking-wider text-[#5ab8e0]/40">{f.label}</dt>
                                    <dd className={`mt-0.5 break-all text-sm text-white/80 ${f.mono ? "font-mono" : ""} ${f.warn ? "text-red-400" : ""} ${f.ok ? "text-emerald-400" : ""} ${isSensitive ? "blur-sm select-none" : ""}`}>{isSensitive ? "••••••••••••" : f.value}</dd>
                                  </div>
                                  );
                                })}
                              </dl>
                            )}
                              {sec.list && sec.list.length > 0 && (
                              <div className="space-y-3 text-sm">
                                {(() => {
                                  const groups: { header: string; items: string[] }[] = [];
                                  let current: string[] = [];
                                  sec.list.forEach((it) => {
                                    if (it.startsWith("━━━")) {
                                      if (current.length) groups.push({ header: "", items: current });
                                      current = [];
                                      groups.push({ header: it, items: current });
                                    } else if (it.startsWith("── ") || it.startsWith("───")) {
                                      current = [];
                                      groups.push({ header: "", items: [it] });
                                    } else {
                                      groups.length ? groups[groups.length - 1].items.push(it) : current.push(it);
                                    }
                                  });
                                  if (current.length) groups.push({ header: "", items: current });
                                  return groups.map((g, gi) => (
                                    <div key={gi}>
                                      {g.header && (
                                        <div className="mb-2 flex items-center gap-2">
                                          <div className="h-px flex-1 bg-[#2a8fc4]/10" />
                                          <span className="shrink-0 text-[8px] font-bold uppercase tracking-[0.15em] text-[#5ab8e0]/50">{g.header.replace(/━━━/g, "").trim()}</span>
                                          <div className="h-px flex-1 bg-[#2a8fc4]/10" />
                                        </div>
                                      )}
                                      <ul className={gi > 0 ? "space-y-1" : "space-y-1"}>
                                        {g.items.map((it, j) => {
                                          const parts = it.match(/^── (.+) ──$/);
                                          if (parts) {
                                            return (
                                              <li key={j} className="mt-2 flex items-center gap-2">
                                                <div className="h-px flex-1 bg-[#2a8fc4]/10" />
                                                <span className="shrink-0 text-[8px] font-semibold uppercase tracking-wider text-[#5ab8e0]/40">{parts[1]}</span>
                                                <div className="h-px flex-1 bg-[#2a8fc4]/10" />
                                              </li>
                                            );
                                          }
                                          const colonIdx = it.indexOf(":");
                                          if (colonIdx > 0 && colonIdx < 30) {
                                            const label = it.slice(0, colonIdx);
                                            const value = it.slice(colonIdx + 1).trim();
                                            return (
                                              <li key={j} className="flex gap-2 rounded-lg border border-[#2a8fc4]/6 bg-[#2a8fc4]/3 px-3 py-1.5 font-mono text-xs text-white/70">
                                                <span className="shrink-0 text-white/30">{label}:</span>
                                                <span className="break-all text-white/80">{value}</span>
                                              </li>
                                            );
                                          }
                                          return (
                                            <li key={j} className="flex gap-2 rounded-lg border border-[#2a8fc4]/6 bg-[#2a8fc4]/3 px-3 py-1.5 font-mono text-xs text-white/70">
                                              <span className="shrink-0 text-white/30">•</span>
                                              <span className="break-all text-white/70">{it}</span>
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    </div>
                                  ));
                                })()}
                              </div>
                            )}
                            {sec.credentials && sec.credentials.length > 0 && (
                              (() => {
                                const rootHost = (u: string) => { try { const h = new URL(/^https?:\/\//i.test(u) ? u : 'https://' + u).hostname; const p = h.split('.'); const m = ['com.br','org.br','net.br','gov.br','edu.br','mil.br','co.uk','co.jp','com.au','com.cn']; return p.length >= 3 && m.includes(p.slice(-2).join('.')) ? p.slice(-3).join('.') : p.slice(-2).join('.'); } catch { try { const h = new URL('https://' + u.replace(/^[^:]+:\/\//, '')).hostname; const p = h.split('.'); const m = ['com.br','org.br','net.br','gov.br','edu.br','mil.br','co.uk','co.jp','com.au','com.cn']; return p.length >= 3 && m.includes(p.slice(-2).join('.')) ? p.slice(-3).join('.') : p.slice(-2).join('.'); } catch { return u; } } };
                                const domains = [...new Set(sec.credentials.map(c => rootHost(c.url)))].sort();
                                const filtered = credFilter ? sec.credentials.filter(c => rootHost(c.url) === credFilter) : sec.credentials;
                                const total = filtered.length;
                                const totalPages = Math.ceil(total / credPageSize);
                                const safePage = Math.min(credPage, Math.max(1, totalPages));
                                const start = (safePage - 1) * credPageSize;
                                const end = Math.min(start + credPageSize, total);
                                const pageItems = filtered.slice(start, end);
                                const visibleLimit = isPremium ? Infinity : safePage === 1 ? credPageSize : 0;
                                return (
                                  <>
                                    {domains.length > 1 && (
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <button onClick={() => { setCredFilter(null); setCredPage(1); }} className={`rounded-lg border px-2 py-1 text-[9px] font-medium transition ${credFilter === null ? 'border-[#5ab8e0]/30 text-[#5ab8e0] bg-[#2a8fc4]/15' : 'border-[#2a8fc4]/10 text-white/40 hover:text-white/70 hover:border-[#2a8fc4]/25'}`}>Todos</button>
                                        {domains.map(d => (
                                          <button key={d} onClick={() => { setCredFilter(d); setCredPage(1); }} className={`rounded-lg border p-1.5 transition ${credFilter === d ? 'border-[#5ab8e0]/30 bg-[#2a8fc4]/15' : 'border-[#2a8fc4]/10 hover:border-[#2a8fc4]/25'}`} title={d}>
                                            <img src={`https://www.google.com/s2/favicons?domain=${d}&sz=16`} alt="" className="h-4 w-4 rounded-sm" loading="lazy" />
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                    <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                      {pageItems.map((cred, j) => {
                                        const rootDomain = rootHost(cred.url);
                                           return (
                                           <div key={j} className="group relative overflow-hidden rounded-xl border border-[#2a8fc4]/15 bg-gradient-to-b from-[#0a0f18]/95 to-[#0b0c16]/90 p-4 transition-all duration-300 hover:border-[#2a8fc4]/30 hover:shadow-[0_8px_30px_rgb(42,143,196,0.1)] hover:-translate-y-[1px] text-white">
                                              {j >= visibleLimit && (
                                                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/90 backdrop-blur-sm">
                                                  <span className="text-[10px] font-medium text-white/60">Desbloqueie com</span>
                                                   <a href="/planos" className="inline-flex items-center justify-center rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white transition-all duration-200 active:scale-95"
                                                     style={{background: "linear-gradient(180deg, #2a8fc4 49.18%, #5ab8e0 113.93%)", boxShadow: "0 0 6px 0 rgba(42,143,196,0.3), 0 -2px 0 0 rgba(0,0,0,0.20) inset, 0 1px 0 0 rgba(255,255,255,0.40) inset, 0 0 24px -4px rgba(42,143,196,0.4)"}}
                                                   >COMPRAR PLANO</a>
                                                </div>
                                              )}
                                              <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[#2a8fc4]/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
                                              
                                              {/* Top Bar Header */}
                                              <div className="flex items-center justify-between pb-3 border-b border-[#2a8fc4]/10">
                                                <div className="flex items-center gap-2">
                                                  <span className="rounded bg-[#2a8fc4]/10 border border-[#2a8fc4]/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#5ab8e0] backdrop-blur-xl">
                                                    STEALER LOG
                                                  </span>
                                                  <img src={`https://www.google.com/s2/favicons?domain=${rootDomain}&sz=16`} alt="" className="h-4 w-4 rounded-sm" loading="lazy" />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <span className="font-mono text-[9px] text-white/40">#{cred.id.slice(0, 8)}</span>
                                                  <button onClick={() => {
                                                    navigator.clipboard.writeText(cred.id);
                                                    const alertDiv = document.createElement('div');
                                                    alertDiv.className = 'fixed bottom-4 right-4 z-50 rounded-lg bg-[#0a0f18] border border-[#2a8fc4]/30 text-[#5ab8e0] px-4 py-2 text-xs font-mono shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-2';
                                                    alertDiv.innerText = 'ID copiado!';
                                                    document.body.appendChild(alertDiv);
                                                    setTimeout(() => alertDiv.remove(), 2000);
                                                  }} className="rounded p-1 text-white/40 transition hover:text-white/80 hover:bg-white/5" title="Copy ID">
                                                    <Copy className="h-3 w-3" />
                                                  </button>
                                                </div>
                                              </div>

                                              {/* Date Meta Row (TOP) */}
                                              {cred.stolenDate || cred.discoveredDate ? (
                                                <div className="flex flex-wrap gap-1.5 pt-2 px-0.5">
                                                  {cred.stolenDate && (
                                                    <span className="inline-flex items-center gap-1 rounded bg-[#2a8fc4]/5 border border-[#2a8fc4]/10 px-2 py-0.5 text-[9px] font-medium text-[#5ab8e0]">
                                                      <Clock className="h-2.5 w-2.5" /> Vazado: {cred.stolenDate}
                                                    </span>
                                                  )}
                                                  {cred.discoveredDate && (
                                                    <span className="inline-flex items-center gap-1 rounded bg-[#2a8fc4]/5 border border-[#2a8fc4]/10 px-2 py-0.5 text-[9px] font-medium text-[#5ab8e0]">
                                                      <Shield className="h-2.5 w-2.5" /> Descoberto: {cred.discoveredDate}
                                                    </span>
                                                  )}
                                                </div>
                                              ) : null}

                                              {/* Hostname Link */}
                                              <div className="flex items-center gap-1.5 py-3 px-0.5">
                                                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-white/50 group-hover:text-[#5ab8e0] transition-colors" />
                                                <a href={cred.url} target="_blank" rel="noopener noreferrer" className="truncate font-mono text-xs text-white/85 hover:text-white transition-colors underline underline-offset-4 decoration-white/20 hover:decoration-[#5ab8e0]">
                                                  {cred.url}
                                                </a>
                                              </div>

                                              {/* Credential Blocks */}
                                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                                {/* Email Block */}
                                                <div 
                                                  onClick={() => {
                                                    navigator.clipboard.writeText(cred.email);
                                                    const toast = document.createElement('div');
                                                    toast.className = 'fixed bottom-4 right-4 z-50 rounded-lg bg-[#0a0f18] border border-[#2a8fc4]/30 text-[#5ab8e0] px-4 py-2 text-xs font-mono shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-2';
                                                    toast.innerText = 'E-mail copiado!';
                                                    document.body.appendChild(toast);
                                                    setTimeout(() => toast.remove(), 2000);
                                                  }}
                                                  className="relative flex flex-col gap-1 rounded-lg border border-[#2a8fc4]/10 bg-[#0a0a0f]/40 p-2.5 cursor-pointer select-none transition-all hover:bg-[#2a8fc4]/5 hover:border-[#2a8fc4]/25 hover:shadow-[0_0_12px_rgba(42,143,196,0.05)] active:scale-[0.98]"
                                                >
                                                  <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-[#5ab8e0]/60 font-semibold">
                                                    <User className="h-2.5 w-2.5" /> Usuário / Email
                                                  </span>
                                                  <span className="truncate font-mono text-xs text-white/90 break-all pr-5">{cred.email}</span>
                                                  <span className="absolute bottom-2 right-2 text-white/20 group-hover:text-white/40"><Copy className="h-2.5 w-2.5" /></span>
                                                </div>

                                                {/* Password Block */}
                                                <div 
                                                  onClick={() => {
                                                    navigator.clipboard.writeText(cred.password);
                                                    const toast = document.createElement('div');
                                                    toast.className = 'fixed bottom-4 right-4 z-50 rounded-lg bg-[#0a0f18] border border-[#2a8fc4]/30 text-[#5ab8e0] px-4 py-2 text-xs font-mono shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-2';
                                                    toast.innerText = 'Senha copiada!';
                                                    document.body.appendChild(toast);
                                                    setTimeout(() => toast.remove(), 2000);
                                                  }}
                                                  className="relative flex flex-col gap-1 rounded-lg border border-[#2a8fc4]/10 bg-[#0a0a0f]/40 p-2.5 cursor-pointer select-none transition-all hover:bg-[#2a8fc4]/5 hover:border-[#2a8fc4]/25 hover:shadow-[0_0_12px_rgba(42,143,196,0.05)] active:scale-[0.98]"
                                                >
                                                  <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-[#5ab8e0]/60 font-semibold">
                                                    <Key className="h-2.5 w-2.5" /> Senha
                                                  </span>
                                                  <span className="truncate font-mono text-xs text-white/90 break-all pr-5">{cred.password}</span>
                                                  <span className="absolute bottom-2 right-2 text-white/20 group-hover:text-white/40"><Copy className="h-2.5 w-2.5" /></span>
                                                </div>

                                                {/* Details / Target Block */}
                                                <div className="relative flex flex-col gap-1 rounded-lg border border-[#2a8fc4]/10 bg-[#0a0a0f]/20 p-2.5">
                                                  <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-[#5ab8e0]/40 font-semibold">
                                                    <Globe2 className="h-2.5 w-2.5" /> {cred.telefone ? "Telefone" : "Alvo"}
                                                  </span>
                                                  <span className="truncate font-mono text-xs text-white/80 pr-5">{cred.telefone || rootHost(cred.url)}</span>
                                                  <button onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigator.clipboard.writeText(cred.telefone || rootHost(cred.url));
                                                    const toast = document.createElement('div');
                                                    toast.className = 'fixed bottom-4 right-4 z-50 rounded-lg bg-[#0a0f18] border border-[#2a8fc4]/30 text-[#5ab8e0] px-4 py-2 text-xs font-mono shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-2';
                                                    toast.innerText = 'Copiado!';
                                                    document.body.appendChild(toast);
                                                    setTimeout(() => toast.remove(), 2000);
                                                  }} className="absolute bottom-2.5 right-2.5 text-white/30 hover:text-white transition-colors" title="Copy">
                                                    <Copy className="h-2.5 w-2.5" />
                                                  </button>
                                                </div>
                                              </div>
                                           </div>
                                         );
                                      })}
                                    </div>
                                      {total > credPageSize && (
                                      <div className="flex flex-col gap-3 rounded-xl border border-[#2a8fc4]/8 bg-[#2a8fc4]/3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                                        style={{ boxShadow: "inset 0 0 0 1px rgba(42,143,196,0.06)" }}>
                                        <div className="flex items-center gap-2 text-[12px] sm:text-[13px]">
                                           <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#2a8fc4]/8 px-2.5 py-1 font-medium text-white/70">
                                             <span className="tabular-nums text-white/90">{start + 1}&ndash;{end}</span>
                                             <span className="text-white/30">/</span>
                                             <span className="tabular-nums text-white/90">{total}</span>
                                           </span>
                                           <span className="hidden text-white/30 sm:inline">resultados</span>
                                         </div>
                                        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
                                          <div className="flex h-9 items-center overflow-hidden rounded-lg border border-[#2a8fc4]/10 bg-[#2a8fc4]/3 text-[12px] text-white/50 sm:text-[13px]">
                                            <span className="px-2 text-[#5ab8e0]/40">Mostrar</span>
                                            <select value={credPageSize} onChange={e => { setCredPageSize(Number(e.target.value)); setCredPage(1); }} className="h-full w-[4.75rem] border-l border-[#2a8fc4]/10 bg-[#2a8fc4]/5 px-2 text-[12px] text-white/70 outline-none transition-colors sm:text-sm focus:text-white" aria-label="Linhas por página">
<option value={5} className="bg-[#060a14] text-white">5</option>
                                                <option value={10} className="bg-[#060a14] text-white">10</option>
                                                <option value={12} className="bg-[#060a14] text-white">12</option>
                                                <option value={25} className="bg-[#060a14] text-white">25</option>
                                               <option value={50} className="bg-[#060a14] text-white">50</option>
                                               <option value={100} className="bg-[#060a14] text-white">100</option>
                                            </select>
                                          </div>
                                          {totalPages > 1 && (
                                            <div className="flex h-9 items-center gap-1 rounded-lg border border-[#2a8fc4]/10 bg-[#2a8fc4]/3 px-1">
                                              <button disabled={safePage === 1} onClick={() => setCredPage(1)} className="inline-flex items-center justify-center h-7 w-7 rounded-md text-white/40 hover:bg-[#2a8fc4]/10 hover:text-white/70 disabled:opacity-30 disabled:cursor-not-allowed" aria-label="Primeira página">
                                                <ChevronsLeft className="h-3.5 w-3.5" />
                                              </button>
                                              <button disabled={safePage === 1} onClick={() => setCredPage(x => Math.max(1, x - 1))} className="inline-flex items-center justify-center h-7 w-7 rounded-md text-white/40 hover:bg-[#2a8fc4]/10 hover:text-white/70 disabled:opacity-30 disabled:cursor-not-allowed" aria-label="Página anterior">
                                                <ChevronLeft className="h-3.5 w-3.5" />
                                              </button>
                                              <div className="hidden sm:flex items-center gap-1">
                                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                                                  <button key={n} onClick={() => setCredPage(n)} className={`inline-flex items-center justify-center h-7 min-w-7 rounded-md border-0 px-2 text-xs font-semibold tabular-nums ${n === safePage ? 'text-white bg-[#2a8fc4]/20 border border-[#5ab8e0]/20 shadow-[0_0_12px_-4px_rgba(42,143,196,0.3)]' : 'text-white/40 hover:bg-[#2a8fc4]/10 hover:text-white/70'}`} aria-label={`Página ${n}`} aria-current={n === safePage ? 'page' : undefined}>
                                                    {n}
                                                  </button>
                                                ))}
                                              </div>
                                              <div className="flex min-w-[4.5rem] items-center justify-center px-2 text-[12px] text-white/40 tabular-nums sm:hidden">
                                                {safePage} / {totalPages}
                                              </div>
                                              <button disabled={safePage === totalPages} onClick={() => setCredPage(x => Math.min(totalPages, x + 1))} className="inline-flex items-center justify-center h-7 w-7 rounded-md text-white/40 hover:bg-[#2a8fc4]/10 hover:text-white/70 disabled:opacity-30 disabled:cursor-not-allowed" aria-label="Próxima página">
                                                <ChevronRight className="h-3.5 w-3.5" />
                                              </button>
                                              <button disabled={safePage === totalPages} onClick={() => setCredPage(totalPages)} className="inline-flex items-center justify-center h-7 w-7 rounded-md text-white/40 hover:bg-[#2a8fc4]/10 hover:text-white/70 disabled:opacity-30 disabled:cursor-not-allowed" aria-label="Última página">
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
                                  <a key={j} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#2a8fc4]/10 h-8 px-3 text-[10px] font-medium text-white/40 transition-all duration-300 hover:text-white/70 hover:border-[#2a8fc4]/25 hover:bg-[#2a8fc4]/5">
                                    {l.label} <ArrowUpRight className="h-3 w-3" />
                                  </a>
                                ))}
                              </div>
                            )}
                            {sec.ipCards && sec.ipCards.length > 0 && (
                              <div className="grid gap-3 sm:grid-cols-2">
                                {sec.ipCards.map((card, j) => {
                                  const ipLimit = isPremium ? Infinity : 1;
                                  return (
                                  <div key={j} className="relative overflow-hidden rounded-xl border border-[#2a8fc4]/8 bg-[#2a8fc4]/3 p-3">
                                    {j >= ipLimit && (
                                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/90 backdrop-blur-sm">
                                        <span className="text-[10px] font-medium text-white/60">Desbloqueie com</span>
                                        <a href="/planos" className="inline-flex items-center justify-center rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white transition-all duration-200 active:scale-95"
                                          style={{ background: "linear-gradient(180deg, #2a8fc4 49.18%, #5ab8e0 113.93%)", boxShadow: "0 0 6px 0 rgba(42,143,196,0.3), 0 -2px 0 0 rgba(0,0,0,0.20) inset, 0 1px 0 0 rgba(255,255,255,0.40) inset, 0 0 24px -4px rgba(42,143,196,0.4)" }}
                                        >COMPRAR PLANO</a>
                                      </div>
                                    )}
                                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                      <div className="flex items-center gap-2.5">
                                        <Network className="h-4 w-4 text-cyan-400/70" />
                                        <span className="font-mono text-[15px] font-medium text-cyan-300">{card.ip}</span>
                                      </div>
                                      <a href={`https://www.google.com/maps/search/?api=1&query=${card.lat},${card.lon}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-zinc-400 transition-all hover:border-cyan-500/20 hover:bg-cyan-500/5 hover:text-cyan-300">
                                        <MapPin className="h-3 w-3" />Map <ArrowUpRight className="h-2.5 w-2.5 opacity-50" />
                                      </a>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3.5">
                                        <div className="mb-2.5 flex items-center gap-2">
                                          <MapPin className="h-3.5 w-3.5 text-cyan-400/60" />
                                          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-500">Location</span>
                                          {card.countryCode && (
                                            <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
                                              <span className="text-xs">{card.countryCode}</span>
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[13px] font-medium leading-relaxed text-white">{card.city}, {card.region}, {card.country}</p>
                                        <p className="mt-1 text-[11px] text-zinc-500">{card.timezone}</p>
                                      </div>
                                      <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3.5">
                                        <div className="mb-2.5 flex items-center gap-2">
                                          <Globe2 className="h-3.5 w-3.5 text-cyan-400/60" />
                                          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-500">Network</span>
                                        </div>
                                        <div className="space-y-1.5 text-[13px]">
                                          <div className="flex justify-between"><span className="text-zinc-500">ISP</span><span className="font-medium text-white text-right max-w-[60%] truncate" title={card.isp}>{card.isp}</span></div>
                                          <div className="flex justify-between"><span className="text-zinc-500">ASN</span><span className="font-medium text-white text-right max-w-[60%] truncate" title={card.org}>{card.org}</span></div>
                                          {card.reverse && <div className="flex justify-between"><span className="text-zinc-500">rDNS</span><span className="max-w-[60%] truncate font-mono text-[11px] text-zinc-400" title={card.reverse}>{card.reverse}</span></div>}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
                                      {card.isProxy && (
                                        <div className="flex items-center gap-1.5 sm:gap-2 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-medium ring-1 transition-colors bg-red-500/8 text-red-300 ring-red-500/20">
                                          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50 bg-red-400"></span><span className="relative inline-flex h-2 w-2 rounded-full bg-red-400"></span></span>
                                          <Shield className="h-3 w-3" />VPN/Proxy
                                        </div>
                                      )}
                                      {card.isDatacenter && (
                                        <div className="flex items-center gap-1.5 sm:gap-2 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-medium ring-1 transition-colors bg-white/[0.02] text-zinc-500 ring-white/[0.06]">
                                          <span className="relative flex h-2 w-2 opacity-40"><span className="relative inline-flex h-2 w-2 rounded-full bg-zinc-600"></span></span>
                                          <Cloud className="h-3 w-3" />Datacenter
                                        </div>
                                      )}
                                      {card.isMobile && (
                                        <div className="flex items-center gap-1.5 sm:gap-2 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-medium ring-1 transition-colors bg-white/[0.02] text-zinc-500 ring-white/[0.06]">
                                          <span className="relative flex h-2 w-2 opacity-40"><span className="relative inline-flex h-2 w-2 rounded-full bg-zinc-600"></span></span>
                                          <Zap className="h-3 w-3" />Mobile
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              </div>
                            )}
                          </div>
                        ))}
                        {collapsibles.length > 0 && (
                          <div className="rounded-xl border border-[#2a8fc4]/8 bg-[#2a8fc4]/3 p-3.5 sm:p-4">
                            <h4 className="mb-3 text-sm font-semibold text-white/80">Plataformas verificadas <span className="text-xs font-normal text-white/30">({collapsibles.length})</span></h4>
                            <div className="flex flex-wrap gap-2">
                              {collapsibles.map(({ s: sec, i }) => {
                                const open = !!openSections[i];
                                const name = sec.title.split(" — ")[0];
                                const found = sec.fields?.[0]?.ok;
                                return (
                                  <div key={i} className="w-full sm:w-auto">
                                    <button
                                      onClick={() => setOpenSections(o => ({ ...o, [i]: !o[i] }))}
                                      className={`inline-flex items-center justify-center gap-2 rounded-lg h-9 px-4 text-xs font-medium transition-all duration-300 ${found ? "ring-1 ring-red-500/30" : ""} ${open ? "text-white border-0 shadow-lg shadow-[#2a8fc4]/20" : "border border-[#2a8fc4]/10 text-white/50 hover:text-white/80 hover:border-[#2a8fc4]/20 hover:bg-[#2a8fc4]/5"}`}
                                      style={open ? {
                                        background: "linear-gradient(135deg, #2a8fc4, #5ab8e0)",
                                        boxShadow: "0 4px 20px -4px rgba(42,143,196,0.45), 0 0 0 1px rgba(255,255,255,0.08) inset",
                                      } : { background: "rgba(10,15,24,0.8)" }}
                                      title={sec.title}
                                    >
                                      <img src={sec.icon} alt="" className="h-4 w-4 rounded-sm" loading="lazy" />
                                      <span>{name}</span>
                                      {found && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-destructive" />}
                                    </button>
                                    {open && sec.fields && (
                                      <div className="mt-2 rounded-xl border border-[#2a8fc4]/8 bg-[#2a8fc4]/3 p-3">
                                        <div className="mb-2 flex items-center gap-2">
                                          <img src={sec.icon} alt="" className="h-4 w-4 rounded-sm" />
                                          <span className="text-xs font-semibold text-white/80">{sec.title}</span>
                                        </div>
                                        <dl className="grid gap-1.5">
                                          {sec.fields.map((f, j) => (
                                              <div key={j} className="flex flex-col rounded-lg border border-[#2a8fc4]/6 bg-[#2a8fc4]/3 p-2">
                                                <dt className="text-[9px] font-medium uppercase tracking-wider text-[#5ab8e0]/40">{f.label}</dt>
                                              <dd className={`mt-0.5 break-all text-xs text-white/80 ${f.mono ? "font-mono" : ""} ${f.warn ? "text-red-400" : ""} ${f.ok ? "text-emerald-400" : ""}`}>{f.value}</dd>
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
                    <p className="text-[9px] text-[#5ab8e0]/40">
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
