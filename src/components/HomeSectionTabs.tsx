import React, { useState } from "react";
import { motion } from "motion/react";
import {
  TrendingDown,
  TrendingUp,
  Target,
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
  ArrowLeft,
  Layers,
} from "lucide-react";
import { Transaction } from "../types";
import TransactionDetailModal from "./TransactionDetailModal";
import AnimatedNumber from "./AnimatedNumber";
import { formatMonthLabel } from "../utils/incomeUtils";
import {
  getMonthlyInstallmentsTotal,
  getActiveInstallmentsForMonth,
  getRemainingInstallments,
  getInstallmentCurrentNumber,
  getInstallmentMeta,
  isInstallmentActiveInMonth,
  stripMetaFromNote,
} from "../utils/installmentUtils";

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
  onBackToHome,
}: HomeSectionTabsProps) {
  const [selectedTransactionForDetail, setSelectedTransactionForDetail] = useState<Transaction | null>(null);
  const monthLabel = formatMonthLabel(selectedMonth);

  const isLeftSec = (sec: string) => sec === "left" || sec === "esquerda" || sec === "despesas";
  const isRightSec = (sec: string) => sec === "right" || sec === "direito" || sec === "direita" || sec === "planejamento" || sec === "metas";
  const isBottomSec = (sec: string) => sec === "bottom_left" || sec === "bottom" || sec === "parcelas" || sec === "devedores" || sec === "recebiveis";

  // Data filters
  const currentMonthDirectExpenses = transactions.filter(
    (t) =>
      isLeftSec(t.tableSection) &&
      (!!t.isRecurring || !t.date || t.date.startsWith(selectedMonth))
  );
  const activeInstallmentsThisMonth = getActiveInstallmentsForMonth(transactions, selectedMonth);

  // Combined expenses: direct monthly expenses + active installments for selected month
  const currentMonthExpenses = [...currentMonthDirectExpenses, ...activeInstallmentsThisMonth];

  const currentMonthPlanning = transactions.filter(
    (t) => isRightSec(t.tableSection)
  );

  const [showAllInstallments, setShowAllInstallments] = useState(false);
  const allInstallments = transactions.filter((t) => isBottomSec(t.tableSection));
  const displayedInstallments = showAllInstallments ? allInstallments : activeInstallmentsThisMonth;

  // Compute Totals
  const directExpensesTotal = currentMonthDirectExpenses
    .filter((t) => !t.isDiscount)
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const monthlyInstallmentsTotal = getMonthlyInstallmentsTotal(transactions, selectedMonth);
  const expensesTotal = directExpensesTotal + monthlyInstallmentsTotal;
  const planningTotal = currentMonthPlanning.reduce((sum, t) => sum + (t.amount || 0), 0);

  // Remaining installments debt:
  // Se estiver mostrando apenas ativas do mês, calcula a dívida das parcelas ativas no mês.
  const installmentsDebtTotal = displayedInstallments.reduce((sum, t) => {
    const rem = getRemainingInstallments(t, selectedMonth);
    return sum + t.amount * rem;
  }, 0);

  // Ordenação da aba de Despesas do Mês:
  // 1º: Gastos marcados com destaque
  // 2º: Gastos do mês (contas/despesas diretas)
  // 3º: Parcelas ativas
  // 4º: Ganhos extras
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

  // Sempre ordenar do maior valor para o menor (preço decrescente)
  const sortListByPriceDesc = (rawList: Transaction[]) => {
    return [...rawList].sort((a, b) => {
      if (b.amount !== a.amount) {
        return b.amount - a.amount;
      }
      return a.description.localeCompare(b.description);
    });
  };

  const filteredExpenses = sortExpensesList(currentMonthExpenses);
  const filteredPlanning = sortListByPriceDesc(currentMonthPlanning);
  const filteredInstallments = sortListByPriceDesc(displayedInstallments);

  const currentList =
    activeTab === "expenses"
      ? filteredExpenses
      : activeTab === "planning"
      ? filteredPlanning
      : filteredInstallments;

  const accentTheme =
    activeTab === "expenses"
      ? {
          hairline: "via-rose-400/65",
          glowStyle: "radial-gradient(circle, rgba(244,63,94,0.16) 0%, transparent 70%)",
          iconBox: "bg-rose-500/10 border-rose-500/25 text-rose-400",
          totalText: "text-rose-400",
          addBtn: "bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/30 text-rose-300",
          backBtn: "hover:border-rose-500/40 hover:text-rose-300",
        }
      : activeTab === "installments"
      ? {
          hairline: "via-purple-400/65",
          glowStyle: "radial-gradient(circle, rgba(168,85,247,0.16) 0%, transparent 70%)",
          iconBox: "bg-purple-500/10 border-purple-500/25 text-purple-400",
          totalText: "text-purple-300",
          addBtn: "bg-purple-500/15 hover:bg-purple-500/25 border-purple-500/30 text-purple-300",
          backBtn: "hover:border-purple-500/40 hover:text-purple-300",
        }
      : {
          hairline: "via-cyan-400/65",
          glowStyle: "radial-gradient(circle, rgba(6,182,212,0.16) 0%, transparent 70%)",
          iconBox: "bg-cyan-500/10 border-cyan-500/25 text-cyan-400",
          totalText: "text-cyan-300",
          addBtn: "bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-500/30 text-cyan-300",
          backBtn: "hover:border-cyan-500/40 hover:text-cyan-300",
        };

  const sharedLayoutTransition = {
    layout: { duration: 0.34, ease: [0.22, 1, 0.36, 1] as const },
  };

  return (
    <>
      <motion.section
        key={activeTab}
        id="home-section-viewer"
        layoutId={`bento-card-${activeTab}`}
        transition={sharedLayoutTransition}
        style={{ borderRadius: 0, willChange: "transform, opacity" }}
        className="fixed inset-0 z-[35] bg-slate-950 overflow-y-auto overscroll-contain pb-32 sm:pb-36"
      >
        {/* Hairline superior e glow leve mantendo a cor de destaque do card */}
        <div
          aria-hidden="true"
          className={`fixed inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent ${accentTheme.hairline} to-transparent pointer-events-none z-20`}
        />
        <div
          aria-hidden="true"
          style={{ background: accentTheme.glowStyle }}
          className="pointer-events-none fixed -top-24 right-[-4rem] w-80 h-80 rounded-full"
        />

        <div className="relative max-w-4xl mx-auto px-3.5 sm:px-6 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-6 space-y-5">
          {/* CABEÇALHO DO CONTEÚDO EXPANDIDO */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800/80 p-4 sm:p-6 shadow-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {onBackToHome && (
                <button
                  type="button"
                  onClick={onBackToHome}
                  className={`min-h-[44px] min-w-[44px] rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center justify-center transition-colors cursor-pointer shrink-0 active:scale-95 ${accentTheme.backBtn}`}
                  title="Voltar para o Início"
                  aria-label="Voltar para o Início"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}

              <div
                key={`icon-${activeTab}`}
                className={`bento-icon-enter w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${accentTheme.iconBox}`}
              >
                {activeTab === "expenses" ? (
                  <TrendingDown className="w-5 h-5 stroke-[2.2]" />
                ) : activeTab === "installments" ? (
                  <Layers className="w-5 h-5 stroke-[2.2]" />
                ) : (
                  <Target className="w-5 h-5 stroke-[2.2]" />
                )}
              </div>

              <div className="min-w-0">
                <h2 className="text-base sm:text-xl font-black text-white truncate">
                  {activeTab === "expenses" && "Despesas do Mês"}
                  {activeTab === "planning" && "Metas & Reservas"}
                  {activeTab === "installments" && "Parcelas Ativas"}
                </h2>
                <p className="text-xs text-slate-400 font-medium truncate">
                  {monthLabel}
                </p>
              </div>
            </div>

            {/* TOTAL */}
            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block leading-tight">
                {activeTab === "installments"
                  ? showAllInstallments
                    ? "Total Restante Geral"
                    : "Dívida Restante no Mês"
                  : "Total"}
              </span>
              <div className={`text-base sm:text-xl font-black font-mono tabular-nums leading-tight ${accentTheme.totalText}`}>
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

          <div key={activeTab} className="tela-nova space-y-5">
            {/* LISTAGEM DOS ITENS COM CASCATA SUAVE (.item) */}
            {currentList.length === 0 ? (
              <div
                style={{ "--i": 1 } as React.CSSProperties}
                className="item py-12 text-center text-slate-400 bg-slate-900 rounded-3xl border border-slate-800/80 p-6 space-y-3"
              >
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
                  className={`inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl border cursor-pointer transition-colors ${accentTheme.addBtn}`}
                >
                  <Plus className="w-4 h-4" /> Adicionar Primeiro Item
                </button>
              </div>
            ) : (
              <div className="bg-slate-900 rounded-3xl border border-slate-800/80 overflow-hidden isolate shadow-xl">
                {currentList.map((t, index) => {
                  const isInst = isBottomSec(t.tableSection);
                  const remainingCount = isInst ? getRemainingInstallments(t, selectedMonth) : 0;
                  const currentNum = isInst ? getInstallmentCurrentNumber(t, selectedMonth) : 0;
                  const meta = isInst ? getInstallmentMeta(t) : null;
                  const isFinished = isInst && remainingCount === 0;
                  const remainingBalance = t.amount * remainingCount;

                  const accentStripeClass = t.isDiscount
                    ? "bg-emerald-500"
                    : activeTab === "planning"
                    ? "bg-cyan-500/65 group-hover:bg-cyan-400"
                    : t.isOrangeHighlight
                    ? "bg-amber-500"
                    : isInst && activeTab === "expenses"
                    ? "bg-purple-500"
                    : t.isRecurring && activeTab === "expenses"
                    ? "bg-sky-500"
                    : activeTab === "installments"
                    ? isFinished
                      ? "bg-slate-600"
                      : "bg-purple-500/60 group-hover:bg-purple-500"
                    : "bg-rose-500/60 group-hover:bg-rose-500";

                  const rowTintClass = t.isDiscount
                    ? "bg-emerald-500/5"
                    : activeTab === "planning"
                    ? ""
                    : t.isOrangeHighlight
                    ? "bg-amber-500/5"
                    : isInst && activeTab === "expenses"
                    ? "bg-purple-500/5"
                    : t.isRecurring && activeTab === "expenses"
                    ? "bg-sky-500/[0.04]"
                    : activeTab === "installments" && isFinished
                    ? "bg-slate-900/40 opacity-60"
                    : "";

                  return (
                    <div
                      key={t.id}
                      style={{ "--i": index } as React.CSSProperties}
                      onClick={() => setSelectedTransactionForDetail(t)}
                      className={`item relative p-3.5 sm:p-4 pl-4 sm:pl-5 border-b border-slate-800/80 last:border-b-0 flex items-center justify-between gap-3 hover:bg-slate-800/50 active:bg-slate-800/70 transition-colors cursor-pointer group ${rowTintClass}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`absolute left-0 inset-y-0 w-1 transition-colors pointer-events-none ${accentStripeClass}`}
                      />
                      {/* Miniatura à esquerda do título para Planejamento & Metas */}
                      {activeTab === "planning" &&
                        (t.imageUrl ? (
                          <img
                            src={t.imageUrl}
                            alt={t.description}
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-xl object-cover border border-slate-700/80 shadow-md shrink-0 self-center"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 self-center">
                            <Target className="w-5 h-5" />
                          </div>
                        ))}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-sm font-bold text-white transition-colors ${
                              t.isDiscount
                                ? "group-hover:text-emerald-300"
                                : activeTab === "planning"
                                ? "group-hover:text-cyan-300"
                                : t.isOrangeHighlight
                                ? "group-hover:text-amber-300"
                                : isInst && activeTab === "expenses"
                                ? "group-hover:text-purple-400"
                                : t.isRecurring && activeTab === "expenses"
                                ? "group-hover:text-sky-300"
                                : activeTab === "installments"
                                ? "group-hover:text-purple-400"
                                : "group-hover:text-rose-400"
                            }`}
                          >
                            {t.description}
                          </span>
                          {activeTab === "planning" && stripMetaFromNote(t.note) && (
                            <span className="text-[10px] bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-md font-mono">
                              {stripMetaFromNote(t.note)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full font-medium">
                            {t.category || "Outros"}
                          </span>
                          {activeTab === "installments" && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {remainingCount > 0 ? (
                                <>
                                  {currentNum > 0 && meta && (
                                    <span className="text-purple-300 font-bold mr-1.5">
                                      Parcela {currentNum} de {meta.totalInstallments}
                                    </span>
                                  )}
                                  (Restam: {remainingCount}x)
                                </>
                              ) : (
                                <span className="text-emerald-400 font-bold">✓ Quitada</span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-3 sm:gap-4 shrink-0">
                        <div>
                          <div
                            className={`text-sm sm:text-base font-black font-mono tabular-nums ${
                              t.isDiscount
                                ? "text-emerald-400"
                                : t.isOrangeHighlight && activeTab === "expenses"
                                ? "text-amber-300"
                                : activeTab === "planning"
                                ? "text-cyan-300"
                                : isInst && activeTab === "expenses"
                                ? "text-purple-300"
                                : activeTab === "installments"
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
                            <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                              Saldo: R${" "}
                              {(typeof remainingBalance === "number" && !isNaN(remainingBalance)
                                ? remainingBalance
                                : 0
                              ).toLocaleString("pt-BR", {
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

            {/* FILTRO DE PARCELAS NO FINAL DA CAIXA DE PARCELAS */}
            {activeTab === "installments" && (
              <div
                style={{ "--i": Math.min(currentList.length, 10) } as React.CSSProperties}
                className="item bg-slate-900 rounded-2xl border border-slate-800/80 p-4 flex flex-col sm:flex-row items-center justify-between gap-3"
              >
                <span className="text-xs text-slate-400 font-medium text-center sm:text-left">
                  Visualizar parcelas cadastradas:
                </span>
                <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-bold shadow-inner">
                  <button
                    type="button"
                    onClick={() => setShowAllInstallments(false)}
                    className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                      !showAllInstallments
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                    title="Mostrar apenas parcelas com vencimento ativo neste mês"
                  >
                    Ativas ({activeInstallmentsThisMonth.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAllInstallments(true)}
                    className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                      showAllInstallments
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                    title="Mostrar todas as parcelas cadastradas (ativas e quitadas)"
                  >
                    Todas ({allInstallments.length})
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.section>

      {/* MODAL DE DETALHES AO CLICAR EM QUALQUER ITEM */}
      {selectedTransactionForDetail && (
        <TransactionDetailModal
          transaction={
            transactions.find((item) => item.id === selectedTransactionForDetail.id) ||
            selectedTransactionForDetail
          }
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
    </>
  );
}
