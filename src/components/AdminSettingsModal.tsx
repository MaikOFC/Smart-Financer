import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Settings,
  Database,
  Download,
  FileSpreadsheet,
  FileCode,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  Info,
  Server,
  User as UserIcon,
  AlertTriangle,
  Globe,
  Radio,
  Cpu,
  Cloud,
  Laptop,
  Wallet,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Calendar,
  Lock,
  Crown,
  KeyRound,
  Upload,
  Sparkles,
  SlidersHorizontal,
  Layers,
  Table2,
  Sun,
  Moon,
  Smartphone,
  ArrowUpCircle,
} from "lucide-react";
import { isUserAdmin, ADMIN_EMAIL, ADMIN_USERNAME } from "../lib/admin";
import { Transaction } from "../types";
import SpreadsheetUpload from "./SpreadsheetUpload";
import { ThemeMode } from "../lib/theme";
import { CURRENT_CLIENT_VERSION, checkServerVersion, forceReloadApp } from "../lib/updateManager";

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { id: string; name: string; email: string };
  defaultSalary: number;
  onUpdateDefaultSalary: (newSalary: number, applyToFutureMonths: boolean, fromMonth: string) => Promise<void>;
  selectedMonth: string;
  supabaseActive: boolean;
  supabaseUserId: string;
  setSupabaseUserId: (id: string) => void;
  onExportJson: () => void;
  onExportSupabaseCSV: (type: "transactions" | "budgets") => void;
  onResetAll: () => void;
  onImportTransactions: (imported: Transaction[]) => void;
  transactionsCount: number;
  budgetsCount: number;
  viewMode?: "compact" | "full";
  onSetViewMode?: (mode: "compact" | "full") => void;
  themeMode?: ThemeMode;
  onSetThemeMode?: (mode: ThemeMode) => void;
}

interface SystemStatus {
  status: string;
  hostingType: "local" | "cloud";
  platformName: string;
  locationDetail: string;
  host: string;
  protocol: string;
  isOnlineCloud: boolean;
  database: {
    type: string;
    name: string;
    detail: string;
  };
  system: {
    nodeVersion: string;
    uptimeSeconds: number;
    environment: string;
    aiModelIntegration: string;
  };
  timestamp: string;
}

