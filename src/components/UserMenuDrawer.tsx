import React from "react";
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
} from "lucide-react";

interface UserMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: { id: string; name: string; email: string; defaultSalary?: number };
  isAdmin: boolean;
  defaultSalary: number;
  selectedMonth: string;
  onOpenSettings: () => void;
  onOpenAddModal: () => void;
  onLogout: () => void;
  onScrollToAi?: () => void;
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
}: UserMenuDrawerProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
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
            className="w-screen max-w-xs sm:max-w-sm bg-slate-900 border-r border-slate-800 shadow-2xl flex flex-col justify-between overflow-y-auto"
          >
            {/* TOPO DO MENU */}
            <div>
              {/* CABEÇALHO */}
              <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/50">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white tracking-tight">
                      Smart<span className="text-emerald-400">Financer</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono">Menu & Conta</p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-all cursor-pointer"
                  title="Fechar menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* CARD DE PERFIL DO USUÁRIO */}
              <div className="p-4 sm:p-5">
                <div
                  className={`p-4 rounded-2xl border ${
                    isAdmin
                      ? "bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-950 border-amber-500/30 text-amber-200"
                      : "bg-gradient-to-br from-indigo-950/25 via-slate-900 to-slate-950 border-indigo-500/25 text-slate-200"
                  } shadow-md`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center border font-bold text-sm shadow-inner ${
                        isAdmin
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                      }`}
                    >
                      {isAdmin ? <Crown className="w-5 h-5 text-amber-400" /> : <UserIcon className="w-5 h-5 text-indigo-400" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-white truncate max-w-[150px]">
                          {user.name}
                        </span>
                        {isAdmin && (
                          <span className="text-[9px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded">
                            ADM
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5" title={user.email}>
                        {user.email}
                      </p>
                    </div>
                  </div>

                  {/* SALÁRIO BASE ATUAL */}
                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400">Salário / Entrada Base:</span>
                    <span className="font-mono font-extrabold text-emerald-400">
                      R$ {defaultSalary.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* LISTA DE AÇÕES / NAVEGAÇÃO */}
                <div className="mt-5 space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
                    Ações Principais
                  </p>

                  {/* NOVO LANÇAMENTO */}
                  <button
                    onClick={() => {
                      onClose();
                      onOpenAddModal();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-slate-850 border border-slate-800/80 hover:border-emerald-500/30 transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                        <PlusCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-200 group-hover:text-white">
                          Novo Lançamento
                        </p>
                        <p className="text-[10px] text-slate-400">Adicionar gasto ou compra</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300" />
                  </button>

                  {/* CONFIGURAÇÕES / PAINEL ADM */}
                  <button
                    onClick={() => {
                      onClose();
                      onOpenSettings();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-slate-850 border border-slate-800/80 hover:border-indigo-500/30 transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-colors ${isAdmin ? "bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20" : "bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20"}`}>
                        <Settings className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-200 group-hover:text-white">
                            {isAdmin ? "Painel ADM & Configurações" : "Configurações & Salário"}
                          </p>
                        </div>
                        <p className="text-[10px] text-slate-400">Ajustar salário, backups e dados</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300" />
                  </button>

                  {/* IMPORTAÇÃO DE PLANILHA / EXTRATOS */}
                  <button
                    onClick={() => {
                      onClose();
                      onOpenSettings();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-slate-850 border border-slate-800/80 hover:border-purple-500/30 transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-200 group-hover:text-white">
                          Importar Planilha / Extrato
                        </p>
                        <p className="text-[10px] text-slate-400">Excel, CSV e fotos com IA</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300" />
                  </button>

                  {/* CONSULTOR DE IA */}
                  {onScrollToAi && (
                    <button
                      onClick={() => {
                        onClose();
                        onScrollToAi();
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-slate-850 border border-slate-800/80 hover:border-indigo-500/30 transition-all text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg group-hover:bg-indigo-500/20 transition-colors">
                          <BrainCircuit className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-200 group-hover:text-white">
                            Consultor IA Gemini
                          </p>
                          <p className="text-[10px] text-slate-400">Análise e dicas de economia</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* RODAPÉ DO DRAWER COM BOTÃO DE LOGOUT */}
            <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-950/50 space-y-3">
              <button
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold text-xs transition-all cursor-pointer hover:border-rose-500/40"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair da Conta</span>
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sessão segura ativa</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
