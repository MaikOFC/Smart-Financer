import React from "react";
import { TrendingUp, TrendingDown, DollarSign, Wallet } from "lucide-react";

interface MetricCardsProps {
  budget: number;
  setBudget: (val: number) => void;
  leftExpensesTotal: number;
  rightExpensesTotal: number;
  bottomIncomesTotal: number;
  sobra: number;
}

export default function MetricCards({
  budget,
  setBudget,
  leftExpensesTotal,
  rightExpensesTotal,
  bottomIncomesTotal,
  sobra,
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

      {/* Gastos Mensais (Tabela Esquerda) */}
      <div id="card-left-expenses" className="bg-slate-900 border border-slate-800/80 p-6 rounded-3xl transition-all hover:border-slate-700 hover:shadow-lg hover:shadow-rose-500/5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gastos do Mês</span>
          <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-2xl border border-rose-500/20">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5 mb-2">
          <span className="text-sm font-bold text-rose-400 font-mono">R$</span>
          <span className="text-2xl font-black font-mono text-white tracking-tight">
            {leftExpensesTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <p className="text-xs text-slate-500">Total da planilha esquerda (com descontos)</p>
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
            {sobra.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <p className="text-xs text-slate-500">Orçamento menos as despesas do mês</p>
      </div>

      {/* Planejamento & Recebíveis (Direita + Parcelas) */}
      <div id="card-others-summary" className="bg-slate-900 border border-slate-800/80 p-6 rounded-3xl transition-all hover:border-slate-700 hover:shadow-lg hover:shadow-indigo-500/5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Planejado & Parcelas</span>
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <div className="text-slate-300 text-sm space-y-2 pt-1 font-mono">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500" title="Compras futuras e planejamentos (não deduzidos do saldo)">Planejado (Direita):</span>
            <span className="font-bold text-amber-400">
              R$ {rightExpensesTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500" title="Soma dos saldos devedores restantes de todas as parcelas ativas">Saldo Parcelas:</span>
            <span className="font-bold text-amber-400">
              R$ {bottomIncomesTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
