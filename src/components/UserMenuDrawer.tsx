import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  User as UserIcon,
  Crown,
  Settings,
  LogOut,
  Sparkles,
  Wallet,
  Calendar,
  FileSpreadsheet,
  BrainCircuit,
  PlusCircle,
  Database,
  ChevronRight,
  ShieldCheck,
  Sun,
  Moon,
  Smartphone,
  RefreshCw,
  ArrowUpCircle,
  CheckCircle2,
  Upload,
  Share2,
} from "lucide-react";
import { ThemeMode } from "../lib/theme";
import { CURRENT_CLIENT_VERSION, checkServerVersion, forceReloadApp } from "../lib/updateManager";
import { useModalBackHandler } from "../hooks/useBackNavigation";
import { PWAInstallButton } from "./PWAInstallButton";

interface UserMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: { id: string; name: string; email: string; defaultSalary?: number };
  isAdmin: boolean;
  defaultSalary: number;
  selectedMonth: string;
  onOpenSettings: (mode?: "salary" | "admin") => void;
  onOpenAddModal: () => void;
  onLogout: () => void;
  onScrollToAi?: () => void;
  viewMode?: "compact" | "full";
  onSetViewMode?: (mode: "compact" | "full") => void;
  themeMode?: ThemeMode;
  onSetThemeMode?: (mode: ThemeMode) => void;
  onDirectImportFile?: (file: File) => void;
  onSimulateNubank?: () => void;
}

