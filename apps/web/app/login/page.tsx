"use client";

import { ArrowRight, Key, Loader2, Mail, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
import PillarLogo from "../components/PillarLogo";
import { PRESET_USERS, useUser } from "../components/UserContext";

export default function LoginPage(): React.JSX.Element {
  const { login, user } = useUser();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await login(email.trim(), password);
      if (result.success) {
        router.push("/dashboard");
      } else {
        setError(result.error || "E-mail ou senha inválidos.");
      }
    } catch (err) {
      console.error(err);
      setError("Erro ao fazer login. Tente novamente mais tarde.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (presetUserEmail: string): Promise<void> => {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await login(presetUserEmail, "senha123");
      if (result.success) {
        router.push("/dashboard");
      } else {
        setError(result.error || "Erro no login rápido.");
      }
    } catch (err) {
      console.error(err);
      setError("Erro ao autenticar. Verifique se o banco de dados foi semeado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#f0f4f4] min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      {/* Decorative Blur */}
      <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-teal-200/30 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl shadow-xl p-6 sm:p-8 space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit mx-auto shadow-3xs">
            <PillarLogo className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800">Acessar Pillar</h2>
          <p className="text-xs sm:text-sm text-slate-400 font-semibold uppercase tracking-wider">
            Painel de Finanças & Estrutura
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs sm:text-sm rounded-lg font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email input */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-xs font-bold text-slate-500 uppercase tracking-wider"
            >
              E-mail
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Mail className="w-4 h-4" />
              </span>
              <input
                id="email"
                type="email"
                placeholder="Ex: alice@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden transition-all text-slate-800"
                required
              />
            </div>
          </div>

          {/* Password input */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-bold text-slate-500 uppercase tracking-wider"
            >
              Senha
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Key className="w-4 h-4" />
              </span>
              <input
                id="password"
                type="password"
                placeholder="Insira sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden transition-all text-slate-800"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/60 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando...
              </>
            ) : (
              "Entrar"
            )}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 font-medium border-t border-slate-100 pt-4">
          Não possui cadastro?{" "}
          <Link href="/register" className="text-emerald-600 hover:underline font-bold">
            Criar conta grátis
          </Link>
        </div>

        {/* Quick access dev section */}
        <div className="bg-slate-50/80 border border-slate-200/50 p-4 rounded-xl space-y-3">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Acesso Rápido (Ambiente de Testes)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {PRESET_USERS.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleQuickLogin(u.email)}
                disabled={isSubmitting}
                className="px-2 py-1.5 bg-white border border-slate-200 hover:border-emerald-500 text-[10px] font-bold text-slate-700 rounded-lg shadow-3xs cursor-pointer hover:bg-emerald-50/30 transition-all flex items-center justify-between"
              >
                <span>{u.name.split(" ")[0]}</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
              </button>
            ))}
          </div>
          <span className="block text-[9px] text-slate-400 leading-normal">
            * Senha padrão para todos os usuários de teste:{" "}
            <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-slate-600">
              senha123
            </code>
          </span>
        </div>
      </div>
    </div>
  );
}
