import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  CheckCircle,
  FileText,
  Sparkles,
  ArrowRight,
  DollarSign,
  Tag,
  Calendar,
  Layers,
  Building2,
  Trash2,
  Loader2,
  AlertCircle,
  Info,
} from "lucide-react";
import { Transaction } from "../types";
import { ParsedReceiptData, parseSharedReceipt } from "../utils/receiptParser";
import { SharedPayloadItem, deleteSharedPayload } from "../utils/shareTargetStorage";
import { useModalBackHandler } from "../hooks/useBackNavigation";

interface SharedReceiptModalProps {
  payload: SharedPayloadItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (transaction: Omit<Transaction, "id">) => void;
  selectedMonth: string; // YYYY-MM
  categories?: string[];
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

export default function SharedReceiptModal({
  payload,
  isOpen,
  onClose,
  onAddTransaction,
  selectedMonth,
  categories = DEFAULT_CATEGORIES,
}: SharedReceiptModalProps) {
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("Outros");
  const [section, setSection] = useState<"left" | "right" | "bottom_left">("left");
  const [bank, setBank] = useState<string | undefined>(undefined);
  const [note, setNote] = useState("");
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCount, setInstallmentCount] = useState<number>(3);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useModalBackHandler(isOpen, onClose, "shared_receipt_modal");

  // Ao receber um payload compartilhado, processa imediatamente
  useEffect(() => {
    if (!isOpen || !payload) return;

    let isMounted = true;
    const process = async () => {
      setLoading(true);
      setError(null);

      try {
        const file = payload.files && payload.files.length > 0 ? payload.files[0] : undefined;

        if (file && (file as any).type?.startsWith("image/")) {
          const url = URL.createObjectURL(file);
          setPreviewUrl(url);
        } else {
          setPreviewUrl(null);
        }

        const combinedText = [payload.title, payload.text, payload.url].filter(Boolean).join("\n");
        const parsed: ParsedReceiptData = await parseSharedReceipt(combinedText, file);

        if (!isMounted) return;

        setDescription(parsed.description || "Comprovante Bancário");
        setAmountStr(parsed.amount > 0 ? String(parsed.amount) : "");
        setDate(parsed.date || new Date().toISOString().split("T")[0]);
        setCategory(parsed.category || "Outros");
        setSection(parsed.tableSection || "left");
        setBank(parsed.bank);
        setNote(parsed.note || "");
        setIsInstallment(!!parsed.isInstallment);
        if (parsed.installmentCount) {
          setInstallmentCount(parsed.installmentCount);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error("Erro ao processar comprovante:", err);
        setError("Não foi possível ler todos os dados automaticamente. Preencha os campos abaixo.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    process();

    return () => {
      isMounted = false;
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [isOpen, payload]);

  if (!isOpen || !payload) return null;

  const handleSave = async () => {
    const parsedAmount = parseFloat(amountStr.replace(",", ".")) || 0;
    if (parsedAmount <= 0) {
      setError("Por favor, informe um valor válido maior que zero.");
      return;
    }

    if (!description.trim()) {
      setError("Por favor, insira uma descrição para a despesa.");
      return;
    }

    let finalNote = note.trim();
    if (isInstallment && installmentCount > 1) {
      const startM = date.substring(0, 7) || selectedMonth;
      finalNote = `${finalNote} [meta:start=${startM},total=${installmentCount}]`.trim();
    }

    const newTx: Omit<Transaction, "id"> = {
      description: description.trim(),
      amount: parsedAmount,
      date: date || new Date().toISOString().split("T")[0],
      category: category || "Outros",
      type: "expense",
      tableSection: isInstallment ? "bottom_left" : section,
      note: finalNote || undefined,
    };

    onAddTransaction(newTx);

    // Deletar do IndexedDB
    if (payload.id) {
      await deleteSharedPayload(payload.id);
    }

    onClose();
  };

  const handleDiscard = async () => {
    if (payload.id) {
      await deleteSharedPayload(payload.id);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto"
        >
          {/* Top Banner Gradient */}
          <div className="h-2 w-full bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-500" />

          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-inner">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                    Comprovante Recebido
                  </h3>
                  {bank && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                      {bank}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Compartilhado via aplicativo bancário
                </p>
              </div>
            </div>

            <button
              onClick={handleDiscard}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                <p className="text-sm font-medium text-slate-200">
                  Lendo dados do comprovante com IA...
                </p>
                <p className="text-xs text-slate-400 max-w-xs">
                  Identificando valor, beneficiário e categoria da transferência.
                </p>
              </div>
            ) : (
              <>
                {error && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-2.5 text-xs text-amber-300">
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Preview de imagem se houver */}
                {previewUrl && (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-800 max-h-36 bg-slate-950 flex items-center justify-center">
                    <img
                      src={previewUrl}
                      alt="Comprovante"
                      className="w-full h-full object-contain max-h-36 opacity-90"
                    />
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-slate-950/80 text-[10px] text-slate-300 backdrop-blur-sm">
                      Foto do comprovante anexada
                    </div>
                  </div>
                )}

                {/* Campo de Valor em destaque */}
                <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800/80 space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-purple-400" />
                    Valor do Pagamento
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-lg font-bold text-slate-400">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                      placeholder="0,00"
                      className="w-full pl-11 pr-4 py-2 bg-transparent text-2xl sm:text-3xl font-black font-mono text-white placeholder-slate-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Descrição */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Descrição / Favorecido
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Pix - João da Silva"
                    className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                  />
                </div>

                {/* Linha dupla: Data e Categoria */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Data da Transação
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-slate-400" />
                      Categoria
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500/50 transition-colors cursor-pointer"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat} className="bg-slate-900 text-white">
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Opção de Parcelamento */}
                <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-2 cursor-pointer">
                      <Layers className="w-3.5 h-3.5 text-purple-400" />
                      <span>Compra ou Pagamento Parcelado?</span>
                    </label>
                    <input
                      type="checkbox"
                      checked={isInstallment}
                      onChange={(e) => setIsInstallment(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-500 bg-slate-900 border-slate-700 cursor-pointer focus:ring-0"
                    />
                  </div>

                  {isInstallment && (
                    <div className="pt-2 border-t border-slate-800/80 flex items-center gap-3">
                      <span className="text-xs text-slate-400">Total de parcelas:</span>
                      <input
                        type="number"
                        min="2"
                        max="96"
                        value={installmentCount}
                        onChange={(e) => setInstallmentCount(Math.max(2, parseInt(e.target.value, 10) || 2))}
                        className="w-20 px-2 py-1 bg-slate-900 border border-purple-500/40 rounded-lg text-xs font-mono font-bold text-center text-purple-300"
                      />
                      <span className="text-xs text-slate-400">meses</span>
                    </div>
                  )}
                </div>

                {/* Observações / Detalhes originais */}
                {note && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                      <Info className="w-3 h-3 text-slate-500" />
                      Observações extraídas
                    </label>
                    <textarea
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800/80 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-purple-500/50 resize-none font-mono"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleDiscard}
              className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/50 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Descartar</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Salvar nos Gastos</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
