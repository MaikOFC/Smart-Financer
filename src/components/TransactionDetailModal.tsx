import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Tag,
  Calendar,
  Wallet,
  Star,
  Edit2,
  Trash2,
  Check,
  FileText,
  DollarSign,
  AlertCircle,
  Percent,
  Layers,
  ChevronRight,
  Clock,
  Sparkles,
} from "lucide-react";
import { Transaction } from "../types";
import { useModalBackHandler } from "../hooks/useBackNavigation";

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTransaction: (id: string, updatedFields: Partial<Transaction>) => void;
  onDeleteTransaction: (id: string) => void;
  categories: string[];
  selectedMonth: string;
}

export default function TransactionDetailModal({
  transaction,
  isOpen,
  onClose,
  onUpdateTransaction,
  onDeleteTransaction,
  categories,
  selectedMonth,
}: TransactionDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editDesc, setEditDesc] = useState("");
  const [editAmountStr, setEditAmountStr] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editIsHighlight, setEditIsHighlight] = useState(false);
  const [editIsDiscount, setEditIsDiscount] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Intercepta o botão voltar do celular para fechar os detalhes
  useModalBackHandler(isOpen, onClose, "transaction_detail_modal");

  useEffect(() => {
    if (transaction) {
      setEditDesc(transaction.description || "");
      setEditAmountStr(transaction.amount !== undefined ? String(transaction.amount) : "0");
      setEditCategory(transaction.category || "Outros");
      setEditDate(transaction.date || "");
      setEditNote(transaction.note || "");
      setEditIsHighlight(!!transaction.isOrangeHighlight);
      setEditIsDiscount(!!transaction.isDiscount);
      setIsEditing(false);
      setError(null);
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const getSectionLabel = (sec: string) => {
    if (sec === "left" || sec === "despesas") return { label: "Despesa Mensal", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" };
    if (sec === "right" || sec === "planejamento") return { label: "Planejamento Futuro", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" };
    return { label: "Parcela / Recebível", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
  };

  const sectionInfo = getSectionLabel(transaction.tableSection);

  const handleSave = () => {
    const trimmed = editDesc.trim();
    if (!trimmed) {
      setError("O nome do item não pode estar vazio.");
      return;
    }

    const parsedAmount = parseFloat(editAmountStr) || 0;

    onUpdateTransaction(transaction.id, {
      description: trimmed,
      amount: parsedAmount,
      category: editCategory,
      date: editDate,
      note: editNote,
      isOrangeHighlight: editIsHighlight,
      isDiscount: editIsDiscount,
    });

    setIsEditing(false);
    setError(null);
  };

  const handleToggleHighlight = () => {
    const newVal = !transaction.isOrangeHighlight;
    onUpdateTransaction(transaction.id, {
      isOrangeHighlight: newVal,
      isDiscount: newVal ? false : transaction.isDiscount,
    });
    setEditIsHighlight(newVal);
  };

  const handleToggleDiscount = () => {
    const newVal = !transaction.isDiscount;
    onUpdateTransaction(transaction.id, {
      isDiscount: newVal,
      isOrangeHighlight: newVal ? false : transaction.isOrangeHighlight,
    });
    setEditIsDiscount(newVal);
  };

  const handleDelete = () => {
    if (window.confirm(`Deseja excluir "${transaction.description}"?`)) {
      onDeleteTransaction(transaction.id);
      onClose();
    }
  };

  // Formatted date
  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return "Sem data específica";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      if (parts.length === 2) {
        return `${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden relative my-6"
        >
          {/* TOPO DEGRADÊ */}
          <div className={`h-2 ${
            transaction.isOrangeHighlight
              ? "bg-gradient-to-r from-amber-500 to-orange-500"
              : transaction.isDiscount
              ? "bg-gradient-to-r from-slate-600 to-slate-400"
              : "bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500"
          }`} />

          {/* BOTÃO FECHAR */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-all cursor-pointer z-10"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-6 sm:p-7 space-y-6">
            {/* CABEÇALHO COM BADGES */}
            <div className="flex items-center gap-2 flex-wrap pr-10">
              <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${sectionInfo.color}`}>
                {sectionInfo.label}
              </span>
              {transaction.isOrangeHighlight && (
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  Destacado
                </span>
              )}
              {transaction.isDiscount && (
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                  <Percent className="w-3 h-3" />
                  Desconto / Abatimento
                </span>
              )}
            </div>

            {isEditing ? (
              /* MODO DE EDIÇÃO */
              <div className="space-y-4 pt-1">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Nome do Item / Produto
                  </label>
                  <input
                    type="text"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Ex: Cartão, Mercado..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Valor (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editAmountStr}
                      onChange={(e) => setEditAmountStr(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl text-sm font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Categoria
                    </label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat} className="bg-slate-900 text-slate-200">
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Data do Lançamento
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Observações / Notas
                  </label>
                  <textarea
                    rows={2}
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
                    placeholder="Adicione qualquer detalhe adicional..."
                  />
                </div>

                {error && (
                  <p className="text-xs text-rose-400 font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> {error}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/20"
                  >
                    <Check className="w-4 h-4" /> Salvar Alterações
                  </button>
                </div>
              </div>
            ) : (
              /* MODO DE VISUALIZAÇÃO DETALHADA */
              <div className="space-y-5">
                {/* CARTÃO PRINCIPAL: NOME & VALOR GRANDE */}
                <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-5 shadow-inner flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Produto / Item
                      </span>
                      <h3 className="text-xl font-black text-white tracking-tight mt-0.5 break-words">
                        {transaction.description}
                      </h3>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-baseline justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Valor:
                    </span>
                    <span className={`text-2xl font-black font-mono tracking-tight ${
                      transaction.isDiscount
                        ? "text-slate-400"
                        : transaction.isOrangeHighlight
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }`}>
                      {transaction.isDiscount ? "- " : ""}
                      R$ {transaction.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* GRADE DE INFORMAÇÕES ADICIONAIS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* CATEGORIA */}
                  <div className="p-3.5 bg-slate-950/40 border border-slate-800/80 rounded-xl flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0">
                      <Tag className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Categoria</p>
                      <p className="font-bold text-slate-200 truncate mt-0.5">{transaction.category || "Outros"}</p>
                    </div>
                  </div>

                  {/* DATA */}
                  <div className="p-3.5 bg-slate-950/40 border border-slate-800/80 rounded-xl flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Data</p>
                      <p className="font-bold text-slate-200 truncate mt-0.5">{formatDateDisplay(transaction.date)}</p>
                    </div>
                  </div>

                  {/* TIPO */}
                  <div className="p-3.5 bg-slate-950/40 border border-slate-800/80 rounded-xl flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Tipo de Registro</p>
                      <p className="font-bold text-slate-200 truncate mt-0.5">
                        {transaction.isDiscount ? "Desconto na Tabela" : transaction.type === "income" ? "Entrada / Salário" : "Despesa"}
                      </p>
                    </div>
                  </div>

                  {/* DESTAQUE */}
                  <div className="p-3.5 bg-slate-950/40 border border-slate-800/80 rounded-xl flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg shrink-0">
                      <Star className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Status de Destaque</p>
                      <p className="font-bold text-slate-200 truncate mt-0.5">
                        {transaction.isOrangeHighlight ? "Destacado em Laranja" : "Padrão"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* NOTAS OU OBSERVAÇÕES */}
                {transaction.note ? (
                  <div className="p-3.5 bg-slate-950/40 border border-slate-800/80 rounded-xl space-y-1">
                    <div className="flex items-center gap-2 text-slate-400">
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-[10px] font-bold uppercase">Observações / Detalhes</span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium whitespace-pre-wrap leading-relaxed pt-0.5">
                      {transaction.note}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-950/20 border border-slate-800/50 rounded-xl text-center">
                    <p className="text-[11px] text-slate-400 italic">Nenhuma observação informada.</p>
                  </div>
                )}

                {/* BOTÕES DE AÇÕES RÁPIDAS NO MODAL */}
                <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-800/80 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    {/* TOGGLE HIGHLIGHT */}
                    <button
                      type="button"
                      onClick={handleToggleHighlight}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        transaction.isOrangeHighlight
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                      }`}
                      title="Destacar / Remover destaque"
                    >
                      <Star className={`w-4 h-4 ${transaction.isOrangeHighlight ? "fill-current" : ""}`} />
                      <span className="hidden sm:inline">Destaque</span>
                    </button>

                    {/* TOGGLE DISCOUNT */}
                    <button
                      type="button"
                      onClick={handleToggleDiscount}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        transaction.isDiscount
                          ? "bg-slate-800 text-slate-200 border-slate-700"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                      }`}
                      title="Marcar como desconto"
                    >
                      <Percent className="w-4 h-4" />
                      <span className="hidden sm:inline">Desconto</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* EXCLUIR */}
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="p-2.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                      title="Excluir este item"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Excluir</span>
                    </button>

                    {/* EDITAR */}
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-lg shadow-indigo-600/20"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Editar</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
