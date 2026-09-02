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
  const activeInstallments = getActiveInstallmentsForMonth(transactions, selectedMonth);

  // Contas & Reservas simuladas inteligentes baseadas nas categorias ou parcelas
  const installmentAccounts = activeInstallments.slice(0, 4).map((inst) => {
    const remainingCount = getRemainingInstallments(inst.date, selectedMonth);
    const totalRemaining = inst.amount * remainingCount;
    return {
      id: inst.id,
      title: inst.description,
      subtitle: `${remainingCount}x parcelas restantes`,
      amount: totalRemaining,
      monthly: inst.amount,
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
        {/* Conta Principal / Saldo Reserva */}
        <div className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-800/40 transition-all -mx-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
              Itaú
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-white truncate">Conta Corrente / Reserva</h4>
              <p className="text-[11px] text-slate-400 truncate">Saldo disponível mensal</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-black font-mono text-white">
              {budget.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">Disponível</div>
          </div>
        </div>

        {/* Nuconta / Cartões */}
        <div className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-800/40 transition-all -mx-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-700 flex items-center justify-center text-white font-bold text-xs shadow-sm">
              NU
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-white truncate">Nuconta / Cartão Digital</h4>
              <p className="text-[11px] text-slate-400 truncate">Limite & movimentação</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-black font-mono text-emerald-400">Ativo</div>
            <div className="text-[10px] text-slate-500 font-mono">Em dia</div>
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
                {item.monthly.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                Total: {item.amount.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
