import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Search, Mail, User, Phone, Database, Github, MessageSquare,
  FileText, Globe, Shield, Zap, BarChart3, Gift, X,
  ArrowRight, CheckCircle2, Lock, Layers, TrendingUp, Star,
  Link2, Grid3x3, IdCard, KeyRound, UserCircle2, ChevronRight,
  Instagram, Send,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useReveal } from "../hooks/use-reveal";
import { NoxLogo } from "@/components/NoxLogo";


const COUNTRIES = [
  { code: "BR", name: "Português", flag: "🇧🇷", lang: "pt" },
  { code: "US", name: "English", flag: "🇺🇸", lang: "en" },
  { code: "ES", name: "Español", flag: "🇪🇸", lang: "es" },
  { code: "FR", name: "Français", flag: "🇫🇷", lang: "fr" },
  { code: "DE", name: "Deutsch", flag: "🇩🇪", lang: "de" },
  { code: "IT", name: "Italiano", flag: "🇮🇹", lang: "it" },
  { code: "JP", name: "日本語", flag: "🇯🇵", lang: "ja" },
];

const FLAG_URL = (code: string) => `https://flagcdn.com/24x18/${code.toLowerCase()}.png`;

function setTranslateLang(lang: string) {
  const host = window.location.hostname;
  const expire = "Fri, 31 Dec 9999 23:59:59 GMT";
  const value = lang === "pt" ? "" : `/pt/${lang}`;
  // Only attempt domain-scoped cookies on real multi-segment hosts.
  // Single-segment hosts (e.g. "localhost") reject domain=.localhost.
  const parts = host.split(".");
  const domains: string[] = [""];
  if (parts.length > 1) {
    domains.push(host, "." + host, "." + parts.slice(-2).join("."));
  }
  for (const d of domains) {
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `;domain=${d}` : ""}`;
    if (value) document.cookie = `googtrans=${value}; expires=${expire}; path=/${d ? `;domain=${d}` : ""}`;
  }
  window.location.reload();
}

function CountrySwitcher() {
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState(COUNTRIES[0]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const match = document.cookie.match(/googtrans=\/[^/]+\/([a-z-]+)/);
    if (match) {
      const found = COUNTRIES.find(c => c.lang === match[1]);
      if (found) setCountry(found);
    }
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);



  return (
    <div ref={ref} className="relative notranslate" translate="no">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary/80 transition-all duration-200 hover:bg-primary/10 hover:border-primary/30"
        aria-label="Change country"
      >
        <img src={FLAG_URL(country.code)} alt={country.code} className="h-[18px] w-[24px] rounded-sm object-cover" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-primary/20 bg-background/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(99,102,241,0.15)]">
          {COUNTRIES.map(c => (
            <button
              key={c.code}
              onClick={() => { setCountry(c); setOpen(false); setTranslateLang(c.lang); }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${country.code === c.code ? "bg-primary/10 text-primary-foreground" : "hover:bg-primary/5"}`}
            >
              <img src={FLAG_URL(c.code)} alt={c.code} className="h-[18px] w-[24px] rounded-sm object-cover" />
              <span className="flex-1 text-left">{c.name}</span>
              <span className="text-xs text-muted-foreground">{c.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NavLink({ label, href, route }: { label: string; href: string; route?: boolean }) {
  const cls = "relative flex items-center gap-1.5 rounded-full px-4.5 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground transition-all duration-300 hover:bg-white/[0.03] hover:text-white hover:ring-1 hover:ring-white/[0.08] hover:shadow-[0_4px_12px_-4px_rgba(255,255,255,0.05)] active:scale-[0.96] after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:h-[2px] after:w-0 after:rounded-full after:bg-primary after:opacity-0 after:transition-all after:duration-300 hover:after:w-3 hover:after:opacity-100 hover:after:shadow-[0_0_8px_rgba(42,143,196,0.5)]";
  if (route) return <Link to={href} className={cls}>{label}</Link>;
  return <a href={href} className={cls}>{label}</a>;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NoxIntel — Inteligência OSINT para analistas e equipes" },
      { name: "description", content: "Busca OSINT profissional por e-mail, telefone, usuário, vazamentos e mais. Para pesquisadores independentes e equipes de segurança." },
      { property: "og:title", content: "NoxIntel — Inteligência OSINT" },
      { property: "og:description", content: "Busca OSINT profissional por e-mail, telefone, usuário, vazamentos e mais." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [bannerOpen, setBannerOpen] = useState(true);
  
  useReveal();


  return (
    <div className="min-h-screen text-foreground">


      {bannerOpen && (
        <div className="relative bg-gradient-primary text-primary-foreground">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2.5 text-sm">
            <Gift className="h-4 w-4" />
            <span>Desconto na primeira compra — use o código <strong className="font-semibold underline">NOXWELCOME</strong> no checkout.</span>
          </div>
          <button onClick={() => setBannerOpen(false)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Nav */}
      <header className="sticky top-5 z-40 mx-auto max-w-5xl px-4 perspective-1200">
        <nav 
          className="relative flex items-center justify-between rounded-full border border-white/[0.08] bg-card/50 backdrop-blur-xl px-4 py-2.5 md:px-5 md:py-2 transition-all duration-300 hover:border-primary/50 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.65),inset_0_1.5px_0_0_rgba(255,255,255,0.15),inset_0_-2px_0_0_rgba(0,0,0,0.4)] hover:shadow-[0_24px_48px_-10px_rgba(0,0,0,0.85),0_0_20px_-8px_rgba(42,143,196,0.3),inset_0_1.5px_0_0_rgba(255,255,255,0.25),inset_0_-2px_0_0_rgba(0,0,0,0.5)] group preserve-3d"
        >
          {/* Glow accent line on top */}
          <div className="absolute inset-x-12 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/50 to-transparent rounded-t-full opacity-30 transition-opacity duration-300 group-hover:opacity-100" />

          {/* Logo */}
          <Link to="/" className="relative flex items-center py-1 rounded-full transition-all duration-300 hover:bg-white/5 group active">
            <NoxLogo className="h-14 w-auto" />
          </Link>

          {/* Nav Links */}
          <div className="hidden items-center gap-1.5 px-1 py-0.5 md:flex">
            {[
              { label: "Sobre", href: "#sobre" },
              { label: "Preços", href: "/planos", route: true },
              { label: "Blog", href: "#blog" },
              { label: "CTF", href: "#ctf" },
              { label: "Contato", href: "mailto:contato@noxintel.app" },
            ].map(l => (
              <NavLink key={l.label} {...l} />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <CountrySwitcher />
            <Link
              to="/login"
              className="hidden rounded-full px-4.5 py-1.5 text-xs font-semibold text-muted-foreground transition-all duration-200 hover:text-white hover:bg-white/5 sm:block"
            >
              Entrar
            </Link>
            <Link
              to="/login"
              className="relative inline-flex items-center justify-center gap-2 rounded-full h-8 px-4 text-xs font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
              style={{
                background: "linear-gradient(180deg, #2a8fc4 49.18%, #5ab8e0 113.93%)",
                boxShadow: "0 0 4px 0 rgba(255, 255, 255, 0.07), 0 -2px 0 0 rgba(0, 0, 0, 0.20) inset, 0 1px 0 0 rgba(255, 255, 255, 0.40) inset",
              }}
            >
              <span>Cadastrar</span>
            </Link>
          </div>
        </nav>
      </header>


      {/* Hero */}
      <section className="relative mx-auto max-w-7xl overflow-hidden px-4 pb-16 pt-20 lg:pt-28">


        <div className="relative flex flex-col items-center text-center gap-12 max-w-4xl mx-auto">
          <div className="flex flex-col items-center">
            <div className="reveal inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-glow opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-glow" />
              </span>
              OSINT profissional para todo tipo de usuário
            </div>
            <h1 className="reveal mt-6 text-5xl font-bold leading-[1.05] tracking-tight lg:text-7xl text-center" data-reveal-delay="120">
              Inteligência para{" "}
              <span className="relative inline-block">
                <span className="text-gradient-primary">OSINT</span>
                <span className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-glow to-transparent" />
              </span>
              <br />
              <span className="bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                no seu ritmo ou no do seu time
              </span>
            </h1>
            <p className="reveal mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground mx-auto text-center" data-reveal-delay="240">
              Pesquisadores independentes, estudantes avançados e equipes de segurança usam o mesmo motor — busca poderosa, resultados claros e APIs feitas para organizações quando você precisar.
            </p>
 
            <div className="reveal mt-8 flex flex-wrap justify-center items-center gap-3" data-reveal-delay="360">
              <Link to="/login" className="group inline-flex items-center justify-center gap-2 rounded-full h-11 px-6 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90"
                style={{
                  background: "linear-gradient(180deg, #2a8fc4 49.18%, #5ab8e0 113.93%)",
                  boxShadow: "0 0 4px 0 rgba(255, 255, 255, 0.07), 0 -2px 0 0 rgba(0, 0, 0, 0.20) inset, 0 1px 0 0 rgba(255, 255, 255, 0.40) inset",
                }}
              >
                <CheckCircle2 className="h-4 w-4" /> Entrar
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link to="/planos" className="inline-flex items-center justify-center gap-2 rounded-full border border-border/60 bg-card/40 h-11 px-6 text-sm font-medium backdrop-blur-sm transition hover:border-primary/40 hover:bg-card/70">
                <FileText className="h-4 w-4" /> Ver planos
              </Link>
            </div>
 
            <a href="#enterprise" className="mt-6 inline-flex items-center gap-1 border-b border-border pb-0.5 text-sm text-muted-foreground transition hover:border-primary hover:text-primary mx-auto">
              Equipe ou empresa? Conheça o Enterprise <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* Grid of Key Features */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: BarChart3, t: "Um único painel", d: "Esqueça 50 abas abertas. Faça todas as consultas OSINT em um só console prático." },
            { icon: Search, t: "Busca em profundidade", d: "E-mail, telefone, CPF, usuário, IP, senhas, domínios e vazamentos consolidados." },
            { icon: Shield, t: "Privacidade absoluta", d: "Suas investigações são protegidas. Nossos servidores consultam via k-anonymity." },
            { icon: Zap, t: "Do Dev ao Enterprise", d: "Comece com buscas rápidas no navegador e expanda para nossa API automatizada." },
          ].map(f => (
            <div key={f.t} className="group rounded-2xl border border-border/40 bg-card/25 p-5 transition-all duration-500 hover:-translate-y-2 hover:border-primary/30 hover:bg-card/50 hover:shadow-[0_12px_40px_-8px_rgba(42,143,196,0.25)] hover:scale-[1.02]">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-500 group-hover:scale-110 group-hover:bg-primary group-hover:text-white group-hover:shadow-[0_0_20px_-4px_rgba(42,143,196,0.5)]"
                   style={{ boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.06)" }}>
                <f.icon className="h-4.5 w-4.5" />
              </div>
              <h3 className="mt-4 text-sm font-bold tracking-tight text-foreground">{f.t}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Live dashboard preview */}
      <section id="blog" className="mx-auto max-w-5xl px-4 py-20">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Simulação</p>
          <h2 className="reveal mt-2 text-3xl font-bold tracking-tight lg:text-4xl">O painel real, ao vivo na landing</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground font-medium">Faça um teste rápido escolhendo uma categoria de busca abaixo.</p>
        </div>

        <div className="mt-12 overflow-hidden rounded-3xl border border-white/[0.08] bg-card/40 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-2px_0_rgba(0,0,0,0.3)] backdrop-blur-xl transition-all duration-500 hover:border-primary/30 hover:shadow-[0_24px_60px_-12px_rgba(42,143,196,0.15),inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-2px_0_rgba(0,0,0,0.3)] hover:scale-[1.005]">
          <div className="flex items-center justify-between border-b border-white/[0.06] bg-background/25 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <NoxLogo className="h-14 w-auto" />
              <span className="text-sm font-bold tracking-wide">NoxIntel</span>
              <span className="rounded border border-border bg-background/40 px-1.5 py-0.5 text-[9px] font-mono uppercase text-muted-foreground">Módulo OSINT</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary shadow-glow" />Demonstração</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-primary text-[10px] font-bold text-primary-foreground">NX</div>
            </div>
          </div>

          <div className="p-5 sm:p-7">
            {/* Category pills — como na busca real */}
            <p className="mb-3 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Escolha a categoria de busca</p>
            <div className="rounded-2xl border border-border/60 bg-background/30 p-2">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "email", icon: Mail, label: "Email", active: true },
                  { id: "phone", icon: Phone, label: "Telefone" },
                  { id: "username", icon: UserCircle2, label: "Username" },
                  { id: "domain", icon: Globe, label: "Domínio" },
                  { id: "cpf", icon: IdCard, label: "CPF" },
                  { id: "password", icon: KeyRound, label: "Senha" },
                  { id: "name", icon: User, label: "Nome" },
                  { id: "link", icon: Link2, label: "Link" },
                  { id: "blockchain", icon: Grid3x3, label: "Blockchain" },
                  { id: "ip", icon: Globe, label: "IP" },
                ].map(c => (
                  c.active ? (
                    <button key={c.id}
                      className="inline-flex items-center justify-center gap-2 rounded-full h-8 px-4 text-xs font-semibold text-white transition-all duration-200 border-0 shadow-glow"
                      style={{
                        background: "linear-gradient(180deg, #2a8fc4 49.18%, #5ab8e0 113.93%)",
                      }}
                    >
                      <c.icon className="h-3.5 w-3.5" /> {c.label}
                    </button>
                  ) : (
                    <button key={c.id}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-border/60 bg-card/30 h-8 px-4 text-xs font-medium text-muted-foreground transition hover:text-foreground hover:border-primary/30 hover:bg-primary/5">
                      <c.icon className="h-3.5 w-3.5" /> {c.label}
                    </button>
                  )
                ))}
                <button className="inline-flex items-center justify-center rounded-full border border-border/60 bg-card/30 h-8 w-8 text-muted-foreground transition hover:text-foreground hover:border-primary/30 hover:bg-primary/5">
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Search input */}
            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
              <div className="flex flex-1 items-center gap-3 rounded-full border border-border/60 bg-background/60 px-4 py-2.5 transition focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input defaultValue="gm4257026@gmail.com" className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" />
              </div>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-full h-10 px-6 text-sm font-bold uppercase tracking-wider text-white transition-all duration-200 border-0 shadow-glow"
                style={{
                  background: "linear-gradient(180deg, #2a8fc4 49.18%, #5ab8e0 113.93%)",
                  boxShadow: "0 0 4px 0 rgba(255, 255, 255, 0.07), 0 -2px 0 0 rgba(0, 0, 0, 0.20) inset, 0 1px 0 0 rgba(255, 255, 255, 0.40) inset",
                }}
              >
                Buscar <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3.5 text-center text-xs text-muted-foreground/80">Ao buscar, você concorda com os <span className="underline cursor-pointer hover:text-foreground">Termos de uso</span>.</p>

            <p className="mt-6 text-center text-xs text-muted-foreground/50 leading-relaxed max-w-2xl mx-auto">
              Cada busca consulta dezenas de módulos OSINT em paralelo (SMTP, Disposable Check, HudsonRock, XposedOrNot, plataformas como Spotify, Facebook, ESPN, PolarSteps e mais) — entre na sua conta para ver os resultados completos.
            </p>
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-muted-foreground/40">
          Feito para pesquisa legítima, segurança e conformidade regulatória. Proibimos abuso, assédio e uso ilícito.
        </p>
      </section>

      {/* Scenarios (Case Files) */}
      <section id="sobre" className="mx-auto max-w-5xl px-4 py-20">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Cenários Reais</p>
          <h2 className="reveal mt-2 text-3xl font-bold tracking-tight lg:text-4xl">O que o NoxIntel faz por você, na prática</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground font-medium">Situações reais de investigação em compliance, e-commerce e jornalismo de dados.</p>
        </div>

        <div className="mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:pb-0">
          {[
            { cat: "Jurídico & compliance", title: "Verificação de Cliente (KYC)", body: "Verifique se o e-mail passado para assinatura digital consta em vazamentos corporativos ativos.", tool: "OSINT de E-mail", value: "maria.garcia@empresa.com", chips: ["2 vazamentos encontrados", "LinkedIn verificado"] },
            { cat: "E-commerce & suporte", title: "Prevenção de Fraude de Alta Carga", body: "Analise se o número do comprador está ativo, operando e se há conexões suspeitas associadas.", tool: "OSINT de Telefone", value: "+55 11 ••• ••9", chips: ["Operadora: Vivo BR", "Risco médio · 3 denúncias"] },
            { cat: "Comunicação & mídia", title: "Checagem de Fontes Anônimas", body: "Rastreie o usuário/identificador do contato em 500+ plataformas sociais e descubra o ano de criação.", tool: "OSINT de Usuário", value: "@reporter_xyz", chips: ["Encontrado em 4 plataformas", "Ativo desde 2019"] },
          ].map(s => (
            <article key={s.title} className="w-[85vw] shrink-0 snap-center rounded-3xl border border-white/[0.06] bg-card/45 p-5.5 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-500 hover:-translate-y-2 hover:border-primary/30 hover:bg-card/60 hover:shadow-[0_20px_50px_-12px_rgba(42,143,196,0.2),inset_0_1px_0_rgba(255,255,255,0.04)] hover:scale-[1.015] md:w-auto">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary/95">{s.cat}</p>
              <h3 className="mt-3.5 text-base font-bold leading-snug text-foreground">{s.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{s.body}</p>

              <div className="mt-4.5 rounded-2xl border border-border/60 bg-background/50 p-4">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase text-muted-foreground/60">
                  <span>noxintel.app</span><span>{s.tool}</span>
                </div>
                <p className="mt-2 font-mono text-xs font-semibold text-foreground tracking-tight">{s.value}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {s.chips.map(c => <span key={c} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[9px] font-semibold text-primary">{c}</span>)}
                </div>
              </div>

              <a href="#" className="mt-4.5 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline group">Teste com seu caso <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" /></a>
            </article>
          ))}
        </div>
      </section>

      {/* Plans Split Section */}
      <section id="enterprise" className="mx-auto max-w-5xl px-4 py-20">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Licenciamento</p>
          <h2 className="reveal mt-2 text-3xl font-bold tracking-tight lg:text-4xl">Uma plataforma, sozinho ou com muita gente</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground font-medium">Escolha o melhor método de acesso para o seu volume de trabalho.</p>
        </div>

        <div className="mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:pb-0">
          {[
            { tag: "Você / freelancer", title: "Entre, investigue e decida com confiança", body: "Ideal para quem faz investigações pontuais, auditorias rápidas ou precisa de acesso direto ao console web sem configurações de integração.", bullets: ["Acesso web com planos diretos por Pix", "Geração rápida de relatórios PDF/JSON", "Aprenda no seu ritmo com tutoriais"], cta: "Acessar", cta2: "Ver preços" },
            { tag: "Times & empresas", title: "Quando OSINT é rotina operacional", body: "SOC, departamentos jurídicos e times de prevenção à fraude. Volume de busca e consultas automáticas integradas por API.", bullets: ["REST API completa com webhooks", "Chaves de API para rotatividade", "Faturamento sob medida e múltiplas contas"], cta: "NoxIntel Enterprise", cta2: "Ler o blog" },
          ].map(p => (
            <div key={p.tag} className="w-[85vw] shrink-0 snap-center rounded-3xl border border-white/[0.06] bg-card/45 p-6 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-500 hover:-translate-y-2 hover:border-primary/30 hover:bg-card/60 hover:shadow-[0_24px_60px_-16px_rgba(42,143,196,0.25),inset_0_1px_0_rgba(255,255,255,0.04)] hover:scale-[1.015] md:w-auto">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{p.tag}</p>
              <h3 className="mt-3.5 text-lg font-bold leading-tight text-foreground">{p.title}</h3>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{p.body}</p>
              <ul className="mt-5 space-y-2.5">
                {p.bullets.map(b => (
                  <li key={b} className="flex items-start gap-2.5 text-xs"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /><span>{b}</span></li>
                ))}
              </ul>
              <div className="mt-5.5 flex flex-wrap gap-2.5">
                <button className="inline-flex items-center justify-center gap-2 rounded-full h-10 px-6 text-sm font-semibold text-white transition-all duration-200 border-0 shadow-glow"
                  style={{
                    background: "linear-gradient(180deg, #2a8fc4 49.18%, #5ab8e0 113.93%)",
                    boxShadow: "0 0 4px 0 rgba(255, 255, 255, 0.07), 0 -2px 0 0 rgba(0, 0, 0, 0.20) inset, 0 1px 0 0 rgba(255, 255, 255, 0.40) inset",
                  }}
                >
                  {p.cta}
                </button>
                <button className="inline-flex items-center justify-center gap-2 rounded-full border border-border/60 bg-card/40 h-10 px-6 text-sm font-medium transition hover:text-foreground hover:border-primary/30 hover:bg-primary/5">{p.cta2}</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-5xl px-4 py-20">
        <h2 className="reveal text-center text-3xl font-bold tracking-tight lg:text-4xl">O que nossos <span className="text-gradient-primary">clientes profissionais</span> dizem</h2>
        
        <div className="mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 md:grid md:grid-cols-2 md:gap-5 md:overflow-visible md:pb-0 lg:grid-cols-4">
          {[
            { q: "A melhor ferramenta de OSINT do mercado nacional hoje. Entrega o que promete por um preço muito justo.", n: "Rox M.", i: "RM" },
            { q: "Quase um ano utilizando a NoxIntel nas investigações da agência. Constantes atualizações das bases públicas.", n: "Mario Chin Fern", i: "MCF" },
            { q: "Achei pelo menos 20 vazamentos de e-mails antigos e consegui auditar nossos domínios em 2 dias.", n: "Alberto J.", i: "AJ" },
            { q: "Design moderno, tempo de busca super rápido e suporte direto pelo Telegram. Altamente recomendável.", n: "Vicente", i: "V" },
          ].map(t => (
            <div key={t.n} className="flex w-[80vw] shrink-0 snap-center flex-col rounded-3xl border border-white/[0.05] bg-card/40 p-5 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.03)] transition-all duration-500 hover:-translate-y-2 hover:border-primary/25 hover:bg-card/60 hover:shadow-[0_20px_50px_-12px_rgba(42,143,196,0.2),inset_0_1px_0_rgba(255,255,255,0.03)] hover:scale-[1.02] md:w-auto">
              <div className="flex gap-0.5 text-primary">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4.5 w-4.5 fill-current" />)}
              </div>
              <p className="mt-4 flex-1 text-xs leading-relaxed text-muted-foreground">"{t.q}"</p>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{t.i}</div>
                <div>
                  <p className="text-xs font-bold text-foreground">{t.n}</p>
                  <p className="text-[10px] text-muted-foreground/80">Cliente verificado</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Final */}
      <section className="mx-auto max-w-5xl px-4 py-20">
        <div className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-card/45 p-10 text-center shadow-[0_24px_50px_-12px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-500 hover:border-primary/20 hover:shadow-[0_30px_60px_-12px_rgba(42,143,196,0.15),inset_0_1px_0_rgba(255,255,255,0.05)]">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl transition-all duration-700 group-hover:scale-150 group-hover:opacity-80" />
          <h2 className="reveal relative text-3xl font-extrabold tracking-tight lg:text-4xl">Comece em minutos ou <span className="text-gradient-primary">planeje em escala</span></h2>
          <p className="relative mx-auto mt-3.5 max-w-xl text-sm leading-relaxed text-muted-foreground">Crie sua conta, escolha um plano por Pix com ativação imediata ou entre em contato com nossa equipe para API Enterprise.</p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3.5">
            <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-full h-11 px-7 text-sm font-bold text-white transition-all duration-200 border-0 shadow-glow"
              style={{
                background: "linear-gradient(180deg, #2a8fc4 49.18%, #5ab8e0 113.93%)",
                boxShadow: "0 0 4px 0 rgba(255, 255, 255, 0.07), 0 -2px 0 0 rgba(0, 0, 0, 0.20) inset, 0 1px 0 0 rgba(255, 255, 255, 0.40) inset",
              }}
            >
              Começar Agora
            </Link>
            <a href="mailto:enterprise@noxintel.app" className="inline-flex items-center justify-center gap-2 rounded-full border border-border/60 bg-card/40 h-11 px-6 text-sm font-medium transition hover:text-foreground hover:border-primary/30 hover:bg-primary/5">Falar com Vendas</a>
          </div>
        </div>
      </section>

      {/* Reseller Program */}
      <section id="revenda" className="mx-auto max-w-5xl px-4 pb-20">
        <div className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-card/45 p-10 text-center shadow-[0_24px_50px_-12px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-500 hover:border-primary/20 hover:shadow-[0_30px_60px_-12px_rgba(42,143,196,0.15),inset_0_1px_0_rgba(255,255,255,0.05)]">
          <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl transition-all duration-700 group-hover:scale-150 group-hover:opacity-80" />
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <TrendingUp className="h-3.5 w-3.5" /> Programa de Revenda
          </span>
          <h2 className="reveal relative mt-4.5 text-3xl font-extrabold tracking-tight lg:text-4xl">
            Seja um <span className="text-gradient-primary">revendedor oficial</span> e ganhe <span className="text-gradient-primary">20% de comissão</span>
          </h2>
          <p className="relative mx-auto mt-3.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Indique clientes, divulgue nossa plataforma e ganhe recorrência sobre cada plano fechado. Link de afiliado e materiais de divulgação liberados imediatamente.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3.5">
            <a
              href="https://t.me/controle"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full h-11 px-7 text-sm font-bold text-white transition-all duration-200 border-0 shadow-glow"
              style={{
                background: "linear-gradient(180deg, #2a8fc4 49.18%, #5ab8e0 113.93%)",
                boxShadow: "0 0 4px 0 rgba(255, 255, 255, 0.07), 0 -2px 0 0 rgba(0, 0, 0, 0.20) inset, 0 1px 0 0 rgba(255, 255, 255, 0.40) inset",
              }}
            >
              <MessageSquare className="h-4.5 w-4.5" /> Telegram @controle
            </a>
          </div>
          <p className="relative mt-4 text-xs text-muted-foreground">
            Contato exclusivo de suporte e afiliação via Telegram: <strong className="text-foreground">@controle</strong>
          </p>
        </div>
      </section>

      <footer className="border-t border-border/80">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2.5">
            <NoxLogo className="h-12 w-auto" />
            <span className="font-semibold text-foreground">NoxIntel</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://instagram.com/seu-usuario" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary-glow transition-colors duration-200 hover:scale-110">
              <Instagram className="h-5 w-5" />
            </a>
            <a href="https://t.me/controle" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary-glow transition-colors duration-200 hover:scale-110">
              <Send className="h-5 w-5" />
            </a>
          </div>
          <div className="flex gap-5 text-xs">
            <a href="#" className="hover:text-foreground transition">Termos</a>
            <a href="#" className="hover:text-foreground transition">Privacidade</a>
            <a href="#" className="hover:text-foreground transition">Cookies</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
