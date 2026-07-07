import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { NoxLogo } from "@/components/NoxLogo";
import { Mail, Lock, User, ArrowRight, AlertTriangle, CheckCircle2, Loader2, Activity, Terminal, Cpu, Globe, Shield, Instagram, Send } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { doLogin, doSignup, checkEmailBreach } from "@/lib/auth.functions";
import { setToken } from "@/lib/session";
import { TermsDialog } from "@/components/TermsDialog";

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ redirect: (s.redirect as string) || undefined }),
  head: () => ({
    meta: [
      { title: "Entrar — NoxIntel" },
      { name: "description", content: "Acesse sua conta NoxIntel e continue suas investigações OSINT." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const isDev = import.meta.env.DEV;
  const [turnstileToken, setTurnstileToken] = useState<string | null>(isDev ? "dev-mode" : null);
  const turnstileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDev || !turnstileRef.current || typeof window === "undefined") return;
    const id = "turnstile-" + Math.random().toString(36).slice(2);
    turnstileRef.current.id = id;
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    let timeout: ReturnType<typeof setTimeout>;
    const check = () => {
      if ((window as any).turnstile) {
        (window as any).turnstile.render("#" + id, {
          sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
          theme: "dark",
          callback: (token: string) => setTurnstileToken(token),
          "expired-callback": () => setTurnstileToken(null),
        });
      } else {
        timeout = setTimeout(check, 100);
      }
    };
    check();
    return () => { clearTimeout(timeout); script.remove(); };
  }, []);


  type BreachStatus = { state: "idle" | "checking" | "safe" | "error" } | { state: "breached"; breaches: string[] };
  const [breach, setBreach] = useState<BreachStatus>({ state: "idle" });
  const checkBreach = useServerFn(checkEmailBreach);

  useEffect(() => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setBreach({ state: "idle" }); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setBreach({ state: "checking" });
      try {
        const res = await checkBreach({ data: { email } });
        if (ctrl.signal.aborted) return;
        if (res.state === "breached" && res.breaches.length > 0) {
          setBreach({ state: "breached", breaches: res.breaches });
        } else if (res.state === "safe") {
          setBreach({ state: "safe" });
        } else {
          setBreach({ state: "error" });
        }
      } catch {
        if (!ctrl.signal.aborted) setBreach({ state: "error" });
      }
    }, 600);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [email]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!turnstileToken) { setError("Aguardando verificação do captcha"); return; }
    setError(null); setInfo(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        if (password !== confirmPassword) { setError("As senhas não conferem"); setLoading(false); return; }
        const res = await doSignup({ data: { email, password, fullName: name, turnstileToken } });
        setToken(res.token);
        if (sessionStorage.getItem("terms_accepted")) { navigate({ to: redirectTo || "/dashboard" }); } else { setShowTerms(true); }
      } else {
        const res = await doLogin({ data: { email, password, turnstileToken } });
        setToken(res.token);
        if (sessionStorage.getItem("terms_accepted")) { navigate({ to: redirectTo || "/dashboard" }); } else { setShowTerms(true); }
      }

    } catch (err: any) {
      setError(err.message || "Erro ao autenticar");
    } finally { setLoading(false); }
  }

  async function googleLogin() {
    setError("Login com Google indisponível no momento");
  }

  return (
    <div className="relative min-h-screen grid lg:grid-cols-12 bg-transparent text-foreground overflow-hidden">
      
      {/* Left side: Premium High-Tech OSINT Showcase (Desktop only) */}
      <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 relative flex-col p-12 overflow-hidden border-r border-border/40">
        {/* Constellation bg */}
        <div className="absolute inset-0 -z-10">
          <div className="constellation-bg" />
        </div>

        {/* Central logo */}
        <div className="flex flex-col items-center justify-center z-10 p-4 gap-6">
          <NoxLogo className="h-auto w-auto max-h-[90vh] max-w-[95%] animate-logo-glow" />
          <div className="flex items-center gap-4">
            <a href="https://instagram.com/seu-usuario" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-primary-glow transition-colors duration-200 hover:scale-110">
              <Instagram className="h-6 w-6" />
            </a>
            <a href="https://t.me/controle" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-primary-glow transition-colors duration-200 hover:scale-110">
              <Send className="h-6 w-6" />
            </a>
          </div>
        </div>

        {/* Footer stats */}
        <div className="z-10 w-full max-w-md border-t border-white/[0.06] pt-4 pb-8 flex justify-between items-center text-left mx-auto">
          <div>
            <p className="text-xl font-black text-white">+2.8B</p>
            <p className="text-[8px] font-bold text-muted-foreground/60 uppercase tracking-wider mt-0.5">Credenciais</p>
          </div>
          <div>
            <p className="text-xl font-black text-white">&lt; 1.2s</p>
            <p className="text-[8px] font-bold text-muted-foreground/60 uppercase tracking-wider mt-0.5">Tempo Médio</p>
          </div>
          <div>
            <p className="text-xl font-black text-white">99.9%</p>
            <p className="text-[8px] font-bold text-muted-foreground/60 uppercase tracking-wider mt-0.5">Precisão</p>
          </div>
        </div>
      </div>

      {/* Right side: Elegant Glassmorphic Login Form (Mobile & Desktop) */}
      <div className="col-span-12 lg:col-span-6 xl:col-span-5 flex flex-col justify-between p-4 sm:p-6 md:p-12 relative min-h-screen z-10 bg-background/40" style={{ perspective: "1200px" }}>
        
        {/* Glow orbs background (Mobile/Tablet friendly) */}
        <div className="absolute inset-0 -z-10 lg:hidden">
          <div className="absolute top-10 right-10 h-[250px] w-[250px] rounded-full bg-primary/10 animate-pulse" />
          <div className="absolute bottom-10 left-10 h-[250px] w-[250px] rounded-full bg-blue-500/10 animate-pulse" style={{ animationDelay: "2s" }} />
          <div className="grid-bg absolute inset-0 opacity-[0.25]" />
        </div>

        {/* Top Header */}
        <div className="flex justify-between items-center w-full z-10">
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <NoxLogo className="h-9 w-auto sm:h-14" />
            <span className="text-sm font-bold tracking-wider">NOXINTEL</span>
          </Link>
          <span className="hidden lg:block h-9" /> {/* spacer */}
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium border-b border-transparent hover:border-foreground pb-0.5">
            Voltar ao Início
          </Link>
        </div>

        {/* Center Card */}
          <div className="my-auto py-6 sm:py-10 w-full max-w-md mx-auto">
          <div className="group relative rounded-3xl">
            {/* Inner glass form */}
            <div className="relative rounded-3xl border border-border/60 bg-gradient-card p-6 sm:p-8.5 shadow-elevated">
              {/* Tab Mode toggle */}
              <div className="mb-7 flex rounded-full border border-border/40 bg-input/20 p-1">
                {(["signin", "signup"] as const).map((m) => (
                  <button key={m} type="button" onClick={() => { setMode(m); setError(null); setInfo(null); }}
                    className={`flex-1 rounded-full py-3.5 text-sm font-bold tracking-wide transition-all duration-200 cursor-pointer ${mode === m ? "text-white shadow-glow" : "text-muted-foreground hover:text-foreground"}`}
                    style={mode === m ? { background: "linear-gradient(180deg, #2a8fc4 49.18%, #5ab8e0 113.93%)", boxShadow: "0 0 8px 0 rgba(255, 255, 255, 0.05), 0 -2px 0 0 rgba(0, 0, 0, 0.25) inset, 0 1px 0 0 rgba(255, 255, 255, 0.35) inset" } : undefined}>
                    {m === "signin" ? "Entrar" : "Cadastrar"}
                  </button>
                ))}
              </div>

              <h1 className="text-2.5xl sm:text-3xl font-black tracking-tight leading-tight">
                {mode === "signin" ? "Bem-vindo" : "Crie sua conta"}
              </h1>
              <p className="mt-2 text-xs.5 text-muted-foreground">
                {mode === "signin" ? "Monitore pegadas digitais com o console profissional." : "Inicie o monitoramento e crie alertas em tempo real."}
              </p>

              <form onSubmit={onSubmit} className="mt-6.5 space-y-4">
                {mode === "signup" && (
                  <label className="block animate-[fadeIn_0.2s_ease-out]">
                    <span className="mb-2 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome Completo</span>
                    <div className="flex items-center gap-2.5 rounded-full border border-border/60 bg-input/40 px-4 py-3.5 transition duration-200 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
                      <User className="h-4 w-4 text-muted-foreground/75" />
                      <input value={name} onChange={e => setName(e.target.value)} required placeholder="Seu nome" className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50" />
                    </div>
                  </label>
                )}

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">E-mail Corporativo</span>
                  <div className="flex items-center gap-2.5 rounded-full border border-border/60 bg-input/40 px-4 py-3.5 transition duration-200 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
                    <Mail className="h-4 w-4 text-muted-foreground/75" />
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="exemplo@empresa.com" className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50" />
                  </div>
                  {breach.state !== "idle" && (
                    <div className="mt-2 px-1.5">
                      {breach.state === "checking" && <p className="flex items-center gap-1.5 text-xs text-muted-foreground/80"><Loader2 className="h-3 w-3 animate-spin text-primary" />Auditando vazamentos de e-mail...</p>}
                      {breach.state === "safe" && <p className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium"><CheckCircle2 className="h-3.5 w-3.5" />Endereço de e-mail seguro nos vazamentos auditados.</p>}
                      {breach.state === "error" && <p className="text-xs text-muted-foreground/70">Erro temporário na auditoria de vazamentos.</p>}
                    </div>
                  )}
                  {breach.state === "breached" && (
                    <div className="mt-2 rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-xs text-destructive animate-[fadeIn_0.2s_ease-out]">
                      <p className="flex items-center gap-1.5 font-bold"><AlertTriangle className="h-4 w-4" />Este e-mail consta em {breach.breaches.length} vazamento(s) público(s)</p>
                      <p className="mt-1.5 text-destructive/80 leading-relaxed">Fontes: {breach.breaches.slice(0, 4).join(", ")}{breach.breaches.length > 4 ? "..." : ""}</p>
                    </div>
                  )}
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Senha Secreta</span>
                  <div className="flex items-center gap-2.5 rounded-full border border-border/60 bg-input/40 px-4 py-3.5 transition duration-200 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
                    <Lock className="h-4 w-4 text-muted-foreground/75" />
                    <input type={show ? "text" : "password"} required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50" />
                    <button type="button" onClick={() => setShow(s => !s)} className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors mr-1 cursor-pointer">{show ? "Ocultar" : "Mostrar"}</button>
                  </div>
                </label>

                {mode === "signup" && (
                  <label className="block animate-[fadeIn_0.2s_ease-out]">
                    <span className="mb-2 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Confirmar Senha</span>
                    <div className="flex items-center gap-2.5 rounded-full border border-border/60 bg-input/40 px-4 py-3.5 transition duration-200 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
                      <Lock className="h-4 w-4 text-muted-foreground/75" />
                      <input type={show ? "text" : "password"} required minLength={6} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50" />
                    </div>
                  </label>
                )}

                {error && <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs.5 text-destructive font-medium animate-[fadeIn_0.2s_ease-out]">{error}</p>}
                {info && <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs.5 text-emerald-400 font-medium animate-[fadeIn_0.2s_ease-out]">{info}</p>}

                {!isDev && <div ref={turnstileRef} className="flex justify-center my-4" />}

                <button type="submit" disabled={!turnstileToken} aria-busy={loading}
                  className="group/btn relative inline-flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full py-4 text-base font-bold text-white transition-all duration-300 hover:opacity-90 active:scale-[0.98] aria-busy:opacity-70 border-0"
                  style={{ background: "linear-gradient(180deg, #2a8fc4 49.18%, #5ab8e0 113.93%)", boxShadow: "0 0 6px 0 rgba(255, 255, 255, 0.05), 0 -2px 0 0 rgba(0, 0, 0, 0.25) inset, 0 1px 0 0 rgba(255, 255, 255, 0.35) inset" }}>
                  <span aria-hidden className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full" />
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Autenticando...</> : <>{mode === "signin" ? "Entrar na Conta" : "Criar Minha Conta"}<ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" /></>}
                </button>
              </form>

              <div className="my-6.5 flex items-center gap-3 text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest">
                <div className="h-px flex-1 bg-border/40" />ou continue com<div className="h-px flex-1 bg-border/40" />
              </div>

              <button onClick={googleLogin}
                className="flex w-full items-center justify-center gap-2.5 rounded-full border border-border/60 bg-card/40 px-4 py-4 text-base font-bold transition-all duration-300 hover:bg-card/70 hover:border-primary/50 hover:shadow-[0_0_25px_rgba(99,102,241,0.15)] cursor-pointer">
                <svg className="h-4.5 w-4.5" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1H12v2.9h5.35c-.23 1.5-1.7 4.4-5.35 4.4-3.22 0-5.85-2.67-5.85-5.95s2.63-5.95 5.85-5.95c1.84 0 3.07.78 3.78 1.45l2.57-2.48C16.78 3.94 14.65 3 12 3 6.98 3 2.95 7.03 2.95 12s4.03 9 9.05 9c5.22 0 8.68-3.66 8.68-8.83 0-.59-.06-1.04-.13-1.07z"/></svg>
                Entrar com o Google
              </button>
            </div>
          </div>

          <p className="mt-7 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "Não tem uma conta? " : "Já tem uma conta? "}
            <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setInfo(null); }} className="font-bold text-primary hover:text-primary-glow hover:underline transition-colors cursor-pointer">
              {mode === "signin" ? "Cadastre-se" : "Entrar"}
            </button>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs.5 text-muted-foreground/60 z-10 font-medium">
          Protegido por Cloudflare Turnstile · <a href="#" className="hover:text-foreground transition-colors">Termos</a> e <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>.
        </p>
      </div>

      <style>{`
        @property --angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
        @keyframes spin { to { --angle: 360deg; } }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <TermsDialog
        open={showTerms}
        onAccept={() => { sessionStorage.setItem("terms_accepted", "1"); setShowTerms(false); navigate({ to: redirectTo || "/dashboard" }); }}
        onCancel={() => { setShowTerms(false); }}
      />
    </div>
  );
}
