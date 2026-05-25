"use client";

import type React from "react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Layers,
} from "lucide-react";

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

const CATEGORY_MAP: Record<string, string> = {
  TAX: "Imposto",
  PRODUCT: "Produto",
  SERVICE: "Serviço",
  FURNITURE: "Móvel",
  APPLIANCE: "Eletrodoméstico",
  RENOVATION: "Reforma",
};

const PRIORITY_MAP: Record<string, { label: string; textClass: string; bgClass: string }> = {
  HIGH: { label: "Alta", textClass: "text-orange-700", bgClass: "bg-orange-50 border-orange-200" },
  MEDIUM: { label: "Média", textClass: "text-blue-700", bgClass: "bg-blue-50 border-blue-200" },
  LOW: { label: "Baixa", textClass: "text-slate-600", bgClass: "bg-slate-50 border-slate-200" },
};

function ExpensesListContent(): React.JSX.Element {
  const searchParams = useSearchParams();
  const monthParam = searchParams.get("month"); // "YYYY-MM"

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchExpenses = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/expenses");
      if (res.ok) {
        const data: unknown = await res.json();
        setExpenses(data as Expense[]);
      } else {
        setErrorMsg("Erro ao buscar despesas do servidor.");
      }
    } catch (err) {
      setErrorMsg("Erro de rede ao buscar despesas.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect((): void => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Filter expenses matching the target month parameter
  const filteredExpenses = useMemo((): Expense[] => {
    if (!monthParam) return expenses;
    return expenses.filter((exp): boolean => exp.dueDate.substring(0, 7) === monthParam);
  }, [expenses, monthParam]);

  // Calculate quick stats
  const stats = useMemo(() => {
    let confirmedSum = 0;
    let budgetSum = 0;

    for (const exp of filteredExpenses) {
      const amount = Number(exp.totalAmount);
      if (exp.status === "CONFIRMED") {
        confirmedSum += amount;
      } else {
        budgetSum += amount;
      }
    }

    return {
      confirmedSum,
      budgetSum,
      totalSum: confirmedSum + budgetSum,
      count: filteredExpenses.length,
    };
  }, [filteredExpenses]);

  const formatBRL = (val: number): string => {
    return val.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("pt-BR");
  };

  // Human readable title for the selected month parameter
  const titleMonthLabel = useMemo((): string => {
    if (!monthParam) return "Todas as Despesas";
    const [year, month] = monthParam.split("-").map(Number);
    if (!year || !month) return monthParam;

    const d = new Date(year, month - 1, 1);
    const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [monthParam]);

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-8 animate-fade-in">
      {/* Navigation & Header */}
      <div className="space-y-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o Painel
        </Link>

        <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-mint-slate-400/30 pb-5 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#0e1717]">
              Despesas: {titleMonthLabel}
            </h1>
            <p className="text-sm text-mint-slate-400 mt-1">
              {monthParam
                ? `Visualizando lançamentos detalhados de saídas e orçamentos para o mês de ${titleMonthLabel}.`
                : "Visualizando todas as despesas lançadas no sistema."}
            </p>
          </div>

          <nav className="flex space-x-1.5 bg-slate-200/50 p-1.5 rounded-xl border border-slate-200/80">
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-semibold rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/40 transition-all"
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
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-white shadow-sm text-emerald-700 transition-all"
            >
              Despesas
            </Link>
          </nav>
        </header>
      </div>

      {errorMsg && (
        <div className="p-4 bg-orange-50 text-orange-800 border border-orange-200 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-mint-slate-400 font-medium">Carregando despesas...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Quick Filter Summaries */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white border border-mint-slate-400/20 rounded-xl p-5 shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-600">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total do Mês</span>
                <h4 className="text-lg font-bold font-mono text-[#0e1717]">{formatBRL(stats.totalSum)}</h4>
              </div>
            </div>

            <div className="bg-white border border-mint-slate-400/20 rounded-xl p-5 shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-600">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-rose-500">Confirmado</span>
                <h4 className="text-lg font-bold font-mono text-[#0e1717]">{formatBRL(stats.confirmedSum)}</h4>
              </div>
            </div>

            <div className="bg-white border border-mint-slate-400/20 rounded-xl p-5 shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-lg text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500">Orçamento</span>
                <h4 className="text-lg font-bold font-mono text-[#0e1717]">{formatBRL(stats.budgetSum)}</h4>
              </div>
            </div>
          </section>

          {/* Expenses Table */}
          <div className="bg-white border border-mint-slate-400/20 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-semibold text-[#0e1717]">Lançamentos</h2>
              <span className="text-xs text-mint-slate-400 font-semibold font-mono">
                {stats.count} {stats.count === 1 ? "registro encontrado" : "registros encontrados"}
              </span>
            </div>

            {filteredExpenses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-mint-slate-400/25 text-[#0e1717] font-semibold text-xs uppercase">
                      <th className="py-3 px-6">Descrição</th>
                      <th className="py-3 px-6 text-right">Valor</th>
                      <th className="py-3 px-6">Vencimento</th>
                      <th className="py-3 px-6">Categoria</th>
                      <th className="py-3 px-6 text-center">Prioridade</th>
                      <th className="py-3 px-6 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExpenses.map((exp): React.JSX.Element => {
                      const priority = PRIORITY_MAP[exp.priority] || {
                        label: exp.priority,
                        textClass: "text-slate-600",
                        bgClass: "bg-slate-50",
                      };

                      return (
                        <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-6 font-medium text-slate-800">
                            {exp.description}
                          </td>
                          <td className="py-3.5 px-6 text-right font-mono font-bold text-[#0e1717] tabular-nums">
                            {formatBRL(Number(exp.totalAmount))}
                          </td>
                          <td className="py-3.5 px-6 font-mono text-slate-500 text-xs">
                            {formatDate(exp.dueDate)}
                          </td>
                          <td className="py-3.5 px-6 text-xs text-slate-600">
                            {CATEGORY_MAP[exp.category] || exp.category}
                          </td>
                          <td className="py-3.5 px-6 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${priority.bgClass} ${priority.textClass}`}
                            >
                              {priority.label}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-center">
                            {exp.status === "CONFIRMED" ? (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                                Confirmado
                              </span>
                            ) : (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                                Orçamento
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center text-mint-slate-400 text-sm flex flex-col items-center gap-2">
                <Layers className="w-8 h-8 opacity-45" />
                <span>Nenhuma despesa lançada para este período.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExpensesPage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-mint-slate-400 font-medium">Carregando despesas...</span>
        </div>
      }
    >
      <ExpensesListContent />
    </Suspense>
  );
}
