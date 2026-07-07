import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { NoxLogo } from "@/components/NoxLogo";
import { Check, Loader2, ArrowLeft, Clock, Copy, Sparkles } from "lucide-react";
import { listPlans, createPixPayment, listMyPayments, checkPaymentStatus } from "@/lib/billing.functions";

export const Route = createFileRoute("/_authenticated/comprar/$planId")({
  component: BuyPage,
});

const PLAN_LABELS: Record<string, string> = {
  economic: "Economic", starter: "Starter", premium: "Premium",
  advanced: "Advanced", vip: "VIP", ultra15: "Ultra 15D",
  ultra30: "Ultra 30D", elite15: "Elite 15D", elite: "Elite",
};

function BuyPage() {
  const { planId } = useParams({ from: "/_authenticated/comprar/$planId" });
  const qc = useQueryClient();
  const fetchPlans = useServerFn(listPlans);
  const fetchMine = useServerFn(listMyPayments);
  const createPay = useServerFn(createPixPayment);
  const checkStatus = useServerFn(checkPaymentStatus);

  const { data: plans } = useQuery({ queryKey: ["plans"], queryFn: () => fetchPlans({}) });
  const { data: mine, refetch } = useQuery({ queryKey: ["my-payments"], queryFn: () => fetchMine({}), refetchInterval: 5000 });

  const plan = (plans ?? []).find((p: any) => p.id === planId);
  const pending = (mine ?? []).find((p: any) => p.plan_id === planId && p.status === "pending");
  const recentlyPaid = (mine ?? []).find((p: any) => p.plan_id === planId && p.status === "paid");

  const create = useMutation({
    mutationFn: () => createPay({ data: { planId } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-payments"] }); refetch(); },
  });

  const attemptedRef = useRef(false);
  useEffect(() => {
    if (attemptedRef.current) return;
    if (recentlyPaid) return;
    if (pending && hasValidPix(pending)) return;
    if (create.isPending || create.data) return;
    attemptedRef.current = true;
    create.mutate();
  }, []);

  useEffect(() => {
    if (!pending) return;
    const i = setInterval(() => {
      checkStatus({ data: { paymentId: pending.id } }).then((r: any) => {
        if (r.status === "paid") { refetch(); qc.invalidateQueries({ queryKey: ["my-payments"] }); }
      }).catch(() => {});
    }, 4000);
    return () => clearInterval(i);
  }, [pending?.id]);

  const [copied, setCopied] = useState(false);

  const planName = plan?.name || PLAN_LABELS[planId] || planId;
  const planPrice = plan ? `R$ ${Number(plan.price_brl).toFixed(2)}` : "";
  const planInfo = plan
    ? `${planPrice} • ${plan.daily_search_limit} buscas/dia • ${plan.monthly_result_limit} resultados/mês`
    : "";

  const hasValidPix = (p: any) => p?.pix_qr_code || p?.pix_copy_paste;
  const payment = create.data || (hasValidPix(pending) ? pending : null);

  return (
    <div className="min-h-screen bg-[#080b0f] text-white">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-48 left-1/3 h-[800px] w-[800px] rounded-full blur-[250px]" style={{ background: "rgba(42,143,196,0.08)" }} />
        <div className="absolute -bottom-48 right-1/4 h-[600px] w-[600px] rounded-full blur-[200px]" style={{ background: "rgba(90,184,224,0.05)" }} />
        <div className="absolute top-1/2 left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[180px]" style={{ background: "rgba(42,143,196,0.03)" }} />
      </div>

      <header className="relative border-b border-white/[0.06] bg-[#0a0e12]/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <Link to="/" className="group flex items-center gap-2.5">
            <div className="transition duration-300 group-hover:scale-105">
              <NoxLogo className="h-8 w-auto sm:h-12" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold tracking-[0.15em] text-white">NOXINTEL</span>
              <span className="text-[7px] font-medium uppercase tracking-[0.15em] text-white/30">OSINT Suite</span>
            </div>
          </Link>
          <Link to="/planos" className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-white/40 transition-all hover:border-white/[0.12] hover:text-white/70">
            <ArrowLeft className="h-3 w-3" /> Outros planos
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-xl px-4 sm:px-6 py-8 sm:py-12">
        {recentlyPaid ? (
          <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/[0.07] to-transparent p-8 text-center">
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.08),transparent_70%)]" />
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
              <Check className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-white">Pagamento Confirmado!</h2>
            <p className="mt-2 text-sm text-emerald-400/80">Seu plano {planName} já está ativo.</p>
            <Link to="/dashboard" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] hover:shadow-emerald-500/30">
              Acessar Painel <Sparkles className="h-4 w-4" />
            </Link>
          </div>
        ) : payment ? (
          <div className="relative">
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-transparent p-6 sm:p-8">
              <div aria-hidden className="pointer-events-none absolute -inset-px rounded-2xl opacity-30" style={{ background: "linear-gradient(135deg, rgba(42,143,196,0.3), transparent 50%, rgba(90,184,224,0.15))" }} />

              <div className="relative">
                <div className="flex items-center gap-2 text-sm text-amber-400/80 mb-6">
                  <Clock className="h-4 w-4" />
                  <span>Aguardando pagamento</span>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5 mb-6">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30">Plano</div>
                  <div className="mt-1 text-lg font-bold text-white">{planName}</div>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-4xl font-bold tracking-tight text-white">R$ {Number(payment.amount_brl).toFixed(2).replace(".", ",")}</span>
                  </div>
                  {plan && (
                    <div className="mt-2 flex gap-3 text-[11px] text-white/40">
                      <span>{plan.daily_search_limit} buscas/dia</span>
                      <span className="text-white/10">|</span>
                      <span>{plan.monthly_result_limit} resultados/mês</span>
                    </div>
                  )}
                </div>

                {payment.pix_copy_paste?.startsWith("data:image") && <BlueQR src={payment.pix_copy_paste} pixCode={payment.pix_qr_code} copied={copied} onCopy={() => { navigator.clipboard.writeText(payment.pix_qr_code); setCopied(true); setTimeout(() => setCopied(false), 2000); }} />}

                {!payment.pix_copy_paste?.startsWith("data:image") && payment.pix_copy_paste?.startsWith("http") && (
                  <a href={payment.pix_copy_paste} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2a8fc4] to-[#5ab8e0] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#2a8fc4]/20 transition-all hover:scale-[1.02]">
                    Abrir Pagamento
                  </a>
                )}

                <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2a8fc4]/10">
                      <Sparkles className="h-4 w-4 text-[#5ab8e0]" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white/80">Ativação automática</div>
                      <div className="mt-0.5 text-xs text-white/40 leading-relaxed">
                        Assim que o pagamento for confirmado pela instituição financeira, seu plano será ativado instantaneamente — sem necessidade de envio de comprovante ou suporte manual.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : create.isError ? (
          <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-b from-red-500/[0.05] to-transparent p-8 text-center">
            <div className="text-sm font-medium text-red-400">{(create.error as any)?.message || "Erro ao gerar Pix"}</div>
            <button onClick={() => { attemptedRef.current = false; create.reset(); create.mutate(); }} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2a8fc4] to-[#5ab8e0] px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#2a8fc4]/20 transition-all hover:scale-[1.02]">
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent p-12 text-center">
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(42,143,196,0.06),transparent_70%)]" />
            </div>
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#2a8fc4]/10">
              <Loader2 className="h-8 w-8 animate-spin text-[#5ab8e0]" />
            </div>
            <div className="relative mt-4 text-sm font-medium text-white/60">Gerando seu Pix…</div>
          </div>
        )}
      </main>
    </div>
  );
}

