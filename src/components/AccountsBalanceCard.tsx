import React from "react";
import { Transaction } from "../types";
import { Layers, CreditCard, ChevronRight, Plus, Building2, Wallet } from "lucide-react";
import { getActiveInstallmentsForMonth, getRemainingInstallments } from "../utils/installmentUtils";

interface AccountsBalanceCardProps {
  transactions: Transaction[];
  selectedMonth: string;
  budget: number;
  onOpenPlanningModal?: (tab?: "planning" | "installments") => void;
  onOpenAddModal?: (section: "bottom_left" | "left" | "right") => void;
}

export default function AccountsBalanceCard({
  transactions,
  selectedMonth,
  budget,
  onOpenPlanningModal,
  onOpenAddModal,
}: AccountsBalanceCardProps) {
  const safeBudget = typeof budget === "number" && !isNaN(budget) ? budget : 0;
  const activeInstallments = getActiveInstallmentsForMonth(transactions || [], selectedMonth || "");

  // Contas & Reservas simuladas inteligentes baseadas nas categorias ou parcelas
  const installmentAccounts = activeInstallments.slice(0, 4).map((inst) => {
    const remainingCount = getRemainingInstallments(inst.date, selectedMonth);
    const instMonthly = typeof inst.amount === "number" && !isNaN(inst.amount) ? inst.amount : 0;
    const safeRemaining = typeof remainingCount === "number" && !isNaN(remainingCount) ? remainingCount : 0;
    const totalRemaining = instMonthly * safeRemaining;
    return {
      id: inst.id,
      title: inst.description || "Parcela",
      subtitle: `${safeRemaining}x parcelas restantes`,
      amount: totalRemaining,
      monthly: instMonthly,
      color: "bg-purple-600",
      type: "parcela",
    };
  });

  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-4 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-semibold text-emerald-400/90 tracking-wide">
          Saldo em contas & Parcelas
        </span>
        <button
          type="button"
          onClick={() => {
            if (onOpenPlanningModal) onOpenPlanningModal("installments");
          }}
          className="text-[11px] font-bold text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors cursor-pointer"
        >
          Ver todas <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-3">
        {/* Contas Bancárias Integradas - Em Desenvolvimento */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/50 border border-slate-800/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300 shrink-0">
              <Building2 className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-white truncate">Contas Bancárias</h4>
              <p className="text-[11px] text-slate-400 truncate">Integração e sincronização automática</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold tracking-wide">
              Em Desenvolvimento
            </span>
          </div>
        </div>

        {/* Parcelas / Financiamentos Ativos */}
        {installmentAccounts.map((item) => (
          <div
            key={item.id}
            onClick={() => {
              if (onOpenPlanningModal) onOpenPlanningModal("installments");
            }}
            className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-800/40 transition-all -mx-2 cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 group-hover:scale-105 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                  {item.title}
                </h4>
                <p className="text-[11px] text-slate-400 truncate">{item.subtitle}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-black font-mono text-purple-300">
                {(item.monthly || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                Total: {(item.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
