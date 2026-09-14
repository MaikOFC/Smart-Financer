import React, { useState } from "react";
import { Download, Smartphone, X, CheckCircle } from "lucide-react";
import { usePWAInstall } from "../hooks/usePWAInstall";

export const PWAInstallButton: React.FC<{ variant?: "compact" | "full" }> = ({ variant = "compact" }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA or APK standalone, hide
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    if (variant === "compact") {
      return (
        <button
          type="button"
          onClick={install}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 active:scale-95 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-all cursor-pointer"
          title="Instalar no Celular / Computador"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Instalar App</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={install}
        className="w-full flex items-center justify-between p-3 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-500/10 dark:hover:bg-sky-500/20 border border-sky-200 dark:border-sky-500/25 transition-all text-left cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300 rounded-lg group-hover:bg-sky-200 dark:group-hover:bg-sky-500/30 transition-colors">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-sky-900 dark:text-sky-200 group-hover:text-sky-950 dark:group-hover:text-white flex items-center gap-1.5">
              <span>Instalar Aplicativo</span>
              <span className="text-[9px] font-mono bg-sky-200 text-sky-800 dark:bg-sky-500/30 dark:text-sky-300 px-1 py-0.2 rounded font-bold">APK / PWA</span>
            </p>
            <p className="text-[10px] text-sky-700 dark:text-sky-300/80">Instalar direto na tela inicial sem lojas</p>
          </div>
        </div>
        <Download className="w-4 h-4 text-sky-600 dark:text-sky-400 group-hover:text-sky-800 dark:group-hover:text-sky-200 shrink-0" />
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={
            variant === "compact"
              ? "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700 hover:bg-slate-700 transition cursor-pointer"
              : "w-full flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-left cursor-pointer group"
          }
        >
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold">Instalar no iPhone</span>
          </div>
          {variant === "full" && <Download className="w-4 h-4 text-slate-400" />}
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 p-5 shadow-2xl border border-slate-800 text-white space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-sky-400" />
                  Instalar no iPhone / iPad
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2 text-xs text-slate-300">
                <p>1. Toque no botão de <strong>Compartilhar</strong> (ícone de quadrado com seta) na barra inferior do Safari.</p>
                <p>2. Role as opções para baixo e selecione <strong>Adicionar à Tela de Início</strong>.</p>
                <p>3. Toque em <strong>Adicionar</strong> no canto superior direito.</p>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 font-bold text-xs transition"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
