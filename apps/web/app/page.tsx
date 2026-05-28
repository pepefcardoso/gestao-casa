"use client";

import {
  ArrowRight,
  Calculator,
  CheckCircle,
  PiggyBank,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import type React from "react";
import { useState } from "react";
import { useUser } from "./components/UserContext";

export default function LandingPage(): React.JSX.Element {
  const { user } = useUser();

  // Interactive Live Calculator State
  const [propertyValue, setPropertyValue] = useState<number>(500000);
  const [downPayment, setDownPayment] = useState<number>(100000);
  const [interestRate, setInterestRate] = useState<number>(9.5);
  const [termMonths, setTermMonths] = useState<number>(360);
  const [amortizationSystem, setAmortizationSystem] = useState<"SAC" | "PRICE">("SAC");

  // Format currency
  const formatBRL = (value: number): string => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Live Simple Amortization Calculation
  const calculatePreview = (): {
    firstInstallment: number;
    lastInstallment: number;
    totalInterest: number;
    totalPaid: number;
  } => {
    const principal = propertyValue - downPayment;
    if (principal <= 0) {
      return { firstInstallment: 0, lastInstallment: 0, totalInterest: 0, totalPaid: 0 };
    }

    const monthlyRate = interestRate / 100 / 12;

    if (amortizationSystem === "SAC") {
      const monthlyAmortization = principal / termMonths;
      const firstInterest = principal * monthlyRate;
      const firstInstallment = monthlyAmortization + firstInterest;

      // Last installment interest
      const lastInterest = monthlyAmortization * monthlyRate;
      const lastInstallment = monthlyAmortization + lastInterest;

      // Total interest for SAC is (First Interest + Last Interest) * termMonths / 2
      const totalInterest = ((firstInterest + lastInterest) * termMonths) / 2;

      return {
        firstInstallment,
        lastInstallment,
        totalInterest,
        totalPaid: principal + totalInterest,
      };
    } else {
      // PRICE
      // PMT = P * (i * (1 + i)^n) / ((1 + i)^n - 1)
      let installment = 0;
      if (monthlyRate === 0) {
        installment = principal / termMonths;
      } else {
        installment =
          (principal * (monthlyRate * (1 + monthlyRate) ** termMonths)) /
          ((1 + monthlyRate) ** termMonths - 1);
      }

      const totalPaid = installment * termMonths;
      const totalInterest = totalPaid - principal;

      return {
        firstInstallment: installment,
        lastInstallment: installment,
        totalInterest,
        totalPaid,
      };
    }
  };

  const preview = calculatePreview();

  return (
    <div className="bg-canvas-frost min-h-screen selection:bg-brand-emerald selection:text-white overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none opacity-40 blur-3xl z-0">
        <div className="absolute top-[-10%] left-[5%] w-[40%] h-[60%] rounded-full bg-gradient-to-tr from-emerald-200 to-teal-100" />
        <div className="absolute top-[10%] right-[10%] w-[35%] h-[50%] rounded-full bg-gradient-to-tr from-emerald-300 to-indigo-100" />
      </div>

      <main className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-16 pb-24 space-y-24">
        {/* HERO SECTION */}
        <section className="text-center space-y-8 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-full text-emerald-600 text-xs font-semibold shadow-premium animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Controle Financeiro Inteligente de Obras & Imóveis</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-semibold text-text-primary tracking-tight leading-tight">
            Planeje, financie e gerencie o lar dos seus{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-emerald to-emerald-400">
              sonhos
            </span>
          </h1>

          <p className="text-sm sm:text-base text-text-muted max-w-2xl mx-auto leading-relaxed">
            Esqueça as planilhas confusas. Calcule simulações de financiamento amortizáveis,
            registre receitas e despesas por cômodo e planeje seu orçamento com clareza.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            {user ? (
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-8 py-3.5 bg-brand-emerald text-white rounded-full font-semibold shadow-premium hover:shadow-premium-hover hover:-translate-y-1 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                Acessar meu Painel
                <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="w-full sm:w-auto px-8 py-3.5 bg-brand-emerald text-white rounded-full font-semibold shadow-premium hover:shadow-premium-hover hover:-translate-y-1 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  Começar Grátis
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-8 py-3.5 bg-surface-white text-text-primary hover:bg-canvas-frost rounded-full font-semibold shadow-premium hover:shadow-premium-hover hover:-translate-y-1 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  Entrar na Conta
                </Link>
              </>
            )}
          </div>
        </section>

        {/* INTERACTIVE DEMO / FINANCIAL SIMULATOR SECTION */}
        <section className="bg-glass-surface backdrop-blur-xl rounded-3xl shadow-premium p-6 sm:p-10 space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-xl font-medium tracking-tight text-text-primary">
              Experimente em tempo real
            </h2>
            <p className="text-xs sm:text-sm text-text-muted">
              Ajuste as variáveis do seu financiamento e sinta o poder do nosso simulador matemático
              integrado direto no navegador.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Simulator Inputs (5 cols) */}
            <div className="lg:col-span-5 space-y-6 bg-canvas-frost/40 p-6 rounded-2xl">
              <h3 className="font-semibold text-text-primary text-xs uppercase tracking-wider flex items-center gap-2">
                <Calculator className="w-4.5 h-4.5 text-brand-emerald" />
                Parâmetros do Financiamento
              </h3>

              {/* Property Value Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  <span>Valor do Imóvel</span>
                  <span className="text-brand-emerald font-bold tabular-nums">
                    {formatBRL(propertyValue)}
                  </span>
                </div>
                <input
                  type="range"
                  min={100000}
                  max={2000000}
                  step={50000}
                  value={propertyValue}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setPropertyValue(val);
                    if (downPayment >= val) {
                      setDownPayment(val * 0.2); // keep 20% down payment
                    }
                  }}
                  className="w-full accent-brand-emerald cursor-pointer"
                />
              </div>

              {/* Down Payment Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  <span>Entrada</span>
                  <span className="text-brand-emerald font-bold tabular-nums">
                    {formatBRL(downPayment)} (<span className="tabular-nums">{Math.round((downPayment / propertyValue) * 100)}</span>%)
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={propertyValue - 50000}
                  step={10000}
                  value={downPayment}
                  onChange={(e) => setDownPayment(Number(e.target.value))}
                  className="w-full accent-brand-emerald cursor-pointer"
                />
              </div>

              {/* Interest Rate Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  <span>Taxa de Juros</span>
                  <span className="text-brand-emerald font-bold tabular-nums">{interestRate}% a.a.</span>
                </div>
                <input
                  type="range"
                  min={4.0}
                  max={16.0}
                  step={0.1}
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-full accent-brand-emerald cursor-pointer"
                />
              </div>

              {/* Term months input */}
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  <span>Prazo</span>
                  <span className="text-brand-emerald font-bold tabular-nums">
                    {termMonths} meses (<span className="tabular-nums">{Math.round(termMonths / 12)}</span> anos)
                  </span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={360}
                  step={12}
                  value={termMonths}
                  onChange={(e) => setTermMonths(Number(e.target.value))}
                  className="w-full accent-brand-emerald cursor-pointer"
                />
              </div>

              {/* Amortization System Toggle */}
              <div className="space-y-2">
                <span className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  Sistema de Amortização
                </span>
                <div className="grid grid-cols-2 gap-2 bg-canvas-frost p-1 rounded-full">
                  <button
                    type="button"
                    onClick={() => setAmortizationSystem("SAC")}
                    className={`py-2 px-3 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      amortizationSystem === "SAC"
                        ? "bg-surface-white text-brand-emerald shadow-premium"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    SAC (Amortização Constante)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmortizationSystem("PRICE")}
                    className={`py-2 px-3 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      amortizationSystem === "PRICE"
                        ? "bg-surface-white text-brand-emerald shadow-premium"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    Tabela PRICE (Parcelas Fixas)
                  </button>
                </div>
              </div>
            </div>

            {/* Simulator Outputs (7 cols) */}
            <div className="lg:col-span-7 bg-surface-white text-text-primary p-6 sm:p-8 rounded-3xl shadow-premium space-y-6">
              <h3 className="font-semibold text-brand-emerald text-xs uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4.5 h-4.5" />
                Projeção dos Resultados
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-canvas-frost/50 p-4 rounded-2xl">
                  <span className="block text-[10px] font-bold text-text-muted uppercase tracking-widest">
                    Primeira Parcela
                  </span>
                  <span className="text-xl sm:text-2xl font-semibold text-text-primary block mt-1 tabular-nums">
                    {formatBRL(preview.firstInstallment)}
                  </span>
                  <span className="text-[10px] text-text-muted block mt-1">
                    {amortizationSystem === "SAC"
                      ? "Amortização + juros iniciais"
                      : "Prestação constante"}
                  </span>
                </div>

                <div className="bg-canvas-frost/50 p-4 rounded-2xl">
                  <span className="block text-[10px] font-bold text-text-muted uppercase tracking-widest">
                    Última Parcela
                  </span>
                  <span className="text-xl sm:text-2xl font-semibold text-text-primary block mt-1 tabular-nums">
                    {formatBRL(preview.lastInstallment)}
                  </span>
                  <span className="text-[10px] text-text-muted block mt-1">
                    {amortizationSystem === "SAC" ? "Totalmente reduzida" : "Sem reajustes extras"}
                  </span>
                </div>
              </div>

              <div className="border-t border-canvas-frost pt-6 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-text-muted">Financiado (Principal):</span>
                  <span className="text-text-primary font-semibold tabular-nums">
                    {formatBRL(propertyValue - downPayment)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-text-muted">Total Pago em Juros:</span>
                  <span className="text-brand-emerald font-bold tabular-nums">
                    {formatBRL(preview.totalInterest)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-base font-semibold border-t border-dashed border-canvas-frost pt-4">
                  <span className="text-text-primary">Custo Total de Quitação:</span>
                  <span className="text-brand-emerald text-lg font-bold tabular-nums">
                    {formatBRL(preview.totalPaid)}
                  </span>
                </div>
              </div>

              <div className="bg-emerald-50 p-4 rounded-2xl flex gap-3 text-xs text-emerald-800 leading-relaxed">
                <CheckCircle className="w-5 h-5 text-brand-emerald shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-900 block mb-0.5">Dica Financeira</span>
                  No sistema <strong className="font-semibold">{amortizationSystem}</strong>, você pagará um total de{" "}
                  <strong className="font-semibold tabular-nums">{formatBRL(preview.totalInterest)}</strong> de juros ao banco. No painel
                  completo, você poderá adicionar amortizações extraordinárias e ver os juros caírem
                  instantaneamente!
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CORE FEATURES GRID */}
        <section className="space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-xl font-medium tracking-tight text-text-primary">
              Tudo o que você precisa para gerenciar sua residência
            </h2>
            <p className="text-xs sm:text-sm text-text-muted">
              Conheça os recursos exclusivos desenvolvidos para facilitar o controle financeiro de
              ponta a ponta.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-surface-white p-8 rounded-3xl space-y-4 shadow-premium transition-transform duration-300 hover:-translate-y-1 hover:shadow-premium-hover">
              <div className="p-3 bg-emerald-50 rounded-2xl text-brand-emerald w-fit">
                <Calculator className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-text-primary">Simulador de Amortização</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Calcule parcelas nos sistemas SAC e PRICE. Configure taxas, valores e veja o impacto
                real de amortizações antecipadas direto nos saldos devedores futuros.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-surface-white p-8 rounded-3xl space-y-4 shadow-premium transition-transform duration-300 hover:-translate-y-1 hover:shadow-premium-hover">
              <div className="p-3 bg-emerald-50 rounded-2xl text-brand-emerald w-fit">
                <PiggyBank className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-text-primary">Planejamento de Fluxo de Caixa</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Projete suas finanças com uma linha do tempo de 12 meses de receitas e despesas.
                Acompanhe o saldo líquido previsto mês a mês de forma intuitiva.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-surface-white p-8 rounded-3xl space-y-4 shadow-premium transition-transform duration-300 hover:-translate-y-1 hover:shadow-premium-hover">
              <div className="p-3 bg-emerald-50 rounded-2xl text-brand-emerald w-fit">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-text-primary">Colaboração de Perfis</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Compartilhe o acesso da residência com seu cônjuge, arquiteto ou investidor. Defina
                permissões exclusivas de Proprietário, Colaborador ou Visualizador.
              </p>
            </div>
          </div>
        </section>

        {/* CALL TO ACTION BOTTOM BANNER */}
        <section className="bg-gradient-to-r from-emerald-800 to-teal-700 text-white rounded-3xl shadow-premium p-8 sm:p-12 text-center space-y-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(52,211,153,0.15),transparent_50%)] pointer-events-none" />
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Pronto para assumir o controle?
          </h2>
          <p className="text-emerald-100 max-w-xl mx-auto text-xs sm:text-sm leading-relaxed">
            Cadastre-se hoje mesmo e comece a mapear seus investimentos, planejar cômodos e
            monitorar suas despesas imobiliárias em um só lugar.
          </p>
          <div className="pt-2">
            <Link
              href={user ? "/dashboard" : "/register"}
              className="inline-flex px-8 py-3.5 bg-surface-white text-emerald-800 hover:bg-canvas-frost rounded-full font-semibold transition-all duration-300 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 active:scale-95 items-center gap-2 cursor-pointer"
            >
              Começar Agora
              <ArrowRight className="w-4 h-4 text-emerald-800 font-bold" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-canvas-frost bg-surface-white py-8 text-center text-xs text-text-muted font-medium">
        <p>
          &copy; {new Date().getFullYear()} Gestão Casa. Todos os direitos reservados. Feito com
          tecnologia de ponta.
        </p>
      </footer>
    </div>
  );
}
