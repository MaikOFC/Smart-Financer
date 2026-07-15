import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Wallet,
  Calendar,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  FileSpreadsheet,
  LineChart,
  BrainCircuit,
  PiggyBank,
  Download,
  Upload,
} from "lucide-react";
import { Transaction } from "./types";
import { INITIAL_TRANSACTIONS, INITIAL_BUDGETS } from "./initialData";
import MetricCards from "./components/MetricCards";
import TransactionTable from "./components/TransactionTable";
import FinanceCharts from "./components/FinanceCharts";
import SpreadsheetUpload from "./components/SpreadsheetUpload";

export default function App() {
  // Load transactions and budgets from localStorage or fall back to pre-populated data
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem("finances_transactions");
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [budgets, setBudgets] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem("finances_budgets");
    return saved ? JSON.parse(saved) : INITIAL_BUDGETS;
  });

  // Active year-month filter, defaulting to "2026-07" (matches the user starting point)
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-07");

  // AI Advisor state
  const [advisorQuery, setAdvisorQuery] = useState("");
  const [advisorResponse, setAdvisorResponse] = useState<string | null>(null);
  const [advisorLoading, setAdvisorLoading] = useState(false);

  // Sync with localStorage
  useEffect(() => {
    localStorage.setItem("finances_transactions", JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem("finances_budgets", JSON.stringify(budgets));
  }, [budgets]);

  // Handle active budget setting for the current selected month
  const activeBudget = budgets[selectedMonth] !== undefined ? budgets[selectedMonth] : 843.15;

  const handleSetBudget = (val: number) => {
    setBudgets((prev) => ({
      ...prev,
      [selectedMonth]: val,
    }));
  };

  // Calculations for active filtered month
  const currentMonthTransactions = transactions.filter(
    (t) => t.date.startsWith(selectedMonth) && t.tableSection !== "bottom_left"
  );

  // Left total = Left expenses sum - left discount sum
  const leftExpensesTotal = currentMonthTransactions
    .filter((t) => t.tableSection === "left")
    .reduce((acc, t) => {
      if (t.isDiscount) return acc - t.amount;
      return acc + t.amount;
    }, 0);

  // Right total
  const rightExpensesTotal = currentMonthTransactions
    .filter((t) => t.tableSection === "right")
    .reduce((acc, t) => acc + t.amount, 0);

  // Helper to calculate remaining installments from selected month to end date
  const getRemainingInstallments = (endDateStr: string) => {
    try {
      const [selYear, selMonth] = selectedMonth.split("-").map(Number);
      const [endYear, endMonth] = endDateStr.substring(0, 7).split("-").map(Number);
      if (!selYear || !selMonth || !endYear || !endMonth) return 0;

      const monthsDifference = (endYear - selYear) * 12 + (endMonth - selMonth);
      return monthsDifference < 0 ? 0 : monthsDifference + 1;
    } catch {
      return 0;
    }
  };

  // Bottom left total remaining balance (sum of each installment value * remaining installments)
  const bottomIncomesTotal = transactions
    .filter((t) => t.tableSection === "bottom_left")
    .reduce((acc, t) => {
      const remainingCount = getRemainingInstallments(t.date);
      return acc + (t.amount * remainingCount);
    }, 0);

  // Sobra = Budget (Income) - Left expenses
  const sobra = activeBudget - leftExpensesTotal;

  // Add a new empty row to a table section
  const handleAddTransaction = (section: "left" | "right" | "bottom_left") => {
    const newId = `manual-${Date.now()}`;
    const newTransaction: Transaction = {
      id: newId,
      description: section === "bottom_left" ? "Nova Parcela" : "Novo Item",
      amount: section === "bottom_left" ? 100 : 0,
      date: `${selectedMonth}-15`, // Default to middle of month
      type: section === "bottom_left" ? "income" : "expense",
      tableSection: section,
      category: section === "right" ? "Tecnologia" : "Outros",
      isOrangeHighlight: false,
      isDiscount: false,
    };

    setTransactions((prev) => [...prev, newTransaction]);
  };

  // Update transaction row
  const handleUpdateTransaction = (id: string, updatedFields: Partial<Transaction>) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updatedFields } : t))
    );
  };

  // Delete transaction row
  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  // Import transactions from file parsing or AI image analysis
  const handleImportTransactions = (imported: Transaction[]) => {
    // Generate fresh unique IDs to avoid conflicts and set correct date formats
    const parsedImported = imported.map((item, idx) => ({
      ...item,
      id: `imported-${Date.now()}-${idx}`,
      date: item.date || `${selectedMonth}-01`,
    }));

    setTransactions((prev) => [...prev, ...parsedImported]);
  };

  // Ask AI Advisor
  const handleAskAdvisor = async (customPrompt?: string) => {
    const promptToSend = customPrompt || advisorQuery;
    if (!promptToSend.trim()) return;

    setAdvisorLoading(true);
    setAdvisorResponse(null);

    try {
      const response = await fetch("/api/ask-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptToSend,
          transactions: transactions.filter((t) => t.date.startsWith(selectedMonth)),
          budget: activeBudget,
          selectedMonth,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Erro ao consultar IA.");
      }

      setAdvisorResponse(data.answer);
    } catch (err: any) {
      console.error(err);
      setAdvisorResponse(`Erro ao contatar o consultor de IA: ${err.message}`);
    } finally {
      setAdvisorLoading(false);
    }
  };

  // Export data as JSON file for manual backup
  const handleExportData = () => {
    const dataStr = JSON.stringify({ transactions, budgets }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `controle_financeiro_backup.json`;
    link.click();
  };

  // Clear all data to restart
  const handleResetAll = () => {
    if (window.confirm("Deseja realmente redefinir todos os dados para o modelo original do print?")) {
      setTransactions(INITIAL_TRANSACTIONS);
      setBudgets(INITIAL_BUDGETS);
      setSelectedMonth("2026-07");
      setAdvisorResponse(null);
    }
  };

  // Month labels helper
  const MONTH_PRESETS = [
    { value: "2026-07", label: "Julho 2026" },
    { value: "2026-08", label: "Agosto 2026" },
    { value: "2026-09", label: "Setembro 2026" },
    { value: "2026-10", label: "Outubro 2026" },
    { value: "2026-11", label: "Novembro 2026" },
    { value: "2026-12", label: "Dezembro 2026" },
    { value: "2027-01", label: "Janeiro 2027" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12 selection:bg-indigo-500/35 selection:text-white">
      {/* HEADER PRINCIPAL */}
      <header className="bg-slate-900/60 border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
              <Wallet className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight flex items-center gap-2 text-white">
                Controle Financeiro <span className="text-indigo-400">Inteligente</span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                Mapeamento de despesas, recebíveis e relatórios automáticos guiados por IA
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportData}
              className="flex items-center gap-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 px-3.5 py-2 rounded-xl transition-all border border-slate-800 text-slate-300"
              title="Exportar backup completo de transações em JSON"
            >
              <Download className="w-4 h-4" /> Exportar Backup
            </button>
            <button
              onClick={handleResetAll}
              className="flex items-center gap-1.5 text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-3.5 py-2 rounded-xl transition-all border border-rose-500/20"
              title="Redefinir planilhas para o padrão"
            >
              <RefreshCw className="w-4 h-4" /> Resetar Dados
            </button>
          </div>
        </div>
      </header>

      {/* CONTÊINER GERAL */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* CONTROLES DE DATA E SELEÇÃO DE MÊS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Período Relatório:</span>
          </div>

          <div className="flex flex-wrap gap-1 bg-slate-900 border border-slate-800 p-1 rounded-2xl items-center">
            {MONTH_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => setSelectedMonth(p.value)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  selectedMonth === p.value
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10 border border-indigo-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                {p.label}
              </button>
            ))}

            {/* Custom Year-Month Input */}
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs font-bold font-mono text-slate-300 px-3.5 py-1.5 rounded-xl hover:text-white hover:border-slate-700 focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* RESUMOS / METRICS */}
        <MetricCards
          budget={activeBudget}
          setBudget={handleSetBudget}
          leftExpensesTotal={leftExpensesTotal}
          rightExpensesTotal={rightExpensesTotal}
          bottomIncomesTotal={bottomIncomesTotal}
          sobra={sobra}
        />

        {/* UPLOAD PANEL */}
        <SpreadsheetUpload onImportTransactions={handleImportTransactions} />

        {/* VISUALIZAÇÃO GRÁFICA / CHARTS */}
        <FinanceCharts
          transactions={transactions}
          budgets={budgets}
          selectedMonth={selectedMonth}
        />

        {/* TABELAS DE TRANSAÇÕES */}
        <TransactionTable
          transactions={transactions}
          onAddTransaction={handleAddTransaction}
          onUpdateTransaction={handleUpdateTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          selectedMonth={selectedMonth}
        />

        {/* CONSULTOR DE IA FINANCEIRO */}
        <div id="ai-consultant-section" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl hover:border-slate-700/60 transition-all">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
              <BrainCircuit className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Consultor Financeiro de IA</h3>
              <p className="text-xs text-slate-400 font-medium">Faça perguntas sobre seus gastos para obter conselhos personalizados de economia</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4 md:col-span-1">
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Perguntas Sugeridas:</p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleAskAdvisor("Faça uma análise geral das minhas despesas deste mês e aponte as 3 maiores fontes de gastos.")}
                  className="text-left text-xs bg-slate-950/40 hover:bg-slate-950 hover:border-slate-700 p-3 rounded-xl border border-slate-800/80 transition-all text-slate-300"
                >
                  🔍 Onde estou gastando mais?
                </button>
                <button
                  onClick={() => handleAskAdvisor("Com base nas minhas tabelas e na sobra de R$ " + sobra.toFixed(2) + ", dê 4 sugestões práticas de economia de gastos.")}
                  className="text-left text-xs bg-slate-950/40 hover:bg-slate-950 hover:border-slate-700 p-3 rounded-xl border border-slate-800/80 transition-all text-slate-300"
                >
                  💡 Dicas para aumentar a sobra do mês
                </button>
                <button
                  onClick={() => handleAskAdvisor("Analise minhas compras especiais da tabela direita. O que você recomenda em termos de planejamento financeiro de eletrônicos?")}
                  className="text-left text-xs bg-slate-950/40 hover:bg-slate-950 hover:border-slate-700 p-3 rounded-xl border border-slate-800/80 transition-all text-slate-300"
                >
                  ⚙️ Analisar compras especiais (Direita)
                </button>
              </div>
            </div>

            <div className="md:col-span-2 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    id="input-ai-query"
                    type="text"
                    value={advisorQuery}
                    onChange={(e) => setAdvisorQuery(e.target.value)}
                    placeholder="Digite sua própria pergunta sobre suas finanças..."
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 w-full"
                  />
                  <button
                    id="btn-ask-ai"
                    onClick={() => handleAskAdvisor()}
                    disabled={advisorLoading || !advisorQuery.trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/10 flex-shrink-0 border border-indigo-500/20"
                  >
                    Perguntar
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {advisorLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="p-5 bg-slate-950/40 border border-slate-800/80 rounded-2xl flex items-center justify-center gap-3"
                    >
                      <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                      <span className="text-xs text-indigo-300 font-mono">A IA Gemini está analisando suas tabelas financeiras...</span>
                    </motion.div>
                  )}

                  {advisorResponse && !advisorLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 bg-slate-950 border border-slate-800/80 rounded-2xl max-h-64 overflow-y-auto text-xs sm:text-sm leading-relaxed text-slate-300"
                    >
                      <div className="font-bold text-indigo-400 mb-2 flex items-center gap-1 text-xs uppercase tracking-wider font-sans">
                        <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" /> Resposta do Assessor Financeiro de IA:
                      </div>
                      <p className="whitespace-pre-line font-sans text-slate-300">{advisorResponse}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
