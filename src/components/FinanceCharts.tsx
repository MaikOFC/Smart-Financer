import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Transaction } from "../types";
import { PieChart as PieIcon, BarChart2 } from "lucide-react";
import { getMonthlyInstallmentsTotal, getActiveInstallmentsForMonth } from "../utils/installmentUtils";

interface FinanceChartsProps {
  transactions: Transaction[];
  budgets: Record<string, number>;
  selectedMonth: string; // YYYY-MM
  defaultSalary?: number;
}

const COLORS = [
  "#6366f1", // indigo
  "#38bdf8", // sky blue
  "#10b981", // emerald
  "#fbbf24", // amber
  "#f43f5e", // rose
  "#a855f7", // purple
  "#ec4899", // pink
  "#64748b", // slate
];

export default function FinanceCharts({ transactions, budgets, selectedMonth, defaultSalary = 2500 }: FinanceChartsProps) {
  const isLeft = (sec: string) => sec === "left" || sec === "esquerda" || sec === "despesas";

  // 1. DATA FOR MONTHLY CATEGORIES (Pie Chart - Gastos reais do mês + Parcelas ativas do mês)
  const currentMonthTransactions = transactions.filter(
    (t) => isLeft(t.tableSection) && !!t.date && t.date.startsWith(selectedMonth)
  );
  const activeInstallments = getActiveInstallmentsForMonth(transactions, selectedMonth);

  const categoryTotals: Record<string, number> = {};
  currentMonthTransactions.forEach((t) => {
    if (t.isDiscount) return;
    const cat = t.category || "Outros";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
  });

  activeInstallments.forEach((t) => {
    const cat = t.category || "Parcelas / Empréstimos";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
  });

  const pieData = Object.keys(categoryTotals).map((cat) => ({
    name: cat,
    value: categoryTotals[cat],
  }));

  // 2. DATA FOR ANNUAL REPORT (Bar/Area Chart comparing months - Gastos reais + Parcelas ativas)
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

    const leftExpenses = monthTransactions
      .filter((t) => isLeft(t.tableSection))
      .reduce((sum, t) => (t.isDiscount ? sum - t.amount : sum + t.amount), 0);

    const monthlyInstallments = getMonthlyInstallmentsTotal(transactions, m);
    const totalExpenses = leftExpenses + monthlyInstallments;
    const income = budgets[m] !== undefined ? budgets[m] : defaultSalary;

    const formattedMonth = (() => {
      const [year, month] = m.split("-");
      const monthNames = [
        "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", 
        "Jul", "Ago", "Set", "Out", "Nov", "Dez"
      ];
      return `${monthNames[parseInt(month) - 1]} / ${year.substring(2)}`;
    })();

    return {
      monthKey: m,
      monthLabel: formattedMonth,
      despesas: totalExpenses,
      orcamento: income,
      sobra: income - totalExpenses,
    };
  });

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Custom tooltips with dark theme styling matching the Bento Grid look
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950/95 border border-slate-800 p-4 rounded-2xl shadow-xl backdrop-blur-md">
          <p className="text-xs font-bold text-slate-400 mb-2">{payload[0].payload.monthLabel || payload[0].name}</p>
          <div className="space-y-1.5 font-mono text-xs">
            {payload.map((item: any, index: number) => (
              <div key={index} className="flex justify-between items-center gap-4">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
                  {item.name}:
                </span>
                <span className="font-bold text-white">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* 1. GRÁFICO DE PIZZA - GASTOS POR CATEGORIA */}
      <div id="chart-pie-container" className="bg-slate-900 rounded-3xl border border-slate-800/80 p-6 flex flex-col justify-between hover:border-slate-700/80 transition-all">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
              <PieIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Distribuição de Gastos</h3>
              <p className="text-[11px] text-slate-400">Gastos reais do mês por categoria (exclui planejamento)</p>
            </div>
          </div>

          {pieData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-500 text-xs font-mono">
              Sem despesas registradas para este mês.
            </div>
          ) : (
            <div className="h-48 flex justify-center items-center relative">
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
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none">
                <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Total</span>
                <span className="text-sm font-black font-mono text-white">
                  R$ {pieData.reduce((sum, item) => sum + item.value, 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Legendas customizadas */}
        {pieData.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs border-t border-slate-800/80 pt-3">
            {pieData.slice(0, 6).map((item, index) => (
              <div key={item.name} className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-slate-400 truncate text-[11px]">{item.name}:</span>
                <span className="font-bold font-mono text-slate-200 text-[11px]">
                  R$ {item.value.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. GRÁFICO DE BARRAS - HISTÓRICO DE DESPESAS VS ORÇAMENTO (ANUAL) */}
      <div id="chart-annual-container" className="lg:col-span-2 bg-slate-900 rounded-3xl border border-slate-800/80 p-6 flex flex-col justify-between hover:border-slate-700/80 transition-all">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Relatório Anual e Histórico</h3>
              <p className="text-[11px] text-slate-400">Comparação mensal entre Orçamento, Despesas Reais e Sobras</p>
            </div>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={annualData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 9, fill: "#94a3b8" }} stroke="#334155" />
                <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} stroke="#334155" tickFormatter={(val) => `R$${val}`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: "11px", pt: 10, color: "#94a3b8" }} />
                <Bar name="Orçamento" dataKey="orcamento" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar name="Despesas Reais" dataKey="despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar name="Sobra/Economia" dataKey="sobra" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Informações Rápidas de Acumulado */}
        <div className="mt-4 grid grid-cols-3 gap-4 border-t border-slate-800/80 pt-4 text-center font-mono">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Orçado</span>
            <p className="text-xs sm:text-sm font-bold text-slate-200">
              {formatCurrency(annualData.reduce((sum, item) => sum + item.orcamento, 0))}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-rose-400 uppercase font-semibold">Gastos Reais</span>
            <p className="text-xs sm:text-sm font-bold text-rose-400">
              {formatCurrency(annualData.reduce((sum, item) => sum + item.despesas, 0))}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-indigo-400 uppercase font-semibold">Total Sobra</span>
            <p className="text-xs sm:text-sm font-bold text-indigo-400">
              {formatCurrency(annualData.reduce((sum, item) => sum + item.sobra, 0))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
