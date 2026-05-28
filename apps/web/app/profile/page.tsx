"use client";

import { Home, Key, Loader2, LogOut, Mail, ShieldCheck, User } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
import { useUser } from "../components/UserContext";

interface Membership {
  id: string;
  houseId: string;
  role: string;
  houseName: string;
}

export default function ProfilePage(): React.JSX.Element {
  const { user, logout, refreshContext } = useUser();
  const router = useRouter();

  // Profile fields state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileMsg, setProfileMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password fields state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // House memberships list state
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isLoadMemberships, setIsLoadMemberships] = useState(true);

  // Privacy / LGPD actions state
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleExportData = async (): Promise<void> => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/auth/export-data");
      if (res.ok) {
        const data = await res.json();
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `pillar-export-${user?.name.toLowerCase().replace(/\s+/g, "-") || "data"}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        alert("Erro ao exportar dados do usuário.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com o servidor.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async (): Promise<void> => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "DELETE",
      });

      if (res.ok) {
        setShowDeleteConfirm(false);
        await logout();
        router.push("/login");
      } else {
        const data = await res.json();
        setDeleteError(data.error || "Falha ao excluir conta.");
      }
    } catch (err) {
      console.error(err);
      setDeleteError("Erro ao conectar com o servidor.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Pre-fill profile fields when user loads
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    // Load user profile & memberships on mount
    const loadProfileDetails = async (): Promise<void> => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setMemberships(data.memberships || []);
        }
      } catch (err) {
        console.error("Failed to load user memberships:", err);
      } finally {
        setIsLoadMemberships(false);
      }
    };
    loadProfileDetails();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setProfileMsg({ text: "Nome e e-mail são obrigatórios.", isError: true });
      return;
    }

    setProfileMsg(null);
    setIsUpdatingProfile(true);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        setProfileMsg({ text: "Perfil atualizado com sucesso!", isError: false });
        await refreshContext();
      } else {
        setProfileMsg({ text: data.error || "Erro ao atualizar perfil.", isError: true });
      }
    } catch (err) {
      console.error(err);
      setProfileMsg({ text: "Erro ao conectar com o servidor.", isError: true });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMsg({ text: "Preencha todos os campos de senha.", isError: true });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMsg({ text: "A nova senha deve ter pelo menos 8 caracteres.", isError: true });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: "As senhas não coincidem.", isError: true });
      return;
    }

    setPasswordMsg(null);
    setIsUpdatingPassword(true);

    try {
      const res = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        setPasswordMsg({ text: "Senha alterada com sucesso!", isError: false });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordMsg({ text: data.error || "Falha ao alterar senha.", isError: true });
      }
    } catch (err) {
      console.error(err);
      setPasswordMsg({ text: "Erro ao conectar com o servidor.", isError: true });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleLogoutClick = async (): Promise<void> => {
    await logout();
    router.push("/login");
  };

  const getRoleLabel = (r: string): { label: string; bg: string; text: string } => {
    switch (r.toUpperCase()) {
      case "OWNER":
        return {
          label: "Proprietário",
          bg: "bg-emerald-50 border-emerald-200",
          text: "text-emerald-700",
        };
      case "COLLABORATOR":
        return { label: "Colaborador", bg: "bg-blue-50 border-blue-200", text: "text-blue-700" };
      default:
        return {
          label: "Visualizador",
          bg: "bg-slate-100 border-slate-200",
          text: "text-slate-600",
        };
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
            Minha Conta
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Gerencie suas informações cadastrais, segurança e residências ativas.
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogoutClick}
          className="px-4 py-2.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-3xs"
        >
          <LogOut className="w-4 h-4" />
          Sair da Conta
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Profile Card & Details (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          {/* Card 1: Details Update */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-6">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-600" />
              Detalhes do Perfil
            </h2>

            {profileMsg && (
              <div
                className={`p-3 border rounded-lg text-xs sm:text-sm font-bold ${
                  profileMsg.isError
                    ? "bg-rose-50 border-rose-100 text-rose-700"
                    : "bg-emerald-50 border-emerald-100 text-emerald-700"
                }`}
              >
                {profileMsg.text}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="profile-name"
                  className="block text-xs font-bold text-slate-500 uppercase tracking-wider"
                >
                  Nome Completo
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    id="profile-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden transition-all text-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="profile-email"
                  className="block text-xs font-bold text-slate-500 uppercase tracking-wider"
                >
                  E-mail
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    id="profile-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden transition-all text-slate-800"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/60 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-colors flex items-center gap-1.5 cursor-pointer ml-auto"
              >
                {isUpdatingProfile ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </button>
            </form>
          </div>

          {/* Card 2: Security Update */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-6">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Key className="w-5 h-5 text-emerald-600" />
              Segurança & Senha
            </h2>

            {passwordMsg && (
              <div
                className={`p-3 border rounded-lg text-xs sm:text-sm font-bold ${
                  passwordMsg.isError
                    ? "bg-rose-50 border-rose-100 text-rose-700"
                    : "bg-emerald-50 border-emerald-100 text-emerald-700"
                }`}
              >
                {passwordMsg.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="curr-pass"
                  className="block text-xs font-bold text-slate-500 uppercase tracking-wider"
                >
                  Senha Atual
                </label>
                <input
                  id="curr-pass"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Insira sua senha atual"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden transition-all text-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="new-pass"
                    className="block text-xs font-bold text-slate-500 uppercase tracking-wider"
                  >
                    Nova Senha
                  </label>
                  <input
                    id="new-pass"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden transition-all text-slate-800"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="conf-pass"
                    className="block text-xs font-bold text-slate-500 uppercase tracking-wider"
                  >
                    Confirmar Nova Senha
                  </label>
                  <input
                    id="conf-pass"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden transition-all text-slate-800"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/60 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-colors flex items-center gap-1.5 cursor-pointer ml-auto"
              >
                {isUpdatingPassword ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  "Alterar Senha"
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Memberships Sidebar (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-4">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Home className="w-5 h-5 text-emerald-600" />
              Minhas Residências
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Lista de perfis de casas compartilhadas aos quais você tem acesso e suas respectivas
              permissões.
            </p>

            {isLoadMemberships ? (
              <div className="py-6 flex justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {memberships.map((m) => {
                  const badge = getRoleLabel(m.role);
                  return (
                    <div
                      key={m.id}
                      className="p-3 border border-slate-100 hover:border-slate-200 bg-slate-50/50 rounded-xl flex items-center justify-between gap-3 shadow-3xs"
                    >
                      <div className="space-y-1">
                        <span className="font-bold text-slate-700 text-sm block">
                          {m.houseName || "Casa Compartilhada"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                          ID: {m.houseId.substring(0, 8)}...
                        </span>
                      </div>
                      <span
                        className={`inline-flex px-2 py-0.5 text-[9px] font-extrabold uppercase border rounded-md ${badge.bg} ${badge.text}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                  );
                })}

                {memberships.length === 0 && (
                  <div className="py-4 text-center text-xs text-slate-400 font-bold border border-dashed border-slate-200 rounded-xl">
                    Nenhuma residência vinculada.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Additional Account info stats */}
          {user && (
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md space-y-4 border border-slate-800">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Informações da Sessão
              </span>
              <div className="space-y-3">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase tracking-wide">
                    Email Identificador
                  </span>
                  <span className="text-sm font-semibold truncate block mt-0.5">{user.email}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase tracking-wide">
                    ID do Usuário
                  </span>
                  <span className="text-xs font-mono text-emerald-300 block mt-0.5">{user.id}</span>
                </div>
              </div>
            </div>
          )}

          {/* Card 5: Privacy & LGPD Rights */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-4">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Privacidade & Seus Dados (LGPD)
            </h2>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              Exerça seus direitos sob a LGPD. Exporte seus dados pessoais e de residência ou
              solicite a exclusão definitiva da sua conta.
            </p>

            <div className="space-y-3 pt-2">
              {/* Export Data Button */}
              <button
                type="button"
                onClick={handleExportData}
                disabled={isExporting}
                className="w-full py-2.5 px-4 bg-slate-50 border border-slate-200 hover:bg-slate-100 disabled:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-3xs"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  "Exportar Meus Dados (JSON)"
                )}
              </button>

              {/* Delete Account Button */}
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-2.5 px-4 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-3xs"
              >
                Excluir Minha Conta
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-6 animate-scale-up">
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-800">Confirmar Exclusão de Conta</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Você tem certeza de que deseja excluir sua conta? Esta ação é **permanente e
                irreversível**. Todos os seus dados pessoais e vínculos com residências serão
                apagados definitivamente em conformidade com a LGPD.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs sm:text-sm rounded-lg font-bold">
                {deleteError}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-600/60 text-white font-bold rounded-xl text-xs shadow-sm hover:shadow transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  "Sim, Excluir Definitivamente"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
