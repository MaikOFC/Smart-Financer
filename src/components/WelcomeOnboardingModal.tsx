import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Wallet,
  FileSpreadsheet,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ArrowRight,
  ShieldCheck,
  Check,
} from "lucide-react";
import { processImportFile } from "../utils/fileParser";
import { Transaction } from "../types";

interface WelcomeOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportTransactions: (imported: Transaction[]) => void;
  userName: string;
  selectedMonth: string;
  defaultSalary: number;
  onUpdateDefaultSalary: (newSalary: number, applyToFutureMonths: boolean, fromMonth: string) => Promise<void> | void;
}

export default function WelcomeOnboardingModal({
  isOpen,
  onClose,
  onImportTransactions,
  userName,
  selectedMonth,
  defaultSalary,
  onUpdateDefaultSalary,
}: WelcomeOnboardingModalProps) {
  const [salaryInput, setSalaryInput] = useState(() => String(defaultSalary || 2500));
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingSalary, setSavingSalary] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [importedFileName, setImportedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleProcessFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setSuccessCount(null);
    setImportedFileName(file.name);

    try {
      const imported = await processImportFile(file, (step) => setLoadingStep(step));
      onImportTransactions(imported);
      setSuccessCount(imported.length);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Não foi possível processar o arquivo. Verifique o formato e tente novamente.");
      setImportedFileName(null);
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const handleFinishOnboarding = async () => {
    setSavingSalary(true);
    try {
      const parsed = parseFloat(salaryInput) || 2500;
      await onUpdateDefaultSalary(parsed, true, selectedMonth);
      onClose();
    } catch (err) {
      console.error("Erro ao salvar salário inicial:", err);
      onClose();
    } finally {
      setSavingSalary(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden relative my-6"
        >
          {/* TOPO DEGRADÊ DECORATIVO */}
          <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />

          {/* BOTÃO FECHAR */}
          <button
            onClick={handleFinishOnboarding}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-all cursor-pointer z-10"
            title="Concluir e ir para o painel"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-6 sm:p-8 space-y-6">
            {/* CABEÇALHO BOAS-VINDAS */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl mb-1 shadow-inner">
                <Sparkles className="w-7 h-7 animate-pulse" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Conta criada com sucesso! 🚀
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Olá <span className="text-emerald-400 font-bold">{userName || "seja bem-vindo(a)"}</span>! Vamos personalizar seu ambiente financeiro em poucos segundos.
              </p>
            </div>

            {/* SEÇÃO 1: SALÁRIO / ENTRADA MENSAL */}
            <div className="p-4 sm:p-5 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl space-y-3 relative overflow-hidden">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 shrink-0 mt-0.5">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white tracking-tight">
                    Qual é o seu Salário / Entrada Mensal?
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Esse valor será o seu orçamento base para os meses. Você poderá alterá-lo nas configurações sempre que seu salário mudar.
                  </p>
                </div>
              </div>

              <div className="pt-1">
                <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1.5 font-mono">
                  VALOR MENSAL INICIAL (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-400 font-mono">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={salaryInput}
                    onChange={(e) => setSalaryInput(e.target.value)}
                    placeholder="2500"
                    className="w-full bg-slate-950 border border-emerald-500/40 px-4 py-3 pl-11 rounded-xl text-base font-mono font-bold text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: IMPORTAÇÃO INTELIGENTE COM IA (OPCIONAL) */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Importar Planilha ou Extrato Bancário?
                </span>
                <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full font-bold border border-indigo-500/20">
                  Opcional
                </span>
              </div>

              {successCount !== null ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-950/40 border border-emerald-500/50 rounded-2xl p-4 flex items-center gap-3.5"
                >
                  <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white">
                      {successCount} lançamentos importados com IA!
                    </p>
                    <p className="text-[11px] text-emerald-300 truncate">
                      {importedFileName || "Arquivo processado"} • Mês {selectedMonth}
                    </p>
                  </div>
                  <span className="p-1 text-emerald-400">
                    <Check className="w-4 h-4" />
                  </span>
                </motion.div>
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv, .xlsx, .xls, image/*"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />

                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => !loading && fileInputRef.current?.click()}
                    className={`border border-dashed rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      dragActive
                        ? "border-indigo-500 bg-indigo-500/10"
                        : "border-slate-800 hover:border-indigo-500/50 hover:bg-slate-950/40"
                    } ${loading ? "pointer-events-none opacity-80" : ""}`}
                  >
                    {loading ? (
                      <div className="flex flex-col items-center space-y-2 py-2">
                        <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
                        <p className="text-xs font-bold text-slate-200">{loadingStep}</p>
                        <p className="text-[10px] text-slate-500">
                          A IA Gemini está lendo e estruturando seus lançamentos...
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-slate-400">
                          <div className="p-2 bg-slate-800/80 rounded-lg border border-slate-700">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div className="p-2 bg-slate-800/80 rounded-lg border border-slate-700">
                            <ImageIcon className="w-4 h-4 text-indigo-400" />
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-200">
                            <span className="text-indigo-400">Clique</span> ou arraste planilha / print
                          </p>
                          <p className="text-[10px] text-slate-500">
                            .xlsx, .csv, .xls ou fotos de extratos bancários
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ERROR BOX */}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-rose-500/10 text-rose-300 rounded-xl border border-rose-500/20 text-xs">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-400" />
                  <div>
                    <span className="font-bold">Aviso: </span>
                    {error}
                  </div>
                </div>
              )}
            </div>

            {/* BOTÃO PRINCIPAL DE CONCLUSÃO */}
            <div className="pt-2">
              <button
                type="button"
                disabled={loading || savingSalary}
                onClick={handleFinishOnboarding}
                className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                {savingSalary ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando preferências...</span>
                  </>
                ) : (
                  <>
                    <span>Concluir e Ir para o Meu Painel</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* DICA INFORMATIVA */}
            <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Dados criptografados
              </span>
              <span>Você pode ajustar seu salário a qualquer momento em Configurações</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
