import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList,
  ReferenceLine,
} from "recharts";
import { Transaction } from "../types";
import { PieChart as PieIcon, BarChart2, TrendingUp, CreditCard, ChevronRight, ChevronLeft } from "lucide-react";
import { getMonthlyInstallmentsTotal, getActiveInstallmentsForMonth } from "../utils/installmentUtils";

interface FinanceChartsProps {
  transactions: Transaction[];
  budgets: Record<string, number>;
  selectedMonth: string; // YYYY-MM
  defaultSalary?: number;
}

const CATEGORY_COLORS = [
  "#38bdf8", // sky
  "#818cf8", // indigo
  "#c084fc", // purple
  "#f43f5e", // rose
  "#f59e0b", // amber
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#a3e635", // lime
  "#94a3b8", // slate
];

export default function FinanceCharts({
  transactions,
  budgets,
  selectedMonth,
  defaultSalary = 2500,
}: FinanceChartsProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "categories" | "history">("overview");
  const [isPieHovered, setIsPieHovered] = useState(false);

  const isLeft = (sec: string) => sec === "left" || sec === "esquerda" || sec === "despesas";

  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeBudgets = budgets || {};

  // 1. DADOS DO MÊS ATUAL (GASTOS DO MÊS - GRÁFICO EM PIZZA, SEM METAS)
  const currentMonthTransactions = safeTransactions.filter(
    (t) => isLeft(t?.tableSection) && !!t?.date && t.date.startsWith(selectedMonth)
  );
  const activeInstallments = getActiveInstallmentsForMonth(safeTransactions, selectedMonth);

  const leftExpenses = currentMonthTransactions.reduce(
    (sum, t) => {
      const val = typeof t.amount === "number" && !isNaN(t.amount) ? t.amount : 0;
      return t.isDiscount ? sum - val : sum + val;
    },
    0
  );
  const monthlyInstallments = getMonthlyInstallmentsTotal(safeTransactions, selectedMonth);
  const totalDespesas = leftExpenses + monthlyInstallments;

  const orcamento = safeBudgets[selectedMonth] !== undefined ? safeBudgets[selectedMonth] : (defaultSalary ?? 2500);
  const safeOrcamento = typeof orcamento === "number" && !isNaN(orcamento) ? orcamento : 0;
  const safeTotalDespesas = typeof totalDespesas === "number" && !isNaN(totalDespesas) ? totalDespesas : 0;

  const sobraMes = safeOrcamento - safeTotalDespesas;
  const sobraPositiva = Math.max(0, sobraMes);

  // Fatias do gráfico de pizza dos gastos do mês (sem metas)
  const monthlyPieData: Array<{ name: string; valor: number; fill: string; colorClass: string }> = [];
  if (safeTotalDespesas > 0 || safeOrcamento > 0) {
    if (monthlyInstallments > 0 && leftExpenses > 0) {
      monthlyPieData.push({
        name: "Despesas do Mês",
        valor: leftExpenses,
        fill: "#f43f5e",
        colorClass: "bg-rose-500 text-rose-400",
      });
      monthlyPieData.push({
        name: "Parcelas de Cartão",
        valor: monthlyInstallments,
        fill: "#c084fc",
        colorClass: "bg-purple-500 text-purple-400",
      });
    } else if (safeTotalDespesas > 0) {
      monthlyPieData.push({
        name: "Gastos do Mês",
        valor: safeTotalDespesas,
        fill: "#f43f5e",
        colorClass: "bg-rose-500 text-rose-400",
      });
    }

    if (sobraPositiva > 0) {
      monthlyPieData.push({
        name: "Quanto Sobrou",
        valor: sobraPositiva,
        fill: "#10b981",
        colorClass: "bg-emerald-500 text-emerald-400",
      });
    }
  }

  // 2. DADOS DE CATEGORIAS DO MÊS (GRÁFICO EM BARRAS)
  const categoryTotals: Record<string, number> = {};
  currentMonthTransactions.forEach((t) => {
    if (t.isDiscount) return;
    const cat = (t.category && t.category.trim()) || "Geral";
    const val = typeof t.amount === "number" && !isNaN(t.amount) ? t.amount : 0;
    categoryTotals[cat] = (categoryTotals[cat] || 0) + val;
  });
  activeInstallments.forEach((t) => {
    const cat = (t.category && t.category.trim()) || "Parcelas";
    const val = typeof t.amount === "number" && !isNaN(t.amount) ? t.amount : 0;
    categoryTotals[cat] = (categoryTotals[cat] || 0) + val;
  });

  const categoryBarData = Object.entries(categoryTotals)
    .filter(([_, val]) => val > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, val], idx) => ({
      name: cat,
      valor: val,
      fill: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
      percent: safeTotalDespesas > 0 ? (val / safeTotalDespesas) * 100 : 0,
      formatted: `R$ ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      shortFormatted: val >= 1000 ? `${(val / 1000).toFixed(1)}k` : `${val.toFixed(0)}`,
    }));

  // 3. DADOS DO HISTÓRICO GERAL DO ANO (GRÁFICO DE 2 LINHAS: GASTOS vs QUANTO SOBROU)
  const selectedYear = selectedMonth ? selectedMonth.substring(0, 4) : new Date().getFullYear().toString();
  const [historyYear, setHistoryYear] = useState<string>(selectedYear);

  useEffect(() => {
    if (selectedMonth && selectedMonth.substring(0, 4) !== historyYear) {
      setHistoryYear(selectedMonth.substring(0, 4));
    }
  }, [selectedMonth]);

  const handlePrevYear = () => {
    const y = parseInt(historyYear, 10);
    if (!isNaN(y)) setHistoryYear(String(y - 1));
  };
  const handleNextYear = () => {
    const y = parseInt(historyYear, 10);
    if (!isNaN(y)) setHistoryYear(String(y + 1));
  };

  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const fullMonthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const annualData = Array.from({ length: 12 }, (_, i) => {
    const monthNum = String(i + 1).padStart(2, "0");
    const m = `${historyYear}-${monthNum}`;

    const monthTransactions = safeTransactions.filter((t) => t.date && t.date.startsWith(m));
    const lExp = monthTransactions
      .filter((t) => isLeft(t.tableSection))
      .reduce((sum, t) => {
        const val = typeof t.amount === "number" && !isNaN(t.amount) ? t.amount : 0;
        return t.isDiscount ? sum - val : sum + val;
      }, 0);
    const mInst = getMonthlyInstallmentsTotal(safeTransactions, m);
    const totExp = lExp + mInst;
    const inc = safeBudgets[m] !== undefined ? safeBudgets[m] : (defaultSalary ?? 2500);
    const safeInc = typeof inc === "number" && !isNaN(inc) ? inc : 0;
    const sobra = safeInc - totExp;

    return {
      monthKey: m,
      monthLabel: monthNames[i],
      fullMonthName: `${fullMonthNames[i]} de ${historyYear}`,
      gastos: totExp,
      sobra: sobra,
      orcamento: safeInc,
      isCurrent: m === selectedMonth,
      hasActivity: monthTransactions.length > 0 || mInst > 0 || safeBudgets[m] !== undefined,
    };
  });

  const totalAnoGastos = annualData.reduce((acc, d) => acc + d.gastos, 0);
  const totalAnoSobra = annualData.reduce((acc, d) => acc + d.sobra, 0);

  const formatCurrency = (value?: number | null) => {
    const num = typeof value === "number" && !isNaN(value) ? value : 0;
    return `R$ ${num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatShortCurrency = (val: number) => {
    if (Math.abs(val) >= 1000) {
      const k = val / 1000;
      return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
    }
    return `${val}`;
  };

  // Custom Tooltip para o Gráfico de Pizza dos Gastos do Mês
  const CustomMonthPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const totalBase = Math.max(safeOrcamento, safeTotalDespesas);
      const pct = totalBase > 0 ? ((data.valor / totalBase) * 100).toFixed(1) : "0";
      return (
        <div className="bg-slate-950/98 border border-slate-700/80 p-3 rounded-2xl shadow-2xl backdrop-blur-md text-xs font-mono min-w-[180px] space-y-1 relative z-50">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: data.fill }} />
            <span className="font-bold text-white">{data.name}</span>
          </div>
          <div className="text-slate-300 flex justify-between gap-3">
            <span>Valor:</span>
            <span className="font-bold text-white">{formatCurrency(data.valor)}</span>
          </div>
          <div className="text-slate-400 flex justify-between gap-3 text-[11px]">
            <span>Proporção:</span>
            <span className="text-slate-200">{pct}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip para o Gráfico em Barras de Categorias
  const CustomCategoryBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-950/95 border border-slate-800 p-3 rounded-2xl shadow-2xl backdrop-blur-md text-xs font-mono min-w-[190px] space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: data.fill }} />
            <span className="font-bold text-white">{data.name}</span>
          </div>
          <div className="text-slate-300 flex justify-between gap-3">
            <span>Gasto:</span>
            <span className="font-bold text-white">{formatCurrency(data.valor)}</span>
          </div>
          <div className="text-slate-400 flex justify-between gap-3 text-[11px]">
            <span>% das despesas:</span>
            <span className="text-sky-300 font-bold">{data.percent.toFixed(1)}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip detalhado para o gráfico de 2 linhas do histórico anual
  const CustomHistoryTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-950/95 border border-slate-800 p-3.5 rounded-2xl shadow-2xl backdrop-blur-md text-xs font-mono min-w-[210px] space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
            <span className="font-bold text-white text-xs">{data.fullMonthName}</span>
            {data.isCurrent && (
              <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full font-sans font-bold">
                Mês Atual
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
              <span className="text-slate-300">Gastos:</span>
            </div>
            <span className="font-bold text-rose-400">{formatCurrency(data.gastos)}</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${data.sobra >= 0 ? "bg-emerald-500" : "bg-red-500"}`} />
              <span className="text-slate-300">Quanto Sobrou:</span>
            </div>
            <span className={`font-bold ${data.sobra >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {formatCurrency(data.sobra)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800/60 text-[11px] text-slate-400">
            <span>Receitas Base:</span>
            <span className="text-slate-300">{formatCurrency(data.orcamento)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* CAIXA ENQUADRAMENTO ESTILO BENTO "VISÃO GERAL - GRÁFICO" */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-4 sm:p-6 shadow-sm">
        {/* Abas centralizadas para alternar visualizações (somente ícones proporcionais) */}
        <div className="flex items-center justify-center mb-5">
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800/80 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              title="Gastos do Mês"
              aria-label="Gastos do Mês"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                activeTab === "overview"
                  ? "bg-slate-800 text-rose-400 shadow-sm border border-slate-700/60"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <PieIcon className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("categories")}
              title="Categorias"
              aria-label="Categorias"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                activeTab === "categories"
                  ? "bg-slate-800 text-sky-400 shadow-sm border border-slate-700/60"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <BarChart2 className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              title="Histórico do Ano"
              aria-label="Histórico do Ano"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                activeTab === "history"
                  ? "bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/60"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <TrendingUp className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 1. VISUALIZAÇÃO PRINCIPAL: GASTOS DO MÊS EM PIZZA (SEM METAS) */}
        {activeTab === "overview" && (
          <div>
            {monthlyPieData.length === 0 ? (
              <div className="h-60 flex flex-col items-center justify-center text-slate-500 text-xs font-mono space-y-1">
                <span>Nenhum gasto ou receita registrado para este mês.</span>
                <span className="text-[11px] text-slate-600 font-sans">
                  Adicione despesas na tabela para visualizar o gráfico.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Donut / Pizza de Gastos do Mês */}
                <div className="md:col-span-6 h-60 relative flex justify-center items-center">
                  <div className="w-full h-full relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={monthlyPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={82}
                          paddingAngle={3}
                          dataKey="valor"
                          onMouseEnter={() => setIsPieHovered(true)}
                          onMouseLeave={() => setIsPieHovered(false)}
                        >
                          {monthlyPieData.map((entry, index) => (
                            <Cell key={`month-pie-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={<CustomMonthPieTooltip />}
                          wrapperStyle={{ zIndex: 100, pointerEvents: "none" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div
                    className={`absolute inset-0 flex flex-col justify-center items-center pointer-events-none z-0 transition-opacity duration-200 ${
                      isPieHovered ? "opacity-0" : "opacity-100"
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Gastos do Mês
                    </span>
                    <span className="text-sm font-black font-mono text-white">
                      {formatCurrency(safeTotalDespesas)}
                    </span>
                    {safeOrcamento > 0 && (
                      <span className="text-[10px] font-sans text-slate-400 mt-0.5">
                        {((safeTotalDespesas / safeOrcamento) * 100).toFixed(0)}% da receita
                      </span>
                    )}
                  </div>
                </div>

                {/* Resumo e Indicadores do Mês (Sem Metas) */}
                <div className="md:col-span-6 space-y-2.5">
                  {/* Card: Gastos Totais */}
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                        <span className="text-slate-300 font-medium">Gastos Totais (Despesas)</span>
                      </div>
                      <span className="font-bold font-mono text-rose-400 text-sm">
                        {formatCurrency(safeTotalDespesas)}
                      </span>
                    </div>
                    {monthlyInstallments > 0 && (
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/50 pl-4.5">
                        <span>Despesas diretas: {formatCurrency(leftExpenses)}</span>
                        <span className="text-purple-300">Parcelas: {formatCurrency(monthlyInstallments)}</span>
                      </div>
                    )}
                  </div>

                  {/* Card: Quanto Sobrou */}
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            sobraMes >= 0 ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        <span className="text-slate-300 font-medium">Quanto Sobrou (Saldo Livre)</span>
                      </div>
                      <span
                        className={`font-bold font-mono text-sm ${
                          sobraMes >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {formatCurrency(sobraMes)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/50 pl-4.5">
                      <span>Status mensal:</span>
                      <span className={sobraMes >= 0 ? "text-emerald-400 font-medium" : "text-rose-400 font-medium"}>
                        {sobraMes >= 0 ? "Superávit disponível" : "Atenção: Gastos superaram a receita"}
                      </span>
                    </div>
                  </div>

                  {/* Card: Receita Base */}
                  <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                      <span className="text-slate-400">Receitas Base (Orçamento)</span>
                    </div>
                    <span className="font-bold font-mono text-slate-200">
                      {formatCurrency(safeOrcamento)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. VISUALIZAÇÃO: CATEGORIAS DO MÊS EM BARRAS */}
        {activeTab === "categories" && (
          <div className="space-y-4">
            {categoryBarData.length === 0 ? (
              <div className="h-60 flex flex-col items-center justify-center text-slate-500 text-xs font-mono space-y-1">
                <span>Nenhuma despesa por categoria registrada neste mês.</span>
                <span className="text-[11px] text-slate-600 font-sans">
                  Adicione despesas com categorias na tabela para visualizar o gráfico em barras.
                </span>
              </div>
            ) : (
              <>
                {/* O Gráfico em Barras de Categorias */}
                <div className="h-64 sm:h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categoryBarData}
                      margin={{ top: 25, right: 15, left: -20, bottom: 20 }}
                      barSize={Math.max(20, Math.min(42, Math.floor(360 / categoryBarData.length)))}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 500 }}
                        stroke="#1e293b"
                        tickLine={false}
                        axisLine={{ stroke: "#1e293b" }}
                        interval={0}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        stroke="#1e293b"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => formatShortCurrency(val)}
                      />
                      <Tooltip content={<CustomCategoryBarTooltip />} cursor={{ fill: "rgba(255, 255, 255, 0.04)" }} />
                      <Bar dataKey="valor" radius={[8, 8, 0, 0]}>
                        {categoryBarData.map((entry, index) => (
                          <Cell key={`cat-cell-${index}`} fill={entry.fill} />
                        ))}
                        <LabelList
                          dataKey="shortFormatted"
                          position="top"
                          fill="#cbd5e1"
                          fontSize={10}
                          fontWeight={600}
                          offset={6}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Lista e Ranking das Categorias Abaixo do Gráfico */}
                <div className="pt-3 border-t border-slate-800/80">
                  <div className="text-[11px] font-semibold text-slate-400 mb-2.5">
                    Detalhamento das despesas por categoria ({categoryBarData.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {categoryBarData.map((item) => (
                      <div
                        key={item.name}
                        className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: item.fill }}
                            />
                            <span className="text-slate-200 font-medium truncate">{item.name}</span>
                          </div>
                          <span className="font-bold font-mono text-white text-xs shrink-0">
                            {item.formatted}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <div className="w-full bg-slate-800 rounded-full h-1.5 mr-2 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, Math.max(2, item.percent))}%`,
                                backgroundColor: item.fill,
                              }}
                            />
                          </div>
                          <span className="shrink-0 font-mono font-bold text-slate-300">
                            {item.percent.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* 3. VISUALIZAÇÃO: GRÁFICO DE 2 LINHAS - HISTÓRICO GERAL DO ANO (GASTOS vs QUANTO SOBROU) */}
        {activeTab === "history" && (
          <div className="space-y-4">
            {/* Controles do Ano e Resumo dos Totais */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 border border-slate-800/80 p-3 rounded-2xl">
              {/* Seletor do Ano */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2 py-1 rounded-xl">
                <button
                  type="button"
                  onClick={handlePrevYear}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Ano anterior"
                  aria-label="Ano anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-bold font-mono text-white px-1 tracking-wide">
                  {historyYear}
                </span>
                <button
                  type="button"
                  onClick={handleNextYear}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Próximo ano"
                  aria-label="Próximo ano"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Indicadores dos Totais Acumulados no Ano */}
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-xl">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span className="text-slate-400 text-[11px] font-sans">Gastos:</span>
                  <span className="font-bold text-rose-400">{formatCurrency(totalAnoGastos)}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-slate-400 text-[11px] font-sans">Sobrou:</span>
                  <span className={`font-bold ${totalAnoSobra >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {formatCurrency(totalAnoSobra)}
                  </span>
                </div>
              </div>
            </div>

            {/* O Gráfico Linear de 2 Linhas */}
            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={annualData}
                  margin={{ top: 15, right: 15, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis
                    dataKey="monthLabel"
                    tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
                    stroke="#1e293b"
                    tickLine={false}
                    axisLine={{ stroke: "#1e293b" }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    stroke="#1e293b"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => formatShortCurrency(val)}
                  />
                  <Tooltip content={<CustomHistoryTooltip />} />
                  <ReferenceLine y={0} stroke="#334155" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    name="Gastos"
                    dataKey="gastos"
                    stroke="#f43f5e"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#f43f5e", strokeWidth: 2, stroke: "#020617" }}
                    activeDot={{ r: 6, fill: "#fb7185", stroke: "#ffffff", strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    name="Quanto Sobrou"
                    dataKey="sobra"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#020617" }}
                    activeDot={{ r: 6, fill: "#34d399", stroke: "#ffffff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Legenda explicativa com valores e contraste */}
            <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-1 rounded-full bg-rose-500 shrink-0" />
                  <span className="text-slate-300 font-medium">Gastos (Despesas Reais)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-1 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-slate-300 font-medium">Quanto Sobrou (Saldo Livre)</span>
                </div>
              </div>
              <span className="text-slate-500 text-[10px]">
                Toque ou passe o cursor sobre os pontos para detalhes
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
