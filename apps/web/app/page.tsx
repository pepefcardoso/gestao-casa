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

  // Format currency with tabular numerals
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

      const lastInterest = monthlyAmortization * monthlyRate;
      const lastInstallment = monthlyAmortization + lastInterest;

      const totalInterest = ((firstInterest + lastInterest) * termMonths) / 2;

      return {
        firstInstallment,
        lastInstallment,
        totalInterest,
        totalPaid: principal + totalInterest,
      };
    } else {
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
    <div className="bg-[#F5F5F7] min-h-screen font-sans selection:bg-[#10B981] selection:text-white overflow-hidden antialiased">
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none opacity-40 blur-3xl z-0">
        <div className="absolute top-[-10%] left-[5%] w-[40%] h-[60%] rounded-full bg-gradient-to-tr from-emerald-200 to-teal-100" />
        <div className="absolute top-[10%] right-[10%] w-[35%] h-[50%] rounded-full bg-gradient-to-tr from-emerald-300 to-indigo-100" />
      </div>

      <main className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-24 space-y-24">
        {/* HERO SECTION */}
        <section className="text-center space-y-6 max-w-4xl mx-auto">
          {/* Soft Badge Notification */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 rounded-full text-[#10B981] text-xs font-semibold tracking-tight transition-transform duration-300 hover:scale-102">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Controle Financeiro Inteligente de Obras & Imóveis</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-semibold text-[#1D1D1F] tracking-tight leading-tight">
            Planeje, financie e gerencie o lar dos seus{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#10B981] to-emerald-400">
              sonhos
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-[#86868B] max-w-2xl mx-auto leading-relaxed">
            Esqueça as planilhas confusas. Calcule simulações de financiamento amortizáveis,
            registre receitas e despesas por cômodo e planeje seu orçamento com clareza.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
            {user ? (
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-8 py-3.5 bg-[#10B981] text-white rounded-full font-semibold shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                Acessar meu Painel
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#10B981] text-white rounded-full font-semibold shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  Começar Grátis
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#FFFFFF] text-[#1D1D1F] rounded-full font-semibold shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  Entrar na Conta
                </Link>
              </>
            )}
          </div>
        </section>

        {/* INTERACTIVE DEMO / FINANCIAL SIMULATOR SECTION */}
        <section className="bg-[#FFFFFF]/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-10 space-y-10 transition-all duration-300 hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)]">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-xl font-medium tracking-tight text-[#1D1D1F]">
              Experimente em tempo real
            </h2>
            <p className="text-xs text-[#86868B]">
              Ajuste as variáveis do seu financiamento e sinta o poder do nosso simulador matemático
              integrado direto no navegador.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Simulator Inputs (5 cols) */}
            <div className="lg:col-span-5 space-y-6 bg-[#F5F5F7]/60 p-6 rounded-2xl">
              <h3 className="font-semibold text-[#1D1D1F] text-xs uppercase tracking-wider flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#10B981]" />
                Parâmetros do Financiamento
              </h3>

              {/* Property Value Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
                  <span>Valor do Imóvel</span>
                  <span className="text-[#10B981] font-semibold tabular-nums">
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
                      setDownPayment(val * 0.2);
                    }
                  }}
                  className="w-full accent-[#10B981] bg-gray-200 h-1 rounded-full appearance-none cursor-pointer"
                />
              </div>

              {/* Down Payment Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
                  <span>Entrada</span>
                  <span className="text-[#10B981] font-semibold tabular-nums">
                    {formatBRL(downPayment)} (
                    <span className="tabular-nums">
                      {Math.round((downPayment / propertyValue) * 100)}
                    </span>
                    %)
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={propertyValue - 50000}
                  step={10000}
                  value={downPayment}
                  onChange={(e) => setDownPayment(Number(e.target.value))}
                  className="w-full accent-[#10B981] bg-gray-200 h-1 rounded-full appearance-none cursor-pointer"
                />
              </div>

              {/* Interest Rate Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
                  <span>Taxa de Juros</span>
                  <span className="text-[#10B981] font-semibold tabular-nums">
                    {interestRate}% a.a.
                  </span>
                </div>
                <input
                  type="range"
                  min={4.0}
                  max={16.0}
                  step={0.1}
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-full accent-[#10B981] bg-gray-200 h-1 rounded-full appearance-none cursor-pointer"
                />
              </div>

              {/* Term months input */}
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
                  <span>Prazo</span>
                  <span className="text-[#10B981] font-semibold tabular-nums">
                    {termMonths} meses (
                    <span className="tabular-nums">{Math.round(termMonths / 12)}</span> anos)
                  </span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={360}
                  step={12}
                  value={termMonths}
                  onChange={(e) => setTermMonths(Number(e.target.value))}
                  className="w-full accent-[#10B981] bg-gray-200 h-1 rounded-full appearance-none cursor-pointer"
                />
              </div>

              {/* Amortization System Toggle */}
              <div className="space-y-2">
                <span className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
                  Sistema de Amortização
                </span>
                <div className="grid grid-cols-2 gap-1 bg-[#F5F5F7] p-1 rounded-full">
                  <button
                    type="button"
                    onClick={() => setAmortizationSystem("SAC")}
                    className={`py-2 px-3 rounded-full text-xs font-medium transition-all active:scale-95 cursor-pointer ${
                      amortizationSystem === "SAC"
                        ? "bg-[#FFFFFF] text-[#10B981] shadow-[0_8px_30px_rgb(0,0,0,0.04)] font-semibold"
                        : "text-[#86868B] hover:text-[#1D1D1F]"
                    }`}
                  >
                    SAC
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmortizationSystem("PRICE")}
                    className={`py-2 px-3 rounded-full text-xs font-medium transition-all active:scale-95 cursor-pointer ${
                      amortizationSystem === "PRICE"
                        ? "bg-[#FFFFFF] text-[#10B981] shadow-[0_8px_30px_rgb(0,0,0,0.04)] font-semibold"
                        : "text-[#86868B] hover:text-[#1D1D1F]"
                    }`}
                  >
                    PRICE
                  </button>
                </div>
              </div>
            </div>

            {/* Simulator Outputs (7 cols) */}
            <div className="lg:col-span-7 bg-[#FFFFFF] text-[#1D1D1F] p-6 sm:p-8 rounded-3xl space-y-6">
              <h3 className="font-semibold text-[#10B981] text-xs uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Projeção dos Resultados
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#F5F5F7]/50 p-5 rounded-2xl">
                  <span className="block text-[10px] font-bold text-[#86868B] uppercase tracking-widest">
                    Primeira Parcela
                  </span>
                  <span className="text-xl sm:text-2xl font-semibold text-[#1D1D1F] block mt-1 tabular-nums">
                    {formatBRL(preview.firstInstallment)}
                  </span>
                  <span className="text-[10px] text-[#86868B] block mt-1.5">
                    {amortizationSystem === "SAC"
                      ? "Amortização + juros iniciais"
                      : "Prestação constante"}
                  </span>
                </div>

                <div className="bg-[#F5F5F7]/50 p-5 rounded-2xl">
                  <span className="block text-[10px] font-bold text-[#86868B] uppercase tracking-widest">
                    Última Parcela
                  </span>
                  <span className="text-xl sm:text-2xl font-semibold text-[#1D1D1F] block mt-1 tabular-nums">
                    {formatBRL(preview.lastInstallment)}
                  </span>
                  <span className="text-[10px] text-[#86868B] block mt-1.5">
                    {amortizationSystem === "SAC" ? "Totalmente reduzida" : "Sem reajustes extras"}
                  </span>
                </div>
              </div>

              <div className="pt-2 space-y-3.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#86868B]">Financiado (Principal):</span>
                  <span className="text-[#1D1D1F] font-medium tabular-nums">
                    {formatBRL(propertyValue - downPayment)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#86868B]">Total Pago em Juros:</span>
                  <span className="text-[#10B981] font-semibold tabular-nums">
                    {formatBRL(preview.totalInterest)}
                  </span>
                </div>
                <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent my-2" />
                <div className="flex justify-between items-center text-base font-semibold pt-1">
                  <span className="text-[#1D1D1F]">Custo Total de Quitação:</span>
                  <span className="text-[#10B981] text-lg font-bold tabular-nums">
                    {formatBRL(preview.totalPaid)}
                  </span>
                </div>
              </div>

              {/* Gentle Pastel Semantic Alert Box */}
              <div className="bg-emerald-50/70 p-4 rounded-2xl flex gap-3 text-xs text-emerald-800 leading-relaxed">
                <CheckCircle className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-900 block mb-0.5">
                    Insight do Simulador
                  </span>
                  No sistema <strong className="font-semibold">{amortizationSystem}</strong>, o
                  encargo de juros acumulado soma{" "}
                  <strong className="font-semibold tabular-nums">
                    {formatBRL(preview.totalInterest)}
                  </strong>
                  . No ecossistema completo, reduza este saldo instantaneamente simulando
                  amortizações sazonais.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CORE FEATURES GRID */}
        <section className="space-y-12">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-xl font-medium tracking-tight text-[#1D1D1F]">
              Arquitetura modular para sua gestão patrimonial
            </h2>
            <p className="text-xs text-[#86868B]">
              Recursos refinados desenvolvidos para sanar a complexidade do controle financeiro
              imobiliário.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-[#FFFFFF] p-8 rounded-3xl space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] group">
              <div className="p-3 bg-emerald-50 rounded-2xl text-[#10B981] w-fit transition-transform duration-300 group-hover:scale-110">
                <Calculator className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-[#1D1D1F]">Métricas de Amortização</h3>
              <p className="text-xs text-[#86868B] leading-relaxed">
                Alterne dinamicamente entre cronogramas SAC e PRICE. Monitore taxas administrativas
                e planeje o abatimento real do saldo devedor.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#FFFFFF] p-8 rounded-3xl space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] group">
              <div className="p-3 bg-emerald-50 rounded-2xl text-[#10B981] w-fit transition-transform duration-300 group-hover:scale-110">
                <PiggyBank className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-[#1D1D1F]">Fluxo de Caixa Preditivo</h3>
              <p className="text-xs text-[#86868B] leading-relaxed">
                Estruture suas obrigações financeiras em uma linha temporal de disclosure
                progressivo, mitigando riscos de liquidez mês a mês.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-[#FFFFFF] p-8 rounded-3xl space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] group">
              <div className="p-3 bg-emerald-50 rounded-2xl text-[#10B981] w-fit transition-transform duration-300 group-hover:scale-110">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-[#1D1D1F]">Ambientes Colaborativos</h3>
              <p className="text-xs text-[#86868B] leading-relaxed">
                Conecte cônjuges, engenheiros ou arquitetos sob chaves de acesso segmentadas:
                Proprietário, Colaborador ou Leitor.
              </p>
            </div>
          </div>
        </section>

        {/* CALL TO ACTION BOTTOM BANNER */}
        <section className="bg-gradient-to-br from-emerald-900 to-teal-800 text-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 sm:p-14 text-center space-y-6 relative overflow-hidden transition-all duration-300 hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(52,211,153,0.15),transparent_50%)] pointer-events-none" />

          <div className="relative z-10 max-w-xl mx-auto space-y-4">
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
              Pronto para assumir o controle?
            </h2>
            <p className="text-emerald-100/90 text-xs sm:text-sm leading-relaxed">
              Cadastre-se hoje mesmo e comece a mapear seus investimentos, planejar cômodos e
              monitorar suas despesas imobiliárias em um só lugar.
            </p>
            <div className="pt-4">
              <Link
                href={user ? "/dashboard" : "/register"}
                className="inline-flex px-8 py-3.5 bg-[#FFFFFF] text-emerald-900 hover:bg-[#F5F5F7] rounded-full font-semibold transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-0.5 active:scale-95 items-center gap-2 cursor-pointer text-sm"
              >
                Começar Agora
                <ArrowRight className="w-4 h-4 text-emerald-900" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#FFFFFF] py-8 text-center text-xs text-[#86868B] font-medium tracking-tight">
        <p>
          &copy; {new Date().getFullYear()} Pillar. Todos os direitos reservados. Design
          Minimalista Premium.
        </p>
      </footer>
    </div>
  );
}
