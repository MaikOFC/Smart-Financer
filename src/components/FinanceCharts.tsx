import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList,
} from "recharts";
import { Transaction } from "../types";
import { PieChart as PieIcon, BarChart2, TrendingUp, CreditCard, ChevronRight } from "lucide-react";
import { getMonthlyInstallmentsTotal, getActiveInstallmentsForMonth } from "../utils/installmentUtils";

interface FinanceChartsProps {
  transactions: Transaction[];
  budgets: Record<string, number>;
  selectedMonth: string; // YYYY-MM
  defaultSalary?: number;
}

const PIE_COLORS = [
  "#10b981", // emerald
  "#ef4444", // rose
  "#f97316", // orange
  "#6366f1", // indigo
  "#38bdf8", // sky
  "#a855f7", // purple
  "#fbbf24", // amber
  "#64748b", // slate
];

export default function FinanceCharts({
  transactions,
  budgets,
  selectedMonth,
  defaultSalary = 2500,
}: FinanceChartsProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "categories" | "history">("overview");

  const isLeft = (sec: string) => sec === "left" || sec === "esquerda" || sec === "despesas";
  const isRight = (sec: string) => sec === "right" || sec === "direito" || sec === "direita" || sec === "planejamento";

  // 1. DADOS DO MÊS ATUAL PARA O GRÁFICO "VISÃO GERAL - GRÁFICO" (IDÊNTICO À IMAGEM)
  const currentMonthTransactions = transactions.filter(
    (t) => isLeft(t.tableSection) && !!t.date && t.date.startsWith(selectedMonth)
  );
  const activeInstallments = getActiveInstallmentsForMonth(transactions, selectedMonth);

  const leftExpenses = currentMonthTransactions.reduce(
    (sum, t) => (t.isDiscount ? sum - t.amount : sum + t.amount),
    0
  );
  const monthlyInstallments = getMonthlyInstallmentsTotal(transactions, selectedMonth);
  const totalDespesas = leftExpenses + monthlyInstallments;

  const currentMonthPlanning = transactions
    .filter((t) => isRight(t.tableSection))
    .reduce((sum, t) => sum + t.amount, 0);

  const orcamento = budgets[selectedMonth] !== undefined ? budgets[selectedMonth] : defaultSalary;

  // Três barras principais: Receitas (Verde), Despesas (Vermelho), Desp. cartão/Planejado (Laranja)
  const monthlyOverviewData = [
    {
      name: "Receitas",
      valor: orcamento,
      fill: "#22c55e",
      formatted: orcamento.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    },
    {
      name: "Despesas",
      valor: totalDespesas,
      fill: "#ef4444",
      formatted: totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    },
    {
      name: "Desp. cartão",
      valor: currentMonthPlanning,
      fill: "#f97316",
      formatted: currentMonthPlanning.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    },
  ];

  // 2. DADOS DE CATEGORIAS DO MÊS (PIE CHART)
  const categoryTotals: Record<string, number> = {};
  currentMonthTransactions.forEach((t) => {
    if (t.isDiscount) return;
    const cat = t.category || "Outros";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
  });
  activeInstallments.forEach((t) => {
    const cat = t.category || "Parcelas";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
  });
  const pieData = Object.keys(categoryTotals).map((cat) => ({
    name: cat,
    value: categoryTotals[cat],
  }));

  // 3. DADOS DO HISTÓRICO ANUAL
  const allMonths = Array.from(
    new Set(
      transactions
        .filter((t) => isLeft(t.tableSection) || t.tableSection === "bottom_left")
        .map((t) => t.date?.substring(0, 7))
        .filter(Boolean)
    )
  ).sort();

  const annualData = allMonths.map((m) => {
    const monthTransactions = transactions.filter((t) => t.date && t.date.startsWith(m));
    const lExp = monthTransactions
      .filter((t) => isLeft(t.tableSection))
      .reduce((sum, t) => (t.isDiscount ? sum - t.amount : sum + t.amount), 0);
    const mInst = getMonthlyInstallmentsTotal(transactions, m);
    const totExp = lExp + mInst;
    const inc = budgets[m] !== undefined ? budgets[m] : defaultSalary;

    const [year, month] = m.split("-");
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const monthLabel = `${monthNames[parseInt(month) - 1]}/${year.substring(2)}`;

    return {
      monthKey: m,
      monthLabel,
      despesas: totExp,
      orcamento: inc,
      sobra: inc - totExp,
    };
  });

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Custom Tooltip
  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-950/95 border border-slate-800 p-3 rounded-2xl shadow-xl backdrop-blur-md text-xs font-mono">
          <p className="font-bold text-white mb-1">{data.name}</p>
          <p className="text-slate-300">
            Valor: <span className="font-bold text-white">{formatCurrency(data.valor)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* CAIXA ENQUADRAMENTO ESTILO BENTO "VISÃO GERAL - GRÁFICO" */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-4 sm:p-6 shadow-sm">
        {/* Cabeçalho do Enquadramento */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-emerald-400/90 tracking-wide">
            Visão geral - gráfico
          </span>

          {/* Abas discretas no canto superior direito para alternar visualizações */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                activeTab === "overview"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Mês
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("categories")}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                activeTab === "categories"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Categorias
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                activeTab === "history"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Histórico
            </button>
          </div>
        </div>

        {/* 1. VISUALIZAÇÃO PRINCIPAL: BARRAS EM PÍLULA VERTICAL (ESTILO REFERÊNCIA) */}
        {activeTab === "overview" && (
          <div>
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyOverviewData}
                  margin={{ top: 25, right: 15, left: -20, bottom: 5 }}
                  barSize={36}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#242d3a" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
                    stroke="#242d3a"
                    tickLine={false}
                    axisLine={{ stroke: "#242d3a" }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    stroke="#242d3a"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${val >= 1000 ? (val / 1000).toFixed(0) + "k" : val}`}
                  />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "rgba(255, 255, 255, 0.03)" }} />
                  <Bar
                    dataKey="valor"
                    radius={[18, 18, 18, 18]}
                  >
                    {monthlyOverviewData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                    <LabelList
                      dataKey="formatted"
                      position="top"
                      fill="#f1f5f9"
                      fontSize={11}
                      fontWeight={700}
                      offset={8}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Legenda inferior sutil */}
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Receitas (Orçamento)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Despesas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <span>Planejado</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. VISUALIZAÇÃO: CATEGORIAS (PIZZA) */}
        {activeTab === "categories" && (
          <div>
            {pieData.length === 0 ? (
              <div className="h-60 flex items-center justify-center text-slate-500 text-xs font-mono">
                Sem despesas registradas para este mês.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="h-56 relative flex justify-center items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`pie-cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomBarTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none">
                    <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Total</span>
                    <span className="text-xs font-black font-mono text-white">
                      R$ {totalDespesas.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {pieData.map((item, index) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                        />
                        <span className="text-slate-300 font-medium truncate">{item.name}</span>
                      </div>
                      <span className="font-bold font-mono text-white shrink-0">
                        R$ {item.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. VISUALIZAÇÃO: HISTÓRICO ANUAL */}
        {activeTab === "history" && (
          <div className="h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={annualData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#242d3a" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 10, fill: "#94a3b8" }} stroke="#242d3a" />
                <YAxis tick={{ fontSize: 9, fill: "#64748b" }} stroke="#242d3a" tickFormatter={(v) => `R$${v}`} />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar name="Orçamento" dataKey="orcamento" fill="#22c55e" radius={[6, 6, 0, 0]} />
                <Bar name="Despesas Reais" dataKey="despesas" fill="#ef4444" radius={[6, 6, 0, 0]} />
                <Bar name="Sobra Líquida" dataKey="sobra" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
