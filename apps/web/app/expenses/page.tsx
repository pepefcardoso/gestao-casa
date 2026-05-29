"use client";

import { apiClient } from "@gestao-casa/shared-logic/api-client/index";
import {
  calculateFinancing,
  type FinancingInstallment,
} from "@gestao-casa/shared-logic/utils/calculate-financing";
import { projectInstallments } from "@gestao-casa/shared-logic/utils/project-installments";
import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  CheckCircle,
  Clock,
  DollarSign,
  Edit2,
  Layers,
  PiggyBank,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type React from "react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from "../components/UserContext";

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

interface Income {
  id: string;
  description: string;
  amount: string;
  status: "BUDGET" | "CONFIRMED";
  category: "SALARY" | "INVESTMENT" | "REFUND" | "OTHER";
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
  adminFee: string | null;
  mipRate: string | null;
  dfiRate: string | null;
  trRate: string | null;
  interestMethod: "compound" | "linear" | null;
  createdAt: string;
}

interface RoomOption {
  id: string;
  name: string;
  colorCode: string | null;
}

const CATEGORY_MAP: Record<string, string> = {
  TAX: "Imposto",
  PRODUCT: "Produto",
  SERVICE: "Serviço",
  FURNITURE: "Móvel",
  APPLIANCE: "Eletrodoméstico",
  RENOVATION: "Reforma",
};

const INCOME_CATEGORY_MAP: Record<string, string> = {
  SALARY: "Salário",
  INVESTMENT: "Investimento",
  REFUND: "Reembolso",
  OTHER: "Outros",
};

const PRIORITY_MAP: Record<string, { label: string; textClass: string }> = {
  HIGH: { label: "Alta", textClass: "text-orange-500 font-semibold" },
  MEDIUM: { label: "Média", textClass: "text-blue-500 font-semibold" },
  LOW: { label: "Baixa", textClass: "text-gray-400 font-semibold" },
};

