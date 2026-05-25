"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  Home,
  AlertTriangle,
  CreditCard,
} from "lucide-react";
import {
  type FinancingInstallment,
  calculateFinancing,
} from "../../../../libs/shared-logic/src/utils/calculate-financing";

const FALLBACK_HOUSE_ID = "9519c5f5-e74b-49dc-88d9-e484fda2c3c2";

interface Expense {
  id: string;
  roomId: string | null;
  description: string;
  totalAmount: string;
  installmentsCount: number;
  status: "BUDGET" | "CONFIRMED";
  category: "TAX" | "PRODUCT" | "SERVICE" | "FURNITURE" | "APPLIANCE" | "RENOVATION";
  priority: "HIGH" | "MEDIUM" | "LOW";
  dueDate: string;
  createdAt: string;
}

interface FinancingRecord {
  id: string;
  houseId: string;
  propertyValue: string;
  downPayment: string;
  termMonths: number;
  interestRate: string;
  amortizationSystem: "SAC" | "PRICE";
  firstParcelOverride: string | null;
  lastParcelOverride: string | null;
  createdAt: string;
}

interface MonthCol {
  key: string; // "YYYY-MM"
  label: string; // "Mai/26"
  year: number;
  month: number; // 0-11
}

interface AggregatedMonthData {
  key: string;
  label: string;
  year: number;
  month: number;
  financingInstallment: number | null;
  confirmedSum: number;
  budgetSum: number;
  totalOutflow: number;
}

