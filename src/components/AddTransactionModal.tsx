import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Tag, DollarSign, List, Calendar, Star, Percent } from "lucide-react";
import { Transaction } from "../types";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (transactionData: Omit<Transaction, "id">) => void;
  section: "left" | "right" | "bottom_left";
  selectedMonth: string; // YYYY-MM
}

const CATEGORIES = [
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
}: AddTransactionModalProps) {
  const [description, setDescription] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [category, setCategory] = useState("Outros");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [isOrangeHighlight, setIsOrangeHighlight] = useState(false);
  const [isDiscount, setIsDiscount] = useState(false);

  // Set default values when modal opens or section changes
  useEffect(() => {
    if (isOpen) {
      setDescription("");
      setAmountStr("");
      setCategory(section === "right" ? "Tecnologia" : "Outros");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    const amount = parseFloat(amountStr) || 0;

    const newTransaction: Omit<Transaction, "id"> = {
      description: description.trim(),
      amount,
      date,
      type: section === "bottom_left" ? "income" : "expense",
      tableSection: section,
      category,
      isOrangeHighlight: section === "left" ? isOrangeHighlight : false,
      isDiscount: section === "left" ? isDiscount : false,
      note: section === "right" ? note.trim() : "",
    };

    onAdd(newTransaction);
    onClose();
  };

  const sectionName =
    section === "left"
      ? "Despesas Mensais"
      : section === "right"
      ? "Planejamento & Compras Futuras"
      : "Parcelas e Recebíveis";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
              <div>
                <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/10">
                  Adicionar Item
                </span>
                <h3 className="text-lg font-bold text-white mt-2">
                  {sectionName}
                </h3>
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
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Nome do Produto / Descrição
                </label>
                <div className="relative">
                  <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Assinatura Netflix, Monitor 4K"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 px-4 py-3 pl-11 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                    autoFocus
                  />
                </div>
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
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className="bg-slate-900 text-white">
                        {cat}
                      </option>
                    ))}
                  </select>
                  {/* Custom arrow decoration */}
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>
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

                  {/* Discount Toggle */}
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isDiscount}
                      onChange={(e) => setIsDiscount(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-5 h-5 rounded-md border border-slate-700 bg-slate-950 flex items-center justify-center peer-checked:border-indigo-500 peer-checked:bg-indigo-500/10 text-transparent peer-checked:text-indigo-400 transition-all">
                      <Percent className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-200">É um desconto?</span>
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
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white transition-all shadow-lg shadow-indigo-500/10"
                >
                  Adicionar Item
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
