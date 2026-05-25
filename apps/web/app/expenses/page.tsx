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
  Edit2,
  Trash2,
  Plus,
  X,
  Calculator,
  PiggyBank,
} from "lucide-react";
import { projectInstallments } from "../../../../libs/shared-logic/src/utils/project-installments";

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

const PRIORITY_MAP: Record<string, { label: string; textClass: string; bgClass: string }> = {
  HIGH: { label: "Alta", textClass: "text-orange-700", bgClass: "bg-orange-50 border-orange-200" },
  MEDIUM: { label: "Média", textClass: "text-blue-700", bgClass: "bg-blue-50 border-blue-200" },
  LOW: { label: "Baixa", textClass: "text-slate-600", bgClass: "bg-slate-50 border-slate-200" },
};

function ExpensesListContent(): React.JSX.Element {
  const searchParams = useSearchParams();
  const monthParam = searchParams.get("month"); // "YYYY-MM"

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingRooms, setIsLoadingRooms] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal and Deletion State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  // Form Field States
  const [description, setDescription] = useState<string>("");
  const [totalAmount, setTotalAmount] = useState<string>("");
  const [status, setStatus] = useState<"BUDGET" | "CONFIRMED">("CONFIRMED");
  const [category, setCategory] = useState<"TAX" | "PRODUCT" | "SERVICE" | "FURNITURE" | "APPLIANCE" | "RENOVATION">("PRODUCT");
  const [priority, setPriority] = useState<"HIGH" | "MEDIUM" | "LOW">("MEDIUM");
  const [paymentType, setPaymentType] = useState<"UPFRONT" | "INSTALLMENTS">("UPFRONT");
  const [installmentsCount, setInstallmentsCount] = useState<string>("1");
  const [roomId, setRoomId] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");

  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

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

  const fetchRooms = useCallback(async (): Promise<void> => {
    setIsLoadingRooms(true);
    try {
      const res = await fetch("/api/rooms");
      if (res.ok) {
        const data: unknown = await res.json();
        setRooms(data as RoomOption[]);
      }
    } catch (err) {
      console.error("Erro de rede ao buscar cômodos.", err);
    } finally {
      setIsLoadingRooms(false);
    }
  }, []);

  useEffect((): void => {
    fetchExpenses();
    fetchRooms();
  }, [fetchExpenses, fetchRooms]);

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
          dueDate: new Date(dueDate),
        };

        const res = await fetch(`/api/expenses/${editingExpense.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData: unknown = await res.json();
          const msg = errData && typeof errData === "object" && "error" in errData
            ? String((errData as { error: unknown }).error)
            : "Erro ao salvar alterações da despesa.";
          throw new Error(msg);
        }

        setIsModalOpen(false);
        fetchExpenses();
      } else {
        // Add new record(s)
        const instCount = paymentType === "UPFRONT" ? 1 : (Number(installmentsCount) || 1);
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
          const res = await fetch("/api/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(inst),
          });

          if (!res.ok) {
            const errData: unknown = await res.json();
            const msg = errData && typeof errData === "object" && "error" in errData
              ? String((errData as { error: unknown }).error)
              : "Erro ao registrar despesa.";
            throw new Error(msg);
          }
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
      const res = await fetch(`/api/expenses/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errData: unknown = await res.json();
        const msg = errData && typeof errData === "object" && "error" in errData
          ? String((errData as { error: unknown }).error)
          : "Erro ao excluir despesa.";
        throw new Error(msg);
      }

      setDeleteTarget(null);
      fetchExpenses();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao excluir despesa.");
    }
  };

  // Live preview for installments
  const liveParsedAmount = Number(totalAmount) || 0;
  const liveInstallmentsCount = paymentType === "UPFRONT" ? 1 : (Number(installmentsCount) || 1);
  const livePerMonthAmount = liveParsedAmount / liveInstallmentsCount;

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

        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-mint-slate-400/30 pb-5 gap-4">
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

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <button
              type="button"
              onClick={handleNewClick}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <Plus className="w-4.5 h-4.5" />
              Nova Despesa
            </button>

            <nav className="flex space-x-1.5 bg-slate-200/50 p-1.5 rounded-xl border border-slate-200/80 justify-center">
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
              <Link
                href="/settings"
                className="px-4 py-2 text-sm font-semibold rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/40 transition-all"
              >
                Configurações
              </Link>
            </nav>
          </div>
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
                          <td className="py-3.5 px-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={(): void => handleEditClick(exp)}
                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(): void => setDeleteTarget(exp)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
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

      {/* Reusable Modal Form (Add / Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-100 shadow-2xl flex flex-col max-h-[90vh] animate-scale-up">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-[#0e1717]">
                {editingExpense ? "Editar Despesa" : "Nova Despesa"}
              </h3>
              <button
                type="button"
                onClick={(): void => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={(e): Promise<void> => handleSave(e)} className="flex-1 overflow-y-auto p-6 space-y-5">
              {formError && (
                <div className="p-3.5 bg-orange-50 border border-orange-200 rounded-xl text-orange-800 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Status Select Toggle */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Status da Despesa</span>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200/50">
                  <button
                    type="button"
                    onClick={(): void => setStatus("BUDGET")}
                    className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      status === "BUDGET"
                        ? "bg-amber-600 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <PiggyBank className="w-4 h-4" />
                    Planejado
                  </button>
                  <button
                    type="button"
                    onClick={(): void => setStatus("CONFIRMED")}
                    className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      status === "CONFIRMED"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Confirmado
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label htmlFor="description" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição *</label>
                <input
                  id="description"
                  type="text"
                  placeholder="Ex: Armários da Cozinha, IPTU..."
                  value={description}
                  onChange={(e): void => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden font-medium text-slate-800 text-sm placeholder:text-slate-400"
                  required
                />
              </div>

              {/* Amount and Due Date Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="totalAmount" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor Total (R$) *</label>
                  <input
                    id="totalAmount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={totalAmount}
                    onChange={(e): void => setTotalAmount(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden font-mono font-medium text-slate-800 text-sm placeholder:text-slate-400"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="dueDate" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vencimento *</label>
                  <input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e): void => setDueDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden font-mono font-medium text-slate-800 text-sm"
                    required
                  />
                </div>
              </div>

              {/* Payment Type Options (Shown only for creation) */}
              {!editingExpense && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Forma de Pagamento</span>
                    <div className="grid grid-cols-2 gap-2 bg-white p-1 rounded-lg border border-slate-200/60">
                      <button
                        type="button"
                        onClick={(): void => {
                          setPaymentType("UPFRONT");
                          setInstallmentsCount("1");
                        }}
                        className={`py-1.5 px-3 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                          paymentType === "UPFRONT"
                            ? "bg-slate-800 text-white"
                            : "text-slate-600 hover:text-slate-900"
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
                        className={`py-1.5 px-3 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                          paymentType === "INSTALLMENTS"
                            ? "bg-slate-800 text-white"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Parcelado
                      </button>
                    </div>
                  </div>

                  {paymentType === "INSTALLMENTS" && (
                    <div className="space-y-3 animate-fade-in">
                      {/* Live projection preview */}
                      <div className="flex items-center gap-2 py-2 px-3 bg-emerald-50 border border-emerald-100 rounded-lg text-xs font-medium text-emerald-800">
                        <Calculator className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          Projeção: {formatBRL(liveParsedAmount)} ÷ {liveInstallmentsCount} ={" "}
                          <span className="font-bold font-mono">{formatBRL(livePerMonthAmount)}</span>/mês
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="installmentsCount" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Número de Parcelas</label>
                        <input
                          id="installmentsCount"
                          type="number"
                          min="1"
                          max="360"
                          value={installmentsCount}
                          onChange={(e): void => setInstallmentsCount(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden font-mono font-medium text-slate-800 text-sm"
                          required
                        />
                        <span className="text-[10px] text-slate-400 font-medium">
                          Note: o sistema irá gerar {liveInstallmentsCount} parcelas subsequentes mês a mês automaticamente.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {editingExpense && (
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-500 text-[11px] font-semibold leading-relaxed">
                  Nota: Ao salvar a edição, você estará atualizando especificamente esta parcela selecionada, mantendo as outras parcelas inalteradas.
                </div>
              )}

              {/* Category, Priority and Room selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="category" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Categoria</label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e): void => setCategory(e.target.value as typeof category)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-600 outline-hidden text-slate-800 text-sm bg-white cursor-pointer"
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
                  <label htmlFor="priority" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Prioridade</label>
                  <select
                    id="priority"
                    value={priority}
                    onChange={(e): void => setPriority(e.target.value as typeof priority)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-600 outline-hidden text-slate-800 text-sm bg-white cursor-pointer"
                  >
                    <option value="LOW">Baixa</option>
                    <option value="MEDIUM">Média</option>
                    <option value="HIGH">Alta</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="roomId" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cômodo Associado</label>
                {isLoadingRooms ? (
                  <div className="text-xs text-slate-400 py-2.5">Buscando cômodos...</div>
                ) : (
                  <select
                    id="roomId"
                    value={roomId}
                    onChange={(e): void => setRoomId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-600 outline-hidden text-slate-800 text-sm bg-white cursor-pointer"
                  >
                    <option value="">Nenhum cômodo associado</option>
                    {rooms.map((room): React.JSX.Element => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={(): void => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 shadow-2xl p-6 space-y-6 animate-scale-up">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl text-orange-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-[#0e1717]">Excluir Despesa</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Tem certeza de que deseja excluir a despesa <span className="font-semibold text-slate-800">"{deleteTarget.description}"</span> no valor de <span className="font-bold text-[#0e1717]">{formatBRL(Number(deleteTarget.totalAmount))}</span>? Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={(): void => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={(): Promise<void> => handleDeleteConfirm()}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
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
