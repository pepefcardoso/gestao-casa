"use client";

import { Key, Loader2, Mail, Shield, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
import { useUser } from "../components/UserContext";

export default function RegisterPage(): React.JSX.Element {
  const { registerUser, user } = useUser();
  const router = useRouter();

  const [name, setName] = useState("");
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
    if (!name.trim() || !email.trim() || !password) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    if (name.trim().length < 2) {
      setError("O nome deve ter pelo menos 2 caracteres.");
      return;
    }

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await registerUser(name.trim(), email.trim(), password);
      if (result.success) {
        router.push("/dashboard");
      } else {
        setError(result.error || "Erro ao criar conta.");
      }
    } catch (err) {
      console.error(err);
      setError("Erro de conexão. Tente novamente mais tarde.");
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
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800">Criar Conta Grátis</h2>
          <p className="text-xs sm:text-sm text-slate-400 font-semibold uppercase tracking-wider">
            Gestão Casa
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs sm:text-sm rounded-lg font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name input */}
          <div className="space-y-1.5">
            <label
              htmlFor="name"
              className="block text-xs font-bold text-slate-500 uppercase tracking-wider"
            >
              Nome Completo
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                id="name"
                type="text"
                placeholder="Ex: Alice Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden transition-all text-slate-800"
                required
              />
            </div>
          </div>

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
              Senha (mínimo 8 caracteres)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Key className="w-4 h-4" />
              </span>
              <input
                id="password"
                type="password"
                placeholder="Mínimo 8 caracteres"
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
                Criando conta...
              </>
            ) : (
              "Criar Conta"
            )}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 font-medium border-t border-slate-100 pt-4">
          Já tem uma conta?{" "}
          <Link href="/login" className="text-emerald-600 hover:underline font-bold">
            Faça login aqui
          </Link>
        </div>
      </div>
    </div>
  );
}
