import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Target,
  ChevronRight,
  Eye,
  EyeOff,
  Edit3,
  Check,
  X,
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
  monthlyInstallmentsTotal?: number;
  directExpensesTotal?: number;
  gainsTotal?: number;
  totalIncomes?: number;
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
  monthlyInstallmentsTotal = 0,
  directExpensesTotal,
  gainsTotal = 0,
  totalIncomes,
  onOpenExpensesModal,
  onOpenPlanningModal,
  onOpenAddModal,
}: MetricCardsProps) {
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetValueInput, setBudgetValueInput] = useState(budget ? String(budget) : "");
  const [isPrivate, setIsPrivate] = useState<boolean>(() => {
    try {
      return localStorage.getItem("smartfin_privacy_mode") === "true";
    } catch {
      return false;
    }
  });

  const togglePrivacy = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPrivate((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("smartfin_privacy_mode", String(next));
      } catch {}
      return next;
    });
  };

  const safeBudget = typeof budget === "number" && !isNaN(budget) ? budget : 0;
  const safeGains = typeof gainsTotal === "number" && !isNaN(gainsTotal) ? gainsTotal : 0;
  const safeTotalIncomes = typeof totalIncomes === "number" && !isNaN(totalIncomes) ? totalIncomes : (safeBudget + safeGains);
  const safeLeft = typeof leftExpensesTotal === "number" && !isNaN(leftExpensesTotal) ? Math.max(0, leftExpensesTotal) : 0;
  const safeRight = typeof rightExpensesTotal === "number" && !isNaN(rightExpensesTotal) ? rightExpensesTotal : 0;
  const safeSobra = typeof sobra === "number" && !isNaN(sobra) ? sobra : 0;
  const safeInstallments = typeof monthlyInstallmentsTotal === "number" && !isNaN(monthlyInstallmentsTotal) ? monthlyInstallmentsTotal : 0;
  const safeDirect = typeof directExpensesTotal === "number" && !isNaN(directExpensesTotal)
    ? Math.max(0, directExpensesTotal)
    : Math.max(0, safeLeft - safeInstallments);

  // Índices de saúde financeira baseados na receita total real do mês
  const baseRevenue = safeTotalIncomes > 0 ? safeTotalIncomes : safeBudget;
  const percentSpent = baseRevenue > 0 ? Math.min(100, Math.round((safeLeft / baseRevenue) * 100)) : (safeLeft > 0 ? 100 : 0);
  const percentFree = Math.max(0, 100 - percentSpent);
  const isHealthy = safeSobra >= 0;

  const handleSaveBudget = () => {
    const parsed = parseFloat(budgetValueInput.replace(",", "."));
    if (!isNaN(parsed) && parsed >= 0) {
      setBudget(parsed);
    }
    setIsEditingBudget(false);
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* =========================================================================
          1. CARTÃO MESTRE DE SALDO (HERO ULTRAVIOLET & OBSIDIAN FINISH)
          Inspirado na estética refinada do Apple Card e Nubank Ultravioleta:
          Fundo obsidiana profundo, hairline metálico e tipografia tabular nítida.
         ========================================================================= */}
      <div
        className="relative overflow-hidden rounded-3xl border border-slate-800/90 bg-gradient-to-b from-[#0f1420] via-[#0c1017] to-[#090d14] p-5 sm:p-7 shadow-xl shadow-black/40 transition-all duration-300 group hover:border-slate-700"
      >
        {/* Hairline metálico superior com gradiente sutil esmeralda/ultravioleta */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/35 via-emerald-400/35 to-transparent pointer-events-none" />

        {/* Glow atmosférico suave no fundo */}
        <div
          className={`absolute -top-20 -right-20 w-56 h-56 rounded-full blur-[90px] pointer-events-none opacity-25 transition-colors duration-500 ${
            isHealthy ? "bg-emerald-500/20" : "bg-rose-500/20"
          }`}
        />

        {/* Linha Superior: Rótulo + Status de Saúde + Controles Táteis */}
        <div className="relative flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center border shrink-0 transition-colors shadow-sm ${
                isHealthy
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/25"
              }`}
            >
              <Wallet className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-400 block font-sans">
                Saldo Livre Disponível
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isHealthy ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]"
                  }`}
                />
                <span
                  className={`text-[11px] font-semibold ${
                    isHealthy ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {isHealthy
                    ? `${percentFree}% do orçamento livre`
                    : `Déficit de R$ ${formatCurrency(Math.abs(safeSobra))}`}
                </span>
              </div>
            </div>
          </div>

          {/* Ações Rápidas: Modo Privacidade + Ajustar Orçamento */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={togglePrivacy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50 text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
              title={isPrivate ? "Revelar valores" : "Ocultar valores (Modo Privacidade)"}
            >
              {isPrivate ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[11px]">Oculto</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px]">Privacidade</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setBudgetValueInput(budget ? String(budget) : "");
                setIsEditingBudget(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50 text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
              title="Ajustar Orçamento do Mês"
            >
              <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px]">Ajustar</span>
            </button>
          </div>
        </div>

        {/* Saldo Principal com Tipografia Financeira de Alta Precisão */}
        <div className="relative py-1.5 sm:py-2.5">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                isHealthy ? "text-emerald-400/90" : "text-rose-400/90"
              }`}
            >
              R$
            </span>
            <div
              className={`text-3xl sm:text-5xl font-black font-mono tracking-tight tabular-nums transition-all duration-300 ${
                isPrivate
                  ? "filter blur-md select-none text-slate-400"
                  : isHealthy
                  ? "text-white"
                  : "text-rose-400"
              }`}
            >
              {isPrivate ? "••••••" : <AnimatedNumber value={safeSobra} duration={700} />}
            </div>
          </div>
        </div>

        {/* Barra de Consumo & Progresso Minimalista (Ultrafina, Estilo Fintech) */}
        <div className="relative mt-3 pt-3 border-t border-slate-800/70">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-2">
            <div className="flex items-center gap-1.5">
              <span>Comprometido:</span>
              <span
                className={`font-mono tabular-nums ${
                  isPrivate ? "filter blur-xs" : isHealthy ? "text-slate-200" : "text-rose-400 font-bold"
                }`}
              >
                {isPrivate ? "••••" : `R$ ${formatCurrency(safeLeft)}`}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">({percentSpent}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>Livre:</span>
              <span
                className={`font-mono tabular-nums ${
                  isPrivate ? "filter blur-xs" : isHealthy ? "text-emerald-400 font-bold" : "text-slate-400"
                }`}
              >
                {isPrivate ? "••••" : `R$ ${formatCurrency(safeSobra)}`}
              </span>
            </div>
          </div>

          {/* Barra com acabamento refinado de 6px */}
          <div className="h-1.5 w-full bg-slate-950/90 rounded-full overflow-hidden border border-slate-800/80 flex shadow-inner">
            <div
              style={{ width: `${percentSpent}%` }}
              className={`h-full transition-all duration-700 rounded-l-full ${
                percentSpent > 95
                  ? "bg-rose-500"
                  : percentSpent > 75
                  ? "bg-amber-500"
                  : "bg-indigo-500"
              }`}
            />
            <div
              style={{ width: `${Math.max(0, 100 - percentSpent)}%` }}
              className="h-full bg-emerald-500/80 transition-all duration-700 rounded-r-full"
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL / FORMULÁRIO INLINE: AJUSTAR ORÇAMENTO MENSAL
         ========================================================================= */}
      {isEditingBudget && (
        <div className="p-4 sm:p-5 bg-slate-900 border border-emerald-500/40 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-white">Ajustar Orçamento Mensal</p>
              <p className="text-[11px] text-slate-400">Informe a soma de salário e receitas líquidas previstas para este mês</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-44">
              <span className="absolute left-3 top-2.5 text-xs font-mono font-bold text-slate-400">R$</span>
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
                className="w-full bg-slate-950 border border-slate-700 text-white font-mono text-sm font-bold pl-9 pr-3 py-2 rounded-xl focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                placeholder="0.00"
              />
            </div>
            <button
              type="button"
              onClick={handleSaveBudget}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setIsEditingBudget(false)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl cursor-pointer transition-colors"
              title="Cancelar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          2. BENTO GRID: 4 CARTÕES DE APOIO FINANCEIRO
          Layout limpo, acabamento obsidiana com acentos semânticos sofisticados.
         ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Receitas Totais */}
        <div
          onClick={() => {
            setBudgetValueInput(budget ? String(budget) : "");
            setIsEditingBudget(true);
          }}
          className="bg-[#0b0f17] border border-slate-800/80 hover:border-slate-700 rounded-3xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 cursor-pointer group relative overflow-hidden"
          title="Clique para ajustar o Orçamento"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-400 font-sans">Receitas</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-[11px] font-bold font-mono text-slate-500">R$</span>
              <span
                className={`text-base sm:text-xl font-black font-mono tracking-tight text-white tabular-nums truncate ${
                  isPrivate ? "filter blur-xs" : ""
                }`}
              >
                {isPrivate ? "••••••" : formatCurrency(safeTotalIncomes)}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 group-hover:text-emerald-400 transition-colors font-medium">
              {safeGains > 0 ? (
                <span className="text-emerald-400 font-semibold truncate">
                  Orçamento + R$ {formatCurrency(safeGains)} extras
                </span>
              ) : (
                <>
                  <span>Orçamento previsto</span>
                  <Edit3 className="w-2.5 h-2.5 inline opacity-70" />
                </>
              )}
            </p>
          </div>
        </div>

        {/* Card 2: Despesas Diretas */}
        <div
          onClick={() => {
            if (onOpenExpensesModal) onOpenExpensesModal();
          }}
          className="bg-[#0b0f17] border border-slate-800/80 hover:border-slate-700 rounded-3xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 cursor-pointer group relative overflow-hidden"
          title="Clique para ver os gastos do mês"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-400 font-sans">Despesas Diretas</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <TrendingDown className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-[11px] font-bold font-mono text-slate-500">R$</span>
              <span
                className={`text-base sm:text-xl font-black font-mono tracking-tight text-white tabular-nums truncate ${
                  isPrivate ? "filter blur-xs" : ""
                }`}
              >
                {isPrivate ? "••••••" : formatCurrency(safeDirect)}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 group-hover:text-rose-400 transition-colors font-medium">
              <span>Contas de consumo</span>
              <ChevronRight className="w-2.5 h-2.5 inline opacity-70" />
            </p>
          </div>
        </div>

        {/* Card 3: Parcelas Ativas (Inspirado no Nubank Ultravioleta) */}
        <div
          onClick={() => {
            if (onOpenPlanningModal) onOpenPlanningModal("installments");
          }}
          className="bg-[#0b0f17] border border-slate-800/80 hover:border-slate-700 rounded-3xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 cursor-pointer group relative overflow-hidden"
          title="Clique para ver parcelas e compromissos"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-400 font-sans">Parcelas Ativas</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Layers className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-[11px] font-bold font-mono text-slate-500">R$</span>
              <span
                className={`text-base sm:text-xl font-black font-mono tracking-tight text-purple-300 tabular-nums truncate ${
                  isPrivate ? "filter blur-xs" : ""
                }`}
              >
                {isPrivate ? "••••••" : formatCurrency(safeInstallments)}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 group-hover:text-purple-300 transition-colors font-medium">
              <span>Devidas no mês</span>
              <ChevronRight className="w-2.5 h-2.5 inline opacity-70" />
            </p>
          </div>
        </div>

        {/* Card 4: Metas & Reservas */}
        <div
          onClick={() => {
            if (onOpenPlanningModal) onOpenPlanningModal("planning");
          }}
          className="bg-[#0b0f17] border border-slate-800/80 hover:border-slate-700 rounded-3xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 cursor-pointer group relative overflow-hidden"
          title="Clique para ver suas metas e planejamento futuro"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-400 font-sans">Metas & Reservas</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Target className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-[11px] font-bold font-mono text-slate-500">R$</span>
              <span
                className={`text-base sm:text-xl font-black font-mono tracking-tight text-amber-300 tabular-nums truncate ${
                  isPrivate ? "filter blur-xs" : ""
                }`}
              >
                {isPrivate ? "••••••" : formatCurrency(safeRight)}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 group-hover:text-amber-300 transition-colors font-medium">
              <span>Projeções futuras</span>
              <ChevronRight className="w-2.5 h-2.5 inline opacity-70" />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
