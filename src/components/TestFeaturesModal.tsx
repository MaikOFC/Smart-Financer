import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  FlaskConical,
  Type,
  CheckCircle2,
  Sparkles,
  LayoutGrid,
  Table2,
  Layers,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  AppFontKey,
  AVAILABLE_FONTS,
  getStoredFontKey,
  saveAppFont,
} from "../lib/fontManager";

interface TestFeaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewMode: "compact" | "full";
  onSetViewMode: (mode: "compact" | "full") => void;
}

export default function TestFeaturesModal({
  isOpen,
  onClose,
  viewMode,
  onSetViewMode,
}: TestFeaturesModalProps) {
  const [selectedFont, setSelectedFont] = useState<AppFontKey>(() => getStoredFontKey());

  useEffect(() => {
    setSelectedFont(getStoredFontKey());
  }, [isOpen]);

  const handleSelectFont = (fontKey: AppFontKey) => {
    setSelectedFont(fontKey);
    saveAppFont(fontKey);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
        />

        {/* Modal Container */}
        <div className="min-h-full flex items-center justify-center p-3 sm:p-6 relative pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-xl bg-slate-900 border border-emerald-500/30 rounded-3xl shadow-2xl overflow-hidden pointer-events-auto text-slate-100 flex flex-col my-6"
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <FlaskConical className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                      (Funções de teste)
                    </h2>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Beta
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Teste fontes e modos de visualização em tempo real
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-all cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* 1. BLOCO DO PRINT: MODO DE VISUALIZAÇÃO */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black tracking-wider text-slate-400 uppercase">
                    MODO DE VISUALIZAÇÃO
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {viewMode === "compact" ? "Focado (Cards)" : "Padrão (Planilha)"}
                  </span>
                </div>

                {/* Bloco idêntico ao print do usuário */}
                <div className="bg-[#0b1017] p-2 rounded-2xl border border-slate-800/90 shadow-inner">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Modo Focado (Cards) */}
                    <button
                      type="button"
                      onClick={() => onSetViewMode("compact")}
                      className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-2 ${
                        viewMode === "compact"
                          ? "bg-[#062c20] border border-emerald-500/80 text-emerald-400 shadow-md shadow-emerald-950/50"
                          : "bg-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
                      }`}
                    >
                      <LayoutGrid className="w-4 h-4 stroke-[2.2]" />
                      <span>Modo Focado (Cards)</span>
                    </button>

                    {/* Modo Padrão (Planilha) */}
                    <button
                      type="button"
                      onClick={() => onSetViewMode("full")}
                      className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-2 ${
                        viewMode === "full"
                          ? "bg-[#062c20] border border-emerald-500/80 text-emerald-400 shadow-md shadow-emerald-950/50"
                          : "bg-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
                      }`}
                    >
                      <Table2 className="w-4 h-4 stroke-[2.2]" />
                      <span>Modo Padrão (Planilha)</span>
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 px-1 leading-relaxed">
                  Altera instantaneamente a forma como os gastos e categorias são apresentados na tela inicial.
                </p>
              </div>

              {/* 2. SELETOR DE FONTE TIPOGRÁFICA DO APP */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Type className="w-4 h-4 text-emerald-400" />
                    <span className="text-[11px] font-black tracking-wider text-slate-400 uppercase">
                      FONTE DO APLICATIVO
                    </span>
                  </div>
                  <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    Troca em Tempo Real
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Selecione a fonte desejada para testar e ver a diferença no design de todo o sistema:
                </p>

                {/* Opções de fontes */}
                <div className="space-y-2.5">
                  {AVAILABLE_FONTS.map((font) => {
                    const isCurrent = selectedFont === font.id;
                    return (
                      <button
                        key={font.id}
                        type="button"
                        onClick={() => handleSelectFont(font.id)}
                        className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                          isCurrent
                            ? "bg-emerald-950/40 border-emerald-500/80 shadow-lg shadow-emerald-950/40 text-white"
                            : "bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white"
                        }`}
                        style={{ fontFamily: font.family }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm sm:text-base font-black">
                                {font.name}
                              </span>
                              {font.id === "outfit" && (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950">
                                  Nova Fonte
                                </span>
                              )}
                              {font.id === "plus-jakarta-sans" && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                  Fonte Anterior
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 opacity-90 font-normal">
                              {font.tagline}
                            </p>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            {isCurrent ? (
                              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-xl border border-emerald-500/40">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Ativa</span>
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500 group-hover:text-slate-300 px-2 py-1 rounded-xl border border-slate-800">
                                Testar
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Amostra visual de números e títulos na própria fonte */}
                        <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/60">
                            <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
                              Exemplo de Valor
                            </span>
                            <span className="text-sm font-black text-emerald-400">
                              R$ 1.000,00
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/60">
                            <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
                              Exemplo de Gasto
                            </span>
                            <span className="text-sm font-black text-rose-400">
                              R$ 120,00
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CARD DE COMPARAÇÃO VISUAL DIRETA */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Comparativo Lado a Lado (Outfit vs Plus Jakarta Sans)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Cartão Outfit */}
                  <div
                    className={`p-3 rounded-xl border ${
                      selectedFont === "outfit"
                        ? "bg-emerald-950/20 border-emerald-500/50"
                        : "bg-slate-900/60 border-slate-800"
                    }`}
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-white">Outfit</span>
                      {selectedFont === "outfit" && (
                        <span className="text-[9px] font-bold text-emerald-400">Em Uso</span>
                      )}
                    </div>
                    <p className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">
                      ENTRADAS (MÊS)
                    </p>
                    <p className="text-base font-extrabold text-white mt-0.5">
                      R$ 1.000,00
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Números redondos e modernos.
                    </p>
                  </div>

                  {/* Cartão Plus Jakarta Sans */}
                  <div
                    className={`p-3 rounded-xl border ${
                      selectedFont === "plus-jakarta-sans"
                        ? "bg-emerald-950/20 border-emerald-500/50"
                        : "bg-slate-900/60 border-slate-800"
                    }`}
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-white">Plus Jakarta Sans</span>
                      {selectedFont === "plus-jakarta-sans" && (
                        <span className="text-[9px] font-bold text-emerald-400">Em Uso</span>
                      )}
                    </div>
                    <p className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">
                      ENTRADAS (MÊS)
                    </p>
                    <p className="text-base font-extrabold text-white mt-0.5">
                      R$ 1.000,00
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Visual refinado e mais compacto.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                A preferência fica salva automaticamente.
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
