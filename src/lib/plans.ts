export interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  color: string;
  popular?: boolean;
  features: string[];
}

export const PLANS: Plan[] = [
  { id: "economic", name: "Economic", price: 5.45, period: "1 dia", color: "#2a8fc4", features: ["1 dia de acesso", "50 buscas por dia", "Até 300 resultados", "Acesso a todas as fontes", "Suporte prioritário"] },
  { id: "starter", name: "Starter", price: 4.12, period: "7 dias", color: "#2a8fc4", features: ["7 dias de acesso", "15 buscas por dia", "Até 250 resultados", "Acesso a todas as fontes", "Suporte prioritário"] },
  { id: "premium", name: "Premium", price: 8.20, period: "15 dias", color: "#2a8fc4", features: ["15 dias de acesso", "50 buscas por dia", "Até 500 resultados", "Acesso a todas as fontes", "Suporte prioritário"] },
  { id: "advanced", name: "Advanced", price: 10.95, period: "7 dias", color: "#2a8fc4", features: ["7 dias de acesso", "100 buscas por dia", "Até 800 resultados", "Acesso a todas as fontes", "Suporte prioritário"] },
  { id: "vip", name: "VIP", price: 13.70, period: "30 dias", color: "#2a8fc4", popular: true, features: ["30 dias de acesso", "200 buscas por dia", "Até 1.000 resultados", "Acesso a todas as fontes", "Suporte prioritário"] },
  { id: "ultra15", name: "Ultra 15D", price: 19.20, period: "15 dias", color: "#2a8fc4", features: ["15 dias de acesso", "500 buscas por dia", "Até 5.000 resultados", "Acesso a todas as fontes", "Suporte VIP"] },
  { id: "ultra30", name: "Ultra 30D", price: 19.20, period: "30 dias", color: "#2a8fc4", features: ["30 dias de acesso", "500 buscas por dia", "Até 5.000 resultados", "Acesso a todas as fontes", "Suporte VIP"] },
  { id: "elite15", name: "Elite 15D", price: 45.00, period: "15 dias", color: "#2a8fc4", features: ["15 dias de acesso", "Buscas ilimitadas", "Até 50.000 resultados", "Acesso a todas as fontes", "Suporte VIP exclusivo"] },
  { id: "elite", name: "Elite", price: 82.50, period: "Vitalício", color: "#2a8fc4", features: ["Acesso vitalício", "Buscas ilimitadas", "Até 50.000 resultados", "Acesso a todas as fontes", "Suporte VIP exclusivo"] },
];
