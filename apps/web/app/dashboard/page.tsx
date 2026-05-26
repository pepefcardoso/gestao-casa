"use client";

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
import {
  calculateFinancing,
  type FinancingInstallment,
} from "../../../../libs/shared-logic/src/utils/calculate-financing";
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

const HouseMap = dynamic(() => import("../components/HouseMap"), {
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
      const [houseRes, financingRes, expensesRes, incomesRes] = await Promise.all([
        fetch(`/api/houses/${activeHouseId}`),
        fetch(`/api/financing/${activeHouseId}`),
        fetch(`/api/expenses?house_id=${activeHouseId}`),
        fetch(`/api/incomes?house_id=${activeHouseId}`),
      ]);

      if (houseRes.ok) {
        const houseData: unknown = await houseRes.json();
        setHouse(houseData as House);
      } else {
        console.warn("House details fetch returned status:", houseRes.status);
      }

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

      if (incomesRes.ok) {
        const incData: unknown = await incomesRes.json();
        setIncomes(incData as Income[]);
      } else {
        setErrorMsg("Erro ao carregar receitas.");
      }
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

  // 12-month totals summary card computations
  const totals = useMemo(() => {
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
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-mint-slate-400/30 pb-5 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0e1717] flex items-center gap-2">
            <Home className="w-8 h-8 text-emerald-600" />
            Fluxo de Caixa Mensal
          </h1>
          <p className="text-sm text-mint-slate-400 mt-1">
            Planejamento e análise de entradas e saídas consolidadas para os próximos 12 meses.
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
            href="/incomes"
            className="px-4 py-2 text-sm font-semibold rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/40 transition-all"
          >
            Receitas
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
          <span className="text-sm text-mint-slate-400 font-medium">
            Carregando painel financeiro...
          </span>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          {/* Summary KPI Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            {/* Total Inflow (Receitas) */}
            <div className="bg-white border border-mint-slate-400/20 rounded-xl p-6 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Receita Total (12m)
                </span>
                <h3 className="text-2xl font-bold font-mono text-[#0e1717] mt-0.5">
                  {formatBRL(totals.totalInflow)}
                </h3>
              </div>
            </div>

            {/* Total Outflow (Saídas) */}
            <div className="bg-white border border-mint-slate-400/20 rounded-xl p-6 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-slate-100 text-slate-600 rounded-lg">
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

            {/* Net Balance (Saldo Líquido) */}
            <div className="bg-white border border-mint-slate-400/20 rounded-xl p-6 shadow-sm flex items-center gap-4">
              <div
                className={`p-3 rounded-lg ${isNetPositive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}
              >
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Saldo Líquido (12m)
                </span>
                <h3
                  className={`text-2xl font-bold font-mono mt-0.5 ${isNetPositive ? "text-emerald-700" : "text-rose-700"}`}
                >
                  {formatBRL(totals.netBalance)}
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

          {/* Section: Sua Residência & Localização */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* House Info Card */}
            <div className="bg-white border border-mint-slate-400/20 rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
                  <Home className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-lg font-semibold text-[#0e1717]">Sua Residência</h2>
                </div>

                {house ? (
                  <div className="space-y-3.5">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Nome
                      </span>
                      <p className="text-base font-semibold text-[#0e1717]">{house.name}</p>
                    </div>
                    {house.location && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Endereço
                        </span>
                        <p className="text-sm font-medium text-slate-600">{house.location}</p>
                      </div>
                    )}
                    {house.totalArea && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Área Total
                        </span>
                        <p className="text-sm font-semibold text-[#0e1717] font-mono">
                          {Number(house.totalArea).toLocaleString("pt-BR")} m²
                        </p>
                      </div>
                    )}
                    {(house.latitude || house.longitude) && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Coordenadas
                        </span>
                        <p className="text-xs font-mono text-slate-500">
                          Lat: {house.latitude || "—"} / Lng: {house.longitude || "—"}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-mint-slate-400">
                    Nenhuma informação de casa encontrada.
                  </p>
                )}
              </div>

              <Link
                href="/settings"
                className="mt-6 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-sm font-semibold rounded-lg transition-colors border border-slate-200/50 cursor-pointer"
              >
                <Settings className="w-4 h-4 text-slate-500" />
                Configurar Residência
              </Link>
            </div>

            {/* Map Card */}
            <div className="lg:col-span-2 bg-white border border-mint-slate-400/20 rounded-xl p-6 shadow-sm flex flex-col gap-4 min-h-[300px]">
              <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-lg font-semibold text-[#0e1717]">Localização</h2>
                </div>
                {house?.latitude && house?.longitude && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${house.latitude},${house.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                  >
                    Ver no Google Maps
                  </a>
                )}
              </div>

              <div className="flex-grow w-full h-full min-h-[220px] relative rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
                {house?.latitude && house?.longitude ? (
                  <HouseMap
                    latitude={Number(house.latitude)}
                    longitude={Number(house.longitude)}
                    interactive={false}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 gap-3">
                    <div className="p-3 bg-slate-100 text-slate-400 rounded-full">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#0e1717]">
                        Localização não definida
                      </p>
                      <p className="text-xs text-mint-slate-400 mt-1 max-w-xs">
                        Defina a localização da sua residência nas configurações para exibir o mapa.
                      </p>
                    </div>
                    <Link
                      href="/settings"
                      className="mt-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                    >
                      Configurar agora →
                    </Link>
                  </div>
                )}
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
              {monthlyFlows.map((item): React.JSX.Element => {
                const isItemPositive = item.netBalance >= 0;
                return (
                  <Link href={`/expenses?month=${item.key}`} key={item.key} className="block group">
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
                        {/* Receitas row */}
                        <div className="space-y-1">
                          <span className="text-[8px] font-extrabold text-emerald-700 uppercase tracking-wider block">
                            Receitas
                          </span>
                          <div className="grid grid-cols-2 gap-1">
                            <div className="bg-emerald-600 text-white rounded-md p-1 flex flex-col gap-0.5 text-center">
                              <span className="text-[7px] uppercase font-bold tracking-wider opacity-90">
                                Conf.
                              </span>
                              <span className="text-[9px] font-mono font-bold">
                                {formatBRL(item.confirmedIncomeSum)}
                              </span>
                            </div>
                            <div className="bg-teal-600 text-white rounded-md p-1 flex flex-col gap-0.5 text-center">
                              <span className="text-[7px] uppercase font-bold tracking-wider opacity-90">
                                Plan.
                              </span>
                              <span className="text-[9px] font-mono font-bold">
                                {formatBRL(item.budgetIncomeSum)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Despesas row */}
                        <div className="space-y-1">
                          <span className="text-[8px] font-extrabold text-rose-700 uppercase tracking-wider block">
                            Saídas (Despesas)
                          </span>
                          <div className="grid grid-cols-2 gap-1">
                            <div className="bg-rose-600 text-white rounded-md p-1 flex flex-col gap-0.5 text-center">
                              <span className="text-[7px] uppercase font-bold tracking-wider opacity-90">
                                Conf.
                              </span>
                              <span className="text-[9px] font-mono font-bold">
                                {formatBRL(item.confirmedSum)}
                              </span>
                            </div>
                            <div className="bg-amber-600 text-white rounded-md p-1 flex flex-col gap-0.5 text-center">
                              <span className="text-[7px] uppercase font-bold tracking-wider opacity-90">
                                Orç.
                              </span>
                              <span className="text-[9px] font-mono font-bold">
                                {formatBRL(item.budgetSum)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Financing installment row */}
                        <div className="flex justify-between items-center p-1.5 rounded-lg bg-slate-50 border border-slate-100/80 text-[10px]">
                          <span className="font-bold text-slate-500 uppercase tracking-wider text-[8px]">
                            Financ.
                          </span>
                          <span className="font-mono font-bold text-[#0e1717]">
                            {item.financingInstallment !== null
                              ? formatBRL(item.financingInstallment)
                              : "—"}
                          </span>
                        </div>
                      </div>

                      {/* Total & Net Balance section */}
                      <div className="border-t border-slate-100 pt-3 mt-auto space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[8px] text-slate-500 font-semibold uppercase tracking-wider">
                            Saída Total
                          </span>
                          <span className="text-xs font-mono font-bold text-[#0e1717]">
                            {formatBRL(item.totalOutflow)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-50">
                          <span className="text-[8px] text-slate-500 font-semibold uppercase tracking-wider">
                            Saldo Líquido
                          </span>
                          <span
                            className={`text-xs font-mono font-extrabold ${isItemPositive ? "text-emerald-700" : "text-rose-700"}`}
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
