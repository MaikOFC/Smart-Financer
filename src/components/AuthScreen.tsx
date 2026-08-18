import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Wallet,
  Mail,
  Lock,
  User,
  ArrowRight,
  Loader2,
  Sparkles,
  Database,
  AlertCircle,
  Server,
  DollarSign,
  HelpCircle,
  FileSpreadsheet,
  Upload,
  Image as ImageIcon,
  X,
  CheckCircle2,
} from "lucide-react";
import { isSupabaseConfigured, signInSupabase, signUpSupabase } from "../lib/supabaseService";
import { processImportFile } from "../utils/fileParser";
import { Transaction } from "../types";

interface AuthScreenProps {
  onSuccess: (
    token: string,
    user: { id: string; name: string; email: string; defaultSalary?: number },
    initialTransactions?: Transaction[]
  ) => void;
}

export default function AuthScreen({ onSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [initialSalary, setInitialSalary] = useState("2500");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [forceLocalMode, setForceLocalMode] = useState(false);
  
  // Registration initial import state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabaseActive = isSupabaseConfigured() && !forceLocalMode;

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
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const isImage = file.type.startsWith("image/");
    const isSpreadsheet =
      file.name.endsWith(".csv") ||
      file.name.endsWith(".xlsx") ||
      file.name.endsWith(".xls") ||
      file.type === "text/csv" ||
      file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    if (!isImage && !isSpreadsheet) {
      setError("Por favor, selecione uma planilha (.xlsx, .csv, .xls) ou foto/print de extrato.");
      return;
    }

    setSelectedFile(file);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setLoadingStep("");

    const parsedSalary = parseFloat(initialSalary) || 2500;

    try {
      let token = "";
      let user: { id: string; name: string; email: string; defaultSalary?: number } = {
        id: "",
        name: "",
        email: "",
      };

      if (supabaseActive) {
        // --- SUPABASE DIRECT AUTH ---
        if (isLogin) {
          setLoadingStep("Autenticando...");
          const result = await signInSupabase(email, password);
          token = result.token;
          user = result.user;
        } else {
          setLoadingStep("Criando sua conta...");
          const result = await signUpSupabase(name, email, password, parsedSalary);
          token = result.token;
          user = result.user;
        }
      } else {
        // --- LOCAL NODE EXPRESS SERVER AUTH ---
        const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
        const body = isLogin
          ? { email: email.trim().toLowerCase(), password }
          : { name: name.trim(), email: email.trim().toLowerCase(), password, initialSalary: parsedSalary };

        setLoadingStep(isLogin ? "Acessando conta..." : "Criando sua conta...");
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await response.json();
        if (!response.ok || data.error) {
          throw new Error(data.error || "Algo deu errado. Verifique suas credenciais.");
        }

        token = data.token;
        user = data.user;
      }

      // Se houver arquivo anexado no cadastro, processa a importação por IA
      let importedTransactions: Transaction[] | undefined = undefined;
      if (!isLogin && selectedFile) {
        try {
          setLoadingStep("Analisando planilha com IA...");
          importedTransactions = await processImportFile(selectedFile, (step) => setLoadingStep(step));
        } catch (importErr: any) {
          console.warn("Aviso na importação da planilha no registro:", importErr);
          // Não impede o cadastro, mas avisa
        }
      }

      onSuccess(token, user, importedTransactions);
    } catch (err: any) {
      setError(err.message || "Erro ao processar autenticação.");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setLoading(true);

    const demoEmail = "miqueias@demo.com";
    const demoName = "Miqueias";

    try {
      onSuccess("demo-session-token", {
        id: "demo-user-id-miqueias",
        name: demoName,
        email: demoEmail,
        defaultSalary: 2500,
      });
    } catch (err: any) {
      setError(err.message || "Erro ao efetuar login demonstrativo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background radial highlight */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-lg z-10"
      >
        {/* LOGO */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-3xl border border-emerald-500/25 mb-3 shadow-lg shadow-emerald-500/5">
            <Wallet className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight font-sans flex items-center gap-1.5 justify-center">
            Smart<span className="text-emerald-400">Financer</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium max-w-xs">
            Gerencie suas finanças, planilhas e relatórios inteligentes em tempo real.
          </p>

          {/* BADGE DE CONEXÃO DO BANCO */}
          <div className="mt-3 flex items-center justify-center gap-2">
            {supabaseActive ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold uppercase tracking-wider font-mono">
                <Database className="w-3 h-3" />
                Supabase Nuvem Conectado
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-[10px] font-bold uppercase tracking-wider font-mono">
                <Server className="w-3 h-3" />
                Modo Servidor Local
              </div>
            )}
          </div>
        </div>

        {/* CARD PRINCIPAL */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative">
          
          {/* TABS LOGIN / REGISTRO */}
          <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800/60 mb-6">
            <button
              onClick={() => {
                setIsLogin(true);
                setError(null);
              }}
              className={`py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                isLogin
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setError(null);
              }}
              className={`py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                !isLogin
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Criar Conta
            </button>
          </div>

          {/* MENSAGEM DE ERRO SIMPLES E CLARA */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{error}</p>
            </motion.div>
          )}

          {/* FORMULÁRIO */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 px-4 py-3 pl-11 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Endereço de E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="exemplo@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 px-4 py-3 pl-11 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="Sua senha secreta"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 px-4 py-3 pl-11 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                />
              </div>
            </div>

            {/* CAIXA DE PERGUNTA: ORÇAMENTO / SALÁRIO INICIAL */}
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl space-y-2.5 my-3 relative overflow-hidden"
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 shrink-0 mt-0.5">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-white tracking-tight">
                        Qual é o seu Salário / Entrada Mensal?
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      Esse valor será o seu orçamento base para os meses. Você poderá alterá-lo nas configurações sempre que seu salário mudar.
                    </p>
                  </div>
                </div>

                <div className="pt-1">
                  <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                    Valor Mensal Inicial (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-400 font-mono">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={initialSalary}
                      onChange={(e) => setInitialSalary(e.target.value)}
                      placeholder="Ex: 2500,00"
                      className="w-full bg-slate-950 border border-emerald-500/40 px-4 py-2.5 pl-10 rounded-xl text-sm font-mono font-bold text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* CAIXA DE IMPORTAÇÃO INICIAL (OPCIONAL) */}
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="p-4 bg-indigo-950/20 border border-indigo-500/30 rounded-2xl space-y-3 my-3 relative overflow-hidden"
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30 shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white tracking-tight">
                        Importar Planilha ou Print Inicial?
                      </span>
                      <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full font-bold border border-indigo-500/20">
                        Opcional
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      Se você já possui uma planilha (Excel/CSV) ou fotos de faturas e comprovantes, adicione aqui para a IA cadastrar suas despesas automaticamente.
                    </p>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, .xlsx, .xls, image/*"
                  className="hidden"
                  onChange={handleFileInputChange}
                />

                {!selectedFile ? (
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border border-dashed rounded-xl p-3.5 flex flex-col items-center justify-center cursor-pointer transition-all ${
                      dragActive
                        ? "border-indigo-500 bg-indigo-500/10"
                        : "border-slate-800 hover:border-indigo-500/50 hover:bg-slate-950/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <Upload className="w-3.5 h-3.5 text-indigo-400" />
                      <ImageIcon className="w-4 h-4 text-indigo-400" />
                    </div>
                    <p className="text-[11px] font-medium text-slate-300">
                      <span className="text-indigo-400 font-bold">Clique</span> ou arraste sua planilha / print
                    </p>
                    <p className="text-[10px] text-slate-500">.xlsx, .csv, .xls, PNG, JPG</p>
                  </div>
                ) : (
                  <div className="bg-slate-950/70 border border-indigo-500/30 rounded-xl p-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg">
                        {selectedFile.type.startsWith("image/") ? (
                          <ImageIcon className="w-4 h-4" />
                        ) : (
                          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-200 truncate">{selectedFile.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {(selectedFile.size / 1024).toFixed(1)} KB • Pronto para importar
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                      title="Remover arquivo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* BOTÃO SUBMIT */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{loadingStep || "Processando..."}</span>
                </>
              ) : (
                <>
                  {isLogin ? "Acessar Carteira" : "Criar Minha Conta"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* DIVIDER */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
              <span className="bg-slate-900 px-3 text-slate-500">Ou use a demonstração</span>
            </div>
          </div>

          {/* DEMO BUTTON */}
          <button
            type="button"
            disabled={loading}
            onClick={handleDemoLogin}
            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shadow-slate-950"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            Entrar como Miqueias (Demo)
          </button>
        </div>

        {/* FOOTER */}
        <div className="mt-6 text-center">
          <p className="text-[10px] text-slate-600 font-mono">
            Dados sincronizados com segurança no Supabase.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
