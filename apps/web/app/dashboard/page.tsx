"use client";

import { apiClient } from "@gestao-casa/shared-logic/api-client/index";
import {
  calculateFinancing,
  type FinancingInstallment,
} from "@gestao-casa/shared-logic/utils/calculate-financing";
import {
  AlertTriangle,
  ArrowRight,
  CreditCard,
  DollarSign,
  Home,
  MapPin,
  Settings,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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

interface House {
  id: string;
  name: string;
  location: string | null;
  totalArea: string | null;
  latitude: string | null;
  longitude: string | null;
  createdAt: string;
}

const HouseMap = dynamic(() => import("../components/HouseMap").then((m) => m.HouseMap), {
  ssr: false,
  loading: (): React.JSX.Element => (
    <div className="h-[250px] w-full bg-slate-100 rounded-lg flex items-center justify-center animate-pulse">
      <span className="text-xs text-mint-slate-400">Carregando mapa...</span>
    </div>
  ),
});

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
  confirmedIncomeSum: number;
  budgetIncomeSum: number;
  totalInflow: number;
  netBalance: number;
}

export default function DashboardPage(): React.JSX.Element {
  const { activeHouseId } = useUser();
  const [house, setHouse] = useState<House | null>(null);
  const [financingRecord, setFinancingRecord] = useState<FinancingRecord | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Fetch house, financing, expense and income data in parallel
  const fetchData = useCallback(async (): Promise<void> => {
    if (!activeHouseId) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [houseData, finData, expData, incData] = await Promise.all([
        apiClient.get("/api/houses/{id}", { params: { id: activeHouseId } }).catch((err) => {
          console.warn("House details fetch failed:", err);
          return null;
        }),
        apiClient
          .get("/api/financing/{house_id}", { params: { house_id: activeHouseId } })
          .catch((err) => {
            console.warn("Financing record fetch failed:", err);
            return null;
          }),
        apiClient.get("/api/expenses", { query: { house_id: activeHouseId } }),
        apiClient.get("/api/incomes", { query: { house_id: activeHouseId } }),
      ]);

      if (houseData) {
        setHouse(houseData as House);
      }
      setFinancingRecord(finData as FinancingRecord | null);
      setExpenses(expData as Expense[]);
      setIncomes(incData as Income[]);
    } catch (err) {
      setErrorMsg("Erro ao conectar ao servidor.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [activeHouseId]);

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

  // Aggregate cash flow data by month
  const monthlyFlows = useMemo((): AggregatedMonthData[] => {
    return columns.map((col): AggregatedMonthData => {
      const monthExpenses = expenses.filter(
        (exp): boolean => exp.dueDate.substring(0, 7) === col.key,
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

      // Incomes
      const monthIncomes = incomes.filter(
        (inc): boolean => inc.dueDate.substring(0, 7) === col.key,
      );

      const confirmedIncomeSum = monthIncomes
        .filter((inc): boolean => inc.status === "CONFIRMED")
        .reduce((sum, inc): number => sum + Number(inc.amount), 0);

      const budgetIncomeSum = monthIncomes
        .filter((inc): boolean => inc.status === "BUDGET")
        .reduce((sum, inc): number => sum + Number(inc.amount), 0);

      const totalInflow = confirmedIncomeSum + budgetIncomeSum;
      const netBalance = totalInflow - totalOutflow;

      return {
        ...col,
        financingInstallment,
        confirmedSum,
        budgetSum,
        totalOutflow,
        confirmedIncomeSum,
        budgetIncomeSum,
        totalInflow,
        netBalance,
      };
    });
  }, [columns, expenses, incomes, getFinancingInstallment]);

  // Formats values to pt-BR BRL Currency
  const formatBRL = (val: number): string => {
    return val.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Compute the 12-month totals for financial categories to show inside the KPI summary cards.
  const totals = useMemo((): {
    totalOutflow: number;
    totalFinancing: number;
    totalConfirmed: number;
    totalBudget: number;
    totalInflow: number;
    totalConfirmedIncome: number;
    totalBudgetIncome: number;
    netBalance: number;
    hasFinancing: boolean;
  } => {
    let totalOutflow = 0;
    let totalFinancing = 0;
    let totalConfirmed = 0;
    let totalBudget = 0;
    let totalInflow = 0;
    let totalConfirmedIncome = 0;
    let totalBudgetIncome = 0;

    for (const val of monthlyFlows) {
      totalOutflow += val.totalOutflow;
      totalFinancing += val.financingInstallment ?? 0;
      totalConfirmed += val.confirmedSum;
      totalBudget += val.budgetSum;
      totalInflow += val.totalInflow;
      totalConfirmedIncome += val.confirmedIncomeSum;
      totalBudgetIncome += val.budgetIncomeSum;
    }

    const netBalance = totalInflow - totalOutflow;

    return {
      totalOutflow,
      totalFinancing,
      totalConfirmed,
      totalBudget,
      totalInflow,
      totalConfirmedIncome,
      totalBudgetIncome,
      netBalance,
      hasFinancing: financingRecord !== null,
    };
  }, [monthlyFlows, financingRecord]);

  const isNetPositive = totals.netBalance >= 0;

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-8">
      {/* Header section with branding & navigation links */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-transparent pb-5 gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary flex items-center gap-2">
            <Home className="w-8 h-8 text-brand-emerald" />
            Fluxo de Caixa Mensal
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Planejamento e análise de entradas e saídas consolidadas para os próximos 12 meses.
          </p>
        </div>

        <nav className="flex space-x-1 bg-white/50 backdrop-blur-md p-1 rounded-full shadow-premium">
          <Link
            href="/dashboard"
            className="px-4 py-2 text-xs font-semibold rounded-full bg-surface-white shadow-premium text-brand-emerald transition-all"
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
            className="px-4 py-2 text-xs font-semibold rounded-full text-text-muted hover:text-text-primary hover:bg-white/40 transition-all"
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
      </header>

      {errorMsg && (
        <div className="p-4 bg-orange-50/50 text-orange-800 rounded-2xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <div className="w-10 h-10 border-4 border-brand-emerald border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-text-muted font-medium">
            Carregando painel financeiro...
          </span>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          {/* Summary KPI Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            {/* Total Inflow (Receitas) */}
            <div className="bg-surface-white rounded-3xl p-6 shadow-premium transition-transform duration-300 hover:-translate-y-1 hover:shadow-premium-hover flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-brand-emerald rounded-2xl">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  Receita Total (12m)
                </span>
                <h3 className="text-xl font-bold font-mono text-text-primary mt-0.5 tabular-nums">
                  {formatBRL(totals.totalInflow)}
                </h3>
              </div>
            </div>

            {/* Total Outflow (Saídas) */}
            <div className="bg-surface-white rounded-3xl p-6 shadow-premium transition-transform duration-300 hover:-translate-y-1 hover:shadow-premium-hover flex items-center gap-4">
              <div className="p-3 bg-slate-100 text-text-muted rounded-2xl">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  Saída Total (12m)
                </span>
                <h3 className="text-xl font-bold font-mono text-text-primary mt-0.5 tabular-nums">
                  {formatBRL(totals.totalOutflow)}
                </h3>
              </div>
            </div>

            {/* Net Balance (Saldo Líquido) */}
            <div className="bg-surface-white rounded-3xl p-6 shadow-premium transition-transform duration-300 hover:-translate-y-1 hover:shadow-premium-hover flex items-center gap-4">
              <div
                className={`p-3 rounded-2xl ${isNetPositive ? "bg-emerald-50 text-brand-emerald" : "bg-rose-50 text-rose-600"}`}
              >
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  Saldo Líquido (12m)
                </span>
                <h3
                  className={`text-xl font-bold font-mono mt-0.5 tabular-nums ${isNetPositive ? "text-[#10B981]" : "text-[#F43F5E]"}`}
                >
                  {formatBRL(totals.netBalance)}
                </h3>
              </div>
            </div>

            {/* Confirmed expenses */}
            <div className="bg-surface-white rounded-3xl p-6 shadow-premium transition-transform duration-300 hover:-translate-y-1 hover:shadow-premium-hover flex items-center gap-4">
              <div className="p-3 bg-rose-50 rounded-2xl text-rose-600">
                <TrendingDown className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  Despesas Confirmadas
                </span>
                <h3 className="text-xl font-bold font-mono text-text-primary mt-0.5 tabular-nums">
                  {formatBRL(totals.totalConfirmed)}
                </h3>
              </div>
            </div>

            {/* Budgets */}
            <div className="bg-surface-white rounded-3xl p-6 shadow-premium transition-transform duration-300 hover:-translate-y-1 hover:shadow-premium-hover flex items-center gap-4">
              <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  Orçamento Planejado
                </span>
                <h3 className="text-xl font-bold font-mono text-text-primary mt-0.5 tabular-nums">
                  {formatBRL(totals.totalBudget)}
                </h3>
              </div>
            </div>

            {/* Financing */}
            <div className="bg-surface-white rounded-3xl p-6 shadow-premium transition-transform duration-300 hover:-translate-y-1 hover:shadow-premium-hover flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  Financiamento (12m)
                </span>
                <h3 className="text-xl font-bold font-mono text-text-primary mt-0.5 tabular-nums">
                  {totals.hasFinancing ? formatBRL(totals.totalFinancing) : "—"}
                </h3>
              </div>
            </div>
          </section>

          {/* Macro Area Chart summarizing the year */}
          <section className="bg-surface-white rounded-3xl p-6 shadow-premium">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h2 className="text-xl font-medium tracking-tight text-text-primary">
                  Resumo Anual de Fluxo de Caixa
                </h2>
                <p className="text-xs text-text-muted mt-1">
                  Projeção consolidada das entradas e saídas nos próximos 12 meses.
                </p>
              </div>
              <div className="flex gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#10B981]" />
                  <span className="text-text-primary">Entradas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#F43F5E]" />
                  <span className="text-text-primary">Saídas</span>
                </div>
              </div>
            </div>
            <div className="w-full h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyFlows} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="label"
                    stroke="#86868B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#86868B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val: number): string => `R$ ${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      borderRadius: "16px",
                      border: "none",
                      boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
                      backdropFilter: "blur(12px)",
                    }}
                    labelStyle={{ fontWeight: 600, color: "#1D1D1F" }}
                    formatter={(value: unknown, name: unknown): [string, string] => [
                      formatBRL(Number(value || 0)),
                      name === "totalInflow" ? "Entradas" : "Saídas",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="totalInflow"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#inflowGrad)"
                    name="totalInflow"
                  />
                  <Area
                    type="monotone"
                    dataKey="totalOutflow"
                    stroke="#F43F5E"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#outflowGrad)"
                    name="totalOutflow"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Section: Sua Residência & Localização */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* House Info Card */}
            <div className="bg-surface-white rounded-3xl p-6 shadow-premium flex flex-col justify-between transition-transform duration-300 hover:-translate-y-1 hover:shadow-premium-hover">
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
                  <Home className="w-5 h-5 text-brand-emerald" />
                  <h2 className="text-lg font-medium tracking-tight text-text-primary">
                    Sua Residência
                  </h2>
                </div>

                {house ? (
                  <div className="space-y-3.5 text-sm">
                    <div>
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                        Nome
                      </span>
                      <p className="text-base font-semibold text-text-primary">{house.name}</p>
                    </div>
                    {house.location && (
                      <div>
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                          Endereço
                        </span>
                        <p className="text-xs font-medium text-text-muted">{house.location}</p>
                      </div>
                    )}
                    {house.totalArea && (
                      <div>
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                          Área Total
                        </span>
                        <p className="text-xs font-semibold text-text-primary font-mono">
                          {Number(house.totalArea).toLocaleString("pt-BR")} m²
                        </p>
                      </div>
                    )}
                    {(house.latitude || house.longitude) && (
                      <div>
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                          Coordenadas
                        </span>
                        <p className="text-[10px] font-mono text-text-muted">
                          Lat: {house.latitude || "—"} / Lng: {house.longitude || "—"}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted">Nenhuma informação de casa encontrada.</p>
                )}
              </div>

              <Link
                href="/settings"
                className="mt-6 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-canvas-frost hover:bg-[#E8E8ED] text-text-primary text-xs font-semibold rounded-full active:scale-95 transition-all cursor-pointer shadow-premium"
              >
                <Settings className="w-4 h-4 text-text-muted" />
                Configurar Residência
              </Link>
            </div>

            {/* Map Card */}
            <div className="lg:col-span-2 bg-surface-white rounded-3xl p-6 shadow-premium flex flex-col gap-4 min-h-[300px] transition-transform duration-300 hover:-translate-y-1 hover:shadow-premium-hover">
              <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-brand-emerald" />
                  <h2 className="text-lg font-medium tracking-tight text-text-primary">
                    Localização
                  </h2>
                </div>
                {house?.latitude && house?.longitude && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${house.latitude},${house.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-brand-emerald hover:opacity-80 transition-all cursor-pointer"
                  >
                    Ver no Google Maps
                  </a>
                )}
              </div>

              <div className="flex-grow w-full h-full min-h-[220px] relative rounded-2xl overflow-hidden bg-canvas-frost">
                {house?.latitude && house?.longitude ? (
                  <HouseMap
                    latitude={Number(house.latitude)}
                    longitude={Number(house.longitude)}
                    interactive={false}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 gap-3">
                    <div className="p-3 bg-white rounded-full shadow-premium">
                      <MapPin className="w-5 h-5 text-text-muted" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-text-primary">
                        Localização não definida
                      </p>
                      <p className="text-[10px] text-text-muted mt-1 max-w-xs">
                        Defina a localização da sua residência nas configurações para exibir o mapa.
                      </p>
                    </div>
                    <Link
                      href="/settings"
                      className="mt-2 text-xs font-bold text-brand-emerald hover:opacity-80 transition-all"
                    >
                      Configurar agora →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Detailed View: Current & Next Month */}
          <section className="space-y-4">
            <h2 className="text-xl font-medium tracking-tight text-text-primary">
              Foco Imediato: Meses Corrente e Seguinte
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {monthlyFlows.slice(0, 2).map((item, idx) => {
                const isItemPositive = item.netBalance >= 0;
                const isCurrent = idx === 0;
                return (
                  <Link href={`/expenses?month=${item.key}`} key={item.key} className="block group">
                    <div className="bg-surface-white rounded-3xl p-6 shadow-premium transition-all duration-300 hover:-translate-y-1 hover:shadow-premium-hover flex flex-col gap-6 relative overflow-hidden h-full">
                      {/* Accent ribbon to demarcate current vs next month */}
                      <div
                        className={`absolute top-0 left-0 w-full h-1.5 ${isCurrent ? "bg-brand-emerald" : "bg-blue-500"}`}
                      />

                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <div>
                          <span className="text-[10px] font-semibold text-text-muted tracking-wider uppercase">
                            {isCurrent ? "Mês Atual" : "Próximo Mês"}
                          </span>
                          <h3 className="text-2xl font-semibold tracking-tight text-text-primary group-hover:text-brand-emerald transition-colors mt-0.5">
                            {item.label}
                          </h3>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-canvas-frost flex items-center justify-center text-text-muted group-hover:translate-x-1 group-hover:bg-brand-emerald/10 group-hover:text-brand-emerald transition-all">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>

                      {/* Grid representation of detailed aggregates */}
                      <div className="grid grid-cols-2 gap-6">
                        {/* Inflow breakdown */}
                        <div className="space-y-3">
                          <span className="text-xs font-bold text-brand-emerald uppercase tracking-wider block">
                            Receitas
                          </span>
                          <div className="space-y-2">
                            <div className="p-3 bg-emerald-50/50 rounded-2xl flex flex-col gap-0.5">
                              <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">
                                Confirmadas
                              </span>
                              <span className="text-base font-semibold font-mono tabular-nums text-emerald-950">
                                {formatBRL(item.confirmedIncomeSum)}
                              </span>
                            </div>
                            <div className="p-3 bg-teal-50/50 rounded-2xl flex flex-col gap-0.5">
                              <span className="text-[10px] text-teal-800 font-bold uppercase tracking-wider">
                                Planejadas
                              </span>
                              <span className="text-base font-semibold font-mono tabular-nums text-teal-950">
                                {formatBRL(item.budgetIncomeSum)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Outflow breakdown */}
                        <div className="space-y-3">
                          <span className="text-xs font-bold text-rose-600 uppercase tracking-wider block">
                            Saídas
                          </span>
                          <div className="space-y-2">
                            <div className="p-3 bg-rose-50/50 rounded-2xl flex flex-col gap-0.5">
                              <span className="text-[10px] text-rose-800 font-bold uppercase tracking-wider">
                                Confirmadas
                              </span>
                              <span className="text-base font-semibold font-mono tabular-nums text-rose-950">
                                {formatBRL(item.confirmedSum)}
                              </span>
                            </div>
                            <div className="p-3 bg-amber-50/50 rounded-2xl flex flex-col gap-0.5">
                              <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider">
                                Orçamentos
                              </span>
                              <span className="text-base font-semibold font-mono tabular-nums text-amber-950">
                                {formatBRL(item.budgetSum)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Financing Summary and Net Balance footer */}
                      <div className="border-t border-slate-100 pt-4 mt-auto space-y-3">
                        <div className="flex justify-between items-center text-sm font-medium text-text-primary">
                          <span className="text-text-muted">Financiamento do Mês</span>
                          <span className="font-mono tabular-nums">
                            {item.financingInstallment !== null
                              ? formatBRL(item.financingInstallment)
                              : "—"}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-sm font-medium text-text-primary">
                          <span className="text-text-muted">Saída Total</span>
                          <span className="font-mono tabular-nums">
                            {formatBRL(item.totalOutflow)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                          <span className="text-sm font-semibold text-text-primary">
                            Saldo Líquido
                          </span>
                          <span
                            className={`text-lg font-bold font-mono tabular-nums ${isItemPositive ? "text-[#10B981]" : "text-[#F43F5E]"}`}
                          >
                            {formatBRL(item.netBalance)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Horizontal Scrolling for remaining months */}
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-medium tracking-tight text-text-primary">Outros Meses</h2>
              <span className="text-xs text-text-muted font-medium">
                Arraste horizontalmente para ver a projeção completa
              </span>
            </div>

            {/* Scrollable container with no-scrollbar style */}
            <div className="overflow-x-auto flex gap-6 pb-6 pt-2 no-scrollbar scroll-smooth">
              {monthlyFlows.slice(2).map((item) => {
                const isItemPositive = item.netBalance >= 0;
                return (
                  <Link
                    href={`/expenses?month=${item.key}`}
                    key={item.key}
                    className="block group shrink-0 w-[240px]"
                  >
                    <div className="bg-surface-white rounded-3xl p-5 shadow-premium border border-transparent transition-all duration-300 hover:-translate-y-1 hover:shadow-premium-hover flex flex-col gap-4 relative overflow-hidden h-full">
                      <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
                        <span className="text-sm font-semibold text-text-primary uppercase group-hover:text-brand-emerald transition-colors">
                          {item.label}
                        </span>
                        <span className="text-text-muted group-hover:translate-x-1 transition-transform">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>

                      <div className="space-y-3.5 flex-grow text-xs">
                        {/* Summary stats */}
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] uppercase font-semibold text-text-muted">
                            Receitas
                          </span>
                          <span className="font-mono tabular-nums font-bold text-text-primary">
                            {formatBRL(item.totalInflow)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-[10px] uppercase font-semibold text-text-muted">
                            Despesas
                          </span>
                          <span className="font-mono tabular-nums font-bold text-text-primary">
                            {formatBRL(item.confirmedSum + item.budgetSum)}
                          </span>
                        </div>

                        {item.financingInstallment !== null && (
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] uppercase font-semibold text-text-muted">
                              Financ.
                            </span>
                            <span className="font-mono tabular-nums font-bold text-text-primary">
                              {formatBRL(item.financingInstallment)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-slate-100 pt-3 mt-auto space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-text-muted uppercase">
                            Saída Total
                          </span>
                          <span className="font-mono tabular-nums font-bold text-text-primary">
                            {formatBRL(item.totalOutflow)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-text-muted uppercase">
                            Saldo Líquido
                          </span>
                          <span
                            className={`font-mono tabular-nums font-extrabold ${isItemPositive ? "text-[#10B981]" : "text-[#F43F5E]"}`}
                          >
                            {formatBRL(item.netBalance)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
