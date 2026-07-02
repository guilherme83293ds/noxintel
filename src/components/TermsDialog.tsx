import * as Dialog from "@radix-ui/react-dialog";
import * as Checkbox from "@radix-ui/react-checkbox";
import { ShieldCheck, X } from "lucide-react";
import { useState } from "react";

const btnGrad = "linear-gradient(180deg, #2a8fc4 49.18%, #5ab8e0 113.93%)";
const btnShadow = "0 0 8px 0 rgba(255, 255, 255, 0.05), 0 -2px 0 0 rgba(0, 0, 0, 0.25) inset, 0 1px 0 0 rgba(255, 255, 255, 0.35) inset";

export function TermsDialog({ open, onAccept, onCancel }: { open: boolean; onAccept: () => void; onCancel: () => void }) {
  const [checked, setChecked] = useState(false);

  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid max-w-lg translate-x-[-50%] translate-y-[-50%] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] gap-0 overflow-hidden rounded-[1.5rem] border border-blue-500/20 bg-[linear-gradient(180deg,rgba(8,12,32,0.96),rgba(5,8,22,0.96)_46%,rgba(12,18,50,0.92))] p-0 text-white shadow-[0_26px_90px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-2xl sm:max-w-[620px] sm:rounded-[1.75rem]">
          <div className="flex flex-col sm:text-left space-y-3 px-5 pb-4 pt-5 text-left sm:px-7 sm:pb-5 sm:pt-7">
            <Dialog.Title className="flex items-start gap-3 text-[1.35rem] font-semibold leading-tight tracking-normal text-white sm:text-2xl">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-blue-400/20 bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:h-10 sm:w-10">
                <ShieldCheck className="h-5 w-5 text-blue-400" />
              </span>
              <span className="bg-gradient-to-r from-white via-blue-300 to-cyan-200 bg-clip-text text-transparent">Acordo de Uso — NoxIntel</span>
            </Dialog.Title>
            <Dialog.Description className="max-w-[34rem] text-sm leading-relaxed text-zinc-400 sm:text-[15px]">
              Leia e aceite nossos termos para acessar a plataforma de inteligência OSINT.
            </Dialog.Description>
          </div>

          <div className="space-y-3 px-4 pb-4 sm:px-7 sm:pb-5">
            <div className="relative overflow-hidden rounded-[1.35rem] border border-blue-500/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.018))] shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]">
              <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/20 to-transparent" />
              <div className="border-b border-white/[0.055] px-4 py-3 sm:px-5">
                <h3 className="text-sm font-semibold text-blue-300 sm:text-base">Regras de Uso</h3>
              </div>
              <div className="custom-scrollbar max-h-[42dvh] space-y-3 overflow-y-auto px-4 py-4 pr-3 text-[13px] leading-relaxed text-zinc-300 sm:max-h-[330px] sm:px-5 sm:text-sm">
                <p>Ao utilizar a NoxIntel, você declara estar ciente e concordar com os seguintes termos:</p>
                <ul className="list-disc space-y-2 pl-5 marker:text-blue-400/80">
                  <li>Você é o único responsável pelo uso dos dados consultados na plataforma.</li>
                  <li>As consultas devem ser feitas apenas sobre números telefônicos, e-mails ou documentos para os quais você possui autorização legal.</li>
                  <li>É proibido utilizar os resultados para atividades ilícitas, assédio, fraudes ou qualquer violação de direitos de terceiros.</li>
                  <li>O serviço deve ser usado de forma racional, sem sobrecarregar os servidores ou automatizar consultas via robots/scripts.</li>
                  <li>A versão web da NoxIntel não pode ser utilizada como API pública ou privada.</li>
                  <li>Você não deve compartilhar seus créditos de consulta ou conta com terceiros não autorizados.</li>
                  <li>NoxIntel não se responsabiliza pelo uso indevido das informações obtidas por meio da plataforma.</li>
                </ul>
                <p>A NoxIntel emprega técnicas avançadas de inteligência de fontes abertas para auxiliar investigações legítimas. O usuário reconhece que as informações são obtidas de fontes públicas e que a exatidão dos dados pode variar. Recomenda-se sempre verificar os resultados antes de tomar decisões baseadas neles.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-[1.25rem] border border-blue-500/15 bg-white/[0.025] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] sm:p-4">
              <Checkbox.Root
                id="terms"
                checked={checked}
                onCheckedChange={(v) => setChecked(v === true)}
                className="peer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white mt-0.5 h-5 w-5 rounded-[0.45rem] border border-blue-400/30 bg-black/30 text-white ring-offset-zinc-950 data-[state=checked]:border-blue-400 data-[state=checked]:bg-[linear-gradient(180deg,rgba(60,130,255,0.92),rgba(40,100,220,0.88))] data-[state=checked]:shadow-[0_8px_22px_rgba(60,130,255,0.18),inset_0_1px_0_rgba(255,255,255,0.2)]"
              >
                <Checkbox.Indicator className="flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 6l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </Checkbox.Indicator>
              </Checkbox.Root>
              <label htmlFor="terms" className="cursor-pointer text-sm font-medium leading-snug text-zinc-100 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 sm:text-[15px]">
                Li e aceito os termos de uso da plataforma NoxIntelOSINT
              </label>
            </div>
          </div>

          <div className="grid gap-2 border-t border-white/[0.06] bg-black/20 px-4 py-4 sm:grid-cols-[1fr_1fr] sm:px-7">
            <button
              onClick={onAccept}
              disabled={!checked}
              className="flex-1 rounded-full py-3.5 text-sm font-bold tracking-wide transition-all duration-200 cursor-pointer text-white shadow-glow disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: checked ? btnGrad : "rgba(255,255,255,0.04)", boxShadow: checked ? btnShadow : "none" }}
            >
              Aceitar & Entrar
            </button>
            <button
              onClick={onCancel}
              className="flex-1 rounded-full py-3.5 text-sm font-bold tracking-wide transition-all duration-200 cursor-pointer text-zinc-400 hover:text-white"
              style={{ background: "rgba(255,255,255,0.04)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" }}
            >
              Cancelar
            </button>
          </div>

          <Dialog.Close asChild>
            <button type="button" className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
              <X className="h-4 w-4" />
              <span className="sr-only">Fechar</span>
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
