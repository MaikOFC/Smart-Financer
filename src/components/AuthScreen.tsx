import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Wallet,
  Mail,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  Database,
  AlertCircle,
  Server,
  DollarSign,
  HelpCircle,
  KeyRound,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import {
  isSupabaseConfigured,
  signInSupabase,
  signUpSupabase,
  sendPasswordResetEmail,
  updateUserPassword,
} from "../lib/supabaseService";
import { supabase } from "../lib/supabase";

interface AuthScreenProps {
  onSuccess: (
    token: string,
    user: { id: string; name: string; email: string; defaultSalary?: number },
    isNewRegistration?: boolean
  ) => void;
}

type AuthMode = "login" | "register" | "forgot-password" | "reset-password";

export default function AuthScreen({ onSuccess }: AuthScreenProps) {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const isLogin = authMode === "login";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forceLocalMode, setForceLocalMode] = useState(false);

  // Estados específicos de recuperação de senha
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  const supabaseActive = isSupabaseConfigured() && !forceLocalMode;

  // Detecta se o usuário clicou no link de recuperação de senha no e-mail
  useEffect(() => {
    try {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setAuthMode("reset-password");
          setError(null);
        }
      });

      if (typeof window !== "undefined" && window.location.hash) {
        const hash = window.location.hash;
        if (hash.includes("type=recovery") || hash.includes("access_token")) {
          setAuthMode("reset-password");
          setError(null);
        }
      }

      return () => {
        authListener?.subscription?.unsubscribe();
      };
    } catch (e) {
      console.warn("Aviso ao escutar eventos de recuperação:", e);
    }
  }, []);

  // Envio de formulário de Login e Cadastro
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

  // Solicitação de envio de link de recuperação por e-mail
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setForgotSuccess(null);
    setLoading(true);

    try {
      const targetEmail = forgotEmail.trim();
      if (!targetEmail) {
        throw new Error("Por favor, digite o endereço de e-mail cadastrado.");
      }

      if (supabaseActive) {
        await sendPasswordResetEmail(targetEmail);
      } else {
        const res = await fetch("/api/auth/reset-password-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: targetEmail }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Não foi possível enviar o e-mail.");
      }

      setForgotSuccess(
        `Link de recuperação enviado com sucesso para ${targetEmail}. Verifique sua caixa de entrada e a pasta de spam!`
      );
    } catch (err: any) {
      setError(err.message || "Erro ao solicitar recuperação de senha.");
    } finally {
      setLoading(false);
    }
  };

  // Cadastro da nova senha após clicar no link do e-mail
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!newPassword || newPassword.length < 6) {
        throw new Error("A nova senha deve ter no mínimo 6 caracteres.");
      }
      if (newPassword !== confirmPassword) {
        throw new Error("As senhas não coincidem. Certifique-se de digitar a mesma senha em ambos os campos.");
      }

      if (supabaseActive) {
        await updateUserPassword(newPassword);
      } else {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: forgotEmail || email, newPassword }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Não foi possível redefinir a senha.");
      }

      setResetSuccess(true);
      // Limpa fragmento da URL
      if (typeof window !== "undefined" && window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    } catch (err: any) {
      setError(err.message || "Erro ao cadastrar nova senha.");
    } finally {
      setLoading(false);
    }
  };

  // Login de Demonstração Rápido
  const handleDemoLogin = async () => {
    setError(null);
    setLoading(true);

    const demoEmail = "miqueias@demo.com";
    const demoName = "Miqueias";

    try {
      onSuccess(
        "demo-session-token",
        {
          id: "demo-user-id-miqueias",
          name: demoName,
          email: demoEmail,
          defaultSalary: 2500,
        },
        false
      );
    } catch (err: any) {
      setError(err.message || "Erro ao efetuar login demonstrativo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 pt-[max(3rem,env(safe-area-inset-top,0px))] pb-[max(3rem,env(safe-area-inset-bottom,0px))] relative overflow-hidden font-sans">
      {/* Background radial highlight */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-lg z-10"
      >
        {/* LOGO (Clique para Demo) */}
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
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </button>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-1.5 justify-center">
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
          {/* MENSAGEM DE ERRO */}
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

          {/* CENÁRIO 1: LOGIN OU REGISTRO */}
          {(authMode === "login" || authMode === "register") && (
            <div>
              {/* TABS LOGIN / REGISTRO */}
              <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800/60 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
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
                  type="button"
                  onClick={() => {
                    setAuthMode("register");
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

                  {/* BOTÃO ESQUECEU A SENHA (LOGO ABAIXO DO CAMPO DE SENHA À DIREITA) */}
                  {isLogin && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setForgotEmail(email);
                          setError(null);
                          setForgotSuccess(null);
                          setAuthMode("forgot-password");
                        }}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors cursor-pointer"
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                  )}
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
          )}

          {/* CENÁRIO 2: RECUPERAÇÃO DE SENHA (FORGOT PASSWORD) */}
          {authMode === "forgot-password" && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-5"
            >
              <div className="flex items-center gap-3 pb-2 border-b border-slate-800">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Recuperar Senha</h3>
                  <p className="text-[11px] text-slate-400">
                    Enviaremos um link de confirmação para o seu e-mail.
                  </p>
                </div>
              </div>

              {forgotSuccess ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-200 leading-relaxed">
                      {forgotSuccess}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                    Clique no link recebido no seu e-mail para abrir a tela de cadastro da nova senha.
                  </p>

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotSuccess(null);
                        setError(null);
                      }}
                      className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Enviar para outro e-mail
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("login");
                        setError(null);
                        setForgotSuccess(null);
                      }}
                      className="w-full py-2.5 px-4 text-indigo-400 hover:text-indigo-300 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Voltar para o Login</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Seu E-mail Cadastrado
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        placeholder="exemplo@email.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 px-4 py-3 pl-11 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none mt-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Enviando link...</span>
                      </>
                    ) : (
                      <>
                        <span>Enviar Link de Recuperação</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("login");
                        setError(null);
                        setForgotSuccess(null);
                      }}
                      className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer font-medium"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Voltar para a tela de login</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          )}

          {/* CENÁRIO 3: REDEFINIÇÃO DE SENHA (RESET PASSWORD APÓS LINK) */}
          {authMode === "reset-password" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-5"
            >
              <div className="flex items-center gap-3 pb-2 border-b border-slate-800">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Cadastrar Nova Senha</h3>
                  <p className="text-[11px] text-slate-400">
                    Defina sua nova senha para acessar sua conta com segurança.
                  </p>
                </div>
              </div>

              {resetSuccess ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-200 leading-relaxed">
                      Sua senha foi atualizada com sucesso! Você já pode entrar com sua nova senha.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                      setError(null);
                      setResetSuccess(false);
                      setPassword("");
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <span>Fazer Login com Nova Senha</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Nova Senha
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="password"
                        required
                        placeholder="Mínimo de 6 caracteres"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 px-4 py-3 pl-11 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Confirmar Nova Senha
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="password"
                        required
                        placeholder="Repita a nova senha"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 px-4 py-3 pl-11 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none mt-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Salvando nova senha...</span>
                      </>
                    ) : (
                      <>
                        <span>Salvar Nova Senha</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("login");
                        setError(null);
                      }}
                      className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer font-medium"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Cancelar e voltar ao login</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          )}
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
