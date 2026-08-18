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
  Info,
  Server,
  User as UserIcon,
  AlertTriangle,
  Globe,
  Radio,
  Cpu,
  Cloud,
  Laptop,
} from "lucide-react";

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { id: string; name: string; email: string };
  supabaseActive: boolean;
  supabaseUserId: string;
  setSupabaseUserId: (id: string) => void;
  onExportJson: () => void;
  onExportSupabaseCSV: (type: "transactions" | "budgets") => void;
  onResetAll: () => void;
  transactionsCount: number;
  budgetsCount: number;
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
  supabaseActive,
  supabaseUserId,
  setSupabaseUserId,
  onExportJson,
  onExportSupabaseCSV,
  onResetAll,
  transactionsCount,
  budgetsCount,
}: AdminSettingsModalProps) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [activeTab, setActiveTab] = useState<"exports" | "database" | "reset">("exports");
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [pingMs, setPingMs] = useState<number | null>(null);

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
    if (isOpen) {
      fetchSystemStatus();
    }
  }, [isOpen]);

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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
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
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 shadow-sm">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  Painel de Configurações <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-medium">SmartFinancer</span>
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  Exportações, status de hospedagem do servidor e banco de dados
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* TAB NAVIGATION */}
          <div className="flex border-b border-slate-800/80 px-6 bg-slate-950/20 gap-2 pt-2">
            <button
              onClick={() => setActiveTab("exports")}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
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
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
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
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
                activeTab === "reset"
                  ? "border-rose-500 text-rose-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              Manutenção
            </button>
          </div>

          {/* TAB CONTENT */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {activeTab === "exports" && (
              <div className="space-y-4">
                <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Resumo de Dados Atuais</span>
                    <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                      {transactionsCount} transações • {budgetsCount} orçamentos
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Baixe os seus lançamentos a qualquer momento em formatos abertos e compatíveis com planilhas Excel ou bancos SQL.
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
                      className="w-full flex items-center justify-center gap-2 text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 py-2.5 rounded-xl border border-emerald-500/20 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Baixar CSV Transações
                    </button>
                  </div>

                  {/* Export CSV Budgets */}
                  <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                        <Database className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">CSV Orçamentos (Supabase)</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                          Formatado com as colunas da tabela <code className="text-emerald-400">budgets</code> por mês.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onExportSupabaseCSV("budgets")}
                      className="w-full flex items-center justify-center gap-2 text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 py-2.5 rounded-xl border border-emerald-500/20 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Baixar CSV Orçamentos
                    </button>
                  </div>

                  {/* Schema Info */}
                  <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
                        <Server className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Estrutura SQL</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                          Copie o DDL completo para criar as tabelas no PostgreSQL/Supabase.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleCopySqlHint}
                      className="w-full flex items-center justify-center gap-2 text-xs font-bold bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 py-2.5 rounded-xl border border-purple-500/20 transition-all cursor-pointer"
                    >
                      {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedSql ? "Script SQL Copiado!" : "Copiar Script SQL"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "database" && (
              <div className="space-y-4">
                {/* STATUS DE HOSPEDAGEM DO SERVIDOR (ONLINE NA NUVEM OU LOCAL) */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4.5 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Radio className="w-3.5 h-3.5 text-indigo-400" /> Diagnóstico de Hospedagem & Servidor
                    </span>
                    <button
                      onClick={fetchSystemStatus}
                      disabled={isLoadingStatus}
                      className="flex items-center gap-1.5 text-[11px] text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-lg transition-all cursor-pointer border border-indigo-500/20"
                      title="Atualizar diagnóstico do servidor"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingStatus ? "animate-spin" : ""}`} />
                      {isLoadingStatus ? "Verificando..." : "Testar Conexão"}
                    </button>
                  </div>

                  {/* Card Principal de Ambiente */}
                  <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                        systemStatus?.isOnlineCloud
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                          : "bg-blue-500/10 text-blue-400 border-blue-500/25"
                      }`}>
                        {systemStatus?.isOnlineCloud ? <Cloud className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">
                            {systemStatus?.platformName || "Detectando Servidor..."}
                          </h4>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            systemStatus?.isOnlineCloud
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-blue-500/15 text-blue-300 border-blue-500/30"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${systemStatus?.isOnlineCloud ? "bg-emerald-400 animate-pulse" : "bg-blue-400"}`} />
                            {systemStatus?.isOnlineCloud ? "ONLINE NA NUVEM" : "LOCAL (LOCALHOST)"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {systemStatus?.locationDetail || "Ambiente de execução Node.js"}
                        </p>
                      </div>
                    </div>

                    {pingMs !== null && (
                      <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 border-slate-800 pt-2 sm:pt-0">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Latência API</span>
                        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {pingMs} ms
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Informações Técnicas de Rede e Banco */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1.5">
                        <Globe className="w-3 h-3 text-slate-400" /> Domínio / Endereço Ativo
                      </span>
                      <p className="text-xs font-mono text-slate-200 font-bold truncate" title={systemStatus?.host || window.location.host}>
                        {systemStatus?.protocol || "https"}://{systemStatus?.host || window.location.host}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1.5">
                        <Database className="w-3 h-3 text-indigo-400" /> Armazenamento de Dados
                      </span>
                      <p className="text-xs font-bold text-slate-200 truncate">
                        {supabaseActive
                          ? "Supabase PostgreSQL (Nuvem)"
                          : "Base do Servidor (database.json)"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* GUIA DE AUTENTICAÇÃO E VERIFICAÇÃO DE E-MAIL (SUPABASE) */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Autenticação e Verificação de E-mail (Supabase)
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Para permitir que usuários criem contas <strong>sem precisar confirmar ou clicar em link no e-mail</strong>, configure as opções no painel do Supabase da seguinte forma:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
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
                      <UserIcon className="w-3.5 h-3.5 text-indigo-400" /> Detalhes do Usuário
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

            {activeTab === "reset" && (
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
