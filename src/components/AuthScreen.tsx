import React, { useState } from "react";
import { motion } from "motion/react";
import { Wallet, Mail, Lock, User, KeyRound, ArrowRight, Loader2, Sparkles, Database } from "lucide-react";
import { isSupabaseConfigured, signInSupabase, signUpSupabase } from "../lib/supabaseService";

interface AuthScreenProps {
  onSuccess: (token: string, user: { id: string; name: string; email: string }) => void;
}

export default function AuthScreen({ onSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabaseActive = isSupabaseConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (supabaseActive) {
        // --- SUPABASE DIRECT AUTH ---
        if (isLogin) {
          const result = await signInSupabase(email, password);
          onSuccess(result.token, result.user);
        } else {
          const result = await signUpSupabase(name, email, password);
          onSuccess(result.token, result.user);
        }
      } else {
        // --- LOCAL NODE EXPRESS SERVER AUTH ---
        const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
        const body = isLogin ? { email, password } : { name, email, password };

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await response.json();
        if (!response.ok || data.error) {
          throw new Error(data.error || "Algo deu errado. Verifique suas credenciais.");
        }

        onSuccess(data.token, data.user);
      }
    } catch (err: any) {
      setError(err.message || "Erro desconhecido ao processar autenticação.");
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
      // Direct offline local session for guaranteed access (bypassing Supabase errors/secrets)
      onSuccess("demo-session-token", {
        id: "demo-user-id-miqueias",
        name: demoName,
        email: demoEmail,
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
        className="w-full max-w-md z-10"
      >
        {/* LOGO */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-3xl border border-indigo-500/25 mb-4 shadow-lg shadow-indigo-500/5">
            <Wallet className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight font-sans">
            Finanças Pessoais
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium max-w-xs">
            Acesse seu gerenciador financeiro com tabelas e relatórios completos.
          </p>
          
          {/* BADGE DE CONEXÃO DO BANCO */}
          <div className="mt-4 flex items-center justify-center">
            {supabaseActive ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold uppercase tracking-wider font-mono">
                <Database className="w-3 h-3" />
                Supabase Conectado (Seguro & Individual)
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/50 text-slate-400 text-[10px] font-bold uppercase tracking-wider font-mono">
                <Database className="w-3 h-3" />
                Servidor Local (Modo Desenvolvedor)
              </div>
            )}
          </div>
        </div>

        {/* CARD PRINCIPAL */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative">
          
          {/* TABS LOGIN / REGISTRO */}
          <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800/60 mb-6">
            <button
              onClick={() => {
                setIsLogin(true);
                setError(null);
              }}
              className={`py-2 px-3 text-xs font-bold rounded-xl transition-all ${
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
              className={`py-2 px-3 text-xs font-bold rounded-xl transition-all ${
                !isLogin
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Criar Conta
            </button>
          </div>

          {/* MENSAGEM DE ERRO */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl text-xs font-medium"
            >
              {error}
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
                  Carregando...
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
            Dados salvos com segurança de forma dedicada.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
