import React from "react";
import { TrendingUp, TrendingDown, DollarSign, Wallet, ExternalLink } from "lucide-react";
import AnimatedNumber from "./AnimatedNumber";

interface MetricCardsProps {
  budget: number;
  setBudget: (val: number) => void;
  leftExpensesTotal: number;
  rightExpensesTotal: number;
  bottomIncomesTotal: number;
  sobra: number;
  viewMode?: "compact" | "full";
  onOpenExpensesModal?: () => void;
  onOpenPlanningModal?: (tab?: "planning" | "installments") => void;
}

export default function MetricCards({
  budget,
  setBudget,
  leftExpensesTotal,
  rightExpensesTotal,
  bottomIncomesTotal,
  sobra,
  viewMode = "compact",
  onOpenExpensesModal,
  onOpenPlanningModal,
}: MetricCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Orçamento Mensal */}
      <div id="card-budget" className="bg-slate-900 border border-slate-800/80 p-6 rounded-3xl transition-all hover:border-slate-700 hover:shadow-lg hover:shadow-indigo-500/5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Orçamento / Entrada</span>
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5 mb-2">
          <span className="text-sm font-bold text-emerald-400 font-mono">R$</span>
          <input
            id="input-budget-value"
            type="number"
            step="0.01"
            value={budget || ""}
            onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
            className="text-2xl font-black font-mono text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 focus:outline-none w-full transition-all"
            placeholder="0,00"
          />
        </div>
        <p className="text-xs text-slate-500">Defina o orçamento para o mês ativo</p>
      </div>

      {/* Gastos Mensais - INTERATIVO */}
      <div
        id="card-left-expenses"
        onClick={() => {
          if (onOpenExpensesModal) onOpenExpensesModal();
        }}
        className={`bg-slate-900 border border-slate-800/80 p-6 rounded-3xl transition-all hover:border-rose-500/40 hover:shadow-xl hover:shadow-rose-500/10 ${
          onOpenExpensesModal ? "cursor-pointer group relative overflow-hidden" : ""
        }`}
        title="Clique para abrir e gerenciar os Gastos do Mês"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest group-hover:text-rose-300 transition-colors">
              Gastos do Mês
            </span>
            {onOpenExpensesModal && (
              <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-rose-400 transition-colors" />
            )}
          </div>
          <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-2xl border border-rose-500/20 group-hover:scale-105 transition-transform">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5 mb-2">
          <span className="text-sm font-bold text-rose-400 font-mono">R$</span>
          <span className="text-2xl font-black font-mono text-white tracking-tight group-hover:text-rose-200 transition-colors">
            <AnimatedNumber value={leftExpensesTotal} duration={1000} />
          </span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">Despesas e parcelas ativas do mês</p>
          {viewMode === "compact" && (
            <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
              Ver lista ↗
            </span>
          )}
        </div>
      </div>

      {/* Sobra (Orçamento - Gastos Mensais) */}
      <div id="card-sobra" className="bg-slate-900 border border-slate-800/80 p-6 rounded-3xl transition-all hover:border-slate-700 hover:shadow-lg hover:shadow-emerald-500/5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sobra / Economia</span>
          <div className={`p-2.5 rounded-2xl border ${sobra >= 0 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"}`}>
            <Wallet className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5 mb-2">
          <span className="text-sm font-bold text-slate-500 font-mono">R$</span>
          <span className={`text-2xl font-black font-mono tracking-tight ${sobra >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            <AnimatedNumber value={sobra} duration={1000} />
          </span>
        </div>
        <p className="text-xs text-slate-500">Orçamento menos gastos e parcelas do mês</p>
      </div>

      {/* Planejamento & Recebíveis - INTERATIVO */}
      <div
        id="card-others-summary"
        onClick={() => {
          if (onOpenPlanningModal) onOpenPlanningModal("planning");
        }}
        className={`bg-slate-900 border border-slate-800/80 p-6 rounded-3xl transition-all hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/10 ${
          onOpenPlanningModal ? "cursor-pointer group relative overflow-hidden" : ""
        }`}
        title="Clique para abrir e gerenciar Planejamento & Parcelas"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest group-hover:text-indigo-300 transition-colors">
              Planejado & Parcelas
            </span>
            {onOpenPlanningModal && (
              <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
            )}
          </div>
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20 group-hover:scale-105 transition-transform">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <div className="text-slate-300 text-sm space-y-2 pt-1 font-mono">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500" title="Compras futuras e planejamentos">Planejado:</span>
            <span className="font-bold text-amber-400 group-hover:text-amber-300">
              R$ <AnimatedNumber value={rightExpensesTotal} duration={1000} />
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500" title="Soma dos saldos devedores restantes de todas as parcelas ativas">Saldo Parcelas:</span>
            <span className="font-bold text-amber-400 group-hover:text-amber-300">
              R$ <AnimatedNumber value={bottomIncomesTotal} duration={1000} />
            </span>
          </div>
        </div>
        {viewMode === "compact" && (
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex justify-end">
            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
              Ver metas ↗
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
