import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Tag, DollarSign, List, Calendar, Star, Percent, AlertCircle, ShieldAlert, TrendingDown, TrendingUp, Layers, Clock, Calculator } from "lucide-react";
import { Transaction } from "../types";
import { useModalBackHandler } from "../hooks/useBackNavigation";
import { calculateEndDateFromInstallments, getRemainingInstallments } from "../utils/installmentUtils";

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
  const [startMonth, setStartMonth] = useState(selectedMonth);
  const [installmentCountStr, setInstallmentCountStr] = useState<string>("6");
  const [note, setNote] = useState("");
  const [isOrangeHighlight, setIsOrangeHighlight] = useState(false);
  const [isDiscount, setIsDiscount] = useState(false);
  const [isInstallment, setIsInstallment] = useState(false);

  // Integração com o botão voltar do celular
  useModalBackHandler(isOpen, onClose, "add_transaction_modal");

  const availableCategories = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;

  // Effective section determines whether this transaction behaves as an installment
  const isEffectiveInstallment = section === "bottom_left" || (section === "left" && isInstallment);
  const effectiveSection: "left" | "right" | "bottom_left" = isEffectiveInstallment
    ? "bottom_left"
    : section;

  // Parsed installment count with safe fallback
  const parsedInstallmentCount = Math.max(1, parseInt(installmentCountStr, 10) || 1);

  // Check if an item with the same name already exists in the same section for the current month / list
  const duplicateMatch = useMemo(() => {
    const trimmedDesc = description.trim().toLowerCase();
    if (!trimmedDesc || !existingTransactions) return null;

    return existingTransactions.find((t) => {
      // Must match same effective table section
      if (t.tableSection !== effectiveSection) return false;

      // For left table (gastos do mês normais), check month filter. For right and bottom_left (parcelas), check across all
      if (effectiveSection === "left") {
        const matchesMonth = !t.date || t.date.startsWith(selectedMonth);
        if (!matchesMonth) return false;
      }

      return t.description.trim().toLowerCase() === trimmedDesc;
    });
  }, [description, existingTransactions, effectiveSection, selectedMonth]);

  const isDuplicate = !!duplicateMatch;

  // Set default values when modal opens or section changes
  useEffect(() => {
    if (isOpen) {
      setDescription("");
      setAmountStr("");
      setCategory(section === "right" ? "Tecnologia" : section === "bottom_left" ? "Outros" : "Outros");
      setNewCategoryName("");
      setIsCreatingCategory(false);
      setNote("");
      setIsOrangeHighlight(false);
      setIsDiscount(false);
      setIsInstallment(section === "bottom_left");
      setStartMonth(selectedMonth);
      setInstallmentCountStr("6");

      // Default date logic:
      if (section === "bottom_left") {
        setDate(calculateEndDateFromInstallments(selectedMonth, 6));
      } else {
        const today = new Date();
        const todayYYYYMM = today.toISOString().slice(0, 7);
        if (todayYYYYMM === selectedMonth) {
          setDate(today.toISOString().slice(0, 10));
        } else {
          setDate(`${selectedMonth}-15`);
        }
      }
    }
  }, [isOpen, section, selectedMonth]);

  // Sync installment count when startMonth or installmentCount changes
  const handleInstallmentCountChange = (valStr: string) => {
    setInstallmentCountStr(valStr);
    const parsed = parseInt(valStr, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setDate(calculateEndDateFromInstallments(startMonth, Math.min(120, parsed)));
    }
  };

  const handleStartMonthChange = (sMonth: string) => {
    setStartMonth(sMonth);
    setDate(calculateEndDateFromInstallments(sMonth, parsedInstallmentCount));
  };

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

    const finalCount = Math.max(1, parseInt(installmentCountStr, 10) || 1);
    const finalEndDate = isEffectiveInstallment
      ? calculateEndDateFromInstallments(startMonth, finalCount)
      : date;

    const newTransaction: Omit<Transaction, "id"> = {
      description: description.trim(),
      amount,
      date: finalEndDate,
      startDate: isEffectiveInstallment ? startMonth : undefined,
      totalInstallments: isEffectiveInstallment ? finalCount : undefined,
      type: "expense",
      tableSection: effectiveSection,
      category: finalCategory,
      isOrangeHighlight: section === "left" && !isEffectiveInstallment ? isOrangeHighlight : false,
      isDiscount: section === "left" && !isEffectiveInstallment ? isDiscount : false,
      note: section === "right" ? note.trim() : isEffectiveInstallment ? `${finalCount}x parcelas` : "",
    };

    onAdd(newTransaction);
    onClose();
  };

  const sectionName =
    section === "left"
      ? (isEffectiveInstallment ? "Gastos do Mês (Parcelado)" : "Gastos do Mês")
      : section === "right"
      ? "Planejamento & Compras Futuras"
      : "Parcelas e Devedores";

  const sectionBadgeColor =
    isEffectiveInstallment
      ? "text-purple-400 bg-purple-500/10 border-purple-500/20"
      : section === "left"
      ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
      : "text-amber-400 bg-amber-500/10 border-amber-500/20";

  const formatMonthNice = (mStr: string) => {
    try {
      const [y, m] = mStr.split("-");
      const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      const idx = parseInt(m, 10) - 1;
      return `${monthNames[idx] || m}/${y}`;
    } catch {
      return mStr;
    }
  };

  const parsedAmount = parseFloat(amountStr) || 0;
  const totalParcelasCost = parsedAmount * parsedInstallmentCount;

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
            className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 text-white z-10 overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            {/* Upper Glow decoration */}
            <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl border ${
                  isEffectiveInstallment
                    ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                    : section === "left"
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}>
                  {isEffectiveInstallment ? (
                    <Layers className="w-5 h-5" />
                  ) : section === "left" ? (
                    <TrendingDown className="w-5 h-5" />
                  ) : (
                    <TrendingUp className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <span className={`text-[10px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full border ${sectionBadgeColor}`}>
                    {isEffectiveInstallment ? "Nova Parcela" : section === "left" ? "Adicionar Gasto" : "Adicionar Item"}
                  </span>
                  <h3 className="text-lg font-bold text-white mt-1">
                    {sectionName}
                  </h3>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors focus:outline-none cursor-pointer"
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
                    {isEffectiveInstallment ? "Descrição da Parcela / Devedor" : "Nome do Produto / Descrição"}
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
                    placeholder={isEffectiveInstallment ? "Ex: Celular, Notebook, Seguro..." : "Ex: Assinatura Netflix, Supermercado"}
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

              {/* Grid for Price & Date / Installment controls */}
              {isEffectiveInstallment ? (
                /* Configuração Específica de Parcelas */
                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Valor da Parcela Mensal */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Valor da Parcela Mensal (R$)
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

                    {/* Quantidade de Parcelas */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Quantidade de Parcelas
                      </label>
                      <div className="relative">
                        <Calculator className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="number"
                          min="1"
                          max="120"
                          required
                          placeholder="Ex: 6"
                          value={installmentCountStr}
                          onChange={(e) => handleInstallmentCountChange(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 px-4 py-3 pl-11 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-bold font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mês de Início e Término Calculado */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Mês de Início
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="month"
                          required
                          value={startMonth}
                          onChange={(e) => handleStartMonthChange(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 px-4 py-3 pl-11 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Mês da Última Parcela (Quitação)
                      </label>
                      <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-xs font-mono font-bold text-purple-300 flex items-center justify-between">
                        <span>{formatMonthNice(date.substring(0, 7))}</span>
                        <span className="text-[10px] text-slate-500 font-normal">Auto-calculado</span>
                      </div>
                    </div>
                  </div>

                  {/* Resumo da projeção */}
                  <div className="p-3.5 bg-slate-950/70 border border-purple-500/20 rounded-2xl space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400">Impacto Mensal:</span>
                      <span className="font-bold font-mono text-rose-400">
                        - R$ {parsedAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mês
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400">Custo Total ({parsedInstallmentCount}x):</span>
                      <span className="font-black font-mono text-white">
                        R$ {totalParcelasCost.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                      Essa parcela será incluída automaticamente nos gastos mensais de {formatMonthNice(startMonth)} até {formatMonthNice(date.substring(0, 7))}.
                    </p>
                  </div>
                </div>
              ) : (
                /* Preço e Data normais para Despesas e Planejamento */
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
              )}

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
                    className="w-full bg-slate-950 border border-slate-800 px-4 py-3 pl-11 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium appearance-none cursor-pointer"
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
                <div className="pt-2 flex flex-col gap-2.5">
                  {/* Destacar item */}
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isOrangeHighlight}
                      onChange={(e) => {
                        setIsOrangeHighlight(e.target.checked);
                        if (e.target.checked) setIsDiscount(false);
                      }}
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

                  {/* É um ganho? */}
                  <label className={`flex items-center gap-3 cursor-pointer select-none ${isInstallment ? "opacity-40 cursor-not-allowed" : ""}`}>
                    <input
                      type="checkbox"
                      disabled={isInstallment}
                      checked={isDiscount}
                      onChange={(e) => {
                        setIsDiscount(e.target.checked);
                        if (e.target.checked) {
                          setIsOrangeHighlight(false);
                          setIsInstallment(false);
                        }
                      }}
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

                  {/* É uma parcela? */}
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isInstallment}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setIsInstallment(val);
                        if (val) {
                          setIsDiscount(false);
                          setDate(calculateEndDateFromInstallments(startMonth, parsedInstallmentCount));
                        } else {
                          const today = new Date();
                          const todayYYYYMM = today.toISOString().slice(0, 7);
                          if (todayYYYYMM === selectedMonth) {
                            setDate(today.toISOString().slice(0, 10));
                          } else {
                            setDate(`${selectedMonth}-15`);
                          }
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-5 h-5 rounded-md border border-slate-700 bg-slate-950 flex items-center justify-center peer-checked:border-purple-500 peer-checked:bg-purple-500/20 text-transparent peer-checked:text-purple-400 transition-all">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-200">É uma parcela?</span>
                      <span className="text-[10px] text-purple-400/90 font-medium">Divide em parcelas mensais futuras</span>
                    </div>
                  </label>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/60 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-800 transition-all cursor-pointer"
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
                  title={isDuplicate ? "Não é possível cadastrar: item duplicado" : isEffectiveInstallment ? "Adicionar Parcela" : "Adicionar Item"}
                >
                  {isDuplicate ? (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5" /> Item Duplicado (Bloqueado)
                    </>
                  ) : isEffectiveInstallment ? (
                    <>
                      <Layers className="w-3.5 h-3.5" /> Adicionar Parcela
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
