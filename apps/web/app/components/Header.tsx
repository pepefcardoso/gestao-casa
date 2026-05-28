"use client";

import { Home, Plus, Shield, User, X } from "lucide-react";
import Link from "next/link";
import type React from "react";
import { useState } from "react";
import { FALLBACK_HOUSE_ID, useUser } from "./UserContext";

export default function Header(): React.JSX.Element {
  const { user, activeHouseId, role, housesList, changeHouse, refreshContext } = useUser();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newHouseName, setNewHouseName] = useState("");
  const [newHouseLoc, setNewHouseLoc] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const getRoleLabel = (r: string | null): { label: string; bg: string; text: string } => {
    switch (r) {
      case "OWNER":
        return {
          label: "Proprietário",
          bg: "bg-emerald-50 border-emerald-200",
          text: "text-emerald-700",
        };
      case "COLLABORATOR":
        return { label: "Colaborador", bg: "bg-blue-50 border-blue-200", text: "text-blue-700" };
      case "VIEWER":
        return {
          label: "Visualizador",
          bg: "bg-slate-100 border-slate-200",
          text: "text-slate-600",
        };
      default:
        return { label: "Sem Acesso", bg: "bg-rose-50 border-rose-200", text: "text-rose-700" };
    }
  };

  const handleCreateHouse = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!newHouseName.trim()) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/houses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newHouseName.trim(),
          location: newHouseLoc.trim() || null,
        }),
      });

      if (res.ok) {
        const createdHouse = await res.json();
        setNewHouseName("");
        setNewHouseLoc("");
        setIsCreateModalOpen(false);
        // Switch to the newly created house
        await refreshContext();
        changeHouse(createdHouse.id);
      } else {
        alert("Erro ao criar nova residência. Certifique-se de que você tem permissão.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão ao criar nova residência.");
    } finally {
      setIsSaving(false);
    }
  };

  const roleDetails = getRoleLabel(role);

  return (
    <>
      <header className="bg-white/70 backdrop-blur-xl sticky top-0 z-40 shadow-premium">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 group hover:opacity-90 transition-opacity"
          >
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600 shadow-3xs group-hover:bg-emerald-100 transition-colors">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-800 tracking-tight text-base sm:text-lg block">
                Gestão Casa
              </span>
              <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-widest block leading-none">
                Multiusuário
              </span>
            </div>
          </Link>

          {/* User/House Selection Bar or Public CTA Links */}
          <div className="flex items-center gap-2 sm:gap-4">
            {user ? (
              <>
                {/* User Profile Link */}
                <Link
                  href="/profile"
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-3xs hover:border-slate-300 transition-all cursor-pointer"
                  title="Acessar Configurações da Conta"
                >
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="max-w-[100px] sm:max-w-none truncate">{user.name}</span>
                </Link>

                {/* House Dropdown */}
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span className="text-slate-400 hidden md:block">
                    <Home className="w-4 h-4" />
                  </span>
                  <select
                    value={activeHouseId}
                    onChange={(e): void => changeHouse(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-3xs hover:border-slate-300 transition-all max-w-[130px] sm:max-w-none"
                  >
                    {housesList.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                    {housesList.length === 0 && (
                      <option value={FALLBACK_HOUSE_ID}>Casa Padrão</option>
                    )}
                  </select>
                  <button
                    type="button"
                    onClick={(): void => setIsCreateModalOpen(true)}
                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/50 rounded-lg cursor-pointer transition-colors shadow-3xs"
                    title="Criar Nova Casa"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Role Badge */}
                <span
                  className={`inline-flex px-2 py-1 text-[10px] font-bold uppercase border tracking-wider rounded-md ${roleDetails.bg} ${roleDetails.text}`}
                >
                  {roleDetails.label}
                </span>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Entrar
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-3xs transition-colors"
                >
                  Cadastrar
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Create House Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 shadow-2xl flex flex-col max-h-[90vh] animate-scale-up">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Home className="w-5 h-5 text-emerald-600" />
                Nova Residência
              </h3>
              <button
                type="button"
                onClick={(): void => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handleCreateHouse} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="house-name"
                  className="block text-xs font-bold text-slate-500 uppercase tracking-wider"
                >
                  Nome da Residência *
                </label>
                <input
                  id="house-name"
                  type="text"
                  placeholder="Ex: Apartamento Praia, Sítio Nova Era"
                  value={newHouseName}
                  onChange={(e): void => setNewHouseName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-hidden transition-all text-slate-800"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="house-location"
                  className="block text-xs font-bold text-slate-500 uppercase tracking-wider"
                >
                  Localização / Endereço
                </label>
                <input
                  id="house-location"
                  type="text"
                  placeholder="Ex: Ubatuba - SP"
                  value={newHouseLoc}
                  onChange={(e): void => setNewHouseLoc(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-hidden transition-all text-slate-800"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSaving ? "Criando..." : "Criar Residência"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
