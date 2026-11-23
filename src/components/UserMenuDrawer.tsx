import React, { useState, useEffect, useRef } from "react";
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
  BrainCircuit,
  Database,
  ChevronRight,
  ShieldCheck,
  Sun,
  Moon,
  Smartphone,
  RefreshCw,
  ArrowUpCircle,
  CheckCircle2,
  FileSpreadsheet,
  FlaskConical,
  Trash2,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  Mail,
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
  onDeleteAccount: (password: string) => Promise<void>;
  onScrollToAi?: () => void;
  viewMode?: "compact" | "full";
  onSetViewMode?: (mode: "compact" | "full") => void;
  themeMode?: ThemeMode;
  onSetThemeMode?: (mode: ThemeMode) => void;
  onDirectImportFile?: (file: File) => void;
  onOpenTestFeatures?: () => void;
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
  onDeleteAccount,
  onScrollToAi,
  viewMode = "compact",
  onSetViewMode,
  themeMode = "system",
  onSetThemeMode,
  onDirectImportFile,
  onOpenTestFeatures,
}: UserMenuDrawerProps) {
  const spreadsheetInputRef = useRef<HTMLInputElement | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateFeedback, setUpdateFeedback] = useState<string | null>(null);
  const [updateIsLatest, setUpdateIsLatest] = useState<boolean | null>(null);

  // Aba ativa dentro da barra lateral ("menu" ou "profile")
  const [drawerTab, setDrawerTab] = useState<"menu" | "profile">("menu");

  // Estados do modal de exclusão de conta
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isDemoAccount = user.email === "miqueias@demo.com";

  // Intercepta botão voltar do celular para voltar da aba perfil, fechar o modal de exclusão ou fechar o menu lateral
  useModalBackHandler(isOpen && drawerTab === "menu" && !isDeleteModalOpen, onClose, "user_menu_drawer");
  useModalBackHandler(
    isOpen && drawerTab === "profile" && !isDeleteModalOpen,
    () => setDrawerTab("menu"),
    "user_profile_tab"
  );
  useModalBackHandler(
    isDeleteModalOpen,
    () => {
      if (!isDeletingAccount) {
        setIsDeleteModalOpen(false);
      }
    },
    "delete_account_modal"
  );

  useEffect(() => {
    if (!isOpen) {
      setDrawerTab("menu");
      setIsDeleteModalOpen(false);
      setDeletePassword("");
      setShowDeletePassword(false);
      setDeleteError(null);
      setIsDeletingAccount(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenDeleteModal = () => {
    setDeletePassword("");
    setShowDeletePassword(false);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemoAccount) return;
    if (!deletePassword) {
      setDeleteError("Digite sua senha atual para confirmar a exclusão da conta.");
      return;
    }

    setDeleteError(null);
    setIsDeletingAccount(true);
    try {
      await onDeleteAccount(deletePassword);
    } catch (err: any) {
      setDeleteError(err?.message || "Não foi possível excluir a conta. Verifique sua senha.");
    } finally {
      setIsDeletingAccount(false);
    }
  };

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
                {drawerTab === "profile" ? (
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setDrawerTab("menu")}
                      className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 transition-all cursor-pointer"
                      title="Voltar ao menu"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                        Meu Perfil
                      </h3>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Dados & Conta</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden drop-shadow-sm">
                      <img src="/logo.png" alt="SmartFinancer" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                        Smart<span className="text-emerald-600 dark:text-emerald-400">Financer</span>
                      </h3>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Menu & Conta</p>
                    </div>
                  </div>
                )}

                <button
                  onClick={onClose}
                  className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  title="Fechar menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {drawerTab === "profile" ? (
                /* ABA DO PERFIL DO USUÁRIO */
                <div className="p-4 sm:p-5 space-y-5">
                  <div
                    className={`p-5 rounded-2xl border ${
                      isAdmin
                        ? "bg-amber-50 border-amber-200 text-slate-900 dark:bg-slate-950/80 dark:border-amber-500/30 dark:text-amber-200"
                        : "bg-slate-50 border-slate-200 text-slate-900 dark:bg-slate-950/80 dark:border-slate-800 dark:text-slate-100"
                    }`}
                  >
                    <div className="flex flex-col items-center text-center gap-3">
                      <div
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center border font-bold shrink-0 ${
                          isAdmin
                            ? "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                            : "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-slate-800 dark:text-indigo-400 dark:border-slate-700"
                        }`}
                      >
                        {isAdmin ? <Crown className="w-7 h-7" /> : <UserIcon className="w-7 h-7" />}
                      </div>

                      <div className="min-w-0 w-full">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <span className="text-base font-black text-slate-900 dark:text-white break-words">
                            {user.name}
                          </span>
                          {isAdmin && (
                            <span className="text-[9px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30 px-1.5 py-0.5 rounded shrink-0">
                              ADM
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-1 font-medium flex items-center justify-center gap-1.5" title={user.email}>
                          <Mail className="w-3.5 h-3.5 shrink-0 opacity-75" />
                          <span className="truncate">{user.email}</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Tipo de Conta:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {isDemoAccount ? "Demonstração" : isAdmin ? "Administrador" : "Padrão"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Salário Base:</span>
                        <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                          R$ {(typeof defaultSalary === "number" && !isNaN(defaultSalary) ? defaultSalary : 2500).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* OPÇÃO DE APAGAR CONTA DENTRO DO PERFIL */}
                  <div className="p-4 rounded-2xl bg-red-50/70 dark:bg-red-950/20 border border-red-200 dark:border-red-500/25 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-red-900 dark:text-red-300">
                          Apagar Conta
                        </p>
                        <p className="text-[11px] text-red-700/90 dark:text-red-300/75 leading-relaxed mt-0.5">
                          Remove permanentemente seu perfil, transações, parcelas, metas e orçamentos salvos.
                        </p>
                      </div>
                    </div>

                    <button
                      id="btn-profile-delete-account"
                      type="button"
                      onClick={handleOpenDeleteModal}
                      className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all cursor-pointer shadow-sm shadow-red-600/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Apagar Conta</span>
                    </button>
                  </div>
                </div>
              ) : (
              /* CONTEÚDO PRINCIPAL DO MENU */
              <div className="p-4 sm:p-5">
                {/* CARD DE PERFIL DO USUÁRIO (CLICÁVEL PARA ABRIR ABA DO PERFIL) */}
                <button
                  id="btn-drawer-open-profile"
                  type="button"
                  onClick={() => setDrawerTab("profile")}
                  className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer group ${
                    isAdmin
                      ? "bg-amber-50 hover:bg-amber-100/70 border-amber-200 hover:border-amber-300 text-slate-900 dark:bg-slate-950/80 dark:hover:bg-slate-900 dark:border-amber-500/30 dark:hover:border-amber-400/50 dark:text-amber-200"
                      : "bg-slate-50 hover:bg-slate-100/80 border-slate-200 hover:border-indigo-300 text-slate-900 dark:bg-slate-950/80 dark:hover:bg-slate-900 dark:border-slate-800 dark:hover:border-slate-700 dark:text-slate-100"
                  }`}
                  title="Clique para abrir seu perfil e gerenciar a conta"
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
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-200 shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </div>

                  {/* SALÁRIO BASE ATUAL */}
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Salário / Entrada Base:</span>
                    <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                      R$ {(typeof defaultSalary === "number" && !isNaN(defaultSalary) ? defaultSalary : 2500).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </button>

                {/* LISTA DE AÇÕES / NAVEGAÇÃO */}
                <div className="mt-5 space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 mb-2">
                    Ações Principais
                  </p>

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

                  {/* FUNÇÕES DE TESTE */}
                  <button
                    onClick={() => {
                      onClose();
                      if (onOpenTestFeatures) {
                        onOpenTestFeatures();
                      }
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/60 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:text-slate-300 group-hover:text-emerald-500 transition-colors">
                        <FlaskConical className="w-4 h-4 stroke-[2]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">
                          Funções de Teste
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Trocar fonte (Outfit / Jakarta) e visualização
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:text-slate-600 dark:group-hover:text-slate-300" />
                  </button>

                  {/* INSTALAÇÃO DO APLICATIVO (PWA / APK) */}
                  <PWAInstallButton variant="full" />

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

                  {/* IMPORTAR PLANILHA EXCEL / CSV COM IA */}
                  {onDirectImportFile && (
                    <>
                      <input
                        ref={spreadsheetInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) {
                            onClose();
                            onDirectImportFile(file);
                          }
                        }}
                      />
                      <button
                        id="btn-drawer-import-spreadsheet"
                        type="button"
                        onClick={() => spreadsheetInputRef.current?.click()}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/60 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800/80 hover:border-emerald-500/40 dark:hover:border-emerald-500/30 transition-all text-left group cursor-pointer"
                        title="Importar planilha Excel (.xlsx, .xls) ou CSV com leitura automática das colunas por IA"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                            <FileSpreadsheet className="w-4 h-4 stroke-[2]" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-white flex items-center gap-1.5">
                              <span>Importar Planilha (Excel / CSV)</span>
                              <Sparkles className="w-3 h-3 text-emerald-500 dark:text-emerald-400 shrink-0" />
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                              Enviar .xlsx, .xls ou .csv para a IA lançar os gastos
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:text-slate-600 dark:group-hover:text-slate-300" />
                      </button>
                    </>
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
              )}
            </div>

            {/* RODAPÉ DO DRAWER COM BOTÃO DE LOGOUT */}
            <div className="p-4 sm:p-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] border-t border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/50 space-y-3">
              <button
                id="btn-drawer-logout"
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

        {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE CONTA COM SENHA */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div
              onClick={() => {
                if (!isDeletingAccount) setIsDeleteModalOpen(false);
              }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-red-200 dark:border-red-500/30 rounded-3xl shadow-2xl p-6 z-10 text-slate-800 dark:text-slate-100"
            >
              <button
                type="button"
                disabled={isDeletingAccount}
                onClick={() => setIsDeleteModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-4 pr-8">
                <div className="w-11 h-11 rounded-2xl bg-red-100 dark:bg-red-500/15 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white">
                    Excluir Conta
                  </h4>
                  <p className="text-[11px] text-red-600 dark:text-red-400 font-bold">
                    Esta ação é permanente e irreversível
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/20 text-xs text-slate-700 dark:text-slate-300 space-y-1.5 mb-4">
                <p>
                  Todos os lançamentos, parcelas, metas, orçamentos e configurações da conta{" "}
                  <strong className="text-slate-900 dark:text-white">{user.email}</strong> serão apagados definitivamente.
                </p>
              </div>

              {isDemoAccount ? (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    A conta de demonstração não possui senha cadastrada e não pode ser excluída. Utilize <strong>Sair da Conta</strong> para encerrar a sessão de teste.
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsDeleteModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDeleteModalOpen(false);
                        onClose();
                        onLogout();
                      }}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sair da Conta</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleConfirmDeleteAccount} className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="delete-account-password"
                      className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block"
                    >
                      Digite sua senha para confirmar
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="delete-account-password"
                        type={showDeletePassword ? "text" : "password"}
                        required
                        autoFocus
                        autoComplete="current-password"
                        value={deletePassword}
                        onChange={(e) => {
                          setDeletePassword(e.target.value);
                          if (deleteError) setDeleteError(null);
                        }}
                        disabled={isDeletingAccount}
                        placeholder="Sua senha atual"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDeletePassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer p-1"
                        title={showDeletePassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {deleteError && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500 dark:text-red-400" />
                      <span>{deleteError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isDeletingAccount}
                      onClick={() => setIsDeleteModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      id="btn-confirm-delete-account"
                      type="submit"
                      disabled={isDeletingAccount || !deletePassword}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDeletingAccount ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Excluindo...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Confirmar Exclusão</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}
