import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Wallet,
  Mail,
  Lock,
  User,
  KeyRound,
  ArrowRight,
  Loader2,
  Sparkles,
  Database,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Server,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
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
  const [showEmailGuide, setShowEmailGuide] = useState(false);
  const [forceLocalMode, setForceLocalMode] = useState(false);

  const supabaseActive = isSupabaseConfigured() && !forceLocalMode;

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
          if (result.isEmailConfirmationPending) {
            setError(
              "EMAIL_NOT_CONFIRMED: Conta criada! No entanto, o seu Supabase está configurado para exigir confirmação de e-mail. Para desativar a verificação e entrar direto sem confirmar e-mail: Acesse Supabase > Authentication > Providers > Email e DESATIVE 'Confirm email'."
            );
            return;
          }
          onSuccess(result.token, result.user);
        }
      } else {
        // --- LOCAL NODE EXPRESS SERVER AUTH ---
        const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
        const body = isLogin
          ? { email: email.trim().toLowerCase(), password }
          : { name: name.trim(), email: email.trim().toLowerCase(), password };

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

  const handleLocalFallbackSignup = async () => {
    setError(null);
    setLoading(true);
    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const body = isLogin
        ? { email: email.trim().toLowerCase(), password }
        : { name: (name || "Usuário").trim(), email: email.trim().toLowerCase(), password };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Erro ao autenticar no servidor local.");
      }

      onSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || "Erro ao efetuar autenticação local.");
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
      });
    } catch (err: any) {
      setError(err.message || "Erro ao efetuar login demonstrativo.");
    } finally {
      setLoading(false);
    }
  };

  const isEmailDisabledError = error?.includes("EMAIL_SIGNUPS_DISABLED") || error?.toLowerCase().includes("email signups are disabled");
  const isEmailNotConfirmedError = error?.includes("EMAIL_NOT_CONFIRMED") || error?.toLowerCase().includes("email not confirmed");

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
          <div className="relative mb-3 group">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-green-500 rounded-3xl blur-md opacity-30 group-hover:opacity-60 transition duration-500" />
            <div className="relative p-2.5 bg-slate-900/90 rounded-3xl border border-emerald-500/30 shadow-2xl shadow-emerald-500/10 flex items-center justify-center">
              <img
                src="/logosmartfincancer.png"
                alt="SmartFinancer Logo"
                className="w-16 h-16 object-contain rounded-2xl drop-shadow-md"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>
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
                Modo Servidor Local (Sem E-mail)
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

          {/* MENSAGEM DE ERRO DETALHADA E INTELIGENTE */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-4 bg-red-500/10 border border-red-500/30 text-red-300 rounded-2xl text-xs space-y-3"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-red-200">
                    {isEmailDisabledError
                      ? "Provedor de E-mail Desativado no Supabase"
                      : isEmailNotConfirmedError
                      ? "Confirmação de E-mail Pendente no Supabase"
                      : "Erro de Autenticação"}
                  </p>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    {error.replace(/^(EMAIL_SIGNUPS_DISABLED:|EMAIL_NOT_CONFIRMED:)\s*/, "")}
                  </p>
                </div>
              </div>

              {/* GUIA VISUAL SE FOR ERRO DE CONFIGURAÇÃO DO SUPABASE */}
              {(isEmailDisabledError || isEmailNotConfirmedError) && (
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2 text-[11px] text-slate-300">
                  <p className="font-bold text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Como ajustar no painel do Supabase:
                  </p>
                  <ol className="list-decimal pl-4 space-y-1 text-slate-300">
                    <li>
                      Acesse <strong>Authentication</strong> ➔ <strong>Providers</strong> ➔ <strong>Email</strong> no Supabase.
                    </li>
                    <li className="text-emerald-400">
                      <strong>Enable Email provider</strong>: deixe <strong>ATIVADO (ON)</strong>.
                    </li>
                    <li className="text-sky-400">
                      <strong>Confirm email</strong>: deixe <strong>DESATIVADO (OFF)</strong> para permitir criar conta direto sem checar e-mail.
                    </li>
                    <li>Clique em <strong>Save</strong>.</li>
                  </ol>
                </div>
              )}

              {/* OPÇÃO DE FALLBACK IMEDIATO NO SERVIDOR LOCAL */}
              <div className="pt-1 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleLocalFallbackSignup}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-3 rounded-xl transition-all text-xs flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer shadow-sm"
                >
                  <Server className="w-3.5 h-3.5 text-indigo-400" />
                  {isLogin ? "Entrar via Servidor Local" : "Criar Conta Localmente (Sem Bloqueio)"}
                </button>
              </div>
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

          {/* DICA EXPANSÍVEL: COMO CRIAR CONTA SEM VERIFICAR E-MAIL */}
          <div className="mt-5 border border-slate-800/80 rounded-2xl bg-slate-950/60 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowEmailGuide(!showEmailGuide)}
              className="w-full p-3 flex items-center justify-between text-left text-xs text-slate-400 hover:text-slate-200 transition-all cursor-pointer font-medium"
            >
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-400">
                <HelpCircle className="w-3.5 h-3.5" />
                Criar conta sem verificar e-mail no Supabase?
              </span>
              {showEmailGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showEmailGuide && (
              <div className="p-3.5 pt-0 text-[11px] text-slate-300 border-t border-slate-800/60 space-y-2">
                <p className="text-slate-400">
                  No painel do Supabase, existem <strong>dois interruptores separados</strong> em <em>Authentication ➔ Providers ➔ Email</em>:
                </p>
                <div className="space-y-1.5 pl-1">
                  <div className="flex items-start gap-2 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-emerald-300">Enable Email provider: ATIVADO (ON)</strong>
                      <p className="text-[10px] text-slate-300">Permite que as pessoas façam cadastro com e-mail e senha.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 bg-sky-500/10 p-2 rounded-xl border border-sky-500/20">
                    <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-sky-300">Confirm email: DESATIVADO (OFF)</strong>
                      <p className="text-[10px] text-slate-300">Permite criar contas instantaneamente sem precisar clicar no link do e-mail!</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

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
