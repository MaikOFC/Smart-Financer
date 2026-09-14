import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  TrendingDown,
  Target,
  Layers,
  Plus,
  ArrowUpDown,
  Edit2,
  Trash2,
  Sparkles,
  Check,
  Calendar,
  Tag,
  DollarSign,
  ChevronRight,
  Star,
} from "lucide-react";
import { Transaction } from "../types";
import TransactionDetailModal from "./TransactionDetailModal";
import AnimatedNumber from "./AnimatedNumber";
import { getMonthlyInstallmentsTotal, getActiveInstallmentsForMonth } from "../utils/installmentUtils";

export type HomeSectionTab = "expenses" | "planning" | "installments";

interface HomeSectionTabsProps {
  transactions: Transaction[];
  selectedMonth: string;
  categories?: string[];
  activeTab: HomeSectionTab;
  onTabChange: (tab: HomeSectionTab) => void;
  onAddTransaction: (section: "left" | "right" | "bottom_left") => void;
  onUpdateTransaction: (id: string, updatedFields: Partial<Transaction>) => void;
  onDeleteTransaction: (id: string) => void;
  onDeduplicateSection?: (section: "left" | "right" | "bottom_left") => void;
  defaultSalary?: number;
  onBackToHome?: () => void;
}

export default function HomeSectionTabs({
  transactions,
  selectedMonth,
  categories = [],
  activeTab,
  onTabChange,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
}: HomeSectionTabsProps) {
  const [selectedTransactionForDetail, setSelectedTransactionForDetail] = useState<Transaction | null>(null);

  const isLeftSec = (sec: string) => sec === "left" || sec === "esquerda" || sec === "despesas";
  const isRightSec = (sec: string) => sec === "right" || sec === "direito" || sec === "direita" || sec === "planejamento" || sec === "metas";
  const isBottomSec = (sec: string) => sec === "bottom_left" || sec === "bottom" || sec === "parcelas" || sec === "devedores" || sec === "recebiveis";

  // Data filters
  const currentMonthDirectExpenses = transactions.filter(
    (t) => isLeftSec(t.tableSection) && (!t.date || t.date.startsWith(selectedMonth))
  );
  const activeInstallmentsThisMonth = getActiveInstallmentsForMonth(transactions, selectedMonth);

  // Combined expenses: direct monthly expenses + active installments for selected month
  const currentMonthExpenses = [...currentMonthDirectExpenses, ...activeInstallmentsThisMonth];

  const currentMonthPlanning = transactions.filter(
    (t) => isRightSec(t.tableSection)
  );

  const allInstallments = transactions.filter((t) => isBottomSec(t.tableSection));

  // Compute Totals
  const directExpensesTotal = currentMonthDirectExpenses.reduce((sum, t) => (t.isDiscount ? sum - t.amount : sum + t.amount), 0);
  const monthlyInstallmentsTotal = getMonthlyInstallmentsTotal(transactions, selectedMonth);
  const expensesTotal = directExpensesTotal + monthlyInstallmentsTotal;
  const planningTotal = currentMonthPlanning.reduce((sum, t) => sum + t.amount, 0);

  // Remaining installments calculation
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

  const installmentsDebtTotal = allInstallments.reduce((sum, t) => {
    const rem = getRemainingInstallments(t.date);
    return sum + t.amount * rem;
  }, 0);

  // Ordenação da aba de Despesas do Mês:
  // 1º: Gastos marcados com destaque
  // 2º: Gastos do mês (contas/despesas diretas)
  // 3º: Parcelas ativas
  // 4º: Descontos / Ganhos (por último, lá embaixo)
  const getExpenseTier = (t: Transaction) => {
    if (t.isDiscount) return 4;
    if (t.isOrangeHighlight) return 1;
    const isInst = isBottomSec(t.tableSection);
    if (!isInst) return 2;
    return 3;
  };

  const sortExpensesList = (rawList: Transaction[]) => {
    return [...rawList].sort((a, b) => {
      const tierA = getExpenseTier(a);
      const tierB = getExpenseTier(b);
      if (tierA !== tierB) {
        return tierA - tierB;
      }
      // Dentro de cada grupo: do maior valor para o menor
      if (b.amount !== a.amount) {
        return b.amount - a.amount;
      }
      return a.description.localeCompare(b.description);
    });
  };

  // Sempre ordenar do maior valor para o menor (preço decrescente), mantendo descontos por último se houver
  const sortListByPriceDesc = (rawList: Transaction[]) => {
    return [...rawList].sort((a, b) => {
      if (a.isDiscount && !b.isDiscount) return 1;
      if (!a.isDiscount && b.isDiscount) return -1;
      if (b.amount !== a.amount) {
        return b.amount - a.amount;
      }
      return a.description.localeCompare(b.description);
    });
  };

  const filteredExpenses = sortExpensesList(currentMonthExpenses);
  const filteredPlanning = sortListByPriceDesc(currentMonthPlanning);
  const filteredInstallments = sortListByPriceDesc(allInstallments);

  const currentList =
    activeTab === "expenses"
      ? filteredExpenses
      : activeTab === "planning"
      ? filteredPlanning
      : filteredInstallments;

  return (
    <section id="home-section-viewer" className="space-y-4">
      {/* CARD PRINCIPAL DO CONTEÚDO ATIVO NA TELA INICIAL */}
      <div className="bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-800/80 p-4 sm:p-6 shadow-xl space-y-4">
        {/* CABEÇALHO DO CONTEÚDO: TÍTULO E VALOR TOTAL */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <h3 className="text-base sm:text-lg font-black text-white">
            {activeTab === "expenses" && "Despesas do Mês"}
            {activeTab === "planning" && "Metas & Planejamento"}
            {activeTab === "installments" && "Parcelas Ativas & Financiamentos"}
          </h3>

          {/* TOTAL */}
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">Total</span>
            <div className={`text-base sm:text-lg font-black font-mono ${
              activeTab === "expenses"
                ? "text-rose-400"
                : activeTab === "planning"
                ? "text-orange-400"
                : "text-purple-300"
            }`}>
              R${" "}
              <AnimatedNumber
                value={
                  activeTab === "expenses"
                    ? expensesTotal
                    : activeTab === "planning"
                    ? planningTotal
                    : installmentsDebtTotal
                }
                decimals={2}
              />
            </div>
          </div>
        </div>

        {/* BANNER DE PARCELAS ATIVAS QUANDO NA ABA DE DESPESAS */}
        {activeTab === "expenses" && activeInstallmentsThisMonth.length > 0 && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-500/20 text-rose-300 rounded-xl shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-rose-200">
                  {activeInstallmentsThisMonth.length} parcela{activeInstallmentsThisMonth.length > 1 ? "s" : ""} ativa{activeInstallmentsThisMonth.length > 1 ? "s" : ""} neste mês
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onTabChange("installments")}
              className="text-xs font-bold text-rose-300 hover:text-white bg-rose-500/20 hover:bg-rose-500/30 px-3 py-1.5 rounded-xl border border-rose-500/30 transition-all cursor-pointer self-start sm:self-center"
            >
              Ver Parcelas (R$ {(monthlyInstallmentsTotal || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}) →
            </button>
          </div>
        )}

        {/* LISTAGEM DOS ITENS */}
        {currentList.length === 0 ? (
          <div className="py-12 text-center text-slate-400 bg-slate-950/40 rounded-2xl border border-slate-800/60 p-6 space-y-3">
            <p className="text-sm font-medium">Nenhum registro encontrado nesta categoria.</p>
            <button
              type="button"
              onClick={() => {
                onAddTransaction(
                  activeTab === "expenses"
                    ? "left"
                    : activeTab === "planning"
                    ? "right"
                    : "bottom_left"
                );
              }}
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl border cursor-pointer transition-all ${
                activeTab === "planning"
                  ? "text-orange-400 hover:text-orange-300 bg-orange-500/10 border-orange-500/25 hover:bg-orange-500/20"
                  : activeTab === "installments"
                  ? "text-purple-400 hover:text-purple-300 bg-purple-500/10 border-purple-500/25 hover:bg-purple-500/20"
                  : "text-rose-400 hover:text-rose-300 bg-rose-500/10 border-rose-500/25 hover:bg-rose-500/20"
              }`}
            >
              <Plus className="w-4 h-4" /> Adicionar Primeiro Item
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80 bg-slate-950/50 rounded-2xl border border-slate-800/80 overflow-hidden shadow-inner">
            {currentList.map((t) => {
              const isInst = isBottomSec(t.tableSection);
              const remainingCount = isInst ? getRemainingInstallments(t.date) : 0;
              const remainingBalance = t.amount * remainingCount;

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTransactionForDetail(t)}
                  className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-800/50 active:bg-slate-800/70 transition-all cursor-pointer group ${
                    t.isOrangeHighlight
                      ? "border-l-4 border-amber-500 bg-amber-500/5"
                      : isInst && activeTab === "expenses"
                      ? "border-l-4 border-purple-500 bg-purple-500/5"
                      : t.isDiscount
                      ? "border-l-4 border-emerald-500 bg-emerald-500/5"
                      : activeTab === "planning"
                      ? "border-l-4 border-orange-500/50 hover:border-orange-500"
                      : activeTab === "installments"
                      ? "border-l-4 border-purple-500/50 hover:border-purple-500"
                      : "border-l-4 border-rose-500/50 hover:border-rose-500"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-bold text-white transition-colors ${
                        t.isOrangeHighlight
                          ? "group-hover:text-amber-300"
                          : isInst && activeTab === "expenses"
                          ? "group-hover:text-purple-400"
                          : activeTab === "planning"
                          ? "group-hover:text-orange-400"
                          : activeTab === "installments"
                          ? "group-hover:text-purple-400"
                          : "group-hover:text-rose-400"
                      }`}>
                        {t.description}
                      </span>
                      {t.isOrangeHighlight && (
                        <span className="text-[9px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current text-amber-400" />
                          Destaque
                        </span>
                      )}
                      {isInst && activeTab === "expenses" && (
                        <span className="text-[9px] bg-purple-500/15 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                          <Layers className="w-3 h-3 text-purple-400" />
                          Parcela ({remainingCount}x rest.)
                        </span>
                      )}
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
                      {activeTab === "installments" && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          Restam: {remainingCount}x
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-3 sm:gap-4 shrink-0">
                    <div>
                      <div
                        className={`text-sm sm:text-base font-black font-mono ${
                          t.isDiscount
                            ? "text-emerald-400"
                            : t.isOrangeHighlight && activeTab === "expenses"
                            ? "text-amber-300"
                            : activeTab === "planning"
                            ? "text-orange-400"
                            : isInst && activeTab === "expenses"
                            ? "text-purple-300"
                            : "text-rose-400"
                        }`}
                      >
                        {t.isDiscount ? "+ " : ""}
                        R${" "}
                        {(typeof t.amount === "number" && !isNaN(t.amount) ? t.amount : 0).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      {activeTab === "installments" && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          Saldo: R${" "}
                          {(typeof remainingBalance === "number" && !isNaN(remainingBalance) ? remainingBalance : 0).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      )}
                    </div>

                    <div className="hidden sm:flex items-center gap-1">
                      <button
                        type="button"
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
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTransaction(t.id);
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
        )}
      </div>

      {/* MODAL DE DETALHES AO CLICAR EM QUALQUER ITEM */}
      {selectedTransactionForDetail && (
        <TransactionDetailModal
          transaction={selectedTransactionForDetail}
          isOpen={!!selectedTransactionForDetail}
          onClose={() => setSelectedTransactionForDetail(null)}
          onUpdateTransaction={onUpdateTransaction}
          onDeleteTransaction={(id) => {
            onDeleteTransaction(id);
            setSelectedTransactionForDetail(null);
          }}
          categories={categories}
          selectedMonth={selectedMonth}
        />
      )}
    </section>
  );
}
