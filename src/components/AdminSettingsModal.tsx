import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
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
} from "lucide-react";
import { isUserAdmin, ADMIN_EMAIL, ADMIN_USERNAME } from "../lib/admin";
import { useModalBackHandler } from "../hooks/useBackNavigation";

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
  transactionsCount: number;
  budgetsCount: number;
  modalMode?: "salary" | "admin";
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
  transactionsCount,
  budgetsCount,
  modalMode = "salary",
}: AdminSettingsModalProps) {
  const isAdmin = isUserAdmin(user);
  const isSalaryOnly = modalMode === "salary" || !isAdmin;
  const [copiedId, setCopiedId] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [activeTab, setActiveTab] = useState<"salary" | "exports" | "database" | "reset">(
    modalMode === "admin" && isAdmin ? "exports" : "salary"
  );
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [pingMs, setPingMs] = useState<number | null>(null);

  // Intercepta botão voltar do celular
  useModalBackHandler(isOpen, onClose, "admin_settings_modal");

  // Sync tab when opening
  useEffect(() => {
    if (isOpen) {
      if (modalMode === "admin" && isAdmin) {
        setActiveTab("exports");
      } else {
        setActiveTab("salary");
      }
    }
  }, [isOpen, modalMode, isAdmin]);

  // Salary state
  const [salaryInput, setSalaryInput] = useState<string>(String(defaultSalary || 2500));
  const [applyToFuture, setApplyToFuture] = useState(true);
  const [isSavingSalary, setIsSavingSalary] = useState(false);
  const [salarySavedFeedback, setSalarySavedFeedback] = useState(false);

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
          aiModelIntegration: "Gemini 2.5 Flash Ativo",
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
                !isSalaryOnly
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              }`}>
                {!isSalaryOnly ? <Crown className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-white">
                    {!isSalaryOnly ? "Painel de Administração (ADM)" : "Configurações & Salário"}
                  </h2>
                  {!isSalaryOnly ? (
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
                  {!isSalaryOnly
                    ? `Acesso à infraestrutura, exportações e banco de dados (${ADMIN_USERNAME})` 
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

          {/* TAB NAVIGATION (APENAS NO MODO PAINEL ADM) */}
          {!isSalaryOnly && (
            <div className="flex border-b border-slate-800/80 px-6 bg-slate-950/20 gap-2 pt-2 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setActiveTab("exports")}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === "exports"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Download className="w-4 h-4" />
                Exportações & Backups
              </button>

              <button
                onClick={() => setActiveTab("database")}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === "database"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Server className="w-4 h-4" />
                Servidor & Supabase
              </button>

              <button
                onClick={() => setActiveTab("reset")}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === "reset"
                    ? "border-rose-500 text-rose-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                Manutenção
              </button>
            </div>
          )}

          {/* TAB CONTENT */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {(isSalaryOnly || activeTab === "salary") && (
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

                {/* DICA DE COMO FUNCIONA O ORÇAMENTO */}
                <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl flex items-start gap-3">
                  <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    <strong>Dica:</strong> Você também pode editar o orçamento de um mês específico clicando diretamente no card <em>"Orçamento / Entrada"</em> no topo da tela inicial.
                  </p>
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
