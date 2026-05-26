"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock,
  DollarSign,
  Edit2,
  Layers,
  PiggyBank,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type React from "react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from "../components/UserContext";

interface Income {
  id: string;
  description: string;
  amount: string;
  status: "BUDGET" | "CONFIRMED";
  category: "SALARY" | "INVESTMENT" | "REFUND" | "OTHER";
  dueDate: string;
  createdAt: string;
}

const CATEGORY_MAP: Record<string, string> = {
  SALARY: "Salário",
  INVESTMENT: "Investimento",
  REFUND: "Reembolso",
  OTHER: "Outros",
};

function IncomesListContent(): React.JSX.Element {
  const searchParams = useSearchParams();
  const monthParam = searchParams.get("month"); // "YYYY-MM"
  const { activeHouseId, role } = useUser();

  const [incomes, setIncomes] = useState<Income[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal and Deletion State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Income | null>(null);

  // Form Field States
  const [description, setDescription] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [status, setStatus] = useState<"BUDGET" | "CONFIRMED">("CONFIRMED");
  const [category, setCategory] = useState<"SALARY" | "INVESTMENT" | "REFUND" | "OTHER">("SALARY");
  const [dueDate, setDueDate] = useState<string>("");

  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const fetchIncomes = useCallback(async (): Promise<void> => {
    if (!activeHouseId) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/incomes?house_id=${activeHouseId}`);
      if (res.ok) {
        const data: unknown = await res.json();
        setIncomes(data as Income[]);
      } else {
        setErrorMsg("Erro ao buscar receitas do servidor.");
      }
    } catch (err) {
      setErrorMsg("Erro de rede ao buscar receitas.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [activeHouseId]);

  useEffect((): void => {
    fetchIncomes();
  }, [fetchIncomes]);

  // Filter incomes matching the target month parameter
  const filteredIncomes = useMemo((): Income[] => {
    if (!monthParam) return incomes;
    return incomes.filter((inc): boolean => inc.dueDate.substring(0, 7) === monthParam);
  }, [incomes, monthParam]);

  // Calculate quick stats
  const stats = useMemo(() => {
    let confirmedSum = 0;
    let budgetSum = 0;

    for (const inc of filteredIncomes) {
      const parsedAmount = Number(inc.amount);
      if (inc.status === "CONFIRMED") {
        confirmedSum += parsedAmount;
      } else {
        budgetSum += parsedAmount;
      }
    }

    return {
      confirmedSum,
      budgetSum,
      totalSum: confirmedSum + budgetSum,
      count: filteredIncomes.length,
    };
  }, [filteredIncomes]);

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
    if (!monthParam) return "Todas as Receitas";
    const [year, month] = monthParam.split("-").map(Number);
    if (!year || !month) return monthParam;

    const d = new Date(year, month - 1, 1);
    const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [monthParam]);

  // Modal actions handlers
  const handleNewClick = (): void => {
    setEditingIncome(null);
    setDescription("");
    setAmount("");
    setStatus("CONFIRMED");
    setCategory("SALARY");
    setDueDate(new Date().toISOString().substring(0, 10)); // YYYY-MM-DD
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (inc: Income): void => {
    setEditingIncome(inc);
    setDescription(inc.description);
    setAmount(inc.amount);
    setStatus(inc.status);
    setCategory(inc.category);
    setDueDate(inc.dueDate.substring(0, 10)); // YYYY-MM-DD
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
    const amountNum = Number(amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      setFormError("O valor deve ser maior que zero.");
      return;
    }
    if (!dueDate) {
      setFormError("A data de recebimento é obrigatória.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        description: description.trim(),
        amount: amountNum,
        status,
        category,
        dueDate: new Date(dueDate),
      };

      if (editingIncome) {
        // Edit single record via PUT
        const res = await fetch(`/api/incomes/${editingIncome.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData: unknown = await res.json();
          const msg =
            errData && typeof errData === "object" && "error" in errData
              ? String((errData as { error: unknown }).error)
              : "Erro ao salvar alterações da receita.";
          throw new Error(msg);
        }

        setIsModalOpen(false);
        fetchIncomes();
      } else {
        // Add new record via POST
        const res = await fetch("/api/incomes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData: unknown = await res.json();
          const msg =
            errData && typeof errData === "object" && "error" in errData
              ? String((errData as { error: unknown }).error)
              : "Erro ao registrar receita.";
          throw new Error(msg);
        }

        setIsModalOpen(false);
        fetchIncomes();
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
      const res = await fetch(`/api/incomes/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errData: unknown = await res.json();
        const msg =
          errData && typeof errData === "object" && "error" in errData
            ? String((errData as { error: unknown }).error)
            : "Erro ao excluir receita.";
        throw new Error(msg);
      }

      setDeleteTarget(null);
      fetchIncomes();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao excluir receita.");
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-8 animate-fade-in">
      {/* Navigation & Header */}
      <div className="space-y-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-emerald hover:opacity-85 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o Painel
        </Link>

        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-transparent pb-5 gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
              Receitas: {titleMonthLabel}
            </h1>
            <p className="text-xs text-text-muted mt-1">
              {monthParam
                ? `Visualizando lançamentos detalhados de entradas e planejamentos para o mês de {titleMonthLabel}.`
                : "Visualizando todas as receitas lançadas no sistema."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {role !== "VIEWER" && (
              <button
                type="button"
                onClick={handleNewClick}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-emerald hover:bg-brand-emerald/90 text-white text-xs font-semibold rounded-full shadow-premium active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-4.5 h-4.5" />
                Nova Receita
              </button>
            )}

            <nav className="flex space-x-1 bg-white/50 backdrop-blur-md p-1 rounded-full border border-white/40 shadow-premium justify-center">
              <Link
                href="/dashboard"
                className="px-4 py-2 text-xs font-semibold rounded-full text-text-muted hover:text-text-primary hover:bg-white/40 transition-all"
              >
                Fluxo de Caixa
              </Link>
              <Link
                href="/financing"
                className="px-4 py-2 text-xs font-semibold rounded-full text-text-muted hover:text-text-primary hover:bg-white/40 transition-all"
              >
                Simulador
              </Link>
              <Link
                href="/expenses"
                className="px-4 py-2 text-xs font-semibold rounded-full text-text-muted hover:text-text-primary hover:bg-white/40 transition-all"
              >
                Despesas
              </Link>
              <Link
                href="/incomes"
                className="px-4 py-2 text-xs font-semibold rounded-full bg-surface-white shadow-premium text-brand-emerald transition-all"
              >
                Receitas
              </Link>
              <Link
                href="/settings"
                className="px-4 py-2 text-xs font-semibold rounded-full text-text-muted hover:text-text-primary hover:bg-white/40 transition-all"
              >
                Configurações
              </Link>
            </nav>
          </div>
        </header>
      </div>

      {errorMsg && (
        <div className="p-4 bg-orange-50/50 text-orange-800 rounded-2xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <div className="w-10 h-10 border-4 border-brand-emerald border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-text-muted font-medium">Carregando receitas...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Quick Filter Summaries */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-surface-white rounded-3xl p-5 shadow-premium flex items-center gap-3 transition-transform duration-300 hover:-translate-y-1 hover:shadow-premium-hover">
              <div className="p-2.5 bg-slate-50 rounded-2xl text-text-muted">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">
                  Total do Período
                </span>
                <h4 className="text-lg font-bold font-mono text-text-primary tabular-nums">
                  {formatBRL(stats.totalSum)}
                </h4>
              </div>
            </div>

            <div className="bg-surface-white rounded-3xl p-5 shadow-premium flex items-center gap-3 transition-transform duration-300 hover:-translate-y-1 hover:shadow-premium-hover">
              <div className="p-2.5 bg-emerald-50 rounded-2xl text-brand-emerald">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-brand-emerald">
                  Confirmado
                </span>
                <h4 className="text-lg font-bold font-mono text-text-primary tabular-nums">
                  {formatBRL(stats.confirmedSum)}
                </h4>
              </div>
            </div>

            <div className="bg-surface-white rounded-3xl p-5 shadow-premium flex items-center gap-3 transition-transform duration-300 hover:-translate-y-1 hover:shadow-premium-hover">
              <div className="p-2.5 bg-amber-50 rounded-2xl text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500">
                  Planejado (Orçamento)
                </span>
                <h4 className="text-lg font-bold font-mono text-text-primary tabular-nums">
                  {formatBRL(stats.budgetSum)}
                </h4>
              </div>
            </div>
          </section>

          {/* Incomes Table */}
          <div className="bg-surface-white rounded-3xl shadow-premium overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-medium tracking-tight text-text-primary">Lançamentos</h2>
              <span className="text-xs text-text-muted font-medium font-mono">
                {stats.count} {stats.count === 1 ? "registro encontrado" : "registros encontrados"}
              </span>
            </div>

            {filteredIncomes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse text-left">
                  <thead>
                    <tr className="bg-white/70 backdrop-blur-xl border-b border-slate-100 text-text-primary font-semibold text-xs uppercase">
                      <th className="py-3 px-6">Descrição</th>
                      <th className="py-3 px-6 text-right">Valor</th>
                      <th className="py-3 px-6">Data de Recebimento</th>
                      <th className="py-3 px-6">Categoria</th>
                      <th className="py-3 px-6 text-center">Status</th>
                      <th className="py-3 px-6 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredIncomes.map(
                      (inc): React.JSX.Element => (
                        <tr key={inc.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-6 font-medium text-text-primary">
                            {inc.description}
                          </td>
                          <td className="py-3.5 px-6 text-right font-mono font-bold text-text-primary tabular-nums">
                            {formatBRL(Number(inc.amount))}
                          </td>
                          <td className="py-3.5 px-6 font-mono text-text-muted text-xs">
                            {formatDate(inc.dueDate)}
                          </td>
                          <td className="py-3.5 px-6 text-xs text-text-muted">
                            {CATEGORY_MAP[inc.category] || inc.category}
                          </td>
                          <td className="py-3.5 px-6 text-center">
                            {inc.status === "CONFIRMED" ? (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-brand-emerald">
                                Confirmado
                              </span>
                            ) : (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-600">
                                Planejado
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-6 text-center">
                            {role !== "VIEWER" ? (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={(): void => handleEditClick(inc)}
                                  className="p-1.5 text-text-muted hover:text-brand-emerald hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                  title="Editar"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(): void => setDeleteTarget(inc)}
                                  className="p-1.5 text-text-muted hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
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
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center text-text-muted text-sm flex flex-col items-center gap-2">
                <Layers className="w-8 h-8 opacity-45 text-text-muted" />
                <span>Nenhuma receita lançada para este período.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reusable Modal Form (Add / Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="bg-surface-white rounded-3xl max-w-lg w-full border border-slate-100/50 shadow-premium flex flex-col max-h-[90vh] animate-scale-up">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-xl font-medium tracking-tight text-text-primary">
                {editingIncome ? "Editar Receita" : "Nova Receita"}
              </h3>
              <button
                type="button"
                onClick={(): void => setIsModalOpen(false)}
                className="text-text-muted hover:text-text-primary p-1 rounded-full hover:bg-slate-100 cursor-pointer"
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
                <div className="p-3.5 bg-orange-50/50 text-orange-800 rounded-2xl text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Status Select Toggle */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider block">
                  Status da Receita
                </span>
                <div className="grid grid-cols-2 gap-2 bg-slate-100/50 p-1.5 rounded-full border border-slate-200/20">
                  <button
                    type="button"
                    onClick={(): void => setStatus("BUDGET")}
                    className={`py-2 px-3 text-xs font-bold rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      status === "BUDGET"
                        ? "bg-amber-600 text-white shadow-premium"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    <PiggyBank className="w-4 h-4" />
                    Planejado
                  </button>
                  <button
                    type="button"
                    onClick={(): void => setStatus("CONFIRMED")}
                    className={`py-2 px-3 text-xs font-bold rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      status === "CONFIRMED"
                        ? "bg-[#10B981] text-white shadow-premium"
                        : "text-text-muted hover:text-text-primary"
                    }`}
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
                  placeholder="Ex: Salário Mensal, Rendimentos..."
                  value={description}
                  onChange={(e): void => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border-transparent focus:ring-2 focus:ring-brand-emerald/50 bg-gray-50 focus:bg-white outline-hidden font-medium text-text-primary text-sm placeholder:text-text-muted transition-all"
                  required
                />
              </div>

              {/* Amount and Due Date Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="amount"
                    className="text-xs font-bold text-text-muted uppercase tracking-wider"
                  >
                    Valor Total (R$) *
                  </label>
                  <input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e): void => setAmount(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border-transparent focus:ring-2 focus:ring-brand-emerald/50 bg-gray-50 focus:bg-white outline-hidden font-mono font-medium text-text-primary text-sm placeholder:text-text-muted transition-all"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="dueDate"
                    className="text-xs font-bold text-text-muted uppercase tracking-wider"
                  >
                    Data de Vencimento *
                  </label>
                  <input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e): void => setDueDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border-transparent focus:ring-2 focus:ring-brand-emerald/50 bg-gray-50 focus:bg-white outline-hidden font-mono font-medium text-text-primary text-sm transition-all"
                    required
                  />
                </div>
              </div>

              {/* Category selector */}
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
                  className="w-full px-4 py-2.5 rounded-2xl border-transparent focus:ring-2 focus:ring-brand-emerald/50 bg-gray-50 focus:bg-white outline-hidden text-text-primary text-sm cursor-pointer transition-all"
                >
                  <option value="SALARY">Salário</option>
                  <option value="INVESTMENT">Investimento</option>
                  <option value="REFUND">Reembolso</option>
                  <option value="OTHER">Outros</option>
                </select>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={(): void => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-semibold rounded-full border border-slate-200 hover:bg-slate-50 text-text-muted transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-brand-emerald hover:bg-brand-emerald/90 text-white text-sm font-semibold rounded-full shadow-premium hover:shadow active:scale-95 transition-all flex items-center gap-2 cursor-pointer border-transparent"
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
          <div className="bg-surface-white rounded-3xl max-w-md w-full border border-slate-100/50 shadow-premium p-6 space-y-6 animate-scale-up">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-orange-50 border border-orange-100 rounded-2xl text-orange-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-medium tracking-tight text-text-primary">
                  Excluir Receita
                </h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  Tem certeza de que deseja excluir a receita{" "}
                  <span className="font-semibold text-text-primary">
                    "{deleteTarget.description}"
                  </span>{" "}
                  no valor de{" "}
                  <span className="font-bold text-text-primary">
                    {formatBRL(Number(deleteTarget.amount))}
                  </span>
                  ? Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={(): void => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-semibold rounded-full border border-slate-200 hover:bg-slate-50 text-text-muted transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={(): Promise<void> => handleDeleteConfirm()}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-full shadow-premium hover:shadow active:scale-95 transition-all cursor-pointer border-transparent"
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

export default function IncomesPage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <div className="w-10 h-10 border-4 border-brand-emerald border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-text-muted font-medium">Carregando receitas...</span>
        </div>
      }
    >
      <IncomesListContent />
    </Suspense>
  );
}
