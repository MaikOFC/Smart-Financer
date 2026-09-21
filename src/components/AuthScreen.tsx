import React, { useState } from "react";
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
} from "lucide-react";
import { isSupabaseConfigured, signInSupabase, signUpSupabase } from "../lib/supabaseService";

interface AuthScreenProps {
  onSuccess: (
    token: string,
    user: { id: string; name: string; email: string; defaultSalary?: number },
    isNewRegistration?: boolean
  ) => void;
}

export default function AuthScreen({ onSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forceLocalMode, setForceLocalMode] = useState(false);

  const supabaseActive = isSupabaseConfigured() && !forceLocalMode;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

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
          const result = await signInSupabase(email, password);
          token = result.token;
          user = result.user;
        } else {
          // Default initial salary 2500, will be configured in onboarding popup right after
          const result = await signUpSupabase(name, email, password, 2500);
          token = result.token;
          user = result.user;
        }
      } else {
        // --- LOCAL NODE EXPRESS SERVER AUTH ---
        const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
        const body = isLogin
          ? { email: email.trim().toLowerCase(), password }
          : { name: name.trim(), email: email.trim().toLowerCase(), password, initialSalary: 2500 };

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

      onSuccess(token, user, !isLogin);
    } catch (err: any) {
      setError(err.message || "Erro ao processar autenticação.");
    } finally {
      setLoading(false);
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
      }, false);
    } catch (err: any) {
      setError(err.message || "Erro ao efetuar login demonstrativo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 pt-[max(3rem,env(safe-area-inset-top,0px))] pb-[max(3rem,env(safe-area-inset-bottom,0px))] relative overflow-hidden">
      {/* Background radial highlight */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-lg z-10"
      >
        {/* LOGO (Botão escondido de Demo) */}
        <div className="flex flex-col items-center mb-6 text-center">
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-16 h-16 p-2 bg-emerald-500/10 rounded-3xl border border-emerald-500/25 mb-3 shadow-lg shadow-emerald-500/5 hover:bg-emerald-500/20 hover:border-emerald-400 hover:scale-105 active:scale-95 transition-all cursor-pointer group relative flex items-center justify-center overflow-hidden"
            title="SmartFinancer"
          >
            <img
              src="/logo.png"
              alt="SmartFinancer Logo"
              className="w-11 h-11 object-contain group-hover:scale-110 transition-transform drop-shadow-sm"
              onError={(e) => {
                // fallback se imagem falhar
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </button>
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

            {/* BOTÃO SUBMIT */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Carregando...</span>
                </>
              ) : (
                <>
                  {isLogin ? "Acessar Carteira" : "Criar Minha Conta"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
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