function ExpensesListContent(): React.JSX.Element {
  const searchParams = useSearchParams();
  const monthParam = searchParams.get("month"); // "YYYY-MM"
  const { activeHouseId, role } = useUser();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [financingRecord, setFinancingRecord] = useState<FinancingRecord | null>(null);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingRooms, setIsLoadingRooms] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"EXPENSES" | "INCOMES">("EXPENSES");

  // Modal and Deletion State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  // Form Field States
  const [description, setDescription] = useState<string>("");
  const [totalAmount, setTotalAmount] = useState<string>("");
  const [status, setStatus] = useState<"BUDGET" | "CONFIRMED">("CONFIRMED");
  const [category, setCategory] = useState<
    "TAX" | "PRODUCT" | "SERVICE" | "FURNITURE" | "APPLIANCE" | "RENOVATION"
  >("PRODUCT");
  const [priority, setPriority] = useState<"HIGH" | "MEDIUM" | "LOW">("MEDIUM");
  const [paymentType, setPaymentType] = useState<"UPFRONT" | "INSTALLMENTS">("UPFRONT");
  const [installmentsCount, setInstallmentsCount] = useState<string>("1");
  const [roomId, setRoomId] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");

  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const fetchExpenses = useCallback(async (): Promise<void> => {
    if (!activeHouseId) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await apiClient.get("/api/expenses", {
        query: { house_id: activeHouseId },
      });
      setExpenses(data as Expense[]);
    } catch (err) {
      setErrorMsg("Erro ao buscar despesas do servidor.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [activeHouseId]);

  const fetchRooms = useCallback(async (): Promise<void> => {
    if (!activeHouseId) return;
    setIsLoadingRooms(true);
    try {
      const data = await apiClient.get("/api/rooms", {
        query: { house_id: activeHouseId },
      });
      setRooms(data as RoomOption[]);
    } catch (err) {
      console.error("Erro de rede ao buscar cômodos.", err);
    } finally {
      setIsLoadingRooms(false);
    }
  }, [activeHouseId]);

  const fetchIncomes = useCallback(async (): Promise<void> => {
    if (!activeHouseId) return;
    try {
      const data = await apiClient.get("/api/incomes", {
        query: { house_id: activeHouseId },
      });
      setIncomes(data as Income[]);
    } catch (err) {
      console.error("Erro de rede ao buscar receitas.", err);
    }
  }, [activeHouseId]);

  const fetchFinancing = useCallback(async (): Promise<void> => {
    if (!activeHouseId) return;
    try {
      const data = await apiClient.get("/api/financing/{house_id}", {
        params: { house_id: activeHouseId },
      });
      setFinancingRecord(data as FinancingRecord);
    } catch (err) {
      setFinancingRecord(null);
      console.error("Erro de rede ao buscar financiamento.", err);
    }
  }, [activeHouseId]);

  useEffect((): void => {
    fetchExpenses();
    fetchRooms();
    fetchIncomes();
    fetchFinancing();
  }, [fetchExpenses, fetchRooms, fetchIncomes, fetchFinancing]);

  // Filter expenses matching the target month parameter
  const filteredExpenses = useMemo((): Expense[] => {
    if (!monthParam) return expenses;
    return expenses.filter((exp): boolean => exp.dueDate.substring(0, 7) === monthParam);
  }, [expenses, monthParam]);

  // Filter incomes matching the target month parameter
  const filteredIncomes = useMemo((): Income[] => {
    if (!monthParam) return incomes;
    return incomes.filter((inc): boolean => inc.dueDate.substring(0, 7) === monthParam);
  }, [incomes, monthParam]);

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
      adminFee: financingRecord.adminFee ? Number(financingRecord.adminFee) : undefined,
      mipRate: financingRecord.mipRate ? Number(financingRecord.mipRate) : undefined,
      dfiRate: financingRecord.dfiRate ? Number(financingRecord.dfiRate) : undefined,
      trRate: financingRecord.trRate ? Number(financingRecord.trRate) : undefined,
      interestMethod: (financingRecord.interestMethod as "compound" | "linear") || "compound",
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
    [financingRecord, financingInstallments],
  );

  const monthFinancingInstallment = useMemo((): number => {
    if (!monthParam || !financingRecord) return 0;
    const [year, month] = monthParam.split("-").map(Number);
    if (!year || !month) return 0;
    return getFinancingInstallment(year, month - 1) ?? 0;
  }, [monthParam, financingRecord, getFinancingInstallment]);

  // Calculate consolidated flow summary for target month
  const monthlyFlowSummary = useMemo((): {
    inflow: number;
    outflow: number;
    netBalance: number;
    expensesTotal: number;
    financingInstallment: number;
  } | null => {
    if (!monthParam) return null;

    const totalExpenses = filteredExpenses.reduce(
      (sum, exp): number => sum + Number(exp.totalAmount),
      0,
    );
    const totalOutflow = totalExpenses + monthFinancingInstallment;

    const totalInflow = filteredIncomes.reduce((sum, inc): number => sum + Number(inc.amount), 0);

    const netBalance = totalInflow - totalOutflow;

    return {
      inflow: totalInflow,
      outflow: totalOutflow,
      netBalance,
      expensesTotal: totalExpenses,
      financingInstallment: monthFinancingInstallment,
    };
  }, [monthParam, filteredExpenses, filteredIncomes, monthFinancingInstallment]);

  // Calculate quick stats (fallback if no month parameter)
  const stats = useMemo((): {
    confirmedSum: number;
    budgetSum: number;
    totalSum: number;
    count: number;
  } => {
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
  const titleLabel = useMemo((): string => {
    if (!monthParam) {
      return activeTab === "EXPENSES" ? "Todas as Despesas" : "Todas as Receitas";
    }
    const [year, month] = monthParam.split("-").map(Number);
    if (!year || !month) return monthParam;

    const d = new Date(year, month - 1, 1);
    const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);
    return `${activeTab === "EXPENSES" ? "Despesas" : "Receitas"}: ${formattedLabel}`;
  }, [monthParam, activeTab]);

  // Modal actions handlers
  const handleNewClick = (): void => {
    setEditingExpense(null);
    setDescription("");
    setTotalAmount("");
    setStatus("CONFIRMED");
    setCategory("PRODUCT");
    setPriority("MEDIUM");
    setRoomId("");
    setDueDate(new Date().toISOString().substring(0, 10)); // YYYY-MM-DD
    setPaymentType("UPFRONT");
    setInstallmentsCount("1");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (exp: Expense): void => {
    setEditingExpense(exp);
    setDescription(exp.description);
    setTotalAmount(exp.totalAmount);
    setStatus(exp.status);
    setCategory(exp.category);
    setPriority(exp.priority);
    setRoomId(exp.roomId || "");
    setDueDate(exp.dueDate.substring(0, 10)); // YYYY-MM-DD
    setPaymentType("UPFRONT"); // Ignored/Hidden for edit
    setInstallmentsCount(String(exp.installmentsCount));
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setFormError(null);

    if (!description.trim()) {
      setFormError("A descrição é obrigatória.");
      return;
    }
    const amountNum = Number(totalAmount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      setFormError("O valor total deve ser maior que zero.");
      return;
    }
    if (!dueDate) {
      setFormError("A data de vencimento é obrigatória.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingExpense) {
        // Edit single record via PUT
        const payload = {
          roomId: roomId || null,
          description: description.trim(),
          totalAmount: amountNum,
          installmentsCount: Number(installmentsCount) || 1,
          status,
          category,
          priority,
          dueDate: new Date(dueDate).toISOString(),
        };

        await apiClient.put("/api/expenses/{id}", {
          params: { id: editingExpense.id },
          body: payload,
        });

        setIsModalOpen(false);
        fetchExpenses();
      } else {
        // Add new record(s)
        const instCount = paymentType === "UPFRONT" ? 1 : Number(installmentsCount) || 1;
        if (instCount < 1 || instCount > 360) {
          setFormError("A quantidade de parcelas deve ser entre 1 e 360.");
          setIsSaving(false);
          return;
        }

        const projected = projectInstallments({
          description: description.trim(),
          totalAmount: amountNum,
          installmentsCount: instCount,
          status,
          category,
          priority,
          roomId: roomId || null,
          dueDate: new Date(dueDate),
        });

        for (const inst of projected) {
          await apiClient.post("/api/expenses", {
            body: {
              ...inst,
              dueDate: inst.dueDate.toISOString(),
            },
          });
        }

        setIsModalOpen(false);
        fetchExpenses();
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erro ao conectar com o servidor.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!deleteTarget) return;

    try {
      await apiClient.delete("/api/expenses/{id}", {
        params: { id: deleteTarget.id },
      });

      setDeleteTarget(null);
      fetchExpenses();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao excluir despesa.");
    }
  };

  // Live preview for installments
  const liveParsedAmount = Number(totalAmount) || 0;
  const liveInstallmentsCount = paymentType === "UPFRONT" ? 1 : Number(installmentsCount) || 1;
  const livePerMonthAmount = liveParsedAmount / liveInstallmentsCount;

  const currentCount = activeTab === "EXPENSES" ? filteredExpenses.length : filteredIncomes.length;

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-8 animate-fade-in">
      {/* Navigation & Header */}
      <div className="space-y-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-semibold text-brand-emerald hover:opacity-85 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o Painel
        </Link>

        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center pb-5 gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
              {titleLabel}
            </h1>
            <p className="text-xs text-text-muted mt-1">
              {monthParam
                ? `Visualizando lançamentos detalhados para o mês de ${monthParam}.`
                : "Visualizando lançamentos consolidados no sistema."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {activeTab === "EXPENSES"
              ? role !== "VIEWER" && (
                  <button
                    type="button"
                    onClick={handleNewClick}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-emerald hover:bg-brand-emerald/90 text-white text-sm font-semibold rounded-full shadow-premium active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-4.5 h-4.5" />
                    Nova Despesa
                  </button>
                )
              : role !== "VIEWER" && (
                  <Link
                    href={monthParam ? `/incomes?month=${monthParam}` : "/incomes"}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-emerald hover:bg-brand-emerald/90 text-white text-sm font-semibold rounded-full shadow-premium active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-4.5 h-4.5" />
                    Gerenciar Receitas
                  </Link>
                )}

            <nav className="flex space-x-1 bg-slate-200/40 p-1 rounded-full justify-center">
              <Link
                href="/dashboard"
                className="px-4 py-2 text-xs font-semibold rounded-full text-text-muted hover:text-text-primary hover:bg-white/40 active:scale-95 transition-all"
              >
                Fluxo de Caixa
              </Link>
              <Link
                href="/financing"
                className="px-4 py-2 text-xs font-semibold rounded-full text-text-muted hover:text-text-primary hover:bg-white/40 active:scale-95 transition-all"
              >
                Simulador
              </Link>
              <Link
                href="/expenses"
                className="px-4 py-2 text-xs font-semibold rounded-full bg-surface-white shadow-premium text-brand-emerald transition-all"
              >
                Despesas
              </Link>
              <Link
                href="/incomes"
                className="px-4 py-2 text-xs font-semibold rounded-full text-text-muted hover:text-text-primary hover:bg-white/40 active:scale-95 transition-all"
              >
                Receitas
              </Link>
              <Link
                href="/settings"
                className="px-4 py-2 text-xs font-semibold rounded-full text-text-muted hover:text-text-primary hover:bg-white/40 active:scale-95 transition-all"
              >
                Configurações
              </Link>
            </nav>
          </div>
        </header>
      </div>

      {errorMsg && (
        <div className="p-4 bg-orange-50 text-orange-800 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-mint-slate-400 font-medium">Carregando dados...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Month Summary Card (Consolidated Inflow, Outflow, Net Balance) */}
          {monthlyFlowSummary && (
            <section className="bg-surface-white rounded-3xl p-6 shadow-premium transition-all duration-300 hover:-translate-y-1 hover:shadow-premium-hover grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Inflow */}
              <div className="md:px-6 flex items-center gap-4">
                <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
                    Entradas (Receitas)
                  </span>
                  <h3 className="text-2xl font-semibold text-text-primary mt-0.5 tabular-nums">
                    {formatBRL(monthlyFlowSummary.inflow)}
                  </h3>
                  <span className="text-[10px] text-text-muted font-medium">
                    Planejado + Confirmado
                  </span>
                </div>
              </div>

              {/* Outflow */}
              <div className="md:px-6 flex items-center gap-4">
                <div className="p-3 bg-rose-50 rounded-full text-rose-600">
                  <TrendingDown className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
                    Saídas (Total)
                  </span>
                  <h3 className="text-2xl font-semibold text-text-primary mt-0.5 tabular-nums">
                    {formatBRL(monthlyFlowSummary.outflow)}
                  </h3>
                  <span className="text-[10px] text-text-muted font-medium block leading-normal">
                    Despesas: {formatBRL(monthlyFlowSummary.expensesTotal)} | Financ:{" "}
                    {formatBRL(monthlyFlowSummary.financingInstallment)}
                  </span>
                </div>
              </div>

              {/* Net Balance */}
              <div className="md:px-6 flex items-center gap-4">
                <div
                  className={`p-3 rounded-full ${monthlyFlowSummary.netBalance >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}
                >
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
                    Saldo Líquido
                  </span>
                  <h3
                    className={`text-2xl font-semibold mt-0.5 tabular-nums ${monthlyFlowSummary.netBalance >= 0 ? "text-brand-emerald" : "text-rose-600"}`}
                  >
                    {formatBRL(monthlyFlowSummary.netBalance)}
                  </h3>
                  <span className="text-[10px] text-text-muted font-medium">Inflow - Outflow</span>
                </div>
              </div>
            </section>
          )}

          {/* Fallback stats cards if no month param is specified */}
          {!monthlyFlowSummary && (
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-surface-white rounded-3xl p-5 shadow-premium transition-all duration-300 hover:-translate-y-1 hover:shadow-premium-hover flex items-center gap-3">
                <div className="p-2.5 bg-slate-50 rounded-full text-text-muted">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">
                    Total Geral
                  </span>
                  <h4 className="text-lg font-semibold text-text-primary tabular-nums">
                    {formatBRL(stats.totalSum)}
                  </h4>
                </div>
              </div>

              <div className="bg-surface-white rounded-3xl p-5 shadow-premium transition-all duration-300 hover:-translate-y-1 hover:shadow-premium-hover flex items-center gap-3">
                <div className="p-2.5 bg-rose-50 rounded-full text-rose-600">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-rose-500">
                    Confirmado
                  </span>
                  <h4 className="text-lg font-semibold text-text-primary tabular-nums">
                    {formatBRL(stats.confirmedSum)}
                  </h4>
                </div>
              </div>

              <div className="bg-surface-white rounded-3xl p-5 shadow-premium transition-all duration-300 hover:-translate-y-1 hover:shadow-premium-hover flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 rounded-full text-amber-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500">
                    Orçamento
                  </span>
                  <h4 className="text-lg font-semibold text-text-primary tabular-nums">
                    {formatBRL(stats.budgetSum)}
                  </h4>
                </div>
              </div>
            </section>
          )}

          {/* Segmented Control / Tab Toggle */}
          {monthParam && (
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={(): void => setActiveTab("EXPENSES")}
                className={`py-3 px-6 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === "EXPENSES"
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                Despesas ({filteredExpenses.length})
              </button>
              <button
                type="button"
                onClick={(): void => setActiveTab("INCOMES")}
                className={`py-3 px-6 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === "INCOMES"
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                Receitas ({filteredIncomes.length})
              </button>
            </div>
          )}

          {/* Lançamentos Table */}
          <div className="bg-surface-white rounded-3xl shadow-premium overflow-hidden transition-all duration-300 hover:shadow-premium-hover">
            <div className="px-6 py-4 flex justify-between items-center bg-slate-50/10">
              <h2 className="text-lg font-semibold text-text-primary">Lançamentos</h2>
              <span className="text-xs text-text-muted font-semibold tabular-nums">
                {currentCount}{" "}
                {currentCount === 1 ? "registro encontrado" : "registros encontrados"}
              </span>
            </div>

            {activeTab === "EXPENSES" ? (
              filteredExpenses.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse text-left">
                    <thead>
                      <tr className="bg-surface-white/70 backdrop-blur-xl text-text-primary font-semibold text-xs uppercase">
                        <th className="py-3 px-6">Descrição</th>
                        <th className="py-3 px-6 text-right">Valor</th>
                        <th className="py-3 px-6">Vencimento</th>
                        <th className="py-3 px-6">Categoria</th>
                        <th className="py-3 px-6 text-center">Prioridade</th>
                        <th className="py-3 px-6 text-center">Status</th>
                        <th className="py-3 px-6 text-center">Ações</th>
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
                          <tr
                            key={exp.id}
                            className="hover:bg-slate-50/30 transition-colors duration-200"
                          >
                            <td className="py-3.5 px-6 font-medium text-text-primary">
                              {exp.description}
                            </td>
                            <td className="py-3.5 px-6 text-right font-semibold text-text-primary tabular-nums">
                              {formatBRL(Number(exp.totalAmount))}
                            </td>
                            <td className="py-3.5 px-6 text-text-muted text-xs tabular-nums">
                              {formatDate(exp.dueDate)}
                            </td>
                            <td className="py-3.5 px-6 text-xs text-text-muted">
                              {CATEGORY_MAP[exp.category] || exp.category}
                            </td>
                            <td className="py-3.5 px-6 text-center">
                              <span
                                className={`inline-block text-xs font-semibold ${priority.textClass}`}
                              >
                                {priority.label}
                              </span>
                            </td>
                            <td className="py-3.5 px-6 text-center">
                              {exp.status === "CONFIRMED" ? (
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-600">
                                  Confirmado
                                </span>
                              ) : (
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-600">
                                  Orçamento
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-6 text-center">
                              {role !== "VIEWER" ? (
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(): void => handleEditClick(exp)}
                                    className="p-1.5 text-text-muted hover:text-brand-emerald hover:bg-slate-100 rounded-full transition-all active:scale-95 cursor-pointer"
                                    title="Editar"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(): void => setDeleteTarget(exp)}
                                    className="p-1.5 text-text-muted hover:text-rose-600 hover:bg-slate-100 rounded-full transition-all active:scale-95 cursor-pointer"
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-text-muted font-medium">
                                  Apenas Leitura
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
                <div className="py-16 text-center text-text-muted text-sm flex flex-col items-center gap-2">
                  <Layers className="w-8 h-8 opacity-45" />
                  <span>Nenhuma despesa lançada para este período.</span>
                </div>
              )
            ) : filteredIncomes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse text-left">
                  <thead>
                    <tr className="bg-surface-white/70 backdrop-blur-xl text-text-primary font-semibold text-xs uppercase">
                      <th className="py-3 px-6">Descrição</th>
                      <th className="py-3 px-6 text-right">Valor</th>
                      <th className="py-3 px-6">Recebimento</th>
                      <th className="py-3 px-6">Categoria</th>
                      <th className="py-3 px-6 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredIncomes.map(
                      (inc): React.JSX.Element => (
                        <tr
                          key={inc.id}
                          className="hover:bg-slate-50/30 transition-colors duration-200"
                        >
                          <td className="py-3.5 px-6 font-medium text-text-primary">
                            {inc.description}
                          </td>
                          <td className="py-3.5 px-6 text-right font-semibold text-text-primary tabular-nums">
                            {formatBRL(Number(inc.amount))}
                          </td>
                          <td className="py-3.5 px-6 text-text-muted text-xs tabular-nums">
                            {formatDate(inc.dueDate)}
                          </td>
                          <td className="py-3.5 px-6 text-xs text-text-muted">
                            {INCOME_CATEGORY_MAP[inc.category] || inc.category}
                          </td>
                          <td className="py-3.5 px-6 text-center">
                            {inc.status === "CONFIRMED" ? (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">
                                Confirmado
                              </span>
                            ) : (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-600">
                                Planejado
                              </span>
                            )}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center text-text-muted text-sm flex flex-col items-center gap-2">
                <Layers className="w-8 h-8 opacity-45" />
                <span>Nenhuma receita lançada para este período.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reusable Modal Form (Add / Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-md p-4">
          <div className="bg-surface-white rounded-3xl max-w-lg w-full shadow-premium-hover flex flex-col max-h-[90vh] animate-scale-up">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 bg-surface-white/70 backdrop-blur-xl">
              <h3 className="text-xl font-semibold text-text-primary">
                {editingExpense ? "Editar Despesa" : "Nova Despesa"}
              </h3>
              <button
                type="button"
                onClick={(): void => setIsModalOpen(false)}
                className="text-text-muted hover:text-text-primary p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form
              onSubmit={(e): Promise<void> => handleSave(e)}
              className="flex-1 overflow-y-auto p-6 space-y-5"
            >
              {formError && (
                <div className="p-3.5 bg-orange-50 border-0 rounded-2xl text-orange-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Status Select Toggle */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider block">
                  Status da Despesa
                </span>
                <div className="grid grid-cols-2 gap-2 bg-slate-100/50 p-1.5 rounded-full">
                  <button
                    type="button"
                    onClick={(): void => setStatus("BUDGET")}
                    className={`py-2 px-3 text-xs font-bold rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95`}
                    style={{
                      backgroundColor: status === "BUDGET" ? "#D97706" : "transparent",
                      color: status === "BUDGET" ? "#FFFFFF" : "#4B5563",
                    }}
                  >
                    <PiggyBank className="w-4 h-4" />
                    Planejado
                  </button>
                  <button
                    type="button"
                    onClick={(): void => setStatus("CONFIRMED")}
                    className={`py-2 px-3 text-xs font-bold rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95`}
                    style={{
                      backgroundColor: status === "CONFIRMED" ? "#10B981" : "transparent",
                      color: status === "CONFIRMED" ? "#FFFFFF" : "#4B5563",
                    }}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Confirmado
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label
                  htmlFor="description"
                  className="text-xs font-bold text-text-muted uppercase tracking-wider"
                >
                  Descrição *
                </label>
                <input
                  id="description"
                  type="text"
                  placeholder="Ex: Armários da Cozinha, IPTU..."
                  value={description}
                  onChange={(e): void => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border-0 focus:ring-2 focus:ring-brand-emerald/50 focus:bg-white outline-hidden transition-all font-medium text-text-primary text-sm placeholder:text-text-muted"
                  required
                />
              </div>

              {/* Amount and Due Date Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="totalAmount"
                    className="text-xs font-bold text-text-muted uppercase tracking-wider"
                  >
                    Valor Total (R$) *
                  </label>
                  <input
                    id="totalAmount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={totalAmount}
                    onChange={(e): void => setTotalAmount(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border-0 focus:ring-2 focus:ring-brand-emerald/50 focus:bg-white outline-hidden transition-all tabular-nums font-medium text-text-primary text-sm placeholder:text-text-muted"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="dueDate"
                    className="text-xs font-bold text-text-muted uppercase tracking-wider"
                  >
                    Vencimento *
                  </label>
                  <input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e): void => setDueDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border-0 focus:ring-2 focus:ring-brand-emerald/50 focus:bg-white outline-hidden transition-all tabular-nums font-medium text-text-primary text-sm"
                    required
                  />
                </div>
              </div>

              {/* Payment Type Options (Shown only for creation) */}
              {!editingExpense && (
                <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl">
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider block">
                      Forma de Pagamento
                    </span>
                    <div className="grid grid-cols-2 gap-2 bg-white/60 p-1 rounded-full border border-slate-200/20">
                      <button
                        type="button"
                        onClick={(): void => {
                          setPaymentType("UPFRONT");
                          setInstallmentsCount("1");
                        }}
                        className={`py-1.5 px-3 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                          paymentType === "UPFRONT"
                            ? "bg-slate-800 text-white shadow-premium"
                            : "text-text-muted hover:text-text-primary"
                        }`}
                      >
                        À Vista
                      </button>
                      <button
                        type="button"
                        onClick={(): void => {
                          setPaymentType("INSTALLMENTS");
                          setInstallmentsCount("2");
                        }}
                        className={`py-1.5 px-3 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                          paymentType === "INSTALLMENTS"
                            ? "bg-slate-800 text-white shadow-premium"
                            : "text-text-muted hover:text-text-primary"
                        }`}
                      >
                        Parcelado
                      </button>
                    </div>
                  </div>

                  {paymentType === "INSTALLMENTS" && (
                    <div className="space-y-3 animate-fade-in">
                      {/* Live projection preview */}
                      <div className="flex items-center gap-2 py-2 px-3 bg-emerald-50 rounded-xl text-xs font-medium text-emerald-800">
                        <Calculator className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="tabular-nums">
                          Projeção: {formatBRL(liveParsedAmount)} ÷ {liveInstallmentsCount} ={" "}
                          <span className="font-semibold text-brand-emerald">
                            {formatBRL(livePerMonthAmount)}
                          </span>
                          /mês
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <label
                          htmlFor="installmentsCount"
                          className="text-xs font-bold text-text-muted uppercase tracking-wider"
                        >
                          Número de Parcelas
                        </label>
                        <input
                          id="installmentsCount"
                          type="number"
                          min="1"
                          max="360"
                          value={installmentsCount}
                          onChange={(e): void => setInstallmentsCount(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border-0 focus:ring-2 focus:ring-brand-emerald/50 focus:bg-white outline-hidden transition-all tabular-nums font-medium text-text-primary text-sm"
                          required
                        />
                        <span className="text-[10px] text-text-muted font-medium">
                          Note: o sistema irá gerar {liveInstallmentsCount} parcelas subsequentes
                          mês a mês automaticamente.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {editingExpense && (
                <div className="p-3.5 bg-slate-50/50 rounded-2xl text-text-muted text-[10px] font-semibold leading-relaxed">
                  Nota: Ao salvar a edição, você estará atualizando especificamente esta parcela
                  selecionada, mantendo as outras parcelas inalteradas.
                </div>
              )}

              {/* Category, Priority and Room selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="category"
                    className="text-xs font-bold text-text-muted uppercase tracking-wider"
                  >
                    Categoria
                  </label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e): void => setCategory(e.target.value as typeof category)}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border-0 focus:ring-2 focus:ring-brand-emerald/50 focus:bg-white outline-hidden transition-all text-text-primary text-sm cursor-pointer"
                  >
                    <option value="TAX">Imposto</option>
                    <option value="PRODUCT">Produto</option>
                    <option value="SERVICE">Serviço</option>
                    <option value="FURNITURE">Móvel</option>
                    <option value="APPLIANCE">Eletrodoméstico</option>
                    <option value="RENOVATION">Reforma</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="priority"
                    className="text-xs font-bold text-text-muted uppercase tracking-wider"
                  >
                    Prioridade
                  </label>
                  <select
                    id="priority"
                    value={priority}
                    onChange={(e): void => setPriority(e.target.value as typeof priority)}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border-0 focus:ring-2 focus:ring-brand-emerald/50 focus:bg-white outline-hidden transition-all text-text-primary text-sm cursor-pointer"
                  >
                    <option value="LOW">Baixa</option>
                    <option value="MEDIUM">Média</option>
                    <option value="HIGH">Alta</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="roomId"
                  className="text-xs font-bold text-text-muted uppercase tracking-wider"
                >
                  Cômodo Associado
                </label>
                {isLoadingRooms ? (
                  <div className="text-xs text-text-muted py-2.5">Buscando cômodos...</div>
                ) : (
                  <select
                    id="roomId"
                    value={roomId}
                    onChange={(e): void => setRoomId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border-0 focus:ring-2 focus:ring-brand-emerald/50 focus:bg-white outline-hidden transition-all text-text-primary text-sm cursor-pointer"
                  >
                    <option value="">Nenhum cômodo associado</option>
                    {rooms.map(
                      (room): React.JSX.Element => (
                        <option key={room.id} value={room.id}>
                          {room.name}
                        </option>
                      ),
                    )}
                  </select>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={(): void => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-semibold rounded-full bg-slate-100 hover:bg-slate-200 text-text-primary transition-colors cursor-pointer active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-brand-emerald hover:bg-brand-emerald/90 text-white text-xs font-semibold rounded-full shadow-premium active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-md p-4">
          <div className="bg-surface-white rounded-3xl max-w-md w-full shadow-premium-hover p-6 space-y-6 animate-scale-up">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-orange-50 rounded-2xl text-orange-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-semibold text-text-primary">Excluir Despesa</h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  Tem certeza de que deseja excluir a despesa{" "}
                  <span className="font-semibold text-text-primary">
                    "{deleteTarget.description}"
                  </span>{" "}
                  no valor de{" "}
                  <span className="font-bold text-text-primary tabular-nums">
                    {formatBRL(Number(deleteTarget.totalAmount))}
                  </span>
                  ? Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={(): void => setDeleteTarget(null)}
                className="px-5 py-2 text-xs font-semibold rounded-full bg-slate-100 hover:bg-slate-200 text-text-primary transition-colors cursor-pointer active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={(): Promise<void> => handleDeleteConfirm()}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-full shadow-premium active:scale-95 transition-all cursor-pointer"
              >
                Excluir
              </button>
            </div>
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
