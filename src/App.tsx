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
  LogOut,
  User as UserIcon,
  Database,
} from "lucide-react";
import { Transaction } from "./types";
import { INITIAL_TRANSACTIONS, INITIAL_BUDGETS } from "./initialData";
import MetricCards from "./components/MetricCards";
import TransactionTable from "./components/TransactionTable";
import FinanceCharts from "./components/FinanceCharts";
import SpreadsheetUpload from "./components/SpreadsheetUpload";
import AuthScreen from "./components/AuthScreen";

export default function App() {
  // Authentication states
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("finances_token"));
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(() => {
    const saved = localStorage.getItem("finances_user");
    return saved ? JSON.parse(saved) : null;
  });

  // Client states loaded from the database
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  
  const [dataLoading, setDataLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-07");
  const [supabaseUserId, setSupabaseUserId] = useState<string>(() => {
    return localStorage.getItem("supabase_user_id") || "1703bc04-af6d-4bfa-9d6f-422fa3b077a6";
  });

  // AI Advisor state
  const [advisorQuery, setAdvisorQuery] = useState("");
  const [advisorResponse, setAdvisorResponse] = useState<string | null>(null);
  const [advisorLoading, setAdvisorLoading] = useState(false);

  // Auth Success Handler
  const handleAuthSuccess = (newToken: string, newUser: { id: string; name: string; email: string }) => {
    localStorage.setItem("finances_token", newToken);
    localStorage.setItem("finances_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  // Logout Handler
  const handleLogout = async () => {
    if (token) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
        });
      } catch (err) {
        console.error("Erro ao efetuar logout no servidor:", err);
      }
    }
    localStorage.removeItem("finances_token");
    localStorage.removeItem("finances_user");
    setToken(null);
    setUser(null);
    setTransactions([]);
    setBudgets({});
    setAdvisorResponse(null);
  };

  // Fetch transactions and budgets from server when token is active
  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      setDataLoading(true);
      try {
        // Fetch transactions
        const tRes = await fetch("/api/transactions", {
          headers: { "Authorization": `Bearer ${token}` },
        });
        if (tRes.status === 401) {
          handleLogout();
          return;
        }
        const tData = await tRes.json();
        
        // Fetch budgets
        const bRes = await fetch("/api/budgets", {
          headers: { "Authorization": `Bearer ${token}` },
        });
        const bData = await bRes.json();

        setTransactions(tData.transactions || []);
        setBudgets(bData.budgets || {});
      } catch (err) {
        console.error("Erro ao buscar dados do servidor:", err);
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // Handle active budget setting for the current selected month
  const activeBudget = budgets[selectedMonth] !== undefined ? budgets[selectedMonth] : 843.15;

  const handleSetBudget = async (val: number) => {
    // Optimistic update
    setBudgets((prev) => ({
      ...prev,
      [selectedMonth]: val,
    }));

    if (!token) return;
    try {
      const response = await fetch("/api/budgets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ month: selectedMonth, amount: val }),
      });
      if (!response.ok) {
        throw new Error("Erro ao salvar orçamento.");
      }
    } catch (err) {
      console.error(err);
    }
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
  const handleAddTransaction = async (section: "left" | "right" | "bottom_left") => {
    const newTransaction: Omit<Transaction, "id"> = {
      description: section === "bottom_left" ? "Nova Parcela" : "Novo Item",
      amount: section === "bottom_left" ? 100 : 0,
      date: `${selectedMonth}-15`, // Default to middle of month
      type: section === "bottom_left" ? "income" : "expense",
      tableSection: section,
      category: section === "right" ? "Tecnologia" : "Outros",
      isOrangeHighlight: false,
      isDiscount: false,
    };

    if (!token) return;
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(newTransaction),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Erro ao adicionar transação.");
      }
      setTransactions((prev) => [...prev, data.transaction]);
    } catch (err) {
      console.error(err);
    }
  };

  // Update transaction row
  const handleUpdateTransaction = async (id: string, updatedFields: Partial<Transaction>) => {
    // Optimistic update
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updatedFields } : t))
    );

    if (!token) return;
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(updatedFields),
      });
      if (!response.ok) {
        throw new Error("Erro ao atualizar transação no servidor.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete transaction row
  const handleDeleteTransaction = async (id: string) => {
    // Optimistic update
    setTransactions((prev) => prev.filter((t) => t.id !== id));

    if (!token) return;
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Erro ao excluir transação no servidor.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Import transactions from file parsing or AI image analysis
  const handleImportTransactions = async (imported: Transaction[]) => {
    const parsedImported = imported.map((item) => ({
      description: item.description,
      amount: item.amount,
      date: item.date || `${selectedMonth}-01`,
      type: item.type,
      tableSection: item.tableSection,
      category: item.category || "Outros",
      isOrangeHighlight: !!item.isOrangeHighlight,
      isDiscount: !!item.isDiscount,
      note: item.note || "",
    }));

    if (!token) return;
    try {
      const response = await fetch("/api/transactions/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ transactions: parsedImported }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Erro ao importar transações.");
      }
      setTransactions((prev) => [...prev, ...(data.transactions || [])]);
    } catch (err) {
      console.error(err);
    }
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
    link.download = `controle_financeiro_backup_${user?.name.toLowerCase().replace(/\s+/g, "_")}.json`;
    link.click();
  };

  // Export active user's data as Supabase compatible CSVs
  const handleExportSupabaseCSV = (type: "transactions" | "budgets") => {
    const trimmedId = supabaseUserId.trim();
    if (!trimmedId) {
      const confirmUseDefault = window.confirm(
        "Aviso: Você não configurou seu User ID do Supabase.\n\n" +
        "Como a tabela do Supabase exige que cada registro pertença a um usuário real da tabela auth.users " +
        "para passar pela chave estrangeira (Foreign Key), você deve copiar seu UUID do Supabase e colar no campo verde do topo antes de exportar.\n\n" +
        "Quer exportar mesmo assim usando um ID provisório de teste?"
      );
      if (!confirmUseDefault) return;
    }

    const userId = trimmedId || user?.id || "00000000-0000-0000-0000-000000000000";
    let csvContent = "";

    if (type === "transactions") {
      const headers = [
        "user_id",
        "description",
        "amount",
        "date",
        "type",
        "table_section",
        "category",
        "is_orange_highlight",
        "is_discount",
        "note",
        "seed_key"
      ];
      const rows = transactions.map((t) => {
        const description = (t.description || "").replace(/"/g, '""');
        const amount = (t.amount || 0).toFixed(2);
        const date = t.date || "";
        const txType = t.type || "expense";
        const table_section = t.tableSection || "left";
        const category = (t.category || "Outros").replace(/"/g, '""');
        const is_orange_highlight = t.isOrangeHighlight ? "TRUE" : "FALSE";
        const is_discount = t.isDiscount ? "TRUE" : "FALSE";
        const note = (t.note || "").replace(/"/g, '""');
        // If it was a preloaded seed, keep its seed_key, else empty
        const seed_key = t.id && !t.id.startsWith("manual") && !t.id.startsWith("imported") ? t.id : "";

        return [
          userId,
          `"${description}"`,
          amount,
          date,
          txType,
          table_section,
          `"${category}"`,
          is_orange_highlight,
          is_discount,
          `"${note}"`,
          `"${seed_key}"`
        ].join(",");
      });
      csvContent = [headers.join(","), ...rows].join("\n");
    } else {
      const headers = ["user_id", "month", "amount"];
      const rows = Object.entries(budgets).map(([month, amount]) => {
        return [
          userId,
          month,
          (Number(amount) || 0).toFixed(2)
        ].join(",");
      });
      csvContent = [headers.join(","), ...rows].join("\n");
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `supabase_${type}_${user?.name.toLowerCase().replace(/\s+/g, "_")}.csv`;
    link.click();
  };

  // Clear all data to restart
  const handleResetAll = async () => {
    if (window.confirm("Deseja realmente redefinir todos os dados para o modelo original do print?")) {
      if (!token) return;
      setDataLoading(true);
      try {
        const response = await fetch("/api/auth/reset", {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok || data.error) {
          throw new Error(data.error || "Erro ao resetar dados.");
        }
        
        // Reload fresh data from server
        const tRes = await fetch("/api/transactions", {
          headers: { "Authorization": `Bearer ${token}` },
        });
        const tData = await tRes.json();
        
        const bRes = await fetch("/api/budgets", {
          headers: { "Authorization": `Bearer ${token}` },
        });
        const bData = await bRes.json();

        setTransactions(tData.transactions || []);
        setBudgets(bData.budgets || {});
        setSelectedMonth("2026-07");
        setAdvisorResponse(null);
      } catch (err: any) {
        alert(`Erro ao redefinir dados: ${err.message}`);
      } finally {
        setDataLoading(false);
      }
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

  if (!token || !user) {
    return <AuthScreen onSuccess={handleAuthSuccess} />;
  }

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

          <div className="flex flex-col lg:flex-row items-center gap-3">
            {/* Campo ID do Usuário Supabase para evitar erro de Foreign Key na importação */}
            <div className="flex items-center gap-2 bg-slate-950/60 border border-emerald-500/20 px-3 py-1.5 rounded-2xl transition-all hover:border-emerald-500/30 focus-within:border-emerald-500/50">
              <div className="w-6 h-6 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-500/20">
                <Database className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[9px] text-emerald-400 leading-none font-bold uppercase tracking-wider">ID Supabase (UUID)</span>
                <input
                  type="text"
                  placeholder="Cole seu auth.uid() do Supabase"
                  value={supabaseUserId}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    setSupabaseUserId(val);
                    localStorage.setItem("supabase_user_id", val);
                  }}
                  className="bg-transparent text-[11px] text-slate-200 font-bold font-mono focus:outline-none placeholder-slate-600 w-40 sm:w-48 mt-0.5"
                  title="Cole seu UUID do Supabase aqui para que os CSVs sejam exportados com o ID correto e não deem erro de Chave Estrangeira."
                />
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800/80 px-3 py-1.5 rounded-2xl">
              <div className="w-6 h-6 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center border border-indigo-500/20">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[9px] text-slate-500 leading-none font-bold uppercase tracking-wider">Usuário</span>
                <span className="text-xs text-slate-200 font-bold leading-tight">{user.name}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleExportData}
                className="flex items-center gap-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 px-3 py-2 rounded-xl transition-all border border-slate-800 text-slate-300"
                title="Exportar backup completo de transações em JSON"
              >
                <Download className="w-4 h-4" /> Exportar JSON
              </button>
              <button
                onClick={() => handleExportSupabaseCSV("transactions")}
                className="flex items-center gap-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 px-3 py-2 rounded-xl transition-all border border-slate-800 text-emerald-400 hover:text-emerald-300"
                title="Exportar transações formatadas para o Supabase CSV"
              >
                <Database className="w-4 h-4" /> CSV Transações
              </button>
              <button
                onClick={() => handleExportSupabaseCSV("budgets")}
                className="flex items-center gap-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 px-3 py-2 rounded-xl transition-all border border-slate-800 text-emerald-400 hover:text-emerald-300"
                title="Exportar orçamentos formatados para o Supabase CSV"
              >
                <Database className="w-4 h-4" /> CSV Orçamentos
              </button>
              <button
                onClick={handleResetAll}
                className="flex items-center gap-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 px-3 py-2 rounded-xl transition-all border border-slate-800"
                title="Redefinir planilhas para o padrão"
              >
                <RefreshCw className="w-4 h-4" /> Resetar
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-3.5 py-2 rounded-xl transition-all border border-rose-500/20"
                title="Sair da Conta"
              >
                <LogOut className="w-4 h-4" /> Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* CONTÊINER GERAL */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {dataLoading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <RefreshCw className="w-10 h-10 animate-spin text-indigo-500" />
            <p className="text-sm text-slate-400 font-medium font-sans">Carregando seus dados financeiros...</p>
          </div>
        ) : (
          <>
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
          </>
        )}
      </main>
    </div>
  );
}
