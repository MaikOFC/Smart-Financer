import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Tag, DollarSign, List, Calendar, Star, Percent, AlertCircle, ShieldAlert, TrendingDown, TrendingUp, Layers } from "lucide-react";
import { Transaction } from "../types";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (transactionData: Omit<Transaction, "id">) => void;
  section: "left" | "right" | "bottom_left";
  selectedMonth: string; // YYYY-MM
  categories?: string[];
  onAddCategory?: (name: string) => Promise<string>;
  existingTransactions?: Transaction[];
}

const DEFAULT_CATEGORIES = [
  "Moradia",
  "Alimentação",
  "Transporte",
  "Lazer",
  "Tecnologia",
  "Saúde",
  "Família",
  "Outros",
];

export default function AddTransactionModal({
  isOpen,
  onClose,
  onAdd,
  section,
  selectedMonth,
  categories,
  onAddCategory,
  existingTransactions = [],
}: AddTransactionModalProps) {
  const [description, setDescription] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [category, setCategory] = useState("Outros");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [isOrangeHighlight, setIsOrangeHighlight] = useState(false);
  const [isDiscount, setIsDiscount] = useState(false);

  const availableCategories = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;

  // Check if an item with the same name already exists in the same section for the current month / list
  const duplicateMatch = useMemo(() => {
    const trimmedDesc = description.trim().toLowerCase();
    if (!trimmedDesc || !existingTransactions) return null;

    return existingTransactions.find((t) => {
      // Must match same table section
      if (t.tableSection !== section) return false;

      // Check month filter (for left and right tables, check if date matches selected month or has no date)
      const matchesMonth = !t.date || t.date.startsWith(selectedMonth);
      if (!matchesMonth && section !== "bottom_left") return false;

      return t.description.trim().toLowerCase() === trimmedDesc;
    });
  }, [description, existingTransactions, section, selectedMonth]);

  const isDuplicate = !!duplicateMatch;

  // Set default values when modal opens or section changes
  useEffect(() => {
    if (isOpen) {
      setDescription("");
      setAmountStr("");
      setCategory(section === "right" ? "Tecnologia" : "Outros");
      setNewCategoryName("");
      setIsCreatingCategory(false);
      setNote("");
      setIsOrangeHighlight(false);
      setIsDiscount(false);

      // Default date logic: Use today's date if it's within the selected month.
      // Otherwise, default to YYYY-MM-15 (middle of the selected month).
      const today = new Date();
      const todayYYYYMM = today.toISOString().slice(0, 7);
      if (todayYYYYMM === selectedMonth) {
        setDate(today.toISOString().slice(0, 10));
      } else {
        setDate(`${selectedMonth}-15`);
      }
    }
  }, [isOpen, section, selectedMonth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || isDuplicate) return;

    const amount = parseFloat(amountStr) || 0;
    let finalCategory = category;

    if (category === "__NEW__") {
      const trimmedNewCat = newCategoryName.trim();
      if (!trimmedNewCat) {
        finalCategory = "Outros";
      } else if (onAddCategory) {
        try {
          finalCategory = await onAddCategory(trimmedNewCat);
        } catch (err) {
          console.error("Erro ao cadastrar nova categoria:", err);
          finalCategory = trimmedNewCat;
        }
      } else {
        finalCategory = trimmedNewCat;
      }
    }

    const newTransaction: Omit<Transaction, "id"> = {
      description: description.trim(),
      amount,
      date,
      type: section === "bottom_left" ? "income" : "expense",
      tableSection: section,
      category: finalCategory,
      isOrangeHighlight: section === "left" ? isOrangeHighlight : false,
      isDiscount: section === "left" ? isDiscount : false,
      note: section === "right" ? note.trim() : "",
    };

    onAdd(newTransaction);
    onClose();
  };

  const sectionName =
    section === "left"
      ? "Gastos do Mês"
      : section === "right"
      ? "Planejamento & Compras Futuras"
      : "Parcelas e Recebíveis";

  const sectionBadgeColor =
    section === "left"
      ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
      : section === "right"
      ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
      : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 text-white z-10 overflow-hidden"
          >
            {/* Upper Glow decoration */}
            <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl border ${
                  section === "left"
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    : section === "right"
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                }`}>
                  {section === "left" ? (
                    <TrendingDown className="w-5 h-5" />
                  ) : section === "right" ? (
                    <TrendingUp className="w-5 h-5" />
                  ) : (
                    <Layers className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <span className={`text-[10px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full border ${sectionBadgeColor}`}>
                    {section === "left" ? "Adicionar Gasto" : "Adicionar Item"}
                  </span>
                  <h3 className="text-lg font-bold text-white mt-1">
                    {sectionName}
                  </h3>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nome do Produto */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Nome do Produto / Descrição
                  </label>
                  {isDuplicate && (
                    <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                      <AlertCircle className="w-3 h-3" /> Item já cadastrado (Duplicado)
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Tag className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDuplicate ? "text-rose-400" : "text-slate-500"}`} />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Assinatura Netflix, Monitor 4K"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={`w-full bg-slate-950 border px-4 py-3 pl-11 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none transition-all font-medium ${
                      isDuplicate
                        ? "border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/30"
                        : "border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    }`}
                    autoFocus
                  />
                </div>

                {isDuplicate && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs text-rose-200"
                  >
                    <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-rose-300">Não é permitido adicionar duplicatas</p>
                      <p className="text-[11px] text-rose-200/80 mt-0.5">
                        O item <strong className="text-white">"{duplicateMatch?.description}"</strong> já existe nesta lista. Modifique o nome para continuar.
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Grid for Price & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Preço */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Preço (R$)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0,00"
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 px-4 py-3 pl-11 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-bold font-mono"
                    />
                  </div>
                </div>

                {/* Data */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Data
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 px-4 py-3 pl-11 pr-4 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Categoria */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Categoria
                </label>
                <div className="relative">
                  <List className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 px-4 py-3 pl-11 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium appearance-none"
                  >
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat} className="bg-slate-900 text-white">
                        {cat}
                      </option>
                    ))}
                    <option value="__NEW__" className="bg-slate-900 text-indigo-400 font-bold">
                      + Criar Nova Categoria...
                    </option>
                  </select>
                  {/* Custom arrow decoration */}
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>

                {category === "__NEW__" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="pt-2"
                  >
                    <input
                      type="text"
                      required
                      placeholder="Nome da Nova Categoria (ex: Viagem, Presentes)"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="w-full bg-slate-950 border border-indigo-500/50 px-4 py-2.5 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                    />
                  </motion.div>
                )}
              </div>

              {/* Extra Sections depending on Left vs Right Table */}
              {section === "right" && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Label / Nota (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Urgente, Desejado, Karinne"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                  />
                </div>
              )}

              {section === "left" && (
                <div className="pt-2 flex flex-col sm:flex-row gap-4">
                  {/* Orange Highlight (Destaque) Toggle */}
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isOrangeHighlight}
                      onChange={(e) => setIsOrangeHighlight(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-5 h-5 rounded-md border border-slate-700 bg-slate-950 flex items-center justify-center peer-checked:border-amber-500 peer-checked:bg-amber-500/10 text-transparent peer-checked:text-amber-400 transition-all">
                      <Star className="w-3.5 h-3.5 fill-current" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-200">Destacar item</span>
                      <span className="text-[10px] text-slate-500">Destaque na cor laranja</span>
                    </div>
                  </label>

                  {/* Gain / Discount Toggle */}
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isDiscount}
                      onChange={(e) => setIsDiscount(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-5 h-5 rounded-md border border-slate-700 bg-slate-950 flex items-center justify-center peer-checked:border-emerald-500 peer-checked:bg-emerald-500/10 text-transparent peer-checked:text-emerald-400 transition-all">
                      <TrendingUp className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-200">É um ganho?</span>
                      <span className="text-[10px] text-slate-500">Subtrai do total de gastos</span>
                    </div>
                  </label>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/60 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isDuplicate || !description.trim()}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 ${
                    isDuplicate
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 cursor-not-allowed opacity-75 shadow-none"
                      : "bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white shadow-indigo-500/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  }`}
                  title={isDuplicate ? "Não é possível cadastrar: item duplicado" : "Adicionar Item"}
                >
                  {isDuplicate ? (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5" /> Item Duplicado (Bloqueado)
                    </>
                  ) : (
                    "Adicionar Item"
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
