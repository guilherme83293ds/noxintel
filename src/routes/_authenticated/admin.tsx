import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createLicenseKey, listLicenseKeys, verifyAdminKey, listAllUsers } from "@/lib/billing.functions";
import { NoxLogo } from "@/components/NoxLogo";
import { ArrowLeft, Loader2, Key, Copy, CheckCheck, Users, Zap, CheckCircle, XCircle, Clock } from "lucide-react";
import { useState } from "react";
import { PLANS } from "@/lib/plans";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminGate({ onVerified }: { onVerified: () => void }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const doVerify = useServerFn(verifyAdminKey);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await doVerify({ data: { key: input.trim() } });
      if (res.ok) {
        sessionStorage.setItem("admin_key", input.trim());
        onVerified();
      } else {
        setError(res.error || "Chave inválida");
      }
    } catch (err: any) {
      setError(err?.message || "Erro ao verificar chave");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6 rounded-2xl border border-zinc-800/60 bg-zinc-900/60 p-8 backdrop-blur-xl shadow-2xl shadow-purple-900/10">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-violet-800 shadow-lg shadow-purple-600/30">
            <Key className="h-6 w-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold">NoxIntel</h1>
            <p className="text-xs text-zinc-500">painel administrativo</p>
          </div>
        </div>
        <p className="text-center text-sm text-zinc-400">Digite a chave secreta para acessar</p>
        <div className="space-y-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            type="password"
            placeholder="Chave secreta"
            autoFocus
            className="w-full rounded-xl border border-zinc-700/50 bg-zinc-800/50 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
          />
          {error && <p className="text-center text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-violet-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-600/20 transition hover:from-purple-500 hover:to-violet-600 hover:shadow-purple-500/30 disabled:opacity-50"
          >
            {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Entrar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="ml-2 inline-flex items-center gap-1.5 rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-2.5 py-1 text-xs text-zinc-300 transition hover:bg-zinc-700/50 hover:text-zinc-100"
    >
      {copied ? <CheckCircle className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

function AdminPage() {
  const [verified, setVerified] = useState(!!sessionStorage.getItem("admin_key"));
  const adminKey = sessionStorage.getItem("admin_key") || "";
  if (!verified) return <AdminGate onVerified={() => setVerified(true)} />;
  return <AdminContent adminKey={adminKey} />;
}

function AdminContent({ adminKey }: { adminKey: string }) {
  const qc = useQueryClient();
  const doCreateKey = useServerFn(createLicenseKey);
  const doListKeys = useServerFn(listLicenseKeys);
  const doListUsers = useServerFn(listAllUsers);

  const { data: licenseKeys, refetch: refetchKeys } = useQuery({ queryKey: ["license-keys"], queryFn: () => doListKeys({ data: { adminKey } }) });
  const { data: users } = useQuery({ queryKey: ["all-users"], queryFn: () => doListUsers({ data: { adminKey } }) });

  const [keyForm, setKeyForm] = useState({ planId: "", durationDays: 30 });
  const [generatedKey, setGeneratedKey] = useState<any>(null);

  const [keyError, setKeyError] = useState("");
  const gerarChave = useMutation({
    mutationFn: () => doCreateKey({ data: { adminKey, planId: keyForm.planId, durationDays: keyForm.durationDays } }),
    onSuccess: (data) => {
      setGeneratedKey(data);
      setKeyError("");
      refetchKeys();
    },
    onError: (err: any) => setKeyError(err?.message || "Erro ao gerar chave"),
  });

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      {/* Top bar */}
      <header className="border-b border-zinc-800/60 bg-zinc-900/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <NoxLogo className="h-14 w-auto" />
            <span className="text-base font-bold">
              NoxIntel <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-400">admin</span>
            </span>
          </Link>
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-300">
            <ArrowLeft className="h-4 w-4" /> Painel
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-10">
        {/* Stats row */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
                <Users className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(users ?? []).length}</p>
                <p className="text-xs text-zinc-500">Usuários cadastrados</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <Key className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(licenseKeys ?? []).length}</p>
                <p className="text-xs text-zinc-500">Chaves geradas</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                <Zap className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{PLANS.length}</p>
                <p className="text-xs text-zinc-500">Planos disponíveis</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* Users column */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 backdrop-blur-xl">
              <div className="mb-5 flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-400" />
                <h2 className="text-base font-semibold">Usuários</h2>
              </div>
              {(!users || users.length === 0) ? (
                <p className="text-sm text-zinc-500">Nenhum usuário cadastrado.</p>
              ) : (
                <div className="-mx-6 space-y-1">
                  {(users ?? []).map((u: any, i: number) => (
                    <div key={u.id} className={`flex items-center gap-4 px-6 py-3 transition hover:bg-zinc-800/30 ${i > 0 ? "border-t border-zinc-800/30" : ""}`}>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-600/30 to-violet-800/30 text-xs font-bold text-purple-300">
                        {(u.full_name || u.email || "?")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{u.full_name || "Sem nome"}</p>
                        <p className="truncate text-xs text-zinc-500">{u.email || ""}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-zinc-600">{new Date(u.created_at).toLocaleDateString("pt-BR")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Key generator column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Generate key */}
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 backdrop-blur-xl">
              <div className="mb-5 flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-400" />
                <h2 className="text-base font-semibold">Gerar chave</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-500 uppercase tracking-wider">Plano</label>
                  <select
                    value={keyForm.planId}
                    onChange={(e) => setKeyForm({ ...keyForm, planId: e.target.value })}
                    className="w-full rounded-xl border border-zinc-700/50 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="">Selecione</option>
                    {PLANS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — R$ {p.price.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-500 uppercase tracking-wider">Duração (dias)</label>
                  <input
                    type="number"
                    min={1}
                    value={keyForm.durationDays}
                    onChange={(e) => setKeyForm({ ...keyForm, durationDays: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full rounded-xl border border-zinc-700/50 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
                <button
                  onClick={() => gerarChave.mutate()}
                  disabled={gerarChave.isPending || !keyForm.planId}
                  className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-violet-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-600/20 transition hover:from-purple-500 hover:to-violet-600 hover:shadow-purple-500/30 disabled:opacity-50"
                >
                  {gerarChave.isPending ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Gerar chave"}
                </button>
              </div>

              {keyError && (
                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                  <p className="text-xs text-red-400">{keyError}</p>
                </div>
              )}

              {generatedKey && (
                <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <p className="text-xs font-medium uppercase tracking-wider text-emerald-400">Chave gerada com sucesso</p>
                  </div>
                  <div className="flex items-center rounded-lg bg-zinc-800/80 px-3 py-2 font-mono text-sm text-emerald-300">
                    <span className="flex-1 truncate">{generatedKey.key}</span>
                    <CopyButton text={generatedKey.key} />
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    {generatedKey.plan_name} • Expira em {new Date(generatedKey.expires_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              )}
            </div>

            {/* Recent keys */}
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 backdrop-blur-xl">
              <div className="mb-5 flex items-center gap-2">
                <Clock className="h-5 w-5 text-zinc-400" />
                <h2 className="text-base font-semibold">Últimas chaves</h2>
              </div>
              {(!licenseKeys || licenseKeys.length === 0) ? (
                <p className="text-sm text-zinc-500">Nenhuma chave gerada.</p>
              ) : (
                <div className="-mx-6 space-y-1">
                  {(licenseKeys ?? []).slice(0, 10).map((k: any) => (
                    <div key={k.key} className="flex items-center gap-3 border-t border-zinc-800/30 px-6 py-3 transition hover:bg-zinc-800/30">
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${k.active ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                        {k.active ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> : <XCircle className="h-3.5 w-3.5 text-red-400" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <code className="truncate font-mono text-xs text-zinc-300">{k.key}</code>
                          <CopyButton text={k.key} />
                        </div>
                        <p className="mt-0.5 text-[11px] text-zinc-600">
                          {k.plan_name} • {new Date(k.expires_at).toLocaleDateString("pt-BR")}
                          {k.user_id ? " • Resgatada" : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