export default function UserMenuDrawer({
  isOpen,
  onClose,
  user,
  isAdmin,
  defaultSalary,
  selectedMonth,
  onOpenSettings,
  onOpenAddModal,
  onLogout,
  onScrollToAi,
  viewMode = "compact",
  onSetViewMode,
  themeMode = "system",
  onSetThemeMode,
  onDirectImportFile,
  onSimulateNubank,
}: UserMenuDrawerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateFeedback, setUpdateFeedback] = useState<string | null>(null);
  const [updateIsLatest, setUpdateIsLatest] = useState<boolean | null>(null);

  // Intercepta botão voltar do celular para fechar o menu lateral
  useModalBackHandler(isOpen, onClose, "user_menu_drawer");

  if (!isOpen) return null;

  const handleCheckUpdates = async () => {
    setIsCheckingUpdate(true);
    setUpdateFeedback(null);
    setUpdateIsLatest(null);

    try {
      const result = await checkServerVersion();
      if (result.hasUpdate) {
        setUpdateFeedback(`Nova versão (${result.serverVersion}) encontrada! Recarregando...`);
        setUpdateIsLatest(false);
        setTimeout(() => {
          forceReloadApp();
        }, 1200);
      } else {
        setUpdateFeedback(`Seu aplicativo já está atualizado na versão mais recente (v${CURRENT_CLIENT_VERSION}).`);
        setUpdateIsLatest(true);
        setTimeout(() => {
          setUpdateFeedback(null);
        }, 4000);
      }
    } catch (e) {
      setUpdateFeedback("Não foi possível verificar no momento.");
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleForceReload = () => {
    setIsCheckingUpdate(true);
    setUpdateFeedback("Limpando cache e atualizando arquivos...");
    setTimeout(() => {
      forceReloadApp();
    }, 500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] overflow-hidden">
        {/* BACKDROP BLUR */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm cursor-pointer"
        />

        {/* SLIDE-OVER DRAWER (LADO ESQUERDO) */}
        <div className="fixed inset-y-0 left-0 max-w-full flex pr-10">
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="w-screen max-w-xs sm:max-w-sm bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between overflow-y-auto text-slate-800 dark:text-slate-100"
          >
            {/* TOPO DO MENU */}
            <div>
              {/* CABEÇALHO */}
              <div className="p-5 pt-[max(1.25rem,env(safe-area-inset-top,0px))] border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                      Smart<span className="text-emerald-600 dark:text-emerald-400">Financer</span>
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Menu & Conta</p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  title="Fechar menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* CARD DE PERFIL DO USUÁRIO - DESIGN PLANO E SEM DEGRADÊ/REFLEXO */}
              <div className="p-4 sm:p-5">
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    isAdmin
                      ? "bg-amber-50 border-amber-200 text-slate-900 dark:bg-slate-950/80 dark:border-amber-500/30 dark:text-amber-200"
                      : "bg-slate-50 border-slate-200 text-slate-900 dark:bg-slate-950/80 dark:border-slate-800 dark:text-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center border font-bold text-sm shrink-0 ${
                        isAdmin
                          ? "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                          : "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-slate-800 dark:text-indigo-400 dark:border-slate-700"
                      }`}
                    >
                      {isAdmin ? <Crown className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm font-black text-slate-900 dark:text-white truncate">
                          {user.name}
                        </span>
                        {isAdmin && (
                          <span className="text-[9px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30 px-1.5 py-0.5 rounded shrink-0">
                            ADM
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5 font-medium" title={user.email}>
                        {user.email}
                      </p>
                    </div>
                  </div>

                  {/* SALÁRIO BASE ATUAL */}
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Salário / Entrada Base:</span>
                    <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                      R$ {(typeof defaultSalary === "number" && !isNaN(defaultSalary) ? defaultSalary : 2500).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* LISTA DE AÇÕES / NAVEGAÇÃO */}
                <div className="mt-5 space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 mb-2">
                    Ações Principais
                  </p>

                  {/* NOVO LANÇAMENTO */}
                  <button
                    onClick={() => {
                      onClose();
                      onOpenAddModal();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/60 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800/80 hover:border-emerald-500/40 dark:hover:border-emerald-500/30 transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                        <PlusCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-white">
                          Novo Lançamento
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Adicionar gasto ou compra</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:text-slate-600 dark:group-hover:text-slate-300" />
                  </button>

                  {/* CONFIGURAÇÕES DE SALÁRIO */}
                  <button
                    onClick={() => {
                      onClose();
                      onOpenSettings("salary");
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/60 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800/80 hover:border-emerald-500/40 dark:hover:border-emerald-500/30 transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-white">
                          Configuração de Salário
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Definir salário base mensal e preferências</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:text-slate-600 dark:group-hover:text-slate-300" />
                  </button>

                  {/* INPUT INVISÍVEL PARA IMPORTAÇÃO DIRETA DE ARQUIVOS */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        if (onDirectImportFile) {
                          onDirectImportFile(file);
                        }
                        onClose();
                        e.target.value = "";
                      }
                    }}
                    accept=".csv, .xlsx, .xls, .pdf, .png, .jpg, .jpeg, .webp, image/*"
                    className="hidden"
                    id="drawer-direct-file-input"
                  />

                  {/* INSTALAÇÃO DO APLICATIVO (PWA / APK) */}
                  <PWAInstallButton variant="full" />

                  {/* IMPORTAÇÃO DIRETA DE PLANILHA / EXTRATOS */}
                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.click();
                      }
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 border border-purple-200 dark:border-purple-500/25 hover:border-purple-400 dark:hover:border-purple-500/40 transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-500/30 transition-colors">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-purple-900 dark:text-purple-200 group-hover:text-purple-950 dark:group-hover:text-white flex items-center gap-1.5">
                          <span>Importar Planilha / Extrato</span>
                          <span className="text-[9px] font-mono bg-purple-200 text-purple-800 dark:bg-purple-500/30 dark:text-purple-300 px-1 py-0.2 rounded font-bold">Direto</span>
                        </p>
                        <p className="text-[10px] text-purple-700 dark:text-purple-300/80">Selecione Excel, CSV, PDF ou foto do comprovante</p>
                      </div>
                    </div>
                    <Upload className="w-4 h-4 text-purple-600 dark:text-purple-400 group-hover:text-purple-800 dark:group-hover:text-purple-200 shrink-0" />
                  </button>

                  {/* PAINEL DE ADMINISTRAÇÃO MASTER (SOMENTE PARA ADMIN) */}
                  {isAdmin && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenSettings("admin");
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 border border-amber-200 dark:border-amber-500/25 hover:border-amber-400 dark:hover:border-amber-500/40 transition-all text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 rounded-lg group-hover:bg-amber-200 dark:group-hover:bg-amber-500/30 transition-colors">
                          <Crown className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-amber-900 dark:text-amber-200 group-hover:text-amber-950 dark:group-hover:text-white flex items-center gap-1.5">
                            <span>Painel Master ADM</span>
                            <span className="text-[9px] font-mono bg-amber-200 text-amber-800 dark:bg-amber-500/30 dark:text-amber-300 px-1 py-0.2 rounded font-bold">Restrito</span>
                          </p>
                          <p className="text-[10px] text-amber-700 dark:text-amber-300/80">Backups, exportações e banco de dados</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-amber-600 dark:text-amber-400 group-hover:text-amber-800 dark:group-hover:text-amber-200 shrink-0" />
                    </button>
                  )}

                  {/* CONSULTOR DE IA */}
                  {onScrollToAi && (
                    <button
                      onClick={() => {
                        onClose();
                        onScrollToAi();
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/60 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800/80 hover:border-indigo-500/40 dark:hover:border-indigo-500/30 transition-all text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 rounded-lg group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 transition-colors">
                          <BrainCircuit className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-white">
                            Consultor IA Gemini
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">Análise e dicas de economia</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:text-slate-600 dark:group-hover:text-slate-300" />
                    </button>
                  )}

                  {/* COMPARTILHAMENTO DE COMPROVANTE (NUBANK / PIX) */}
                  {onSimulateNubank && (
                    <button
                      onClick={() => {
                        onClose();
                        onSimulateNubank();
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/20 dark:hover:bg-purple-900/30 border border-purple-200 dark:border-purple-800/40 hover:border-purple-400 dark:hover:border-purple-600 transition-all text-left group cursor-pointer"
                      title="Testar leitura de comprovante compartilhado pelo Nubank ou outros bancos"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-500/30 transition-colors">
                          <Share2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-purple-900 dark:text-purple-200 group-hover:text-purple-700 dark:group-hover:text-white">
                              Comprovante Nubank / Pix
                            </p>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200">
                              Novo
                            </span>
                          </div>
                          <p className="text-[10px] text-purple-700/80 dark:text-purple-300/70">
                            Testar importação de comprovante compartilhado
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-purple-400 group-hover:text-purple-600 dark:text-purple-400 dark:group-hover:text-purple-200" />
                    </button>
                  )}

                  {/* SELETOR DE TEMA / APARÊNCIA */}
                  {onSetThemeMode && (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80">
                      <div className="flex items-center justify-between px-2 mb-2">
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Tema / Aparência
                        </p>
                        <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {themeMode === "system" ? "Padrão Celular" : themeMode === "dark" ? "Escuro" : "Claro"}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => onSetThemeMode("system")}
                          className={`py-2 px-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-center ${
                            themeMode === "system"
                              ? "bg-white text-emerald-700 shadow-sm border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30"
                              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                          }`}
                          title="Segue automaticamente o tema claro ou escuro configurado no seu celular"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>Padrão Celular</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onSetThemeMode("dark")}
                          className={`py-2 px-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-center ${
                            themeMode === "dark"
                              ? "bg-white text-emerald-700 shadow-sm border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30"
                              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                          }`}
                          title="Tema Escuro"
                        >
                          <Moon className="w-3.5 h-3.5" />
                          <span>Escuro</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onSetThemeMode("light")}
                          className={`py-2 px-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-center ${
                            themeMode === "light"
                              ? "bg-white text-emerald-700 shadow-sm border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30"
                              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                          }`}
                          title="Tema Claro"
                        >
                          <Sun className="w-3.5 h-3.5" />
                          <span>Claro</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* SELETOR DE MODO DE VISUALIZAÇÃO NO MENU */}
                  {onSetViewMode && (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80">
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 mb-2">
                        Modo de Visualização
                      </p>
                      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800/80">
                        <button
                          onClick={() => onSetViewMode("compact")}
                          className={`py-2 px-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center ${
                            viewMode === "compact"
                              ? "bg-white text-emerald-700 shadow-sm border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30"
                              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                          }`}
                        >
                          Modo Focado (Cards)
                        </button>
                        <button
                          onClick={() => onSetViewMode("full")}
                          className={`py-2 px-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center ${
                            viewMode === "full"
                              ? "bg-white text-emerald-700 shadow-sm border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30"
                              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                          }`}
                        >
                          Modo Padrão (Planilha)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ATUALIZAÇÕES DO APLICATIVO / OTA UPDATE */}
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-1.5">
                        <ArrowUpCircle className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Versão & Atualizações
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/20">
                        v{CURRENT_CLIENT_VERSION}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-100 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-2">
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-tight">
                        Atualize novas funções instantaneamente sem precisar reinstalar o APK.
                      </p>

                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={handleCheckUpdates}
                          disabled={isCheckingUpdate}
                          className="w-full flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-800 dark:bg-indigo-600/20 dark:hover:bg-indigo-600/30 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 font-bold text-[10px] transition-all cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3 h-3 ${isCheckingUpdate ? "animate-spin" : ""}`} />
                          <span>{isCheckingUpdate ? "Buscando..." : "Buscar Atualização"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleForceReload}
                          disabled={isCheckingUpdate}
                          className="w-full flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-bold text-[10px] transition-all cursor-pointer"
                          title="Limpa caches locais do navegador/WebView e recarrega os arquivos mais recentes"
                        >
                          <span>Recarregar</span>
                        </button>
                      </div>

                      {updateFeedback && (
                        <div
                          className={`p-2 rounded-lg text-[10px] leading-tight flex items-start gap-1.5 animate-fadeIn ${
                            updateIsLatest === true
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20"
                              : "bg-indigo-100 text-indigo-800 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20"
                          }`}
                        >
                          {updateIsLatest === true ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5 animate-spin" />
                          )}
                          <span>{updateFeedback}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RODAPÉ DO DRAWER COM BOTÃO DE LOGOUT */}
            <div className="p-4 sm:p-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] border-t border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/50 space-y-3">
              <button
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 font-bold text-xs transition-all cursor-pointer hover:border-rose-400 dark:hover:border-rose-500/40"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair da Conta</span>
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Sessão segura ativa</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