function BlueQR({ src, pixCode, copied, onCopy }: { src: string; pixCode: string; copied: boolean; onCopy: () => void }) {
  const [blueSrc, setBlueSrc] = useState("");

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height);
      for (let i = 0; i < d.data.length; i += 4) {
        const brightness = 0.299 * d.data[i] + 0.587 * d.data[i + 1] + 0.114 * d.data[i + 2];
        if (brightness < 160) {
          d.data[i] = 42;
          d.data[i + 1] = 143;
          d.data[i + 2] = 196;
          d.data[i + 3] = 255;
        } else {
          d.data[i + 3] = 0;
        }
      }
      ctx.putImageData(d, 0, 0);
      setBlueSrc(c.toDataURL("image/png"));
    };
    img.src = src;
  }, [src]);

  if (!blueSrc) {
    return (
      <div className="flex flex-col items-center gap-4 mb-6">
        <div className="h-52 w-52 sm:h-56 sm:w-56 rounded-lg bg-[#0d1b2a] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 mb-6">
      <div className="relative group">
        <div aria-hidden className="absolute -inset-3 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: "radial-gradient(ellipse at center, rgba(42,143,196,0.2), transparent 70%)" }} />
        <div className="relative rounded-xl bg-gradient-to-br from-[#0d1b2a] via-[#1b2838] to-[#0d1b2a] p-3 sm:p-4 shadow-[0_0_30px_rgba(42,143,196,0.15)]">
          <div aria-hidden className="pointer-events-none absolute inset-0 rounded-xl border border-white/[0.06]" />
          <div aria-hidden className="pointer-events-none absolute inset-0 rounded-xl" style={{ background: "linear-gradient(135deg, rgba(42,143,196,0.1), transparent 50%, rgba(90,184,224,0.05))" }} />
          <img src={blueSrc} alt="QR Code PIX" className="relative h-52 w-52 sm:h-56 sm:w-56 rounded-lg" />
        </div>
      </div>
      {pixCode && (
        <button onClick={onCopy} className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-xs font-semibold tracking-wider text-white/70 transition-all hover:border-[#2a8fc4]/30 hover:bg-[#2a8fc4]/[0.06] hover:text-white">
          <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.04] to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          <Copy className="h-3.5 w-3.5" />
          {copied ? "Copiado!" : "Copiar código PIX"}
        </button>
      )}
    </div>
  );
}