export default function AdminSettingsModal({
  isOpen,
  onClose,
  user,
  defaultSalary,
  onUpdateDefaultSalary,
  selectedMonth,
  supabaseActive,
  supabaseUserId,
  setSupabaseUserId,
  onExportJson,
  onExportSupabaseCSV,
  onResetAll,
  onImportTransactions,
  transactionsCount,
  budgetsCount,
  viewMode = "compact",
  onSetViewMode,
  themeMode = "system",
  onSetThemeMode,
}: AdminSettingsModalProps) {
  const isAdmin = isUserAdmin(user);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [activeTab, setActiveTab] = useState<"salary" | "import" | "exports" | "database" | "reset">("salary");
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [pingMs, setPingMs] = useState<number | null>(null);

  // Salary state
  const [salaryInput, setSalaryInput] = useState<string>(String(defaultSalary || 2500));
  const [applyToFuture, setApplyToFuture] = useState(true);
  const [isSavingSalary, setIsSavingSalary] = useState(false);
  const [salarySavedFeedback, setSalarySavedFeedback] = useState(false);

  // Update OTA state
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateFeedback, setUpdateFeedback] = useState<string | null>(null);
  const [updateIsLatest, setUpdateIsLatest] = useState<boolean | null>(null);

  const handleCheckUpdates = async () => {
    setIsCheckingUpdate(true);
    setUpdateFeedback(null);
    setUpdateIsLatest(null);

    try {
      const result = await checkServerVersion();
      if (result.hasUpdate) {
        setUpdateFeedback(`Nova versão (${result.serverVersion}) disponível! Aplicando atualização...`);
        setUpdateIsLatest(false);
        setTimeout(() => {
          forceReloadApp();
        }, 1200);
      } else {
        setUpdateFeedback(`Seu aplicativo já está na versão mais recente (v${CURRENT_CLIENT_VERSION}).`);
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
    setUpdateFeedback("Limpando caches e atualizando...");
    setTimeout(() => {
      forceReloadApp();
    }, 500);
  };

  useEffect(() => {
    setSalaryInput(String(defaultSalary || 2500));
  }, [defaultSalary]);

  const handleSaveSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(salaryInput);
    if (isNaN(val) || val <= 0) return;

    setIsSavingSalary(true);
    try {
      await onUpdateDefaultSalary(val, applyToFuture, selectedMonth);
      setSalarySavedFeedback(true);
      setTimeout(() => setSalarySavedFeedback(false), 3500);
    } catch (err) {
      console.error("Erro ao salvar novo salário:", err);
    } finally {
      setIsSavingSalary(false);
    }
  };

  const effectiveUserId = supabaseActive ? user.id : supabaseUserId;

  const fetchSystemStatus = async () => {
    setIsLoadingStatus(true);
    const startTime = performance.now();
    try {
      const res = await fetch("/api/system-status");
      const data = await res.json();
      const latency = Math.round(performance.now() - startTime);
      setPingMs(latency);
      setSystemStatus(data);
    } catch (err) {
      console.warn("Could not fetch system status:", err);
      // Fallback detection from client window
      const isLocalHost =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";
      setSystemStatus({
        status: "online",
        hostingType: isLocalHost ? "local" : "cloud",
        platformName: isLocalHost ? "Servidor Local (Localhost)" : `Nuvem Web (${window.location.hostname})`,
        locationDetail: isLocalHost ? "Máquina Local" : "Nuvem / Web",
        host: window.location.host,
        protocol: window.location.protocol.replace(":", ""),
        isOnlineCloud: !isLocalHost,
        database: {
          type: supabaseActive ? "supabase_cloud" : "server_json",
          name: supabaseActive ? "Supabase PostgreSQL (Nuvem)" : "Armazenamento no Servidor",
          detail: supabaseActive ? "Conectado ao Supabase" : "Arquivo JSON no container",
        },
        system: {
          nodeVersion: "Node.js v20+",
          uptimeSeconds: 0,
          environment: "production",
          aiModelIntegration: "Gemini Ativo",
        },
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAdmin) {
      fetchSystemStatus();
    }
  }, [isOpen, isAdmin]);

  const handleCopyUserId = () => {
    navigator.clipboard.writeText(effectiveUserId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  const handleCopySqlHint = () => {
    const sqlText = `-- Schema para Supabase (Execute no SQL Editor)
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_month_budget UNIQUE (user_id, month)
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    date VARCHAR(10) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('expense', 'income')),
    table_section VARCHAR(20) NOT NULL CHECK (table_section IN ('left', 'right', 'bottom_left')),
    category VARCHAR(100) NOT NULL DEFAULT 'Outros',
    is_orange_highlight BOOLEAN NOT NULL DEFAULT FALSE,
    is_discount BOOLEAN NOT NULL DEFAULT FALSE,
    note TEXT DEFAULT NULL,
    seed_key VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_seed_key UNIQUE (user_id, seed_key)
);`;
    navigator.clipboard.writeText(sqlText);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* MODAL HEADER */}
          <div className="flex items-center justify-between p-6 border-b border-slate-800/80 bg-slate-950/40">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-2xl border shadow-sm ${
                isAdmin 
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              }`}>
                {isAdmin ? <Crown className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-white">
                    {isAdmin ? "Painel de Administração" : "Configurações da Conta"}
                  </h2>
                  {isAdmin ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30 flex items-center gap-1">
                      <Crown className="w-3 h-3" /> ADM PRINCIPAL
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-medium">
                      SmartFinancer
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  {isAdmin 
                    ? `Acesso total à infraestrutura, exportações e banco de dados (${ADMIN_USERNAME})` 
                    : "Gerencie seu salário base mensal e preferências da sua conta"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* TAB NAVIGATION */}
          <div className="flex border-b border-slate-800/80 px-6 bg-slate-950/20 gap-2 pt-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab("salary")}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "salary"
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Wallet className="w-4 h-4" />
              Salário & Renda
            </button>

            <button
              onClick={() => setActiveTab("import")}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "import"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Importação Inteligente
            </button>

            <button
              onClick={() => setActiveTab("exports")}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "exports"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {isAdmin ? <Download className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5 text-slate-500" />}
              Exportações & Backups
              {!isAdmin && <span className="text-[9px] px-1 bg-slate-800 text-slate-400 rounded">ADM</span>}
            </button>

            <button
              onClick={() => setActiveTab("database")}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "database"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {isAdmin ? <Server className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5 text-slate-500" />}
              Servidor & Supabase
              {!isAdmin && <span className="text-[9px] px-1 bg-slate-800 text-slate-400 rounded">ADM</span>}
            </button>

            <button
              onClick={() => setActiveTab("reset")}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "reset"
                  ? "border-rose-500 text-rose-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {isAdmin ? <RefreshCw className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5 text-slate-500" />}
              Manutenção
              {!isAdmin && <span className="text-[9px] px-1 bg-slate-800 text-slate-400 rounded">ADM</span>}
            </button>
          </div>

          {/* TAB CONTENT */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {activeTab === "salary" && (
              <div className="space-y-5">
                {/* INFO BANNER */}
                <div className="bg-emerald-950/20 border border-emerald-500/30 p-5 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 shrink-0">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">Configuração de Salário & Entrada Base</h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Defina o seu salário mensal padrão. Sempre que houver um reajuste, promoção ou mudança de renda, altere este valor para atualizar automaticamente o orçamento dos meses seguintes.
                      </p>
                    </div>
                  </div>
                </div>

                {/* FORMULÁRIO DE ATUALIZAÇÃO DE SALÁRIO */}
                <form onSubmit={handleSaveSalary} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2">
                      Salário / Renda Mensal Base (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-400 font-mono">
                        R$
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={salaryInput}
                        onChange={(e) => setSalaryInput(e.target.value)}
                        placeholder="2500,00"
                        className="w-full bg-slate-900 border border-slate-700/80 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 text-lg font-mono font-black text-white px-4 py-3 pl-12 rounded-xl transition-all"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      Valor atual salvo no perfil: <strong className="text-emerald-400 font-mono">R$ {defaultSalary?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                    </p>
                  </div>

                  {/* CHECKBOX APLICAR A PARTIR DO MÊS SELECIONADO E FUTUROS */}
                  <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-2">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={applyToFuture}
                        onChange={(e) => setApplyToFuture(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 cursor-pointer accent-emerald-500"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-200 block">
                          Aplicar este novo salário a partir de {selectedMonth} e em todos os meses futuros
                        </span>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Atualiza automaticamente as planilhas dos próximos 12 meses para que venham preenchidas com o novo valor de salário.
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* FEEDBACK DE SUCESSO */}
                  {salarySavedFeedback && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Salário base atualizado com sucesso para os meses seguintes!</span>
                    </motion.div>
                  )}

                  {/* BOTÃO SALVAR */}
                  <button
                    type="submit"
                    disabled={isSavingSalary}
                    className="w-full flex items-center justify-center gap-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white py-3 rounded-xl transition-all shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingSalary ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Salvando...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> Salvar e Atualizar Salário
                      </>
                    )}
                  </button>
                </form>

                {/* PREFERÊNCIAS DE VISUALIZAÇÃO */}
                {onSetViewMode && (
                  <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        Modo de Visualização da Tela Principal
                      </h4>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Escolha como você prefere visualizar os lançamentos e tabelas ao navegar pelos meses:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => onSetViewMode("compact")}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          viewMode === "compact"
                            ? "bg-emerald-500/15 border-emerald-500/40 text-white shadow-sm ring-1 ring-emerald-500/30"
                            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-bold text-white">Modo Focado (Cards)</span>
                          </div>
                          {viewMode === "compact" && (
                            <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                              Ativo
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-normal">
                          Layout limpo com cards interativos no topo. Ao tocar em Despesas, Planejado ou Parcelas, abre a central deslizante focada.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSetViewMode("full")}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          viewMode === "full"
                            ? "bg-emerald-500/15 border-emerald-500/40 text-white shadow-sm ring-1 ring-emerald-500/30"
                            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <Table2 className="w-4 h-4 text-indigo-400" />
                            <span className="text-xs font-bold text-white">Modo Padrão (Planilha)</span>
                          </div>
                          {viewMode === "full" && (
                            <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                              Ativo
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-normal">
                          Exibe todas as tabelas e listas diretamente rolando a página inicial para baixo como em uma planilha tradicional.
                        </p>
                      </button>
                    </div>
                  </div>
                )}

                {/* PREFERÊNCIAS DE APARÊNCIA E TEMA */}
                {onSetThemeMode && (
                  <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sun className="w-4 h-4 text-amber-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                          Aparência e Tema
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {themeMode === "system" ? "Padrão Celular" : themeMode === "dark" ? "Escuro" : "Claro"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Selecione se o aplicativo deve seguir o tema padrão do celular ou fixar em modo escuro/claro:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => onSetThemeMode("system")}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          themeMode === "system"
                            ? "bg-emerald-500/15 border-emerald-500/40 text-white shadow-sm ring-1 ring-emerald-500/30"
                            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-bold text-white">Padrão Celular</span>
                          </div>
                          {themeMode === "system" && (
                            <span className="text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                              Ativo
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Segue o tema claro/escuro das configurações do dispositivo.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSetThemeMode("dark")}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          themeMode === "dark"
                            ? "bg-emerald-500/15 border-emerald-500/40 text-white shadow-sm ring-1 ring-emerald-500/30"
                            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <Moon className="w-4 h-4 text-indigo-400" />
                            <span className="text-xs font-bold text-white">Tema Escuro</span>
                          </div>
                          {themeMode === "dark" && (
                            <span className="text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                              Ativo
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Fundo escuro em tom slate-950 com alto contraste.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSetThemeMode("light")}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          themeMode === "light"
                            ? "bg-emerald-500/15 border-emerald-500/40 text-white shadow-sm ring-1 ring-emerald-500/30"
                            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <Sun className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-bold text-white">Tema Claro</span>
                          </div>
                          {themeMode === "light" && (
                            <span className="text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                              Ativo
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Fundo claro limpo e suave para uso diurno.
                        </p>
                      </button>
                    </div>
                  </div>
                )}

                {/* ATUALIZAÇÕES AUTOMÁTICAS PELA NUVEM (OTA) */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ArrowUpCircle className="w-4 h-4 text-indigo-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        Atualizações do Sistema (Sem Reinstalar APK)
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      v{CURRENT_CLIENT_VERSION}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Sempre que novas melhorias forem publicadas, seu APK se conecta à nuvem e atualiza tudo automaticamente:
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCheckUpdates}
                      disabled={isCheckingUpdate}
                      className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? "animate-spin" : ""}`} />
                      <span>{isCheckingUpdate ? "Verificando na Nuvem..." : "Buscar Atualização Agora"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleForceReload}
                      disabled={isCheckingUpdate}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-bold text-xs transition-all cursor-pointer"
                      title="Força o download dos arquivos mais recentes e limpa o cache da WebView"
                    >
                      <span>Limpar Cache & Recarregar</span>
                    </button>
                  </div>

                  {updateFeedback && (
                    <div
                      className={`p-3 rounded-xl text-xs leading-relaxed flex items-start gap-2 animate-fadeIn ${
                        updateIsLatest === true
                          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                          : "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                      }`}
                    >
                      {updateIsLatest === true ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <RefreshCw className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5 animate-spin" />
                      )}
                      <span>{updateFeedback}</span>
                    </div>
                  )}
                </div>

                {/* DICA DE COMO FUNCIONA O ORÇAMENTO */}
                <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl flex items-start gap-3">
                  <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    <strong>Dica:</strong> Você também pode editar o orçamento de um mês específico clicando diretamente no card <em>"Orçamento / Entrada"</em> no topo da tela inicial.
                  </p>
                </div>
              </div>
            )}

            {/* ABA DE IMPORTAÇÃO */}
            {activeTab === "import" && (
              <div className="space-y-5">
                {/* INFO BANNER */}
                <div className="bg-indigo-950/20 border border-indigo-500/30 p-5 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30 shrink-0">
                      <Sparkles className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">Importação Inteligente de Planilhas e Comprovantes</h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Envie qualquer planilha (<strong>.xlsx</strong>, <strong>.csv</strong>, <strong>.xls</strong>) ou um <strong>print/imagem</strong> de tabelas, extratos e recibos. Nossa IA Gemini irá analisar os dados, reconhecer os valores e datas, e adicioná-los automaticamente ao seu mês selecionado (<strong className="text-indigo-300 font-mono">{selectedMonth}</strong>).
                      </p>
                    </div>
                  </div>
                </div>

                {/* UPLOADER */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
                  <SpreadsheetUpload
                    onImportTransactions={(imported) => {
                      onImportTransactions(imported);
                    }}
                    hideHeader={true}
                    isCompact={true}
                    className="bg-transparent border-0 p-0 mb-0"
                  />
                </div>

                {/* DICAS DE FORMATOS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-950/40 border border-slate-800/80 p-3.5 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                      <FileSpreadsheet className="w-4 h-4" /> Planilhas (Excel e CSV)
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Não precisa estar em nenhum formato rígido. A IA detecta cabeçalhos como Nome/Descrição, Valor R$, Categoria e Data de vencimento.
                    </p>
                  </div>
                  <div className="bg-slate-950/40 border border-slate-800/80 p-3.5 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-indigo-400">
                      <Upload className="w-4 h-4" /> Prints e Fotos de Recibos
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Tirou um print do aplicativo do seu banco ou uma foto de nota fiscal? A IA faz a leitura visual (OCR) e converte automaticamente em lançamentos.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SE NÃO FOR ADMIN E TENTAR ACESSAR EXPORTS, DATABASE OU RESET */}
            {!isAdmin && (activeTab === "exports" || activeTab === "database" || activeTab === "reset") && (
              <div className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-6 text-center space-y-4 my-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 mx-auto">
                  <Lock className="w-7 h-7" />
                </div>
                <div className="space-y-2 max-w-md mx-auto">
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                    Acesso Restrito ao Administrador
                  </span>
                  <h3 className="text-base font-black text-white pt-1">
                    {activeTab === "exports" && "Exportações e Backups do Sistema"}
                    {activeTab === "database" && "Infraestrutura de Servidores e Banco Supabase"}
                    {activeTab === "reset" && "Manutenção Geral e Redefinição"}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    As ferramentas de inspeção de banco de dados, exportação bruta e manutenção de servidores são restritas com segurança ao administrador cadastrado:
                  </p>
                  <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl text-left space-y-1.5 font-mono text-xs mt-3">
                    <div className="text-slate-400 flex items-center justify-between">
                      <span className="text-slate-500">Usuário ADM:</span>
                      <strong className="text-amber-400">{ADMIN_USERNAME}</strong>
                    </div>
                    <div className="text-slate-400 flex items-center justify-between">
                      <span className="text-slate-500">E-mail:</span>
                      <strong className="text-indigo-400">{ADMIN_EMAIL}</strong>
                    </div>
                    <div className="text-slate-400 flex items-center justify-between">
                      <span className="text-slate-500">ID Supabase:</span>
                      <strong className="text-slate-300 text-[11px] truncate max-w-[190px]">1703bc04-af6d-4bfa-9d6f-422...</strong>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab("salary")}
                  className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  Voltar para Salário & Renda
                </button>
              </div>
            )}

            {/* CONTEÚDO EXCLUSIVO DO ADMIN */}
            {isAdmin && activeTab === "exports" && (
              <div className="space-y-4">
                <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5 text-amber-400" /> Resumo de Dados Atuais
                    </span>
                    <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                      {transactionsCount} transações • {budgetsCount} orçamentos
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Baixe os lançamentos a qualquer momento em formatos abertos e compatíveis com planilhas Excel ou bancos SQL.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Export JSON */}
                  <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                        <FileCode className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Backup Completo (JSON)</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                          Exporta o conjunto integral de transações e orçamentos em formato estruturado.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={onExportJson}
                      className="w-full flex items-center justify-center gap-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 py-2.5 rounded-xl border border-slate-700/60 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Baixar JSON
                    </button>
                  </div>

                  {/* Export CSV Transactions */}
                  <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">CSV Transações (Supabase)</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                          Formatado com as colunas exatas da tabela <code className="text-emerald-400">transactions</code>.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onExportSupabaseCSV("transactions")}
                      className="w-full flex items-center justify-center gap-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 py-2.5 rounded-xl border border-slate-700/60 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Baixar CSV Transações
                    </button>
                  </div>

                  {/* Export CSV Budgets */}
                  <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between space-y-3 sm:col-span-2">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">CSV Orçamentos (Supabase)</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                          Formatado com as colunas da tabela <code className="text-indigo-400">budgets</code> para importação direta no Supabase Table Editor.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onExportSupabaseCSV("budgets")}
                      className="w-full flex items-center justify-center gap-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 py-2.5 rounded-xl border border-slate-700/60 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Baixar CSV Orçamentos
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isAdmin && activeTab === "database" && (
              <div className="space-y-4">
                {/* STATUS DE HOSPEDAGEM E SERVIDOR */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Status de Hospedagem & Servidor
                    </span>
                    <button
                      onClick={fetchSystemStatus}
                      disabled={isLoadingStatus}
                      className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 cursor-pointer"
                      title="Atualizar diagnóstico"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingStatus ? "animate-spin text-emerald-400" : ""}`} />
                      Diagnosticar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    {/* Ambiente */}
                    <div className="bg-slate-900/80 border border-slate-800/80 p-3 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <Globe className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Hospedagem</span>
                      </div>
                      <p className="text-xs font-bold text-white truncate">
                        {systemStatus?.platformName || "Nuvem Web"}
                      </p>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {systemStatus?.isOnlineCloud ? "Produção Cloud" : "Ambiente Local"}
                      </span>
                    </div>

                    {/* Banco Atual */}
                    <div className="bg-slate-900/80 border border-slate-800/80 p-3 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <Database className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Banco em Uso</span>
                      </div>
                      <p className="text-xs font-bold text-indigo-300 truncate">
                        {supabaseActive ? "Supabase PostgreSQL" : "Servidor / JSON"}
                      </p>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {supabaseActive ? "Online / Nuvem" : "Storage Seguro"}
                      </span>
                    </div>

                    {/* Latência / Conexão */}
                    <div className="bg-slate-900/80 border border-slate-800/80 p-3 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <Cpu className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Latência</span>
                      </div>
                      <p className="text-xs font-bold text-emerald-400 font-mono">
                        {pingMs !== null ? `${pingMs} ms` : "Ativo"}
                      </p>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Porta 3000 / Express
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dica de Configuração do Supabase */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Dica de Configuração Supabase (Novos Usuários)
                    </span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-bold">
                      Recomendado
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Para permitir que você e novos usuários criem conta sem confirmação de e-mail por link:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-xs font-bold text-emerald-300">Enable Email provider</span>
                      </div>
                      <p className="text-[11px] text-slate-300 font-medium">
                        Deve ficar <strong className="text-emerald-400">ATIVADO (ON)</strong>. Se estiver desligado, o Supabase rejeita novos cadastros com o erro <em>"Email signups are disabled"</em>.
                      </p>
                    </div>

                    <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-400" />
                        <span className="text-xs font-bold text-sky-300">Confirm email</span>
                      </div>
                      <p className="text-[11px] text-slate-300 font-medium">
                        Deve ficar <strong className="text-sky-300">DESATIVADO (OFF)</strong>. Desativando esta chave, qualquer usuário cria conta e acessa o sistema imediatamente.
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-300">Caminho no Supabase Dashboard:</p>
                    <p className="font-mono text-indigo-300">
                      Painel Supabase ➔ Authentication ➔ Providers ➔ Email ➔ Salvar (Save)
                    </p>
                  </div>
                </div>

                {/* Usuário e ID Supabase */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5 text-indigo-400" /> Detalhes do Administrador
                    </span>
                    <span className="text-xs text-slate-300 font-medium">{user.name} ({user.email})</span>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80">
                    <label className="text-[11px] font-bold text-slate-400 block mb-1.5">
                      ID Supabase (UUID para Chave Estrangeira <code className="text-indigo-300">auth.uid()</code>):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={effectiveUserId}
                        readOnly={supabaseActive}
                        onChange={(e) => {
                          if (!supabaseActive) {
                            const val = e.target.value.trim();
                            setSupabaseUserId(val);
                            localStorage.setItem("supabase_user_id", val);
                          }
                        }}
                        className={`flex-1 bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 px-3.5 py-2.5 rounded-xl focus:outline-none ${
                          supabaseActive ? "bg-slate-900/40 text-slate-400" : "focus:border-indigo-500"
                        }`}
                        placeholder="Ex: 1703bc04-af6d-4bfa-9d6f-422fa3b077a6"
                      />
                      <button
                        onClick={handleCopyUserId}
                        className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
                        title="Copiar ID"
                      >
                        {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedId ? "Copiado!" : "Copiar"}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      Esse UUID é utilizado ao exportar os arquivos CSV para respeitar as chaves estrangeiras do seu banco PostgreSQL no Supabase.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isAdmin && activeTab === "reset" && (
              <div className="space-y-4">
                <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-start gap-3 text-rose-300">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
                  <div className="text-xs space-y-1">
                    <h4 className="font-bold text-rose-200">Atenção ao Redefinir</h4>
                    <p className="text-rose-300/80 leading-relaxed">
                      Ao resetar os dados, suas transações e orçamentos atuais serão substituídos pelo modelo inicial padrão.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                    <RefreshCw className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Restaurar Dados de Exemplo</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-md">
                      Restaura as planilhas para a estrutura demonstrativa original (Gastos de Julho, Metas de Planejamento e Recebíveis).
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onResetAll();
                    }}
                    className="mt-2 flex items-center gap-2 text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-rose-500/20 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" /> Confirmar e Resetar Dados
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* MODAL FOOTER */}
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-all cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