export default function DashboardPage(): React.JSX.Element {
  const [financingRecord, setFinancingRecord] = useState<FinancingRecord | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Fetch financing and expense data in parallel
  const fetchData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [financingRes, expensesRes] = await Promise.all([
        fetch(`/api/financing/${FALLBACK_HOUSE_ID}`),
        fetch("/api/expenses"),
      ]);

      if (financingRes.ok) {
        const finData: unknown = await financingRes.json();
        setFinancingRecord(finData as FinancingRecord);
      } else if (financingRes.status === 404) {
        setFinancingRecord(null);
      } else {
        console.warn("Financing record fetch returned status:", financingRes.status);
      }

      if (expensesRes.ok) {
        const expData: unknown = await expensesRes.json();
        setExpenses(expData as Expense[]);
      } else {
        setErrorMsg("Erro ao carregar despesas.");
      }
    } catch (err) {
      setErrorMsg("Erro ao conectar ao servidor.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect((): void => {
    setIsMounted(true);
    fetchData();
  }, [fetchData]);

  // Generate 12 months from current month forward
  const columns = useMemo((): MonthCol[] => {
    if (!isMounted) return [];

    const now = new Date();
    const startYear = now.getFullYear();
    const startMonth = now.getMonth();

    const list: MonthCol[] = [];
    for (let i = 0; i < 12; i++) {
      const targetDate = new Date(startYear, startMonth + i, 1);
      const y = targetDate.getFullYear();
      const m = targetDate.getMonth();
      const key = `${y}-${String(m + 1).padStart(2, "0")}`;

      const label = targetDate.toLocaleDateString("pt-BR", {
        month: "short",
        year: "2-digit",
      });
      const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);

      list.push({
        key,
        label: formattedLabel,
        year: y,
        month: m,
      });
    }
    return list;
  }, [isMounted]);

  // Calculate financing schedule if financing record exists
  const financingInstallments = useMemo((): FinancingInstallment[] => {
    if (!financingRecord) return [];

    return calculateFinancing({
      propertyValue: Number(financingRecord.propertyValue),
      downPayment: Number(financingRecord.downPayment),
      termMonths: financingRecord.termMonths,
      interestRate: Number(financingRecord.interestRate),
      amortizationSystem: financingRecord.amortizationSystem,
      firstParcelOverride: financingRecord.firstParcelOverride
        ? Number(financingRecord.firstParcelOverride)
        : undefined,
      lastParcelOverride: financingRecord.lastParcelOverride
        ? Number(financingRecord.lastParcelOverride)
        : undefined,
    });
  }, [financingRecord]);

  // Matches a calendar month to corresponding financing installment
  const getFinancingInstallment = useCallback(
    (colYear: number, colMonth: number): number | null => {
      if (!financingRecord || financingInstallments.length === 0) return null;

      const createdDate = new Date(financingRecord.createdAt);
      const startYear = createdDate.getFullYear();
      const startMonth = createdDate.getMonth();

      const monthIndex = (colYear - startYear) * 12 + (colMonth - startMonth);

      if (monthIndex >= 0 && monthIndex < financingInstallments.length) {
        return financingInstallments[monthIndex].installment;
      }

      return 0; // Out of term window
    },
    [financingRecord, financingInstallments]
  );

  // Aggregate cash flow data by month
  const monthlyOutflows = useMemo((): AggregatedMonthData[] => {
    return columns.map((col): AggregatedMonthData => {
      const monthExpenses = expenses.filter(
        (exp): boolean => exp.dueDate.substring(0, 7) === col.key
      );

      const confirmedSum = monthExpenses
        .filter((exp): boolean => exp.status === "CONFIRMED")
        .reduce((sum, exp): number => sum + Number(exp.totalAmount), 0);

      const budgetSum = monthExpenses
        .filter((exp): boolean => exp.status === "BUDGET")
        .reduce((sum, exp): number => sum + Number(exp.totalAmount), 0);

      const financingInstallment = getFinancingInstallment(col.year, col.month);
      const financingAmount = financingInstallment ?? 0;
      const totalOutflow = financingAmount + confirmedSum + budgetSum;

      return {
        ...col,
        financingInstallment,
        confirmedSum,
        budgetSum,
        totalOutflow,
      };
    });
  }, [columns, expenses, getFinancingInstallment]);

  // Formats values to pt-BR BRL Currency
  const formatBRL = (val: number): string => {
    return val.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // 12-month totals summary card computations
  const totals = useMemo(() => {
    let totalOutflow = 0;
    let totalFinancing = 0;
    let totalConfirmed = 0;
    let totalBudget = 0;

    for (const val of monthlyOutflows) {
      totalOutflow += val.totalOutflow;
      totalFinancing += val.financingInstallment ?? 0;
      totalConfirmed += val.confirmedSum;
      totalBudget += val.budgetSum;
    }

    return {
      totalOutflow,
      totalFinancing,
      totalConfirmed,
      totalBudget,
      hasFinancing: financingRecord !== null,
    };
  }, [monthlyOutflows, financingRecord]);

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-8">
      {/* Header section with branding & navigation links */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-mint-slate-400/30 pb-5 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0e1717] flex items-center gap-2">
            <Home className="w-8 h-8 text-emerald-600" />
            Fluxo de Caixa Mensal
          </h1>
          <p className="text-sm text-mint-slate-400 mt-1">
            Planejamento e análise de saídas financeiras consolidadas para os próximos 12 meses.
          </p>
        </div>

        <nav className="flex space-x-1.5 bg-slate-200/50 p-1.5 rounded-xl border border-slate-200/80">
          <Link
            href="/dashboard"
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-white shadow-sm text-emerald-700 transition-all"
          >
            Fluxo de Caixa
          </Link>
          <Link
            href="/financing"
            className="px-4 py-2 text-sm font-semibold rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/40 transition-all"
          >
            Simulador
          </Link>
          <Link
            href="/expenses"
            className="px-4 py-2 text-sm font-semibold rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/40 transition-all"
          >
            Despesas
          </Link>
          <Link
            href="/settings"
            className="px-4 py-2 text-sm font-semibold rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/40 transition-all"
          >
            Configurações
          </Link>
        </nav>
      </header>

      {errorMsg && (
        <div className="p-4 bg-orange-50 text-orange-800 border border-orange-200 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-mint-slate-400 font-medium">Carregando painel financeiro...</span>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          {/* Summary KPI Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total outflow */}
            <div className="bg-white border border-mint-slate-400/20 rounded-xl p-6 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Saída Total (12m)
                </span>
                <h3 className="text-2xl font-bold font-mono text-[#0e1717] mt-0.5">
                  {formatBRL(totals.totalOutflow)}
                </h3>
              </div>
            </div>

            {/* Confirmed expenses */}
            <div className="bg-white border border-mint-slate-400/20 rounded-xl p-6 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-rose-50 rounded-lg text-rose-600">
                <TrendingDown className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Despesas Confirmadas
                </span>
                <h3 className="text-2xl font-bold font-mono text-[#0e1717] mt-0.5">
                  {formatBRL(totals.totalConfirmed)}
                </h3>
              </div>
            </div>

            {/* Budgets */}
            <div className="bg-white border border-mint-slate-400/20 rounded-xl p-6 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Orçamento Planejado
                </span>
                <h3 className="text-2xl font-bold font-mono text-[#0e1717] mt-0.5">
                  {formatBRL(totals.totalBudget)}
                </h3>
              </div>
            </div>

            {/* Financing */}
            <div className="bg-white border border-mint-slate-400/20 rounded-xl p-6 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Financiamento (12m)
                </span>
                <h3 className="text-2xl font-bold font-mono text-[#0e1717] mt-0.5">
                  {totals.hasFinancing ? formatBRL(totals.totalFinancing) : "—"}
                </h3>
              </div>
            </div>
          </section>

          {/* 12-Month Cash Flow Grid */}
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-[#0e1717]">Projeção Mês a Mês</h2>
              <span className="text-xs text-mint-slate-400 font-semibold font-mono">
                Selecione um mês para ver detalhes
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-12 gap-4">
              {monthlyOutflows.map((item): React.JSX.Element => (
                <Link
                  href={`/expenses?month=${item.key}`}
                  key={item.key}
                  className="block group"
                >
                  <div className="border border-mint-slate-400/20 rounded-xl p-4 bg-white hover:border-emerald-600 hover:shadow-xl transition-all cursor-pointer flex flex-col gap-4 h-full relative overflow-hidden">
                    {/* Month Header */}
                    <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
                      <span className="text-sm font-bold text-mint-slate-900 tracking-tight uppercase group-hover:text-emerald-600 transition-colors">
                        {item.label}
                      </span>
                      <span className="text-mint-slate-400 group-hover:translate-x-1 transition-transform">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    {/* Values Stack */}
                    <div className="space-y-3.5 flex-grow">
                      {/* Financing installment row */}
                      <div className="flex flex-col gap-0.5 p-2 rounded-lg bg-slate-50 border border-slate-100/80">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                          Parcela Financ.
                        </span>
                        <span className="text-xs font-mono font-bold text-[#0e1717]">
                          {item.financingInstallment !== null
                            ? formatBRL(item.financingInstallment)
                            : "—"}
                        </span>
                      </div>

                      {/* Confirmed sum row */}
                      <div className="bg-rose-600 text-white rounded-lg p-2.5 flex flex-col gap-0.5 shadow-sm transition-transform group-hover:scale-[1.02]">
                        <span className="text-[9px] uppercase font-bold tracking-wider opacity-90">
                          Confirmado
                        </span>
                        <span className="text-xs font-mono font-bold leading-tight">
                          {formatBRL(item.confirmedSum)}
                        </span>
                      </div>

                      {/* Budget sum row */}
                      <div className="bg-amber-600 text-white rounded-lg p-2.5 flex flex-col gap-0.5 shadow-sm transition-transform group-hover:scale-[1.02]">
                        <span className="text-[9px] uppercase font-bold tracking-wider opacity-90">
                          Orçamento
                        </span>
                        <span className="text-xs font-mono font-bold leading-tight">
                          {formatBRL(item.budgetSum)}
                        </span>
                      </div>
                    </div>

                    {/* Total outflow row */}
                    <div className="border-t border-slate-100 pt-3 mt-auto flex flex-col gap-0.5">
                      <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">
                        Saída Total
                      </span>
                      <span className="text-sm font-mono font-extrabold text-[#0e1717] group-hover:text-emerald-600 transition-colors">
                        {formatBRL(item.totalOutflow)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
