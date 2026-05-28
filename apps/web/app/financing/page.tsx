"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { calculateFinancing } from "../../../../libs/shared-logic/src/utils/calculate-financing";
import { useUser } from "../components/UserContext";

interface ValidationErrors {
  propertyValue?: string;
  downPayment?: string;
  termMonths?: string;
  interestRate?: string;
}

export default function FinancingPage(): React.JSX.Element {
  const { activeHouseId, role } = useUser();

  // Form states
  const [propertyValue, setPropertyValue] = useState<number>(500000);
  const [downPayment, setDownPayment] = useState<number>(100000);
  const [termMonths, setTermMonths] = useState<number>(360);
  const [interestRatePercentage, setInterestRatePercentage] = useState<number>(10);
  const [amortizationSystem, setAmortizationSystem] = useState<"SAC" | "PRICE">("SAC");

  // New Caixa calculation states
  const [adminFee, setAdminFee] = useState<number | undefined>(undefined);
  const [mipRatePercentage, setMipRatePercentage] = useState<number | undefined>(undefined);
  const [dfiRatePercentage, setDfiRatePercentage] = useState<number | undefined>(undefined);
  const [trRatePercentage, setTrRatePercentage] = useState<number | undefined>(undefined);
  const [interestMethod, setInterestMethod] = useState<"compound" | "linear">("compound");

  // Override states
  const [firstParcelOverride, setFirstParcelOverride] = useState<number | undefined>(undefined);
  const [lastParcelOverride, setLastParcelOverride] = useState<number | undefined>(undefined);

  // Status states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch initial data
  const fetchInitialData = useCallback(async (): Promise<void> => {
    if (!activeHouseId) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await fetch(`/api/financing/${activeHouseId}`);
      if (response.ok) {
        const data: unknown = await response.json();
        if (data && typeof data === "object") {
          const record = data as {
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
          };
          setPropertyValue(Number(record.propertyValue));
          setDownPayment(Number(record.downPayment));
          setTermMonths(record.termMonths);
          setInterestRatePercentage(Number(record.interestRate) * 100);
          setAmortizationSystem(record.amortizationSystem);
          setFirstParcelOverride(
            record.firstParcelOverride ? Number(record.firstParcelOverride) : undefined,
          );
          setLastParcelOverride(
            record.lastParcelOverride ? Number(record.lastParcelOverride) : undefined,
          );
          setAdminFee(record.adminFee ? Number(record.adminFee) : undefined);
          setMipRatePercentage(record.mipRate ? Number(record.mipRate) * 100 : undefined);
          setDfiRatePercentage(record.dfiRate ? Number(record.dfiRate) * 100 : undefined);
          setTrRatePercentage(record.trRate ? Number(record.trRate) * 100 : undefined);
          setInterestMethod((record.interestMethod as "compound" | "linear") || "compound");
        }
      } else if (response.status !== 404) {
        setFetchError("Erro ao carregar dados salvos do financiamento.");
      }
    } catch {
      setFetchError("Erro ao conectar ao servidor para carregar dados.");
    } finally {
      setIsLoading(false);
    }
  }, [activeHouseId]);

  // Client hydration check for Recharts
  const [isMounted, setIsMounted] = useState<boolean>(false);
  useEffect((): void => {
    setIsMounted(true);
    fetchInitialData();
  }, [fetchInitialData]);

  // Save changes
  const handleSave = async (): Promise<void> => {
    if (Object.keys(validationErrors).length > 0 || !activeHouseId || role === "VIEWER") return;
    setIsSaving(true);
    setSaveStatus(null);

    const payload = {
      houseId: activeHouseId,
      propertyValue,
      downPayment,
      termMonths,
      interestRate: interestRatePercentage / 100,
      amortizationSystem,
      firstParcelOverride: firstParcelOverride ?? null,
      lastParcelOverride: lastParcelOverride ?? null,
      adminFee: adminFee ?? null,
      mipRate: mipRatePercentage !== undefined ? mipRatePercentage / 100 : null,
      dfiRate: dfiRatePercentage !== undefined ? dfiRatePercentage / 100 : null,
      trRate: trRatePercentage !== undefined ? trRatePercentage / 100 : null,
      interestMethod,
    };

    try {
      const response = await fetch("/api/financing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSaveStatus({
          type: "success",
          message: "Configuração do financiamento salva com sucesso!",
        });
      } else {
        const data: unknown = await response.json();
        const errorMsg =
          data && typeof data === "object" && "error" in data
            ? String((data as { error: unknown }).error)
            : "Erro ao salvar dados.";
        setSaveStatus({ type: "error", message: errorMsg });
      }
    } catch {
      setSaveStatus({ type: "error", message: "Erro de conexão ao salvar." });
    } finally {
      setIsSaving(false);
    }
  };

  // Form validations
  const validationErrors = useMemo((): ValidationErrors => {
    const errors: ValidationErrors = {};
    if (propertyValue <= 0) {
      errors.propertyValue = "O valor do imóvel deve ser maior que R$ 0.";
    }
    if (downPayment < 0) {
      errors.downPayment = "A entrada não pode ser menor que R$ 0.";
    }
    if (downPayment >= propertyValue) {
      errors.downPayment = "A entrada deve ser menor que o valor do imóvel.";
    }
    if (termMonths < 1 || termMonths > 420) {
      errors.termMonths = "O prazo deve ser entre 1 e 420 meses.";
    }
    if (interestRatePercentage < 0) {
      errors.interestRate = "A taxa de juros não pode ser negativa.";
    }
    return errors;
  }, [propertyValue, downPayment, termMonths, interestRatePercentage]);

  // Reactive amortization calculations (no API request required)
  const installments = useMemo(() => {
    if (
      propertyValue - downPayment <= 0 ||
      termMonths <= 0 ||
      Object.keys(validationErrors).length > 0
    ) {
      return [];
    }
    const calculated = calculateFinancing({
      propertyValue,
      downPayment,
      termMonths,
      interestRate: interestRatePercentage / 100,
      amortizationSystem,
      firstParcelOverride,
      lastParcelOverride,
      adminFee,
      mipRate: mipRatePercentage !== undefined ? mipRatePercentage / 100 : undefined,
      dfiRate: dfiRatePercentage !== undefined ? dfiRatePercentage / 100 : undefined,
      trRate: trRatePercentage !== undefined ? trRatePercentage / 100 : undefined,
      interestMethod,
    });
    return calculated.map((inst) => ({
      ...inst,
      feesAndInsurance: inst.adminFee + inst.mip + inst.dfi,
    }));
  }, [
    propertyValue,
    downPayment,
    termMonths,
    interestRatePercentage,
    amortizationSystem,
    firstParcelOverride,
    lastParcelOverride,
    adminFee,
    mipRatePercentage,
    dfiRatePercentage,
    trRatePercentage,
    interestMethod,
    validationErrors,
  ]);

  // Format currency Helper
  const formatBRL = (val: number): string => {
    return val.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-6 animate-fade-in">
      {/* Navigation & Header */}
      <div className="space-y-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-semibold text-brand-emerald hover:opacity-85 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o Painel
        </Link>

        <header className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
              Simulador de Financiamento
            </h1>
            <p className="text-xs text-text-muted mt-1">
              Controle e projete amortizações e parcelas customizadas de maneira reativa.
            </p>
          </div>

          <nav className="flex space-x-1 bg-slate-200/40 p-1 rounded-full">
            <Link
              href="/dashboard"
              className="px-4 py-2 text-xs font-semibold rounded-full text-text-muted hover:text-text-primary hover:bg-white/40 active:scale-95 transition-all"
            >
              Fluxo de Caixa
            </Link>
            <Link
              href="/financing"
              className="px-4 py-2 text-xs font-semibold rounded-full bg-surface-white shadow-premium text-brand-emerald transition-all"
            >
              Simulador
            </Link>
            <Link
              href="/expenses"
              className="px-4 py-2 text-xs font-semibold rounded-full text-text-muted hover:text-text-primary hover:bg-white/40 active:scale-95 transition-all"
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
        </header>
      </div>

      {saveStatus && (
        <div
          className={`px-4 py-2.5 rounded-lg text-sm font-medium flex items-center justify-between gap-2 animate-fade-in ${
            saveStatus.type === "success"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-orange-50 text-orange-800"
          }`}
        >
          <span>{saveStatus.message}</span>
          <button
            onClick={(): void => setSaveStatus(null)}
            className="hover:opacity-70 font-semibold px-1 text-xs"
            type="button"
          >
            ✕
          </button>
        </div>
      )}

      {fetchError && (
        <div className="p-4 bg-orange-50 text-orange-800 rounded-lg text-sm">{fetchError}</div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-mint-slate-400">Carregando dados salvos...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left panel: form configuration */}
          <section className="lg:col-span-4 bg-surface-white rounded-3xl shadow-premium p-6 space-y-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-premium-hover">
            <h2 className="text-lg font-medium tracking-tight text-text-primary pb-3">
              Parâmetros de Entrada
            </h2>

            <div className="space-y-4">
              {/* Property Value */}
              <div>
                <label
                  htmlFor="property-value-input"
                  className="block text-xs font-semibold text-text-primary mb-1.5 uppercase tracking-wider"
                >
                  Valor do Imóvel (R$)
                </label>
                <input
                  id="property-value-input"
                  type="number"
                  value={propertyValue}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                    setPropertyValue(Number(e.target.value));
                    setSaveStatus(null);
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-2xl text-sm bg-gray-50 focus:ring-2 focus:ring-brand-emerald/50 focus:bg-white outline-hidden transition-all border-0 ${
                    validationErrors.propertyValue ? "ring-2 ring-rose-500" : ""
                  }`}
                />
                {validationErrors.propertyValue && (
                  <p className="text-xs text-rose-600 mt-1">{validationErrors.propertyValue}</p>
                )}
              </div>

              {/* Down Payment */}
              <div>
                <label
                  htmlFor="down-payment-input"
                  className="block text-xs font-semibold text-text-primary mb-1.5 uppercase tracking-wider"
                >
                  Entrada (R$)
                </label>
                <input
                  id="down-payment-input"
                  type="number"
                  value={downPayment}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                    setDownPayment(Number(e.target.value));
                    setSaveStatus(null);
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-2xl text-sm bg-gray-50 focus:ring-2 focus:ring-brand-emerald/50 focus:bg-white outline-hidden transition-all border-0 ${
                    validationErrors.downPayment ? "ring-2 ring-rose-500" : ""
                  }`}
                />
                {validationErrors.downPayment && (
                  <p className="text-xs text-rose-600 mt-1">{validationErrors.downPayment}</p>
                )}
              </div>

              {/* Financed summary */}
              {propertyValue - downPayment > 0 && (
                <div className="bg-canvas-frost rounded-2xl p-4 flex justify-between items-center text-xs">
                  <span className="text-text-muted">Valor Financiado:</span>
                  <span className="font-semibold text-text-primary tabular-nums">
                    {formatBRL(propertyValue - downPayment)}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Term */}
                <div>
                  <label
                    htmlFor="term-months-input"
                    className="block text-xs font-semibold text-text-primary mb-1.5 uppercase tracking-wider"
                  >
                    Prazo (Meses)
                  </label>
                  <input
                    id="term-months-input"
                    type="number"
                    value={termMonths}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                      setTermMonths(Number(e.target.value));
                      setSaveStatus(null);
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-2xl text-sm bg-gray-50 focus:ring-2 focus:ring-brand-emerald/50 focus:bg-white outline-hidden transition-all border-0 ${
                      validationErrors.termMonths ? "ring-2 ring-rose-500" : ""
                    }`}
                  />
                  {validationErrors.termMonths && (
                    <p className="text-xs text-rose-600 mt-1">{validationErrors.termMonths}</p>
                  )}
                </div>

                {/* Interest Rate */}
                <div>
                  <label
                    htmlFor="interest-rate-input"
                    className="block text-xs font-semibold text-text-primary mb-1.5 uppercase tracking-wider"
                  >
                    Taxa Anual (%)
                  </label>
                  <input
                    id="interest-rate-input"
                    type="number"
                    step="0.01"
                    value={interestRatePercentage}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                      setInterestRatePercentage(Number(e.target.value));
                      setSaveStatus(null);
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-2xl text-sm bg-gray-50 focus:ring-2 focus:ring-brand-emerald/50 focus:bg-white outline-hidden transition-all border-0 ${
                      validationErrors.interestRate ? "ring-2 ring-rose-500" : ""
                    }`}
                  />
                  {validationErrors.interestRate && (
                    <p className="text-xs text-rose-600 mt-1">{validationErrors.interestRate}</p>
                  )}
                </div>
              </div>

              {/* Amortization System */}
              <div>
                <label
                  htmlFor="amortization-system-select"
                  className="block text-xs font-semibold text-text-primary mb-1.5 uppercase tracking-wider"
                >
                  Sistema de Amortização
                </label>
                <select
                  id="amortization-system-select"
                  value={amortizationSystem}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>): void => {
                    setAmortizationSystem(e.target.value as "SAC" | "PRICE");
                    setSaveStatus(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-2xl text-sm bg-gray-50 focus:ring-2 focus:ring-brand-emerald/50 focus:bg-white outline-hidden transition-all border-0"
                >
                  <option value="SAC">SAC (Amortização Constante)</option>
                  <option value="PRICE">PRICE (Parcela Constante)</option>
                </select>
              </div>

              {/* Caixa custom settings section */}
              <div className="border-t border-slate-100 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                    Custos e Seguros (Caixa)
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setAmortizationSystem("SAC");
                      setInterestMethod("linear");
                      setAdminFee(25);
                      setMipRatePercentage(0.028513); // exactly matches the Caixa simulation of R$ 65.38 MIP/DFI sum
                      setDfiRatePercentage(0);
                      setTrRatePercentage(0);
                      setSaveStatus(null);
                    }}
                    className="text-[10px] font-semibold text-brand-emerald hover:opacity-85 cursor-pointer bg-emerald-50 rounded-full px-2.5 py-0.5 active:scale-95 transition-all"
                  >
                    Usar Preset Caixa
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Interest Method */}
                  <div className="col-span-2">
                    <label
                      htmlFor="interest-method-select"
                      className="block text-[10px] font-semibold text-text-muted mb-1.5 uppercase"
                    >
                      Conversão de Juros
                    </label>
                    <select
                      id="interest-method-select"
                      value={interestMethod}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>): void => {
                        setInterestMethod(e.target.value as "compound" | "linear");
                        setSaveStatus(null);
                      }}
                      className="w-full px-3 py-2 bg-gray-50 focus:bg-white rounded-xl text-xs focus:ring-2 focus:ring-brand-emerald/50 outline-hidden border-0 transition-all text-text-primary"
                    >
                      <option value="compound">Composto (Padrão)</option>
                      <option value="linear">Linear (Caixa - Nominal / 12)</option>
                    </select>
                  </div>

                  {/* Admin Fee */}
                  <div>
                    <label
                      htmlFor="admin-fee-input"
                      className="block text-[10px] font-semibold text-text-muted mb-1.5 uppercase"
                    >
                      Taxa Admin (R$)
                    </label>
                    <input
                      id="admin-fee-input"
                      type="number"
                      placeholder="0.00"
                      value={adminFee ?? ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                        const val = e.target.value;
                        setAdminFee(val === "" ? undefined : Number(val));
                        setSaveStatus(null);
                      }}
                      className="w-full px-3 py-2 bg-gray-50 focus:bg-white rounded-xl text-xs focus:ring-2 focus:ring-brand-emerald/50 outline-hidden border-0 transition-all text-text-primary"
                    />
                  </div>

                  {/* TR Rate */}
                  <div>
                    <label
                      htmlFor="tr-rate-input"
                      className="block text-[10px] font-semibold text-text-muted mb-1.5 uppercase"
                    >
                      Taxa TR (% a.m.)
                    </label>
                    <input
                      id="tr-rate-input"
                      type="number"
                      step="0.0001"
                      placeholder="0.00%"
                      value={trRatePercentage ?? ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                        const val = e.target.value;
                        setTrRatePercentage(val === "" ? undefined : Number(val));
                        setSaveStatus(null);
                      }}
                      className="w-full px-3 py-2 bg-gray-50 focus:bg-white rounded-xl text-xs focus:ring-2 focus:ring-brand-emerald/50 outline-hidden border-0 transition-all text-text-primary"
                    />
                  </div>

                  {/* MIP Rate */}
                  <div>
                    <label
                      htmlFor="mip-rate-input"
                      className="block text-[10px] font-semibold text-text-muted mb-1.5 uppercase"
                    >
                      Seguro MIP (% a.m.)
                    </label>
                    <input
                      id="mip-rate-input"
                      type="number"
                      step="0.0001"
                      placeholder="0.00%"
                      value={mipRatePercentage ?? ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                        const val = e.target.value;
                        setMipRatePercentage(val === "" ? undefined : Number(val));
                        setSaveStatus(null);
                      }}
                      className="w-full px-3 py-2 bg-gray-50 focus:bg-white rounded-xl text-xs focus:ring-2 focus:ring-brand-emerald/50 outline-hidden border-0 transition-all text-text-primary"
                    />
                  </div>

                  {/* DFI Rate */}
                  <div>
                    <label
                      htmlFor="dfi-rate-input"
                      className="block text-[10px] font-semibold text-text-muted mb-1.5 uppercase"
                    >
                      Seguro DFI (% a.m.)
                    </label>
                    <input
                      id="dfi-rate-input"
                      type="number"
                      step="0.0001"
                      placeholder="0.00%"
                      value={dfiRatePercentage ?? ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                        const val = e.target.value;
                        setDfiRatePercentage(val === "" ? undefined : Number(val));
                        setSaveStatus(null);
                      }}
                      className="w-full px-3 py-2 bg-gray-50 focus:bg-white rounded-xl text-xs focus:ring-2 focus:ring-brand-emerald/50 outline-hidden border-0 transition-all text-text-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3">
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Desvios / Overrides Rápidos
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="first-parcel-override-input"
                      className="block text-[10px] font-semibold text-text-muted mb-1 uppercase"
                    >
                      1ª Parcela (R$)
                    </label>
                    <input
                      id="first-parcel-override-input"
                      type="number"
                      placeholder="Nenhum"
                      value={firstParcelOverride ?? ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                        const val = e.target.value;
                        setFirstParcelOverride(val === "" ? undefined : Number(val));
                        setSaveStatus(null);
                      }}
                      className="w-full px-3 py-2 bg-gray-50 focus:bg-white rounded-xl text-xs focus:ring-2 focus:ring-brand-emerald/50 outline-hidden border-0 transition-all text-text-primary"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="last-parcel-override-input"
                      className="block text-[10px] font-semibold text-text-muted mb-1 uppercase"
                    >
                      Última (R$)
                    </label>
                    <input
                      id="last-parcel-override-input"
                      type="number"
                      placeholder="Nenhum"
                      value={lastParcelOverride ?? ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                        const val = e.target.value;
                        setLastParcelOverride(val === "" ? undefined : Number(val));
                        setSaveStatus(null);
                      }}
                      className="w-full px-3 py-2 bg-gray-50 focus:bg-white rounded-xl text-xs focus:ring-2 focus:ring-brand-emerald/50 outline-hidden border-0 transition-all text-text-primary"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving || Object.keys(validationErrors).length > 0 || role === "VIEWER"}
              className="w-full py-3 px-4 bg-brand-emerald hover:bg-brand-emerald/90 disabled:bg-slate-200 border-0 text-white text-sm font-semibold rounded-full shadow-premium active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              type="button"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </>
              ) : role === "VIEWER" ? (
                "Visualizador (Apenas Leitura)"
              ) : (
                "Salvar Configuração"
              )}
            </button>
          </section>

          {/* Right panel: chart and interactive table */}
          <div className="lg:col-span-8 space-y-6">
            {/* Chart */}
            <div className="bg-surface-white rounded-3xl shadow-premium p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-premium-hover">
              <h2 className="text-lg font-medium tracking-tight text-text-primary mb-4">
                Composição das Parcelas ao Longo do Tempo
              </h2>
              {isMounted && installments.length > 0 ? (
                <div className="w-full h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={installments}
                      margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    >
                      <XAxis
                        dataKey="month"
                        stroke="#86868B"
                        fontSize={11}
                        tickLine={false}
                        tickFormatter={(val: number): string => `M${val}`}
                      />
                      <YAxis
                        stroke="#86868B"
                        fontSize={11}
                        tickLine={false}
                        tickFormatter={(val: number): string => `R$ ${(val / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(value: unknown): [string, string] => [
                          typeof value === "number" ? formatBRL(value) : "",
                          "",
                        ]}
                        labelFormatter={(label: unknown): string => `Mês ${label}`}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Area
                        type="monotone"
                        dataKey="amortization"
                        stackId="1"
                        stroke="#10B981"
                        fill="#10B981"
                        fillOpacity={0.15}
                        name="Amortização (Principal)"
                      />
                      <Area
                        type="monotone"
                        dataKey="interest"
                        stackId="1"
                        stroke="#F43F5E"
                        fill="#F43F5E"
                        fillOpacity={0.15}
                        name="Juros"
                      />
                      <Area
                        type="monotone"
                        dataKey="feesAndInsurance"
                        stackId="1"
                        stroke="#F59E0B"
                        fill="#F59E0B"
                        fillOpacity={0.15}
                        name="Taxas e Seguros"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] w-full bg-slate-50 rounded-2xl flex items-center justify-center text-text-muted text-sm">
                  {Object.keys(validationErrors).length > 0
                    ? "Corrija os erros de validação para visualizar o gráfico."
                    : "Preencha os valores para gerar o gráfico."}
                </div>
              )}
            </div>

            {/* Table */}
            <div className="bg-surface-white rounded-3xl shadow-premium overflow-hidden transition-all duration-300 hover:shadow-premium-hover">
              <div className="px-6 py-4 flex justify-between items-center bg-slate-50/10">
                <h2 className="text-lg font-medium tracking-tight text-text-primary">
                  Cronograma de Pagamento
                </h2>
                <div className="text-xs text-text-muted font-semibold tabular-nums">
                  {installments.length} parcelas simuladas
                </div>
              </div>

              {installments.length > 0 ? (
                <div className="max-h-[550px] overflow-y-auto relative no-scrollbar">
                  <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 bg-surface-white/70 backdrop-blur-xl z-20 text-text-primary font-semibold text-xs uppercase">
                      <tr>
                        <th className="py-3 px-4 text-left">Mês</th>
                        <th className="py-3 px-4 text-right">Parcela</th>
                        <th className="py-3 px-4 text-right">Juros</th>
                        <th className="py-3 px-4 text-right">Amortização</th>
                        <th className="py-3 px-4 text-right">Taxas/Seguros</th>
                        <th className="py-3 px-4 text-right">Saldo Devedor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 tabular-nums text-right text-text-primary">
                      {installments.map((inst): React.JSX.Element => {
                        const isFirst = inst.month === 1;
                        const isLast = inst.month === termMonths;

                        // Row styling to support top and bottom sticky overrides pinning
                        let rowClass = "hover:bg-slate-50/50 transition-colors";
                        let cellClass = "py-2.5 px-4 text-text-primary";

                        if (isFirst) {
                          rowClass = "bg-emerald-50/70 backdrop-blur-md font-semibold";
                          cellClass =
                            "sticky top-[38px] py-3 px-4 bg-emerald-50/70 text-emerald-950 z-10";
                        } else if (isLast) {
                          rowClass = "bg-emerald-50/70 backdrop-blur-md font-semibold";
                          cellClass =
                            "sticky bottom-0 py-3 px-4 bg-emerald-50/70 text-emerald-950 z-10";
                        }

                        return (
                          <tr key={inst.month} className={rowClass}>
                            <td className={`${cellClass} text-left font-sans font-medium`}>
                              {isFirst && "1º Mês (Início)"}
                              {isLast && `${inst.month}º Mês (Fim)`}
                              {!isFirst && !isLast && `${inst.month}º Mês`}
                            </td>
                            <td className={cellClass}>
                              {isFirst ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <input
                                    id="table-first-parcel-override-input"
                                    aria-label="Sobrescrever valor da primeira parcela"
                                    type="number"
                                    placeholder={formatBRL(inst.installment)}
                                    value={firstParcelOverride ?? ""}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                                      const val = e.target.value;
                                      setFirstParcelOverride(val === "" ? undefined : Number(val));
                                      setSaveStatus(null);
                                    }}
                                    className="w-28 text-right px-2 py-1 bg-white/80 border-0 rounded-full focus:ring-2 focus:ring-brand-emerald/50 outline-hidden text-xs transition-all shadow-premium"
                                  />
                                </div>
                              ) : isLast ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <input
                                    id="table-last-parcel-override-input"
                                    aria-label="Sobrescrever valor da última parcela"
                                    type="number"
                                    placeholder={formatBRL(inst.installment)}
                                    value={lastParcelOverride ?? ""}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                                      const val = e.target.value;
                                      setLastParcelOverride(val === "" ? undefined : Number(val));
                                      setSaveStatus(null);
                                    }}
                                    className="w-28 text-right px-2 py-1 bg-white/80 border-0 rounded-full focus:ring-2 focus:ring-brand-emerald/50 outline-hidden text-xs transition-all shadow-premium"
                                  />
                                </div>
                              ) : (
                                formatBRL(inst.installment)
                              )}
                            </td>
                            <td className={cellClass}>{formatBRL(inst.interest)}</td>
                            <td className={cellClass}>{formatBRL(inst.amortization)}</td>
                            <td className={cellClass}>{formatBRL(inst.feesAndInsurance)}</td>
                            <td className={cellClass}>
                              {formatBRL(Math.max(0, inst.outstandingBalance))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-text-muted text-sm">
                  Nenhuma simulação de parcela disponível.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
