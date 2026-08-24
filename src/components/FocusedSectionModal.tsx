import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  TrendingDown,
  TrendingUp,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Star,
  Edit2,
  Trash2,
  Check,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { Transaction } from "../types";
import TransactionDetailModal from "./TransactionDetailModal";
import AnimatedNumber from "./AnimatedNumber";

interface FocusedSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionType: "expenses" | "planning" | "installments";
  transactions: Transaction[];
  selectedMonth: string;
  categories?: string[];
  onAddTransaction: (section: "left" | "right" | "bottom_left") => void;
  onUpdateTransaction: (id: string, updatedFields: Partial<Transaction>) => void;
  onDeleteTransaction: (id: string) => void;
  onDeduplicateSection?: (section: "left" | "right" | "bottom_left") => void;
  defaultSalary?: number;
}

const TABS: Array<"expenses" | "planning" | "installments"> = ["expenses", "planning", "installments"];

export default function FocusedSectionModal({
  isOpen,
  onClose,
  sectionType: initialSectionType,
  transactions,
  selectedMonth,
  categories = [],
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onDeduplicateSection,
}: FocusedSectionModalProps) {
  const [activeTab, setActiveTab] = useState<"expenses" | "planning" | "installments">(initialSectionType);
  const [selectedTransactionForDetail, setSelectedTransactionForDetail] = useState<Transaction | null>(null);

  // Sync activeTab when modal is triggered with a specific section
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialSectionType);
    }
  }, [isOpen, initialSectionType]);

  // Touch swipe support (arrastar para o lado para trocar de aba)
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Se o arrasto horizontal for maior que o vertical e tiver pelo menos 45px de deslocamento
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 45) {
      const currentIndex = TABS.indexOf(activeTab);
      if (deltaX < 0) {
        // Arrasta para a esquerda -> Próxima aba
        if (currentIndex < TABS.length - 1) {
          setActiveTab(TABS[currentIndex + 1]);
        }
      } else {
        // Arrasta para a direita -> Aba anterior
        if (currentIndex > 0) {
          setActiveTab(TABS[currentIndex - 1]);
        }
      }
    }
    setTouchStartX(null);
    setTouchStartY(null);
  };

  // Sort states
  const [sortField, setSortField] = useState<"default" | "alpha-asc" | "alpha-desc" | "price-desc" | "price-asc">("default");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");

  if (!isOpen) return null;

  const isLeftSec = (sec: string) => sec === "left" || sec === "esquerda" || sec === "despesas";
  const isRightSec = (sec: string) => sec === "right" || sec === "direito" || sec === "direita" || sec === "planejamento";
  const isBottomSec = (sec: string) => sec === "bottom_left" || sec === "bottom" || sec === "parcelas" || sec === "devedores" || sec === "recebiveis";

  // Data filters
  const currentMonthExpenses = transactions.filter(
    (t) => isLeftSec(t.tableSection) && (!t.date || t.date.startsWith(selectedMonth))
  );

  const currentMonthPlanning = transactions.filter(
    (t) => isRightSec(t.tableSection) && (!t.date || t.date.startsWith(selectedMonth))
  );

  const allInstallments = transactions.filter((t) => isBottomSec(t.tableSection));

  // Compute Totals
  const expensesTotal = currentMonthExpenses.reduce((sum, t) => (t.isDiscount ? sum - t.amount : sum + t.amount), 0);
  const planningTotal = currentMonthPlanning.reduce((sum, t) => sum + t.amount, 0);

  // Formatted Month Label
  const getMonthLabel = (mKey: string) => {
    try {
      const [year, month] = mKey.split("-");
      const monthNames = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
      ];
      return `${monthNames[parseInt(month, 10) - 1]} de ${year}`;
    } catch {
      return mKey;
    }
  };

  // Filter & Sort helper
  const filterAndSortList = (rawList: Transaction[], tabType: "expenses" | "planning" | "installments") => {
    let list = rawList;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          (t.category && t.category.toLowerCase().includes(q)) ||
          (t.note && t.note.toLowerCase().includes(q))
      );
    }

    if (filterCategory !== "ALL" && tabType !== "installments") {
      list = list.filter((t) => t.category === filterCategory);
    }

    if (sortField === "alpha-asc") {
      return [...list].sort((a, b) => a.description.localeCompare(b.description));
    }
    if (sortField === "alpha-desc") {
      return [...list].sort((a, b) => b.description.localeCompare(a.description));
    }
    if (sortField === "price-desc") {
      return [...list].sort((a, b) => b.amount - a.amount);
    }
    if (sortField === "price-asc") {
      return [...list].sort((a, b) => a.amount - b.amount);
    }

    return list;
  };

  const filteredExpenses = filterAndSortList(currentMonthExpenses, "expenses");
  const filteredPlanning = filterAndSortList(currentMonthPlanning, "planning");
  const filteredInstallments = filterAndSortList(allInstallments, "installments");

  // Installment dynamic calculation
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

  const activeIndex = TABS.indexOf(activeTab);

  // Render content helper for each slide
  const renderSectionContent = (list: Transaction[], type: "expenses" | "planning" | "installments") => {
    if (list.length === 0) {
      return (
        <div className="py-20 text-center text-slate-400">
          <p className="text-sm font-medium">Nenhum registro encontrado nesta categoria.</p>
          <button
            onClick={() => {
              onAddTransaction(
                type === "expenses"
                  ? "left"
                  : type === "planning"
                  ? "right"
                  : "bottom_left"
              );
            }}
            className={`mt-4 inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl border cursor-pointer transition-all ${
              type === "planning"
                ? "text-amber-400 hover:text-amber-300 bg-amber-500/10 border-amber-500/25 hover:bg-amber-500/20"
                : "text-rose-400 hover:text-rose-300 bg-rose-500/10 border-rose-500/25 hover:bg-rose-500/20"
            }`}
          >
            <Plus className="w-4 h-4" /> Adicionar Primeiro Item
          </button>
        </div>
      );
    }

    return (
      <div className="divide-y divide-slate-800/80 bg-slate-900/60 rounded-2xl border border-slate-800/80 overflow-hidden shadow-sm">
        {list.map((t) => {
          const remainingCount = type === "installments" ? getRemainingInstallments(t.date) : 0;
          const remainingBalance = t.amount * remainingCount;

          return (
            <div
              key={t.id}
              onClick={() => setSelectedTransactionForDetail(t)}
              className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-800/50 active:bg-slate-800/70 transition-all cursor-pointer group ${
                t.isOrangeHighlight
                  ? "border-l-4 border-amber-500 bg-amber-500/5"
                  : t.isDiscount
                  ? "border-l-4 border-emerald-500 bg-emerald-500/5"
                  : type === "planning"
                  ? "border-l-4 border-amber-500/40 hover:border-amber-500"
                  : "border-l-4 border-rose-500/40 hover:border-rose-500"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-bold text-white transition-colors ${
                    type === "planning" ? "group-hover:text-amber-400" : "group-hover:text-rose-400"
                  }`}>
                    {t.description}
                  </span>
                  {t.isDiscount && (
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded uppercase font-bold not-italic">
                      Ganho
                    </span>
                  )}
                  {t.note && (
                    <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md font-mono">
                      {t.note}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full font-medium">
                    {t.category || "Outros"}
                  </span>
                  {type === "installments" && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      Restam: {remainingCount}x
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right flex items-center gap-3 sm:gap-4">
                <div>
                  <div
                    className={`text-sm sm:text-base font-black font-mono ${
                      t.isDiscount
                        ? "text-emerald-400"
                        : type === "planning"
                        ? "text-amber-400"
                        : "text-rose-400"
                    }`}
                  >
                    {t.isDiscount ? "+ " : ""}
                    R${" "}
                    {t.amount.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  {type === "installments" && (
                    <div className="text-[10px] text-slate-400 font-mono">
                      Saldo: R${" "}
                      {remainingBalance.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  )}
                </div>

                <div className="hidden sm:flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTransactionForDetail(t);
                    }}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                    title="Editar item"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Deseja excluir "${t.description}"?`)) {
                        onDeleteTransaction(t.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 cursor-pointer"
                    title="Excluir item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden">
        {/* Backdrop (desktop only) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="hidden sm:block fixed inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer"
        />

        {/* Modal / Full-Screen Container */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-4xl bg-slate-950 sm:bg-slate-900 border-0 sm:border border-slate-800 rounded-none sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10"
        >
          {/* Header Superior - Mobile & Desktop */}
          <div className="p-3.5 sm:p-6 pt-[max(0.875rem,env(safe-area-inset-top,0px))] border-b border-slate-800 bg-slate-900/95 flex items-center justify-between gap-3 sticky top-0 z-20 backdrop-blur-md">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              {/* Botão de Voltar para Mobile */}
              <button
                onClick={onClose}
                className={`p-2 sm:hidden rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                  activeTab === "planning"
                    ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30"
                    : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30"
                }`}
                title="Voltar ao Painel"
              >
                <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
              </button>

              <div className={`hidden sm:flex p-3 rounded-2xl border ${
                activeTab === "planning"
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
              }`}>
                {activeTab === "expenses" ? (
                  <TrendingDown className="w-6 h-6" />
                ) : activeTab === "planning" ? (
                  <TrendingUp className="w-6 h-6" />
                ) : (
                  <Layers className="w-6 h-6" />
                )}
              </div>

              <div className="min-w-0">
                <h2 className="text-base sm:text-xl font-bold text-white tracking-tight flex items-center gap-2 truncate">
                  {activeTab === "expenses" && "Despesas Mensais"}
                  {activeTab === "planning" && "Planejamento Futuro"}
                  {activeTab === "installments" && "Parcelas & Devedores"}
                  <span className="text-[10px] sm:text-xs font-mono font-normal text-slate-400 px-2 py-0.5 bg-slate-800 rounded-lg border border-slate-700 hidden sm:inline-block">
                    {getMonthLabel(selectedMonth)}
                  </span>
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                  {activeTab === "expenses" && "Contas regulares e de consumo do mês"}
                  {activeTab === "planning" && "Eletrônicos, metas e compras futuras"}
                  {activeTab === "installments" && "Controle de parcelas e empréstimos"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`sm:hidden text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${
                activeTab === "planning"
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/30"
              }`}>
                R${" "}
                <AnimatedNumber
                  value={
                    activeTab === "expenses"
                      ? expensesTotal
                      : activeTab === "planning"
                      ? planningTotal
                      : allInstallments.reduce((sum, t) => sum + t.amount * getRemainingInstallments(t.date), 0)
                  }
                  duration={1000}
                />
              </span>

              <button
                id="btn-modal-add-desktop"
                onClick={() => {
                  onAddTransaction(
                    activeTab === "expenses"
                      ? "left"
                      : activeTab === "planning"
                      ? "right"
                      : "bottom_left"
                  );
                }}
                className={`hidden sm:flex items-center gap-1.5 text-xs font-bold px-3 sm:px-4 py-2 rounded-xl border transition-all cursor-pointer shadow-sm ${
                  activeTab === "planning"
                    ? "bg-amber-500/15 hover:bg-amber-500/25 active:bg-amber-500/30 text-amber-400 border-amber-500/30"
                    : "bg-rose-500/15 hover:bg-rose-500/25 active:bg-rose-500/30 text-rose-400 border-rose-500/30"
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Item</span>
              </button>

              <button
                onClick={onClose}
                className="hidden sm:flex p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
                title="Fechar janela"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Abas Superiores no Desktop */}
          <div className="hidden sm:flex px-6 pt-3 pb-2 bg-slate-950/60 border-b border-slate-800 items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-2xl border border-slate-800">
              <button
                onClick={() => setActiveTab("expenses")}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "expenses"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Despesas ({currentMonthExpenses.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("planning")}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "planning"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Planejado ({currentMonthPlanning.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("installments")}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "installments"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Parcelas ({allInstallments.length})</span>
              </button>
            </div>

            {/* Total Indicator Desktop */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Total:</span>
              <span className={`text-sm font-mono font-black px-3 py-1 bg-slate-900 border rounded-xl ${
                activeTab === "planning"
                  ? "text-amber-400 border-amber-500/30"
                  : "text-rose-400 border-rose-500/30"
              }`}>
                R${" "}
                <AnimatedNumber
                  value={
                    activeTab === "expenses"
                      ? expensesTotal
                      : activeTab === "planning"
                      ? planningTotal
                      : allInstallments.reduce((sum, t) => sum + t.amount * getRemainingInstallments(t.date), 0)
                  }
                  duration={1000}
                />
              </span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="px-3 sm:px-6 py-2.5 bg-slate-900/60 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar item ou categoria..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {/* Category Filter */}
              {activeTab !== "installments" && categories.length > 0 && (
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="flex-1 sm:flex-none bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-2.5 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="ALL">Todas Categorias</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}

              {/* Sort selector */}
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as any)}
                className="flex-1 sm:flex-none bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-2.5 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="default">Ordem Padrão</option>
                <option value="alpha-asc">Nome (A→Z)</option>
                <option value="alpha-desc">Nome (Z→A)</option>
                <option value="price-desc">Preço (Maior)</option>
                <option value="price-asc">Preço (Menor)</option>
              </select>
            </div>
          </div>

          {/* Viewport com Carousel Deslizante Horizontal */}
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="flex-1 overflow-hidden relative touch-pan-y"
          >
            <motion.div
              animate={{ x: `-${(activeIndex * 100) / 3}%` }}
              transition={{ type: "tween", ease: [0.25, 1, 0.5, 1], duration: 0.28 }}
              className="flex w-[300%] h-full"
            >
              {/* SLIDE 1: DESPESAS */}
              <div className="w-1/3 h-full overflow-y-auto p-3 sm:p-6 pb-28 sm:pb-6">
                {renderSectionContent(filteredExpenses, "expenses")}
              </div>

              {/* SLIDE 2: PLANEJAMENTO */}
              <div className="w-1/3 h-full overflow-y-auto p-3 sm:p-6 pb-28 sm:pb-6">
                {renderSectionContent(filteredPlanning, "planning")}
              </div>

              {/* SLIDE 3: PARCELAS */}
              <div className="w-1/3 h-full overflow-y-auto p-3 sm:p-6 pb-28 sm:pb-6">
                {renderSectionContent(filteredInstallments, "installments")}
              </div>
            </motion.div>
          </div>

          {/* BOTÃO FLUTUANTE DE NOVO LANÇAMENTO (FAB ESTILO WHATSAPP) NO MOBILE */}
          <button
            id="btn-mobile-fab-add"
            onClick={() => {
              onAddTransaction(
                activeTab === "expenses"
                  ? "left"
                  : activeTab === "planning"
                  ? "right"
                  : "bottom_left"
              );
            }}
            className={`sm:hidden fixed bottom-[max(5rem,calc(env(safe-area-inset-bottom,0px)+4.5rem))] right-4 z-30 w-13 h-13 rounded-2xl active:scale-90 font-black shadow-lg flex items-center justify-center transition-transform cursor-pointer ${
              activeTab === "planning"
                ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/30"
                : "bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/30"
            }`}
            title="Adicionar novo item"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>

          {/* BARRA DE NAVEGAÇÃO INFERIOR ESTILO WHATSAPP */}
          <div className="sm:hidden fixed bottom-0 left-0 right-0 z-20 bg-slate-950/95 border-t border-slate-800 backdrop-blur-xl px-2 py-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] flex items-center justify-around shadow-2xl">
            {/* ABA 1: DESPESAS */}
            <button
              id="nav-tab-expenses"
              onClick={() => setActiveTab("expenses")}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all cursor-pointer ${
                activeTab === "expenses"
                  ? "text-rose-400 font-bold"
                  : "text-slate-400 hover:text-slate-300 font-medium"
              }`}
            >
              <div
                className={`px-4 py-1 rounded-full flex items-center justify-center transition-all ${
                  activeTab === "expenses"
                    ? "border border-rose-500/30 bg-rose-500/15 text-rose-400 shadow-sm"
                    : "border border-transparent"
                }`}
              >
                <TrendingDown className="w-5 h-5" />
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight flex items-center gap-1">
                Despesas
                <span className="text-[10px] opacity-70 font-mono">({currentMonthExpenses.length})</span>
              </span>
            </button>

            {/* ABA 2: PLANEJADO */}
            <button
              id="nav-tab-planning"
              onClick={() => setActiveTab("planning")}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all cursor-pointer ${
                activeTab === "planning"
                  ? "text-amber-400 font-bold"
                  : "text-slate-400 hover:text-slate-300 font-medium"
              }`}
            >
              <div
                className={`px-4 py-1 rounded-full flex items-center justify-center transition-all ${
                  activeTab === "planning"
                    ? "border border-amber-500/30 bg-amber-500/15 text-amber-400 shadow-sm"
                    : "border border-transparent"
                }`}
              >
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight flex items-center gap-1">
                Planejado
                <span className="text-[10px] opacity-70 font-mono">({currentMonthPlanning.length})</span>
              </span>
            </button>

            {/* ABA 3: PARCELAS */}
            <button
              id="nav-tab-installments"
              onClick={() => setActiveTab("installments")}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all cursor-pointer ${
                activeTab === "installments"
                  ? "text-rose-400 font-bold"
                  : "text-slate-400 hover:text-slate-300 font-medium"
              }`}
            >
              <div
                className={`px-4 py-1 rounded-full flex items-center justify-center transition-all ${
                  activeTab === "installments"
                    ? "border border-rose-500/30 bg-rose-500/15 text-rose-400 shadow-sm"
                    : "border border-transparent"
                }`}
              >
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight flex items-center gap-1">
                Parcelas
                <span className="text-[10px] opacity-70 font-mono">({allInstallments.length})</span>
              </span>
            </button>
          </div>
        </motion.div>

        {/* Modal de Detalhe Individual (quando toca em um item) */}
        <TransactionDetailModal
          transaction={selectedTransactionForDetail}
          isOpen={!!selectedTransactionForDetail}
          onClose={() => setSelectedTransactionForDetail(null)}
          onUpdateTransaction={onUpdateTransaction}
          onDeleteTransaction={onDeleteTransaction}
          categories={categories}
          selectedMonth={selectedMonth}
        />
      </div>
    </AnimatePresence>
  );
}


