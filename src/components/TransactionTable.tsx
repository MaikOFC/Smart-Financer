import React, { useState, useMemo } from "react";
import { Transaction } from "../types";
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Star,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Copy,
  Info,
  Layers,
  Eye,
} from "lucide-react";
import TransactionDetailModal from "./TransactionDetailModal";
import AnimatedNumber from "./AnimatedNumber";
import { getMonthlyInstallmentsTotal, isInstallmentActiveInMonth, getRemainingInstallments } from "../utils/installmentUtils";

interface TransactionTableProps {
  transactions: Transaction[];
  onAddTransaction: (section: "left" | "right" | "bottom_left") => void;
  onUpdateTransaction: (id: string, updatedFields: Partial<Transaction>) => void;
  onDeleteTransaction: (id: string) => void;
  onDeduplicateSection?: (section: "left" | "right" | "bottom_left") => void;
  selectedMonth: string; // YYYY-MM
  categories?: string[];
  onSelectMonth?: (month: string) => void;
}

export default function TransactionTable({
  transactions,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onDeduplicateSection,
  selectedMonth,
  categories,
  onSelectMonth,
}: TransactionTableProps) {
  // Local state for editing rows
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmountStr, setEditAmountStr] = useState<string>("");
  const [editNote, setEditNote] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  // State for item detail viewer (mobile tap)
  const [selectedTransactionForDetail, setSelectedTransactionForDetail] = useState<Transaction | null>(null);

  const startEditing = (t: Transaction) => {
    setEditingId(t.id);
    setEditDesc(t.description);
    setEditAmountStr(t.amount !== undefined ? String(t.amount) : "");
    setEditNote(t.note || "");
    setEditCategory(t.category || "Outros");
    setEditDate(t.date);
    setEditError(null);
  };

  const saveEditing = (id: string) => {
    const currentItem = transactions.find((t) => t.id === id);
    if (!currentItem) return;

    const trimmedDesc = editDesc.trim();
    if (!trimmedDesc) {
      setEditError("O nome não pode estar vazio.");
      return;
    }

    // Check if another item in the same section has this exact name
    const normalizedNew = trimmedDesc.toLowerCase();
    const isDuplicate = transactions.some((t) => {
      if (t.id === id) return false;
      if (t.tableSection !== currentItem.tableSection) return false;
      const matchesMonth = !t.date || t.date.startsWith(selectedMonth);
      if (!matchesMonth && currentItem.tableSection !== "bottom_left") return false;
      return t.description.trim().toLowerCase() === normalizedNew;
    });

    if (isDuplicate) {
      setEditError(`Já existe outro item chamado "${trimmedDesc}". Duplicatas não são permitidas.`);
      return;
    }

    const parsedAmt = parseFloat(editAmountStr) || 0;

    onUpdateTransaction(id, {
      description: trimmedDesc,
      amount: parsedAmt,
      note: editNote,
      category: editCategory,
      date: editDate,
    });
    setEditingId(null);
    setEditError(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditError(null);
  };

  // Filter transactions for the selected month
  const filterByMonth = (t: Transaction) => {
    const isBottom = t.tableSection === "bottom_left" || (t.tableSection as any) === "bottom";
    const isRight = isRightSec(t.tableSection);
    if (isBottom || isRight) return true; // Keep all receivables and future planning items visible across all months
    return !t.date || t.date.startsWith(selectedMonth);
  };

  const isLeftSec = (sec: string) => sec === "left" || sec === "esquerda" || sec === "despesas";
  const isRightSec = (sec: string) => sec === "right" || sec === "direito" || sec === "direita" || sec === "planejamento";
  const isBottomSec = (sec: string) => sec === "bottom_left" || sec === "bottom" || sec === "parcelas" || sec === "devedores" || sec === "recebiveis";

  // Sort states
  const [leftSortBy, setLeftSortBy] = useState<"default" | "alpha-asc" | "alpha-desc" | "price-desc" | "price-asc">("default");
  const [rightSortBy, setRightSortBy] = useState<"default" | "alpha-asc" | "alpha-desc" | "price-desc" | "price-asc">("default");
  const [onlyDuplicates, setOnlyDuplicates] = useState(false);

  const handleToggleLeftProductSort = () => {
    if (leftSortBy === "alpha-asc") setLeftSortBy("alpha-desc");
    else if (leftSortBy === "alpha-desc") setLeftSortBy("default");
    else setLeftSortBy("alpha-asc");
  };

  const handleToggleLeftPriceSort = () => {
    if (leftSortBy === "price-desc") setLeftSortBy("price-asc");
    else if (leftSortBy === "price-asc") setLeftSortBy("default");
    else setLeftSortBy("price-desc");
  };

  const handleToggleRightProductSort = () => {
    if (rightSortBy === "alpha-asc") setRightSortBy("alpha-desc");
    else if (rightSortBy === "alpha-desc") setRightSortBy("default");
    else setRightSortBy("alpha-asc");
  };

  const handleToggleRightPriceSort = () => {
    if (rightSortBy === "price-desc") setRightSortBy("price-asc");
    else if (rightSortBy === "price-asc") setRightSortBy("default");
    else setRightSortBy("price-desc");
  };

  // Direct monthly expenses for selected month
  const rawDirectLeftTransactions = transactions.filter((t) => isLeftSec(t.tableSection) && filterByMonth(t));
  
  // Active installments due in the selected month
  const activeInstallmentsThisMonth = transactions.filter((t) => isInstallmentActiveInMonth(t, selectedMonth));
  
  // Unified Left Table: Contains both direct monthly expenses and active installments
  const rawLeftTransactions = [...rawDirectLeftTransactions, ...activeInstallmentsThisMonth];

  const rawRightTransactions = transactions.filter((t) => isRightSec(t.tableSection));
  const bottomTransactions = transactions.filter((t) => isBottomSec(t.tableSection));

  // Check if there are transactions in other months
  const allLeftOtherMonths = transactions.filter((t) => isLeftSec(t.tableSection) && !t.date?.startsWith(selectedMonth));
  const otherMonthsWithLeftData = Array.from(
    new Set(allLeftOtherMonths.map((t) => t.date?.substring(0, 7)).filter(Boolean))
  ).sort();

  const allRightOtherMonths = transactions.filter((t) => isRightSec(t.tableSection) && !t.date?.startsWith(selectedMonth));
  const otherMonthsWithRightData = Array.from(
    new Set(allRightOtherMonths.map((t) => t.date?.substring(0, 7)).filter(Boolean))
  ).sort();

  const formatMonthLabel = (m: string) => {
    const [year, month] = m.split("-");
    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    const idx = parseInt(month, 10) - 1;
    return `${monthNames[idx] || month}/${year}`;
  };

  // Processed (sorted) Left Transactions
  const leftTransactions = useMemo(() => {
    let list = [...rawLeftTransactions];
    switch (leftSortBy) {
      case "alpha-asc":
        list.sort((a, b) => a.description.localeCompare(b.description, "pt-BR", { sensitivity: "base" }));
        break;
      case "alpha-desc":
        list.sort((a, b) => b.description.localeCompare(a.description, "pt-BR", { sensitivity: "base" }));
        break;
      case "price-desc":
        list.sort((a, b) => b.amount - a.amount);
        break;
      case "price-asc":
        list.sort((a, b) => a.amount - b.amount);
        break;
      default:
        break;
    }
    return list;
  }, [rawLeftTransactions, leftSortBy]);

  // Duplicate item detection for Planning table (normalized description)
  const rightDuplicatesInfo = useMemo(() => {
    const counts: Record<string, number> = {};
    rawRightTransactions.forEach((t) => {
      const normalized = t.description.trim().toLowerCase();
      if (normalized) {
        counts[normalized] = (counts[normalized] || 0) + 1;
      }
    });

    const duplicateNames = new Set(
      Object.keys(counts).filter((k) => counts[k] > 1)
    );

    const duplicateCount = rawRightTransactions.filter((t) =>
      duplicateNames.has(t.description.trim().toLowerCase())
    ).length;

    return { counts, duplicateNames, duplicateCount };
  }, [rawRightTransactions]);

  // Processed (filtered and sorted) Right Transactions
  const rightTransactions = useMemo(() => {
    let list = [...rawRightTransactions];

    // Filter only duplicates if toggle is active
    if (onlyDuplicates) {
      list = list.filter((t) =>
        rightDuplicatesInfo.duplicateNames.has(t.description.trim().toLowerCase())
      );
    }

    // Apply Sorting
    switch (rightSortBy) {
      case "alpha-asc":
        list.sort((a, b) => a.description.localeCompare(b.description, "pt-BR", { sensitivity: "base" }));
        break;
      case "alpha-desc":
        list.sort((a, b) => b.description.localeCompare(a.description, "pt-BR", { sensitivity: "base" }));
        break;
      case "price-desc":
        list.sort((a, b) => b.amount - a.amount);
        break;
      case "price-asc":
        list.sort((a, b) => a.amount - b.amount);
        break;
      case "default":
      default:
        // Keep initial insertion order
        break;
    }

    return list;
  }, [rawRightTransactions, onlyDuplicates, rightSortBy, rightDuplicatesInfo]);

  // Direct expenses total (excluding active installments)
  const directExpensesTotal = rawDirectLeftTransactions.reduce((acc, t) => {
    if (t.isDiscount) {
      return acc - t.amount;
    }
    return acc + t.amount;
  }, 0);

  // Active monthly installments due for this selected month
  const monthlyInstallments = getMonthlyInstallmentsTotal(transactions, selectedMonth);

  // Combined Left Table Total (direct expenses + active installments)
  const totalMonthlyExpenses = directExpensesTotal + monthlyInstallments;

  // Compute Right Table Total
  const rightTotal = rawRightTransactions.reduce((acc, t) => acc + t.amount, 0);

  // Categories list
  const defaultCategories = ["Moradia", "Alimentação", "Transporte", "Lazer", "Tecnologia", "Saúde", "Família", "Outros"];
  const finalCategories = categories && categories.length > 0 ? categories : defaultCategories;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* TABELA DE DESPESAS MENSAIS */}
      <div id="table-left-container" className="bg-slate-900 rounded-3xl border border-slate-800 p-6 flex flex-col justify-between hover:border-slate-700/50 transition-all">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Despesas Mensais</h3>
              <p className="text-xs text-slate-400">Contas regulares e de consumo do mês</p>
            </div>
            <button
              id="btn-add-left"
              onClick={() => onAddTransaction("left")}
              className="flex items-center gap-1.5 text-xs font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-xl border border-indigo-500/15 transition-all"
            >
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>

            <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">
                    <button
                      type="button"
                      onClick={handleToggleLeftProductSort}
                      className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] transition-all rounded-lg px-2 py-1 -ml-2 select-none group cursor-pointer ${
                        leftSortBy === "alpha-asc" || leftSortBy === "alpha-desc"
                          ? "text-indigo-400 bg-indigo-500/10 border border-indigo-500/20"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                      }`}
                      title="Clique para ordenar por nome (A-Z / Z-A / Padrão)"
                    >
                      <span>Produto</span>
                      {leftSortBy === "alpha-asc" ? (
                        <span className="flex items-center text-[9px] font-mono text-indigo-300">
                          <ArrowUp className="w-3 h-3 text-indigo-400" /> A→Z
                        </span>
                      ) : leftSortBy === "alpha-desc" ? (
                        <span className="flex items-center text-[9px] font-mono text-indigo-300">
                          <ArrowDown className="w-3 h-3 text-indigo-400" /> Z→A
                        </span>
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-80 transition-opacity" />
                      )}
                    </button>
                  </th>
                  <th className="py-2.5 px-2 hidden sm:table-cell">Categoria</th>
                  <th className="py-2.5 px-3 text-right sm:text-left">
                    <button
                      type="button"
                      onClick={handleToggleLeftPriceSort}
                      className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] transition-all rounded-lg px-2 py-1 -ml-2 select-none group cursor-pointer ${
                        leftSortBy === "price-desc" || leftSortBy === "price-asc"
                          ? "text-indigo-400 bg-indigo-500/10 border border-indigo-500/20"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                      }`}
                      title="Clique para ordenar por preço (Maior / Menor / Padrão)"
                    >
                      <span>Preço</span>
                      {leftSortBy === "price-desc" ? (
                        <span className="flex items-center text-[9px] font-mono text-indigo-300">
                          <ArrowDown className="w-3 h-3 text-indigo-400" /> Maior
                        </span>
                      ) : leftSortBy === "price-asc" ? (
                        <span className="flex items-center text-[9px] font-mono text-indigo-300">
                          <ArrowUp className="w-3 h-3 text-indigo-400" /> Menor
                        </span>
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-80 transition-opacity" />
                      )}
                    </button>
                  </th>
                  <th className="py-2.5 px-2 text-center hidden sm:table-cell">Destaque</th>
                  <th className="py-2.5 px-2 text-right hidden sm:table-cell">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {leftTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 px-4 text-center text-slate-400 text-xs">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                        <p className="font-medium text-slate-400">Nenhuma despesa mensal registrada para este mês.</p>
                        {otherMonthsWithLeftData.length > 0 && onSelectMonth && (
                          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                            <span className="text-[11px] text-slate-500">Registros em outros meses:</span>
                            {otherMonthsWithLeftData.map((m) => {
                              const count = allLeftOtherMonths.filter((t) => t.date.startsWith(m)).length;
                              return (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => onSelectMonth(m)}
                                  className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                                  title={`Mudar visualização para ${formatMonthLabel(m)}`}
                                >
                                  <span>{formatMonthLabel(m)}</span>
                                  <span className="text-[10px] bg-indigo-500/25 px-1.5 py-0.2 rounded-full font-mono font-bold text-indigo-300">
                                    {count} {count === 1 ? "item" : "itens"}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  leftTransactions.map((t) => {
                    const isEditing = editingId === t.id;
                    const isInst = isBottomSec(t.tableSection);
                    const rowBg = isInst
                      ? "bg-purple-500/[0.03] hover:bg-purple-500/[0.08] border-l-4 border-purple-500/50 text-slate-200"
                      : t.isOrangeHighlight
                      ? "bg-amber-500/5 hover:bg-amber-500/10 text-amber-300 border-l-4 border-amber-500"
                      : t.isDiscount
                      ? "bg-slate-800/40 hover:bg-slate-800/50 text-slate-400 italic border-l-4 border-slate-600"
                      : "hover:bg-slate-800/30 border-l-4 border-transparent text-slate-300";

                    return (
                      <tr
                        key={t.id}
                        onClick={() => {
                          if (!isEditing) {
                            setSelectedTransactionForDetail(t);
                          }
                        }}
                        className={`transition-all cursor-pointer select-none group ${rowBg}`}
                        title="Toque para visualizar detalhes, editar ou excluir"
                      >
                        {/* Descrição */}
                        <td className="py-3 px-3 font-medium">
                          {isEditing ? (
                            <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={editDesc}
                                onChange={(e) => {
                                  setEditDesc(e.target.value);
                                  setEditError(null);
                                }}
                                className={`bg-slate-950 border px-2 py-1 rounded-lg w-full text-xs text-white focus:outline-none ${
                                  editError ? "border-rose-500 ring-1 ring-rose-500/30" : "border-slate-800 focus:border-indigo-500"
                                }`}
                              />
                              {editError && (
                                <p className="text-[10px] text-rose-400 font-medium leading-tight flex items-center gap-1">
                                  <AlertCircle className="w-2.5 h-2.5 flex-shrink-0" /> {editError}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-slate-100 group-hover:text-white transition-colors">{t.description}</span>
                              {isInst && (
                                <span className="text-[9px] bg-purple-500/15 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                                  <Layers className="w-3 h-3 text-purple-400" />
                                  Parcela ({getRemainingInstallments(t.date, selectedMonth)}x)
                                </span>
                              )}
                              {t.isDiscount && (
                                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded uppercase font-bold not-italic">
                                  Ganho
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Categoria (Escondida no mobile para layout super limpo) */}
                        <td className="py-3 px-2 hidden sm:table-cell" onClick={(e) => isEditing && e.stopPropagation()}>
                          {isEditing ? (
                            <select
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value)}
                              className="bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg text-xs text-white focus:outline-none"
                            >
                              {finalCategories.map((c) => (
                                <option key={c} value={c} className="bg-slate-900">
                                  {c}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-[10px] bg-slate-800/80 text-slate-300 border border-slate-700/50 px-2 py-0.5 rounded-full font-medium">
                              {t.category || "Outros"}
                            </span>
                          )}
                        </td>

                        {/* Preço (Formatado perfeitamente sem corte) */}
                        <td className="py-3 px-3 font-bold font-mono text-right sm:text-left whitespace-nowrap">
                          {isEditing ? (
                            <div onClick={(e) => e.stopPropagation()}>
                              <input
                                type="number"
                                step="0.01"
                                value={editAmountStr}
                                onChange={(e) => setEditAmountStr(e.target.value)}
                                className="bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg w-24 text-xs text-white focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                          ) : (
                            <span className={`text-xs sm:text-xs font-black font-mono ${t.isDiscount ? "text-slate-400 font-normal" : "text-rose-400"}`}>
                              {t.isDiscount ? "- " : ""}
                              R$ {t.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </td>

                        {/* Destaque (Escondido no mobile, acessível pelo modal ou desktop) */}
                        <td className="py-3 px-2 text-center hidden sm:table-cell" onClick={(e) => e.stopPropagation()}>
                          {!isEditing && (
                            <div className="flex justify-center gap-1.5">
                              {/* Orange Highlight Toggle */}
                              <button
                                onClick={() => onUpdateTransaction(t.id, { isOrangeHighlight: !t.isOrangeHighlight, isDiscount: false })}
                                title="Destacar Laranja"
                                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                  t.isOrangeHighlight ? "bg-amber-500 text-white" : "bg-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-700"
                                }`}
                              >
                                <Star className="w-3 h-3 fill-current" />
                              </button>
                              {/* Discount Toggle */}
                              <button
                                onClick={() => onUpdateTransaction(t.id, { isDiscount: !t.isDiscount, isOrangeHighlight: false })}
                                title="Marcar como Desconto"
                                className={`p-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                  t.isDiscount ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-700"
                                }`}
                              >
                                %
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Ações (Escondidas no mobile, acessíveis pelo modal ou desktop) */}
                        <td className="py-3 px-2 text-right hidden sm:table-cell" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveEditing(t.id)}
                                  className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded-lg cursor-pointer"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button onClick={cancelEditing} className="p-1 text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer">
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditing(t)}
                                  className="p-1 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                                  title="Editar item"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onDeleteTransaction(t.id)}
                                  className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                                  title="Excluir item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Total da Tabela de Despesas */}
        <div className="mt-6 border-t border-slate-800 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="font-bold text-slate-400 text-xs uppercase tracking-wider">Total Gastos do Mês:</span>
            {monthlyInstallments > 0 && (
              <p className="text-[11px] text-slate-400 font-medium font-sans">
                (Contas: R$ {directExpensesTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} + Parcelas ativas: R$ {monthlyInstallments.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})
              </p>
            )}
          </div>
          <div className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-4 py-2 rounded-2xl text-base font-black font-mono">
            R$ <AnimatedNumber value={totalMonthlyExpenses} duration={1000} />
          </div>
        </div>
      </div>

      {/* TABELA DE PLANEJAMENTO & COMPRAS FUTURAS */}
      <div id="table-right-container" className="bg-slate-900 rounded-3xl border border-slate-800 p-6 flex flex-col justify-between hover:border-slate-700/50 transition-all">
        <div>
          {/* Header da Tabela */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-white">Planejamento & Compras Futuras</h3>
                {rightDuplicatesInfo.duplicateNames.size > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-sans cursor-pointer hover:bg-amber-500/25 transition-all"
                      onClick={() => setOnlyDuplicates(!onlyDuplicates)}
                      title="Clique para filtrar e ver apenas itens duplicados"
                    >
                      <AlertCircle className="w-3 h-3 text-amber-400" />
                      {rightDuplicatesInfo.duplicateNames.size} duplicata{rightDuplicatesInfo.duplicateNames.size > 1 ? "s" : ""}
                    </span>
                    {onDeduplicateSection && (
                      <button
                        type="button"
                        onClick={() => onDeduplicateSection("right")}
                        className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition-all cursor-pointer shadow-sm"
                        title="Remove automaticamente as cópias extras repetidas e mantém 1 de cada item"
                      >
                        <Trash2 className="w-2.5 h-2.5" /> Limpar Duplicatas
                      </button>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400">Eletrônicos, desejos e itens futuros para planejamento visual</p>
            </div>

            <button
              id="btn-add-right"
              onClick={() => onAddTransaction("right")}
              className="flex items-center gap-1.5 text-xs font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-3.5 py-2 rounded-xl border border-indigo-500/15 transition-all self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  {/* Coluna PRODUTO com ordenação sutil */}
                  <th className="py-2.5 px-3">
                    <button
                      type="button"
                      onClick={handleToggleRightProductSort}
                      className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] transition-all rounded-lg px-2 py-1 -ml-2 select-none group cursor-pointer ${
                        rightSortBy === "alpha-asc" || rightSortBy === "alpha-desc"
                          ? "text-indigo-400 bg-indigo-500/10 border border-indigo-500/20"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                      }`}
                      title="Clique para ordenar por nome (A-Z / Z-A / Padrão)"
                    >
                      <span>Produto</span>
                      {rightSortBy === "alpha-asc" ? (
                        <span className="flex items-center text-[9px] font-mono text-indigo-300">
                          <ArrowUp className="w-3 h-3 text-indigo-400" /> A→Z
                        </span>
                      ) : rightSortBy === "alpha-desc" ? (
                        <span className="flex items-center text-[9px] font-mono text-indigo-300">
                          <ArrowDown className="w-3 h-3 text-indigo-400" /> Z→A
                        </span>
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-80 transition-opacity" />
                      )}
                    </button>
                  </th>

                  {/* Coluna PREÇO ESTIMADO com ordenação sutil */}
                  <th className="py-2.5 px-3 text-right sm:text-left">
                    <button
                      type="button"
                      onClick={handleToggleRightPriceSort}
                      className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] transition-all rounded-lg px-2 py-1 -ml-2 select-none group cursor-pointer ${
                        rightSortBy === "price-desc" || rightSortBy === "price-asc"
                          ? "text-indigo-400 bg-indigo-500/10 border border-indigo-500/20"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                      }`}
                      title="Clique para ordenar por preço estimado (Maior / Menor / Padrão)"
                    >
                      <span>Preço Estimado (R$)</span>
                      {rightSortBy === "price-desc" ? (
                        <span className="flex items-center text-[9px] font-mono text-indigo-300">
                          <ArrowDown className="w-3 h-3 text-indigo-400" /> Maior
                        </span>
                      ) : rightSortBy === "price-asc" ? (
                        <span className="flex items-center text-[9px] font-mono text-indigo-300">
                          <ArrowUp className="w-3 h-3 text-indigo-400" /> Menor
                        </span>
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-80 transition-opacity" />
                      )}
                    </button>
                  </th>

                  <th className="py-2.5 px-2 hidden sm:table-cell">Label / Nota</th>
                  <th className="py-2.5 px-2 hidden sm:table-cell">Categoria</th>
                  <th className="py-2.5 px-2 text-right hidden sm:table-cell">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {rightTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 px-4 text-center text-slate-400 text-xs">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                        <p className="font-medium text-slate-400">
                          {onlyDuplicates
                            ? "Nenhum item duplicado encontrado com os filtros atuais."
                            : "Nenhum planejamento ou compra futura registrada."}
                        </p>
                        {!onlyDuplicates && otherMonthsWithRightData.length > 0 && onSelectMonth && (
                          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                            <span className="text-[11px] text-slate-500">Registros em outros meses:</span>
                            {otherMonthsWithRightData.map((m) => {
                              const count = allRightOtherMonths.filter((t) => t.date.startsWith(m)).length;
                              return (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => onSelectMonth(m)}
                                  className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                                  title={`Mudar visualização para ${formatMonthLabel(m)}`}
                                >
                                  <span>{formatMonthLabel(m)}</span>
                                  <span className="text-[10px] bg-indigo-500/25 px-1.5 py-0.2 rounded-full font-mono font-bold text-indigo-300">
                                    {count} {count === 1 ? "item" : "itens"}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  rightTransactions.map((t) => {
                    const isEditing = editingId === t.id;
                    const hasSpecialLabel = t.amount === 0 && t.note;
                    const isDuplicate = rightDuplicatesInfo.duplicateNames.has(t.description.trim().toLowerCase());
                    const dupCount = rightDuplicatesInfo.counts[t.description.trim().toLowerCase()] || 0;

                    return (
                      <tr
                        key={t.id}
                        onClick={() => {
                          if (!isEditing) {
                            setSelectedTransactionForDetail(t);
                          }
                        }}
                        className={`transition-all cursor-pointer select-none group ${
                          isDuplicate
                            ? "bg-amber-500/[0.04] hover:bg-amber-500/[0.08] text-slate-200 border-l-2 border-amber-500/70"
                            : "hover:bg-slate-800/30 text-slate-300 border-l-2 border-transparent"
                        }`}
                        title="Toque para visualizar detalhes, editar ou excluir"
                      >
                        {/* Descrição & Indicador de Duplicata */}
                        <td className="py-3 px-3 font-medium">
                          {isEditing ? (
                            <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={editDesc}
                                onChange={(e) => {
                                  setEditDesc(e.target.value);
                                  setEditError(null);
                                }}
                                className={`bg-slate-950 border px-2 py-1 rounded-lg w-full text-xs text-white focus:outline-none ${
                                  editError ? "border-rose-500 ring-1 ring-rose-500/30" : "border-slate-800 focus:border-indigo-500"
                                }`}
                              />
                              {editError && (
                                <p className="text-[10px] text-rose-400 font-medium leading-tight flex items-center gap-1">
                                  <AlertCircle className="w-2.5 h-2.5 flex-shrink-0" /> {editError}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white group-hover:text-indigo-300 transition-colors">{t.description}</span>
                              {isDuplicate && (
                                <span
                                  className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-tight"
                                  title={`Este item aparece ${dupCount} vezes na lista de planejamento`}
                                >
                                  <Copy className="w-2.5 h-2.5" /> {dupCount}x Duplicado
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Preço (Formatado perfeitamente no mobile) */}
                        <td className="py-3 px-3 font-bold font-mono text-right sm:text-left whitespace-nowrap">
                          {isEditing ? (
                            <div onClick={(e) => e.stopPropagation()}>
                              <input
                                type="number"
                                step="0.01"
                                value={editAmountStr}
                                onChange={(e) => setEditAmountStr(e.target.value)}
                                className="bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg w-24 text-xs text-white focus:outline-none"
                              />
                            </div>
                          ) : (
                            <span className={hasSpecialLabel ? "text-slate-500 italic font-normal" : "text-amber-400 font-mono font-black"}>
                              {hasSpecialLabel
                                ? "—"
                                : `R$ ${t.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            </span>
                          )}
                        </td>

                        {/* Label / Nota (Escondida no mobile, visível no modal) */}
                        <td className="py-3 px-2 hidden sm:table-cell" onClick={(e) => isEditing && e.stopPropagation()}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editNote}
                              onChange={(e) => setEditNote(e.target.value)}
                              className="bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg w-full text-xs text-white focus:outline-none"
                              placeholder="Karinne, 3D, etc."
                            />
                          ) : (
                            t.note && (
                              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-mono font-bold uppercase">
                                {t.note}
                              </span>
                            )
                          )}
                        </td>

                        {/* Categoria (Escondida no mobile, visível no modal) */}
                        <td className="py-3 px-2 hidden sm:table-cell" onClick={(e) => isEditing && e.stopPropagation()}>
                          {isEditing ? (
                            <select
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value)}
                              className="bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg text-xs text-white focus:outline-none"
                            >
                              {finalCategories.map((c) => (
                                <option key={c} value={c} className="bg-slate-900">
                                  {c}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-[10px] bg-slate-800/80 text-slate-300 border border-slate-700/50 px-2 py-0.5 rounded-full font-medium">
                              {t.category || "Outros"}
                            </span>
                          )}
                        </td>

                        {/* Ações (Escondidas no mobile, visíveis no modal) */}
                        <td className="py-3 px-2 text-right hidden sm:table-cell" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveEditing(t.id)}
                                  className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded-lg cursor-pointer"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button onClick={cancelEditing} className="p-1 text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer">
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditing(t)}
                                  className="p-1 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                                  title="Editar item"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onDeleteTransaction(t.id)}
                                  className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                                  title="Excluir item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Total da Tabela de Planejamento */}
        <div className="mt-6 border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="font-bold text-slate-400 text-xs uppercase tracking-wider">Total Planejado:</span>
            <span className="text-[10px] text-slate-500 font-medium font-sans">Valor meramente informativo (não diminui o saldo do mês)</span>
          </div>
          <div className="bg-slate-950/55 text-amber-400 border border-slate-800 px-4 py-2 rounded-2xl text-base font-black font-mono">
            R$ <AnimatedNumber value={rightTotal} duration={1000} />
          </div>
        </div>
      </div>

      {/* SEÇÃO INFERIOR - PARCELAS / RECEBÍVEIS */}
      <div id="table-bottom-container" className="lg:col-span-2 bg-slate-900 rounded-3xl border border-slate-800 p-6 hover:border-slate-700/50 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Visualização de Parcelas & Devedores</h3>
              <span className="text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Eye className="w-3 h-3" /> Apenas Visualização
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Acompanhamento centralizado de todas as compras parceladas e devedores cadastrados em Gastos do Mês
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Descrição / Detalhe</th>
                <th className="py-3 px-3 text-right sm:text-left">Valor Parcela</th>
                <th className="py-3 px-2 hidden sm:table-cell">Mês Quitação</th>
                <th className="py-3 px-2 text-center hidden sm:table-cell">Parcelas Restantes</th>
                <th className="py-3 px-2 hidden sm:table-cell">Saldo Devedor</th>
                <th className="py-3 px-2 text-right hidden sm:table-cell">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {bottomTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs font-mono">
                    Nenhuma parcela registrada.
                  </td>
                </tr>
              ) : (
                bottomTransactions.map((t) => {
                  const isEditing = editingId === t.id;

                  // Dynamic calculation of remaining installments based on selected month
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

                  const remainingCount = getRemainingInstallments(t.date);
                  const remainingAmount = t.amount * remainingCount;

                  const formatDateString = (ds: string) => {
                    try {
                      const d = new Date(ds + "T00:00:00");
                      const monthNames = [
                        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
                      ];
                      return `${monthNames[d.getMonth()]} de ${d.getFullYear()}`;
                    } catch (e) {
                      return ds;
                    }
                  };

                  return (
                    <tr
                      key={t.id}
                      onClick={() => {
                        if (!isEditing) {
                          setSelectedTransactionForDetail(t);
                        }
                      }}
                      className={`hover:bg-slate-800/30 transition-all text-slate-300 cursor-pointer select-none group ${
                        remainingCount > 0 ? "bg-amber-500/[0.01]" : "opacity-40"
                      }`}
                      title="Toque para visualizar detalhes, parcelas restantes ou editar"
                    >
                      {/* Descrição */}
                      <td className="py-3 px-3 font-medium">
                        {isEditing ? (
                          <div onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editDesc}
                              onChange={(e) => setEditDesc(e.target.value)}
                              className="bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg w-full text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white group-hover:text-emerald-300 transition-colors">{t.description}</span>
                            {remainingCount > 0 ? (
                              <span className="inline-block sm:hidden text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25">
                                {remainingCount}x
                              </span>
                            ) : null}
                          </div>
                        )}
                      </td>

                      {/* Valor Parcela */}
                      <td className="py-3 px-3 font-black font-mono text-rose-400 text-right sm:text-left whitespace-nowrap">
                        {isEditing ? (
                          <div onClick={(e) => e.stopPropagation()}>
                            <input
                              type="number"
                              step="0.01"
                              value={editAmountStr}
                              onChange={(e) => setEditAmountStr(e.target.value)}
                              className="bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg w-24 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        ) : (
                          `R$ ${t.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        )}
                      </td>

                      {/* Mês de Quitação (Escondido no mobile, visível no modal) */}
                      <td className="py-3 px-2 text-slate-400 font-medium hidden sm:table-cell" onClick={(e) => isEditing && e.stopPropagation()}>
                        {isEditing ? (
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                          />
                        ) : (
                          formatDateString(t.date)
                        )}
                      </td>

                      {/* Parcelas Restantes (Escondido no mobile, visível no modal) */}
                      <td className="py-3 px-2 text-center hidden sm:table-cell" onClick={(e) => e.stopPropagation()}>
                        {remainingCount > 0 ? (
                          <span className="inline-block px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/25 rounded-full font-bold font-mono text-[10px]">
                            {remainingCount}x restantes
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-full font-bold font-sans text-[10px]">
                            ✓ Quitada!
                          </span>
                        )}
                      </td>

                      {/* Saldo Restante (Escondido no mobile, visível no modal) */}
                      <td className="py-3 px-2 font-bold font-mono hidden sm:table-cell" onClick={(e) => e.stopPropagation()}>
                        {remainingCount > 0 ? (
                          <span className="text-amber-400">
                            R$ {remainingAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-slate-500">R$ 0,00</span>
                        )}
                      </td>

                      {/* Ações (Escondidas no mobile, visíveis no modal) */}
                      <td className="py-3 px-2 text-right hidden sm:table-cell" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveEditing(t.id)}
                                className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded-lg cursor-pointer"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={cancelEditing} className="p-1 text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer">
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditing(t)}
                                className="p-1 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                                title="Editar item"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteTransaction(t.id)}
                                className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                                title="Excluir item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Total da Tabela de Parcelas (Saldo Devedor Restante) */}
        <div className="mt-6 border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="font-bold text-slate-400 text-xs uppercase tracking-wider">Saldo Devedor Total Restante:</span>
            <span className="text-[10px] text-slate-500 font-medium font-sans">
              Soma de todas as parcelas ativas a vencer a partir de {
                new Date(selectedMonth + "-15").toLocaleString("pt-BR", { month: "long", year: "numeric" })
              }
            </span>
          </div>
          <div className="bg-slate-950/55 text-amber-400 border border-slate-800 px-4 py-2 rounded-2xl text-base font-black font-mono">
            R${" "}
            <AnimatedNumber
              value={bottomTransactions.reduce((acc, t) => {
                const getRemainingCount = (endDateStr: string) => {
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
                return acc + t.amount * getRemainingCount(t.date);
              }, 0)}
              duration={1000}
            />
          </div>
        </div>
      </div>

      {/* VISUALIZADOR DE DETALHES DO ITEM (TOQUE NO MOBILE OU DESKTOP) */}
      <TransactionDetailModal
        isOpen={!!selectedTransactionForDetail}
        transaction={selectedTransactionForDetail}
        onClose={() => setSelectedTransactionForDetail(null)}
        onUpdateTransaction={(id, updated) => {
          onUpdateTransaction(id, updated);
          if (selectedTransactionForDetail && selectedTransactionForDetail.id === id) {
            setSelectedTransactionForDetail({
              ...selectedTransactionForDetail,
              ...updated,
            });
          }
        }}
        onDeleteTransaction={(id) => {
          onDeleteTransaction(id);
          setSelectedTransactionForDetail(null);
        }}
        categories={finalCategories}
        selectedMonth={selectedMonth}
      />
    </div>
  );
}
