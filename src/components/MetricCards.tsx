import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  CreditCard,
  Target,
  ChevronRight,
  MoreVertical,
  Plus,
  Layers,
  Sparkles,
} from "lucide-react";
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
  onOpenAddModal?: (section: "left" | "right" | "bottom_left") => void;
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
  onOpenAddModal,
}: MetricCardsProps) {
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetValueInput, setBudgetValueInput] = useState(budget ? String(budget) : "");

  const safeBudget = typeof budget === "number" && !isNaN(budget) ? budget : 0;
  const safeLeft = typeof leftExpensesTotal === "number" && !isNaN(leftExpensesTotal) ? leftExpensesTotal : 0;
  const safeRight = typeof rightExpensesTotal === "number" && !isNaN(rightExpensesTotal) ? rightExpensesTotal : 0;
  const safeSobra = typeof sobra === "number" && !isNaN(sobra) ? sobra : 0;

  // Saldo Previsto (Orçamento + Ganhos - Despesas - Parcelas)
  const saldoPrevisto = safeSobra;
  // Saldo em contas / Disponível
  const saldoDisponivel = safeBudget;

  const handleSaveBudget = () => {
    const parsed = parseFloat(budgetValueInput.replace(",", "."));
    if (!isNaN(parsed) && parsed >= 0) {
      setBudget(parsed);
    }
    setIsEditingBudget(false);
  };

  return (
    <div className="space-y-4">
      {/* 1. DUAS PÍLULAS SUPERIORES DE ENQUADRAMENTO (SALDO EM CONTAS / SALDO PREVISTO) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Pílula 1: Saldo em contas / Entrada */}
        <div
          onClick={() => setIsEditingBudget(true)}
          className="bg-slate-900 border border-slate-800/80 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 flex flex-col justify-center transition-all hover:border-slate-700 shadow-sm cursor-pointer group"
          title="Clique para ajustar o Orçamento"
        >
          <span className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">
            Saldo em contas
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xs sm:text-sm font-semibold text-slate-400 font-mono">R$</span>
            <span className="text-base sm:text-2xl font-black font-mono text-white tracking-tight truncate">
              <AnimatedNumber value={saldoDisponivel} duration={800} />
            </span>
          </div>
        </div>

        {/* Pílula 2: Saldo previsto (Sobra) */}
        <div
          onClick={() => {
            if (onOpenExpensesModal) onOpenExpensesModal();
          }}
          className="bg-slate-900 border border-slate-800/80 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 flex flex-col justify-center transition-all hover:border-slate-700 shadow-sm cursor-pointer group"
          title="Clique para ver o resumo detalhado das despesas"
        >
          <span className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">
            Saldo previsto
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xs sm:text-sm font-semibold text-slate-400 font-mono">R$</span>
            <span
              className={`text-base sm:text-2xl font-black font-mono tracking-tight truncate ${
                saldoPrevisto >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              <AnimatedNumber value={saldoPrevisto} duration={800} />
            </span>
          </div>
        </div>
      </div>

      {/* MODAL / INPUT OVERLAY PARA EDITAR ORÇAMENTO SE CLICADO NA PÍLULA */}
      {isEditingBudget && (
        <div className="p-4 bg-slate-900 border border-emerald-500/30 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Editar Orçamento Mensal</p>
              <p className="text-[10px] text-slate-400">Digite o valor líquido total de entrada para este mês</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-40">
              <span className="absolute left-3 top-2 text-xs font-mono font-bold text-slate-400">R$</span>
              <input
                type="number"
                step="0.01"
                autoFocus
                value={budgetValueInput}
                onChange={(e) => setBudgetValueInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveBudget();
                  if (e.key === "Escape") setIsEditingBudget(false);
                }}
                className="w-full bg-slate-950 border border-slate-700 text-white font-mono text-sm font-bold pl-9 pr-3 py-1.5 rounded-xl focus:border-emerald-500 focus:outline-none"
                placeholder="0.00"
              />
            </div>
            <button
              type="button"
              onClick={handleSaveBudget}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer transition-colors"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setIsEditingBudget(false)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* 2. CAIXA PRINCIPAL / ENQUADRAMENTO "VISÃO GERAL" (ESTILO DO DESIGN DE REFERÊNCIA) */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-4 sm:p-6 shadow-sm">
        {/* Título de seção sutil estilo bento */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-emerald-400/90 tracking-wide">
            Visão geral
          </span>
          <button
            type="button"
            onClick={() => {
              if (onOpenExpensesModal) onOpenExpensesModal();
            }}
            className="p-1 text-slate-500 hover:text-slate-300 cursor-pointer rounded-lg hover:bg-slate-800/60"
            title="Mais opções de visão geral"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {/* Linhas de Itens com Círculos Coloridos e Chevrons */}
        <div className="space-y-4">
          {/* Linha 1: Receitas (Orçamento) */}
          <div
            onClick={() => setIsEditingBudget(true)}
            className="flex items-center justify-between group cursor-pointer hover:bg-slate-800/40 p-2 rounded-2xl transition-all -mx-2"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Receitas
                </h4>
                <p className="text-[11px] text-slate-400 truncate">
                  Orçamento de entradas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-sm sm:text-base font-black font-mono text-white">
                  {safeBudget.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {safeBudget.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>

          {/* Linha 2: Despesas (Gastos do Mês) */}
          <div
            onClick={() => {
              if (onOpenExpensesModal) onOpenExpensesModal();
            }}
            className="flex items-center justify-between group cursor-pointer hover:bg-slate-800/40 p-2 rounded-2xl transition-all -mx-2"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform">
                <TrendingDown className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">
                  Despesas
                </h4>
                <p className="text-[11px] text-slate-400 truncate">
                  Contas do mês e saídas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-sm sm:text-base font-black font-mono text-white">
                  {safeLeft.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {safeLeft.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>

          {/* Linha 3: Metas / Planejado */}
          <div
            onClick={() => {
              if (onOpenPlanningModal) onOpenPlanningModal("planning");
            }}
            className="flex items-center justify-between group cursor-pointer hover:bg-slate-800/40 p-2 rounded-2xl transition-all -mx-2"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
                <Target className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white group-hover:text-orange-300 transition-colors">
                  Metas
                </h4>
                <p className="text-[11px] text-slate-400 truncate">
                  Planejamento e metas futuras
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-sm sm:text-base font-black font-mono text-white">
                  {safeRight.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {safeRight.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>

          {/* Linha 4: Saldo do mês (Sobra Líquida) */}
          <div
            onClick={() => {
              if (onOpenExpensesModal) onOpenExpensesModal();
            }}
            className="flex items-center justify-between group cursor-pointer hover:bg-slate-800/40 p-2 rounded-2xl transition-all -mx-2"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                <DollarSign className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Saldo do mês
                </h4>
                <p className="text-[11px] text-slate-400 truncate">
                  Sobra / Economia acumulada
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className={`text-sm sm:text-base font-black font-mono ${safeSobra >= 0 ? "text-white" : "text-rose-400"}`}>
                  {safeSobra.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {safeSobra.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
