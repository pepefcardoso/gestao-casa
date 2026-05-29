"use client";

import { apiClient } from "@gestao-casa/shared-logic/api-client/index";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Edit2,
  Home,
  MapPin,
  Maximize2,
  Palette,
  Plus,
  Settings,
  Trash2,
  Users,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useUser } from "../components/UserContext";

interface Member {
  id: string;
  role: "OWNER" | "COLLABORATOR" | "VIEWER";
  user: {
    id: string;
    name: string;
    email: string;
  };
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

interface Room {
  id: string;
  houseId: string;
  name: string;
  area: string | null;
  colorCode: string | null;
  createdAt: string;
}

interface ValidationErrors {
  houseName?: string;
  houseArea?: string;
  houseLatitude?: string;
  houseLongitude?: string;
  roomName?: string;
  roomArea?: string;
}

const HouseMap = dynamic(() => import("../components/HouseMap").then((m) => m.HouseMap), {
  ssr: false,
  loading: (): React.JSX.Element => (
    <div className="h-[250px] w-full bg-slate-100 rounded-lg flex items-center justify-center animate-pulse">
      <span className="text-xs text-mint-slate-400">Carregando mapa...</span>
    </div>
  ),
});

const PRESET_COLORS: string[] = [
  "#059669", // Emerald
  "#dc2626", // Red
  "#2563eb", // Blue
  "#d97706", // Amber
  "#7c3aed", // Purple
  "#db2777", // Pink
  "#4b5563", // Gray
  "#06b6d4", // Cyan
];

export default function SettingsPage(): React.JSX.Element {
  const { activeUserId, activeHouseId, role } = useUser();

  // House State
  const [_house, setHouse] = useState<House | null>(null);
  const [houseName, setHouseName] = useState<string>("");
  const [houseLocation, setHouseLocation] = useState<string>("");
  const [houseArea, setHouseArea] = useState<string>("");
  const [houseLatitude, setHouseLatitude] = useState<string>("");
  const [houseLongitude, setHouseLongitude] = useState<string>("");
  const [isSavingHouse, setIsSavingHouse] = useState<boolean>(false);
  const [houseSuccessMsg, setHouseSuccessMsg] = useState<string | null>(null);
  const [houseErrorMsg, setHouseErrorMsg] = useState<string | null>(null);

  // Rooms State
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState<boolean>(true);
  const [roomsErrorMsg, setRoomsErrorMsg] = useState<string | null>(null);

  // Members / Collaborators State
  const [members, setMembers] = useState<Member[]>([]);
  const [shareEmail, setShareEmail] = useState<string>("");
  const [shareRole, setShareRole] = useState<"COLLABORATOR" | "VIEWER">("COLLABORATOR");
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [shareError, setShareError] = useState<string | null>(null);

  // Modals & Actions
  const [isRoomModalOpen, setIsRoomModalOpen] = useState<boolean>(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deleteTargetRoom, setDeleteTargetRoom] = useState<Room | null>(null);
  const [isDeletingRoom, setIsDeletingRoom] = useState<boolean>(false);

  // Room Form State
  const [roomName, setRoomName] = useState<string>("");
  const [roomArea, setRoomArea] = useState<string>("");
  const [roomColor, setRoomColor] = useState<string>(PRESET_COLORS[0]);
  const [isSavingRoom, setIsSavingRoom] = useState<boolean>(false);
  const [roomFormError, setRoomFormError] = useState<string | null>(null);

  // Global Loading/Errors
  const [isLoadingHouse, setIsLoadingHouse] = useState<boolean>(true);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // Fetch house details
  const fetchHouse = useCallback(async (): Promise<void> => {
    if (!activeHouseId) return;
    setIsLoadingHouse(true);
    setHouseErrorMsg(null);
    try {
      const h = await apiClient.get("/api/houses/{id}", {
        params: { id: activeHouseId },
      });
      if (h) {
        setHouse(h);
        setHouseName(h.name);
        setHouseLocation(h.location || "");
        setHouseArea(h.totalArea || "");
        setHouseLatitude(h.latitude || "");
        setHouseLongitude(h.longitude || "");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("404") || message.toLowerCase().includes("not found")) {
        setHouseErrorMsg("Casa não encontrada.");
      } else {
        setHouseErrorMsg("Erro ao carregar dados da casa.");
      }
    } finally {
      setIsLoadingHouse(false);
    }
  }, [activeHouseId]);

  // Fetch rooms list
  const fetchRooms = useCallback(async (): Promise<void> => {
    if (!activeHouseId) return;
    setIsLoadingRooms(true);
    setRoomsErrorMsg(null);
    try {
      const data = await apiClient.get("/api/rooms", {
        query: { house_id: activeHouseId },
      });
      setRooms(data as Room[]);
    } catch (err) {
      setRoomsErrorMsg("Erro ao carregar cômodos.");
      console.error(err);
    } finally {
      setIsLoadingRooms(false);
    }
  }, [activeHouseId]);

  // Fetch members list
  const fetchMembers = useCallback(async (): Promise<void> => {
    if (!activeHouseId) return;
    try {
      const data = await apiClient.get("/api/houses/{id}/members", {
        params: { id: activeHouseId },
      });
      setMembers(data as Member[]);
    } catch (err) {
      console.error("Erro ao buscar membros:", err);
    }
  }, [activeHouseId]);

  useEffect((): void => {
    if (activeHouseId) {
      fetchHouse();
      fetchRooms();
      fetchMembers();
    }
  }, [activeHouseId, fetchHouse, fetchRooms, fetchMembers]);

  // House Form Validation
  const validateHouseForm = (): boolean => {
    const errors: ValidationErrors = {};
    if (!houseName.trim()) {
      errors.houseName = "O nome da casa é obrigatório.";
    }
    if (houseArea !== "") {
      const areaNum = Number(houseArea);
      if (Number.isNaN(areaNum) || areaNum <= 0) {
        errors.houseArea = "A área total deve ser maior que zero.";
      }
    }
    if (houseLatitude !== "") {
      const latNum = Number(houseLatitude);
      if (Number.isNaN(latNum) || latNum < -90 || latNum > 90) {
        errors.houseLatitude = "A latitude deve estar entre -90 e 90.";
      }
    }
    if (houseLongitude !== "") {
      const lngNum = Number(houseLongitude);
      if (Number.isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
        errors.houseLongitude = "A longitude deve estar entre -180 e 180.";
      }
    }
    setValidationErrors((prev) => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  };

  // Submit House Changes
  const handleHouseSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setHouseSuccessMsg(null);
    setHouseErrorMsg(null);

    // Clear previous house errors
    setValidationErrors((prev) => ({
      ...prev,
      houseName: undefined,
      houseArea: undefined,
      houseLatitude: undefined,
      houseLongitude: undefined,
    }));

    if (!validateHouseForm()) return;

    setIsSavingHouse(true);
    try {
      const payload = {
        name: houseName.trim(),
        location: houseLocation.trim() || null,
        totalArea: houseArea === "" ? null : Number(houseArea),
        latitude: houseLatitude === "" ? null : Number(houseLatitude),
        longitude: houseLongitude === "" ? null : Number(houseLongitude),
      };

      const updated = await apiClient.put("/api/houses/{id}", {
        params: { id: activeHouseId },
        body: payload,
      });

      if (updated) {
        setHouse(updated);
        setHouseName(updated.name);
        setHouseLocation(updated.location || "");
        setHouseArea(updated.totalArea || "");
        setHouseLatitude(updated.latitude || "");
        setHouseLongitude(updated.longitude || "");
        setHouseSuccessMsg("Configurações da casa atualizadas com sucesso!");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar alterações da casa.";
      setHouseErrorMsg(msg);
    } finally {
      setIsSavingHouse(false);
    }
  };

  // Open Room Modal (Create)
  const handleNewRoomClick = (): void => {
    setEditingRoom(null);
    setRoomName("");
    setRoomArea("");
    setRoomColor(PRESET_COLORS[0]);
    setRoomFormError(null);
    setValidationErrors((prev) => ({ ...prev, roomName: undefined, roomArea: undefined }));
    setIsRoomModalOpen(true);
  };

  // Open Room Modal (Edit)
  const handleEditRoomClick = (room: Room): void => {
    setEditingRoom(room);
    setRoomName(room.name);
    setRoomArea(room.area || "");
    setRoomColor(room.colorCode || PRESET_COLORS[0]);
    setRoomFormError(null);
    setValidationErrors((prev) => ({ ...prev, roomName: undefined, roomArea: undefined }));
    setIsRoomModalOpen(true);
  };

  // Room Form Validation
  const validateRoomForm = (): boolean => {
    const errors: ValidationErrors = {};
    if (!roomName.trim()) {
      errors.roomName = "O nome do cômodo é obrigatório.";
    }
    if (roomArea !== "") {
      const areaNum = Number(roomArea);
      if (Number.isNaN(areaNum) || areaNum <= 0) {
        errors.roomArea = "A área deve ser maior que zero.";
      }
    }
    setValidationErrors((prev) => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  };

  // Save Room (Create / Edit)
  const handleSaveRoom = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setRoomFormError(null);

    // Clear previous room errors
    setValidationErrors((prev) => ({ ...prev, roomName: undefined, roomArea: undefined }));

    if (!validateRoomForm()) return;

    setIsSavingRoom(true);
    try {
      if (editingRoom) {
        // Edit Room (PUT)
        const payload = {
          name: roomName.trim(),
          area: roomArea === "" ? null : Number(roomArea),
          colorCode: roomColor,
        };

        const updated = await apiClient.put("/api/rooms/{id}", {
          params: { id: editingRoom.id },
          body: payload,
        });

        if (updated) {
          setRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
          setIsRoomModalOpen(false);
        }
      } else {
        // Create Room (POST)
        const payload = {
          houseId: activeHouseId,
          name: roomName.trim(),
          area: roomArea === "" ? null : Number(roomArea),
          colorCode: roomColor,
        };

        const created = await apiClient.post("/api/rooms", {
          body: payload,
        });

        if (created) {
          setRooms((prev) => [...prev, created]);
          setIsRoomModalOpen(false);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar cômodo.";
      setRoomFormError(msg);
    } finally {
      setIsSavingRoom(false);
    }
  };

  // Delete Room Confirmation
  const handleDeleteRoomConfirm = async (): Promise<void> => {
    if (!deleteTargetRoom) return;

    setIsDeletingRoom(true);
    try {
      await apiClient.delete("/api/rooms/{id}", {
        params: { id: deleteTargetRoom.id },
      });
      setRooms((prev) => prev.filter((r) => r.id !== deleteTargetRoom.id));
      setDeleteTargetRoom(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao excluir cômodo.";
      alert(msg);
    } finally {
      setIsDeletingRoom(false);
    }
  };

  const handleShareSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setShareError(null);
    if (!shareEmail.trim()) return;

    setIsSharing(true);
    try {
      await apiClient.post("/api/houses/{id}/share", {
        params: { id: activeHouseId },
        body: {
          email: shareEmail.trim(),
          role: shareRole,
        },
      });

      setShareEmail("");
      fetchMembers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao compartilhar.";
      setShareError(msg);
    } finally {
      setIsSharing(false);
    }
  };

  const handleRemoveMember = async (membershipId: string): Promise<void> => {
    try {
      await apiClient.delete("/api/houses/{id}/members/{membershipId}", {
        params: { id: activeHouseId, membershipId },
      });
      fetchMembers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao remover membro.";
      alert(msg);
    }
  };

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
            <h1 className="text-3xl font-semibold tracking-tight text-text-primary flex items-center gap-2">
              <Settings className="w-8 h-8 text-brand-emerald" />
              Configurações
            </h1>
            <p className="text-xs text-text-muted mt-1">
              Gerencie as informações da sua residência e a organização de seus cômodos.
            </p>
          </div>

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
              className="px-4 py-2 text-xs font-semibold rounded-full bg-surface-white shadow-premium text-brand-emerald transition-all"
            >
              Configurações
            </Link>
          </nav>
        </header>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 space-y-8">
          {/* House Settings Panel */}
          <section className="bg-surface-white rounded-3xl shadow-premium p-6 space-y-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-premium-hover">
            <div className="pb-3 flex items-center gap-2">
              <Home className="w-5 h-5 text-brand-emerald" />
              <h2 className="text-lg font-medium tracking-tight text-text-primary">
                Dados da Casa
              </h2>
            </div>

            {houseErrorMsg && (
              <div className="p-4 bg-orange-50/50 text-orange-800 rounded-2xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
                <span>{houseErrorMsg}</span>
              </div>
            )}

            {houseSuccessMsg && (
              <div className="p-4 bg-emerald-50/50 text-emerald-800 rounded-2xl text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-brand-emerald shrink-0" />
                <span>{houseSuccessMsg}</span>
              </div>
            )}

            {isLoadingHouse ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="w-8 h-8 border-3 border-brand-emerald border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-text-muted">Carregando casa...</span>
              </div>
            ) : (
              <form onSubmit={(e): Promise<void> => handleHouseSubmit(e)} className="space-y-4">
                {/* House Name */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="houseName"
                    className="block text-xs font-bold text-text-muted uppercase tracking-wider"
                  >
                    Nome da Residência *
                  </label>
                  <input
                    id="houseName"
                    type="text"
                    placeholder="Ex: Minha Casa, Apartamento 102"
                    value={houseName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                      setHouseName(e.target.value);
                      setHouseSuccessMsg(null);
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-2xl text-sm bg-gray-50 focus:ring-2 focus:ring-brand-emerald/50 focus:bg-white border-0 outline-hidden transition-all text-text-primary ${
                      validationErrors.houseName ? "ring-2 ring-rose-500" : ""
                    }`}
                    disabled={role === "VIEWER"}
                    required
                  />
                  {validationErrors.houseName && (
                    <p className="text-xs text-rose-600 mt-1">{validationErrors.houseName}</p>
                  )}
                </div>

                {/* Location */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="houseLocation"
                    className="block text-xs font-bold text-text-muted uppercase tracking-wider"
                  >
                    Localização / Endereço
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-muted">
                      <MapPin className="w-4 h-4" />
                    </span>
                    <input
                      id="houseLocation"
                      type="text"
                      placeholder="Ex: Jardim Paulista, São Paulo - SP"
                      value={houseLocation}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                        setHouseLocation(e.target.value);
                        setHouseSuccessMsg(null);
                      }}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl text-sm bg-gray-50 focus:ring-2 focus:ring-brand-emerald/50 focus:bg-white border-0 outline-hidden transition-all text-text-primary"
                      disabled={role === "VIEWER"}
                    />
                  </div>
                </div>

                {/* Area */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="houseArea"
                    className="block text-xs font-bold text-text-muted uppercase tracking-wider"
                  >
                    Área Total (m²)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-muted">
                      <Maximize2 className="w-4 h-4" />
                    </span>
                    <input
                      id="houseArea"
                      type="number"
                      step="0.01"
                      placeholder="Ex: 120.50"
                      value={houseArea}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                        setHouseArea(e.target.value);
                        setHouseSuccessMsg(null);
                      }}
                      className={`w-full pl-9 pr-3.5 py-2.5 rounded-2xl text-sm bg-gray-50 focus:ring-2 focus:ring-brand-emerald/50 focus:bg-white border-0 outline-hidden transition-all text-text-primary ${
                        validationErrors.houseArea ? "ring-2 ring-rose-500" : ""
                      }`}
                      disabled={role === "VIEWER"}
                    />
                  </div>
                  {validationErrors.houseArea && (
                    <p className="text-xs text-rose-600 mt-1">{validationErrors.houseArea}</p>
                  )}
                </div>

                {/* Coordinates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="houseLatitude"
                      className="block text-xs font-bold text-text-muted uppercase tracking-wider"
                    >
                      Latitude
                    </label>
                    <input
                      id="houseLatitude"
                      type="number"
                      step="any"
                      placeholder="Ex: -23.5505"
                      value={houseLatitude}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                        setHouseLatitude(e.target.value);
                        setHouseSuccessMsg(null);
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-2xl text-sm bg-gray-50 focus:ring-2 focus:ring-brand-emerald/50 focus:bg-white border-0 outline-hidden transition-all text-text-primary ${
                        validationErrors.houseLatitude ? "ring-2 ring-rose-500" : ""
                      }`}
                      disabled={role === "VIEWER"}
                    />
                    {validationErrors.houseLatitude && (
                      <p className="text-xs text-rose-600 mt-1">{validationErrors.houseLatitude}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="houseLongitude"
                      className="block text-xs font-bold text-text-muted uppercase tracking-wider"
                    >
                      Longitude
                    </label>
                    <input
                      id="houseLongitude"
                      type="number"
                      step="any"
                      placeholder="Ex: -46.6333"
                      value={houseLongitude}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                        setHouseLongitude(e.target.value);
                        setHouseSuccessMsg(null);
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-2xl text-sm bg-gray-50 focus:ring-2 focus:ring-brand-emerald/50 focus:bg-white border-0 outline-hidden transition-all text-text-primary ${
                        validationErrors.houseLongitude ? "ring-2 ring-rose-500" : ""
                      }`}
                      disabled={role === "VIEWER"}
                    />
                    {validationErrors.houseLongitude && (
                      <p className="text-xs text-rose-600 mt-1">
                        {validationErrors.houseLongitude}
                      </p>
                    )}
                  </div>
                </div>

                {/* Interactive Map */}
                <div className="space-y-1.5">
                  <span className="block text-xs font-bold text-text-muted uppercase tracking-wider">
                    Selecionar no Mapa
                  </span>
                  <p className="text-[10px] text-text-muted mt-0.5">
                    Clique no mapa para marcar a localização exata ou digite as coordenadas acima.
                  </p>
                  <div className="h-[250px] w-full rounded-3xl overflow-hidden bg-canvas-frost relative shadow-premium transition-all duration-300 hover:shadow-premium-hover">
                    <HouseMap
                      latitude={houseLatitude === "" ? null : Number(houseLatitude)}
                      longitude={houseLongitude === "" ? null : Number(houseLongitude)}
                      onChange={(lat: number, lng: number): void => {
                        setHouseLatitude(String(lat));
                        setHouseLongitude(String(lng));
                        setHouseSuccessMsg(null);
                      }}
                      interactive={role !== "VIEWER"}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSavingHouse || role === "VIEWER"}
                  className="w-full py-3 px-4 bg-brand-emerald hover:bg-brand-emerald/90 disabled:bg-slate-200 text-white text-sm font-semibold rounded-full shadow-premium active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border-0"
                >
                  {isSavingHouse ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Alterações"
                  )}
                </button>
              </form>
            )}
          </section>

          {/* Collaborators & Sharing Panel */}
          <section className="bg-surface-white rounded-3xl shadow-premium p-6 space-y-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-premium-hover">
            <div className="pb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-emerald" />
              <h2 className="text-lg font-medium tracking-tight text-text-primary">
                Membros e Compartilhamento
              </h2>
            </div>

            {shareError && (
              <div className="p-3 bg-orange-50/50 text-orange-800 rounded-2xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
                <span>{shareError}</span>
              </div>
            )}

            {/* Invite Form (Only for OWNER) */}
            {role === "OWNER" && (
              <form
                onSubmit={handleShareSubmit}
                className="space-y-3 p-4 bg-gray-50/50 rounded-2xl shadow-premium"
              >
                <span className="block text-xs font-bold text-text-muted uppercase tracking-wider">
                  Convidar Novo Membro
                </span>
                <div className="space-y-2">
                  <input
                    type="email"
                    placeholder="Email do convidado"
                    value={shareEmail}
                    onChange={(e): void => setShareEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl text-xs bg-gray-50 focus:bg-white border-0 focus:ring-2 focus:ring-brand-emerald/50 outline-hidden transition-all text-text-primary placeholder:text-text-muted"
                    required
                  />
                  <div className="flex gap-2">
                    <select
                      value={shareRole}
                      onChange={(e): void =>
                        setShareRole(e.target.value as "COLLABORATOR" | "VIEWER")
                      }
                      className="px-3 py-2 rounded-2xl text-xs font-semibold text-text-primary bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-brand-emerald/50 cursor-pointer shadow-premium w-full border-0"
                    >
                      <option value="COLLABORATOR">Colaborador (Editar)</option>
                      <option value="VIEWER">Visualizador (Apenas Ver)</option>
                    </select>
                    <button
                      type="submit"
                      disabled={isSharing}
                      className="px-4 py-2 bg-brand-emerald hover:bg-brand-emerald/90 disabled:bg-slate-300 text-white text-xs font-semibold rounded-full shadow-premium active:scale-95 transition-all shrink-0 cursor-pointer border-0"
                    >
                      {isSharing ? "Convidando..." : "Convidar"}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Members List */}
            <div className="space-y-3">
              <span className="block text-xs font-bold text-text-muted uppercase tracking-wider">
                Membros Ativos ({members.length})
              </span>
              <div className="divide-y divide-slate-100 max-h-[250px] overflow-y-auto pr-1 no-scrollbar">
                {members.map((member) => {
                  const isOwner = member.role === "OWNER";
                  const isCollaborator = member.role === "COLLABORATOR";

                  return (
                    <div key={member.id} className="py-2.5 flex justify-between items-center gap-2">
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-text-primary block truncate">
                          {member.user.name}
                        </span>
                        <span className="text-[10px] text-text-muted block truncate">
                          {member.user.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-full tracking-wider ${
                            isOwner
                              ? "bg-emerald-50 text-brand-emerald"
                              : isCollaborator
                                ? "bg-blue-50 text-blue-600"
                                : "bg-slate-100 text-text-muted"
                          }`}
                        >
                          {isOwner ? "Dono" : isCollaborator ? "Editar" : "Ver"}
                        </span>
                        {role === "OWNER" && member.user.id !== activeUserId && (
                          <button
                            type="button"
                            onClick={(): void => {
                              handleRemoveMember(member.id);
                            }}
                            className="p-1 hover:bg-rose-50 text-text-muted hover:text-rose-600 rounded-full transition-colors cursor-pointer border-0"
                            title="Remover Membro"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        {/* Room Management Panel */}
        <section className="lg:col-span-7 bg-surface-white rounded-3xl shadow-premium p-6 space-y-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-premium-hover">
          <div className="pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-brand-emerald" />
              <h2 className="text-lg font-medium tracking-tight text-text-primary">
                Cômodos Cadastrados
              </h2>
            </div>
            {role !== "VIEWER" && (
              <button
                onClick={handleNewRoomClick}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-emerald hover:bg-brand-emerald/90 text-white text-xs font-semibold rounded-full shadow-premium active:scale-95 transition-all cursor-pointer border-0"
                type="button"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Cômodo
              </button>
            )}
          </div>

          {roomsErrorMsg && (
            <div className="p-4 bg-orange-50/50 text-orange-800 rounded-2xl text-xs">
              {roomsErrorMsg}
            </div>
          )}

          {isLoadingRooms ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 border-3 border-brand-emerald border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-text-muted">Carregando cômodos...</span>
            </div>
          ) : rooms.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rooms.map(
                (room): React.JSX.Element => (
                  <div
                    key={room.id}
                    className="rounded-3xl p-4 bg-canvas-frost transition-all duration-300 hover:-translate-y-1 hover:shadow-premium flex justify-between items-center group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full border border-slate-200/25 shrink-0 shadow-premium"
                        style={{ backgroundColor: room.colorCode || "#cbd5e1" }}
                      />
                      <div>
                        <h3 className="text-sm font-semibold text-text-primary leading-snug">
                          {room.name}
                        </h3>
                        <p className="text-xs text-text-muted font-semibold tabular-nums">
                          {room.area ? `${room.area} m²` : "Área não definida"}
                        </p>
                      </div>
                    </div>

                    {role !== "VIEWER" && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(): void => handleEditRoomClick(room)}
                          className="p-1.5 text-text-muted hover:text-brand-emerald hover:bg-white rounded-full transition-all active:scale-95 cursor-pointer"
                          title="Editar"
                          type="button"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(): void => setDeleteTargetRoom(room)}
                          className="p-1.5 text-text-muted hover:text-rose-600 hover:bg-white rounded-full transition-all active:scale-95 cursor-pointer"
                          title="Excluir"
                          type="button"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          ) : (
            <div className="py-16 text-center text-text-muted text-sm flex flex-col items-center gap-2">
              <Palette className="w-8 h-8 opacity-45" />
              <span>Nenhum cômodo cadastrado nesta residência.</span>
            </div>
          )}
        </section>
      </div>

      {/* Room Modal (Create / Edit) */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-md p-4">
          <div className="bg-surface-white rounded-3xl max-w-md w-full shadow-premium-hover flex flex-col max-h-[90vh] animate-scale-up">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 bg-surface-white/70 backdrop-blur-xl">
              <h3 className="text-lg font-semibold tracking-tight text-text-primary">
                {editingRoom ? "Editar Cômodo" : "Novo Cômodo"}
              </h3>
              <button
                type="button"
                onClick={(): void => setIsRoomModalOpen(false)}
                className="text-text-muted hover:text-text-primary p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={(e): Promise<void> => handleSaveRoom(e)} className="p-6 space-y-4">
              {roomFormError && (
                <div className="p-3 bg-orange-50/50 text-orange-800 rounded-2xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
                  <span>{roomFormError}</span>
                </div>
              )}

              {/* Room Name */}
              <div className="space-y-1.5">
                <label
                  htmlFor="roomName"
                  className="block text-xs font-bold text-text-muted uppercase tracking-wider"
                >
                  Nome do Cômodo *
                </label>
                <input
                  id="roomName"
                  type="text"
                  placeholder="Ex: Quarto Principal, Banheiro Social..."
                  value={roomName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    setRoomName(e.target.value)
                  }
                  className={`w-full px-3.5 py-2.5 rounded-2xl text-sm bg-gray-50 focus:ring-2 focus:ring-brand-emerald/50 focus:bg-white border-0 outline-hidden transition-all text-text-primary ${
                    validationErrors.roomName ? "ring-2 ring-rose-500" : ""
                  }`}
                  required
                />
                {validationErrors.roomName && (
                  <p className="text-xs text-rose-600 mt-1">{validationErrors.roomName}</p>
                )}
              </div>

              {/* Room Area */}
              <div className="space-y-1.5">
                <label
                  htmlFor="roomArea"
                  className="block text-xs font-bold text-text-muted uppercase tracking-wider"
                >
                  Área (m²)
                </label>
                <input
                  id="roomArea"
                  type="number"
                  step="0.01"
                  placeholder="Ex: 12.80"
                  value={roomArea}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    setRoomArea(e.target.value)
                  }
                  className={`w-full px-3.5 py-2.5 rounded-2xl text-sm bg-gray-50 focus:ring-2 focus:ring-brand-emerald/50 focus:bg-white border-0 outline-hidden transition-all text-text-primary ${
                    validationErrors.roomArea ? "ring-2 ring-rose-500" : ""
                  }`}
                />
                {validationErrors.roomArea && (
                  <p className="text-xs text-rose-600 mt-1">{validationErrors.roomArea}</p>
                )}
              </div>

              {/* Color Code Selector */}
              <div className="space-y-2">
                <span className="block text-xs font-bold text-text-muted uppercase tracking-wider">
                  Cor de Identificação
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {PRESET_COLORS.map(
                    (color): React.JSX.Element => (
                      <button
                        key={color}
                        type="button"
                        onClick={(): void => setRoomColor(color)}
                        className={`w-7 h-7 rounded-full border transition-all cursor-pointer ${
                          roomColor === color
                            ? "ring-2 ring-offset-2 ring-brand-emerald scale-110 border-transparent shadow-premium"
                            : "border-slate-200 hover:scale-105"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ),
                  )}
                  {/* Custom color input */}
                  <div className="relative w-7 h-7 rounded-full border border-slate-200 overflow-hidden hover:scale-105 transition-transform flex items-center justify-center bg-slate-50">
                    <input
                      type="color"
                      value={roomColor}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                        setRoomColor(e.target.value)
                      }
                      className="absolute inset-0 w-full h-full p-0 border-0 outline-hidden cursor-pointer opacity-100 scale-150"
                      title="Cor personalizada"
                    />
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={(): void => setIsRoomModalOpen(false)}
                  disabled={isSavingRoom}
                  className="px-5 py-2 text-xs font-semibold rounded-full bg-slate-100 hover:bg-slate-200 text-text-primary transition-colors cursor-pointer active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingRoom}
                  className="px-5 py-2.5 bg-brand-emerald hover:bg-brand-emerald/90 text-white text-xs font-semibold rounded-full shadow-premium active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer border-0"
                >
                  {isSavingRoom ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

      {/* Room Delete Confirmation Modal */}
      {deleteTargetRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-md p-4">
          <div className="bg-surface-white rounded-3xl max-w-md w-full shadow-premium p-6 space-y-6 animate-scale-up border-0">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-50 rounded-2xl text-rose-600 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-medium tracking-tight text-text-primary">
                  Excluir Cômodo?
                </h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  Tem certeza de que deseja excluir o cômodo{" "}
                  <strong className="text-text-primary">"{deleteTargetRoom.name}"</strong>?
                </p>
                <div className="p-3.5 bg-rose-50/50 rounded-2xl text-[11px] text-rose-800 leading-relaxed font-medium">
                  <strong>Aviso:</strong> Todas as despesas atualmente vinculadas a este cômodo
                  serão desvinculadas (o campo do cômodo será limpo nelas). As despesas em si não
                  serão deletadas.
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={(): void => setDeleteTargetRoom(null)}
                disabled={isDeletingRoom}
                className="px-5 py-2 text-xs font-semibold rounded-full bg-slate-100 hover:bg-slate-200 text-text-primary transition-colors cursor-pointer active:scale-95 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteRoomConfirm}
                disabled={isDeletingRoom}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-full shadow-premium active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer border-0"
              >
                {isDeletingRoom ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  "Confirmar Exclusão"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
